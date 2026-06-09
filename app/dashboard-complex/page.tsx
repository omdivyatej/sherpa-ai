"use client";

import { useState } from "react";
import { toast } from "@/components/Toast";

const KPIS = [
  {
    label: "ARR Closed (QTD)",
    value: "$4.82M",
    delta: "+18.4%",
    deltaTone: "up",
    sub: "vs prior QTD",
  },
  {
    label: "Weighted Pipeline",
    value: "$18.6M",
    delta: "+4.2%",
    deltaTone: "up",
    sub: "Best Case forecast",
  },
  {
    label: "Win Rate (TTM)",
    value: "32.1%",
    delta: "-1.8 pp",
    deltaTone: "down",
    sub: "trailing 12 mo",
  },
  {
    label: "Avg Sales Cycle",
    value: "84 d",
    delta: "+6 d",
    deltaTone: "down",
    sub: "Enterprise segment",
  },
] as const;

// Mock weekly bookings for the bar chart
const WEEKS = [
  { w: "W36", v: 312 },
  { w: "W37", v: 410 },
  { w: "W38", v: 286 },
  { w: "W39", v: 519 },
  { w: "W40", v: 612 },
  { w: "W41", v: 488 },
  { w: "W42", v: 702 },
  { w: "W43", v: 645 },
];

const FUNNEL = [
  { stage: "Lead", count: 1240, tone: "bg-slate-400" },
  { stage: "MQL", count: 612, tone: "bg-sky-400" },
  { stage: "SQL", count: 281, tone: "bg-violet-500" },
  { stage: "Opportunity", count: 142, tone: "bg-amber-500" },
  { stage: "Closed Won", count: 38, tone: "bg-emerald-500" },
];

const ACTIVITY = [
  {
    who: "Priya Rao",
    what: "advanced ",
    obj: "Acme Aerospace · Renewal '26",
    extra: " to Negotiation",
    time: "12 min",
    tone: "amber",
  },
  {
    who: "System",
    what: "auto-disqualified ",
    obj: "12 stale MQLs",
    extra: " (no engagement 30d+)",
    time: "1 h",
    tone: "slate",
  },
  {
    who: "Jonas Weber",
    what: "logged a call with ",
    obj: "Helix Bio",
    extra: " (15 min)",
    time: "2 h",
    tone: "sky",
  },
  {
    who: "Sarah Chen",
    what: "closed ",
    obj: "Northwind Logistics",
    extra: " — $312K",
    time: "Yesterday",
    tone: "emerald",
  },
  {
    who: "Alex Kim",
    what: "lost ",
    obj: "Beacon Industries",
    extra: " — competitor: Vortex",
    time: "Yesterday",
    tone: "rose",
  },
] as const;

export default function Overview() {
  const [range, setRange] = useState("qtd");
  const [segment, setSegment] = useState("all");
  const [chartPeriod, setChartPeriod] = useState<"1W" | "1M" | "QTD" | "YTD">(
    "QTD"
  );
  const max = Math.max(...WEEKS.map((w) => w.v));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sales Overview</h1>
          <p className="text-xs text-slate-500">
            North America · Enterprise & Mid-Market · Fiscal Year 2026
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Date range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
          >
            <option value="today">Today</option>
            <option value="wtd">Week-to-date</option>
            <option value="mtd">Month-to-date</option>
            <option value="qtd">Quarter-to-date</option>
            <option value="ytd">Year-to-date</option>
            <option value="custom">Custom…</option>
          </select>
          <select
            aria-label="Segment filter"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
          >
            <option value="all">All segments</option>
            <option value="ent">Enterprise (&gt;$100K ACV)</option>
            <option value="mm">Mid-Market</option>
            <option value="smb">SMB</option>
          </select>
          <button
            aria-label="Export overview to CSV"
            onClick={() =>
              toast("Export queued · CSV will be emailed to you", "success")
            }
            className="text-xs border border-slate-200 rounded-md px-3 py-1.5 hover:bg-slate-50"
          >
            Export
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        {KPIS.map((k) => {
          const up = k.deltaTone === "up";
          return (
            <div
              key={k.label}
              className="bg-white border border-slate-200 rounded-lg p-4"
            >
              <div className="text-[11px] text-slate-500 uppercase tracking-wide">
                {k.label}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <div className="text-2xl font-semibold">{k.value}</div>
                <div
                  className={`text-[11px] px-1.5 py-0.5 rounded ${
                    up
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {k.delta}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">{k.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Bookings chart */}
        <div className="col-span-2 bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold">Bookings — last 8 weeks</div>
              <div className="text-[10px] text-slate-500">
                In thousands USD · all segments
              </div>
            </div>
            <div className="flex gap-1">
              {(["1W", "1M", "QTD", "YTD"] as const).map((p) => (
                <button
                  key={p}
                  aria-label={`Bookings period ${p}`}
                  aria-pressed={chartPeriod === p}
                  onClick={() => setChartPeriod(p)}
                  className={`text-[10px] px-2 py-1 rounded border ${
                    chartPeriod === p
                      ? "bg-slate-900 text-white border-slate-900"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <svg viewBox="0 0 480 160" className="w-full h-40">
            {WEEKS.map((w, i) => {
              const x = 10 + i * 58;
              const h = (w.v / max) * 130;
              const y = 150 - h;
              return (
                <g key={w.w}>
                  <rect
                    x={x}
                    y={y}
                    width={36}
                    height={h}
                    rx={3}
                    fill="url(#barGrad)"
                  />
                  <text
                    x={x + 18}
                    y={y - 4}
                    textAnchor="middle"
                    className="text-[9px] fill-slate-500"
                  >
                    {w.v}
                  </text>
                  <text
                    x={x + 18}
                    y={158}
                    textAnchor="middle"
                    className="text-[9px] fill-slate-400"
                  >
                    {w.w}
                  </text>
                </g>
              );
            })}
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Funnel */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-semibold mb-3">Lead → Close Funnel</div>
          <div className="space-y-2">
            {FUNNEL.map((f) => {
              const pct = (f.count / FUNNEL[0].count) * 100;
              return (
                <div key={f.stage}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span>{f.stage}</span>
                    <span className="text-slate-500">{f.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded">
                    <div
                      className={`h-2 rounded ${f.tone}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Activity feed */}
        <div className="col-span-2 bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Activity feed</div>
            <button
              aria-label="View all activity"
              onClick={() => toast("Full activity log · 247 events this week")}
              className="text-[11px] text-sky-600 hover:underline"
            >
              View all
            </button>
          </div>
          <ul className="space-y-2 text-xs">
            {ACTIVITY.map((a, i) => (
              <li
                key={i}
                className="flex items-start gap-3 py-1.5 border-b border-slate-100 last:border-b-0"
              >
                <span
                  className={`mt-1 w-2 h-2 rounded-full bg-${a.tone}-500`}
                  aria-hidden
                  style={
                    a.tone === "emerald"
                      ? { background: "#10b981" }
                      : a.tone === "rose"
                      ? { background: "#f43f5e" }
                      : a.tone === "amber"
                      ? { background: "#f59e0b" }
                      : a.tone === "sky"
                      ? { background: "#0ea5e9" }
                      : { background: "#94a3b8" }
                  }
                />
                <div className="flex-1">
                  <div>
                    <span className="font-medium">{a.who}</span>
                    <span className="text-slate-500"> {a.what}</span>
                    <span className="font-medium">{a.obj}</span>
                    <span className="text-slate-500">{a.extra}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{a.time} ago</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Quotas */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-semibold mb-3">Team quota attainment</div>
          <ul className="space-y-3 text-xs">
            {[
              { name: "Sarah Chen", pct: 112, tone: "emerald" },
              { name: "Jonas Weber", pct: 87, tone: "amber" },
              { name: "Priya Rao", pct: 64, tone: "amber" },
              { name: "Alex Kim", pct: 38, tone: "rose" },
              { name: "Diego Reyes", pct: 122, tone: "emerald" },
            ].map((r) => (
              <li key={r.name}>
                <div className="flex justify-between mb-0.5">
                  <span>{r.name}</span>
                  <span className="text-slate-500">{r.pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded">
                  <div
                    className={`h-1.5 rounded ${
                      r.tone === "emerald"
                        ? "bg-emerald-500"
                        : r.tone === "amber"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.min(r.pct, 130)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
