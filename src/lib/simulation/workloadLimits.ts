/**
 * Task size limits, checked in the browser before upload. The backend and every edge/cloud node
 * enforce the same numbers (backend/app/services/workload_limits.py): keep the two in step.
 */
export const MAX_IMAGE_MB = 10;
export const MAX_BATCH_IMAGES = 10;
export const MAX_VIDEO_SECONDS = 10;
export const MAX_VIDEO_MB = 50;

export const fileMb = (file: File) => file.size / (1024 * 1024);
