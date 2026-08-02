# AGNTM-15 — C2 clean settlement in aUSDC

Confirmed: only A-Pass holders can hold/move aUSDC (faucet to unverified CLIENT reverted).
Minted CLIENT an A-Pass (#406) -> faucet succeeded -> CLIENT holds 5 aUSDC.

- x402.ts: add payAusdc(payout, amountUsd) — ERC20 transfer of aUSDC (0xaC08…1f20D, 6dp) from
  CLIENT via sendTransaction+encoded calldata (reliable; writeContract flaked on this RPC).
  Returns path "ausdc-transfer".
- pay(): try aUSDC FIRST (compliant clean settlement); fall back to x402 USDC, then direct USDC.
- types Payment.path += "ausdc-transfer"; PaymentPanel labels it "aUSDC · compliant A-Token".
- Recipient is always a VERIFIED agent (the hire gate guarantees it) -> transfer allowed.
Acceptance: a hire→pay run settles in aUSDC to the verified agent, UI shows the compliant path + tx;
falls back to USDC if aUSDC unavailable.
