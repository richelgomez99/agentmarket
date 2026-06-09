"use client";
// From the design handoff (specs/001-agentmarket/design) — presentational only.
import { Wallet, CheckCircle2, Loader2, AlertTriangle, ExternalLink, Download } from "lucide-react";
import type { Payment } from "@/lib/types";
import { PanelShell, truncHash } from "./shared";

export default function PaymentPanel({
  payment,
  awaitingAccept, // optional flourish: HTTP 402 received, reviewing work
  onDownload, // paid? the deliverable is yours — download the built page
}: {
  payment?: Payment;
  awaitingAccept?: boolean;
  onDownload?: () => void;
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
            {payment.status === "settled" && onDownload ? (
              <button
                onClick={onDownload}
                className="mt-2.5 flex w-full animate-pop-in items-center justify-center gap-2 rounded-lg bg-emerald-400/15 px-3 py-2 font-display text-[12.5px] font-bold text-emerald-300 transition hover:bg-emerald-400/25"
              >
                <Download size={14} /> DOWNLOAD DELIVERABLE
              </button>
            ) : null}
          </div>
        )}
      </div>
    </PanelShell>
  );
}
