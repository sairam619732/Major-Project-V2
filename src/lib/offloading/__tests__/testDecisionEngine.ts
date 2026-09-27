// Deterministic test suite for Phase 10 Decision Engine
import {
  evaluateOffloadingDecision,
  DEFAULT_TASK,
  DEFAULT_DEVICE,
  DEFAULT_EDGE,
  DEFAULT_CLOUD,
} from "../decisionEngine";

console.log("==================================================");
console.log("RUNNING PHASE 10 DECISION ENGINE DETERMINISTIC TESTS");
console.log("==================================================\n");

// --------------------------------------------------
// SCENARIO 2 (DEMO BASELINE):
// Local constrained (38% CPU, 48% Mem)
// Edge healthy (41% CPU, 2 queue, 3.8 ms)
// Cloud (67% CPU, 18 queue, 42 ms)
// Expected: EDGE selected
// --------------------------------------------------
console.log("--- SCENARIO 2 (DEMO BASELINE) ---");
const resultDemo = evaluateOffloadingDecision(
  DEFAULT_TASK,
  DEFAULT_DEVICE,
  DEFAULT_EDGE,
  DEFAULT_CLOUD
);
console.log("Local Score:", resultDemo.candidateScores.local.score);
console.log("Edge Score: ", resultDemo.candidateScores.edge.score);
console.log("Cloud Score:", resultDemo.candidateScores.cloud.score);
console.log("Selected Target:", resultDemo.selectedTarget);
console.log("Reason:", resultDemo.reason);
console.log("Breakdown Edge:", resultDemo.candidateScores.edge.breakdown);

if (resultDemo.selectedTarget !== "edge") {
  console.error("FAIL: Scenario 2 expected 'edge', got", resultDemo.selectedTarget);
  process.exit(1);
} else {
  console.log("PASS: Scenario 2 selected EDGE as expected.\n");
}

// --------------------------------------------------
// SCENARIO 1:
// Good local resources + low local latency
// Local: 85% CPU available, 85% Mem available, 95% Battery
// Task deadline 45ms, Edge latency 12ms
// Expected: LOCAL selected
// --------------------------------------------------
console.log("--- SCENARIO 1: GOOD LOCAL RESOURCES ---");
const resultLocal = evaluateOffloadingDecision(
  {
    ...DEFAULT_TASK,
    cpuDemandPct: 40,
    memoryDemandPct: 35,
  },
  {
    cpuAvailablePct: 88,
    memoryAvailablePct: 80,
    batteryPct: 95,
    latencyMs: 0.5,
  },
  {
    ...DEFAULT_EDGE,
    latencyMs: 14.0, // Higher wireless link latency
    queueLength: 4,
  },
  DEFAULT_CLOUD
);
console.log("Local Score:", resultLocal.candidateScores.local.score);
console.log("Edge Score: ", resultLocal.candidateScores.edge.score);
console.log("Cloud Score:", resultLocal.candidateScores.cloud.score);
console.log("Selected Target:", resultLocal.selectedTarget);
console.log("Reason:", resultLocal.reason);

if (resultLocal.selectedTarget !== "local") {
  console.error("FAIL: Scenario 1 expected 'local', got", resultLocal.selectedTarget);
  process.exit(1);
} else {
  console.log("PASS: Scenario 1 selected LOCAL as expected.\n");
}

// --------------------------------------------------
// SCENARIO 3:
// Edge heavily congested + high queue
// Edge: 94% CPU load, 25 tasks queued
// Cloud: 25% CPU load, 2 tasks queued, fast 100 Gbps backbone
// Expected: CLOUD selected
// --------------------------------------------------
console.log("--- SCENARIO 3: EDGE CONGESTION ---");
const resultCloud = evaluateOffloadingDecision(
  {
    ...DEFAULT_TASK,
    deadlineMs: 120, // Flexible deadline for high-throughput batch work
    cpuDemandPct: 85,
  },
  DEFAULT_DEVICE, // Local constrained
  {
    cpuLoadPct: 94,
    queueLength: 26, // Severe edge queue backlog
    latencyMs: 12.0,
    bandwidthGbps: 2,
  },
  {
    cpuLoadPct: 22,
    queueLength: 2, // Clear datacenter queue
    latencyMs: 38.0,
    bandwidthGbps: 50,
  }
);
console.log("Local Score:", resultCloud.candidateScores.local.score);
console.log("Edge Score: ", resultCloud.candidateScores.edge.score);
console.log("Cloud Score:", resultCloud.candidateScores.cloud.score);
console.log("Selected Target:", resultCloud.selectedTarget);
console.log("Reason:", resultCloud.reason);

if (resultCloud.selectedTarget !== "cloud") {
  console.error("FAIL: Scenario 3 expected 'cloud', got", resultCloud.selectedTarget);
  process.exit(1);
} else {
  console.log("PASS: Scenario 3 selected CLOUD as expected.\n");
}

console.log("==================================================");
console.log("ALL 3 SCENARIOS PASSED DETERMINISTICALLY!");
console.log("==================================================");
