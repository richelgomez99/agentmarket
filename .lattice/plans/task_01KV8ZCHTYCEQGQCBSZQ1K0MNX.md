# AGNTM-13: A-Pass proof — show query_apass record + link verified wallet

Operator screenshot: 'VIEW A-PASS ON MONAD' linked the A-Pass registry CONTRACT which shows empty (0 txns) on the explorer — looks fake. Real proof: A-Pass is an ERC721 the verified wallet HOLDS (balanceOf=1) and query_apass returns a rich record (cvRecordId 397, tier 20, status active, KYC hash, expiry). Fix: verify API returns the A-Pass record for verified wallets; modal shows it (record #, tier, KYC-bound, active, expiry) and links the VERIFIED WALLET address (holds the NFT + real activity), not the contract.
