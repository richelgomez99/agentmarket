# AgentMarket — Cleanverse Track 02 Demo Script (~90–110s)

**Track 02: Trusted AI Agent Transactions.** Record **locally** (`localhost:3000`) for full fidelity
(real vision QA, no serverless build cuts). One input drives the whole demo.

> **THE INPUT (type this brief — do NOT use the default):**
> *"A frosted glassmorphism fintech dashboard — translucent blurred glass cards, soft light, depth and blur."*
>
> Why glass: GlassAgent is the *specialty match* for this brief **but is unverified** → the compliance
> gate must **block it** and hire a verified agent instead. That's the money beat.

**Before recording:** hard-refresh once and do one throwaway run to warm the LLMs (first run is cold).

---

## The one-liner (say up top)
> "AgentMarket is a marketplace where AI design agents are **hired, paid, and rated entirely on-chain** —
> and with Cleanverse, every agent is a **KYC-verified A-Pass holder**, paid in **clean aUSDC**, with a
> **compliance certificate** for every job. It's verified agent commerce an institution could actually use."

---

## Beats

| # | ~time | On screen | Say (VO) | Track 02 pillar |
|---|---|---|---|---|
| 1 | 0–10s | The market rail: 4 agents, **3 green ✓ A-PASS, 1 amber UNVERIFIED** (GlassAgent) | "Four specialist agents. Three are **KYC-verified** — one isn't. Watch what that means." | **Identity** |
| 2 | 10–18s | Click GlassAgent → modal: **VERIFIED IDENTITY** absent / vs a verified agent's **A-Pass #, tier, KYC hash, VIEW WALLET ON MONAD** | "Verification isn't a label — it's an on-chain A-Pass you can click through to Monad." | Identity |
| 3 | 18–25s | Type the glass brief → Hire | "I post a brief that's a perfect match for the glassmorphism specialist…" | — |
| 4 | 25–45s | Agents pitch → **HIRING AGENT reasoning shows the gate**: `GlassAgent ✗ UNVERIFIED — cannot be hired` → **⛔ comms block line** → a **verified** agent hired | "…but the **compliance gate** checks every agent's A-Pass **before hiring**. The unverified specialist is **blocked** — only a KYC'd agent gets the job." | **Gate (CCP)** |
| 5 | 45–65s | Build streams into the iframe; **hired agent's real QA**: "rendered in a real browser… " findings | "The hired agent builds the **mockup** and **QAs its own work in a real browser** — it actually looks at the page." | (craft) |
| 6 | 65–80s | PAYMENT panel: **$0.01 aUSDC · compliant A-Token**, real tx | "Payment settles in **aUSDC — a compliant A-Token**. Clean money, on-chain, only verified wallets can hold it." | **Clean funds** |
| 7 | 80–95s | REPUTATION ★ updates on-chain; comms: "deliverable hash sealed… provable delivery" | "Reputation is written to the **ERC-8004 registry**, and the deliverable's **hash is sealed on-chain** — provable delivery." | Identity/audit |
| 8 | 95–110s | Click **DOWNLOAD COMPLIANCE REPORT** → the **Compliance Certificate** opens (seal, Travel Rule counterparties, attestations) | "And every job emits an **institution-grade compliance certificate** — **Travel Rule** counterparties, clean settlement, full audit trail. **That's** verified agent commerce." | **Auditable** |

**Closer (over the certificate):**
> "Identity, clean funds, auditable authorization — the whole Track 02 stack, running live on Monad."

---

## Q&A ammo (judges)
- **"Is the A-Pass real?"** Yes — minted via Cleanverse `generate_apass` (real Monad tx), checked live with `verify_apass`; the certificate shows both parties' KYC records. Click "VIEW WALLET ON MONAD."
- **"Is the payment real aUSDC?"** Yes — a real on-chain aUSDC (A-Token) transfer; the token's rules reject non-A-Pass holders (we proved it: the faucet to an unverified wallet reverts).
- **"What does the agent actually deliver?"** A **styled mockup / design direction** (self-contained HTML/CSS) — your implementation agent builds it against your real data. It's a Figma-alternative, not a codebase rewrite.
- **"Travel Rule export?"** Cleanverse's export endpoint is role-gated for our tier; the certificate assembles the same counterparty data from on-chain A-Pass records.
- **"What's not verified-by-Cleanverse?"** The design QA / brand-claims review is our own layer — orthogonal to the compliance stack.

## Failure drills
- If a build runs long/empty locally: it won't (no serverless limit locally). If an LLM hiccups, just re-run — degraded mode still completes the full loop.
- If Cleanverse is slow: badges/gate degrade gracefully (no false "verified"); re-run.
