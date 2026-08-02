# Plan Review: AGNTM-5 — VerifiedBadge component + card integration

### 1. Verdict

**FAIL (plan-level)**

### 2. Summary

I reviewed the AGNTM-5 plan for the new `VerifiedBadge` component and its integration into `AgentCandidateCard.tsx`, cross-checking it against SPEC sec. 8 / FR-007, the existing card, the `AgentVerification` type from AGNTM-4, and the progressive-merge wiring in `page.tsx`. The task itself is small, well-scoped, and technically sound — but the submitted "plan" is a **verbatim copy of the task description** and contains no implementation approach. More importantly, it does not resolve the one genuinely non-trivial design decision in this task: how the badge distinguishes the **Checking** state from the **Hidden** state, which with the current data flow is not derivable from `agent.verification` alone and, if implemented naively, produces a permanent "CHECKING…" regression in the default (Cleanverse-unconfigured) demo path.

### 3. Issues

**[CRITICAL] State model — "Checking" vs "Hidden" is not distinguishable from `agent.verification` alone**
SPEC sec. 8 defines the trigger for **Checking** as `verification===undefined AND Cleanverse available`, and **Hidden** as `status==="unavailable" OR Cleanverse unconfigured`. But the merge in `page.tsx:160-182` only ever *sets* `agent.verification` on the success path (`d.available && d.results`). When Cleanverse is unconfigured (`available:false`), on a network error, on `!res.ok`, or when an address simply has no result row, `agent.verification` stays `undefined`. The card (`AgentCandidateCard.tsx:8-18`) receives only `agent` — it has **no signal for "Cleanverse available."** So `undefined` is ambiguous: it means both "still checking" and "unconfigured/unavailable." A naive `verification===undefined ⇒ Checking` mapping makes **every card show a perpetual "CHECKING…" pulse** in the common demo case where `CLEANVERSE_*` is unset — exactly the "regression to Blitz look" the SPEC says Hidden must avoid. The plan does not mention this at all.
**Recommendation:** The plan must specify how availability reaches the badge. Concretely: lift an `cleanverseAvailable: boolean` (or `verificationPending`) flag into `page.tsx` state, set it from the `/api/cleanverse/verify` response (`available` flag) and from "request in flight," and thread it to `VerifiedBadge` (via a prop on `AgentCandidateCard`). Then: `undefined` + available/in-flight ⇒ Checking; `undefined` + not-available ⇒ Hidden. Decide and document this in the plan before implementation.

**[MAJOR] No implementation detail — plan is a restatement of the task**
Lines 17-19 of the plan are identical to the task description (lines 14). There is no component signature, no prop contract, no state-derivation logic, no placement/CSS detail, no icon-import list, and no statement of what is out of scope. A plan that cannot be distinguished from the ticket gives the implementer and this review nothing to evaluate against, and defers every real decision to code-review time — the opposite of the stated goal of catching issues early.
**Recommendation:** Expand the plan to specify at minimum: (a) `VerifiedBadge` props (e.g. `{ verification?: AgentVerification; pending?: boolean }`) and the exact `state` derivation; (b) the four visual treatments with concrete Tailwind classes consistent with the existing card's idiom (font-mono, `text-[8.5px]`/`text-[9.5px]` tracking, pill borders); (c) the precise placement; (d) lucide imports needed.

**[MAJOR] Placement/collision claim is asserted but not specified against the real layout**
The card already uses `absolute right-3 top-3` for the REVIEWS hover chip (line 35) and `absolute -top-2.5 right-3` for the HIRED pill (line 40) — both top-**right**. The plan repeats "top-left, no collision" but gives no coordinates. The top-left corner is free, but the card root is `relative` with `p-3.5` and the agent icon sits at the top-left of the inner flex row (line 45), so an absolutely-positioned top-left badge can overlap the `Bot` icon/avatar unless offset or given a z-index.
**Recommendation:** Specify exact positioning (e.g. `absolute left-3 top-3 z-10`) and confirm it clears the `h-10 w-10` avatar — or place the badge inline in the header row instead of absolutely. Note that HIRED uses a negative top offset (`-top-2.5`) and pick a non-colliding vertical baseline.

**[MINOR] Honesty guardrail stated as a goal but not as a testable rule**
FR-007 and SPEC sec. 8 require "never show Verified without `verified:true` from the API." The plan restates this but does not pin the predicate. Note the AGNTM-2 mapper (per `OQ1-RESOLVED.md`) sets both `verified:true` and `status:"verified"` together; the badge should key Verified strictly off `status==="verified"` (or `verified===true`), not off mere presence of `verification`.
**Recommendation:** State the exact predicate per state in the plan so it is verifiable in review: Verified ⇐ `status==="verified"`; Unverified ⇐ `status==="unverified"`; Hidden ⇐ `status==="unavailable"`.

**[MINOR] No mention of scope boundary vs FR-008 (modal) and the `ShieldAlert` import**
SPEC sec. 8 also describes a modal verification row, but that is FR-008 / a separate task — the plan should explicitly state the modal is out of scope for AGNTM-5 to prevent scope creep. Also, `ShieldAlert` (Unverified icon) is not currently imported anywhere; `BadgeCheck` is already imported in the card but the badge is a new component and will need its own imports.
**Recommendation:** Add a one-line "out of scope: AgentReviewsModal (FR-008/AGNTM-?)" note and list the new lucide imports (`BadgeCheck`, `ShieldAlert`).

### 4. Positive Observations

- The underlying task is correctly scoped and decomposed: a single new presentational component plus one integration point, with the data layer (`AgentVerification` type, progressive merge, API route) already landed in AGNTM-1..4, so AGNTM-5 has no backend dependencies beyond the resolved CLN-4.
- The task description carries the right instincts — naming the collision risks (HIRED top-right, REVIEWS hover chip) and the honesty guardrail (Verified only on real `verified:true`) — which match the SPEC and constitution. The plan just needs to operationalize them.
- The four-state model maps cleanly onto the existing `AgentVerification` discriminated shape (`status` + `undefined`), so no type changes are required; this keeps the change small and low-risk once the Checking/Hidden disambiguation is resolved.
