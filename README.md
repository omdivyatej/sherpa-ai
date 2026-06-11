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

## Install

> **You'll always do three things:** install the package, stand up a tiny server route that holds your Anthropic key, and mount the `<Companion>` once. The "how" of each step depends on your stack — pick yours below.

### Read this first — why you need a server

Your Anthropic API key (`sk-ant-...`) must live somewhere only **you** can read. If you ship it inside your React bundle, every visitor to your site can copy it from the browser source and burn down your Anthropic balance.

So the key lives on a server you control. The flow is:

```
Browser  ──POST goal──▶  Your server  ──+ key──▶  api.anthropic.com
                            ↑
                            └── ANTHROPIC_API_KEY here
```

| Your app | Already has a server? | Setup path |
|---|---|---|
| **Next.js** (App or Pages) | Yes — Next runs both client and API | One route file |
| **Remix / SvelteKit / Nuxt** | Yes — these are full-stack frameworks | One route file |
| **Vite, Create React App, Vue/Svelte/Angular SPA** | **No** — they're frontend-only | Add a tiny Express server (≈15 lines) |
| **Plain HTML, no bundler** | Depends on your host | Use the script tag + any backend |

Pick your stack:

- [Next.js (App Router)](#nextjs-app-router) — most common
- [Next.js (Pages Router)](#nextjs-pages-router)
- [Vite + React](#vite--react)
- [Create React App](#create-react-app)
- [Remix](#remix)
- [Plain HTML / script tag](#plain-html--script-tag)
- [Other / generic SPA](#other--generic-spa-vue-svelte-angular)

---

### Next.js (App Router)

<details open>
<summary><b>3 steps</b> · the easy case</summary>

```bash
npm install sherpa-ai
```

**`.env.local`** — your key, server-only:
```
ANTHROPIC_API_KEY=sk-ant-...
```

**`app/api/sherpa-proxy/route.ts`** — the proxy route:
```ts
import { NextRequest, NextResponse } from "next/server";
import { handleSherpaRequest } from "sherpa-ai/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  body.anthropicKey = process.env.ANTHROPIC_API_KEY;
  return NextResponse.json(await handleSherpaRequest(body));
}
```

**`app/layout.tsx`** — mount once, lives on every page:
```tsx
import { Companion } from "sherpa-ai";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Companion endpoint="/api/sherpa-proxy" context="My app does X. The Reports tab is at the top. Export = the Download button." />
      </body>
    </html>
  );
}
```

Run `npm run dev` → open the app → right-click anywhere.

</details>

---

### Next.js (Pages Router)

<details>
<summary><b>3 steps</b> · same as App Router with the legacy API style</summary>

```bash
npm install sherpa-ai
```

**`.env.local`:** `ANTHROPIC_API_KEY=sk-ant-...`

**`pages/api/sherpa-proxy.ts`:**
```ts
import type { NextApiRequest, NextApiResponse } from "next";
import { handleSherpaRequest } from "sherpa-ai/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  req.body.anthropicKey = process.env.ANTHROPIC_API_KEY;
  res.json(await handleSherpaRequest(req.body));
}
```

**`pages/_app.tsx`:**
```tsx
import type { AppProps } from "next/app";
import { Companion } from "sherpa-ai";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Companion endpoint="/api/sherpa-proxy" context="..." />
    </>
  );
}
```

</details>

---

### Vite + React

<details>
<summary><b>4 steps</b> · Vite has no backend — you'll add a 15-line Express server</summary>

```bash
npm install sherpa-ai
npm install -D express cors dotenv concurrently
npm install -D @types/express @types/cors    # if TypeScript
```

**`.env`:** `ANTHROPIC_API_KEY=sk-ant-...`

**`server.js`** (new file, project root):
```js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { handleSherpaRequest } from "sherpa-ai/server";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.post("/api/sherpa-proxy", async (req, res) => {
  req.body.anthropicKey = process.env.ANTHROPIC_API_KEY;
  res.json(await handleSherpaRequest(req.body));
});

app.listen(4000, () => console.log("sherpa proxy on :4000"));
```

**`vite.config.ts`** — forward `/api/*` from Vite (5173) to Express (4000):
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:4000" } },
});
```

**`package.json`** — run both servers with one command:
```json
"scripts": {
  "dev": "concurrently -k -n web,api -c blue,magenta \"vite\" \"node server.js\""
}
```

**`src/main.tsx` (or `App.tsx`)** — mount Sherpa once:
```tsx
import { Companion } from "sherpa-ai";

function App() {
  return (
    <>
      <YourApp />
      <Companion endpoint="/api/sherpa-proxy" context="..." />
    </>
  );
}
```

Run `npm run dev`. Both servers boot together. In production, point your `endpoint` at wherever you deploy that Express service.

</details>

---

### Create React App

<details>
<summary><b>4 steps</b> · same shape as Vite — add a tiny Express server</summary>

```bash
npm install sherpa-ai
npm install -D express cors dotenv concurrently
```

**`.env`** (project root): `ANTHROPIC_API_KEY=sk-ant-...`

**`server.js`** (same as the Vite example above).

**`package.json`** — CRA already lets you set a dev proxy:
```json
{
  "proxy": "http://localhost:4000",
  "scripts": {
    "dev": "concurrently -k -n web,api -c blue,magenta \"react-scripts start\" \"node server.js\""
  }
}
```

**`src/App.tsx`** — mount once:
```tsx
import { Companion } from "sherpa-ai";

export default function App() {
  return (
    <>
      <YourApp />
      <Companion endpoint="/api/sherpa-proxy" context="..." />
    </>
  );
}
```

`npm run dev` boots both. Production: deploy CRA build behind the Express server (or any backend) so `/api/sherpa-proxy` stays first-party.

</details>

---

### Remix

<details>
<summary><b>3 steps</b> · Remix has a server out of the box</summary>

```bash
npm install sherpa-ai
```

**`.env`:** `ANTHROPIC_API_KEY=sk-ant-...`

**`app/routes/api.sherpa-proxy.ts`:**
```ts
import type { ActionFunctionArgs } from "@remix-run/node";
import { handleSherpaRequest } from "sherpa-ai/server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const body = await request.json();
  body.anthropicKey = process.env.ANTHROPIC_API_KEY;
  return Response.json(await handleSherpaRequest(body));
};
```

**`app/root.tsx`:**
```tsx
import { Companion } from "sherpa-ai";

export default function App() {
  return (
    <html>
      <body>
        <Outlet />
        <Companion endpoint="/api/sherpa-proxy" context="..." />
      </body>
    </html>
  );
}
```

</details>

---

### Plain HTML / script tag

<details>
<summary><b>2 steps</b> · zero JS framework, still need a backend for the key</summary>

You **still** need a server-side proxy somewhere to hold the Anthropic key. Could be a Cloudflare Worker, Vercel function, Lambda, Express, PHP, Python, whatever — anything that can hold an env var and forward a POST.

Once that endpoint exists at, say, `/api/sherpa-proxy`:

```html
<!DOCTYPE html>
<html>
  <body>
    <!-- your page -->

    <script
      src="https://cdn.jsdelivr.net/npm/sherpa-ai/dist/companion.js"
      data-endpoint="/api/sherpa-proxy"
      data-context="My app does X. Pages are: Dashboard, Settings, Reports."
    ></script>
  </body>
</html>
```

The script self-mounts on `DOMContentLoaded`. No bundler, no React, no build step.

</details>

---

### Other / generic SPA (Vue, Svelte, Angular)

<details>
<summary><b>2 steps</b> · use the script tag</summary>

The cleanest path for non-React frameworks: drop the script tag into your `index.html`. It works on any DOM, regardless of which framework is driving it. You still need a backend proxy somewhere — same as the [Plain HTML](#plain-html--script-tag) instructions.

```html
<script
  src="https://cdn.jsdelivr.net/npm/sherpa-ai/dist/companion.js"
  data-endpoint="/api/sherpa-proxy"
  data-context="..."
></script>
```

Or call `mountCompanion()` from JS:

```ts
import { mountCompanion } from "sherpa-ai";

mountCompanion({
  endpoint: "/api/sherpa-proxy",
  context: "...",
});
```

</details>

---

### Don't have a server at all?

If your app is purely static (Vite/CRA on Netlify, Vue SPA on S3, etc.), here are the lightest server options to hold the key:

- **Vercel functions** — `api/sherpa-proxy.ts`, deploys with your frontend, free tier covers most projects
- **Netlify functions** — `netlify/functions/sherpa-proxy.ts`
- **Cloudflare Workers** — runs at the edge, generous free tier
- **AWS Lambda + API Gateway** — if you're already on AWS
- **Render / Railway / Fly** — host the Express server above for a few dollars a month

All of them: set `ANTHROPIC_API_KEY` as an env var, paste the 4-line `handleSherpaRequest` body, point `endpoint` at the deployed URL.

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
