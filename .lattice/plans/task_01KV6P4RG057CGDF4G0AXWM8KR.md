# AGNTM-3: Cleanverse verify API route

GET /api/cleanverse/verify?addresses=... (nodejs). FR-003/004. New app/app/api/cleanverse/verify/route.ts. Parse comma-sep addresses (lowercase, validate 0x). !cvConfigured() => {available:false,results:{}} with ZERO network calls. Else verifyAddresses => {available:true,results}. Best-effort, never 5xx; per-address failures => unavailable. Atoken+chain are server constants. AC-1: live CLIENT+OWNER => unverified+magickLink. Depends on CLN-2.
