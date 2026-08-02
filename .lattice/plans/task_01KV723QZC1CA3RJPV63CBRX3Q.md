# AGNTM-11 — Make the hired-agent QA pass real

**Insight:** the *display* iframe is `sandbox=""` (no same-origin) for safety, so the parent can't
measure it. But a *dedicated QA iframe* can be `sandbox="allow-same-origin"` WITHOUT `allow-scripts`
— the deliverable is already script-stripped by the guard, so nothing executes, yet the parent CAN
read `contentDocument` and measure the REAL rendered layout. This is genuine QA, not static lint.

**Implementation:**
- `app/lib/qa.ts`:
  - `inspectDeliverable(html, viewport=390)` — renders offscreen at 390px, measures real
    `scrollWidth` → horizontal overflow (+ names the offending element by bounding-rect), and checks
    `nav/h1/footer` render with non-zero height. Returns `{passed, scrollWidthPx, overflowPx, offender, findings}`.
  - `applyResponsiveFix(html)` — a genuine fix (media `max-width:100%`, `box-sizing`, word-wrap),
    not an `overflow:hidden` mask.
- `runInspection(style, id, html) -> html`: walkthrough → render+measure at 390px. On a real fail,
  surface the specific finding, apply the responsive fix, **re-measure**, and only claim "clean" if
  `scrollWidth ≤ 390` for real; otherwise honestly flag for a revision. Returns the (possibly
  patched) deliverable so the fix persists into review/download. Caller: `html = await runInspection(...)`.

**Acceptance:** QA genuinely passes/fails per build (real measurement); a real overflow is caught,
named, fixed, and re-verified; "clean" is never claimed on an unmeasured/overflowing page; tsc + build green.
