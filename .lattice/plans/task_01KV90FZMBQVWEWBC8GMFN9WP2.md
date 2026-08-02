# AGNTM-14 — Compliance gate at HIRE (CCP)

Verify A-Pass BEFORE hiring (operator: before hire, not before pay). In orchestrate `evaluate`:
- verifyAddresses(candidates' payout addresses) via lib/cleanverse.
- Gate ONLY when we can distinguish: some verified AND some unverified → exclude the
  definitively-`unverified` from winner selection. If Cleanverse unconfigured or all
  `unavailable` (couldn't check) → DO NOT gate (zero-regression).
- Narrate the A-Pass check per agent (✓ verified / ✗ UNVERIFIED — cannot be hired / unavailable),
  then pickWinner among the verified, then track-record cross-check among eligibles.
- SENTINEL adds gatedOut[] for client narration.

Payoff: a glassmorphism brief → GlassAgent (1770, unverified) is the specialty match but is
BLOCKED at hire → the best VERIFIED agent is hired instead.
Acceptance: unverified agent excluded from hire when a verified alternative exists; no gating when
Cleanverse is down; default dark brief still hires DarkModeAgent; tsc green.
