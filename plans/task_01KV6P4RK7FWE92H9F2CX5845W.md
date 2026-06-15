# Plan — AGNTM-4 (CLN-4): Agent.verification type + progressive client merge

**Goal:** Add `Agent.verification?` field and progressively fetch/merge verification into agent state after candidates load, off the critical path. Satisfies FR-005, FR-006.

**Files to touch:**
- `app/lib/types.ts` — add `verification?` to `Agent` ONLY (do NOT redeclare `AgentVerification` — see note).
- `app/app/page.tsx` — progressive fetch + merge.

**Approach:**
1. **Type:** In `app/lib/types.ts`, add to `Agent`: `verification?: AgentVerification;`. `AgentVerification` is ALREADY declared in `types.ts` by AGNTM-2 — just reference it (same file). Do not redeclare.
2. **Client merge** in `app/app/page.tsx`. Add a reusable helper, e.g. `mergeVerification(addresses: string[])`:
   - Build the unique, lowercased `payoutAddress` list from current candidates.
   - `fetch('/api/cleanverse/verify?addresses=' + encodeURIComponent(unique.join(',')))`.
   - If response `available === false` (or fetch throws) ⇒ no-op (agents simply lack `verification`).
   - Else merge `results[addrLower]` into each candidate by lowercased `payoutAddress`: `setCandidates(prev => prev.map(a => ({ ...a, verification: results[a.payoutAddress.toLowerCase()] ?? a.verification })))`.
3. **Trigger points** (both places candidates get set — fire-and-forget, AFTER set, never awaited on the render path):
   - Idle rail load (~line 159, the GET `/api/orchestrate` `.then` that sets candidates) — call merge with the loaded candidates' addresses.
   - Orchestrate "open" stage (~line 451, `setCandidates(open.result.candidates)`) — call merge with those addresses.
   - Guard so it does not block or delay hire/build/pay timing; wrap in try/catch; tolerate `available:false`.

**Acceptance:**
- Agents carry `verification` after load; removing `CLEANVERSE_*` env ⇒ no fetch error, agents simply lack the field; no change to hire/build/pay timing.
- Test gate: `cd app && npx tsc --noEmit` clean + `npm run build` succeeds before done.

**Guardrails:**
- Progressive enhancement: verification fetch is OFF the critical path; never blocks initial render of the market rail or any existing flow.
- Zero-regression: with env unset the route returns `available:false` and the merge is a no-op — UI identical to 001-agentmarket.
- Scope fence: type + merge only — NO badge UI (AGNTM-5), NO modal/hire line (AGNTM-6), NO payment blocking, NO settlement.
- Honesty: never synthesize a `verified` state client-side; only merge what the API returned.

**Sequencing note (read AGNTM-2's plan too):** `AgentVerification` is declared in `app/lib/types.ts` by AGNTM-2 (pulled forward). THIS ticket adds only `Agent.verification?: AgentVerification` + the client merge.
