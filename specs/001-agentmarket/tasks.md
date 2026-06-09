# Tasks: AgentMarket

**Feature**: `001-agentmarket` | **Input**: spec.md, plan.md, research.md, data-model.md,
contracts/, quickstart.md

**Organization**: by the demo tier ladder (Constitution I). Tiers map to spec user stories.
Each tier ENDS with a green-checkpoint task (build + dev server clean + smoke via gstack
`/browse`+`/qa` + `/code-review` + git commit) and **no tier N+1 task may start until tier N's
checkpoint is committed.** `[P]` = parallelizable (different files, no incomplete deps).

**Paths** are relative to repo root; the Next.js app lives in `app/` (see plan.md structure).

**MVP = Tier 1 (US1)** — a complete standalone demo with zero chain dependency.

---

## Phase 0 — T0 Environment & Staging (setup, no story label)

Pre-done before the live demo. Prefer MONSKILLS (`/monskill`) for faucet/deploy/indexing.

- [x] T001 Install Monad Foundry fork (`curl -L https://foundry.category.xyz | bash`); verify `forge --version` and `cast --version` resolve (NOT standard Foundry)
- [x] T002 Scaffold the web app from `monad-developers/next-serwist-privy-embedded-wallet` into `app/` (Next.js App Router + TS + Tailwind + Privy)
- [x] T003 Install deps in `app/`: `viem@^2.40`, `openai`, `@x402/core @x402/evm @x402/fetch @x402/next` (`@x402/evm >=2.2.0`); confirm build runs
- [x] T004 Create `app/.env.example` documenting OPENAI_API_KEY, MONAD_RPC_URL, CLIENT_PRIVATE_KEY, OWNER_PRIVATE_KEY, NEXT_PUBLIC_PRIVY_APP_ID, AGENT_IDS; confirm `.env*` is gitignored (Constitution VI)
- [x] T005 Configure Privy + Monad testnet (chainId 10143, RPC) in `app/app/layout.tsx`; app boots with embedded-wallet login
- [x] T006 Generate two EOAs via `cast wallet new` — OWNER (O) and CLIENT (C), C≠O; fund O (a little MON) and C (MON) from the MetaMask treasury; store keys in `.env.local` only
- [x] T007 Get testnet USDC to CLIENT (C) via `faucet.circle.com` (select Monad Testnet)
- [x] T008 Confirm live ERC-8004 ABIs + addresses on the explorer (testnet singletons, NOT the docs-page mainnet set) per `contracts/erc8004-abis.md` (Constitution III)
- [x] T009 Write `app/scripts/register-agents.ts`: from OWNER (O), `register(agentURI)` for 4 agents (one per style; agent-card payout = O); save returned agentIds to `AGENT_IDS`
- [x] T010 Run T009 to pre-register the 4 agents on IdentityRegistry; verify each agentId + Registered event on the explorer
- [x] T010a Seed differentiated on-chain reputation: from the **CLIENT EOA** (≠ owner), write several `giveFeedback(agentId, value, valueDecimals, tag1=<style>, tag2="agentmarket", ...)` per agent in `app/scripts/seed-reputation.ts` so each agent has a real, varied **per-style** track record at demo time (e.g. DarkModeAgent strong at dark-mode); verify NewFeedback events + non-zero `getSummary` on the explorer. (Makes FR-008/FR-009a demoable — agents show "★4.8, 23 jobs" not zeros — and de-risks the T4 write path early.)
- [x] T011 [P] Stage the 4 style system prompts (dark-mode-premium, glassmorphism, brutalist, playful) in `app/lib/styles.ts` with hard output constraints (complete `<!DOCTYPE html>`, inline `<style>`, no JS, no external URLs, no fences)
- [x] T012 [P] Stage one hard-coded fallback HTML per style in `app/lib/styles.ts` (renders if a generation call fails/times out)
- [x] T013 [P] Define shared types in `app/lib/types.ts` (Style, Reputation, Agent, DesignOutput, Payment) per `contracts/ui-components.md`
- [x] **T014 — T0 CHECKPOINT**: app builds + `pnpm dev` starts clean; agents registered AND seeded with differentiated per-style reputation on-chain (explorer-verified, non-zero getSummary); wallets funded; `/code-review`; git commit

---

## Phase 1 — T1 Live Design Generation, NO chain (US1, P1) 🎯 MVP

**Goal**: brief → 4 distinct styled designs render live in sandboxed iframes, with per-style
fallback. **Independent test**: type a brief → 4 distinct previews render; force one to fail →
its slot shows a styled fallback (no blank). Zero chain dependency.

- [x] T015 [P] [US1] Provider adapter in `app/lib/llm.ts` (OpenAI default; uses Anthropic if `ANTHROPIC_API_KEY` set); server-side only
- [x] T016 [P] [US1] HTML guard in `app/lib/htmlGuard.ts` (strip markdown fences, validate complete self-contained doc, reject external URLs/scripts)
- [x] T017 [US1] `POST /api/generate` route in `app/app/api/generate/route.ts` with `mode: "pitch"|"build"`: pitch = small/fast spec sample (JSON); build = full page **streamed** (chunked HTML for progressive iframe render + code strip); timeouts ~15s/~45s; on fail/invalid → fallback HTML `status:"fallback"`; never error-blank (per `contracts/api-routes.md`)
- [x] T018 [P] [US1] Integrate design-handoff components (from `specs/001-agentmarket/design/project/AgentMarket.tsx`): split `BriefInput`, `DesignPreviewGrid` (+ shared helpers) into `app/app/components/`, swap PREVIEW SHIMs for real react/lucide-react imports
- [x] T019 [US1] Elevate the build moment in `DesignPreviewGrid`/page: progressive `srcDoc` re-render (~400ms) while build streams, live code strip beside the featured build, build elapsed timer; idle state shows the "ugly before" page (not empty placeholders)
- [x] T020 [US1] Wire `app/app/page.tsx` (replace DemoHarness mocks): submit → 4 pitch calls concurrently → pitch grid fills live → (T1 stub: auto-pick style locally) → build-mode stream into featured render
- [x] T021 [US1] Verify hard-fail paths: forced pitch failure → styled fallback in slot; forced build-stream failure → fallback full page; others unaffected (SC-002)
- [x] **T022 — T1 CHECKPOINT**: build + dev-clean; `/browse`+`/qa` smoke (4 distinct previews render; forced-fail shows fallback) passes; `/code-review`; git commit. **This is a complete demo.**

---

## Phase 2 — T2 Orchestrator + On-Chain Registry Discovery (US2, P2)

**Goal**: orchestrator reads on-chain agents + per-style reputation, hires the right specialist
for the brief (FR-009a), streams reasoning, then the hired agent generates.
**Independent test**: submit a brief → candidates + reputations read from chain; reasoning
streams; selection matches stated per-style criteria.

- [x] T023 [US2] `app/lib/chain.ts`: viem clients for Monad testnet + pinned ERC-8004 ABIs/addresses from `contracts/erc8004-abis.md` (do not refetch)
- [x] T024 [US2] `app/lib/registry.ts`: read registered agents (AGENT_IDS) + agent cards; `getSummary(agentId,[CLIENT_EOA],style,"")` per-style reputation (non-empty clientAddresses); aggregate to {count, score}
- [x] T025 [US2] `POST /api/orchestrate` in `app/app/api/orchestrate/route.ts`, two stages per contract: "open" (read agents + per-style getSummary, infer style, stream intro, return candidates) and "evaluate" (score pitch fit + track records, stream judgment, return {criteria, selectedAgentId}); deterministic tie-break (FR-009a)
- [x] T026 [P] [US2] Integrate `AgentCandidateCard` + `OrchestratorReasoning` from the design handoff into `app/app/components/` (per-style ★score, HIRED state, streaming reasoning + hire banner)
- [x] T027 [P] [US2] (merged into T026 — design handoff provides both components)
- [x] T028 [US2] Wire `app/app/page.tsx`: submit → orchestrate "open" (candidates+style) → 4 pitches → orchestrate "evaluate" (stream judgment → HIRE moment) → winner's build-mode stream (replaces T1's local auto-pick stub)
- [x] **T029 — T2 CHECKPOINT**: build + dev-clean; smoke (candidates+reputation read from chain; selection matches criteria, SC-003/SC-004); `/code-review`; git commit

---

## Phase 3 — T3 On-Chain Payment (US3, P3)

**Goal**: pay the hired agent on-chain, x402-first with USDC/MON transfer fallback (C→O); UI
shows the path + real explorer link. **Independent test**: accept a design → real payment tx;
path labeled; force x402 fail → fallback settles + labeled.

- [x] T030 [US3] `app/lib/x402.ts`: x402 client/settle (facilitator, eip155:10143, USDC, exact scheme) from CLIENT EOA; detect settle failure/unreachable
- [x] T031 [US3] Transfer fallback in `app/lib/x402.ts` (or `lib/chain.ts`): viem USDC `transfer` (or MON transfer) C→O on x402 failure
- [x] T032 [US3] `POST /api/pay` in `app/app/api/pay/route.ts`: x402 first → fallback; return {path, txHash, explorerUrl, status} with the real settled path (Constitution IV; per `contracts/api-routes.md`)
- [x] T033 [P] [US3] `PaymentPanel` in `app/components/PaymentPanel.tsx`: amount, path used (x402 vs transfer), status, clickable real explorer link
- [x] T034 [US3] Wire `app/app/page.tsx`: on accept → `/api/pay` → PaymentPanel; verify forced-x402-fail path labels fallback correctly (SC-005)
- [x] **T035 — T3 CHECKPOINT**: build + dev-clean; smoke (real payment tx on explorer; path labeled; fallback works); `/code-review`; git commit

---

## Phase 4 — T4 On-Chain Reputation Write + Read (US4, P4)

**Goal**: write `giveFeedback` from CLIENT EOA (tag1=style), re-read getSummary, animate the
tick-up. **Independent test**: after payment → real feedback tx by non-owner caller; reputation
updates; clickable explorer link.

- [x] T036 [US4] `POST /api/feedback` in `app/app/api/feedback/route.ts`: `giveFeedback(agentId,100,0,tag1=style,tag2="agentmarket","","",0x0)` from CLIENT EOA (≠ OWNER — else reverts); then re-read `getSummary(agentId,[CLIENT_EOA],style,"")`; return {txHash, explorerUrl, reputation}
- [x] T037 [P] [US4] `ReputationPanel` in `app/components/ReputationPanel.tsx`: animate score previous→new, "job #N" increment, clickable real explorer link
- [x] T038 [US4] Wire `app/app/page.tsx`: after pay → `/api/feedback` → ReputationPanel reflects updated count+score (SC-006)
- [x] T039 [US4] Verify anti-self-feedback: confirm the write succeeds from C and would revert from O (sanity check, not shipped)
- [x] **T040 — T4 CHECKPOINT**: build + dev-clean; smoke (real feedback tx by non-owner; reputation ticks up; explorer link); `/code-review`; git commit

---

## Phase 5 — T5 Polish, Live Explorer & Proof (US5, P5)

**Goal**: legible live proof + safety net. **Independent test**: explorer panel updates live
with real hashes; reputation animates; backup recording exists; public repo + txs reachable.

- [x] T041 [US5] `ExplorerPanel` in `app/components/ExplorerPanel.tsx`: live feed of REAL payment+feedback txs with clickable real hashes (the credibility beat — unlike mock feeds)
- [x] T042 [US5] Wire live updates into `app/app/page.tsx` so payment/feedback txs appear without manual refresh (SC-001/SC-007 legibility)
- [x] T043 [P] [US5] Demo polish pass: big legible hire/pay/rate beats, reputation animation timing; run `/design-review` (legibility > beauty). **Honest-claims copy check (FR-021)**: UI/pitch copy claims only "job done + paid for" and "portable on-chain-earned reputation"; NO claims of design-quality proof, populated network, or on-chain Sybil-resistance; reputation labeled as our own aggregation.
- [ ] T044 [P] [US5] Record a backup screen capture of the full working flow (stage safety net, SC-008)
- [x] T045 [P] [US5] Push to public GitHub; confirm contracts/txs reachable on a Monad explorer (Constitution workflow)
- [ ] T046 [US5] Rehearse the 90-second demo 3× against the demo script in quickstart.md
- [ ] T047 [US5] [STRETCH — only if T1–T4 green + time] `contracts/DesignArena.sol` via Monad Foundry: on-chain audience voting → declareWinner; explicitly deferred (Constitution: do not start unless prior tiers committed)
- [ ] **T048 — T5 CHECKPOINT**: build + dev-clean; full-flow smoke; `/code-review`; final git commit + tag

---

## Dependencies & Execution Order

- **T0 (Phase 0)** blocks everything (env, wallets, registered agents, staged prompts).
- **T1 (US1)** depends only on T0 → MVP, fully demoable alone.
- **T2 (US2)** depends on T1 (reuses the generation flow) + T0 chain setup.
- **T3 (US3)** depends on T2 (a selected on-chain agent with a payout address).
- **T4 (US4)** depends on T3 (completed payment) + T2 (on-chain identities).
- **T5 (US5)** depends on T1–T4 working end-to-end.
- **Hard rule (Constitution I)**: do not start a tier until the prior tier's CHECKPOINT task is committed.

## Parallel Opportunities

- T0: T011, T012, T013 in parallel.
- T1: T015, T016 in parallel; T018, T019 in parallel (distinct files).
- T2: T026, T027 in parallel. T3: T033 parallel with route work. T4: T037 parallel.
- T5: T043, T044, T045 in parallel.
- The 4 style prompts/fallbacks (within T011/T012) are independent and parallelizable.

## Suggested MVP scope

**Tier 1 (US1) only** — type a brief → 4 distinct styled designs render live with fallback.
A complete, winning-on-its-own demo with zero chain risk. Everything above it is upside.

---

**Task count**: 49 total — T0: 15 (T001–T014 + T010a) · T1/US1: 8 · T2/US2: 7 · T3/US3: 6 ·
T4/US4: 5 · T5/US5: 8. One green-checkpoint task per tier.
