"use client";

import { useRef } from "react";
import { useSimulationState } from "@/lib/simulation/simulationState";

export function SimulationTaskPayload() {
  const {
    state,
    updateTask,
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
  } = useSimulationState();

  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const handleSingleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setUploadedImage(file);
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
    } catch {}
  };

  const loadSampleBatch = async () => {
    try {
      const [res1, res2] = await Promise.all([
        fetch("/samples/traffic_monitoring.jpg"),
        fetch("/samples/drone_inspection.jpg"),
      ]);
      const [blob1, blob2] = await Promise.all([res1.blob(), res2.blob()]);
      addBatchImages([
        new File([blob1], "traffic_monitoring.jpg", { type: "image/jpeg" }),
        new File([blob2], "drone_inspection.jpg", { type: "image/jpeg" }),
      ]);
    } catch {}
  };

  const loadSampleVideo = async () => {
    try {
      const res = await fetch("/samples/sample_video.mp4");
      const blob = await res.blob();
      setUploadedVideo(new File([blob], "sample_traffic_stream.mp4", { type: "video/mp4" }));
    } catch {}
  };

  return (
    <div className="flex flex-col p-6 rounded-xl holo-panel border border-cyan-500/30 text-slate-200">
      <div className="flex items-center justify-between border-b border-cyan-500/40 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#38bdf8]" />
          <span className="font-mono text-base tracking-[0.10em] uppercase text-cyan-300 font-bold">
            {"// TASK & PAYLOAD"}
          </span>
        </div>
        <span className="font-mono text-[12px] px-3 py-1 rounded-md bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 font-bold uppercase">
          {workloadType === "IMAGE" ? "SSD MobileNet V3" : workloadType === "IMAGE_BATCH" ? "BATCH INFERENCE" : "VIDEO ANALYTICS"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="font-mono text-[13px] uppercase text-slate-400 font-semibold tracking-wider mr-3">
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
              className={`px-4 py-2 rounded-md font-mono text-[13px] tracking-widest uppercase transition-all cursor-pointer ${
                isActive
                  ? "bg-cyan-950/70 border border-cyan-400 text-cyan-100 font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  : "bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]"
              }`}
            >
              [ {label} ]
            </button>
          );
        })}
      </div>

      {workloadType === "IMAGE" && (
        <div className="flex flex-col gap-3">
          <input ref={singleFileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleSingleFileChange} />
          {!uploadedImage ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded bg-cyan-950/20 border border-dashed border-cyan-500/40">
              <button
                type="button"
                onClick={() => singleFileInputRef.current?.click()}
                className="py-2.5 px-4 rounded border border-cyan-400/60 hover:border-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70 text-cyan-200 font-mono text-[11.5px] tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)]"
              >
                <span className="text-cyan-400 font-bold text-sm">⊕</span>
                <span>UPLOAD IMAGE</span>
              </button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => loadSingleSample("/samples/traffic_monitoring.jpg", "traffic_monitoring.jpg")} className="py-1 px-2.5 rounded bg-white/[0.04] hover:bg-cyan-950/40 border border-white/[0.08] text-[10.5px] font-mono text-slate-300 hover:text-cyan-200 transition-all cursor-pointer">
                  TRAFFIC
                </button>
                <button type="button" onClick={() => loadSingleSample("/samples/drone_inspection.jpg", "drone_inspection.jpg")} className="py-1 px-2.5 rounded bg-white/[0.04] hover:bg-cyan-950/40 border border-white/[0.08] text-[10.5px] font-mono text-slate-300 hover:text-cyan-200 transition-all cursor-pointer">
                  DRONE
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 p-3 rounded bg-cyan-950/30 border border-cyan-500/40">
              <div className="flex items-center gap-4 min-w-0">
                <img src={uploadedImage.previewUrl} alt="Upload thumbnail" className="w-14 h-14 object-cover rounded border border-cyan-400/60 shadow-[0_0_8px_rgba(6,182,212,0.3)] flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-[13px] text-cyan-200 font-bold truncate max-w-[200px] sm:max-w-xs">{uploadedImage.name}</span>
                  <span className="font-mono text-[11px] text-slate-400">{(uploadedImage.sizeBytes / (1024 * 1024)).toFixed(2)} MB · {state.task.id}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => clearUploadedImage()} disabled={["optimizing", "offloading", "executing"].includes(executionStage)} className="text-[10px] font-mono uppercase text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded border border-white/[0.06] hover:border-rose-500/40 transition-colors cursor-pointer disabled:opacity-50">
                  ✕ REMOVE
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {workloadType === "IMAGE_BATCH" && (
        <div className="flex flex-col gap-4">
          <input ref={batchFileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleBatchFilesChange} />
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-5 rounded-lg bg-cyan-950/20 border border-dashed border-cyan-500/40">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => batchFileInputRef.current?.click()} className="py-2.5 px-5 rounded-md border border-cyan-400/60 hover:border-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70 text-cyan-100 font-mono text-[13px] tracking-widest uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <span className="text-cyan-400 font-bold text-base">⊕</span>
                <span>ADD IMAGES</span>
              </button>
              <button type="button" onClick={loadSampleBatch} className="py-2.5 px-4 rounded-md bg-white/[0.04] hover:bg-cyan-950/40 border border-white/[0.08] text-[12px] font-mono text-slate-300 hover:text-cyan-200 transition-all cursor-pointer uppercase">
                + LOAD SAMPLE BATCH
              </button>
            </div>
            {batchImages.length > 0 && (
              <div className="flex flex-col items-end gap-1">
                <span className="font-mono text-cyan-200 font-bold text-[14px]">{batchImages.length} IMAGES</span>
                <span className="font-mono text-slate-400 text-[11px]">{batchImages.reduce((sum, img) => sum + img.sizeMb, 0).toFixed(2)} MB TOTAL</span>
              </div>
            )}
          </div>
          
          {batchImages.length > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none w-full">
              {batchImages.map((img, idx) => (
                <div key={img.id} className="relative w-28 h-28 flex-shrink-0 rounded-lg border border-cyan-500/40 overflow-hidden group shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                  {img.previewUrl && <img src={img.previewUrl} alt={img.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-2">
                    <span className="text-[10px] font-mono text-cyan-100 font-bold truncate">{idx + 1}. {img.name}</span>
                    <span className="text-[9px] font-mono text-slate-400">{img.sizeMb.toFixed(2)} MB</span>
                  </div>
                  <button type="button" onClick={() => removeBatchImage(img.id)} className="absolute top-1.5 right-1.5 text-white bg-black/60 rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-500 transition-all text-[11px] cursor-pointer shadow-md">✕</button>
                </div>
              ))}
              <button type="button" onClick={clearBatchImages} className="flex-shrink-0 w-28 h-28 rounded-lg border border-dashed border-rose-500/40 text-rose-400 hover:bg-rose-950/30 flex flex-col items-center justify-center gap-2 font-mono text-[11px] font-bold uppercase transition-colors cursor-pointer">
                ✕<br/>CLEAR ALL
              </button>
            </div>
          )}
        </div>
      )}

      {workloadType === "VIDEO" && (
        <div className="flex flex-col gap-3">
          <input ref={videoFileInputRef} type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" className="hidden" onChange={handleVideoFileChange} />
          {!uploadedVideo ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded bg-cyan-950/20 border border-dashed border-cyan-500/40">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => videoFileInputRef.current?.click()} className="py-2.5 px-4 rounded border border-cyan-400/60 hover:border-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70 text-cyan-200 font-mono text-[11.5px] tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.15)]">
                  <span className="text-cyan-400 font-bold text-sm">▶</span>
                  <span>UPLOAD VIDEO</span>
                </button>
                <button type="button" onClick={loadSampleVideo} className="py-2 px-3 rounded bg-white/[0.04] hover:bg-cyan-950/40 border border-white/[0.08] text-[10.5px] font-mono text-slate-300 hover:text-cyan-200 transition-all cursor-pointer">
                  + LOAD SAMPLE VIDEO
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 p-3 rounded bg-cyan-950/30 border border-cyan-500/40">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded bg-black/60 border border-cyan-400/60 flex items-center justify-center text-cyan-300 text-lg shadow-[0_0_8px_rgba(6,182,212,0.3)]">▶</div>
                <div className="flex flex-col min-w-0 font-mono">
                  <span className="text-[13px] text-cyan-200 font-bold truncate max-w-[200px]">{uploadedVideo.name}</span>
                  <span className="text-[11px] text-slate-400">{uploadedVideo.sizeMb.toFixed(2)} MB · {videoMetadata?.durationSeconds ? `${videoMetadata.durationSeconds}s` : "..."} · {videoMetadata?.resolution || "..."}</span>
                </div>
              </div>
              <button type="button" onClick={clearUploadedVideo} className="text-[10px] uppercase text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded border border-white/[0.06] hover:border-rose-500/40 transition-colors cursor-pointer">✕ REMOVE</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
