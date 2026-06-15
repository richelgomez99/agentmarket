"use client";
// Cleanverse C1 — A-Pass verification badge (AGNTM-5 / FR-007, SPEC §8).
// Presentational only; reads agent.verification. Honesty: "A-PASS" is shown ONLY
// on a real verified:true. undefined / "unavailable" render null (zero-regression
// visual parity when Cleanverse is unconfigured — AC-3).
import { BadgeCheck, ShieldAlert } from "lucide-react";
import type { AgentVerification } from "@/lib/types";

export default function VerifiedBadge({ verification }: { verification?: AgentVerification }) {
  if (!verification || verification.status === "unavailable") return null;

  const isVerified = verification.status === "verified" && verification.verified === true;

  if (isVerified) {
    return (
      <span
        title="Cleanverse A-Pass: verified"
        className="flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/[0.12] px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-emerald-300"
      >
        <BadgeCheck size={11} /> A-PASS
      </span>
    );
  }

  return (
    <span
      title="Cleanverse A-Pass: unverified — KYC pending"
      className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/[0.10] px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-amber-300"
    >
      <ShieldAlert size={11} /> UNVERIFIED
    </span>
  );
}
