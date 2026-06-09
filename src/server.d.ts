/**
 * sherpa-ai/server — server-side helper for proxy routes
 */

export type ChatRequestBody = Record<string, unknown> & {
  /** "guide" (default) or "suggestions" (panel-open chip fetch). */
  mode?: "guide" | "suggestions";
  anthropicKey?: string | null;
};
export type ChatResponseBody = Record<string, unknown>;
export type SuggestionsResponse = {
  suggestions: string[];
  _meta: { model: string; latencyMs: number };
};

/**
 * Process a Sherpa request body server-side. Wraps the Anthropic API call
 * with the supplied key (set `body.anthropicKey = process.env.ANTHROPIC_API_KEY`
 * before calling). Returns the response shape the Sherpa client expects.
 *
 * When `body.mode === "suggestions"` the return shape is `SuggestionsResponse`.
 */
export function handleSherpaRequest(
  body: ChatRequestBody
): Promise<ChatResponseBody | SuggestionsResponse>;
