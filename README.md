# sherpa-ai

**An AI cursor that walks your users through your product, in plain English, on any page.**

<p align="center">
  <a href="https://www.npmjs.com/package/sherpa-ai">npm</a> ·
  <a href="https://github.com/omdivyatej/sherpa-ai">github</a> ·
  <a href="https://github.com/omdivyatej/sherpa-ai/issues">issues</a>
</p>

<p align="center">
  <img src="https://cdn.jsdelivr.net/npm/sherpa-ai@latest/companion-ai.png" alt="sherpa-ai panel" width="520" />
</p>

Right-click anywhere in your app → type *"create a new project and invite the team"* → an animated cursor flies to each element, one step at a time, with a short caption. Two modes per task: **Teach me** (highlight, you click) or **Do it for me** (the cursor clicks through autonomously, fills inputs, the works).

No tour authoring. No `data-tour-step="1"` tags. The AI reads your live DOM and figures out the path.

---

## Install — 3 steps

You'll need an Anthropic API key from https://console.anthropic.com/settings/keys. Your key lives only on **your** server. It is never sent to the browser.

### 1. Install + set your key

```bash
npm install sherpa-ai
```

Add your key to your server env (`.env.local` for Next.js dev, or your host's env panel in production):

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Add one proxy route

```ts
// app/api/sherpa-proxy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { handleSherpaRequest } from "sherpa-ai/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  body.anthropicKey = process.env.ANTHROPIC_API_KEY;
  return NextResponse.json(await handleSherpaRequest(body));
}
```

### 3. Drop the component into your root layout

```tsx
// app/layout.tsx
import { Companion } from "sherpa-ai";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Companion
          endpoint="/api/sherpa-proxy"
          context="My app does X. Reports tab is at the top. Export = the toolbar Download button."
        />
      </body>
    </html>
  );
}
```

That's it. Root layout = every page, so Sherpa is now live on `/`, `/leads`, `/anything` — including routes you add tomorrow.

Two files. The proxy is also where you'd add auth / rate limits / per-user quotas later if you want.

---

## Why your users love it

- **No more "where is X?"** — they ask in their own words; the cursor takes them there.
- **Two ways to learn:** "guide me" preserves agency for users who want to know how, "do it for me" runs the whole task for users who just want done.
- **Adapts to the current screen.** Pre-canned product tours break the moment you move a button. This doesn't — it reads the live page every step.
- **Always available, never in the way.** No "?" icon to discover. Right-click anywhere, including on the exact element they're confused about, and the panel pops at the cursor.
- **Works on the actual UI, not a fake overlay.** The cursor moves *your real DOM*; nothing rebuilt, nothing simulated.
- **Confidence > correctness.** When the AI isn't sure, it says so and stops. It never guesses an action that could lose data.

## Why developers love it

- **One component, one route.** The whole integration is the snippet above. No SDK initialization, no auth flow, no SaaS account.
- **Auto-labeling.** Works on existing apps without modifying a single component. No `data-tour-id` litter required.
- **No SaaS lock-in.** Sherpa is an OSS library + your own backend. Your data stays yours; your analytics stay yours.
- **Built-in analytics that actually answer "where are users stuck?"** — see below.
- **Open source, MIT.** Fork it. Rebrand it. The cursor PNG and panel styles are easy to swap.

## Quick start, other stacks

### Vite / CRA

```tsx
import { Companion } from "sherpa-ai";

<Companion endpoint="/api/sherpa-proxy" context="..." />
```

### Vanilla JS

```ts
import { mountCompanion } from "sherpa-ai";

mountCompanion({
  endpoint: "/api/sherpa-proxy",
  context: "...",
});
```

### Plain HTML page (no React, no bundler)

```html
<script
  src="https://cdn.jsdelivr.net/npm/sherpa-ai@latest/dist/companion.js"
  data-endpoint="/api/sherpa-proxy"
  data-context="..."
></script>
```

The companion expects a server route at the URL you pass to `endpoint`. The full reference proxy implementation is in [the source repo](#how-it-works).

---

## Configuration

Identical surface across all three mount styles — props for `<Companion>`, options for `mountCompanion()`, `data-*` attributes for the script tag.

| Option | Required | What it does |
|---|---|---|
| `endpoint` / `data-endpoint` | **Yes (production)** | URL of your server proxy. The companion POSTs every step here; your server holds the Anthropic key and forwards to Anthropic. |
| `context` / `data-context` | Strongly recommended | Plain-English description of your app. Pages, terminology, conventions, edge cases. The AI uses this to sound like it actually knows your product. |
| `analyticsEndpoint` / `data-analytics-endpoint` | Optional | URL on your domain that the companion POSTs the full task transcript to when a goal ends. |
| `onAnalytics` (React only) | Optional | Callback invoked with the full transcript per task. Pipe through your existing analytics SDK. |
| `anthropicKey` / `data-anthropic-key` | **Dev / playground only** | See ["Playground mode"](#playground-mode) below. ⚠️ Putting your key in the browser is unsafe outside of local dev. |

---

## Analytics — see exactly where your users get stuck

Most product analytics tell you which buttons were clicked. **This tells you what users *tried to do but couldn't*.** Every goal a user types in is a labeled signal: this is what they wanted, this is whether your UI made it possible.

When a task ends — completed, gave up (the AI couldn't help), or user-cancelled — the companion sends one POST with the full transcript:

```jsonc
{
  "type": "goal_finished",
  "goal": "export this report as PDF",         // what the user asked for, verbatim
  "outcome": "punted",                         // done | punted | stopped
  "mode": "auto",
  "path": "/reports/weekly",
  "startedAt": 1717398421000,
  "finishedAt": 1717398430500,
  "durationMs": 9500,
  "totalSteps": 3,
  "totalLatencyMs": 6800,
  "steps": [
    { "step": 1, "pointedAt": "auto-12", "said": "Open the export menu.", "value": null,
      "done": false, "latencyMs": 1200, "model": "claude-haiku-4-5-20251001",
      "usedVision": false, "elementsCount": 32, "ts": 1717398422500 }
    // ...
  ]
}
```

### What this lets you answer

| Question | How |
|---|---|
| **What do users actually want to do?** | Frequency-count `goal` text. Top-asked goals = the unlabeled jobs your product has to do better. |
| **Where do users hit a wall?** | Filter `outcome == "punted"`, group by `goal` + `path`. Sorted dead-ends. Each one is a UX bug. |
| **Which features do users not know exist?** | If "export to PDF" is the #1 goal but your PDF button is buried in a sub-menu — you have your roadmap. |
| **Where is the UI confusing the AI?** | Sort `steps` by `usedVision: true`. If the AI had to fall back on a screenshot to figure out a page, your labels are probably failing your real users too. |
| **Onboarding completion** | Funnel: goals started count vs. `outcome == "done"` count for known onboarding goals. |
| **Slow paths** | Sort `durationMs` or `totalLatencyMs` descending. Long tasks may signal too many clicks for a common job. |

One POST per task, sent via `navigator.sendBeacon` when available so it survives a tab close. `Content-Type: text/plain` so it bypasses CORS preflight on any reasonable receiver.

### Wiring it up

```ts
// app/api/companion-events/route.ts (Next.js example)
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const event = JSON.parse(await req.text());
  // Persist / forward — pick your destination:
  //   await db.companionEvent.create({ data: event });
  //   await fetch("https://app.posthog.com/i/v0/e/", { ... });
  console.log("[companion]", event);
  return NextResponse.json({ ok: true });
}
```

For React/SDK consumers who want to skip the round-trip:

```tsx
<Companion
  onAnalytics={(ev) => posthog.capture("companion_task", ev)}
/>
```

### ⚠️ Always use a first-party endpoint in production

Browser ad-blockers (Brave Shields, uBlock Origin, Privacy Badger) **silently block POSTs to third-party "webhook"-style domains** like webhook.site, requestbin, ngrok. You'll never see the events. The request gets killed inside the browser before it leaves.

POST to **your own domain** (`/api/companion-events` on your existing server). First-party requests can't be blocked. Forward from there to whatever real destination you want.

For PostHog / Mixpanel / Amplitude: use their reverse-proxy patterns (e.g. PostHog's Next.js rewrite) so traffic looks first-party.

### Privacy

Events contain: the goal the user typed, what the AI said back, the page path, latencies, model names, and any value the *AI suggested* for an input. They do NOT contain: passwords, your DOM, screenshot bytes, or the full element list. Filter / redact on your end if you allow users to type sensitive data into the goal box.

Analytics is best-effort: failures are silently swallowed and never block the companion flow.

---

## Playground mode

For local prototyping and demos where you don't want to set up a proxy, you can hand Sherpa your Anthropic key directly:

```tsx
<Companion
  anthropicKey={process.env.NEXT_PUBLIC_ANTHROPIC_KEY!}  // dev / local only
  context="..."
/>
```

```html
<script
  src="https://cdn.jsdelivr.net/npm/sherpa-ai@latest/dist/companion.js"
  data-anthropic-key="sk-ant-..."
  data-context="..."
></script>
```

When a key is set client-side, the companion bypasses the proxy and calls `api.anthropic.com` directly from the browser.

> ### ⛔ Don't ship this to production
>
> Putting `anthropicKey` in the browser means **every visitor — including every logged-in user — can read your key from page source and burn down your Anthropic balance from their own machine**. "Authenticated dashboard" does not fix this. It only narrows the attackers to your own users.
>
> Use playground mode for: local dev, demos on your own machine, internal-tooling-where-the-billing-is-the-point. For anything else, set up the proxy route shown at the top of this README — it's ~10 lines and your key never leaves the server.

---

## How it works

Each step:

1. The companion serializes every visible interactive element on the page (auto-labeled from text, `aria-label`, nearby headings / form labels, `data-guide-id` if you provide one).
2. Sends `{ goal, elements, history, context }` to your proxy, which forwards to Claude.
3. Claude returns one JSON object: which element ref to point at next + what to say + the value to fill, if it's an input.
4. The cursor springs to the target, a highlight ring + caption appear.
5. After the user clicks (teach mode) or the auto-action fires, the companion waits for the DOM to settle, then asks for the next step.
6. Loops until done. Loop guard catches the "the AI clicked Submit, the alert popped, AI can't see past it" case and ends the task as `done` instead of clicking submit again.

When text labels alone aren't enough (icon-only buttons, color-coded status), the AI can request a screenshot via a `request_screenshot` tool — captured client-side, included in the next call. Used sparingly; vision is opt-in and the prompt discourages it.

## Build from source

```bash
git clone <repo>
cd sherpa-ai
npm install
npm run build:embed   # produces dist/{companion.js,index.mjs,index.cjs,index.d.ts}
npm run dev           # demo app at http://localhost:3000
```

`/dashboard-complex` is a deliberately over-built construction-supply-chain CRM (9 pages, every input type) used as the demo target. `/embed-demo.html` is a plain HTML page that loads the IIFE via `<script>` tag — proves the embed works without React or Tailwind on the host.

## Bundle

- **Script tag (IIFE):** ~640 KB minified (~190 KB gzipped). Everything bundled — React, framer-motion, screenshot lib, Tailwind CSS slice, the bundled Anthropic-API client.
- **ESM / CJS for npm import:** ~500 KB minified. React + ReactDOM marked as peer dependencies, you ship them once via your bundler.

## License

MIT. Use it, fork it, rebrand it, ship it.
