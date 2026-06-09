// T009/T010 — register the 4 specialist agents on the ERC-8004 IdentityRegistry from the
// OWNER EOA. Run: npx tsx --env-file=.env.local scripts/register-agents.ts
// Prints AGENT_IDS to paste into .env.local. Agent card payout = OWNER (O); the CLIENT (C)
// pays + rates later, kept distinct for anti-self-feedback.

import { decodeEventLog } from "viem";
import { IDENTITY_REGISTRY, identityAbi, publicClient, walletFor, explorerTx } from "../lib/chain";
import { STYLES } from "../lib/styles";

const OWNER_PK = process.env.OWNER_PRIVATE_KEY as `0x${string}`;
if (!OWNER_PK) throw new Error("OWNER_PRIVATE_KEY missing in env (.env.local)");

const { account, client } = walletFor(OWNER_PK);

function agentCardURI(name: string, style: string, payout: string) {
  const card = { name, style, payoutAddress: payout, endpoint: "" };
  const b64 = Buffer.from(JSON.stringify(card)).toString("base64");
  return `data:application/json;base64,${b64}`;
}

async function main() {
  console.log("Registering 4 agents from OWNER", account.address);
  const ids: string[] = [];
  for (const s of STYLES) {
    const uri = agentCardURI(s.agentName, s.id, account.address);
    const hash = await client.writeContract({
      address: IDENTITY_REGISTRY,
      abi: identityAbi,
      functionName: "register",
      args: [uri],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    let agentId = "?";
    for (const log of receipt.logs) {
      try {
        const ev = decodeEventLog({ abi: identityAbi, data: log.data, topics: log.topics });
        if (ev.eventName === "Registered") agentId = (ev.args as any).agentId.toString();
      } catch {}
    }
    ids.push(agentId);
    console.log(`  ${s.agentName} (${s.id}) -> agentId ${agentId}  ${explorerTx(hash)}`);
  }
  console.log("\nPaste into .env.local:\nAGENT_IDS=" + ids.join(","));
}

main().catch((e) => { console.error(e); process.exit(1); });
