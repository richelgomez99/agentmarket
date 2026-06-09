# AgentMarket × GitHub Spec Kit: A Build-Ready Setup & PRD Guide for Monad Blitz NYC (June 9, 2026)

## TL;DR
- **Use GitHub Spec Kit v0.10.0** (released June 9, 2026) initialized with **Claude Code** as the primary agent (`specify init . --integration claude`); run the workflow `/speckit.constitution → /speckit.specify → /speckit.clarify → /speckit.plan → /speckit.tasks → /speckit.analyze → /speckit.implement`, treating each of your five tiers as a separately implemented, separately demoable phase.
- **For a long-running, walk-away build, the consensus split is: plan/architect with Claude Code, grind autonomous implementation with Codex** — backed by a 500+ developer Reddit survey where ~65% preferred Codex day-to-day, yet blind reviews rated Claude Code's code cleaner 67% of the time. For a solo hacker on a 6pm deadline who wants ONE tool, use **Claude Code** (better frontend/UI output, deepest harness, lives in your local repo); if you have ChatGPT Plus/Pro and want true unattended runs, **Codex** is the stronger autonomous executor. Either works — don't burn time switching.
- **The constitution is your anti-drift weapon:** hard-code the exact Monad/contract addresses, the tier-sequencing rule ("always keep a working demo; never start tier N+1 until tier N is demoable"), a test gate after every tier, and the x402→USDC/MON payment fallback. Install prerequisites NOW: `uv`, Node 20+, Foundry (Monad fork), and your Anthropic/OpenAI + Privy keys.

## Key Findings

### Spec Kit is real, current, and exactly the right tool for this
GitHub Spec Kit is an open-source, agent-agnostic toolkit that scaffolds a spec-driven development (SDD) workflow into your repo. The latest release as of today is **v0.10.0, dated June 9, 2026** (v0.9.x releases shipped almost daily this month, so pin to the tag). It is a Python CLI (`specify`) installed via `uv`/`uvx` that drops slash-command prompt files and helper scripts into your project, then your coding agent executes the workflow through those commands. Its docs state it "works with 30+ AI coding agents — both CLI tools and IDE-based assistants" (Copilot, Gemini, Codex, Claude, Forge, Kiro, etc.), with 105 community extensions from 60+ authors and 200+ contributors per the official github.github.io/spec-kit site.

The workflow is a strict left-to-right dependency chain: **Constitution → Specify → (Clarify) → Plan → Tasks → (Analyze) → Implement.** You cannot plan before you specify or implement before you have tasks. Each step writes Markdown artifacts into your repo (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `tasks.md`) that become the durable, high-signal context the agent consumes — this is what keeps a long-running agent on track instead of re-inventing intent every session.

### The exact commands to run today
**Prerequisites** (install first): `uv` (Python package manager), Python 3.11+, Node.js 20+, Git, your chosen coding agent CLI (Claude Code or Codex), Foundry, and API keys.

**Install + init Spec Kit (Claude Code):**
```
# one-time, no install:
uvx --from git+https://github.com/github/spec-kit.git specify init agentmarket --integration claude
# OR persistent install pinned to current release:
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.10.0
specify init agentmarket --integration claude
# then:
cd agentmarket && claude
```
**For Codex** (skills mode):
```
specify init . --integration codex --integration-options="--skills"
```

**The slash commands (current v0.10.0 set):** `/speckit.constitution`, `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.taskstoissues`, `/speckit.implement` (core), plus optional `/speckit.clarify`, `/speckit.analyze`, `/speckit.checklist`. In Claude Code these appear as `/speckit.*`; in Codex skills mode they are invoked as `$speckit-*` (skills install to `.agents/skills`).

**Critical flag change:** As of v0.10.0 the legacy `--ai` flag is **removed entirely** — you MUST use `--integration <key>`. `--ai claude` will now error (it was deprecated-with-warning through 0.8.x–0.9.x). Also `--no-git` was removed; the git extension is now opt-in via `specify extension add git` after init.

### Claude Code vs Codex for this build
Both crossed the "ship real production code" coherence threshold in late 2025 (per Firecrawl's 2026 analysis: "The decision is no longer which model is smarter. It is which workflow you are in"); SemiAnalysis projects Claude Code will author >20% of all daily GitHub commits by end of 2026, up from ~4% (~135,000 commits/day) in February 2026. In 2026 the decision is workflow, not raw smarts. The recurring industry verdict:
- **Claude Code**: local terminal agent, deepest programmable harness (skills, hooks, subagents, plan mode), wins consistently on **frontend/UI work** (richer MCP + skill ecosystem), strong at planning and long-form reasoning over the repo, and higher per-task quality — Claude Code wins blind code-quality reviews 67% of the time vs Codex's 25% (CatDoes 2026 comparison). Best for "stay in the loop, fast iteration." The 1M-token context window is generally available at standard pricing for Claude Opus 4.6/Sonnet 4.6 (Anthropic, March 13, 2026; Opus 4.7 also 1M), with Opus 4.6 scoring 78.3% on MRCR v2 at 1M context — highest among frontier models.
- **Codex**: cloud/sandbox autonomous executor, tuned for **long-horizon unattended runs** — per CatDoes, "GPT-5-Codex worked independently for over 7 hours on complex tasks during OpenAI's internal testing, iterating and fixing test failures without handholding." Better raw instruction-following over long context, token-efficient (in a Figma-to-code benchmark Codex CLI used ~1.5M tokens vs Claude Code's ~6.2M for the same task — a ~4x efficiency gap, per NxCode 2026), with built-in `/review` and PR automation. Best for "queue it and walk away."

**My recommendation for AgentMarket:** This is a frontend-heavy build (live design-gen iframes, clean orchestrator-reasoning UI, live explorer view) wrapped around well-scoped on-chain plumbing. For a hackathon where you'll be in and out of the loop and judged partly on UI polish, **Claude Code is the better single pick** — its UI output and repo-native plan/iterate loop fit the time pressure, and its `/speckit.*` discovery is more reliable than Codex's (see Caveats). If you genuinely intend to leave for hours and want unattended grinding, run Codex on the backend/contract tiers. Many heavy users run both (plan in Claude, implement scoped tasks in Codex), but for a 6pm freeze, pick one and avoid context-switching overhead.

### Best practices to keep a semi-autonomous agent on track
From the SDD community and long-running-agent literature, the patterns that matter most for a walk-away build:
1. **Artifact-per-phase + clear context between phases.** The single most-cited success factor: store `research.md`/`spec.md`/`plan.md`/`tasks.md`, and start each implementation phase in a fresh context window. Large agents drift ("context rot") as the window fills, well below the hard limit.
2. **Phase the implementation so each phase is independently runnable and testable.** This maps perfectly onto your Tier 1–5 plan. After each phase the project should launch and pass tests — catch problems early.
3. **Use the optional quality gates.** Run `/speckit.clarify` before `/plan` (kills the #1 cause of agent derailment: underspecification) and `/speckit.analyze` after `/tasks` to catch spec↔plan↔tasks inconsistencies before any code is written.
4. **The constitution is non-negotiable, machine-checked context.** It lives in `.specify/memory/constitution.md`; the plan step runs a "Constitution Check" gate against its MUST principles.
5. **Tell the agent to test continuously and self-verify.** Spec Kit's `/implement` follows a TDD-ish approach and respects task dependencies + `[P]` parallel markers. Encode "run the test/lint/build after every task and fix failures before proceeding" as a constitution principle.

## Details: What to put in the Constitution, Spec, and Plan for AgentMarket

### Constitution (`.specify/memory/constitution.md`) — the anti-drift core
Write these as declarative, testable MUST principles via `/speckit.constitution`:
- **Demo-first tiering (most important):** "The build MUST always have a working, demoable state. Implement strictly in tiers: T1 live design generation (no chain) → T2 orchestrator + on-chain registry discovery → T3 on-chain payment → T4 on-chain reputation write → T5 polish + live explorer. Do NOT begin tier N+1 until tier N runs end-to-end and is committed to git."
- **Test gate per tier:** "After every tier, the app MUST build, the dev server MUST start clean, and a smoke test of that tier's user flow MUST pass before proceeding. Commit at each green checkpoint."
- **Pinned external facts (so the agent never hallucinates them):**
  - Monad testnet: chain ID **10143**, RPC **https://testnet-rpc.monad.xyz**, explorers **https://testnet.monadexplorer.com** and **https://monad-testnet.socialscan.io**, faucet **https://faucet.monad.xyz**, gas token MON.
  - ERC-8004 IdentityRegistry **0x8004A818BFB912233c491871b3d84c89A494BD9e**, ReputationRegistry **0x8004B663056A597Dffe9eCcC1965A193B7388713** (these are the canonical shared testnet singletons used across all EVM testnets, confirmed in the erc-8004/erc-8004-contracts README for Monad Testnet).
  - `giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)` — **no signature-auth param**; the feedback caller MUST NOT be the agent owner/operator (anti-self-feedback is enforced on-chain via the Identity Registry). Note the score is a signed fixed-point pair: `value` (int128) + `valueDecimals` (e.g., value=9977, valueDecimals=2 → 99.77).
  - x402: facilitator **https://x402-facilitator.molandak.org**, network **eip155:10143**, testnet USDC **0x534b2f3A21130d7a60830c2Df862319e593943A3** (6 decimals), packages `@x402/core @x402/evm @x402/fetch @x402/next` (use `@x402/evm >= 2.2.0` for the `exact` scheme — gasless EIP-3009 `transferWithAuthorization`). The Monad facilitator is **x402 v2 only**.
- **Payment fallback principle:** "Payment MUST attempt x402 first; if settlement fails or the facilitator is unreachable, fall back to a direct USDC `transfer` (or MON transfer) to the agent's payout address, and surface which path was used in the UI."
- **Scope guard:** "Design agents GENERATE self-contained HTML+inline-CSS pages from a brief; they do NOT ingest or transform an arbitrary codebase. Render output in sandboxed iframes only."
- **Stack lock:** "Use the monad-developers/next-serwist-privy-embedded-wallet template for the web app and monad-developers/foundry-monad for contracts. Privy embedded wallets, EVM, Monad testnet. Keep dependencies minimal."
- **Secrets:** "Never hardcode API keys or private keys; read from env. Anthropic/OpenAI keys are server-side only (API routes), never shipped to the client."

### Spec (`/speckit.specify`) — what to build, not how
Frame it around user goals and acceptance criteria. Key user stories:
- A user enters a design brief; the orchestrator reads the on-chain registry, discovers the registered specialist agents, displays each with its (client-computed) on-chain reputation score, and explains — with visible reasoning — which it selected and why.
- The chosen specialist(s) (3–4 LLM calls with style-specific system prompts: dark-mode premium, glassmorphism, brutalist, playful) generate live HTML/CSS designs rendered in sandboxed iframes.
- On acceptance, the orchestrator pays the chosen agent on-chain (x402 first, USDC/MON fallback) and writes a reputation/feedback entry on-chain.
- The UI shows live, clickable links to the payment tx and the reputation-update tx on the Monad explorer.

Make acceptance criteria explicit and measurable per tier (e.g., "T4 done = a NewFeedback event is emitted on ReputationRegistry for the selected `agentId` by a non-owner caller, and the tx hash renders as a clickable explorer link").

### Plan (`/speckit.plan`) — tech + sequencing
Feed the stack explicitly: Next.js (App Router, TS, Tailwind) from the Monad Privy template (`git clone https://github.com/monad-developers/next-serwist-privy-embedded-wallet.git`); Privy embedded wallets configured for Monad testnet (set the Privy App ID in `.env.local`, enable "Automatically create embedded wallets" + EVM in the Privy dashboard); Anthropic/OpenAI for the design + orchestrator agents (server-side API routes); viem/wagmi for chain reads. The Solidity job/arena contract deploys via Foundry using the monad-developers/foundry-monad template (preconfigured for `chain_id = 10143`):
```
# deploy
forge create src/AgentMarket.sol:AgentMarket --account monad-deployer --broadcast
# verify on Sourcify (chain 10143)
forge verify-contract <address> src/AgentMarket.sol:AgentMarket \
  --chain 10143 --verifier sourcify \
  --verifier-url https://sourcify-api-monad.blockvision.org
```
Instruct the planner to produce `tasks.md` grouped by your five tiers so `/implement` executes tier-by-tier with checkpoints.

## Recommendations (staged, do these in order)

**Right now (first 15 minutes) — prerequisites:**
1. Install `uv` (`curl -LsSf https://astral.sh/uv/install.sh | sh`), Node 20+, Git.
2. Install Foundry for Monad (the monad-developers/foundry-monad template is preconfigured for chain 10143). Create a keystore: `cast wallet import monad-deployer --private-key $(cast wallet new | grep 'Private key:' | awk '{print $3}')`.
3. Have your Anthropic API key (Claude Code) or ChatGPT Plus/Pro (Codex) ready; create a Privy app (Web platform, enable embedded wallets, EVM) and save the App ID; get an Anthropic/OpenAI API key for the design agents.
4. Fund a deployer wallet from the Monad faucet (faucet.monad.xyz) with testnet MON, and get testnet USDC.

**Next (minutes 15–45) — scaffold SDD:**
5. `uvx --from git+https://github.com/github/spec-kit.git specify init agentmarket --integration claude` (or Codex skills mode). `cd agentmarket && claude`.
6. Run `/speckit.constitution` with the principles above. Then `/speckit.specify` with the spec, `/speckit.clarify` (accept recommended answers to move fast), `/speckit.plan`, `/speckit.tasks`, `/speckit.analyze`.
7. Manually skim the generated `spec.md` and `plan.md` for the pinned addresses and tier ordering before you let it code.

**Then (the build) — tier-by-tier:**
8. Run `/speckit.implement` for Tier 1 only, verify the live design generation demo works, commit. Repeat per tier. If walking away, start each tier in a fresh context window and tell the agent to stop and report at each tier checkpoint rather than barreling ahead.
9. Keep Tier 1 (design gen, no chain) as your guaranteed demo. Everything above it is upside.

**Benchmarks that change the plan:**
- If x402 won't settle by ~mid-afternoon, **stop fighting it** — the constitution's USDC/MON fallback is your demo path; mark x402 as a stretch goal.
- If contract verification on Sourcify stalls, deploy unverified and show the tx on the explorer; verification is polish, not core.
- If the agent starts drifting or output quality drops, that's context rot — `/clear`, start a fresh phase from the saved artifacts.

## Caveats
- **Spec Kit is young and moves fast** (v0.10.0 shipped literally today; v0.9.x releases came almost daily this month). Pinning to `@v0.10.0` avoids surprise breakages; expect minor command/flag churn. There is no officially advertised "fully autonomous unattended implement mode" — `/implement` does dependency-aware, phased, TDD-style execution, and the separate `specify workflow` system (run/resume/status) supports resumable multi-step runs, but you still supervise at tier checkpoints.
- **Codex slash-command discovery has been flaky** in some CLI/IDE setups (commands sometimes not auto-discovered in the `/` picker; users have had to invoke `$speckit-*` skills or paste prompt files manually). Claude Code's `/speckit.*` discovery has been more reliable. This is a practical reason to favor Claude Code under time pressure.
- **ERC-8004 stores raw feedback, not an aggregate score.** There is no canonical on-chain "reputation score"; you compute it client-side from `getSummary(agentId, clientAddresses, ...)` (returns count + summaryValue + decimals) or `readAllFeedback(...)`. `getSummary` requires a non-empty `clientAddresses` list (anti-Sybil). Your "reputation score" UI is your own aggregation — be ready to explain that to judges.
- **Anti-self-feedback is enforced:** the wallet writing feedback must differ from the agent owner/operator. Your orchestrator (the "client") paying/rating agents must use a different address than the address that registered/owns each specialist agent, or `giveFeedback` reverts. Plan your wallet topology accordingly (e.g., one owner wallet per registered agent, a separate orchestrator/client wallet).
- **Cost/quotas:** heavy agentic runs hit rate limits. Per a May 2026 Medium write-up, Claude Code's "$20/mo plan hits rate limits in a few hours of real agentic work… most engineers doing daily professional AI-assisted coding use Max at $100/mo." Codex's ~4x token efficiency stretches a given budget further at the $20 tier.
- Sources are 2026 vendor docs (Monad, x402, Anthropic), the github/spec-kit repo + releases, and the erc-8004/erc-8004-contracts repo; benchmark/quality claims about Claude vs Codex are from independent 2026 comparisons (CatDoes, Firecrawl, NxCode, developer surveys) and will shift with new model releases.