/**
 * Analytics emission for the companion.
 *
 * One event per task — when a goal finishes (completed, punted/errored, or
 * stopped by the user). The event contains the full step-by-step transcript
 * inside. No per-step or per-action POSTs.
 *
 * Two destinations, configured by the host:
 *   1. `analyticsEndpoint` — POST URL we send the JSON payload to.
 *      Body is sent as `text/plain` so the browser skips the CORS preflight
 *      (most webhook collectors only respond properly to direct POSTs).
 *   2. `onAnalytics` callback — fired with the same payload for in-process
 *      consumers (React/SDK).
 *
 * Both may be set at once. Failures are swallowed; analytics never blocks
 * the guide flow.
 */
export type StepRecord = {
  step: number;
  pointedAt: string | null;
  said: string;
  value: string | null;
  done: boolean;
  latencyMs: number;
  model: string;
  usedVision: boolean;
  elementsCount: number;
  ts: number;
};

export type CompanionEvent = {
  type: "goal_finished";
  goal: string;
  outcome: "done" | "punted" | "stopped";
  mode: "teach" | "auto";
  path: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  totalSteps: number;
  totalLatencyMs: number;
  steps: StepRecord[];
};

let endpoint: string | null = null;
let callback: ((ev: CompanionEvent) => void) | null = null;

export function setAnalyticsEndpoint(url: string | null) {
  endpoint = url || null;
}

export function setAnalyticsCallback(
  fn: ((ev: CompanionEvent) => void) | null
) {
  callback = fn;
}

export function emit(ev: CompanionEvent): void {
  if (callback) {
    try {
      callback(ev);
    } catch {
      // host's bug, not ours
    }
  }

  if (endpoint) {
    const body = JSON.stringify(ev);
    // Prefer sendBeacon — uses text/plain, never preflighted, survives a
    // tab close. Fall through to fetch if it's unavailable or rejects
    // (e.g. when the body is too large).
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      try {
        const blob = new Blob([body], { type: "text/plain" });
        if (navigator.sendBeacon(endpoint, blob)) return;
      } catch {
        // fall through
      }
    }
    try {
      // Use text/plain so we stay a "CORS-safe simple request" and the
      // browser skips the OPTIONS preflight — webhook.site, Pipedream,
      // and most casual collectors then receive the POST directly.
      void fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore
    }
  }
}
