// POST /api/pay — pay the hired agent on-chain (contracts/api-routes.md).
// x402-first with direct USDC transfer fallback; returns the REAL settled path + tx.
import { NextRequest } from "next/server";
import type { Address } from "viem";
import { pay } from "@/lib/x402";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { payoutAddress, amountUsd } = body as { payoutAddress: Address; amountUsd: number };
  const forceFallback = !!body.forceFallback && process.env.NODE_ENV !== "production";
  if (!payoutAddress?.startsWith("0x") || !(amountUsd > 0) || amountUsd > 1) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  try {
    const result = await pay(payoutAddress, amountUsd, forceFallback);
    return Response.json(result);
  } catch (e) {
    console.error("[pay]", e);
    return Response.json({ error: "payment failed", detail: (e as Error).message }, { status: 502 });
  }
}
