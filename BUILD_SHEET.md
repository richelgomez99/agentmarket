# AgentMarket — Monad Blitz NYC Build Sheet (Game Day)
### The pitch in one line
**A marketplace of specialist AI design agents with provable, on-chain-earned reputation — your agent discovers them, hires the best one live, pays on-chain, and you watch it build your UI in real time.**

Design is the launch vertical. The protocol is for any specialized agent. Lead with that.

---

## THE GOLDEN RULE OF TODAY
Build the spine **top-down**. After each tier you have a *complete, demoable thing*. If you run out of time at any tier, you still have a winning demo. **Never** be in a state where "nothing works yet because I'm still wiring the last piece." Always have a fallback that runs.

The on-chain pieces are the riskiest. So build the **visual/agent layer first** (your strength, guaranteed to work), then layer on-chain underneath it. If x402 won't settle by hour 5, you swap in a plain token transfer and the demo is still real and still wins.

---

## THE DEMO (build toward THIS exact 90 seconds)
1. A messy/unstyled landing page sits on screen ("every vibe coder's problem").
2. You type a brief: *"Make this a premium dark-mode SaaS landing page with smooth animation."*
3. Your **orchestrator agent** reads the on-chain registry, shows it's choosing among specialist agents **by their reputation score** ("DarkModeAgent: ★4.8, 23 jobs completed & paid on-chain — hiring it").
4. The chosen agent **generates the styled page live** — the room watches it render in an iframe.
5. A **payment fires on-chain** to that agent's wallet — visible on a live Monad explorer panel.
6. The agent's **reputation ticks up on-chain** (job #24).
7. Close: *"A skill gives you one model's average guess. This is a market of specialists whose track record is earned and provable on-chain — and my agent hired one autonomously. Design's just the start; any agent can register."*

The wow = ugly→beautiful live + an AI hiring an AI + real money + real reputation, all on Monad.

---

## TIER LADDER (build in this order)

### TIER 0 — Environment (first 45–60 min, do at the venue during workshops)
- Clone `monad-developers/foundry-monad` (contracts) and `monad-developers/next-serwist-privy-embedded-wallet` (frontend + Privy).
- Add Monad testnet: Chain ID **10143**, RPC `https://testnet-rpc.monad.xyz`.
- Faucets: `faucet.monad.xyz` (MON for gas), `faucet.circle.com` (testnet USDC, select Monad).
- Get your LLM API key working (Anthropic/OpenAI) from a test script.
- **Benchmark: deploy the template's default contract to Monad testnet within the first hour.** If you can't, get help immediately — this is the gate for everything.

### TIER 1 — The visual core (hours 1–3) — YOUR STRENGTH, ZERO CHAIN RISK
Get this bulletproof first. It's the emotional peak and it can't depend on the chain.
- Input: ONE known, pre-tested unstyled HTML page (you bring it / generate it first thing). Controlled input = can't break live.
- 3–4 specialist design agents = 3–4 LLM calls, each with a **style-specific system prompt** (dark-mode premium, glassmorphism, brutalist, playful). Each **generates** a self-contained HTML+inline-CSS document (NOT transforms arbitrary code).
- Render each in a sandboxed `<iframe sandbox>` (no `allow-same-origin`). Stream/animate them appearing.
- **Reliability:** constrain output hard ("ONLY a complete HTML doc, inline `<style>`, no JS, no external URLs, no markdown fences"); have a hard-coded fallback HTML per style if a call fails/stalls; set timeouts.
- **Benchmark: by hour 3, type a brief → see styled designs render live.** This alone is demoable.

### TIER 2 — The orchestrator agent + on-chain registry (hours 3–4.5)
- Register 3–4 agents on the **ERC-8004 Identity Registry on Monad** (it's pre-deployed — you call it, don't write it). Each agent = an ERC-721 with an agent card (style, wallet, endpoint). Pre-register these FIRST THING so they exist.
  - IdentityRegistry (Monad testnet): `0x8004A818BFB912233c491871b3d84c89A494BD9e`
  - ReputationRegistry (Monad testnet): `0x8004B663056A597Dffe9eCcC1965A193B7388713`
  - **Confirm these addresses + the live `giveFeedback` ABI on the explorer before wiring** (the ABI has a known old-vs-new version mismatch; current form is `giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)` with NO signature auth).
  - **Gotcha:** the address that writes feedback must NOT be the agent's owner (anti-self-feedback) — register agents under one EOA, write feedback from a different "client" EOA.
- Orchestrator agent (LLM, your strength): takes the brief → reads the registry → picks agent(s) by reputation → calls the design generation. Show its reasoning streaming on screen.
- **Benchmark: by hour 4.5, the orchestrator visibly discovers on-chain agents and picks by reputation.**

### TIER 3 — The payment loop (hours 4.5–5.5)
- Winning agent gets paid. **Target: x402** (Monad facilitator `https://x402-facilitator.molandak.org`, network `eip155:10143`, testnet USDC `0x534b2f3A21130d7a60830c2Df862319e593943A3`, npm `@x402/*`).
- **FALLBACK (decide by hour 5): if x402 won't settle, do a plain USDC or MON `transfer()` from a funded "client" wallet → the agent's wallet.** Still a real on-chain payment, still legitimately "the agent got paid." Do NOT sink the demo chasing x402 purity.
- Each payment = a visible tx. Have a Monad explorer panel open showing it.

### TIER 4 — Reputation update on-chain (hours 5.5–6)
- After the job, call `giveFeedback(agentId, 100, 0, "design", "arena-win", ...)` on the ReputationRegistry from your client EOA → the agent's score updates on-chain.
- Read + display each agent's reputation via `getSummary` (or by indexing `NewFeedback` events).
- This is the **differentiator made visible** — "reputation earned from real paid jobs, unfakeable."

### TIER 5 — Loudness + safety net (hours 6–7)
- Live Monad explorer panel that visibly updates (the on-chain proof made physical).
- Reputation scores animate up; "job #24" feel.
- **RECORD A BACKUP SCREEN-CAPTURE of the full working flow** once it works — if the live demo glitches (wifi/API), you play the recording and narrate. Pros always have the backup.
- Push to **public GitHub** + confirm contracts/txs visible on MonadScan (`testnet.monadscan.com`) — voters review the repo + deployment.
- Rehearse the 90-second demo 3×.

---

## RISK MAP / FALLBACKS (memorize these)
| Risk | Fallback |
|---|---|
| Can't deploy any contract by hour 1 | Get a mentor immediately; this is the gate |
| x402 won't settle | Plain USDC/MON `transfer()` — still real payment |
| ERC-8004 `giveFeedback` reverts | Confirm caller ≠ agent owner; confirm live ABI; call from a backend script not the contract |
| LLM outputs broken HTML | Hard-coded per-style fallback HTML + timeout + strip markdown fences |
| Whole chain layer collapses | Demo Tier 1 (live styled generation) + narrate the on-chain vision — still strong |
| Live demo glitches on stage | Play the pre-recorded backup capture |

## WHAT MUST BE LIVE vs PRE-DONE
- **Pre-done (do first thing today):** register the 3–4 agents on-chain, fund a client wallet with MON + testnet USDC, pre-test the style prompts + fallback HTML, pick/build the input page.
- **Live in demo:** the brief → generation → orchestrator picking by reputation → payment tx → reputation update. The *mechanism* runs live; the *setup* is staged.

## THE "WHY NOT JUST A SKILL" REBUTTAL (say on stage)
"A skill is a generic capability your agent loads — you get one model's average guess. This is a market of *specialist* agents with proven, on-chain-earned track records. You hire the one that's demonstrably great at dark-mode SaaS design, direct it, watch it build live, and pay it only if it delivers — and its reputation can't be faked because it's bound to real paid jobs settled on-chain. A skill can't be hired, can't be paid, and carries no portable reputation. This can."

## HONEST CLAIMS (don't overclaim — technical voters will catch it)
- ✅ "Specialist agents with portable ERC-8004 identity + reputation, hired and paid on-chain via x402, live on Monad."
- ✅ "Reputation is unfakeable because it's bound to settled on-chain payments."
- ❌ Don't claim you cryptographically prove the design is *good* (nobody can cheaply in 2026) — claim the job was *done and paid for*.
- ❌ Don't claim a populated open network — say "design is the launch vertical, the protocol is open for anyone to register."

## KEY ADDRESSES & ENDPOINTS (confirm live at venue)
- Chain ID: 10143 · RPC: https://testnet-rpc.monad.xyz
- ERC-8004 Identity: 0x8004A818BFB912233c491871b3d84c89A494BD9e
- ERC-8004 Reputation: 0x8004B663056A597Dffe9eCcC1965A193B7388713
- x402 facilitator: https://x402-facilitator.molandak.org · network eip155:10143
- testnet USDC: 0x534b2f3A21130d7a60830c2Df862319e593943A3
- Explorer: testnet.monadscan.com · Faucets: faucet.monad.xyz, faucet.circle.com
- Templates: monad-developers/foundry-monad, monad-developers/next-serwist-privy-embedded-wallet
