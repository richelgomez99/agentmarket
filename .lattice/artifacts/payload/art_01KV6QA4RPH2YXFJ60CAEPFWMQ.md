# Plan Review: AGNTM-1 — Cleanverse Monad config constants

### 1. Verdict

**PASS** — with two issues the implementer must resolve at code time (a real
source-of-truth duplication and an unstated typing convention). The task is
small, fully specified, and trivially verifiable; the gaps below are advisory,
not blocking, so I am not bouncing this back to `in_planning`.

### 2. Summary

Reviewed the AGNTM-1 plan against the task description, `SPEC.md` §3 (the
live-validated address table), and the current `app/lib/cleanverse.ts` /
`app/lib/chain.ts`. The intent is correct and low-risk — four typed address
exports plus a `CV_CHAIN` that already exists — and the acceptance bar (typed
exports, `tsc --noEmit` clean, no behavior change) is easily met for additive,
unreferenced constants. The key concern is that the plan is a verbatim restatement
of the task and silently steps on an existing `USDC` constant of the identical
address in `chain.ts`, which directly undercuts the task's own "single source of
truth" framing.

### 3. Issues

**[MAJOR] Plan body — `USDC_MONAD` duplicates the existing `USDC` constant in `chain.ts`**
`app/lib/chain.ts:23` already exports `USDC = "0x534b2f3A21130d7a60830c2Df862319e593943A3" as Address` — byte-for-byte the same address this task asks to re-export as `USDC_MONAD` in `cleanverse.ts`. Defining it a second time creates two sources of truth for the same on-chain token, which is the exact failure mode the task title ("single source of truth") and the constitution's pinned-facts principle are trying to prevent. If one is ever edited, they silently drift. The plan does not acknowledge the existing constant or decide how to reconcile.
**Recommendation:** Decide explicitly and state it in the plan. Preferred: in `cleanverse.ts` re-export the canonical value rather than re-literal it — `export { USDC as USDC_MONAD } from "./chain";` (or `import { USDC } from "./chain"; export const USDC_MONAD = USDC;`). This keeps `chain.ts` as the origin-token authority while giving the Cleanverse module the name SPEC §3 / FR-001 use. If a fresh literal is intentional, justify why and add a comment cross-referencing `chain.ts` so the duplication is deliberate and discoverable.

**[MINOR] Acceptance "typed exports" — typing convention is unspecified**
The task requires "typed exports" but the plan does not say what the type is. The established codebase convention (`chain.ts:21-23`, `x402.ts`) is viem's `as Address` for 0x addresses and `as const` for scalars like `CHAIN_ID`. Leaving this to chance risks a plain `string` (under-typed) or an inconsistent annotation.
**Recommendation:** Specify in the plan: import `type Address` from `viem` and annotate all four address constants `as Address`, matching `chain.ts`. `as Address` also gives `tsc` a compile-time check that each literal is well-formed `0x…` hex, which directly supports AC "tsc clean."

**[MINOR] Plan body — "CV_CHAIN exists" is stated but its implication isn't**
`CV_CHAIN` is already exported at `app/lib/cleanverse.ts:13` (`process.env.CLEANVERSE_CHAIN || "monad"`). The plan repeats "CV_CHAIN exists" without saying that this means **no work** is required there — only a confirmation. A reader could mis-read it as an instruction to add it (and risk a duplicate-export `tsc` error).
**Recommendation:** State plainly: "`CV_CHAIN` already exists in `cleanverse.ts` — verify and leave unchanged; do not re-declare." Add the four address consts adjacent to it.

**[MINOR] Plan body — no file-level step or placement detail**
The plan is an exact copy of the task description; it names the target file but gives no concrete edit (where in the file, import additions, ordering). For a task this small that is tolerable, but a one-line "add a `// ── Cleanverse Monad contracts (SPEC §3) ──` block near `CV_CHAIN`" removes ambiguity and keeps the module self-documenting.
**Recommendation:** Add a single sentence locating the new block and citing SPEC §3 as the address provenance (the SPEC explicitly says "do not re-derive").

### 4. Positive Observations

- **Correct, low-risk scope.** Additive, unreferenced constants are inherently "no behavior change," so AC-3-style regression risk is essentially nil and the acceptance criteria are genuinely testable (`tsc --noEmit`, build succeeds).
- **Addresses are grounded in a validated source.** All four values match SPEC §3's live-validated Monad table exactly, and `USDC_MONAD` matches both the constitution's pinned USDC fact and the existing `chain.ts` value — the data is right, only the wiring needs a decision.
- **Right foundational sequencing.** This is the `CLN-1` config that the C1 SPEC (FR-001, §7 "Atoken + chain are server constants from CLN-1 config") depends on; landing typed address constants first is the correct dependency order for the Cleanverse track.
