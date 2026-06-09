# Data Model: AgentMarket (Phase 1)

No database. State is on-chain (ERC-8004) + in-memory per job + staged config. This documents
the conceptual entities (from the spec) and how each maps to chain / app state.

## Entity: DesignBrief
- **Fields**: `text` (string, user free-text), `submittedAt` (timestamp).
- **Lifecycle**: created on submit → drives one OrchestratorDecision + N DesignOutputs.
- **Where**: in-memory (request body → API routes). Not persisted.

## Entity: SpecialistAgent
- **Fields**: `agentId` (uint256, on-chain), `style` (enum: dark-mode-premium | glassmorphism |
  brutalist | playful), `ownerAddress` (EOA, the agent-owner EOA — distinct from client),
  `payoutAddress` (where it gets paid; defaults to owner unless `agentWallet` set),
  `agentURI` (agent card JSON: style/wallet/endpoint), `reputation` (derived — see below).
- **Source of truth**: ERC-8004 IdentityRegistry (`register`, `getAgentWallet`, `getMetadata`).
- **Lifecycle**: pre-registered at T0 by the owner EOA (staged). Read live from T2 on.
- **Validation**: `ownerAddress` MUST ≠ client/orchestrator EOA (else giveFeedback reverts).
- **T1 note**: before chain wiring, the 4 styles exist as local personas in `lib/styles.ts`;
  T2 binds each persona to a real on-chain `agentId`.

## Entity: AgentReputation (derived, not a stored aggregate)
- **Fields**: `count` (uint64), `summaryValue` (int128), `summaryValueDecimals` (uint8) →
  rendered as a score (e.g. value=480, decimals=2 → ★4.80) + job count.
- **Source**: `getSummary(agentId, [clientEOA], "design", "")` (clientAddresses NON-EMPTY) and/or
  indexed `NewFeedback` events. Computed client-side; labeled as our aggregation.
- **Lifecycle**: read at T2 (selection) and re-read at T4 (after a new feedback write) to show
  the tick-up.

## Entity: OrchestratorDecision
- **Fields**: `candidates` (SpecialistAgent[] with reputation), `criteria` (string, stated rule),
  `reasoning` (streamed string), `selectedAgentId` (uint256), `selectedAt` (timestamp).
- **Where**: produced by `api/orchestrate` (server, OpenAI). Streamed to `OrchestratorReasoning`.
- **Validation**: selection MUST be consistent with stated reputation criteria (SC-004);
  deterministic tie-break (e.g. higher count, then lower agentId).

## Entity: DesignOutput
- **Fields**: `agentId`/`style`, `html` (self-contained doc), `status` (loading | generated |
  fallback | error), `elapsedMs`.
- **Where**: produced by `api/generate` (server, OpenAI), rendered in a sandboxed iframe via
  `srcdoc`.
- **Validation**: passes `htmlGuard` (fences stripped; is a complete `<!DOCTYPE html>`; no
  `<script>`, no external URLs). On timeout/failure/invalid → `fallback` with the per-style
  hard-coded HTML. No slot may end `error`-blank (SC-002).

## Entity: Payment
- **Fields**: `agentId`, `payoutAddress`, `amount` (fixed micro-price, USDC 6-dec), `path`
  (x402 | usdc-transfer | mon-transfer), `txHash`, `status` (pending | settled | failed),
  `explorerUrl`.
- **Where**: `api/pay` (server). x402 first; on fail → viem transfer fallback. `PaymentPanel`
  shows `path` + `explorerUrl`.
- **Validation**: a real on-chain tx to the agent's payout address; `path` correctly reflects
  what settled, including fallback (SC-005).

## Entity: ReputationEntry
- **Fields**: `agentId`, `clientAddress` (the client EOA, NON-owner), `value`/`valueDecimals`
  (e.g. 100,0 = a positive completed-job signal), `tag1`="design", `tag2`="arena-win" (or job
  ref), `endpoint`/`feedbackURI`/`feedbackHash` (may be empty), `txHash`, `explorerUrl`.
- **Source/sink**: written via `giveFeedback` on ReputationRegistry by the client EOA; read back
  via `getSummary`/`NewFeedback`.
- **Validation**: caller ≠ agent owner (else revert). After write, `AgentReputation` re-read
  reflects it (SC-006).

## On-chain reference (pinned — Constitution III)
- Chain: Monad testnet, chainId **10143**, RPC `https://testnet-rpc.monad.xyz`.
- IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e`.
- ReputationRegistry `0x8004B663056A597Dffe9eCcC1965A193B7388713`.
- USDC `0x534b2f3A21130d7a60830c2Df862319e593943A3` (6 decimals).
- x402 facilitator `https://x402-facilitator.molandak.org`, network `eip155:10143`.
