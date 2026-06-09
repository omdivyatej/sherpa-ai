"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/components/Toast";

type Source = "Inbound" | "Outbound" | "Referral" | "Event" | "Partner";
type Status = "New" | "Working" | "Nurturing" | "Disqualified";
type Lead = {
  id: string;
  name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  score: number;
  source: Source;
  status: Status;
  owner: string;
  notes: string;
};

const SEED: Lead[] = [
  { id: "L-9001", name: "Maya Okafor", company: "Helix Bio", title: "VP Clinical", email: "maya@helix.bio", phone: "+1 415 555 0182", score: 92, source: "Inbound", status: "Working", owner: "Jonas Weber", notes: "Asked about FDA validation" },
  { id: "L-9002", name: "Ravi Subramanian", company: "Stratus Banking", title: "Director of Risk", email: "r.sub@stratus.com", phone: "+44 20 7946 0991", score: 81, source: "Referral", status: "Working", owner: "Alex Kim", notes: "Referred by Maersk CIO" },
  { id: "L-9003", name: "Lena Voss", company: "Atlas SaaS", title: "Head of RevOps", email: "lena@atlas.io", phone: "", score: 68, source: "Event", status: "New", owner: "Sarah Chen", notes: "Met at SaaStr 2026" },
  { id: "L-9004", name: "Diego Marin", company: "Nimbus IoT", title: "CTO", email: "diego@nimbus.io", phone: "+34 91 555 0112", score: 45, source: "Outbound", status: "Nurturing", owner: "Priya Rao", notes: "" },
  { id: "L-9005", name: "Kiera Yamamoto", company: "Lattice Retail", title: "VP Digital", email: "k.y@lattice.com", phone: "", score: 28, source: "Partner", status: "Nurturing", owner: "Diego Reyes", notes: "" },
  { id: "L-9006", name: "Aleks Petrov", company: "Pillar Health", title: "CIO", email: "a.petrov@pillarhealth.com", phone: "+1 312 555 0144", score: 76, source: "Inbound", status: "New", owner: "Diego Reyes", notes: "Demo scheduled Thu" },
  { id: "L-9007", name: "Hannah Wei", company: "Quanta Pharma", title: "Sr. Director IT", email: "hannah.wei@quantapharma.com", phone: "+1 617 555 0033", score: 88, source: "Referral", status: "Working", owner: "Priya Rao", notes: "Tracking 3 stakeholders" },
];

const SOURCES: Source[] = ["Inbound", "Outbound", "Referral", "Event", "Partner"];
const STATUSES: Status[] = ["New", "Working", "Nurturing", "Disqualified"];
const OWNERS = ["Sarah Chen", "Jonas Weber", "Priya Rao", "Alex Kim", "Diego Reyes"];

const scoreTone = (s: number) =>
  s >= 80
    ? "bg-emerald-100 text-emerald-700"
    : s >= 60
    ? "bg-amber-100 text-amber-700"
    : "bg-slate-100 text-slate-600";

const statusTone: Record<Status, string> = {
  New: "bg-sky-100 text-sky-700",
  Working: "bg-violet-100 text-violet-700",
  Nurturing: "bg-amber-100 text-amber-700",
  Disqualified: "bg-slate-100 text-slate-500",
};

export default function Leads() {
  const [leads, setLeads] = useState(SEED);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sourceFilter, setSourceFilter] = useState<string>("All");
  const [minScore, setMinScore] = useState(0);
  const [creating, setCreating] = useState(false);
  const params = useSearchParams();

  useEffect(() => {
    if (params?.get("new") === "1") setCreating(true);
  }, [params]);

  const filtered = leads.filter(
    (l) =>
      (statusFilter === "All" || l.status === statusFilter) &&
      (sourceFilter === "All" || l.source === sourceFilter) &&
      l.score >= minScore
  );

  function convert(id: string) {
    const l = leads.find((x) => x.id === id);
    setLeads((ls) => ls.filter((x) => x.id !== id));
    if (l) toast(`Converted ${l.name} → opportunity`, "success");
  }
  function disqualify(id: string) {
    setLeads((ls) =>
      ls.map((l) => (l.id === id ? { ...l, status: "Disqualified" } : l))
    );
  }
  function addLead(l: Omit<Lead, "id">) {
    const id = `L-${9000 + leads.length + 1}`;
    setLeads((cur) => [{ ...l, id }, ...cur]);
    toast(`Lead "${l.name}" created`, "success");
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-xs text-slate-500">
            {filtered.length} of {leads.length} leads · avg score{" "}
            {Math.round(
              leads.reduce((a, b) => a + b.score, 0) / Math.max(leads.length, 1)
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Lead status filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
          >
            {["All", ...STATUSES].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            aria-label="Lead source filter"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
          >
            {["All", ...SOURCES].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <div className="text-xs flex items-center gap-2 border border-slate-200 rounded-md px-2 py-1 bg-white">
            <span className="text-slate-500">Min score</span>
            <input
              type="range"
              aria-label="Minimum lead score"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-24 accent-emerald-500"
            />
            <span className="font-mono text-[10px] w-6 text-right">
              {minScore}
            </span>
          </div>
          <button
            aria-label="Create new lead"
            onClick={() => setCreating(true)}
            className="text-xs bg-emerald-600 text-white rounded-md px-3 py-1.5 hover:bg-emerald-700"
          >
            + New lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {filtered.map((l) => (
          <div
            key={l.id}
            className="bg-white border border-slate-200 rounded-lg p-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold">{l.name}</div>
                <div className="text-[11px] text-slate-500">
                  {l.title} · {l.company}
                </div>
                <a
                  href={`mailto:${l.email}`}
                  aria-label={`Email ${l.name}`}
                  className="text-[11px] text-sky-600 hover:underline"
                >
                  {l.email}
                </a>
              </div>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${scoreTone(l.score)}`}
                title="Lead score"
              >
                {l.score}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${statusTone[l.status]}`}
              >
                {l.status}
              </span>
              <span className="text-[10px] text-slate-400">via {l.source}</span>
              <span className="text-[10px] text-slate-400 ml-auto">{l.owner}</span>
            </div>
            <div className="flex gap-1 mt-3">
              <button
                aria-label={`Convert ${l.name} to opportunity`}
                onClick={() => convert(l.id)}
                className="flex-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-1 hover:bg-emerald-100"
              >
                Convert
              </button>
              <button
                aria-label={`Disqualify ${l.name}`}
                onClick={() => disqualify(l.id)}
                disabled={l.status === "Disqualified"}
                className="flex-1 text-[11px] border border-slate-200 rounded px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
              >
                Disqualify
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center text-sm text-slate-400 py-10">
            No leads match the current filters.
          </div>
        )}
      </div>

      {creating && (
        <NewLeadModal
          onClose={() => setCreating(false)}
          onCreate={(l) => {
            addLead(l);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function NewLeadModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (l: Omit<Lead, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [score, setScore] = useState(50);
  const [source, setSource] = useState<Source>("Inbound");
  const [status, setStatus] = useState<Status>("New");
  const [owner, setOwner] = useState("Sarah Chen");
  const [notes, setNotes] = useState("");

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
        <h2 className="text-sm font-semibold">New lead</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">
              Full name
            </span>
            <input
              type="text"
              aria-label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cls}
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">Company</span>
            <input
              type="text"
              aria-label="Company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={cls}
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">Title</span>
            <input
              type="text"
              aria-label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cls}
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">Email</span>
            <input
              type="email"
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cls}
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">Phone</span>
            <input
              type="tel"
              aria-label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={cls}
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">
              Lead score ({score})
            </span>
            <input
              type="range"
              aria-label="Lead score"
              min={0}
              max={100}
              step={1}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">Source</span>
            <select
              aria-label="Source"
              value={source}
              onChange={(e) => setSource(e.target.value as Source)}
              className={cls}
            >
              {SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">Status</span>
            <select
              aria-label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className={cls}
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block col-span-2">
            <span className="text-[11px] text-slate-500 block mb-1">Owner</span>
            <select
              aria-label="Owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className={cls}
            >
              {OWNERS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="block col-span-2">
            <span className="text-[11px] text-slate-500 block mb-1">Notes</span>
            <textarea
              aria-label="Notes"
              value={notes}
              rows={3}
              onChange={(e) => setNotes(e.target.value)}
              className={cls + " resize-none"}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            aria-label="Cancel lead creation"
            onClick={onClose}
            className="text-xs px-3 py-1.5 text-slate-600 hover:bg-slate-50 rounded"
          >
            Cancel
          </button>
          <button
            aria-label="Create lead"
            disabled={!name.trim() || !company.trim()}
            onClick={() =>
              onCreate({
                name,
                company,
                title,
                email,
                phone,
                score,
                source,
                status,
                owner,
                notes,
              })
            }
            className="text-xs bg-emerald-600 text-white rounded px-4 py-1.5 hover:bg-emerald-700 disabled:opacity-40"
          >
            Create lead
          </button>
        </div>
      </div>
    </div>
  );
}
