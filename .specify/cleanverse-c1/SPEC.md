# SPEC — Cleanverse C1: Verified Agent Identity

**Feature:** C1 of the Cleanverse Verified Finance integration (Track 02 — Trusted AI Agent Transactions).
**Branch:** `cleanverse`
**Status:** Planned (Phase 1 / Architect). No implementation yet.
**Author:** Architect (Phase 1)
**Depends on:** `app/lib/cleanverse.ts` (adapter, already merged on `cleanverse` — commit `f0e3813`).

---

## 1. Summary

C1 makes every agent in the AgentMarket marketplace carry a **verified, on-chain identity credential (A-Pass)** and surfaces that status in the UI as a **"✓ Verified Agent"** badge. The marketplace already proves *reputation* on-chain (ERC-8004); C1 adds the missing half — *identity* — by querying Cleanverse's `/verify_apass` for each agent's payout wallet and rendering the result.

C1 is **read/display only**: it performs the compliance *check* and shows the badge. It does **not** yet block payment on a failed check (that enforcement is **C3**) and does **not** change the settlement asset (that is **C2**). C1 is the smallest end-to-end slice that puts "verified identity" on screen, backed by a real Cleanverse API call.

---

## 2. Goals / Non-Goals

### Goals
- G1. For each registered agent, call Cleanverse `/verify_apass(payoutAddress, aUSDC, monad)` and derive a verification status.
- G2. Render a clear, three-state badge on each agent card: **Verified**, **Unverified**, **Checking** (and silently absent when Cleanverse is unconfigured).
- G3. Surface verification detail (status + KYC onboarding link for unverified wallets) in the agent detail modal.
- G4. Narrate verification in the Hiring Agent's reasoning as a non-blocking line ("counterparty A-Pass: ✓ verified / ✗ unverified").
- G5. **Zero regression**: when `CLEANVERSE_*` env is absent or the API is unreachable, the existing AgentMarket flow (the 2nd-place Blitz build) behaves exactly as before.

### Non-Goals (explicitly deferred)
- N1. **Blocking payment** on an unverified counterparty → **C3**.
- N2. **Minting/onboarding** A-Passes from the app (`/generate_apass`) → separate onboarding task; depends on confirming our integration role (Issue Member vs Service Partner).
- N3. **Paying in aUSDC** / clean settlement → **C2**.
- N4. **Audit/Travel-Rule report** generation → **C3**.
- N5. Changing winner-selection logic to weight verification → future.

---

## 3. Validated Context (do not re-derive)

Live-validated against the Cleanverse **sandbox** (`uatapi.cleanverse.com/api/cooperate`), Monad supported as `chain: "monad"`:

| Contract (Monad) | Address |
|---|---|
| USDC (origin token) | `0x534b2f3A21130d7a60830c2Df862319e593943A3` (same token AgentMarket already pays in) |
| **aUSDC** (A-Token) | `0xaC0893567D43C3E7e6e35a72803df05416C1f20D` |
| **A-Pass** contract | `0xbA82D189540CaC9DC6FF46B6837CaC1BFdEC58B9` |
| AccessCore | `0x8F118338a1fa41E7Fa86Be19A4e8B99Ed58A6EcC` |

**Observed `/verify_apass` response for an unverified wallet** (the current state of all our wallets):
```json
{ "code": "0000", "message": "ok",
  "data": { "chain": "monad", "atoken": "0xaC08…1f20D", "address": "0x261B…CF95",
            "code": 2, "message": "apass not exist",
            "magickLink": "https://test-magiclink.cleanverse.com/" } }
```
- Outer `code:"0000"` = the API call succeeded (transport-level OK).
- **Inner** `data.code` carries the verification verdict. `2` = "apass not exist" → **unverified**.
- `data.magickLink` (note spelling: **magickLink**) = the KYC onboarding URL for that wallet.

**⚠ Open assumption (OQ-1):** we have **not** yet observed a *verified* wallet's response (no A-Pass minted yet). The exact success signal (`data.code === 0`? a `verified:true`? a `status` string?) must be confirmed once an A-Pass exists. The verification mapper MUST be written defensively (treat "explicitly not-exist / non-zero inner code" as unverified; treat outer-OK + inner success as verified) and centralized so a single function changes when the real signal is known.

---

## 4. User Stories

- **US-1 (Judge/institution):** As a Cleanverse reviewer, I can see at a glance which agents in the marketplace are KYC-verified A-Pass holders, so the marketplace reads as compliant infrastructure rather than anonymous wallets.
- **US-2 (Operator/demo):** As the demo driver, when I click an agent I can see its A-Pass verification status and, if unverified, the magic link to onboard it — so the "verified identity" story is tangible.
- **US-3 (Hiring Agent narrative):** As a viewer, I watch the Hiring Agent state the counterparty's verification status as part of its reasoning, tying identity to the hire decision.
- **US-4 (Resilience):** As the operator, if Cleanverse is down or unconfigured, the marketplace still runs the full hire→build→pay→rate loop unchanged.

---

## 5. Functional Requirements

- **FR-001** — A server-side verification service SHALL, given a wallet address, call `cvVerifyApass(address, AUSDC_MONAD, "monad")` and return a normalized result `{ verified: boolean, status: string, onboardUrl?: string, raw?: object }`.
- **FR-002** — The mapper SHALL classify: outer `code==="0000"` AND inner success-signal ⇒ `verified:true`; outer `code==="0000"` AND inner `data.code !== <success>` (e.g. `2`/"apass not exist") ⇒ `verified:false` with `onboardUrl = data.magickLink`; any transport error / non-`0000` ⇒ `verified:false, status:"unavailable"` (NOT a hard "unverified" assertion — distinguish "we couldn't check" from "checked, not verified").
- **FR-003** — A verification API route SHALL accept a set of agent wallet addresses and return per-address verification results. It SHALL **dedupe by address** (multiple agents may share one payout wallet) to avoid redundant calls.
- **FR-004** — When `cvConfigured()` is false, the route SHALL return `{ available: false }` and make **no** network calls.
- **FR-005** — The `Agent` type SHALL gain an optional `verification?: AgentVerification` field. Absence ⇒ "not checked yet" (renders as Checking or nothing), never as "unverified".
- **FR-006** — The client SHALL fetch verification **after** the candidate list loads (progressive enhancement) and merge results into agent state; verification latency SHALL NOT block initial render of the market rail or any existing flow.
- **FR-007** — Each `AgentCandidateCard` SHALL render a badge reflecting `agent.verification`: **Verified** (green, A-Pass check icon), **Unverified** (amber), **Checking** (muted, while pending), and **nothing** when verification is unavailable/unconfigured.
- **FR-008** — The agent detail modal (`AgentReviewsModal`) SHALL show the verification status, the verified wallet address, and — when unverified — a link to the `onboardUrl` (magic link) labeled as KYC onboarding.
- **FR-009** — The Hiring Agent reasoning/comms SHALL include one non-blocking line reporting the hired agent's verification status. This line SHALL NOT alter selection or payment in C1.
- **FR-010** — All Cleanverse calls remain **server-side only**; the API key never reaches the client (already guaranteed by `lib/cleanverse.ts` + `.env.local`).

---

## 6. Data Model

Add to `app/lib/types.ts`:
```ts
export type AgentVerification = {
  verified: boolean;
  status: "verified" | "unverified" | "unavailable";
  onboardUrl?: string;      // data.magickLink, present when unverified
  checkedAt?: number;       // ms epoch
};
// Agent gains:  verification?: AgentVerification;
```
- `undefined` ⇒ not yet checked (UI: Checking). `status:"unavailable"` ⇒ checked but Cleanverse down/unconfigured (UI: badge hidden). Only `status:"unverified"` asserts a real negative.

---

## 7. API Contract

**`GET /api/cleanverse/verify?addresses=0xabc,0xdef`** (server, nodejs runtime)
- Response (configured): `{ available: true, results: { "<addrLower>": AgentVerification, ... } }`
- Response (unconfigured): `{ available: false, results: {} }`
- Dedupes addresses; per-address try/catch → `status:"unavailable"` on failure; overall best-effort (never 5xx the client into a broken flow).
- Atoken + chain are server constants (from CLN-1 config), not client-supplied.

*(GET with a query param chosen for cache-friendliness and trivial client use; addresses are public wallet addresses, not secrets.)*

---

## 8. UI / UX

**Badge states** (new `VerifiedBadge` component):
| State | Trigger | Visual |
|---|---|---|
| Verified | `verification.status==="verified"` | green pill, `BadgeCheck` icon, "VERIFIED" / "A-PASS" |
| Unverified | `status==="unverified"` | amber pill, `ShieldAlert`, "UNVERIFIED" |
| Checking | `verification===undefined` AND Cleanverse available | muted pill, subtle pulse, "CHECKING…" |
| Hidden | `status==="unavailable"` or Cleanverse unconfigured | render nothing (no regression to Blitz look) |

- Card placement: top-left of `AgentCandidateCard`, not colliding with the HIRED (top-right) or REVIEWS hover chip.
- Modal: a "VERIFIED IDENTITY (A-PASS)" row near the score/jobs header; magic-link button when unverified.
- Copy guardrail (carries the constitution's honesty principle): the badge reflects the *actual* Cleanverse response. Never show "Verified" without a `verified:true` from the API.

---

## 9. Architecture & Flow

```
page.tsx (client)
  ├─ load candidates  ── GET /api/orchestrate  (unchanged, chain reads)
  └─ AFTER candidates ─ GET /api/cleanverse/verify?addresses=…
                          └─ lib/cleanverse: verifyAgents() → cvVerifyApass per unique addr
                          └─ merge verification into agents state  → badges render
Hiring Agent flow: on hire, read winner.verification → emit one comms line (non-blocking)
```
Progressive enhancement keeps Cleanverse entirely off the critical path: if `/api/cleanverse/verify` is slow, errors, or returns `available:false`, the marketplace is visually identical to today minus the badges.

---

## 10. Edge Cases & Degradation

- EC-1. Cleanverse unconfigured (no env) ⇒ `available:false`, no badges, full flow works. **(must-test)**
- EC-2. Cleanverse timeout/5xx ⇒ per-address `status:"unavailable"`, badges hidden, flow works.
- EC-3. Shared payout wallet across agents ⇒ dedupe; all such agents show identical status (correct — it's one identity). Note in BUILDPLAN.
- EC-4. Partial results (some addresses fail) ⇒ each address independent; failures hidden, successes shown.
- EC-5. A verified response shape differs from assumption (OQ-1) ⇒ only the mapper (one function) changes.

---

## 11. Open Questions

- **OQ-1.** Exact "verified" success signal from `/verify_apass` (unobserved). → Confirm after an A-Pass is minted (operator is testing `/generate_apass`). Mapper is centralized to absorb this.
- **OQ-2.** Integration role (Issue Member vs Service Partner) — determines whether onboarding is in-app (`/generate_apass`) or via magic link. Out of scope for C1; affects the onboarding task only.
- **OQ-3.** Do all 4 agents share one payout wallet? If per-agent verification variety is wanted for the demo, distinct wallets are needed (out of C1 scope; flag for demo prep).

---

## 12. Acceptance Criteria

- AC-1. `GET /api/cleanverse/verify?addresses=<client>,<owner>` returns real results from the sandbox; our wallets come back `status:"unverified"` with a `magickLink` onboardUrl (matches observed reality today).
- AC-2. Agent cards render the correct badge state per verification; verified is only ever shown on a real `verified:true`.
- AC-3. With `CLEANVERSE_*` removed from env, the app builds, the market loads, and a full hire→build→pay→rate run completes with **no badges and no errors** (parity with `001-agentmarket`).
- AC-4. The agent modal shows verification status + a working magic-link button for unverified agents.
- AC-5. The Hiring Agent emits exactly one verification line on hire; it does not change the winner or payment.
- AC-6. `tsc --noEmit` clean; production build succeeds.

---

## 13. Out of Scope (later tiers)
- **C2:** Faucet aUSDC; pay agents in aUSDC (compliant settlement) via the existing x402/transfer path.
- **C3:** Enforce the gate (block or warn on payment to unverified counterparties) + per-job Travel-Rule/audit report (`/query_txs`, `/download_travel_rule`).
