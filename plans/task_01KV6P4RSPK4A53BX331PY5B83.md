# Plan — AGNTM-6 (CLN-6): Modal verification row + Hiring-Agent line

**Goal:** (a) Surface A-Pass verification detail in the agent detail modal (`AgentReviewsModal`), and (b) emit exactly ONE non-blocking Hiring-Agent comms line on hire stating the winner's verification status. Satisfies FR-008 and FR-009. The hire line MUST NOT alter winner selection or payment.

**FRs / Spec:** FR-008 (modal: status + verified wallet address + magic-link onboarding when unverified), FR-009 (one non-blocking hire-time narrative line); SPEC §8 (modal: "VERIFIED IDENTITY (A-PASS)" row near the score/jobs header; magic-link button when unverified), §12 AC-4 (modal status + working magic link) and AC-5 (exactly one hire line; selection/payment unchanged).

**Depends on:** AGNTM-4 (CLN-4) — `Agent.verification?: AgentVerification` exists in `app/lib/types.ts` and is progressively merged into the `candidates` state in `page.tsx`. This ticket reads that field only.

**Disjoint from AGNTM-5:** This ticket touches `AgentReviewsModal.tsx` + `page.tsx`. AGNTM-5 touches `VerifiedBadge.tsx` (new) + `AgentCandidateCard.tsx`. No file overlap → fully parallel-safe.

---

## Files to touch
- `app/app/components/AgentReviewsModal.tsx` — add the "VERIFIED IDENTITY (A-PASS)" row.
- `app/app/page.tsx` — emit the single hire-time verification comms line.

---

## Part A — Modal verification row (`AgentReviewsModal.tsx`, FR-008)

The modal receives the full `agent: Agent` prop (line 12), so `agent.verification` is available directly. The header score/jobs block is the bordered row at lines 39-56 (`flex items-center gap-5 border-b … px-5 py-4`).

**Steps:**
1. Import an icon set already in `lucide-react`: add `BadgeCheck`, `ShieldAlert`, `ExternalLink` (note `ExternalLink` is already imported at line 5; add `BadgeCheck`, `ShieldAlert`).
2. Insert a NEW bordered row **immediately after** the score/jobs header block (after line 56, before the "REPUTATION BY SPECIALTY" block at line 58) labeled `VERIFIED IDENTITY (A-PASS)` (mono label styling matching the existing `font-mono text-[10px] tracking-[0.2em] text-zinc-500` section labels, e.g. line 59).
3. Render based on `agent.verification`:
   - **`verified === true` / `status==="verified"`:** green status pill (`BadgeCheck`, emerald) with text like "Verified A-Pass holder", plus the verified wallet address (`agent.payoutAddress`, full or truncated via the existing `truncAddr` helper from `./shared` — import if not present; the card uses `truncAddr`). Show the address as the "verified wallet".
   - **`status==="unverified"`:** amber status pill (`ShieldAlert`) "Unverified — KYC pending", show the wallet address, and a magic-link BUTTON to `agent.verification.onboardUrl` (only when `onboardUrl` is present): `<a href={onboardUrl} target="_blank" rel="noreferrer">` styled like the existing "INSPECT THE ON-CHAIN REGISTRY" anchor (lines 90-99) with an `ExternalLink` icon, labeled e.g. "ONBOARD KYC / GET A-PASS" or "OPEN KYC MAGIC LINK". Honesty: label it clearly as Cleanverse KYC onboarding.
   - **`undefined` or `status==="unavailable"`:** render the WHOLE row as `null` (do not show the section at all). This preserves zero-regression: when Cleanverse is unconfigured the modal is identical to `001-agentmarket`. Guard at the top: `const v = agent.verification; … {v && v.status !== "unavailable" ? (<row/>) : null}`.
4. Keep the magic-link `href` exactly `verification.onboardUrl` (the `data.magickLink` from the API) — do not construct or guess a URL; render the button only when `onboardUrl` is truthy.

**Layout:** a single bordered row consistent with the score/jobs row above it; status pill on the left, wallet address mono, and (when unverified) the magic-link button either inline-right or on its own line below. No change to the reputation-by-specialty block.

---

## Part B — Hiring-Agent hire-time line (`page.tsx`, FR-009)

### Where to insert — file:line
**Insert inside the hire block, immediately after `page.tsx:544`** (the existing `say("orchestrator", "Hiring Agent", \`@${winner.name} — you're hired…\`)`), within the `if (winner) {` guard that opens at line 543. This places the verification line right at the HIRED moment, after selection is already final (`setHiredStyle` at :542) and before the build/pay calls (:550-552). The line is purely a `say(...)` append to the comms thread — it cannot affect selection or payment.

For reference, the hire region today:
```
537  const winner = open.result.candidates.find((a) => a.agentId === evald.result.selectedAgentId);
...
542  setHiredStyle(winnerStyle);
543  if (winner) {
544    say("orchestrator", "Hiring Agent", `@${winner.name} — you're hired. …`);
       // ← INSERT the verification line HERE (still inside this if-block)
545    await sayLive(winner.name, winnerStyle, "…", PERSONAS[winnerStyle].hireAck, …);
546  }
```

### CRITICAL data-source finding (must follow)
`winner` at line 537 is taken from **`open.result.candidates`** — the RAW orchestrate stream result. That object does **NOT** carry the progressively-merged `verification`. Verification is merged into the separate `candidates` **state** by `mergeVerification` (called at line 486, fire-and-forget). Therefore `winner.verification` will almost always be `undefined` even when a verdict exists.

**Resolve the winner's verification from the `candidates` state by `agentId`, not from the closure `winner`:**
```ts
const winnerVerification =
  candidates.find((c) => c.agentId === winner.agentId)?.verification;
```
(`candidates` is in scope via the component closure; the handler already lists `candidates` in its `useCallback` deps at line 582, so this read is consistent with that dependency.)

Because the merge is progressive and may not have completed by the hire moment (it is deliberately off the critical path), the line MUST gracefully handle `undefined`:
- `winnerVerification?.status === "verified"` → `"Counterparty A-Pass: ✓ verified"`
- `winnerVerification?.status === "unverified"` → `"Counterparty A-Pass: ✗ unverified — KYC pending"`
- `undefined` or `status==="unavailable"` → **emit NO line** (so exactly one line is emitted only when there is a concrete verdict; and when Cleanverse is unconfigured, zero lines — parity with `001-agentmarket`). This keeps "exactly one" honest: one line iff a real verdict exists.

So:
```ts
if (winnerVerification && winnerVerification.status !== "unavailable") {
  say(
    "orchestrator",
    "Hiring Agent",
    winnerVerification.status === "verified"
      ? "Counterparty A-Pass: ✓ verified"
      : "Counterparty A-Pass: ✗ unverified — KYC pending"
  );
}
```
Place this between lines 544 and 545.

**Do NOT touch the fallback hire path** (lines 562-577, the `catch` branch). FR-009 asks for one line on the normal hire; the degraded path is intentionally minimal and out of scope. (If desired later, the same pattern applies, but keep C1 to the primary path to guarantee "exactly one" and avoid double-emit.)

---

## Acceptance (SPEC §12)
- **AC-4:** Modal shows the verification status and verified wallet address; for an unverified agent it shows a working magic-link button to `onboardUrl`. For unconfigured/`unavailable`, the row is absent (no regression).
- **AC-5:** The Hiring Agent emits exactly ONE verification line on hire (when a concrete verdict exists); it does NOT change the winner (selection already finalized at :542) or payment (`runPayment` at :552 is untouched). With Cleanverse unconfigured, zero lines and identical flow.
- **Test gate:** `cd app && npx tsc --noEmit` clean + `npm run build` succeeds before done.

---

## Guardrails
- **Honesty (constitution):** Modal and hire line reflect the real Cleanverse verdict. Never display "Verified"/"✓ verified" without a real `verified:true` / `status==="verified"`. Magic-link href is exactly `verification.onboardUrl` — never fabricated.
- **Zero-regression:** Modal row and hire line both render/emit nothing when `verification` is `undefined` or `status:"unavailable"`. With `CLEANVERSE_*` unset, the modal and comms thread are identical to `001-agentmarket`.
- **Scope fence — selection/payment untouched:** The hire line is a pure `say(...)` append AFTER selection is final and BEFORE/independent of `runPayment`/`runRating`. It MUST NOT read into or alter `winner`, `winnerStyle`, `runBuild`, `runPayment`, or `runRating`. NO payment blocking, NO aUSDC/settlement, NO winner re-weighting. Exactly one line, primary hire path only (no double-emit, fallback path untouched).
- **Disjointness:** Files are `AgentReviewsModal.tsx` + `page.tsx` only — zero overlap with AGNTM-5's `VerifiedBadge.tsx` + `AgentCandidateCard.tsx`. Safe to run fully in parallel.
