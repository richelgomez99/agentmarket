# Implementation Plan: AgentMarket

**Branch**: `001-agentmarket` | **Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-agentmarket/spec.md`

**Constitution**: v1.0.1 ([.specify/memory/constitution.md](../../.specify/memory/constitution.md))

## Summary

AgentMarket is an AI orchestrator that reads an on-chain marketplace of specialist design
agents, autonomously hires the best by its on-chain-earned reputation, watches it generate a
UI live, pays it on-chain (x402 → USDC/MON transfer fallback), and writes its reputation
on-chain — the full discover→hire→deliver→pay→rate loop between two AIs, settled on Monad
testnet. Built demo-first in tiers; each tier is independently demoable and committed before
the next. The build optimizes for a legible 90-second demo for a peer-builder audience that is
not deeply web3-savvy: **demo legibility > UI polish > technical depth**. Selection model is
orchestrator-hires (no custom contract in the core path — we only call the pre-deployed
ERC-8004 registries); audience on-chain voting is a deferred T5 stretch.

## Technical Context

**Language/Version**: TypeScript 5.x on Node 20+ (Next.js App Router). Solidity ^0.8.28 only
if the T5 voting stretch is built (Monad Foundry fork).

**Primary Dependencies**: Next.js 14 (App Router) + React 18 + Tailwind, from the
`monad-developers/next-serwist-privy-embedded-wallet` template. Privy embedded wallets
(`@privy-io/react-auth`). `viem` ≥ 2.40 (native Monad testnet). OpenAI SDK (`openai`),
server-side only, behind a thin provider adapter that swaps to Anthropic if
`ANTHROPIC_API_KEY` is present. `@x402/core @x402/evm @x402/fetch @x402/next` (`@x402/evm`
≥ 2.2.0, exact scheme) for payment. Contracts (stretch only) via `monad-developers/foundry-monad`.

**Storage**: None persistent in the core path. Chain is the source of truth (ERC-8004
registries). In-memory/session state for the current job; staged config (agent registry,
prompts, fallback HTML) in repo/env. No database.

**Testing**: Per-tier smoke test (the constitution's gate) is the primary discipline:
production build succeeds + dev server starts clean + the tier's user flow passes, driven via
gstack `/browse` + `/qa` (headless browser). `/code-review` before each tier commit. Light
Vitest unit coverage only where it de-risks (HTML-sanitization/fence-stripping, the payment
path-selection logic, reputation aggregation). No heavy TDD — this is a deadline build.

**Target Platform**: Modern desktop browser (the demo machine + projector). Next.js server
runtime for API routes (LLM calls, x402, chain writes).

**Project Type**: Web application (Next.js full-stack: client UI + server API routes), plus an
optional `contracts/` Foundry project for the T5 voting stretch.

**Performance Goals**: Each design slot resolves (generated or fallback) within ~30s
(SC-001). The full brief→selection→generation→payment→reputation flow demoable within the
90s window (SC-007). Monad's ~400ms blocks make payment + reputation txs land visibly during
narration.

**Constraints**: Pinned facts IMMUTABLE (Constitution III) — chainId 10143, RPC, registry
addresses, no-auth `giveFeedback`, x402 facilitator/USDC. LLM keys server-side only; secrets
env-only. Generated HTML rendered in `<iframe sandbox>` WITHOUT `allow-same-origin`; output
constrained + fence-stripped + timed-out + per-style fallback. Feedback caller (client EOA) ≠
agent owner EOA. `getSummary` requires NON-EMPTY `clientAddresses`. Use the verified testnet
address singletons, never the docs-page mainnet-vanity set.

**Scale/Scope**: 1 user (the demo driver) + a live room. 3–4 specialist agents pre-registered
on-chain. ~7 named UI components. One job at a time. Single fixed micro-price ($0.001–$0.01
USDC). This is a hackathon demo, not a multi-tenant product.

## Constitution Check

*GATE: must pass before Phase 0 and re-checked after Phase 1 design.*

| # | Principle | Plan compliance |
|---|---|---|
| I | Demo-First Tiering | ✅ Plan is structured strictly T0→T5; each tier independently demoable; tasks.md will group by tier; no tier N+1 work until tier N committed. |
| II | Test Gate Per Tier | ✅ Each tier ends with build + dev-server-clean + `/browse`+`/qa` smoke test + `/code-review` + git commit before advancing. |
| III | Pinned Facts (IMMUTABLE) | ✅ All addresses/signatures referenced verbatim from the constitution; ABIs pinned in `contracts/` artifacts; address-set guard honored. |
| IV | Payment Fallback | ✅ x402-first with USDC/MON transfer fallback; UI `PaymentPanel` surfaces the settled path. |
| V | Scope Guard | ✅ Design agents GENERATE self-contained HTML+inline-CSS; rendered in sandboxed iframes; never ingest a codebase. |
| VI | Stack Lock & Secrets | ✅ Privy/Next template + foundry-monad; viem 2.40+; OpenAI server-side only; secrets env-only; `.gitignore` blocks `.env`/keystore. |
| VII | Official-Skills-First | ✅ MONSKILLS used for faucet/contract-deploy/frontend-deploy/indexing; build sheet wins only where skills are silent on ERC-8004/x402. |

**Result: PASS.** No violations. No entries in Complexity Tracking. The orchestrator-hires
model writes NO custom contract in the core path, keeping complexity minimal (Principle I).

## Project Structure

### Documentation (this feature)

```text
specs/001-agentmarket/
├── plan.md              # This file
├── research.md          # Phase 0 output (decisions from the validation pass)
├── data-model.md        # Phase 1 output (entities + on-chain mappings)
├── quickstart.md        # Phase 1 output (env setup + per-tier run/smoke)
├── contracts/           # Phase 1 output (API route contracts + pinned ABIs + UI prop contracts)
│   ├── api-routes.md
│   ├── erc8004-abis.md
│   └── ui-components.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

The web app is scaffolded from the Privy/Next template into `app/` (App Router). Contracts
live in a sibling `contracts/` Foundry project, built only for the T5 voting stretch.

```text
app/                              # Next.js App Router (from next-serwist-privy-embedded-wallet)
├── app/
│   ├── page.tsx                  # main demo screen (composes the 7 components)
│   ├── layout.tsx                # Privy provider, Monad testnet config
│   └── api/
│       ├── generate/route.ts     # T1: style-specific design generation (OpenAI, server-side)
│       ├── orchestrate/route.ts  # T2: read registry + reputation, pick agent, stream reasoning
│       ├── pay/route.ts          # T3: x402-first, USDC/MON transfer fallback
│       └── feedback/route.ts     # T4: giveFeedback (client EOA) + read getSummary
├── components/
│   ├── BriefInput.tsx            # brief entry
│   ├── AgentCandidateCard.tsx    # style + reputation (score, job count) + hired state
│   ├── OrchestratorReasoning.tsx # streaming selection reasoning
│   ├── DesignPreviewGrid.tsx     # sandboxed <iframe> grid + skeleton loaders
│   ├── PaymentPanel.tsx          # path used (x402 vs transfer) + tx link
│   ├── ReputationPanel.tsx       # animated score, "job #N"
│   └── ExplorerPanel.tsx         # live tx feed (T5)
├── lib/
│   ├── llm.ts                    # provider adapter (OpenAI default; Anthropic if key set)
│   ├── styles.ts                 # 3–4 style system prompts + per-style fallback HTML
│   ├── htmlGuard.ts              # strip fences, validate self-contained, enforce iframe-safe
│   ├── chain.ts                  # viem clients, Monad testnet, pinned ERC-8004 ABIs
│   ├── x402.ts                   # x402 client + settle, with fallback detection
│   └── registry.ts               # read agents, getSummary aggregation, NewFeedback indexing
├── scripts/
│   ├── generate-wallets.ts       # T0: derive/import the 2 cast-keystore EOAs (doc only)
│   └── register-agents.ts        # T0: register 3–4 agents on IdentityRegistry (owner EOA)
├── .env.example                  # documents required env (no secrets committed)
└── (template config: next.config, tailwind, serwist, privy)

contracts/                        # OPTIONAL — only if T5 voting stretch is built
└── (monad-developers/foundry-monad: src/DesignArena.sol, script/, test/)
```

**Structure Decision**: Single Next.js full-stack app under `app/` (UI + API routes in one
deployable), matching the locked template and keeping the LLM/x402/chain-write logic
server-side per Constitution VI. Contracts are a separate, deferred Foundry project so the
core path ships with zero custom Solidity. UI is split into the 7 named presentational
components so a separately-designed (e.g. cloud-generated) frontend can drop in by matching
prop contracts (see `contracts/ui-components.md`).

## Complexity Tracking

> No constitutional violations — section intentionally empty.
