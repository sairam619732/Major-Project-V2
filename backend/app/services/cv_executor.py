import importlib.util
import io
import os
import time
import base64
import tempfile
import shutil
import subprocess
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from PIL import Image, ImageDraw

from app.services.workload_limits import FFMPEG_MISSING, MAX_VIDEO_SECONDS, WorkloadError


# Longest side of the annotated preview sent back to the browser. Boxes are reported in the
# original image's pixels; only the preview is shrunk (keeps responses small for large photos).
PREVIEW_MAX_SIDE = 1280

MODEL_NAME = "SSDLite320_MobileNet_V3_Large (COCO 91 Classes)"
# The same detector exported to ONNX (backend/scripts/export_detector_onnx.py), for nodes without
# PyTorch such as the Vercel cloud node. Results match PyTorch to within 0.001 px.
ONNX_MODEL = Path(__file__).resolve().parents[1] / "ml" / "checkpoints" / "ssdlite320_coco.onnx"
ONNX_LABELS = ONNX_MODEL.with_name("ssdlite320_coco_labels.json")


def _cpu_threads() -> Optional[int]:
    """DETECTOR_CPU_THREADS: cap on CPU threads for detection (an imposed limit, e.g. for an edge-like node)."""
    try:
        value = int(os.getenv("DETECTOR_CPU_THREADS", "0") or 0)
    except ValueError:
        return None
    return value if value > 0 else None


class _TorchEngine:
    """PyTorch on the GPU when one is usable (e.g. the desktop cloud node's RTX card), else the CPU.
    DETECTOR_DEVICE=auto | cpu | cuda (default auto)."""

    def __init__(self):
        import torch
        from torchvision.models.detection import SSDLite320_MobileNet_V3_Large_Weights, ssdlite320_mobilenet_v3_large

        self._torch = torch
        choice = os.getenv("DETECTOR_DEVICE", "auto").strip().lower()
        if choice == "cuda" and not torch.cuda.is_available():
            raise RuntimeError("DETECTOR_DEVICE=cuda, but PyTorch has no usable CUDA GPU (CPU-only build?)")
        use_cuda = choice == "cuda" or (choice == "auto" and torch.cuda.is_available())
        self.device = torch.device("cuda" if use_cuda else "cpu")
        self.gpu_available = bool(torch.cuda.is_available())
        self.gpu_name = torch.cuda.get_device_name(0) if self.gpu_available else None
        self.accelerator = f"GPU ({self.gpu_name})" if use_cuda else "CPU"
        self.name = f"PyTorch · {self.accelerator}"
        if _cpu_threads():
            torch.set_num_threads(_cpu_threads())

        weights = SSDLite320_MobileNet_V3_Large_Weights.DEFAULT
        self.model = ssdlite320_mobilenet_v3_large(weights=weights).eval().to(self.device)
        self.transforms = weights.transforms()
        self.categories = weights.meta.get("categories", [])
        if use_cuda:
            # The first GPU run sets up CUDA kernels (seconds); do it now, not during the first task.
            self(Image.new("RGB", (640, 480)))

    def __call__(self, img: Image.Image):
        with self._torch.no_grad():
            out = self.model(self.transforms(img).unsqueeze(0).to(self.device))[0]
        return out["boxes"].cpu().numpy(), out["scores"].cpu().numpy(), out["labels"].cpu().numpy()


class _OnnxEngine:
    name = "ONNX Runtime · CPU"
    accelerator = "CPU"
    gpu_available = None  # not checked: this engine always runs on the CPU
    gpu_name = None

    def __init__(self):
        import onnxruntime as ort

        options = ort.SessionOptions()
        if _cpu_threads():
            options.intra_op_num_threads = _cpu_threads()
        self.session = ort.InferenceSession(str(ONNX_MODEL), sess_options=options, providers=["CPUExecutionProvider"])
        self.categories = json.loads(ONNX_LABELS.read_text(encoding="utf-8"))

    def __call__(self, img: Image.Image):
        # Same input as PyTorch's ToTensor: (3, H, W) floats in 0..1.
        image = np.asarray(img, dtype=np.float32).transpose(2, 0, 1) / 255.0
        boxes, scores, labels = self.session.run(None, {"image": np.ascontiguousarray(image)})
        return boxes, scores, labels


def _load_engine():
    """DETECTOR_ENGINE=torch | onnx | auto (default: PyTorch if installed, else ONNX Runtime)."""
    choice = os.getenv("DETECTOR_ENGINE", "auto").strip().lower()
    if choice == "onnx":
        return _OnnxEngine()
    if choice == "torch":
        return _TorchEngine()
    return _TorchEngine() if importlib.util.find_spec("torch") else _OnnxEngine()


class ComputerVisionExecutor:
    """Runs the real object detector (SSDLite320 MobileNetV3) on uploaded images and videos,
    with PyTorch or, where PyTorch isn't installed, the same model on ONNX Runtime."""

    def __init__(self):
        try:
            self.engine = _load_engine()
            self.categories = self.engine.categories
            self.model_architecture = f"{MODEL_NAME} · {self.engine.name}"
            # Hardware that actually runs detection, reported with every result.
            self.accelerator = self.engine.accelerator
            self.is_loaded = True
            self.load_error = None
        except Exception as e:
            # Reported by detect() and the node's /health instead of returning empty results.
            self.engine = None
            self.categories = []
            self.model_architecture = MODEL_NAME
            self.accelerator = None
            self.is_loaded = False
            self.load_error = f"{type(e).__name__}: {e}"

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

        if not self.is_loaded or self.engine is None:
            # Report it: returning "0 objects" would look like a real result.
            raise RuntimeError(f"The object detector is not loaded ({self.load_error}).")
        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as exc:
            raise WorkloadError("The file is not a readable JPG, PNG or WebP image.") from exc
        width, height = img.size

        detections: List[Dict[str, Any]] = []
        annotated_b64: Optional[str] = None

        # The model resizes to 320x320 itself; boxes come back in this image's pixels.
        boxes, scores, labels = self.engine(img)

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

        # Export annotated JPEG preview as base64 (shrunk for large photos)
        img.thumbnail((PREVIEW_MAX_SIDE, PREVIEW_MAX_SIDE))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        annotated_b64 = f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return {
            "detections": detections,
            "detection_count": len(detections),
            "inference_time_ms": elapsed_ms,
            "annotated_image_base64": annotated_b64,
            "model_architecture": self.model_architecture,
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
            "model_architecture": self.model_architecture,
        }

    def detect_video(
        self,
        video_bytes: bytes,
        filename: str = "video.mp4",
        max_frames: int = MAX_VIDEO_SECONDS,
        threshold: float = 0.35,
    ) -> Dict[str, Any]:
        """Samples one frame per second (at most max_frames) with ffmpeg and runs detection on them."""
        start_time = time.perf_counter()
        frames_data: List[Tuple[str, bytes]] = []

        with tempfile.TemporaryDirectory() as tmp_dir:
            ext = os.path.splitext(filename)[1] or ".mp4"
            input_video_path = os.path.join(tmp_dir, f"input_video{ext}")
            with open(input_video_path, "wb") as f:
                f.write(video_bytes)

            frame_pattern = os.path.join(tmp_dir, "frame_%03d.jpg")
            if shutil.which("ffmpeg") is None:
                raise WorkloadError(FFMPEG_MISSING)
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
            except subprocess.TimeoutExpired as exc:
                raise WorkloadError("Reading frames from the video took too long.") from exc

        if not frames_data:
            # Report it rather than returning "0 objects", which would look like a real result.
            raise WorkloadError("No frames could be read from the video; it may be damaged or in an unsupported format.")

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
            "accelerator": self.accelerator,
        }

    def hardware(self) -> Dict[str, Any]:
        """What runs detection on this machine. gpu_available is None when the engine can't check."""
        engine = self.engine
        return {
            "detector_device": self.accelerator,
            "gpu_available": getattr(engine, "gpu_available", None),
            "gpu_name": getattr(engine, "gpu_name", None),
            "cpu_threads_limit": _cpu_threads(),
        }


# Global singleton instance
cv_executor = ComputerVisionExecutor()
