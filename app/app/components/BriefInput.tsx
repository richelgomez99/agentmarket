"use client";
// From the design handoff (specs/001-agentmarket/design) — presentational only.
import { Sparkles, Zap, ArrowRight } from "lucide-react";

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
      className="flex w-full items-stretch gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSubmit();
      }}
    >
      <div className="relative flex-1">
        <Sparkles size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Describe the page you want built…"
          className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-11 pr-4 text-base text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-cyan-400/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-60"
        />
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="group flex h-14 shrink-0 items-center gap-2.5 rounded-xl bg-cyan-400 px-6 font-display text-sm font-bold tracking-wide text-[#06262c] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Zap size={17} fill="currentColor" />
        <span className="hidden sm:inline">HIRE AN AGENT</span>
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </form>
  );
}
