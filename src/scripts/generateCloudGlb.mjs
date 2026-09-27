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

function createLargeIsometricDatacenter() {
  const root = new THREE.Group();
  root.name = "LargeIsometricDatacenterFacility";

  // =========================================================================
  // MATERIALS: Premium PBR Palette with Strong Contrast & Restrained Glow
  // =========================================================================
  // Dark metallic structural rack chassis & edge trims
  const chassisMat = new THREE.MeshStandardMaterial({
    name: "mat_cloud_chassis",
    color: new THREE.Color("#1a2436"),
    roughness: 0.36,
    metalness: 0.60,
  });

  // Solid dark floor tile material (deep slate)
  const floorTileDarkMat = new THREE.MeshStandardMaterial({
    name: "mat_cloud_floor_dark",
    color: new THREE.Color("#141c2c"),
    roughness: 0.40,
    metalness: 0.55,
  });

  // Perforated cold-aisle airflow floor tile (lighter technical contrast)
  const floorTileAirflowMat = new THREE.MeshStandardMaterial({
    name: "mat_cloud_floor_airflow",
    color: new THREE.Color("#222f46"),
    roughness: 0.32,
    metalness: 0.65,
  });

  // Deep shadow equipment bay cavity
  const innerBayMat = new THREE.MeshStandardMaterial({
    name: "mat_cloud_bay",
    color: new THREE.Color("#0c121e"),
    roughness: 0.65,
    metalness: 0.40,
  });

  // Brushed dark titanium server blade faceplates
  const bladeFaceMat = new THREE.MeshStandardMaterial({
    name: "mat_cloud_blade",
    color: new THREE.Color("#26344d"),
    roughness: 0.26,
    metalness: 0.62,
  });

  // Brushed aluminum accents, upright rails, drive latches & cable trays
  const metalAccentMat = new THREE.MeshStandardMaterial({
    name: "mat_cloud_accent",
    color: new THREE.Color("#64748b"),
    roughness: 0.20,
    metalness: 0.70,
  });

  // Dark anodized cooling vents & louvers
  const ventMat = new THREE.MeshStandardMaterial({
    name: "mat_cloud_vent",
    color: new THREE.Color("#162034"),
    roughness: 0.44,
    metalness: 0.55,
  });

  // Overhead cable tray zinc/yellow conduit
  const cableTrayMat = new THREE.MeshStandardMaterial({
    name: "mat_cloud_cable_tray",
    color: new THREE.Color("#3b4759"),
    roughness: 0.30,
    metalness: 0.65,
  });

  // Restrained Primary Violet Status LEDs
  const emissiveVioletLedMat = new THREE.MeshStandardMaterial({
    name: "emmis_cloud_led",
    color: new THREE.Color("#8b5cf6"),
    emissive: new THREE.Color("#7c3aed"),
    emissiveIntensity: 2.2,
    roughness: 0.15,
    metalness: 0.1,
  });

  // Secondary Restrained Cyan Network Status LEDs (from visual reference)
  const emissiveCyanLedMat = new THREE.MeshStandardMaterial({
    name: "emmis_cyan_led",
    color: new THREE.Color("#38bdf8"),
    emissive: new THREE.Color("#0284c7"),
    emissiveIntensity: 2.0,
    roughness: 0.15,
    metalness: 0.1,
  });

  // Emissive Optical High-Speed Data Bus & Overhead Fiber Trunks
  const emissiveBusMat = new THREE.MeshStandardMaterial({
    name: "emmis_optical_bus",
    color: new THREE.Color("#c4b5fd"),
    emissive: new THREE.Color("#8b5cf6"),
    emissiveIntensity: 2.4,
    roughness: 0.1,
    metalness: 0.2,
  });

  // Emissive Perimeter Underglow Channel
  const emissiveUnderglowMat = new THREE.MeshStandardMaterial({
    name: "emmis_underglow",
    color: new THREE.Color("#a78bfa"),
    emissive: new THREE.Color("#8b5cf6"),
    emissiveIntensity: 1.8,
    roughness: 0.1,
    metalness: 0.1,
  });

  // =========================================================================
  // 1. EXPANSIVE RAISED ACCESS FLOOR PLATFORM (4.6m Wide x 3.8m Deep)
  // =========================================================================
  const platformGroup = new THREE.Group();
  platformGroup.name = "DatacenterPlatform";

  const platW = 4.60;
  const platD = 3.80;
  const platH = 0.16;
  const floorTopY = -0.92;

  // Heavy sub-floor structural base plinth
  const plinthBase = new THREE.Mesh(
    new THREE.BoxGeometry(platW, platH, platD),
    chassisMat
  );
  plinthBase.position.set(0, floorTopY - platH * 0.5, 0);
  platformGroup.add(plinthBase);

  // Beveled outer edge frame
  const edgeTrimGeoX = new THREE.BoxGeometry(platW + 0.02, 0.035, 0.04);
  const edgeTrimGeoZ = new THREE.BoxGeometry(0.04, 0.035, platD + 0.02);

  const trimFront = new THREE.Mesh(edgeTrimGeoX, metalAccentMat);
  trimFront.position.set(0, floorTopY + 0.01, platD * 0.5);
  platformGroup.add(trimFront);

  const trimBack = new THREE.Mesh(edgeTrimGeoX, metalAccentMat);
  trimBack.position.set(0, floorTopY + 0.01, -platD * 0.5);
  platformGroup.add(trimBack);

  const trimLeft = new THREE.Mesh(edgeTrimGeoZ, metalAccentMat);
  trimLeft.position.set(-platW * 0.5, floorTopY + 0.01, 0);
  platformGroup.add(trimLeft);

  const trimRight = new THREE.Mesh(edgeTrimGeoZ, metalAccentMat);
  trimRight.position.set(platW * 0.5, floorTopY + 0.01, 0);
  platformGroup.add(trimRight);

  // Recessed perimeter underglow channels (front, left, right)
  const underglowFront = new THREE.Mesh(
    new THREE.BoxGeometry(platW - 0.20, 0.02, 0.02),
    emissiveUnderglowMat
  );
  underglowFront.position.set(0, floorTopY - platH + 0.02, platD * 0.5 + 0.01);
  platformGroup.add(underglowFront);

  const underglowLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.02, platD - 0.20),
    emissiveUnderglowMat
  );
  underglowLeft.position.set(-platW * 0.5 - 0.01, floorTopY - platH + 0.02, 0);
  platformGroup.add(underglowLeft);

  // Underfloor Support Stanchions (Visible on cutaway edges)
  const stanchionGeo = new THREE.CylinderGeometry(0.02, 0.02, platH, 8);
  for (let sx = -platW * 0.46; sx <= platW * 0.46; sx += 0.92) {
    const st1 = new THREE.Mesh(stanchionGeo, metalAccentMat);
    st1.position.set(sx, floorTopY - platH * 0.5, platD * 0.48);
    platformGroup.add(st1);

    const st2 = new THREE.Mesh(stanchionGeo, metalAccentMat);
    st2.position.set(sx, floorTopY - platH * 0.5, -platD * 0.48);
    platformGroup.add(st2);
  }
  for (let sz = -platD * 0.44; sz <= platD * 0.44; sz += 0.88) {
    const st3 = new THREE.Mesh(stanchionGeo, metalAccentMat);
    st3.position.set(-platW * 0.48, floorTopY - platH * 0.5, sz);
    platformGroup.add(st3);
  }

  // Tiled Technical Access Floor Surface: 8 columns (X) x 7 rows (Z)
  const tileCols = 8;
  const tileRows = 7;
  const tileStepX = platW / tileCols;
  const tileStepZ = platD / tileRows;
  const tilePad = 0.015;

  for (let cx = 0; cx < tileCols; cx++) {
    const tx = -platW * 0.5 + (cx + 0.5) * tileStepX;
    for (let rz = 0; rz < tileRows; rz++) {
      const tz = -platD * 0.5 + (rz + 0.5) * tileStepZ;

      // Aisles are between the rack rows: rz == 2 (Aisle 1) and rz == 4 (Aisle 2)
      const isAirflowAisle = rz === 2 || rz === 4;
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(tileStepX - tilePad, 0.015, tileStepZ - tilePad),
        isAirflowAisle ? floorTileAirflowMat : floorTileDarkMat
      );
      tile.position.set(tx, floorTopY + 0.008, tz);
      platformGroup.add(tile);

      // Perforated vent slots on airflow aisle tiles
      if (isAirflowAisle) {
        for (let s = -0.15; s <= 0.15; s += 0.08) {
          const slot = new THREE.Mesh(
            new THREE.BoxGeometry((tileStepX - tilePad) * 0.75, 0.005, 0.02),
            ventMat
          );
          slot.position.set(tx, floorTopY + 0.016, tz + s);
          platformGroup.add(slot);
        }
      }
    }
  }

  root.add(platformGroup);

  // =========================================================================
  // 2. MULTI-ROW HIGH-DENSITY SERVER RACKS (3 Rows x 5 Racks = 15 Racks Total!)
  // Row 1 (Front Row): Z = +1.10 (5 Racks)
  // Row 2 (Middle Row): Z = 0.00 (5 Racks)
  // Row 3 (Back Row):  Z = -1.10 (5 Racks)
  // Plus end-of-row CRAC Cooling and PDU Cabinets = 18+ Total Cabinets!
  // =========================================================================
  const racksGroup = new THREE.Group();
  racksGroup.name = "MultiRowServerCluster";

  const rackW = 0.65;
  const rackH = 1.95;
  const rackD = 0.82;
  const rackSpacingX = 0.74;
  const rackXIndices = [-2, -1, 0, 1, 2]; // 5 racks per row
  const rowZPositions = [1.10, 0.00, -1.10]; // 3 distinct rows

  // Reusable Rack Builder for detailed, open-front enterprise server towers
  function buildEnterpriseRack(rackId, facingZ) {
    const rack = new THREE.Group();
    rack.name = rackId;

    // Outer Frame Shell
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(rackW, rackH, rackD),
      chassisMat
    );
    rack.add(frame);

    // Inset Open Equipment Bay (Front)
    const bay = new THREE.Mesh(
      new THREE.BoxGeometry(rackW - 0.08, rackH - 0.14, rackD - 0.06),
      innerBayMat
    );
    bay.position.set(0, 0, facingZ * 0.035);
    rack.add(bay);

    // 4 Corner Structural Steel Uprights
    const cornerGeo = new THREE.BoxGeometry(0.035, rackH - 0.02, 0.035);
    [
      [-rackW * 0.46, rackD * 0.46],
      [rackW * 0.46, rackD * 0.46],
      [-rackW * 0.46, -rackD * 0.46],
      [rackW * 0.46, -rackD * 0.46],
    ].forEach(([cx, cz]) => {
      const corner = new THREE.Mesh(cornerGeo, metalAccentMat);
      corner.position.set(cx, 0, cz);
      rack.add(corner);
    });

    // Vertical EIA-310 Mounting Rails inside bay (Left & Right)
    const railGeo = new THREE.BoxGeometry(0.025, rackH - 0.16, 0.03);
    [-rackW * 0.41, rackW * 0.41].forEach((rx) => {
      const rail = new THREE.Mesh(railGeo, metalAccentMat);
      rail.position.set(rx, 0, facingZ * (rackD * 0.40));
      rack.add(rail);
    });

    // Top Cable Waterfall Cowl
    const topCowl = new THREE.Mesh(
      new THREE.BoxGeometry(rackW + 0.02, 0.05, rackD + 0.02),
      metalAccentMat
    );
    topCowl.position.set(0, rackH * 0.5 + 0.025, 0);
    rack.add(topCowl);

    // Top Rack Identifier Badge (Emissive Violet)
    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.03, 0.015),
      emissiveVioletLedMat
    );
    badge.name = `emmis_${rackId}_badge`;
    badge.position.set(0, rackH * 0.44, facingZ * (rackD * 0.45));
    rack.add(badge);

    // 1U Top-of-Rack (ToR) High-Speed 100G Switch Unit at top of rack
    const switchUnit = new THREE.Mesh(
      new THREE.BoxGeometry(rackW - 0.10, 0.09, rackD - 0.10),
      bladeFaceMat
    );
    switchUnit.position.set(0, rackH * 0.34, facingZ * (rackD * 0.04));
    rack.add(switchUnit);

    // ToR Switch Port Matrix (Blinking Cyan & Violet LEDs)
    for (let p = -0.22; p <= 0.22; p += 0.055) {
      const pLed = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.014, 0.008),
        Math.abs(p) < 0.1 ? emissiveCyanLedMat : emissiveVioletLedMat
      );
      pLed.name = `emmis_${rackId}_switch_${Math.round(p * 100)}`;
      pLed.position.set(p, rackH * 0.34, facingZ * (rackD * 0.42));
      rack.add(pLed);
    }

    // 6 Modular Compute Blades (Stacked vertically)
    const bladeYOffsets = [-0.64, -0.42, -0.20, 0.02, 0.24];
    bladeYOffsets.forEach((by, bIdx) => {
      const blade = new THREE.Group();
      blade.position.set(0, by, facingZ * 0.04);

      // Blade Body
      const bBody = new THREE.Mesh(
        new THREE.BoxGeometry(rackW - 0.10, 0.19, rackD - 0.10),
        bladeFaceMat
      );
      blade.add(bBody);

      // Blade Front Face
      const bFront = new THREE.Mesh(
        new THREE.BoxGeometry(rackW - 0.11, 0.18, 0.02),
        bladeFaceMat
      );
      bFront.position.set(0, 0, facingZ * (rackD * 0.38));
      blade.add(bFront);

      // Perforated Air Intake Band
      const bVent = new THREE.Mesh(
        new THREE.BoxGeometry(rackW - 0.15, 0.05, 0.015),
        ventMat
      );
      bVent.position.set(0, -0.045, facingZ * (rackD * 0.39));
      blade.add(bVent);

      // 4 NVMe Hot-Swap Drive Trays per blade
      const dW = 0.085;
      [-0.16, -0.055, 0.055, 0.16].forEach((dx, dIdx) => {
        const caddy = new THREE.Mesh(
          new THREE.BoxGeometry(dW, 0.065, 0.018),
          chassisMat
        );
        caddy.position.set(dx, 0.035, facingZ * (rackD * 0.39));
        blade.add(caddy);

        // Drive latch accent
        const latch = new THREE.Mesh(
          new THREE.BoxGeometry(dW * 0.5, 0.012, 0.01),
          metalAccentMat
        );
        latch.position.set(dx, 0.015, facingZ * (rackD * 0.40));
        blade.add(latch);

        // Drive Activity LED (Alternating violet and cyan)
        const dLed = new THREE.Mesh(
          new THREE.BoxGeometry(0.01, 0.01, 0.008),
          dIdx % 2 === 0 ? emissiveVioletLedMat : emissiveCyanLedMat
        );
        dLed.name = `emmis_${rackId}_dled_${bIdx}_${dIdx}`;
        dLed.position.set(dx + dW * 0.3, 0.05, facingZ * (rackD * 0.40));
        blade.add(dLed);
      });

      // Central Processor Activity Bar
      const cpuBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, 0.014, 0.01),
        emissiveVioletLedMat
      );
      cpuBar.name = `emmis_${rackId}_cpubar_${bIdx}`;
      cpuBar.position.set(0, -0.045, facingZ * (rackD * 0.40));
      blade.add(cpuBar);

      // High-speed Optical Transceiver Block (QSFP28)
      [-0.22, 0.22].forEach((qx, qIdx) => {
        const qsfp = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.022, 0.015),
          metalAccentMat
        );
        qsfp.position.set(qx, -0.045, facingZ * (rackD * 0.395));
        blade.add(qsfp);

        const qLed = new THREE.Mesh(
          new THREE.BoxGeometry(0.008, 0.008, 0.006),
          emissiveCyanLedMat
        );
        qLed.name = `emmis_${rackId}_qled_${bIdx}_${qIdx}`;
        qLed.position.set(qx, -0.025, facingZ * (rackD * 0.40));
        blade.add(qLed);
      });

      rack.add(blade);
    });

    // Exterior Radiator Heat Dissipation Fins (Side louvers)
    for (let f = -0.28; f <= 0.28; f += 0.07) {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, rackH * 0.85, 0.02),
        ventMat
      );
      fin.position.set(-rackW * 0.51, 0, f);
      rack.add(fin);
    }

    return rack;
  }

  // Populate the 3 Rows:
  // Row 1 (Front Row): Z = +1.10, faces inward towards -Z
  rackXIndices.forEach((xi) => {
    const rx = xi * rackSpacingX;
    const rack = buildEnterpriseRack(`Rack_R1_${xi + 2}`, -1);
    rack.position.set(rx, floorTopY + rackH * 0.5, rowZPositions[0]);
    racksGroup.add(rack);
  });

  // Row 2 (Middle Row): Z = 0.00, faces towards +Z
  rackXIndices.forEach((xi) => {
    const rx = xi * rackSpacingX;
    const rack = buildEnterpriseRack(`Rack_R2_${xi + 2}`, 1);
    rack.position.set(rx, floorTopY + rackH * 0.5, rowZPositions[1]);
    racksGroup.add(rack);
  });

  // Row 3 (Back Row): Z = -1.10, faces towards +Z
  rackXIndices.forEach((xi) => {
    const rx = xi * rackSpacingX;
    const rack = buildEnterpriseRack(`Rack_R3_${xi + 2}`, 1);
    rack.position.set(rx, floorTopY + rackH * 0.5, rowZPositions[2]);
    racksGroup.add(rack);
  });

  // =========================================================================
  // 3. IN-ROW CRAC COOLING UNITS & PDU POWER MODULES
  // Placed at the flanking ends of the rows (Left & Right ends)
  // =========================================================================
  // Left End CRAC In-Row Cooling Units (between rows)
  [-0.55, 0.55].forEach((cz, cIdx) => {
    const crac = new THREE.Group();
    crac.name = `CRAC_Unit_${cIdx}`;
    crac.position.set(-2.05, floorTopY + rackH * 0.5, cz);

    const cracBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, rackH, 0.72),
      chassisMat
    );
    crac.add(cracBody);

    // Multi-tier airflow intake louvers
    for (let l = -0.7; l <= 0.7; l += 0.12) {
      const louver = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.03, 0.60),
        ventMat
      );
      louver.position.set(0, l, 0);
      crac.add(louver);
    }

    // CRAC Status Display (Cyan/Violet)
    const cracDisplay = new THREE.Mesh(
      new THREE.BoxGeometry(0.37, 0.12, 0.22),
      emissiveCyanLedMat
    );
    cracDisplay.name = `emmis_crac_display_${cIdx}`;
    cracDisplay.position.set(0, 0.60, 0);
    crac.add(cracDisplay);

    racksGroup.add(crac);
  });

  // Right End PDU / UPS Cabinets
  [-0.55, 0.55].forEach((pz, pIdx) => {
    const pdu = new THREE.Group();
    pdu.name = `PDU_Cabinet_${pIdx}`;
    pdu.position.set(2.05, floorTopY + rackH * 0.5, pz);

    const pduBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, rackH, 0.72),
      chassisMat
    );
    pdu.add(pduBody);

    // Digital Power Metering Display (Violet)
    const pduMeter = new THREE.Mesh(
      new THREE.BoxGeometry(0.37, 0.14, 0.30),
      emissiveVioletLedMat
    );
    pduMeter.name = `emmis_pdu_meter_${pIdx}`;
    pduMeter.position.set(0, 0.60, 0);
    pdu.add(pduMeter);

    racksGroup.add(pdu);
  });

  root.add(racksGroup);

  // =========================================================================
  // 4. OVERHEAD UTILITY INFRASTRUCTURE (Cable Trays, Conduits & Busways)
  // Suspended above the 3 rack rows at Y = 1.15
  // =========================================================================
  const overheadGroup = new THREE.Group();
  overheadGroup.name = "OverheadUtilityInfrastructure";
  const trayY = floorTopY + rackH + 0.12;

  // Longitudinal Cable Ladders spanning above each of the 3 rows
  rowZPositions.forEach((rz, rowIdx) => {
    // Metal basket tray
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(platW * 0.85, 0.035, 0.24),
      cableTrayMat
    );
    tray.position.set(0, trayY, rz);
    overheadGroup.add(tray);

    // High-Density Fiber Optic Trunk Bundle nestled inside tray
    const fiberTrunk = new THREE.Mesh(
      new THREE.BoxGeometry(platW * 0.84, 0.02, 0.12),
      emissiveBusMat
    );
    fiberTrunk.name = `emmis_fiber_trunk_row_${rowIdx}`;
    fiberTrunk.position.set(0, trayY + 0.025, rz);
    overheadGroup.add(fiberTrunk);
  });

  // Transverse Bridge Cable Ladders crossing over the aisles
  [-1.20, -0.40, 0.40, 1.20].forEach((tx, tIdx) => {
    const bridgeTray = new THREE.Mesh(
      new THREE.BoxGeometry(0.20, 0.03, platD * 0.65),
      cableTrayMat
    );
    bridgeTray.position.set(tx, trayY + 0.04, 0);
    overheadGroup.add(bridgeTray);

    const bridgeFiber = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.016, platD * 0.64),
      emissiveBusMat
    );
    bridgeFiber.name = `emmis_bridge_trunk_${tIdx}`;
    bridgeFiber.position.set(tx, trayY + 0.06, 0);
    overheadGroup.add(bridgeFiber);
  });

  // Structural Overhead Gantry Columns (4 corner vertical unistrut columns)
  const gantryGeo = new THREE.BoxGeometry(0.045, trayY - floorTopY + 0.05, 0.045);
  [
    [-platW * 0.40, platD * 0.35],
    [platW * 0.40, platD * 0.35],
    [-platW * 0.40, -platD * 0.35],
    [platW * 0.40, -platD * 0.35],
  ].forEach(([gx, gz]) => {
    const gantry = new THREE.Mesh(gantryGeo, metalAccentMat);
    gantry.position.set(gx, floorTopY + (trayY - floorTopY) * 0.5, gz);
    overheadGroup.add(gantry);
  });

  root.add(overheadGroup);

  return root;
}

async function exportGlb() {
  const model = createLargeIsometricDatacenter();
  const exporter = new GLTFExporter();

  const outputDir = path.resolve('public/assets/cloud');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'cloud.glb');

  exporter.parse(
    model,
    (glbArrayBuffer) => {
      const buffer = Buffer.from(glbArrayBuffer);
      fs.writeFileSync(outputPath, buffer);
      console.log(`Successfully generated and saved Large Isometric Datacenter GLB to ${outputPath}`);
      console.log(`File size: ${(buffer.length / 1024).toFixed(2)} KB`);
    },
    (error) => {
      console.error('Failed to export Datacenter GLB model:', error);
      process.exit(1);
    },
    { binary: true }
  );
}

exportGlb();
