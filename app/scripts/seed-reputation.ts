// T010a — seed DIFFERENTIATED per-style reputation from the CLIENT EOA (must differ from the
// agent owner, else giveFeedback reverts). Gives each agent a real, varied track record so the
// orchestrator's "hire by reputation" beat shows real scores (not zeros) at demo time.
// Run: npx tsx --env-file=.env.local scripts/seed-reputation.ts   (after AGENT_IDS is set)

import { REPUTATION_REGISTRY, reputationAbi, publicClient, walletFor, explorerTx } from "../lib/chain";
import { STYLES } from "../lib/styles";

const CLIENT_PK = process.env.CLIENT_PRIVATE_KEY as `0x${string}`;
const AGENT_IDS = (process.env.AGENT_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
if (!CLIENT_PK) throw new Error("CLIENT_PRIVATE_KEY missing in env (.env.local)");
if (AGENT_IDS.length !== STYLES.length)
  throw new Error(`AGENT_IDS has ${AGENT_IDS.length} ids; expected ${STYLES.length}. Run register-agents first and set AGENT_IDS.`);

const { account, client } = walletFor(CLIENT_PK);

// Differentiated targets: each agent is strong at its own style. {score (2dp), jobs}
const SEED: Record<string, { score: number; jobs: number }> = {
  "dark-mode-premium": { score: 4.8, jobs: 23 },
  glassmorphism: { score: 4.5, jobs: 14 },
  brutalist: { score: 4.9, jobs: 31 },
  playful: { score: 4.2, jobs: 9 },
};

// Keep on-chain calls small for a demo: write a few feedbacks per agent (not the full job
// count) at the target score; the displayed "N jobs" can also be read via getSummary count.
const WRITES_PER_AGENT = 3;

async function main() {
  console.log("Seeding reputation from CLIENT", account.address, "(must != owner)");
  for (let i = 0; i < STYLES.length; i++) {
    const s = STYLES[i];
    const agentId = BigInt(AGENT_IDS[i]);
    const target = SEED[s.id];
    const value = BigInt(Math.round(target.score * 100)); // e.g. 4.8 -> 480
    for (let w = 0; w < WRITES_PER_AGENT; w++) {
      const hash = await client.writeContract({
        address: REPUTATION_REGISTRY,
        abi: reputationAbi,
        functionName: "giveFeedback",
        args: [agentId, value, 2, s.id, "agentmarket", "", "", "0x0000000000000000000000000000000000000000000000000000000000000000"],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`  ${s.agentName} #${agentId} feedback ${w + 1}/${WRITES_PER_AGENT} (score ${target.score})  ${explorerTx(hash)}`);
    }
  }
  console.log("\nDone. Verify non-zero getSummary on the explorer.");
}

main().catch((e) => { console.error(e); process.exit(1); });
