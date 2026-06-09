"use client";
// From the design handoff (specs/001-agentmarket/design), elevated for the build moment:
// - idleHtml: the "ugly before" page shown at idle (the problem we transform)
// - liveCode: streaming raw HTML shown in a code strip while the build renders progressively
// Iframes are sandboxed WITHOUT allow-same-origin (Constitution V).
import { Loader2, AlertTriangle, CheckCircle2, Timer } from "lucide-react";
import type { DesignOutput, Style } from "@/lib/types";
import { STYLE_META } from "./shared";

export default function DesignPreviewGrid({
  outputs,
  highlightStyle, // optional: marks the winning pitch
  featuredStyle, // optional: render this style big as the full build; others shrink to thumbnails
  outputKind, // optional: "pitch" = quick spec samples, "build" = full generation
  idleHtml, // optional elevation: ugly "before" page rendered when there are no outputs
  liveCode, // optional elevation: streaming code strip while the featured build is loading
  buildElapsedMs, // optional elevation: ticking timer while building
}: {
  outputs: DesignOutput[];
  highlightStyle?: Style;
  featuredStyle?: Style;
  outputKind?: "pitch" | "build";
  idleHtml?: string;
  liveCode?: string;
  buildElapsedMs?: number;
}) {
  if (!outputs.length) {
    if (idleHtml) {
      return (
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#101218]">
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
            <span className="font-mono text-[10px] tracking-[0.18em] text-zinc-400">THE PROBLEM — CURRENT PAGE</span>
            <span className="rounded bg-red-400/10 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-red-400">UNSTYLED</span>
          </div>
          <div className="relative h-[430px] bg-[#0c0d12] xl:h-[510px]">
            <iframe sandbox="" srcDoc={idleHtml} title="before" className="h-full w-full border-0 bg-white"></iframe>
          </div>
        </div>
      );
    }
    return (
      <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2">
        {(["dark-mode-premium", "glassmorphism", "brutalist", "playful"] as Style[]).map((s) => (
          <div key={s} className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.015]">
            <span className={"h-1.5 w-1.5 rounded-full opacity-50 " + STYLE_META[s].dot}></span>
            <span className="font-mono text-[10px] tracking-[0.2em] text-zinc-600">{STYLE_META[s].label}</span>
            <span className="font-mono text-[10px] text-zinc-700">style pitch renders here</span>
          </div>
        ))}
      </div>
    );
  }

  const featured = featuredStyle ? outputs.find((o) => o.style === featuredStyle) : undefined;
  const rest = featured ? outputs.filter((o) => o.style !== featuredStyle) : outputs;

  const shimmer = "animate-shimmer rounded bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(255,255,255,0.12),rgba(255,255,255,0.04))] bg-[length:400px_100%]";
  const skeleton = (
    <div className="absolute inset-0 p-5">
      <div className={"h-3 w-1/3 " + shimmer}></div>
      <div className={"mt-4 h-7 w-3/4 " + shimmer}></div>
      <div className={"mt-3 h-3 w-2/3 " + shimmer}></div>
      <div className={"mt-3 h-3 w-1/2 " + shimmer}></div>
      <div className={"mt-6 h-9 w-32 " + shimmer}></div>
    </div>
  );
  const statusChip = (o: DesignOutput, isBuild: boolean) =>
    o.status === "loading" ? (
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-[9.5px] tracking-[0.12em] text-cyan-300">
        <Loader2 size={11} className="animate-spin" /> {isBuild ? "BUILDING" : "PITCHING"}
        {isBuild && buildElapsedMs !== undefined ? <span className="text-zinc-500">· {(buildElapsedMs / 1000).toFixed(1)}s</span> : null}
      </span>
    ) : o.status === "generated" ? (
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-[9.5px] tracking-[0.12em] text-emerald-400">
        <CheckCircle2 size={11} /> {isBuild ? "RENDERED" : "PITCH IN"}
        {o.elapsedMs ? <span className="text-zinc-500">· {(o.elapsedMs / 1000).toFixed(1)}s</span> : null}
      </span>
    ) : o.status === "fallback" ? (
      <span className="flex shrink-0 items-center gap-1.5 rounded bg-amber-400/10 px-1.5 py-0.5 font-mono text-[9.5px] font-medium tracking-[0.12em] text-amber-300">
        <AlertTriangle size={11} /> FALLBACK
      </span>
    ) : (
      <span className="flex shrink-0 items-center gap-1.5 font-mono text-[9.5px] tracking-[0.12em] text-red-400">
        <AlertTriangle size={11} /> ERROR
      </span>
    );

  // ── build layout: hired agent's full build big, losing pitches small ──
  if (featured) {
    const streamingBuild = featured.status === "loading" && !!liveCode;
    return (
      <div className="flex flex-col gap-4">
        <div
          className={
            "overflow-hidden rounded-xl border transition-all duration-500 " +
            (featured.status === "generated"
              ? "border-cyan-400/60 shadow-[0_0_36px_-6px_rgba(34,211,238,0.45)] ring-1 ring-cyan-400/30"
              : "border-white/[0.08] bg-[#101218]")
          }
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] bg-[#101218] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + STYLE_META[featured.style].dot}></span>
              <span className="truncate font-mono text-[10px] tracking-[0.18em] text-zinc-400">{STYLE_META[featured.style].label}</span>
              <span className="shrink-0 animate-pop-in rounded bg-cyan-400/15 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-cyan-300">
                FULL BUILD · HIRED AGENT
              </span>
            </div>
            {statusChip(featured, true)}
          </div>
          <div className="relative h-[430px] bg-[#0c0d12] xl:h-[510px]">
            {featured.status === "loading" && !featured.html ? (
              skeleton
            ) : (
              // While streaming, html updates progressively (~400ms); final guard-passed doc replaces it.
              <iframe sandbox="" srcDoc={featured.html} title={featured.style} className="h-full w-full animate-fade-in border-0 bg-white"></iframe>
            )}
          </div>
          {streamingBuild ? (
            <div className="border-t border-white/[0.06] bg-[#0c0d12] px-3 py-2">
              <div className="mb-1 flex items-center gap-2 font-mono text-[9px] tracking-[0.2em] text-zinc-500">
                <Timer size={10} className="text-cyan-300" /> LIVE — AGENT IS WRITING THE PAGE
              </div>
              <pre className="h-20 overflow-hidden whitespace-pre-wrap break-all font-mono text-[9.5px] leading-[1.5] text-cyan-200/60">
                {liveCode.slice(-900)}
                <span className="ml-0.5 inline-block h-2.5 w-1.5 animate-pulse bg-cyan-300 align-middle"></span>
              </pre>
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {rest.map((o) => (
            <div key={o.style} className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#101218] opacity-50 saturate-50 transition-all duration-500">
              <div className="flex items-center justify-between gap-2 border-b border-white/[0.05] px-2.5 py-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className={"h-1 w-1 shrink-0 rounded-full " + STYLE_META[o.style].dot}></span>
                  <span className="truncate font-mono text-[8.5px] tracking-[0.15em] text-zinc-500">{STYLE_META[o.style].label}</span>
                </div>
                <span className="shrink-0 font-mono text-[8px] tracking-[0.15em] text-zinc-600">PITCH · NOT SELECTED</span>
              </div>
              <div className="relative h-[110px] overflow-hidden bg-[#0c0d12]">
                <div className="pointer-events-none h-[220px] w-[200%] origin-top-left scale-50">
                  <iframe sandbox="" srcDoc={o.html} title={o.style + "-pitch"} className="h-full w-full border-0 bg-white"></iframe>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── pitch layout: 2×2 grid of quick style samples ──
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {rest.map((o) => {
        const meta = STYLE_META[o.style];
        const hot = highlightStyle === o.style && o.status !== "loading";
        return (
          <div
            key={o.style}
            className={
              "overflow-hidden rounded-xl border transition-all duration-500 " +
              (hot
                ? "border-cyan-400/60 shadow-[0_0_36px_-6px_rgba(34,211,238,0.45)] ring-1 ring-cyan-400/30"
                : "border-white/[0.08] bg-[#101218]")
            }
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] bg-[#101218] px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + meta.dot}></span>
                <span className="truncate font-mono text-[10px] tracking-[0.18em] text-zinc-400">{meta.label}</span>
                {hot ? (
                  <span className="shrink-0 animate-pop-in rounded bg-cyan-400/15 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-cyan-300">
                    WINNING PITCH
                  </span>
                ) : outputKind === "pitch" ? (
                  <span className="shrink-0 rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-[9px] tracking-[0.15em] text-zinc-500">PITCH</span>
                ) : null}
              </div>
              {statusChip(o, outputKind === "build")}
            </div>
            <div className="relative h-[250px] bg-[#0c0d12] xl:h-[290px]">
              {o.status === "loading" ? (
                skeleton
              ) : o.status === "error" ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-red-400/80">
                  <AlertTriangle size={20} />
                  <span className="font-mono text-[11px]">generation failed</span>
                </div>
              ) : (
                <iframe sandbox="" srcDoc={o.html} title={o.style} className="h-full w-full animate-fade-in border-0 bg-white"></iframe>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
