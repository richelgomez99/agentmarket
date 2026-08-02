# Plan Review — AGNTM-6 (CLN-6): Modal verification row + Hiring-Agent line

## 1. Verdict

**PASS** — The plan is complete, technically grounded, and aligned with the task and SPEC (FR-008/FR-009, AC-4/AC-5). Implementation can proceed. One interpretation point around "exactly one line" should be confirmed but does not block.

> Note on inputs: the `### Plan` block embedded in the review prompt was a verbatim restatement of the task description (no implementation detail). The actual plan reviewed is the on-disk plan at `plans/task_01KV6P4RSPK4A53BX331PY5B83.md`, which is detailed and file/line-specific. This review evaluates that plan.

## 2. Summary

I reviewed the AGNTM-6 plan against the live codebase (`AgentReviewsModal.tsx`, `page.tsx`, `lib/types.ts`, `components/shared.tsx`) and the C1 SPEC. The plan is high quality: every cited line number, helper (`truncAddr`), field (`payoutAddress`, `verification`), and type (`AgentVerification`) was verified to exist as described, and the plan surfaces a genuinely non-obvious correctness bug before implementation (the hire-time `winner` object does not carry merged verification). The one open concern is the plan's resolution of the spec's "EXACTLY ONE Hiring-Agent line" requirement into "at most one line (zero when no verdict)," which is defensible but worth an explicit operator confirmation.

## 3. Issues

**[MAJOR] Part B — "exactly one line" vs. progressive-merge race may yield zero lines**
The task description and AC-5 say "emit EXACTLY ONE Hiring-Agent line stating winner verification status." The plan instead emits a line *only when a concrete verdict exists* and *zero* lines when `winner.verification` is `undefined` or `unavailable`. This is internally consistent with the SPEC's zero-regression principle (AC-3) and is the right call when Cleanverse is unconfigured. But there is a second path to zero lines that is *not* a degradation case: `mergeVerification` is fired at `page.tsx:486` (fire-and-forget, off the critical path), and the winner read happens at hire time (~`:543`). If the Cleanverse fetch loses the race against the pitch→evaluate→typewriter sequence, the headline verification narrative (US-3, the whole point of FR-009) silently disappears even though Cleanverse is configured and reachable. In practice the intervening work (4 parallel LLM pitches + an evaluate round-trip + typewriter delay at `:540`) almost certainly outlasts a few HTTP verify calls, so this is low-probability — but it is the exact moment the demo is meant to show, so a silent miss is costly.
**Recommendation:** Keep the plan's "no line when unconfigured/unavailable" behavior, but (a) explicitly confirm with the operator that "exactly one" is intended as "at most one (one iff a verdict exists)," and (b) consider a low-cost mitigation so the demo line is reliable — e.g., for the winner only, `await` the verification result (or briefly poll the `candidates` state) before emitting, so a configured-but-slow Cleanverse still produces the line. This stays off the critical path for everything except the single winner read and preserves the zero-line behavior when unconfigured.

**[MINOR] Part B — fallback hire path (catch branch, `:562–577`) intentionally emits no line**
The plan explicitly scopes the degraded/`catch` hire path out, so an orchestration hiccup yields a hire with no verification line. This is a reasonable C1 scope decision and is clearly documented, but it means "verification narrated on hire" is not guaranteed across both hire paths.
**Recommendation:** Acceptable as-is for C1. Just ensure the scope note survives into the PR description so a code reviewer doesn't flag the asymmetry as an oversight.

**[MINOR] Acceptance — AC-5 ("exactly one") is only build/type-gated, not behaviorally tested**
The test gate is `tsc --noEmit` + `npm run build`. Neither verifies the runtime "exactly one line / selection+payment unchanged" claim; that rests on code inspection only.
**Recommendation:** Add a one-line manual verification step to the plan's acceptance section (run a hire with Cleanverse configured → confirm exactly one verification line appears and the winner/payment are unchanged), so AC-5 is consciously checked rather than assumed.

**[MINOR] Part A — "verified wallet address" label shown for unverified state**
The plan renders `agent.payoutAddress` as the "verified wallet" in both the verified and unverified branches. For the unverified branch, labeling the address as the "verified wallet" is slightly misleading (it's the wallet that was *checked*, not verified).
**Recommendation:** Trivial copy adjustment — use a neutral label like "payout wallet" / "checked wallet" in the unverified branch, reserving "verified wallet" for the `verified` branch. Honesty-principle friendly.

## 4. Positive Observations

- **Strong, verified critical finding.** The plan's "CRITICAL data-source finding" — that `winner` (`page.tsx:537`) comes from the raw `open.result.candidates` stream and therefore lacks the progressively-merged `verification`, requiring a re-read from `candidates` state by `agentId` — is correct and exactly the kind of bug that would otherwise surface only at demo time. Catching it at plan stage is high value.
- **Line-accurate and code-grounded.** Every concrete reference I checked held up: the score/jobs header block (`:39–56`), the insertion point (`:543–546`), `mergeVerification` at `:486`, the `useCallback` deps including `candidates`/`mergeVerification` at `:582`, `truncAddr` in `./shared`, and `payoutAddress`/`verification?`/`AgentVerification` in `lib/types.ts`. The plan did its homework against the real tree.
- **Clear scope fencing.** The "MUST NOT alter winner or payment" constraint is enforced structurally (the line is a pure `say(...)` append after `setHiredStyle` finalizes selection and independent of `runPayment`/`runRating`), and the disjointness from AGNTM-5 (`VerifiedBadge.tsx` + `AgentCandidateCard.tsx`, zero file overlap) is explicit — confirming the "parallel with CLN-5" claim is safe.
- **Zero-regression and honesty principles carried through.** The plan consistently renders nothing for `undefined`/`unavailable` and binds the magic-link `href` to the exact `verification.onboardUrl` with no URL fabrication — directly honoring the constitution's honesty principle and the SPEC's degradation contract.
- **Good decomposition.** Part A (modal) and Part B (hire line) are cleanly separated with their own steps, acceptance mapping, and an explicit test gate.
