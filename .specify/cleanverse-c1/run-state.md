# RUN-STATE — Cleanverse C1 Orchestration

Phase-2 handoff for the Phase-3 Orchestrator. Read this + `SPEC.md` + `BUILDPLAN.md` before dispatching.

## Run configuration
- **Feature:** Cleanverse C1 — Verified Agent Identity (Track 02)
- **Canonical tree:** `~/agentmarket-live` (operator-confirmed). The original `…/Agents Marketplace` is retired/stale.
- **Branch:** `cleanverse` (pushed to `origin/cleanverse`)
- **Base for ticket worktrees:** `origin/cleanverse` @ `f0e3813` (+ this Phase-2 planning commit)
- **Lattice:** initialized in the canonical tree (`.lattice/`, project key `AGNTM`)
- **Spec bundle:** `.specify/cleanverse-c1/{SPEC.md, run-state.md, VALIDATION.md}` + root `BUILDPLAN.md`

## Ticket map (CLN label → Lattice ID)
| CLN | Lattice | Title | Complexity | Depends on |
|-----|---------|-------|-----------|-----------|
| CLN-1 | **AGNTM-1** | Cleanverse Monad config constants | low | — |
| CLN-2 | **AGNTM-2** | Verification service (verifyAddresses) | med | AGNTM-1 |
| CLN-3 | **AGNTM-3** | verify API route | low | AGNTM-2 |
| CLN-4 | **AGNTM-4** | Agent.verification type + client merge | med | AGNTM-3 |
| CLN-5 | **AGNTM-5** | VerifiedBadge + card integration | med | AGNTM-4 |
| CLN-6 | **AGNTM-6** | Modal row + Hiring-Agent line | med | AGNTM-4 |
| CLN-7 | **AGNTM-7** | Degradation parity + e2e validation [GATE] | low | AGNTM-5, AGNTM-6 |

## Dispatch sequence
1. **Serial chain:** AGNTM-1 → AGNTM-2 → AGNTM-3 → AGNTM-4 (single impl actor; each is a small, dependent step on shared files `lib/cleanverse.ts`, `lib/types.ts`, `page.tsx`).
2. **Parallel fan-out:** once AGNTM-4 is `done`, dispatch **AGNTM-5 ∥ AGNTM-6** (distinct files: VerifiedBadge/Card vs Modal/page-hire-line — low conflict; if both touch `page.tsx` for the merge vs hire-line, sequence those two edits or use worktrees).
3. **Gate:** AGNTM-7 last, after 5 & 6 are `done`. Runs `VALIDATION.md`. No feature code.

## Actor IDs
- Planner: `agent:cln-planner` · Impl (chain + route): `agent:cln-impl` · UI impl: `agent:cln-impl-ui` · Reviewer: `agent:cln-reviewer` · Validator: `agent:cln-validate`
- (Phase-1/2 authored by `agent:claude-opus-4-architect`.)

## Guardrails (carry into every ticket prompt)
- **Secrets:** `CLEANVERSE_API_KEY` only in gitignored `app/.env.local`; never commit it or the docs PDF (`specs/Cleanverse*.pdf` is gitignored). All Cleanverse calls server-side.
- **Zero-regression (G5):** with `CLEANVERSE_*` unset the app must behave exactly like `001-agentmarket`. Cleanverse is progressive enhancement, never on the critical path.
- **Honesty:** a "Verified" badge requires a real `verified:true` from the API.
- **Scope fence:** C1 is check + badge only. NO payment blocking (C3), NO aUSDC settlement (C2).

## Open items (do not block the build)
- **OQ-1** — exact *verified* response shape from `/verify_apass` is unobserved; AGNTM-2 centralizes the mapper so it's a one-function change once an A-Pass exists. Operator is testing `/generate_apass` in parallel.
- **OQ-2** — integration role (Issue Member vs Service Partner) → onboarding path (in-app vs magic link). Out of C1 scope.
- **OQ-3** — agents may share one payout wallet → identical badge for all; demo variety needs distinct wallets (out of scope).
