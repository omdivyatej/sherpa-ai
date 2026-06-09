"use client";

import { useEffect, useState } from "react";

type Tone = "info" | "success" | "error";
type Listener = (msg: string, tone: Tone) => void;

let listeners: Listener[] = [];

export function toast(msg: string, tone: Tone = "info") {
  listeners.forEach((l) => l(msg, tone));
}

type Entry = { id: number; msg: string; tone: Tone };

export default function ToastContainer() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    const fn: Listener = (msg, tone) => {
      const id = Date.now() + Math.random();
      setEntries((t) => [...t, { id, msg, tone }]);
      setTimeout(
        () => setEntries((t) => t.filter((x) => x.id !== id)),
        3500
      );
    };
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  }, []);

  return (
    <div
      data-companion-overlay
      className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
    >
      {entries.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto px-3 py-2 rounded-md text-xs shadow-lg ${
            t.tone === "success"
              ? "bg-emerald-600 text-white"
              : t.tone === "error"
              ? "bg-rose-600 text-white"
              : "bg-slate-900 text-white"
          }`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
