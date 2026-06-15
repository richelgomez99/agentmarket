"use client";
// AgentMarket — main demo screen.
// Full loop: brief -> on-chain discovery -> 4 style pitches -> specialty-matched hire ->
// STREAMED full build -> review conversation -> x402 payment (fallback surfaced) ->
// on-chain rating. AGENT COMMS narrates the whole job with per-agent personas, driven by
// REAL pipeline events (applications, pitches, hire, build milestones from the live code
// stream, settlement, rating).
import { useCallback, useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import BriefInput from "./components/BriefInput";
import JobThread, { type ThreadMsg } from "./components/JobThread";
import OrchestratorReasoning from "./components/OrchestratorReasoning";
import AgentCandidateCard from "./components/AgentCandidateCard";
import DesignPreviewGrid, { type InspectState } from "./components/DesignPreviewGrid";
import PaymentPanel from "./components/PaymentPanel";
import ReputationPanel from "./components/ReputationPanel";
import ExplorerPanel from "./components/ExplorerPanel";
import AgentReviewsModal from "./components/AgentReviewsModal";
import { STYLES, styleById } from "@/lib/styles";
import { PERSONAS } from "@/lib/personas";
import { UGLY_PAGE } from "@/lib/uglyPage";
import { guardHtml, salvageHtml } from "@/lib/htmlGuard";
import type { Agent, DesignOutput, ExplorerEvent, Payment, Style } from "@/lib/types";

type Phase = "idle" | "pitching" | "evaluating" | "building" | "inspecting" | "awaiting" | "paying" | "rating" | "done";

const SENTINEL = "@@RESULT@@";

/** POST an orchestrate stage with one retry (rides out transient server/RPC hiccups). */
async function postOrchestrate(body: Record<string, unknown>): Promise<Response> {
  const go = () =>
    fetch("/api/orchestrate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const first = await go().catch(() => null);
  if (first?.ok) return first;
  await new Promise((r) => setTimeout(r, 1500));
  return go();
}

// client-side style fallback (only used if the orchestrator is unreachable after retry)
function localStyle(brief: string): Style {
  const b = brief.toLowerCase();
  if (/glass|frost|translucent|blur/.test(b)) return "glassmorphism";
  if (/brutal|raw|stark|loud/.test(b)) return "brutalist";
  if (/playful|fun|friendly|cute|bright|bouncy|kids/.test(b)) return "playful";
  return "dark-mode-premium";
}

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
  evaluating: "Hiring agent is judging pitches + track records",
  building: "Agent hired — full build streaming live",
  inspecting: "Hired agent is QA-testing the build",
  awaiting: "Hiring agent acceptance review — brand & claims",
  paying: "Settling USDC on-chain via x402",
  rating: "Writing reputation on-chain (ERC-8004)",
  done: "Job complete — paid + rated on-chain",
};

// build milestones: detected in the REAL streamed code; each fires once per build
const MILESTONES: { key: "msStyle" | "msNav" | "msHero" | "msFooter"; probe: string }[] = [
  { key: "msStyle", probe: "<style" },
  { key: "msNav", probe: "<nav" },
  { key: "msHero", probe: "<h1" },
  { key: "msFooter", probe: "<footer" },
];

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
  const [comms, setComms] = useState<ThreadMsg[]>([]);
  const [appliedCount, setAppliedCount] = useState(0);
  const [inspect, setInspect] = useState<InspectState | undefined>();
  const [reviewAgent, setReviewAgent] = useState<Agent | undefined>();
  const deliverableRef = useRef<string>("");

  const downloadDeliverable = useCallback(() => {
    if (!deliverableRef.current) return;
    const blob = new Blob([deliverableRef.current], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "agentmarket-deliverable.html";
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);
  const runId = useRef(0);

  // comms helpers — agent voices come from PERSONAS, accents from the style config
  const say = useCallback((who: ThreadMsg["who"], name: string, text: string, style?: Style) => {
    setComms((prev) => [...prev, { who, name, text, accent: style ? styleById(style).accent : undefined }]);
  }, []);

  // LLM-generated in-character chatter (no two runs read the same); canned line is the fallback
  const sayLive = useCallback(
    async (
      name: string,
      style: Style,
      event: string,
      fallback: string,
      opts?: { context?: string; mustInclude?: string; sync?: boolean }
    ) => {
      const fire = async () => {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 6000);
          const res = await fetch("/api/banter", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ style, event, context: opts?.context, mustInclude: opts?.mustInclude }),
            signal: ctrl.signal,
          });
          clearTimeout(t);
          const d = res.ok ? await res.json() : {};
          say("agent", name, (d.text as string) || fallback, style);
        } catch {
          say("agent", name, fallback, style);
        }
      };
      if (opts?.sync) await fire();
      else void fire();
    },
    [say]
  );

  // Idle market rail: real agents + on-chain reputation, read at mount
  useEffect(() => {
    fetch("/api/orchestrate")
      .then((r) => r.json())
      .then((d) => setCandidates((prev) => (prev.length ? prev : d.candidates ?? [])))
      .catch(() => {});
  }, []);

  const agents: Agent[] = candidates.map((a) => ({ ...a, hired: a.style === hiredStyle }));
  const hiredAgent = agents.find((a) => a.hired);

  // ?autorun: kick off the full demo automatically (used for the backup recording)
  const runRef = useRef<() => void>();
  const autoran = useRef(false);
  useEffect(() => {
    if (autoran.current) return;
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("autorun")) {
      autoran.current = true;
      const t = setTimeout(() => runRef.current?.(), 2500);
      return () => clearTimeout(t);
    }
  }, []);

  // build timer
  useEffect(() => {
    if (phase !== "building") return;
    const t0 = Date.now();
    const iv = setInterval(() => setBuildElapsed(Date.now() - t0), 100);
    return () => clearInterval(iv);
  }, [phase]);

  // agents "apply" one by one when the brief is posted — each announces itself in comms
  useEffect(() => {
    if (phase !== "pitching") return;
    setAppliedCount(0);
    const timers = [600, 1400, 2300, 3100].map((ms, i) =>
      setTimeout(() => {
        setAppliedCount(i + 1);
        const s = STYLES[i];
        if (s) void sayLive(s.agentName, s.id, "You just applied to a new design job and are reading the client's brief and brand kit.", PERSONAS[s.id].apply, { context: brief });
      }, ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, say, sayLive, brief]);

  // the hired agent's visible QA pass: page walkthrough -> real responsive sweep -> final look
  const runInspection = useCallback(
    async (style: Style, id: number) => {
      setPhase("inspecting");
      const agentName = styleById(style).agentName;
      void sayLive(agentName, style, "You are starting a QA walkthrough of the page you just built — checking nav, hero, hierarchy and spacing.", "Running my QA pass — walking the page: nav, hero, CTA hierarchy…", {});
      setInspect({ step: "scan", label: "WALKTHROUGH · HIERARCHY & SPACING" });
      await new Promise((r) => setTimeout(r, 6800));
      if (id !== runId.current) return;
      void sayLive(agentName, style, "You are now testing your build at mobile width (390px) — the responsive sweep.", "Responsive sweep — re-rendering at 390px…", {});
      setInspect({ step: "mobile", label: "RESPONSIVE · 390PX VIEWPORT" });
      await new Promise((r) => setTimeout(r, 4500));
      if (id !== runId.current) return;
      setInspect({ step: "final", label: "FINAL LOOK" });
      void sayLive(agentName, style, "Your QA pass came back clean. Submit the work for the client's review.", "QA pass clean. Submitting for review.", {});
      await new Promise((r) => setTimeout(r, 1800));
      setInspect(undefined);
    },
    [say, sayLive]
  );

  const runBuild = useCallback(
    async (style: Style, briefText: string, id: number, revisionNote?: string): Promise<string> => {
      setPhase("building");
      setOutputs((prev) => [{ style, html: "", status: "loading" }, ...prev.filter((o) => o.style !== style)]);
      const persona = PERSONAS[style];
      const agentName = styleById(style).agentName;
      const fired = new Set<string>();
      let acc = "";
      let lastPaint = 0;
      const paint = (final?: { html: string; status: DesignOutput["status"]; elapsedMs?: number }) =>
        setOutputs((prev) =>
          prev.map((o) => (o.style === style ? (final ? { style, ...final } : { ...o, html: acc, status: "loading" as const }) : o))
        );
      const t0 = Date.now();
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ brief: briefText, style, mode: "build", revisionNote }),
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
          // narrate REAL milestones as they appear in the stream
          for (const m of MILESTONES) {
            if (!fired.has(m.key) && acc.includes(m.probe)) {
              fired.add(m.key);
              const variants = persona[m.key];
              say("agent", agentName, variants[Math.floor(Math.random() * variants.length)], style);
            }
          }
          const now = Date.now();
          if (now - lastPaint > 400) {
            lastPaint = now;
            paint(); // progressive render of partial HTML
          }
        }
        const secs = ((Date.now() - t0) / 1000).toFixed(0);
        const sentinel = acc.lastIndexOf("<!--FALLBACK-->");
        let finalHtml: string;
        if (sentinel >= 0) {
          finalHtml = acc.slice(sentinel + "<!--FALLBACK-->".length);
          paint({ html: finalHtml, status: "fallback", elapsedMs: Date.now() - t0 });
        } else {
          const g = guardHtml(acc);
          const salvaged = g.html ?? salvageHtml(acc); // truncated-but-real beats generic fallback
          finalHtml = salvaged ?? styleById(style).fallbackHtml;
          paint({ html: finalHtml, status: salvaged ? "generated" : "fallback", elapsedMs: Date.now() - t0 });
        }
        await sayLive(agentName, style, `You just delivered the finished build in ${secs} seconds. Hand it over for the client's review.`, persona.delivered(secs), { context: briefText, sync: true });
        setLiveCode("");
        return finalHtml;
      } catch {
        if (id !== runId.current) return "";
        const fb = styleById(style).fallbackHtml;
        paint({ html: fb, status: "fallback", elapsedMs: Date.now() - t0 });
        setLiveCode("");
        return fb;
      }
    },
    [say, sayLive]
  );

  // T3: review -> revision round (operator-authorized) -> approval -> pay on-chain (x402-first)
  const runPayment = useCallback(
    async (payoutAddress: string, agentName: string, agentStyle: Style, agentId: string, briefText: string, firstHtml: string, id: number) => {
      // included revisions are set by the agent operator in its config (varies per agent)
      const included = styleById(agentStyle).includedRevisions;
      let html = firstHtml;
      let lastFix = ""; // the change requested in the previous round (so re-review confirms IT)
      try {
        let revisionsUsed = 0;
        for (let round = 1; round <= 3; round++) {
          await runInspection(agentStyle, id);
          if (id !== runId.current) return;
          setPhase("awaiting");
          const r = await consumeOrchestrate<{ approved: boolean; revisionNote?: string }>(
            await postOrchestrate({ stage: "review", brief: briefText, html, round, requestedFix: lastFix })
          );
          if (id !== runId.current) return;
          say("orchestrator", "Hiring Agent", r.text);
          await new Promise((res) => setTimeout(res, 1800));
          if (id !== runId.current) return;
          if (r.result.approved || !r.result.revisionNote || round >= 3) break;

          revisionsUsed++;
          if (revisionsUsed > included) {
            // ── beyond the operator-authorized set: a REAL extra fee settles first ──
            await sayLive(
              agentName,
              agentStyle,
              "The client requested another revision, beyond what is included in your terms. Politely invoke your pricing.",
              `That's beyond my ${included} included revision${included > 1 ? "s" : ""} — additional edits are $0.01 each via x402. My operator pre-approved up to 3 total.`,
              { mustInclude: `${included} included revision${included > 1 ? "s" : ""}; $0.01 each via x402`, sync: true }
            );
            await new Promise((res) => setTimeout(res, 1200));
            if (id !== runId.current) return;
            say("orchestrator", "Hiring Agent", "Fair terms. Settling the revision fee now — HTTP 402.");
            try {
              const feeRes = await fetch("/api/pay", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ payoutAddress, amountUsd: 0.01 }),
              });
              if (feeRes.ok) {
                const fee: Payment = await feeRes.json();
                if (id !== runId.current) return;
                setEvents((prev) => [
                  { label: `Revision fee · $0.01 USDC → agent (${fee.path})`, txHash: fee.txHash, explorerUrl: fee.explorerUrl, ts: Date.now() },
                  ...prev,
                ]);
                await sayLive(agentName, agentStyle, `The client just paid your $0.01 revision fee via ${fee.path}. Confirm and start revising.`, `Fee received (${fee.path}). Revising now…`, { sync: true });
              }
            } catch {
              /* fee failure: agent revises anyway — goodwill beats a stuck demo */
            }
          } else {
            await sayLive(
              agentName,
              agentStyle,
              "The client requested a revision. Accept it cheerfully — it is covered by your included revisions — and say you are revising now.",
              `On it — covered: my operator authorized ${included} included revision${included > 1 ? "s" : ""} for this job. Revising now…`,
              { mustInclude: `${included} included revision${included > 1 ? "s" : ""}`, sync: true }
            );
          }
          lastFix = r.result.revisionNote || "";
          await new Promise((res) => setTimeout(res, 1200));
          if (id !== runId.current) return;
          html = await runBuild(agentStyle, briefText, id, r.result.revisionNote);
          if (id !== runId.current) return;
        }
        say("orchestrator", "Hiring Agent", revisionsUsed > 0 ? "Terms honored, revision accepted. Releasing payment — HTTP 402 flow." : "Work accepted on first delivery. Releasing payment — HTTP 402 flow.");
        await new Promise((res) => setTimeout(res, 800));
      } catch {
        await new Promise((res) => setTimeout(res, 2000));
      }
      if (id !== runId.current) return;
      deliverableRef.current = html;
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
        await sayLive(agentName, agentStyle, `The client just paid you $0.01 USDC for the job via ${p.path}, settled on-chain. React briefly, in character.`, PERSONAS[agentStyle].paid(p.path), { sync: true });
      } catch {
        if (id !== runId.current) return;
        setPayment((prev) => (prev ? { ...prev, status: "failed" } : prev));
      }
    },
    [say, sayLive, runInspection, runBuild]
  );

  // T4: write the rating on-chain (from the CLIENT EOA, never the owner), read it back
  const runRating = useCallback(
    async (agent: Agent, id: number) => {
      setPhase("rating");
      const previousScore = agent.reputation.score;
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ agentId: agent.agentId, style: agent.style, value: 490, deliverableHtml: deliverableRef.current }),
        });
        if (!res.ok) throw new Error("feedback failed");
        const d: { txHash: string; explorerUrl: string; reputation: { count: number; score: number } } = await res.json();
        if (id !== runId.current) return;
        setRating({ txHash: d.txHash, explorerUrl: d.explorerUrl, previousScore });
        setCandidates((prev) => prev.map((a) => (a.agentId === agent.agentId ? { ...a, reputation: d.reputation } : a)));
        setEvents((prev) => [
          {
            label: `Reputation · ${agent.name} ★${d.reputation.score.toFixed(2)} (job #${d.reputation.count})`,
            txHash: d.txHash,
            explorerUrl: d.explorerUrl,
            ts: Date.now(),
          },
          ...prev,
        ]);
        const dh: string | undefined = (d as { deliverableHash?: string }).deliverableHash;
        say(
          "orchestrator",
          "Hiring Agent",
          `Rated ★4.9 — written to the ERC-8004 registry${dh && !/^0x0+$/.test(dh) ? `, with the deliverable's hash sealed in the record (${dh.slice(0, 10)}…). Provable delivery.` : "."}`
        );
        await sayLive(agent.name, agent.style, `Your on-chain reputation just updated: this is job #${d.reputation.count} on your permanent record. Sign off, in character.`, PERSONAS[agent.style].rated(d.reputation.count), { mustInclude: `job #${d.reputation.count}`, sync: true });
      } catch {
        /* rating failure leaves payment proof intact; demo continues */
      }
    },
    [say, sayLive]
  );

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
    setRating(undefined); // explorer events intentionally persist — the feed grows across jobs
    setComms([]);
    setPhase("pitching");
    setOutputs(STYLES.map((s) => ({ style: s.id, html: "", status: "loading" as const })));
    say("orchestrator", "Hiring Agent", "Brief posted to the market. Requesting style pitches — samples first; the full job goes to one winner.");

    try {
      // ── stage "open": on-chain discovery + style inference (with retry) ──
      const open = await consumeOrchestrate<{ candidates: Agent[]; inferredStyle: Style }>(
        await postOrchestrate({ stage: "open", brief: briefText })
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
          if (id === runId.current)
            void sayLive(
              s.agentName,
              s.id,
              status === "fallback"
                ? "Your pitch generation hiccuped, so you sent your trusted reference sample instead."
                : `You just submitted your style pitch for this job${elapsedMs ? ` (took ${(elapsedMs / 1000).toFixed(0)}s)` : ""}.`,
              status === "fallback" ? PERSONAS[s.id].pitchFallback : PERSONAS[s.id].pitchIn,
              { context: briefText }
            );
        })
      );
      if (id !== runId.current) return;

      // ── stage "evaluate": pitch fit + per-style on-chain track records (with retry) ──
      setPhase("evaluating");
      say("orchestrator", "Hiring Agent", "All pitches in. Scoring brand fit and cross-checking on-chain track records…");
      const evald = await consumeOrchestrate<{ criteria: string; selectedAgentId: string }>(
        await postOrchestrate({ stage: "evaluate", brief: briefText, inferredStyle: style, pitches: pitchStatuses })
      );
      if (id !== runId.current) return;
      setReasoning(evald.text);
      const winner = open.result.candidates.find((a) => a.agentId === evald.result.selectedAgentId);
      const winnerStyle = winner?.style ?? style;
      // let the reasoning typewriter play, then the HIRED moment
      await new Promise((r) => setTimeout(r, (evald.text.length / 110) * 1000 + 600));
      if (id !== runId.current) return;
      setHiredStyle(winnerStyle);
      if (winner) {
        say("orchestrator", "Hiring Agent", `@${winner.name} — you're hired. Best pitch, strongest proven ${winnerStyle} record. The full build is yours.`);
        await sayLive(winner.name, winnerStyle, "You just won the job — the client hired you over the other three agents. Acknowledge and say you are starting the full build.", PERSONAS[winnerStyle].hireAck, { context: briefText, sync: true });
      }
      await new Promise((r) => setTimeout(r, 1200));
      if (id !== runId.current) return;

      const finalHtml = await runBuild(winnerStyle, briefText, id);
      if (id !== runId.current) return;
      await runPayment(winner?.payoutAddress ?? "", winner?.name ?? "Agent", winnerStyle, winner?.agentId ?? "0", briefText, finalHtml, id);
      if (id !== runId.current) return;
      if (winner) await runRating(winner, id);
      if (id !== runId.current) return;
      setPhase("done");
    } catch {
      // orchestration unreachable after retry: salvage with a local pick, but still run the
      // FULL pipeline (build -> review thread -> pay -> rate) using the mount-loaded agents
      if (id !== runId.current) return;
      const fallbackStyle = localStyle(briefText);
      const winner = candidates.find((a) => a.style === fallbackStyle);
      setInferredStyle(fallbackStyle);
      setReasoning(
        `▸ Hiring agent degraded (transient) — local selection.\n▸ Hiring the ${fallbackStyle} specialist${winner ? ` (${winner.name})` : ""}; proceeding with the full job.`
      );
      setHiredStyle(fallbackStyle);
      if (winner) {
        say("orchestrator", "Hiring Agent", `Registry read hiccuped — proceeding directly. @${winner.name}, the ${fallbackStyle} job is yours.`);
        await sayLive(winner.name, fallbackStyle, "You just won the job. Acknowledge and start the full build.", PERSONAS[fallbackStyle].hireAck, { context: briefText, sync: true });
      }
      const finalHtml = await runBuild(fallbackStyle, briefText, id);
      if (id !== runId.current) return;
      if (winner) {
        await runPayment(winner.payoutAddress, winner.name, fallbackStyle, winner.agentId, briefText, finalHtml, id);
        if (id !== runId.current) return;
        await runRating(winner, id);
        if (id !== runId.current) return;
      }
      setPhase("done");
    }
  }, [brief, candidates, runBuild, runPayment, runRating, say, sayLive]);

  // keep the latest run() reachable from the autorun effect
  useEffect(() => {
    runRef.current = run;
  }, [run]);

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
      <main className="mx-auto mt-5 grid max-w-[1760px] grid-cols-1 items-start gap-5 px-5 lg:grid-cols-[350px_minmax(0,1fr)_370px] lg:px-8">
        {/* left: brain + comms + market */}
        <div className="flex flex-col gap-5">
          <OrchestratorReasoning
            text={reasoning}
            streaming={phase === "pitching" || phase === "evaluating"}
            selectedAgentName={hiredStyle ? hiredAgent?.name : undefined}
          />
          <JobThread messages={comms} live={live} />
          <div>
            <div className="mb-2.5 flex items-center justify-between px-1">
              <span className="font-mono text-[11px] font-medium tracking-[0.18em] text-zinc-400">AGENT MARKET</span>
              <span className="font-mono text-[10px] text-zinc-600">{agents.length} REGISTERED</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {agents.map((a, i) => (
                <div key={a.agentId} className={"transition-all duration-700 " + (hiredStyle && !a.hired ? "opacity-40 saturate-50" : "")}>
                  <AgentCandidateCard agent={a} inferredStyle={phase !== "idle" ? inferredStyle : undefined} selected={!!a.hired} onClick={() => setReviewAgent(a)} />
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
            inspecting={phase === "inspecting" ? inspect : undefined}
          />
        </div>

        {/* right: the proof rail */}
        <div className="flex flex-col gap-5">
          <div className="-mb-2.5 px-1 font-mono text-[11px] font-medium tracking-[0.18em] text-zinc-400">ON-CHAIN PROOF</div>
          <PaymentPanel payment={payment} awaitingAccept={phase === "awaiting"} onDownload={phase === "done" || payment?.status === "settled" ? downloadDeliverable : undefined} />
          {hiredAgent ? (
            <ReputationPanel agent={hiredAgent} previousScore={rating?.previousScore} txHash={rating?.txHash} explorerUrl={rating?.explorerUrl} />
          ) : null}
          <ExplorerPanel events={events} />
        </div>
      </main>

      {reviewAgent ? <AgentReviewsModal agent={reviewAgent} onClose={() => setReviewAgent(undefined)} /> : null}
    </div>
  );
}
