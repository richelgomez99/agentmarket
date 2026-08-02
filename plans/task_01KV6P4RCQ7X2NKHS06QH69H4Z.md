# Plan — AGNTM-2 (CLN-2): Verification service + centralized verdict mapper

**Goal:** Normalize `/verify_apass` into the `AgentVerification` shape with a single, centralized verdict mapper (the one OQ-1 change point). Satisfies FR-001, FR-002.

**Files to touch:**
- `app/lib/types.ts` — **declare `AgentVerification` HERE as part of THIS ticket** (pulled forward from CLN-4). See sequencing note below.
- `app/lib/cleanverse.ts` — add the service functions + mapper.

**Approach:**
1. **Type (pull forward):** Add to `app/lib/types.ts`:
   ```ts
   export type AgentVerification = {
     verified: boolean;
     status: "verified" | "unverified" | "unavailable";
     onboardUrl?: string;   // data.magickLink, present when unverified
     checkedAt?: number;    // ms epoch
   };
   ```
   (AGNTM-4 will ONLY add `Agent.verification?: AgentVerification` + the client merge — it does not redeclare this type.)
2. In `app/lib/cleanverse.ts`, import `AgentVerification` from `./types` and add:
   - `mapApassVerdict(r: CvResponse<any>): AgentVerification` — **the CENTRALIZED mapper (OQ-1 single change point)**:
     - outer `r.code === "0000"` AND inner success signal ⇒ `{ verified: true, status: "verified", checkedAt: Date.now() }`.
     - outer `code === "0000"` AND inner `data.code` is non-success (e.g. `2` / "apass not exist") ⇒ `{ verified: false, status: "unverified", onboardUrl: data.magickLink, checkedAt }`.
     - thrown/transport error OR non-`0000` outer code ⇒ `{ verified: false, status: "unavailable", checkedAt }` (NOT a hard unverified — "we couldn't check" ≠ "checked, not verified").
     - **OQ-1 defensive coding:** the verified inner signal is UNOBSERVED. Treat "explicit not-exist / non-zero inner code" as unverified, and "outer-OK + inner success" as verified. Pick the success test defensively (e.g. inner `data.code === 0` OR an explicit `data.verified === true` OR a `status` string), and document inline that THIS function is the only place that changes when a real A-Pass response is observed.
   - `getWalletVerification(address: string): Promise<AgentVerification>` — wraps `cvVerifyApass(address, AUSDC_MONAD, CV_CHAIN)` in try/catch; on throw return the `unavailable` verdict; otherwise pass the response through `mapApassVerdict`.
   - `verifyAddresses(addresses: string[]): Promise<Record<string, AgentVerification>>` — **dedupe** by lowercased address, call `getWalletVerification` per unique address (Promise.all), return a map keyed by lowercased address.
3. Unit-test the mapper (pure, no live network): observed unverified payload ⇒ `unverified` + magickLink; synthesized verified payload ⇒ `verified`; thrown error path ⇒ `unavailable`.

**Acceptance:**
- Mapper returns `unverified` + `onboardUrl` for the observed payload; `unavailable` on throw; deduping confirmed.
- Test gate: `cd app && npx tsc --noEmit` clean + `npm run build` succeeds before done.

**Guardrails:**
- Server-side only; API key never reaches client.
- Zero-regression: with `CLEANVERSE_*` unset nothing here is invoked by existing flows.
- Scope fence: verify-check + verdict shape only — NO payment blocking, NO aUSDC settlement.
- Honesty: never emit `verified:true` without a real inner success signal.

**Sequencing note (read AGNTM-4's plan too):** `AgentVerification` is declared in `app/lib/types.ts` by THIS ticket (AGNTM-2). AGNTM-4 only adds `Agent.verification?` and the client merge; it must NOT redeclare `AgentVerification`.
