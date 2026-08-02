# Code Review: AGNTM-4 — Agent.verification type + progressive client merge

### 1. Verdict

**PASS** — Implementation is correct and meets the acceptance criteria.

### 2. Summary

Reviewed the addition of `AgentVerification` + `Agent.verification?` to `app/lib/types.ts`, the fire-and-forget progressive merge in `app/app/page.tsx` (both at the idle-rail mount and after the orchestrate-open stage), and a small test-decoupling refactor in `cleanverse.mapApassVerdict.test.ts`. The implementation is clean, idiomatic to the existing file, and faithfully honors the two hard constraints: it never blocks render/timing and it correctly treats an absent field as "not checked" rather than "unverified." No correctness, security, or blocking issues found.

### 3. Issues

No blocking issues found. A few minor observations below.

**[MINOR] app/app/page.tsx:185-195 — Idle effect merges `loaded` even when the prior candidate list is kept**
`setCandidates((prev) => (prev.length ? prev : loaded))` keeps `prev` when it is already populated, but the subsequent `if (loaded.length) mergeVerification(loaded)` runs unconditionally. In the rare case where `prev` was populated by an in-flight run before the idle fetch resolved, this verifies the idle-rail addresses that may not correspond to what is displayed. Because `mergeVerification` keys by lowercased address and uses a functional `setCandidates` update, the effect is benign (it only writes verification onto matching addresses), so this is cosmetic rather than a bug.
**Fix (optional):** gate the call on the same condition, e.g. `setCandidates((prev) => { const next = prev.length ? prev : loaded; return next; })` and only `mergeVerification(loaded)` when `!prev.length` — or simply leave as-is given it is harmless.

**[MINOR] app/app/page.tsx — Verification re-fetched on every orchestrate run with no caching**
`mergeVerification` fires once at mount and again after each orchestrate-open stage, re-verifying the same payout addresses each time. For a hackathon demo with a handful of agents this is fine, but it is redundant network work. Acceptable to defer.
**Fix (optional):** memoize results by address (e.g. a `useRef<Map<string, AgentVerification>>`) and skip already-resolved addresses.

**[MINOR] app/lib/cleanverse.mapApassVerdict.test.ts:1-19 — Test change is tangential to AGNTM-4**
The refactor from `import { ..., type CvResponse }` to `type ApassResponse = Parameters<typeof mapApassVerdict>[0]` is a genuine improvement (it decouples the test from an internal alias and correctly captures `CvResponse<ApassInner>` without exporting `ApassInner`), but it is unrelated to the stated scope of this ticket (types + client merge). Calling it out only so it is not mistaken for required AGNTM-4 work. No action needed.

### 4. Positive Observations

- **Constraints honored precisely.** The merge is truly off the critical path: `void (async () => {...})()`, early-returns on `!res.ok`, `!d.available`, or `!d.results`, and swallows errors in `catch`. An absent/`unavailable` result leaves `verification` as `undefined`, which the type comment correctly documents as "not yet checked" — the negative `unverified` state is never inferred from absence. This matches FR-005/006 and the "tolerate available:false" requirement exactly.
- **Address-keying is consistent end-to-end.** Client dedups and lowercases (`payoutAddress?.toLowerCase()`), the route validates/lowercases with `ADDR_RE` and `verifyAddresses` keys by lowercased address — so the `results[a.payoutAddress.toLowerCase()]` lookup lines up on both sides. `encodeURIComponent(unique.join(","))` round-trips correctly through `searchParams.get`.
- **Race-safe state updates.** Both merge sites use the functional `setCandidates((prev) => prev.map(...))` form and key by address, so a stale in-flight verification resolving after a new run simply applies to matching agents — no cross-run corruption, no stale-closure capture.
- **Strong typing discipline.** The type guard `filter((a): a is string => !!a)` correctly narrows `(string | undefined)[]` → `string[]`, and reusing `Agent["verification"]` for the results map avoids an extra import while staying type-accurate.
- **Clear, well-scoped commentary.** The block comment explaining the no-op parity with 001-agentmarket when `CLEANVERSE_*` is unset is exactly the kind of context a cold reader needs, without over-commenting the mechanics.
- **The type itself is well-designed.** The three-state `status: "verified" | "unverified" | "unavailable"` plus optional `onboardUrl`/`checkedAt`, with the documented "only verified:true ever renders as Verified" contract, cleanly separates "couldn't check" from "checked, not verified" and sets up the downstream badge ticket well.
