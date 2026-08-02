# Plan Review: AGNTM-4 (CLN-4) — Agent.verification type + progressive client merge

### 1. Verdict

**PASS**

The plan is complete, feasible, and aligned for its scope (FR-005/FR-006). It can proceed to implementation. The issues below are coordination/robustness refinements that should be folded in during implementation — none of them block the plan or invalidate its approach.

> Note on what was reviewed: the "Plan" embedded in the prompt is a verbatim copy of the task description, but a detailed plan exists on disk at `plans/task_01KV6P4RK7FWE92H9F2CX5845W.md`. I reviewed that detailed plan, cross-checked against the live code (`app/lib/types.ts`, `app/app/page.tsx`), the SPEC (`.specify/cleanverse-c1/SPEC.md`), and the sibling ticket plans (AGNTM-1/2/3).

### 2. Summary

I reviewed the AGNTM-4 plan against the current `page.tsx`/`types.ts`, the C1 SPEC, and the plans for AGNTM-1/2/3. The plan is tightly scoped, correctly fire-and-forget/off-critical-path, and well-coordinated with its siblings (it intentionally defers the `AgentVerification` declaration to AGNTM-2 and the badge UI to AGNTM-5). The one substantive concern is that the merge-only approach **discards the route's `available` flag**, which the SPEC's three-state badge (specifically distinguishing "Checking" from "Hidden") will need in AGNTM-5 — cheaper to capture that signal now than to retrofit AGNTM-4's state later.

### 3. Issues

**[MAJOR] Approach §2 / state shape — the `available` flag is dropped, but the SPEC's badge states depend on it**
The plan treats `available === false` (and fetch errors) as a pure no-op: agents simply never receive a `verification` field. The problem: per AGNTM-2, `verifyAddresses` returns a result for *every* requested address (verified / unverified / unavailable), so once a configured fetch resolves, no candidate is left with `verification === undefined`. That means `verification === undefined` collapses two distinct SPEC states into one — "Cleanverse is configured and the check is still in flight" (SPEC §8 → **Checking**) and "Cleanverse is unconfigured/unavailable" (SPEC §8 → **Hidden**). AGNTM-5 (the badge) cannot tell these apart from the merged state this plan produces, because the `available` boolean is thrown away. Catching this at AGNTM-4 is cheap; discovering it mid-AGNTM-5 forces a retrofit of AGNTM-4's state.
**Recommendation:** Capture the route's `available` flag in client state (e.g. a `verifyAvailable: boolean` or a small `verifyStatus: "pending" | "available" | "unavailable"` state) and set it in the merge helper alongside `setCandidates`. Document in the plan that AGNTM-5 derives "Checking" from `verification === undefined && verifyAvailable`. Add this to AGNTM-4's scope explicitly so it isn't lost as "AGNTM-5's problem."

**[MAJOR] Files-to-touch / dependency — the real compile-time dependency is AGNTM-2 (CLN-2), not the stated CLN-3**
The task says "Depends on CLN-3," but the type reference `Agent.verification?: AgentVerification` won't compile unless `AgentVerification` exists, which AGNTM-2/CLN-2 declares (pulled forward). The runtime fetch needs the route (CLN-3). So AGNTM-4 actually has two upstreams. This is transitively safe today (CLN-3's route imports `verifyAddresses` from CLN-2, so CLN-3 cannot land without CLN-2), but the dependency declaration is misleading and would break if the sequencing ever changed or CLN-2's scope shifted.
**Recommendation:** Make the dual dependency explicit in the plan ("type from AGNTM-2/CLN-2, route from AGNTM-3/CLN-3"). The two sequencing notes (AGNTM-2 ↔ AGNTM-4) are consistent and well-written — keep them; just add CLN-2 to the stated dependency list so a delegator running tickets out of order doesn't start AGNTM-4 against a missing type.

**[MINOR] Approach §2 — no guard for an empty / missing address list**
`mergeVerification` builds the unique lowercased `payoutAddress` list, but candidates may carry an empty `payoutAddress` (the run-fallback path uses `winner?.payoutAddress ?? ""`), and the idle-rail load may not have populated candidates yet. An empty list yields `?addresses=` and a pointless round-trip.
**Recommendation:** Early-return from the helper when the deduped list is empty, and filter out empty/falsy addresses before joining (the route drops malformed ones anyway, but skipping the call entirely is cleaner).

**[MINOR] Acceptance — no runtime confirmation that the merge actually populates state**
Acceptance is type-check + production build + env-unset no-op. Because AGNTM-4 produces no visible UI (badge is AGNTM-5), there's no step confirming that, with Cleanverse configured, the fetch fires *after* candidates load and the verification map merges in by address. A green `tsc`/build can pass while the merge silently keys on the wrong case or fires before candidates exist.
**Recommendation:** Add a lightweight runtime check to acceptance: with env configured, confirm via network tab / a temporary log that `/api/cleanverse/verify` is called after the candidate list renders and that `candidates[].verification` is populated for known addresses. This also de-risks the lowercase-keying contract between route and client.

### 4. Positive Observations

- **Excellent scope discipline.** The explicit scope fence (type + merge only; NO badge, NO modal/hire line, NO payment blocking, NO settlement) maps cleanly onto FR-005/FR-006 and correctly pushes FR-007/008/009 to AGNTM-5/6. No scope creep.
- **Cross-ticket coordination is a model for the rest of the run.** The reciprocal sequencing notes between AGNTM-2 and AGNTM-4 ("declared HERE, referenced THERE, do not redeclare") prevent the most likely failure mode — a duplicate `AgentVerification` declaration causing a `tsc` error.
- **Correct concurrency instinct.** Using the functional `setCandidates(prev => prev.map(...))` updater keyed by lowercased address makes the merge idempotent and immune to the run-supersession races that the rest of `page.tsx` manages with `runId`. A merge resolving after a new run starts harmlessly re-applies the same identity-keyed data — so the plan's omission of `runId` guards here is correct, not a gap.
- **Faithful to the constitution and SPEC.** Progressive enhancement off the critical path, zero-regression on env-unset, server-side-only keys, honesty guardrail ("never synthesize a `verified` state client-side"), and the per-tier test gate (`tsc --noEmit` + build) are all present and correctly stated.
- **Anchored to real code.** Citing the exact merge sites (idle-rail `.then` ~line 159, orchestrate "open" ~line 451) shows the plan was written against the actual `page.tsx`, not in the abstract — and both are genuinely the only two places `candidates` is set from upstream data.
