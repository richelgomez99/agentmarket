// Payment layer (SERVER-SIDE) — Constitution IV: x402 FIRST, direct transfer fallback.
// x402 path: sign an EIP-3009 transferWithAuthorization with the CLIENT key; the Monad
// facilitator verifies + submits it on-chain (facilitator pays gas). Verified live:
// facilitator supports eip155:10143 / exact / x402Version 2 (GET /supported, 2026-06-09).
import { parseAbi, type Address, type Hex } from "viem";
import { USDC, publicClient, walletFor, explorerTx } from "./chain";

const FACILITATOR = "https://x402-facilitator.molandak.org";
const NETWORK = "eip155:10143";

export type PayResult = {
  path: "x402" | "usdc-transfer" | "mon-transfer";
  txHash: string;
  explorerUrl: string;
  status: "settled" | "failed";
  amountUsd: number;
  detail?: string;
};

const clientKey = () => process.env.CLIENT_PRIVATE_KEY as Hex;

/** Direct USDC transfer C -> payout (the guaranteed fallback). */
export async function payDirect(payout: Address, amountUsd: number): Promise<PayResult> {
  const { client } = walletFor(clientKey());
  const value = BigInt(Math.round(amountUsd * 1_000_000)); // 6 decimals
  const hash = await client.writeContract({
    address: USDC,
    abi: parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]),
    functionName: "transfer",
    args: [payout, value],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return { path: "usdc-transfer", txHash: hash, explorerUrl: explorerTx(hash), status: "settled", amountUsd };
}

/** x402 settle via the Monad facilitator. Throws on any failure (caller falls back). */
export async function payWithX402(payout: Address, amountUsd: number): Promise<PayResult> {
  const { account } = walletFor(clientKey());
  const value = (BigInt(Math.round(amountUsd * 1_000_000))).toString();
  const now = Math.floor(Date.now() / 1000);
  const nonceBytes = new Uint8Array(32);
  crypto.getRandomValues(nonceBytes);
  const nonce = ("0x" + Array.from(nonceBytes).map((b) => b.toString(16).padStart(2, "0")).join("")) as Hex;

  const authorization = {
    from: account.address,
    to: payout,
    value,
    validAfter: "0",
    validBefore: String(now + 600),
    nonce,
  };
  // EIP-712 domain verified: name "USDC" (not "USD Coin"), version "2"
  const signature = await account.signTypedData({
    domain: { name: "USDC", version: "2", chainId: 10143, verifyingContract: USDC },
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "TransferWithAuthorization",
    message: {
      from: account.address,
      to: payout,
      value: BigInt(value),
      validAfter: BigInt(0),
      validBefore: BigInt(now + 600),
      nonce,
    },
  });

  // v2 facilitator body shape per docs.monad.xyz/guides/x402: root payload + accepted
  const body = {
    x402Version: 2,
    payload: { authorization, signature },
    resource: {
      url: "https://agentmarket.demo/job",
      description: "AgentMarket design job",
      mimeType: "text/html",
    },
    accepted: {
      scheme: "exact",
      network: NETWORK,
      amount: value,
      asset: USDC,
      payTo: payout,
      maxTimeoutSeconds: 60,
      extra: { name: "USDC", version: "2" },
    },
  };

  const res = await fetch(`${FACILITATOR}/settle`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    transaction?: string;
    txHash?: string;
    errorReason?: string;
    error?: string;
  };
  const tx = data.transaction || data.txHash;
  if (!res.ok || data.success === false || !tx) {
    throw new Error(`x402 settle failed (${res.status}): ${data.errorReason || data.error || JSON.stringify(data).slice(0, 200)}`);
  }
  return { path: "x402", txHash: tx, explorerUrl: explorerTx(tx), status: "settled", amountUsd };
}

/** x402 first; fall back to direct USDC transfer. Never throws unless BOTH fail. */
export async function pay(payout: Address, amountUsd: number, forceFallback = false): Promise<PayResult> {
  if (!forceFallback) {
    try {
      return await payWithX402(payout, amountUsd);
    } catch (e) {
      console.warn("[pay] x402 failed, falling back to direct transfer:", (e as Error).message);
    }
  }
  return payDirect(payout, amountUsd);
}
