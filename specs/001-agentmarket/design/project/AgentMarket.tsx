/* =====================================================================
   AgentMarket — live demo UI (one-file artifact)
   ---------------------------------------------------------------------
   INTEGRATION NOTES (for splitting into your Next.js app):
   1. Split each `// ===== X.tsx =====` section into app/components/X.tsx
   2. Replace the "PREVIEW SHIM" blocks below with real imports:
        import { useState, useEffect, useMemo } from "react";
        import { Zap, Star, ... } from "lucide-react";
   3. Delete the "PREVIEW MOUNT" block at the very bottom and instead:
        export default DemoHarness;
   All mock data lives ONLY in DemoHarness. The 7 components are dumb:
   props in, JSX out. No fetching, no wallets, no timers except
   presentational animation (typewriter / count-up / skeletons).
===================================================================== */

/* ── PREVIEW SHIM #1: React hooks from the UMD global.
      In Next.js, delete and `import { useState, useEffect, useMemo, useRef } from "react";` */
const { useState, useEffect, useMemo, useRef } = React;

/* ── PREVIEW SHIM #2: lucide-react from the UMD global.
      In Next.js, delete and `import { Zap, Star, ExternalLink, Activity, Wallet,
      TrendingUp, Loader2, AlertTriangle, CheckCircle2, Bot, ArrowRight, Cpu,
      BadgeCheck, Sparkles, Timer, Radio } from "lucide-react";` */
const __Lucide: any = (globalThis as any).LucideReact || {};
const __IconFallback = (p: any) => (
  <span
    className={p.className}
    style={{ display: "inline-block", width: p.size ?? 16, height: p.size ?? 16, borderRadius: 3, background: "currentColor", opacity: 0.4 }}
  ></span>
);
const Zap = __Lucide.Zap || __IconFallback;
const Star = __Lucide.Star || __IconFallback;
const ExternalLink = __Lucide.ExternalLink || __IconFallback;
const Activity = __Lucide.Activity || __IconFallback;
const Wallet = __Lucide.Wallet || __IconFallback;
const TrendingUp = __Lucide.TrendingUp || __IconFallback;
const Loader2 = __Lucide.Loader2 || __IconFallback;
const AlertTriangle = __Lucide.AlertTriangle || __IconFallback;
const CheckCircle2 = __Lucide.CheckCircle2 || __IconFallback;
const Bot = __Lucide.Bot || __IconFallback;
const ArrowRight = __Lucide.ArrowRight || __IconFallback;
const Cpu = __Lucide.Cpu || __IconFallback;
const BadgeCheck = __Lucide.BadgeCheck || __IconFallback;
const Sparkles = __Lucide.Sparkles || __IconFallback;
const Timer = __Lucide.Timer || __IconFallback;
const Radio = __Lucide.Radio || __IconFallback;

// ===== types.ts =====
type Style = "dark-mode-premium" | "glassmorphism" | "brutalist" | "playful";
type Reputation = { count: number; score: number }; // score e.g. 4.8
type Agent = {
  agentId: string;
  name: string;
  style: Style;
  payoutAddress: string;
  reputation: Reputation;
  perStyleScore?: number;
  hired?: boolean;
};
type DesignOutput = {
  style: Style;
  html: string;
  status: "loading" | "generated" | "fallback" | "error";
  elapsedMs?: number;
};
type Payment = {
  path: "x402" | "usdc-transfer" | "mon-transfer";
  txHash: string;
  explorerUrl: string;
  status: "pending" | "settled" | "failed";
  amountUsd: number;
};

// ===== shared.tsx =====
// Small presentational helpers shared by the components below.
const truncAddr = (a: string) => (a.length > 13 ? a.slice(0, 6) + "…" + a.slice(-5) : a);
const truncHash = (h: string) => (h.length > 20 ? h.slice(0, 10) + "…" + h.slice(-8) : h);
const timeAgo = (ts: number) => {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  return Math.floor(s / 3600) + "h ago";
};
const STYLE_META: Record<Style, { label: string; chip: string; dot: string }> = {
  "dark-mode-premium": { label: "DARK-MODE PREMIUM", chip: "text-amber-200 bg-amber-300/10 border-amber-300/20", dot: "bg-amber-300" },
  glassmorphism: { label: "GLASSMORPHISM", chip: "text-sky-300 bg-sky-300/10 border-sky-300/20", dot: "bg-sky-300" },
  brutalist: { label: "BRUTALIST", chip: "text-zinc-200 bg-zinc-300/10 border-zinc-300/25", dot: "bg-zinc-300" },
  playful: { label: "PLAYFUL", chip: "text-pink-300 bg-pink-300/10 border-pink-300/20", dot: "bg-pink-300" },
};
const PanelShell = (props: { title: string; icon?: any; right?: any; children?: any; className?: string }) => (
  <section className={"rounded-xl border border-white/[0.07] bg-[#101218] " + (props.className || "")}>
    <header className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2.5">
      <div className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.18em] text-zinc-400">
        {props.icon}
        <span>{props.title}</span>
      </div>
      {props.right}
    </header>
    {props.children}
  </section>
);

// ===== BriefInput.tsx =====
function BriefInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange(v: string): void;
  onSubmit(): void;
  disabled?: boolean;
}) {
  return (
    <form
      className="flex w-full items-stretch gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSubmit();
      }}
    >
      <div className="relative flex-1">
        <Sparkles size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Describe the page you want built…"
          className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-11 pr-4 text-base text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-cyan-400/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-60"
        />
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="group flex h-14 shrink-0 items-center gap-2.5 rounded-xl bg-cyan-400 px-6 font-display text-sm font-bold tracking-wide text-[#06262c] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Zap size={17} fill="currentColor" />
        <span className="hidden sm:inline">HIRE AN AGENT</span>
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </form>
  );
}

// ===== OrchestratorReasoning.tsx =====
function OrchestratorReasoning({
  text,
  streaming,
  selectedAgentName,
}: {
  text: string;
  streaming: boolean;
  selectedAgentName?: string;
}) {
  // Presentational typewriter: reveals `text` while streaming.
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
            // orchestrator idle — submit a brief and I will scan the
            <br />
            // on-chain market and hire the best-proven specialist
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

// ===== AgentCandidateCard.tsx =====
function AgentCandidateCard({
  agent,
  inferredStyle,
  selected,
}: {
  agent: Agent;
  inferredStyle?: Style;
  selected?: boolean;
}) {
  const meta = STYLE_META[agent.style];
  const isMatch = !!inferredStyle && inferredStyle === agent.style;
  return (
    <div
      className={
        "relative rounded-xl border p-3.5 transition-all duration-500 " +
        (selected
          ? "border-cyan-400/70 bg-cyan-400/[0.07] shadow-[0_0_28px_-4px_rgba(34,211,238,0.4)] ring-1 ring-cyan-400/40"
          : "border-white/[0.07] bg-[#101218] hover:border-white/[0.14]")
      }
    >
      {selected ? (
        <div className="absolute -top-2.5 right-3 flex animate-pop-in items-center gap-1 rounded-full bg-cyan-400 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.18em] text-[#06262c]">
          <BadgeCheck size={11} /> HIRED
        </div>
      ) : null}
      <div className="flex items-start gap-3">
        <div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border " + (selected ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300" : "border-white/10 bg-white/[0.04] text-zinc-400")}>
          <Bot size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-display text-[15px] font-bold tracking-tight text-zinc-100">{agent.name}</span>
            <span className="flex shrink-0 items-center gap-1 font-mono text-[15px] font-bold text-zinc-100">
              <Star size={13} className={selected ? "text-cyan-300" : "text-zinc-400"} fill="currentColor" />
              {agent.reputation.score.toFixed(1)}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={"rounded border px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.12em] " + meta.chip}>{meta.label}</span>
            <span className="font-mono text-[10.5px] text-zinc-500">{agent.reputation.count} paid jobs</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
        <span className="font-mono text-[10.5px] text-zinc-500">{truncAddr(agent.payoutAddress)}</span>
        {isMatch ? (
          <span className="flex items-center gap-1 font-mono text-[9.5px] font-medium tracking-[0.15em] text-cyan-300">
            <span className="h-1 w-1 rounded-full bg-cyan-300"></span>STYLE MATCH
          </span>
        ) : agent.perStyleScore !== undefined && inferredStyle ? (
          <span className="font-mono text-[9.5px] tracking-[0.1em] text-zinc-600">★{agent.perStyleScore.toFixed(1)} off-specialty</span>
        ) : null}
      </div>
    </div>
  );
}



// ===== DesignPreviewGrid.tsx =====
function DesignPreviewGrid({
  outputs,
  highlightStyle, // optional flourish: marks the winning agent's output
  featuredStyle, // optional flourish: render this style big as the "full build"; other outputs shrink to pitch thumbnails
  outputKind, // optional flourish: "pitch" = quick spec samples, "build" = full generation
}: {
  outputs: DesignOutput[];
  highlightStyle?: Style;
  featuredStyle?: Style;
  outputKind?: "pitch" | "build";
}) {
  if (!outputs.length) {
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
            {featured.status === "loading" ? (
              skeleton
            ) : (
              <iframe sandbox="" srcDoc={featured.html} title={featured.style} className="h-full w-full animate-fade-in border-0 bg-white"></iframe>
            )}
          </div>
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
        const hot = highlightStyle === o.style && o.status === "generated";
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

// ===== PaymentPanel.tsx =====
function PaymentPanel({
  payment,
  awaitingAccept, // optional flourish: HTTP 402 received, reviewing work
}: {
  payment?: Payment;
  awaitingAccept?: boolean;
}) {
  const pathLabel =
    payment?.path === "x402" ? "x402 · HTTP-402 micropayment" : payment?.path === "usdc-transfer" ? "Direct USDC transfer" : "Native MON transfer";
  return (
    <PanelShell
      title="PAYMENT"
      icon={<Wallet size={13} className="text-cyan-300" />}
      right={
        payment?.status === "settled" ? (
          <span className="font-mono text-[10px] tracking-[0.15em] text-emerald-400">SETTLED</span>
        ) : payment?.status === "pending" ? (
          <span className="animate-pulse font-mono text-[10px] tracking-[0.15em] text-amber-300">PENDING</span>
        ) : payment?.status === "failed" ? (
          <span className="font-mono text-[10px] tracking-[0.15em] text-red-400">FAILED</span>
        ) : null
      }
    >
      <div className="px-4 py-3.5">
        {!payment ? (
          awaitingAccept ? (
            <div className="animate-pop-in">
              <div className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.15em] text-amber-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300"></span>HTTP 402 — PAYMENT REQUIRED
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-400">Work delivered. Orchestrator is reviewing the build before accepting and paying.</p>
            </div>
          ) : (
            <p className="font-mono text-[11.5px] leading-relaxed text-zinc-600">no settlement yet — payment fires when work is accepted</p>
          )
        ) : (
          <div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] tracking-[0.2em] text-zinc-500">AMOUNT</div>
                <div className={"mt-0.5 font-mono text-[30px] font-bold leading-none tracking-tight " + (payment.status === "settled" ? "text-emerald-400" : "text-zinc-100")}>
                  ${payment.amountUsd.toFixed(2)}
                  <span className="ml-1.5 text-[13px] font-medium text-zinc-500">USDC</span>
                </div>
              </div>
              {payment.status === "settled" ? (
                <div className="flex animate-pop-in items-center gap-1.5 rounded-lg bg-emerald-400/10 px-2.5 py-1.5 font-display text-[13px] font-bold text-emerald-400">
                  <CheckCircle2 size={15} /> PAID
                </div>
              ) : payment.status === "pending" ? (
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-400/10 px-2.5 py-1.5 font-mono text-[11px] font-medium text-amber-300">
                  <Loader2 size={13} className="animate-spin" /> settling…
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-lg bg-red-400/10 px-2.5 py-1.5 font-mono text-[11px] text-red-400">
                  <AlertTriangle size={13} /> failed
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-zinc-300">{pathLabel}</span>
            </div>
            <a
              href={payment.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.06]"
            >
              <span className="truncate font-mono text-[11px] text-cyan-300">{truncHash(payment.txHash)}</span>
              <span className="flex shrink-0 items-center gap-1 font-mono text-[9.5px] tracking-[0.15em] text-zinc-500">
                VIEW TX <ExternalLink size={11} />
              </span>
            </a>
          </div>
        )}
      </div>
    </PanelShell>
  );
}

// ===== ReputationPanel.tsx =====
function ReputationPanel({
  agent,
  previousScore,
  txHash,
  explorerUrl,
}: {
  agent: Agent;
  previousScore?: number;
  txHash?: string;
  explorerUrl?: string;
}) {
  const target = agent.reputation.score;
  const from = previousScore !== undefined ? previousScore : target;
  const [val, setVal] = useState(from);
  useEffect(() => {
    if (from === target) {
      setVal(target);
      return;
    }
    let raf = 0;
    let start = 0;
    const DUR = 1500;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / DUR);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * ease);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, target]);

  const rising = previousScore !== undefined && target > previousScore;
  return (
    <PanelShell
      title="REPUTATION"
      icon={<TrendingUp size={13} className="text-cyan-300" />}
      right={rising ? <span className="animate-pop-in font-mono text-[10px] font-bold tracking-[0.15em] text-emerald-400">▲ SCORE UP</span> : null}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-[14px] font-bold tracking-tight text-zinc-100">{agent.name}</span>
          <span className="font-mono text-[10px] tracking-[0.12em] text-zinc-500">{truncAddr(agent.payoutAddress)}</span>
        </div>
        <div className="mt-2.5 flex items-end gap-3">
          <span className={"font-mono text-[40px] font-bold leading-none tracking-tight " + (rising ? "text-emerald-400" : "text-zinc-100")}>
            {val.toFixed(2)}
          </span>
          <div className="pb-1">
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={13} className={i < Math.round(val) ? (rising ? "text-emerald-400" : "text-cyan-300") : "text-zinc-700"} fill="currentColor" />
              ))}
            </div>
            {rising ? (
              <div className="mt-1 animate-pop-in font-mono text-[10.5px] font-medium text-emerald-400">
                +{(target - (previousScore as number)).toFixed(1)} from {previousScore!.toFixed(1)}
              </div>
            ) : (
              <div className="mt-1 font-mono text-[10.5px] text-zinc-500">on-chain score</div>
            )}
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div className={"h-full rounded-full transition-all duration-1000 " + (rising ? "bg-emerald-400" : "bg-cyan-400/70")} style={{ width: (val / 5) * 100 + "%" }}></div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className={"rounded border px-2 py-1 font-mono text-[10.5px] font-medium tracking-[0.08em] " + (rising ? "animate-pop-in border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/[0.04] text-zinc-400")}>
            JOB #{agent.reputation.count}{rising ? " · NEW" : ""}
          </span>
          {txHash && explorerUrl ? (
            <a href={explorerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-mono text-[10px] tracking-[0.08em] text-cyan-300 transition hover:text-cyan-200">
              {truncHash(txHash)} <ExternalLink size={10} />
            </a>
          ) : null}
        </div>
        {rising ? <p className="mt-2.5 text-[11.5px] leading-relaxed text-zinc-500">Rating written on-chain — this job is now part of the agent's permanent track record.</p> : null}
      </div>
    </PanelShell>
  );
}

// ===== ExplorerPanel.tsx =====
function ExplorerPanel({
  events,
}: {
  events: { label: string; txHash: string; explorerUrl: string; ts: number }[];
}) {
  const sorted = [...events].sort((a, b) => b.ts - a.ts);
  return (
    <PanelShell
      title="ON-CHAIN ACTIVITY"
      icon={<Activity size={13} className="text-cyan-300" />}
      right={<span className="font-mono text-[10px] tracking-[0.15em] text-zinc-600">{sorted.length} TXS</span>}
    >
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
    </PanelShell>
  );
}

// ===== DemoHarness.tsx =====
// ALL mock data + demo state lives here. Replace this file with real
// page wiring (/api/orchestrate|generate|pay|feedback) when integrating.

const EXPLORER = "https://testnet.monadexplorer.com/tx/";
const TX = {
  brief: "0x5e8b2d4f6a0c1e3d7b9f2a4c6e8d0b1f3a5c7e9d2b4f6a8c0e1d3f5b7a9c2e4d",
  registration: "0x4b1d09c3e7a2f5d8b06c9e1a3f5d7b2c4e6a8d0f1b3c5e7a9d2f4b6c8e0a1d3f",
  priorPayment: "0x8a2e4c6d0b1f3a5c7e9b2d4f6a8c0e1d3b5f7a9c2e4d6b8f0a1c3e5d7b9f2a4c",
  priorRating: "0x2c5e7a9d1f3b4c6e8a0d2f5b7c9e1a3d4f6b8c0e2a5d7f9b1c3e6a8d0f2b4c7e",
  payment: "0x7f3c9a2b41e8d6f05c1a8b9e2d4f6a3c5e7b1d9f0a2c4e6b8d1f3a5c7e9b2d4f",
  rating: "0xd94a1c7e3b5f8a2d6c0e9b4f1a7d3c5e8b2f6a0d4c9e1b7f3a5d8c2e6b0f4a1d",
};
const MOCK_AGENTS: Agent[] = [
  {
    agentId: "agent-dark-001",
    name: "DarkModeAgent",
    style: "dark-mode-premium",
    payoutAddress: "0x9B44e1F2c8A07D3b5a6cF49210bDeC4D7fEe41a3",
    reputation: { count: 23, score: 4.8 },
    perStyleScore: 4.8,
  },
  {
    agentId: "agent-glass-002",
    name: "GlassAgent",
    style: "glassmorphism",
    payoutAddress: "0x3Fa81Cb96dE24A07f5b3c8D1e6A92F4c0bB7d5E8",
    reputation: { count: 14, score: 4.5 },
    perStyleScore: 3.6,
  },
  {
    agentId: "agent-brut-003",
    name: "BrutalistAgent",
    style: "brutalist",
    payoutAddress: "0x71Cd5eA20fB983D4c6a1E7f2B05c9D8e3Aa64F0b",
    reputation: { count: 31, score: 4.9 },
    perStyleScore: 3.9,
  },
  {
    agentId: "agent-play-004",
    name: "PlayfulAgent",
    style: "playful",
    payoutAddress: "0xE502b7D94aC18F6e3d5B0a2C8f7E1d4A9c6B3f25",
    reputation: { count: 9, score: 4.2 },
    perStyleScore: 3.2,
  },
];
const MOCK_HTML: Record<Style, string> = {
  "dark-mode-premium": `<!doctype html><html><body style="margin:0;background:#0b0a0c;color:#f2ede4;font-family:Georgia,'Times New Roman',serif;min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:30px;box-sizing:border-box"><div style="font-size:10px;letter-spacing:.35em;color:#c8a96a;font-family:Helvetica,Arial,sans-serif">NOCTURNE COFFEE</div><h1 style="font-size:34px;margin:12px 0 8px;font-weight:500;line-height:1.1">Brewed for the<br/>late shift.</h1><p style="color:#8d877e;font-size:13px;max-width:30ch;line-height:1.6;margin:0">AI-tuned roast profiles, delivered before sunrise.</p><div style="margin-top:20px;display:flex;gap:10px;font-family:Helvetica,Arial,sans-serif"><span style="border:1px solid #c8a96a;color:#c8a96a;padding:9px 18px;font-size:11px;letter-spacing:.15em">PRE-ORDER</span><span style="color:#5b564f;padding:9px 4px;font-size:11px;letter-spacing:.15em">THE ROASTS →</span></div></body></html>`,
  glassmorphism: `<!doctype html><html><body style="margin:0;min-height:100vh;background:linear-gradient(135deg,#3b1d6e 0%,#1e3a8a 55%,#0e7490 100%);display:flex;align-items:center;justify-content:center;font-family:Helvetica,Arial,sans-serif;padding:24px;box-sizing:border-box"><div style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);border-radius:20px;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);padding:26px;color:#fff;max-width:300px;box-shadow:0 18px 50px rgba(0,0,0,.3)"><div style="font-size:10px;letter-spacing:.3em;opacity:.75">NOCTURNE</div><h1 style="font-size:24px;margin:10px 0;font-weight:600">Coffee, but make it weightless</h1><p style="font-size:12px;opacity:.8;line-height:1.6;margin:0">Frosted, floating, fresh by 6am.</p><div style="margin-top:16px;background:rgba(255,255,255,.9);color:#1e3a8a;border-radius:999px;padding:9px 18px;display:inline-block;font-size:11px;font-weight:700">Pre-order</div></div></body></html>`,
  brutalist: `<!doctype html><html><body style="margin:0;background:#f4f1ea;color:#111;font-family:Helvetica,Arial,sans-serif;min-height:100vh;box-sizing:border-box;padding:22px"><div style="border:4px solid #111;padding:18px"><div style="font-size:11px;font-weight:700;letter-spacing:.1em;border-bottom:4px solid #111;padding-bottom:10px">NOCTURNE COFFEE CO.</div><h1 style="font-size:42px;margin:14px 0 0;line-height:.95;font-weight:800;text-transform:uppercase">Coffee.<br/>No frills.</h1><div style="margin-top:16px;display:inline-block;background:#111;color:#f4f1ea;padding:10px 16px;font-size:13px;font-weight:800">ORDER NOW →</div></div></body></html>`,
  playful: `<!doctype html><html><body style="margin:0;background:#fff7e8;min-height:100vh;font-family:'Trebuchet MS',Verdana,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:28px;box-sizing:border-box;color:#3d2c1e"><div style="display:flex;gap:8px;margin-bottom:14px"><span style="width:18px;height:18px;border-radius:50%;background:#ff8a5c"></span><span style="width:18px;height:18px;border-radius:50%;background:#ffc94d"></span><span style="width:18px;height:18px;border-radius:50%;background:#7ec8a9"></span></div><h1 style="font-size:30px;margin:0 0 8px;font-weight:800">Wakey wakey, it's coffee time! ☀</h1><p style="font-size:13px;line-height:1.6;margin:0;opacity:.8">Beans with bounce, delivered with a smile.</p><div style="margin-top:18px;display:inline-block;background:#ff8a5c;color:#fff;border-radius:999px;padding:11px 22px;font-size:13px;font-weight:800;box-shadow:0 4px 0 #e06a3c;align-self:flex-start">Get the beans</div></body></html>`,
};
// Pitches are cheap spec samples — fast. The full build is the real job — slower.
const PITCH_ELAPSED: Record<Style, number> = { "dark-mode-premium": 1600, glassmorphism: 2100, brutalist: 1400, playful: 2600 };
const BUILD_ELAPSED_MS = 9400;
const FULL_BUILD_HTML = `<!doctype html><html><body style="margin:0;background:#0b0a0c;color:#f2ede4;font-family:Georgia,'Times New Roman',serif"><div style="display:flex;justify-content:space-between;align-items:center;padding:16px 30px;border-bottom:1px solid #1d1a17;font-family:Helvetica,Arial,sans-serif"><span style="font-size:11px;letter-spacing:.35em;color:#c8a96a">NOCTURNE</span><span style="display:flex;gap:22px;font-size:10.5px;color:#8d877e;letter-spacing:.08em"><span>ROASTS</span><span>SUBSCRIBE</span><span>JOURNAL</span><span style="color:#f2ede4">CART (0)</span></span></div><div style="padding:58px 30px 44px;max-width:660px"><div style="font-size:10px;letter-spacing:.35em;color:#c8a96a;font-family:Helvetica,Arial,sans-serif">SMALL-BATCH · AI-TUNED ROASTS</div><h1 style="font-size:50px;margin:16px 0 12px;font-weight:500;line-height:1.05">Brewed for the late&nbsp;shift.</h1><p style="color:#8d877e;font-size:14.5px;max-width:44ch;line-height:1.7;margin:0">Our model tastes ten thousand cups so yours is perfect. Roast profiles tuned nightly, delivered before sunrise.</p><div style="margin-top:24px;display:flex;gap:12px;font-family:Helvetica,Arial,sans-serif"><span style="background:#c8a96a;color:#0b0a0c;padding:12px 22px;font-size:11px;letter-spacing:.15em;font-weight:700">PRE-ORDER — $24</span><span style="border:1px solid #2a2722;color:#8d877e;padding:12px 22px;font-size:11px;letter-spacing:.15em">THE ROASTS →</span></div></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;padding:0 30px 48px"><div style="background:#131115;border:1px solid #1d1a17;padding:20px"><div style="font-size:18px;margin:0 0 6px">Midnight Oil</div><div style="font-size:11.5px;color:#8d877e;line-height:1.6">dark chocolate · cherry · smoke</div><div style="margin-top:12px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#c8a96a;letter-spacing:.1em">$24 / 12oz</div></div><div style="background:#131115;border:1px solid #1d1a17;padding:20px"><div style="font-size:18px;margin:0 0 6px">3AM Cut</div><div style="font-size:11.5px;color:#8d877e;line-height:1.6">black fig · molasses · cedar</div><div style="margin-top:12px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#c8a96a;letter-spacing:.1em">$26 / 12oz</div></div><div style="background:#131115;border:1px solid #1d1a17;padding:20px"><div style="font-size:18px;margin:0 0 6px">Last Call</div><div style="font-size:11.5px;color:#8d877e;line-height:1.6">burnt caramel · orange peel</div><div style="margin-top:12px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#c8a96a;letter-spacing:.1em">$22 / 12oz</div></div></div><div style="border-top:1px solid #1d1a17;padding:16px 30px;display:flex;justify-content:space-between;font-family:Helvetica,Arial,sans-serif;font-size:10px;color:#5b564f;letter-spacing:.15em"><span>© NOCTURNE COFFEE CO.</span><span>BUILT BY DARKMODEAGENT</span></div></body></html>`;
const STYLE_ORDER: Style[] = ["dark-mode-premium", "glassmorphism", "brutalist", "playful"];
const REASONING_PITCH = `▸ Brief received.
▸ Parsing intent… brand: premium · nocturnal · serif display
▸ Posting brief to the on-chain market…
▸ 4 registered specialists responded
▸ Requesting quick style pitches — cheap spec samples,
  NOT full builds. The full job goes to one winner only.
▸ Awaiting pitches…`;
const REASONING_EVAL = `▸ 4 pitches in. Scoring fit against the brief:
    DarkModeAgent   serif display + gold accent — on-brand ✓
    BrutalistAgent  strong type, wrong mood for "premium"
    GlassAgent      cool-toned glass — off-palette
    PlayfulAgent    fallback template — off-brief
▸ Cross-checking on-chain track records (paid jobs only):
    DarkModeAgent   ★4.8 · 23 PAID dark-mode jobs ✓
    BrutalistAgent  ★4.9 overall · only ★3.9 in dark-mode
▸ Best pitch AND strongest proven record agree.
▸ Decision locked.`;
const streamMs = (t: string) => Math.ceil((t.length / 110) * 1000);
const PITCH_STREAM_MS = streamMs(REASONING_PITCH);
const EVAL_STREAM_MS = streamMs(REASONING_EVAL);

const PHASES = [
  { key: "idle", label: "Idle", headline: "Awaiting brief — the market is open" },
  { key: "pitching", label: "Pitching", headline: "Brief posted — agents are submitting quick style pitches" },
  { key: "evaluating", label: "Evaluating", headline: "Orchestrator is judging pitches + on-chain track records" },
  { key: "building", label: "Building", headline: "DarkModeAgent hired — full build rendering live" },
  { key: "awaiting", label: "Awaiting accept", headline: "HTTP 402 — build delivered, payment required" },
  { key: "paying", label: "Paying", headline: "Settling 0.01 USDC on-chain via x402" },
  { key: "rated", label: "Rated", headline: "Reputation written on-chain — job #24 complete" },
];

function DemoHarness() {
  const [phase, setPhase] = useState(0);
  const [brief, setBrief] = useState("A dark-mode landing page for an AI coffee startup");
  const [autoplay, setAutoplay] = useState(false);
  // sub-phase presentational flags (reset on every phase change)
  const [revealed, setRevealed] = useState(0); // pitches submitted (phase 1)
  const [hireShown, setHireShown] = useState(false); // hire banner (phase 2)
  const [buildReady, setBuildReady] = useState(false); // full build rendered (phase 3)
  const [settledNow, setSettledNow] = useState(false); // payment settled (phase 5)
  const now = useMemo(() => Date.now(), []);

  // per-phase presentational timers
  useEffect(() => {
    setRevealed(0);
    setHireShown(false);
    setBuildReady(false);
    setSettledNow(false);
    const timers: any[] = [];
    if (phase === 1) [500, 1100, 1700, 2300].forEach((ms, i) => timers.push(setTimeout(() => setRevealed(i + 1), PITCH_STREAM_MS + ms)));
    if (phase === 2) timers.push(setTimeout(() => setHireShown(true), EVAL_STREAM_MS + 250));
    if (phase === 3) timers.push(setTimeout(() => setBuildReady(true), 2200));
    if (phase === 5) timers.push(setTimeout(() => setSettledNow(true), 1600));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // autoplay through the story beats
  useEffect(() => {
    if (!autoplay) return;
    if (phase >= 1 && phase <= 5) {
      const durations: Record<number, number> = { 1: PITCH_STREAM_MS + 3600, 2: EVAL_STREAM_MS + 2200, 3: 4200, 4: 2400, 5: 3400 };
      const t = setTimeout(() => setPhase((p) => Math.min(6, p + 1)), durations[phase]);
      return () => clearTimeout(t);
    }
    if (phase === 6) setAutoplay(false);
  }, [autoplay, phase]);

  // ── derived state ──────────────────────────────────────────────
  const hired = hireShown || phase >= 3;
  const rated = phase >= 6;
  const inferredStyle: Style = "dark-mode-premium";

  const agents: Agent[] = MOCK_AGENTS.map((a) => {
    const isWinner = a.style === inferredStyle;
    const rep = isWinner && rated ? { count: a.reputation.count + 1, score: 4.9 } : a.reputation;
    return { ...a, reputation: rep, hired: isWinner && hired };
  });
  const hiredAgent = agents.find((a) => a.style === inferredStyle) as Agent;

  // pitches: cheap style samples from ALL candidates (phases 1–2)
  const pitches: DesignOutput[] = STYLE_ORDER.map((s, i) => {
    const ready = phase >= 2 || revealed > i;
    const finalStatus: DesignOutput["status"] = s === "playful" ? "fallback" : "generated";
    return { style: s, html: MOCK_HTML[s], status: ready ? finalStatus : "loading", elapsedMs: ready ? PITCH_ELAPSED[s] : undefined };
  });
  // full build: only the hired agent, only after the hire (phase 3+)
  const fullBuild: DesignOutput = {
    style: inferredStyle,
    html: FULL_BUILD_HTML,
    status: buildReady || phase >= 4 ? "generated" : "loading",
    elapsedMs: buildReady || phase >= 4 ? BUILD_ELAPSED_MS : undefined,
  };
  const outputs: DesignOutput[] =
    phase < 1 ? [] : phase < 3 ? pitches : [fullBuild, ...pitches.filter((p) => p.style !== inferredStyle)];

  const paymentSettled = phase >= 6 || (phase === 5 && settledNow);
  const payment: Payment | undefined =
    phase >= 5
      ? { path: "x402", txHash: TX.payment, explorerUrl: EXPLORER + TX.payment, status: paymentSettled ? "settled" : "pending", amountUsd: 0.01 }
      : undefined;

  const events = [
    { label: "Agent registered · DarkModeAgent", txHash: TX.registration, explorerUrl: EXPLORER + TX.registration, ts: now - 47 * 60000 },
    { label: "Payment · 0.01 USDC → BrutalistAgent", txHash: TX.priorPayment, explorerUrl: EXPLORER + TX.priorPayment, ts: now - 26 * 60000 },
    { label: "Reputation update · BrutalistAgent ★4.9", txHash: TX.priorRating, explorerUrl: EXPLORER + TX.priorRating, ts: now - 26 * 60000 + 30000 },
    ...(phase >= 1 ? [{ label: "Brief posted · 4 agents pitching", txHash: TX.brief, explorerUrl: EXPLORER + TX.brief, ts: now }] : []),
    ...(paymentSettled ? [{ label: "Payment · 0.01 USDC → DarkModeAgent", txHash: TX.payment, explorerUrl: EXPLORER + TX.payment, ts: now + 1000 }] : []),
    ...(rated ? [{ label: "Reputation update · DarkModeAgent ★4.9", txHash: TX.rating, explorerUrl: EXPLORER + TX.rating, ts: now + 2000 }] : []),
  ];

  const live = phase >= 1 && phase <= 5;

  return (
    <div className="min-h-screen bg-[#0A0B0F] pb-28 font-display text-zinc-200 antialiased selection:bg-cyan-400/30">
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
            <span className={"h-1.5 w-1.5 rounded-full " + (phase === 0 ? "bg-zinc-600" : rated ? "bg-emerald-400" : "animate-pulse bg-cyan-400")}></span>
            <span className="font-mono text-[11px] tracking-[0.12em] text-zinc-300">{PHASES[phase].headline}</span>
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
        <BriefInput value={brief} onChange={setBrief} onSubmit={() => { if (brief.trim()) { setPhase(1); setAutoplay(true); } }} disabled={live} />
      </div>

      {/* ── dashboard ── */}
      <main className="mx-auto mt-5 grid max-w-[1760px] grid-cols-1 gap-5 px-5 lg:grid-cols-[350px_minmax(0,1fr)_370px] lg:px-8">
        {/* left: brain + market */}
        <div className="flex flex-col gap-5">
          <OrchestratorReasoning
            text={phase === 1 ? REASONING_PITCH : phase >= 2 ? REASONING_EVAL : ""}
            streaming={phase === 1 || phase === 2}
            selectedAgentName={phase >= 2 ? hiredAgent.name : undefined}
          />
          <div>
            <div className="mb-2.5 flex items-center justify-between px-1">
              <span className="font-mono text-[11px] font-medium tracking-[0.18em] text-zinc-400">AGENT MARKET</span>
              <span className="font-mono text-[10px] text-zinc-600">{agents.length} REGISTERED</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {agents.map((a) => (
                <div key={a.agentId} className={"transition-all duration-700 " + (hired && !a.hired ? "opacity-40 saturate-50" : "")}>
                  <AgentCandidateCard agent={a} inferredStyle={phase >= 1 ? inferredStyle : undefined} selected={!!a.hired} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* center: the work */}
        <div>
          <div className="mb-2.5 flex items-center justify-between px-1">
            <span className="font-mono text-[11px] font-medium tracking-[0.18em] text-zinc-400">{phase >= 3 ? "FULL BUILD" : "STYLE PITCHES"}</span>
            {phase >= 1 && phase < 3 ? (
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
                <Timer size={11} /> quick spec samples — not full builds
              </span>
            ) : phase >= 3 ? (
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
                <Timer size={11} /> sandboxed live render
              </span>
            ) : null}
          </div>
          <DesignPreviewGrid
            outputs={outputs}
            highlightStyle={hired ? inferredStyle : undefined}
            featuredStyle={phase >= 3 ? inferredStyle : undefined}
            outputKind={phase >= 3 ? "build" : "pitch"}
          />
        </div>

        {/* right: the proof rail */}
        <div className="flex flex-col gap-5">
          <div className="-mb-2.5 px-1 font-mono text-[11px] font-medium tracking-[0.18em] text-zinc-400">ON-CHAIN PROOF</div>
          <PaymentPanel payment={payment} awaitingAccept={phase === 4} />
          <ReputationPanel
            agent={hiredAgent}
            previousScore={rated ? 4.8 : undefined}
            txHash={rated ? TX.rating : undefined}
            explorerUrl={rated ? EXPLORER + TX.rating : undefined}
          />
          <ExplorerPanel events={events} />
        </div>
      </main>

      {/* ── demo stepper (DemoHarness only — not shipped) ── */}
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#13151c]/95 px-2 py-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.6)] backdrop-blur">
          <span className="hidden px-2 font-mono text-[9px] tracking-[0.2em] text-zinc-600 sm:inline">DEMO</span>
          {PHASES.map((p, i) => (
            <button
              key={p.key}
              onClick={() => { setAutoplay(false); setPhase(i); }}
              className={
                "rounded-full px-3 py-1.5 font-mono text-[10px] font-medium tracking-[0.08em] transition " +
                (phase === i ? "bg-cyan-400 text-[#06262c]" : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200")
              }
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => { setPhase(1); setAutoplay(true); }}
            className="ml-1 flex items-center gap-1.5 rounded-full border border-cyan-400/40 px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.08em] text-cyan-300 transition hover:bg-cyan-400/10"
          >
            <Radio size={11} className={autoplay ? "animate-pulse" : ""} /> {autoplay ? "PLAYING…" : "AUTO-RUN"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── PREVIEW MOUNT — DELETE when integrating into Next.js, and instead:
      export default DemoHarness;                                       */
const __previewRoot = document.getElementById("agentmarket-root");
if (__previewRoot) {
  (ReactDOM as any).createRoot(__previewRoot).render(<DemoHarness />);
}
