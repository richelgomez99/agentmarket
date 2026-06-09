// Shared types for AgentMarket. Mirrors specs/001-agentmarket/contracts/ui-components.md
// so the (cloud-designed) presentational components and the server routes agree.

export type Style =
  | "dark-mode-premium"
  | "glassmorphism"
  | "brutalist"
  | "playful";

export type Reputation = { count: number; score: number }; // score e.g. 4.8

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
