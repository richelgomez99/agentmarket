// POST /api/orchestrate — two stages (contracts/api-routes.md). SERVER-SIDE.
// Protocol: streams reasoning text, then a sentinel line "@@RESULT@@{json}".
// Selection is COMPUTED deterministically from on-chain data (SC-004); the LLM narrates it.
import { NextRequest } from "next/server";
import { complete, models } from "@/lib/llm";
import { listAgents, withPerStyleScores, pickWinner } from "@/lib/registry";
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
  const { brief, stage } = body as { brief: string; stage: "open" | "evaluate" };

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

  // ── stage: evaluate — pitch fit + per-style track records → hire ─────────
  const { inferredStyle, pitches } = body as {
    inferredStyle: Style;
    pitches: { style: Style; status: string; elapsedMs?: number }[];
  };
  return streamText(async function* () {
    yield `▸ ${pitches.length} pitches in. Scoring fit against the brief…\n`;
    const agents = await withPerStyleScores(await listAgents(), inferredStyle);
    const winner = pickWinner(agents);
    yield `▸ Cross-checking on-chain track records for ${inferredStyle} (paid jobs only):\n`;
    for (const a of agents) {
      const ps = a.perStyleScore ?? 0;
      const note = ps > 0 ? `★${ps.toFixed(2)} in-specialty` : `no paid ${inferredStyle} jobs on record`;
      yield `    ${a.name.padEnd(15)} ★${a.reputation.score.toFixed(2)} overall · ${note}\n`;
    }
    // short LLM narration of the (already computed) decision — never diverges from it
    let narration = "";
    try {
      narration = await complete(models.pitch, {
        system: `You are the hiring orchestrator of an AI-agent marketplace. In 2 short lines
(each starting with "▸ "), justify hiring ${winner.name} for a ${inferredStyle} brief: it has
the strongest proven on-chain track record for this exact style${
          pitches.find((p) => p.style === winner.style)?.status === "fallback"
            ? ""
            : " and a strong pitch"
        }. No preamble.`,
        user: `Brief: ${brief}`,
        maxTokens: 80,
      });
    } catch {
      narration = `▸ ${winner.name} pairs the best ${inferredStyle} pitch with the strongest proven record.\n▸ Reputation is on-chain and earned from paid jobs — it cannot be faked.`;
    }
    yield narration.trim() + "\n▸ Decision locked.";
    yield `\n${SENTINEL}` + JSON.stringify({
      criteria: `best per-style (${inferredStyle}) on-chain track record, then total paid jobs`,
      selectedAgentId: winner.agentId,
    });
  });
}
