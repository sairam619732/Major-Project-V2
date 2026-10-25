#!/usr/bin/env node
/**
 * Runs every check in the project, in order, and prints a pass/fail summary.
 *
 *   npm run check            everything (starts the backend for the live API tests if it isn't running)
 *   npm run check -- --quick skip the production build and the live API tests
 *
 * Needs: npm install (frontend) and backend/.venv with backend/requirements.txt installed.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.join(root, "backend");
const quick = process.argv.includes("--quick");
const isWin = process.platform === "win32";

const venvPython = path.join(backend, ".venv", isWin ? "Scripts/python.exe" : "bin/python");
const python = existsSync(venvPython) ? venvPython : isWin ? "python" : "python3";
const npx = isWin ? "npx.cmd" : "npx";
const API = "http://127.0.0.1:8000";

const results = [];

function run(name, cmd, args, cwd = root) {
  process.stdout.write(`\n=== ${name}\n`);
  const started = Date.now();
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: isWin && cmd.endsWith(".cmd") });
  const ok = res.status === 0;
  results.push({ name, ok, seconds: ((Date.now() - started) / 1000).toFixed(1) });
  return ok;
}

async function backendUp() {
  try {
    const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------- Frontend ----------
run("TypeScript type-check", npx, ["tsc", "--noEmit", "-p", "."]);
run("ESLint", npx, ["eslint", "."]);
run("Frontend unit: research data (phase 16)", process.execPath, ["tests/unit/test_phase16.mjs"]);
run("Frontend unit: store snapshot stability", npx, ["tsx", "tests/unit/test_store_snapshot_stability.ts"]);
run("Frontend unit: decision engine", npx, ["tsx", "src/lib/offloading/__tests__/testDecisionEngine.ts"]);
run("Frontend unit: simulation presets", npx, ["tsx", "src/lib/simulation/__tests__/testSimulationPresets.ts"]);
if (!quick) run("Next.js production build", npx, ["next", "build"]);

// ---------- Backend ----------
for (const suite of ["test_dqn", "test_benchmark", "test_phase17", "test_phase18", "test_nodes", "test_workload_limits", "test_hardening", "test_offloading", "test_calibrated_model"]) {
  run(`Backend: ${suite}`, python, ["-m", `tests.${suite}`], backend);
}

// ---------- Live API + end-to-end (needs the backend on port 8000) ----------
if (!quick) {
  let server = null;
  if (!(await backendUp())) {
    process.stdout.write("\n=== Starting backend on port 8000 for the live tests\n");
    server = spawn(python, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"], {
      cwd: backend,
      stdio: "ignore",
    });
    for (let i = 0; i < 60 && !(await backendUp()); i++) await new Promise((r) => setTimeout(r, 1000));
  }
  if (await backendUp()) {
    run("Backend live API regression", python, ["-m", "tests.test_api"], backend);
    run("End-to-end: integration (phase 13)", process.execPath, ["tests/e2e/test_integration.mjs"]);
    run("End-to-end: workloads (phase 13B)", process.execPath, ["tests/e2e/test_phase13b.mjs"]);
  } else {
    results.push({ name: "Live API + end-to-end tests (backend did not start)", ok: false, seconds: "-" });
  }
  if (server) server.kill();
}

// ---------- Summary ----------
console.log("\n================ SUMMARY ================");
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  (${r.seconds}s)`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : `\nAll ${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
