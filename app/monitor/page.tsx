"use client";

import Link from "next/link";
import { useState } from "react";

type Status = "ok" | "warning" | "fail";
type Server = { name: string; status: Status; cpu: number };

const SEED: Server[] = [
  { name: "node-1", status: "ok", cpu: 32 },
  { name: "node-2", status: "ok", cpu: 41 },
  { name: "node-3", status: "warning", cpu: 78 },
  { name: "node-4", status: "ok", cpu: 28 },
  { name: "node-5", status: "fail", cpu: 99 },
  { name: "node-6", status: "ok", cpu: 22 },
  { name: "node-7", status: "ok", cpu: 51 },
  { name: "node-8", status: "ok", cpu: 38 },
];

const DOT: Record<Status, string> = {
  ok: "bg-emerald-500",
  warning: "bg-amber-400",
  fail: "bg-red-500",
};

export default function MonitorPage() {
  const [servers, setServers] = useState(SEED);
  const [log, setLog] = useState<string[]>([]);

  function restart(name: string) {
    setServers((s) =>
      s.map((x) =>
        x.name === name ? { ...x, status: "ok" as const, cpu: 18 } : x
      )
    );
    setLog((l) => [`${new Date().toLocaleTimeString()}  Restarted ${name}`, ...l]);
  }

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to Shiplane
        </Link>
        <div className="text-xs text-gray-400">
          /monitor · vision-tool demo
        </div>
      </div>

      <h1 className="text-2xl font-semibold">Server monitor</h1>
      <p className="text-sm text-gray-500 mb-1">
        Status is visual only — the status dot is the only signal of which
        server is failing. The element list contains <em>no</em> text saying
        which servers are healthy or broken.
      </p>
      <p className="text-xs text-gray-400 mb-6">
        Try: <code>restart the failing server</code>. The model should call{" "}
        <code>request_screenshot</code>, see the red dot, and target the right
        row.
      </p>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {servers.map((s) => (
          <div
            key={s.name}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{s.name}</span>
              {/* color-only status — no text, no aria-label */}
              <span className={`w-3 h-3 rounded-full ${DOT[s.status]}`} />
            </div>
            <div className="text-xs text-gray-500 mb-3">CPU {s.cpu}%</div>
            <button
              aria-label={`Restart ${s.name}`}
              onClick={() => restart(s.name)}
              className="w-full text-xs bg-gray-100 hover:bg-gray-200 rounded py-1.5 flex items-center justify-center gap-1"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M4 4v6h6M20 20v-6h-6M5 9a8 8 0 0114-3M19 15a8 8 0 01-14 3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Restart
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-sm font-semibold mb-2">Activity log</div>
        <ul className="text-xs text-gray-500 space-y-1 font-mono">
          {log.length === 0 && <li>No activity yet.</li>}
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
