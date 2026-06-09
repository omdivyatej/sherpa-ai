"use client";

import { useState } from "react";

type Stage =
  | "Lead"
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";

type Deal = {
  id: string;
  name: string;
  account: string;
  amount: number;
  closeDate: string;
  owner: string;
  probability: number;
  stage: Stage;
  industry: "SaaS" | "Healthcare" | "Logistics" | "FinServ" | "Manufacturing";
};

const STAGES: { key: Stage; tone: string; bg: string }[] = [
  { key: "Lead", tone: "text-slate-700", bg: "bg-slate-100" },
  { key: "Qualified", tone: "text-sky-700", bg: "bg-sky-100" },
  { key: "Proposal", tone: "text-violet-700", bg: "bg-violet-100" },
  { key: "Negotiation", tone: "text-amber-700", bg: "bg-amber-100" },
  { key: "Closed Won", tone: "text-emerald-700", bg: "bg-emerald-100" },
];

const SEED: Deal[] = [
  { id: "OPP-2401", name: "Acme Aerospace · Renewal '26", account: "Acme", amount: 480000, closeDate: "2026-09-30", owner: "Sarah Chen", probability: 75, stage: "Negotiation", industry: "Manufacturing" },
  { id: "OPP-2402", name: "Helix Bio · Platform Expansion", account: "Helix Bio", amount: 220000, closeDate: "2026-08-15", owner: "Jonas Weber", probability: 50, stage: "Proposal", industry: "Healthcare" },
  { id: "OPP-2403", name: "Northwind Logistics · Net-New", account: "Northwind", amount: 310000, closeDate: "2026-07-22", owner: "Sarah Chen", probability: 90, stage: "Closed Won", industry: "Logistics" },
  { id: "OPP-2404", name: "Beacon Industries · Upsell", account: "Beacon", amount: 95000, closeDate: "2026-10-01", owner: "Alex Kim", probability: 20, stage: "Qualified", industry: "Manufacturing" },
  { id: "OPP-2405", name: "Vortex Capital · Multi-year", account: "Vortex", amount: 720000, closeDate: "2026-12-31", owner: "Priya Rao", probability: 35, stage: "Proposal", industry: "FinServ" },
  { id: "OPP-2406", name: "Pillar Health · POC → Prod", account: "Pillar Health", amount: 180000, closeDate: "2026-08-28", owner: "Diego Reyes", probability: 60, stage: "Negotiation", industry: "Healthcare" },
  { id: "OPP-2407", name: "Cobalt SaaS · Land", account: "Cobalt", amount: 64000, closeDate: "2026-11-12", owner: "Jonas Weber", probability: 15, stage: "Lead", industry: "SaaS" },
  { id: "OPP-2408", name: "Stratus Banking · Trial", account: "Stratus", amount: 145000, closeDate: "2026-09-05", owner: "Alex Kim", probability: 25, stage: "Qualified", industry: "FinServ" },
  { id: "OPP-2409", name: "Atlas Migration · Phase 2", account: "Atlas", amount: 285000, closeDate: "2026-10-18", owner: "Sarah Chen", probability: 55, stage: "Proposal", industry: "SaaS" },
  { id: "OPP-2410", name: "Nimbus IoT · Pilot", account: "Nimbus", amount: 38000, closeDate: "2026-09-20", owner: "Priya Rao", probability: 10, stage: "Lead", industry: "Manufacturing" },
];

const OWNERS = ["All owners", "Sarah Chen", "Jonas Weber", "Priya Rao", "Alex Kim", "Diego Reyes"];
const INDUSTRIES = ["SaaS", "Healthcare", "Logistics", "FinServ", "Manufacturing"];

const NEXT_STAGE: Record<Stage, Stage | null> = {
  Lead: "Qualified",
  Qualified: "Proposal",
  Proposal: "Negotiation",
  Negotiation: "Closed Won",
  "Closed Won": null,
  "Closed Lost": null,
};
const PREV_STAGE: Record<Stage, Stage | null> = {
  Lead: null,
  Qualified: "Lead",
  Proposal: "Qualified",
  Negotiation: "Proposal",
  "Closed Won": "Negotiation",
  "Closed Lost": null,
};

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;
}

export default function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>(SEED);
  const [owner, setOwner] = useState("All owners");
  const [industries, setIndustries] = useState<string[]>([]);
  const [minAmt, setMinAmt] = useState(0);
  const [showLost, setShowLost] = useState(false);

  const filtered = deals.filter(
    (d) =>
      (owner === "All owners" || d.owner === owner) &&
      (industries.length === 0 || industries.includes(d.industry)) &&
      d.amount >= minAmt &&
      (showLost || d.stage !== "Closed Lost")
  );

  function advance(id: string) {
    setDeals((ds) =>
      ds.map((d) =>
        d.id === id && NEXT_STAGE[d.stage]
          ? { ...d, stage: NEXT_STAGE[d.stage]!, probability: Math.min(100, d.probability + 20) }
          : d
      )
    );
  }
  function regress(id: string) {
    setDeals((ds) =>
      ds.map((d) =>
        d.id === id && PREV_STAGE[d.stage]
          ? { ...d, stage: PREV_STAGE[d.stage]!, probability: Math.max(0, d.probability - 15) }
          : d
      )
    );
  }
  function markLost(id: string) {
    setDeals((ds) =>
      ds.map((d) =>
        d.id === id ? { ...d, stage: "Closed Lost", probability: 0 } : d
      )
    );
  }

  function toggleIndustry(ind: string) {
    setIndustries((cur) =>
      cur.includes(ind) ? cur.filter((c) => c !== ind) : [...cur, ind]
    );
  }

  const totals = STAGES.map((s) => {
    const ds = filtered.filter((d) => d.stage === s.key);
    return {
      stage: s.key,
      count: ds.length,
      amount: ds.reduce((a, b) => a + b.amount, 0),
      weighted: ds.reduce((a, b) => a + (b.amount * b.probability) / 100, 0),
    };
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pipeline</h1>
          <p className="text-xs text-slate-500">
            {filtered.length} active deals · weighted ARR{" "}
            {fmt(filtered.reduce((a, b) => a + (b.amount * b.probability) / 100, 0))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Filter by owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
          >
            {OWNERS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <details className="relative">
            <summary
              aria-label="Industry filter"
              className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white cursor-pointer list-none flex items-center gap-1"
            >
              Industry{" "}
              {industries.length > 0 && (
                <span className="bg-sky-100 text-sky-700 rounded px-1 text-[10px]">
                  {industries.length}
                </span>
              )}
            </summary>
            <div className="absolute z-10 mt-1 right-0 bg-white border border-slate-200 rounded-md shadow-lg p-2 w-48">
              {INDUSTRIES.map((ind) => (
                <label
                  key={ind}
                  className="flex items-center gap-2 text-xs py-1 hover:bg-slate-50 px-1 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    aria-label={`Toggle ${ind} industry filter`}
                    checked={industries.includes(ind)}
                    onChange={() => toggleIndustry(ind)}
                  />
                  {ind}
                </label>
              ))}
            </div>
          </details>
          <div className="text-xs flex items-center gap-2 border border-slate-200 rounded-md px-2 py-1 bg-white">
            <span className="text-slate-500">Min ACV</span>
            <input
              type="range"
              min={0}
              max={500000}
              step={10000}
              value={minAmt}
              onChange={(e) => setMinAmt(Number(e.target.value))}
              aria-label="Minimum deal amount"
              className="w-32 accent-sky-500"
            />
            <span className="font-mono text-[10px] w-12">{fmt(minAmt)}</span>
          </div>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              aria-label="Show Closed Lost"
              checked={showLost}
              onChange={(e) => setShowLost(e.target.checked)}
            />
            Show lost
          </label>
        </div>
      </div>

      {/* Totals bar */}
      <div className="grid grid-cols-5 gap-2">
        {totals.map((t) => {
          const s = STAGES.find((x) => x.key === t.stage)!;
          return (
            <div
              key={t.stage}
              className={`${s.bg} rounded-md px-3 py-2 border border-transparent`}
            >
              <div className={`text-[10px] uppercase tracking-wide ${s.tone}`}>{t.stage}</div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold">{fmt(t.amount)}</span>
                <span className="text-[10px] text-slate-500">{t.count}</span>
              </div>
              <div className="text-[10px] text-slate-500">w/ {fmt(t.weighted)}</div>
            </div>
          );
        })}
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-5 gap-2">
        {STAGES.map((s) => {
          const col = filtered.filter((d) => d.stage === s.key);
          return (
            <div key={s.key} className="min-h-[200px]">
              <div className="space-y-2">
                {col.length === 0 && (
                  <div className="text-[10px] text-slate-400 italic px-2 py-3 border border-dashed border-slate-200 rounded text-center">
                    No deals
                  </div>
                )}
                {col.map((d) => (
                  <DealCard
                    key={d.id}
                    deal={d}
                    onAdvance={() => advance(d.id)}
                    onRegress={() => regress(d.id)}
                    onLose={() => markLost(d.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DealCard({
  deal,
  onAdvance,
  onRegress,
  onLose,
}: {
  deal: Deal;
  onAdvance: () => void;
  onRegress: () => void;
  onLose: () => void;
}) {
  const indTone: Record<string, string> = {
    SaaS: "bg-sky-100 text-sky-700",
    Healthcare: "bg-rose-100 text-rose-700",
    Logistics: "bg-amber-100 text-amber-700",
    FinServ: "bg-violet-100 text-violet-700",
    Manufacturing: "bg-emerald-100 text-emerald-700",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-md p-2 text-xs hover:shadow-sm">
      <div className="flex justify-between items-start">
        <div className="font-medium leading-tight pr-1">{deal.name}</div>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded ${indTone[deal.industry]}`}
        >
          {deal.industry}
        </span>
      </div>
      <div className="text-[10px] text-slate-500 mt-0.5">{deal.id} · {deal.owner}</div>
      <div className="flex justify-between mt-2">
        <span className="font-semibold">${(deal.amount / 1000).toFixed(0)}K</span>
        <span className="text-slate-500">{deal.closeDate}</span>
      </div>
      <div className="mt-1">
        <div className="text-[10px] text-slate-500">Probability {deal.probability}%</div>
        <div className="h-1 bg-slate-100 rounded">
          <div
            className={`h-1 rounded ${
              deal.probability >= 70
                ? "bg-emerald-500"
                : deal.probability >= 40
                ? "bg-amber-500"
                : "bg-rose-500"
            }`}
            style={{ width: `${deal.probability}%` }}
          />
        </div>
      </div>
      <div className="flex gap-1 mt-2">
        <button
          aria-label={`Regress ${deal.name} to previous stage`}
          onClick={onRegress}
          className="text-[10px] border border-slate-200 rounded px-1.5 py-0.5 hover:bg-slate-50"
          disabled={!PREV_STAGE[deal.stage]}
        >
          ◂
        </button>
        <button
          aria-label={`Advance ${deal.name} to next stage`}
          onClick={onAdvance}
          className="flex-1 text-[10px] border border-emerald-200 bg-emerald-50 text-emerald-700 rounded px-1.5 py-0.5 hover:bg-emerald-100"
          disabled={!NEXT_STAGE[deal.stage]}
        >
          Advance ▸
        </button>
        <button
          aria-label={`Mark ${deal.name} as Closed Lost`}
          onClick={onLose}
          className="text-[10px] border border-rose-200 bg-rose-50 text-rose-700 rounded px-1.5 py-0.5 hover:bg-rose-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
