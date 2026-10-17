"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SimulationSidebar } from "@/components/simulation/SimulationSidebar";
import { SimulationTopHeader } from "@/components/simulation/SimulationTopHeader";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Drawer state is keyed to the route so navigating closes it on mobile.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const sidebarOpen = openFor === pathname;

  return (
    <div className="flex h-screen holo-backdrop text-slate-200 overflow-hidden font-sans">
      <SimulationSidebar open={sidebarOpen} onClose={() => setOpenFor(null)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <SimulationTopHeader onMenuClick={() => setOpenFor(pathname)} />
        <main className="flex-1 overflow-y-auto flex flex-col p-4 sm:p-6 lg:p-8 gap-6 lg:gap-8">
           {children}
        </main>
      </div>
    </div>
  );
}
