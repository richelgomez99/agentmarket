# Code Review: AGNTM-3 — Cleanverse verify API route

## 1. Verdict

**PASS** — Implementation is correct and meets the acceptance criteria. The findings below are minor hardening/quality suggestions, none blocking.

## 2. Summary

Reviewed the new `app/app/api/cleanverse/verify/route.ts` GET handler against its plan and the upstream `lib/cleanverse.ts` (CLN-2) it depends on. The route is a thin, well-scoped pass-through: it parses/validates/dedupes addresses, short-circuits to `{available:false, results:{}}` with zero network calls when unconfigured, and otherwise delegates to `verifyAddresses` with a best-effort catch. It matches the plan exactly, follows the established route conventions in this codebase (`NextRequest`, `export const runtime = "nodejs"`, `Response.json`), and correctly keeps the Cleanverse API key server-side. The only gaps are operational hardening (no `maxDuration`, no upper bound on address count) and the absence of a route-level test.

## 3. Issues

**[MINOR] route.ts:1-41 — No `maxDuration` set despite outbound network calls**
Every other route in this codebase that performs network/chain I/O sets an explicit budget (`feedback` → 60, `agent-reviews` → 30). This route fans out to Cleanverse via `verifyAddresses`, and the underlying `cvFetch` uses `AbortSignal.timeout(20_000)` (20s) per address. On a default serverless function budget (10s on Vercel hobby) a slow Cleanverse upstream would let the platform kill the function before the 20s client-side timeout fires, producing a platform 5xx — which directly undercuts the task's "never 5xx, best-effort" requirement (FR-004).
**Fix:** Add `export const maxDuration = 30;` (or ≥ the 20s `cvFetch` timeout) below the `runtime` export, consistent with the sibling routes.

**[MINOR] route.ts:18-26 — Unbounded address count enables outbound request amplification**
The endpoint is public (no auth) and places no cap on the number of addresses. `verifyAddresses` issues one `Promise.all` fetch per unique address, so a caller passing hundreds of distinct valid addresses triggers hundreds of concurrent outbound requests to Cleanverse — an amplification/abuse vector and a way to exhaust the function's time budget. Acceptable for the demo (callers pass a handful of agent wallets), but cheap to bound.
**Fix:** Cap after dedup, e.g. `const valid = Array.from(new Set(...)).slice(0, 50);`.

**[MINOR] route.ts / lib — No test exercises the route handler itself**
`mapApassVerdict` is covered by `cleanverse.mapApassVerdict.test.ts`, but no test covers the route's own logic: the unconfigured zero-network-call branch, address parse/validate/dedup, and the catch fallback. AC-1 ("live CLIENT+OWNER ⇒ unverified+magickLink") is satisfied transitively by the tested mapper, but the route's branching is unverified.
**Fix:** Add a small test that asserts (a) `cvConfigured()===false` ⇒ `{available:false, results:{}}` with `verifyAddresses` not called, and (b) malformed/duplicate addresses are filtered before delegation.

**[MINOR] route.ts:20-26 & cleanverse.ts:182 — Redundant dedup**
The route dedupes with `new Set(...)` and lowercases, then `verifyAddresses` re-runs `Array.from(new Set(addresses.map(a => a.toLowerCase())))`. Harmless and arguably defensive, but the duplication is worth a one-line note so a future reader doesn't assume the route layer's dedup is load-bearing.
**Fix:** Optional — keep the route's filter (it also validates), and drop the comment-worthy ambiguity by noting `verifyAddresses` dedupes too, or rely solely on `verifyAddresses` for dedup.

## 4. Positive Observations

- **Correct unconfigured short-circuit.** The `!cvConfigured()` check returns before any `verifyAddresses` call, satisfying the "ZERO network calls" requirement precisely, and returns the exact `{available:false, results:{}}` shape the plan specifies.
- **Idiomatic and consistent.** The handler mirrors the existing route style (`NextRequest`, `runtime = "nodejs"`, `Response.json`, leading file-header comment citing SPEC/FR refs). Nothing novel or surprising.
- **Best-effort is genuinely layered.** Per-address failures are absorbed in `getWalletVerification` (try/catch → `"unavailable"`), and the route adds an outer try/catch as a second net. The outer catch is effectively defensive (the inner layer never throws), but returning `{available:true, results:{}}` keeps the response shape valid and stays best-effort rather than 5xx-ing.
- **Sound validation at the boundary.** Lowercasing before regex-testing `^0x[0-9a-f]{40}$`, trimming, and silently dropping malformed entries is exactly the spec'd behavior, and `Set` dedup is correct.
- **Security posture is clean.** The API key stays server-side (`runtime = "nodejs"`, key read only inside `lib/cleanverse`), nothing is logged, and there are no injection or deserialization surfaces — input is constrained to a strict hex regex.
