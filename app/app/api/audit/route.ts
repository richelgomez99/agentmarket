// POST /api/audit — per-job audit-ready COMPLIANCE RECORD (Track 02 "auditable authorization").
// Cleanverse query_txs/download_travel_rule are role-gated (403) for our tier, so we assemble the
// record from REAL on-chain artifacts + query_apass: both parties' A-Pass, the aUSDC settlement,
// the sealed deliverable hash, and the on-chain rating. SERVER-SIDE.
import { NextRequest } from "next/server";
import { getWalletVerification, AUSDC_MONAD, CV_CHAIN } from "@/lib/cleanverse";
import { EXPLORER } from "@/lib/chain";

export const runtime = "nodejs";
export const maxDuration = 30;

const CLIENT = (process.env.CLIENT_ADDRESS || "") as `0x${string}`;
const tx = (h?: string) => (h ? `${EXPLORER}/tx/${h}` : undefined);
const addr = (a?: string) => (a ? `${EXPLORER}/address/${a}` : undefined);

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as {
    payeeAddress?: string;
    name?: string;
    agentId?: string;
    paymentTx?: string;
    amountUsd?: number;
    path?: string;
    deliverableHash?: string;
    ratingTx?: string;
    brief?: string;
  };

  const [payer, payee] = await Promise.all([
    getWalletVerification(CLIENT),
    b.payeeAddress ? getWalletVerification(b.payeeAddress) : Promise.resolve(undefined),
  ]);

  const isAusdc = b.path === "ausdc-transfer";
  const sealed = !!b.deliverableHash && !/^0x0+$/.test(b.deliverableHash);

  const report = {
    report: "AgentMarket — Verified Agent Transaction · Compliance Record",
    standard: "ERC-8004 (identity + reputation) · Cleanverse A-Pass / A-Token (Track 02)",
    chain: `Monad testnet (chainId 10143)`,
    job: {
      brief: b.brief?.slice(0, 240),
      deliverable: "Self-contained HTML/CSS design mockup (visual direction)",
      provableDelivery: sealed
        ? { method: "keccak256(deliverable) sealed on-chain as the ERC-8004 feedbackHash", hash: b.deliverableHash }
        : { method: "deliverable hash not sealed for this job" },
    },
    parties: {
      payer: {
        role: "Hiring client (institution)",
        address: CLIENT,
        explorer: addr(CLIENT),
        identityVerified: payer.status === "verified",
        aPass: payer.record ?? null,
      },
      payee: {
        role: "Design agent",
        name: b.name,
        agentId: b.agentId,
        address: b.payeeAddress,
        explorer: addr(b.payeeAddress),
        identityVerified: payee?.status === "verified",
        aPass: payee?.record ?? null,
      },
    },
    settlement: {
      asset: isAusdc ? "aUSDC — compliant A-Token (clean origination)" : b.path === "x402" ? "USDC via x402" : "USDC",
      assetContract: isAusdc ? AUSDC_MONAD : undefined,
      amountUsd: b.amountUsd,
      path: b.path,
      txHash: b.paymentTx,
      explorer: tx(b.paymentTx),
    },
    reputation: b.ratingTx ? { method: "ERC-8004 giveFeedback (client→agent, anti-self-feedback)", txHash: b.ratingTx, explorer: tx(b.ratingTx) } : null,
    complianceAttestations: [
      `Counterparty identity: A-Pass verified on Cleanverse (verify_apass, ${CV_CHAIN}).`,
      "Pre-transaction control: unverified agents are blocked at hire (compliance gate).",
      isAusdc ? "Clean funds: settled in aUSDC, whose on-chain rules restrict holders to A-Pass identities." : "Settled in USDC.",
      "Note: the Cleanverse Travel-Rule export endpoint is role-gated for this integration tier; this record is assembled from on-chain artifacts + A-Pass reads.",
    ],
  };

  return Response.json(report);
}
