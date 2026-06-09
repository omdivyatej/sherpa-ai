"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "@/components/Toast";
import { setCompanionContext } from "@/lib/companionContext";

const HOST_CONTEXT = `This is Ironworks — a construction supply chain management platform.

The user is typically a procurement manager, project manager, or operations lead.

What's on the sidebar:
- Overview: KPI dashboard for procurement health (open POs, on-time delivery %, budget burn).
- Procurement Pipeline: kanban of deals/quotes moving from RFQ to PO to Delivered to Paid.
- Projects: list of active construction projects with budget, status, owner.
- Purchase Orders: every PO issued to a vendor, with stage and forecast category.
- RFQs: requests for quote sent to vendors before issuing a PO.
- Budget Forecast: budget vs. actuals per project / per quarter.
- Reports: ad-hoc report builder.
- Vendor Linkages: where vendors get assigned to projects with a role (Primary supplier, Subcontractor, etc.), reliability score, and certs (OSHA-30, MSA-on-file, insurance-verified).
- Studio: power-user operations workbench. Tabs: Alerts (stock/schedule risks), Rules (auto-approval, auto-reorder), Dispatch (notification routes — email/SMS/Slack/field radio), Approvals (pending POs/Change Orders/RFIs/Submittals), Watchlist (saved views).
- Settings: workspace preferences.

Domain terms to interpret correctly:
- "PO" = Purchase Order. "RFQ" = Request for Quote. "Change Order" / "CO" = scope change on an active project. "RFI" = Request for Information. "Submittal" = vendor-provided product specs awaiting approval. "MSA" = Master Service Agreement.
- "Tier" on a project usually refers to vendor tier (Strategic/Enterprise/Mid-Market) when used in a vendor context.
- "Reliability score" on a vendor: 0-100 based on on-time delivery + defects + PM rating. Green ≥70, amber 40-69, red <40.
- When the user says "approve" without specifying, they usually mean the Approvals tab inside Studio.
- When the user says "set an alert" or "notify me when", they mean Studio → Alerts.

Conventions:
- Never advance a PO past Negotiation without a sign-off (the user shouldn't do that without confirming).
- The floating circular gradient button at the bottom-right of the Vendor Linkages page is an AI help chat — users often don't notice it; if they ask "how do I get help" while on that page, point them at that button.
- The "Field radio" dispatch route is async/best-effort; don't suggest it for time-critical alerts.`;

export default function DashboardComplexLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    setCompanionContext(HOST_CONTEXT);
  }, []);
  return <DashboardComplexLayout>{children}</DashboardComplexLayout>;
}

const NAV: { label: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    label: "Procurement",
    items: [
      { href: "/dashboard-complex", label: "Overview", icon: "□" },
      { href: "/dashboard-complex/pipeline", label: "Procurement Pipeline", icon: "▤" },
      { href: "/dashboard-complex/accounts", label: "Projects", icon: "▦" },
      { href: "/dashboard-complex/opportunities", label: "Purchase Orders", icon: "$" },
      { href: "/dashboard-complex/leads", label: "RFQs", icon: "→" },
    ],
  },
  {
    label: "Planning",
    items: [
      { href: "/dashboard-complex/forecasts", label: "Budget Forecast", icon: "↗" },
      { href: "/dashboard-complex/reports", label: "Reports", icon: "▢" },
      { href: "/dashboard-complex/linkages", label: "Vendor Linkages", icon: "⇄" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/dashboard-complex/studio", label: "Studio", icon: "◇" },
    ],
  },
  {
    label: "System",
    items: [{ href: "/dashboard-complex/settings", label: "Settings", icon: "⚙" }],
  },
];

function DashboardComplexLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      <aside className="w-60 bg-slate-900 text-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 via-sky-500 to-emerald-500" />
            <div>
              <div className="text-sm font-semibold leading-none">Ironworks</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Construction Supply · Q2 FY26</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-auto py-2">
          {NAV.map((group) => (
            <div key={group.label} className="px-3 py-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider px-2 mb-1">
                {group.label}
              </div>
              {group.items.map((item) => {
                const active =
                  path === item.href ||
                  (item.href !== "/dashboard-complex" &&
                    path?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={`${item.label} navigation`}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                      active
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span className="w-4 text-center text-slate-500">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500">
          <Link href="/" className="hover:text-slate-300">
            ← Back to Shiplane
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}

function Topbar() {
  const router = useRouter();
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <input
          aria-label="Global search"
          placeholder="Search projects, POs, vendors, RFQs…"
          className="w-80 border border-slate-200 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-300"
        />
        <button
          aria-label="Open command palette"
          onClick={() => toast("Command palette · coming soon")}
          className="text-[10px] text-slate-500 border border-slate-200 rounded px-2 py-1 hover:bg-slate-50"
        >
          ⌘K
        </button>
      </div>
      <div className="flex items-center gap-2">
        <details className="relative">
          <summary
            aria-label="Quick create menu"
            className="list-none cursor-pointer text-xs bg-gradient-to-r from-violet-600 to-sky-600 text-white rounded-md px-3 py-1.5 hover:opacity-90"
          >
            + New
          </summary>
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg w-48 z-50 py-1">
            {[
              { label: "Project", to: "/dashboard-complex/accounts?new=1" },
              { label: "Purchase Order", to: "/dashboard-complex/opportunities?new=1" },
              { label: "RFQ", to: "/dashboard-complex/leads?new=1" },
              { label: "Report", to: "/dashboard-complex/reports" },
            ].map((it) => (
              <button
                key={it.label}
                aria-label={`Create new ${it.label.toLowerCase()}`}
                onClick={() => router.push(it.to)}
                className="w-full text-left text-xs px-3 py-1.5 hover:bg-slate-50"
              >
                New {it.label}
              </button>
            ))}
          </div>
        </details>

        <details className="relative">
          <summary
            aria-label="Notifications (3 unread)"
            className="list-none cursor-pointer relative w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 8a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9zM10 19a2 2 0 004 0"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] flex items-center justify-center">
              3
            </span>
          </summary>
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg w-80 z-50">
            <div className="px-3 py-2 text-xs font-semibold border-b border-slate-100">
              Notifications
            </div>
            <ul className="text-xs divide-y divide-slate-100">
              {[
                { tone: "amber", who: "Priya Rao", text: "advanced Acme Renewal to Negotiation" },
                { tone: "rose", who: "System", text: "Beacon Industries marked Closed Lost" },
                { tone: "emerald", who: "Sarah Chen", text: "closed Northwind — $312K" },
              ].map((n, i) => (
                <li key={i} className="px-3 py-2 flex items-start gap-2">
                  <span
                    className="mt-1 w-2 h-2 rounded-full"
                    style={{
                      background:
                        n.tone === "amber"
                          ? "#f59e0b"
                          : n.tone === "rose"
                          ? "#f43f5e"
                          : "#10b981",
                    }}
                  />
                  <div>
                    <span className="font-medium">{n.who}</span>{" "}
                    <span className="text-slate-600">{n.text}</span>
                  </div>
                </li>
              ))}
            </ul>
            <button
              aria-label="Mark all notifications read"
              onClick={() => toast("All notifications marked read", "success")}
              className="w-full text-[11px] text-sky-600 hover:bg-slate-50 py-1.5 border-t border-slate-100"
            >
              Mark all read
            </button>
          </div>
        </details>

        <details className="relative">
          <summary
            aria-label="User menu — Sarah Chen"
            className="list-none cursor-pointer flex items-center gap-2 text-xs hover:bg-slate-50 rounded-md px-2 py-1"
          >
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 via-rose-500 to-amber-400" />
            <div className="text-left leading-tight">
              <div>Sarah Chen</div>
              <div className="text-[10px] text-slate-500">Sr. AE · West</div>
            </div>
          </summary>
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg w-48 z-50 py-1">
            <Link
              href="/dashboard-complex/settings"
              aria-label="Open profile settings"
              className="block text-xs px-3 py-1.5 hover:bg-slate-50"
            >
              Profile & settings
            </Link>
            <button
              aria-label="Switch workspace"
              onClick={() => toast("Switch workspace · only 1 workspace available")}
              className="w-full text-left text-xs px-3 py-1.5 hover:bg-slate-50"
            >
              Switch workspace
            </button>
            <button
              aria-label="View keyboard shortcuts"
              onClick={() => toast("Shortcuts cheatsheet · coming soon")}
              className="w-full text-left text-xs px-3 py-1.5 hover:bg-slate-50"
            >
              Keyboard shortcuts
            </button>
            <div className="border-t border-slate-100 my-1" />
            <button
              aria-label="Sign out"
              onClick={() => toast("Signed out (demo)", "info")}
              className="w-full text-left text-xs px-3 py-1.5 text-rose-600 hover:bg-rose-50"
            >
              Sign out
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}
