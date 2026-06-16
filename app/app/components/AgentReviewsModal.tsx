"use client";
// Click an agent -> inspect its REAL on-chain reputation (ERC-8004), broken down by specialty,
// with a link to the registry on the Monad explorer.
import { useEffect, useState } from "react";
import { X, Star, ExternalLink, Loader2, BadgeCheck, ShieldAlert } from "lucide-react";
import type { Agent } from "@/lib/types";
import { STYLE_META, truncAddr } from "./shared";

type Breakdown = { style: keyof typeof STYLE_META; label: string; count: number; score: number };
type Review = { index: number; score: number; tag1: string; tag2: string; sealed: boolean };
type Data = { breakdown: Breakdown[]; reviews?: Review[]; registryUrl?: string; identityUrl?: string; clientUrl?: string };

const EXPLORER = "https://testnet.monadexplorer.com";

export default function AgentReviewsModal({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/agent-reviews?agentId=${agent.agentId}`)
      .then((r) => r.json())
      .then((d) => live && setData({ breakdown: d.breakdown ?? [], reviews: d.reviews ?? [], registryUrl: d.registryUrl, identityUrl: d.identityUrl, clientUrl: d.clientUrl }))
      .catch(() => live && setData({ breakdown: [] }));
    return () => {
      live = false;
    };
  }, [agent.agentId]);

  const meta = STYLE_META[agent.style];
  const v = agent.verification;
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

        {v && v.status !== "unavailable" ? (
          <div className="border-b border-white/[0.06] px-5 py-4">
            <div className="mb-2.5 font-mono text-[10px] font-medium tracking-[0.2em] text-zinc-500">VERIFIED IDENTITY (A-PASS)</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {v.status === "verified" ? (
                <span className="flex items-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-400/[0.08] px-2 py-1 font-mono text-[10.5px] tracking-[0.08em] text-emerald-300">
                  <BadgeCheck size={13} /> Verified A-Pass holder
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-md border border-amber-400/30 bg-amber-400/[0.08] px-2 py-1 font-mono text-[10.5px] tracking-[0.08em] text-amber-300">
                  <ShieldAlert size={13} /> Unverified — KYC pending
                </span>
              )}
              <a
                href={`${EXPLORER}/address/${agent.payoutAddress}`}
                target="_blank"
                rel="noreferrer"
                title={agent.payoutAddress}
                className="flex items-center gap-1 font-mono text-[11px] text-cyan-300/90 transition hover:text-cyan-200"
              >
                {truncAddr(agent.payoutAddress)} <ExternalLink size={10} />
              </a>
            </div>
            {v.status === "verified" ? (
              <div className="mt-3">
                {v.record ? (
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg border border-emerald-400/[0.18] bg-emerald-400/[0.05] px-3 py-2.5 font-mono text-[10.5px] text-emerald-200/90">
                    {v.record.recordId ? <span className="font-bold">A-Pass #{v.record.recordId}</span> : <span className="font-bold">A-Pass</span>}
                    {v.record.tier ? <span className="text-emerald-300/70">· Tier {v.record.tier}</span> : null}
                    {v.record.active ? <span className="text-emerald-300/70">· Active</span> : null}
                    {v.record.kycHashShort ? <span className="text-emerald-300/70" title="bank-verified KYC hash bound on-chain">· KYC {v.record.kycHashShort}</span> : null}
                    {v.record.expiresAt ? <span className="text-emerald-300/70">· exp {new Date(v.record.expiresAt * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short" })}</span> : null}
                  </div>
                ) : null}
                <a
                  href={`${EXPLORER}/address/${agent.payoutAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  title="The verified wallet holds the A-Pass on Monad"
                  className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-emerald-400/[0.25] bg-emerald-400/[0.06] px-3 py-2 font-mono text-[11px] tracking-[0.1em] text-emerald-300 transition hover:border-emerald-400/50 hover:bg-emerald-400/[0.1]"
                >
                  VIEW VERIFIED WALLET ON MONAD <ExternalLink size={12} />
                </a>
              </div>
            ) : v.status === "unverified" && v.onboardUrl ? (
              <a
                href={v.onboardUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-amber-400/[0.25] bg-amber-400/[0.06] px-3 py-2 font-mono text-[11px] tracking-[0.1em] text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-400/[0.1]"
              >
                OPEN KYC MAGIC LINK <ExternalLink size={12} />
              </a>
            ) : null}
          </div>
        ) : null}

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
          {data && data.reviews && data.reviews.length > 0 ? (
            <div className="mt-4">
              <div className="mb-2 font-mono text-[10px] font-medium tracking-[0.2em] text-zinc-500">RECENT RATINGS · ON-CHAIN</div>
              <ul className="flex flex-col gap-1.5">
                {data.reviews.map((r) => {
                  const label = STYLE_META[r.tag1 as keyof typeof STYLE_META]?.label ?? r.tag1;
                  return (
                    <li key={r.index} className="flex items-center justify-between gap-3 rounded-md border border-white/[0.05] bg-white/[0.015] px-3 py-1.5">
                      <span className="flex items-center gap-2">
                        <span className="flex items-center gap-1 font-mono text-[12px] font-bold text-emerald-300">
                          <Star size={10} fill="currentColor" /> {r.score.toFixed(1)}
                        </span>
                        <span className="font-mono text-[9.5px] tracking-[0.1em] text-zinc-500">{label}</span>
                      </span>
                      <span className="flex items-center gap-2 font-mono text-[10px] text-zinc-600">
                        {r.sealed ? (
                          <span className="text-cyan-300/70" title="deliverable hash sealed on-chain">sealed</span>
                        ) : null}
                        job #{r.index}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
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
