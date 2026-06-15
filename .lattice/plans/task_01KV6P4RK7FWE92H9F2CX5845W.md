# AGNTM-4: Agent.verification type + progressive client merge

FR-005/006. Add AgentVerification + Agent.verification? to app/lib/types.ts. In app/app/page.tsx, AFTER candidates load (idle rail + orchestrate open stage), fetch GET /api/cleanverse/verify?addresses=<unique payoutAddresses>, merge by address into agent state. Must NOT block render; tolerate available:false. Absent field => not-checked (never unverified). Depends on CLN-3.
