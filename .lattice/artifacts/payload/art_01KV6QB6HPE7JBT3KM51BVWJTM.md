# Plan Review: AGNTM-2 — Cleanverse verification service (`verifyAddresses`)

### 1. Verdict

**PASS** — Plan is complete, feasible, and aligned. Implementation can proceed.

### 2. Summary

I reviewed the AGNTM-2 plan against the task description, the C1 SPEC
(`.specify/cleanverse-c1/SPEC.md` — FR-001/002/003 and the OQ-1 open assumption),
its dependency plan CLN-1, and the existing `app/lib/cleanverse.ts` (which already
provides `cvVerifyApass`, `CvResponse`, `CV_CHAIN`, and the encrypt/fetch plumbing).
The plan is tightly scoped, faithfully implements the centralized-mapper design the SPEC
demands, and matches the canonical `AgentVerification` type verbatim. The only concerns
are minor refinements (mapper test ordering, `Date.now()` testability, and a narrow
internal type) — none block implementation.

### 3. Issues

**[MINOR] Approach §2 (mapper) — success-test ordering could misclassify the observed payload**
The plan proposes the success signal could be "inner `data.code === 0` OR `data.verified === true` OR a `status` string". The one *observed* payload (unverified) carries no `data.verified` and no `data.status`, only `data.code: 2` + `magickLink`. If the implementer evaluates a broad "has a status string ⇒ verified" branch before the not-exist branch, an unverified response could flip to verified. The SPEC (line 59) is explicit that the not-exist/non-zero-inner-code case is the *known* discriminator.
**Recommendation:** State in the plan that the mapper checks in this order: (1) transport failure / non-`0000` outer ⇒ `unavailable`; (2) inner not-success (`data.code` present and non-zero, or `magickLink` present) ⇒ `unverified` + `onboardUrl`; (3) verified only as the residual on an *explicit* positive signal. The negative case is observed and authoritative; the positive case is the defensive guess. Order the branches so the observed payload can never fall through to `verified`.

**[MINOR] Approach §3 (unit test) — `Date.now()` makes the "pure" mapper non-deterministic**
The mapper stamps `checkedAt: Date.now()`, so it is not strictly pure and a test cannot assert an exact `checkedAt`.
**Recommendation:** Have the tests assert `typeof checkedAt === "number"` (and `status`/`verified`/`onboardUrl` exactly), or inject a clock. Note this in the plan so the test author doesn't write a brittle equality assertion.

**[MINOR] Approach §2 — narrow `cvVerifyApass` data type omits the fields the mapper reads**
`cvVerifyApass` currently types `data` as `{ verified?; status?; chain; atoken; address }` — it does **not** include `code`, `message`, or `magickLink`, which are exactly the fields the mapper inspects. The plan sidesteps this by typing the mapper as `CvResponse<any>`, so `tsc` won't complain, but reading the real verdict fields through `any` discards type safety at the one place the SPEC says must be the single, well-understood change point for OQ-1.
**Recommendation:** Widen `cvVerifyApass`'s data generic to include `code?: number; message?: string; magickLink?: string` (alongside the existing fields) so the mapper can read the verdict type-safely without `any`. Small, additive, and it makes the OQ-1 change point self-documenting.

**[MINOR] Cross-artifact — FR-001 mentions a `raw?: object` field that the type omits**
FR-001 describes the normalized result as `{ verified, status, onboardUrl?, raw? }`, but the canonical `AgentVerification` type in SPEC §6 (and in this plan) has no `raw`. The plan correctly follows the §6 type; the discrepancy is internal to the SPEC.
**Recommendation:** Add a one-line note in the plan that `raw` is intentionally omitted (the §6 type is authoritative) so a reviewer doesn't later flag the missing field as a gap.

**[MINOR] Approach §1 (verifyAddresses) — address casing sent to the API vs. map key**
The plan dedupes and keys the returned map by lowercased address (matches FR-003 / the API contract's `<addrLower>` keys), but doesn't state whether the address passed into `cvVerifyApass` is the lowercased or original form.
**Recommendation:** Clarify that only the map key must be lowercased; either form may be sent to Cleanverse (addresses are case-insensitive). Trivial, but avoids an ambiguous implementation choice.

### 4. Positive Observations

- **Exact type fidelity.** The `AgentVerification` shape in the plan matches SPEC §6 character-for-character (`verified`, `status` union, optional `onboardUrl`, optional `checkedAt`), so no downstream ticket has to reconcile a drifted type.
- **OQ-1 handled exactly as the SPEC intends.** Centralizing the verdict in a single `mapApassVerdict` and documenting it inline as the one place that changes when a real verified A-Pass is observed directly satisfies EC-5 and the OQ-1 mandate.
- **Correct `unavailable` ≠ `unverified` distinction.** The plan preserves the SPEC's crucial honesty rule — "couldn't check" never masquerades as a negative verdict — and the guardrails reinforce "never emit `verified:true` without a real inner success signal."
- **Dependency-aware sequencing.** Pulling `AgentVerification` forward into `types.ts` here, with an explicit note that AGNTM-4 must not redeclare it, prevents a duplicate-declaration collision across tickets. Strong cross-ticket coordination.
- **Feasibility is well-grounded.** The plan builds on primitives that already exist and were validated against the sandbox (`cvVerifyApass`, `cvFetch`, `CvResponse`, `CV_CHAIN`); `AUSDC_MONAD` comes from the declared CLN-1 dependency. The error model is compatible — `cvFetch` already coerces non-JSON/HTTP errors to a non-`0000` code, and the `getWalletVerification` try/catch covers thrown transport errors, so both feed the `unavailable` path cleanly.
- **Disciplined scope and test gate.** Server-side only, zero-regression when `CLEANVERSE_*` is unset, an explicit scope fence (no payment/settlement), and a concrete test gate (`tsc --noEmit` + `npm run build`) keep this a single, reviewable pass.
