"use client";

import Link from "next/link";
import { useState } from "react";

type Page = "dashboard" | "shipments" | "carriers" | "team" | "settings";
type ShipmentStep = 0 | 1 | 2 | 3; // 0 = none, 1-3 = wizard steps, then closed

const NAV: { id: Page; label: string; guideId: string }[] = [
  { id: "dashboard", label: "Dashboard", guideId: "nav-dashboard" },
  { id: "shipments", label: "Shipments", guideId: "nav-shipments" },
  { id: "carriers", label: "Carriers", guideId: "nav-carriers" },
  { id: "team", label: "Team", guideId: "nav-team" },
  { id: "settings", label: "Settings", guideId: "nav-settings" },
];

const SEED_SHIPMENTS = [
  { id: "SH-1001", origin: "Mumbai", destination: "Singapore", status: "In transit", carrier: "BlueLine" },
  { id: "SH-1002", origin: "Rotterdam", destination: "New York", status: "Delivered", carrier: "Maersk" },
  { id: "SH-1003", origin: "Shanghai", destination: "Los Angeles", status: "Pending", carrier: "COSCO" },
  { id: "SH-1004", origin: "Hamburg", destination: "Dubai", status: "In transit", carrier: "Hapag" },
  { id: "SH-1005", origin: "Busan", destination: "Sydney", status: "Delayed", carrier: "ONE" },
  { id: "SH-1006", origin: "Antwerp", destination: "Santos", status: "Delivered", carrier: "MSC" },
  { id: "SH-1007", origin: "Jebel Ali", destination: "Mombasa", status: "In transit", carrier: "BlueLine" },
  { id: "SH-1008", origin: "Long Beach", destination: "Tokyo", status: "Pending", carrier: "ONE" },
  { id: "SH-1009", origin: "Felixstowe", destination: "Halifax", status: "Delivered", carrier: "Maersk" },
  { id: "SH-1010", origin: "Tanjung Pelepas", destination: "Colombo", status: "In transit", carrier: "COSCO" },
];

export default function Dashboard() {
  const [page, setPage] = useState<Page>("shipments");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [shipments, setShipments] = useState(SEED_SHIPMENTS);

  // shipment wizard
  const [wizardStep, setWizardStep] = useState<ShipmentStep>(0);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [weight, setWeight] = useState("");
  const [carrier, setCarrier] = useState("");

  // team modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");

  // settings toggles
  const [notif, setNotif] = useState(true);
  const [twoFA, setTwoFA] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  function openWizard() {
    setOrigin(""); setDestination(""); setWeight(""); setCarrier("");
    setWizardStep(1);
  }
  function submitShipment() {
    const nextId = `SH-${1010 + shipments.length + 1 - 10}`;
    setShipments((s) => [
      { id: nextId, origin, destination, status: "Pending", carrier },
      ...s,
    ]);
    setWizardStep(0);
  }

  const filtered =
    statusFilter === "All" ? shipments : shipments.filter((s) => s.status === statusFilter);

  return (
    <div className="flex h-screen">
      {/* sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 p-4 flex flex-col gap-1">
        <div className="text-lg font-semibold mb-4 px-2">Shiplane</div>
        {NAV.map((n) => (
          <button
            key={n.id}
            data-guide-id={n.guideId}
            data-guide-label={`${n.label} nav item`}
            onClick={() => setPage(n.id)}
            className={`text-left px-3 py-2 rounded-md text-sm ${
              page === n.id ? "bg-gray-900 text-white" : "hover:bg-gray-100"
            }`}
          >
            {n.label}
          </button>
        ))}
      </aside>

      {/* main */}
      <main className="flex-1 overflow-auto">
        {/* topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="text-sm text-gray-500 capitalize">{page}</div>
          <div className="flex items-center gap-3">
            <Link
              href="/untagged"
              className="text-xs text-gray-400 hover:text-gray-700 underline"
            >
              /untagged
            </Link>
            <Link
              href="/monitor"
              className="text-xs text-gray-400 hover:text-gray-700 underline"
            >
              /monitor
            </Link>
            <Link
              href="/dashboard-complex"
              className="text-xs text-gray-400 hover:text-gray-700 underline"
            >
              /dashboard-complex
            </Link>
            <input
              data-guide-id="topbar-search"
              data-guide-label="Search box"
              placeholder="Search…"
              className="border border-gray-200 rounded-md px-3 py-1.5 text-sm w-64"
            />
            <div className="w-8 h-8 rounded-full bg-gray-200" />
          </div>
        </header>

        <div className="p-6">
          {page === "dashboard" && (
            <div className="grid grid-cols-3 gap-4">
              {["Active shipments", "On-time %", "Open issues"].map((k, i) => (
                <div key={k} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="text-xs text-gray-500">{k}</div>
                  <div className="text-2xl font-semibold mt-1">{[42, 96, 3][i]}</div>
                </div>
              ))}
            </div>
          )}

          {page === "shipments" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-xl font-semibold">Shipments</h1>
                  <p className="text-sm text-gray-500">Track and manage active shipments.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    data-guide-id="status-filter"
                    data-guide-label="Status filter dropdown"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                  >
                    {["All", "Pending", "In transit", "Delivered", "Delayed"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    data-guide-id="new-shipment-btn"
                    data-guide-label="New Shipment button"
                    onClick={openWizard}
                    className="bg-gray-900 text-white text-sm rounded-md px-4 py-2 hover:bg-gray-800"
                  >
                    + New Shipment
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">ID</th>
                      <th className="px-4 py-2 font-medium">Origin</th>
                      <th className="px-4 py-2 font-medium">Destination</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Carrier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr
                        key={s.id}
                        data-guide-id={`shipment-row-${s.id}`}
                        data-guide-label={`Shipment ${s.id} row`}
                        className="border-t border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-4 py-2 font-medium">{s.id}</td>
                        <td className="px-4 py-2">{s.origin}</td>
                        <td className="px-4 py-2">{s.destination}</td>
                        <td className="px-4 py-2">{s.status}</td>
                        <td className="px-4 py-2">{s.carrier}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {page === "carriers" && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h1 className="text-xl font-semibold mb-2">Carriers</h1>
              <ul className="text-sm divide-y">
                {["BlueLine", "Maersk", "COSCO", "Hapag", "ONE", "MSC"].map((c) => (
                  <li key={c} className="py-2">{c}</li>
                ))}
              </ul>
            </div>
          )}

          {page === "team" && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold">Team</h1>
                <button
                  data-guide-id="invite-teammate-btn"
                  data-guide-label="Invite teammate button"
                  onClick={() => setInviteOpen(true)}
                  className="bg-gray-900 text-white text-sm rounded-md px-4 py-2 hover:bg-gray-800"
                >
                  Invite teammate
                </button>
              </div>
              <ul className="text-sm divide-y">
                {[
                  { name: "Alex Chen", role: "Admin" },
                  { name: "Priya Rao", role: "Member" },
                  { name: "Jonas Weber", role: "Member" },
                ].map((m) => (
                  <li key={m.name} className="py-2 flex justify-between">
                    <span>{m.name}</span>
                    <span className="text-gray-500">{m.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {page === "settings" && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 max-w-lg">
              <h1 className="text-xl font-semibold">Settings</h1>
              <Toggle id="toggle-notif" label="Email notifications" value={notif} onChange={setNotif} />
              <Toggle id="toggle-2fa" label="Two-factor authentication" value={twoFA} onChange={setTwoFA} />
              <Toggle id="toggle-dark" label="Dark mode" value={darkMode} onChange={setDarkMode} />
              <button
                data-guide-id="settings-save-btn"
                data-guide-label="Save settings button"
                className="bg-gray-900 text-white text-sm rounded-md px-4 py-2 hover:bg-gray-800"
              >
                Save changes
              </button>
            </div>
          )}
        </div>
      </main>

      {/* shipment wizard */}
      {wizardStep > 0 && (
        <Modal onClose={() => setWizardStep(0)}>
          <div className="p-6 w-[480px]">
            <div className="text-xs text-gray-500 mb-1">Step {wizardStep} of 3</div>
            <h2 className="text-lg font-semibold mb-4">New shipment</h2>

            {wizardStep === 1 && (
              <div className="space-y-3">
                <Field
                  guideId="shipment-origin-input"
                  label="Origin"
                  value={origin}
                  onChange={setOrigin}
                />
                <Field
                  guideId="shipment-destination-input"
                  label="Destination"
                  value={destination}
                  onChange={setDestination}
                />
                <Field
                  guideId="shipment-weight-input"
                  label="Weight (kg)"
                  value={weight}
                  onChange={setWeight}
                />
                <div className="flex justify-end pt-2">
                  <button
                    data-guide-id="shipment-step1-next-btn"
                    data-guide-label="Next button (step 1)"
                    onClick={() => setWizardStep(2)}
                    className="bg-gray-900 text-white text-sm rounded-md px-4 py-2"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="text-gray-700">Carrier</span>
                  <select
                    data-guide-id="shipment-carrier-select"
                    data-guide-label="Carrier dropdown"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Select a carrier…</option>
                    {["BlueLine", "Maersk", "COSCO", "Hapag", "ONE", "MSC"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <div className="flex justify-between pt-2">
                  <button
                    data-guide-id="shipment-step2-back-btn"
                    data-guide-label="Back button (step 2)"
                    onClick={() => setWizardStep(1)}
                    className="text-sm text-gray-600"
                  >
                    Back
                  </button>
                  <button
                    data-guide-id="shipment-step2-next-btn"
                    data-guide-label="Next button (step 2)"
                    onClick={() => setWizardStep(3)}
                    className="bg-gray-900 text-white text-sm rounded-md px-4 py-2"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-3 text-sm">
                <div className="bg-gray-50 rounded-md p-3 space-y-1">
                  <div><span className="text-gray-500">Origin:</span> {origin || "—"}</div>
                  <div><span className="text-gray-500">Destination:</span> {destination || "—"}</div>
                  <div><span className="text-gray-500">Weight:</span> {weight || "—"} kg</div>
                  <div><span className="text-gray-500">Carrier:</span> {carrier || "—"}</div>
                </div>
                <div className="flex justify-between pt-2">
                  <button
                    data-guide-id="shipment-step3-back-btn"
                    data-guide-label="Back button (step 3)"
                    onClick={() => setWizardStep(2)}
                    className="text-sm text-gray-600"
                  >
                    Back
                  </button>
                  <button
                    data-guide-id="submit-shipment-btn"
                    data-guide-label="Submit shipment button"
                    onClick={submitShipment}
                    className="bg-emerald-600 text-white text-sm rounded-md px-4 py-2"
                  >
                    Create shipment
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* invite modal */}
      {inviteOpen && (
        <Modal onClose={() => setInviteOpen(false)}>
          <div className="p-6 w-[420px] space-y-3">
            <h2 className="text-lg font-semibold">Invite teammate</h2>
            <Field
              guideId="invite-email-input"
              label="Email"
              value={inviteEmail}
              onChange={setInviteEmail}
            />
            <label className="block text-sm">
              <span className="text-gray-700">Role</span>
              <select
                data-guide-id="invite-role-select"
                data-guide-label="Role dropdown"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
              >
                {["Admin", "Member", "Viewer"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setInviteOpen(false)}
                className="text-sm text-gray-600 px-3 py-2"
              >
                Cancel
              </button>
              <button
                data-guide-id="invite-send-btn"
                data-guide-label="Send invite button"
                onClick={() => setInviteOpen(false)}
                className="bg-gray-900 text-white text-sm rounded-md px-4 py-2"
              >
                Send invite
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({
  guideId,
  label,
  value,
  onChange,
}: {
  guideId: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-gray-700">{label}</span>
      <input
        data-guide-id={guideId}
        data-guide-label={`${label} input`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
      />
    </label>
  );
}

function Toggle({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <button
        data-guide-id={id}
        data-guide-label={`${label} toggle`}
        onClick={() => onChange(!value)}
        className={`w-10 h-6 rounded-full transition-colors ${
          value ? "bg-emerald-500" : "bg-gray-300"
        } relative`}
      >
        <span
          className={`absolute top-0.5 ${
            value ? "left-5" : "left-0.5"
          } w-5 h-5 bg-white rounded-full transition-all`}
        />
      </button>
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
