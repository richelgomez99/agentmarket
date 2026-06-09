<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->

# AgentMarket — Project Guide for Coding Agents

AgentMarket is a Monad Blitz NYC hackathon build (hard deadline 6pm, 2026-06-09): a
marketplace of specialist AI design agents with provable, on-chain-earned reputation. An
orchestrator agent discovers registered agents, hires the best by reputation, watches it
generate a UI live, pays it on-chain, and writes its reputation on-chain.

## Source of truth (read these first)
- **`.specify/memory/constitution.md`** — v1.0.0, 7 non-negotiable MUST principles. Governs
  all work. The pinned facts in Principle III are IMMUTABLE.
- **`BUILD_SHEET.md`** — operational plan + tier ladder + 90-second demo script.
- **`Agent Arena- … Monad Blitz NYC.md`** — real ERC-8004 / x402 / Privy / Foundry specifics.
- **`AgentMarket.md`** — the Spec Kit (SDD) setup + PRD guide.

## Non-negotiables (summary — full text in the constitution)
- **Demo-first tiering:** build strictly T1→T2→T3→T4→T5; never start tier N+1 until tier N
  runs end-to-end AND is committed.
- **Test gate per tier:** build passes + dev server starts clean + tier smoke test passes →
  commit. Never build on red.
- **Pinned facts (never alter):** Monad chainId `10143`, RPC `https://testnet-rpc.monad.xyz`;
  IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e`; ReputationRegistry
  `0x8004B663056A597Dffe9eCcC1965A193B7388713`; `giveFeedback(uint256 agentId, int128 value,
  uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32
  feedbackHash)` (NO auth param; caller ≠ agent owner); x402 facilitator
  `https://x402-facilitator.molandak.org`, network `eip155:10143`, USDC
  `0x534b2f3A21130d7a60830c2Df862319e593943A3` (6 decimals).
- **Payment fallback:** x402 first; on failure, direct USDC/MON transfer; UI surfaces the path.
- **Scope guard:** design agents GENERATE self-contained HTML+inline-CSS, render in sandboxed
  iframes; they never ingest/transform a codebase.
- **Stack lock:** `monad-developers/next-serwist-privy-embedded-wallet` (web) +
  `monad-developers/foundry-monad` (contracts). Monad Foundry fork (`curl -L
  https://foundry.category.xyz | bash`), NOT standard Foundry. viem 2.40+. Secrets env-only;
  LLM keys server-side only.
- **Official-skills-first:** prefer the MONSKILLS bundle (`.claude/skills/monskill`) for all
  Monad work (faucet, contract dev/deploy, frontend deploy, indexing).

## Tooling
- **Spec Kit** (`/speckit-*` skills): constitution → specify → clarify → plan → tasks →
  analyze → implement. Artifacts in `.specify/` and `specs/`.
- **MONSKILLS** (`/monskill`): start here for any Monad-specific task; it routes to the right
  sub-skill.

## Skill routing
When the user's request matches an available skill, invoke it via the Skill tool.
- Monad faucet / contract deploy / frontend deploy / indexing → invoke /monskill first
- QA / "does this work?" / per-tier smoke test → invoke /qa or /browse
- Bugs/errors → invoke /investigate
- Code review before a commit → invoke /code-review (or /review)
- Design system / variant generation / visual polish → invoke /design-consultation,
  /frontend-design, /ui-ux-pro-max, or /design-review
- Save / resume working context → invoke /context-save or /context-restore

## GBrain Configuration (configured by /setup-gbrain)
- Mode: local-stdio
- Engine: pglite
- Config file: ~/.gbrain/config.json (mode 0600)
- Setup date: 2026-06-09
- MCP registered: yes (user scope) — restart sessions to load `mcp__gbrain__*` tools
- Artifacts sync: off
- Current repo policy: unset (no git remote yet)
