# AGNTM-12 — Per-job on-chain review feed

**Path:** ERC-8004 ReputationRegistry has `getClients` / `getLastIndex` / `readFeedback`
(1-based index) — direct reads, no log-scan, so the getLogs RPC cap is irrelevant.

- chain.ts: add getClients/getLastIndex/readFeedback to reputationAbi (return ABI decoded
  from raw: int128 value, uint8 valueDecimals, string tag1, string tag2, bytes32 feedbackHash).
- /api/agent-reviews: after the getSummary breakdown, read the last ≤6 ratings via
  getLastIndex + readFeedback(agentId, CLIENT, i); return reviews[] {index, score, tag1, tag2, sealed}.
  Best-effort; newcomers (no feedback) return [].
- modal: RECENT RATINGS · ON-CHAIN list — ★score, style label, job #index, sealed badge.

**Acceptance:** established agent shows real individual ratings; newcomer shows none; no deliverables
shown (hash sealed); tsc + build green.
