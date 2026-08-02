# Plan — AGNTM-5 (CLN-5): VerifiedBadge component + card integration

**Goal:** Add a new `VerifiedBadge` component and render it top-left on each `AgentCandidateCard`, reflecting `agent.verification`. Satisfies FR-007 and SPEC §8 (badge states table). Honesty: "Verified" is shown ONLY on a real `verified:true` from the Cleanverse API.

**FRs / Spec:** FR-007; SPEC §8 (badge states), §12 AC-2 (correct state per verification, verified only on real `verified:true`), AC-3 (zero-regression visual parity when unconfigured).

**Depends on:** AGNTM-4 (CLN-4) — `Agent.verification?: AgentVerification` already exists in `app/lib/types.ts` and is progressively merged into candidate state in `page.tsx`. This ticket reads that field only.

**Disjoint from AGNTM-6:** This ticket touches `VerifiedBadge.tsx` + `AgentCandidateCard.tsx` ONLY. It does **NOT** touch `page.tsx` (see the badge-state decision below — the chosen approach needs no prop from page.tsx). AGNTM-6 touches `AgentReviewsModal.tsx` + `page.tsx`. No file overlap → fully parallel-safe.

---

## Files to touch
- `app/app/components/VerifiedBadge.tsx` — NEW component.
- `app/app/components/AgentCandidateCard.tsx` — render the badge top-left.

`AgentCandidateCard` already receives the full `agent: Agent` prop, so it has `agent.verification` directly. **No page.tsx change is needed.**

---

## Badge-state decision — "Checking vs Hidden when `verification === undefined`"

**Decision: render NOTHING when `verification === undefined`. No `cleanverseAvailable` prop. No page.tsx touch.**

The card maps `agent.verification` to exactly three render outcomes:

| `agent.verification` | Render |
|---|---|
| `status === "verified"` (and `verified === true`) | green pill, `BadgeCheck`, "A-PASS" |
| `status === "unverified"` | amber pill, `ShieldAlert`, "UNVERIFIED" |
| `status === "unavailable"` | `null` (hidden) |
| `undefined` (not yet checked) | `null` (hidden) |

**Why collapse "Checking" into "hidden" rather than thread a `cleanverseAvailable` prop:**
- SPEC §8 defines "Checking" as `verification===undefined` AND Cleanverse available. The card cannot distinguish "Cleanverse available but result still in flight" from "Cleanverse unconfigured" without a signal from page.tsx — and the only honest signal is the `available` flag from `/api/cleanverse/verify`, which lives in page state. Threading it as a prop would force a `page.tsx` edit, creating a write-conflict surface with AGNTM-6 and breaking the disjoint guarantee.
- The merge in `page.tsx` is fire-and-forget and fast (one dedup'd request right after candidates load). A transient "CHECKING…" pulse would flash on every cold load and, critically, would **also show when Cleanverse is unconfigured** (because `undefined` is indistinguishable without the prop) — directly violating AC-3 / G5 (zero-regression Blitz look). Rendering nothing while `undefined` guarantees: when env is unset, badges never appear and there is zero layout shift.
- Net behavior: badges simply pop in (verified/unverified) once the verification object merges; before that there is no badge — visually identical to the existing Blitz build until a concrete verdict exists. This is the safest, highest-fidelity-to-honesty choice.

**Trade-off (documented, accepted):** the explicit muted "CHECKING…" pulse from SPEC §8 is not rendered in C1. The pulse is purely cosmetic; its omission is a strict subset of "hidden until concrete" and costs nothing for the demo. If a Checking pulse is later wanted, it is a follow-up that adds a `cleanverseAvailable` boolean prop threaded from page state (page.tsx `d.available`) — at which point it MUST be sequenced after AGNTM-6 or coordinated, since it introduces a page.tsx edit. **For C1 we deliberately do NOT do this**, to keep AGNTM-5 and AGNTM-6 disjoint.

The `VerifiedBadge` component will still accept the `verification` value and internally return `null` for both `undefined` and `"unavailable"`, so the card's call site stays trivial: `<VerifiedBadge verification={agent.verification} />`.

---

## Approach

### 1. `app/app/components/VerifiedBadge.tsx` (new)
- `"use client";` (presentational; consistent with sibling components).
- Import `BadgeCheck`, `ShieldAlert` from `lucide-react`; import `type { AgentVerification } from "@/lib/types"`.
- Signature: `export default function VerifiedBadge({ verification }: { verification?: AgentVerification })`.
- Logic:
  - If `!verification || verification.status === "unavailable"` → `return null;`
  - If `verification.status === "verified" && verification.verified === true` → green pill, `BadgeCheck` size ~11, label `A-PASS`. (Belt-and-suspenders honesty: require BOTH `status==="verified"` and `verified===true`; never trust one alone.)
  - Else (`status === "unverified"`, or any non-verified concrete status) → amber pill, `ShieldAlert` size ~11, label `UNVERIFIED`.
- Visual tokens (match the existing card aesthetic — Blitz mono pill language, mirroring the HIRED pill style at AgentCandidateCard.tsx:40-42 and the chip style at :57):
  - Verified: `rounded-full border border-emerald-400/40 bg-emerald-400/[0.12] px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-emerald-300` + icon.
  - Unverified: `rounded-full border border-amber-400/40 bg-amber-400/[0.10] px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.15em] text-amber-300` + icon.
  - Use a flex row `flex items-center gap-1` for icon + label. Keep it compact so it never overlaps the avatar/name row.
  - Add a `title` attribute echoing the status (e.g. `title="Cleanverse A-Pass: verified"` / `"unverified — KYC pending"`) for hover clarity. Do not add new dependencies.

### 2. `app/app/components/AgentCandidateCard.tsx` (integrate, top-left)
- Import the new component: `import VerifiedBadge from "./VerifiedBadge";`.
- Placement constraints (read current file):
  - Card root is `relative` (line 22-32). Top-right is occupied by the REVIEWS hover chip (`absolute right-3 top-3`, lines 34-38) and the HIRED pill (`absolute -top-2.5 right-3`, lines 39-43). **Top-left is free.**
  - Add the badge as an absolutely-positioned element at top-left so it does not push the avatar/name row or change card height when hidden (preserves layout / no shift): e.g. immediately after the REVIEWS/HIRED blocks, render:
    ```tsx
    <div className="absolute left-3 top-3 z-10">
      <VerifiedBadge verification={agent.verification} />
    </div>
    ```
  - Because `VerifiedBadge` returns `null` when there is no concrete verification, the absolute wrapper renders an empty div with no visual footprint — zero layout impact when unconfigured (AC-3). (Optional micro-optimization: only render the wrapper when `agent.verification` is truthy, but the `null` return already guarantees no footprint; keep it simple.)
  - The avatar starts at the card's content flow (line 44, `flex items-start gap-3` with `pl` from card padding `p-3.5`). A top-left absolute badge at `left-3 top-3` sits in the corner above/left of the avatar; verify visually it does not overlap the avatar icon (10x10 at the content origin). If there is any overlap on the narrowest rail width, nudge the badge with a slightly smaller scale or move to `left-2 top-2`; do NOT reflow the avatar row. Keep the badge `z-10` so it layers above the card border but the REVIEWS chip (top-right) is unaffected.

---

## Acceptance (SPEC §12)
- **AC-2:** Each card renders the correct badge state driven by `agent.verification`: green "A-PASS" only when `verified === true`; amber "UNVERIFIED" for `status==="unverified"`; nothing for `undefined`/`"unavailable"`. "Verified" never appears without a real `verified:true`.
- **AC-3 (visual parity):** With `CLEANVERSE_*` unset, verification stays `undefined`, the badge renders `null`, and the card is pixel-identical to `001-agentmarket` — no badge, no layout shift, no console error.
- **Test gate:** `cd app && npx tsc --noEmit` clean + `npm run build` succeeds before marking done.

---

## Guardrails
- **Honesty (constitution):** Never show "Verified" without a real `verified:true` from the API. Require `status==="verified"` AND `verified===true`. Render only what `agent.verification` carries — never synthesize a verified state.
- **Zero-regression:** Badge is hidden (renders `null`, no DOM footprint) when `verification` is `undefined` or `status:"unavailable"`. No layout shift when unconfigured. Top-left absolute placement must not collide with the HIRED pill or REVIEWS chip (both top-right).
- **Scope fence:** UI badge ONLY. NO modal change (AGNTM-6), NO `page.tsx` change, NO hire line (AGNTM-6), NO payment blocking, NO aUSDC/settlement. Do not add a `cleanverseAvailable` prop (would force a page.tsx edit and break disjointness from AGNTM-6).
- **Disjointness:** Files are `VerifiedBadge.tsx` (new) + `AgentCandidateCard.tsx` only — zero overlap with AGNTM-6's `AgentReviewsModal.tsx` + `page.tsx`. Safe to run fully in parallel.
