# Code Review: AGNTM-2 — Cleanverse verification service

### 1. Verdict

**PASS** — Implementation is correct and meets the acceptance criteria.

### 2. Summary

Reviewed the new A-Pass verification layer in `app/lib/cleanverse.ts` (centralized
`mapApassVerdict`, `getWalletVerification`, `verifyAddresses`), the `AgentVerification` type
added to `app/lib/types.ts`, and the pure unit test `cleanverse.mapApassVerdict.test.ts`. The
code faithfully implements FR-001/FR-002, centralizes the OQ-1 verdict logic in exactly one
function as the spec requires, dedupes by address, and stamps `checkedAt`. The test passes
(all 12 assertions green) and `tsc --noEmit` is clean. No correctness or security blockers
found; only minor observations below.

### 3. Issues

**[minor] cleanverse.ts:152 — Success heuristic is broad for a compliance gate**
`successStatus` treats any of `"valid" | "verified" | "active"` (plus inner `code` 0/"0"/"0000"
and `verified:true`) as a positive verdict. For a compliance gate, a *false positive*
("verified" when not) is more dangerous than a false negative. A future Cleanverse status like
`"active"` could plausibly mean something other than "A-Pass valid" and would silently flip the
badge to Verified. This is explicitly an OQ-1 assumption that SPEC/VALIDATION step 5 says to
tighten against a real observed response, and the logic is correctly centralized so it's a
one-function fix — so this is acceptable as-is, but worth a comment-level caution.
**Fix:** Once a real verified response is observed (operator is testing `/generate_apass`),
narrow the success test to the single confirmed signal and drop the speculative status strings.
No change needed before that — just don't ship to mainnet on the broad heuristic.

**[minor] cleanverse.ts:181-187 — `verifyAddresses` has unbounded fan-out concurrency**
`Promise.all` over every unique address fires all `/verify_apass` calls simultaneously. Fine
for a hackathon with a handful of agent wallets, but a larger set could trip sandbox
rate-limits, and there's no cap. Each call already has a 20s timeout and maps failures to
`unavailable`, so it degrades safely.
**Fix:** If the agent set can grow, add a small concurrency limit (e.g. batches of 5–8). Not
required for current scope.

**[minor] cleanverse.mapApassVerdict.test.ts — Dedup behavior is untested**
The test thoroughly covers the mapper's four verdict branches, but `verifyAddresses`'s dedupe
(the FR-003-relevant behavior implemented here: lowercasing + `Set`) has no test. A regression
that broke case-insensitive dedup (e.g. a checksummed vs lowercase duplicate) would go
unnoticed.
**Fix:** Add a small test that passes `["0xAbC...", "0xabc..."]` and asserts a single
resulting key. Could stub `getWalletVerification`, or assert on the deduped input list.

**[minor] SPEC FR-001 vs data model — `raw?` field omitted (intentional, noting for the record)**
FR-001 prose lists the normalized result as `{ verified, status, onboardUrl?, raw? }`, but the
canonical data model (SPEC §6) and the implemented `AgentVerification` type both omit `raw` and
add `checkedAt`. The implementation correctly follows §6. No action — flagging only so the FR-001
prose/§6 discrepancy is a known, resolved-in-favor-of-§6 decision.

### 4. Positive Observations

- **Centralization done right.** `mapApassVerdict` is genuinely the single change point for
  OQ-1, exactly as the spec demands. `getWalletVerification` and `verifyAddresses` are thin
  wrappers that delegate all verdict logic to it — the EC-5 "only one function changes"
  guarantee holds.
- **Correct "unavailable" vs "unverified" distinction.** Transport/non-`0000` outer failures
  map to `unavailable` (not a hard negative), and the catch in `getWalletVerification` plus the
  `!isOk(r)` guard both honor this. This is the subtle requirement in FR-002 and it's handled
  in both the sync mapper and the async wrapper.
- **Consistent lowercased keying.** The map is keyed by lowercased address, and the consuming
  route (`api/cleanverse/verify/route.ts`) also lowercases before lookup — the contract
  (`<addrLower>` in SPEC §7) is honored end-to-end with no mismatch.
- **Good test fidelity.** The unverified case uses the actual observed sandbox payload
  (`code: 2`, `"apass not exist"`, real `magickLink`), and verified/defensive cases are clearly
  labeled as synthesized/unobserved. Tests assert behavior (verdict + onboardUrl + checkedAt),
  not internals. The runnable-via-`tsx` + type-checked-via-`tsc` approach fits the project's
  lightweight test style.
- **Defensive null handling.** `r.data && typeof r.data === "object"` guards against a missing
  or string `data`, and `typeof data.magickLink === "string"` guards the onboardUrl — no
  optional-chaining gaps.
