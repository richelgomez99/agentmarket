"use client";
// The HIRING AGENT's live reasoning. Rendered as clean styled rows (not a terminal dump),
// height-capped with internal scroll so appending text never shifts the rest of the page.
import { useEffect, useRef, useState } from "react";
import { Cpu, Zap } from "lucide-react";
import { PanelShell } from "./shared";

function ReasoningLine({ line }: { line: string }) {
  if (line.startsWith("▸")) {
    return (
      <div className="flex gap-2 py-[3px]">
        <span className="mt-[3px] shrink-0 text-cyan-300">▸</span>
        <span className="text-[12.5px] leading-relaxed text-zinc-200">{line.replace(/^▸\s*/, "")}</span>
      </div>
    );
  }
  if (/^\s/.test(line)) {
    // indented sub-line (agent rows / pitch-by-pitch reads)
    return <div className="whitespace-pre py-[1px] pl-4 font-mono text-[11px] leading-relaxed text-zinc-500">{line.replace(/^\s+/, "")}</div>;
  }
  return <div className="py-[2px] text-[12.5px] leading-relaxed text-zinc-300">{line}</div>;
}

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
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!streaming) {
      setShown(text.length);
      return;
    }
    setShown(0);
    let raf = 0;
    let start = 0;
    const CPS = 130;
    const step = (t: number) => {
      if (!start) start = t;
      const n = Math.min(text.length, Math.floor(((t - start) / 1000) * CPS));
      setShown(n);
      if (n < text.length) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, streaming]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [shown]);

  const done = shown >= text.length;
  const visible = text.slice(0, shown);
  const lines = visible.split("\n");

  return (
    <PanelShell
      title="HIRING AGENT"
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
      <div ref={scrollRef} className="max-h-[300px] overflow-y-auto px-4 py-3">
        {text ? (
          <div>
            {lines.map((l, i) => (
              <ReasoningLine key={i} line={l} />
            ))}
            {streaming && !done ? <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-cyan-300 align-middle"></span> : null}
          </div>
        ) : (
          <p className="py-2 text-[12px] leading-relaxed text-zinc-600">
            Idle — submit a brief and the hiring agent will scan the on-chain market and hire the best-proven specialist for the job.
          </p>
        )}

        {showHireBanner(selectedAgentName, done, text) ? (
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

function showHireBanner(name: string | undefined, done: boolean, text: string) {
  return !!name && done && text.length > 0;
}
