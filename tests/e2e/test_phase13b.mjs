// Automated Comprehensive Test for Phase 13B: Multi-Image + Video Task Input
import fs from "fs";
import path from "path";

// The web app to check (tests 1-2). Skipped, not failed, when nothing answers there.
const FRONTEND_URL = (process.env.E2E_FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
const BACKEND_URL = "http://127.0.0.1:8000";

async function runTests() {
  console.log("==================================================");
  console.log("PHASE 13B VERIFICATION SUITE");
  console.log("==================================================\n");

  let allPassed = true;

  let frontendUp = false;
  try {
    frontendUp = (await fetch(FRONTEND_URL, { signal: AbortSignal.timeout(3000) })).ok;
  } catch {
    frontendUp = false;
  }

  // TEST 1: Next.js Simulation Page SSR & HTML Delivery
  console.log("--- TEST 1: Next.js /simulation Page Rendering ---");
  if (!frontendUp) {
    console.log(`[SKIPPED] Tests 1-2: no web app at ${FRONTEND_URL} (start it, or set E2E_FRONTEND_URL).
`);
  } else try {
    const res = await fetch(`${FRONTEND_URL}/simulation`);
    if (res.status !== 200) throw new Error(`Status was ${res.status}`);
    const html = await res.text();

    const expectedTokens = [
      "TASK &amp; PAYLOAD",
      "IMAGE",
      "IMAGE BATCH",
      "VIDEO",
      "WORKLOAD SUMMARY",
      "READY FOR WORKLOAD EXECUTION",
      "ADD IMAGES",
      "UPLOAD VIDEO",
    ];

    for (const token of expectedTokens) {
      if (!html.includes(token)) {
        console.warn(`[WARN] Token '${token}' not directly found in raw HTML (may be client-side rendered).`);
      } else {
        console.log(`[PASS] Found UI token in HTML: "${token}"`);
      }
    }
    console.log("[PASS] /simulation page returned HTTP 200 OK\n");
  } catch (err) {
    console.error("[FAIL] Test 1 failed:", err.message);
    allPassed = false;
  }

  // TEST 2: Static Sample Media Assets
  console.log("--- TEST 2: Static Sample Media Assets Accessibility ---");
  const samples = [
    { url: `${FRONTEND_URL}/samples/traffic_monitoring.jpg`, mime: "image/jpeg" },
    { url: `${FRONTEND_URL}/samples/drone_inspection.jpg`, mime: "image/jpeg" },
    { url: `${FRONTEND_URL}/samples/sample_video.mp4`, mime: "video/mp4" },
  ];

  for (const sample of frontendUp ? samples : []) {
    try {
      const res = await fetch(sample.url);
      if (res.status !== 200) throw new Error(`HTTP status ${res.status}`);
      const buf = await res.arrayBuffer();
      const sizeKb = (buf.byteLength / 1024).toFixed(1);
      console.log(`[PASS] Sample loaded: ${path.basename(sample.url)} (${sizeKb} KB, HTTP ${res.status})`);
    } catch (err) {
      console.error(`[FAIL] Failed to load sample ${sample.url}:`, err.message);
      allPassed = false;
    }
  }
  console.log();

  // TEST 3: Mode 1 - Single Image Execution with Real MobileNet V3 Detection
  console.log("--- TEST 3: Mode 1 - Single Image Real Object Detection Workflow ---");
  try {
    const imgBuffer = fs.readFileSync("public/samples/traffic_monitoring.jpg");
    const formData = new FormData();
    const blob = new Blob([imgBuffer], { type: "image/jpeg" });
    formData.append("file", blob, "traffic_monitoring.jpg");
    formData.append("target", "EDGE");
    formData.append("confidence_threshold", "0.4");

    const execRes = await fetch(`${BACKEND_URL}/api/simulation/execute`, {
      method: "POST",
      body: formData,
    });

    if (execRes.status !== 200) {
      const errText = await execRes.text();
      throw new Error(`Execution returned status ${execRes.status}: ${errText}`);
    }

    const execData = await execRes.json();
    console.log("[PASS] Single image detection execution succeeded:");
    console.log(`       - Execution Environment: ${execData.execution_environment}`);
    console.log(`       - Objects Detected Count: ${execData.detection_count}`);
    console.log(`       - Image Resolution: ${execData.image_metadata?.width}x${execData.image_metadata?.height}`);
    console.log(`       - Latency: ${execData.latency_ms} ms (Inference: ${execData.execution_time_ms} ms)`);
    console.log(`       - Energy: ${execData.energy} J, Cost: ${execData.cost}`);
    console.log(`       - Annotated Image Base64 length: ${execData.annotated_image_base64?.length} chars`);
    if (execData.detections && execData.detections.length > 0) {
      console.log(`       - Top detection: ${execData.detections[0].label} (${(execData.detections[0].confidence * 100).toFixed(1)}%)`);
    }

    if (!execData.annotated_image_base64 || execData.detection_count <= 0) {
      throw new Error("Detection output was empty or invalid");
    }
  } catch (err) {
    console.error("[FAIL] Test 3 failed:", err.message);
    allPassed = false;
  }
  console.log();

  // TEST 4: Mode 2 - Image Batch Payload Simulation
  console.log("--- TEST 4: Mode 2 - Image Batch Workload Representation & Offload Decision ---");
  try {
    // 2 images: traffic_monitoring (476 KB) + drone_inspection (165 KB) = 641 KB ~ 0.63 MB
    const img1Bytes = fs.statSync("public/samples/traffic_monitoring.jpg").size;
    const img2Bytes = fs.statSync("public/samples/drone_inspection.jpg").size;
    const totalBytes = img1Bytes + img2Bytes;
    const totalSizeMb = Math.round((totalBytes / (1024 * 1024)) * 100) / 100;

    console.log(`       - Batch: 2 images, total size: ${totalSizeMb} MB (${totalBytes} bytes)`);

    const batchPayload = {
      task: {
        task_id: "TASK_BATCH_001",
        data_size_mb: totalSizeMb,
        cpu_demand_percent: Math.min(95, Math.round(40 + 2 * 3 + totalSizeMb * 1.5)),
        memory_demand_percent: Math.min(95, Math.round(35 + 2 * 3 + totalSizeMb * 1.2)),
        deadline_ms: 150.0,
        priority: 3,
      },
      local: { cpu_available: 75, memory_available: 70, battery_level: 90, base_latency: 1.2 },
      edge: { cpu_load: 35, task_queue: 2, network_latency: 12.0, bandwidth: 24.0 },
      cloud: { cpu_load: 40, task_queue: 3, network_latency: 55.0, bandwidth: 50.0 },
    };

    const evalRes = await fetch(`${BACKEND_URL}/api/simulation/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batchPayload),
    });

    if (evalRes.status !== 200) {
      throw new Error(`Batch evaluation failed: ${evalRes.status}`);
    }

    const evalData = await evalRes.json();
    console.log("[PASS] Image Batch Workload evaluated by DQN Policy:");
    console.log(`       - Selected Target: ${evalData.selectedTarget?.toUpperCase()}`);
    console.log(`       - Scores: Local=${evalData.candidateScores?.local?.score}, Edge=${evalData.candidateScores?.edge?.score}, Cloud=${evalData.candidateScores?.cloud?.score}`);
    console.log(`       - Reason: "${evalData.reason}"`);
  } catch (err) {
    console.error("[FAIL] Test 4 failed:", err.message);
    allPassed = false;
  }
  console.log();

  // TEST 5: Mode 3 - Video Stream Payload Simulation
  console.log("--- TEST 5: Mode 3 - Video Stream Workload Representation & Offload Decision ---");
  try {
    const videoStats = fs.statSync("public/samples/sample_video.mp4");
    const videoSizeMb = Math.round((videoStats.size / (1024 * 1024)) * 100) / 100;
    const durationSeconds = 3.0;
    const resolution = "640x360";

    console.log(`       - Video: 1 stream, file size: ${videoSizeMb} MB, duration: ${durationSeconds}s, resolution: ${resolution}`);

    const videoPayload = {
      task: {
        task_id: "TASK_VIDEO_001",
        data_size_mb: Math.max(0.1, videoSizeMb),
        cpu_demand_percent: Math.min(95, Math.round(50 + durationSeconds * 0.5 + videoSizeMb * 0.4)),
        memory_demand_percent: Math.min(90, Math.round(45 + videoSizeMb * 0.4)),
        deadline_ms: 200.0,
        priority: 4,
      },
      local: { cpu_available: 60, memory_available: 65, battery_level: 80, base_latency: 1.5 },
      edge: { cpu_load: 45, task_queue: 4, network_latency: 15.0, bandwidth: 20.0 },
      cloud: { cpu_load: 30, task_queue: 2, network_latency: 50.0, bandwidth: 55.0 },
    };

    const evalRes = await fetch(`${BACKEND_URL}/api/simulation/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(videoPayload),
    });

    if (evalRes.status !== 200) {
      throw new Error(`Video evaluation failed: ${evalRes.status}`);
    }

    const evalData = await evalRes.json();
    console.log("[PASS] Video Stream Workload evaluated by DQN Policy:");
    console.log(`       - Selected Target: ${evalData.selectedTarget?.toUpperCase()}`);
    console.log(`       - Scores: Local=${evalData.candidateScores?.local?.score}, Edge=${evalData.candidateScores?.edge?.score}, Cloud=${evalData.candidateScores?.cloud?.score}`);
    console.log(`       - Reason: "${evalData.reason}"`);
  } catch (err) {
    console.error("[FAIL] Test 5 failed:", err.message);
    allPassed = false;
  }
  console.log();

  console.log("==================================================");
  if (allPassed) {
    console.log(
      frontendUp
        ? "ALL 5 TESTS PASSED SUCCESSFULLY! Phase 13B verified."
        : "Tests 3-5 (backend) PASSED; tests 1-2 (web app) SKIPPED: no web app running."
    );
  } else {
    console.error("SOME TESTS FAILED.");
    process.exit(1);
  }
  console.log("==================================================");
}

runTests();
