export type Rect = { x: number; y: number; w: number; h: number };

export type LabelQuality = "good" | "weak" | "none";

/**
 * Live state of an interactive element, generalized across every HTML / ARIA
 * pattern. Any field that doesn't apply to a given element is null.
 */
export type ElementState = {
  /** Current text-shaped value: input/textarea/contenteditable text, single-select selected-option text, file names joined for file inputs, joined option texts for multi-select. */
  value: string | null;
  /** Available choices, if the element is a chooser: <select>, <input list=...> datalist, role="listbox"/"combobox" with explicit options. */
  options: string[] | null;
  /** Two-state input toggled state: <input type=checkbox|radio>, aria-checked on role=checkbox|radio|switch. "mixed" for tri-state checkboxes. */
  checked: boolean | "mixed" | null;
  /** Toggle-button pressed state from aria-pressed. */
  pressed: boolean | null;
  /** Disclosure / menu / combobox open state from aria-expanded. */
  expanded: boolean | null;
  /** aria-selected: tabs, listbox options, treeitems. */
  selected: boolean | null;
  /** Disabled / aria-disabled / readonly — model should not point at these. */
  disabled: boolean;
  /** href for links, useful so the model knows where a link goes without clicking. */
  href: string | null;
};

export type GuideElement = {
  ref: string;
  text: string;
  ariaLabel: string | null;
  title: string | null;
  placeholder: string | null;
  nearbyText: string | null;
  tagType: string;
  role: string | null;
  position: string;
  rect: Rect;
  labelQuality: LabelQuality;
  state: ElementState;
};

export type HistoryStep = { pointedAt: string | null; said: string };

export type GuideResponse = {
  say: string;
  point: string | null;
  action: "highlight";
  done: boolean;
  value?: string | null;
};

export type Provider = "anthropic" | "groq";

export type VisionMode = "off" | "auto";

/**
 * Sent on the SECOND HTTP request of a step, when the model asked for a screenshot.
 * The client echoes the assistant turn back so the server can rebuild the
 * conversation statelessly.
 */
export type ToolState = {
  pending_tool_use_id: string;
  prior_assistant_content: unknown[]; // Anthropic content blocks
  image: string; // base64 PNG, no data-URL prefix
};

/** "fast" routes text-only steps to Haiku 4.5; "smart" always uses Sonnet 4.6. */
export type ModelTier = "fast" | "smart";

export type ChatRequestBody = {
  /** "guide" (default) for the normal step call, "suggestions" for the panel-open chip fetch. */
  mode?: "guide" | "suggestions";
  goal: string;
  elements: GuideElement[];
  history: HistoryStep[];
  provider?: Provider;
  visionMode?: VisionMode;
  tool_state?: ToolState | null; // Anthropic vision continuation
  image?: string | null; // Groq one-shot vision (base64 PNG)
  model_tier?: ModelTier;
  /** Free-text context the host integrator set via setCompanionContext. */
  hostContext?: string | null;
  /** Current pathname auto-injected by the client. */
  hostPath?: string | null;
  /** Per-request Anthropic API key override (embed users supply their own). */
  anthropicKey?: string | null;
};

export type SuggestionsResponse = {
  suggestions: string[];
  _meta: { model: string; latencyMs: number };
};

export type ResponseMeta = {
  provider: Provider;
  model: string;
  latencyMs: number;
  usedVision: boolean;
};

export type NeedsScreenshotResponse = {
  needs_screenshot: {
    tool_use_id: string;
    prior_assistant_content: unknown[];
  };
  _meta: ResponseMeta;
};

export type GuideResponseBody = GuideResponse & { _meta: ResponseMeta };

export type ChatResponseBody = GuideResponseBody | NeedsScreenshotResponse;

export function isNeedsScreenshot(
  r: ChatResponseBody
): r is NeedsScreenshotResponse {
  return (r as NeedsScreenshotResponse).needs_screenshot != null;
}
