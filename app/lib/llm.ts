// Thin LLM provider adapter — SERVER-SIDE ONLY (Constitution VI: keys never reach the client).
// Routing: models starting with "claude" go to Anthropic, everything else to OpenAI.
// With ANTHROPIC_API_KEY set, the BUILD uses Claude (best HTML quality — the wow moment);
// pitches stay on the fast OpenAI model so 4 run in parallel quickly.
import OpenAI from "openai";

export type LlmParams = {
  system: string;
  user: string;
  maxTokens: number;
  signal?: AbortSignal;
};

const hasAnthropic = () => !!process.env.ANTHROPIC_API_KEY;

export const models = {
  get pitch() {
    return process.env.LLM_MODEL_PITCH || "gpt-4o-mini";
  },
  get build() {
    return process.env.LLM_MODEL_BUILD || (hasAnthropic() ? "claude-sonnet-4-6" : "gpt-4o");
  },
};

const isClaude = (model: string) => model.startsWith("claude");

let _openai: OpenAI | null = null;
function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

const ANTHROPIC_HEADERS = () => ({
  "content-type": "application/json",
  "x-api-key": process.env.ANTHROPIC_API_KEY!,
  "anthropic-version": "2023-06-01",
});

/** Non-streaming completion. */
export async function complete(model: string, p: LlmParams): Promise<string> {
  if (isClaude(model)) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: p.signal,
      headers: ANTHROPIC_HEADERS(),
      body: JSON.stringify({
        model,
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

/** Streaming completion. Yields text chunks (real SSE streaming on both providers). */
export async function* stream(model: string, p: LlmParams): AsyncGenerator<string> {
  if (isClaude(model)) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: p.signal,
      headers: ANTHROPIC_HEADERS(),
      body: JSON.stringify({
        model,
        max_tokens: p.maxTokens,
        stream: true,
        system: p.system,
        messages: [{ role: "user", content: p.user }],
      }),
    });
    if (!res.ok || !res.body) throw new Error(`anthropic ${res.status}`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const json = line.slice(5).trim();
        if (!json || json === "[DONE]") continue;
        try {
          const ev = JSON.parse(json) as { type?: string; delta?: { type?: string; text?: string } };
          if (ev.type === "content_block_delta" && ev.delta?.text) yield ev.delta.text;
        } catch {
          /* partial frame — ignored */
        }
      }
    }
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
