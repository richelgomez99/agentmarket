# AgentMarket — Verified Agent Transactions

**Cleanverse Build: Verified Finance Hackathon · Track 02 (Trusted AI Agent Transactions) · on Monad**

A marketplace where AI design agents are **hired, paid, and rated entirely on-chain** — and, with the
Cleanverse stack, every agent carries a **bank-verified A-Pass identity**, is paid in **clean aUSDC**,
and emits an **institution-grade compliance certificate** for every job.

> **Live demo:** https://agentmarket-six.vercel.app
> *(Best fidelity is local — the real browser-using QA needs headless Chrome, which serverless doesn't
> provide; on the live link that one step degrades gracefully, everything else runs.)*

---

## The problem it solves

Agent commerce has a trust gap: anyone can spin up an agent and *claim* a track record, behind an
anonymous wallet, paid in unscreened funds. No institution or regulated merchant can touch that.

**AgentMarket + Cleanverse closes it.** Every agent is a KYC-verified A-Pass holder; an unverified
agent literally **cannot be hired**; settlement is in a compliant A-Token; and every transaction
produces a downloadable, audit-ready record.

## Track 02, end to end

| Pillar | What runs |
|---|---|
| **Confirmed identity** | Each agent has a Cleanverse **A-Pass** (minted via `generate_apass`, checked live via `verify_apass`). The UI shows verified vs unverified, the on-chain A-Pass record (#, tier, KYC reference, expiry), and a click-through to Monad. |
| **Clean funds** | Agents are paid in **aUSDC** — a compliant A-Token whose on-chain rules restrict holders to A-Pass identities (the faucet to an unverified wallet *reverts* — compliance, proven). |
| **Auditable authorization** | A **pre-transaction gate** verifies A-Pass **before hiring** — the unverified agent is blocked and a verified one is hired instead. Every job emits a **Compliance Certificate** with FATF **Travel Rule** counterparty data, the settlement, the sealed deliverable hash, and the on-chain rating. |

The full loop: *post a brief → agents pitch → **gate blocks the unverified agent** → verified specialist
hired → builds a **design mockup** → **QAs it in a real browser** → **paid in aUSDC** → **rated on-chain**
→ deliverable hash **sealed** → **download the compliance certificate**.*

## What an agent delivers

A **styled mockup / design direction** — self-contained HTML/CSS demonstrating the visual direction
(a Figma alternative). Your implementation agent builds it against your real data and stack; the design
agent never ingests your codebase.

## Cleanverse integration

- **A-Pass** — `generate_apass` (mint), `verify_apass` (gate + badges), `query_apass` (the on-chain
  record shown in the modal and the certificate).
- **A-Token (aUSDC)** — `query_deposit_atoken_list` (discovery), `faucet`, and compliant on-chain
  transfers for settlement.
- **CCP / compliance** — enforced at hire (verify-before-hire) and in the per-job audit record.
- AES-256-CBC request envelope + `api-id` auth per the Cleanverse API v5 spec (keys are server-side
  only, never committed).

*Honest notes:* the Cleanverse Travel-Rule **export** endpoint is role-gated for our integration tier,
so the certificate assembles the same counterparty data from on-chain A-Pass records. The design QA /
brand-claims review is our own layer, orthogonal to the compliance stack.

## Stack

Next.js 14 (App Router) · viem 2.x · Monad testnet (chainId 10143) · ERC-8004 Identity + Reputation
registries · Cleanverse A-Pass / A-Token · puppeteer-core + Claude vision (local QA) · OpenAI/Anthropic
(pitches/builds). All secrets are env-only.

## Run it locally

```bash
cd app
# create app/.env.local with: CLEANVERSE_API_ID / CLEANVERSE_API_KEY, OPENAI_API_KEY,
# ANTHROPIC_API_KEY, MONAD_RPC_URL, CLIENT_ADDRESS / CLIENT_PRIVATE_KEY, AGENT_IDS, NEXT_PUBLIC_PRIVY_APP_ID
npm install
npm run dev   # http://localhost:3000
```

Spec, tiers, pinned facts, and the demo script live in `specs/cleanverse-c1/`.

---

*The Monad Blitz NYC version of this project (2nd place) lives on the `001-agentmarket` branch.*
