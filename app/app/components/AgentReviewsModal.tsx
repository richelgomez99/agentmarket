"use client";
// Click an agent -> inspect its REAL on-chain reputation (ERC-8004), broken down by specialty,
// with a link to the registry on the Monad explorer.
import { useEffect, useState } from "react";
import { X, Star, ExternalLink, Loader2 } from "lucide-react";
import type { Agent } from "@/lib/types";
import { STYLE_META } from "./shared";

type Breakdown = { style: keyof typeof STYLE_META; label: string; count: number; score: number };
type Data = { breakdown: Breakdown[]; registryUrl?: string; identityUrl?: string; clientUrl?: string };

export default function AgentReviewsModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/agent-reviews?agentId=${agent.agentId}`)
      .then((r) => r.json())
      .then((d) => live && setData({ breakdown: d.breakdown ?? [], registryUrl: d.registryUrl, identityUrl: d.identityUrl, clientUrl: d.clientUrl }))
      .catch(() => live && setData({ breakdown: [] }));
    return () => {
      live = false;
    };
  }, [agent.agentId]);

  const meta = STYLE_META[agent.style];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f15] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="font-display text-[17px] font-bold tracking-tight text-white">{agent.name}</span>
            <span className={"rounded border px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.12em] " + meta.chip}>{meta.label}</span>
          </div>
          <button onClick={onClose} className="rounded p-1 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-5 border-b border-white/[0.06] px-5 py-4">
          <div>
            <div className="flex items-baseline gap-1.5">
              <Star size={15} className="text-cyan-300" fill="currentColor" />
              <span className="font-mono text-[28px] font-bold leading-none text-zinc-100">{agent.reputation.score.toFixed(2)}</span>
            </div>
            <div className="mt-1 font-mono text-[10px] tracking-[0.12em] text-zinc-500">ON-CHAIN SCORE</div>
          </div>
          <div className="h-9 w-px bg-white/10" />
          <div>
            <div className="font-mono text-[28px] font-bold leading-none text-zinc-100">{agent.reputation.count}</div>
            <div className="mt-1 font-mono text-[10px] tracking-[0.12em] text-zinc-500">PAID JOBS</div>
          </div>
          <div className="ml-auto text-right">
            <div className="font-mono text-[10px] text-zinc-500">ERC-8004</div>
            <div className="font-mono text-[14px] font-bold text-cyan-300">#{agent.agentId}</div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="mb-2.5 font-mono text-[10px] font-medium tracking-[0.2em] text-zinc-500">REPUTATION BY SPECIALTY</div>
          {data === null ? (
            <div className="flex items-center gap-2 py-6 font-mono text-[12px] text-zinc-500">
              <Loader2 size={14} className="animate-spin" /> reading the registry…
            </div>
          ) : data.breakdown.length === 0 ? (
            <p className="py-4 font-mono text-[12px] leading-relaxed text-zinc-600">No paid jobs on record yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.breakdown.map((b) => {
                const bm = STYLE_META[b.style];
                return (
                  <li key={b.style} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className={"h-1.5 w-1.5 rounded-full " + bm.dot}></span>
                      <span className="font-mono text-[10.5px] tracking-[0.1em] text-zinc-300">{b.label}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-zinc-500">{b.count} paid jobs</span>
                      <span className="flex items-center gap-1 font-mono text-[14px] font-bold text-emerald-300">
                        <Star size={11} fill="currentColor" /> {b.score.toFixed(2)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
            Every rating is bound to a completed, paid job and written by the paying client — the registry rejects self-feedback.
          </p>
          {data?.registryUrl ? (
            <a
              href={data.registryUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-[11px] tracking-[0.1em] text-cyan-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.06]"
            >
              INSPECT THE ON-CHAIN REGISTRY <ExternalLink size={12} />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
