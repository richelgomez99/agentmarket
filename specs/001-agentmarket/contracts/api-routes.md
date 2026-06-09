# API Route Contracts (Next.js App Router, server-side)

All LLM + chain-write logic lives here (Constitution VI: keys server-side only). Routes stream
where it helps the demo's legibility.

## POST /api/generate  (T1) — pitch | build modes
Generate one agent's output from the brief. Pitch mode is called 4× concurrently; build mode
once, by the hired agent only.
- **Request**: `{ brief: string, style: Style, mode: "pitch" | "build" }`
- **Pitch mode**: small/fast spec sample (hero-section scale; lower max_tokens, ~15s timeout).
  Response JSON: `{ style, html, status: "generated"|"fallback", elapsedMs }`.
- **Build mode (THE centerpiece)**: full-page generation, **streamed** — the route returns a
  text/event-stream (or chunked text) of raw HTML as it generates; the client progressively
  re-renders the featured iframe's `srcDoc` (~every 400ms) so the page visibly assembles, and
  feeds the live code strip. On completion, client runs `htmlGuard`; final frame replaces the
  progressive render. ~45s timeout.
- **Both**: OpenAI via `lib/llm.ts` + style system prompt from `lib/styles.ts`; enforce complete
  `<!DOCTYPE html>`, inline `<style>`, no JS, no external URLs, no fences; on timeout/failure/
  invalid → per-style fallback HTML with `status:"fallback"`. NEVER an error-blank (SC-002).

## POST /api/orchestrate  (T2) — two stages
- **Stage "open"** — `{ brief, stage: "open" }`: read registered agents from IdentityRegistry;
  for each, `getSummary(agentId, [CLIENT_EOA], <style>, "")` per-style reputation; LLM infers
  the brief's target style. Streams short "posting brief / requesting pitches" reasoning, then
  final `{ candidates: Agent[], inferredStyle }`. Client then fires the 4 pitch generations.
- **Stage "evaluate"** — `{ brief, stage: "evaluate", pitches: { style, status, elapsedMs }[] }`:
  LLM scores pitch fit against the brief AND cross-checks per-style on-chain track records,
  streams its judgment, then final `{ criteria, selectedAgentId }`. Deterministic tie-break:
  higher per-style score, then higher count, then lower agentId. Selection MUST match stated
  criteria (SC-004). Client then fires the build-mode generation for the winner.

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
