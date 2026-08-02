# OQ-1 + OQ-2 RESOLVED (Architect, live sandbox test)

**Date:** during Phase 3 dispatch. Source: live `/generate_apass` + `/verify_apass` calls against `uatapi.cleanverse.com`.

## OQ-2 — Integration role: **ISSUE MEMBER** ✅
`POST /generate_apass` (encrypted) for the OWNER wallet returned `code:"0000"` `message:"success"` with a real Monad `txHash` and `cvRecordId`. **We are authorized to mint A-Passes in-app** — onboarding does NOT require the magic link.

## OQ-1 — The verified-response signal (THE mapper input for AGNTM-2) ✅
`/verify_apass` `data.code` is the verdict. Observed both states on Monad:

| State | `data.code` | `data.message` |
|---|---|---|
| **Verified** | **`4`** | `"apass verify success"` |
| **Unverified** | `2` | `"apass not exist"` |

**Verified VERIFIED-state response (capture this):**
```json
{ "code":"0000", "message":"ok",
  "data": { "chain":"monad", "atoken":"0xaC0893567D43C3E7e6e35a72803df05416C1f20D",
            "address":"0xAf5E06f8924d4480EfEeA1122485a8e9C63c2Abd",
            "code": 4, "message": "apass verify success",
            "magickLink": "https://test-magiclink.cleanverse.com/" } }
```

## Mapper rule for AGNTM-2 (`verifyAddresses` / `getWalletVerification`)
- `outer code === "0000"` AND `data.code === 4` (or `data.message` contains `"verify success"`) ⇒ **`verified: true`, status `"verified"`**.
- `outer code === "0000"` AND `data.code !== 4` (e.g. `2` / "apass not exist") ⇒ **`status: "unverified"`**, `onboardUrl = data.magickLink`.
- thrown / non-`0000` outer / unparseable ⇒ **`status: "unavailable"`** (not a real negative).
- Note: `magickLink` is present in BOTH states — do NOT use its presence as a signal. Use `data.code === 4`.

## Demo implication
The OWNER wallet (`0xAf5E…2Abd`) now holds an A-Pass. If the agents' `payoutAddress` resolves to OWNER (it does for the current registration), **all agents will show the green Verified badge**. The unverified state can still be demoed against any wallet without an A-Pass (e.g. the CLIENT wallet `0x261B…CF95`, still `data.code:2`).
