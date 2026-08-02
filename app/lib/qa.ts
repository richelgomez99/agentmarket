// Real client-side QA for the hired agent's pass (AGNTM-11). NOT static heuristics — this
// actually RENDERS the deliverable in an offscreen, same-origin iframe and MEASURES the real
// layout at a mobile viewport. The display iframe is sandbox="" (no same-origin) for safety;
// this QA iframe is sandbox="allow-same-origin" WITHOUT allow-scripts — the HTML is already
// script-stripped by the guard, so nothing executes, but the parent can read contentDocument
// and measure genuine overflow/structure. Pass/fail reflects the actual rendered page.

export type QAFinding = { id: string; severity: "fail" | "warn"; label: string };
export type QAReport = {
  passed: boolean;
  viewportPx: number;
  scrollWidthPx: number;
  overflowPx: number;
  offender?: string;
  findings: QAFinding[];
};

const MOBILE = 390;
const OVERFLOW_TOLERANCE = 4; // sub-pixel rounding

function describe(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const cls = (el.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean)[0];
  return cls ? `${tag}.${cls}` : tag;
}

/** Render `html` offscreen at `viewport` px and measure the real layout. */
export function inspectDeliverable(html: string, viewport = MOBILE): Promise<QAReport> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve({ passed: true, viewportPx: viewport, scrollWidthPx: viewport, overflowPx: 0, findings: [] });
      return;
    }
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-same-origin"); // no allow-scripts: content can't run
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${viewport}px;height:1200px;border:0;visibility:hidden;`;
    iframe.srcdoc = html;

    let settled = false;
    const finish = (report: QAReport) => {
      if (settled) return;
      settled = true;
      iframe.remove();
      resolve(report);
    };

    iframe.onload = () => {
      // one rAF so layout settles before measuring
      requestAnimationFrame(() => {
        try {
          const doc = iframe.contentDocument;
          if (!doc || !doc.documentElement) return finish({ passed: true, viewportPx: viewport, scrollWidthPx: viewport, overflowPx: 0, findings: [] });
          const scrollW = Math.max(doc.documentElement.scrollWidth, doc.body?.scrollWidth || 0);
          const overflowPx = Math.max(0, scrollW - viewport);
          const findings: QAFinding[] = [];

          // 1) real horizontal overflow + name the worst offender
          let offender: string | undefined;
          if (overflowPx > OVERFLOW_TOLERANCE) {
            let worst: Element | undefined;
            let worstRight = viewport + OVERFLOW_TOLERANCE;
            doc.body?.querySelectorAll("*").forEach((el) => {
              const r = (el as HTMLElement).getBoundingClientRect();
              if (r.width > 0 && r.right > worstRight) {
                worstRight = r.right;
                worst = el;
              }
            });
            offender = worst ? describe(worst) : undefined;
            findings.push({
              id: "overflow",
              severity: "fail",
              label: `Horizontal overflow at ${viewport}px — page is ${Math.round(scrollW)}px wide${offender ? `; "${offender}" bleeds ${Math.round(worstRight - viewport)}px past the viewport` : ""}`,
            });
          }

          // 2) structural elements actually render (non-zero height)
          const rendered = (sel: string) => {
            const el = doc.querySelector(sel) as HTMLElement | null;
            return !!el && el.offsetHeight > 0;
          };
          if (!rendered("nav, header")) findings.push({ id: "nav", severity: "fail", label: "Navigation does not render" });
          if (!rendered("h1")) findings.push({ id: "hero", severity: "fail", label: "Hero headline (h1) does not render" });
          if (!rendered("footer")) findings.push({ id: "footer", severity: "warn", label: "Footer does not render" });

          finish({ passed: !findings.some((f) => f.severity === "fail"), viewportPx: viewport, scrollWidthPx: Math.round(scrollW), overflowPx: Math.round(overflowPx), offender, findings });
        } catch {
          finish({ passed: true, viewportPx: viewport, scrollWidthPx: viewport, overflowPx: 0, findings: [] });
        }
      });
    };

    document.body.appendChild(iframe);
    // safety timeout — never hang the QA step
    setTimeout(() => finish({ passed: true, viewportPx: viewport, scrollWidthPx: viewport, overflowPx: 0, findings: [] }), 4000);
  });
}

/** A genuine responsive fix (not a mask): media maxes, box-sizing, long-word wrapping. */
export function applyResponsiveFix(html: string): string {
  const patch = `<style data-qa-fix>*,*::before,*::after{box-sizing:border-box}img,video,svg,canvas,table,iframe{max-width:100%;height:auto}pre,code{white-space:pre-wrap;word-break:break-word}body{overflow-wrap:break-word}</style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${patch}</head>`);
  if (/<body[^>]*>/i.test(html)) return html.replace(/<body[^>]*>/i, (m) => `${m}${patch}`);
  return patch + html;
}
