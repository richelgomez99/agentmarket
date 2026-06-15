# Plan — AGNTM-1 (CLN-1): Cleanverse Monad config constants

**Goal:** Single source of truth for the validated Monad contract addresses so no address is hardcoded ad hoc. Satisfies the config foundation for FR-001 (the service reads `AUSDC_MONAD`).

**Files to touch:**
- `app/lib/cleanverse.ts` (append exported consts only)

**Approach:**
1. In `app/lib/cleanverse.ts`, add exported, typed string consts (place them near `CV_CHAIN`, after the `cvConfigured`/encrypt block or just below `CV_CHAIN`):
   - `export const AUSDC_MONAD = "0xaC0893567D43C3E7e6e35a72803df05416C1f20D";`
   - `export const APASS_MONAD = "0xbA82D189540CaC9DC6FF46B6837CaC1BFdEC58B9";`
   - `export const ACCESSCORE_MONAD = "0x8F118338a1fa41E7Fa86Be19A4e8B99Ed58A6EcC";`
   - `export const USDC_MONAD = "0x534b2f3A21130d7a60830c2Df862319e593943A3";`
2. `CV_CHAIN` already exists — do NOT redefine it.
3. Pure additive change: no edits to existing functions, no behavior change.

**Acceptance:**
- Consts exported and typed; no behavior change.
- Test gate: `cd app && npx tsc --noEmit` clean + `npm run build` succeeds before marking done.

**Guardrails:**
- Server-side file only (no client import path changes).
- Zero-regression: purely additive, nothing runs differently with `CLEANVERSE_*` unset.
- Scope fence: addresses only; no aUSDC settlement, no payment logic.
