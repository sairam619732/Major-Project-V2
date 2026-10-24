import { notFound } from "next/navigation";
import { HologramBaker } from "./HologramBaker";

// Dev-only tool that renders the 3D models into the hologram images used by the site.
export default function HologramBakePage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <HologramBaker />;
}
