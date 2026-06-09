"use client";

import { useState } from "react";

type Row = {
  owner: string;
  quota: number;
  closed: number;
  commit: number;
  bestCase: number;
  pipeline: number;
};

const SEED: Row[] = [
  { owner: "Sarah Chen", quota: 1_200_000, closed: 1_010_000, commit: 220_000, bestCase: 480_000, pipeline: 720_000 },
  { owner: "Jonas Weber", quota: 900_000, closed: 540_000, commit: 180_000, bestCase: 260_000, pipeline: 410_000 },
  { owner: "Priya Rao", quota: 1_000_000, closed: 620_000, commit: 95_000, bestCase: 410_000, pipeline: 880_000 },
  { owner: "Alex Kim", quota: 800_000, closed: 290_000, commit: 80_000, bestCase: 175_000, pipeline: 540_000 },
  { owner: "Diego Reyes", quota: 950_000, closed: 1_150_000, commit: 60_000, bestCase: 240_000, pipeline: 380_000 },
];

const QUARTERS = ["Q2 FY26", "Q3 FY26", "Q4 FY26", "Q1 FY27"] as const;

function fmt(n: number) {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : `$${(n / 1000).toFixed(0)}K`;
}

export default function Forecasts() {
  const [rows, setRows] = useState<Row[]>(SEED);
  const [quarter, setQuarter] = useState<(typeof QUARTERS)[number]>("Q4 FY26");
  const [view, setView] = useState<"team" | "rollup">("team");

  function adjust(idx: number, field: keyof Omit<Row, "owner">, val: number) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  }

  const totals = rows.reduce(
    (a, r) => ({
      quota: a.quota + r.quota,
      closed: a.closed + r.closed,
      commit: a.commit + r.commit,
      bestCase: a.bestCase + r.bestCase,
      pipeline: a.pipeline + r.pipeline,
    }),
    { quota: 0, closed: 0, commit: 0, bestCase: 0, pipeline: 0 }
  );

  const attainment = (closed: number, quota: number) =>
    Math.round((closed / quota) * 100);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Forecasts</h1>
          <p className="text-xs text-slate-500">
            {quarter} · attainment {attainment(totals.closed, totals.quota)}%
            · best case {fmt(totals.closed + totals.commit + totals.bestCase)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Forecast quarter"
            value={quarter}
            onChange={(e) => setQuarter(e.target.value as typeof quarter)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
          >
            {QUARTERS.map((q) => (
              <option key={q}>{q}</option>
            ))}
          </select>
          <div role="tablist" className="flex border border-slate-200 rounded-md overflow-hidden">
            {(["team", "rollup"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                aria-label={`${v} forecast view`}
                onClick={() => setView(v)}
                className={`text-xs px-3 py-1.5 ${
                  view === v ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-50"
                }`}
              >
                {v === "team" ? "By rep" : "Roll-up"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-5 gap-2">
        <SummaryCell label="Quota" value={fmt(totals.quota)} tone="text-slate-700" />
        <SummaryCell label="Closed" value={fmt(totals.closed)} tone="text-emerald-700" />
        <SummaryCell label="Commit" value={fmt(totals.commit)} tone="text-sky-700" />
        <SummaryCell label="Best Case" value={fmt(totals.bestCase)} tone="text-violet-700" />
        <SummaryCell label="Pipeline" value={fmt(totals.pipeline)} tone="text-amber-700" />
      </div>

      {view === "team" && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left">Owner</th>
                <th className="px-3 py-2 text-right">Quota</th>
                <th className="px-3 py-2 text-right">Closed</th>
                <th className="px-3 py-2 text-left">Attainment</th>
                <th className="px-3 py-2 text-right">Commit (adj)</th>
                <th className="px-3 py-2 text-right">Best Case (adj)</th>
                <th className="px-3 py-2 text-right">Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const att = attainment(r.closed, r.quota);
                return (
                  <tr key={r.owner} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{r.owner}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(r.quota)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(r.closed)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded">
                          <div
                            className={`h-1.5 rounded ${
                              att >= 100
                                ? "bg-emerald-500"
                                : att >= 70
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(att, 130)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] w-10 text-right">{att}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        aria-label={`Commit forecast for ${r.owner}`}
                        value={r.commit}
                        step={5000}
                        onChange={(e) => adjust(i, "commit", Number(e.target.value))}
                        className="w-28 text-xs border border-slate-200 rounded px-1.5 py-0.5 text-right font-mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        aria-label={`Best case forecast for ${r.owner}`}
                        value={r.bestCase}
                        step={5000}
                        onChange={(e) => adjust(i, "bestCase", Number(e.target.value))}
                        className="w-28 text-xs border border-slate-200 rounded px-1.5 py-0.5 text-right font-mono"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-500">
                      {fmt(r.pipeline)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {view === "rollup" && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-semibold mb-4">
            Quarter roll-up · {quarter}
          </div>
          <div className="relative h-8 bg-slate-100 rounded-full overflow-hidden">
            {(() => {
              const total =
                totals.closed + totals.commit + totals.bestCase + totals.pipeline;
              const seg = (n: number) => `${(n / total) * 100}%`;
              return (
                <div className="flex h-full">
                  <div className="bg-emerald-500" style={{ width: seg(totals.closed) }} title={`Closed ${fmt(totals.closed)}`} />
                  <div className="bg-sky-500" style={{ width: seg(totals.commit) }} title={`Commit ${fmt(totals.commit)}`} />
                  <div className="bg-violet-500" style={{ width: seg(totals.bestCase) }} title={`Best Case ${fmt(totals.bestCase)}`} />
                  <div className="bg-amber-400" style={{ width: seg(totals.pipeline) }} title={`Pipeline ${fmt(totals.pipeline)}`} />
                </div>
              );
            })()}
          </div>
          <div className="flex gap-4 text-[11px] mt-3 text-slate-600">
            <Legend tone="bg-emerald-500" label={`Closed ${fmt(totals.closed)}`} />
            <Legend tone="bg-sky-500" label={`Commit ${fmt(totals.commit)}`} />
            <Legend tone="bg-violet-500" label={`Best Case ${fmt(totals.bestCase)}`} />
            <Legend tone="bg-amber-400" label={`Pipeline ${fmt(totals.pipeline)}`} />
          </div>
          <div className="mt-6 text-xs text-slate-500">
            Plan vs. Forecast gap to quota:{" "}
            <span
              className={`font-mono ${
                totals.closed + totals.commit >= totals.quota
                  ? "text-emerald-700"
                  : "text-rose-700"
              }`}
            >
              {fmt(totals.closed + totals.commit - totals.quota)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-3">
      <div className="text-[10px] text-slate-500 uppercase tracking-wide">
        {label}
      </div>
      <div className={`text-lg font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`w-2 h-2 rounded ${tone}`} />
      <span>{label}</span>
    </div>
  );
}
