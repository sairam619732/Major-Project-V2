"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SimulationSidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <>
    {/* Mobile backdrop */}
    <div
      onClick={onClose}
      aria-hidden="true"
      className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    />
    <aside
      className={`w-[260px] h-screen holo-chrome border-r flex flex-col flex-shrink-0 fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Logo Area */}
      <div className="h-[70px] flex items-center justify-between px-6 border-b border-cyan-400/10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-cyan-500/30 to-violet-500/30 border border-cyan-300/50 flex items-center justify-center text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.35)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-200 font-bold text-[15px] leading-tight">EdgeOffload AI</span>
            <span className="text-slate-500 text-[10px] uppercase tracking-wider font-mono">DQN Based Task Offloading</span>
          </div>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="lg:hidden text-slate-400 hover:text-white p-1 cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-widest px-3 mb-1">MAIN</span>
          <NavItem label="Overview" icon="home" href="/overview" active={pathname === '/overview'} />
          <NavItem label="Simulation" icon="activity" href="/simulation" active={pathname === '/simulation'} />
          <NavItem label="Live Monitoring" icon="monitor" href="/live-monitoring" active={pathname === '/live-monitoring'} />
          <NavItem label="Results & Charts" icon="bar-chart" href="/results" active={pathname === '/results'} />
          <NavItem label="Dataset" icon="database" href="/dataset" active={pathname === '/dataset'} />
          <NavItem label="Model Performance" icon="cpu" href="/model-performance" active={pathname === '/model-performance'} />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-widest px-3 mb-1">SYSTEM</span>
          <NavItem label="Devices" icon="hard-drive" href="/devices" active={pathname === '/devices'} />
          <NavItem label="Configuration" icon="settings" href="/configuration" active={pathname === '/configuration'} />
          <NavItem label="Logs" icon="file-text" href="/logs" active={pathname === '/logs'} />
        </div>
      </nav>

      {/* Footer Status */}
      <div className="p-4 m-4 rounded-lg holo-panel border-emerald-500/25 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
          <span className="text-emerald-400 font-bold text-[12px]">DQN Agent Ready</span>
        </div>
        <div className="text-[11px] text-slate-400 flex flex-col gap-1">
          <span>Model: v3 (SSD MobileNet V3)</span>
          <span>Status: Loaded</span>
        </div>
      </div>
    </aside>
    </>
  );
}

function NavItem({ label, icon, href, active }: { label: string; icon: string; href: string; active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${active ? 'holo-nav-active' : 'text-slate-400 hover:text-cyan-100 hover:bg-cyan-400/[0.05]'}`}>
      {/* Abstract icon based on prop */}
      <div className="w-4 h-4 opacity-70">
         {icon === 'home' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>}
         {icon === 'activity' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>}
         {icon === 'monitor' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>}
         {icon === 'bar-chart' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>}
         {icon === 'database' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>}
         {icon === 'cpu' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>}
         {icon === 'hard-drive' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line></svg>}
         {icon === 'settings' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>}
         {icon === 'file-text' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>}
      </div>
      <span className="text-[13px] font-medium">{label}</span>
    </Link>
  )
}
