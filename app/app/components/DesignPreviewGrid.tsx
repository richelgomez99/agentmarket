"use client";
// From the design handoff (specs/001-agentmarket/design), elevated for the build moment:
// - idleHtml: the "before" page shown at idle (the problem we transform)
// - liveCode: streaming raw HTML shown in a code strip while the build renders progressively
// - ScaledFrame: renders pages at desktop width (1280) scaled down to fit, so every preview
//   shows the FULL page layout (zoomed out), not a cropped corner
// Iframes are sandboxed WITHOUT allow-same-origin (Constitution V).
import { useLayoutEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2, Timer } from "lucide-react";
import type { DesignOutput, Style } from "@/lib/types";
import { STYLE_META } from "./shared";

const DESIGN_W = 1280; // desktop viewport the generated pages are designed for

const PITCH_STATUSES = ["INGESTING BRIEF", "STUDYING BRAND KIT", "REVIEWING CURRENT SITE", "DRAFTING CONCEPT", "PITCHING"];

function CyclingLabel() {
  const [i, setI] = useState(0);
  useLayoutEffect(() => {
    const iv = setInterval(() => setI((v) => (v + 1) % PITCH_STATUSES.length), 1800);
    return () => clearInterval(iv);
  }, []);
  return <span key={i} className="animate-fade-in">{PITCH_STATUSES[i]}</span>;
}

export type InspectState = { step: "scan" | "mobile" | "final"; label: string };

function ScaledFrame({
  html,
  title,
  className,
  designW = DESIGN_W,
  pan,
}: {
  html: string;
  title: string;
  className?: string;
  designW?: number; // 390 during the responsive QA sweep — media queries REALLY kick in
  pan?: boolean; // QA walkthrough: tour down the page and back
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / designW);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designW]);
  const innerH = Math.ceil((ref.current?.clientHeight ?? 0) / (scale || 1));
  return (
    <div ref={ref} className={"relative h-full w-full overflow-hidden " + (className || "")}>
      {scale > 0 ? (
        <div style={{ width: designW, height: innerH, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
          <iframe
            sandbox=""
            srcDoc={html}
            title={title}
            className={"animate-fade-in border-0 bg-white " + (pan ? "inspect-pan" : "")}
            style={{ width: designW, height: pan ? innerH * 2.2 : innerH, pointerEvents: "none" }}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function DesignPreviewGrid({
  outputs,
  highlightStyle, // optional: marks the winning pitch
  featuredStyle, // optional: render this style big as the full build; others shrink to thumbnails
  outputKind, // optional: "pitch" = quick spec samples, "build" = full generation
  idleHtml, // optional elevation: ugly "before" page rendered when there are no outputs
  liveCode, // optional elevation: streaming code strip while the featured build is loading
  buildElapsedMs, // optional elevation: ticking timer while building
  inspecting, // optional elevation: the hired agent's visible QA pass over the build
}: {
  outputs: DesignOutput[];
  highlightStyle?: Style;
  featuredStyle?: Style;
  outputKind?: "pitch" | "build";
  idleHtml?: string;
  liveCode?: string;
  buildElapsedMs?: number;
  inspecting?: InspectState;
}) {
  if (!outputs.length) {
    if (idleHtml) {
      return (
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#101218]">
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-2">
            <span className="font-mono text-[10px] tracking-[0.18em] text-zinc-400">THE PROBLEM — CURRENT PAGE</span>
            <span className="rounded bg-red-400/10 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-red-400">GENERIC AI BUILD</span>
          </div>
          <div className="relative h-[430px] bg-[#0c0d12] xl:h-[510px]">
            <ScaledFrame html={idleHtml} title="before" />
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
        <Loader2 size={11} className="animate-spin" /> {isBuild ? "BUILDING" : <CyclingLabel />}
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

  // ── build layout: the hired agent's full build, MAXIMIZED (losing pitches hidden) ──
  if (featured) {
    const streamingBuild = featured.status === "loading" && !!liveCode;
    return (
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
        <div className="relative h-[62vh] min-h-[480px] bg-[#0c0d12]">
          {featured.status === "loading" && !featured.html ? (
            skeleton
          ) : (
            // While streaming, html updates progressively (~400ms); final guard-passed doc replaces it.
            <div
              className={"mx-auto h-full transition-all duration-1000 ease-in-out " + (inspecting?.step === "mobile" ? "w-[400px]" : "w-full")}
            >
              <ScaledFrame
                html={featured.html}
                title={featured.style}
                designW={inspecting?.step === "mobile" ? 390 : DESIGN_W}
                pan={inspecting?.step === "scan"}
              />
            </div>
          )}
          {inspecting ? (
            <div className="pointer-events-none absolute inset-0">
              {inspecting.step === "scan" ? (
                <>
                  <div className="inspect-scanline absolute left-0 right-0 h-10 bg-[linear-gradient(180deg,transparent,rgba(34,211,238,0.14),transparent)]"></div>
                  <div className="inspect-cursor absolute h-5 w-5 rounded-full border-2 border-cyan-300 bg-cyan-300/20 shadow-[0_0_18px_rgba(34,211,238,0.8)]"></div>
                </>
              ) : null}
              <div className="absolute bottom-3 left-3 flex animate-pop-in items-center gap-2 rounded-lg border border-cyan-400/40 bg-[#0A0B0F]/90 px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.18em] text-cyan-300 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300"></span>
                AGENT QA — {inspecting.label}
              </div>
            </div>
          ) : null}
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
                <ScaledFrame html={o.html} title={o.style} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
