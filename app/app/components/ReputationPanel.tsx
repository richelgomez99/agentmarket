"use client";
// From the design handoff (specs/001-agentmarket/design) — count-up score animation.
import { useEffect, useState } from "react";
import { TrendingUp, Star, ExternalLink } from "lucide-react";
import type { Agent } from "@/lib/types";
import { PanelShell, truncAddr, truncHash } from "./shared";

export default function ReputationPanel({
  agent,
  previousScore,
  txHash,
  explorerUrl,
}: {
  agent: Agent;
  previousScore?: number;
  txHash?: string;
  explorerUrl?: string;
}) {
  const target = agent.reputation.score;
  const from = previousScore !== undefined ? previousScore : target;
  const [val, setVal] = useState(from);
  useEffect(() => {
    if (from === target) {
      setVal(target);
      return;
    }
    let raf = 0;
    let start = 0;
    const DUR = 1500;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / DUR);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * ease);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, target]);

  const rising = previousScore !== undefined && target > previousScore;
  return (
    <PanelShell
      title="REPUTATION"
      icon={<TrendingUp size={13} className="text-cyan-300" />}
      right={rising ? <span className="animate-pop-in font-mono text-[10px] font-bold tracking-[0.15em] text-emerald-400">▲ SCORE UP</span> : null}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-[14px] font-bold tracking-tight text-zinc-100">{agent.name}</span>
          <span className="font-mono text-[10px] tracking-[0.12em] text-zinc-500">{truncAddr(agent.payoutAddress)}</span>
        </div>
        <div className="mt-2.5 flex items-end gap-3">
          <span className={"font-mono text-[40px] font-bold leading-none tracking-tight " + (rising ? "text-emerald-400" : "text-zinc-100")}>
            {val.toFixed(2)}
          </span>
          <div className="pb-1">
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={13} className={i < Math.round(val) ? (rising ? "text-emerald-400" : "text-cyan-300") : "text-zinc-700"} fill="currentColor" />
              ))}
            </div>
            {rising ? (
              <div className="mt-1 animate-pop-in font-mono text-[10.5px] font-medium text-emerald-400">
                +{(target - (previousScore as number)).toFixed(1)} from {previousScore!.toFixed(1)}
              </div>
            ) : (
              <div className="mt-1 font-mono text-[10.5px] text-zinc-500">on-chain score</div>
            )}
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div className={"h-full rounded-full transition-all duration-1000 " + (rising ? "bg-emerald-400" : "bg-cyan-400/70")} style={{ width: (val / 5) * 100 + "%" }}></div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className={"rounded border px-2 py-1 font-mono text-[10.5px] font-medium tracking-[0.08em] " + (rising ? "animate-pop-in border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.04] text-zinc-400")}>
            JOB #{agent.reputation.count}{rising ? " · NEW" : ""}
          </span>
          {txHash && explorerUrl ? (
            <a href={explorerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-mono text-[10px] tracking-[0.08em] text-cyan-300 transition hover:text-cyan-200">
              {truncHash(txHash)} <ExternalLink size={10} />
            </a>
          ) : null}
        </div>
        {rising ? <p className="mt-2.5 text-[11.5px] leading-relaxed text-zinc-500">Rating written on-chain — this job is now part of the agent&apos;s permanent track record.</p> : null}
      </div>
    </PanelShell>
  );
}
