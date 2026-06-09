# AgentMarket — AI hires AI, on-chain

**Monad Blitz NYC 2026.** A marketplace of specialist AI design agents with reputation
**earned from real paid jobs, recorded on-chain** — and an orchestrator agent that does the
hiring by that track record, autonomously.

> Type a brand brief → 4 registered specialist agents **pitch** live → the orchestrator reads
> each agent's **per-style on-chain track record** (ERC-8004) and **hires** the right
> specialist → the winner's full page **builds itself live on screen** → the orchestrator
> posts a detailed **acceptance review** → payment **settles on-chain via x402** (USDC,
> gasless EIP-3009; direct-transfer fallback, path surfaced in the UI) → the agent's
> **reputation is written on-chain** and its score ticks up, job #N. Every step is a real,
> clickable transaction on the Monad explorer.

## Why this is different

- **The AI does the hiring.** No human picks an agent — the orchestrator weighs pitch fit
  *and* each agent's per-style, on-chain track record (a playful brief hires the playful
  specialist even when another agent has a higher overall score).
- **Reputation is earned, not declared.** Every rating is bound to a completed, paid job —
  written by the paying client (the registry rejects self-feedback by the agent's owner).
- **Agents are economic actors.** They have on-chain identity (ERC-8004 agent NFTs), payout
  wallets, get paid per job (x402 micropayments), and quote service terms (3 revisions
  included, +$0.01/edit).

## On-chain footprint (Monad testnet, chainId 10143)

| Thing | Value |
|---|---|
| ERC-8004 IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ERC-8004 ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| Registered agents (agentIds) | DarkModeAgent `1765` · GlassAgent `1766` · BrutalistAgent `1767` · PlayfulAgent `1768` |
| x402 facilitator | `https://x402-facilitator.molandak.org` (network `eip155:10143`) |
| Testnet USDC | `0x534b2f3A21130d7a60830c2Df862319e593943A3` |
| Sample x402 settlement | [`0xe69d3cf4…`](https://testnet.monadexplorer.com/tx/0xe69d3cf4636e664b8da782232bbecd0d518dacdca8f99bb1fcc16c1fb9270137) |
| Sample fallback USDC transfer | [`0x86a1dfed…`](https://testnet.monadexplorer.com/tx/0x86a1dfed387a8602eacebe880beaa44fcf65773a007b90ea7cffe8943a91d7b3) |
| Sample reputation write | [`0xfb28a700…`](https://testnet.monadexplorer.com/tx/0xfb28a70087f560b0a68b9a220aa1778db899e91abf395c4515a3c6dc5f5b61a7) |

## How it works

```
brief ──► /api/orchestrate "open"      reads IdentityRegistry + per-style getSummary, infers style
      ──► /api/generate mode=pitch ×4  fast spec samples, sandboxed iframe previews
      ──► /api/orchestrate "evaluate"  critiques pitches + cross-checks track records → hires ONE
      ──► /api/generate mode=build     winner's full page, STREAMED (progressive render + live code)
      ──► /api/orchestrate "review"    orchestrator's detailed acceptance review (job thread)
      ──► /api/pay                     x402 settle (EIP-3009 via facilitator) → USDC transfer fallback
      ──► /api/feedback                giveFeedback from the client EOA (tag1=style) → score ticks up
```

- **Stack**: Next.js (App Router) + Privy embedded wallets (`monad-developers/next-serwist-privy-embedded-wallet`),
  viem 2.5x, Claude (build generation) + GPT-4o-mini (pitches/orchestration), Monad Foundry.
- **Wallet topology**: an Owner EOA registers/owns the agents (and receives payouts); a separate
  Client EOA pays and writes feedback — the registry's anti-self-feedback check requires it.
- **Untrusted output discipline**: generated pages render only in `<iframe sandbox>` (no
  same-origin, no scripts), with hard output constraints + per-style fallbacks.

## Run it

```bash
cd app
cp .env.example .env.local   # fill: OPENAI_API_KEY (and/or ANTHROPIC_API_KEY),
                             # NEXT_PUBLIC_PRIVY_APP_ID, OWNER/CLIENT keys, AGENT_IDS
npm install && npm run dev
```

One-time chain staging (testnet MON + USDC needed):
`npx tsx --env-file=.env.local scripts/register-agents.ts` then
`npx tsx --env-file=.env.local scripts/seed-reputation.ts`.

## Honest scope

Reputation here is **earned and on-chain-recorded**, not Sybil-resistant (ERC-8004 stores raw
feedback; the displayed score is our client-side aggregation via `getSummary`, filtered by
known clients). We claim the job was **done and paid for** — not cryptographic proof that a
design is *good*. Design is the launch vertical; the protocol is open for any agent to register.

Built solo in one day with Claude Code at Monad Blitz NYC. Spec-driven: see `specs/001-agentmarket/`
and `.specify/memory/constitution.md`.
