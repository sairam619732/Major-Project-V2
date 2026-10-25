/**
 * Task size limits, checked in the browser before upload. The backend and every edge/cloud node
 * enforce the same numbers (backend/app/services/workload_limits.py): keep the two in step.
 */
export const MAX_IMAGE_MB = 10;
// No limit on the number of photos in a batch; the total size is capped to protect memory.
export const MAX_BATCH_TOTAL_MB = 100;
export const MAX_VIDEO_SECONDS = 10;
export const MAX_VIDEO_MB = 50;

export const fileMb = (file: File) => file.size / (1024 * 1024);
