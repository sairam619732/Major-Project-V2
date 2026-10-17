"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SimulationSceneCanvas } from "@/components/simulation/SimulationSceneCanvas";
import { SimulationPipeline } from "@/components/simulation/SimulationPipeline";
import { SimulationTaskPayload } from "@/components/simulation/SimulationTaskPayload";
import { SimulationConfig } from "@/components/simulation/SimulationConfig";
import { SimulationTelemetryPanel } from "@/components/simulation/SimulationTelemetryPanel";
import { SimulationResultsPanel } from "@/components/simulation/SimulationResultsPanel";
import { SimulationDqnDecisionOverlay } from "@/components/simulation/SimulationDqnDecisionOverlay";
import { SimulationEdgeTelemetryOverlay, SimulationCloudTelemetryOverlay } from "@/components/simulation/SimulationTelemetryOverlays";

export default function SimulationPage() {
  return (
    <DashboardLayout>
       <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold font-sans tracking-tight">Simulation</h1>
          <p className="text-[14px] text-slate-400">Test dynamic offloading under changing conditions</p>
       </div>
       
       <SimulationPipeline />
       
       {/* Grid Layout */}
       <div className="flex flex-col xl:flex-row gap-6 lg:gap-8">
          
          {/* Left Main */}
          <div className="flex-1 flex flex-col gap-6 lg:gap-8 min-w-0">
             
             {/* Row 1: Upload + Config */}
             <div className="grid grid-cols-1 min-[1700px]:grid-cols-2 gap-6 lg:gap-8">
                <SimulationTaskPayload />
                <SimulationConfig />
             </div>
             
             {/* Row 2: 3D Topology */}
             <div className="flex flex-col bg-[#060b14] border border-white/[0.05] rounded-xl overflow-hidden relative shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between gap-3 bg-black/20">
                   <div className="flex items-center gap-3">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                     <span className="font-bold text-[15px] text-slate-200">Offloading Flow Visualization</span>
                   </div>
                   <div className="flex items-center gap-3 flex-wrap justify-end">
                     <SimulationDqnDecisionOverlay />
                     <span className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[11px] font-bold uppercase"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Live Execution</span>
                   </div>
                </div>
                
                <div className="h-[360px] sm:h-[450px] w-full relative">
                   {/* Floating Telemetry Overlays inside 3D canvas */}
                   <SimulationEdgeTelemetryOverlay />
                   <SimulationCloudTelemetryOverlay />

                   <SimulationSceneCanvas />
                </div>
             </div>
             
             {/* Row 3: Results */}
             <SimulationResultsPanel />
          </div>
          
          {/* Right Sidebar (Telemetry) */}
          <div className="w-full xl:w-[340px] 2xl:w-[360px] flex-shrink-0 flex flex-col gap-6 lg:gap-8">
             <SimulationTelemetryPanel />
          </div>
       </div>
    </DashboardLayout>
  );
}
