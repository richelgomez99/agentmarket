// On-chain agent registry reads (SERVER-SIDE). T2: the orchestrator's data source.
// Agents were registered at T0 (AGENT_IDS, one per style, in lib/styles order); identity +
// payout + reputation are read live from the pre-deployed ERC-8004 registries.
import { IDENTITY_REGISTRY, REPUTATION_REGISTRY, identityAbi, reputationAbi, publicClient, fixedToNumber } from "./chain";
import { STYLES } from "./styles";
import type { Agent, Style } from "./types";

const CLIENT = (process.env.CLIENT_ADDRESS || "") as `0x${string}`;

function agentIds(): bigint[] {
  return (process.env.AGENT_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(BigInt);
}

/** Per-style reputation: getSummary with tag1=<style>. clientAddresses MUST be non-empty. */
export async function styleSummary(agentId: bigint, style: Style): Promise<{ count: number; score: number }> {
  const [count, value, decimals] = (await publicClient.readContract({
    address: REPUTATION_REGISTRY,
    abi: reputationAbi,
    functionName: "getSummary",
    args: [agentId, [CLIENT], style, ""],
  })) as [bigint, bigint, number];
  return { count: Number(count), score: Number(count) > 0 ? fixedToNumber(value, decimals) : 0 };
}

/** List the registered agents with payout + their own-specialty reputation, read from chain. */
export async function listAgents(): Promise<Agent[]> {
  const ids = agentIds();
  return Promise.all(
    ids.map(async (id, i) => {
      const s = STYLES[i]; // registration order == styles order (T0)
      const [payout, own] = await Promise.all([
        publicClient.readContract({ address: IDENTITY_REGISTRY, abi: identityAbi, functionName: "getAgentWallet", args: [id] }) as Promise<`0x${string}`>,
        styleSummary(id, s.id),
      ]);
      return {
        agentId: id.toString(),
        name: s.agentName,
        style: s.id,
        payoutAddress: payout,
        reputation: { count: own.count, score: own.score },
      } satisfies Agent;
    })
  );
}

/** Attach each agent's track record FOR the inferred style (the specialty-match read). */
export async function withPerStyleScores(agents: Agent[], inferred: Style): Promise<Agent[]> {
  return Promise.all(
    agents.map(async (a) => {
      const ps = a.style === inferred ? { score: a.reputation.score } : await styleSummary(BigInt(a.agentId), inferred);
      return { ...a, perStyleScore: ps.score };
    })
  );
}

/** Deterministic winner: best per-style score, then higher overall count, then lower agentId. */
export function pickWinner(agents: Agent[]): Agent {
  return [...agents].sort((x, y) => {
    const ps = (y.perStyleScore ?? 0) - (x.perStyleScore ?? 0);
    if (ps !== 0) return ps;
    const c = y.reputation.count - x.reputation.count;
    if (c !== 0) return c;
    return Number(BigInt(x.agentId) - BigInt(y.agentId));
  })[0];
}
