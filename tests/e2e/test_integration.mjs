// Automated End-to-End Integration Test for Phase 13
// Tests frontend HTTP client behavior against the running FastAPI backend

const API_BASE = "http://127.0.0.1:8000";

async function testHealth() {
  console.log("1. Testing GET /health...");
  const res = await fetch(`${API_BASE}/health`);
  const data = await res.json();
  console.log("   Status:", res.status, "Response:", data);
  if (data.status !== "ok") throw new Error("Health check failed");
}

async function testApiInfo() {
  console.log("\n2. Testing GET /api...");
  const res = await fetch(`${API_BASE}/api`);
  const data = await res.json();
  console.log("   Status:", res.status, "Service:", data.service, "Phase:", data.phase);
  if (!data.endpoints.simulation_evaluate) throw new Error("Simulation endpoint missing from /api");
}

async function testSimulationEvaluation(label, payload) {
  console.log(`\n3. Testing Simulation Execution: ${label}...`);
  const res = await fetch(`${API_BASE}/api/simulation/evaluate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
    },
    body: JSON.stringify(payload),
  });

  const corsHeader = res.headers.get("access-control-allow-origin");
  const data = await res.json();

  console.log("   HTTP Status:", res.status);
  console.log("   CORS Header:", corsHeader);
  console.log("   Selected Target:", data.selectedTarget?.toUpperCase());
  console.log("   Scores:", {
    LOCAL: data.candidateScores?.local?.score,
    EDGE: data.candidateScores?.edge?.score,
    CLOUD: data.candidateScores?.cloud?.score,
  });
  console.log("   Reason Quote:", data.reason);

  if (res.status !== 200) throw new Error(`Simulation evaluation failed with status ${res.status}`);
  if (!data.selectedTarget) throw new Error("Missing selectedTarget in response");
  if (corsHeader !== "http://localhost:3000") throw new Error(`Unexpected CORS header: ${corsHeader}`);
  return data;
}

async function testInvalidInput() {
  console.log("\n4. Testing Invalid Simulation Input Handling (Pydantic validation)...");
  const invalidPayload = {
    task: {
      task_id: "TASK_ERR",
      data_size_mb: -20.0, // Invalid: negative
      cpu_demand_percent: 250.0, // Invalid: > 100
      memory_demand_percent: 50.0,
      deadline_ms: -5.0, // Invalid: <= 0
      priority: 3,
    },
    local: { cpu_available: 50, memory_available: 50, battery_level: 100, base_latency: 1.0 },
    edge: { cpu_load: 50, task_queue: 2, network_latency: 10, bandwidth: 10 },
    cloud: { cpu_load: 50, task_queue: 5, network_latency: 50, bandwidth: 20 },
  };

  const res = await fetch(`${API_BASE}/api/simulation/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invalidPayload),
  });

  console.log("   Expected Status 422. Received Status:", res.status);
  const data = await res.json();
  console.log("   Validation Errors Caught:", data.detail?.length);
  if (res.status !== 422) throw new Error(`Expected 422, received ${res.status}`);
}

async function testBackendOfflineFallback() {
  console.log("\n5. Testing Backend Offline / Unreachable Fallback Simulation...");
  const fakeOfflineBase = "http://127.0.0.1:9999"; // Non-existent port
  let caughtError = false;

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 1000);
    await fetch(`${fakeOfflineBase}/api/simulation/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal: controller.signal,
    });
  } catch (err) {
    caughtError = true;
    console.log("   Offline connection safely caught as expected:", err.message);
  }

  if (!caughtError) throw new Error("Expected offline network error to be thrown and caught");
}

async function testRepeatedCalls(payload) {
  console.log("\n6. Testing Repeated RUN SIMULATION Clicks (Concurrency / Stability)...");
  const runs = 5;
  const promises = [];
  for (let i = 0; i < runs; i++) {
    promises.push(
      fetch(`${API_BASE}/api/simulation/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Origin": "http://localhost:3000" },
        body: JSON.stringify(payload),
      }).then((r) => r.json())
    );
  }
  const results = await Promise.all(promises);
  console.log(`   Successfully executed ${results.length} concurrent simulation requests.`);
  results.forEach((r, idx) => {
    if (!r.selectedTarget) throw new Error(`Run ${idx} returned invalid decision`);
  });
}

async function main() {
  console.log("==================================================");
  console.log("PHASE 13: END-TO-END INTEGRATION TEST SUITE");
  console.log("==================================================");

  const sampleState = {
    task: {
      task_id: "TASK_001",
      task_type: "OBJECT_DETECTION",
      data_size_mb: 24.5,
      cpu_demand_percent: 65.0,
      memory_demand_percent: 45.0,
      deadline_ms: 45.0,
      priority: 3,
    },
    local: {
      cpu_available: 38.0,
      memory_available: 48.0,
      battery_level: 72.0,
      base_latency: 0.8,
    },
    edge: {
      cpu_load: 41.0,
      task_queue: 2,
      network_latency: 3.8,
      bandwidth: 10.0,
    },
    cloud: {
      cpu_load: 67.0,
      task_queue: 18,
      network_latency: 42.0,
      bandwidth: 25.0,
    },
  };

  await testHealth();
  await testApiInfo();
  await testSimulationEvaluation("Default Parameters", sampleState);
  await testInvalidInput();
  await testBackendOfflineFallback();
  await testRepeatedCalls(sampleState);

  console.log("\n==================================================");
  console.log("ALL PHASE 13 INTEGRATION TESTS PASSED CLEANLY!");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Integration test failed:", err);
  process.exit(1);
});
