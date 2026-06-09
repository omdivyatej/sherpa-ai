"use client";

import { useState } from "react";
import { toast } from "@/components/Toast";

type Vendor = {
  id: string;
  name: string;
  category: string;
  region: string;
};

type Project = {
  id: string;
  name: string;
  status: "Pre-construction" | "Active" | "Closeout";
  budget: number;
};

type VendorRole =
  | "Primary supplier"
  | "Backup supplier"
  | "Approved vendor"
  | "Subcontractor"
  | "Specialty / lessor"
  | "Material supplier"
  | "Logistics partner";

type Link = {
  id: string;
  vendorId: string;
  projectId: string;
  role: VendorRole;
  reliability: number; // 0-100
  startDate: string;
  notes: string;
  active: boolean;
  certs: ("OSHA-30" | "MSA-on-file" | "insurance-verified")[];
  tags: string[];
};

const VENDORS: Vendor[] = [
  { id: "V-101", name: "Granite Steel Co.", category: "Structural steel", region: "Midwest" },
  { id: "V-102", name: "Pacific Concrete Supply", category: "Ready-mix concrete", region: "West" },
  { id: "V-103", name: "Apex Crane & Rigging", category: "Equipment / lift", region: "Northeast" },
  { id: "V-104", name: "Northwind Lumber", category: "Lumber & framing", region: "Pacific NW" },
  { id: "V-105", name: "Cobalt Electrical Wholesale", category: "Electrical materials", region: "South" },
  { id: "V-106", name: "Helix Mechanical", category: "HVAC / mechanical", region: "Midwest" },
  { id: "V-107", name: "Stratus Roofing Systems", category: "Roofing membranes", region: "Southwest" },
  { id: "V-108", name: "Quanta Glazing", category: "Curtainwall & glass", region: "West" },
  { id: "V-109", name: "Beacon Aggregates", category: "Aggregate / fill", region: "Mountain" },
];

const PROJECTS: Project[] = [
  { id: "P-2401", name: "Riverside Medical Tower — Phase 2", status: "Active", budget: 84_500_000 },
  { id: "P-2402", name: "Cedar Crossing Mixed-Use", status: "Active", budget: 42_300_000 },
  { id: "P-2403", name: "Harborline Logistics Hub", status: "Pre-construction", budget: 67_900_000 },
  { id: "P-2404", name: "Foundry District Renovation", status: "Active", budget: 18_700_000 },
  { id: "P-2405", name: "Northgate Substation", status: "Closeout", budget: 9_400_000 },
  { id: "P-2406", name: "Skyline Residences — Tower A", status: "Active", budget: 112_000_000 },
  { id: "P-2407", name: "Atlas Bridge Replacement", status: "Pre-construction", budget: 28_500_000 },
  { id: "P-2408", name: "Helix Biotech Campus — Lab 3", status: "Active", budget: 56_200_000 },
];

const ROLES: VendorRole[] = [
  "Primary supplier",
  "Backup supplier",
  "Approved vendor",
  "Subcontractor",
  "Specialty / lessor",
  "Material supplier",
  "Logistics partner",
];

const ROLE_TONE: Record<VendorRole, string> = {
  "Primary supplier": "bg-emerald-100 text-emerald-700",
  "Backup supplier": "bg-sky-100 text-sky-700",
  "Approved vendor": "bg-violet-100 text-violet-700",
  Subcontractor: "bg-amber-100 text-amber-700",
  "Specialty / lessor": "bg-fuchsia-100 text-fuchsia-700",
  "Material supplier": "bg-slate-200 text-slate-700",
  "Logistics partner": "bg-rose-100 text-rose-700",
};

const SEED_LINKS: Link[] = [
  {
    id: "L-1",
    vendorId: "V-101",
    projectId: "P-2401",
    role: "Primary supplier",
    reliability: 88,
    startDate: "2026-02-14",
    notes: "Tower steel package, sole source.",
    active: true,
    certs: ["MSA-on-file", "insurance-verified"],
    tags: ["structural", "long-lead"],
  },
  {
    id: "L-2",
    vendorId: "V-102",
    projectId: "P-2402",
    role: "Primary supplier",
    reliability: 72,
    startDate: "2026-04-01",
    notes: "Foundation pours through Q3.",
    active: true,
    certs: ["MSA-on-file"],
    tags: ["concrete", "weather-sensitive"],
  },
  {
    id: "L-3",
    vendorId: "V-103",
    projectId: "P-2406",
    role: "Specialty / lessor",
    reliability: 64,
    startDate: "2026-05-20",
    notes: "Tower-crane lease 18 months.",
    active: true,
    certs: ["OSHA-30", "insurance-verified"],
    tags: ["equipment"],
  },
  {
    id: "L-4",
    vendorId: "V-105",
    projectId: "P-2401",
    role: "Subcontractor",
    reliability: 52,
    startDate: "2026-03-08",
    notes: "Patchy track record on prior job. Watch.",
    active: false,
    certs: [],
    tags: ["electrical", "risk"],
  },
];

export default function LinkagesPage() {
  const [links, setLinks] = useState<Link[]>(SEED_LINKS);
  const [selVendor, setSelVendor] = useState<string | null>(null);
  const [selProject, setSelProject] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [vendorSearch, setVendorSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("All");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");
  const [exportOpen, setExportOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());

  const filteredVendors = VENDORS.filter(
    (v) =>
      !vendorSearch ||
      v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.category.toLowerCase().includes(vendorSearch.toLowerCase())
  );
  const filteredProjects = PROJECTS.filter(
    (p) =>
      !projectSearch ||
      p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );
  const filteredLinks = links.filter(
    (l) =>
      (filterRole === "All" || l.role === filterRole) &&
      (filterActive === "all" ||
        (filterActive === "active" && l.active) ||
        (filterActive === "inactive" && !l.active))
  );

  function openCreate() {
    if (!selVendor || !selProject) {
      toast("Pick a vendor and a project first", "error");
      return;
    }
    setCreating(true);
  }
  function createLink(l: Omit<Link, "id">) {
    const id = `L-${links.length + 1}`;
    setLinks((cur) => [{ ...l, id }, ...cur]);
    setSelVendor(null);
    setSelProject(null);
    setCreating(false);
    toast(`Vendor linkage ${id} created`, "success");
  }
  function unlink(id: string) {
    setLinks((cur) => cur.filter((l) => l.id !== id));
    toast(`Removed ${id}`, "success");
  }
  function toggleActive(id: string) {
    setLinks((cur) =>
      cur.map((l) => (l.id === id ? { ...l, active: !l.active } : l))
    );
  }
  function toggleSelected(id: string) {
    setSelectedLinks((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Vendor Linkages</h1>
          <p className="text-xs text-slate-500">
            Assign suppliers and subs to active projects. Track role, reliability,
            and certs in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <details
            className="relative"
            open={exportOpen}
            onToggle={(e) => setExportOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary
              aria-label="Export vendor linkages"
              className="list-none cursor-pointer text-xs border border-slate-200 rounded-md px-3 py-1.5 bg-white hover:bg-slate-50"
            >
              ⇣ Export
            </summary>
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg w-48 z-30 py-1">
              {[
                { label: "Export as Excel (.xlsx)", t: "Excel" },
                { label: "Export as PDF", t: "PDF" },
                { label: "Export as CSV", t: "CSV" },
                { label: "Export as JSON", t: "JSON" },
              ].map((opt) => (
                <button
                  key={opt.t}
                  aria-label={opt.label}
                  onClick={() => {
                    toast(`${opt.t} export queued (${filteredLinks.length} rows)`, "success");
                    setExportOpen(false);
                  }}
                  className="w-full text-left text-xs px-3 py-1.5 hover:bg-slate-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </details>
          <button
            aria-label="Import vendor list from CSV"
            onClick={() => toast("Choose a vendor CSV to import (demo)")}
            className="text-xs border border-slate-200 rounded-md px-3 py-1.5 hover:bg-slate-50"
          >
            ⇡ Import
          </button>
          <button
            aria-label="Refresh linkages"
            onClick={() => toast("Refreshed")}
            className="text-xs border border-slate-200 rounded-md px-3 py-1.5 hover:bg-slate-50"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Two-column linking workspace */}
      <div className="grid grid-cols-2 gap-4">
        {/* Vendors */}
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Vendors</div>
            <span className="text-[10px] text-slate-400">
              {filteredVendors.length} / {VENDORS.length}
            </span>
          </div>
          <input
            type="search"
            aria-label="Search vendors"
            placeholder="Search vendors or category…"
            value={vendorSearch}
            onChange={(e) => setVendorSearch(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white mb-2"
          />
          <ul className="divide-y divide-slate-100 max-h-72 overflow-auto">
            {filteredVendors.map((v) => {
              const isSelected = selVendor === v.id;
              return (
                <li key={v.id}>
                  <button
                    aria-label={`Select vendor ${v.name}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelVendor(isSelected ? null : v.id)}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-50 ${
                      isSelected ? "bg-violet-50 ring-1 ring-violet-300" : ""
                    }`}
                  >
                    <div className="font-medium">{v.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {v.category} · {v.region}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Projects */}
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Projects</div>
            <span className="text-[10px] text-slate-400">
              {filteredProjects.length} / {PROJECTS.length}
            </span>
          </div>
          <input
            type="search"
            aria-label="Search projects"
            placeholder="Search projects…"
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white mb-2"
          />
          <ul className="divide-y divide-slate-100 max-h-72 overflow-auto">
            {filteredProjects.map((p) => {
              const isSelected = selProject === p.id;
              return (
                <li key={p.id}>
                  <button
                    aria-label={`Select project ${p.name}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelProject(isSelected ? null : p.id)}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-50 ${
                      isSelected ? "bg-sky-50 ring-1 ring-sky-300" : ""
                    }`}
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {p.status} · ${(p.budget / 1_000_000).toFixed(1)}M
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Selection / Link action bar */}
      <div className="bg-gradient-to-r from-violet-50 via-white to-sky-50 border border-slate-200 rounded-md px-3 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-500">Selection:</span>
          <span className={selVendor ? "font-medium" : "text-slate-400 italic"}>
            {selVendor
              ? VENDORS.find((v) => v.id === selVendor)?.name
              : "pick a vendor"}
          </span>
          <span className="text-slate-400">⇄</span>
          <span className={selProject ? "font-medium" : "text-slate-400 italic"}>
            {selProject
              ? PROJECTS.find((p) => p.id === selProject)?.name
              : "pick a project"}
          </span>
        </div>
        <button
          aria-label="Assign selected vendor to selected project"
          onClick={openCreate}
          disabled={!selVendor || !selProject}
          className="bg-gradient-to-r from-violet-600 to-sky-600 text-white text-xs rounded-md px-4 py-1.5 hover:opacity-90 disabled:opacity-40"
        >
          + Assign vendor
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <select
          aria-label="Filter linkages by role"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white"
        >
          <option>All</option>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <div role="tablist" className="flex border border-slate-200 rounded-md overflow-hidden text-xs bg-white">
          {(["all", "active", "inactive"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={filterActive === v}
              aria-label={`Show ${v} linkages`}
              onClick={() => setFilterActive(v)}
              className={`px-3 py-1.5 ${
                filterActive === v ? "bg-slate-900 text-white" : "hover:bg-slate-50"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-xs text-slate-500">
          <input
            type="checkbox"
            aria-label="Compact table density"
            checked={density === "compact"}
            onChange={(e) =>
              setDensity(e.target.checked ? "compact" : "comfortable")
            }
          />
          Compact
        </label>
        {selectedLinks.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {selectedLinks.size} selected
            </span>
            <button
              aria-label="Bulk unlink selected"
              onClick={() => {
                const ids = Array.from(selectedLinks);
                setLinks((cur) => cur.filter((l) => !selectedLinks.has(l.id)));
                setSelectedLinks(new Set());
                toast(`Unassigned ${ids.length}`, "success");
              }}
              className="text-xs border border-rose-200 bg-rose-50 text-rose-700 rounded px-3 py-1 hover:bg-rose-100"
            >
              Bulk unassign
            </button>
            <button
              aria-label="Bulk export selected"
              onClick={() =>
                toast(`Exporting ${selectedLinks.size} selected linkages`, "success")
              }
              className="text-xs border border-slate-200 rounded px-3 py-1 hover:bg-slate-50"
            >
              Export selected
            </button>
          </div>
        )}
      </div>

      {/* Existing links table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  aria-label="Select all linkages"
                  checked={
                    filteredLinks.length > 0 &&
                    selectedLinks.size === filteredLinks.length
                  }
                  onChange={() => {
                    if (selectedLinks.size === filteredLinks.length)
                      setSelectedLinks(new Set());
                    else
                      setSelectedLinks(new Set(filteredLinks.map((l) => l.id)));
                  }}
                />
              </th>
              <th className="px-3 py-2 text-left">Vendor</th>
              <th className="px-3 py-2 text-left">Project</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Reliability</th>
              <th className="px-3 py-2 text-left">Start</th>
              <th className="px-3 py-2 text-left">Tags</th>
              <th className="px-3 py-2 text-left">Active</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredLinks.map((l) => {
              const v = VENDORS.find((x) => x.id === l.vendorId);
              const p = PROJECTS.find((x) => x.id === l.projectId);
              const py = density === "compact" ? "py-1" : "py-2";
              return (
                <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className={`px-3 ${py}`}>
                    <input
                      type="checkbox"
                      aria-label={`Select linkage ${l.id}`}
                      checked={selectedLinks.has(l.id)}
                      onChange={() => toggleSelected(l.id)}
                    />
                  </td>
                  <td className={`px-3 ${py}`}>
                    <div className="font-medium">{v?.name ?? l.vendorId}</div>
                    <div className="text-[10px] text-slate-400">{v?.category}</div>
                  </td>
                  <td className={`px-3 ${py}`}>{p?.name ?? l.projectId}</td>
                  <td className={`px-3 ${py}`}>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${ROLE_TONE[l.role]}`}
                    >
                      {l.role}
                    </span>
                  </td>
                  <td className={`px-3 ${py} w-32`}>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 bg-slate-100 rounded">
                        <div
                          className={`h-1.5 rounded ${
                            l.reliability >= 70
                              ? "bg-emerald-500"
                              : l.reliability >= 40
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${l.reliability}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] w-6 text-right">
                        {l.reliability}
                      </span>
                    </div>
                  </td>
                  <td className={`px-3 ${py} text-slate-500`}>{l.startDate}</td>
                  <td className={`px-3 ${py}`}>
                    <div className="flex gap-1 flex-wrap">
                      {l.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={`px-3 ${py}`}>
                    <button
                      role="switch"
                      aria-checked={l.active}
                      aria-label={`Toggle active status for ${l.id}`}
                      onClick={() => toggleActive(l.id)}
                      className={`w-9 h-5 rounded-full relative ${
                        l.active ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 ${l.active ? "left-5" : "left-0.5"} w-4 h-4 bg-white rounded-full transition-all`}
                      />
                    </button>
                  </td>
                  <td className={`px-3 ${py} text-right`}>
                    <button
                      aria-label={`Edit linkage ${l.id}`}
                      onClick={() => setEditing(l.id)}
                      className="text-[10px] text-sky-600 hover:underline mr-2"
                    >
                      Edit
                    </button>
                    <button
                      aria-label={`Unassign ${l.id}`}
                      onClick={() => unlink(l.id)}
                      className="text-[10px] text-rose-600 hover:underline"
                    >
                      Unassign
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredLinks.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-slate-400">
                  No linkages match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && selVendor && selProject && (
        <LinkModal
          vendor={VENDORS.find((v) => v.id === selVendor)!}
          project={PROJECTS.find((p) => p.id === selProject)!}
          onClose={() => setCreating(false)}
          onSave={createLink}
        />
      )}
      {editing && (
        <LinkModal
          vendor={
            VENDORS.find(
              (v) => v.id === links.find((l) => l.id === editing)!.vendorId
            )!
          }
          project={
            PROJECTS.find(
              (p) => p.id === links.find((l) => l.id === editing)!.projectId
            )!
          }
          existing={links.find((l) => l.id === editing)!}
          onClose={() => setEditing(null)}
          onSave={(updated) => {
            setLinks((cur) =>
              cur.map((l) =>
                l.id === editing
                  ? { ...l, ...updated }
                  : l
              )
            );
            setEditing(null);
            toast("Linkage updated", "success");
          }}
        />
      )}

      <ChatHelp open={chatOpen} setOpen={setChatOpen} />
    </div>
  );
}

function LinkModal({
  vendor,
  project,
  existing,
  onClose,
  onSave,
}: {
  vendor: Vendor;
  project: Project;
  existing?: Link;
  onClose: () => void;
  onSave: (l: Omit<Link, "id">) => void;
}) {
  const [role, setRole] = useState<VendorRole>(
    existing?.role ?? "Primary supplier"
  );
  const [reliability, setReliability] = useState(existing?.reliability ?? 60);
  const [startDate, setStartDate] = useState(
    existing?.startDate ?? new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [active, setActive] = useState(existing?.active ?? true);
  const [certs, setCerts] = useState<Link["certs"]>(existing?.certs ?? []);
  const [tags, setTags] = useState<string>((existing?.tags ?? []).join(", "));

  const toggleCert = (c: Link["certs"][number]) =>
    setCerts((cur) =>
      cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]
    );

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
          <h2 className="text-sm font-semibold">
            {existing ? "Edit vendor linkage" : "Assign vendor to project"}
          </h2>
          <p className="text-[11px] text-slate-500 mt-1">
            <span className="font-medium">{vendor.name}</span> · {vendor.category}
            <span className="text-slate-400 mx-1">⇄</span>
            <span className="font-medium">{project.name}</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">Role</span>
            <select
              aria-label="Vendor role on project"
              value={role}
              onChange={(e) => setRole(e.target.value as VendorRole)}
              className={cls}
            >
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-500 block mb-1">
              Start date
            </span>
            <input
              type="date"
              aria-label="Engagement start date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={cls}
            />
          </label>
          <label className="block col-span-2">
            <span className="text-[11px] text-slate-500 block mb-1">
              Reliability score ({reliability}%)
            </span>
            <input
              type="range"
              aria-label="Vendor reliability score"
              min={0}
              max={100}
              step={1}
              value={reliability}
              onChange={(e) => setReliability(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
          </label>
          <div className="col-span-2">
            <div className="text-[11px] text-slate-500 mb-1">
              Certifications on file
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                ["OSHA-30", "MSA-on-file", "insurance-verified"] as const
              ).map((c) => (
                <label key={c} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    aria-label={`Cert ${c}`}
                    checked={certs.includes(c)}
                    onChange={() => toggleCert(c)}
                  />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="block col-span-2">
            <span className="text-[11px] text-slate-500 block mb-1">
              Tags (comma-separated)
            </span>
            <input
              type="text"
              aria-label="Tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="structural, long-lead"
              className={cls}
            />
          </label>
          <label className="block col-span-2">
            <span className="text-[11px] text-slate-500 block mb-1">Notes</span>
            <textarea
              aria-label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={cls + " resize-none"}
            />
          </label>
          <label className="flex items-center gap-2 text-xs col-span-2">
            <input
              type="checkbox"
              aria-label="Mark linkage as active"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active
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
            aria-label={existing ? "Save linkage changes" : "Assign vendor"}
            onClick={() =>
              onSave({
                vendorId: vendor.id,
                projectId: project.id,
                role,
                reliability,
                startDate,
                notes,
                active,
                certs,
                tags: tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            className="text-xs bg-gradient-to-r from-violet-600 to-sky-600 text-white rounded px-4 py-1.5 hover:opacity-90"
          >
            {existing ? "Save changes" : "Assign vendor"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- AI help chat (floating, dummy answers) ---

const SUGGESTED: { q: string; a: string }[] = [
  {
    q: "How do I assign a vendor to a project?",
    a: "Select a vendor in the left list and a project in the right list, then click '+ Assign vendor' in the gradient bar. Pick a role (Primary supplier, Subcontractor, etc.), set reliability and certs, save.",
  },
  {
    q: "What does the reliability score mean?",
    a: "A 0–100 estimate based on on-time delivery, defect rate, and PM ratings. Green ≥70 (preferred), amber 40–69 (watch), red <40 (escalate).",
  },
  {
    q: "Can I export only active linkages?",
    a: "Yes — set the active/inactive tab to 'active' first, then choose Export → Excel / PDF / CSV / JSON.",
  },
  {
    q: "What certifications are tracked?",
    a: "OSHA-30 (safety), MSA-on-file (master services agreement), and insurance-verified. Add per-linkage in the modal; the field is multi-select.",
  },
];

function ChatHelp({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    {
      role: "ai",
      text: "Hi! I'm the Linkages assistant. Ask me anything about assigning vendors to projects.",
    },
  ]);
  const [draft, setDraft] = useState("");

  function send(text: string) {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft("");
    setTimeout(() => {
      const match = SUGGESTED.find((s) =>
        text.toLowerCase().includes(s.q.toLowerCase().slice(0, 12))
      );
      const reply =
        match?.a ??
        "Demo reply: I'd normally search your help docs and surface the most relevant answer here.";
      setMessages((m) => [...m, { role: "ai", text: reply }]);
    }, 600);
  }

  return (
    <>
      {!open && (
        <button
          aria-label="Open AI help assistant"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-6 z-30 bg-gradient-to-br from-violet-600 to-sky-600 text-white rounded-full w-12 h-12 shadow-xl hover:shadow-2xl flex items-center justify-center"
          title="Need help?"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M21 12a8 8 0 11-3.5-6.6L21 4l-1.4 3.5A8 8 0 0121 12z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="12" r="1" fill="white" />
            <circle cx="13" cy="12" r="1" fill="white" />
            <circle cx="17" cy="12" r="1" fill="white" />
          </svg>
        </button>
      )}
      {open && (
        <div className="fixed bottom-24 right-6 z-30 w-80 h-[420px] bg-white border border-slate-200 rounded-lg shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-sky-600 text-white px-3 py-2 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold">Linkages assistant</div>
              <div className="text-[10px] opacity-80">Demo · canned answers</div>
            </div>
            <button
              aria-label="Close AI help"
              onClick={() => setOpen(false)}
              className="text-white text-xs hover:opacity-80"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-2 text-xs">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-2 py-1.5 rounded-lg ${
                  m.role === "user"
                    ? "ml-auto bg-sky-100 text-sky-900"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 p-2 space-y-1">
            <div className="flex flex-wrap gap-1">
              {SUGGESTED.map((s, i) => (
                <button
                  key={i}
                  aria-label={`Ask: ${s.q}`}
                  onClick={() => send(s.q)}
                  className="text-[10px] border border-slate-200 rounded-full px-2 py-0.5 hover:bg-slate-50"
                >
                  {s.q}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                aria-label="Ask the assistant a question"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send(draft);
                }}
                placeholder="Ask a question…"
                className="flex-1 text-xs border border-slate-200 rounded px-2 py-1"
              />
              <button
                aria-label="Send message to assistant"
                onClick={() => send(draft)}
                className="text-xs bg-slate-900 text-white rounded px-3 py-1 hover:bg-slate-800"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
