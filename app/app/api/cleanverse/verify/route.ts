// GET /api/cleanverse/verify?addresses=0xabc,0xdef
// Per-address A-Pass verification, deduped, best-effort. Server-side only — the Cleanverse
// API key never reaches the client. SPEC §7, FR-003/004/010.
//
// Configured:   { available: true,  results: { "<addrLower>": AgentVerification, ... } }
// Unconfigured: { available: false, results: {} }  (HTTP 200, ZERO network calls)
//
// Best-effort: never 5xx the client into a broken flow. Per-address failures already map to
// status:"unavailable" inside verifyAddresses/getWalletVerification.
import { NextRequest } from "next/server";
import { cvConfigured, verifyAddresses } from "@/lib/cleanverse";

export const runtime = "nodejs";

const ADDR_RE = /^0x[0-9a-f]{40}$/;

export async function GET(req: NextRequest) {
  // Parse, lowercase, validate; drop malformed entries silently (not fatal).
  const raw = req.nextUrl.searchParams.get("addresses") ?? "";
  const valid = Array.from(
    new Set(
      raw
        .split(",")
        .map((a) => a.trim().toLowerCase())
        .filter((a) => ADDR_RE.test(a))
    )
  );

  // Unconfigured ⇒ no network calls at all.
  if (!cvConfigured()) {
    return Response.json({ available: false, results: {} });
  }

  try {
    const results = await verifyAddresses(valid);
    return Response.json({ available: true, results });
  } catch {
    // Unexpected failure: stay best-effort rather than 5xx-ing the client.
    return Response.json({ available: true, results: {} });
  }
}
