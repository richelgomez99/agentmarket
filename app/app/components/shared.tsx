// Shared presentational helpers (from the design handoff — specs/001-agentmarket/design).
import type { Style } from "@/lib/types";

export const truncAddr = (a: string) => (a.length > 13 ? a.slice(0, 6) + "…" + a.slice(-5) : a);
export const truncHash = (h: string) => (h.length > 20 ? h.slice(0, 10) + "…" + h.slice(-8) : h);
export const timeAgo = (ts: number) => {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  return Math.floor(s / 3600) + "h ago";
};

export const STYLE_META: Record<Style, { label: string; chip: string; dot: string }> = {
  "dark-mode-premium": { label: "DARK-MODE PREMIUM", chip: "text-amber-200 bg-amber-300/10 border-amber-300/20", dot: "bg-amber-300" },
  glassmorphism: { label: "GLASSMORPHISM", chip: "text-sky-300 bg-sky-300/10 border-sky-300/20", dot: "bg-sky-300" },
  brutalist: { label: "BRUTALIST", chip: "text-zinc-200 bg-zinc-300/10 border-zinc-300/25", dot: "bg-zinc-300" },
  playful: { label: "PLAYFUL", chip: "text-pink-300 bg-pink-300/10 border-pink-300/20", dot: "bg-pink-300" },
};

export const PanelShell = (props: { title: string; icon?: React.ReactNode; right?: React.ReactNode; children?: React.ReactNode; className?: string }) => (
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
