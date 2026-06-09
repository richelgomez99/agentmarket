# Quickstart: AgentMarket

How to set up env and run/smoke each tier. Honors the constitution's per-tier gate
(build + dev server clean + tier smoke test → commit). Prefer MONSKILLS (`/monskill`) for
faucet/deploy/indexing.

## Prerequisites (T0)
1. **Monad Foundry** (custom fork, NOT standard Foundry):
   `curl -L https://foundry.category.xyz | bash` → provides `forge` + `cast`.
2. **Node 20+ / pnpm** (present). **viem ≥ 2.40**, OpenAI SDK, `@x402/*` installed with deps.
3. **Treasury**: MetaMask on Monad Testnet (chainId 10143) with ~50 MON (claimed).
4. **Two EOAs (both yours; C ≠ O — anti-self-feedback):**
   ```bash
   cast wallet new        # → OWNER (O): registers + owns agents; agents' payout address
   cast wallet new        # → CLIENT (C): pays agents + writes giveFeedback
   ```
   Fund O with a little MON (registration gas) and C with MON + a little USDC, from the
   treasury. Keep keys in env only (never commit): `OWNER_PRIVATE_KEY`, `CLIENT_PRIVATE_KEY`.
5. **Get testnet USDC**: `faucet.circle.com` (select Monad Testnet) → to C.
6. **Pre-register 3–4 agents** on IdentityRegistry from O (`scripts/register-agents.ts`),
   one per style; agent card payout = O. Save the agentIds.
7. **Confirm live ABIs** on the explorer before wiring (Constitution III).

## Env (`.env.local`, gitignored — Constitution VI)
```
OPENAI_API_KEY=...            # server-side only (or ANTHROPIC_API_KEY to use Claude)
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
CLIENT_PRIVATE_KEY=0x...      # C — pays + rates (server-side only)
OWNER_PRIVATE_KEY=0x...       # O — registers agents (T0 script only)
NEXT_PUBLIC_PRIVY_APP_ID=...  # Privy embedded wallets
AGENT_IDS=...                 # comma-separated agentIds from step 6
```
LLM/private keys MUST be server-side only — never in `NEXT_PUBLIC_*` or the client bundle.

## Per-tier run + smoke gate

**T1 — live design generation (no chain)**
- Run: `pnpm dev`. Enter a brief → submit.
- Smoke (`/browse` + `/qa`): 4 visibly distinct styled previews render in sandboxed iframes;
  force one generation to fail → its slot shows the styled fallback (no blank). Build passes,
  dev server clean. → `/code-review` → commit.

**T2 — orchestrator + on-chain registry discovery**
- Run: submit a brief → orchestrator lists the on-chain agents with **per-style** reputation
  and streams its hire reasoning, then the selected specialist generates.
- Smoke: candidates + reputations are read from chain; the selected agent matches the stated
  reputation criteria for the brief's inferred style. → review → commit.

**T3 — payment (x402 → transfer fallback)**
- Run: accept a design → payment fires C→O.
- Smoke: real payment tx on the explorer; `PaymentPanel` labels the path (x402 vs transfer);
  force x402 to fail → fallback transfer settles and is labeled correctly. → review → commit.

**T4 — reputation write + read**
- Run: after payment → `giveFeedback` from C (tag1=style) → re-read getSummary.
- Smoke: real `NewFeedback`/feedback tx on the explorer by a non-owner caller; displayed
  reputation ticks up; clickable explorer link. → review → commit.

**T5 — polish + live explorer**
- Run: full flow; ExplorerPanel updates live with REAL hashes; reputation animates ("job #N").
- Smoke: explorer panel reflects payment + feedback txs without manual refresh; record the
  backup capture; push public repo; txs reachable on the explorer. → review → commit.
- (Stretch, only if green + time: DesignArena.sol audience voting via Monad Foundry.)

## Demo (90s, legibility-first)
Ugly page → type brief → orchestrator: "HIRING DarkModeAgent ★4.8 — best dark-mode specialist
(23 paid jobs)" → page builds live → "PAID 0.01 USDC ✓ [real tx]" → "★4.8 → ★4.9, job #24
[real tx]". Lead with autonomy + real clickable hashes (unlike mock feeds).
