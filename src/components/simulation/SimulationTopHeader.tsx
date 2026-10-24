"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBackendStatus } from "@/hooks/useBackendStatus";

const TOP_LINKS = [
  {
    label: "Home",
    href: "/",
    icon: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>,
  },
  {
    label: "Simulation",
    href: "/simulation",
    icon: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </>
    ),
  },
  {
    label: "Dataset",
    href: "/dataset",
    icon: (
      <>
        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
      </>
    ),
  },
  {
    label: "Results",
    href: "/results",
    icon: (
      <>
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
      </>
    ),
  },
  {
    label: "Research",
    href: "/research",
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </>
    ),
  },
];

// Clock is client-only (null on the server) so the SSR markup never mismatches on hydration.
const CLOCK_TICK_MS = 15_000;
const subscribeClock = (onTick: () => void) => {
  const id = setInterval(onTick, CLOCK_TICK_MS);
  return () => clearInterval(id);
};
const getClockSnapshot = () => Math.floor(Date.now() / CLOCK_TICK_MS) * CLOCK_TICK_MS;
const getServerClockSnapshot = () => null;

function useClock() {
  const ts = useSyncExternalStore(subscribeClock, getClockSnapshot, getServerClockSnapshot);
  return ts === null ? null : new Date(ts);
}

export function SimulationTopHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const now = useClock();
  const backend = useBackendStatus();
  const status =
    backend.kind === "online"
      ? { title: "Backend Online", detail: "API reachable", dot: "bg-emerald-500 shadow-[0_0_8px_#10b981]", cls: "text-emerald-400" }
      : backend.kind === "offline"
        ? { title: "Backend Offline", detail: "API not reachable", dot: "bg-rose-500 shadow-[0_0_8px_#f43f5e]", cls: "text-rose-400" }
        : { title: "Checking…", detail: "Contacting API", dot: "bg-slate-500", cls: "text-slate-400" };
  const currentDate = now?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) ?? " ";
  const currentTime = now?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) ?? "--:--";

  return (
    <header className="h-[70px] w-full holo-chrome border-b flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile sidebar toggle */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-md border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>

        {/* Top Nav Links */}
        <nav className="hidden md:flex items-center gap-1 xl:gap-2">
          {TOP_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-b-2 transition-colors ${
                  active
                    ? "text-cyan-200 bg-cyan-400/10 border-cyan-400 shadow-[0_6px_18px_-10px_rgba(34,211,238,0.9)]"
                    : "text-slate-400 border-transparent hover:text-cyan-100 hover:bg-cyan-400/[0.05]"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{link.icon}</svg>
                <span className={`text-[13px] ${active ? "font-bold" : "font-medium"}`}>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Status & Time */}
      <div className="flex items-center gap-4 sm:gap-8 flex-shrink-0">
         <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${status.dot}`}></div>
            <div className="flex flex-col">
               <span className={`${status.cls} font-bold text-[13px] leading-tight`}>{status.title}</span>
               <span className="hidden sm:block text-slate-500 text-[11px]">{status.detail}</span>
            </div>
         </div>

         <div className="hidden sm:flex items-center gap-3 text-slate-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            <div className="flex flex-col text-right">
               <span className="text-[11px] leading-tight">{currentDate}</span>
               <span className="text-[14px] font-medium text-slate-200 leading-tight tabular-nums">{currentTime}</span>
            </div>
         </div>
      </div>
    </header>
  );
}
