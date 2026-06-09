import { guide, suggestGoals } from "./guide";
import type {
  ChatRequestBody,
  ChatResponseBody,
  SuggestionsResponse,
} from "./types";

/**
 * Server-side helper for the proxy route. Takes the body the Sherpa client
 * POSTs to your proxy and returns the response the client expects, with the
 * Anthropic API call done server-side using your env-stored key.
 *
 * Typical usage in a Next.js route handler:
 *
 *   import { handleSherpaRequest } from "sherpa-ai/server";
 *
 *   export async function POST(req) {
 *     const body = await req.json();
 *     body.anthropicKey = process.env.ANTHROPIC_API_KEY;
 *     const result = await handleSherpaRequest(body);
 *     return Response.json(result);
 *   }
 */
export async function handleSherpaRequest(
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

  const provider = body.provider || "anthropic";
  const visionMode = body.visionMode || "auto";
  const modelTier = body.model_tier || "fast";

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

export type { ChatRequestBody, ChatResponseBody, SuggestionsResponse };
