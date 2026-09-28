"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { transitionStore } from "@/lib/transition/transitionStore";

const NAV_ITEMS = [
  { label: "OVERVIEW", href: "/#overview" },
  { label: "LOCAL", href: "/#local" },
  { label: "EDGE", href: "/#edge" },
  { label: "CLOUD", href: "/#cloud" },
  { label: "DECISION", href: "/#decision" },
  { label: "SIMULATION", href: "/simulation" },
  { label: "RESEARCH", href: "/research" },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const isSimulation = pathname === "/simulation";
  const isResearch = pathname === "/research";

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item: (typeof NAV_ITEMS)[0]
  ) => {
    if (item.label === "SIMULATION" && !isSimulation) {
      e.preventDefault();
      transitionStore.triggerTransition(
        () => {
          router.push("/simulation");
        },
        1000,
        "direct_nav"
      );
    }
  };

  return (
    <header
      style={{
        paddingLeft: "7vw",
        paddingRight: "7vw",
      }}
      className="fixed top-0 left-0 right-0 z-50 flex h-20 items-center justify-between pointer-events-auto backdrop-blur-sm bg-[#02040A]/40 border-b border-white/[0.03]"
    >
      {/* Brand mark aligned on the global 7vw grid */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 group-hover:shadow-[0_0_8px_#22d3ee] transition-shadow" />
        <span className="font-mono text-xs tracking-[0.22em] uppercase text-slate-200 font-semibold group-hover:text-white transition-colors">
          SYS // OFFLOAD
        </span>
      </Link>

      {/* Navigation Links at top-right with enhanced readability */}
      <nav className="flex items-center gap-7 sm:gap-9 overflow-x-auto no-scrollbar py-2 text-[13px] font-mono tracking-[0.2em] uppercase">
        {NAV_ITEMS.map((item) => {
          const isActive =
            (item.label === "SIMULATION" && isSimulation) ||
            (item.label === "RESEARCH" && isResearch) ||
            (item.label === "OVERVIEW" && !isSimulation && !isResearch);

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={(e) => handleNavClick(e, item)}
              className={`transition-colors duration-200 whitespace-nowrap ${
                isActive
                  ? "text-cyan-400 font-semibold"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

