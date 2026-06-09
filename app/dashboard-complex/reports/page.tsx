"use client";

import { useState } from "react";
import { toast } from "@/components/Toast";

const DIMENSIONS = [
  { v: "stage", t: "Stage" },
  { v: "industry", t: "Industry" },
  { v: "tier", t: "Account Tier" },
  { v: "region", t: "Region" },
  { v: "owner", t: "Owner" },
  { v: "source", t: "Source" },
  { v: "forecast", t: "Forecast Category" },
];

const METRICS = [
  { v: "amount", t: "Amount" },
  { v: "count", t: "Record count" },
  { v: "weighted", t: "Weighted ARR" },
  { v: "winrate", t: "Win rate" },
  { v: "cycle", t: "Avg sales cycle (days)" },
];

const AGG = [
  { v: "sum", t: "Sum" },
  { v: "avg", t: "Average" },
  { v: "min", t: "Min" },
  { v: "max", t: "Max" },
  { v: "median", t: "Median" },
];

const FILTER_FIELDS = ["Stage", "Owner", "Region", "Industry", "Amount", "Close Date"];
const OPERATORS = ["equals", "not equals", "contains", "greater than", "less than", "between", "is empty"];

type FilterRow = { field: string; op: string; value: string };

export default function Reports() {
  const [name, setName] = useState("Win rate by industry — Q4");
  const [dim, setDim] = useState("industry");
  const [metric, setMetric] = useState("winrate");
  const [agg, setAgg] = useState("sum");
  const [chartType, setChartType] = useState<"bar" | "table" | "donut">("bar");
  const [from, setFrom] = useState("2026-07-01");
  const [to, setTo] = useState("2026-09-30");
  const [granularity, setGranularity] = useState("week");
  const [includeClosedLost, setIncludeClosedLost] = useState(false);
  const [filters, setFilters] = useState<FilterRow[]>([
    { field: "Region", op: "equals", value: "AMER" },
  ]);

  function addFilter() {
    setFilters((f) => [...f, { field: "Stage", op: "equals", value: "" }]);
  }
  function removeFilter(i: number) {
    setFilters((f) => f.filter((_, idx) => idx !== i));
  }
  function updateFilter(i: number, patch: Partial<FilterRow>) {
    setFilters((f) =>
      f.map((row, idx) => (idx === i ? { ...row, ...patch } : row))
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="text-xs text-slate-500">
            Build ad-hoc analyses on the unified pipeline data warehouse.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Save report"
            onClick={() => toast(`Report "${name}" saved`, "success")}
            className="text-xs border border-slate-200 rounded-md px-3 py-1.5 hover:bg-slate-50"
          >
            Save
          </button>
          <button
            aria-label="Run report"
            onClick={() => toast(`Running "${name}"…`)}
            className="text-xs bg-sky-600 text-white rounded-md px-3 py-1.5 hover:bg-sky-700"
          >
            Run report
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[11px] text-slate-500">Report name</span>
            <input
              type="text"
              aria-label="Report name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full text-xs border border-slate-200 rounded px-2 py-1.5"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Chart type</span>
            <div className="flex gap-1 mt-1">
              {(["bar", "table", "donut"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setChartType(c)}
                  aria-pressed={chartType === c}
                  aria-label={`${c} chart`}
                  className={`flex-1 text-xs py-1.5 rounded border ${
                    chartType === c
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <label className="block">
            <span className="text-[11px] text-slate-500">Group by</span>
            <select
              aria-label="Group by dimension"
              value={dim}
              onChange={(e) => setDim(e.target.value)}
              className="mt-1 w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
            >
              {DIMENSIONS.map((d) => (
                <option key={d.v} value={d.v}>{d.t}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Measure</span>
            <select
              aria-label="Measure"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="mt-1 w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
            >
              {METRICS.map((m) => (
                <option key={m.v} value={m.v}>{m.t}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Aggregation</span>
            <select
              aria-label="Aggregation"
              value={agg}
              onChange={(e) => setAgg(e.target.value)}
              className="mt-1 w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
            >
              {AGG.map((a) => (
                <option key={a.v} value={a.v}>{a.t}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <label className="block">
            <span className="text-[11px] text-slate-500">From</span>
            <input
              type="date"
              aria-label="Date range from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">To</span>
            <input
              type="date"
              aria-label="Date range to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500">Granularity</span>
            <select
              aria-label="Date granularity"
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
              className="mt-1 w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
            >
              {["day", "week", "month", "quarter"].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-2 pb-1">
            <input
              type="checkbox"
              aria-label="Include Closed Lost"
              checked={includeClosedLost}
              onChange={(e) => setIncludeClosedLost(e.target.checked)}
            />
            <span className="text-xs">Include Closed Lost</span>
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">Filters</span>
            <button
              onClick={addFilter}
              aria-label="Add filter row"
              className="text-[11px] text-sky-600 hover:underline"
            >
              + Add filter
            </button>
          </div>
          <div className="space-y-2">
            {filters.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  aria-label={`Filter ${i + 1} field`}
                  value={f.field}
                  onChange={(e) => updateFilter(i, { field: e.target.value })}
                  className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                >
                  {FILTER_FIELDS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <select
                  aria-label={`Filter ${i + 1} operator`}
                  value={f.op}
                  onChange={(e) => updateFilter(i, { op: e.target.value })}
                  className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                >
                  {OPERATORS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <input
                  type="text"
                  aria-label={`Filter ${i + 1} value`}
                  value={f.value}
                  onChange={(e) => updateFilter(i, { value: e.target.value })}
                  placeholder="value"
                  className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                />
                <button
                  onClick={() => removeFilter(i)}
                  aria-label={`Remove filter ${i + 1}`}
                  className="text-rose-500 hover:bg-rose-50 rounded px-2 py-1 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Result preview */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="text-xs font-semibold mb-3">Preview · {name}</div>
        <div className="grid grid-cols-5 gap-2 items-end h-40">
          {["SaaS", "Healthcare", "Logistics", "FinServ", "Manufacturing"].map(
            (l, i) => {
              const h = [62, 38, 48, 22, 71][i];
              return (
                <div key={l} className="flex flex-col items-center justify-end">
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${h * 1.4}px`,
                      background: `linear-gradient(180deg, hsl(${
                        200 + i * 30
                      }, 80%, 55%), hsl(${200 + i * 30}, 80%, 40%))`,
                    }}
                  />
                  <div className="text-[10px] mt-1 text-slate-500">{l}</div>
                  <div className="text-[10px] font-mono">{h}%</div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
