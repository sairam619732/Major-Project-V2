"""Tests for the task size limits (one photo, a batch of photos up to 100 MB in total, a video of up to 10 s).

Run from backend/:  .venv\\Scripts\\python.exe -m tests.test_workload_limits
Video tests need ffmpeg/ffprobe on PATH; they are skipped without them.
"""

import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from app.services import workload_limits
from app.services.cv_executor import cv_executor
from app.services.workload_limits import (
    MAX_BATCH_TOTAL_MB,
    MAX_IMAGE_MB,
    MAX_VIDEO_SECONDS,
    WorkloadError,
    check_workload,
)

SAMPLES = Path(__file__).resolve().parents[2] / "public" / "samples"
PHOTO = (SAMPLES / "traffic_monitoring.jpg").read_bytes()
HAS_FFMPEG = shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def make_video(seconds: float) -> bytes:
    """A small synthetic test video of the given length."""
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "clip.mp4"
        subprocess.run(
            ["ffmpeg", "-y", "-f", "lavfi", "-i", f"testsrc=duration={seconds}:size=320x240:rate=10",
             "-pix_fmt", "yuv420p", str(out)],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True, timeout=60,
        )
        return out.read_bytes()


class TestPhotoLimits(unittest.TestCase):
    def test_single_photo_is_accepted(self):
        check_workload("IMAGE", [("a.jpg", PHOTO)])

    def test_single_mode_takes_one_photo(self):
        with self.assertRaises(WorkloadError):
            check_workload("IMAGE", [("a.jpg", PHOTO), ("b.jpg", PHOTO)])

    def test_batch_up_to_the_limit_is_accepted(self):
        # No count limit any more: 25 photos (more than the old limit of 10) are fine.
        check_workload("IMAGE_BATCH", [(f"{i}.jpg", PHOTO) for i in range(25)])

    def test_batch_over_the_limit_is_rejected(self):
        # The total size cap still applies (protects memory).
        n = int(MAX_BATCH_TOTAL_MB * 1024 * 1024 / len(PHOTO)) + 1
        with self.assertRaisesRegex(WorkloadError, f"limit is {MAX_BATCH_TOTAL_MB} MB"):
            check_workload("IMAGE_BATCH", [(f"{i}.jpg", PHOTO) for i in range(n)])

    def test_oversized_photo_is_rejected(self):
        big = b"\0" * (MAX_IMAGE_MB * 1024 * 1024 + 1)
        with self.assertRaisesRegex(WorkloadError, "big.jpg"):
            check_workload("IMAGE_BATCH", [("ok.jpg", PHOTO), ("big.jpg", big)])

    def test_nothing_uploaded_is_rejected(self):
        with self.assertRaises(WorkloadError):
            check_workload("IMAGE", [])


@unittest.skipUnless(HAS_FFMPEG, "ffmpeg/ffprobe not installed")
class TestVideoLimits(unittest.TestCase):
    def test_short_video_is_accepted_and_sampled_once_per_second(self):
        clip = make_video(3)
        check_workload("VIDEO", [("clip.mp4", clip)])
        result = cv_executor.process_workload("VIDEO", [("clip.mp4", clip)])
        self.assertEqual(result["processed_count"], 3)

    def test_ten_second_video_is_accepted(self):
        check_workload("VIDEO", [("clip.mp4", make_video(MAX_VIDEO_SECONDS))])

    def test_long_video_is_rejected(self):
        with self.assertRaisesRegex(WorkloadError, f"limit is {MAX_VIDEO_SECONDS} s"):
            check_workload("VIDEO", [("clip.mp4", make_video(12))])

    def test_unreadable_video_is_reported_not_empty(self):
        with self.assertRaises(WorkloadError):
            cv_executor.process_workload("VIDEO", [("clip.mp4", b"not a video")])


class TestMissingFfmpeg(unittest.TestCase):
    def test_video_without_ffmpeg_gives_a_clear_error(self):
        with mock.patch.object(workload_limits.shutil, "which", return_value=None):
            with self.assertRaisesRegex(WorkloadError, "ffmpeg is not installed"):
                check_workload("VIDEO", [("clip.mp4", b"\0" * 1000)])


if __name__ == "__main__":
    unittest.main(verbosity=2)
