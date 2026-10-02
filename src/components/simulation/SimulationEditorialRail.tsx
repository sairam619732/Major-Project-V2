// Phase 11 & Phase 13D: Dynamic Offloading Simulation - Editorial Controls & Detection Results
// Phase 13D: Separate Telemetry from Simulation Controls + Show Real SSDLite320 Detection Results
// - Node telemetry for Local Device, Edge Server, and Cloud Infrastructure are strictly READ-ONLY indicators.
// - Real host hardware telemetry sampled via psutil (CPU, RAM, battery/power, loopback latency).
// - Explicit EXPERIMENT CONDITIONS section: LOCAL WORKLOAD, EDGE CONGESTION, CLOUD LOAD, NETWORK CONDITION.
// - Real Object Detection Result: Processed image preview with rendered cyan bounding boxes, exact object count, and detections breakdown table.

"use client";

import { useRef } from "react";
import { useSimulationState } from "@/lib/simulation/simulationState";
import { SCENARIO_PRESETS } from "@/lib/simulation/simulationPresets";
import { WorkloadLevel, NetworkConditionLevel } from "@/lib/simulation/simulationTypes";

// ==================================================
// READ-ONLY TELEMETRY GAUGE INDICATOR (NO SLIDER THUMB)
// ==================================================
interface ReadOnlyTelemetryProps {
  label: string;
  value: number | string;
  unit: string;
  accentColor: string;
  pct?: number; // 0-100%
  statusBadge?: string; // e.g. "REAL HOST", "SIMULATED FOG", "SIMULATED DC", "UNAVAILABLE"
  statusColor?: string;
  subtitle?: string;
}

function ReadOnlyTelemetryIndicator({
  label,
  value,
  unit,
  accentColor,
  pct = 50,
  statusBadge,
  statusColor = "text-slate-400 bg-white/[0.04] border-white/[0.08]",
  subtitle,
}: ReadOnlyTelemetryProps) {
  const clampedPct = Math.min(100, Math.max(0, pct));
  const trackGradient = `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${clampedPct}%, rgba(255, 255, 255, 0.08) ${clampedPct}%, rgba(255, 255, 255, 0.08) 100%)`;

  return (
    <div className="telemetry-indicator flex flex-col py-1.5 group select-none">
      <div className="flex items-baseline justify-between font-mono mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] sm:text-[12.5px] tracking-[0.08em] uppercase text-slate-300 font-medium">
            {label}
          </span>
          {statusBadge && (
            <span
              className={`text-[8.5px] font-mono uppercase px-1 py-0.2 rounded border ${statusColor}`}
            >
              {statusBadge}
            </span>
          )}
        </div>
        <div className="flex items-baseline justify-end gap-1.5 tabular-nums">
          <span className="text-[13px] sm:text-[14px] font-bold text-slate-100 tabular-nums text-right min-w-[3.6ch]">
            {value}
          </span>
          <span className="text-[10.5px] text-slate-400 font-normal w-[4ch] text-left uppercase">
            {unit}
          </span>
        </div>
      </div>
      {/* Read-Only Status Bar (Instrument Gauge - No Draggable Thumb) */}
      <div
        className="w-full h-1.5 rounded-full overflow-hidden bg-white/[0.06]"
        style={{ background: trackGradient }}
        aria-label={`${label}: ${value} ${unit}`}
      />
      {subtitle && (
        <span className="text-[9px] font-mono text-slate-400/80 mt-0.5">{subtitle}</span>
      )}
    </div>
  );
}

// ==================================================
// EXPERIMENT CONDITION TOGGLE ROW
// ==================================================
interface ConditionSelectorProps<T extends string> {
  label: string;
  currentValue: T;
  options: { value: T; label: string }[];
  accentColor: string;
  onChange: (val: T) => void;
}

function ConditionSelector<T extends string>({
  label,
  currentValue,
  options,
  accentColor,
  onChange,
}: ConditionSelectorProps<T>) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 py-1.5 border-b border-white/[0.04]">
      <span className="font-mono text-[11px] sm:text-[11.5px] uppercase tracking-wider text-slate-300 font-semibold min-w-[140px]">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        {options.map((opt) => {
          const isActive = currentValue === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`px-3 py-1 rounded font-mono text-[10.5px] tracking-wider uppercase transition-all cursor-pointer ${
                isActive
                  ? "font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                  : "bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.07] border border-white/[0.06]"
              }`}
              style={
                isActive
                  ? {
                      borderColor: accentColor,
                      borderWidth: "1px",
                      borderStyle: "solid",
                      backgroundColor: `${accentColor}25`,
                      color: "#f8fafc",
                    }
                  : undefined
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==================================================
// COMPACT CONTROLS: TASK + EXPERIMENT CONDITIONS + READ-ONLY TELEMETRY
// ==================================================
export function SimulationCompactControls() {
  const {
    state,
    updateTask,
    applyPreset,
    uploadedImage,
    workloadType,
    batchImages,
    uploadedVideo,
    videoMetadata,
    executionStage,
    setUploadedImage,
    clearUploadedImage,
    setWorkloadType,
    addBatchImages,
    removeBatchImage,
    clearBatchImages,
    setUploadedVideo,
    clearUploadedVideo,
    experimentConditions,
    realLocalTelemetry,
    telemetryLoading,
    setExperimentCondition,
    fetchRealTelemetry,
  } = useSimulationState();

  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const handleSingleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
    }
  };

  const handleBatchFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addBatchImages(files);
      if (batchFileInputRef.current) batchFileInputRef.current.value = "";
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedVideo(file);
      if (videoFileInputRef.current) videoFileInputRef.current.value = "";
    }
  };

  const loadSingleSample = async (samplePath: string, filename: string) => {
    try {
      const res = await fetch(samplePath);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "image/jpeg" });
      setUploadedImage(file);
    } catch {
      // Non-fatal sample loading fallback
    }
  };

  const loadSampleBatch = async () => {
    try {
      const [res1, res2] = await Promise.all([
        fetch("/samples/traffic_monitoring.jpg"),
        fetch("/samples/drone_inspection.jpg"),
      ]);
      const [blob1, blob2] = await Promise.all([res1.blob(), res2.blob()]);
      const f1 = new File([blob1], "traffic_monitoring.jpg", { type: "image/jpeg" });
      const f2 = new File([blob2], "drone_inspection.jpg", { type: "image/jpeg" });
      addBatchImages([f1, f2]);
    } catch {
      // Non-fatal sample batch fallback
    }
  };

  const loadSampleVideo = async () => {
    try {
      const res = await fetch("/samples/sample_video.mp4");
      const blob = await res.blob();
      const file = new File([blob], "sample_traffic_stream.mp4", { type: "video/mp4" });
      setUploadedVideo(file);
    } catch {
      // Non-fatal sample video fallback
    }
  };

  const isLocalReal = realLocalTelemetry?.cpu_is_real && experimentConditions.localWorkload === "LOW";

  return (
    <div className="flex flex-col w-full text-slate-200 select-none gap-7 sm:gap-8 pb-4 sm:pb-5">
      {/* Dynamic Architecture Pipeline Banner (Phase 13E Requirement 5) */}
      <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-black/60 border border-cyan-500/30 font-mono text-[10px] sm:text-[11px] tracking-wider uppercase overflow-x-auto whitespace-nowrap scrollbar-none">
        <span className="text-slate-400 font-semibold mr-2">PIPELINE:</span>
        <span className="text-cyan-300 font-medium">
          {workloadType === "IMAGE"
            ? "UPLOADED IMAGE"
            : workloadType === "IMAGE_BATCH"
            ? `IMAGE BATCH (${batchImages.length})`
            : "VIDEO STREAM"}
        </span>
        <span className="text-slate-600 mx-1.5">→</span>
        <span className="text-cyan-300 font-medium">
          {workloadType === "IMAGE"
            ? "OBJECT DETECTION TASK"
            : workloadType === "IMAGE_BATCH"
            ? "BATCH DETECTION WORKLOAD"
            : "VIDEO ANALYTICS WORKLOAD"}
        </span>
        <span className="text-slate-600 mx-1.5">→</span>
        <span className="text-amber-300 font-medium">DQN OFFLOADING DECISION</span>
        <span className="text-slate-600 mx-1.5">→</span>
        <span className="text-emerald-300 font-medium">LOCAL / EDGE / CLOUD</span>
        <span className="text-slate-600 mx-1.5">→</span>
        <span className="text-cyan-300 font-medium">
          {workloadType === "IMAGE"
            ? "OBJECT DETECTION INFERENCE"
            : workloadType === "IMAGE_BATCH"
            ? "BATCH PROCESSING ENGINE"
            : "VIDEO STREAM INFERENCE"}
        </span>
        <span className="text-slate-600 mx-1.5">→</span>
        <span className="text-emerald-400 font-bold">
          {workloadType === "IMAGE" ? "DETECTION RESULTS + METRICS" : "READY FOR WORKLOAD EXECUTION"}
        </span>
      </div>

      {/* -------------------------------------------------- */}
      {/* SECTION 1: TASK & PAYLOAD (TOP ROW)                */}
      {/* -------------------------------------------------- */}
      <div className="flex flex-col p-4 rounded-lg bg-[#030712]/80 border border-cyan-500/30">
        <div className="flex items-center justify-between border-b border-cyan-500/40 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
            <span className="font-mono text-[13px] sm:text-[14px] tracking-[0.10em] uppercase text-cyan-300 font-semibold">
              {"// TASK & PAYLOAD"}
            </span>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 uppercase">
            {workloadType === "IMAGE" ? "SSD MobileNet V3" : workloadType === "IMAGE_BATCH" ? "BATCH INFERENCE" : "VIDEO ANALYTICS"}
          </span>
        </div>

        {/* TASK TYPE SELECTOR (Phase 13B Requirement A) */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="font-mono text-[10.5px] uppercase text-slate-400 font-semibold tracking-wider mr-1">
            TASK TYPE:
          </span>
          {(["IMAGE", "IMAGE_BATCH", "VIDEO"] as const).map((type) => {
            const isActive = workloadType === type;
            const label = type === "IMAGE" ? "IMAGE" : type === "IMAGE_BATCH" ? "IMAGE BATCH" : "VIDEO";
            return (
              <button
                key={type}
                type="button"
                onClick={() => setWorkloadType(type)}
                className={`px-3 py-1.5 rounded font-mono text-[11px] tracking-wider uppercase transition-all cursor-pointer ${
                  isActive
                    ? "bg-cyan-950/70 border border-cyan-400 text-cyan-200 font-bold shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                    : "bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]"
                }`}
              >
                [ {label} ]
              </button>
            );
          })}
        </div>

        {/* Workload Mode Description */}
        <p className="font-sans text-[12px] text-slate-300 mb-3 leading-relaxed">
          {workloadType === "IMAGE" &&
            "Object detection identifies recognizable objects in the uploaded image and returns their class, confidence, and bounding-box location."}
          {workloadType === "IMAGE_BATCH" &&
            "Image batch mode bundles multiple images into a multi-frame workload for offload optimization. Add individual images or load a test batch."}
          {workloadType === "VIDEO" &&
            "Video workload mode accepts standard encoded video streams (MP4/WebM) to inspect multi-frame video analytics and temporal workloads."}
        </p>

        {/* Dynamic Mode-Specific File Upload & Management Controls */}
        <div className="flex flex-col gap-2.5">
          {/* 1. SINGLE IMAGE MODE */}
          {workloadType === "IMAGE" && (
            <>
              <input
                ref={singleFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleSingleFileChange}
              />

              {!uploadedImage ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded bg-cyan-950/20 border border-dashed border-cyan-500/40">
                  <button
                    type="button"
                    onClick={() => singleFileInputRef.current?.click()}
                    className="py-2 px-4 rounded border border-cyan-400/60 hover:border-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70 text-cyan-200 font-mono text-[11.5px] tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                  >
                    <span className="text-cyan-400 font-bold text-sm">⊕</span>
                    <span>UPLOAD IMAGE FOR TASK</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase text-slate-400">TEST SAMPLES:</span>
                    <button
                      type="button"
                      onClick={() => loadSingleSample("/samples/traffic_monitoring.jpg", "traffic_monitoring.jpg")}
                      className="py-1 px-2.5 rounded bg-white/[0.04] hover:bg-cyan-950/40 border border-white/[0.08] hover:border-cyan-400/60 text-[10.5px] font-mono text-slate-300 hover:text-cyan-200 transition-all cursor-pointer"
                    >
                      TRAFFIC (BUS + PEOPLE)
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSingleSample("/samples/drone_inspection.jpg", "drone_inspection.jpg")}
                      className="py-1 px-2.5 rounded bg-white/[0.04] hover:bg-cyan-950/40 border border-white/[0.08] hover:border-cyan-400/60 text-[10.5px] font-mono text-slate-300 hover:text-cyan-200 transition-all cursor-pointer"
                    >
                      DRONE (AERIAL)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 p-2.5 rounded bg-cyan-950/30 border border-cyan-500/40">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedImage.previewUrl}
                      alt="Upload thumbnail"
                      className="w-12 h-12 object-cover rounded border border-cyan-400/60 shadow-[0_0_8px_rgba(6,182,212,0.3)] flex-shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-mono text-[12px] text-cyan-200 font-semibold truncate max-w-[200px] sm:max-w-xs">
                        {uploadedImage.name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {(uploadedImage.sizeBytes / (1024 * 1024)).toFixed(2)} MB · {state.task.id}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => singleFileInputRef.current?.click()}
                      className="text-[10px] font-mono uppercase text-cyan-300 hover:text-cyan-100 px-2 py-1 rounded border border-cyan-500/30 hover:border-cyan-400/60 transition-colors cursor-pointer"
                    >
                      REPLACE
                    </button>
                    <button
                      type="button"
                      onClick={() => clearUploadedImage()}
                      disabled={["optimizing", "offloading", "executing"].includes(executionStage)}
                      className="text-[10px] font-mono uppercase text-slate-400 hover:text-rose-400 px-2 py-1 rounded border border-white/[0.06] hover:border-rose-500/40 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      ✕ REMOVE
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 2. IMAGE BATCH MODE */}
          {workloadType === "IMAGE_BATCH" && (
            <>
              <input
                ref={batchFileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleBatchFilesChange}
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded bg-cyan-950/20 border border-dashed border-cyan-500/40">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => batchFileInputRef.current?.click()}
                    className="py-2 px-3.5 rounded border border-cyan-400/60 hover:border-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70 text-cyan-200 font-mono text-[11.5px] tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                  >
                    <span className="text-cyan-400 font-bold text-sm">⊕</span>
                    <span>ADD IMAGES</span>
                  </button>
                  <button
                    type="button"
                    onClick={loadSampleBatch}
                    className="py-2 px-3 rounded bg-white/[0.04] hover:bg-cyan-950/40 border border-white/[0.08] hover:border-cyan-400/60 text-[10.5px] font-mono text-slate-300 hover:text-cyan-200 transition-all cursor-pointer"
                  >
                    + LOAD SAMPLE BATCH (2)
                  </button>
                </div>

                {batchImages.length > 0 && (
                  <button
                    type="button"
                    onClick={clearBatchImages}
                    className="text-[10px] font-mono uppercase text-slate-400 hover:text-rose-400 px-2.5 py-1 rounded border border-white/[0.08] hover:border-rose-500/40 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    ✕ CLEAR ALL ({batchImages.length})
                  </button>
                )}
              </div>

              {/* Batch Thumbnails & Files List */}
              {batchImages.length > 0 ? (
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {batchImages.map((img, idx) => (
                      <div
                        key={img.id}
                        className="flex items-center justify-between gap-2.5 p-2 rounded bg-cyan-950/25 border border-cyan-500/30 font-mono text-[11px]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {img.previewUrl && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={img.previewUrl}
                              alt={img.name}
                              className="w-8 h-8 object-cover rounded border border-cyan-400/50 flex-shrink-0"
                            />
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-cyan-200 font-medium truncate max-w-[120px] sm:max-w-[140px]">
                              {idx + 1}. {img.name}
                            </span>
                            <span className="text-[9.5px] text-slate-400">
                              {img.sizeMb.toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBatchImage(img.id)}
                          className="text-slate-400 hover:text-rose-400 text-xs px-1.5 py-0.5 rounded border border-white/[0.06] hover:border-rose-500/40 transition-colors cursor-pointer"
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded bg-black/30 border border-white/[0.06] text-center font-mono text-[11px] text-slate-400">
                  No batch images selected. Click <strong className="text-cyan-300">ADD IMAGES</strong> to select multiple image files or load the test batch.
                </div>
              )}
            </>
          )}

          {/* 3. VIDEO MODE */}
          {workloadType === "VIDEO" && (
            <>
              <input
                ref={videoFileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                className="hidden"
                onChange={handleVideoFileChange}
              />

              {!uploadedVideo ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded bg-cyan-950/20 border border-dashed border-cyan-500/40">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => videoFileInputRef.current?.click()}
                      className="py-2 px-4 rounded border border-cyan-400/60 hover:border-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70 text-cyan-200 font-mono text-[11.5px] tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                    >
                      <span className="text-cyan-400 font-bold text-sm">▶</span>
                      <span>UPLOAD VIDEO (.MP4, .WEBM)</span>
                    </button>
                    <button
                      type="button"
                      onClick={loadSampleVideo}
                      className="py-2 px-3 rounded bg-white/[0.04] hover:bg-cyan-950/40 border border-white/[0.08] hover:border-cyan-400/60 text-[10.5px] font-mono text-slate-300 hover:text-cyan-200 transition-all cursor-pointer"
                    >
                      + LOAD SAMPLE VIDEO
                    </button>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">
                    Common browser formats: MP4, WebM
                  </span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded bg-cyan-950/30 border border-cyan-500/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded bg-black/60 border border-cyan-400/60 flex items-center justify-center text-cyan-300 text-lg flex-shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                      ▶
                    </div>
                    <div className="flex flex-col min-w-0 font-mono">
                      <span className="text-[12px] text-cyan-200 font-semibold truncate max-w-[200px] sm:max-w-xs">
                        {uploadedVideo.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {uploadedVideo.sizeMb.toFixed(2)} MB ·{" "}
                        {videoMetadata?.durationSeconds != null ? `${videoMetadata.durationSeconds}s` : "Detecting length..."} ·{" "}
                        {videoMetadata?.resolution || "Detecting resolution..."}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto font-mono">
                    <button
                      type="button"
                      onClick={() => videoFileInputRef.current?.click()}
                      className="text-[10px] uppercase text-cyan-300 hover:text-cyan-100 px-2 py-1 rounded border border-cyan-500/30 hover:border-cyan-400/60 transition-colors cursor-pointer"
                    >
                      REPLACE
                    </button>
                    <button
                      type="button"
                      onClick={clearUploadedVideo}
                      className="text-[10px] uppercase text-slate-400 hover:text-rose-400 px-2 py-1 rounded border border-white/[0.06] hover:border-rose-500/40 transition-colors cursor-pointer"
                    >
                      ✕ REMOVE
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* SECTION B: WORKLOAD SUMMARY (Requirement B) */}
          <div className="p-2.5 rounded bg-cyan-950/30 border border-cyan-500/40 font-mono mt-1">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5 mb-2">
              <span className="text-[10.5px] uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                WORKLOAD SUMMARY
              </span>
              <span className="text-[10px] text-slate-400 uppercase">
                {workloadType === "IMAGE" ? "IMAGE WORKLOAD" : workloadType === "IMAGE_BATCH" ? "BATCH WORKLOAD" : "VIDEO WORKLOAD"}
              </span>
            </div>

            {workloadType === "IMAGE" && (
              <div className="flex items-center justify-between text-[11.5px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 uppercase text-[10px]">Type:</span>
                  <span className="text-cyan-200 font-bold">1 image</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 uppercase text-[10px]">Size:</span>
                  <span className="text-slate-100 font-bold">
                    {uploadedImage ? `${(uploadedImage.sizeBytes / (1024 * 1024)).toFixed(2)} MB` : `${state.task.taskSizeMb} MB`}
                  </span>
                </div>
              </div>
            )}

            {workloadType === "IMAGE_BATCH" && (
              <div className="flex items-center justify-between text-[11.5px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 uppercase text-[10px]">Images:</span>
                  <span className="text-cyan-200 font-bold">{batchImages.length} images</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 uppercase text-[10px]">Total Payload:</span>
                  <span className="text-slate-100 font-bold">
                    {batchImages.length > 0
                      ? `${(batchImages.reduce((sum, f) => sum + f.sizeBytes, 0) / (1024 * 1024)).toFixed(2)} MB total`
                      : "0.0 MB total"}
                  </span>
                </div>
              </div>
            )}

            {workloadType === "VIDEO" && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-[11.5px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 uppercase text-[10px]">Stream:</span>
                  <span className="text-cyan-200 font-bold">{uploadedVideo ? "1 video" : "No video loaded"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 uppercase text-[10px]">Size:</span>
                  <span className="text-slate-100 font-bold">
                    {uploadedVideo ? `${uploadedVideo.sizeMb.toFixed(2)} MB` : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 uppercase text-[10px]">Duration:</span>
                  <span className="text-cyan-300 font-bold">
                    {videoMetadata?.durationSeconds != null ? `${videoMetadata.durationSeconds} seconds` : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 uppercase text-[10px]">Resolution:</span>
                  <span className="text-cyan-300 font-bold">{videoMetadata?.resolution || "—"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Important Terminology Specification (Phase 13E Requirement 4) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px]">
            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04] flex flex-col">
              <span className="text-slate-400 uppercase text-[9px]">Input:</span>
              <span className="text-cyan-200 font-medium">
                {workloadType === "IMAGE" ? "uploaded image" : workloadType === "IMAGE_BATCH" ? "image batch" : "video stream"}
              </span>
            </div>
            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04] flex flex-col">
              <span className="text-slate-400 uppercase text-[9px]">Model:</span>
              <span className="text-cyan-200 font-medium">SSD MobileNet V3</span>
            </div>
            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04] flex flex-col">
              <span className="text-slate-400 uppercase text-[9px]">Task:</span>
              <span className="text-cyan-200 font-medium">
                {workloadType === "IMAGE" ? "identify objects & boxes" : workloadType === "IMAGE_BATCH" ? "batch object localization" : "video temporal detection"}
              </span>
            </div>
            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.04] flex flex-col">
              <span className="text-slate-400 uppercase text-[9px]">Output:</span>
              <span className="text-cyan-200 font-medium">
                {workloadType === "IMAGE" ? "classes, scores, boxes" : workloadType === "IMAGE_BATCH" ? "batch detections & metrics" : "frame detection stream"}
              </span>
            </div>
          </div>

          {/* Task Parameters (Deadline & Priority) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 font-mono">
            <div className="flex flex-col p-2 rounded bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[9.5px] uppercase text-slate-400">PAYLOAD SIZE</span>
              <span className="text-[13px] font-semibold text-slate-200">{state.task.taskSizeMb} MB</span>
            </div>
            <div className="flex flex-col p-2 rounded bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[9.5px] uppercase text-slate-400">EST. CPU DEMAND</span>
              <span className="text-[13px] font-semibold text-cyan-300">{state.task.cpuDemandPct}%</span>
            </div>
            <div className="flex flex-col p-2 rounded bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[9.5px] uppercase text-slate-400">DEADLINE LIMIT</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-slate-200">{state.task.deadlineMs} MS</span>
                <button
                  type="button"
                  onClick={() => updateTask({ deadlineMs: state.task.deadlineMs === 45 ? 90 : 45 })}
                  className="text-[9px] text-cyan-400 hover:underline uppercase cursor-pointer"
                >
                  [TOGGLE]
                </button>
              </div>
            </div>
            <div className="flex flex-col p-2 rounded bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[9.5px] uppercase text-slate-400">PRIORITY LEVEL</span>
              <span className="text-[13px] font-semibold text-amber-300">LVL {state.task.priority} / 5</span>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* SECTION 2: EXPERIMENT CONDITIONS (SIMULATION INPUTS) */}
      {/* -------------------------------------------------- */}
      <div className="flex flex-col p-4 rounded-lg bg-[#040914]/90 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.12)]">
        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
            <span className="font-mono text-[13px] sm:text-[14px] tracking-[0.10em] uppercase text-cyan-200 font-bold">
              {"// EXPERIMENT CONDITIONS [SIMULATION INPUTS]"}
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 uppercase">
            DQN POLICY STRESS TESTING
          </span>
        </div>
        <p className="font-sans text-[11.5px] text-slate-400 mb-3">
          Configure environmental workload and stress factors. Changing these experiment inputs automatically calculates the simulated environment state feeding the DQN agent.
        </p>

        {/* 4 Experiment Condition Controls */}
        <div className="flex flex-col divide-y divide-white/[0.04]">
          <ConditionSelector<WorkloadLevel>
            label="LOCAL WORKLOAD"
            currentValue={experimentConditions.localWorkload}
            options={[
              { value: "LOW", label: "LOW (NOMINAL)" },
              { value: "MEDIUM", label: "MEDIUM (BUSY)" },
              { value: "HIGH", label: "HIGH (THROTTLED)" },
            ]}
            accentColor="#fbbf24"
            onChange={(val) => setExperimentCondition("localWorkload", val)}
          />

          <ConditionSelector<WorkloadLevel>
            label="EDGE CONGESTION"
            currentValue={experimentConditions.edgeCongestion}
            options={[
              { value: "LOW", label: "LOW (IDLE FOG)" },
              { value: "MEDIUM", label: "MEDIUM (ACTIVE)" },
              { value: "HIGH", label: "HIGH (CONGESTED)" },
            ]}
            accentColor="#34d399"
            onChange={(val) => setExperimentCondition("edgeCongestion", val)}
          />

          <ConditionSelector<WorkloadLevel>
            label="CLOUD LOAD"
            currentValue={experimentConditions.cloudLoad}
            options={[
              { value: "LOW", label: "LOW (AVAILABLE)" },
              { value: "MEDIUM", label: "MEDIUM (LOADED)" },
              { value: "HIGH", label: "HIGH (PEAK DC)" },
            ]}
            accentColor="#a78bfa"
            onChange={(val) => setExperimentCondition("cloudLoad", val)}
          />

          <ConditionSelector<NetworkConditionLevel>
            label="NETWORK CONDITION"
            currentValue={experimentConditions.networkCondition}
            options={[
              { value: "GOOD", label: "GOOD (LOW LATENCY)" },
              { value: "LIMITED", label: "LIMITED (MODERATE)" },
              { value: "POOR", label: "POOR (HIGH LATENCY)" },
            ]}
            accentColor="#38bdf8"
            onChange={(val) => setExperimentCondition("networkCondition", val)}
          />
        </div>

        {/* Preset Modes Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 pt-3 border-t border-white/[0.06]">
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold">
            SCENARIO PRESETS:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SCENARIO_PRESETS.map((preset) => {
              const isCurrent = state.activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  aria-pressed={isCurrent}
                  className={`py-1 px-2.5 rounded text-[10.5px] font-mono tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                    isCurrent
                      ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] border border-white/[0.06]"
                  }`}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* SECTION 3: NODE TELEMETRY (READ-ONLY INDICATORS)   */}
      {/* -------------------------------------------------- */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold">
            ENVIRONMENT TELEMETRY [READ-ONLY SENSORS]
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            DQN INPUT VECTOR STATE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 pt-1">
          {/* COLUMN 1: LOCAL DEVICE (CLIENT) */}
          <div className="flex flex-col p-3 rounded-lg bg-[#040810]/70 border border-amber-500/30">
            <div className="parameter-heading flex items-center justify-between border-b border-amber-500/40 pb-1.5 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                <span className="font-mono text-[12.5px] sm:text-[13px] tracking-[0.10em] uppercase text-amber-300 font-semibold">
                  {"// LOCAL DEVICE"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-[8.5px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                    isLocalReal
                      ? "text-emerald-300 bg-emerald-950/60 border-emerald-500/40"
                      : "text-amber-300 bg-amber-950/60 border-amber-500/40"
                  }`}
                >
                  {isLocalReal ? "REAL HOST" : "SIMULATED WORKLOAD"}
                </span>
                <button
                  type="button"
                  onClick={() => fetchRealTelemetry()}
                  disabled={telemetryLoading}
                  className="text-[8.5px] font-mono text-slate-400 hover:text-amber-300 px-1 py-0.5 rounded border border-white/[0.06] transition-colors cursor-pointer"
                  title="Resample host hardware telemetry"
                >
                  {telemetryLoading ? "..." : "↻"}
                </button>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-white/[0.04]">
              <ReadOnlyTelemetryIndicator
                label="CPU Available"
                value={state.device.cpuAvailablePct}
                unit="%"
                accentColor="#fbbf24"
                pct={state.device.cpuAvailablePct}
                statusBadge={isLocalReal ? "REAL" : "APPLIED"}
                statusColor={isLocalReal ? "text-emerald-300 border-emerald-500/30" : "text-amber-300 border-amber-500/30"}
                subtitle={isLocalReal ? `Host load: ${realLocalTelemetry?.cpu_load}% (${realLocalTelemetry?.cpu_count} logical cores)` : undefined}
              />
              <ReadOnlyTelemetryIndicator
                label="Memory Avail"
                value={state.device.memoryAvailablePct}
                unit="%"
                accentColor="#fbbf24"
                pct={state.device.memoryAvailablePct}
                statusBadge={isLocalReal ? "REAL" : "APPLIED"}
                statusColor={isLocalReal ? "text-emerald-300 border-emerald-500/30" : "text-amber-300 border-amber-500/30"}
                subtitle={isLocalReal ? `RAM total: ${realLocalTelemetry?.memory_total_gb} GB` : undefined}
              />
              <ReadOnlyTelemetryIndicator
                label="Battery Level"
                value={realLocalTelemetry?.battery_pct != null ? state.device.batteryPct : "AC MAINS"}
                unit={realLocalTelemetry?.battery_pct != null ? "%" : ""}
                accentColor="#fbbf24"
                pct={realLocalTelemetry?.battery_pct != null ? state.device.batteryPct : 100}
                statusBadge={realLocalTelemetry?.battery_is_real ? "REAL" : "UNAVAILABLE"}
                statusColor={realLocalTelemetry?.battery_is_real ? "text-emerald-300 border-emerald-500/30" : "text-slate-400 border-white/[0.08]"}
                subtitle={realLocalTelemetry?.battery_status || "Desktop / AC Mains"}
              />
              <ReadOnlyTelemetryIndicator
                label="Base Latency"
                value={state.device.latencyMs}
                unit="MS"
                accentColor="#fbbf24"
                pct={Math.min(100, (state.device.latencyMs / 10) * 100)}
                statusBadge="LOOPBACK"
                statusColor="text-slate-400 border-white/[0.08]"
                subtitle="Local dispatch overhead"
              />
            </div>
          </div>

          {/* COLUMN 2: EDGE SERVER (SIMULATED FOG) */}
          <div className="flex flex-col p-3 rounded-lg bg-[#040810]/70 border border-emerald-500/30">
            <div className="parameter-heading flex items-center justify-between border-b border-emerald-500/40 pb-1.5 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="font-mono text-[12.5px] sm:text-[13px] tracking-[0.10em] uppercase text-emerald-300 font-semibold">
                  {"// EDGE SERVER"}
                </span>
              </div>
              <span className="text-[8.5px] font-mono uppercase px-1.5 py-0.5 rounded border text-emerald-300 bg-emerald-950/60 border-emerald-500/40">
                SIMULATED FOG
              </span>
            </div>

            <div className="flex flex-col divide-y divide-white/[0.04]">
              <ReadOnlyTelemetryIndicator
                label="CPU Load"
                value={state.edge.cpuLoadPct}
                unit="%"
                accentColor="#34d399"
                pct={state.edge.cpuLoadPct}
                statusBadge="SIMULATED"
                subtitle="Fog node capacity usage"
              />
              <ReadOnlyTelemetryIndicator
                label="Task Queue"
                value={state.edge.queueLength}
                unit="TASKS"
                accentColor="#34d399"
                pct={Math.min(100, (state.edge.queueLength / 30) * 100)}
                statusBadge="SIMULATED"
                subtitle="Pending execution queue"
              />
              <ReadOnlyTelemetryIndicator
                label="RAN Latency"
                value={state.edge.latencyMs}
                unit="MS"
                accentColor="#34d399"
                pct={Math.min(100, (state.edge.latencyMs / 60) * 100)}
                statusBadge="SIMULATED"
                subtitle="Local wireless link overhead"
              />
              <ReadOnlyTelemetryIndicator
                label="Bandwidth"
                value={state.edge.bandwidthGbps}
                unit="GBPS"
                accentColor="#34d399"
                pct={Math.min(100, (state.edge.bandwidthGbps / 40) * 100)}
                statusBadge="SIMULATED"
                subtitle="Fog ingress throughput"
              />
            </div>
          </div>

          {/* COLUMN 3: CLOUD INFRASTRUCTURE (SIMULATED DATACENTER) */}
          <div className="flex flex-col p-3 rounded-lg bg-[#040810]/70 border border-violet-500/30">
            <div className="parameter-heading flex items-center justify-between border-b border-violet-500/40 pb-1.5 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_8px_#a78bfa]" />
                <span className="font-mono text-[12.5px] sm:text-[13px] tracking-[0.10em] uppercase text-violet-300 font-semibold">
                  {"// CLOUD INFRASTRUCTURE"}
                </span>
              </div>
              <span className="text-[8.5px] font-mono uppercase px-1.5 py-0.5 rounded border text-violet-300 bg-violet-950/60 border-violet-500/40">
                SIMULATED DC
              </span>
            </div>

            <div className="flex flex-col divide-y divide-white/[0.04]">
              <ReadOnlyTelemetryIndicator
                label="CPU Load"
                value={state.cloud.cpuLoadPct}
                unit="%"
                accentColor="#a78bfa"
                pct={state.cloud.cpuLoadPct}
                statusBadge="SIMULATED"
                subtitle="Cluster compute load"
              />
              <ReadOnlyTelemetryIndicator
                label="Task Queue"
                value={state.cloud.queueLength}
                unit="TASKS"
                accentColor="#a78bfa"
                pct={Math.min(100, (state.cloud.queueLength / 30) * 100)}
                statusBadge="SIMULATED"
                subtitle="Datacenter queue depth"
              />
              <ReadOnlyTelemetryIndicator
                label="WAN Latency"
                value={state.cloud.latencyMs}
                unit="MS"
                accentColor="#a78bfa"
                pct={Math.min(100, (state.cloud.latencyMs / 200) * 100)}
                statusBadge="SIMULATED"
                subtitle="Backhaul transmission transit"
              />
              <ReadOnlyTelemetryIndicator
                label="Bandwidth"
                value={state.cloud.bandwidthGbps}
                unit="GBPS"
                accentColor="#a78bfa"
                pct={Math.min(100, (state.cloud.bandwidthGbps / 80) * 100)}
                statusBadge="SIMULATED"
                subtitle="Fiber backbone capacity"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================================================
// BOTTOM RESULT STRIP: PIPELINE / REAL DETECTION RESULTS / DECISION / CTA
// ==================================================
export function SimulationBottomResultStrip() {
  const {
    state,
    decision,
    reset,
    runSimulation,
    apiStatus,
    apiError,
    uploadedImage,
    workloadType,
    batchImages,
    uploadedVideo,
    videoMetadata,
    executionStage,
    stageLabel,
    executionDetails,
    executionError,
    executeUploadedTask,
  } = useSimulationState();

  const selectedTarget = decision.selectedTarget;

  const targetColor = {
    local: "text-amber-400",
    edge: "text-emerald-400",
    cloud: "text-violet-400",
  }[selectedTarget];

  const isExecuting = ["optimizing", "offloading", "executing"].includes(executionStage) || apiStatus === "running";

  return (
    <div className="decision-strip-container w-full flex flex-col gap-4 text-slate-200 select-none">
      {/* Dynamic Offloading Pipeline Progress Indicator */}
      {executionStage !== "idle" && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded bg-black/50 border border-white/[0.08] font-mono text-[10.5px] tracking-wider uppercase">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">PIPELINE:</span>
            <span className={executionStage === "created" ? "text-cyan-300 font-bold" : "text-slate-500"}>
              TASK CREATED
            </span>
            <span className="text-slate-600">→</span>
            <span
              className={
                executionStage === "optimizing"
                  ? "text-cyan-300 font-bold animate-pulse"
                  : ["offloading", "executing", "ready"].includes(executionStage)
                  ? "text-cyan-400"
                  : "text-slate-600"
              }
            >
              DQN OPTIMIZING
            </span>
            <span className="text-slate-600">→</span>
            <span
              className={
                executionStage === "offloading"
                  ? "text-cyan-300 font-bold animate-pulse"
                  : ["executing", "ready"].includes(executionStage)
                  ? "text-cyan-400"
                  : "text-slate-600"
              }
            >
              {executionStage === "offloading" ? stageLabel : `OFFLOAD (${decision.selectedCandidate.displayName})`}
            </span>
            <span className="text-slate-600">→</span>
            <span
              className={
                executionStage === "executing"
                  ? "text-cyan-300 font-bold animate-pulse"
                  : executionStage === "ready"
                  ? "text-cyan-400"
                  : "text-slate-600"
              }
            >
              EXECUTING
            </span>
            <span className="text-slate-600">→</span>
            <span className={executionStage === "ready" ? "text-emerald-400 font-bold" : "text-slate-600"}>
              RESULT READY
            </span>
          </div>

          {executionError && (
            <span className="text-rose-400 text-[10px] truncate max-w-[280px]">
              ERROR: {executionError}
            </span>
          )}
        </div>
      )}

      {/* Real Object Detection Results Card (Phase 13D & 13E Requirements 2, 3, 4 + Phase 13B Multi-Workload) */}
      <div className="cv-result-panel my-7 sm:my-8 p-5 sm:p-6 rounded-lg bg-[#030712]/95 border border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.18)] flex flex-col gap-4">
        {/* Header row with workload explanation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 pb-2.5">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${executionDetails ? "bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" : "bg-cyan-500/50"}`} />
            <span className="font-mono text-[13px] uppercase tracking-wider text-cyan-300 font-bold">
              {workloadType === "IMAGE"
                ? "// OBJECT DETECTION INFERENCE"
                : workloadType === "IMAGE_BATCH"
                ? "// BATCH WORKLOAD EXECUTION STATUS"
                : "// VIDEO STREAM WORKLOAD STATUS"}
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/50 text-cyan-200">
              {workloadType === "IMAGE" ? "SSD MobileNet V3" : workloadType === "IMAGE_BATCH" ? "BATCH INFERENCE" : "VIDEO ANALYTICS"}
            </span>
            {executionDetails && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-400/50 text-emerald-300 font-semibold">
                EXECUTED IN {executionDetails.execution_environment}
              </span>
            )}
            {executionDetails?.execution_worker && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/50 text-cyan-200">
                WORKER: {executionDetails.execution_worker}
              </span>
            )}
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            {workloadType === "IMAGE"
              ? "Task: Identify recognizable objects & bounding-box localization"
              : workloadType === "IMAGE_BATCH"
              ? "Task: Multi-image aggregated workload scheduling"
              : "Task: Video stream temporal frame analytics"}
          </span>
        </div>

        {/* What is being processed explanation */}
        <div className="p-3 rounded bg-cyan-950/25 border border-cyan-500/30 flex flex-col gap-1">
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-cyan-300 font-bold">
            WHAT IS BEING PROCESSED?
          </span>
          <p className="font-sans text-[11.5px] text-slate-300 leading-relaxed">
            {workloadType === "IMAGE" &&
              "The uploaded image is the task payload. The selected execution environment runs the object-detection model on that image. The system is NOT enhancing, resizing, or editing the image for quality."}
            {workloadType === "IMAGE_BATCH" &&
              `The image batch (${state.task.taskSizeMb} MB total across ${batchImages.length} images) forms an aggregated workload. The DQN agent evaluates network latency, queue depth, and compute resources to select optimal offloading placement.`}
            {workloadType === "VIDEO" &&
              `The video stream (${uploadedVideo ? `${uploadedVideo.sizeMb.toFixed(2)} MB` : "pending upload"}) represents continuous multi-frame analytics. Telemetry and deadlines are optimized across Local, Edge, and Cloud tiers.`}
          </p>
        </div>

        {workloadType === "IMAGE" ? (
          executionDetails && executionStage === "ready" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left: Annotated Image with visible bounding boxes (lg:col-span-5) */}
              <div className="lg:col-span-5 flex flex-col gap-1.5">
                {executionDetails.annotated_image_base64 ? (
                  <div className="relative group rounded border border-cyan-500/60 overflow-hidden bg-black/60 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={executionDetails.annotated_image_base64}
                      alt="SSD MobileNet V3 Object Detection with Bounding Boxes"
                      className="w-full h-48 sm:h-56 object-contain bg-black/80"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-cyan-400/60 font-mono text-[10px] text-cyan-300 backdrop-blur-sm">
                      {executionDetails.image_metadata?.width}×{executionDetails.image_metadata?.height} · {(executionDetails.image_metadata?.size_bytes / 1024).toFixed(1)} KB
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-400/60 font-mono text-[10px] text-cyan-200 font-bold">
                      CYAN BOXES: SSD MobileNet V3
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center rounded border border-white/[0.08] bg-black/40 font-mono text-slate-400 text-xs">
                    No preview available
                  </div>
                )}
              </div>

              {/* Middle: Detected Objects Breakdown (lg:col-span-4) */}
              <div className="lg:col-span-4 flex flex-col gap-2">
                <div className="flex flex-col border-b border-white/[0.08] pb-1.5 gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[12px] uppercase tracking-wider text-slate-200 font-bold">
                      OBJECTS DETECTED: {executionDetails.detection_count}
                    </span>
                    <span className="font-mono text-[10px] text-cyan-400/80">
                      &gt; 40% CONFIDENCE
                    </span>
                  </div>
                  <span className="font-mono text-[9.5px] text-slate-400">
                    OBJECTS DETECTED = number of recognized objects above the configured confidence threshold.
                  </span>
                </div>

                {executionDetails.detections.length > 0 ? (
                  <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                    {executionDetails.detections.map((det, idx) => {
                      const confPct = Math.round(det.confidence * 1000) / 10;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-3 py-2 rounded bg-black/60 border border-emerald-500/30 font-mono text-[11.5px]"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                            <span className="text-emerald-300 font-semibold uppercase tracking-wider">
                              {det.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 tabular-nums">
                            <div className="w-20 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                              <div
                                className="h-full bg-emerald-400"
                                style={{ width: `${confPct}%` }}
                              />
                            </div>
                            <span className="text-slate-100 font-bold min-w-[5.2ch] text-right">
                              {confPct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3.5 rounded bg-black/40 border border-white/[0.06] font-mono text-[11px] text-slate-400 italic">
                    OBJECTS DETECTED: 0
                    <p className="text-[10px] text-slate-400 mt-1 not-italic">
                      No recognizable objects met or exceeded the 40% confidence threshold in this frame.
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Empirical Metrics Grid (lg:col-span-3) */}
              <div className="lg:col-span-3 flex flex-col gap-2 border-t lg:border-t-0 lg:border-l border-white/[0.08] lg:pl-4 pt-2 lg:pt-0">
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold">
                  EXECUTION TELEMETRY
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="p-2 rounded bg-white/[0.02] border border-white/[0.06] flex flex-col">
                    <span className="text-[9px] uppercase text-slate-400">INFERENCE</span>
                    <span className="text-[13px] font-bold text-cyan-300 tabular-nums">
                      {executionDetails.processing_time_ms || executionDetails.execution_time_ms} ms
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white/[0.02] border border-white/[0.06] flex flex-col">
                    <span className="text-[9px] uppercase text-slate-400">NETWORK TIME</span>
                    <span className="text-[13px] font-bold text-amber-300 tabular-nums">
                      {executionDetails.network_transfer_ms != null ? `${executionDetails.network_transfer_ms} ms` : "0.0 ms"}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white/[0.02] border border-white/[0.06] flex flex-col">
                    <span className="text-[9px] uppercase text-slate-400">TOTAL LATENCY</span>
                    <span className="text-[13px] font-bold text-slate-100 tabular-nums">
                      {executionDetails.latency_ms} ms
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white/[0.02] border border-white/[0.06] flex flex-col">
                    <span className="text-[9px] uppercase text-slate-400">ENERGY</span>
                    <span className="text-[13px] font-bold text-amber-300 tabular-nums">
                      {executionDetails.energy} J
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white/[0.02] border border-white/[0.06] flex flex-col">
                    <span className="text-[9px] uppercase text-slate-400">COST</span>
                    <span className="text-[13px] font-bold text-violet-300 tabular-nums">
                      {executionDetails.cost}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white/[0.02] border border-white/[0.06] flex flex-col">
                    <span className="text-[9px] uppercase text-slate-400">DEADLINE</span>
                    <span
                      className={`text-[13px] font-bold tabular-nums ${
                        executionDetails.feasible ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {executionDetails.feasible ? "PASS" : "RISK"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded bg-black/40 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[11px] text-slate-400">
              <span>Awaiting task execution. Select a test sample above or upload an image, then click <strong className="text-cyan-300">RUN TASK</strong> to execute offloaded neural object detection.</span>
              <span className="text-cyan-400/80 uppercase text-[10px] flex-shrink-0">STATUS: STANDBY</span>
            </div>
          )
        ) : workloadType === "IMAGE_BATCH" ? (
          executionDetails && executionStage === "ready" ? (
            /* REAL BATCH EXECUTION RESULTS (Phase 14) */
            <div className="p-4 rounded bg-cyan-950/20 border border-cyan-500/40 font-mono flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span className="text-emerald-300 font-bold uppercase tracking-wider text-[12px]">
                    STATUS: BATCH EXECUTION COMPLETE
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-400/40 uppercase font-semibold">
                    {executionDetails.execution_environment}
                  </span>
                  {executionDetails.execution_worker && (
                    <span className="text-[10px] text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/40 uppercase">
                      {executionDetails.execution_worker}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">TOTAL PAYLOAD:</span>
                  <span className="text-slate-100 font-bold">
                    {executionDetails.input_size_mb != null ? `${executionDetails.input_size_mb} MB` : `${state.task.taskSizeMb} MB`}
                  </span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">PROCESSED:</span>
                  <span className="text-cyan-300 font-bold">
                    {executionDetails.processed_count || batchImages.length} images
                  </span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">OBJECTS DETECTED:</span>
                  <span className="text-emerald-300 font-bold">{executionDetails.detection_count}</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">INFERENCE TIME:</span>
                  <span className="text-cyan-300 font-bold">
                    {executionDetails.processing_time_ms || executionDetails.execution_time_ms} ms
                  </span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">NETWORK TRANSFER:</span>
                  <span className="text-amber-300 font-bold">
                    {executionDetails.network_transfer_ms != null ? `${executionDetails.network_transfer_ms} ms` : "0.0 ms"}
                  </span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">TOTAL LATENCY:</span>
                  <span className="text-slate-100 font-bold">{executionDetails.latency_ms} ms</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">DQN CONFIDENCE:</span>
                  <span className="text-emerald-300 font-bold">
                    {(executionDetails.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">DEADLINE STATUS:</span>
                  <span className={`font-bold ${executionDetails.feasible ? "text-emerald-400" : "text-rose-400"}`}>
                    {executionDetails.feasible ? "PASS" : "RISK"}
                  </span>
                </div>
              </div>

              {/* Batch items breakdown if available */}
              {executionDetails.batch_items && executionDetails.batch_items.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-1 border-t border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    INDIVIDUAL FRAME BREAKDOWN ({executionDetails.batch_items.length} ITEMS):
                  </span>
                  <div className="max-h-36 overflow-y-auto flex flex-col gap-1 pr-1">
                    {executionDetails.batch_items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded bg-black/50 border border-white/[0.06] text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-[10px]">#{idx + 1}</span>
                          <span className="text-slate-200 font-medium truncate max-w-[160px] sm:max-w-[240px]">
                            {item.filename}
                          </span>
                          <span className="text-slate-500 text-[9.5px]">({item.size_mb} MB)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-300 font-semibold">
                            {item.detection_count} {item.detection_count === 1 ? "object" : "objects"}
                          </span>
                          <span className="text-cyan-300 tabular-nums font-mono text-[10.5px]">
                            {item.inference_time_ms} ms
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* BATCH STANDBY */
            <div className="p-4 rounded bg-cyan-950/20 border border-cyan-500/40 font-mono flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span className="text-emerald-300 font-bold uppercase tracking-wider text-[12px]">
                    STATUS: READY FOR WORKLOAD EXECUTION
                  </span>
                </div>
                <span className="text-[10px] text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/40 uppercase">
                  IMAGE BATCH ({batchImages.length} FRAMES)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">TOTAL PAYLOAD:</span>
                  <span className="text-slate-100 font-bold">{state.task.taskSizeMb} MB</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">IMAGE COUNT:</span>
                  <span className="text-cyan-300 font-bold">{batchImages.length}</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">SELECTED TIER:</span>
                  <span className="text-emerald-300 font-bold">{decision.selectedCandidate.displayName}</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">DQN COST INDEX:</span>
                  <span className="text-violet-300 font-bold">{decision.selectedCandidate.score}</span>
                </div>
              </div>
              <p className="font-sans text-[11.5px] text-slate-300 leading-relaxed pt-1">
                {batchImages.length > 0
                  ? `Workload input configured: ${batchImages.length} images (${state.task.taskSizeMb} MB total). Click 'EXECUTE BATCH OFFLOAD' below to run real batch inference on the DQN-selected worker.`
                  : "No batch images added yet. Add image files in the TASK & PAYLOAD section above or click '+ LOAD SAMPLE BATCH' to test offload execution."}
              </p>
            </div>
          )
        ) : (
          executionDetails && executionStage === "ready" ? (
            /* REAL VIDEO EXECUTION RESULTS (Phase 14) */
            <div className="p-4 rounded bg-cyan-950/20 border border-cyan-500/40 font-mono flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span className="text-emerald-300 font-bold uppercase tracking-wider text-[12px]">
                    STATUS: VIDEO STREAM ANALYTICS COMPLETE
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-400/40 uppercase font-semibold">
                    {executionDetails.execution_environment}
                  </span>
                  {executionDetails.execution_worker && (
                    <span className="text-[10px] text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/40 uppercase">
                      {executionDetails.execution_worker}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">STREAM SIZE:</span>
                  <span className="text-slate-100 font-bold">
                    {executionDetails.input_size_mb != null
                      ? `${executionDetails.input_size_mb} MB`
                      : uploadedVideo
                      ? `${uploadedVideo.sizeMb.toFixed(2)} MB`
                      : `${state.task.taskSizeMb} MB`}
                  </span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">FRAMES ANALYZED:</span>
                  <span className="text-cyan-300 font-bold">
                    {executionDetails.processed_count} keyframes
                  </span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">OBJECTS DETECTED:</span>
                  <span className="text-emerald-300 font-bold">{executionDetails.detection_count}</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">INFERENCE TIME:</span>
                  <span className="text-cyan-300 font-bold">
                    {executionDetails.processing_time_ms || executionDetails.execution_time_ms} ms
                  </span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">NETWORK TRANSFER:</span>
                  <span className="text-amber-300 font-bold">
                    {executionDetails.network_transfer_ms != null ? `${executionDetails.network_transfer_ms} ms` : "0.0 ms"}
                  </span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">TOTAL LATENCY:</span>
                  <span className="text-slate-100 font-bold">{executionDetails.latency_ms} ms</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">DQN CONFIDENCE:</span>
                  <span className="text-emerald-300 font-bold">
                    {(executionDetails.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">DEADLINE STATUS:</span>
                  <span className={`font-bold ${executionDetails.feasible ? "text-emerald-400" : "text-rose-400"}`}>
                    {executionDetails.feasible ? "PASS" : "RISK"}
                  </span>
                </div>
              </div>

              {/* Detected classes in video frames */}
              {executionDetails.detections && executionDetails.detections.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-1 border-t border-white/[0.06]">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    OBJECTS IDENTIFIED ACROSS KEYFRAMES:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {executionDetails.detections.map((det, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded bg-black/60 border border-emerald-500/30 text-[11px] text-emerald-300 font-mono flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="uppercase">{det.label}</span>
                        <span className="text-slate-400">({Math.round(det.confidence * 100)}%)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* VIDEO STANDBY */
            <div className="p-4 rounded bg-cyan-950/20 border border-cyan-500/40 font-mono flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span className="text-emerald-300 font-bold uppercase tracking-wider text-[12px]">
                    STATUS: READY FOR WORKLOAD EXECUTION
                  </span>
                </div>
                <span className="text-[10px] text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/40 uppercase">
                  VIDEO STREAM WORKLOAD
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">STREAM SIZE:</span>
                  <span className="text-slate-100 font-bold">
                    {uploadedVideo ? `${uploadedVideo.sizeMb.toFixed(2)} MB` : `${state.task.taskSizeMb} MB`}
                  </span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">DURATION:</span>
                  <span className="text-cyan-300 font-bold">
                    {videoMetadata?.durationSeconds != null ? `${videoMetadata.durationSeconds}s` : "—"}
                  </span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">RESOLUTION:</span>
                  <span className="text-cyan-300 font-bold">{videoMetadata?.resolution || "—"}</span>
                </div>
                <div className="p-2 rounded bg-black/40 border border-white/[0.06] flex flex-col">
                  <span className="text-slate-400 text-[9px] uppercase">SELECTED TIER:</span>
                  <span className="text-emerald-300 font-bold">{decision.selectedCandidate.displayName}</span>
                </div>
              </div>
              <p className="font-sans text-[11.5px] text-slate-300 leading-relaxed pt-1">
                {uploadedVideo
                  ? `Workload input configured: video file '${uploadedVideo.name}' (${uploadedVideo.sizeMb.toFixed(2)} MB${videoMetadata?.durationSeconds ? `, ${videoMetadata.durationSeconds}s` : ""}${videoMetadata?.resolution ? `, ${videoMetadata.resolution}` : ""}). Click 'EXECUTE VIDEO OFFLOAD' below to run real keyframe inference on the DQN-selected worker.`
                  : "No video file loaded. Upload an MP4 or WebM file in the TASK & PAYLOAD section above or load the sample video to test offload execution."}
              </p>
            </div>
          )
        )}
      </div>

      {/* Main Bottom Strip: Live Decision / Scores / Primary Execution CTA */}
      <div className="decision-strip w-full flex items-center justify-between gap-6 text-slate-200 select-none">
        {/* 1. Live Decision & Selected Environment */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-cyan-400 font-bold">
                {"// LIVE DECISION"}
              </span>
              {isExecuting && (
                <span className="font-mono text-[9px] tracking-wider text-cyan-300 uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-400/50 animate-pulse">
                  {stageLabel || "OPTIMIZING..."}
                </span>
              )}
              {!isExecuting && apiStatus === "success" && (
                <span className="font-mono text-[9px] tracking-wider text-emerald-300 uppercase px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-400/50">
                  {decision.method === "dqn"
                    ? `DQN AGENT ${decision.confidence ? `(${Math.round(decision.confidence * 100)}%)` : ""}`
                    : decision.method === "rule_based_fallback"
                    ? "RULE FALLBACK"
                    : "API // SYNCED"}
                </span>
              )}

              {apiStatus === "error" && (
                <span
                  className="font-mono text-[9px] tracking-wider text-amber-300 uppercase px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-400/50 cursor-help"
                  title={apiError || "Backend offline - Using local engine fallback"}
                >
                  OFFLINE FALLBACK
                </span>
              )}
            </div>
            <span className="font-mono text-[11px] tracking-[0.12em] uppercase text-slate-400 font-medium">
              SELECTED ENVIRONMENT
            </span>
          </div>
          <span
            className={`font-display font-black text-3xl sm:text-4xl lg:text-[42px] uppercase tracking-tight ${targetColor}`}
          >
            {decision.selectedCandidate.displayName}
          </span>
        </div>

        {/* 2. Candidate Scores on ONE Alignment Line + Decision Reason Quote */}
        <div className="decision-scores flex-1 flex flex-col justify-center gap-1 min-w-0 max-w-2xl px-6 border-x border-white/[0.08]">
          {/* Scores */}
          <div className="flex items-center gap-8 font-mono">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] tracking-[0.14em] uppercase text-slate-400">
                LOCAL
              </span>
              <span
                className={`text-lg font-bold tabular-nums ${
                  selectedTarget === "local" ? "text-amber-400 font-black" : "text-slate-300"
                }`}
              >
                {decision.candidateScores.local.score}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-[11px] tracking-[0.14em] uppercase text-slate-400">
                EDGE
              </span>
              <span
                className={`text-lg font-bold tabular-nums ${
                  selectedTarget === "edge" ? "text-emerald-400 font-black" : "text-slate-300"
                }`}
              >
                {decision.candidateScores.edge.score}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-[11px] tracking-[0.14em] uppercase text-slate-400">
                CLOUD
              </span>
              <span
                className={`text-lg font-bold tabular-nums ${
                  selectedTarget === "cloud" ? "text-violet-400 font-black" : "text-slate-300"
                }`}
              >
                {decision.candidateScores.cloud.score}
              </span>
            </div>
          </div>

          {/* Reason Quote */}
          <p className="decision-reason font-sans text-[12px] sm:text-[13px] text-slate-300 italic truncate border-l border-emerald-400/60 pl-2">
            &ldquo;{decision.reason}&rdquo;
          </p>
        </div>

        {/* 3. RUN TASK / RUN SIMULATION CTA + RESET */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              if (workloadType === "IMAGE" && uploadedImage) {
                executeUploadedTask();
              } else if (workloadType === "IMAGE_BATCH" && batchImages.length > 0) {
                executeUploadedTask();
              } else if (workloadType === "VIDEO" && uploadedVideo) {
                executeUploadedTask();
              } else {
                runSimulation();
              }
            }}
            disabled={isExecuting}
            aria-busy={isExecuting}
            className={`run-simulation px-6 py-3 rounded border font-mono text-[13px] tracking-[0.12em] uppercase font-bold transition-all flex items-center gap-2 ${
              isExecuting
                ? "border-cyan-500/50 bg-cyan-950/40 text-cyan-300/70 cursor-wait opacity-80"
                : "border-cyan-400/80 bg-gradient-to-r from-cyan-950/80 to-[#031c26] hover:border-cyan-300 text-cyan-100 shadow-[0_0_20px_-4px_rgba(6,182,212,0.40)] hover:scale-[1.02] cursor-pointer"
            }`}
          >
            {isExecuting ? (
              <>
                <span className="inline-block animate-spin text-cyan-300">◌</span>
                <span>{stageLabel || "RUNNING..."}</span>
              </>
            ) : workloadType === "IMAGE" && uploadedImage ? (
              <>
                <span>RUN TASK</span>
                <span className="text-cyan-300">→</span>
              </>
            ) : workloadType === "IMAGE_BATCH" ? (
              <>
                <span>{batchImages.length > 0 ? "EXECUTE BATCH OFFLOAD" : "EVALUATE BATCH OFFLOAD"}</span>
                <span className="text-cyan-300">→</span>
              </>
            ) : workloadType === "VIDEO" ? (
              <>
                <span>{uploadedVideo ? "EXECUTE VIDEO OFFLOAD" : "EVALUATE VIDEO OFFLOAD"}</span>
                <span className="text-cyan-300">→</span>
              </>
            ) : (
              <>
                <span>RUN SIMULATION</span>
                <span className="text-cyan-300">→</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={reset}
            className="text-[11px] font-mono tracking-[0.14em] uppercase text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors cursor-pointer"
          >
            RESET
          </button>
        </div>
      </div>
    </div>
  );
}

// Backwards compatibility wrappers
export function SimulationParametersSection() {
  return <SimulationCompactControls />;
}

export function SimulationResultSection() {
  return <SimulationBottomResultStrip />;
}

export function SimulationEditorialRail() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <SimulationCompactControls />
      <SimulationBottomResultStrip />
    </div>
  );
}
