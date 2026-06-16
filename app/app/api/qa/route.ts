// POST /api/qa — REAL agentic QA. Renders the deliverable in a headless Chrome, screenshots it
// at desktop + mobile, and has a VISION model (Claude) inspect the screenshots like a QA engineer
// — genuine, specific, build-varying findings (not static lint). SERVER-SIDE (keys + Chrome here).
import { NextRequest } from "next/server";
import puppeteer from "puppeteer-core";

export const runtime = "nodejs";
export const maxDuration = 60;

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const VISION_MODEL = process.env.QA_VISION_MODEL || "claude-sonnet-4-6";

type Finding = { title: string; viewport: "desktop" | "mobile" | "both"; severity: "major" | "minor" };
type QAResult = {
  available: boolean;
  verdict: "pass" | "issues";
  summary: string;
  findings: Finding[];
  mobileScrollWidth?: number;
  desktopShot?: string; // base64 png (so the UI can show what the agent saw)
  mobileShot?: string;
};

const RUBRIC = `You are a senior QA engineer reviewing a freshly-built marketing landing page before it ships to the client. You are shown two screenshots of the SAME page: image 1 is DESKTOP (1280px wide), image 2 is MOBILE (390px wide).

Inspect them the way a real QA engineer would. Flag only REAL defects a client would reject:
- horizontal overflow / content cut off the right edge (especially mobile)
- overlapping or colliding elements; text on top of text
- unreadable contrast (low-contrast text on its background)
- broken/empty sections, missing images, obvious placeholder gaps
- badly cramped or wildly inconsistent spacing
- obvious "AI slop" (generic emoji-soup, meaningless gradients, lorem vibes)

Do NOT invent problems. If it genuinely looks polished, pass it.

CONSISTENCY (critical): every problem you mention in the summary MUST also appear in "findings" with a severity. If anything is a MAJOR problem, the verdict MUST be "issues" — never say "pass" while flagging a major issue. For "pass", the summary affirms it's client-ready (you may note minor polish only).

Reply with ONLY this JSON (no prose):
{"verdict":"pass" | "issues","findings":[{"title":"<specific, concrete>","viewport":"desktop"|"mobile"|"both","severity":"major"|"minor"}],"summary":"<one sentence, first-person, in the voice of a QA agent reporting to the team>"}`;

async function visionQA(desktopB64: string, mobileB64: string): Promise<{ verdict: "pass" | "issues"; findings: Finding[]; summary: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/png", data: desktopB64 } },
            { type: "image", source: { type: "base64", media_type: "image/png", data: mobileB64 } },
            { type: "text", text: RUBRIC },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = (await res.json()) as { content?: { text?: string }[] };
  const text = data.content?.map((c) => c.text || "").join("") || "";
  const m = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(m ? m[0] : text) as { verdict: "pass" | "issues"; findings?: Finding[]; summary?: string };
  const findings = Array.isArray(parsed.findings) ? parsed.findings.slice(0, 6) : [];
  // consistency guard: any MAJOR finding ⇒ issues (the model sometimes says "pass" while its
  // summary flags a major problem — never let the verdict contradict its own findings)
  const verdict: "pass" | "issues" = parsed.verdict === "issues" || findings.some((f) => f.severity === "major") ? "issues" : "pass";
  return { verdict, findings, summary: parsed.summary || "" };
}

export async function POST(req: NextRequest) {
  let html: string | undefined;
  try {
    ({ html } = (await req.json()) as { html?: string });
  } catch {
    return Response.json({ available: false } satisfies Partial<QAResult>, { status: 200 });
  }
  if (!html || !process.env.ANTHROPIC_API_KEY) {
    return Response.json({ available: false } satisfies Partial<QAResult>, { status: 200 });
  }
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--hide-scrollbars"] });
    const page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 900 });
    await page.setContent(html, { waitUntil: "load", timeout: 15_000 });
    const desktopShot = (await page.screenshot({ encoding: "base64", fullPage: true })) as string;

    await page.setViewport({ width: 390, height: 844 });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    const mobileShot = (await page.screenshot({ encoding: "base64", fullPage: true })) as string;
    const mobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

    await browser.close();
    browser = undefined;

    const vq = await visionQA(desktopShot, mobileShot);
    return Response.json({ available: true, ...vq, mobileScrollWidth, desktopShot, mobileShot } satisfies QAResult);
  } catch (e) {
    console.error("[qa]", e);
    if (browser) await browser.close().catch(() => {});
    return Response.json({ available: false } satisfies Partial<QAResult>, { status: 200 });
  }
}
