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
    // recent INDIVIDUAL ratings (real per-job entries via readFeedback; 1-based index).
    // No log scan -> sidesteps the getLogs RPC cap. Best-effort; newcomers have none.
    let reviews: { index: number; score: number; tag1: string; tag2: string; sealed: boolean }[] = [];
    try {
      const lastIndex = Number(
        (await publicClient.readContract({ address: REPUTATION_REGISTRY, abi: reputationAbi, functionName: "getLastIndex", args: [id, CLIENT] })) as bigint
      );
      const idxs: number[] = [];
      for (let i = lastIndex; i >= 1 && idxs.length < 6; i--) idxs.push(i);
      reviews = (
        await Promise.all(
          idxs.map(async (i) => {
            try {
              const [value, decimals, tag1, tag2, hash] = (await publicClient.readContract({
                address: REPUTATION_REGISTRY,
                abi: reputationAbi,
                functionName: "readFeedback",
                args: [id, CLIENT, BigInt(i)],
              })) as [bigint, number, string, string, string];
              return { index: i, score: fixedToNumber(value, decimals), tag1, tag2, sealed: !!hash && !/^0x0+$/.test(hash) };
            } catch {
              return null;
            }
          })
        )
      ).filter((r): r is NonNullable<typeof r> => !!r);
    } catch {
      /* no individual ratings (e.g. a newcomer with no feedback yet) */
    }

    return Response.json({
      agentId,
      breakdown: breakdown.filter((b) => b.count > 0),
      reviews,
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
