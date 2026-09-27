import { Navigation, ScrollTracker, StorySections } from "@/components/ui";
import { SceneCanvas } from "@/components/3d";

export default function Home() {
  return (
    <div
      style={{
        background:
          "radial-gradient(circle at 74% 45%, rgba(14, 165, 233, 0.08) 0%, rgba(2, 6, 23, 0.45) 45%, #02040A 75%), #02040A",
      }}
      className="relative min-h-screen w-full text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-300"
    >
      {/* Scroll State Tracker for Phase 2 / Phase 3 */}
      <ScrollTracker />

      {/* 1. Minimal Fixed Top Navigation */}
      <Navigation />

      {/* 2. Fixed 3D Viewport (Visually stable during document scroll) */}
      <div className="fixed inset-0 h-screen w-full pointer-events-none z-0">
        <SceneCanvas />
      </div>

      {/* 3. Real Vertically Scrollable Story Sections with subtle transition choreography */}
      <StorySections />
    </div>
  );
}

