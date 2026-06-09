# UI Component Contracts (presentational, prop-driven)

These are the 7 named components. Keep them **presentational**: they take data via props and
render — no data fetching, no chain calls inside. The page (`app/page.tsx`) owns state and
calls the API routes; components just display. This is the seam that lets a separately-designed
(e.g. cloud-generated) UI drop in: match these prop names and the wiring is unchanged.

Shared types (define in `lib/types.ts`):
```ts
type Style = "dark-mode-premium" | "glassmorphism" | "brutalist" | "playful";
type Reputation = { count: number; score: number };           // score e.g. 4.8
type Agent = { agentId: string; name: string; style: Style; payoutAddress: string;
               reputation: Reputation; perStyleScore?: number; hired?: boolean };
type DesignOutput = { style: Style; html: string;
               status: "loading"|"generated"|"fallback"|"error"; elapsedMs?: number };
type Payment = { path: "x402"|"usdc-transfer"|"mon-transfer"; txHash: string;
               explorerUrl: string; status: "pending"|"settled"|"failed"; amountUsd: number };
```

## BriefInput
`{ value: string; onChange(v): void; onSubmit(): void; disabled?: boolean }`
Free-text brief + submit. Disabled while a job runs.

## AgentCandidateCard
`{ agent: Agent; inferredStyle?: Style; selected?: boolean }`
Shows name, style tag, **per-style reputation** (★score + "N paid jobs"), and a clear HIRED
state when `selected`. The specialist-match is the differentiator — surface the per-style score
prominently when it matches `inferredStyle`.

## OrchestratorReasoning
`{ text: string; streaming: boolean; selectedAgentName?: string }`
Renders the orchestrator's reasoning as it streams; highlights the final hire line big and
legible ("HIRING DarkModeAgent ★4.8 — best dark-mode specialist").

## DesignPreviewGrid
`{ outputs: DesignOutput[] }`
Grid of sandboxed previews. Each renders `html` via `<iframe sandbox srcDoc={html}>` WITHOUT
`allow-same-origin`. `loading` → skeleton; `fallback` → render fallback HTML (optionally a
subtle "fallback" marker). Never blank.

## PaymentPanel
`{ payment?: Payment }`
Shows amount, the **path used** (x402 vs transfer — Constitution IV), status, and a clickable
real explorer link. Empty state before payment.

## ReputationPanel
`{ agent: Agent; previousScore?: number; txHash?: string; explorerUrl?: string }`
Shows the selected agent's score animating up (`previousScore` → `reputation.score`) and the
job-count increment ("job #N"); clickable explorer link to the feedback tx.

## ExplorerPanel
`{ events: { label: string; txHash: string; explorerUrl: string; ts: number }[] }`
Live feed of REAL txs (payment, feedback) with clickable real hashes. The credibility beat:
real, openable hashes — explicitly unlike mocked feeds. T5 (live-updating).

## Composition (app/page.tsx)
Owns job state; on submit → `/api/orchestrate` (stream into OrchestratorReasoning + fill
AgentCandidateCards) → `/api/generate` ×N (fill DesignPreviewGrid) → on accept → `/api/pay`
(PaymentPanel) → `/api/feedback` (ReputationPanel + ExplorerPanel). T1 builds this flow with
local style personas + mock agents; T2 swaps in real on-chain agents.
