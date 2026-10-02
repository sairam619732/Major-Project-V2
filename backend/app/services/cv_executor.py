import io
import os
import time
import base64
import tempfile
import subprocess
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image, ImageDraw, ImageFont
import torch
import torchvision
from torchvision.models.detection import (
    ssdlite320_mobilenet_v3_large,
    SSDLite320_MobileNet_V3_Large_Weights,
)

from app.models.simulation import SimulationTaskInput
from app.models.system import LocalNodeState, EdgeNodeState, CloudNodeState
from app.ml.config import RewardWeights
from app.ml.environment import compute_action_metrics, ACTION_NAMES


class ComputerVisionExecutor:
    """Singleton execution engine for real PyTorch object detection.

    Runs real neural inference on uploaded image payloads.
    Models simulated execution environments (Local device, Edge fog node, Cloud cluster)
    with accurate latency, energy, and economic cost profiles.
    """

    def __init__(self):
        self.device = torch.device("cpu")
        try:
            self.weights = SSDLite320_MobileNet_V3_Large_Weights.DEFAULT
            self.model = ssdlite320_mobilenet_v3_large(weights=self.weights)
            self.model.eval()
            self.transforms = self.weights.transforms()
            self.categories = self.weights.meta.get("categories", [])
            self.is_loaded = True
        except Exception as e:
            # Fallback in case of runtime weight loading issue
            self.model = None
            self.transforms = None
            self.categories = []
            self.is_loaded = False
            self.load_error = str(e)

    def extract_image_metadata(self, image_bytes: bytes) -> Dict[str, Any]:
        """Extracts physical and computational attributes from uploaded image bytes."""
        size_bytes = len(image_bytes)
        size_mb = round(size_bytes / (1024 * 1024), 3)

        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                width, height = img.size
                img_format = img.format or "JPEG"
                mode = img.mode
        except Exception:
            width, height = 640, 480
            img_format = "UNKNOWN"
            mode = "RGB"

        # Estimate computational and memory intensity from resolution & file payload
        pixel_count = width * height
        # Base CPU demand: 50% for standard VGA, scaled up to 90% for 4K
        cpu_demand = min(95.0, max(30.0, 40.0 + (pixel_count / (1920 * 1080)) * 35.0))
        # Memory demand: activation and frame buffer overhead
        mem_demand = min(90.0, max(25.0, 30.0 + (size_mb / 8.0) * 30.0))

        return {
            "width": width,
            "height": height,
            "size_bytes": size_bytes,
            "size_mb": max(0.1, size_mb),
            "format": img_format,
            "mode": mode,
            "pixel_count": pixel_count,
            "estimated_cpu_demand": round(cpu_demand, 1),
            "estimated_memory_demand": round(mem_demand, 1),
        }

    def detect(self, image_bytes: bytes, threshold: float = 0.35) -> Dict[str, Any]:
        """Executes real object detection on image bytes and returns bounding boxes + annotated image."""
        start_time = time.perf_counter()

        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        width, height = img.size

        detections: List[Dict[str, Any]] = []
        annotated_b64: Optional[str] = None

        if self.is_loaded and self.model is not None:
            try:
                # Transform image to normalized tensor (SSDLite input: 320x320)
                input_tensor = self.transforms(img).unsqueeze(0).to(self.device)

                with torch.no_grad():
                    predictions = self.model(input_tensor)[0]

                boxes = predictions["boxes"].cpu().numpy()
                scores = predictions["scores"].cpu().numpy()
                labels = predictions["labels"].cpu().numpy()

                draw = ImageDraw.Draw(img)

                for box, score, label_id in zip(boxes, scores, labels):
                    if score < threshold:
                        continue

                    label_name = (
                        self.categories[label_id]
                        if label_id < len(self.categories)
                        else f"object_{label_id}"
                    )

                    x1, y1, x2, y2 = box.tolist()
                    norm_box = [
                        round(y1 / height, 4),
                        round(x1 / width, 4),
                        round(y2 / height, 4),
                        round(x2 / width, 4),
                    ]

                    detections.append(
                        {
                            "label": label_name,
                            "confidence": round(float(score), 3),
                            "box_normalized": norm_box,
                            "box_pixels": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                        }
                    )

                    # Draw visual bounding box on annotated preview
                    box_outline = "#06b6d4"
                    draw.rectangle([x1, y1, x2, y2], outline=box_outline, width=3)

                    label_text = f"{label_name.upper()} {round(float(score) * 100)}%"
                    text_w = len(label_text) * 7 + 8
                    text_h = 16
                    badge_y1 = max(0, y1 - text_h - 2)
                    badge_y2 = badge_y1 + text_h + 2
                    badge_x2 = min(width, x1 + text_w)

                    # High-contrast label tag background
                    draw.rectangle([x1, badge_y1, badge_x2, badge_y2], fill="#041e2b", outline=box_outline, width=1)
                    draw.text((x1 + 4, badge_y1 + 1), label_text, fill="#38bdf8")

                # Export annotated JPEG preview as base64
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=85)
                annotated_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

            except Exception as e:
                # Fallback: keep basic detections empty
                pass

        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return {
            "detections": detections,
            "detection_count": len(detections),
            "inference_time_ms": elapsed_ms,
            "annotated_image_base64": annotated_b64,
            "model_architecture": "SSDLite320_MobileNet_V3_Large (COCO 91 Classes)",
        }

    def detect_batch(
        self,
        images: List[Tuple[str, bytes]],
        threshold: float = 0.35,
    ) -> Dict[str, Any]:
        """Processes a batch of images through the detector and aggregates results."""
        start_time = time.perf_counter()
        all_detections: List[Dict[str, Any]] = []
        batch_items: List[Dict[str, Any]] = []
        primary_annotated_b64: Optional[str] = None

        for filename, img_bytes in images:
            item_res = self.detect(img_bytes, threshold=threshold)
            all_detections.extend(item_res["detections"])
            if primary_annotated_b64 is None and item_res.get("annotated_image_base64"):
                primary_annotated_b64 = item_res["annotated_image_base64"]

            batch_items.append({
                "filename": filename,
                "size_mb": round(len(img_bytes) / (1024 * 1024), 3),
                "detection_count": item_res["detection_count"],
                "inference_time_ms": item_res["inference_time_ms"],
                "detections": item_res["detections"],
            })

        total_elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return {
            "detections": all_detections,
            "detection_count": len(all_detections),
            "processed_count": len(images),
            "inference_time_ms": total_elapsed_ms,
            "annotated_image_base64": primary_annotated_b64,
            "batch_items": batch_items,
            "model_architecture": "SSDLite320_MobileNet_V3_Large (COCO 91 Classes)",
        }

    def detect_video(
        self,
        video_bytes: bytes,
        filename: str = "video.mp4",
        max_frames: int = 4,
        threshold: float = 0.35,
    ) -> Dict[str, Any]:
        """Extracts sample frames from video and runs neural detection without holding entire stream in memory."""
        start_time = time.perf_counter()
        frames_data: List[Tuple[str, bytes]] = []

        with tempfile.TemporaryDirectory() as tmp_dir:
            ext = os.path.splitext(filename)[1] or ".mp4"
            input_video_path = os.path.join(tmp_dir, f"input_video{ext}")
            with open(input_video_path, "wb") as f:
                f.write(video_bytes)

            frame_pattern = os.path.join(tmp_dir, "frame_%03d.jpg")
            try:
                subprocess.run(
                    [
                        "ffmpeg", "-y", "-i", input_video_path,
                        "-vf", "fps=1",
                        "-vframes", str(max_frames),
                        frame_pattern,
                    ],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=15,
                )
                for frame_file in sorted(os.listdir(tmp_dir)):
                    if frame_file.startswith("frame_") and frame_file.endswith(".jpg"):
                        with open(os.path.join(tmp_dir, frame_file), "rb") as ff:
                            frames_data.append((frame_file, ff.read()))
            except Exception:
                pass

        if not frames_data:
            return {
                "detections": [],
                "detection_count": 0,
                "processed_count": 0,
                "inference_time_ms": round((time.perf_counter() - start_time) * 1000.0, 2),
                "annotated_image_base64": None,
                "batch_items": [],
                "model_architecture": "SSDLite320_MobileNet_V3_Large (COCO 91 Classes)",
            }

        batch_res = self.detect_batch(frames_data, threshold=threshold)
        total_elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        batch_res["inference_time_ms"] = total_elapsed_ms
        return batch_res

    def process_workload(
        self,
        workload_type: str,
        files_data: List[Tuple[str, bytes]],
        threshold: float = 0.35,
        tier: str = "LOCAL",
    ) -> Dict[str, Any]:
        """Unified dispatch for IMAGE, IMAGE_BATCH, and VIDEO workloads."""
        w_type = workload_type.upper()
        if w_type in ("IMAGE_BATCH", "BATCH_IMAGES", "BATCH"):
            res = self.detect_batch(files_data, threshold=threshold)
        elif w_type in ("VIDEO", "VIDEO_STREAM", "STREAM"):
            filename, content = files_data[0] if files_data else ("video.mp4", b"")
            res = self.detect_video(content, filename=filename, threshold=threshold)
        else:
            _, content = files_data[0] if files_data else ("image.jpg", b"")
            res = self.detect(content, threshold=threshold)
            res["processed_count"] = 1
            res["batch_items"] = [{
                "filename": files_data[0][0] if files_data else "image.jpg",
                "size_mb": round(len(content) / (1024 * 1024), 3),
                "detection_count": res["detection_count"],
                "inference_time_ms": res["inference_time_ms"],
                "detections": res["detections"],
            }]

        return {
            "workload_type": w_type,
            "tier": tier,
            "processing_time_ms": res["inference_time_ms"],
            "detection_count": res["detection_count"],
            "detections": res["detections"],
            "annotated_image_base64": res.get("annotated_image_base64"),
            "processed_count": res.get("processed_count", 1),
            "batch_items": res.get("batch_items", []),
            "model_architecture": res.get("model_architecture", "SSDLite320_MobileNet_V3_Large"),
        }

    def execute_in_environment(
        self,
        decision: str,
        image_bytes: bytes,
        task: SimulationTaskInput,
        local: LocalNodeState,
        edge: EdgeNodeState,
        cloud: CloudNodeState,
        weights: Optional[RewardWeights] = None,
    ) -> Dict[str, Any]:
        """Executes object detection and computes empirical metrics adjusted for the selected tier.

        Environments:
          - LOCAL: Executed in local process simulating mobile/IoT on-device NPU/CPU.
          - EDGE: Simulated metropolitan fog node (simulated edge container on same host).
          - CLOUD: Simulated datacenter cluster (simulated cloud batch worker on same host).
        """
        action_map = {"LOCAL": 0, "EDGE": 1, "CLOUD": 2}
        action_idx = action_map.get(decision.upper(), 0)

        # 1. Real neural inference execution
        detection_result = self.detect(image_bytes)
        raw_inference_ms = detection_result["inference_time_ms"]

        # 2. Compute canonical offloading metrics using existing model logic
        base_metrics = compute_action_metrics(
            task=task,
            local=local,
            edge=edge,
            cloud=cloud,
            action=action_idx,
            weights=weights or RewardWeights(),
        )

        # 3. Environment Specific Simulation Metadata & Timings
        if action_idx == 0:  # LOCAL
            env_name = "LOCAL (On-Device Client NPU/CPU)"
            env_desc = "Executed on local device without network transmission. Battery energy consumed for local compute."
            # Actual execution latency adjusted by device load
            measured_exec_ms = raw_inference_ms * (1.0 + max(0.0, task.cpu_demand_percent - local.cpu_available) / 38.0 * 0.4)
            network_transit_ms = local.base_latency
        elif action_idx == 1:  # EDGE
            env_name = "EDGE (Simulated Fog Node)"
            env_desc = "Task offloaded to simulated metropolitan Edge server via low-latency radio link."
            measured_exec_ms = raw_inference_ms * 0.65  # Accelerated server inference
            network_transit_ms = base_metrics["latency_ms"] - (base_metrics.get("exec_latency_ms", 30.0))
        else:  # CLOUD
            env_name = "CLOUD (Simulated Datacenter Cluster)"
            env_desc = "Task offloaded to simulated centralized Cloud cluster over wide-area network (WAN)."
            measured_exec_ms = raw_inference_ms * 0.40  # Scalable GPU cluster acceleration
            network_transit_ms = base_metrics["latency_ms"] - (base_metrics.get("exec_latency_ms", 20.0))

        total_latency_ms = round(max(raw_inference_ms, network_transit_ms + measured_exec_ms), 2)
        is_feasible = total_latency_ms <= task.deadline_ms

        return {
            "execution_environment": env_name,
            "environment_description": env_desc,
            "is_simulated_distributed": action_idx != 0,
            "raw_inference_time_ms": raw_inference_ms,
            "measured_execution_time_ms": round(measured_exec_ms, 2),
            "network_transit_ms": round(max(0.0, network_transit_ms), 2),
            "total_latency_ms": total_latency_ms,
            "energy_joules": base_metrics["energy_joules"],
            "cost_index": base_metrics["cost"],
            "queue_penalty": base_metrics["queue_penalty"],
            "deadline_penalty": base_metrics["deadline_penalty"],
            "reward": base_metrics["reward"],
            "feasible": is_feasible,
            "detections": detection_result["detections"],
            "detection_count": detection_result["detection_count"],
            "annotated_image_base64": detection_result["annotated_image_base64"],
            "model_architecture": detection_result["model_architecture"],
        }


# Global singleton instance
cv_executor = ComputerVisionExecutor()
