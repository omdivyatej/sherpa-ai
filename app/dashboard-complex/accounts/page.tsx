"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/components/Toast";

type Tier = "Strategic" | "Enterprise" | "Mid-Market" | "SMB";
type Industry = "SaaS" | "Healthcare" | "Logistics" | "FinServ" | "Manufacturing" | "Retail";
type Region = "AMER" | "EMEA" | "APAC" | "LATAM";

type Account = {
  id: string;
  name: string;
  tier: Tier;
  industry: Industry;
  region: Region;
  arr: number; // current ARR in USD
  owner: string;
  health: "Green" | "Yellow" | "Red";
  lastActivity: string;
};

const TIERS: Tier[] = ["Strategic", "Enterprise", "Mid-Market", "SMB"];
const INDUSTRIES: Industry[] = [
  "SaaS",
  "Healthcare",
  "Logistics",
  "FinServ",
  "Manufacturing",
  "Retail",
];
const REGIONS: Region[] = ["AMER", "EMEA", "APAC", "LATAM"];

const SEED: Account[] = [
  { id: "ACC-001", name: "Acme Aerospace", tier: "Strategic", industry: "Manufacturing", region: "AMER", arr: 1480000, owner: "Sarah Chen", health: "Green", lastActivity: "Today" },
  { id: "ACC-002", name: "Helix Bio", tier: "Enterprise", industry: "Healthcare", region: "EMEA", arr: 620000, owner: "Jonas Weber", health: "Yellow", lastActivity: "Yesterday" },
  { id: "ACC-003", name: "Northwind Logistics", tier: "Enterprise", industry: "Logistics", region: "AMER", arr: 880000, owner: "Sarah Chen", health: "Green", lastActivity: "2 d" },
  { id: "ACC-004", name: "Beacon Industries", tier: "Mid-Market", industry: "Manufacturing", region: "AMER", arr: 145000, owner: "Alex Kim", health: "Red", lastActivity: "11 d" },
  { id: "ACC-005", name: "Vortex Capital", tier: "Strategic", industry: "FinServ", region: "EMEA", arr: 2100000, owner: "Priya Rao", health: "Green", lastActivity: "Today" },
  { id: "ACC-006", name: "Pillar Health", tier: "Enterprise", industry: "Healthcare", region: "APAC", arr: 480000, owner: "Diego Reyes", health: "Yellow", lastActivity: "4 d" },
  { id: "ACC-007", name: "Cobalt SaaS", tier: "Mid-Market", industry: "SaaS", region: "AMER", arr: 92000, owner: "Jonas Weber", health: "Green", lastActivity: "Today" },
  { id: "ACC-008", name: "Stratus Banking", tier: "Enterprise", industry: "FinServ", region: "EMEA", arr: 720000, owner: "Alex Kim", health: "Yellow", lastActivity: "1 d" },
  { id: "ACC-009", name: "Atlas Migration", tier: "Mid-Market", industry: "SaaS", region: "AMER", arr: 320000, owner: "Sarah Chen", health: "Green", lastActivity: "3 d" },
  { id: "ACC-010", name: "Nimbus IoT", tier: "SMB", industry: "Manufacturing", region: "APAC", arr: 48000, owner: "Priya Rao", health: "Yellow", lastActivity: "6 d" },
  { id: "ACC-011", name: "Lattice Retail", tier: "Enterprise", industry: "Retail", region: "LATAM", arr: 410000, owner: "Diego Reyes", health: "Red", lastActivity: "14 d" },
  { id: "ACC-012", name: "Quanta Pharma", tier: "Strategic", industry: "Healthcare", region: "AMER", arr: 1920000, owner: "Priya Rao", health: "Green", lastActivity: "Today" },
];

const tierBadge: Record<Tier, string> = {
  Strategic: "bg-violet-100 text-violet-700",
  Enterprise: "bg-sky-100 text-sky-700",
  "Mid-Market": "bg-amber-100 text-amber-700",
  SMB: "bg-slate-100 text-slate-600",
};

const healthDot: Record<Account["health"], string> = {
  Green: "bg-emerald-500",
  Yellow: "bg-amber-400",
  Red: "bg-rose-500",
};

const indBadge: Record<Industry, string> = {
  SaaS: "bg-sky-50 text-sky-700",
  Healthcare: "bg-rose-50 text-rose-700",
  Logistics: "bg-amber-50 text-amber-700",
  FinServ: "bg-violet-50 text-violet-700",
  Manufacturing: "bg-emerald-50 text-emerald-700",
  Retail: "bg-fuchsia-50 text-fuchsia-700",
};

function fmtCurrency(n: number) {
  return n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : `$${(n / 1000).toFixed(0)}K`;
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>(SEED);
  const [tier, setTier] = useState<Tier | "All">("All");
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [region, setRegion] = useState<Region | "All">("All");
  const [minArr, setMinArr] = useState(0);
  const [maxArr, setMaxArr] = useState(2_500_000);
  const [health, setHealth] = useState<Set<Account["health"]>>(
    new Set(["Green", "Yellow", "Red"])
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const params = useSearchParams();
  useEffect(() => {
    if (params?.get("new") === "1") setCreating(true);
  }, [params]);

  const filtered = useMemo(
    () =>
      accounts.filter(
        (a) =>
          (tier === "All" || a.tier === tier) &&
          (industries.length === 0 || industries.includes(a.industry)) &&
          (region === "All" || a.region === region) &&
          a.arr >= minArr &&
          a.arr <= maxArr &&
          health.has(a.health) &&
          (!query || a.name.toLowerCase().includes(query.toLowerCase()))
      ),
    [accounts, tier, industries, region, minArr, maxArr, health, query]
  );

  function addAccount(a: Omit<Account, "id" | "lastActivity">) {
    const id = `ACC-${String(accounts.length + 1).padStart(3, "0")}`;
    setAccounts((cur) => [{ ...a, id, lastActivity: "Just now" }, ...cur]);
    toast(`Account "${a.name}" created`, "success");
  }

  function archiveSelected() {
    if (selected.size === 0) return;
    const n = selected.size;
    setAccounts((cur) => cur.filter((a) => !selected.has(a.id)));
    setSelected(new Set());
    toast(`Archived ${n} account${n === 1 ? "" : "s"}`, "success");
  }

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  };

  const toggleIndustry = (ind: Industry) =>
    setIndustries((cur) =>
      cur.includes(ind) ? cur.filter((c) => c !== ind) : [...cur, ind]
    );

  const toggleHealth = (h: Account["health"]) => {
    setHealth((cur) => {
      const next = new Set(cur);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  };

  return (
    <div className="flex h-full">
      {/* Filter sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white p-4 space-y-4 overflow-y-auto">
        <div>
          <div className="text-xs font-semibold mb-2">Account Tier</div>
          <div className="space-y-1">
            {(["All", ...TIERS] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="tier"
                  value={t}
                  checked={tier === t}
                  onChange={() => setTier(t)}
                  aria-label={`Tier filter ${t}`}
                />
                {t}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold mb-2">Industry</div>
          <div className="space-y-1">
            {INDUSTRIES.map((ind) => (
              <label key={ind} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  aria-label={`Industry filter ${ind}`}
                  checked={industries.includes(ind)}
                  onChange={() => toggleIndustry(ind)}
                />
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${indBadge[ind]}`}
                >
                  {ind}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold mb-2">Region</div>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as Region | "All")}
            aria-label="Region filter"
            className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
          >
            <option value="All">All regions</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs font-semibold mb-2">
            ARR range ({fmtCurrency(minArr)} – {fmtCurrency(maxArr)})
          </div>
          <div className="space-y-2">
            <input
              type="range"
              aria-label="Minimum ARR"
              min={0}
              max={2_500_000}
              step={10_000}
              value={minArr}
              onChange={(e) =>
                setMinArr(Math.min(Number(e.target.value), maxArr - 10_000))
              }
              className="w-full accent-sky-500"
            />
            <input
              type="range"
              aria-label="Maximum ARR"
              min={0}
              max={2_500_000}
              step={10_000}
              value={maxArr}
              onChange={(e) =>
                setMaxArr(Math.max(Number(e.target.value), minArr + 10_000))
              }
              className="w-full accent-sky-500"
            />
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold mb-2">Health</div>
          <div className="flex gap-1">
            {(["Green", "Yellow", "Red"] as const).map((h) => {
              const on = health.has(h);
              return (
                <button
                  key={h}
                  onClick={() => toggleHealth(h)}
                  aria-label={`Toggle ${h} health filter`}
                  aria-pressed={on}
                  className={`flex-1 text-[11px] px-1 py-1 rounded border ${
                    on
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 text-slate-500"
                  }`}
                >
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-1 ${healthDot[h]}`}
                  />
                  {h}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => {
            setTier("All");
            setIndustries([]);
            setRegion("All");
            setMinArr(0);
            setMaxArr(2_500_000);
            setHealth(new Set(["Green", "Yellow", "Red"]));
          }}
          aria-label="Reset all filters"
          className="w-full text-xs text-slate-500 underline hover:text-slate-900"
        >
          Reset filters
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Accounts</h1>
            <p className="text-xs text-slate-500">
              {filtered.length} of {SEED.length} accounts · total ARR{" "}
              {fmtCurrency(filtered.reduce((a, b) => a + b.arr, 0))}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              aria-label="Search accounts by name"
              type="search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
            />
            <button
              aria-label="Create new account"
              onClick={() => setCreating(true)}
              className="text-xs bg-sky-600 text-white rounded-md px-3 py-1.5 hover:bg-sky-700"
            >
              + New account
            </button>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div className="bg-slate-900 text-white rounded-md px-3 py-2 flex items-center justify-between text-xs">
            <span>{selected.size} selected</span>
            <div className="flex gap-2">
              <button
                aria-label="Assign owner to selected accounts"
                onClick={() =>
                  toast(`Re-assigning ${selected.size} accounts to Priya Rao`)
                }
                className="border border-slate-700 rounded px-2 py-1 hover:bg-slate-800"
              >
                Assign owner
              </button>
              <button
                aria-label="Change tier for selected accounts"
                onClick={() =>
                  toast(`Tier change applied to ${selected.size} accounts`)
                }
                className="border border-slate-700 rounded px-2 py-1 hover:bg-slate-800"
              >
                Change tier
              </button>
              <button
                aria-label="Export selected accounts"
                onClick={() =>
                  toast(`Exporting ${selected.size} accounts to CSV`, "success")
                }
                className="border border-slate-700 rounded px-2 py-1 hover:bg-slate-800"
              >
                Export
              </button>
              <button
                aria-label="Archive selected accounts"
                onClick={archiveSelected}
                className="border border-rose-700 bg-rose-700 rounded px-2 py-1 hover:bg-rose-800"
              >
                Archive
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 w-8">
                  <input
                    type="checkbox"
                    aria-label="Select all visible accounts"
                    checked={
                              filtered.length > 0 && selected.size === filtered.length
                    }
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-3 py-2 text-left">Account</th>
                <th className="px-3 py-2 text-left">Tier</th>
                <th className="px-3 py-2 text-left">Industry</th>
                <th className="px-3 py-2 text-left">Region</th>
                <th className="px-3 py-2 text-right">ARR</th>
                <th className="px-3 py-2 text-left">Owner</th>
                <th className="px-3 py-2 text-left">Health</th>
                <th className="px-3 py-2 text-left">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${a.name}`}
                      checked={selected.has(a.id)}
                      onChange={() => toggleSelect(a.id)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-[10px] text-slate-400">{a.id}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${tierBadge[a.tier]}`}>
                      {a.tier}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${indBadge[a.industry]}`}>
                      {a.industry}
                    </span>
                  </td>
                  <td className="px-3 py-2">{a.region}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtCurrency(a.arr)}</td>
                  <td className="px-3 py-2">{a.owner}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${healthDot[a.health]}`} />
                    {a.health}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{a.lastActivity}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    No accounts match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <NewAccountModal
          onClose={() => setCreating(false)}
          onCreate={(a) => {
            addAccount(a);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function NewAccountModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (a: Omit<Account, "id" | "lastActivity">) => void;
}) {
  const [name, setName] = useState("");
  const [tier, setTier] = useState<Tier>("Mid-Market");
  const [industry, setIndustry] = useState<Industry>("SaaS");
  const [region, setRegion] = useState<Region>("AMER");
  const [arr, setArr] = useState(100000);
  const [owner, setOwner] = useState("Sarah Chen");
  const [health, setHealth] = useState<Account["health"]>("Green");

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-[480px] p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-sm font-semibold">New account</h2>
          <p className="text-[11px] text-slate-500">
            All fields except ARR are required.
          </p>
        </div>
        <Field label="Account name">
          <input
            type="text"
            aria-label="Account name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={input}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tier">
            <select
              aria-label="Tier"
              value={tier}
              onChange={(e) => setTier(e.target.value as Tier)}
              className={input}
            >
              {TIERS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Industry">
            <select
              aria-label="Industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value as Industry)}
              className={input}
            >
              {INDUSTRIES.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </Field>
          <Field label="Region">
            <select
              aria-label="Region"
              value={region}
              onChange={(e) => setRegion(e.target.value as Region)}
              className={input}
            >
              {REGIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Owner">
            <select
              aria-label="Owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className={input}
            >
              {["Sarah Chen", "Jonas Weber", "Priya Rao", "Alex Kim", "Diego Reyes"].map(
                (o) => (
                  <option key={o}>{o}</option>
                )
              )}
            </select>
          </Field>
          <Field label="ARR (USD)">
            <input
              type="number"
              aria-label="ARR in USD"
              value={arr}
              step={5000}
              onChange={(e) => setArr(Number(e.target.value))}
              className={input}
            />
          </Field>
          <Field label="Health">
            <select
              aria-label="Health"
              value={health}
              onChange={(e) => setHealth(e.target.value as Account["health"])}
              className={input}
            >
              {["Green", "Yellow", "Red"].map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            aria-label="Cancel account creation"
            onClick={onClose}
            className="text-xs px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded"
          >
            Cancel
          </button>
          <button
            aria-label="Create account"
            disabled={!name.trim()}
            onClick={() =>
              onCreate({ name, tier, industry, region, arr, owner, health })
            }
            className="text-xs bg-sky-600 text-white rounded px-4 py-1.5 hover:bg-sky-700 disabled:opacity-40"
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}

const input =
  "w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-sky-300";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-500 block mb-1">{label}</span>
      {children}
    </label>
  );
}
