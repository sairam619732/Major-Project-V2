"""Size limits for the tasks the system processes, sized for ordinary laptops and free CPU servers.

Accepted workloads:
  IMAGE        one photo, up to MAX_IMAGE_MB
  IMAGE_BATCH  up to MAX_BATCH_IMAGES photos, each up to MAX_IMAGE_MB
  VIDEO        one video, up to MAX_VIDEO_SECONDS long and MAX_VIDEO_MB in size; analysed at 1 frame
               per second (so at most MAX_VIDEO_SECONDS frames). Needs ffmpeg/ffprobe on the machine.

The same checks run in the backend and on every edge/cloud node.
Keep src/lib/simulation/workloadLimits.ts in step with these numbers.
"""

import os
import shutil
import subprocess
import tempfile
import warnings
from io import BytesIO
from typing import List, Tuple

from PIL import Image

MAX_IMAGE_MB = 10
MAX_BATCH_IMAGES = 10
MAX_VIDEO_SECONDS = 10
MAX_VIDEO_MB = 50

FFMPEG_MISSING = (
    "ffmpeg is not installed on this machine, so videos can't be processed here. "
    "Install it (Windows: winget install Gyan.FFmpeg) and restart."
)


class WorkloadError(ValueError):
    """The task can't be processed as sent (too large, too long, or a missing tool)."""


VIDEO_TYPES = ("VIDEO", "VIDEO_STREAM", "STREAM")
BATCH_TYPES = ("IMAGE_BATCH", "BATCH_IMAGES", "BATCH")


def max_file_bytes(workload_type: str) -> int:
    """Largest single file accepted for this workload, so oversized uploads are refused while reading."""
    mb = MAX_VIDEO_MB if workload_type.upper() in VIDEO_TYPES else MAX_IMAGE_MB
    return mb * 1024 * 1024


def _check_image_readable(name: str, content: bytes) -> None:
    """Refuses files that are not real images (or are decompression bombs) before detection runs."""
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(content)) as img:
                img.verify()
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise WorkloadError(f"{name} has too many pixels to process safely.") from exc
    except Exception as exc:
        raise WorkloadError(f"{name} is not a readable JPG, PNG or WebP image.") from exc


def _mb(size_bytes: int) -> float:
    return size_bytes / (1024 * 1024)


def video_duration_seconds(path: str) -> float:
    """Length of a video file in seconds, read with ffprobe."""
    if shutil.which("ffprobe") is None:
        raise WorkloadError(FFMPEG_MISSING)
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path],
            capture_output=True,
            text=True,
            timeout=15,
        )
        return float(out.stdout.strip())
    except (ValueError, subprocess.TimeoutExpired) as exc:
        raise WorkloadError("Could not read the video's length; it may be damaged or in an unsupported format.") from exc


def check_workload(workload_type: str, files_data: List[Tuple[str, bytes]]) -> None:
    """Raises WorkloadError when the upload is outside the limits above."""
    w_type = workload_type.upper()
    if not files_data:
        raise WorkloadError("No file was uploaded.")

    if w_type in VIDEO_TYPES:
        if len(files_data) != 1:
            raise WorkloadError("Upload one video at a time.")
        name, content = files_data[0]
        if _mb(len(content)) > MAX_VIDEO_MB:
            raise WorkloadError(f"The video is {_mb(len(content)):.1f} MB; the limit is {MAX_VIDEO_MB} MB.")
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = os.path.join(tmp_dir, f"input{os.path.splitext(name)[1] or '.mp4'}")
            with open(path, "wb") as f:
                f.write(content)
            seconds = video_duration_seconds(path)
        # Small tolerance: containers often report e.g. 10.02 s for a 10 s clip.
        if seconds > MAX_VIDEO_SECONDS + 0.1:
            raise WorkloadError(f"The video is {seconds:.1f} s long; the limit is {MAX_VIDEO_SECONDS} s.")
        return

    if w_type in BATCH_TYPES:
        if len(files_data) > MAX_BATCH_IMAGES:
            raise WorkloadError(f"{len(files_data)} photos were sent; the limit is {MAX_BATCH_IMAGES} at a time.")
    elif len(files_data) != 1:
        raise WorkloadError("Upload one photo, or use multiple photos mode.")

    for name, content in files_data:
        if _mb(len(content)) > MAX_IMAGE_MB:
            raise WorkloadError(f"{name} is {_mb(len(content)):.1f} MB; each photo can be up to {MAX_IMAGE_MB} MB.")
        _check_image_readable(name, content)


async def read_upload(upload, max_bytes: int) -> bytes:
    """Reads an uploaded file in chunks and stops as soon as it is larger than max_bytes,
    so a huge upload is refused without first being held in memory."""
    chunks: List[bytes] = []
    size = 0
    while True:
        chunk = await upload.read(1024 * 1024)
        if not chunk:
            return b"".join(chunks)
        size += len(chunk)
        if size > max_bytes:
            raise WorkloadError(
                f"{upload.filename or 'The file'} is larger than {max_bytes // (1024 * 1024)} MB, the limit for this task type."
            )
        chunks.append(chunk)
