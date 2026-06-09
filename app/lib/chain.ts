// Monad testnet chain layer + PINNED ERC-8004 / USDC ABIs.
// Pinned facts are IMMUTABLE (Constitution III). Verified testnet singletons (chainId 10143)
// — do NOT substitute the Monad docs-page mainnet-vanity set.

import { createPublicClient, createWalletClient, http, parseAbi, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";

export const RPC_URL = process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
export const CHAIN_ID = 10143 as const;

export const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as Address;
export const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713" as Address;
export const USDC = "0x534b2f3A21130d7a60830c2Df862319e593943A3" as Address; // 6 decimals
export const EXPLORER = "https://testnet.monadexplorer.com";

export const explorerTx = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const explorerAddr = (addr: string) => `${EXPLORER}/address/${addr}`;

// --- Pinned ABIs (human-readable; verified 2026-06-09) ---
export const identityAbi = parseAbi([
  "function register(string agentURI) returns (uint256 agentId)",
  "function getAgentWallet(uint256 agentId) view returns (address)",
  "function getMetadata(uint256 agentId, string key) view returns (bytes)",
  "function ownerOf(uint256 agentId) view returns (address)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
]);

export const reputationAbi = parseAbi([
  // NO signature-auth param (current canonical form; the uint8-score+feedbackAuth form is deprecated)
  "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)",
  "function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)",
  "event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)",
]);

export const usdcAbi = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC_URL),
});

/** Server-side wallet client from a 0x private key (never import this on the client). */
export function walletFor(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return { account, client: createWalletClient({ account, chain: monadTestnet, transport: http(RPC_URL) }) };
}

/** Render a fixed-point reputation pair (value, decimals) to a number, e.g. 480,2 -> 4.8 */
export function fixedToNumber(value: bigint, decimals: number): number {
  return Number(value) / 10 ** decimals;
}
