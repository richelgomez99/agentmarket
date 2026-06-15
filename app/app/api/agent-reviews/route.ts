// GET /api/agent-reviews?agentId=1765 — an agent's REAL on-chain reputation, broken down by
// specialty via ERC-8004 getSummary (no log scanning — the public RPC caps getLogs ranges).
import { NextRequest } from "next/server";
import { REPUTATION_REGISTRY, IDENTITY_REGISTRY, publicClient, reputationAbi, explorerAddr, fixedToNumber } from "@/lib/chain";
import { STYLES } from "@/lib/styles";

export const runtime = "nodejs";
export const maxDuration = 30;

const CLIENT = (process.env.CLIENT_ADDRESS || "") as `0x${string}`;

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId");
  if (!agentId) return Response.json({ error: "agentId required" }, { status: 400 });
  try {
    const id = BigInt(agentId);
    const breakdown = await Promise.all(
      STYLES.map(async (st) => {
        try {
          const [count, value, decimals] = (await publicClient.readContract({
            address: REPUTATION_REGISTRY,
            abi: reputationAbi,
            functionName: "getSummary",
            args: [id, [CLIENT], st.id, ""],
          })) as [bigint, bigint, number];
          const c = Number(count);
          return { style: st.id, label: st.label, count: c, score: c > 0 ? fixedToNumber(value, decimals) : 0 };
        } catch {
          return { style: st.id, label: st.label, count: 0, score: 0 };
        }
      })
    );
    return Response.json({
      agentId,
      breakdown: breakdown.filter((b) => b.count > 0),
      registryUrl: explorerAddr(REPUTATION_REGISTRY),
      identityUrl: explorerAddr(IDENTITY_REGISTRY),
      client: CLIENT,
      clientUrl: explorerAddr(CLIENT),
    });
  } catch (e) {
    console.error("[agent-reviews]", e);
    return Response.json({ agentId, breakdown: [], error: "read failed" }, { status: 200 });
  }
}
