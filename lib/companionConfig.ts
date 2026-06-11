/**
 * Runtime configuration for the Companion. Set by the host app (Next.js
 * dev → defaults are fine) or by the embed script (overrides via
 * data-* attributes on the script tag).
 */

let endpoint = "/api/chat";
let cursorSrc = "/cursor.png";
let anthropicKey: string | null = null;
let confirmDestructive = true;

export type ReviewMode = "auto" | "always" | "never";
let reviewMode: ReviewMode = "auto";
let reviewAutoApproveMs = 3000;

export function setCompanionEndpoint(url: string) {
  if (url) endpoint = url;
}

export function getCompanionEndpoint(): string {
  return endpoint;
}

export function setCursorSrc(url: string) {
  if (url) cursorSrc = url;
}

export function getCursorSrc(): string {
  return cursorSrc;
}

/**
 * Override the server's ANTHROPIC_API_KEY env on a per-request basis.
 * Sent to the backend in every /api/chat body. If null, the server uses its
 * own env key. Visible to anyone who can read the page — only safe inside
 * an authenticated host.
 */
export function setAnthropicKey(key: string) {
  if (key) anthropicKey = key;
}

export function getAnthropicKey(): string | null {
  return anthropicKey;
}

/**
 * When true (default), the autonomous runner pauses before clicking buttons
 * whose label looks destructive (Delete, Remove, Archive, etc.) and asks the
 * user to confirm. Set false to disable for low-stakes apps.
 */
export function setConfirmDestructiveActions(value: boolean) {
  confirmDestructive = !!value;
}

export function getConfirmDestructiveActions(): boolean {
  return confirmDestructive;
}

/**
 * How the value-preview popover behaves when the AI proposes a value it
 * "invented" (not given by the user in the goal):
 *   - "auto"   (default) — popover shows with a countdown bar; auto-approves
 *                          after reviewAutoApproveMs unless the user edits/skips.
 *   - "always"           — popover shows with no timer. User must click.
 *   - "never"            — no popover. Invented values type immediately.
 */
export function setReviewInventedValues(mode: ReviewMode) {
  if (mode === "auto" || mode === "always" || mode === "never") {
    reviewMode = mode;
  }
}

export function getReviewInventedValues(): ReviewMode {
  return reviewMode;
}

/** Auto-approve delay in milliseconds for review mode "auto". Default 3000. */
export function setReviewAutoApproveMs(ms: number) {
  if (Number.isFinite(ms) && ms >= 0) reviewAutoApproveMs = Math.floor(ms);
}

export function getReviewAutoApproveMs(): number {
  return reviewAutoApproveMs;
}
