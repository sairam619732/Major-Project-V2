"use client";

import { useEffect, useState } from "react";
import { simulationStore, useSimulationState } from "@/lib/simulation/simulationState";
import {
  BackendApiError,
  isNodeLive,
  saveNodeSettings,
  testNodeConnection,
  type NodeConnectionTest,
  type NodeTelemetry,
  type NodeTier,
} from "@/services/apiClient";

const TIERS: Record<NodeTier, { title: string; subtitle: string; color: string }> = {
  edge: {
    title: "Edge-like node",
    subtitle: "A remote node configured to behave like a constrained edge server (e.g. a teammate's laptop).",
    color: "#34d399",
  },
  cloud: {
    title: "Cloud node",
    subtitle: "A remote compute node with more resources, using a GPU when it has one (e.g. a desktop or Vercel).",
    color: "#a78bfa",
  },
};

function fmt(value: number | null | undefined, unit: string, digits = 1) {
  return value === null || value === undefined ? "—" : `${value.toFixed(digits)}${unit}`;
}

function statusOf(node: NodeTelemetry | undefined): { text: string; cls: string } {
  if (!node || node.source === "none" || !node.url) return { text: "NOT SET UP", cls: "text-slate-400 border-white/[0.12]" };
  if (!node.enabled) return { text: "DISABLED", cls: "text-slate-400 border-white/[0.12]" };
  if (isNodeLive(node)) return { text: "ONLINE", cls: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" };
  if (node.online) return { text: "MEASURING…", cls: "text-amber-300 border-amber-500/40" };
  return { text: "OFFLINE", cls: "text-rose-300 border-rose-500/40 bg-rose-500/10" };
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex justify-between gap-3 font-mono text-[11.5px]">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-200">
        {value}
        {note && <span className="ml-1 text-[10px] text-slate-500">{note}</span>}
      </span>
    </div>
  );
}

function NodeCard({ tier, node }: { tier: NodeTier; node: NodeTelemetry | undefined }) {
  const meta = TIERS[tier];
  // On only when the node has an address and is switched on.
  const [enabled, setEnabled] = useState(Boolean(node?.enabled && node?.url));
  const [url, setUrl] = useState(node?.url ?? "");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [test, setTest] = useState<NodeConnectionTest | null>(null);
  const status = statusOf(node);
  const live = node && isNodeLive(node);

  const save = async (next: { enabled?: boolean; clearKey?: boolean } = {}) => {
    const wantEnabled = next.enabled ?? enabled;
    setBusy("save");
    setMessage(null);
    try {
      await saveNodeSettings(tier, { enabled: wantEnabled, url: url.trim() || null, apiKey, clearApiKey: next.clearKey });
      setEnabled(wantEnabled);
      setApiKey("");
      setMessage({ ok: true, text: wantEnabled ? "Saved. The backend is checking the node now." : "Saved. This node is off; tasks won't be sent to it." });
      simulationStore.fetchRealTelemetry();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof BackendApiError ? err.message : "Could not save." });
    } finally {
      setBusy(null);
    }
  };

  const runTest = async () => {
    setBusy("test");
    setTest(null);
    setMessage(null);
    try {
      setTest(await testNodeConnection(tier, { url: url.trim(), apiKey }));
    } catch (err) {
      setMessage({ ok: false, text: err instanceof BackendApiError ? err.message : "The test could not run." });
    } finally {
      setBusy(null);
    }
  };

  const constraints = node?.constraints;
  const gpu = node?.gpu;

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-6 holo-panel" style={{ borderColor: `${meta.color}33` }}>
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.05] pb-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-sans text-[14px] font-bold uppercase" style={{ color: meta.color }}>
            {meta.title}
          </h2>
          <p className="text-[11.5px] leading-snug text-slate-400">{meta.subtitle}</p>
        </div>
        <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider ${status.cls}`}>{status.text}</span>
      </div>

      <label className="flex items-center justify-between font-mono text-[12px] text-slate-300">
        <span>Use this node for tasks</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => save({ enabled: e.target.checked })}
          disabled={busy !== null || (!url.trim() && !enabled)}
          className="h-4 w-4 accent-cyan-400"
          aria-label={`Enable the ${tier} node`}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">API endpoint URL</span>
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-node.example.com"
          autoComplete="off"
          spellCheck={false}
          className="rounded-md border border-white/[0.1] bg-black/30 px-3 py-2 font-mono text-[12.5px] text-slate-100 outline-none focus:border-cyan-400/60"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
          API key {node?.has_api_key && <span className="normal-case text-emerald-400">· saved</span>}
        </span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={node?.has_api_key ? "Saved — type a new key to replace it" : "The node's API key"}
          autoComplete="new-password"
          spellCheck={false}
          className="rounded-md border border-white/[0.1] bg-black/30 px-3 py-2 font-mono text-[12.5px] text-slate-100 outline-none focus:border-cyan-400/60"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => save()}
          disabled={busy !== null}
          className="rounded-md border border-cyan-400/60 bg-cyan-950/40 px-4 py-2 font-mono text-[12px] uppercase tracking-wider text-cyan-100 hover:bg-cyan-950/70 disabled:opacity-50"
        >
          {busy === "save" ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={runTest}
          disabled={busy !== null || (!url.trim() && !node?.url)}
          className="rounded-md border border-white/[0.15] px-4 py-2 font-mono text-[12px] uppercase tracking-wider text-slate-200 hover:bg-white/[0.05] disabled:opacity-50"
        >
          {busy === "test" ? "Testing…" : "Test connection"}
        </button>
        {node?.has_api_key && (
          <button
            type="button"
            onClick={() => save({ clearKey: true })}
            disabled={busy !== null}
            className="rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-slate-500 hover:text-rose-300 disabled:opacity-50"
          >
            Remove key
          </button>
        )}
      </div>

      {message && (
        <p role="status" className={`font-mono text-[11.5px] ${message.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {message.text}
        </p>
      )}

      {test && (
        <div className={`flex flex-col gap-1.5 rounded-md border p-3 ${test.online ? "border-emerald-500/30 bg-emerald-950/20" : "border-rose-500/30 bg-rose-950/20"}`}>
          <p className={`font-mono text-[11.5px] font-bold ${test.online ? "text-emerald-300" : "text-rose-300"}`}>
            {test.online ? `Connected · ${test.tier} node "${test.node_id ?? "?"}"` : test.error ?? "Not reachable."}
          </p>
          {test.latency_ms !== undefined && <Row label="Round trip (this test)" value={fmt(test.latency_ms, " ms")} />}
          {test.online && test.tier && test.tier !== tier.toUpperCase() && (
            <p className="font-mono text-[11px] text-amber-300">Note: this node reports itself as {test.tier}, not {tier.toUpperCase()}.</p>
          )}
        </div>
      )}

      {node?.url && node.enabled && (
        <div className="flex flex-col gap-1.5 border-t border-white/[0.05] pt-3">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">Measured every 3 s</p>
          <Row label="Latency (round trip)" value={fmt(node.network_latency_ms, " ms")} note={node.network_emulation ? "emulated link" : undefined} />
          <Row label="Bandwidth" value={node.bandwidth_gbps == null ? "—" : `${(node.bandwidth_gbps * 1000).toFixed(1)} Mbps`} />
          <Row label="CPU usage" value={fmt(node.cpu_load, "%")} note={node.cpu_count ? `of ${node.cpu_count} threads` : undefined} />
          <Row label="RAM usage" value={fmt(node.memory_used, "%")} note={node.memory_total_gb ? `of ${node.memory_total_gb} GB` : undefined} />
          <Row label="Queue" value={node.task_queue == null ? "—" : `${node.task_queue} task(s)`} note={constraints ? `limit ${constraints.max_queue}` : undefined} />
          <Row
            label="GPU"
            value={!gpu ? "—" : gpu.used_for_detection ? `in use: ${gpu.name}` : gpu.available ? `${gpu.name} (not used)` : gpu.available === false ? "no usable GPU (CPU build)" : "not checked (CPU engine)"}
          />
          {constraints && (
            <Row
              label="Imposed limits"
              value={`${constraints.max_concurrent} at a time${constraints.cpu_threads ? `, ${constraints.cpu_threads} CPU threads` : ""}`}
              note={constraints.profile !== "default" ? `(${constraints.profile})` : undefined}
            />
          )}
          {!live && node.error && <p className="font-mono text-[11px] text-rose-300/80">Last error: {node.error}</p>}
        </div>
      )}
    </div>
  );
}

/** Edge and cloud node settings. Both are optional: with both off, every task runs on this computer. */
export function RemoteNodeSettings() {
  const { nodeTelemetry } = useSimulationState();
  // Keep node telemetry fresh while this section is on screen (shared poller).
  useEffect(() => simulationStore.startTelemetryPolling(), []);

  return (
    <div className="flex flex-col gap-4 lg:col-span-2">
      <div className="flex flex-col gap-1">
        <h2 className="font-sans text-[15px] font-bold text-slate-200">Remote compute nodes (optional)</h2>
        <p className="text-[12px] leading-relaxed text-slate-400">
          Tasks always run on this computer unless a node below is switched on and online. The DQN then chooses between the
          available tiers using their real measurements; if a node fails, the task falls back to the next tier and the result
          says so. API keys go only to the backend running on this computer and are never shown again: they are saved in
          plain text in <code className="text-slate-300">backend/node_settings.json</code> on this computer (not encrypted,
          not in git). Use HTTPS node addresses over the internet.
        </p>
      </div>
      {nodeTelemetry ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {(["edge", "cloud"] as const).map((tier) => (
            // Re-mount when the saved settings change, so the form starts from them.
            <NodeCard key={`${tier}-${nodeTelemetry[tier]?.source}-${nodeTelemetry[tier]?.url}`} tier={tier} node={nodeTelemetry[tier]} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-white/[0.08] p-6 font-mono text-[12px] text-slate-400 holo-panel">
          Backend not reachable: start it on this computer (npm run present:backend) to set up nodes. Local-only use needs no setup.
        </p>
      )}
    </div>
  );
}
