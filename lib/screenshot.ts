import { domToCanvas } from "modern-screenshot";

const MAX_EDGE = 1280;
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Captures the current viewport, excludes the companion's own overlays,
 * downscales so the longest edge is <= MAX_EDGE, and returns raw base64
 * PNG (no data-URL prefix). Returns null on failure.
 *
 * Uses `modern-screenshot` instead of html2canvas because the latter can't
 * parse modern CSS color functions (oklch, lab) that Tailwind v4 / Next 16
 * emit by default.
 */
export async function captureViewport(): Promise<string | null> {
  try {
    const canvas = await domToCanvas(document.body, {
      width: window.innerWidth,
      height: window.innerHeight,
      // 0.6 captures at ~40% fewer pixels → faster. UI text stays readable
      // for vision since we still downscale to MAX_EDGE after.
      scale: 0.6,
      backgroundColor: "#ffffff",
      filter: (node: Node) => {
        if (!(node instanceof HTMLElement)) return true;
        if (node.hasAttribute("data-companion-panel")) return false;
        if (node.hasAttribute("data-companion-pill")) return false;
        if (node.hasAttribute("data-companion-overlay")) return false;
        return true;
      },
    });

    const out = downscale(canvas, MAX_EDGE);
    let base64 = stripPrefix(out.toDataURL("image/png"));

    if (approxBytes(base64) > MAX_BYTES) {
      const smaller = downscale(canvas, 900);
      base64 = stripPrefix(smaller.toDataURL("image/png"));
      if (approxBytes(base64) > MAX_BYTES) return null;
    }
    return base64;
  } catch (err) {
    console.warn("[companion] screenshot capture failed", err);
    return null;
  }
}

function downscale(src: HTMLCanvasElement, maxEdge: number): HTMLCanvasElement {
  const longest = Math.max(src.width, src.height);
  if (longest <= maxEdge) return src;
  const scale = maxEdge / longest;
  const out = document.createElement("canvas");
  out.width = Math.round(src.width * scale);
  out.height = Math.round(src.height * scale);
  const ctx = out.getContext("2d");
  if (!ctx) return src;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

function stripPrefix(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

function approxBytes(base64: string): number {
  const padding = base64.match(/=+$/)?.[0].length ?? 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}
