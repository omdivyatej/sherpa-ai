"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  isNeedsScreenshot,
  type ChatResponseBody,
  type GuideResponseBody,
  type HistoryStep,
  type ModelTier,
  type Provider,
  type ResponseMeta,
  type SuggestionsResponse,
  type ToolState,
} from "@/lib/types";

type LogEvent =
  | { type: "request"; attempt: number; payload: unknown }
  | { type: "response"; attempt: number; payload: unknown; latencyMs: number }
  | { type: "screenshot"; bytes: number; ms: number }
  | { type: "note"; text: string };

type StepLog = {
  step: number;
  timestamp: number;
  goal: string;
  events: LogEvent[];
};
import { harvest } from "@/lib/autoLabel";
import { captureViewport } from "@/lib/screenshot";
import { awaitDomSettle } from "@/lib/domSettle";
import {
  getCompanionContext,
  setCompanionContext,
} from "@/lib/companionContext";
import {
  getAnthropicKey,
  getCompanionEndpoint,
  getConfirmDestructiveActions,
  getCursorSrc,
  setAnthropicKey,
} from "@/lib/companionConfig";
import { guideClient } from "@/lib/guideClient";
import { emit, type StepRecord } from "@/lib/analytics";

type Status =
  | "idle"
  | "thinking"
  | "pointing"
  | "confirming"
  | "done"
  | "punted";

// Words that, as the visible text/aria-label of a button, indicate a
// destructive or hard-to-undo action. In autonomous mode we pause and ask
// the user to confirm before clicking these.
const DESTRUCTIVE_WORD_RE =
  /\b(delete|remove|destroy|drop|revoke|wipe|erase|cancel|archive|deactivate|terminate|uninstall|unpublish|disable|reset all|clear all|sign out|log ?out)\b/i;

function isDestructiveTarget(target: HTMLElement): boolean {
  const tag = target.tagName;
  // Only gate actual clickable controls — not text inputs, links to home, etc.
  const isClickable =
    tag === "BUTTON" ||
    (tag === "INPUT" &&
      /^(submit|button|reset|image)$/i.test(
        (target as HTMLInputElement).type || ""
      )) ||
    target.getAttribute("role") === "button";
  if (!isClickable) return false;
  const text = (
    target.innerText ||
    target.getAttribute("aria-label") ||
    target.getAttribute("title") ||
    ""
  )
    .trim()
    .slice(0, 80);
  return DESTRUCTIVE_WORD_RE.test(text);
}

export default function Companion() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 });
  const [goal, setGoal] = useState("");
  const [activeGoal, setActiveGoal] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [autoMode, setAutoMode] = useState(false);
  const [say, setSay] = useState("");
  const [pointId, setPointId] = useState<string | null>(null);
  const [pointRect, setPointRect] = useState<DOMRect | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 200, y: 200 });
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastUsedVision, setLastUsedVision] = useState(false);
  const [stepLogs, setStepLogs] = useState<StepLog[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const stepCounterRef = useRef(0);

  // Suggestion chips on panel open. Cached per pathname for the session so
  // re-opening the panel doesn't refire the call.
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestCacheRef = useRef<Map<string, string[]>>(new Map());

  // Confirmation gate: when the model wants to click a destructive button in
  // autonomous mode, we pause here until the user confirms.
  const pendingConfirmRef = useRef<{
    target: HTMLElement;
    value: string | null;
    label: string;
    currentGoal: string;
    gen: number;
  } | null>(null);
  const [confirmLabel, setConfirmLabel] = useState<string>("");
  // Set after runStep is defined below; lets confirm/skip helpers resume the
  // loop without creating a circular useCallback dependency.
  const runStepRef = useRef<
    ((currentGoal: string, gen: number) => Promise<void>) | null
  >(null);

  const refMapRef = useRef<Map<string, HTMLElement>>(new Map());
  const autoModeRef = useRef(autoMode);
  useEffect(() => {
    autoModeRef.current = autoMode;
  }, [autoMode]);

  const historyRef = useRef<HistoryStep[]>([]);
  const activeGoalRef = useRef<string | null>(null);
  const statusRef = useRef<Status>(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Generational cancellation: every start() bumps gen. Every async resume in
  // runStep / callGuide checks gen against generationRef.current and bails if
  // stale. Lets the user kick off a new task at any point — old in-flight
  // work self-exits without setting state.
  const generationRef = useRef(0);
  const goalStartedAtRef = useRef<number>(0);
  const totalLatencyRef = useRef<number>(0);
  const totalStepsRef = useRef<number>(0);
  const stepsRecordRef = useRef<StepRecord[]>([]);
  const taskModeRef = useRef<"teach" | "auto">("auto");
  const taskPathRef = useRef<string>("");
  // Holds the click listener attached in teach mode so start()/stop() can
  // detach it cleanly when a task is replaced or aborted.
  const activeClickListenerRef = useRef<
    { el: HTMLElement; fn: (e: Event) => void } | null
  >(null);

  useEffect(() => {
    activeGoalRef.current = activeGoal;
  }, [activeGoal]);

  function detachClickListener() {
    const a = activeClickListenerRef.current;
    if (a) {
      a.el.removeEventListener("click", a.fn);
      activeClickListenerRef.current = null;
    }
  }

  /**
   * One model step. Sends the request; if the model asks for a screenshot,
   * captures the viewport, replays the assistant turn back to the server, and
   * returns the final JSON. Caps at one tool round-trip per step.
   */
  const callGuide = useCallback(
    async (
      currentGoal: string,
      gen: number
    ): Promise<GuideResponseBody | null> => {
      if (gen !== generationRef.current) return null;
      setStatus("thinking");
      const { elements, refMap } = harvest();
      refMapRef.current = refMap;

      const stepNum = ++stepCounterRef.current;
      const log: StepLog = {
        step: stepNum,
        timestamp: Date.now(),
        goal: currentGoal,
        events: [],
      };
      const pushEvent = (e: LogEvent) => {
        log.events.push(e);
        setStepLogs((prev) => {
          const idx = prev.findIndex((s) => s.step === stepNum);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...log, events: [...log.events] };
            return next;
          }
          return [{ ...log, events: [...log.events] }, ...prev];
        });
      };

      const post = (
        toolState: ToolState | null,
        modelTier: ModelTier,
        attempt: number,
        image: string | null = null
      ) => {
        const body = {
          goal: currentGoal,
          elements,
          history: historyRef.current,
          provider,
          visionMode: "auto" as const,
          model_tier: modelTier,
          tool_state: toolState,
          image,
          hostContext: getCompanionContext() || null,
          hostPath:
            typeof window !== "undefined" ? window.location.pathname : null,
          anthropicKey: getAnthropicKey(),
        };
        pushEvent({
          type: "request",
          attempt,
          payload: {
            goal: body.goal,
            elementsCount: body.elements.length,
            history: body.history,
            provider: body.provider,
            model_tier: modelTier,
            tool_state: toolState
              ? {
                  pending_tool_use_id: toolState.pending_tool_use_id,
                  imageBytes: Math.floor((toolState.image.length * 3) / 4),
                }
              : null,
            imageBytes: image
              ? Math.floor((image.length * 3) / 4)
              : null,
          },
        });
        // If the consumer brought their own Anthropic key, skip the proxy
        // entirely and call Anthropic directly from the browser. The shared
        // guide() function does the same work either way.
        if (body.anthropicKey && body.provider === "anthropic") {
          return guideClient(body) as Promise<ChatResponseBody>;
        }
        // Hard timeout on the proxy call. Anthropic+vision is typically
        // 1-10s; 30s means something hung (cold start, network, dead proxy).
        // Without this the UI sits on "thinking…" forever.
        const ctl = new AbortController();
        const tid = setTimeout(() => ctl.abort(), 30_000);
        return fetch(getCompanionEndpoint(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ctl.signal,
        })
          .then((r) => r.json() as Promise<ChatResponseBody>)
          .finally(() => clearTimeout(tid));
      };

      // Speculative screenshot in parallel with the first model call. If the
      // model chooses to use the screenshot tool, the bytes are already (or
      // nearly) ready — saves 200-400ms vs capturing only after we know.
      // If the model doesn't need it, the capture is wasted but harmless.
      const captureT0 = Date.now();
      const screenshotPromise = captureViewport().catch(() => null);
      let screenshotLogged = false;
      const consumeScreenshot = async (): Promise<string | null> => {
        const image = await screenshotPromise;
        if (image && !screenshotLogged) {
          pushEvent({
            type: "screenshot",
            bytes: Math.floor((image.length * 3) / 4),
            ms: Date.now() - captureT0,
          });
          screenshotLogged = true;
        } else if (!image) {
          pushEvent({ type: "note", text: "screenshot capture failed" });
        }
        return image;
      };

      let totalLatency = 0;
      let visionUsed = false;
      const pushResp = (attempt: number, d: ChatResponseBody) => {
        pushEvent({
          type: "response",
          attempt,
          payload: d,
          latencyMs: d._meta?.latencyMs ?? 0,
        });
        totalLatency += d._meta?.latencyMs ?? 0;
      };
      const puntResult = (
        say: string,
        meta: ResponseMeta
      ): GuideResponseBody => ({
        say,
        point: null,
        action: "highlight",
        done: false,
        value: null,
        _meta: { ...meta, latencyMs: totalLatency, usedVision: visionUsed },
      });

      // Handle a tool_use response: capture screenshot, send second call to
      // Sonnet (vision-grade). Returns null on capture failure / cap exceeded.
      const resolveVision = async (
        tool: { tool_use_id: string; prior_assistant_content: unknown[] },
        attempt: number
      ): Promise<GuideResponseBody | null> => {
        const image = await consumeScreenshot();
        if (gen !== generationRef.current) return null;
        if (!image) return null;
        const r = await post(
          {
            pending_tool_use_id: tool.tool_use_id,
            prior_assistant_content: tool.prior_assistant_content,
            image,
          },
          "smart",
          attempt
        );
        if (gen !== generationRef.current) return null;
        pushResp(attempt, r);
        visionUsed = true;
        if (isNeedsScreenshot(r)) return null;
        return r as GuideResponseBody;
      };

      // ---- Groq path: text-only first, retry with image on punt ----
      if (provider === "groq") {
        let attempt = 1;
        let data = await post(null, "fast", attempt);
        if (gen !== generationRef.current) return null;
        pushResp(attempt, data);

        const r1 = data as GuideResponseBody;
        const isPunt = r1.point === null && !r1.done;
        if (isPunt) {
          // Retry once with the speculative screenshot attached
          const image = await consumeScreenshot();
          if (gen !== generationRef.current) return null;
          if (image) {
            attempt++;
            const r2 = await post(null, "fast", attempt, image);
            if (gen !== generationRef.current) return null;
            pushResp(attempt, r2);
            visionUsed = true;
            data = r2;
          }
        }

        setLatencyMs(totalLatency);
        setLastUsedVision(visionUsed);
        const final = data as GuideResponseBody;
        return {
          ...final,
          _meta: {
            ...final._meta,
            latencyMs: totalLatency,
            usedVision: visionUsed,
          },
        };
      }

      // ---- Anthropic path ----
      // Attempt 1: Haiku (fast tier), no tool. If Haiku punts, escalate to
      // Sonnet (smart tier) which has the screenshot tool.
      let attempt = 1;
      let data = await post(null, "fast", attempt);
      if (gen !== generationRef.current) return null;
      pushResp(attempt, data);

      if (isNeedsScreenshot(data)) {
        const tool = data.needs_screenshot;
        const fallbackMeta = data._meta;
        attempt++;
        const resolved = await resolveVision(tool, attempt);
        if (gen !== generationRef.current) return null;
        if (!resolved) {
          setLatencyMs(totalLatency);
          setLastUsedVision(visionUsed);
          return puntResult(
            "I couldn't analyze the screen — try a more specific goal.",
            fallbackMeta
          );
        }
        data = resolved;
      } else {
        const r1 = data as GuideResponseBody;
        const haikuPunted = r1.point === null && !r1.done;
        if (haikuPunted) {
          // ---- Attempt 2: escalate to Sonnet (smart tier) ----
          attempt++;
          const r2 = await post(null, "smart", attempt);
          if (gen !== generationRef.current) return null;
          pushResp(attempt, r2);

          if (isNeedsScreenshot(r2)) {
            const tool = r2.needs_screenshot;
            const fallbackMeta = r2._meta;
            attempt++;
            const resolved = await resolveVision(tool, attempt);
            if (gen !== generationRef.current) return null;
            if (!resolved) {
              setLatencyMs(totalLatency);
              setLastUsedVision(visionUsed);
              return puntResult(
                "Couldn't analyze the screen — try a more specific goal.",
                fallbackMeta
              );
            }
            data = resolved;
          } else {
            data = r2;
          }
        }
      }

      setLatencyMs(totalLatency);
      setLastUsedVision(visionUsed);
      const final = data as GuideResponseBody;
      return {
        ...final,
        _meta: {
          ...final._meta,
          latencyMs: totalLatency,
          usedVision: visionUsed,
        },
      };
    },
    [provider]
  );

  // run a single step: ask the model, point at the target, wait for click (or auto-click)
  const runStep = useCallback(
    async (currentGoal: string, gen: number) => {
      if (gen !== generationRef.current) return;
      let data: GuideResponseBody | null = null;
      try {
        data = await callGuide(currentGoal, gen);
      } catch (err) {
        if (gen !== generationRef.current) return;
        console.error("[companion] step failed", err);
        const aborted =
          (err as { name?: string })?.name === "AbortError";
        setSay(
          aborted
            ? "That took too long — please try again."
            : "Something went wrong on the last step — try again."
        );
        setPointId(null);
        setPointRect(null);
        setStatus("punted");
        return;
      }
      if (gen !== generationRef.current || !data) {
        // null data without a thrown error means a stale generation aborted
        // mid-flight. The newer generation owns the UI now — don't touch it.
        return;
      }

      totalLatencyRef.current += data._meta.latencyMs;
      totalStepsRef.current += 1;
      stepsRecordRef.current.push({
        step: totalStepsRef.current,
        pointedAt: data.point,
        said: data.say,
        value: data.value ?? null,
        done: data.done,
        latencyMs: data._meta.latencyMs,
        model: data._meta.model,
        usedVision: !!data._meta.usedVision,
        elementsCount: refMapRef.current.size,
        ts: Date.now(),
      });

      const finishedEvent = (outcome: "done" | "punted") => {
        const finishedAt = Date.now();
        return {
          type: "goal_finished" as const,
          goal: currentGoal,
          outcome,
          mode: taskModeRef.current,
          path: taskPathRef.current,
          startedAt: goalStartedAtRef.current,
          finishedAt,
          durationMs: finishedAt - goalStartedAtRef.current,
          totalSteps: totalStepsRef.current,
          totalLatencyMs: totalLatencyRef.current,
          steps: stepsRecordRef.current,
        };
      };

      // Loop guard: if the model wants to point at the SAME ref it pointed
      // at on the previous step, treat the goal as complete. This catches
      // the common failure mode where a terminal action (Submit/Save/Send)
      // triggers an alert/toast/navigation the model can't see and it tries
      // to "click submit" again indefinitely.
      const lastPointed =
        historyRef.current[historyRef.current.length - 1]?.pointedAt;
      if (
        data.point &&
        lastPointed &&
        data.point === lastPointed &&
        autoModeRef.current
      ) {
        setSay(
          "Looks like that action completed — the next step would repeat the previous one."
        );
        setPointId(null);
        setPointRect(null);
        setStatus("done");
        emit(finishedEvent("done"));
        return;
      }

      setSay(data.say);
      historyRef.current = [
        ...historyRef.current,
        { pointedAt: data.point, said: data.say },
      ];

      if (data.done) {
        setPointId(null);
        setPointRect(null);
        setStatus("done");
        emit(finishedEvent("done"));
        return;
      }
      if (!data.point) {
        setPointId(null);
        setPointRect(null);
        setStatus("punted");
        emit(finishedEvent("punted"));
        return;
      }

      const target = lookupRef(data.point, refMapRef.current);
      if (!target) {
        // model named a ref we couldn't find — treat as punt
        setPointId(null);
        setPointRect(null);
        setStatus("punted");
        emit(finishedEvent("punted"));
        return;
      }

      // If the target is outside the viewport, scroll it into view first and
      // let the page settle for a beat before measuring its on-screen rect.
      // Without this the highlight ring sits on stale coordinates and an
      // autonomous click can fire on an off-screen element.
      let rect = target.getBoundingClientRect();
      const outsideViewport =
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth;
      if (outsideViewport) {
        try {
          target.scrollIntoView({ block: "center", behavior: "smooth" });
        } catch {
          target.scrollIntoView();
        }
        await new Promise((r) => setTimeout(r, 350));
        if (gen !== generationRef.current) return;
        rect = target.getBoundingClientRect();
      }
      setPointId(data.point);
      setPointRect(rect);
      setCursorPos({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
      setStatus("pointing");

      // wait for the user (teaching) or auto-click after a beat
      if (autoModeRef.current) {
        // Destructive-action gate: if the target's text/aria-label looks
        // like a destructive verb (delete, remove, archive, etc.), pause
        // before clicking and ask the user to confirm. Skips the gate when
        // confirmDestructiveActionsRef is false.
        if (
          getConfirmDestructiveActions() &&
          isDestructiveTarget(target)
        ) {
          const label =
            (
              target.innerText ||
              target.getAttribute("aria-label") ||
              target.getAttribute("title") ||
              "this action"
            )
              .trim()
              .slice(0, 60) || "this action";
          pendingConfirmRef.current = {
            target,
            value: data.value ?? null,
            label,
            currentGoal,
            gen,
          };
          setConfirmLabel(label);
          setStatus("confirming");
          // Force panel open so the user sees the confirm prompt.
          setCollapsed(false);
          setOpen(true);
          return;
        }
        // ~450ms is enough for the cursor's spring animation to land on the
        // target without feeling rushed. Was 900ms — felt slow.
        setTimeout(async () => {
          if (gen !== generationRef.current) return;
          performAuto(target, data.value ?? null);
          // Action done. Clear the highlight immediately — the target may
          // have been deleted/hidden, in which case the ring would otherwise
          // sit on phantom coordinates.
          setPointId(null);
          setPointRect(null);
          setStatus("thinking");
          // Wait until the DOM stops mutating (handles slow backends /
          // async optimistic updates). Bounded; falls through after 3.5s
          // if mutations never settle.
          await awaitDomSettle();
          if (gen !== generationRef.current) return;
          runStep(currentGoal, gen);
        }, 450);
      } else {
        const onClick = async () => {
          target.removeEventListener("click", onClick);
          if (activeClickListenerRef.current?.fn === onClick) {
            activeClickListenerRef.current = null;
          }
          // Same reasoning as the auto branch: drop the highlight right after
          // the user's click so it doesn't linger if the target gets removed.
          setPointId(null);
          setPointRect(null);
          setStatus("thinking");
          // Slightly longer idle window for teach mode so it feels deliberate.
          await awaitDomSettle({ minIdleMs: 300 });
          if (gen === generationRef.current) runStep(currentGoal, gen);
        };
        target.addEventListener("click", onClick);
        activeClickListenerRef.current = { el: target, fn: onClick };
      }
    },
    [callGuide]
  );

  useEffect(() => {
    runStepRef.current = runStep;
  }, [runStep]);

  // Thinking watchdog: any "thinking" state that lingers past 35s is a hang
  // (cold-start proxy, dropped connection, fetch we missed catching). The 30s
  // fetch timeout above usually catches network hangs first; this is the
  // backstop for everything else. Bumps generation so any in-flight work
  // self-exits, then surfaces a clear failure to the user.
  useEffect(() => {
    if (status !== "thinking") return;
    const tid = setTimeout(() => {
      if (statusRef.current !== "thinking") return;
      console.warn("[companion] thinking watchdog tripped after 35s");
      generationRef.current += 1;
      setSay("Lost the thread — please try again.");
      setPointId(null);
      setPointRect(null);
      setStatus("punted");
    }, 35_000);
    return () => clearTimeout(tid);
  }, [status]);

  // Programmatic API: window.sherpa.run("goal", { mode }), stop(), etc.
  // Mounted once. The handlers themselves read live state via refs/setters
  // so we don't have to rebind on every render.
  const runFromCodeRef = useRef<
    ((text: string, opts?: { mode?: "auto" | "teach" }) => void) | null
  >(null);
  useEffect(() => {
    runFromCodeRef.current = (text: string, opts) => {
      const t = (text || "").trim();
      if (!t) return;
      const auto = opts?.mode === "auto";
      setGoal(t);
      // Defer one tick so React picks up the new goal before start() reads it.
      setTimeout(() => start(auto), 0);
    };
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const api = {
      run: (text: string, opts?: { mode?: "auto" | "teach" }) =>
        runFromCodeRef.current?.(text, opts),
      stop: () => stop(),
      setContext: (text: string) => setCompanionContext(text),
      setKey: (key: string) => setAnthropicKey(key),
    };
    (window as unknown as { sherpa: typeof api }).sherpa = api;
  }, []);

  // URL deep-link: ?sherpa-goal=...&sherpa-mode=auto|teach triggers a run on mount.
  // Strips the params after firing so a back-button doesn't replay it. Only runs
  // once per page load.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const goalParam = url.searchParams.get("sherpa-goal");
    if (!goalParam) return;
    const modeParam = url.searchParams.get("sherpa-mode");
    const auto = modeParam === "auto";
    url.searchParams.delete("sherpa-goal");
    url.searchParams.delete("sherpa-mode");
    window.history.replaceState({}, "", url.toString());
    // Wait for layout/elements to be ready, then fire.
    setTimeout(() => {
      runFromCodeRef.current?.(goalParam, { mode: auto ? "auto" : "teach" });
    }, 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch a small batch of suggested goals for the current page. Cached per
  // pathname so re-opening the panel never refires the call within a session.
  const fetchSuggestions = useCallback(async () => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    const cached = suggestCacheRef.current.get(path);
    if (cached) {
      setSuggestions(cached);
      return;
    }
    setSuggestLoading(true);
    setSuggestions([]);
    try {
      const { elements } = harvest();
      const body = {
        mode: "suggestions" as const,
        goal: "",
        elements,
        history: [],
        provider,
        hostContext: getCompanionContext() || null,
        hostPath: path,
        anthropicKey: getAnthropicKey(),
      };
      let data: SuggestionsResponse | null = null;
      if (body.anthropicKey && body.provider === "anthropic") {
        data = (await guideClient(body as any)) as SuggestionsResponse;
      } else {
        const r = await fetch(getCompanionEndpoint(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        data = (await r.json()) as SuggestionsResponse;
      }
      const list = Array.isArray(data?.suggestions) ? data.suggestions : [];
      suggestCacheRef.current.set(path, list);
      setSuggestions(list);
    } catch (err) {
      console.warn("[companion] suggestions failed", err);
      setSuggestions([]);
    } finally {
      setSuggestLoading(false);
    }
  }, [provider]);

  function start(mode?: boolean) {
    const text = goal.trim();
    if (!text) return;
    const auto = mode ?? autoMode;
    // bump generation FIRST so any in-flight runStep/callGuide self-exits
    generationRef.current += 1;
    const gen = generationRef.current;
    detachClickListener();
    setAutoMode(auto);
    autoModeRef.current = auto;
    historyRef.current = [];
    stepCounterRef.current = 0;
    setStepLogs([]);
    setSay("");
    setPointId(null);
    setPointRect(null);
    setStatus("thinking");
    setActiveGoal(text);
    setGoal("");
    goalStartedAtRef.current = Date.now();
    totalLatencyRef.current = 0;
    totalStepsRef.current = 0;
    stepsRecordRef.current = [];
    taskModeRef.current = auto ? "auto" : "teach";
    taskPathRef.current =
      typeof window !== "undefined" ? window.location.pathname : "";
    if (auto) setCollapsed(true);
    runStep(text, gen);
  }

  // Resume after a destructive-action confirmation. Called from the panel
  // Confirm button. Skip = same idea but cancels the whole task instead.
  const confirmAndContinue = useCallback(() => {
    const p = pendingConfirmRef.current;
    pendingConfirmRef.current = null;
    setConfirmLabel("");
    if (!p) return;
    if (p.gen !== generationRef.current) return;
    setStatus("thinking");
    // Collapse the panel again so the cursor animation is visible.
    setCollapsed(true);
    setTimeout(async () => {
      if (p.gen !== generationRef.current) return;
      performAuto(p.target, p.value);
      setPointId(null);
      setPointRect(null);
      setStatus("thinking");
      await awaitDomSettle();
      if (p.gen !== generationRef.current) return;
      runStepRef.current?.(p.currentGoal, p.gen);
    }, 80);
  }, []);

  const skipDestructive = useCallback(() => {
    const p = pendingConfirmRef.current;
    pendingConfirmRef.current = null;
    setConfirmLabel("");
    if (!p) {
      stop();
      return;
    }
    setSay(`Skipped "${p.label}" — cancel the task or pick a new one.`);
    setStatus("punted");
    setPointId(null);
    setPointRect(null);
  }, []);

  function stop() {
    if (activeGoalRef.current && goalStartedAtRef.current) {
      const finishedAt = Date.now();
      emit({
        type: "goal_finished",
        goal: activeGoalRef.current,
        outcome: "stopped",
        mode: taskModeRef.current,
        path: taskPathRef.current,
        startedAt: goalStartedAtRef.current,
        finishedAt,
        durationMs: finishedAt - goalStartedAtRef.current,
        totalSteps: totalStepsRef.current,
        totalLatencyMs: totalLatencyRef.current,
        steps: stepsRecordRef.current,
      });
    }
    generationRef.current += 1; // cancels any in-flight work
    detachClickListener();
    setActiveGoal(null);
    setStatus("idle");
    setPointId(null);
    setPointRect(null);
    setSay("");
    setCollapsed(false);
  }

  // Track real mouse position so the "Thinking…" spinner can sit next to
  // the user's cursor in teach mode. Use a ref + direct DOM transform on
  // the spinner so we don't trigger React re-renders on every mousemove.
  const thinkingDotRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = thinkingDotRef.current;
      if (el) el.style.transform = `translate(${e.clientX + 18}px, ${e.clientY + 18}px)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // In autonomous mode while the AI is pointing, suppress the user's
  // mouse-driven CustomCursor so only the AI cursor is visible.
  useEffect(() => {
    const active =
      autoMode && (status === "pointing" || status === "thinking");
    const cc = document.querySelector<HTMLElement>("[data-custom-cursor]");
    if (!cc) return;
    if (active) {
      cc.dataset.suppressed = "true";
      cc.style.display = "none";
      return () => {
        cc.dataset.suppressed = "false";
        cc.style.display = "";
      };
    }
  }, [autoMode, status]);

  // right-click anywhere opens the panel at the cursor; Esc closes it
  useEffect(() => {
    const PANEL_W = 320;
    const PANEL_H = 280;
    const onContextMenu = (e: MouseEvent) => {
      // don't hijack right-click inside the panel itself (so you can copy text)
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-companion-panel]")) return;
      e.preventDefault();
      // Finished or punted session lingering from last run? Clear before showing
      // the panel — otherwise the user would see the stale "Done" / "Couldn't
      // help" block instead of a fresh input.
      if (
        statusRef.current === "done" ||
        statusRef.current === "punted"
      ) {
        stop();
      }
      const x = Math.min(e.clientX, window.innerWidth - PANEL_W - 12);
      const y = Math.min(e.clientY, window.innerHeight - PANEL_H - 12);
      setPanelPos({ x: Math.max(12, x), y: Math.max(12, y) });
      setOpen(true);
      setCollapsed(false);
      // Pre-fetch suggestions for this page if we don't have any yet.
      if (!activeGoalRef.current) fetchSuggestions();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Also dismiss the "All done" / punt state if present so the modal
        // doesn't stick around.
        if (
          statusRef.current === "done" ||
          statusRef.current === "punted"
        ) {
          stop();
        }
        setOpen(false);
      }
    };
    const onClickAway = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-companion-panel]")) return;
      if (target?.closest("[data-companion-pill]")) return;
      // While awaiting destructive-action confirmation, keep the panel open
      // — the Confirm/Skip buttons live there.
      if (statusRef.current === "confirming") return;
      // mid-task: don't kill the panel, just collapse it
      if (activeGoalRef.current) {
        setCollapsed(true);
      } else {
        setOpen(false);
      }
    };
    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClickAway);
    return () => {
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClickAway);
    };
  }, []);

  // keep highlight rect in sync with scroll/resize, and drop it if the
  // target disappears from the DOM
  useEffect(() => {
    if (!pointId) return;
    const update = () => {
      const target = lookupRef(pointId, refMapRef.current);
      if (target) {
        const r = target.getBoundingClientRect();
        setPointRect(r);
        setCursorPos({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
      } else {
        setPointId(null);
        setPointRect(null);
      }
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [pointId]);

  return (
    <>
      {/* highlight outline */}
      <AnimatePresence>
        {pointRect && (
          <motion.div
            key={pointId}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            data-companion-overlay
            className="pointer-events-none fixed z-[60] rounded-md ring-4 ring-sky-400/90 shadow-[0_0_24px_4px_rgba(56,189,248,0.55),0_0_0_9999px_rgba(0,0,0,0.06)]"
            style={{
              top: pointRect.top - 6,
              left: pointRect.left - 6,
              width: pointRect.width + 12,
              height: pointRect.height + 12,
            }}
          />
        )}
      </AnimatePresence>

      {/* caption beside the target */}
      <AnimatePresence>
        {pointRect && say && (
          <motion.div
            key={(pointId || "") + say}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            data-companion-overlay
            className="pointer-events-none fixed z-[61] max-w-xs bg-gray-900 text-white text-sm rounded-md px-3 py-2 shadow-lg"
            style={{
              top: Math.min(pointRect.bottom + 12, window.innerHeight - 60),
              left: Math.min(pointRect.left, window.innerWidth - 280),
            }}
          >
            {say}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thinking spinner — small three-dot loader pinned to the cursor while
          the model is computing. Autonomous mode follows the animated AI
          cursor; teach mode follows the user's real mouse via a ref. */}
      <AnimatePresence>
        {status === "thinking" && autoMode && (
          <motion.div
            data-companion-overlay
            className="pointer-events-none fixed z-[63]"
            style={{ top: 0, left: 0 }}
            animate={{ x: cursorPos.x + 18, y: cursorPos.y + 18 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            initial={{ opacity: 0 }}
            exit={{ opacity: 0 }}
          >
            <ThinkingDots />
          </motion.div>
        )}
      </AnimatePresence>
      {status === "thinking" && !autoMode && (
        <div
          ref={thinkingDotRef}
          data-companion-overlay
          className="pointer-events-none fixed top-0 left-0 z-[63]"
        >
          <ThinkingDots />
        </div>
      )}

      {/* AI cursor — only rendered in autonomous mode; user's CustomCursor is suppressed while this is on */}
      <AnimatePresence>
        {autoMode && (status === "pointing" || status === "thinking") && (
          <motion.img
            data-companion-overlay
            src={getCursorSrc()}
            alt=""
            width={36}
            height={36}
            className="pointer-events-none fixed z-[62]"
            style={{ top: 0, left: 0 }}
            animate={{ x: cursorPos.x - 4, y: cursorPos.y - 4 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            initial={{ opacity: 0 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* (the floating right-side pill was removed — the thinking dots that
          follow the cursor convey the same status without occupying screen
          real estate. Right-click anywhere re-summons the panel.) */}

      {/* done modal */}
      <AnimatePresence>
        {status === "done" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center"
            onClick={() => {
              stop();
              setOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 w-[420px] text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12l5 5L20 7"
                    stroke="#059669"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-lg font-semibold mb-1">All done</div>
              <div className="text-sm text-gray-600 mb-5">
                {say || "Goal completed."}
              </div>
              <button
                onClick={() => {
                  stop();
                  setOpen(false);
                }}
                className="bg-gray-900 text-white text-sm rounded-md px-5 py-2 hover:bg-gray-800"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* panel — opens at cursor on right-click */}
      <AnimatePresence>
        {open && !collapsed && (
          <motion.div
            data-companion-panel
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            style={{ top: panelPos.y, left: panelPos.x }}
            className="fixed z-[70] w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden origin-top-left text-[12px]"
          >
            <button
              onClick={() => {
                stop();
                setOpen(false);
              }}
              className="absolute top-1.5 right-2 text-gray-300 hover:text-gray-700 text-xs z-10"
            >
              ✕
            </button>

            <div className="p-3 space-y-2">
              {/* Input form is always present. Submitting while a task is
                  in-flight cancels it (generation bump) and starts the new
                  one. Submitting while in done/punted state just starts fresh
                  (start() resets everything). */}
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder={
                  activeGoal && (status === "thinking" || status === "pointing")
                    ? "Replace task with something else…"
                    : "What do you want to do?"
                }
                rows={2}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => start(false)}
                  disabled={!goal.trim()}
                  className="flex-1 text-xs rounded py-1.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                  Guide me
                </button>
                <button
                  onClick={() => start(true)}
                  disabled={!goal.trim()}
                  className="flex-1 text-xs text-white rounded py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-40"
                >
                  Do it for me
                </button>
              </div>

              {/* Suggested goals for this page. Click fills the textarea so
                  the user can review/edit, then hit a button. */}
              {!activeGoal &&
                (suggestLoading || suggestions.length > 0) && (
                  <div className="pt-1 space-y-1">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">
                      Try
                    </div>
                    {suggestLoading && suggestions.length === 0 ? (
                      <div className="text-[11px] text-gray-400 italic">
                        Reading the page…
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => setGoal(s)}
                            className="text-[11px] text-left rounded-full border border-gray-200 px-2 py-0.5 hover:bg-gray-50 text-gray-700"
                            title={s}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {/* Destructive-action confirmation gate. */}
              {status === "confirming" && (
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <div className="text-[11px] text-gray-700">
                    About to click{" "}
                    <span className="font-semibold">"{confirmLabel}"</span>.
                    This looks destructive — confirm to continue.
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={skipDestructive}
                      className="flex-1 text-xs rounded py-1.5 border border-gray-200 hover:bg-gray-50"
                    >
                      Skip
                    </button>
                    <button
                      onClick={confirmAndContinue}
                      className="flex-1 text-xs text-white rounded py-1.5 bg-rose-600 hover:bg-rose-700"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}

              {activeGoal && status !== "confirming" && (
                <div className="pt-2 border-t border-gray-100 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[11px] text-gray-500 flex-1 truncate">
                      {activeGoal}
                    </div>
                    {(status === "thinking" || status === "pointing") && (
                      <button
                        onClick={stop}
                        className="text-[10px] text-gray-400 hover:text-gray-700 underline"
                      >
                        stop
                      </button>
                    )}
                  </div>
                  <div className="text-xs">
                    {status === "thinking" && "Thinking…"}
                    {status === "pointing" && "Pointing — click the highlight."}
                    {status === "done" && "Done ✅"}
                    {status === "punted" && "Couldn't help with that one."}
                  </div>
                  {say && (
                    <div className="text-[11px] text-gray-700 italic">
                      "{say}"
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-100">
                <span>
                  {latencyMs !== null && (
                    <>
                      provider: {provider} · last: {latencyMs}ms
                      {lastUsedVision && " · vision"}
                    </>
                  )}
                </span>
                <button
                  onClick={() => setLogsOpen((v) => !v)}
                  className="text-gray-500 hover:text-gray-900 underline"
                >
                  {logsOpen ? "hide logs" : `logs (${stepLogs.length})`}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LogsDrawer
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        logs={stepLogs}
      />
    </>
  );
}

function LogsDrawer({
  open,
  onClose,
  logs,
}: {
  open: boolean;
  onClose: () => void;
  logs: StepLog[];
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-companion-panel
          initial={{ x: 480 }}
          animate={{ x: 0 }}
          exit={{ x: 480 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 right-0 h-screen w-[480px] bg-white border-l border-gray-200 z-[75] flex flex-col shadow-2xl"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white">
            <div className="text-sm font-semibold">
              Logs · {logs.length} step{logs.length === 1 ? "" : "s"}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-sm"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-3 font-mono text-[11px]">
            {logs.length === 0 && (
              <div className="text-gray-400 italic">
                No steps yet. Start a guide to see request / response details.
              </div>
            )}
            {logs.map((step) => (
              <StepLogCard key={step.step} log={step} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StepLogCard({ log }: { log: StepLog }) {
  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 text-gray-700 flex items-center justify-between">
        <span className="font-semibold">Step {log.step}</span>
        <span className="text-gray-400">
          {new Date(log.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div className="px-3 py-2 text-gray-500 border-b border-gray-100 truncate">
        goal: {log.goal}
      </div>
      <div className="divide-y divide-gray-100">
        {log.events.map((e, i) => (
          <LogEventRow key={i} event={e} />
        ))}
      </div>
    </div>
  );
}

function LogEventRow({ event }: { event: LogEvent }) {
  if (event.type === "request") {
    return (
      <div className="px-3 py-2">
        <div className="text-sky-700 font-semibold mb-1">
          → POST /api/chat (attempt {event.attempt})
        </div>
        <pre className="whitespace-pre-wrap break-all text-gray-700">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      </div>
    );
  }
  if (event.type === "response") {
    return (
      <div className="px-3 py-2">
        <div className="text-emerald-700 font-semibold mb-1">
          ← response (attempt {event.attempt}) · {event.latencyMs}ms
        </div>
        <pre className="whitespace-pre-wrap break-all text-gray-700">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      </div>
    );
  }
  if (event.type === "screenshot") {
    return (
      <div className="px-3 py-2 text-amber-700">
        📷 screenshot captured · {Math.round(event.bytes / 1024)} KB ·{" "}
        {event.ms}ms
      </div>
    );
  }
  return <div className="px-3 py-2 text-gray-500">{event.text}</div>;
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-0.5 bg-white/95 border border-slate-200 rounded-full px-2 py-1 shadow-md">
      {[0, 0.15, 0.3].map((delay) => (
        <motion.span
          key={delay}
          style={{
            display: "inline-block",
            width: 5,
            height: 5,
            borderRadius: "9999px",
            background: "#0ea5e9",
          }}
          animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.7, repeat: Infinity, delay }}
        />
      ))}
    </div>
  );
}

function lookupRef(
  ref: string,
  refMap: Map<string, HTMLElement>
): HTMLElement | null {
  // auto-labeled refs live in the in-memory map
  const fromMap = refMap.get(ref);
  if (fromMap && document.body.contains(fromMap)) return fromMap;
  // tagged refs come from data-guide-id (Phase 1 path)
  const tagged = document.querySelector<HTMLElement>(
    `[data-guide-id="${CSS.escape(ref)}"]`
  );
  return tagged;
}

function DraggablePill({
  pos,
  setPos,
  status,
  onClick,
}: {
  pos: { x: number; y: number } | null;
  setPos: (p: { x: number; y: number }) => void;
  status: Status;
  onClick: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    if (pos === null) {
      const w = ref.current?.offsetWidth ?? 140;
      setPos({ x: window.innerWidth - w - 16, y: 96 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onMouseDown(e: React.MouseEvent) {
    if (!pos) return;
    e.preventDefault();
    e.stopPropagation();
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    };
    const onMove = (ev: MouseEvent) => {
      const s = dragState.current;
      if (!s) return;
      const dx = ev.clientX - s.startX;
      const dy = ev.clientY - s.startY;
      if (!s.moved && Math.hypot(dx, dy) > 4) s.moved = true;
      if (s.moved) {
        const w = ref.current?.offsetWidth ?? 140;
        const h = ref.current?.offsetHeight ?? 36;
        const nx = Math.max(8, Math.min(window.innerWidth - w - 8, s.originX + dx));
        const ny = Math.max(8, Math.min(window.innerHeight - h - 8, s.originY + dy));
        setPos({ x: nx, y: ny });
      }
    };
    const onUp = () => {
      const s = dragState.current;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      dragState.current = null;
      if (s && !s.moved) onClick();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const label = status === "thinking" ? "Thinking…" : "Working…";

  return (
    <motion.div
      ref={ref}
      data-companion-pill
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.18 }}
      onMouseDown={onMouseDown}
      style={{
        top: pos?.y ?? 96,
        left: pos?.x ?? (typeof window !== "undefined" ? window.innerWidth - 156 : 0),
        cursor: "grab",
        userSelect: "none",
      }}
      className="fixed z-[70] bg-white border border-gray-200 shadow-xl rounded-full pl-2 pr-3 py-2 flex items-center gap-2 hover:shadow-2xl"
      title="Drag to move · click to open"
    >
      <span className="relative w-4 h-4">
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: "rgba(56,189,248,0.45)", filter: "blur(4px)" }}
        />
        <motion.span
          className="absolute inset-0.5 rounded-full"
          style={{ background: "#0ea5e9" }}
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      </span>
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </motion.div>
  );
}

/**
 * Single dispatcher for every interactive element kind. The contract:
 *  - elements that take a "value" (text-shaped inputs, textareas, selects,
 *    contenteditable) receive that value via the appropriate React-aware path.
 *  - click-driven elements (buttons, links, nav items, ARIA-role widgets,
 *    checkbox/radio/submit `<input>`s) get a real .click().
 *  - disabled elements are skipped silently.
 *  - file inputs are skipped (browsers don't allow programmatic population).
 */
function performAuto(target: HTMLElement, value: string | null) {
  // disabled or aria-disabled: do nothing.
  if (
    (target as HTMLInputElement).disabled === true ||
    target.getAttribute("aria-disabled") === "true"
  ) {
    return;
  }

  // <select>
  if (target instanceof HTMLSelectElement) {
    if (target.multiple && value) {
      const wanted = value
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);
      Array.from(target.options).forEach((o) => {
        o.selected =
          wanted.includes(o.value.toLowerCase()) ||
          wanted.includes(o.text.trim().toLowerCase());
      });
      target.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    if (value) {
      const v = value.trim().toLowerCase();
      const opt =
        Array.from(target.options).find((o) => o.value === value) ||
        Array.from(target.options).find(
          (o) => o.text.trim().toLowerCase() === v
        );
      if (opt) setNativeSelectValue(target, opt.value);
      return;
    }
    target.click();
    return;
  }

  // <textarea>
  if (target instanceof HTMLTextAreaElement) {
    if (value != null) {
      target.focus();
      setNativeValue(target, value);
    }
    return;
  }

  // <input> — type matters
  if (target instanceof HTMLInputElement) {
    const t = (target.type || "text").toLowerCase();
    // click-driven input types
    if (
      t === "checkbox" ||
      t === "radio" ||
      t === "submit" ||
      t === "button" ||
      t === "reset" ||
      t === "image"
    ) {
      target.click();
      return;
    }
    // file: browsers disallow programmatic population
    if (t === "file") {
      console.warn(
        "[companion] cannot auto-populate <input type=file>; skipping"
      );
      return;
    }
    // text-shaped (text, email, url, search, tel, password, number, date,
    // time, datetime-local, week, month, color, range)
    if (value != null) {
      target.focus();
      setNativeValue(target, value);
    }
    return;
  }

  // contenteditable
  if (target.isContentEditable) {
    if (value != null) {
      target.focus();
      target.textContent = value;
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return;
  }

  // Everything else: <button>, <a>, [role=button|tab|menuitem|...], custom
  // toggle components, table rows. A real click is the right action.
  target.click();
}

function setNativeValue(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string
) {
  const proto =
    input.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function setNativeSelectValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    "value"
  )?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}
