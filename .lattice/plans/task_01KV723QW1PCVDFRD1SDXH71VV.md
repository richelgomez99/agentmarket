# AGNTM-10 — Unverified contrast demo agent

**Goal:** rail shows real verified-vs-unverified contrast (one amber UNVERIFIED badge).

**Approach (no wallet-update fn exists; agent wallet = registrant msg.sender):**
1. Generate a fresh wallet W (no A-Pass → verify_apass = code 2, unverified).
2. Fund W with ~0.5 MON from OWNER (registration gas).
3. `register` an agent FROM W → newId; `getAgentWallet(newId) = W`.
4. Confirm `verify_apass(W)` = unverified.
5. Wire: replace the **glass slot** in `AGENT_IDS` (lowest history, 1766) with `newId` → 3 verified + 1 unverified newcomer; keeps the 4-style UI intact.
6. Save W key to gitignored `.env.local`; restart dev; verify the amber UNVERIFIED badge renders on GlassAgent and others stay green.

**Files:** `app/scripts/register-unverified-agent.ts` (new), `app/.env.local` (AGENT_IDS + W key, gitignored).
**Acceptance:** rail shows exactly one UNVERIFIED agent (real on-chain fresh wallet), 3 verified; unverified badge + modal KYC-magic-link path render; honesty preserved (real chain state).
