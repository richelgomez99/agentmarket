// Output guard for LLM-generated HTML (Constitution V). Output must be a complete,
// self-contained document: inline <style> only, no scripts, no external resources.
// Note: previews render in <iframe sandbox=""> (no allow-same-origin, no allow-scripts),
// so scripts can't run regardless — this guard is belt-and-braces + quality control.

/** Strip markdown fences and any prose around the document; return the bare HTML doc. */
export function extractHtml(raw: string): string {
  let s = raw.trim();
  // strip ```html ... ``` fences anywhere
  s = s.replace(/```(?:html)?/gi, "");
  // slice from <!doctype or <html to the last closing tag
  const start = s.search(/<!doctype html/i) >= 0 ? s.search(/<!doctype html/i) : s.search(/<html[\s>]/i);
  if (start > 0) s = s.slice(start);
  const end = s.toLowerCase().lastIndexOf("</html>");
  if (end >= 0) s = s.slice(0, end + "</html>".length);
  return s.trim();
}

/** Validate the doc is complete + self-contained. Returns null if OK, else a reason. */
export function validateHtml(html: string): string | null {
  const s = html.toLowerCase();
  if (!s.startsWith("<!doctype html") && !s.startsWith("<html")) return "not a complete HTML document";
  if (!s.includes("</html>")) return "missing closing </html>";
  if (s.includes("<script")) return "contains <script>";
  // external resources (network is unavailable in the sandbox; these would render broken)
  if (/(?:src|href)\s*=\s*["']https?:\/\//.test(s)) return "references external URL";
  if (/@import\s+/.test(s) || /url\(\s*["']?https?:\/\//.test(s)) return "imports external CSS/asset";
  return null;
}

/** Full pipeline: extract + validate. Returns {html} on success or {error}. */
export function guardHtml(raw: string): { html: string; error?: undefined } | { error: string; html?: undefined } {
  const html = extractHtml(raw);
  const err = validateHtml(html);
  return err ? { error: err } : { html };
}
