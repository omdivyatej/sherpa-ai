"use client";

import { useEffect, useRef } from "react";
import { getCursorSrc } from "@/lib/companionConfig";

/**
 * Global custom cursor. Hides the OS arrow site-wide and renders a fake
 * cursor image (/cursor.png) that follows the mouse. The Companion can
 * temporarily hide this in autonomous mode by setting style.display="none".
 */
export default function CustomCursor() {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // hide OS cursor on every element by injecting a global stylesheet —
    // wins over component-level `cursor: pointer` on buttons, links, etc.
    const style = document.createElement("style");
    style.dataset.customCursor = "true";
    style.textContent = `*, *::before, *::after { cursor: none !important; }`;
    document.head.appendChild(style);

    // first-show — pin to a sensible default before any mousemove
    const el = ref.current;
    if (el) {
      el.style.transform = `translate(${window.innerWidth / 2}px, ${
        window.innerHeight / 2
      }px)`;
    }

    const onMove = (e: MouseEvent) => {
      const node = ref.current;
      if (!node) return;
      if (node.dataset.suppressed === "true") return;
      node.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      style.remove();
    };
  }, []);

  return (
    <img
      ref={ref}
      src={getCursorSrc()}
      alt=""
      width={32}
      height={32}
      data-custom-cursor
      data-companion-overlay
      className="pointer-events-none fixed top-0 left-0 z-[9999]"
      style={{ transform: "translate(-100px, -100px)" }}
    />
  );
}
