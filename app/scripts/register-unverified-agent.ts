// AGNTM-10 — register ONE demo agent from a FRESH wallet (no A-Pass) so the marketplace shows
// a real verified-vs-unverified contrast. Agent wallet = registrant (msg.sender), and there is
// no on-chain wallet-update fn, so a distinct unverified wallet requires registering from it.
// Run: npx tsx --env-file=.env.local scripts/register-unverified-agent.ts
import { createWalletClient, decodeEventLog, encodeFunctionData, fallback, http, parseEther } from "viem";
import { monadTestnet } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { IDENTITY_REGISTRY, identityAbi, publicClient, walletFor, explorerTx, explorerAddr, RPC_URL } from "../lib/chain";
import { STYLES } from "../lib/styles";

// Dedicated NON-batching transport for the write — the shared batched transport's preflight
// POST flakes on this public RPC; one request at a time + high retries is far more reliable.
const RPC_ALT = "https://testnet-rpc.monadinfra.com";
const writeTransport = fallback([
  http(RPC_URL, { retryCount: 6, retryDelay: 700 }),
  http(RPC_ALT, { retryCount: 4, retryDelay: 700 }),
]);

const OWNER_PK = process.env.OWNER_PRIVATE_KEY as `0x${string}`;
if (!OWNER_PK) throw new Error("OWNER_PRIVATE_KEY missing in env (.env.local)");

// the slot to take over: glassmorphism (index 1) — lowest demo history
const slot = STYLES[1];

function agentCardURI(name: string, style: string, payout: string) {
  const card = { name, style, payoutAddress: payout, endpoint: "" };
  return `data:application/json;base64,${Buffer.from(JSON.stringify(card)).toString("base64")}`;
}

async function main() {
  // 1) fresh wallet — reuse from env if a prior run left one, else generate (print key FIRST)
  const freshKey = (process.env.NEWCOMER_PRIVATE_KEY as `0x${string}`) || generatePrivateKey();
  const W = privateKeyToAccount(freshKey).address;
  console.log("NEWCOMER_PRIVATE_KEY=" + freshKey);
  console.log("Fresh unverified wallet:", W);
  const reused = !!process.env.NEWCOMER_PRIVATE_KEY;

  // 2) fund it from OWNER for registration gas (skip if reusing an already-funded wallet)
  const bal = await publicClient.getBalance({ address: W });
  if (bal < parseEther("0.1")) {
    const { account: owner, client: ownerClient } = walletFor(OWNER_PK);
    console.log("Funding 0.6 MON from OWNER", owner.address, "…");
    const fundHash = await ownerClient.sendTransaction({ to: W, value: parseEther("0.6") });
    await publicClient.waitForTransactionReceipt({ hash: fundHash });
    console.log("  funded:", explorerTx(fundHash));
  } else {
    console.log("  W already funded:", Number(bal) / 1e18, "MON", reused ? "(reused)" : "");
  }

  // 3) register an agent FROM the fresh wallet. viem's writeContract path flakes on this RPC,
  // but plain sendTransaction + encoded calldata is reliable (proven by a self-send). Build the
  // calldata ourselves and send it. (W's nonce may be >0 from setup txs — that's expected.)
  console.log("  W nonce:", await publicClient.getTransactionCount({ address: W }), "(register via sendTransaction+calldata)");
  const wClient = createWalletClient({ account: privateKeyToAccount(freshKey), chain: monadTestnet, transport: writeTransport });
  const uri = agentCardURI(slot.agentName, slot.id, W);
  const data = encodeFunctionData({ abi: identityAbi, functionName: "register", args: [uri] });
  let hash: `0x${string}` | undefined;
  for (let attempt = 1; attempt <= 5 && !hash; attempt++) {
    try {
      hash = await wClient.sendTransaction({ to: IDENTITY_REGISTRY, data, gas: BigInt(800000) });
    } catch (e) {
      console.log(`  register attempt ${attempt} failed (${String((e as Error).message).slice(0, 40)}…) — retrying`);
      await new Promise((r) => setTimeout(r, 2500));
    }
  }
  if (!hash) throw new Error("register failed after 5 attempts (RPC)");
  console.log("  register tx:", explorerTx(hash));
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  let agentId = "?";
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({ abi: identityAbi, data: log.data, topics: log.topics });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (ev.eventName === "Registered") agentId = (ev.args as any).agentId.toString();
    } catch {}
  }
  console.log(`Registered ${slot.agentName} (${slot.id}) from fresh wallet -> agentId ${agentId}  ${explorerTx(hash)}`);

  // 4) confirm getAgentWallet
  const onchainWallet = await publicClient.readContract({ address: IDENTITY_REGISTRY, abi: identityAbi, functionName: "getAgentWallet", args: [BigInt(agentId)] });
  console.log("getAgentWallet:", onchainWallet, onchainWallet === W ? "✓ matches fresh wallet" : "✗ MISMATCH");

  console.log("\n=== SAVE TO .env.local (gitignored) ===");
  console.log("NEWCOMER_PRIVATE_KEY=" + freshKey);
  console.log("NEWCOMER_ADDRESS=" + W);
  console.log("NEWCOMER_AGENT_ID=" + agentId);
  console.log(`\n=== UPDATE AGENT_IDS: replace index 1 (${slot.id} glass slot) with ${agentId} ===`);
}

main().catch((e) => { console.error(e); process.exit(1); });
