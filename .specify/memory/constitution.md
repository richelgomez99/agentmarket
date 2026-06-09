<!--
SYNC IMPACT REPORT
==================
Version change: (template / unversioned) → 1.0.0
Bump rationale: Initial ratification of the AgentMarket project constitution.

Principles defined (7, all MUST / non-negotiable):
  I.   Demo-First Tiering (NON-NEGOTIABLE)
  II.  Test Gate Per Tier
  III. Pinned External Facts (IMMUTABLE)
  IV.  Payment Fallback
  V.   Scope Guard
  VI.  Stack Lock & Secret Hygiene
  VII. Official-Skills-First

Added sections: Core Principles (I–VII); Additional Constraints (Pinned Facts
  Reference); Development Workflow & Quality Gates; Governance.
Removed sections: none (initial version).

Templates reviewed for consistency:
  ✅ .specify/templates/plan-template.md  — Constitution Check gate reads this
      file at plan time; aligns with Principles I & II. No edits required.
  ✅ .specify/templates/spec-template.md  — scope language compatible with
      Principle V (Scope Guard). No edits required.
  ✅ .specify/templates/tasks-template.md — tiered / test-gate task ordering is
      compatible with Principles I & II. No edits required.
  ✅ .claude/skills/speckit-*/SKILL.md    — generic guidance; no stale agent
      references requiring edits.

Follow-up TODOs: none. All placeholders resolved.
-->

# AgentMarket Constitution

AgentMarket is a marketplace of specialist AI design agents with provable, on-chain-earned
reputation on Monad: an orchestrator agent discovers registered agents, hires the best by
reputation, watches it generate a UI live, pays it on-chain, and writes its reputation
on-chain. This constitution governs how the project is built under a hard hackathon deadline.
Its prime directive: **always have something real to demo.**

## Core Principles

### I. Demo-First Tiering (NON-NEGOTIABLE)

The build MUST always be in a working, demoable state. Implementation MUST proceed strictly
in this tier order, top-down, never skipping ahead:

- **T1** — Live design generation (no chain).
- **T2** — Orchestrator agent + on-chain registry discovery.
- **T3** — On-chain payment.
- **T4** — On-chain reputation write.
- **T5** — Polish + live explorer.

Work MUST NOT begin on tier N+1 until tier N runs end-to-end **and** is committed to git.
There MUST NEVER be a state where "nothing works because the last piece isn't wired." Every
tier is independently demoable; if time runs out at any tier, the prior committed tier is the
demo. Rationale: the riskiest pieces are on-chain; building the guaranteed-to-work visual
layer first means a winning demo always exists.

### II. Test Gate Per Tier

After every tier, before proceeding, ALL of the following MUST hold:

- The app MUST build (production build succeeds).
- The dev server MUST start clean (no errors on boot).
- A smoke test of **that tier's user flow** MUST pass.

Only when the gate is green does work commit and advance. The project MUST commit at each
green checkpoint (one commit per passed tier, minimum). A failing gate blocks the next tier —
fix forward or revert to the last green commit; never build on red.

### III. Pinned External Facts (IMMUTABLE)

The following values are canonical and MUST NEVER be altered, "corrected," or hallucinated.
Code, config, and prompts MUST reference exactly these:

| Fact | Value |
|---|---|
| Monad testnet chain ID | `10143` |
| Monad RPC | `https://testnet-rpc.monad.xyz` |
| ERC-8004 IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ERC-8004 ReputationRegistry | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| x402 facilitator | `https://x402-facilitator.molandak.org` |
| x402 network identifier | `eip155:10143` |
| Testnet USDC (6 decimals) | `0x534b2f3A21130d7a60830c2Df862319e593943A3` |

The current, canonical `giveFeedback` signature MUST be used verbatim — there is **NO
signature-auth parameter** (older `uint8 score` + `feedbackAuth` drafts are deprecated and
MUST NOT be used):

```
giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2,
             string endpoint, string feedbackURI, bytes32 feedbackHash)
```

The feedback caller MUST NOT be the agent's owner/operator (on-chain anti-self-feedback is
enforced via the Identity Registry). Therefore agents MUST be registered/owned by a different
EOA than the "client"/orchestrator EOA that writes feedback. Reputation is a signed
fixed-point pair: `value` (int128) + `valueDecimals` (e.g. value=9977, valueDecimals=2 →
99.77). These facts MUST be re-confirmed live on the explorer before wiring, but MUST NOT be
silently changed in code without an explicit constitution amendment.

### IV. Payment Fallback

Payment MUST attempt **x402 first** (facilitator + network + USDC per Principle III). If x402
settlement fails or the facilitator is unreachable, the system MUST fall back to a direct
USDC `transfer` (or a MON transfer) to the agent's payout address. Either way it is a real
on-chain payment. The UI MUST surface **which path was used** (x402 vs. direct transfer).
The build MUST NOT sink demo time chasing x402 purity — the fallback is a first-class,
always-ready path, not an afterthought.

### V. Scope Guard

Design agents MUST **generate** a self-contained HTML document with inline CSS from a brief,
and render it in a sandboxed `<iframe sandbox>` (without `allow-same-origin`). Design agents
MUST NEVER ingest, parse, or transform an arbitrary user codebase. LLM output is untrusted
content: output MUST be constrained hard (complete `<!DOCTYPE html>`, inline `<style>` only,
no JS, no external URLs, no markdown fences), with a per-style hard-coded fallback HTML and a
timeout so a slow/failed call still renders something. This bounds the attack surface and
guarantees the visual centerpiece is reliable.

### VI. Stack Lock & Secret Hygiene

The web app MUST be built on `monad-developers/next-serwist-privy-embedded-wallet`; contracts
MUST be built on `monad-developers/foundry-monad`. This project uses **Monad Foundry** (a
custom Foundry fork installed via `curl -L https://foundry.category.xyz | bash`), NOT standard
Foundry, and **viem 2.40+** (native Monad testnet support) for chain reads/writes. Privy
embedded wallets, EVM, Monad testnet. Dependencies MUST be kept minimal.

Secrets MUST come from environment variables only — never hardcoded, never committed. LLM /
provider API keys MUST be server-side only (Next.js API routes / server code) and MUST NEVER
be shipped to the client bundle.

### VII. Official-Skills-First

For all Monad-specific work — faucet, smart-contract dev/deploy, frontend dev/deploy,
indexer/indexing — the official Monad skills bundle (**MONSKILLS**, `skills.devnads.com`)
MUST be preferred over hand-rolled chain plumbing. Conflict resolution is fixed: where the
official skills and this project's `BUILD_SHEET.md` disagree on Monad specifics, **the
official skills win** (they are current); where `BUILD_SHEET.md` (or the Agent Arena guide)
covers ERC-8004 / x402 details the skills do not, **the build sheet wins**.

## Additional Constraints — Pinned Facts Reference

Supporting (non-canonical-but-useful) endpoints, consistent with Principle III:

- Explorers: `https://testnet.monadexplorer.com`, `https://testnet.monadscan.com`,
  `https://monad-testnet.socialscan.io` (use for live tx/explorer panels).
- Faucets: `https://faucet.monad.xyz` (MON gas), `https://faucet.circle.com` (testnet USDC,
  select Monad Testnet).
- x402 packages: `@x402/core @x402/evm @x402/fetch @x402/next` (use `@x402/evm >= 2.2.0` for
  the `exact` scheme; the Monad facilitator is x402 v2 only).
- Reputation has no on-chain aggregate score; compute it client-side via
  `getSummary(agentId, clientAddresses, tag1, tag2)` (clientAddresses MUST be non-empty) or by
  indexing `NewFeedback` events. This is the project's own aggregation — be ready to say so.

If any pinned fact in Principle III or this section is observed to differ live on the explorer
at the event, that is a constitution amendment event (see Governance), not a silent edit.

## Development Workflow & Quality Gates

- **Tier checkpoints (Principles I & II):** build → dev server clean → tier smoke test →
  commit. No advancing on red.
- **Pre-done vs. live:** staged beforehand — register the 3–4 agents on-chain (under owner
  EOAs distinct from the client EOA), fund a client wallet with MON + testnet USDC, pre-test
  style prompts + fallback HTML, prepare the input page. Live in demo — brief → generation →
  orchestrator picking by reputation → payment tx → reputation update.
- **Backup:** once the full flow works, record a screen capture as the on-stage safety net.
- **Public proof:** push to public GitHub; confirm contracts/txs are visible on a Monad
  explorer.
- **Honest claims only:** claim "job done and paid for" + "portable, on-chain-earned
  reputation," NOT cryptographic proof of design quality, a populated network, or on-chain
  Sybil-resistance.

## Governance

This constitution supersedes ad-hoc decisions for the duration of the build. All work
(including AI-agent-generated work) MUST comply with these principles; the Spec Kit
`/speckit.plan` Constitution Check gate MUST verify alignment before implementation, and any
deviation MUST be justified in writing or rejected.

- **Amendment procedure:** an amendment requires (a) an explicit edit to this file, (b) a
  version bump per the policy below, and (c) an updated Sync Impact Report. Pinned facts
  (Principle III) may only change via amendment, never silently in code.
- **Versioning policy (semantic):** MAJOR = backward-incompatible principle removal/
  redefinition or governance change; MINOR = new principle/section or materially expanded
  guidance; PATCH = clarifications, wording, non-semantic refinements.
- **Compliance review:** at each tier checkpoint, verify the tier's work against Principles
  I–VII before committing. Complexity or any departure from the locked stack MUST be justified
  against the demo-first directive or it MUST NOT ship.

**Version**: 1.0.0 | **Ratified**: 2026-06-09 | **Last Amended**: 2026-06-09
