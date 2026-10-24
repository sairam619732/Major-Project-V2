"use client";

import { useEffect, useState } from "react";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { getBackendBaseUrl } from "@/services/apiClient";

type PermissionState = "granted" | "prompt" | "denied" | "unsupported";

/**
 * On the hosted site (e.g. Vercel), the pages call the backend on this computer (localhost:8000).
 * Chrome holds those requests until the user allows "local network access" for the site, and the
 * prompt is easy to miss, so the app looks offline. This notice explains what to do.
 * It never shows when the site itself runs on this computer (localhost).
 */
export function LocalNetworkNotice() {
  const backend = useBackendStatus();
  const [permission, setPermission] = useState<PermissionState>("unsupported");
  const [hosted, setHosted] = useState(false);

  useEffect(() => {
    let status: PermissionStatus | null = null;
    const isLocalPage = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
    const backendIsLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(getBackendBaseUrl());
    // Only relevant when a public site calls a backend on this computer.
    Promise.resolve(!isLocalPage && backendIsLocal).then((relevant) => {
      setHosted(relevant);
      if (!relevant || !navigator.permissions) return;
      navigator.permissions
        // Chrome's name for the permission; other browsers reject it (then nothing is shown).
        .query({ name: "local-network-access" as PermissionName })
        .then((s) => {
          status = s;
          setPermission(s.state as PermissionState);
          s.onchange = () => setPermission(s.state as PermissionState);
        })
        .catch(() => setPermission("unsupported"));
    });
    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  if (!hosted || backend.kind === "online" || (permission !== "prompt" && permission !== "denied")) return null;

  const askAgain = () => {
    // A request to the backend makes Chrome show its permission prompt again.
    fetch(`${getBackendBaseUrl()}/health`).catch(() => {});
  };

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-[100] w-[min(640px,calc(100%-32px))] -translate-x-1/2 rounded-lg border border-amber-500/40 bg-[#1a1306]/95 p-4 font-mono text-[12px] leading-relaxed text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.15)] backdrop-blur"
    >
      <p className="mb-1 font-bold uppercase tracking-wider text-amber-300">
        {permission === "denied" ? "Chrome is blocking the backend" : "Chrome needs your permission"}
      </p>
      <p>
        This site talks to the backend running on this computer ({getBackendBaseUrl()}).{" "}
        {permission === "denied"
          ? "Local network access is blocked for this site."
          : "Chrome is waiting for you to allow local network access."}
      </p>
      <p className="mt-1 text-amber-200/80">
        Click the icon left of the address bar → <b>Site settings</b> → <b>Local network access</b> → <b>Allow</b>, then
        reload. Also check that the backend is running (<code>npm run present:backend</code>).
      </p>
      {permission === "prompt" && (
        <button
          type="button"
          onClick={askAgain}
          className="mt-3 rounded border border-amber-400/60 px-3 py-1.5 text-amber-200 hover:bg-amber-500/10"
        >
          Show Chrome&apos;s prompt again
        </button>
      )}
    </div>
  );
}
