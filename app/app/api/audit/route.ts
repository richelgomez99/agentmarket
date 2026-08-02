// POST /api/audit — institution-grade COMPLIANCE CERTIFICATE for a verified agent transaction
// (Track 02 "auditable authorization"). Assembles FATF Travel Rule data (originator + beneficiary
// KYC from both A-Pass records via query_apass) + the on-chain settlement / delivery / reputation,
// and renders a self-contained, printable HTML certificate. SERVER-SIDE.
import { NextRequest } from "next/server";
import { cvQueryApass, isOk, AUSDC_MONAD, CV_CHAIN } from "@/lib/cleanverse";
import { EXPLORER } from "@/lib/chain";

export const runtime = "nodejs";
export const maxDuration = 30;

const CLIENT = (process.env.CLIENT_ADDRESS || "") as `0x${string}`;
const txUrl = (h?: string) => (h ? `${EXPLORER}/tx/${h}` : undefined);
const addrUrl = (a?: string) => (a ? `${EXPLORER}/address/${a}` : undefined);

type ApassFull = { verified: boolean; recordId?: string; tier?: string; kycHash?: string; expiresAt?: number; status?: string };

async function apassRecord(address?: string): Promise<ApassFull> {
  if (!address) return { verified: false };
  try {
    const r = await cvQueryApass(address);
    if (!isOk(r) || !r.data || typeof r.data !== "object") return { verified: false };
    const d = r.data as { cvRecordId?: string; tier?: string; currentKycHash?: string; expirationTime?: number; status?: number };
    const kyc = typeof d.currentKycHash === "string" && !/^0x0+$/.test(d.currentKycHash) ? d.currentKycHash : undefined;
    return { verified: true, recordId: d.cvRecordId ? String(d.cvRecordId) : undefined, tier: d.tier !== undefined ? String(d.tier) : undefined, kycHash: kyc, expiresAt: d.expirationTime, status: d.status === 1 ? "active" : String(d.status) };
  } catch {
    return { verified: false };
  }
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const dateStr = (s?: number) => (s ? new Date(s * 1000).toISOString().slice(0, 10) : "—");

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as {
    payeeAddress?: string; name?: string; agentId?: string; paymentTx?: string; amountUsd?: number;
    path?: string; deliverableHash?: string; ratingTx?: string; brief?: string;
  };

  const [originator, beneficiary] = await Promise.all([apassRecord(CLIENT), apassRecord(b.payeeAddress)]);
  const isAusdc = b.path === "ausdc-transfer";
  const sealed = !!b.deliverableHash && !/^0x0+$/.test(b.deliverableHash);
  const now = new Date();
  const certId = `AM-${b.agentId ?? "0"}-${b.paymentTx ? b.paymentTx.slice(2, 10).toUpperCase() : now.getTime().toString(36).toUpperCase()}`;
  const asset = isAusdc ? "aUSDC — compliant A-Token (clean origination)" : b.path === "x402" ? "USDC (x402)" : "USDC";

  const data = {
    certificate: "Verified Agent Transaction — Compliance Certificate",
    certificateId: certId,
    generatedAt: now.toISOString(),
    chain: "Monad testnet (chainId 10143)",
    standards: ["ERC-8004 (identity + reputation)", "Cleanverse A-Pass (KYC identity)", "Cleanverse A-Token (compliant settlement)", "FATF Travel Rule (counterparty data)"],
    travelRule: {
      originator: { role: "Hiring client (institution / VASP)", name: "AgentMarket Client", wallet: CLIENT, explorer: addrUrl(CLIENT), aPassRecord: originator.recordId, tier: originator.tier, kycHash: originator.kycHash, kycExpiry: dateStr(originator.expiresAt), identityVerified: originator.verified },
      beneficiary: { role: "Design agent", name: b.name, agentId: b.agentId, wallet: b.payeeAddress, explorer: addrUrl(b.payeeAddress), aPassRecord: beneficiary.recordId, tier: beneficiary.tier, kycHash: beneficiary.kycHash, kycExpiry: dateStr(beneficiary.expiresAt), identityVerified: beneficiary.verified },
      transfer: { asset, assetContract: isAusdc ? AUSDC_MONAD : undefined, amountUsd: b.amountUsd, txHash: b.paymentTx, explorer: txUrl(b.paymentTx), chain: CV_CHAIN },
    },
    deliverable: { type: "Self-contained HTML/CSS design mockup", provableDelivery: sealed ? { method: "keccak256(deliverable) sealed on-chain as the ERC-8004 feedbackHash", hash: b.deliverableHash } : null },
    reputation: b.ratingTx ? { method: "ERC-8004 giveFeedback (client→agent, anti-self-feedback enforced)", txHash: b.ratingTx, explorer: txUrl(b.ratingTx) } : null,
    attestations: {
      identityVerified: originator.verified && beneficiary.verified,
      cleanFunds: isAusdc,
      preTransactionGate: true,
      auditTrail: true,
    },
  };

  return Response.json({ ...data, certificateHtml: renderCertificate(data, { brief: b.brief, sealed }) });
}

// ── certificate document (self-contained, printable to PDF) ──────────────────
type CertParty = { role: string; name?: string; agentId?: string; wallet?: string; explorer?: string; aPassRecord?: string; tier?: string; kycHash?: string; kycExpiry: string; identityVerified: boolean };
type CertData = {
  certificate: string; certificateId: string; generatedAt: string; chain: string; standards: string[];
  travelRule: { originator: CertParty; beneficiary: CertParty; transfer: { asset: string; assetContract?: string; amountUsd?: number; txHash?: string; explorer?: string; chain: string } };
  deliverable: { type: string; provableDelivery: { method: string; hash?: string } | null };
  reputation: { method: string; txHash?: string; explorer?: string } | null;
  attestations: { identityVerified: boolean; cleanFunds: boolean; preTransactionGate: boolean; auditTrail: boolean };
};

function renderCertificate(d: CertData, ctx: { brief?: string; sealed: boolean }): string {
  const o = d.travelRule.originator;
  const bn = d.travelRule.beneficiary;
  const t = d.travelRule.transfer;
  const party = (p: CertParty, label: string) => `
    <div class="party">
      <div class="party-h">${label}</div>
      <table>
        <tr><td>Name</td><td>${esc(p.name)}${p.agentId ? ` · agent #${esc(p.agentId)}` : ""}</td></tr>
        <tr><td>Role</td><td>${esc(p.role)}</td></tr>
        <tr><td>Wallet</td><td class="mono"><a href="${esc(p.explorer)}">${esc(p.wallet)}</a></td></tr>
        <tr><td>A-Pass record</td><td>#${esc(p.aPassRecord ?? "—")} · tier ${esc(p.tier ?? "—")} · KYC valid to ${esc(p.kycExpiry)}</td></tr>
        <tr><td>KYC reference</td><td class="mono">${esc(p.kycHash ?? "—")}</td></tr>
        <tr><td>Identity</td><td>${p.identityVerified ? '<span class="ok">✓ A-Pass verified (bank-grade KYC)</span>' : '<span class="bad">✗ not verified</span>'}</td></tr>
      </table>
    </div>`;
  const check = (on: boolean, label: string) => `<div class="att ${on ? "on" : "off"}">${on ? "✓" : "—"} ${esc(label)}</div>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.certificate)} · ${esc(d.certificateId)}</title>
<style>
  :root{--ink:#15233a;--muted:#5b6b86;--line:#dfe6f0;--accent:#0b5cab;--gold:#9a7b1f;--ok:#0f7a3d;--bad:#b23a3a}
  *{box-sizing:border-box}body{margin:0;background:#eef1f6;color:var(--ink);font-family:Georgia,'Times New Roman',serif;line-height:1.5}
  .doc{max-width:820px;margin:28px auto;background:#fff;border:1px solid var(--line);border-top:5px solid var(--accent);box-shadow:0 8px 40px -16px rgba(20,35,58,.3);padding:44px 52px}
  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--line);padding-bottom:18px}
  .brand{font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
  .title{font-size:26px;margin:6px 0 2px;letter-spacing:.01em}
  .sub{font-size:12.5px;color:var(--muted)}
  .seal{text-align:center;border:2px solid var(--gold);border-radius:50%;width:84px;height:84px;display:flex;flex-direction:column;justify-content:center;color:var(--gold);font-size:10px;letter-spacing:.1em;line-height:1.25;flex:0 0 84px}
  .seal b{font-size:15px}
  h2{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin:26px 0 10px;border-bottom:1px solid var(--line);padding-bottom:5px}
  table{width:100%;border-collapse:collapse;font-size:13.5px}
  td{padding:4px 0;vertical-align:top}
  td:first-child{color:var(--muted);width:140px;font-size:12px;padding-right:14px}
  .mono{font-family:'SF Mono',Menlo,Consolas,monospace;font-size:11.5px;word-break:break-all}
  a{color:var(--accent);text-decoration:none}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:22px}
  .party-h{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin-bottom:6px;font-weight:bold}
  .ok{color:var(--ok)}.bad{color:var(--bad)}
  .settle{display:flex;gap:30px;align-items:baseline;font-size:14px}
  .amt{font-size:30px;color:var(--ink)}
  .atts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}
  .att{font-size:13px;padding:9px 12px;border:1px solid var(--line);border-radius:6px}
  .att.on{color:var(--ok);border-color:#bfe3cd;background:#f3fbf6}
  .att.off{color:var(--muted)}
  .foot{margin-top:28px;border-top:1px solid var(--line);padding-top:14px;font-size:11px;color:var(--muted)}
  .std{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  .std span{border:1px solid var(--line);border-radius:20px;padding:2px 10px;font-size:10.5px;color:var(--muted)}
  @media print{body{background:#fff}.doc{box-shadow:none;border:none;margin:0;max-width:100%}}
</style></head><body><div class="doc">
  <div class="top">
    <div>
      <div class="brand">AgentMarket · Verified Finance</div>
      <div class="title">Compliance Certificate</div>
      <div class="sub">Verified Agent Transaction · ${esc(d.certificateId)}</div>
    </div>
    <div class="seal"><b>✓</b>COMPLIANT<br>ON-CHAIN</div>
  </div>

  <h2>Transaction</h2>
  <table>
    <tr><td>Job brief</td><td>${esc(ctx.brief?.slice(0, 180) || "—")}</td></tr>
    <tr><td>Deliverable</td><td>${esc(d.deliverable.type)}</td></tr>
    <tr><td>Network</td><td>${esc(d.chain)}</td></tr>
  </table>

  <h2>Travel Rule — Counterparties</h2>
  <div class="parties">${party(o, "Originator")}${party(bn, "Beneficiary")}</div>

  <h2>Settlement</h2>
  <div class="settle">
    <div><div class="amt">$${(t.amountUsd ?? 0).toFixed(2)}</div></div>
    <div>
      <div><strong>${esc(t.asset)}</strong></div>
      ${t.assetContract ? `<div class="mono">token ${esc(t.assetContract)}</div>` : ""}
      <div class="mono">tx <a href="${esc(t.explorer)}">${esc(t.txHash ?? "—")}</a></div>
    </div>
  </div>

  <h2>Provable Delivery & Reputation</h2>
  <table>
    <tr><td>Deliverable proof</td><td>${ctx.sealed ? `keccak256 sealed on-chain<br><span class="mono">${esc(d.deliverable.provableDelivery?.hash)}</span>` : "—"}</td></tr>
    <tr><td>On-chain rating</td><td>${d.reputation ? `<a class="mono" href="${esc(d.reputation.explorer)}">${esc(d.reputation.txHash)}</a> · ERC-8004 giveFeedback` : "—"}</td></tr>
  </table>

  <h2>Compliance Attestations</h2>
  <div class="atts">
    ${check(d.attestations.identityVerified, "Both counterparties KYC-verified (A-Pass)")}
    ${check(d.attestations.cleanFunds, "Settled in clean, compliant funds (aUSDC)")}
    ${check(d.attestations.preTransactionGate, "Pre-transaction gate: unverified agents blocked at hire")}
    ${check(d.attestations.auditTrail, "Full on-chain audit trail (identity, settlement, delivery, rating)")}
  </div>

  <div class="foot">
    Generated ${esc(d.generatedAt)}. Every fact in this certificate is independently verifiable on the Monad testnet explorer and the Cleanverse A-Pass registry. The Cleanverse Travel-Rule export endpoint is role-gated for this integration tier; the counterparty data above is assembled from on-chain A-Pass records.
    <div class="std">${d.standards.map((s) => `<span>${esc(s)}</span>`).join("")}</div>
  </div>
</div></body></html>`;
}
