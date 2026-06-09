# Agent Arena: Designers — A 7-Hour Technical Build Guide for Monad Blitz NYC

## TL;DR
- **This is buildable in 7 hours and the "ERC-8004 + x402 + Monad" stack is legitimate, not hand-wavy:** the ERC-8004 registries are already deployed on Monad testnet (IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e`, ReputationRegistry `0x8004B663056A597Dffe9eCcC1965A193B7388713`) so you do NOT need to write or deploy reputation contracts — you call existing ones. Monad runs an official x402 facilitator at `https://x402-facilitator.molandak.org` with testnet USDC at `0x534b2f3A21130d7a60830c2Df862319e593943A3`.
- **The single biggest de-risking fact:** the current canonical `ReputationRegistry.giveFeedback(...)` requires NO agent-signed authorization — any non-owner address can write feedback freely. This removes the scariest integration risk; your vote→reputation pipeline is just a normal contract call.
- **Build order to guarantee a demo:** (1) the parallel LLM design-generation UI (your strength, zero chain deps), (2) your own minimal Arena voting contract on Monad via foundry-monad, (3) ERC-8004 reputation writes to the pre-deployed registry, (4) x402 payment LAST as additive. Pre-register the 4–6 agents BEFORE the event. **Note: Monad Blitz prizes are decided by live audience vote** — optimize for a crisp, visceral live demo over feature depth.

## Key Findings

### 1. ERC-8004 is real, deployed on Monad testnet, and minimal to use
The three registries — Identity (ERC-721 agent NFTs), Reputation (feedback signals), Validation (third-party verification "hooks") — are deployed as **per-chain singletons**. The same vanity addresses repeat across 30+ chains. On **Monad testnet**: IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e`, ReputationRegistry `0x8004B663056A597Dffe9eCcC1965A193B7388713` (Validation Registry **not yet deployed on Monad** and still under active TEE-community revision).

Context that strengthens the pitch: ERC-8004 was created as Draft EIP-8004 on August 13, 2025, authored by **Marco De Rossi (@MarcoMetaMask), Davide Crapis (@dcrapis, EF AI lead), Jordan Ellis (Google), and Erik Reppel (Coinbase)**. By October 2025 the Ethereum Foundation's new decentralized-AI (dAI) team formally unveiled it with backing from ENS, EigenLayer, The Graph, and Taiko, refined with input from 100+ contributors. It **went live on Ethereum mainnet on January 29, 2026** — Crapis's launch post noted "over 10k agents registered on testnet. Today, we're releasing it on Ethereum Mainnet." This is current, credentialed infrastructure, not vaporware.

**Exact function signatures (verified verbatim against the canonical ERC8004SPEC.md in `github.com/erc-8004/erc-8004-contracts`):**
- `register(string agentURI) returns (uint256 agentId)` — plus overloads `register()` and `register(string agentURI, MetadataEntry[] metadata)`. Mints the ERC-721 agent NFT; `agentURI` points to the JSON agent card and may be `ipfs://`, `https://`, or a `data:application/json;base64,...` fully-on-chain URI. Emits `Registered(uint256 indexed agentId, string agentURI, address indexed owner)`.
- `giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)` — **NO signature/feedbackAuth required in the current canonical version.** Any address may call it EXCEPT the agent's owner/operator (anti-self-feedback enforced via the Identity Registry). Only `value` and `valueDecimals` are mandatory (`valueDecimals` 0–18); the rest can be empty. Emits `NewFeedback(...)`.
- `getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)` — `clientAddresses` MUST be non-empty (Sybil mitigation). Returns a count plus a fixed-point average (e.g. value=9977, decimals=2 → 99.77).
- Also available: `readFeedback`, `readAllFeedback`, `getClients`, `getLastIndex`, `revokeFeedback(agentId, feedbackIndex)`, `appendResponse(...)`.
- On IdentityRegistry: `setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes signature)` / `getAgentWallet(uint256 agentId)` (the reserved `agentWallet` key requires EIP-712/ERC-1271 proof to change; defaults to owner on registration; cleared on transfer) and `setMetadata` / `getMetadata(uint256 agentId, string key) returns (bytes)`.

**CRITICAL version gotcha (this will trip up AI coding agents):** older drafts and many third-party tutorials (nuwa-8004, several Medium/blog posts, IQ.wiki) show a DIFFERENT, deprecated signature: `giveFeedback(uint256 agentId, uint8 score, bytes32 tag1, bytes32 tag2, string fileuri, bytes32 filehash, bytes feedbackAuth)` — requiring an EIP-191/ERC-1271 **agent-signed authorization** and using `uint8 score` (0–100). **Do NOT build against this.** The live Monad contract uses the new `int128 value` / `uint8 valueDecimals` form with no auth. Because Claude Code/Cursor will likely pull the older pattern from their training data, explicitly paste the correct signature into your prompt and **confirm the live ABI on the explorer at the event before wiring.**

**Forkable repos / tooling:** canonical contracts `github.com/erc-8004/erc-8004-contracts` (CC0, includes an `abis/` folder — grab the ABI from there). Agent0 SDK (`docs.sdk.ag0.xyz`; npm TS + Python; by Marco De Rossi/Consensys) wraps register/giveFeedback/getReputationSummary and handles IPFS pinning (Pinata/Filecoin free for ERC-8004 agents) — but it is **alpha (v0.31) with known bugs and reportedly painful on Vercel**. `0xgasless/agent-sdk` combines ERC-8004 + x402. Monad's own guide: `docs.monad.xyz/guides/erc-8004`.

**Minimal legitimate claim path:** (a) register each designer-agent once via `register(agentURI)` → get agentId + NFT; (b) after each arena round, write the winner's result via `giveFeedback(agentId, value, valueDecimals, "design", "arena-win", ...)`; (c) read live reputation via `getSummary` or by indexing `NewFeedback` events. That is a complete, legitimate ERC-8004 reputation loop.

### 2. x402 works end-to-end on Monad with an official facilitator
**The flow:** client hits endpoint → server returns HTTP 402 + JSON payment requirements → client signs an **EIP-3009 `transferWithAuthorization`** (gasless, off-chain EIP-712 signature; USDC v2 supports it natively) → client retries with the signed payload in the payment header → the server's facilitator calls `/verify` then `/settle`, which submits `transferWithAuthorization` on-chain (**facilitator pays gas**) → server returns 200. The agent never sends a raw tx — just a signature. The `nonce` is a random 32-byte value (not sequential), so agents can build many authorizations in parallel without collision.

**Concrete Monad testnet values (from `docs.monad.xyz/guides/x402`):**
- Facilitator: `https://x402-facilitator.molandak.org` (endpoints `GET /supported`, `POST /verify`, `POST /settle`)
- Network identifier: `eip155:10143`
- Testnet USDC: `0x534b2f3A21130d7a60830c2Df862319e593943A3` (6 decimals; EIP-712 domain name is `"USDC"` — not "USD Coin" — version `"2"`)
- Get test USDC from Circle faucet `faucet.circle.com` (select Monad Testnet; limit 1 USDC per stablecoin/testnet pair every 2h); MON gas from `faucet.monad.xyz`
- npm packages: `@x402/core @x402/evm @x402/fetch @x402/next` (use `>=2.2.0` for the `exact` scheme; the `upto` scheme needs `@x402/evm 2.12.0` exactly — 2.9.0–2.11.0 reference an undeployed proxy and fail silently at settlement). Server uses `withX402(handler, routeConfig, server)` + `ExactEvmScheme`; client uses `wrapFetchWithPayment(fetch, client)`. Also `@x402/express` and `x402-axios`/`@x402/axios` exist. Coinbase's CDP facilitator covers Base/Solana/Polygon — **NOT Monad** — so use the molandak facilitator.

**Server pattern (Next route handler, abbreviated from Monad docs):**
```ts
const MONAD_NETWORK = "eip155:10143";
const MONAD_USDC = "0x534b2f3A21130d7a60830c2Df862319e593943A3";
const FACILITATOR_URL = "https://x402-facilitator.molandak.org";
const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const server = new x402ResourceServer(facilitatorClient);
const monadScheme = new ExactEvmScheme();
monadScheme.registerMoneyParser(async (amount, network) => network === MONAD_NETWORK
  ? { amount: Math.floor(amount*1_000_000).toString(), asset: MONAD_USDC, extra: { name:"USDC", version:"2" } } : null);
server.register(MONAD_NETWORK, monadScheme);
export const GET = withX402(handler, { accepts: { scheme:"exact", network:MONAD_NETWORK, payTo: PAY_TO, price:"$0.001" } }, server);
```

**Wiring "the winning agent gets paid":** The cleanest demo version is an x402-gated endpoint representing the winning agent's "deliverable" (e.g. its final HTML). The arena/escrow (acting as buyer using a funded server wallet) calls it; the facilitator settles USDC from the arena wallet → the winning agent's `agentWallet`, producing a visible on-chain USDC transfer. Realistic minimal version: one fixed small price ($0.001–$0.01 USDC), one payer wallet, one payee = winner's agentWallet.

### 3. Privy gives you embedded wallets + agent wallets + gasless on Monad
**User wallets:** clone `github.com/monad-developers/next-serwist-privy-embedded-wallet` (Next.js 14 + Privy). In the Privy dashboard enable "Automatically create embedded wallets on login" → EVM Wallets. Configure for Monad testnet (chainId 10143, RPC `https://testnet-rpc.monad.xyz`). A `next-serwist-privy-smart-wallet` template (smart accounts) also exists.

**Agent wallets (server-side) — how agents become "wallet-owning economic actors":** Privy "agentic wallets" recipe, Model 1 (agent-controlled, developer-owned): create authorization keys in the dashboard (a P-256 keypair Privy never sees), create a wallet with `owner_id` = your authorization key + an attached policy, then sign/send transactions via Privy's NodeJS SDK / REST API (requests signed with the `privy-authorization-signature` header). Each designer-agent gets its own server wallet that holds and receives funds.

**Gasless / no-popup voting (the 2048 UX pattern):** Privy session signers / delegated actions — `delegateWallet` via `useHeadlessDelegatedActions`; once a user delegates (with revocable, policy-scoped consent backed by a TEE/secure enclave), your app transacts on their behalf without a per-action popup. For full gas sponsorship Monad supports ERC-4337 and EIP-7702; Pimlico/Biconomy/Alchemy Account Kit and ZeroDev (which Privy integrates with via Kernel smart accounts + session keys) provide paymaster/gas-manager on Monad. The 2048 demo's snappiness comes from **optimistic UI + fast blocks + delegated signing**, not magic.

### 4. The live design-generation architecture (your core strength)
**Recommended architecture:** Each of the 4–6 designer-agents = one independent LLM call (Claude/GPT) with a style-specific system prompt, instructed to output ONE self-contained HTML document with inline CSS (no external deps), rendered in a separate **sandboxed `<iframe sandbox>`** (use `sandbox` WITHOUT `allow-same-origin` so injected JS can't reach your parent page's DOM/cookies/localStorage). Fire all calls concurrently with `Promise.all` (TS, `AsyncAnthropic`/async client) — they truly run in parallel and panels fill in as each resolves. For perceived simultaneity, either stream each response (`client.messages.stream`) into its iframe via `srcdoc` updates, or show per-agent skeleton loaders that flip to rendered output on resolve. Treat LLM output as untrusted user content — if you ever allow same-origin, run it through DOMPurify (split-chunk attacks mean you sanitize the combined result, not chunks).

**Reliability tactics (avoid broken demos — this is the visible "wow," make it bulletproof):**
- Constrain output hard: *"Return ONLY a complete `<!DOCTYPE html>` document with an inline `<style>` block, no JavaScript, no external URLs, no markdown fences."*
- Give each style a tight rubric: glassmorphism = `backdrop-filter: blur`, translucent layered cards; brutalist = raw borders, system fonts, high contrast, no rounding; dark-mode, playful, corporate each get explicit color/typography/spacing rules.
- Pre-test prompts the night before and **bundle a hard-coded fallback HTML per style** so a slow/failed call still renders something on screen.
- Strip markdown fences defensively, set a per-call timeout, and use prompt caching for the large shared system context to cut latency/cost.

### 5. Minimal-but-legitimate smart contract architecture
You write ONE small contract — the **Arena** — and reuse the pre-deployed ERC-8004 ReputationRegistry. Sketch:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IReputationRegistry {
    function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals,
        string calldata tag1, string calldata tag2, string calldata endpoint,
        string calldata feedbackURI, bytes32 feedbackHash) external;
}

contract DesignArena {
    struct Round { uint256 promptId; bool open; uint256 winningAgentId; }
    IReputationRegistry public rep;            // 0x8004B6...388713 on Monad testnet
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(uint256 => uint256)) public votes;      // round => agentId => votes
    mapping(uint256 => mapping(address => bool)) public hasVoted;      // round => voter => voted

    event RoundStarted(uint256 indexed roundId, uint256 promptId);
    event Voted(uint256 indexed roundId, uint256 indexed agentId, address voter);
    event WinnerDeclared(uint256 indexed roundId, uint256 indexed agentId);

    constructor(address rep_) { rep = IReputationRegistry(rep_); }

    function startRound(uint256 roundId, uint256 promptId) external {
        rounds[roundId] = Round(promptId, true, 0);
        emit RoundStarted(roundId, promptId);
    }
    function vote(uint256 roundId, uint256 agentId) external {
        require(rounds[roundId].open, "closed");
        require(!hasVoted[roundId][msg.sender], "voted");
        hasVoted[roundId][msg.sender] = true;
        votes[roundId][agentId] += 1;
        emit Voted(roundId, agentId, msg.sender);   // each vote = a visible tx
    }
    function declareWinner(uint256 roundId, uint256 winningAgentId) external {
        rounds[roundId].open = false;
        rounds[roundId].winningAgentId = winningAgentId;
        // write reputation to the REAL ERC-8004 registry — visible on explorer
        rep.giveFeedback(winningAgentId, 100, 0, "design", "arena-win", "", "", bytes32(0));
        emit WinnerDeclared(roundId, winningAgentId);
    }
}
```

Each vote, the winner declaration, the ERC-8004 feedback write, and the x402 USDC settlement are each their own on-chain transaction visible on the explorer. Voting is cheap (one mapping write + event). For "token-weighted" you'd swap `+= 1` for a balance lookup, but **one-wallet-one-vote is the safer demo.** **IMPORTANT:** the address calling `giveFeedback` must NOT be the agent's owner/operator or it reverts (anti-self-feedback) — register agents under a different EOA than the one the Arena's feedback call originates from, or call feedback from a dedicated "client" address.

**Deploy/verify (foundry-monad):**
```bash
forge init --template monad-developers/foundry-monad arena
# foundry.toml is pre-set: eth-rpc-url="https://testnet-rpc.monad.xyz", via_ir, Cancun EVM
forge create src/DesignArena.sol:DesignArena --account monad-deployer --broadcast \
  --constructor-args 0x8004B663056A597Dffe9eCcC1965A193B7388713
forge verify-contract <addr> src/DesignArena.sol:DesignArena \
  --chain 10143 --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org
```
Use a keystore (`--account monad-deployer`) rather than a raw private key.

### 6. Monad dev setup (current)
- RPC: `https://testnet-rpc.monad.xyz` (alt `testnet-rpc.monadinfra.com`); Chain ID **10143**; gas token **MON**. Per Monad's developer docs: **10,000 TPS, 400ms block frequency, 800ms finality** (two-round N+2 finality; ~400ms speculative). Gas is effectively ~$0 with faucet MON.
- Faucets: `faucet.monad.xyz` (MON), `faucet.circle.com` (testnet USDC).
- Explorers: MonadVision/BlockVision (`testnet.monadvision.com`), MonadScan/Etherscan (`testnet.monadscan.com`), SocialScan (`monad-testnet.socialscan.io`), MonadExplorer (`testnet.monadexplorer.com`).
- Starter kits: `monad-developers/foundry-monad` (Foundry, recommended), `monad-developers/next-serwist-privy-embedded-wallet` (Next + Privy), scaffold-eth Monad guide, `monad-developers/2048-contracts` + `2048-frontend` (the high-throughput onchain-game reference pattern; Monad2048 deployed at `0xe0FA8195AE92b9C473c0c0c12c2D6bCbd245De47` — board encoded in a single `uint128`, optimistic UI, deterministic rules), the Monad MCP tutorial, and the x402 + ERC-8004 guides on `docs.monad.xyz`.
- Gotcha: contract-verification commands may print a misleading error but still verify — check the explorer to confirm.

### 7. Differentiation & pitch substance
v0/Lovable/Bolt/Replit/Magic Patterns already do multi-variant AI UI generation (v0 even offers instant style variants — "Modern Minimal," etc.). So "AI makes designs" is **NOT novel** and judges will know it. What IS defensibly different and technically grounded:
- **Portable on-chain reputation (ERC-8004):** each agent's win/loss track record is an ERC-721-anchored, immutable, cross-platform record readable by ANY app — not a private leaderboard locked inside one SaaS. v0/Lovable have no portable agent reputation; their "agents" are features, not entities.
- **Permissionless agent market:** anyone can register a new designer-agent NFT and enter the arena; reputation, not a corporate gatekeeper, determines trust. Open market vs. closed product.
- **x402 settlement / agents as economic actors:** winning agents own wallets and get PAID in stablecoin per job via an open HTTP-native protocol — closing the loop from "generate" to "earn." Machine-to-machine commerce, not a subscription.
- **Live, verifiable, on-chain:** every vote, payment, and reputation update is a real transaction on a public explorer in real time — and because **the Blitz prize is decided by live audience vote**, the audience literally participating in on-chain voting IS your demo.

**Legitimate to claim:** "Specialist agents with portable ERC-8004 identities and reputation, competing in a permissionless on-chain market, paid per job via x402, all live on Monad." **Overclaim to avoid:** don't claim a Validation Registry (not on Monad), don't claim the reputation is Sybil-resistant (the spec explicitly says it is not — aggregation is off-chain), don't claim agents are "autonomous" beyond what your code actually does, and don't claim production-readiness (ERC-8004 is Draft; Agent0 SDK is alpha).

## Details

**7-hour hour-by-hour plan (solo, AI-assisted, Solidity newcomer):**
- **Pre-event (night before):** Register the 4–6 agents on the Monad ERC-8004 IdentityRegistry (save agentIds + their agentWallet addresses). Pre-write and test the 4–6 style system prompts and fallback HTML. Fund a deployer wallet + an arena payer wallet with MON and testnet USDC. Clone foundry-monad and the Privy Next template. **Verify the live `giveFeedback` ABI on the explorer** and do one staged x402 `/settle`.
- **Hour 0–1:** Scaffold Next app, env vars, Monad chain config, Privy login + embedded wallet working.
- **Hour 1–3:** Build the parallel design-generation core: prompt input → `Promise.all` of 4–6 styled LLM calls → render each into a sandboxed iframe with skeleton loaders + fallbacks. Make this beautiful — it's the centerpiece.
- **Hour 3–4.5:** Write + deploy + verify the DesignArena contract via foundry-monad. Wire on-chain voting (one-wallet-one-vote) with optimistic UI; show each vote tx and a live explorer view.
- **Hour 4.5–5.5:** Wire `declareWinner` → ERC-8004 `giveFeedback` to the live ReputationRegistry; read + display each agent's `getSummary` reputation live.
- **Hour 5.5–6.5:** Add x402 payment to the winner (additive). Monad facilitator; one fixed small USDC payment from arena wallet → winner agentWallet.
- **Hour 6.5–7:** Polish, rehearse the demo, screenshot fallbacks.

**Risk map + fallbacks:**
- *x402 settlement (highest risk — version/scheme sensitivity, USDC domain quirks):* fallback = a plain `USDC.transfer()` (or even a MON transfer) from arena→winner wallet — still a real on-chain payment, still legitimately "the winning agent gets paid." Stage the full x402 round-trip the night before; keep x402 only if a staged `/settle` succeeds.
- *ERC-8004 feedback revert (anti-self-feedback / wrong ABI version):* ensure the feedback caller ≠ agent owner/operator; confirm the live ABI. Fallback = call `giveFeedback` from a dedicated client EOA in a small backend script rather than from the Arena contract.
- *Session keys / gasless:* nice-to-have, not load-bearing. Fallback = normal Privy embedded-wallet signing; blocks are ~400ms and gas is ~free, so a popup per vote is tolerable.
- *LLM broken output:* hard-coded per-style fallback HTML + output sanitization + timeouts.
- **Build first to guarantee a demo:** the parallel generation UI + local/optimistic voting. Everything chain layers on top so you always have something to show.
- **Live vs. staged:** voting, winner declaration, reputation write, and (ideally) payment should be LIVE on-chain during the demo; agent registration, wallet funding, and prompt/fallback testing should be staged beforehand.

## Recommendations
1. **Start with the visual core, not the chain.** Get the 4–6 parallel styled iframes rendering flawlessly first — it's your strength and the demo's emotional peak. *Benchmark: by hour 3, type a prompt → see 6 distinct styled UIs.*
2. **Use pre-deployed ERC-8004; write only the Arena.** Don't reimplement reputation. *Benchmark: Arena deployed + verified by hour 4.5.*
3. **Treat x402 as additive, with a `transfer()` fallback ready.** If by hour 6 the facilitator isn't settling, switch to a direct USDC transfer for the demo and describe x402 as the architecture. *Threshold to keep x402: a successful staged `/settle` the night before.*
4. **Pre-register agents and pre-fund wallets the night before** to remove faucet rate-limits and registration latency from the critical path.
5. **Make the audience the voters.** Because the prize is decided by live audience vote, let the room cast real on-chain votes from their own wallets — the differentiator (everything is real and on-chain) becomes a participatory moment, not a claim. Have MonadVision open showing votes, the `giveFeedback` tx, and the payment tx.
6. **Pitch the market, not the generator.** Lead with portable reputation + permissionless agent market + agents that earn — explicitly contrast against v0/Lovable's closed, reputation-less model.
7. **Call the registry directly with viem/ethers using the canonical ABI** rather than depending on the alpha Agent0 SDK, for reliability under time pressure.

## Caveats
- ERC-8004 is a **Draft** standard; the Validation Registry is not deployed on Monad and is under active TEE-community revision. Don't depend on it.
- Re-confirm the Monad testnet addresses and facilitator endpoint **at the event** (docs/addresses change), and verify the live `giveFeedback` ABI on the explorer before wiring — the documented v0 (`uint8 score` + `feedbackAuth`) vs. current (`int128 value`, no auth) divergence is the most likely source of a wasted hour.
- Agent0 SDK is **alpha (v0.31) with known bugs** and reportedly painful on Vercel; prefer direct contract calls.
- x402 on Monad requires facilitator v2+ and specific `@x402/evm` versions (the `upto` scheme was broken before 2.12.0). The reputation system is explicitly **not Sybil-resistant** on-chain.
- The Monad Blitz NYC event runs June 9, 2026, 9:00 AM–10:00 PM ET, with a **$5,000 prize pool decided by live audience vote**; note ETHGlobal's concurrent NYC flagship is a separate, larger event. Optimize for a crisp live demo over feature breadth.