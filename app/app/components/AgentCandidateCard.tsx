"use client";
// From the design handoff (specs/001-agentmarket/design) — presentational only.
// Clickable: opens the agent's on-chain review history.
import { Bot, Star, BadgeCheck, History } from "lucide-react";
import type { Agent, Style } from "@/lib/types";
import { STYLE_META, truncAddr } from "./shared";
import VerifiedBadge from "./VerifiedBadge";

export default function AgentCandidateCard({
  agent,
  inferredStyle,
  selected,
  onClick,
}: {
  agent: Agent;
  inferredStyle?: Style;
  selected?: boolean;
  onClick?: () => void;
}) {
  const meta = STYLE_META[agent.style];
  const isMatch = !!inferredStyle && inferredStyle === agent.style;
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      title={onClick ? "View on-chain reviews" : undefined}
      className={
        "group relative rounded-xl border p-3.5 transition-all duration-500 " +
        (onClick ? "cursor-pointer " : "") +
        (selected
          ? "border-cyan-400/70 bg-cyan-400/[0.07] shadow-[0_0_28px_-4px_rgba(34,211,238,0.4)] ring-1 ring-cyan-400/40"
          : "border-white/[0.07] bg-[#101218] hover:border-white/[0.14]")
      }
    >
      {onClick ? (
        <span className="absolute right-3 top-3 flex items-center gap-1 font-mono text-[8.5px] tracking-[0.15em] text-zinc-600 opacity-0 transition group-hover:opacity-100">
          <History size={10} /> REVIEWS
        </span>
      ) : null}
      {selected ? (
        <div className="absolute -top-2.5 right-3 flex animate-pop-in items-center gap-1 rounded-full bg-cyan-400 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.18em] text-[#06262c]">
          <BadgeCheck size={11} /> HIRED
        </div>
      ) : null}
      <div className="flex items-start gap-3">
        <div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border " + (selected ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300" : "border-white/10 bg-white/[0.04] text-zinc-400")}>
          <Bot size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-display text-[15px] font-bold tracking-tight text-zinc-100">{agent.name}</span>
            <span className="flex shrink-0 items-center gap-1 font-mono text-[15px] font-bold text-zinc-100">
              <Star size={13} className={selected ? "text-cyan-300" : "text-zinc-400"} fill="currentColor" />
              {agent.reputation.score.toFixed(1)}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={"rounded border px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.12em] " + meta.chip}>{meta.label}</span>
            <span className="font-mono text-[10.5px] text-zinc-500">{agent.reputation.count} paid jobs</span>
            <VerifiedBadge verification={agent.verification} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
        <span className="font-mono text-[10.5px] text-zinc-500">{truncAddr(agent.payoutAddress)}</span>
        {isMatch ? (
          <span className="flex items-center gap-1 font-mono text-[9.5px] font-medium tracking-[0.15em] text-cyan-300">
            <span className="h-1 w-1 rounded-full bg-cyan-300"></span>STYLE MATCH
          </span>
        ) : agent.perStyleScore !== undefined && inferredStyle ? (
          <span className="font-mono text-[9.5px] tracking-[0.1em] text-zinc-600">★{agent.perStyleScore.toFixed(1)} off-specialty</span>
        ) : null}
      </div>
    </div>
  );
}
