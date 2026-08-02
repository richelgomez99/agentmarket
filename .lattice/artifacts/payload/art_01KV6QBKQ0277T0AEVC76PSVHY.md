# Plan Review: AGNTM-3 — Cleanverse verify API route

### 1. Verdict

**PASS** — Plan is complete, feasible, and aligned. Implementation can proceed.

### 2. Summary

I reviewed the AGNTM-3 plan for the `GET /api/cleanverse/verify` route against the C1 SPEC (FR-003/004/010, §7 API Contract, AC-1), the dependency it builds on (AGNTM-2's `verifyAddresses`/`getWalletVerification`/`mapApassVerdict`), the existing `lib/cleanverse.ts` adapter, and the route conventions in `app/app/api/*/route.ts`. The substantive plan (`plans/task_01KV6P4RG057CGDF4G0AXWM8KR.md`) is correctly scoped, thin in proportion to a "low"-complexity ticket, and consistent with the spec's API contract; it correctly keeps the route a thin shell over the service so the atoken/chain constants and per-address try/catch stay in CLN-2. The only items worth tightening are minor and non-blocking: the response shape on a *total* (non-per-address) failure, and the empty/missing `addresses` edge case.

### 3. Issues

**[MINOR] Approach step 3 — Total-failure response shape is ambiguous vs. the spec contract**
The plan says an unexpected error should return `{ available: true, results: {} }` "(or per-address `unavailable` from the service)". Per FR-004 / SPEC §7, `available:false` means *unconfigured* and `available:true` means *configured*. Returning `available:true, results:{}` after a wholesale throw is defensible (downstream the client merge treats missing addresses as "not checked yet" → Checking), and is better than flipping to `available:false` (which would falsely imply "unconfigured"). But the plan states both options without committing. Note that `verifyAddresses` already wraps each address in try/catch and uses `Promise.all`, so a *whole-call* throw is unlikely in practice (a rejected promise would only occur on a non-per-address bug). This is a clarity nit, not a correctness gap.
**Recommendation:** Commit to one shape: keep `available:true` and return whatever `results` the service produced (per-address `unavailable` is the normal degraded path); reserve a top-level `try/catch` returning `{ available: true, results: {} }` purely as the never-5xx backstop. State this explicitly so the implementer doesn't return `available:false` on a transport failure.

**[MINOR] Edge cases — empty/missing `addresses` param not called out**
The plan handles malformed entries (drop silently) but doesn't mention `?addresses=` empty, missing entirely, or all-malformed. With the configured path this yields `verifyAddresses([])` → `{}` → `{ available: true, results: {} }`, which is safe and non-fatal — but it's an untested boundary that's trivial to get wrong (e.g. `searchParams.get("addresses")` returning `null` and a `.split` throwing).
**Recommendation:** Add one line: guard `null`/empty before split; an empty valid-address set returns `{ available: true, results: {} }` (configured) without any network call.

**[MINOR] Missing — `maxDuration` / runtime budget for fan-out of upstream calls**
The sibling `feedback/route.ts` sets `export const maxDuration = 60`. This route issues one `cvVerifyApass` per *unique* address, each with a 20s `AbortSignal.timeout` (see `cvFetch` in `lib/cleanverse.ts`). They run in parallel via `Promise.all`, so wall-clock is ~20s worst case, but the default function duration could still truncate a slow sandbox response and surface as a failure rather than a clean per-address `unavailable`.
**Recommendation:** Set `export const maxDuration = 30` (or 60) on the route for headroom, matching the existing convention. Non-blocking.

**[NIT] Process — the "Plan" delivered to review was the task description verbatim**
The plan body embedded in the review prompt is a character-for-character copy of the task description, not the richer plan that actually exists on disk (`plans/task_01KV6P4RG057CGDF4G0AXWM8KR.md`). I reviewed the on-disk plan, which is the real artifact and is adequate. Flagging only so the orchestration handoff feeds the detailed plan to reviewers, not the task restatement.

### 4. Positive Observations

- **Correct dependency boundary.** The plan keeps the route a thin shell and delegates dedupe, atoken/chain constants, per-address try/catch, and the OQ-1 verdict mapping to `verifyAddresses`/`getWalletVerification` (AGNTM-2). I verified `verifyAddresses` does not yet exist in `lib/cleanverse.ts` — only `cvVerifyApass` and friends — so gating AGNTM-3 on AGNTM-2 (per `run-state.md` serial chain AGNTM-1→2→3) is correct and the plan does not duplicate that logic.
- **FR-004 honored precisely.** The `!cvConfigured()` → `{ available:false, results:{} }` with **zero network calls** is explicit, and supports the zero-regression guardrail (G5): with `CLEANVERSE_*` unset the route is inert and existing flows are untouched.
- **Scope discipline.** The guardrails section fences off C3 (payment blocking) and C2 (aUSDC settlement) and reaffirms server-side-only / key-never-to-client (FR-010), matching the run-state's scope fence. No scope creep, no premature abstraction.
- **Best-effort / never-5xx** is stated as a first-class requirement, aligned with SPEC §7 ("never 5xx the client into a broken flow") and the progressive-enhancement contract in FR-006.
- **Test gate is concrete and matches house rules** — `cd app && npx tsc --noEmit` clean + `npm run build` before done, consistent with the constitution's per-tier test gate.
- **AC-1 is traceable**: live CLIENT+OWNER → `unverified` + `magickLink` is carried into the Acceptance section and matches the observed sandbox reality documented in the SPEC and VALIDATION.md.
