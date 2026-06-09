"use client";
// AGENT COMMS — the live conversation between the orchestrator and the market's agents,
// driven by REAL pipeline events (applications, pitch submissions, the hire, build milestones
// detected in the actual code stream, settlement, rating). Presentational; auto-scrolls.
import { useEffect, useRef } from "react";
import { MessagesSquare, Bot, Cpu } from "lucide-react";
import { PanelShell } from "./shared";

export type ThreadMsg = { who: "orchestrator" | "agent"; name: string; text: string; accent?: string };

export default function JobThread({ messages, live }: { messages: ThreadMsg[]; live?: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);
  if (!messages.length) return null;
  return (
    <PanelShell
      title="AGENT COMMS"
      icon={<MessagesSquare size={13} className="text-cyan-300" />}
      right={
        live ? (
          <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.15em] text-cyan-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300"></span>LIVE
          </span>
        ) : null
      }
    >
      <div className="flex max-h-[330px] flex-col gap-2 overflow-y-auto px-3.5 py-3">
        {messages.map((m, i) => (
          <div key={i} className={"animate-slide-in " + (m.who === "agent" ? "pl-4" : "")}>
            <div className="mb-0.5 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.2em] text-zinc-500">
              {m.who === "orchestrator" ? (
                <Cpu size={10} className="text-cyan-300" />
              ) : (
                <Bot size={10} style={{ color: m.accent || "#fcd34d" }} />
              )}
              {m.name.toUpperCase()}
            </div>
            <div
              className={
                "whitespace-pre-wrap rounded-lg border px-3 py-1.5 text-[12px] leading-relaxed text-zinc-200 " +
                (m.who === "orchestrator" ? "border-cyan-400/20 bg-cyan-400/[0.05]" : "border-white/[0.08] bg-white/[0.03]")
              }
              style={m.who === "agent" && m.accent ? { borderColor: m.accent + "44", background: m.accent + "0e" } : undefined}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </PanelShell>
  );
}
