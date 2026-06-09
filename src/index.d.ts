/**
 * cursor-companion-ai — type declarations
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

export type MountOptions = {
  /** Anthropic API key (`sk-ant-...`). Required for direct-browser mode. */
  anthropicKey?: string;
  /** Plain-English description of your app, pages, terminology, conventions. */
  context?: string;
  /** Proxy endpoint URL. If set, requests route through your backend instead of direct Anthropic. */
  endpoint?: string;
  /** Override the cursor image URL. Defaults to the bundled striped cursor. */
  cursorSrc?: string;
  /** URL the companion POSTs the full task transcript to when a task ends. */
  analyticsEndpoint?: string;
  /** Callback invoked once per task with the full transcript. */
  onAnalytics?: (event: CompanionEvent) => void;
  /**
   * When true (default), the autonomous runner pauses before clicking buttons
   * whose label looks destructive (Delete, Remove, Archive…) and asks the
   * user to confirm. Set false to skip the gate.
   */
  confirmDestructiveActions?: boolean;
};

export function mountCompanion(opts?: MountOptions): void;
export function Companion(props: MountOptions): null;
export function setAnthropicKey(key: string): void;
export function setCompanionContext(text: string): void;
export function setCompanionEndpoint(url: string): void;
export function setAnalyticsEndpoint(url: string | null): void;
export function setAnalyticsCallback(
  fn: ((event: CompanionEvent) => void) | null
): void;
export function setConfirmDestructiveActions(value: boolean): void;

/**
 * Programmatic API exposed on `window.sherpa` after the companion mounts.
 * Call from host code or browser console:
 *
 *   window.sherpa.run("Create a new shipment", { mode: "auto" });
 *   window.sherpa.stop();
 *
 * URL deep-link equivalent: `?sherpa-goal=Create+a+new+shipment&sherpa-mode=auto`.
 */
export interface SherpaWindowApi {
  run(text: string, opts?: { mode?: "auto" | "teach" }): void;
  stop(): void;
  setContext(text: string): void;
  setKey(key: string): void;
}

declare global {
  interface Window {
    sherpa: SherpaWindowApi;
  }
}
