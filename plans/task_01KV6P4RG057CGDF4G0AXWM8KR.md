# Plan — AGNTM-3 (CLN-3): Verification API route

**Goal:** `GET /api/cleanverse/verify?addresses=…` returns per-address verification, deduped, best-effort. Satisfies FR-003, FR-004, FR-010.

**Files to touch:**
- `app/app/api/cleanverse/verify/route.ts` (new; runtime nodejs)

**Approach:**
1. Create `app/app/api/cleanverse/verify/route.ts`. Add `export const runtime = "nodejs";`.
2. `export async function GET(req)`:
   - Parse `addresses` from the query string (comma-separated). Trim, lowercase, keep only valid `0x…` (40 hex) entries; drop malformed ones silently (not fatal).
   - If `!cvConfigured()` ⇒ return `Response.json({ available: false, results: {} })` with **zero network calls**.
   - Else call `verifyAddresses(validAddresses)` (it dedupes), and return `Response.json({ available: true, results })`.
3. Best-effort: wrap the call so an unexpected error returns `{ available: true, results: {} }` (or per-address `unavailable` from the service) rather than a 5xx that breaks the client. Per-address failures already map to `status:"unavailable"` inside `verifyAddresses`/`getWalletVerification`.
4. Atoken + chain are server constants (from AGNTM-1 / `CV_CHAIN`), never client-supplied.

**Acceptance:**
- Live call with CLIENT + OWNER addresses returns `unverified` + magickLink (AC-1).
- Unconfigured ⇒ `{ available: false }`, no network calls (FR-004).
- Malformed addresses ignored, not fatal.
- Test gate: `cd app && npx tsc --noEmit` clean + `npm run build` succeeds before done.

**Guardrails:**
- Server-side only; key never reaches client.
- Zero-regression: route is new and only fetched after candidates load; with env unset it returns `available:false`.
- Scope fence: verify-check only — NO payment blocking, NO settlement.
- Never 5xx the client into a broken flow (best-effort).
