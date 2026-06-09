"use client";
// Agent-to-agent job thread: the orchestrator's detailed acceptance review and the hired
// agent's reply (service terms: included revisions + per-edit pricing). Presentational.
import { MessagesSquare, Bot, Cpu } from "lucide-react";
import { PanelShell } from "./shared";

export type ThreadMsg = { who: "orchestrator" | "agent"; name: string; text: string };

export default function JobThread({ messages }: { messages: ThreadMsg[] }) {
  if (!messages.length) return null;
  return (
    <PanelShell title="JOB THREAD" icon={<MessagesSquare size={13} className="text-cyan-300" />}>
      <div className="flex flex-col gap-2.5 px-3.5 py-3">
        {messages.map((m, i) => (
          <div key={i} className="animate-slide-in">
            <div className="mb-1 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.2em] text-zinc-500">
              {m.who === "orchestrator" ? <Cpu size={10} className="text-cyan-300" /> : <Bot size={10} className="text-amber-300" />}
              {m.name.toUpperCase()}
            </div>
            <div
              className={
                "whitespace-pre-wrap rounded-lg border px-3 py-2 text-[12px] leading-relaxed " +
                (m.who === "orchestrator"
                  ? "border-cyan-400/20 bg-cyan-400/[0.05] text-zinc-200"
                  : "border-amber-300/20 bg-amber-300/[0.05] text-zinc-200")
              }
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}
