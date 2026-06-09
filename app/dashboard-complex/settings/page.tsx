"use client";

import { useState } from "react";
import { toast } from "@/components/Toast";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "notifications", label: "Notifications" },
  { id: "appearance", label: "Appearance" },
  { id: "automation", label: "Automation" },
  { id: "danger", label: "Danger zone" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function Settings() {
  const [tab, setTab] = useState<TabId>("profile");

  // profile
  const [firstName, setFirstName] = useState("Sarah");
  const [lastName, setLastName] = useState("Chen");
  const [email, setEmail] = useState("sarah.chen@lumen.io");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("https://lumen.io/sarah");
  const [birthday, setBirthday] = useState("1991-04-12");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [bio, setBio] = useState(
    "Sr. AE covering AMER West. Closed $4.8M ARR FY26."
  );
  const [territory, setTerritory] = useState("AMER-West");
  const [language, setLanguage] = useState("en-US");

  // notifications
  const [emailDealUpdates, setEmailDealUpdates] = useState(true);
  const [emailWeeklyDigest, setEmailWeeklyDigest] = useState(true);
  const [emailMentions, setEmailMentions] = useState(false);
  const [pushUrgent, setPushUrgent] = useState(true);
  const [pushAll, setPushAll] = useState(false);
  const [digestDay, setDigestDay] = useState("monday");
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [escalationThreshold, setEscalationThreshold] = useState(50000);

  // appearance
  const [accent, setAccent] = useState("#0ea5e9");
  const [density, setDensity] = useState<"compact" | "comfortable" | "spacious">(
    "comfortable"
  );
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [showAvatars, setShowAvatars] = useState(true);
  const [animations, setAnimations] = useState(true);

  // automation
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [autoDisqualifyDays, setAutoDisqualifyDays] = useState(30);
  const [signature, setSignature] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // danger
  const [confirmDelete, setConfirmDelete] = useState("");

  function save() {
    setSavedAt(new Date().toLocaleTimeString());
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-xs text-slate-500">
            Personal preferences for your Lumen CRM workspace.
          </p>
        </div>
        {savedAt && (
          <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
            Saved at {savedAt}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex border-b border-slate-200 mb-4"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              aria-label={`${t.label} settings`}
              onClick={() => setTab(t.id)}
              className={`text-xs px-3 py-2 border-b-2 -mb-px ${
                active
                  ? "border-sky-500 text-sky-700 font-medium"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "profile" && (
        <div className="grid grid-cols-2 gap-6 max-w-3xl">
          <Field label="First name">
            <input
              type="text"
              aria-label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Last name">
            <input
              type="text"
              aria-label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Work email">
            <input
              type="email"
              aria-label="Work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Mobile phone">
            <input
              type="tel"
              aria-label="Mobile phone"
              placeholder="+1 415 555 0100"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Website">
            <input
              type="url"
              aria-label="Website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Birthday">
            <input
              type="date"
              aria-label="Birthday"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Default shift start (local)">
            <input
              type="time"
              aria-label="Default shift start"
              value={shiftStart}
              onChange={(e) => setShiftStart(e.target.value)}
              className={input}
            />
          </Field>
          <Field label="Territory">
            <select
              aria-label="Territory"
              value={territory}
              onChange={(e) => setTerritory(e.target.value)}
              className={input}
            >
              {[
                "AMER-West",
                "AMER-East",
                "AMER-Central",
                "EMEA-North",
                "EMEA-South",
                "APAC",
                "LATAM",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Display language">
            <select
              aria-label="Display language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={input}
            >
              {[
                { v: "en-US", t: "English (US)" },
                { v: "en-GB", t: "English (UK)" },
                { v: "es-ES", t: "Español" },
                { v: "fr-FR", t: "Français" },
                { v: "de-DE", t: "Deutsch" },
                { v: "ja-JP", t: "日本語" },
              ].map((l) => (
                <option key={l.v} value={l.v}>
                  {l.t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Time zone (datalist combobox)">
            <input
              type="text"
              aria-label="Time zone"
              list="tz-options"
              defaultValue="America/Los_Angeles"
              className={input}
            />
            <datalist id="tz-options">
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
          </Field>
          <div className="col-span-2">
            <Field label="Bio">
              <textarea
                aria-label="Bio"
                value={bio}
                rows={3}
                onChange={(e) => setBio(e.target.value)}
                className={input + " resize-y"}
              />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Profile photo">
              <input
                type="file"
                aria-label="Profile photo"
                accept="image/*"
                className="text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                File inputs can't be auto-populated by browsers; the companion will skip this.
              </p>
            </Field>
          </div>
          <div className="col-span-2 flex justify-end">
            <button
              aria-label="Save profile"
              onClick={save}
              className="bg-sky-600 text-white text-xs rounded px-4 py-2 hover:bg-sky-700"
            >
              Save changes
            </button>
          </div>
        </div>
      )}

      {tab === "notifications" && (
        <div className="space-y-6 max-w-2xl">
          <Section title="Email notifications">
            <Switch
              label="Deal updates"
              checked={emailDealUpdates}
              onChange={setEmailDealUpdates}
            />
            <Switch
              label="Weekly pipeline digest"
              checked={emailWeeklyDigest}
              onChange={setEmailWeeklyDigest}
            />
            <Switch
              label="@ mentions"
              checked={emailMentions}
              onChange={setEmailMentions}
            />
          </Section>
          <Section title="Push notifications">
            <Switch
              label="Urgent only (Commit deals, escalations)"
              checked={pushUrgent}
              onChange={setPushUrgent}
            />
            <Switch
              label="All activity"
              checked={pushAll}
              onChange={setPushAll}
            />
          </Section>
          <Section title="Digest schedule">
            <Field label="Send digest on" inline>
              <div className="flex gap-3 text-xs">
                {["monday", "wednesday", "friday"].map((d) => (
                  <label key={d} className="flex items-center gap-1">
                    <input
                      type="radio"
                      aria-label={`Digest day ${d}`}
                      name="digest-day"
                      value={d}
                      checked={digestDay === d}
                      onChange={() => setDigestDay(d)}
                    />
                    <span className="capitalize">{d}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Quiet hours">
              <div className="flex gap-2 items-center text-xs">
                <input
                  type="time"
                  aria-label="Quiet hours start"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className={input + " w-28"}
                />
                <span className="text-slate-400">→</span>
                <input
                  type="time"
                  aria-label="Quiet hours end"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className={input + " w-28"}
                />
              </div>
            </Field>
            <Field label="Auto-escalate deals above (USD)">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  aria-label="Escalation threshold"
                  min={0}
                  max={500000}
                  step={5000}
                  value={escalationThreshold}
                  onChange={(e) => setEscalationThreshold(Number(e.target.value))}
                  className="flex-1 accent-violet-500"
                />
                <span className="font-mono text-xs w-20 text-right">
                  ${escalationThreshold.toLocaleString()}
                </span>
              </div>
            </Field>
          </Section>
          <div className="flex justify-end">
            <button
              aria-label="Save notifications"
              onClick={save}
              className="bg-sky-600 text-white text-xs rounded px-4 py-2 hover:bg-sky-700"
            >
              Save changes
            </button>
          </div>
        </div>
      )}

      {tab === "appearance" && (
        <div className="space-y-6 max-w-xl">
          <Field label="Accent color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                aria-label="Accent color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="w-12 h-8 border border-slate-200 rounded"
              />
              <span className="font-mono text-xs">{accent}</span>
            </div>
          </Field>
          <Field label="Density">
            <div className="flex gap-2">
              {(["compact", "comfortable", "spacious"] as const).map((d) => {
                const active = density === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDensity(d)}
                    aria-label={`Density ${d}`}
                    aria-pressed={active}
                    className={`text-xs px-3 py-1.5 rounded border ${
                      active
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Theme">
            <div className="flex gap-3 text-xs">
              {(["system", "light", "dark"] as const).map((t) => (
                <label key={t} className="flex items-center gap-1">
                  <input
                    type="radio"
                    aria-label={`Theme ${t}`}
                    name="theme"
                    value={t}
                    checked={theme === t}
                    onChange={() => setTheme(t)}
                  />
                  <span className="capitalize">{t}</span>
                </label>
              ))}
            </div>
          </Field>
          <Switch
            label="Show user avatars in lists"
            checked={showAvatars}
            onChange={setShowAvatars}
          />
          <Switch
            label="Enable interface animations"
            checked={animations}
            onChange={setAnimations}
          />
          <div className="flex justify-end">
            <button
              aria-label="Save appearance"
              onClick={save}
              className="bg-sky-600 text-white text-xs rounded px-4 py-2 hover:bg-sky-700"
            >
              Save changes
            </button>
          </div>
        </div>
      )}

      {tab === "automation" && (
        <div className="space-y-6 max-w-2xl">
          <Switch
            label="Auto-advance deals to next stage on milestone trigger"
            checked={autoAdvance}
            onChange={setAutoAdvance}
          />
          <Field label={`Auto-disqualify stale leads after ${autoDisqualifyDays} days of no engagement`}>
            <input
              type="range"
              aria-label="Auto-disqualify after days"
              min={7}
              max={120}
              step={1}
              value={autoDisqualifyDays}
              onChange={(e) => setAutoDisqualifyDays(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>7 d</span>
              <span>120 d</span>
            </div>
          </Field>
          <Field label="Email signature (rich text)">
            <div
              role="textbox"
              aria-label="Email signature"
              contentEditable
              suppressContentEditableWarning
              onInput={(e) =>
                setSignature((e.currentTarget as HTMLDivElement).innerText)
              }
              className="min-h-[5rem] border border-slate-200 rounded p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-300"
            >
              Sarah Chen · Sr. AE · Lumen CRM · sarah.chen@lumen.io
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {signature.length} characters
            </p>
          </Field>
          <div className="flex justify-end">
            <button
              aria-label="Save automation settings"
              onClick={save}
              className="bg-sky-600 text-white text-xs rounded px-4 py-2 hover:bg-sky-700"
            >
              Save changes
            </button>
          </div>
        </div>
      )}

      {tab === "danger" && (
        <div className="space-y-4 max-w-xl">
          <div className="bg-rose-50 border border-rose-200 rounded-md p-4">
            <div className="text-sm font-semibold text-rose-900">
              Delete workspace
            </div>
            <p className="text-xs text-rose-800 mt-1">
              This permanently deletes all accounts, opportunities, and leads
              owned by this workspace. Cannot be undone.
            </p>
            <Field label='Type "DELETE" to confirm'>
              <input
                type="text"
                aria-label="Type DELETE to confirm"
                value={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.value)}
                className={input}
              />
            </Field>
            <button
              aria-label="Delete workspace permanently"
              disabled={confirmDelete !== "DELETE"}
              onClick={() => {
                toast(
                  "Workspace deletion queued · check email for final confirmation",
                  "error"
                );
                setConfirmDelete("");
              }}
              className="bg-rose-600 text-white text-xs rounded px-4 py-2 hover:bg-rose-700 disabled:opacity-40 mt-2"
            >
              Delete workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const input =
  "w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-sky-300";

function Field({
  label,
  children,
  inline,
}: {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <label
      className={`block ${inline ? "flex items-center gap-3" : ""}`}
    >
      <span className="text-[11px] text-slate-500 block mb-1">{label}</span>
      {children}
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-semibold mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition-colors relative ${
          checked ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 ${
            checked ? "left-5" : "left-0.5"
          } w-4 h-4 bg-white rounded-full transition-all`}
        />
      </button>
    </div>
  );
}
