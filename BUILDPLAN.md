# BUILDPLAN — Cleanverse C1: Verified Agent Identity

Execution plan for `.specify/cleanverse-c1/SPEC.md`. Branch: `cleanverse`.
Methodology: Lattice (each ticket → plan → impl → review → validate) + Spec-kit.
These tickets are **defined here for Phase 2** to create in Lattice (`lattice create …`). Phase 1 does **not** write implementation code.

**Prefix:** `CLN-` · **Tier:** C1 · **Total:** 7 tickets (6 build + 1 validation gate).

> **Created in Lattice (Phase 2):** CLN-1…7 map 1:1 to **AGNTM-1 … AGNTM-7** (project key `AGNTM`, canonical tree `~/agentmarket-live`, branch `cleanverse`). Dependencies wired. See `.specify/cleanverse-c1/run-state.md` for the dispatch sequence and `VALIDATION.md` for the gate plan.

---

## Dependency graph

```
CLN-1 (config consts)
   └─> CLN-2 (verify service) ──> CLN-3 (API route) ──> CLN-4 (type + client merge) ──┬─> CLN-5 (badge UI)
                                                                                       ├─> CLN-6 (modal + hire line)
                                                                                       └─> CLN-7 (degradation + validation)  [gate]
```
Critical path: CLN-1 → CLN-2 → CLN-3 → CLN-4 → CLN-5/6 (parallel) → CLN-7.
CLN-5 and CLN-6 may run in parallel once CLN-4 lands. CLN-7 is the closing validation gate (runs last).

---

## CLN-1 — Cleanverse Monad config constants
- **Goal:** Single source of truth for the validated Monad contracts so no address is ever hardcoded ad hoc.
- **Scope:** Add exported consts to `app/lib/cleanverse.ts` (or a small `app/lib/cleanverseConfig.ts`): `AUSDC_MONAD = "0xaC0893567D43C3E7e6e35a72803df05416C1f20D"`, `APASS_MONAD = "0xbA82D189540CaC9DC6FF46B6837CaC1BFdEC58B9"`, `ACCESSCORE_MONAD = "0x8F118338a1fa41E7Fa86Be19A4e8B99Ed58A6EcC"`, `USDC_MONAD = "0x534b2f3A21130d7a60830c2Df862319e593943A3"`. `CV_CHAIN` already exists.
- **Files:** `app/lib/cleanverse.ts`.
- **Acceptance:** consts exported + typed; `tsc` clean. No behavior change.
- **Depends on:** —  · **Complexity:** low · **Actor:** `agent:cln-impl`

## CLN-2 — Verification service (`verifyAgents`)
- **Goal:** Normalize `/verify_apass` into the `AgentVerification` shape (FR-001, FR-002).
- **Scope:** Add `getWalletVerification(address): Promise<AgentVerification>` wrapping `cvVerifyApass(address, AUSDC_MONAD, CV_CHAIN)`, plus `verifyAddresses(addresses: string[])` that **dedupes** and resolves a map. Centralize the verdict mapping (the one place OQ-1 changes): outer `code==="0000"` + inner success ⇒ verified; inner `data.code` non-success (e.g. `2`/"apass not exist") ⇒ unverified + `onboardUrl = data.magickLink`; thrown/transport error ⇒ `status:"unavailable"`. Stamp `checkedAt`.
- **Files:** `app/lib/cleanverse.ts` (+ `AgentVerification` import from types once CLN-4 adds it — or define the type here and have CLN-4 re-export; sequence so the type lives in `types.ts`).
- **Tests:** pure unit test of the mapper against the observed unverified JSON (and a synthesized verified JSON per OQ-1 assumption). No live-network test in CI.
- **Acceptance:** mapper returns `unverified`+magickLink for the observed payload; `unavailable` on throw; deduping confirmed.
- **Depends on:** CLN-1 · **Complexity:** med · **Actor:** `agent:cln-impl`

## CLN-3 — Verification API route
- **Goal:** `GET /api/cleanverse/verify?addresses=…` (FR-003, FR-004).
- **Scope:** New route `app/app/api/cleanverse/verify/route.ts` (runtime nodejs). Parse `addresses` (comma-sep, lowercased, validated 0x…). If `!cvConfigured()` → `{ available:false, results:{} }` with zero network calls. Else call `verifyAddresses`, return `{ available:true, results }`. Best-effort: never throw a 5xx that breaks the client; per-address failures already map to `unavailable`.
- **Files:** `app/app/api/cleanverse/verify/route.ts`.
- **Acceptance:** live call with our CLIENT+OWNER addresses returns `unverified`+magickLink (AC-1); unconfigured returns `available:false`; malformed addresses ignored, not fatal.
- **Depends on:** CLN-2 · **Complexity:** low · **Actor:** `agent:cln-impl`

## CLN-4 — Data model + client merge
- **Goal:** `Agent.verification` field + progressive client fetch/merge (FR-005, FR-006).
- **Scope:** Add `AgentVerification` + `Agent.verification?` to `app/lib/types.ts`. In `app/app/page.tsx`, after candidates load (idle rail load AND the orchestrate "open" stage that sets candidates), fire `GET /api/cleanverse/verify?addresses=<unique payoutAddresses>` and merge results into agent state by address. Must not block existing render; tolerate `available:false`.
- **Files:** `app/lib/types.ts`, `app/app/page.tsx`.
- **Acceptance:** agents carry `verification` after load; removing env → no fetch error, agents simply lack the field; no change to hire/build/pay timing.
- **Depends on:** CLN-3 · **Complexity:** med · **Actor:** `agent:cln-impl`

## CLN-5 — VerifiedBadge component + card integration
- **Goal:** Three-state badge on agent cards (FR-007, §8).
- **Scope:** New `app/app/components/VerifiedBadge.tsx` (Verified / Unverified / Checking / hidden). Integrate into `app/app/components/AgentCandidateCard.tsx` at top-left, not colliding with HIRED (top-right) or the REVIEWS hover chip. Use existing lucide icons (`BadgeCheck`, `ShieldAlert`/`ShieldCheck`) + Tailwind tokens already in the theme.
- **Files:** `app/app/components/VerifiedBadge.tsx`, `app/app/components/AgentCandidateCard.tsx`.
- **Acceptance:** each state renders correctly driven by `agent.verification`; "Verified" only on real `verified:true`; layout unaffected when hidden (AC-2, AC-3 visual parity).
- **Depends on:** CLN-4 · **Complexity:** med · **Actor:** `agent:cln-impl-ui` · **Parallel with CLN-6**

## CLN-6 — Modal verification row + Hiring-Agent line
- **Goal:** Detail surfacing (FR-008) + non-blocking narrative (FR-009).
- **Scope:** In `app/app/components/AgentReviewsModal.tsx` add a "VERIFIED IDENTITY (A-PASS)" row (status + verified address; magic-link button when unverified, opening `onboardUrl`). In `app/app/page.tsx`, on hire emit exactly one Hiring-Agent comms line stating the winner's verification status (e.g. "Counterparty A-Pass: ✓ verified" / "✗ unverified — KYC pending"); MUST NOT alter winner or payment.
- **Files:** `app/app/components/AgentReviewsModal.tsx`, `app/app/page.tsx`.
- **Acceptance:** modal shows status + working magic link for unverified; exactly one hire-time line; selection/payment unchanged (AC-4, AC-5).
- **Depends on:** CLN-4 · **Complexity:** med · **Actor:** `agent:cln-impl-ui` · **Parallel with CLN-5**

## CLN-7 — Degradation parity + end-to-end validation [GATE]
- **Goal:** Prove zero-regression (G5, AC-3) and validate the live path (AC-1, AC-6).
- **Scope:** No new feature code. (a) Verify with `CLEANVERSE_*` unset: build + full hire→build→pay→rate loop runs, no badges, no console errors. (b) With env set: live `/api/cleanverse/verify` returns expected `unverified`+magickLink; badges + modal + hire line render. (c) `tsc --noEmit` clean; `npm run build` succeeds. Record evidence (`lattice attach --role validation`).
- **Files:** none (validation); optional `app/scripts/cv-verify-smoke.mjs`.
- **Acceptance:** AC-1, AC-3, AC-6 all demonstrated with recorded evidence.
- **Depends on:** CLN-5, CLN-6 · **Complexity:** low · **Actor:** `agent:cln-validate`

---

## Notes for the Orchestrator (Phase 2/3)
- **Secrets:** `CLEANVERSE_API_KEY` lives only in gitignored `app/.env.local`; never commit it or the docs PDF. All Cleanverse calls stay server-side.
- **Honesty principle (constitution):** badges must reflect the real API verdict — no "Verified" without `verified:true`.
- **Shared-wallet caveat (EC-3):** if all agents share one payout wallet, all show identical status; demo variety would need distinct wallets (out of C1 scope — see SPEC OQ-3).
- **OQ-1 is the one real unknown:** the verified-response shape. CLN-2 centralizes the mapper so confirming it is a one-function change once an A-Pass is minted.
- **Suggested sequencing:** CLN-1→2→3→4 serial (single impl agent), then CLN-5 ∥ CLN-6 (two UI agents), then CLN-7 gate.
