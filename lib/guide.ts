import OpenAI from "openai";
import {
  SYSTEM_PROMPT,
  SUGGESTIONS_SYSTEM,
  buildSuggestionsUserPrompt,
  buildUserPrompt,
  PUNT,
} from "./prompts";

// Slim Anthropic Messages API client — direct fetch, no SDK. Works in
// browser (the `dangerous-direct-browser-access` header is added when
// we detect we're running client-side) and in Node alike.
type AnthropicMessage = {
  role: "user" | "assistant";
  content: string | unknown[];
};
type AnthropicSystemBlock = {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
};
type AnthropicMessagesResponse = {
  id: string;
  type: "message";
  role: "assistant";
  content: Array<{ type: string; [k: string]: unknown }>;
  stop_reason: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
};

async function anthropicMessagesCreate(
  apiKey: string,
  body: {
    model: string;
    max_tokens: number;
    temperature: number;
    system: AnthropicSystemBlock[];
    messages: AnthropicMessage[];
    tools?: unknown[];
  }
): Promise<AnthropicMessagesResponse> {
  const headers: Record<string, string> = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  };
  if (typeof window !== "undefined") {
    // Required when calling Anthropic directly from the browser.
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Anthropic API ${resp.status}: ${text}`);
  }
  return (await resp.json()) as AnthropicMessagesResponse;
}
import type {
  GuideElement,
  GuideResponse,
  HistoryStep,
  ModelTier,
  Provider,
  ToolState,
  VisionMode,
} from "./types";

const SONNET_MODEL = "claude-sonnet-4-6";
const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

type ImageMediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

const SCREENSHOT_TOOL = {
  name: "request_screenshot",
  description:
    "Request a PNG screenshot of the current viewport. Use only when text labels are insufficient to pick the right element (e.g. icon-only buttons, color-coded status, visual arrangement). At most once per step.",
  input_schema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};

function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  return t.trim();
}

/**
 * Find the first balanced top-level {...} substring in s. Tolerates prose
 * preamble/postamble and respects string escapes. Returns null if none found.
 */
function extractJsonObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.substring(start, i + 1);
    }
  }
  return null;
}

function safeParse(raw: string): GuideResponse {
  const stripped = stripFences(raw);
  const candidate = extractJsonObject(stripped) ?? stripped;
  try {
    const obj = JSON.parse(candidate);
    if (
      obj &&
      typeof obj.say === "string" &&
      (obj.point === null || typeof obj.point === "string") &&
      typeof obj.done === "boolean"
    ) {
      const value =
        typeof obj.value === "string" && obj.value.length > 0
          ? obj.value
          : null;
      const rawOrigin = obj.value_origin;
      const value_origin: "from_user" | "invented" | null =
        value == null
          ? null
          : rawOrigin === "from_user"
            ? "from_user"
            : rawOrigin === "invented"
              ? "invented"
              : // Old models / unparsed responses default to "invented" — safer,
                // because it triggers the preview UI rather than silently typing.
                "invented";
      return {
        say: obj.say,
        point: obj.point,
        action: "highlight",
        done: obj.done,
        value,
        value_origin,
      };
    }
  } catch {}
  return PUNT;
}

function detectMediaType(base64: string): ImageMediaType | null {
  const head = Buffer.from(base64.slice(0, 24), "base64");
  if (
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47
  )
    return "image/png";
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff)
    return "image/jpeg";
  if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46)
    return "image/gif";
  if (
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50
  )
    return "image/webp";
  return null;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function approxBase64Bytes(b64: string): number {
  const padding = b64.match(/=+$/)?.[0].length ?? 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

export type GuideResult =
  | {
      kind: "json";
      json: GuideResponse;
      latencyMs: number;
      provider: Provider;
      model: string;
      usedVision: boolean;
    }
  | {
      kind: "needs_screenshot";
      tool_use_id: string;
      prior_assistant_content: unknown[];
      latencyMs: number;
      provider: Provider;
      model: string;
    };

export async function guide(
  goal: string,
  elements: GuideElement[],
  history: HistoryStep[],
  provider: Provider,
  visionMode: VisionMode,
  toolState: ToolState | null,
  modelTier: ModelTier,
  groqImage: string | null,
  hostContext: string | null,
  hostPath: string | null,
  anthropicKey: string | null
): Promise<GuideResult> {
  // Vision (any toolState) and explicit "smart" go to Sonnet. "fast" with no
  // tool_state goes to Haiku.
  const ANTHROPIC_MODEL =
    toolState || modelTier === "smart" ? SONNET_MODEL : HAIKU_MODEL;
  const userPrompt = buildUserPrompt(
    goal,
    JSON.stringify(elements),
    JSON.stringify(history),
    hostContext,
    hostPath
  );
  const start = Date.now();

  // ---- verbose console logging (terminal where `npm run dev` runs) ----
  console.log("\n━━━━━━━━━━━━━━ /api/chat ━━━━━━━━━━━━━━");
  console.log(
    JSON.stringify(
      {
        provider,
        visionMode,
        modelTier,
        goal,
        elementsCount: elements.length,
        firstElements: elements.slice(0, 3),
        historyLength: history.length,
        history,
        toolState: toolState
          ? {
              pending_tool_use_id: toolState.pending_tool_use_id,
              imageBytes: approxBase64Bytes(toolState.image),
              prior_assistant_content_blocks: Array.isArray(
                toolState.prior_assistant_content
              )
                ? toolState.prior_assistant_content.length
                : 0,
            }
          : null,
      },
      null,
      2
    )
  );

  // Groq path: Llama-4 Scout (multimodal). No Anthropic-style tool calling.
  // When the client supplies `groqImage`, it's attached as image_url and the
  // model gets the screenshot for free. Drop `toolState` (Anthropic-only).
  if (provider === "groq") {
    try {
      const groqEnvKey =
        typeof process !== "undefined"
          ? process.env?.GROQ_API_KEY
          : undefined;
      const client = new OpenAI({
        apiKey: groqEnvKey,
        baseURL: "https://api.groq.com/openai/v1",
        dangerouslyAllowBrowser: true,
      });
      const useImage = !!groqImage;
      const userContent = useImage
        ? [
            { type: "text" as const, text: userPrompt },
            {
              type: "image_url" as const,
              image_url: { url: `data:image/png;base64,${groqImage}` },
            },
          ]
        : userPrompt;
      const resp = await client.chat.completions.create({
        model: GROQ_MODEL,
        temperature: 0,
        max_tokens: 400,
        // JSON mode disabled when an image is attached — some providers don't
        // accept both at once. safeParse tolerates prose preambles.
        ...(useImage ? {} : { response_format: { type: "json_object" } }),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent as any },
        ],
      });
      const text = resp.choices[0]?.message?.content ?? "";
      const latencyMs = Date.now() - start;
      const json = safeParse(text);
      console.log("─── Groq raw response ───");
      console.log(text);
      console.log("─── parsed ───");
      console.log(JSON.stringify(json, null, 2));
      console.log(
        `[guide] provider=groq model=${GROQ_MODEL} vision=${useImage} latencyMs=${latencyMs} point=${json.point}\n`
      );
      return {
        kind: "json",
        json,
        latencyMs,
        provider,
        model: GROQ_MODEL,
        usedVision: useImage,
      };
    } catch (err) {
      console.error(`[guide] groq error`, err);
      return {
        kind: "json",
        json: PUNT,
        latencyMs: Date.now() - start,
        provider,
        model: GROQ_MODEL,
        usedVision: false,
      };
    }
  }

  // Anthropic path
  try {
    const envKey =
      typeof process !== "undefined"
        ? process.env?.ANTHROPIC_API_KEY
        : undefined;
    const apiKey = anthropicKey || envKey || "";

    let messages: AnthropicMessage[];
    let offerTool = false;

    if (toolState) {
      // Second call: replay assistant turn + tool_result image. No tools (prevents loops).
      const mediaType = detectMediaType(toolState.image);
      const bytes = approxBase64Bytes(toolState.image);
      if (!mediaType || bytes > MAX_IMAGE_BYTES) {
        console.warn(
          `[guide] dropping invalid screenshot (mediaType=${mediaType}, bytes=${bytes})`
        );
        // Treat as punt
        return {
          kind: "json",
          json: PUNT,
          latencyMs: Date.now() - start,
          provider,
          model: ANTHROPIC_MODEL,
          usedVision: false,
        };
      }
      messages = [
        { role: "user", content: userPrompt },
        {
          role: "assistant",
          content: toolState.prior_assistant_content as any,
        },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolState.pending_tool_use_id,
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: mediaType,
                    data: toolState.image,
                  },
                },
              ],
            },
          ],
        },
      ];
    } else {
      // First call: plain user prompt. Tool is offered ONLY to Sonnet.
      // Haiku 4.5 ignores rule 9 and calls request_screenshot ~70% of the
      // time even when the elements list contains the answer (observed across
      // multiple runs). It's cheaper to skip Haiku's tool, let it punt when
      // unsure, and let Sonnet (with the tool) handle the hard cases.
      messages = [{ role: "user", content: userPrompt }];
      offerTool =
        visionMode === "auto" && ANTHROPIC_MODEL === SONNET_MODEL;
    }

    const resp = await anthropicMessagesCreate(apiKey, {
      model: ANTHROPIC_MODEL,
      max_tokens: 400,
      temperature: 0,
      // Prompt caching: mark the system prompt as ephemeral so Anthropic
      // caches the prefill for ~5 minutes. After the first call seeds the
      // cache, every subsequent call within that window pays a small fraction
      // of the prefill cost (and a small fraction of the latency).
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages,
      ...(offerTool ? { tools: [SCREENSHOT_TOOL] } : {}),
    });

    const latencyMs = Date.now() - start;

    // If the model called the tool, surface that to the client.
    const toolUseBlock = resp.content.find(
      (b: any) => b.type === "tool_use" && b.name === "request_screenshot"
    ) as { id: string } | undefined;

    const cacheRead =
      (resp.usage as { cache_read_input_tokens?: number })
        ?.cache_read_input_tokens ?? 0;
    const cacheWrite =
      (resp.usage as { cache_creation_input_tokens?: number })
        ?.cache_creation_input_tokens ?? 0;

    if (toolUseBlock && offerTool) {
      console.log("─── Claude raw response (tool_use) ───");
      console.log(JSON.stringify(resp.content, null, 2));
      console.log(
        `[guide] provider=anthropic tool_use=request_screenshot latencyMs=${latencyMs} cacheRead=${cacheRead} cacheWrite=${cacheWrite}\n`
      );
      return {
        kind: "needs_screenshot",
        tool_use_id: toolUseBlock.id,
        prior_assistant_content: resp.content as unknown as unknown[],
        latencyMs,
        provider,
        model: ANTHROPIC_MODEL,
      };
    }

    // Otherwise extract text and parse.
    const text = resp.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
    const json = safeParse(text);
    const usedVision = !!toolState;
    console.log("─── Claude raw response ───");
    console.log(JSON.stringify(resp.content, null, 2));
    console.log("─── parsed ───");
    console.log(JSON.stringify(json, null, 2));
    console.log(
      `[guide] provider=anthropic model=${ANTHROPIC_MODEL} vision=${usedVision} latencyMs=${latencyMs} point=${json.point} cacheRead=${cacheRead} cacheWrite=${cacheWrite}\n`
    );
    return {
      kind: "json",
      json,
      latencyMs,
      provider,
      model: ANTHROPIC_MODEL,
      usedVision,
    };
  } catch (err) {
    console.error(`[guide] anthropic error`, err);
    return {
      kind: "json",
      json: PUNT,
      latencyMs: Date.now() - start,
      provider,
      model: ANTHROPIC_MODEL,
      usedVision: false,
    };
  }
}

export type SuggestResult = {
  suggestions: string[];
  latencyMs: number;
  model: string;
};

/**
 * One-shot Haiku call: given the elements on the current page + host context,
 * return up to 4 short imperative goals the user might want to perform. Used
 * to populate the suggestion chips when the panel first opens. Failure-soft:
 * any error returns an empty list.
 */
export async function suggestGoals(
  elements: GuideElement[],
  hostContext: string | null,
  hostPath: string | null,
  anthropicKey: string | null
): Promise<SuggestResult> {
  const start = Date.now();
  const compactElements = elements.slice(0, 60).map((e) => ({
    text: e.text || null,
    ariaLabel: e.ariaLabel,
    placeholder: e.placeholder,
    nearbyText: e.nearbyText,
    tagType: e.tagType,
  }));
  const userPrompt = buildSuggestionsUserPrompt(
    JSON.stringify(compactElements),
    hostContext,
    hostPath
  );
  try {
    const envKey =
      typeof process !== "undefined"
        ? process.env?.ANTHROPIC_API_KEY
        : undefined;
    const apiKey = anthropicKey || envKey || "";
    if (!apiKey) {
      return { suggestions: [], latencyMs: Date.now() - start, model: HAIKU_MODEL };
    }
    const resp = await anthropicMessagesCreate(apiKey, {
      model: HAIKU_MODEL,
      max_tokens: 200,
      temperature: 0.4,
      system: [
        {
          type: "text",
          text: SUGGESTIONS_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });
    const text = resp.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
    const candidate = extractJsonObject(stripFences(text)) ?? text;
    let suggestions: string[] = [];
    try {
      const obj = JSON.parse(candidate);
      if (Array.isArray(obj?.suggestions)) {
        suggestions = obj.suggestions
          .filter((s: unknown): s is string => typeof s === "string")
          .map((s: string) => s.trim())
          .filter(Boolean)
          .slice(0, 4);
      }
    } catch {}
    return {
      suggestions,
      latencyMs: Date.now() - start,
      model: HAIKU_MODEL,
    };
  } catch (err) {
    console.error(`[suggest] anthropic error`, err);
    return { suggestions: [], latencyMs: Date.now() - start, model: HAIKU_MODEL };
  }
}
