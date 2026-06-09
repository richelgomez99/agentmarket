"use client";
// From the design handoff (specs/001-agentmarket/design) — live feed of REAL tx hashes.
import { Activity, ExternalLink } from "lucide-react";
import type { ExplorerEvent } from "@/lib/types";
import { PanelShell, truncHash, timeAgo } from "./shared";

export default function ExplorerPanel({ events }: { events: ExplorerEvent[] }) {
  const sorted = [...events].sort((a, b) => b.ts - a.ts);
  return (
    <PanelShell
      title="ON-CHAIN ACTIVITY"
      icon={<Activity size={13} className="text-cyan-300" />}
      right={<span className="font-mono text-[10px] tracking-[0.15em] text-zinc-600">{sorted.length} TXS</span>}
    >
      {sorted.length === 0 ? (
        <p className="px-4 py-3 font-mono text-[11.5px] leading-relaxed text-zinc-600">
          no transactions yet — payment and reputation txs will appear here, live
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {sorted.map((ev, i) => (
            <li key={ev.txHash + ev.ts}>
              <a href={ev.explorerUrl} target="_blank" rel="noreferrer" className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.03]">
                <span className="relative flex h-2 w-2 shrink-0">
                  {i === 0 ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60"></span> : null}
                  <span className={"relative inline-flex h-2 w-2 rounded-full " + (i === 0 ? "bg-cyan-400" : "bg-zinc-600")}></span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[12px] font-medium text-zinc-200">{ev.label}</span>
                    {i === 0 ? <span className="shrink-0 rounded bg-cyan-400/15 px-1 py-px font-mono text-[8.5px] font-bold tracking-[0.2em] text-cyan-300">LIVE</span> : null}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10.5px] text-zinc-500 transition group-hover:text-cyan-300/80">{truncHash(ev.txHash)}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="font-mono text-[9.5px] text-zinc-600">{timeAgo(ev.ts)}</span>
                  <ExternalLink size={11} className="text-zinc-700 transition group-hover:text-cyan-300" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  );
}
