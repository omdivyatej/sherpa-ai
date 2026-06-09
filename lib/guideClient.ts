/**
 * Browser-side equivalent of the /api/chat route handler. Used when the host
 * has configured an Anthropic API key directly (BYOK direct-browser mode).
 * No backend needed — the bundled Anthropic SDK calls api.anthropic.com from
 * the browser using the supplied key.
 *
 * Takes the same request shape the route handler accepts, returns the same
 * response shape the route handler produces. Drop-in substitution.
 */
import { guide, suggestGoals } from "./guide";
import type {
  ChatRequestBody,
  ChatResponseBody,
  ModelTier,
  Provider,
  SuggestionsResponse,
  VisionMode,
} from "./types";

export async function guideClient(
  body: ChatRequestBody
): Promise<ChatResponseBody | SuggestionsResponse> {
  if (body.mode === "suggestions") {
    const r = await suggestGoals(
      body.elements || [],
      body.hostContext ?? null,
      body.hostPath ?? null,
      body.anthropicKey ?? null
    );
    return {
      suggestions: r.suggestions,
      _meta: { model: r.model, latencyMs: r.latencyMs },
    };
  }

  const provider: Provider = body.provider || "anthropic";
  const visionMode: VisionMode = body.visionMode || "auto";
  const modelTier: ModelTier = body.model_tier || "fast";

  const result = await guide(
    body.goal || "",
    body.elements || [],
    body.history || [],
    provider,
    visionMode,
    body.tool_state ?? null,
    modelTier,
    body.image ?? null,
    body.hostContext ?? null,
    body.hostPath ?? null,
    body.anthropicKey ?? null
  );

  const baseMeta = {
    provider: result.provider,
    model: result.model,
    latencyMs: result.latencyMs,
  };

  if (result.kind === "needs_screenshot") {
    return {
      needs_screenshot: {
        tool_use_id: result.tool_use_id,
        prior_assistant_content: result.prior_assistant_content,
      },
      _meta: { ...baseMeta, usedVision: false },
    };
  }

  return {
    ...result.json,
    _meta: { ...baseMeta, usedVision: result.usedVision },
  };
}
