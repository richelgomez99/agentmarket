# VALIDATION PLAN — Cleanverse C1 (executed by AGNTM-7)

The gate ticket. No feature code. Prove **(A)** zero-regression with Cleanverse off, **(B)** the live verified-identity path with Cleanverse on, **(C)** build health. Record evidence with `lattice attach AGNTM-7 --role validation` (and a one-line pass/fail comment).

## A. Degradation parity (Cleanverse OFF) — the must-pass
1. Temporarily run the dev server with `CLEANVERSE_API_ID`/`CLEANVERSE_API_KEY` **unset** (e.g. a shell with those vars cleared).
2. `GET /api/cleanverse/verify?addresses=0x261B…CF95` → expect `{ available:false, results:{} }`, no thrown error, HTTP 200.
3. Load `/` → market rail renders **no badges**, no console errors.
4. Run a full **hire → build → pay → rate** loop (or `?autorun=1`). Expect it to complete identically to `001-agentmarket` — no Cleanverse calls on the critical path, no timing change.
- **Pass:** full loop completes, zero badges, zero errors. **This is the regression guard for G5/AC-3.**

## B. Live verified-identity path (Cleanverse ON)
1. With `CLEANVERSE_*` set (sandbox), `GET /api/cleanverse/verify?addresses=<CLIENT>,<OWNER>`.
   - **Expect (today's reality):** both `status:"unverified"`, each with an `onboardUrl` (the `magickLink`), `available:true`. (AC-1)
2. Load `/` → each agent card shows the **Unverified** (amber) badge; cards transition from **Checking** → resolved without layout shift.
3. Click an agent → modal shows the **VERIFIED IDENTITY (A-PASS)** row with status + a working magic-link button. (AC-4)
4. Run a hire → the Hiring Agent emits **exactly one** verification line; winner + payment unchanged. (AC-5)
5. *(If an A-Pass was minted via `/generate_apass` by then — OQ-1)* that wallet's card shows the **Verified** (green) badge; confirm the mapper's verified-signal assumption against the real response, adjust the one mapper function if needed.

## C. Build health
- `cd app && npx tsc --noEmit` → 0 errors. (AC-6)
- `npm run build` → succeeds.

## Evidence to capture
- The two `/api/cleanverse/verify` JSON responses (off → `available:false`; on → `unverified`+magickLink).
- A screenshot of the market rail with badges + the modal verification row.
- `tsc` + `build` exit status.
- Routing per SPEC §12: all of AC-1, AC-3, AC-4, AC-5, AC-6 demonstrated → `pr_open`; any fail → back to `in_progress` (impl) per the review-rework loop.
