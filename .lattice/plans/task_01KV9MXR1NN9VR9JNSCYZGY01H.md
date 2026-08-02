# AGNTM-17: Institution-grade Compliance Certificate + Travel Rule

Upgrade /api/audit: fetch FULL A-Pass KYC records (cvRecordId, tier, full currentKycHash, expiry, status) for both parties via query_apass; add FATF Travel Rule data (originator=hiring client VASP, beneficiary=agent — name, wallet, A-Pass#, KYC hash, tier, verified) + transfer (aUSDC, contract, amount, tx, chain). Emit a self-contained, professionally-styled HTML COMPLIANCE CERTIFICATE (printable to PDF). Download button downloads the .html certificate instead of raw JSON. The institutional takeaway artifact.
