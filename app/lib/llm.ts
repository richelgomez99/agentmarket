// Thin LLM provider adapter — SERVER-SIDE ONLY (Constitution VI: keys never reach the client).
// Default: OpenAI (OPENAI_API_KEY). If ANTHROPIC_API_KEY is set, Anthropic is used instead.
import OpenAI from "openai";

export type LlmParams = {
  system: string;
  user: string;
  maxTokens: number;
  signal?: AbortSignal;
};

const PITCH_MODEL = process.env.LLM_MODEL_PITCH || "gpt-4o-mini";
const BUILD_MODEL = process.env.LLM_MODEL_BUILD || "gpt-4o";

export const models = { pitch: PITCH_MODEL, build: BUILD_MODEL };

function provider(): "anthropic" | "openai" {
  return process.env.ANTHROPIC_API_KEY ? "anthropic" : "openai";
}

let _openai: OpenAI | null = null;
function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

/** Non-streaming completion (pitches). */
export async function complete(model: string, p: LlmParams): Promise<string> {
  if (provider() === "anthropic") {
    // Minimal Anthropic REST call (no extra dep); used only when ANTHROPIC_API_KEY is set.
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: p.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL_ANTHROPIC || "claude-sonnet-4-6",
        max_tokens: p.maxTokens,
        system: p.system,
        messages: [{ role: "user", content: p.user }],
      }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    const data = (await res.json()) as { content?: { text?: string }[] };
    return data.content?.map((b) => b.text ?? "").join("") ?? "";
  }
  const r = await openai().chat.completions.create(
    {
      model,
      max_tokens: p.maxTokens,
      messages: [
        { role: "system", content: p.system },
        { role: "user", content: p.user },
      ],
    },
    { signal: p.signal }
  );
  return r.choices[0]?.message?.content ?? "";
}

/** Streaming completion (the full build + orchestrator reasoning). Yields text chunks. */
export async function* stream(model: string, p: LlmParams): AsyncGenerator<string> {
  if (provider() === "anthropic") {
    // Fall back to non-streaming for the minimal Anthropic path; yield once.
    yield await complete(model, p);
    return;
  }
  const s = await openai().chat.completions.create(
    {
      model,
      max_tokens: p.maxTokens,
      stream: true,
      messages: [
        { role: "system", content: p.system },
        { role: "user", content: p.user },
      ],
    },
    { signal: p.signal }
  );
  for await (const chunk of s) {
    const t = chunk.choices[0]?.delta?.content;
    if (t) yield t;
  }
}
