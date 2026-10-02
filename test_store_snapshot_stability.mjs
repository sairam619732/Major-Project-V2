// Test referential stability of all simulationStore getters, especially getWorkloadPayload()
import { simulationStore } from "./src/lib/simulation/simulationState.ts";

console.log("Testing simulationStore snapshot stability...");

// 1. Initial snapshot stability
const snap1 = simulationStore.getWorkloadPayload();
const snap2 = simulationStore.getWorkloadPayload();

if (snap1 !== snap2) {
  console.error("FAIL: Initial snapshots are not referentially identical!");
  process.exit(1);
}
console.log("PASS: Initial getWorkloadPayload() is referentially stable.");

// 2. Mode switch to IMAGE_BATCH
simulationStore.setWorkloadType("IMAGE_BATCH");
const batchSnap1 = simulationStore.getWorkloadPayload();
const batchSnap2 = simulationStore.getWorkloadPayload();

if (batchSnap1 !== batchSnap2) {
  console.error("FAIL: Batch snapshots are not referentially identical!");
  process.exit(1);
}
if (batchSnap1 === snap1) {
  console.error("FAIL: Batch snapshot did not update after setWorkloadType!");
  process.exit(1);
}
console.log("PASS: Batch getWorkloadPayload() updated and is referentially stable.");

// 3. Mode switch to VIDEO
simulationStore.setWorkloadType("VIDEO");
const videoSnap1 = simulationStore.getWorkloadPayload();
const videoSnap2 = simulationStore.getWorkloadPayload();

if (videoSnap1 !== videoSnap2) {
  console.error("FAIL: Video snapshots are not referentially identical!");
  process.exit(1);
}
console.log("PASS: Video getWorkloadPayload() updated and is referentially stable.");

// 4. Reset
simulationStore.reset();
const resetSnap1 = simulationStore.getWorkloadPayload();
const resetSnap2 = simulationStore.getWorkloadPayload();

if (resetSnap1 !== resetSnap2) {
  console.error("FAIL: Reset snapshots are not referentially identical!");
  process.exit(1);
}
console.log("PASS: Reset getWorkloadPayload() updated and is referentially stable.");

console.log("\nALL STORE SNAPSHOT STABILITY CHECKS PASSED!");
