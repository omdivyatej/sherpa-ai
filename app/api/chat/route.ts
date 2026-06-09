import { NextRequest, NextResponse } from "next/server";
import { guide } from "@/lib/guide";
import type {
  ChatRequestBody,
  ModelTier,
  Provider,
  VisionMode,
} from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const envProvider = (process.env.ACTIVE_PROVIDER as Provider) || "anthropic";
  const provider: Provider = body.provider || envProvider;
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
    return NextResponse.json({
      needs_screenshot: {
        tool_use_id: result.tool_use_id,
        prior_assistant_content: result.prior_assistant_content,
      },
      _meta: { ...baseMeta, usedVision: false },
    });
  }

  return NextResponse.json({
    ...result.json,
    _meta: { ...baseMeta, usedVision: result.usedVision },
  });
}
