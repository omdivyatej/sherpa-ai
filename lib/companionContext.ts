/**
 * Free-text context the host developer can attach to every model call.
 *
 * One string. Anything the integrator wants the AI to know about their app —
 * domain terminology, page descriptions, conventions, special-case rules.
 *
 * Treated as authoritative for domain reasoning (cannot override structural
 * rules like the JSON contract). Sent on every step inside the user message.
 *
 * Usage from anywhere in the host app:
 *
 *   import { setCompanionContext } from "@/lib/companionContext";
 *   setCompanionContext("...");
 *
 * Or via a side-effect module, or via the embeddable script's data-context
 * attribute (when wired up).
 */

let currentContext: string = "";
const listeners = new Set<(c: string) => void>();

export function setCompanionContext(text: string) {
  currentContext = (text || "").trim();
  for (const l of listeners) l(currentContext);
}

export function getCompanionContext(): string {
  return currentContext;
}

/** Subscribe to context changes (used internally by Companion if needed). */
export function onCompanionContextChange(fn: (c: string) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
