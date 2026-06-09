"use client";

import Link from "next/link";
import { useState } from "react";

type Project = { id: string; name: string; owner: string; status: string };

const SEED: Project[] = [
  { id: "p1", name: "Atlas Migration", owner: "Priya", status: "Active" },
  { id: "p2", name: "Beacon Redesign", owner: "Alex", status: "Active" },
  { id: "p3", name: "Cobalt Pricing", owner: "Jonas", status: "Paused" },
  { id: "p4", name: "Delta Onboarding", owner: "Priya", status: "Active" },
];

export default function UntaggedPage() {
  const [projects, setProjects] = useState<Project[]>(SEED);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOwner, setNewOwner] = useState("");

  function createProject() {
    if (!newName.trim()) return;
    setProjects((p) => [
      { id: `p${p.length + 1}`, name: newName, owner: newOwner || "—", status: "Active" },
      ...p,
    ]);
    setNewName("");
    setNewOwner("");
    setCreating(false);
  }
  function remove(id: string) {
    setProjects((p) => p.filter((x) => x.id !== id));
  }
  function archive(id: string) {
    setProjects((p) =>
      p.map((x) => (x.id === id ? { ...x, status: "Archived" } : x))
    );
  }

  const filtered = projects.filter(
    (p) =>
      (filter === "All" || p.status === filter) &&
      (!query || p.name.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to Shiplane
        </Link>
        <div className="text-xs text-gray-400">/untagged · auto-label test page</div>
      </div>

      <h1 className="text-2xl font-semibold">Projects</h1>
      <p className="text-sm text-gray-500 mb-6">
        This page has NO <code>data-guide-id</code> tags. The companion must
        auto-label every element.
      </p>

      <div className="flex items-center gap-2 mb-4">
        <input
          placeholder="Search projects…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm flex-1 bg-white"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
        >
          {["All", "Active", "Paused", "Archived"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => setCreating(true)}
          className="bg-gray-900 text-white text-sm rounded-md px-4 py-2 hover:bg-gray-800"
        >
          + New project
        </button>
        {/* Icon-only button with NO label — should force labelQuality:"none" and trigger vision. */}
        <button
          onClick={() => alert("Mystery action")}
          className="border border-gray-200 rounded-md w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="5" cy="12" r="2" fill="#374151" />
            <circle cx="12" cy="12" r="2" fill="#374151" />
            <circle cx="19" cy="12" r="2" fill="#374151" />
          </svg>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 divide-y">
        {filtered.map((p) => (
          <div key={p.id} className="flex items-center px-4 py-3">
            <div className="flex-1">
              <div className="font-medium text-sm">{p.name}</div>
              <div className="text-xs text-gray-500">
                Owner: {p.owner} · {p.status}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* icon-only buttons WITH aria-label — labelQuality:"good" */}
              <button
                aria-label={`Archive ${p.name}`}
                onClick={() => archive(p.id)}
                title="Archive"
                className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 7h18M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M10 11h4"
                    stroke="#374151"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button
                aria-label={`Delete ${p.name}`}
                onClick={() => remove(p.id)}
                title="Delete"
                className="w-8 h-8 rounded hover:bg-red-50 flex items-center justify-center"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13"
                    stroke="#b91c1c"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-6 text-sm text-gray-400 text-center">
            No projects match.
          </div>
        )}
      </div>

      {creating && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-40"
          onClick={() => setCreating(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 w-[420px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-3">New project</h2>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="text-gray-700">Name</span>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-700">Owner</span>
                <input
                  value={newOwner}
                  onChange={(e) => setNewOwner(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setCreating(false)}
                  className="text-sm text-gray-600 px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={createProject}
                  className="bg-gray-900 text-white text-sm rounded-md px-4 py-2"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
