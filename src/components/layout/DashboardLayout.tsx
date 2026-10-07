"use client";

import { SimulationSidebar } from "@/components/simulation/SimulationSidebar";
import { SimulationTopHeader } from "@/components/simulation/SimulationTopHeader";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans">
      <SimulationSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <SimulationTopHeader />
        <main className="flex-1 overflow-y-auto flex flex-col p-8 gap-8">
           {children}
        </main>
      </div>
    </div>
  );
}
