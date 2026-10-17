import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SimulationTransition } from "@/components/transitions/SimulationTransition";
import { PerformanceMode } from "@/lib/three/PerformanceMode";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AI-Based Dynamic Task Offloading Optimization",
  description: "Dynamic execution across local, edge and cloud computing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen bg-[#02040A] text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
        <PerformanceMode />
        {children}
        {/* Phase 11.3: Dedicated Reusable Cinematic Signal Transition Overlay */}
        <SimulationTransition />
      </body>
    </html>
  );
}
