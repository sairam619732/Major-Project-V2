"use client";

import { useSimulationState } from "@/lib/simulation/simulationState";

export function SimulationResultsPanel() {
  const {
    state,
    decision,
    runSimulation,
    apiStatus,
    apiError,
    uploadedImage,
    workloadType,
    batchImages,
    uploadedVideo,
    videoMetadata,
    executionStage,
    executionDetails,
    executionError,
    executeUploadedTask,
  } = useSimulationState();

  const selectedTarget = decision.selectedTarget;
  const isExecuting = ["optimizing", "offloading", "executing"].includes(executionStage) || apiStatus === "running";

  return (
    <div className="w-full flex flex-col gap-6 text-slate-200 select-none">
      {/* Execution Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[#0b1221] border border-white/[0.05] shadow-[0_0_20px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col">
          <span className="font-sans text-[15px] font-bold text-slate-200">
            Execution Engine
          </span>
          <span className="font-sans text-[12px] text-slate-400">
            {isExecuting ? "Executing workload..." : "Ready to execute the configured workload based on DQN decision."}
          </span>
          {executionError && <span className="text-rose-400 text-[11px] mt-1 font-mono">ERROR: {executionError}</span>}
          {apiError && <span className="text-rose-400 text-[11px] mt-1 font-mono">API ERROR: {apiError}</span>}
        </div>
        <button
          onClick={() => executeUploadedTask()}
          disabled={isExecuting || (workloadType === "IMAGE" && !uploadedImage) || (workloadType === "IMAGE_BATCH" && batchImages.length === 0) || (workloadType === "VIDEO" && !uploadedVideo)}
          className={`px-8 py-3 rounded-lg font-sans text-[14px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isExecuting
              ? "bg-blue-900/30 text-blue-400 border border-blue-500/30"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400/50"
          }`}
        >
          {isExecuting ? "Executing..." : "Run Task"}
        </button>
      </div>

      {executionDetails && executionStage === "ready" && (
        <div className="flex flex-col bg-[#0b1221] border border-white/[0.05] rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.2)]">
          
          {/* Results Header with Tabs */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05] bg-black/20">
             <div className="flex items-center gap-8">
                <span className="font-bold text-[16px] text-slate-200 font-sans tracking-tight">RESULTS</span>
                <div className="flex items-center gap-6">
                   <button className="text-[13px] font-medium text-blue-400 border-b-2 border-blue-500 pb-4 -mb-4 transition-colors">Detection Results</button>
                   <button className="text-[13px] font-medium text-slate-400 hover:text-slate-200 pb-4 -mb-4 transition-colors">Performance Metrics</button>
                   <button className="text-[13px] font-medium text-slate-400 hover:text-slate-200 pb-4 -mb-4 transition-colors">Execution Timeline</button>
                </div>
             </div>
          </div>
          
          <div className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            
            {/* Main Visual Result */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[13px] uppercase tracking-wider text-slate-300 font-semibold">
                    {workloadType === "IMAGE" ? "OBJECT DETECTION" : workloadType === "IMAGE_BATCH" ? "BATCH INFERENCE" : "VIDEO ANALYTICS"}
                  </span>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 font-semibold uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  EXECUTED IN {executionDetails.execution_environment}
                </span>
              </div>

              {workloadType === "IMAGE" && executionDetails.annotated_image_base64 && (
                <div className="relative group rounded-lg border border-white/[0.05] overflow-hidden bg-black/60 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                  <img
                    src={executionDetails.annotated_image_base64}
                    alt="Detection Result"
                    className="w-full h-auto max-h-[500px] object-contain bg-[#060b14]"
                  />
                  <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/80 border border-white/[0.1] font-mono text-[11px] text-slate-300 backdrop-blur-sm">
                    {executionDetails.image_metadata?.width}×{executionDetails.image_metadata?.height}
                  </div>
                </div>
              )}

              {workloadType === "IMAGE_BATCH" && executionDetails.batch_items && (
                 <div className="flex flex-col gap-2">
                    <span className="font-mono text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                      PROCESSED FRAMES ({executionDetails.batch_items.length}):
                    </span>
                    <div className="max-h-64 overflow-y-auto flex flex-col gap-2 pr-2">
                      {executionDetails.batch_items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between px-4 py-3 rounded-lg bg-black/40 border border-white/[0.05] font-mono text-[11px]">
                          <div className="flex items-center gap-4">
                            <span className="text-slate-500 font-sans">#{idx + 1}</span>
                            <span className="text-slate-200 font-medium truncate max-w-[200px]">{item.filename}</span>
                          </div>
                          <div className="flex items-center gap-6">
                            <span className="text-blue-400 font-semibold">{item.detection_count} objects</span>
                            <span className="text-slate-300 tabular-nums">{item.inference_time_ms} ms</span>
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
              )}

              {workloadType === "VIDEO" && (
                 <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-center h-48 rounded-lg bg-black/40 border border-white/[0.05] font-sans text-slate-400 flex-col gap-2">
                       <span className="text-blue-400 text-2xl">▶</span>
                       <span className="font-medium text-slate-200">Video Analytics Processed</span>
                       <span className="text-[11px] text-slate-500">{executionDetails.processed_count} keyframes analyzed</span>
                    </div>
                    {executionDetails.detections && executionDetails.detections.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <span className="font-mono text-[11px] text-slate-400 uppercase tracking-wider font-semibold">OBJECTS IDENTIFIED ACROSS KEYFRAMES:</span>
                        <div className="flex flex-wrap gap-2">
                          {executionDetails.detections.map((det, idx) => (
                            <span key={idx} className="px-3 py-1.5 rounded bg-black/40 border border-white/[0.05] text-[11px] text-blue-300 font-mono flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              <span className="uppercase">{det.label}</span>
                              <span className="text-slate-400">({Math.round(det.confidence * 100)}%)</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                 </div>
              )}
            </div>

          {/* Performance Summary */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="p-5 rounded-lg bg-black/20 border border-white/[0.05] flex flex-col gap-5">
               <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
                  <span className="font-sans text-[14px] font-bold text-slate-200">Performance Summary</span>
               </div>
               
               <div className="grid grid-cols-2 gap-4 font-sans">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-400 mb-1 font-mono uppercase tracking-wider">Total Payload</span>
                    <span className="text-[15px] font-bold text-slate-200">
                      {executionDetails.input_size_mb != null ? `${executionDetails.input_size_mb} MB` : `${state.task.taskSizeMb} MB`}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-400 mb-1 font-mono uppercase tracking-wider">Objects Detected</span>
                    <span className="text-[15px] font-bold text-slate-200">{executionDetails.detection_count}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-400 mb-1 font-mono uppercase tracking-wider">Inference Time</span>
                    <span className="text-[15px] font-bold text-blue-400">{executionDetails.processing_time_ms || executionDetails.execution_time_ms} ms</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-400 mb-1 font-mono uppercase tracking-wider">Network Transfer</span>
                    <span className="text-[15px] font-bold text-slate-200">{executionDetails.network_transfer_ms != null ? `${executionDetails.network_transfer_ms} ms` : "0 ms"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-400 mb-1 font-mono uppercase tracking-wider">Total Latency</span>
                    <span className="text-[15px] font-bold text-slate-200">{executionDetails.latency_ms} ms</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-400 mb-1 font-mono uppercase tracking-wider">Energy Cost</span>
                    <span className="text-[15px] font-bold text-slate-200">{executionDetails.energy} J</span>
                  </div>
               </div>

               <div className="flex items-center justify-between p-4 rounded-lg bg-blue-900/10 border border-blue-500/20 font-sans mt-2">
                  <div className="flex flex-col">
                     <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">Deadline Status</span>
                     <span className={`text-[15px] font-bold ${executionDetails.feasible ? "text-emerald-400" : "text-rose-400"}`}>
                       {executionDetails.feasible ? "SAFE" : "RISK"}
                     </span>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">DQN Confidence</span>
                     <span className="text-[15px] font-bold text-blue-400">{(executionDetails.confidence * 100).toFixed(1)}%</span>
                  </div>
               </div>
            </div>
            
            {workloadType === "IMAGE" && executionDetails.detections && executionDetails.detections.length > 0 && (
              <div className="p-4 rounded-lg bg-black/40 border border-white/[0.05] flex flex-col gap-3 font-mono">
                 <span className="text-[11px] uppercase tracking-wider text-slate-300 font-bold border-b border-white/[0.05] pb-2">DETECTION LIST</span>
                 <div className="max-h-48 overflow-y-auto flex flex-col gap-2 pr-2">
                    {executionDetails.detections.map((det, idx) => {
                       const confPct = Math.round(det.confidence * 1000) / 10;
                       return (
                         <div key={idx} className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                               <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                               <span className="text-blue-300 uppercase">{det.label}</span>
                            </div>
                            <span className="text-slate-300">{confPct.toFixed(1)}%</span>
                         </div>
                       )
                    })}
                 </div>
              </div>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
