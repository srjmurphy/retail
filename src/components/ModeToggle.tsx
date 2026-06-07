"use client";

import { Cpu, Sparkles } from "lucide-react";
import type { RunMode } from "@/types/demo";

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: RunMode;
  onChange: (mode: RunMode) => void;
}) {
  return (
    <div className="flex rounded-md border border-neutral-300 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("demo")}
        className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition ${
          mode === "demo" ? "bg-neutral-950 text-white" : "text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        <Cpu className="h-4 w-4" aria-hidden="true" />
        Demo data
      </button>
      <button
        type="button"
        onClick={() => onChange("live")}
        className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition ${
          mode === "live" ? "bg-neutral-950 text-white" : "text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Maven Live
      </button>
    </div>
  );
}
