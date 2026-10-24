#!/usr/bin/env node
/**
 * Starts the project for a presentation.
 *
 *   npm run present         three machines: this laptop (local) runs the backend and web app; the
 *                           edge and cloud nodes are the ones set in backend/.env (EDGE_NODE_URL,
 *                           CLOUD_NODE_URL); see docs/DEPLOYMENT.md
 *   npm run present -- --port=3001   web app on another port
 *
 * Single-laptop demo: runs every tier on this machine.
 *
 *   npm run demo            production build + start (smoothest for presenting)
 *   npm run demo -- --dev   development server instead (no build step)
 *   npm run demo -- --port=3001   web app on another port (if 3000 is taken)
 *   npm run demo:stop       stop a demo left running (e.g. its window was closed abruptly)
 *
 * Starts four programs and stops them all on Ctrl+C:
 *   edge node   http://127.0.0.1:8100  real detector, real CPU load and queue; emulated Wi-Fi link
 *   cloud node  http://127.0.0.1:8200  real detector, real CPU load and queue; emulated internet link
 *   backend     http://127.0.0.1:8000  DQN + real local telemetry; measures both nodes every 3 s
 *   web app     http://localhost:3000 (or --port)
 *
 * The nodes really delay their traffic by the emulated latency/bandwidth below, so the backend's
 * normal measurements see those links. The app labels them "EMULATED NETWORK", never as real.
 * Your backend/.env is not changed: these settings apply only while the demo runs.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Emulated links. Edge: a nearby server over Wi-Fi. Cloud: a datacenter over home broadband.
const LINKS = {
  edge: { rttMs: 20, jitterMs: 4, bandwidthMbps: 300 },
  cloud: { rttMs: 90, jitterMs: 15, bandwidthMbps: 50 },
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.join(root, "backend");
const isWin = process.platform === "win32";
const dev = process.argv.includes("--dev");
// --real: use the edge/cloud nodes from backend/.env instead of starting emulated ones here.
const real = process.argv.includes("--real");
const webPort = Number((process.argv.find((a) => a.startsWith("--port=")) ?? "--port=3000").split("=")[1]) || 3000;
const venvPython = path.join(backend, ".venv", isWin ? "Scripts/python.exe" : "bin/python");
const python = existsSync(venvPython) ? venvPython : isWin ? "python" : "python3";
const npx = isWin ? "npx.cmd" : "npx";

const children = [];
// PIDs of the programs this demo started, so `npm run demo:stop` can stop exactly those.
const pidFile = path.join(root, ".demo-pids.json");

function killTree(pid) {
  if (isWin) spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
  else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      /* already gone */
    }
  }
}

if (process.argv.includes("--stop")) {
  if (!existsSync(pidFile)) {
    console.log("No demo is recorded as running.");
  } else {
    for (const pid of JSON.parse(readFileSync(pidFile, "utf8"))) killTree(pid);
    unlinkSync(pidFile);
    console.log("Stopped the demo's programs.");
  }
  process.exit(0);
}

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => (socket.destroy(), resolve(true)));
    socket.once("error", () => resolve(false));
  });
}

function start(name, cmd, args, { cwd = root, env = {} } = {}) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    shell: isWin && cmd.endsWith(".cmd"),
  });
  const prefix = `[${name}] `;
  const relay = (stream, out) =>
    stream.on("data", (chunk) =>
      chunk
        .toString()
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => out.write(prefix + line + "\n"))
    );
  relay(child.stdout, process.stdout);
  relay(child.stderr, process.stderr);
  child.on("exit", (code) => {
    if (!stopping) console.log(`${prefix}stopped (exit code ${code}).`);
  });
  children.push(child);
  writeFileSync(pidFile, JSON.stringify(children.map((c) => c.pid)));
  return child;
}

let stopping = false;
function stopAll() {
  if (stopping) return;
  stopping = true;
  console.log("\nStopping the demo...");
  // Kill each whole process tree (npx and uvicorn start their own children).
  for (const child of children) if (child.exitCode === null) killTree(child.pid);
  try {
    unlinkSync(pidFile);
  } catch {
    /* already removed */
  }
  process.exit(0);
}
process.on("SIGINT", stopAll); // Ctrl+C
process.on("SIGTERM", stopAll);
process.on("SIGHUP", stopAll); // terminal window closed (also on Windows)

async function waitFor(url, label, seconds = 120) {
  for (let i = 0; i < seconds; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.error(`${label} did not start within ${seconds} s.`);
  return false;
}

// ---------- Preflight ----------
const busy = [];
const ports = real
  ? [[8000, "backend"], [webPort, "web app"]]
  : [[8000, "backend"], [8100, "edge node"], [8200, "cloud node"], [webPort, "web app"]];
for (const [port, what] of ports) {
  if (await portInUse(port)) busy.push(`${port} (${what})`);
}
if (busy.length) {
  console.error(`These ports are already in use: ${busy.join(", ")}.\nClose whatever is using them (for a previous demo: npm run demo:stop) and try again.${
    busy.some((b) => b.includes("web app")) ? "\nOr start the web app on another port: npm run demo -- --port=3001" : ""
  }`);
  process.exit(1);
}

if (!dev) {
  console.log("Building the web app for production (about 30 s)...");
  const build = spawnSync(npx, ["next", "build"], { cwd: root, stdio: "inherit", shell: isWin });
  if (build.status !== 0) {
    console.error("The production build failed; try `npm run demo -- --dev`.");
    process.exit(1);
  }
}

// ---------- Start ----------
for (const [tier, port] of real ? [] : [["edge", 8100], ["cloud", 8200]]) {
  const link = LINKS[tier];
  start(`${tier}-node`, python, ["-m", "node.run"], {
    cwd: backend,
    env: {
      NODE_TIER: tier.toUpperCase(),
      NODE_HOST: "127.0.0.1",
      NODE_PORT: String(port),
      NODE_ID: `${tier}-node (this laptop)`,
      NODE_TOKEN: "",
      NODE_EMULATED_RTT_MS: String(link.rttMs),
      NODE_EMULATED_JITTER_MS: String(link.jitterMs),
      NODE_EMULATED_BANDWIDTH_MBPS: String(link.bandwidthMbps),
    },
  });
}

start("backend", python, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"], {
  cwd: backend,
  // Demo: point at the local emulated nodes (set here, so they win over backend/.env for this run only).
  // --real: no overrides, so backend/.env decides.
  env: real
    ? {}
    : {
        EDGE_NODE_URL: "http://127.0.0.1:8100",
        CLOUD_NODE_URL: "http://127.0.0.1:8200",
        EDGE_NODE_TOKEN: "",
        CLOUD_NODE_TOKEN: "",
      },
});

start("web", npx, ["next", dev ? "dev" : "start", "--port", String(webPort)]);

const ready = (
  await Promise.all([
    ...(real ? [] : [waitFor("http://127.0.0.1:8100/health", "Edge node"), waitFor("http://127.0.0.1:8200/health", "Cloud node")]),
    waitFor("http://127.0.0.1:8000/health", "Backend"),
    waitFor(`http://127.0.0.1:${webPort}`, "Web app", 180),
  ])
).every(Boolean);

if (!ready) {
  stopAll();
} else if (real) {
  // Give the backend a few probes, then report each node as the app will show it.
  await new Promise((r) => setTimeout(r, 12000));
  let lines = ["   (could not read node status)"];
  try {
    const nodes = await (await fetch("http://127.0.0.1:8000/api/simulation/telemetry/nodes")).json();
    lines = ["edge", "cloud"].map((tier) => {
      const n = nodes[tier];
      const name = tier.toUpperCase().padEnd(5);
      if (!n.configured) return `   ${name} not set in backend/.env: simulated by the cost model`;
      if (!n.online) return `   ${name} OFFLINE  ${n.url}  (${n.error ?? "not answering"})`;
      return `   ${name} online   ${n.url}  ${n.network_latency_ms ?? "?"} ms, ${n.bandwidth_gbps ?? "?"} Gbps`;
    });
  } catch {
    /* backend not answering yet */
  }
  console.log(`
==========================================================
 Presentation running
   App        http://localhost:${webPort}   (open /simulation)
   Backend    http://127.0.0.1:8000/docs
 Nodes (from backend/.env):
${lines.join("\n")}
 An offline node gets no tasks; it comes back on its own once it answers.
 Press Ctrl+C to stop.
==========================================================
`);
} else {
  console.log(`
==========================================================
 Demo running on this laptop
   App        http://localhost:${webPort}   (open /simulation)
   Backend    http://127.0.0.1:8000/docs
   Edge node  http://127.0.0.1:8100   emulated link: ${LINKS.edge.rttMs} ms, ${LINKS.edge.bandwidthMbps} Mbps
   Cloud node http://127.0.0.1:8200   emulated link: ${LINKS.cloud.rttMs} ms, ${LINKS.cloud.bandwidthMbps} Mbps
 Detection, CPU load and queues are real; the network delays are emulated
 (labelled in the app). Edge/cloud show as LIVE within ~5 s.
 Press Ctrl+C to stop everything.
==========================================================
`);
}
