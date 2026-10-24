import * as THREE from "three";

/** Canvas size used for every tablet screen texture. */
export const TABLET_SCREEN_SIZE = { width: 1024, height: 640 };

/** Draws the decorative OLED screen of the landing-page tablet. */
export function drawLandingTabletScreen(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Dark OLED background
  ctx.fillStyle = "#040810";
  ctx.fillRect(0, 0, width, height);

  // Subtle technical grid
  ctx.strokeStyle = "rgba(56, 189, 248, 0.07)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Inset perimeter border frame
  ctx.strokeStyle = "rgba(56, 189, 248, 0.32)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  // Corner technical brackets
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.5;
  const b = 28;
  // Top-left
  ctx.beginPath(); ctx.moveTo(36, 36 + b); ctx.lineTo(36, 36); ctx.lineTo(36 + b, 36); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(width - 36 - b, 36); ctx.lineTo(width - 36, 36); ctx.lineTo(width - 36, 36 + b); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(36, height - 36 - b); ctx.lineTo(36, height - 36); ctx.lineTo(36 + b, height - 36); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(width - 36 - b, height - 36); ctx.lineTo(width - 36, height - 36); ctx.lineTo(width - 36, height - 36 - b); ctx.stroke();

  // 1. Top Telemetry Header (Clean technical hierarchy)
  ctx.fillStyle = "rgba(148, 163, 184, 0.95)";
  ctx.font = "bold 24px 'Geist Mono', ui-monospace, monospace";
  ctx.fillText("DEVICE // LOCAL_CORE_01", 64, 82);

  // Status: Active badge
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.arc(width - 250, 75, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(56, 189, 248, 0.98)";
  ctx.font = "bold 22px 'Geist Mono', ui-monospace, monospace";
  ctx.fillText("STATUS   ACTIVE", width - 232, 82);

  // Subtle technical divider line
  ctx.strokeStyle = "rgba(56, 189, 248, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(52, 114);
  ctx.lineTo(width - 52, 114);
  ctx.stroke();

  // 2. Workload Category Kicker
  ctx.fillStyle = "rgba(56, 189, 248, 0.75)";
  ctx.font = "bold 15px 'Geist Mono', ui-monospace, monospace";
  ctx.fillText("ACTIVE ON-DEVICE WORKLOAD", 64, 168);

  // 3. Dominant Prominent Line: OBJECT DETECTION (1.8–2x prominent hierarchy)
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 48px 'Geist Mono', ui-monospace, monospace";
  ctx.fillText("OBJECT DETECTION", 64, 230);

  // Accent line beneath prominent title
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(64, 248, 280, 3);

  // 4. Clean System Telemetry (CPU, MEMORY, BATTERY, LATENCY)
  // Generously spaced, highly legible 22px monospace typography
  const metricStartY = 312;
  const metricSpacing = 50;

  const metrics = [
    { label: "CPU", value: "16-CORE @ 4.2 GHz" },
    { label: "MEMORY", value: "32 GB" },
    { label: "BATTERY", value: "94% HEALTH" },
    { label: "LATENCY", value: "0.8 MS (LOCAL)", highlight: true },
  ];

  metrics.forEach((m, idx) => {
    const y = metricStartY + idx * metricSpacing;

    // Label (column 1)
    ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
    ctx.font = "bold 22px 'Geist Mono', ui-monospace, monospace";
    ctx.fillText(m.label, 64, y);

    // Value (column 2)
    ctx.fillStyle = m.highlight ? "#38bdf8" : "rgba(241, 245, 249, 0.95)";
    ctx.font = "bold 22px 'Geist Mono', ui-monospace, monospace";
    ctx.fillText(m.value, 230, y);
  });

  // 5. Right-Side Sci-Fi Computational Radar / NPU Visualizer
  const radarX = 780;
  const radarY = 340;

  // Outer radar ring
  ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(radarX, radarY, 84, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring
  ctx.strokeStyle = "rgba(56, 189, 248, 0.40)";
  ctx.beginPath();
  ctx.arc(radarX, radarY, 52, 0, Math.PI * 2);
  ctx.stroke();

  // Center core
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.arc(radarX, radarY, 6, 0, Math.PI * 2);
  ctx.fill();

  // Crosshairs
  ctx.strokeStyle = "rgba(56, 189, 248, 0.28)";
  ctx.beginPath();
  ctx.moveTo(radarX - 110, radarY); ctx.lineTo(radarX + 110, radarY);
  ctx.moveTo(radarX, radarY - 110); ctx.lineTo(radarX, radarY + 110);
  ctx.stroke();

  // Subtle label for right-side visualizer
  ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
  ctx.font = "14px 'Geist Mono', ui-monospace, monospace";
  ctx.fillText("NEURAL ENGINE // 38 TOPS", radarX - 105, radarY + 120);

  // 6. Bottom Footer Telemetry
  ctx.fillStyle = "rgba(100, 116, 139, 0.85)";
  ctx.font = "14px 'Geist Mono', ui-monospace, monospace";
  ctx.fillText("ARCHITECTURE: ON-CHIP COMPLIANT", 64, height - 52);

  ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
  ctx.fillText("LOCAL RUNTIME READY", width - 270, height - 52);
}

/** A canvas texture for a tablet screen, drawn once by `draw`. */
export function createTabletScreenTexture(
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void
) {
  const canvas = document.createElement("canvas");
  canvas.width = TABLET_SCREEN_SIZE.width;
  canvas.height = TABLET_SCREEN_SIZE.height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = true;
  return { canvas, texture };
}
