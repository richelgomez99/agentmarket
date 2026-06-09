# Pinned ABIs & On-Chain Contracts (verified 2026-06-09)

Hardcode these in `lib/chain.ts`. Do NOT refetch (ERC-8004 is Draft; explorer source is
unverified). Use the **testnet singletons** — never the docs-page mainnet-vanity set.

## Addresses (Monad testnet, chainId 10143)
- IdentityRegistry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- ReputationRegistry: `0x8004B663056A597Dffe9eCcC1965A193B7388713`
- USDC: `0x534b2f3A21130d7a60830c2Df862319e593943A3` (6 decimals; EIP-712 domain name `"USDC"`, version `"2"`)
- RPC: `https://testnet-rpc.monad.xyz` · Explorer: `https://testnet.monadexplorer.com` (also `testnet.monadscan.com`)

## IdentityRegistry (minimal ABI)
```
function register(string agentURI) returns (uint256 agentId)
function getAgentWallet(uint256 agentId) view returns (address)
function getMetadata(uint256 agentId, string key) view returns (bytes)
function ownerOf(uint256 agentId) view returns (address)   // ERC-721
event Registered(uint256 indexed agentId, string agentURI, address indexed owner)
```
- `agentURI` may be `ipfs://`, `https://`, or `data:application/json;base64,...` (fully on-chain
  agent card — simplest for the demo). Agent card JSON: `{ name, style, payoutAddress, endpoint }`.

## ReputationRegistry (minimal ABI) — NO auth param
```
function giveFeedback(
  uint256 agentId, int128 value, uint8 valueDecimals,
  string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash
)
function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2)
  view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)
event NewFeedback(
  uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex,
  int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2,
  string endpoint, string feedbackURI, bytes32 feedbackHash
)
```
- **Anti-self-feedback**: caller MUST NOT be the agent owner/operator → write from the CLIENT
  EOA, never the agent-owner EOA.
- **`getSummary` clientAddresses MUST be non-empty** → pass `[CLIENT_EOA]`.
- **Specialty-matched reputation (differentiator)**: write feedback with `tag1 = <style>`
  (e.g. `"dark-mode-premium"`), `tag2 = "agentmarket"`. Then `getSummary(agentId, [CLIENT_EOA],
  <style>, "")` returns that agent's **per-style** count + score. The orchestrator reads
  per-style reputation to hire the right specialist for the brief.
- Value convention: a positive completed-paid-job signal = `value=100, valueDecimals=0`
  (or `value=480, valueDecimals=2` to seed a ★4.80 display). Render score from
  `summaryValue / 10**summaryValueDecimals`.

## USDC (ERC-20, fallback path)
```
function transfer(address to, uint256 amount) returns (bool)   // amount in 6-dec base units
function balanceOf(address) view returns (uint256)
```

## x402 (primary payment path)
- Facilitator `https://x402-facilitator.molandak.org`, network `eip155:10143`, exact scheme,
  `@x402/evm >= 2.2.0`. Gasless EIP-3009 `transferWithAuthorization` (facilitator pays gas).
- Fallback when settle fails/unreachable → USDC `transfer` (above) or MON transfer via viem.

## Optional T5 stretch: DesignArena.sol (NOT in core path)
Only if audience-voting is built. Deploy via Monad Foundry; `declareWinner` may call
`giveFeedback`. Deferred — do not build unless T1–T4 are green and time remains.
