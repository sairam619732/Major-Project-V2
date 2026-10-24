"""Exports the object detector (SSDLite320 MobileNetV3, COCO weights) to ONNX for nodes without PyTorch.

The Vercel cloud node runs this file with ONNX Runtime: same model and weights, but a ~10x smaller
install than PyTorch. The export includes the model's own resizing and box post-processing, so it
takes the same input (an RGB image as floats in 0..1, any size) and gives the same boxes.

Run from backend/ (needs: pip install onnx onnxruntime onnxscript):
    .venv\\Scripts\\python.exe scripts\\export_detector_onnx.py

Writes app/ml/checkpoints/ssdlite320_coco.onnx and ssdlite320_coco_labels.json, then checks the
ONNX results against PyTorch on the sample photos and fails if they differ.
"""

import json
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from torchvision.models.detection import SSDLite320_MobileNet_V3_Large_Weights, ssdlite320_mobilenet_v3_large
from torchvision.transforms.functional import to_tensor

BACKEND = Path(__file__).resolve().parents[1]
OUT_DIR = BACKEND / "app" / "ml" / "checkpoints"
ONNX_PATH = OUT_DIR / "ssdlite320_coco.onnx"
LABELS_PATH = OUT_DIR / "ssdlite320_coco_labels.json"
SAMPLES = BACKEND.parent / "public" / "samples"


class Detector(torch.nn.Module):
    """One image in (3, H, W), floats 0..1; boxes (x1, y1, x2, y2 in input pixels), scores, labels out."""

    def __init__(self, model: torch.nn.Module):
        super().__init__()
        self.model = model

    def forward(self, image: torch.Tensor):
        out = self.model([image])[0]
        return out["boxes"], out["scores"], out["labels"]


def main() -> int:
    weights = SSDLite320_MobileNet_V3_Large_Weights.DEFAULT
    model = ssdlite320_mobilenet_v3_large(weights=weights).eval()
    wrapper = Detector(model).eval()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    example = torch.rand(3, 480, 640)
    torch.onnx.export(
        wrapper,
        (example,),
        str(ONNX_PATH),
        input_names=["image"],
        output_names=["boxes", "scores", "labels"],
        dynamic_axes={"image": {1: "height", 2: "width"}, "boxes": {0: "n"}, "scores": {0: "n"}, "labels": {0: "n"}},
        opset_version=17,
        dynamo=False,
    )
    LABELS_PATH.write_text(json.dumps(weights.meta["categories"]), encoding="utf-8")
    print(f"Wrote {ONNX_PATH.name} ({ONNX_PATH.stat().st_size / 1e6:.1f} MB) and {LABELS_PATH.name}")

    # Parity check: same detections (score >= 0.35) from PyTorch and ONNX Runtime on real photos.
    import onnxruntime as ort

    session = ort.InferenceSession(str(ONNX_PATH), providers=["CPUExecutionProvider"])
    worst = 0.0
    for photo in sorted(SAMPLES.glob("*.jpg")):
        image = to_tensor(Image.open(photo).convert("RGB"))
        with torch.no_grad():
            t_boxes, t_scores, t_labels = (x.numpy() for x in wrapper(image))
        o_boxes, o_scores, o_labels = session.run(None, {"image": image.numpy()})
        keep_t, keep_o = t_scores >= 0.35, o_scores >= 0.35
        if keep_t.sum() != keep_o.sum() or not np.array_equal(t_labels[keep_t], o_labels[keep_o]):
            print(f"MISMATCH on {photo.name}: torch {t_labels[keep_t]} vs onnx {o_labels[keep_o]}")
            return 1
        diff = float(np.abs(t_boxes[keep_t] - o_boxes[keep_o]).max(initial=0.0))
        worst = max(worst, diff, float(np.abs(t_scores[keep_t] - o_scores[keep_o]).max(initial=0.0)) * 100)
        print(f"  {photo.name}: {int(keep_t.sum())} objects, same labels; max box difference {diff:.3f} px")
    print(f"Parity OK (worst difference {worst:.3f}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
