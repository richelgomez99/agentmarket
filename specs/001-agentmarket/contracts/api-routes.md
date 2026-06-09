# API Route Contracts (Next.js App Router, server-side)

All LLM + chain-write logic lives here (Constitution VI: keys server-side only). Routes stream
where it helps the demo's legibility.

## POST /api/generate  (T1)
Generate one style's design from the brief. Called 3–4× concurrently (one per style).
- **Request**: `{ brief: string, style: "dark-mode-premium"|"glassmorphism"|"brutalist"|"playful" }`
- **Response (stream or JSON)**: `{ style, html: string, status: "generated"|"fallback", elapsedMs }`
- **Behavior**: OpenAI (via `lib/llm.ts`) with the style's system prompt from `lib/styles.ts`.
  Enforce: complete `<!DOCTYPE html>`, inline `<style>`, no JS, no external URLs, no fences.
  Run through `lib/htmlGuard.ts` (strip fences, validate self-contained). Per-call timeout
  (~25s). On timeout/failure/invalid → return the per-style hard-coded fallback HTML with
  `status:"fallback"`. NEVER return an error-blank (SC-002).

## POST /api/orchestrate  (T2)
Discover agents on-chain, read per-style reputation, pick the specialist, stream reasoning.
- **Request**: `{ brief: string }`
- **Response (stream)**: tokens of reasoning, then a final
  `{ candidates: Agent[], criteria, selectedAgentId, inferredStyle }`
  where `Agent = { agentId, name, style, payoutAddress, reputation: { count, score } }`.
- **Behavior**: read registered agents from IdentityRegistry; for each, `getSummary(agentId,
  [CLIENT_EOA], <style>, "")` for **per-style** reputation. LLM infers the brief's target style
  and explains hiring the best specialist for it (specialty-matched). Deterministic tie-break:
  higher count, then lower agentId. Selection MUST match stated criteria (SC-004).

## POST /api/pay  (T3)
Pay the selected agent. x402 first, transfer fallback.
- **Request**: `{ agentId, payoutAddress, amountUsd: number }` (fixed micro-price)
- **Response**: `{ path: "x402"|"usdc-transfer"|"mon-transfer", txHash, explorerUrl, status }`
- **Behavior**: attempt x402 settle (`lib/x402.ts`) from CLIENT EOA. On failure/unreachable →
  viem USDC `transfer` (or MON transfer) from CLIENT EOA to `payoutAddress`. Return the path
  that actually settled + the real tx hash + explorer URL (Constitution IV; SC-005).

## POST /api/feedback  (T4)
Write reputation on-chain, then read it back.
- **Request**: `{ agentId, style, value?: number, valueDecimals?: number }`
- **Response**: `{ txHash, explorerUrl, reputation: { count, score } }`
- **Behavior**: `giveFeedback(agentId, value ?? 100, valueDecimals ?? 0, tag1=style,
  tag2="agentmarket", "", "", 0x0)` from the **CLIENT EOA** (≠ owner, else reverts). Then
  re-read `getSummary(agentId, [CLIENT_EOA], style, "")` and return the updated count+score so
  the UI shows the tick-up (SC-006). Return the real tx hash + explorer URL.

## Notes
- All explorer URLs use real tx hashes (the credibility differentiator: clickable, real,
  unlike mock feeds). Format: `https://testnet.monadexplorer.com/tx/<hash>`.
- Env (server-only): `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`), `CLIENT_EOA_PRIVATE_KEY` (or
  keystore), `MONAD_RPC_URL`. Never exposed to client. See `.env.example`.
