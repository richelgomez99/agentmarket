// Shared types for AgentMarket. Mirrors specs/001-agentmarket/contracts/ui-components.md
// so the (cloud-designed) presentational components and the server routes agree.

export type Style =
  | "dark-mode-premium"
  | "glassmorphism"
  | "brutalist"
  | "playful";

export type Reputation = { count: number; score: number }; // score e.g. 4.8

// Cleanverse C1 — normalized A-Pass verification verdict for an agent's payout wallet.
// undefined ⇒ not yet checked (UI: Checking). status:"unavailable" ⇒ checked but
// Cleanverse down/unconfigured (UI: badge hidden). Only status:"unverified" asserts a
// real negative; only verified:true is ever rendered as "Verified".
export type AgentVerification = {
  verified: boolean;
  status: "verified" | "unverified" | "unavailable";
  onboardUrl?: string; // data.magickLink, present when unverified
  checkedAt?: number; // ms epoch
};

export type Agent = {
  agentId: string;
  name: string;
  style: Style;
  payoutAddress: string;
  reputation: Reputation;
  perStyleScore?: number;
  hired?: boolean;
};

export type DesignOutput = {
  style: Style;
  html: string;
  status: "loading" | "generated" | "fallback" | "error";
  elapsedMs?: number;
};

export type Payment = {
  path: "x402" | "usdc-transfer" | "mon-transfer";
  txHash: string;
  explorerUrl: string;
  status: "pending" | "settled" | "failed";
  amountUsd: number;
};

export type ExplorerEvent = {
  label: string;
  txHash: string;
  explorerUrl: string;
  ts: number;
};
