"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/components/Toast";

type Stage =
  | "Lead"
  | "Qualified"
  | "Proposal"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";

type Forecast = "Omitted" | "Pipeline" | "Best Case" | "Commit" | "Closed";

type Opp = {
  id: string;
  name: string;
  account: string;
  stage: Stage;
  amount: number;
  probability: number;
  closeDate: string;
  owner: string;
  forecast: Forecast;
  nextStep: string;
};

const SEED: Opp[] = [
  { id: "OPP-2401", name: "Acme · Renewal '26", account: "Acme Aerospace", stage: "Negotiation", amount: 480000, probability: 75, closeDate: "2026-09-30", owner: "Sarah Chen", forecast: "Commit", nextStep: "Procurement sign-off" },
  { id: "OPP-2402", name: "Helix Bio · Platform Expansion", account: "Helix Bio", stage: "Proposal", amount: 220000, probability: 50, closeDate: "2026-08-15", owner: "Jonas Weber", forecast: "Best Case", nextStep: "Demo with VP Clinical" },
  { id: "OPP-2403", name: "Northwind · Net-New", account: "Northwind", stage: "Closed Won", amount: 310000, probability: 100, closeDate: "2026-07-22", owner: "Sarah Chen", forecast: "Closed", nextStep: "Kickoff scheduled" },
  { id: "OPP-2404", name: "Beacon · Upsell", account: "Beacon Industries", stage: "Qualified", amount: 95000, probability: 25, closeDate: "2026-10-01", owner: "Alex Kim", forecast: "Pipeline", nextStep: "Discovery call" },
  { id: "OPP-2405", name: "Vortex · Multi-year", account: "Vortex Capital", stage: "Proposal", amount: 720000, probability: 40, closeDate: "2026-12-31", owner: "Priya Rao", forecast: "Best Case", nextStep: "Legal redlines" },
  { id: "OPP-2406", name: "Pillar Health · POC → Prod", account: "Pillar Health", stage: "Negotiation", amount: 180000, probability: 60, closeDate: "2026-08-28", owner: "Diego Reyes", forecast: "Commit", nextStep: "Final pricing" },
  { id: "OPP-2407", name: "Cobalt SaaS · Land", account: "Cobalt SaaS", stage: "Lead", amount: 64000, probability: 15, closeDate: "2026-11-12", owner: "Jonas Weber", forecast: "Omitted", nextStep: "Schedule first call" },
];

const FORECASTS: Forecast[] = [
  "Omitted",
  "Pipeline",
  "Best Case",
  "Commit",
  "Closed",
];

const stageBadge: Record<Stage, string> = {
  Lead: "bg-slate-100 text-slate-700",
  Qualified: "bg-sky-100 text-sky-700",
  Proposal: "bg-violet-100 text-violet-700",
  Negotiation: "bg-amber-100 text-amber-700",
  "Closed Won": "bg-emerald-100 text-emerald-700",
  "Closed Lost": "bg-rose-100 text-rose-700",
};

const forecastBadge: Record<Forecast, string> = {
  Omitted: "bg-slate-100 text-slate-500",
  Pipeline: "bg-sky-100 text-sky-700",
  "Best Case": "bg-violet-100 text-violet-700",
  Commit: "bg-emerald-100 text-emerald-700",
  Closed: "bg-emerald-200 text-emerald-900",
};

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;
}

export default function Opportunities() {
  const [opps, setOpps] = useState(SEED);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<"none" | "stage" | "owner" | "forecast">(
    "none"
  );
  const [creating, setCreating] = useState(false);
  const params = useSearchParams();
  useEffect(() => {
    if (params?.get("new") === "1") setCreating(true);
  }, [params]);

  function update(id: string, patch: Partial<Opp>) {
    setOpps((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function addOpp(o: Omit<Opp, "id">) {
    const id = `OPP-${2410 + opps.length + 1}`;
    setOpps((cur) => [{ ...o, id }, ...cur]);
    toast(`Opportunity "${o.name}" created`, "success");
  }

  const weightedTotal = opps.reduce(
    (a, b) => a + (b.amount * b.probability) / 100,
    0
  );
  const commitTotal = opps
    .filter((o) => o.forecast === "Commit" || o.forecast === "Closed")
    .reduce((a, b) => a + b.amount, 0);
  const bestCaseTotal = opps
    .filter(
      (o) =>
        o.forecast === "Commit" ||
        o.forecast === "Best Case" ||
        o.forecast === "Closed"
    )
    .reduce((a, b) => a + b.amount, 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Opportunities</h1>
          <p className="text-xs text-slate-500">
            {opps.length} open · weighted {fmt(weightedTotal)} · Commit {fmt(commitTotal)} · Best Case {fmt(bestCaseTotal)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Group by</span>
          <select
            aria-label="Group opportunities by"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
            className="border border-slate-200 rounded-md px-2 py-1 bg-white"
          >
            <option value="none">None</option>
            <option value="stage">Stage</option>
            <option value="owner">Owner</option>
            <option value="forecast">Forecast category</option>
          </select>
          <button
            aria-label="New opportunity"
            onClick={() => setCreating(true)}
            className="text-xs bg-emerald-600 text-white rounded-md px-3 py-1.5 hover:bg-emerald-700"
          >
            + New opportunity
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 w-6"></th>
              <th className="px-3 py-2 text-left">Opportunity</th>
              <th className="px-3 py-2 text-left">Stage</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-left w-44">Probability</th>
              <th className="px-3 py-2 text-left">Forecast</th>
              <th className="px-3 py-2 text-left">Close date</th>
              <th className="px-3 py-2 text-left">Owner</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {opps.map((o) => {
              const open = expanded === o.id;
              return (
                <FragmentRow
                  key={o.id}
                  o={o}
                  open={open}
                  onToggle={() => setExpanded(open ? null : o.id)}
                  onChange={(patch) => update(o.id, patch)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {creating && (
        <NewOppModal
          onClose={() => setCreating(false)}
          onCreate={(o) => {
            addOpp(o);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function NewOppModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (o: Omit<Opp, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [stage, setStage] = useState<Stage>("Qualified");
  const [amount, setAmount] = useState(50000);
  const [probability, setProbability] = useState(30);
  const [closeDate, setCloseDate] = useState(
    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [owner, setOwner] = useState("Sarah Chen");
  const [forecast, setForecast] = useState<Forecast>("Pipeline");
  const [nextStep, setNextStep] = useState("Discovery call");

  const cls =
    "w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-sky-300";

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-[520px] p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-sm font-semibold">New opportunity</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block col-span-2">
            <span className="text-[11px] text-slate-500 block mb-1">
              Opportunity name
            </span>
            <input
              type="text"
              aria-label="Opportunity name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cls}
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">Account</span>
            <input
              type="text"
              aria-label="Account"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className={cls}
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">Stage</span>
            <select
              aria-label="Stage"
              value={stage}
              onChange={(e) => setStage(e.target.value as Stage)}
              className={cls}
            >
              {["Lead", "Qualified", "Proposal", "Negotiation"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">
              Amount (USD)
            </span>
            <input
              type="number"
              aria-label="Amount"
              value={amount}
              step={1000}
              onChange={(e) => setAmount(Number(e.target.value))}
              className={cls}
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">
              Probability ({probability}%)
            </span>
            <input
              type="range"
              aria-label="Probability"
              min={0}
              max={100}
              step={5}
              value={probability}
              onChange={(e) => setProbability(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">
              Close date
            </span>
            <input
              type="date"
              aria-label="Close date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              className={cls}
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">Owner</span>
            <select
              aria-label="Owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className={cls}
            >
              {[
                "Sarah Chen",
                "Jonas Weber",
                "Priya Rao",
                "Alex Kim",
                "Diego Reyes",
              ].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">
              Forecast category
            </span>
            <select
              aria-label="Forecast category"
              value={forecast}
              onChange={(e) => setForecast(e.target.value as Forecast)}
              className={cls}
            >
              {FORECASTS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="block col-span-2">
            <span className="text-[11px] text-slate-500 block mb-1">Next step</span>
            <input
              type="text"
              aria-label="Next step"
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              className={cls}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            aria-label="Cancel opportunity creation"
            onClick={onClose}
            className="text-xs px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded"
          >
            Cancel
          </button>
          <button
            aria-label="Create opportunity"
            disabled={!name.trim() || !account.trim()}
            onClick={() =>
              onCreate({
                name,
                account,
                stage,
                amount,
                probability,
                closeDate,
                owner,
                forecast,
                nextStep,
              })
            }
            className="text-xs bg-emerald-600 text-white rounded px-4 py-1.5 hover:bg-emerald-700 disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function FragmentRow({
  o,
  open,
  onToggle,
  onChange,
}: {
  o: Opp;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Opp>) => void;
}) {
  return (
    <>
      <tr className="border-t border-slate-100 hover:bg-slate-50">
        <td className="px-3 py-2">
          <button
            aria-label={`${open ? "Collapse" : "Expand"} ${o.name}`}
            aria-expanded={open}
            onClick={onToggle}
            className="text-slate-400 hover:text-slate-900"
          >
            {open ? "▾" : "▸"}
          </button>
        </td>
        <td className="px-3 py-2">
          <div className="font-medium">{o.name}</div>
          <div className="text-[10px] text-slate-400">{o.id} · {o.account}</div>
        </td>
        <td className="px-3 py-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${stageBadge[o.stage]}`}>
            {o.stage}
          </span>
        </td>
        <td className="px-3 py-2 text-right font-mono">{fmt(o.amount)}</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <input
              type="range"
              aria-label={`Set probability for ${o.name}`}
              min={0}
              max={100}
              step={5}
              value={o.probability}
              onChange={(e) => onChange({ probability: Number(e.target.value) })}
              className="flex-1 accent-emerald-500"
            />
            <span className="font-mono text-[11px] w-8 text-right">
              {o.probability}%
            </span>
          </div>
        </td>
        <td className="px-3 py-2">
          <select
            aria-label={`Forecast category for ${o.name}`}
            value={o.forecast}
            onChange={(e) => onChange({ forecast: e.target.value as Forecast })}
            className={`text-[11px] px-1.5 py-0.5 rounded border-0 ${forecastBadge[o.forecast]}`}
          >
            {FORECASTS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <input
            type="date"
            aria-label={`Close date for ${o.name}`}
            value={o.closeDate}
            onChange={(e) => onChange({ closeDate: e.target.value })}
            className="text-[11px] border border-slate-200 rounded px-1.5 py-0.5 bg-white"
          />
        </td>
        <td className="px-3 py-2">{o.owner}</td>
        <td className="px-3 py-2 text-right">
          <button
            aria-label={`Mark ${o.name} as Closed Won`}
            onClick={() => onChange({ stage: "Closed Won", probability: 100, forecast: "Closed" })}
            className="text-[10px] text-emerald-700 hover:underline mr-2"
          >
            Win
          </button>
          <button
            aria-label={`Mark ${o.name} as Closed Lost`}
            onClick={() => onChange({ stage: "Closed Lost", probability: 0, forecast: "Omitted" })}
            className="text-[10px] text-rose-700 hover:underline"
          >
            Lose
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50 border-t border-slate-100">
          <td colSpan={9} className="px-6 py-3">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">
                  Next step
                </div>
                <input
                  type="text"
                  aria-label={`Next step for ${o.name}`}
                  value={o.nextStep}
                  onChange={(e) => onChange({ nextStep: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">
                  Internal notes
                </div>
                <div
                  role="textbox"
                  aria-label={`Internal notes for ${o.name}`}
                  contentEditable
                  suppressContentEditableWarning
                  className="text-xs border border-slate-200 rounded px-2 py-1 bg-white min-h-[2rem] focus:outline-none focus:ring-1 focus:ring-sky-300"
                >
                  Stakeholder: VP Procurement · Champion confirmed · MEDDPICC score 6/8
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">
                  Quick links
                </div>
                <div className="flex gap-1">
                  <button
                    aria-label={`Open ${o.name} in CRM`}
                    onClick={() => toast(`Opened ${o.id} in full CRM view`)}
                    className="text-[11px] border border-slate-200 rounded px-2 py-1 hover:bg-white"
                  >
                    Open in CRM
                  </button>
                  <button
                    aria-label={`Send proposal for ${o.name}`}
                    onClick={() =>
                      toast(`Proposal draft created for ${o.name}`, "success")
                    }
                    className="text-[11px] border border-slate-200 rounded px-2 py-1 hover:bg-white"
                  >
                    Send proposal
                  </button>
                  <button
                    aria-label={`Schedule meeting for ${o.name}`}
                    onClick={() =>
                      toast(`Meeting request sent for ${o.name}`, "success")
                    }
                    className="text-[11px] border border-slate-200 rounded px-2 py-1 hover:bg-white"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
