// Phase 14: Comprehensive Verification of Real Task Execution & Autonomous Offloading
// Tests all 3 destinations (Local, Edge, Cloud) across all 3 workload types (Single Image, Image Batch, Video)
import fs from "node:fs";
import path from "node:path";

const MAIN_BACKEND_URL = "http://127.0.0.1:8000";
const EDGE_WORKER_URL = "http://127.0.0.1:8001";
const CLOUD_WORKER_URL = "http://127.0.0.1:8002";

async function main() {
  console.log("==================================================");
  console.log("PHASE 14 — REAL TASK EXECUTION & OFFLOADING TESTS");
  console.log("==================================================");

  // 1. Verify Worker Health
  console.log("\n[TEST 1] Verifying Worker Infrastructure...");
  const edgeHealth = await (await fetch(`${EDGE_WORKER_URL}/health`)).json();
  console.log(`  Edge Worker (:8001): status=${edgeHealth.status}, tier=${edgeHealth.tier}, id=${edgeHealth.worker_id}`);
  if (edgeHealth.tier !== "EDGE") throw new Error("Edge tier mismatch");

  const cloudHealth = await (await fetch(`${CLOUD_WORKER_URL}/health`)).json();
  console.log(`  Cloud Worker (:8002): status=${cloudHealth.status}, tier=${cloudHealth.tier}, id=${cloudHealth.worker_id}`);
  if (cloudHealth.tier !== "CLOUD") throw new Error("Cloud tier mismatch");

  const mainHealth = await (await fetch(`${MAIN_BACKEND_URL}/health`)).json();
  console.log(`  Main Backend (:8000): status=${mainHealth.status}`);

  // 2. Prepare Test Media Assets
  console.log("\n[TEST 2] Preparing Test Media Assets...");
  const sampleImagePath = "public/samples/traffic_monitoring.jpg";
  if (!fs.existsSync(sampleImagePath)) {
    throw new Error(`Sample image not found at ${sampleImagePath}`);
  }
  const imageBuffer = fs.readFileSync(sampleImagePath);
  console.log(`  Loaded sample image: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

  const sampleVideoPath = "public/samples/sample_video.mp4";
  if (!fs.existsSync(sampleVideoPath)) {
    throw new Error(`Sample video not found at ${sampleVideoPath}`);
  }
  const videoBuffer = fs.readFileSync(sampleVideoPath);
  console.log(`  Loaded sample video: ${(videoBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

  // 3. Test Local Execution Path (Single Image)
  console.log("\n[TEST 3] Testing Autonomous Offloading -> LOCAL Execution...");
  const formLocal = new FormData();
  formLocal.append("files", new Blob([imageBuffer], { type: "image/jpeg" }), "traffic.jpg");
  formLocal.append("workload_type", "IMAGE");
  formLocal.append("task_id", "TEST_LOCAL_P14");
  formLocal.append("deadline_ms", "5000");
  formLocal.append("priority", "1");
  // Ideal local conditions -> DQN should choose LOCAL
  formLocal.append("device_cpu_available", "95.0");
  formLocal.append("device_memory_available", "90.0");
  formLocal.append("device_battery_level", "99.0");
  formLocal.append("device_base_latency", "1.0");
  formLocal.append("edge_cpu_load", "95.0");
  formLocal.append("edge_task_queue", "100");
  formLocal.append("edge_network_latency", "80.0");
  formLocal.append("edge_bandwidth", "0.1");
  formLocal.append("cloud_cpu_load", "95.0");
  formLocal.append("cloud_task_queue", "100");
  formLocal.append("cloud_network_latency", "150.0");
  formLocal.append("cloud_bandwidth", "0.1");

  const resLocal = await fetch(`${MAIN_BACKEND_URL}/api/simulation/execute`, {
    method: "POST",
    body: formLocal,
  });
  const dataLocal = await resLocal.json();
  console.log(`  Decision: ${dataLocal.decision}`);
  console.log(`  Worker: ${dataLocal.execution_worker}`);
  console.log(`  Inference Time: ${dataLocal.processing_time_ms} ms`);
  console.log(`  Network Transfer Time: ${dataLocal.network_transfer_ms} ms`);
  console.log(`  Total Latency: ${dataLocal.latency_ms} ms`);
  console.log(`  Objects Detected: ${dataLocal.detection_count}`);
  if (dataLocal.decision !== "LOCAL") throw new Error(`Expected LOCAL decision, got ${dataLocal.decision}`);
  if (dataLocal.network_transfer_ms !== 0.0) throw new Error("Expected 0 ms network transfer for LOCAL");

  // 4. Test Edge Execution Path (Single Image via HTTP to :8001)
  console.log("\n[TEST 4] Testing Autonomous Offloading -> EDGE Execution (:8001)...");
  const formEdge = new FormData();
  formEdge.append("files", new Blob([imageBuffer], { type: "image/jpeg" }), "traffic.jpg");
  formEdge.append("workload_type", "IMAGE");
  formEdge.append("task_id", "TEST_EDGE_P14");
  formEdge.append("deadline_ms", "600");
  formEdge.append("priority", "2");
  // Constrained local, ideal edge -> DQN chooses EDGE
  formEdge.append("device_cpu_available", "5.0");
  formEdge.append("device_memory_available", "10.0");
  formEdge.append("device_battery_level", "10.0");
  formEdge.append("device_base_latency", "50.0");
  formEdge.append("edge_cpu_load", "5.0");
  formEdge.append("edge_task_queue", "0");
  formEdge.append("edge_network_latency", "5.0");
  formEdge.append("edge_bandwidth", "5.0");
  formEdge.append("cloud_cpu_load", "90.0");
  formEdge.append("cloud_task_queue", "50");
  formEdge.append("cloud_network_latency", "150.0");
  formEdge.append("cloud_bandwidth", "0.5");

  const resEdge = await fetch(`${MAIN_BACKEND_URL}/api/simulation/execute`, {
    method: "POST",
    body: formEdge,
  });
  const dataEdge = await resEdge.json();
  console.log(`  Decision: ${dataEdge.decision}`);
  console.log(`  Worker: ${dataEdge.execution_worker}`);
  console.log(`  Inference Time: ${dataEdge.processing_time_ms} ms`);
  console.log(`  Real HTTP Network Transfer Time: ${dataEdge.network_transfer_ms} ms`);
  console.log(`  Total Latency: ${dataEdge.latency_ms} ms`);
  console.log(`  Objects Detected: ${dataEdge.detection_count}`);
  if (dataEdge.decision !== "EDGE") throw new Error(`Expected EDGE decision, got ${dataEdge.decision}`);
  if (!dataEdge.execution_worker.includes("edge")) throw new Error("Expected edge worker");
  if (dataEdge.network_transfer_ms <= 0) throw new Error("Expected real network transfer time > 0");

  // 5. Test Cloud Execution Path (Single Image via HTTP to :8002)
  console.log("\n[TEST 5] Testing Autonomous Offloading -> CLOUD Execution (:8002)...");
  const formCloud = new FormData();
  formCloud.append("files", new Blob([imageBuffer], { type: "image/jpeg" }), "traffic.jpg");
  formCloud.append("workload_type", "IMAGE");
  formCloud.append("task_id", "TEST_CLOUD_P14");
  formCloud.append("deadline_ms", "1200");
  formCloud.append("priority", "2");
  // Constrained local, congested edge, powerful cloud -> DQN chooses CLOUD
  formCloud.append("device_cpu_available", "5.0");
  formCloud.append("device_memory_available", "5.0");
  formCloud.append("device_battery_level", "15.0");
  formCloud.append("device_base_latency", "50.0");
  formCloud.append("edge_cpu_load", "98.0");
  formCloud.append("edge_task_queue", "90");
  formCloud.append("edge_network_latency", "60.0");
  formCloud.append("edge_bandwidth", "0.1");
  formCloud.append("cloud_cpu_load", "5.0");
  formCloud.append("cloud_task_queue", "0");
  formCloud.append("cloud_network_latency", "15.0");
  formCloud.append("cloud_bandwidth", "10.0");

  const resCloud = await fetch(`${MAIN_BACKEND_URL}/api/simulation/execute`, {
    method: "POST",
    body: formCloud,
  });
  const dataCloud = await resCloud.json();
  console.log(`  Decision: ${dataCloud.decision}`);
  console.log(`  Worker: ${dataCloud.execution_worker}`);
  console.log(`  Inference Time: ${dataCloud.processing_time_ms} ms`);
  console.log(`  Real HTTP Network Transfer Time: ${dataCloud.network_transfer_ms} ms`);
  console.log(`  Total Latency: ${dataCloud.latency_ms} ms`);
  console.log(`  Objects Detected: ${dataCloud.detection_count}`);
  if (dataCloud.decision !== "CLOUD") throw new Error(`Expected CLOUD decision, got ${dataCloud.decision}`);
  if (!dataCloud.execution_worker.includes("cloud")) throw new Error("Expected cloud worker");
  if (dataCloud.network_transfer_ms <= 0) throw new Error("Expected real network transfer time > 0");

  // 6. Test Image Batch Workload
  console.log("\n[TEST 6] Testing Image Batch Workload Execution...");
  const formBatch = new FormData();
  formBatch.append("files", new Blob([imageBuffer], { type: "image/jpeg" }), "batch_frame_1.jpg");
  formBatch.append("files", new Blob([imageBuffer], { type: "image/jpeg" }), "batch_frame_2.jpg");
  formBatch.append("files", new Blob([imageBuffer], { type: "image/jpeg" }), "batch_frame_3.jpg");
  formBatch.append("workload_type", "IMAGE_BATCH");
  formBatch.append("task_id", "TEST_BATCH_P14");
  formBatch.append("deadline_ms", "2500");
  formBatch.append("priority", "2");
  formBatch.append("device_cpu_available", "10.0");
  formBatch.append("device_memory_available", "15.0");
  formBatch.append("device_battery_level", "20.0");
  formBatch.append("device_base_latency", "30.0");
  formBatch.append("edge_cpu_load", "10.0");
  formBatch.append("edge_task_queue", "1");
  formBatch.append("edge_network_latency", "8.0");
  formBatch.append("edge_bandwidth", "5.0");
  formBatch.append("cloud_cpu_load", "90.0");
  formBatch.append("cloud_task_queue", "40");
  formBatch.append("cloud_network_latency", "80.0");
  formBatch.append("cloud_bandwidth", "1.0");

  const resBatch = await fetch(`${MAIN_BACKEND_URL}/api/simulation/execute`, {
    method: "POST",
    body: formBatch,
  });
  const dataBatch = await resBatch.json();
  console.log(`  Decision: ${dataBatch.decision}`);
  console.log(`  Worker: ${dataBatch.execution_worker}`);
  console.log(`  Processed Images Count: ${dataBatch.processed_count}`);
  console.log(`  Total Batch Detections: ${dataBatch.detection_count}`);
  console.log(`  Inference Time: ${dataBatch.processing_time_ms} ms`);
  console.log(`  Network Transfer Time: ${dataBatch.network_transfer_ms} ms`);
  console.log(`  Total Latency: ${dataBatch.latency_ms} ms`);
  console.log(`  Batch Items Length: ${dataBatch.batch_items?.length}`);
  if (dataBatch.batch_items?.length !== 3) throw new Error("Expected 3 batch items");
  if (dataBatch.processed_count !== 3) throw new Error("Expected processed_count = 3");

  // 7. Test Video Stream Workload
  console.log("\n[TEST 7] Testing Video Stream Workload Execution...");
  const formVideo = new FormData();
  formVideo.append("files", new Blob([videoBuffer], { type: "video/mp4" }), "sample_video.mp4");
  formVideo.append("workload_type", "VIDEO");
  formVideo.append("task_id", "TEST_VIDEO_P14");
  formVideo.append("deadline_ms", "3000");
  formVideo.append("priority", "3");
  formVideo.append("device_cpu_available", "5.0");
  formVideo.append("device_memory_available", "5.0");
  formVideo.append("device_battery_level", "15.0");
  formVideo.append("device_base_latency", "50.0");
  formVideo.append("edge_cpu_load", "95.0");
  formVideo.append("edge_task_queue", "80");
  formVideo.append("edge_network_latency", "70.0");
  formVideo.append("edge_bandwidth", "0.2");
  formVideo.append("cloud_cpu_load", "5.0");
  formVideo.append("cloud_task_queue", "0");
  formVideo.append("cloud_network_latency", "15.0");
  formVideo.append("cloud_bandwidth", "10.0");

  const resVideo = await fetch(`${MAIN_BACKEND_URL}/api/simulation/execute`, {
    method: "POST",
    body: formVideo,
  });
  const dataVideo = await resVideo.json();
  console.log(`  Decision: ${dataVideo.decision}`);
  console.log(`  Worker: ${dataVideo.execution_worker}`);
  console.log(`  Keyframes Processed: ${dataVideo.processed_count}`);
  console.log(`  Total Detections Across Frames: ${dataVideo.detection_count}`);
  console.log(`  Inference Time: ${dataVideo.processing_time_ms} ms`);
  console.log(`  Network Transfer Time: ${dataVideo.network_transfer_ms} ms`);
  console.log(`  Total Latency: ${dataVideo.latency_ms} ms`);
  if (!dataVideo.processed_count || dataVideo.processed_count < 1) throw new Error("Expected processed keyframes > 0");

  console.log("\n==================================================");
  console.log("ALL 7 PHASE 14 VERIFICATION TESTS PASSED!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
