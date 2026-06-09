// POST /api/feedback — write the job's rating on-chain, then read it back.
// giveFeedback MUST be called by the CLIENT EOA (≠ agent owner — anti-self-feedback).
import { NextRequest } from "next/server";
import { REPUTATION_REGISTRY, reputationAbi, publicClient, walletFor, explorerTx } from "@/lib/chain";
import { styleSummary } from "@/lib/registry";
import type { Style } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const ZERO32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { agentId, style } = body as { agentId: string; style: Style };
  const value = BigInt(Math.min(500, Math.max(0, Math.round(Number(body.value ?? 490))))); // 2dp, default ★4.90
  if (!agentId || !style) return Response.json({ error: "bad request" }, { status: 400 });

  try {
    const { client } = walletFor(process.env.CLIENT_PRIVATE_KEY as `0x${string}`);
    const hash = await client.writeContract({
      address: REPUTATION_REGISTRY,
      abi: reputationAbi,
      functionName: "giveFeedback",
      args: [BigInt(agentId), value, 2, style, "agentmarket", "", "", ZERO32],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    const reputation = await styleSummary(BigInt(agentId), style); // read back the updated record
    return Response.json({ txHash: hash, explorerUrl: explorerTx(hash), reputation });
  } catch (e) {
    console.error("[feedback]", e);
    return Response.json({ error: "feedback failed", detail: (e as Error).message }, { status: 502 });
  }
}
