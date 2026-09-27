"use client";

import Link from "next/link";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { SimulationCompactControls, SimulationBottomResultStrip } from "@/components/simulation/SimulationEditorialRail";
import { SimulationSceneCanvas } from "@/components/simulation/SimulationSceneCanvas";
import styles from "./simulation.module.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sim-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-sim-mono" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-sim-display" });

export default function SimulationPage() {
  return (
    <main className={`${styles.instrument} ${sans.variable} ${mono.variable} ${display.variable}`}>
      <header className={styles.header}>
        <Link href="/#decision">← RETURN TO STORY</Link>
        <span>SYS // OFFLOAD</span>
        <span className={styles.mode}>SIMULATION MODE</span>
      </header>
      <div className={styles.workspace}>
        <div className={styles.left}>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>{"// RESEARCH INSTRUMENT"}</span>
            <h1>SIMULATION</h1>
            <p className={styles.subtitle}>Test dynamic offloading under changing conditions.</p>
            <p className={styles.description}>Adjust task and system conditions to observe how the execution strategy responds across local, edge and cloud.</p>
            <p className={styles.metadata}>TASK_001 · SIMULATED ENVIRONMENT · DEMO VALUES</p>
          </div>
          <div className={styles.controls}><SimulationCompactControls /></div>
        </div>
        <section className={styles.stage} aria-label="Live local, edge and cloud offloading topology">
          <SimulationSceneCanvas />
        </section>
      </div>
      <footer className={styles.footer}><SimulationBottomResultStrip /></footer>
    </main>
  );
}
