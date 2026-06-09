// The 4 specialist design styles: system prompt + hard-coded fallback HTML per style.
// Scope guard (Constitution V): agents GENERATE a self-contained HTML+inline-CSS doc from a
// brief; they never ingest a codebase. Output is hard-constrained and rendered in a sandboxed
// iframe. The fallback renders if a generation call fails/times out (no blank slot).

import type { Style } from "./types";

export const OUTPUT_CONTRACT = `Return ONLY a single complete HTML document and NOTHING else.
Rules: start with <!DOCTYPE html>; put ALL CSS in one inline <style> block; no JavaScript; no
external URLs, fonts, images, or CDN links (use system fonts and CSS gradients/shapes only); no
markdown code fences. The page must be a polished landing page for the user's brief, fully
self-contained so it renders correctly inside a sandboxed iframe with no network access.`;

export type StyleConfig = {
  id: Style;
  label: string;
  agentName: string;
  accent: string;
  systemPrompt: string;
  fallbackHtml: string;
};

const wrap = (title: string, css: string, body: string) =>
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css}</style></head><body>${body}</body></html>`;

export const STYLES: StyleConfig[] = [
  {
    id: "dark-mode-premium",
    label: "Dark-mode premium",
    agentName: "DarkModeAgent",
    accent: "#7c5cff",
    systemPrompt: `You are DarkModeAgent, a specialist in premium dark-mode SaaS landing pages.
Aesthetic: near-black backgrounds (#0a0b0f), high-contrast off-white text, one vivid accent
(violet/indigo), generous spacing, large confident headline, subtle gradient glow, crisp
rounded cards, refined sans-serif system font. Feels like a high-end developer tool. ${OUTPUT_CONTRACT}`,
    fallbackHtml: wrap(
      "Premium",
      `*{margin:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0a0b0f;color:#f5f6fa;min-height:100vh;display:grid;place-items:center;text-align:center}.h{padding:8vh 6vw}.eyebrow{color:#7c5cff;letter-spacing:.2em;text-transform:uppercase;font-size:.8rem}h1{font-size:clamp(2.2rem,6vw,4.5rem);font-weight:800;line-height:1.05;margin:.4em 0;background:linear-gradient(120deg,#fff,#9b8cff);-webkit-background-clip:text;background-clip:text;color:transparent}p{color:#9aa0b5;max-width:38ch;margin:0 auto 2em}.cta{display:inline-block;background:#7c5cff;color:#fff;padding:.9em 2em;border-radius:12px;font-weight:600}`,
      `<div class="h"><div class="eyebrow">Premium</div><h1>Build something the room remembers</h1><p>A premium dark-mode experience, generated live on-chain.</p><a class="cta">Get started</a></div>`
    ),
  },
  {
    id: "glassmorphism",
    label: "Glassmorphism",
    agentName: "GlassAgent",
    accent: "#34d6ff",
    systemPrompt: `You are GlassAgent, a specialist in glassmorphism landing pages.
Aesthetic: vivid colorful gradient background, translucent frosted cards using
backdrop-filter: blur with semi-transparent white fills and thin light borders, soft shadows,
layered depth, airy rounded layout. ${OUTPUT_CONTRACT}`,
    fallbackHtml: wrap(
      "Glass",
      `*{margin:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;background:linear-gradient(135deg,#5b8cff,#a05bff 50%,#ff7eb3)}.card{backdrop-filter:blur(18px);background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.35);border-radius:24px;padding:6vh 5vw;text-align:center;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.25)}h1{font-size:clamp(2rem,5vw,3.6rem);font-weight:700;margin-bottom:.3em}p{opacity:.9;max-width:34ch;margin:0 auto 1.6em}.cta{display:inline-block;background:rgba(255,255,255,.9);color:#3a2b6b;padding:.8em 1.8em;border-radius:999px;font-weight:600}`,
      `<div class="card"><h1>Clarity through glass</h1><p>Translucent, layered, and luminous — generated on demand.</p><a class="cta">Explore</a></div>`
    ),
  },
  {
    id: "brutalist",
    label: "Brutalist",
    agentName: "BrutalistAgent",
    accent: "#ffe500",
    systemPrompt: `You are BrutalistAgent, a specialist in neo-brutalist landing pages.
Aesthetic: raw high-contrast, thick solid black borders, hard offset drop-shadows (no blur),
flat bold blocks of saturated color, NO rounded corners, oversized heavy type, monospace or
grotesk system fonts, deliberately stark and confident. ${OUTPUT_CONTRACT}`,
    fallbackHtml: wrap(
      "Brutalist",
      `*{margin:0;box-sizing:border-box}body{font-family:"Courier New",monospace;background:#ffe500;color:#000;min-height:100vh;display:grid;place-items:center;padding:6vw}.box{background:#fff;border:5px solid #000;box-shadow:12px 12px 0 #000;padding:6vh 5vw;max-width:46ch}h1{font-size:clamp(2.2rem,6vw,4rem);font-weight:900;text-transform:uppercase;line-height:.95}p{font-size:1.1rem;margin:1em 0 1.4em;border-top:3px solid #000;padding-top:1em}.cta{display:inline-block;background:#000;color:#ffe500;padding:.7em 1.6em;font-weight:700;text-transform:uppercase;border:3px solid #000}`,
      `<div class="box"><h1>No frills. All signal.</h1><p>Raw, loud, unmistakable. Built to be seen.</p><a class="cta">Ship it &rarr;</a></div>`
    ),
  },
  {
    id: "playful",
    label: "Playful",
    agentName: "PlayfulAgent",
    accent: "#ff5ea8",
    systemPrompt: `You are PlayfulAgent, a specialist in playful, friendly landing pages.
Aesthetic: bright cheerful palette, big rounded shapes and bubbly rounded corners, soft pastel
gradients, large friendly rounded type, lots of whitespace, gentle organic blobs, an inviting
optimistic mood. ${OUTPUT_CONTRACT}`,
    fallbackHtml: wrap(
      "Playful",
      `*{margin:0;box-sizing:border-box}body{font-family:"Comic Sans MS",system-ui,sans-serif;background:linear-gradient(160deg,#fff0f6,#e0f7ff);color:#34304a;min-height:100vh;display:grid;place-items:center;text-align:center;padding:6vw}.blob{background:#fff;border-radius:40px;padding:7vh 5vw;box-shadow:0 24px 50px rgba(255,94,168,.25);max-width:40ch}h1{font-size:clamp(2rem,5.5vw,3.6rem);color:#ff5ea8;font-weight:800;margin-bottom:.3em}p{font-size:1.1rem;margin-bottom:1.4em}.cta{display:inline-block;background:#ff5ea8;color:#fff;padding:.85em 2em;border-radius:999px;font-weight:700}`,
      `<div class="blob"><h1>Hello, delightful!</h1><p>Friendly, bouncy, and full of joy — made just for you.</p><a class="cta">Let's go!</a></div>`
    ),
  },
];

export const styleById = (id: Style) => STYLES.find((s) => s.id === id)!;
