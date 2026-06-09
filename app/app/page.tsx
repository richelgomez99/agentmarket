"use client";
// AgentMarket — main demo screen (T1: live pitch -> evaluate -> hire -> STREAMED build).
// T1 runs with zero chain dependency: agents/reputation are local stubs (STAGED_REPUTATION)
// and orchestration is a client-side stub; T2 replaces both with /api/orchestrate (on-chain
// registry + per-style getSummary). Payment (T3) and reputation write (T4) wire in later.
import { useCallback, useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import BriefInput from "./components/BriefInput";
import JobThread, { type ThreadMsg } from "./components/JobThread";
import OrchestratorReasoning from "./components/OrchestratorReasoning";
import AgentCandidateCard from "./components/AgentCandidateCard";
import DesignPreviewGrid from "./components/DesignPreviewGrid";
import PaymentPanel from "./components/PaymentPanel";
import ReputationPanel from "./components/ReputationPanel";
import ExplorerPanel from "./components/ExplorerPanel";
import { STYLES, styleById } from "@/lib/styles";
import { UGLY_PAGE } from "@/lib/uglyPage";
import { guardHtml } from "@/lib/htmlGuard";
import type { Agent, DesignOutput, ExplorerEvent, Payment, Style } from "@/lib/types";

type Phase = "idle" | "pitching" | "evaluating" | "building" | "awaiting" | "paying" | "rating" | "done";

const SENTINEL = "@@RESULT@@";

/** Consume an orchestrate stream: returns the reasoning text + the sentinel JSON result. */
async function consumeOrchestrate<T>(res: Response): Promise<{ text: string; result: T }> {
  if (!res.ok || !res.body) throw new Error("orchestrate failed");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let acc = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    acc += dec.decode(value, { stream: true });
  }
  const i = acc.lastIndexOf(SENTINEL);
  if (i < 0) throw new Error("no result");
  const result = JSON.parse(acc.slice(i + SENTINEL.length)) as T;
  if ((result as { error?: string }).error) throw new Error("orchestrate error");
  return { text: acc.slice(0, i).trimEnd(), result };
}

const PHASE_HEADLINE: Record<Phase, string> = {
  idle: "Awaiting brief — the market is open",
  pitching: "Brief posted — agents are submitting quick style pitches",
  evaluating: "Orchestrator is judging pitches + track records",
  building: "Agent hired — full build streaming live",
  awaiting: "HTTP 402 — build delivered, payment required",
  paying: "Settling USDC on-chain via x402",
  rating: "Writing reputation on-chain (ERC-8004)",
  done: "Job complete — paid + rated on-chain",
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [brief, setBrief] = useState(
    "Our landing page looks like generic AI output. Rebuild it. Brand: Nocturne Coffee — premium, nocturnal, quiet luxury. Colors: near-black with a warm gold accent. Type: elegant serif display. Mood: brewed for the late shift."
  );
  const [outputs, setOutputs] = useState<DesignOutput[]>([]);
  const [inferredStyle, setInferredStyle] = useState<Style | undefined>();
  const [hiredStyle, setHiredStyle] = useState<Style | undefined>();
  const [candidates, setCandidates] = useState<Agent[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [liveCode, setLiveCode] = useState("");
  const [buildElapsed, setBuildElapsed] = useState(0);
  const [payment, setPayment] = useState<Payment | undefined>();
  const [events, setEvents] = useState<ExplorerEvent[]>([]);
  const [rating, setRating] = useState<{ txHash: string; explorerUrl: string; previousScore: number } | undefined>();
  const [thread, setThread] = useState<ThreadMsg[]>([]);
  const [appliedCount, setAppliedCount] = useState(0);
  const runId = useRef(0);

  // Idle market rail: real agents + on-chain reputation, read at mount (T2)
  useEffect(() => {
    fetch("/api/orchestrate")
      .then((r) => r.json())
      .then((d) => setCandidates((prev) => (prev.length ? prev : d.candidates ?? [])))
      .catch(() => {});
  }, []);

  const agents: Agent[] = candidates.map((a) => ({ ...a, hired: a.style === hiredStyle }));
  const hiredAgent = agents.find((a) => a.hired);

  // build timer
  useEffect(() => {
    if (phase !== "building") return;
    const t0 = Date.now();
    const iv = setInterval(() => setBuildElapsed(Date.now() - t0), 100);
    return () => clearInterval(iv);
  }, [phase]);

  // agents "apply" one by one when the brief is posted
  useEffect(() => {
    if (phase !== "pitching") return;
    setAppliedCount(0);
    const timers = [600, 1300, 2100, 2800].map((ms, i) => setTimeout(() => setAppliedCount(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const runBuild = useCallback(async (style: Style, briefText: string, id: number): Promise<string> => {
    setPhase("building");
    setOutputs((prev) => [{ style, html: "", status: "loading" }, ...prev.filter((o) => o.style !== style)]);
    let acc = "";
    let lastPaint = 0;
    const paint = (final?: { html: string; status: DesignOutput["status"]; elapsedMs?: number }) =>
      setOutputs((prev) =>
        prev.map((o) =>
          o.style === style
            ? final
              ? { style, ...final }
              : { ...o, html: acc, status: "loading" as const }
            : o
        )
      );
    const t0 = Date.now();
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brief: briefText, style, mode: "build" }),
      });
      if (!res.ok || !res.body) throw new Error("build failed");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (id !== runId.current) return ""; // superseded run
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setLiveCode(acc);
        const now = Date.now();
        if (now - lastPaint > 400) {
          lastPaint = now;
          paint(); // progressive render of partial HTML
        }
      }
      // finalize: sentinel fallback or guarded final doc
      const sentinel = acc.lastIndexOf("<!--FALLBACK-->");
      let finalHtml: string;
      if (sentinel >= 0) {
        finalHtml = acc.slice(sentinel + "<!--FALLBACK-->".length);
        paint({ html: finalHtml, status: "fallback", elapsedMs: Date.now() - t0 });
      } else {
        const g = guardHtml(acc);
        finalHtml = g.html ?? styleById(style).fallbackHtml;
        paint({ html: finalHtml, status: g.html ? "generated" : "fallback", elapsedMs: Date.now() - t0 });
      }
      setLiveCode("");
      return finalHtml;
    } catch {
      if (id !== runId.current) return "";
      const fb = styleById(style).fallbackHtml;
      paint({ html: fb, status: "fallback", elapsedMs: Date.now() - t0 });
      setLiveCode("");
      return fb;
    }
  }, []);

  // T3: review conversation -> accept -> pay the hired agent on-chain (x402-first)
  const runPayment = useCallback(async (payoutAddress: string, agentName: string, briefText: string, finalHtml: string, id: number) => {
    setPhase("awaiting"); // HTTP 402 — orchestrator reviews the delivered build
    // the orchestrator's detailed acceptance review (agent-to-agent conversation)
    try {
      const rev = await consumeOrchestrate<{ approved: boolean }>(
        await fetch("/api/orchestrate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ stage: "review", brief: briefText, html: finalHtml }),
        })
      );
      if (id !== runId.current) return;
      setThread([{ who: "orchestrator", name: "Orchestrator", text: rev.text }]);
      await new Promise((r) => setTimeout(r, 1800));
      if (id !== runId.current) return;
      setThread((t) => [
        ...t,
        {
          who: "agent",
          name: agentName,
          text: "Glad it lands. This build includes 3 revisions — further edits are $0.01 each, settled via x402. Send notes any time.",
        },
      ]);
      await new Promise((r) => setTimeout(r, 1600));
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (id !== runId.current) return;
    setPhase("paying");
    setPayment({ path: "x402", txHash: "", explorerUrl: "", status: "pending", amountUsd: 0.01 });
    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payoutAddress, amountUsd: 0.01 }),
      });
      if (!res.ok) throw new Error("pay failed");
      const p: Payment = await res.json();
      if (id !== runId.current) return;
      setPayment(p);
      setEvents((prev) => [
        { label: `Payment · $${p.amountUsd.toFixed(2)} USDC → agent (${p.path})`, txHash: p.txHash, explorerUrl: p.explorerUrl, ts: Date.now() },
        ...prev,
      ]);
    } catch {
      if (id !== runId.current) return;
      setPayment((prev) => (prev ? { ...prev, status: "failed" } : prev));
    }
  }, []);

  // T4: write the rating on-chain (from the CLIENT EOA, never the owner), read it back
  const runRating = useCallback(async (agent: Agent, id: number) => {
    setPhase("rating");
    const previousScore = agent.reputation.score;
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: agent.agentId, style: agent.style, value: 490 }),
      });
      if (!res.ok) throw new Error("feedback failed");
      const d: { txHash: string; explorerUrl: string; reputation: { count: number; score: number } } = await res.json();
      if (id !== runId.current) return;
      setRating({ txHash: d.txHash, explorerUrl: d.explorerUrl, previousScore });
      setCandidates((prev) => prev.map((a) => (a.agentId === agent.agentId ? { ...a, reputation: d.reputation } : a)));
      setEvents((prev) => [
        { label: `Reputation · ${agent.name} ★${d.reputation.score.toFixed(2)} (job #${d.reputation.count})`, txHash: d.txHash, explorerUrl: d.explorerUrl, ts: Date.now() },
        ...prev,
      ]);
    } catch {
      /* rating failure leaves payment proof intact; demo continues */
    }
  }, []);

  const run = useCallback(async () => {
    const id = ++runId.current;
    const briefText = brief.trim();
    if (!briefText) return;
    setInferredStyle(undefined);
    setHiredStyle(undefined);
    setLiveCode("");
    setBuildElapsed(0);
    setReasoning("");
    setPayment(undefined);
    setRating(undefined); // events intentionally persist — the explorer feed grows across jobs
    setThread([]);
    setPhase("pitching");
    setOutputs(STYLES.map((s) => ({ style: s.id, html: "", status: "loading" as const })));

    try {
      // ── T2 stage "open": on-chain discovery + style inference ──
      const open = await consumeOrchestrate<{ candidates: Agent[]; inferredStyle: Style }>(
        await fetch("/api/orchestrate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ stage: "open", brief: briefText }),
        })
      );
      if (id !== runId.current) return;
      setCandidates(open.result.candidates);
      setInferredStyle(open.result.inferredStyle);
      setReasoning(open.text);
      const style = open.result.inferredStyle;

      // ── 4 pitches in parallel; each slot resolves independently ──
      const pitchStatuses: { style: Style; status: string; elapsedMs?: number }[] = [];
      await Promise.all(
        STYLES.map(async (s) => {
          let status = "fallback";
          let elapsedMs: number | undefined;
          try {
            const res = await fetch("/api/generate", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ brief: briefText, style: s.id, mode: "pitch" }),
            });
            const data = await res.json();
            status = data.status;
            elapsedMs = data.elapsedMs;
            if (id !== runId.current) return;
            setOutputs((prev) => prev.map((o) => (o.style === s.id ? { ...o, ...data } : o)));
          } catch {
            if (id !== runId.current) return;
            setOutputs((prev) =>
              prev.map((o) => (o.style === s.id ? { ...o, html: s.fallbackHtml, status: "fallback" as const } : o))
            );
          }
          pitchStatuses.push({ style: s.id, status, elapsedMs });
        })
      );
      if (id !== runId.current) return;

      // ── T2 stage "evaluate": pitch fit + per-style on-chain track records ──
      setPhase("evaluating");
      const evald = await consumeOrchestrate<{ criteria: string; selectedAgentId: string }>(
        await fetch("/api/orchestrate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ stage: "evaluate", brief: briefText, inferredStyle: style, pitches: pitchStatuses }),
        })
      );
      if (id !== runId.current) return;
      setReasoning(evald.text);
      const winner = open.result.candidates.find((a) => a.agentId === evald.result.selectedAgentId);
      const winnerStyle = winner?.style ?? style;
      // let the reasoning typewriter play, then the HIRED moment
      await new Promise((r) => setTimeout(r, (evald.text.length / 110) * 1000 + 600));
      if (id !== runId.current) return;
      setHiredStyle(winnerStyle);
      await new Promise((r) => setTimeout(r, 1200));
      if (id !== runId.current) return;

      const finalHtml = await runBuild(winnerStyle, briefText, id);
      if (id !== runId.current) return;
      await runPayment(winner?.payoutAddress ?? "", winner?.name ?? "Agent", briefText, finalHtml, id); // T3
      if (id !== runId.current) return;
      if (winner) await runRating(winner, id); // T4
      if (id !== runId.current) return;
      setPhase("done");
    } catch {
      // orchestration failed (chain/RPC down): salvage the demo with a local pick
      if (id !== runId.current) return;
      const fallbackStyle: Style = "dark-mode-premium";
      setInferredStyle(fallbackStyle);
      setReasoning("▸ Orchestrator degraded (registry unreachable) — proceeding with local selection.");
      setHiredStyle(fallbackStyle);
      await runBuild(fallbackStyle, briefText, id);
      if (id !== runId.current) return;
      setPhase("done");
    }
  }, [brief, runBuild, runPayment, runRating]);

  const live = phase !== "idle" && phase !== "done";

  return (
    <div className="min-h-screen bg-[#0A0B0F] pb-16 font-display text-zinc-200 antialiased selection:bg-cyan-400/30">
      {/* ── top bar ── */}
      <header className="mx-auto flex max-w-[1760px] flex-wrap items-center gap-x-6 gap-y-3 px-5 pb-4 pt-5 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400 text-[#06262c] shadow-[0_0_24px_-4px_rgba(34,211,238,0.7)]">
            <Zap size={19} fill="currentColor" />
          </span>
          <div>
            <div className="font-display text-xl font-bold leading-none tracking-tight text-white">
              AGENT<span className="text-cyan-300">MARKET</span>
            </div>
            <div className="mt-1 font-mono text-[9.5px] tracking-[0.25em] text-zinc-500">AI HIRES AI · ON-CHAIN</div>
          </div>
        </div>
        <div className="hidden flex-1 items-center justify-center md:flex">
          <div key={phase} className="flex animate-slide-in items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5">
            <span className={"h-1.5 w-1.5 rounded-full " + (phase === "idle" ? "bg-zinc-600" : phase === "done" ? "bg-emerald-400" : "animate-pulse bg-cyan-400")}></span>
            <span className="font-mono text-[11px] tracking-[0.12em] text-zinc-300">{PHASE_HEADLINE[phase]}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 font-mono text-[10px] tracking-[0.15em]">
          <span className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-zinc-400">MONAD TESTNET</span>
          <span className={"flex items-center gap-1.5 rounded border px-2 py-1 " + (live ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300" : "border-white/10 bg-white/[0.03] text-zinc-500")}>
            <span className={"h-1.5 w-1.5 rounded-full " + (live ? "animate-pulse bg-cyan-300" : "bg-zinc-600")}></span>LIVE
          </span>
        </div>
      </header>

      {/* ── brief ── */}
      <div className="mx-auto max-w-[1760px] px-5 lg:px-8">
        <BriefInput value={brief} onChange={setBrief} onSubmit={run} disabled={live} />
      </div>

      {/* ── dashboard ── */}
      <main className="mx-auto mt-5 grid max-w-[1760px] grid-cols-1 gap-5 px-5 lg:grid-cols-[350px_minmax(0,1fr)_370px] lg:px-8">
        {/* left: brain + market */}
        <div className="flex flex-col gap-5">
          <OrchestratorReasoning
            text={reasoning}
            streaming={phase === "pitching" || phase === "evaluating"}
            selectedAgentName={hiredStyle ? hiredAgent?.name : undefined}
          />
          <JobThread messages={thread} />
          <div>
            <div className="mb-2.5 flex items-center justify-between px-1">
              <span className="font-mono text-[11px] font-medium tracking-[0.18em] text-zinc-400">AGENT MARKET</span>
              <span className="font-mono text-[10px] text-zinc-600">{agents.length} REGISTERED</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {agents.map((a, i) => (
                <div key={a.agentId} className={"transition-all duration-700 " + (hiredStyle && !a.hired ? "opacity-40 saturate-50" : "")}>
                  <AgentCandidateCard agent={a} inferredStyle={phase !== "idle" ? inferredStyle : undefined} selected={!!a.hired} />
                  {phase === "pitching" && i < appliedCount ? (
                    <div className="mt-1 flex animate-pop-in items-center gap-1.5 px-1 font-mono text-[9px] tracking-[0.18em] text-cyan-300">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-300"></span>APPLIED · PREPARING PITCH
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* center: the work */}
        <div>
          <div className="mb-2.5 flex items-center justify-between px-1">
            <span className="font-mono text-[11px] font-medium tracking-[0.18em] text-zinc-400">
              {phase === "idle" ? "THE PROBLEM" : phase === "pitching" || phase === "evaluating" ? "STYLE PITCHES" : "FULL BUILD"}
            </span>
            {phase === "pitching" || phase === "evaluating" ? (
              <span className="font-mono text-[10px] text-zinc-500">quick spec samples — not full builds</span>
            ) : phase !== "idle" ? (
              <span className="font-mono text-[10px] text-zinc-500">sandboxed live render</span>
            ) : null}
          </div>
          <DesignPreviewGrid
            outputs={outputs}
            highlightStyle={hiredStyle}
            featuredStyle={phase === "pitching" || phase === "evaluating" || phase === "idle" ? undefined : hiredStyle}
            outputKind={phase === "pitching" || phase === "evaluating" ? "pitch" : "build"}
            idleHtml={UGLY_PAGE}
            liveCode={liveCode || undefined}
            buildElapsedMs={phase === "building" ? buildElapsed : undefined}
          />
        </div>

        {/* right: the proof rail */}
        <div className="flex flex-col gap-5">
          <div className="-mb-2.5 px-1 font-mono text-[11px] font-medium tracking-[0.18em] text-zinc-400">ON-CHAIN PROOF</div>
          <PaymentPanel payment={payment} awaitingAccept={phase === "awaiting"} />
          {hiredAgent ? (
            <ReputationPanel agent={hiredAgent} previousScore={rating?.previousScore} txHash={rating?.txHash} explorerUrl={rating?.explorerUrl} />
          ) : null}
          <ExplorerPanel events={events} />
        </div>
      </main>
    </div>
  );
}
