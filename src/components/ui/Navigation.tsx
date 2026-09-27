"use client";

const NAV_ITEMS = [
  { label: "OVERVIEW", href: "#overview", active: true },
  { label: "LOCAL", href: "#local", active: false },
  { label: "EDGE", href: "#edge", active: false },
  { label: "CLOUD", href: "#cloud", active: false },
  { label: "DECISION", href: "#decision", active: false },
  { label: "SIMULATION", href: "#simulation", active: false },
];

export function Navigation() {
  return (
    <header
      style={{
        paddingLeft: "7vw",
        paddingRight: "7vw",
      }}
      className="fixed top-0 left-0 right-0 z-50 flex h-20 items-center justify-between pointer-events-auto backdrop-blur-sm bg-[#02040A]/40 border-b border-white/[0.03]"
    >
      {/* Brand mark aligned on the global 7vw grid */}
      <div className="flex items-center gap-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
        <span className="font-mono text-xs tracking-[0.22em] uppercase text-slate-200 font-semibold">
          SYS // OFFLOAD
        </span>
      </div>

      {/* Navigation Links at top-right with enhanced readability */}
      <nav className="flex items-center gap-7 sm:gap-9 overflow-x-auto no-scrollbar py-2 text-[13px] font-mono tracking-[0.2em] uppercase">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={`transition-colors duration-200 whitespace-nowrap ${
              item.active
                ? "text-cyan-400 font-semibold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
