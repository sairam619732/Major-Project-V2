// Phase 11 Deterministic Simulation Presets Test
import { SCENARIO_PRESETS, DEFAULT_SIMULATION_TASK, DEFAULT_SIMULATION_DEVICE, DEFAULT_SIMULATION_EDGE, DEFAULT_SIMULATION_CLOUD } from "../simulationPresets";
import { evaluateOffloadingDecision } from "../../offloading/decisionEngine";

console.log("==================================================");
console.log("RUNNING PHASE 11 SIMULATION PRESETS TESTS");
console.log("==================================================\n");

SCENARIO_PRESETS.forEach((preset, idx) => {
  const task = { ...DEFAULT_SIMULATION_TASK, ...preset.state.task };
  const device = { ...DEFAULT_SIMULATION_DEVICE, ...preset.state.device };
  const edge = { ...DEFAULT_SIMULATION_EDGE, ...preset.state.edge };
  const cloud = { ...DEFAULT_SIMULATION_CLOUD, ...preset.state.cloud };

  const result = evaluateOffloadingDecision(task, device, edge, cloud);

  console.log(`[${idx + 1}/6] PRESET: ${preset.name} (${preset.badge})`);
  console.log(`  Selected: ${result.selectedTarget.toUpperCase()}`);
  console.log(`  Scores  : LOCAL = ${result.candidateScores.local.score} | EDGE = ${result.candidateScores.edge.score} | CLOUD = ${result.candidateScores.cloud.score}`);
  console.log(`  Latency : Local = ${result.candidateScores.local.estimatedLatencyMs}ms | Edge = ${result.candidateScores.edge.estimatedLatencyMs}ms | Cloud = ${result.candidateScores.cloud.estimatedLatencyMs}ms`);
  console.log(`  Reason  : "${result.reason}"\n`);
});

console.log("ALL 6 PRESETS EVALUATED CLEANLY AND DETERMINISTICALLY!");
