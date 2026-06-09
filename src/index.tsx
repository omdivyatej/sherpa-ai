"use client";

import { useEffect } from "react";

export {
  mountCompanion,
  setAnthropicKey,
  setCompanionContext,
  setCompanionEndpoint,
  setAnalyticsEndpoint,
  setAnalyticsCallback,
  setConfirmDestructiveActions,
  type MountOptions,
  type CompanionEvent,
} from "./mount";

import { mountCompanion as _mount, type MountOptions } from "./mount";

/**
 * React component wrapper. Drop into your app root once; renders nothing,
 * just triggers `mountCompanion` once on mount and re-applies config when
 * the props change. For Next.js use under "use client" — this file already
 * declares the directive.
 *
 *   import { Companion } from "cursor-companion-ai";
 *
 *   <Companion
 *     anthropicKey={process.env.NEXT_PUBLIC_ANTHROPIC_KEY!}
 *     context="My app does X. The Reports tab is at the top..."
 *   />
 */
export function Companion(props: MountOptions): null {
  useEffect(() => {
    _mount(props);
  }, [
    props.anthropicKey,
    props.context,
    props.endpoint,
    props.cursorSrc,
    props.analyticsEndpoint,
    props.confirmDestructiveActions,
  ]);
  return null;
}
