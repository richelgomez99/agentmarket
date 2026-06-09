# Research: AgentMarket (Phase 0)

All NEEDS CLARIFICATION resolved. Most decisions were de-risked by the live verification pass
on 2026-06-09 (sources: canonical `erc-8004/erc-8004-contracts` repo, EIP-8004 text, Monad
docs, `testnet.monadscan.com`). Format: Decision / Rationale / Alternatives considered.

## R1. Selection model: orchestrator-hires (no custom contract in core path)
- **Decision**: The AI orchestrator reads on-chain reputation and autonomously hires one agent.
  We CALL the pre-deployed ERC-8004 registries; we WRITE no custom contract in T1–T4.
- **Rationale**: Matches BUILD_SHEET (the operational plan) and the constitution's tier ladder;
  removes Solidity write/deploy/verify from the critical path under a hard deadline; the
  "AI hires an AI" story is the novel mechanic and is stronger than audience-voting for a
  peer-builder vote. User decision (2026-06-09).
- **Alternatives**: Audience on-chain voting via `DesignArena.sol` (Agent Arena guide) —
  deferred to a T5 stretch only; more participatory but adds contract work + UI polish pressure.

## R2. ERC-8004 addresses + ABI (VERIFIED)
- **Decision**: Use the testnet singletons IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e`
  and ReputationRegistry `0x8004B663056A597Dffe9eCcC1965A193B7388713` on chainId 10143. Pin the
  no-auth `giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string
  tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)`. `register(string agentURI)
  returns (uint256)`. `getSummary(uint256 agentId, address[] clientAddresses, string tag1, string
  tag2)` with NON-EMPTY clientAddresses. `NewFeedback` event per the verified signature.
- **Rationale**: Confirmed live (~1,122 txs on the ReputationRegistry) against repo ABI + EIP.
- **Alternatives**: The deprecated `uint8 score`+`feedbackAuth` form — REJECTED (old draft).
  The Monad docs page's mainnet-vanity address set (`0x8004A169…`/`0x8004BAa1…`) — REJECTED for
  testnet (would silently target the wrong chain).

## R3. ABI strategy: pin, don't refetch
- **Decision**: Hardcode the minimal ABIs we use (register, giveFeedback, getSummary,
  NewFeedback) in `lib/chain.ts` from the verified repo ABIs.
- **Rationale**: ERC-8004 is Draft and may churn; the explorer copy is unverified-source so it
  can't decode. Pinning removes a live-fetch failure mode mid-demo. (Constitution III.)
- **Alternatives**: Agent0 SDK — REJECTED (alpha v0.31, known bugs, painful on Vercel). Live
  ABI fetch — REJECTED (fragile, Draft churn).

## R4. Payment: x402-first, transfer fallback
- **Decision**: Attempt x402 (`@x402/*` ≥ 2.2.0, exact scheme, facilitator
  `https://x402-facilitator.molandak.org`, `eip155:10143`, USDC `0x534b…43A3`). On failure or
  unreachable facilitator, fall back to a direct USDC `transfer` (or MON transfer) via viem from
  the client EOA to the agent payout address. UI surfaces which path settled.
- **Rationale**: Constitution IV. x402 is the impressive path but version/scheme-sensitive; the
  transfer fallback is a real on-chain payment and a guaranteed demo path. Stage a real
  `/settle` the night before; keep x402 only if staged settle succeeds.
- **Alternatives**: x402-only — REJECTED (single point of demo failure). Transfer-only —
  acceptable fallback but x402 is the stronger machine-payment story when it works.

## R5. LLM provider + reliability
- **Decision**: OpenAI via a thin `lib/llm.ts` adapter (uses Anthropic if `ANTHROPIC_API_KEY`
  is set, else OpenAI). Server-side only (API routes). Hard output constraints (complete
  `<!DOCTYPE html>`, inline `<style>`, no JS, no external URLs, no fences); `htmlGuard.ts`
  strips fences + validates; per-call timeout; per-style hard-coded fallback HTML.
- **Rationale**: `OPENAI_API_KEY` already in env → T1 buildable immediately; adapter keeps
  Claude swappable (nicer HTML) at zero rework. Constitution V/VI. Fallbacks guarantee the
  visual centerpiece never breaks on stage.
- **Alternatives**: Anthropic-only — REJECTED (no key yet, would block T1). Client-side calls —
  REJECTED (leaks keys; violates VI).

## R6. Sandboxed rendering
- **Decision**: Render each generated doc via `srcdoc` in `<iframe sandbox>` WITHOUT
  `allow-same-origin`. Skeleton loader per slot until resolved.
- **Rationale**: Treat LLM output as untrusted; deny it access to parent DOM/cookies/storage.
  Constitution V. Sandbox-without-same-origin means no DOMPurify needed (can't reach parent).
- **Alternatives**: dangerouslySetInnerHTML — REJECTED (untrusted in app origin). Same-origin
  iframe + DOMPurify — REJECTED (more code, weaker isolation).

## R7. Wallet topology (anti-self-feedback)
- **Decision**: MetaMask treasury (50 MON) funds two distinct `cast`-keystore EOAs: an
  AGENT-OWNER EOA (registers/owns the 3–4 agents) and a CLIENT/ORCHESTRATOR EOA (pays + writes
  feedback). App users get a Privy embedded wallet.
- **Rationale**: ERC-8004 reverts feedback from the agent owner/operator (verified). Separating
  owner from client makes `giveFeedback` succeed. Constitution III.
- **Alternatives**: Single EOA — REJECTED (feedback would revert). Per-agent owner wallets — fine
  but unnecessary; one owner EOA distinct from the client EOA suffices for the demo.

## R8. Toolchain: Monad Foundry fork + MONSKILLS
- **Decision**: Install Monad Foundry (`curl -L https://foundry.category.xyz | bash`) at T0 —
  only needed for `cast wallet` keystores and the optional T5 contract. Use MONSKILLS
  (`/monskill`) for faucet, contract dev/deploy, frontend deploy, indexing.
- **Rationale**: Constitution VI/VII. `forge`/`cast` are not yet installed (verified). Standard
  Foundry is NOT a substitute (Monad-native EVM execution).
- **Alternatives**: Standard Foundry — REJECTED (stack lock). Hand-rolled chain plumbing —
  REJECTED (official-skills-first).

## R9. Reputation display = our own aggregation
- **Decision**: Compute the displayed score/job-count client-side from `getSummary` (non-empty
  clientAddresses = our client EOA) and/or by indexing `NewFeedback`. Label it as our
  aggregation in the pitch.
- **Rationale**: No canonical on-chain aggregate score exists; honesty (Constitution governance,
  spec FR-021).
- **Alternatives**: Claiming an on-chain canonical score — REJECTED (overclaim; builders will catch it).

## R10. Demo legibility over polish (audience-calibrated)
- **Decision**: Build the UI so the autonomy beat is obvious with the sound off: big
  "HIRING DarkModeAgent ★4.8 (23 paid jobs)" → live build → "PAID 0.01 USDC ✓ [tx]" →
  "★4.8→★4.9 job #24". Optimize legibility first, polish second, technical depth third.
- **Rationale**: Judging = peer builders voting; room skews early-stage/students, light on web3.
  The demo must read instantly. (User direction 2026-06-09; saved to project memory.)
- **Alternatives**: Lead with protocol/ERC-8004 framing — REJECTED (won't land with this audience).
