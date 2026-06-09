# Claude Artifacts design prompt — AgentMarket UI

Paste everything inside the `=== PROMPT ===` block into a new claude.ai chat (request a React
artifact). It produces ONE self-contained React + Tailwind artifact: the 7 named components
with our exact prop contracts + a mock-data demo harness that steps through the live flow.
Hand the result back here and integration is: split components into files, swap mock props for
real hooks. **Why these rules:** matching the prop names/types verbatim and keeping components
presentational (no data fetching, no chain calls) is what makes the handback drop in with
near-zero rework.

=== PROMPT ===

Build me a **React artifact** (with Tailwind, which you have out of the box) for a live demo UI
called **AgentMarket**. Make it visually striking and, above all, **legible at a glance** — a
non-technical person in a hackathon audience should understand what's happening with the sound
off.

## What AgentMarket does (so you design the right thing)
An AI **orchestrator** reads an on-chain marketplace of specialist AI **design agents**,
autonomously **hires** the best one for the user's brief based on its **on-chain-earned
reputation** (a track record of real paid jobs, per design style), watches it **generate** a
styled web page live, **pays** it in stablecoin on-chain, and writes its **reputation**
on-chain. The wow is: *an AI hired and paid another AI by its proven track record — live, for
real, on a blockchain.* The whole screen exists to make that story obvious and thrilling.

## Deliverable (read carefully — this is for integration into a real Next.js app)
Produce **ONE artifact** containing all of the below, in **TypeScript (.tsx)**:
1. The **7 presentational components** named EXACTLY as specified, each taking data ONLY via
   props (the exact prop interfaces are given below — use them verbatim). **No data fetching,
   no network calls, no blockchain/wallet code, no timers except presentational animation.**
2. A `DemoHarness` parent component that holds **mock data** in state and renders the full
   screen by composing the 7 components, plus a small **state stepper** (buttons: Idle →
   Orchestrating → Generating → Awaiting accept → Paying → Rated) so I can watch every state
   and transition. All mock data lives ONLY in `DemoHarness`.
3. Default-export `DemoHarness` so the artifact preview runs.

**Constraints (important for drop-in integration):**
- **Tailwind utility classes only.** No external CSS files, no styled-components, no shadcn/ui,
  no other component libraries. `lucide-react` icons are OK (nothing else).
- Keep each component in its **own clearly-delimited section** with a `// ===== ComponentName.tsx
  =====` banner comment, so I can split them into files.
- Components are **dumb/presentational**: props in, JSX out. Do not invent extra required props;
  you may add OPTIONAL props for visual flourish, but never rename or drop the ones specified.
- The design preview component renders untrusted HTML in a sandboxed iframe via
  `<iframe sandbox srcDoc={output.html} />` — **do not add `allow-same-origin`**. For mock data,
  pass a few short self-contained HTML strings (different colors per style) so the grid looks alive.
- Assume dark theme. Mobile-friendly but optimized for a **projector / wide screen**.

## Screen layout (one screen, no routing)
A single dashboard, "live mission-control" energy:
- **Top**: product wordmark + a `BriefInput` (big, inviting). On submit, the flow begins.
- **Left column**: `OrchestratorReasoning` (the AI "thinking out loud" as it streams) sitting
  above the `AgentCandidateCard` list (the market of specialists with their per-style reputation;
  the hired one is unmistakably highlighted).
- **Center/main**: `DesignPreviewGrid` — the 3–4 sandboxed iframes rendering the generated
  designs, with skeleton loaders while "generating."
- **Right column (the proof rail)**: `PaymentPanel` (which path settled + tx link),
  `ReputationPanel` (the hired agent's score animating UP, "job #N"), and `ExplorerPanel` (a
  live feed of REAL transaction hashes you can click). This rail is the "it's really on-chain"
  evidence — make the tx hashes and the score tick-up feel important and alive.

## The beats the UI must make obvious (this is the whole point)
1. **The hire**: a big, legible moment — "HIRING **DarkModeAgent** ★4.8 — best dark-mode
   specialist (23 paid jobs)". The orchestrator's reasoning streams in, then resolves to this.
2. **The work**: ugly→beautiful — the chosen design renders live in its iframe.
3. **The payment**: "PAID 0.01 USDC ✓" with a clickable tx link, and a clear label of which
   path settled (x402 vs direct transfer).
4. **The reputation**: the agent's score animates **upward** (e.g. 4.8 → 4.9) and the job count
   increments ("job #24"), with a clickable tx link.
Make these four moments feel like *events*, with motion/emphasis — they are the demo.

## Visual direction (make it yours, but serve legibility + differentiation)
- **Mood**: live, kinetic, "an economy running in real time" — think trading terminal / mission
  control, NOT a calm pastel directory. (A competitor used a calm sage-green/cream document look;
  go the opposite way so we read as *alive and real*.)
- **Suggested palette** (riff freely): near-black background (`#0A0B0F`-ish), high-contrast
  off-white text, ONE electric accent (e.g. acid green, electric cyan, or violet) used for live
  state + the hire/pay/rate moments; muted grays for chrome; a positive green for "settled"/score-up.
- **Type**: a strong geometric/grotesk sans for headings; a **monospace** for addresses, tx
  hashes, amounts, and reputation numbers (makes the on-chain data feel real and legible).
- **Motion**: purposeful and quick — streaming text for reasoning, skeleton→render for designs,
  a count-up animation for the reputation score, a subtle pulse on a "LIVE" tx. Nothing slow or
  decorative that would stall a 90-second demo.
- **States to design**: empty/idle, loading/skeleton, the hired highlight, settled/success, and
  a labeled fallback (a design slot that used a fallback). No blank/broken states.

## EXACT prop contracts (use verbatim — define these types and use these names)
```ts
type Style = "dark-mode-premium" | "glassmorphism" | "brutalist" | "playful";
type Reputation = { count: number; score: number };            // score e.g. 4.8
type Agent = {
  agentId: string; name: string; style: Style; payoutAddress: string;
  reputation: Reputation; perStyleScore?: number; hired?: boolean;
};
type DesignOutput = {
  style: Style; html: string;
  status: "loading" | "generated" | "fallback" | "error"; elapsedMs?: number;
};
type Payment = {
  path: "x402" | "usdc-transfer" | "mon-transfer"; txHash: string;
  explorerUrl: string; status: "pending" | "settled" | "failed"; amountUsd: number;
};

// BriefInput        — props: { value: string; onChange(v: string): void; onSubmit(): void; disabled?: boolean }
// AgentCandidateCard — props: { agent: Agent; inferredStyle?: Style; selected?: boolean }
// OrchestratorReasoning — props: { text: string; streaming: boolean; selectedAgentName?: string }
// DesignPreviewGrid  — props: { outputs: DesignOutput[] }   // render each via <iframe sandbox srcDoc>
// PaymentPanel       — props: { payment?: Payment }
// ReputationPanel    — props: { agent: Agent; previousScore?: number; txHash?: string; explorerUrl?: string }
// ExplorerPanel      — props: { events: { label: string; txHash: string; explorerUrl: string; ts: number }[] }
```

## Mock data to seed in DemoHarness (make it feel real)
- 4 agents, one per style, with **differentiated per-style** reputation (e.g. DarkModeAgent
  ★4.8 / 23 jobs, GlassAgent ★4.5 / 14, BrutalistAgent ★4.9 / 31, PlayfulAgent ★4.2 / 9).
- Real-looking 0x addresses (truncated like `0x9B44…fEe41`) and full-length-looking tx hashes
  (66 chars) for the explorer feed and tx links.
- A few short self-contained HTML strings (distinct background colors / layouts per style) for
  the iframe previews.
- An explorer feed with 3–5 events (a payment, a reputation update, a registration), each with a
  real-looking hash and a "LIVE" indicator on the newest.

## Do NOT
- Do not add real API calls, fetch, websockets, wallet/web3 libraries, or environment access.
- Do not rename or remove any specified prop; do not move mock data inside the dumb components.
- Do not use shadcn/ui or any component library besides lucide-react icons.
- Do not claim anything the UI can't show (no "proven best design", no "Sybil-resistant").

Deliver the single artifact now. After I see it, I'll ask for visual iterations.

=== END PROMPT ===

## After you get the artifact back
Hand it to me (paste the code or the file). I will: (1) split each `// ===== X.tsx =====`
section into `app/components/X.tsx`, (2) replace the `DemoHarness` mock state with the real
`app/app/page.tsx` wiring that calls `/api/orchestrate|generate|pay|feedback`, (3) keep your
Tailwind/visual exactly as-is. Because the prop names/types already match
`contracts/ui-components.md`, this is mechanical.
