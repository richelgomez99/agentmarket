"use client";
// Brief composer — multi-line so a real brand brief is readable at a glance.
// Enter submits (Shift+Enter for a new line). Same prop contract as the design handoff.
import { FileText, Zap, ArrowRight } from "lucide-react";

export default function BriefInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange(v: string): void;
  onSubmit(): void;
  disabled?: boolean;
}) {
  return (
    <form
      className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition focus-within:border-cyan-400/50 focus-within:ring-2 focus-within:ring-cyan-400/20"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSubmit();
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2">
        <span className="flex items-center gap-2 font-mono text-[10px] font-medium tracking-[0.2em] text-zinc-400">
          <FileText size={12} className="text-cyan-300" /> DESIGN BRIEF
        </span>
        <span className="hidden font-mono text-[9.5px] tracking-[0.1em] text-zinc-600 sm:inline">
          include your brand: colors · type · mood — the orchestrator hires against it
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!disabled) onSubmit();
          }
        }}
        disabled={disabled}
        rows={3}
        placeholder={"Describe the page you want built…\ne.g. Rebuild our landing page. Brand: premium, nocturnal. Colors: near-black + gold. Type: serif display."}
        className="block w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-relaxed text-zinc-100 placeholder-zinc-600 outline-none disabled:opacity-60"
      />
      <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-3 py-2">
        <span className="px-1 font-mono text-[9.5px] tracking-[0.1em] text-zinc-600">
          enter ↵ to post · shift+enter for a new line
        </span>
        <button
          type="submit"
          disabled={disabled}
          className="group flex h-10 shrink-0 items-center gap-2 rounded-lg bg-cyan-400 px-5 font-display text-[13px] font-bold tracking-wide text-[#06262c] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Zap size={15} fill="currentColor" />
          <span>HIRE AN AGENT</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </form>
  );
}
