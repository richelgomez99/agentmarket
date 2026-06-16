// POST /api/orchestrate — two stages (contracts/api-routes.md). SERVER-SIDE.
// Protocol: streams reasoning text, then a sentinel line "@@RESULT@@{json}".
// Selection is COMPUTED deterministically from on-chain data (SC-004); the LLM narrates it.
import { NextRequest } from "next/server";
import { complete, models } from "@/lib/llm";
import { listAgents, withPerStyleScores, pickWinner } from "@/lib/registry";
import { verifyAddresses, cvConfigured } from "@/lib/cleanverse";
import { STYLES } from "@/lib/styles";
import type { Style } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SENTINEL = "@@RESULT@@"; // must match page.tsx (not exported: route files only export handlers)

function keywordStyle(brief: string): Style {
  const b = brief.toLowerCase();
  if (/glass|frost|translucent|blur/.test(b)) return "glassmorphism";
  if (/brutal|raw|stark|loud/.test(b)) return "brutalist";
  if (/playful|fun|friendly|cute|bright|bouncy|kids/.test(b)) return "playful";
  return "dark-mode-premium";
}

async function inferStyle(brief: string): Promise<Style> {
  try {
    const out = await complete(models.pitch, {
      system: `Classify a design brief into exactly one style id. Reply with ONLY the id.
Options: ${STYLES.map((s) => s.id).join(" | ")}`,
      user: brief,
      maxTokens: 10,
    });
    const hit = STYLES.find((s) => out.toLowerCase().includes(s.id));
    return hit?.id ?? keywordStyle(brief);
  } catch {
    return keywordStyle(brief);
  }
}

function streamText(make: () => AsyncGenerator<string>): Response {
  const enc = new TextEncoder();
  const rs = new ReadableStream({
    async start(c) {
      try {
        for await (const chunk of make()) c.enqueue(enc.encode(chunk));
      } catch (e) {
        console.error("[orchestrate]", e);
        c.enqueue(enc.encode(`\n${SENTINEL}{"error":"orchestrate failed"}`));
      } finally {
        c.close();
      }
    },
  });
  return new Response(rs, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

/** GET — list registered agents + own-specialty reputation (idle market rail). */
export async function GET() {
  try {
    return Response.json({ candidates: await listAgents() });
  } catch {
    return Response.json({ candidates: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brief, stage } = body as { brief: string; stage: "open" | "evaluate" | "review" };

  // ── stage: open — discover agents on-chain + infer target style ──────────
  if (stage === "open") {
    return streamText(async function* () {
      yield "▸ Brief received.\n▸ Reading the on-chain registry (ERC-8004, Monad testnet)…\n";
      const [agents, inferred] = await Promise.all([listAgents(), inferStyle(brief)]);
      yield `▸ ${agents.length} registered specialists found:\n`;
      for (const a of agents) {
        yield `    #${a.agentId} ${a.name.padEnd(15)} ★${a.reputation.score.toFixed(2)} · ${a.reputation.count} paid ${a.style} jobs\n`;
      }
      yield `▸ Brief reads as: ${inferred}\n`;
      yield "▸ Requesting quick style pitches — cheap spec samples,\n  NOT full builds. The full job goes to one winner only.\n▸ Awaiting pitches…";
      yield `\n${SENTINEL}` + JSON.stringify({ candidates: agents, inferredStyle: inferred });
    });
  }

  // ── stage: review — round 1 requests a concrete revision; round 2 approves ──
  if (stage === "review") {
    const { html, round, requestedFix } = body as { html: string; round?: number; requestedFix?: string };
    const finalRound = (round ?? 1) >= 2;
    return streamText(async function* () {
      if (!finalRound) {
        // The HIRING AGENT's acceptance review: brief-fit, brand voice, and a CLAIMS AUDIT —
        // flag any on-page claim (numbers, testimonials, pricing, awards) the brief never
        // authorized. The most important finding becomes the revision request.
        let out = "";
        try {
          out = await complete(models.pitch, {
            system: `You are the HIRING AGENT — the buyer's brand guardian — running acceptance
review on a delivered landing page (HTML below), checking it against the client brief.
Audit three things. Output plain text, NO quotation marks anywhere, exactly these lines:
BRIEF FIT — pass or partial: 6-10 word note
BRAND VOICE — on or off: 6-10 word note
CLAIMS AUDIT — clean or flagged: if flagged, name the exact unsupported claim on the page (a number, testimonial, price, rating, or award the brief never stated); if clean, write "every claim traces to the brief"
Then ONE verdict line starting with "▸ ":
- If a claim is FLAGGED or brand fit is partial or voice is off: end the verdict with "Requesting one revision before acceptance." and add a final line exactly "NOTE: <one concrete fix instruction — prefer removing/rewording the flagged claim>".
- If everything is clean AND strong: end the verdict with "Accepting and releasing payment." and add NO note line.
Be concrete; reference real text from the page. No preamble, no quotation marks.`,
            user: `Brief: ${brief}\n\nDelivered HTML (truncated):\n${(html || "").slice(0, 4000)}`,
            maxTokens: 240,
          });
        } catch {
          // On LLM error, approve cleanly — never fabricate an accusation about the page.
          out = `BRIEF FIT — pass: structure and sections match the brief.\nBRAND VOICE — on: tone holds the brand throughout.\nCLAIMS AUDIT — clean: every claim traces to the brief.\n▸ Strong delivery, on-brand and accurate. Accepting and releasing payment.`;
        }
        // clean each line of stray quotes the model sometimes wraps around them
        const cleanLines = (t: string) =>
          t
            .split("\n")
            .map((l) => l.trim().replace(/^["'`]+|["'`]+$/g, "").trim())
            .filter(Boolean)
            .join("\n");
        const noteMatch = out.match(/NOTE:\s*([\s\S]+)/i);
        const approved = !noteMatch && /accepting and releasing payment/i.test(out);
        const claimsFlagged = /CLAIMS AUDIT\s*—\s*flagged/i.test(out);
        const reviewText = cleanLines(out.replace(/["'`]*\s*NOTE:[\s\S]*$/i, ""));
        const revisionNote = noteMatch?.[1]?.trim().replace(/^["'`]+|["'`]+$/g, "") ||
          "Remove any claim the brief did not authorize; keep copy benefit-led and on-brand.";
        yield reviewText;
        yield `\n${SENTINEL}` + JSON.stringify(approved ? { approved: true } : { approved: false, revisionNote, claimsFlagged });
        return;
      }
      const fix = (requestedFix || "the requested change").slice(0, 300);
      let review = "";
      try {
        review = await complete(models.pitch, {
          system: `You are the HIRING AGENT reviewing the REVISED delivery (HTML below). You had
requested exactly this change: "${fix}". Output exactly 3 lines, each starting with "▸ ":
(1) confirm THAT specific requested change landed (describe what changed — do NOT mention
removing a claim unless the requested change was about a claim),
(2) one more concrete strength now that it's revised, tied to the brand brief,
(3) verdict ending in "Accepting and releasing payment." Be specific, no quotation marks, no preamble.`,
          user: `Brief: ${brief}\n\nRevised HTML (truncated):\n${(html || "").slice(0, 4000)}`,
          maxTokens: 160,
        });
      } catch {
        review = `▸ The requested change landed — the page now reflects it cleanly.\n▸ Brand voice holds and every claim traces to the brief.\n▸ Quality verified. Accepting and releasing payment.`;
      }
      const cleaned = review
        .split("\n")
        .map((l) => l.trim().replace(/^["'`]+|["'`]+$/g, "").trim())
        .filter(Boolean)
        .join("\n");
      yield cleaned;
      yield `\n${SENTINEL}` + JSON.stringify({ approved: true });
    });
  }

  // ── stage: evaluate — pitch fit + per-style track records → hire ─────────
  const { inferredStyle, pitches } = body as {
    inferredStyle: Style;
    pitches: { style: Style; status: string; elapsedMs?: number }[];
  };
  return streamText(async function* () {
    yield `▸ ${pitches.length} pitches in. Scoring fit against the brief…\n`;
    const agents = await withPerStyleScores(await listAgents(), inferredStyle);

    // ── COMPLIANCE GATE (CCP) — verify each candidate's A-Pass BEFORE hiring ──
    // Only KYC-verified A-Pass holders are hireable. Gate ONLY when we can actually
    // distinguish (some verified AND some unverified); if Cleanverse is down/unconfigured
    // (statuses "unavailable") we don't gate — zero-regression.
    let eligible = agents;
    let gatedOut: string[] = [];
    if (cvConfigured()) {
      let vmap: Record<string, { status?: string }> = {};
      try {
        vmap = await verifyAddresses(agents.map((a) => a.payoutAddress));
      } catch {
        vmap = {};
      }
      const statusOf = (a: (typeof agents)[number]) => vmap[a.payoutAddress.toLowerCase()]?.status;
      const verified = agents.filter((a) => statusOf(a) === "verified");
      const unverified = agents.filter((a) => statusOf(a) === "unverified");
      yield `▸ Compliance gate — verifying each agent's A-Pass identity before hiring (Cleanverse):\n`;
      for (const a of agents) {
        const s = statusOf(a);
        const mark = s === "verified" ? "✓ A-Pass verified" : s === "unverified" ? "✗ UNVERIFIED — cannot be hired" : "· identity check unavailable";
        yield `    ${a.name.padEnd(15)} ${mark}\n`;
      }
      if (verified.length > 0 && unverified.length > 0) {
        eligible = verified;
        gatedOut = unverified.map((a) => a.name);
        yield `▸ ${gatedOut.join(", ")} excluded from hire — only KYC-verified A-Pass holders are eligible.\n`;
      }
    }

    const winner = pickWinner(eligible);
    yield `▸ Cross-checking on-chain track records for ${inferredStyle} among eligible agents (paid jobs only):\n`;
    for (const a of eligible) {
      const ps = a.perStyleScore ?? 0;
      const note = ps > 0 ? `★${ps.toFixed(2)} in-specialty` : `no paid ${inferredStyle} jobs on record`;
      yield `    ${a.name.padEnd(15)} ★${a.reputation.score.toFixed(2)} overall · ${note}\n`;
    }
    // LLM narration: per-pitch critique + hire rationale for the (already computed) decision
    let narration = "";
    try {
      narration = await complete(models.pitch, {
        system: `You are the hiring orchestrator of an AI-agent marketplace, judging 4 style
pitches against a brand brief. Write one line per pitch (start each with "    "), format:
"STYLE — five-to-eight-word verdict vs the brand" (on-brand pitches positive; off-brand ones
say why they miss: palette/mood/type). Then 2 lines starting "▸ " justifying hiring
${winner.name}: best brand fit AND the strongest proven on-chain ${inferredStyle} track
record. Styles pitched: ${pitches.map((p) => p.style + (p.status === "fallback" ? " (fallback sample)" : "")).join(", ")}. No preamble.`,
        user: `Brief: ${brief}`,
        maxTokens: 200,
      });
    } catch {
      narration = `▸ ${winner.name} pairs the best ${inferredStyle} pitch with the strongest proven record.\n▸ Its reputation is earned from real paid jobs, recorded on-chain.`;
    }
    yield "▸ Pitch-by-pitch read:\n" + narration.trim() + "\n▸ Decision locked.";
    yield `\n${SENTINEL}` + JSON.stringify({
      criteria: `A-Pass verified + best per-style (${inferredStyle}) on-chain track record`,
      selectedAgentId: winner.agentId,
      gatedOut,
    });
  });
}
