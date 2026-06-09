"use client";

import React from "react";
import { createRoot } from "react-dom/client";
import Companion from "../components/Companion";
import CustomCursor from "../components/CustomCursor";
import ToastContainer from "../components/Toast";
import { setCompanionContext } from "../lib/companionContext";
import {
  setAnthropicKey,
  setCompanionEndpoint,
  setConfirmDestructiveActions,
  setCursorSrc,
} from "../lib/companionConfig";
import {
  setAnalyticsEndpoint,
  setAnalyticsCallback,
  type CompanionEvent,
} from "../lib/analytics";

// esbuild replaces these via `define` at build time. Strings — empty at type
// time, real CSS / data-URL at runtime.
declare const __COMPANION_CSS__: string;
declare const __COMPANION_CURSOR__: string;

export type MountOptions = {
  /** Your Anthropic API key (`sk-ant-...`). Required for direct-browser mode. */
  anthropicKey?: string;
  /** Free-text app context: pages, terminology, conventions. */
  context?: string;
  /** Optional proxy endpoint URL. If set, requests route through your backend. */
  endpoint?: string;
  /** Override cursor image URL. Defaults to the bundled striped cursor. */
  cursorSrc?: string;
  /** Optional URL the companion will POST every analytics event to. */
  analyticsEndpoint?: string;
  /**
   * Optional callback invoked with every analytics event. Use this instead
   * of `analyticsEndpoint` when you'd rather hand-route events through your
   * own analytics SDK (PostHog, Segment, etc.).
   */
  onAnalytics?: (event: CompanionEvent) => void;
  /**
   * When true (default), the autonomous runner pauses before clicking buttons
   * whose label looks destructive (Delete, Remove, Archive…) and asks the
   * user to confirm. Set false to disable.
   */
  confirmDestructiveActions?: boolean;
};

export type { CompanionEvent };

let mounted = false;

/**
 * Mount the AI cursor companion onto the page. Idempotent. Safe to call
 * multiple times — subsequent calls just update the runtime config. SSR
 * no-op (returns immediately if there's no `document`).
 */
export function mountCompanion(opts: MountOptions = {}): void {
  if (typeof document === "undefined") return;

  // Apply config (works on both first call and updates)
  if (opts.anthropicKey) setAnthropicKey(opts.anthropicKey);
  if (opts.context) setCompanionContext(opts.context);
  if (opts.endpoint) setCompanionEndpoint(opts.endpoint);
  setCursorSrc(opts.cursorSrc || __COMPANION_CURSOR__);
  setAnalyticsEndpoint(opts.analyticsEndpoint ?? null);
  setAnalyticsCallback(opts.onAnalytics ?? null);
  if (opts.confirmDestructiveActions !== undefined) {
    setConfirmDestructiveActions(opts.confirmDestructiveActions);
  }

  if (mounted) return;
  mounted = true;

  // Inject scoped Tailwind CSS once.
  if (!document.querySelector("style[data-companion-styles]")) {
    const style = document.createElement("style");
    style.setAttribute("data-companion-styles", "");
    style.textContent = __COMPANION_CSS__;
    document.head.appendChild(style);
  }

  // Create the mount root (idempotent).
  let root = document.getElementById("__companion-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "__companion-root";
    root.setAttribute("data-companion-panel", "");
    document.body.appendChild(root);
  }

  createRoot(root).render(
    <>
      <Companion />
      <CustomCursor />
      <ToastContainer />
    </>
  );
}

export {
  setAnthropicKey,
  setCompanionContext,
  setCompanionEndpoint,
  setAnalyticsEndpoint,
  setAnalyticsCallback,
  setConfirmDestructiveActions,
};
