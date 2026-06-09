# Feature Specification: AgentMarket

**Feature Branch**: `001-agentmarket`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "AgentMarket — a marketplace of specialist AI design agents with
provable, on-chain-earned reputation on Monad testnet. An orchestrator discovers agents
on-chain, hires the best by reputation, they generate UI designs live, get paid on-chain
(x402 with USDC/MON fallback), and have reputation written on-chain."

## User Scenarios & Testing *(mandatory)*

<!--
  Stories are prioritized as the build's demo tiers. Each is INDEPENDENTLY TESTABLE and
  independently demoable. P1 (T1) alone is a viable MVP and a complete demo. Each higher tier
  layers on top without breaking the one below — matching the constitution's demo-first
  tiering (Principle I) and per-tier test gate (Principle II).
-->

### User Story 1 - Live design generation from a brief (Priority: P1) — Tier T1

A user faces a messy, unstyled landing page ("every vibe coder's problem"). They type a design
brief in plain language (e.g. "Make this a premium dark-mode SaaS landing page with smooth
animation"). Several specialist design agents — each with a distinct style (dark-mode premium,
glassmorphism, brutalist, playful) — each produce a complete, self-contained styled page from
that brief. The user watches the styled results appear live, side by side, each in its own
isolated preview, with a loading state while it works. If one agent stalls or fails, a
pre-prepared styled version for that style still appears so the screen is never broken or empty.

**Why this priority**: This is the emotional peak of the demo and the project's guaranteed-safe
core — it depends on nothing on-chain. If everything else slips, this alone wins the room.
Per the constitution it MUST be built first, run end-to-end, and be committed before any
on-chain tier begins.

**Independent Test**: Type a brief, submit it, and confirm that multiple visibly distinct
styled previews render live, and that forcing one agent to fail still yields a styled fallback
for that slot within a bounded time. Fully testable with zero blockchain involvement.

**Acceptance Scenarios**:

1. **Given** the app is open on the unstyled input page, **When** the user submits a brief,
   **Then** each specialist style shows a loading state and is then replaced by a complete,
   visibly distinct styled preview of the page.
2. **Given** a brief has been submitted, **When** one style's generation fails or exceeds its
   time limit, **Then** that slot shows a pre-prepared styled fallback for its style rather
   than an error or an empty frame, and the other styles are unaffected.
3. **Given** any generated preview, **When** it renders, **Then** it is shown in an isolated
   sandbox that cannot reach the surrounding page's data, and it contains only a self-contained
   styled document (no external resources, no scripts).

---

### User Story 2 - Orchestrator discovers agents on-chain and hires by reputation (Priority: P2) — Tier T2

When the user submits a brief, an orchestrator agent consults a public on-chain registry of
registered specialist design agents. For each candidate it shows the agent's identity, style,
and its on-chain reputation (a score plus a completed-job count). The orchestrator explains, in
reasoning the user can watch unfold on screen, which agent(s) it is hiring and why — chosen by
reputation — and then triggers those agents' design generation.

**Why this priority**: This is the differentiator made visible — "an AI hiring an AI by a
track record that lives on-chain." It builds directly on the T1 generation flow and is the
first tier to read real on-chain state.

**Independent Test**: With the agents pre-registered on-chain, submit a brief and confirm the
orchestrator lists the registered agents with their reputation read from chain, displays its
selection reasoning, and the agent it selects is the one its stated criteria imply.

**Acceptance Scenarios**:

1. **Given** specialist agents are registered on-chain, **When** the user submits a brief,
   **Then** the orchestrator displays each candidate agent with its style and its on-chain
   reputation (score + job count) read from the registry.
2. **Given** candidate agents with differing reputations, **When** the orchestrator selects,
   **Then** it shows visible reasoning for its choice and selects consistently with the
   reputation-based criteria it states.
3. **Given** the orchestrator has selected agent(s), **When** selection completes, **Then** the
   selected agent(s) proceed to generate the design (the T1 flow), tying selection to output.

---

### User Story 3 - The hired agent gets paid on-chain (Priority: P3) — Tier T3

After the user accepts a delivered design, a real on-chain payment is sent to the chosen agent's
wallet. The system first attempts settlement via the preferred machine-payment path; if that
cannot settle, it falls back to a direct stablecoin (or native-token) transfer to the agent's
payout address. Either way the payment is a real, visible on-chain transaction, and the UI
states which path was used and links to the transaction on a public block explorer.

**Why this priority**: Closes the loop from "generate" to "earn" and makes the agent a real
economic actor. It depends on T2 having selected a real on-chain agent with a payout address.

**Independent Test**: Accept a design and confirm a payment transaction to the agent's wallet
appears on the explorer, the UI labels the path used (preferred vs. fallback), and forcing the
preferred path to fail still results in a successful fallback payment that is correctly labeled.

**Acceptance Scenarios**:

1. **Given** an accepted design and a selected agent with a payout address, **When** payment
   runs, **Then** a real on-chain payment reaches the agent's wallet and a clickable explorer
   link to that transaction is shown.
2. **Given** the preferred payment path cannot settle, **When** payment runs, **Then** the
   system completes a direct transfer fallback and the UI clearly indicates the fallback path
   was used.
3. **Given** a completed payment, **When** the UI updates, **Then** it states which of the two
   paths settled the payment.

---

### User Story 4 - The agent's reputation is written on-chain (Priority: P4) — Tier T4

After a completed, paid job, feedback for the chosen agent is recorded on-chain in the public
reputation registry, written by a party that is not the agent's own owner. Each agent's
reputation (its count and score) is read back from chain and displayed, and the reputation that
informed the next decision is shown to update. The reputation-writing transaction is linked on a
public explorer.

**Why this priority**: This is what makes the reputation "earned and unfakeable" — bound to a
real paid job and written by a third party, not self-declared. It depends on T3's completed
payment and on T2's on-chain agent identities.

**Independent Test**: After a paid job, confirm a feedback entry for the agent exists on-chain,
written by a non-owner party, the transaction hash renders as a clickable explorer link, and the
agent's displayed reputation reflects the new entry.

**Acceptance Scenarios**:

1. **Given** a completed, paid job for a selected agent, **When** feedback is written, **Then** a
   reputation entry for that agent is recorded on-chain by a non-owner caller and a clickable
   explorer link to the transaction is shown.
2. **Given** a reputation entry has been recorded, **When** the agent's reputation is read back,
   **Then** the displayed reputation (count and score) reflects the new entry.
3. **Given** the writing party is the agent's own owner, **When** a feedback write is attempted,
   **Then** it is rejected (anti-self-feedback), and the system uses a distinct non-owner party
   so legitimate writes succeed.

---

### User Story 5 - Live proof and demo polish (Priority: P5) — Tier T5

The experience is polished into a tight, legible demo: a live explorer panel visibly updates as
transactions land, reputation scores animate upward with a "job #N" feel, and the full
end-to-end flow is captured as a backup recording. The project is public and its transactions
are viewable on a public Monad explorer.

**Why this priority**: Pure amplification and safety net. It depends on T1–T4 working
end-to-end and adds no new core capability, so it is last.

**Independent Test**: Run the full flow and confirm the explorer panel updates live, reputation
visibly animates, a backup recording of the complete flow exists, and the linked transactions
are reachable on a public explorer.

**Acceptance Scenarios**:

1. **Given** the full flow runs, **When** payment and reputation transactions land, **Then** a
   live explorer panel reflects them without a manual page refresh.
2. **Given** a job completes, **When** reputation updates, **Then** the score animates upward and
   the completed-job count increments visibly.
3. **Given** a stage demo, **When** the live run is at risk (network/API), **Then** a pre-recorded
   capture of the complete working flow is available to fall back to.

---

### Edge Cases

- A design-generation call stalls, times out, or returns malformed/non-self-contained output →
  the style's pre-prepared styled fallback renders within a bounded time; output is constrained
  and treated as untrusted (isolated preview, no scripts, no external resources).
- The on-chain registry returns zero agents or an agent is missing a reputation/payout field →
  the orchestrator surfaces this honestly rather than fabricating candidates or scores.
- Two or more agents tie on reputation → selection criteria are stated and deterministic so the
  choice is explainable.
- The preferred payment path is unreachable or fails to settle → automatic fallback transfer,
  clearly labeled; the demo is never blocked chasing the preferred path.
- A reputation write reverts because the writer is the agent's owner → the system writes from a
  distinct non-owner party by design.
- A transaction is slow to confirm → the UI shows a pending state and resolves to the explorer
  link once confirmed.
- LLM/provider key or network is unavailable during a live demo → fallbacks (styled HTML, backup
  recording) keep a coherent demo on screen.

## Requirements *(mandatory)*

### Functional Requirements

**Design generation (T1)**

- **FR-001**: System MUST accept a free-text design brief from the user.
- **FR-002**: System MUST produce, from a single brief, multiple distinct specialist design
  outputs covering at least the styles: dark-mode premium, glassmorphism, brutalist, playful.
- **FR-003**: Each design output MUST be a single self-contained styled document generated from
  the brief; the system MUST NOT ingest, parse, or transform an arbitrary user-supplied codebase.
- **FR-004**: System MUST render each output in an isolated preview that cannot access the
  surrounding application's data, and MUST treat generated output as untrusted (no scripts, no
  external resources permitted in the preview).
- **FR-005**: System MUST show a loading state per style and update it to the rendered result as
  each completes, so results can appear progressively.
- **FR-006**: System MUST, for each style, fall back to a pre-prepared styled document if its
  generation fails or exceeds a bounded time limit, so no slot is ever broken or empty.

**Orchestration & discovery (T2)**

- **FR-007**: System MUST read the set of registered specialist agents from a public on-chain
  registry.
- **FR-008**: System MUST display each candidate agent with its style and its on-chain
  reputation, expressed as a score and a completed-job count.
- **FR-009**: System MUST select agent(s) to hire based on reputation and MUST display the
  orchestrator's selection reasoning to the user as it proceeds.
- **FR-010**: System MUST connect the orchestrator's selection to the design-generation step so
  the selected agent(s) produce the shown output.

**Payment (T3)**

- **FR-011**: System MUST send a real on-chain payment to the selected agent's payout address
  upon the user's acceptance of a delivered design.
- **FR-012**: System MUST attempt the preferred machine-payment path first and, if it cannot
  settle or is unreachable, MUST automatically fall back to a direct token transfer to the
  agent's payout address.
- **FR-013**: System MUST display which payment path was used and a clickable public-explorer
  link to the resulting transaction.

**Reputation (T4)**

- **FR-014**: System MUST record feedback for the selected agent on-chain in the public
  reputation registry after a completed, paid job.
- **FR-015**: The party writing reputation MUST NOT be the agent's owner (anti-self-feedback);
  the system MUST use a distinct non-owner party so writes succeed.
- **FR-016**: System MUST read each agent's reputation back from chain and display the updated
  count and score, and MUST show a clickable explorer link to the reputation-writing
  transaction.

**Proof & polish (T5)**

- **FR-017**: System MUST present a live explorer view that reflects payment and reputation
  transactions as they land, without requiring a manual refresh.
- **FR-018**: System MUST visibly animate reputation increases (score and job-count).
- **FR-019**: Project MUST be publicly viewable and its transactions reachable on a public
  explorer, and a backup recording of the full working flow MUST exist as a demo safety net.

**Cross-cutting (constitutional)**

- **FR-020**: Each tier (T1–T5) MUST be demonstrable end-to-end on its own before the next tier
  begins, and MUST be committed at a green checkpoint (builds, starts clean, tier smoke test
  passes) before the next tier starts.
- **FR-021**: System MUST present only honest claims: that a job was done and paid for, and that
  reputation is portable and on-chain-earned. System MUST NOT claim cryptographic proof of design
  quality, a populated agent network, or on-chain Sybil-resistance.

### Key Entities *(include if feature involves data)*

- **Design Brief**: The user's free-text request describing the desired page (intent, style cues).
- **Specialist Design Agent**: A registered entity with an identity, a style specialty, an owner
  distinct from the client, a payout address, and an on-chain reputation (score + job count). In
  T1 these are local style personas; from T2 on they correspond to on-chain-registered agents.
- **Design Output**: A single self-contained styled document produced from a brief by one agent,
  shown in an isolated preview; has an associated style and a generated-or-fallback status.
- **Orchestrator Decision**: The orchestrator's candidate list, reputation readings, stated
  criteria, selection reasoning, and chosen agent(s).
- **Payment**: A real on-chain value transfer to a selected agent's payout address, with a path
  indicator (preferred vs. fallback) and a transaction reference.
- **Reputation Entry**: An on-chain feedback record for an agent, written by a non-owner party,
  contributing to the agent's aggregate score and job count, with a transaction reference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From submitting a brief, the user sees at least 4 visibly distinct styled previews
  render live, with each slot resolving (generated or fallback) within roughly 30 seconds.
- **SC-002**: No demo run leaves a broken or empty preview slot: in 10 of 10 trials, including
  trials with a forced generation failure, every style slot shows either a generated or a
  fallback styled result.
- **SC-003**: For a submitted brief, the orchestrator lists every on-chain-registered candidate
  agent with a reputation reading and shows selection reasoning before any design is produced.
- **SC-004**: The agent the orchestrator selects matches the reputation-based criteria it states
  in 10 of 10 trials.
- **SC-005**: An accepted job results in a confirmed on-chain payment to the agent's wallet
  reachable via the displayed explorer link, and the UI correctly labels the path used —
  including correctly labeling the fallback when the preferred path is forced to fail.
- **SC-006**: An accepted job results in a confirmed on-chain reputation entry for the agent
  written by a non-owner party, reachable via the displayed explorer link, and the agent's
  displayed reputation reflects it.
- **SC-007**: The complete brief → selection → generation → payment → reputation flow can be
  demonstrated end-to-end within the 90-second demo window.
- **SC-008**: A backup recording of the full working flow exists before the live demo.

## Assumptions

- The specialist agents are registered on-chain ahead of the demo, each owned by a party distinct
  from the client/orchestrator party that writes feedback (so anti-self-feedback never blocks
  legitimate writes), and the client/orchestrator party is pre-funded for gas and payment.
- The on-chain identity and reputation registries already exist and are only read from and called
  — the project does not author or deploy them. The third-party validation registry is out of
  scope (not available on the target network).
- "Reputation score" shown to the user is the project's own aggregation computed from on-chain
  feedback records; there is no single canonical on-chain aggregate score, and this is disclosed.
- The four specialist styles (dark-mode premium, glassmorphism, brutalist, playful) are the demo
  set; the model is open to more agents/styles registering, but a populated network is not claimed.
- A working AI text-generation capability and the target test network (with its explorer, faucet,
  and a stablecoin for payment) are available during the build and demo.
- The brief and generated previews are the demo's controlled inputs/outputs; arbitrary user file
  upload or codebase transformation is explicitly out of scope.
- Setup (agent registration, wallet funding, prompt/fallback preparation, input page) is staged
  beforehand; the live demo exercises the mechanism (brief → selection → generation → payment →
  reputation), not the setup.
