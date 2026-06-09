"use client";

import { useState } from "react";
import { toast } from "@/components/Toast";

type TabId = "alerts" | "rules" | "dispatch" | "approvals" | "watchlist";

const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: "alerts", label: "Alerts", hint: "Stock & schedule risks" },
  { id: "rules", label: "Rules", hint: "Approval & reorder logic" },
  { id: "dispatch", label: "Dispatch", hint: "Who gets notified" },
  { id: "approvals", label: "Approvals", hint: "Pending sign-offs" },
  { id: "watchlist", label: "Watchlist", hint: "Saved views" },
];

// ---- Alert types ----
type AlertEvent =
  | "Material stock low"
  | "Delivery delay"
  | "Budget burn over"
  | "Weather impact forecast"
  | "Permit expiring"
  | "Vendor reliability dropped";
type Severity = "info" | "warning" | "critical";

type Alert = {
  id: string;
  name: string;
  event: AlertEvent;
  threshold: number;
  thresholdUnit: string;
  severity: Severity;
  enabled: boolean;
  recipients: string[];
};

// ---- Rule ----
type Rule = {
  id: string;
  name: string;
  whenEvent: string;
  thenAction: string;
  enabled: boolean;
};

// ---- Dispatch destination ----
type DestKind = "Email" | "SMS" | "Slack" | "Field radio";
type Dest = {
  id: string;
  kind: DestKind;
  name: string;
  destination: string;
  onCall: boolean;
};

// ---- Approval queue item ----
type Approval = {
  id: string;
  kind: "Purchase Order" | "Change Order" | "RFI" | "Submittal";
  subject: string;
  amount: number | null;
  requester: string;
  project: string;
  ageDays: number;
};

// ---- Watchlist snapshot ----
type Snapshot = {
  id: string;
  name: string;
  description: string;
  filters: string;
  shared: boolean;
};

const SEED_ALERTS: Alert[] = [
  {
    id: "AL-01",
    name: "Rebar #5 below safety stock",
    event: "Material stock low",
    threshold: 250,
    thresholdUnit: "tons",
    severity: "critical",
    enabled: true,
    recipients: ["foreman.east@ironworks.co", "procurement-leads"],
  },
  {
    id: "AL-02",
    name: "Concrete pour weather risk",
    event: "Weather impact forecast",
    threshold: 0,
    thresholdUnit: "°F < 40 next 48h",
    severity: "warning",
    enabled: true,
    recipients: ["site-supers"],
  },
  {
    id: "AL-03",
    name: "Skyline Residences burning fast",
    event: "Budget burn over",
    threshold: 15,
    thresholdUnit: "% over plan",
    severity: "warning",
    enabled: true,
    recipients: ["pm-skyline@ironworks.co"],
  },
  {
    id: "AL-04",
    name: "Apex Crane lease expiring",
    event: "Permit expiring",
    threshold: 14,
    thresholdUnit: "days",
    severity: "info",
    enabled: false,
    recipients: [],
  },
];

const SEED_RULES: Rule[] = [
  {
    id: "R-01",
    name: "Auto-approve POs under $5K",
    whenEvent: "PO submitted · amount < $5,000",
    thenAction: "Mark approved · notify requester",
    enabled: true,
  },
  {
    id: "R-02",
    name: "Auto-reorder rebar at safety stock",
    whenEvent: "Rebar #5 stock < 250 tons",
    thenAction: "Generate draft PO to Granite Steel · 500 tons",
    enabled: true,
  },
  {
    id: "R-03",
    name: "Escalate slow vendor responses",
    whenEvent: "RFQ open · no quote in 5 days",
    thenAction: "Notify procurement lead · cc 2 backup vendors",
    enabled: true,
  },
  {
    id: "R-04",
    name: "Weekend dispatch hold",
    whenEvent: "Day = Sat/Sun · non-critical delivery scheduled",
    thenAction: "Reschedule to next business day",
    enabled: false,
  },
];

const SEED_DESTS: Dest[] = [
  { id: "D-01", kind: "Email", name: "Procurement leads", destination: "procurement-leads@ironworks.co", onCall: false },
  { id: "D-02", kind: "Slack", name: "Field supers", destination: "#supers-east", onCall: true },
  { id: "D-03", kind: "SMS", name: "After-hours on-call", destination: "+1 415 555 0144", onCall: true },
  { id: "D-04", kind: "Field radio", name: "Riverside Tower site", destination: "Channel 7 · west yard", onCall: false },
];

const SEED_APPROVALS: Approval[] = [
  { id: "AP-01", kind: "Purchase Order", subject: "Granite Steel · 500 tons rebar", amount: 312_000, requester: "Mike Chen", project: "Riverside Medical Tower", ageDays: 2 },
  { id: "AP-02", kind: "Change Order", subject: "Add basement waterproofing", amount: 84_500, requester: "Priya Rao", project: "Cedar Crossing Mixed-Use", ageDays: 5 },
  { id: "AP-03", kind: "RFI", subject: "Clarify spec on curtainwall mullions", amount: null, requester: "Jonas Weber", project: "Skyline Residences", ageDays: 1 },
  { id: "AP-04", kind: "Submittal", subject: "HVAC equipment cut-sheets", amount: null, requester: "Alex Kim", project: "Helix Biotech Campus", ageDays: 3 },
  { id: "AP-05", kind: "Purchase Order", subject: "Apex Crane · tower-crane lease ext.", amount: 145_000, requester: "Diego Reyes", project: "Skyline Residences", ageDays: 0 },
];

const SEED_SNAPSHOTS: Snapshot[] = [
  { id: "S-1", name: "Open POs over $50K", description: "Active purchase orders awaiting fulfillment", filters: "kind=PO, status=Open, amount>50000", shared: true },
  { id: "S-2", name: "Late deliveries this week", description: "Shipments overdue by ≥ 1 day", filters: "delivery_late=true, range=last7d", shared: false },
  { id: "S-3", name: "High-risk vendors", description: "Reliability score < 50, active project linkage", filters: "reliability<50, active=true", shared: true },
];

const severityTone: Record<Severity, string> = {
  info: "bg-sky-100 text-sky-700",
  warning: "bg-amber-100 text-amber-700",
  critical: "bg-rose-100 text-rose-700",
};

const destIcon: Record<DestKind, string> = {
  Email: "✉",
  SMS: "✆",
  Slack: "#",
  "Field radio": "📻",
};

const approvalTone: Record<Approval["kind"], string> = {
  "Purchase Order": "bg-emerald-100 text-emerald-700",
  "Change Order": "bg-amber-100 text-amber-700",
  RFI: "bg-sky-100 text-sky-700",
  Submittal: "bg-violet-100 text-violet-700",
};

function fmtAmt(n: number | null) {
  if (n === null) return "—";
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;
}

export default function StudioPage() {
  const [tab, setTab] = useState<TabId>("alerts");

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            Studio
            <span className="text-[10px] bg-violet-100 text-violet-700 rounded px-2 py-0.5">
              OPS
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Operations workbench — alerts, approval rules, field dispatch, and
            saved cross-project views.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="View Studio runbook"
            onClick={() => toast("Runbook opening (demo)")}
            className="text-xs border border-slate-200 rounded-md px-3 py-1.5 hover:bg-slate-50"
          >
            ? Runbook
          </button>
          <button
            aria-label="View Studio activity log"
            onClick={() => toast("47 ops actions in the last 24h")}
            className="text-xs border border-slate-200 rounded-md px-3 py-1.5 hover:bg-slate-50"
          >
            Activity
          </button>
        </div>
      </div>

      <div role="tablist" className="flex border-b border-slate-200">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              aria-label={`${t.label} — ${t.hint}`}
              onClick={() => setTab(t.id)}
              className={`text-xs px-4 py-2 border-b-2 -mb-px ${
                active
                  ? "border-violet-500 text-violet-700 font-medium"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <div>{t.label}</div>
              <div className="text-[10px] text-slate-400 font-normal">
                {t.hint}
              </div>
            </button>
          );
        })}
      </div>

      {tab === "alerts" && <AlertsTab />}
      {tab === "rules" && <RulesTab />}
      {tab === "dispatch" && <DispatchTab />}
      {tab === "approvals" && <ApprovalsTab />}
      {tab === "watchlist" && <WatchlistTab />}
    </div>
  );
}

// =========== Alerts tab ===========
function AlertsTab() {
  const [alerts, setAlerts] = useState<Alert[]>(SEED_ALERTS);
  const [creating, setCreating] = useState(false);

  function add(a: Omit<Alert, "id">) {
    const id = `AL-${String(alerts.length + 1).padStart(2, "0")}`;
    setAlerts((cur) => [{ ...a, id }, ...cur]);
    toast(`Alert "${a.name}" created`, "success");
    setCreating(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Fires a notification when something on a project crosses your threshold.
        </div>
        <button
          aria-label="Create new alert"
          onClick={() => setCreating(true)}
          className="text-xs bg-violet-600 text-white rounded-md px-3 py-1.5 hover:bg-violet-700"
        >
          + New alert
        </button>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Event</th>
              <th className="px-3 py-2 text-right">Threshold</th>
              <th className="px-3 py-2 text-left">Severity</th>
              <th className="px-3 py-2 text-left">Recipients</th>
              <th className="px-3 py-2 text-left">Active</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{a.name}</td>
                <td className="px-3 py-2 text-slate-600">{a.event}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {a.threshold} {a.thresholdUnit}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${severityTone[a.severity]}`}
                  >
                    {a.severity}
                  </span>
                </td>
                <td className="px-3 py-2 text-[11px] text-slate-500">
                  {a.recipients.length === 0 ? "—" : a.recipients.join(", ")}
                </td>
                <td className="px-3 py-2">
                  <button
                    role="switch"
                    aria-checked={a.enabled}
                    aria-label={`Toggle alert ${a.name}`}
                    onClick={() =>
                      setAlerts((cur) =>
                        cur.map((x) =>
                          x.id === a.id ? { ...x, enabled: !x.enabled } : x
                        )
                      )
                    }
                    className={`w-9 h-5 rounded-full relative ${
                      a.enabled ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 ${a.enabled ? "left-5" : "left-0.5"} w-4 h-4 bg-white rounded-full transition-all`}
                    />
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    aria-label={`Test alert ${a.name}`}
                    onClick={() => toast(`Test fired: ${a.name}`)}
                    className="text-[10px] text-sky-600 hover:underline mr-2"
                  >
                    Test
                  </button>
                  <button
                    aria-label={`Delete alert ${a.name}`}
                    onClick={() => {
                      setAlerts((cur) => cur.filter((x) => x.id !== a.id));
                      toast(`Deleted ${a.id}`, "success");
                    }}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {creating && <NewAlertModal onClose={() => setCreating(false)} onSave={add} />}
    </div>
  );
}

function NewAlertModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (a: Omit<Alert, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [event, setEvent] = useState<AlertEvent>("Material stock low");
  const [threshold, setThreshold] = useState(100);
  const [thresholdUnit, setThresholdUnit] = useState("tons");
  const [severity, setSeverity] = useState<Severity>("warning");
  const [enabled, setEnabled] = useState(true);
  const [recipients, setRecipients] = useState("");

  const cls =
    "w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-300";

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-[480px] p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold">New alert</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block col-span-2">
            <span className="text-[11px] text-slate-500 block mb-1">Name</span>
            <input
              type="text"
              aria-label="Alert name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cls}
            />
          </label>
          <label className="block col-span-2">
            <span className="text-[11px] text-slate-500 block mb-1">Event</span>
            <select
              aria-label="Alert event"
              value={event}
              onChange={(e) => setEvent(e.target.value as AlertEvent)}
              className={cls}
            >
              {(
                [
                  "Material stock low",
                  "Delivery delay",
                  "Budget burn over",
                  "Weather impact forecast",
                  "Permit expiring",
                  "Vendor reliability dropped",
                ] as AlertEvent[]
              ).map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">
              Threshold
            </span>
            <input
              type="number"
              aria-label="Threshold value"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className={cls}
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">
              Unit
            </span>
            <input
              type="text"
              aria-label="Threshold unit"
              value={thresholdUnit}
              onChange={(e) => setThresholdUnit(e.target.value)}
              placeholder="tons, days, %, etc."
              className={cls}
            />
          </label>
          <label className="block col-span-2">
            <span className="text-[11px] text-slate-500 block mb-1">
              Severity
            </span>
            <div className="flex gap-2 text-xs">
              {(["info", "warning", "critical"] as Severity[]).map((s) => (
                <label key={s} className="flex items-center gap-1">
                  <input
                    type="radio"
                    aria-label={`Severity ${s}`}
                    name="sev"
                    value={s}
                    checked={severity === s}
                    onChange={() => setSeverity(s)}
                  />
                  <span className="capitalize">{s}</span>
                </label>
              ))}
            </div>
          </label>
          <label className="block col-span-2">
            <span className="text-[11px] text-slate-500 block mb-1">
              Recipients (comma-separated)
            </span>
            <input
              type="text"
              aria-label="Recipients"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="foreman.east@ironworks.co, #supers-east"
              className={cls}
            />
          </label>
          <label className="flex items-center gap-2 text-xs col-span-2">
            <input
              type="checkbox"
              aria-label="Enable alert"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Enabled
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            aria-label="Cancel"
            onClick={onClose}
            className="text-xs px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded"
          >
            Cancel
          </button>
          <button
            aria-label="Save alert"
            disabled={!name.trim()}
            onClick={() =>
              onSave({
                name,
                event,
                threshold,
                thresholdUnit,
                severity,
                enabled,
                recipients: recipients
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean),
              })
            }
            className="text-xs bg-violet-600 text-white rounded px-4 py-1.5 hover:bg-violet-700 disabled:opacity-40"
          >
            Create alert
          </button>
        </div>
      </div>
    </div>
  );
}

// =========== Rules tab ===========
function RulesTab() {
  const [rules, setRules] = useState<Rule[]>(SEED_RULES);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          IF/THEN automation. Auto-approve POs, auto-reorder materials, escalate
          slow responses.
        </div>
        <button
          aria-label="Create new rule"
          onClick={() => {
            const id = `R-${String(rules.length + 1).padStart(2, "0")}`;
            setRules((cur) => [
              {
                id,
                name: "Untitled rule",
                whenEvent: "...",
                thenAction: "...",
                enabled: false,
              },
              ...cur,
            ]);
            toast(`Rule ${id} added — edit to configure`);
          }}
          className="text-xs bg-violet-600 text-white rounded-md px-3 py-1.5 hover:bg-violet-700"
        >
          + New rule
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {rules.map((r) => (
          <div
            key={r.id}
            className="bg-white border border-slate-200 rounded-lg p-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">{r.name}</div>
                <div className="text-[10px] text-slate-400">{r.id}</div>
              </div>
              <button
                role="switch"
                aria-checked={r.enabled}
                aria-label={`Toggle rule ${r.name}`}
                onClick={() =>
                  setRules((cur) =>
                    cur.map((x) =>
                      x.id === r.id ? { ...x, enabled: !x.enabled } : x
                    )
                  )
                }
                className={`w-9 h-5 rounded-full relative ${
                  r.enabled ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 ${r.enabled ? "left-5" : "left-0.5"} w-4 h-4 bg-white rounded-full transition-all`}
                />
              </button>
            </div>
            <div className="mt-3 space-y-1">
              <div className="text-[10px] text-violet-700 uppercase tracking-wide">
                WHEN
              </div>
              <input
                type="text"
                aria-label={`When condition for ${r.name}`}
                value={r.whenEvent}
                onChange={(e) =>
                  setRules((cur) =>
                    cur.map((x) =>
                      x.id === r.id ? { ...x, whenEvent: e.target.value } : x
                    )
                  )
                }
                className="w-full text-xs border border-slate-200 rounded px-2 py-1 bg-white"
              />
              <div className="text-[10px] text-sky-700 uppercase tracking-wide mt-2">
                THEN
              </div>
              <input
                type="text"
                aria-label={`Then action for ${r.name}`}
                value={r.thenAction}
                onChange={(e) =>
                  setRules((cur) =>
                    cur.map((x) =>
                      x.id === r.id ? { ...x, thenAction: e.target.value } : x
                    )
                  )
                }
                className="w-full text-xs border border-slate-200 rounded px-2 py-1 bg-white"
              />
            </div>
            <div className="flex justify-between items-center mt-3">
              <button
                aria-label={`Dry-run rule ${r.name}`}
                onClick={() => toast(`Dry-run: matched 12 records`)}
                className="text-[10px] text-sky-600 hover:underline"
              >
                Dry-run
              </button>
              <button
                aria-label={`Delete rule ${r.name}`}
                onClick={() => {
                  setRules((cur) => cur.filter((x) => x.id !== r.id));
                  toast(`Deleted ${r.id}`, "success");
                }}
                className="text-[10px] text-rose-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========== Dispatch tab ===========
function DispatchTab() {
  const [dests, setDests] = useState<Dest[]>(SEED_DESTS);
  const [adding, setAdding] = useState(false);
  const [newKind, setNewKind] = useState<DestKind>("Email");
  const [newName, setNewName] = useState("");
  const [newDest, setNewDest] = useState("");

  function add() {
    if (!newDest.trim() || !newName.trim()) return;
    const id = `D-${String(dests.length + 1).padStart(2, "0")}`;
    setDests((cur) => [
      ...cur,
      { id, kind: newKind, name: newName, destination: newDest, onCall: false },
    ]);
    setNewDest("");
    setNewName("");
    setAdding(false);
    toast(`Dispatch route ${id} added`);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Who gets the message — site supers, foremen, procurement leads, vendor
          reps.
        </div>
        <button
          aria-label="Add dispatch route"
          onClick={() => setAdding(true)}
          className="text-xs bg-violet-600 text-white rounded-md px-3 py-1.5 hover:bg-violet-700"
        >
          + Add route
        </button>
      </div>
      {adding && (
        <div className="bg-white border border-slate-200 rounded-lg p-3 grid grid-cols-4 gap-2 items-end">
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">Kind</span>
            <select
              aria-label="Route kind"
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as DestKind)}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
            >
              {(["Email", "SMS", "Slack", "Field radio"] as DestKind[]).map(
                (k) => (
                  <option key={k}>{k}</option>
                )
              )}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">Name</span>
            <input
              type="text"
              aria-label="Route name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Site supers"
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">
              Destination
            </span>
            <input
              type="text"
              aria-label="Route destination"
              value={newDest}
              onChange={(e) => setNewDest(e.target.value)}
              placeholder={
                newKind === "Email"
                  ? "name@ironworks.co"
                  : newKind === "Slack"
                  ? "#channel-name"
                  : newKind === "SMS"
                  ? "+1 415 555 0100"
                  : "Channel 7 · yard"
              }
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white"
            />
          </label>
          <div className="flex gap-2">
            <button
              aria-label="Save dispatch route"
              onClick={add}
              disabled={!newDest.trim() || !newName.trim()}
              className="text-xs bg-emerald-600 text-white rounded px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-40"
            >
              Save
            </button>
            <button
              aria-label="Cancel adding route"
              onClick={() => {
                setAdding(false);
                setNewDest("");
                setNewName("");
              }}
              className="text-xs text-slate-600 hover:bg-slate-50 rounded px-2 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 text-left w-12"></th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Kind</th>
              <th className="px-3 py-2 text-left">Destination</th>
              <th className="px-3 py-2 text-left">On-call</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {dests.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 text-lg text-center">
                  {destIcon[c.kind]}
                </td>
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2">{c.kind}</td>
                <td className="px-3 py-2 font-mono text-[11px]">
                  {c.destination}
                </td>
                <td className="px-3 py-2">
                  <button
                    role="switch"
                    aria-checked={c.onCall}
                    aria-label={`Toggle on-call for ${c.name}`}
                    onClick={() =>
                      setDests((cur) =>
                        cur.map((x) =>
                          x.id === c.id ? { ...x, onCall: !x.onCall } : x
                        )
                      )
                    }
                    className={`w-9 h-5 rounded-full relative ${
                      c.onCall ? "bg-amber-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 ${c.onCall ? "left-5" : "left-0.5"} w-4 h-4 bg-white rounded-full transition-all`}
                    />
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    aria-label={`Test route ${c.name}`}
                    onClick={() => toast(`Test ping sent to ${c.destination}`)}
                    className="text-[10px] text-sky-600 hover:underline mr-2"
                  >
                    Test
                  </button>
                  <button
                    aria-label={`Remove route ${c.name}`}
                    onClick={() => {
                      setDests((cur) => cur.filter((x) => x.id !== c.id));
                      toast(`Removed ${c.id}`, "success");
                    }}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =========== Approvals tab ===========
function ApprovalsTab() {
  const [approvals, setApprovals] = useState<Approval[]>(SEED_APPROVALS);
  const [filter, setFilter] = useState<string>("All");

  const filtered = approvals.filter(
    (a) => filter === "All" || a.kind === filter
  );

  function decide(id: string, decision: "approved" | "rejected" | "info") {
    const a = approvals.find((x) => x.id === id);
    setApprovals((cur) => cur.filter((x) => x.id !== id));
    if (a) {
      if (decision === "approved")
        toast(`Approved ${a.id} · ${a.subject}`, "success");
      else if (decision === "rejected")
        toast(`Rejected ${a.id}`, "error");
      else toast(`Requested more info on ${a.id}`);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Pending sign-offs across active projects.{" "}
          <span className="font-medium text-rose-600">
            {approvals.filter((a) => a.ageDays >= 3).length} aging ≥ 3d
          </span>
        </div>
        <select
          aria-label="Filter approvals by kind"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
        >
          <option>All</option>
          {["Purchase Order", "Change Order", "RFI", "Submittal"].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 text-left">Kind</th>
              <th className="px-3 py-2 text-left">Subject</th>
              <th className="px-3 py-2 text-left">Project</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-left">Requester</th>
              <th className="px-3 py-2 text-right">Age</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${approvalTone[a.kind]}`}
                  >
                    {a.kind}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{a.subject}</div>
                  <div className="text-[10px] text-slate-400">{a.id}</div>
                </td>
                <td className="px-3 py-2 text-slate-600">{a.project}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {fmtAmt(a.amount)}
                </td>
                <td className="px-3 py-2">{a.requester}</td>
                <td
                  className={`px-3 py-2 text-right font-mono ${
                    a.ageDays >= 5
                      ? "text-rose-700"
                      : a.ageDays >= 3
                      ? "text-amber-700"
                      : "text-slate-500"
                  }`}
                >
                  {a.ageDays}d
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    aria-label={`Approve ${a.id}`}
                    onClick={() => decide(a.id, "approved")}
                    className="text-[10px] text-emerald-700 hover:underline mr-2"
                  >
                    Approve
                  </button>
                  <button
                    aria-label={`Request more info on ${a.id}`}
                    onClick={() => decide(a.id, "info")}
                    className="text-[10px] text-sky-600 hover:underline mr-2"
                  >
                    More info
                  </button>
                  <button
                    aria-label={`Reject ${a.id}`}
                    onClick={() => decide(a.id, "rejected")}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  Inbox zero — nothing pending.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =========== Watchlist tab ===========
function WatchlistTab() {
  const [snaps, setSnaps] = useState<Snapshot[]>(SEED_SNAPSHOTS);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Saved cross-project views you can pin to your home dashboard.
        </div>
        <button
          aria-label="Create new watchlist view"
          onClick={() => {
            const id = `S-${snaps.length + 1}`;
            setSnaps((cur) => [
              {
                id,
                name: "Untitled view",
                description: "Edit to add a description",
                filters: "",
                shared: false,
              },
              ...cur,
            ]);
            toast(`Watchlist ${id} added`);
          }}
          className="text-xs bg-violet-600 text-white rounded-md px-3 py-1.5 hover:bg-violet-700"
        >
          + Save view
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {snaps.map((s) => (
          <div
            key={s.id}
            className="bg-white border border-slate-200 rounded-lg p-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="text-[10px] text-slate-400">{s.id}</div>
              </div>
              {s.shared && (
                <span className="text-[10px] bg-violet-100 text-violet-700 rounded px-1.5 py-0.5">
                  shared
                </span>
              )}
            </div>
            <div className="text-xs text-slate-600 mt-1">{s.description}</div>
            <div className="text-[10px] font-mono text-slate-400 mt-2 bg-slate-50 rounded p-1.5 break-all">
              {s.filters || "—"}
            </div>
            <div className="flex justify-between items-center mt-3">
              <button
                aria-label={`Apply watchlist ${s.name}`}
                onClick={() => toast(`Applied "${s.name}"`)}
                className="text-[10px] text-sky-600 hover:underline"
              >
                Apply
              </button>
              <div className="flex gap-2">
                <button
                  aria-label={`Toggle sharing for ${s.name}`}
                  onClick={() =>
                    setSnaps((cur) =>
                      cur.map((x) =>
                        x.id === s.id ? { ...x, shared: !x.shared } : x
                      )
                    )
                  }
                  className="text-[10px] text-slate-600 hover:underline"
                >
                  {s.shared ? "Unshare" : "Share"}
                </button>
                <button
                  aria-label={`Delete watchlist ${s.name}`}
                  onClick={() => {
                    setSnaps((cur) => cur.filter((x) => x.id !== s.id));
                    toast(`Deleted ${s.id}`, "success");
                  }}
                  className="text-[10px] text-rose-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
