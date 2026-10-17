import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import fs from 'node:fs';
import path from 'node:path';

// Polyfill FileReader for Node.js GLTFExporter
if (typeof globalThis.FileReader === 'undefined') {
  class MockFileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onloadend) this.onloadend();
      });
    }
  }
  globalThis.FileReader = MockFileReader;
}

function createEdgeServerModel() {
  const root = new THREE.Group();
  root.name = "EdgeComputingServerRack";

  // --- Premium Dark Metallic PBR Materials with Clear Contrast ---
  // Dark structural rack frame (slate/titanium alloy)
  const chassisMat = new THREE.MeshStandardMaterial({
    name: "mat_edge_chassis",
    color: new THREE.Color("#1e293b"),
    roughness: 0.38,
    metalness: 0.60,
  });

  // Deep shadow inner cavity
  const innerBayMat = new THREE.MeshStandardMaterial({
    name: "mat_edge_bay",
    color: new THREE.Color("#0f172a"),
    roughness: 0.55,
    metalness: 0.40,
  });

  // Brushed dark titanium server faceplates
  const serverFaceMat = new THREE.MeshStandardMaterial({
    name: "mat_edge_faceplate",
    color: new THREE.Color("#2a374f"),
    roughness: 0.28,
    metalness: 0.62,
  });

  // Brushed aluminum latches, rails & structural trim
  const metalAccentMat = new THREE.MeshStandardMaterial({
    name: "mat_edge_accent",
    color: new THREE.Color("#64748b"),
    roughness: 0.22,
    metalness: 0.65,
  });

  // Dark anodized cooling vents & louvers
  const ventMat = new THREE.MeshStandardMaterial({
    name: "mat_edge_vent",
    color: new THREE.Color("#182338"),
    roughness: 0.45,
    metalness: 0.55,
  });

  // Restrained Emerald Status LEDs
  const emissiveLedMat = new THREE.MeshStandardMaterial({
    name: "emmis_emerald_led",
    color: new THREE.Color("#10b981"),
    emissive: new THREE.Color("#059669"),
    emissiveIntensity: 2.2,
    roughness: 0.15,
    metalness: 0.1,
  });

  // Optical Data Bus Channel (emissive emerald)
  const emissiveBusMat = new THREE.MeshStandardMaterial({
    name: "emmis_fiber_bus",
    color: new THREE.Color("#6ee7b7"),
    emissive: new THREE.Color("#10b981"),
    emissiveIntensity: 2.4,
    roughness: 0.1,
    metalness: 0.2,
  });

  // --- 1. Heavy Industrial Base Pedestal ---
  const baseGroup = new THREE.Group();
  baseGroup.name = "PedestalAssembly";

  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(1.38, 0.12, 1.05),
    chassisMat
  );
  pedestal.position.set(0, -1.02, 0);
  baseGroup.add(pedestal);

  // Beveled front foot trim
  const footTrim = new THREE.Mesh(
    new THREE.BoxGeometry(1.32, 0.03, 0.04),
    metalAccentMat
  );
  footTrim.position.set(0, -0.98, 0.52);
  baseGroup.add(footTrim);

  // Lower intake vent bar
  const lowerIntake = new THREE.Mesh(
    new THREE.BoxGeometry(1.10, 0.04, 0.02),
    ventMat
  );
  lowerIntake.position.set(0, -1.02, 0.53);
  baseGroup.add(lowerIntake);

  root.add(baseGroup);

  // --- 2. Outer Protective Rack Enclosure ---
  const rackGroup = new THREE.Group();
  rackGroup.name = "RackEnclosure";

  // Main chassis outer shell
  const outerChassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.24, 1.95, 0.92),
    chassisMat
  );
  outerChassis.name = "OuterChassis";
  rackGroup.add(outerChassis);

  // Inset equipment bay cavity (creating physical recess)
  const innerBay = new THREE.Mesh(
    new THREE.BoxGeometry(1.10, 1.76, 0.86),
    innerBayMat
  );
  innerBay.name = "InnerBay";
  innerBay.position.set(0, 0, 0.04);
  rackGroup.add(innerBay);

  // Top Exhaust Cowl & Cable Entry Box
  const topCowl = new THREE.Mesh(
    new THREE.BoxGeometry(1.26, 0.06, 0.94),
    metalAccentMat
  );
  topCowl.position.set(0, 0.98, 0);
  rackGroup.add(topCowl);

  // 4 Corner Structural Steel Uprights
  const cornerGeo = new THREE.BoxGeometry(0.045, 1.95, 0.045);
  [
    [-0.59, 0.43],
    [0.59, 0.43],
    [-0.59, -0.43],
    [0.59, -0.43],
  ].forEach(([cx, cz]) => {
    const post = new THREE.Mesh(cornerGeo, metalAccentMat);
    post.position.set(cx, 0, cz);
    rackGroup.add(post);
  });

  // Vertical EIA-310 Rack Rails (Left & Right inside bay)
  const railGeo = new THREE.BoxGeometry(0.03, 1.72, 0.04);
  [-0.52, 0.52].forEach((rx) => {
    const rail = new THREE.Mesh(railGeo, metalAccentMat);
    rail.position.set(rx, 0, 0.44);
    rackGroup.add(rail);
  });

  // --- 3. Top Controller / Micro-Switch Unit (1U) ---
  const switchUnit = new THREE.Group();
  switchUnit.name = "EdgeControllerSwitch";
  switchUnit.position.set(0, 0.77, 0.05);

  const switchBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.02, 0.12, 0.82),
    serverFaceMat
  );
  switchUnit.add(switchBody);

  // Switch rack mount ears
  [-0.52, 0.52].forEach((ex) => {
    const ear = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.11, 0.03),
      metalAccentMat
    );
    ear.position.set(ex, 0, 0.41);
    switchUnit.add(ear);
  });

  // Node Badge / Identifier (emissive)
  const nodeBadge = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.035, 0.015),
    emissiveLedMat
  );
  nodeBadge.name = "emmis_edge_badge";
  nodeBadge.position.set(-0.35, 0.02, 0.42);
  switchUnit.add(nodeBadge);

  // Edge Switch Port Matrix (8 dual SFP+ port blocks)
  for (let p = 0; p < 8; p++) {
    const px = -0.05 + p * 0.06;
    const port = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.025, 0.015),
      metalAccentMat
    );
    port.position.set(px, 0.01, 0.42);
    switchUnit.add(port);

    const portLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.01, 0.008),
      emissiveLedMat
    );
    portLed.name = `emmis_switch_led_${p}`;
    portLed.position.set(px, 0.035, 0.425);
    switchUnit.add(portLed);
  }

  rackGroup.add(switchUnit);

  // --- 4. Four High-Density Computing Blade Modules ---
  const bladeYPositions = [-0.56, -0.19, 0.18, 0.55];

  bladeYPositions.forEach((bladeY, bIdx) => {
    const blade = new THREE.Group();
    blade.name = `BladeUnit_${bIdx}`;
    blade.position.set(0, bladeY, 0.06);

    // Blade Enclosure Body
    const bladeBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 0.32, 0.84),
      serverFaceMat
    );
    blade.add(bladeBody);

    // Rack Mount Ears
    [-0.52, 0.52].forEach((ex) => {
      const ear = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.30, 0.03),
        metalAccentMat
      );
      ear.position.set(ex, 0, 0.42);
      blade.add(ear);
    });

    // Dual Quick-Release Heavy-Duty Latches / Handles
    [-0.47, 0.47].forEach((hx) => {
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.22, 0.04),
        metalAccentMat
      );
      handle.position.set(hx, 0, 0.44);
      blade.add(handle);
    });

    // Optical Fiber Channel Glow Bar (runs horizontally along lower section)
    const fiberChannel = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.008, 0.012),
      emissiveBusMat
    );
    fiberChannel.name = `emmis_fiber_channel_${bIdx}`;
    fiberChannel.position.set(0, -0.09, 0.43);
    blade.add(fiberChannel);

    // Lower Perforated Air Intake Band
    const intakeBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.06, 0.015),
      ventMat
    );
    intakeBand.position.set(0, -0.05, 0.425);
    blade.add(intakeBand);

    // 6 Hot-Swap NVMe Drive Trays with Status LEDs
    const driveWidth = 0.11;
    const driveStartX = -0.38;
    for (let d = 0; d < 6; d++) {
      const dx = driveStartX + d * (driveWidth + 0.035);

      // Drive Caddy Sled
      const caddy = new THREE.Mesh(
        new THREE.BoxGeometry(driveWidth, 0.10, 0.02),
        chassisMat
      );
      caddy.position.set(dx, 0.06, 0.425);
      blade.add(caddy);

      // Caddy Latch Clip
      const latch = new THREE.Mesh(
        new THREE.BoxGeometry(driveWidth * 0.6, 0.018, 0.012),
        metalAccentMat
      );
      latch.position.set(dx, 0.02, 0.435);
      blade.add(latch);

      // Activity LED
      const dLed = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.012, 0.008),
        emissiveLedMat
      );
      dLed.name = `emmis_drive_led_${bIdx}_${d}`;
      dLed.position.set(dx + driveWidth * 0.32, 0.08, 0.436);
      blade.add(dLed);
    }

    // Central Multi-Segment CPU Compute Load Indicator Bar
    const cpuBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.018, 0.012),
      emissiveLedMat
    );
    cpuBar.name = `emmis_cpu_bar_${bIdx}`;
    cpuBar.position.set(0, 0.11, 0.43);
    blade.add(cpuBar);

    // Status LED Matrix across blade top edge
    [-0.34, -0.24, -0.14, 0.14, 0.24, 0.34].forEach((lx, lIdx) => {
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.012, 0.008),
        emissiveLedMat
      );
      led.name = `emmis_blade_led_${bIdx}_${lIdx}`;
      led.position.set(lx, 0.11, 0.43);
      blade.add(led);
    });

    rackGroup.add(blade);
  });

  // --- 5. Side Heat Dissipation Louver Fins ---
  [-0.63, 0.63].forEach((sx) => {
    const finGroup = new THREE.Group();
    finGroup.position.set(sx, 0, 0);

    const finCount = 8;
    for (let f = 0; f < finCount; f++) {
      const zOffset = -0.32 + f * 0.09;
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 1.70, 0.04),
        ventMat
      );
      fin.position.set(0, 0, zOffset);
      finGroup.add(fin);
    }
    rackGroup.add(finGroup);
  });

  root.add(rackGroup);
  return root;
}

async function exportGlb() {
  const model = createEdgeServerModel();
  const exporter = new GLTFExporter();

  const outputDir = path.resolve('public/assets/edge');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'edge_server.glb');

  exporter.parse(
    model,
    (glbArrayBuffer) => {
      const buffer = Buffer.from(glbArrayBuffer);
      fs.writeFileSync(outputPath, buffer);
      console.log(`Successfully generated and saved Edge Server GLB model to ${outputPath}`);
      console.log(`File size: ${(buffer.length / 1024).toFixed(2)} KB`);
    },
    (error) => {
      console.error('Failed to export Edge GLB model:', error);
      process.exit(1);
    },
    { binary: true }
  );
}

exportGlb();
