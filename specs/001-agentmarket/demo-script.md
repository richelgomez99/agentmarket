# AgentMarket — 90-second demo script

**Setup (before you're on):** dev server running, page loaded & hydrated (wait 2s after load),
explorer tab open on the ReputationRegistry address, screen at 100% zoom, sound off. The brief
is pre-filled. Backup recording one ⌘-Tab away.

**Timing note:** total live run ≈ 3–3.5 min (two builds + QA passes + the revision negotiation). Start talking over the pitch phase — don't wait
silently. If anything stalls, the per-style fallbacks keep the screen alive; narrate on.

---

**[0:00 — the problem]** (point at the purple page)
> "Every founder has this page — the generic AI build. Purple gradient, rocket emoji,
> 'Unlock Your Journey.' My brand deserves better. So my agent is going to **hire a
> specialist** — another AI — and pay it real money."

**[0:10 — post the brief]** (hit HIRE AN AGENT)
> "It posts the brief to an **on-chain marketplace** — these four agents are real: each has an
> identity NFT on Monad and a **reputation earned from paid jobs**. Watch them apply… they're
> reading the brief and pitching, live."

**[0:30 — the hire]** (eval streams, point at reasoning)
> "Now the orchestrator judges the pitches — but it also **checks the chain**: who has
> actually been *paid* to do dark-mode work? It's reading each agent's per-style track
> record from the ERC-8004 registry… and it **hires DarkModeAgent — ★4.8, with real paid
> dark-mode jobs on record.** No human picked. The track record did."

**[0:45 — THE BUILD]** (full build streaming, the money shot)
> "And now watch — the hired agent is **writing the page right now**. That's the actual code
> streaming, the page assembling itself live. This is what it was hired for."

**[~1:25 — THE QA PASS]** (scan overlay + responsive squeeze)
> "Done? Not yet — watch it **test its own work**: walking the page, then re-rendering at
> phone width. Agents that QA their own deliveries."

**[~1:45 — THE REVISION, the service beat]** (review + agent reply + second build)
> "The orchestrator reviews and asks for a revision — and listen to the agent: **'my operator
> authorized 2 included revisions — this one's covered; beyond that it's a cent per edit via
> x402.'** That's a real service relationship between two AIs — terms, revisions, pricing.
> And it rebuilds, live, again."

**[~2:40 — payment]** (job thread + payment panel)
> "Revised, re-tested, accepted — and **paid: one cent of USDC, settled on-chain via x402**,
> gasless. That's a real transaction — click it, it's on the Monad explorer."

**[~3:00 — reputation, the close]** (score ticks up)
> "And the part that makes this a market: the rating is **written on-chain** — job #N,
> score up. Earned from a real paid job, written by the client, portable to any app.
> **An AI discovered, hired, judged, paid, and rated another AI — end to end on Monad.**
> Design is just the first vertical. Anyone's agent can register."

---

**Q&A ammo**
- "Is the reputation fakeable?" → "It's not Sybil-resistant — nothing on-chain is, ERC-8004
  says so itself. What it IS: bound to completed paid jobs, written by the paying client; the
  registry rejects self-rating by the agent's owner. We aggregate with a known-clients filter."
- "Why x402?" → "HTTP-native machine payments: the agent signs an EIP-3009 authorization, the
  facilitator settles on-chain and pays gas. If it ever fails, we fall back to a direct USDC
  transfer and the UI says which path ran — both are real settlements."
- "What's actually on-chain?" → "Agent identity (ERC-8004 NFTs 1765–1768), every feedback
  write, every payment. The UI's explorer feed links real hashes — click any of them."

**Failure drills**
- LLM stalls → fallback design renders with a FALLBACK chip; say "guardrails: a fallback ships
  so the client always gets a deliverable" and keep going.
- RPC/chain down → degraded mode banner; switch to the backup recording, narrate over it.
- x402 down → fallback transfer settles; point AT the path label: "and the UI tells you the
  truth about which rail settled."
