# AGNTM-16 — Per-job audit / compliance report

Cleanverse query_txs + download_travel_rule are 403 (role-gated for our tier). Assemble an
audit-ready compliance record from REAL on-chain artifacts + query_apass (which works):
- /api/audit POST {payeeAddress,name,agentId,paymentTx,amountUsd,path,deliverableHash,ratingTx,brief}
  -> getWalletVerification(CLIENT) + getWalletVerification(payee) for both A-Pass records ->
  assemble {parties (payer/payee A-Pass #, tier, KYC hash, verified), settlement (aUSDC,
  contract, amount, tx, explorer), deliverable (keccak256 hash sealed on-chain), reputation
  (rating tx), compliance attestations (identity verified, gate-at-hire, travel-rule-role-note),
  chain, generatedAt}.
- PaymentPanel: 'DOWNLOAD COMPLIANCE REPORT' button (when settled) -> POST /api/audit -> download
  JSON + readable record.
Acceptance: report assembles with both A-Pass records + the aUSDC tx + deliverable hash + rating;
downloadable; honest note that the Cleanverse Travel-Rule export is role-gated.
