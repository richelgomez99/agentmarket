// POST /api/generate — pitch | build modes (contracts/api-routes.md).
// SERVER-SIDE ONLY: LLM keys live here (Constitution VI). Output guarded (Constitution V).
import { NextRequest } from "next/server";
import { complete, stream, models } from "@/lib/llm";
import { guardHtml } from "@/lib/htmlGuard";
import { styleById } from "@/lib/styles";
import type { Style } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const PITCH_TIMEOUT_MS = 15_000;
const BUILD_TIMEOUT_MS = 45_000;

const PITCH_INSTRUCTION = `This is a quick STYLE PITCH, not the full job: produce a compact
hero-section-scale sample (one screen, no scrolling needed) that sells your style for this
brief. Keep it small and fast — a complete but minimal HTML document.`;

const BUILD_INSTRUCTION = `You won the job. Produce the FULL landing page for the brief:
navigation bar, hero, a content/product section (e.g. 3 cards), and a footer. Polished,
complete, self-contained.`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brief, style, mode } = body as { brief: string; style: Style; mode: "pitch" | "build" };
  const simulateFail = !!body.simulateFail && process.env.NODE_ENV !== "production";

  const cfg = styleById(style);
  if (!cfg || !brief?.trim()) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const t0 = Date.now();
  const fallback = () =>
    Response.json({ style, html: cfg.fallbackHtml, status: "fallback", elapsedMs: Date.now() - t0 });

  // ── pitch: small, fast, JSON ─────────────────────────────────────────────
  if (mode === "pitch") {
    if (simulateFail) return fallback();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PITCH_TIMEOUT_MS);
    try {
      const raw = await complete(models.pitch, {
        system: cfg.systemPrompt,
        user: `${PITCH_INSTRUCTION}\n\nBrief: ${brief}`,
        maxTokens: 1400,
        signal: ctrl.signal,
      });
      const g = guardHtml(raw);
      if (g.error) return fallback();
      return Response.json({ style, html: g.html, status: "generated", elapsedMs: Date.now() - t0 });
    } catch {
      return fallback();
    } finally {
      clearTimeout(timer);
    }
  }

  // ── build: full page, STREAMED raw HTML (progressive iframe render + code strip) ──
  // Protocol: chunked text of raw model output. The CLIENT runs guardHtml at the end and
  // falls back if invalid. If the stream errors early, we emit the fallback doc inline,
  // prefixed by a sentinel comment the client can detect.
  if (simulateFail) {
    return new Response("<!--FALLBACK-->" + cfg.fallbackHtml, {
      headers: { "content-type": "text/plain; charset=utf-8", "x-generate-status": "fallback" },
    });
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BUILD_TIMEOUT_MS);
  const encoder = new TextEncoder();
  const rs = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream(models.build, {
          system: cfg.systemPrompt,
          user: `${BUILD_INSTRUCTION}\n\nBrief: ${brief}`,
          maxTokens: 4000,
          signal: ctrl.signal,
        })) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch {
        controller.enqueue(encoder.encode("<!--FALLBACK-->" + cfg.fallbackHtml));
      } finally {
        clearTimeout(timer);
        controller.close();
      }
    },
    cancel() {
      clearTimeout(timer);
      ctrl.abort();
    },
  });
  return new Response(rs, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
