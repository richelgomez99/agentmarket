"use client";
// From the design handoff (specs/001-agentmarket/design) — presentational typewriter.
import { useEffect, useState } from "react";
import { Cpu, Zap } from "lucide-react";
import { PanelShell } from "./shared";

export default function OrchestratorReasoning({
  text,
  streaming,
  selectedAgentName,
}: {
  text: string;
  streaming: boolean;
  selectedAgentName?: string;
}) {
  const [shown, setShown] = useState(streaming ? 0 : text.length);
  useEffect(() => {
    if (!streaming) {
      setShown(text.length);
      return;
    }
    setShown(0);
    let raf = 0;
    let start = 0;
    const CPS = 110;
    const step = (t: number) => {
      if (!start) start = t;
      const n = Math.min(text.length, Math.floor(((t - start) / 1000) * CPS));
      setShown(n);
      if (n < text.length) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, streaming]);

  const done = shown >= text.length;
  const showHire = !!selectedAgentName && done && text.length > 0;

  return (
    <PanelShell
      title="ORCHESTRATOR"
      icon={<Cpu size={13} className="text-cyan-300" />}
      right={
        streaming && !done ? (
          <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.15em] text-cyan-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300"></span>THINKING
          </span>
        ) : text ? (
          <span className="font-mono text-[10px] tracking-[0.15em] text-emerald-400">RESOLVED</span>
        ) : (
          <span className="font-mono text-[10px] tracking-[0.15em] text-zinc-600">IDLE</span>
        )
      }
    >
      <div className="px-4 py-3">
        {text ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.75] text-zinc-300">
            {text.slice(0, shown)}
            {streaming && !done ? <span className="ml-0.5 inline-block h-3.5 w-2 animate-pulse bg-cyan-300 align-middle"></span> : null}
          </pre>
        ) : (
          <p className="py-2 font-mono text-[12px] leading-relaxed text-zinc-600">
            {"// orchestrator idle — submit a brief and I will scan the"}
            <br />
            {"// on-chain market and hire the best-proven specialist"}
          </p>
        )}

        {showHire ? (
          <div className="mt-3 animate-pop-in rounded-lg border border-cyan-400/40 bg-cyan-400/[0.08] p-3.5 shadow-[0_0_32px_-6px_rgba(34,211,238,0.45)]">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-[0.25em] text-cyan-300">
              <Zap size={11} fill="currentColor" /> DECISION · HIRING
            </div>
            <div className="mt-1 font-display text-2xl font-bold tracking-tight text-white">{selectedAgentName}</div>
            <div className="mt-0.5 text-[12px] text-cyan-200/80">Best pitch and the strongest proven track record for this style.</div>
          </div>
        ) : null}
      </div>
    </PanelShell>
  );
}
