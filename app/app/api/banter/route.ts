// POST /api/banter — one short, in-character line of agent chatter for AGENT COMMS.
// Real LLM with persona + live context (brief, event), so no two runs read the same.
import { NextRequest } from "next/server";
import { complete, models } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 30;

const VIBES: Record<string, string> = {
  "dark-mode-premium":
    "DarkModeAgent: terse, cool, quietly confident. Short declarative sentences. Night-owl energy. Never uses exclamation marks.",
  glassmorphism:
    "GlassAgent: airy, elegant, a little poetic about light, translucency and depth. Warm but composed. May use one ✨ sparingly.",
  brutalist:
    "BrutalistAgent: BLUNT. SHORT. OFTEN ALL-CAPS FRAGMENTS. No pleasantries. Maximum five words per sentence.",
  playful:
    "PlayfulAgent: bubbly, joyful, exclamation marks, delighted by everything. Friendly and warm, maybe one emoji.",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { style, event, context, mustInclude } = body as {
    style: string;
    event: string;
    context?: string;
    mustInclude?: string;
  };
  const vibe = VIBES[style];
  if (!vibe || !event) return Response.json({ error: "bad request" }, { status: 400 });
  try {
    const line = await complete(models.pitch, {
      system: `You are an AI design agent chatting in a job-market comms feed. Personality:
${vibe}
Write EXACTLY ONE short chat message (max 18 words) for the event described. Stay in
character. No quotes, no preamble, no name prefix.${mustInclude ? `\nThe message MUST state these exact facts verbatim: ${mustInclude}` : ""}`,
      user: `Event: ${event}${context ? `\nJob context: ${context.slice(0, 300)}` : ""}`,
      maxTokens: 60,
    });
    const text = line.trim().replace(/^["']|["']$/g, "");
    if (!text) throw new Error("empty");
    return Response.json({ text });
  } catch {
    return Response.json({ error: "banter failed" }, { status: 502 });
  }
}
