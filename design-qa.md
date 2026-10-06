# Design QA: Decision Desk LP view

**Findings**

- No actionable P0, P1, or P2 issues remain after the final comparison.
- Intentional data difference: the reference shows an implied per-unit value of `$1.00 → $1.42`, but the sample model does not define a potential per-unit mark. The prototype instead shows a transparent position-level range (`+$284,000 to +$497,000`), calculated as the LP's `$355,000` position multiplied by the disclosed `+80% to +140%` impact.
- Intentional content omission: the reference includes an aggregate “other LPs” percentage that is not present in the sample data model. The prototype does not invent that figure.

**Open Questions**

- None required for this pass. If a validated unit-pricing formula or aggregate LP percentage is added to the product model, those two content details can be revisited.

**Comparison target and evidence**

- Source visual truth: `screenshots/lp-decision-direction.png` (1487 × 1058 px).
- Implementation: `web/prototype.html`, rendered as a 1472 × 1047 CSS-pixel iframe at the matching desktop state.
- Combined comparison page: `screenshots/decision-desk-comparison.html` (local URL: `http://127.0.0.1:4173/screenshots/decision-desk-comparison.html`). The source image and live implementation appear together in the same browser capture.
- Implementation screenshot path: CUA in-app browser capture, 1472 × 568 px, returned inline during this review. The browser blocked the data-URL route used to persist the capture, so no PNG file was saved; the comparison URL above reproduces the view. Source and implementation were scaled uniformly to approximately 0.44 for the combined view. CUA did not expose device-scale-factor metadata.
- State: LP standard rights; 23 Sep 2026 valuation; redemption eligible; valuation age shown as six days; no request pending.
- Full-view comparison evidence: final combined capture at the comparison URL shows the status, CTA, impact/position, disclosure boundaries, and key dates together. The 1472 × 568 browser capture contains both full page views at the same visual scale.
- Focused region comparison: not needed for this pass. The full-view comparison makes the red check mark, hero typography, impact block, confidentiality panels, and dates visible; the browser accessibility tree also confirmed the rendered copy and state.
- Responsive review: at the default 353 × 618 mobile viewport, the LP view stacks cleanly. The impact metrics and disclosure panels were inspected after scrolling; no horizontal overflow was visible.
- Manual interaction review: the redemption CTA reached its accepted prototype state; selecting the stale valuation changed the status to “Redemption blocked” and showed the 98-day age and expired deadline. The collapsed prototype controls can be opened with the keyboard.

**Required fidelity surfaces**

- Fonts and typography: Newsreader display text and IBM Plex interface text preserve the reference hierarchy. The eligibility headline and impact headline now use the same line breaks at the matched desktop view; small labels remain compact and readable.
- Spacing and layout rhythm: the hero keeps status and redemption action side by side, followed by the two-column impact and disclosure areas and a three-column date strip. The mobile view stacks those regions into one column.
- Colors and visual tokens: the warm paper background, ink text, neutral rules, and red restricted-state treatment follow the source palette. The check mark uses the same red accent.
- Image quality and asset fidelity: the reference’s filled circle-check is a local Font Awesome Free icon asset, sized to the hero; no other photographic or illustrative assets appear in the selected view.
- Copy and content: the eligibility, position, impact, confidentiality, and deadline messages track the reference. The position-impact range and omitted aggregate LP percentage are explained above as data-model constraints.
- Interaction and accessibility: the main redemption action, stale-state control, accessible status region, and keyboard-openable prototype controls were reviewed in the browser.

**Comparison history**

1. The first combined comparison showed a missing status mark, a narrower impact headline wrap, an extra sample-data sentence, no position-impact summary, and mismatched stale/current dates and confidentiality labels.
2. The prototype added the Font Awesome circle-check asset, aligned the fictional fixture date to 29 Sep 2026, matched the impact headline and key dates, added a position-level impact range derived from the sample value, aligned the withheld fields, and collapsed the demo controls below the main view.
3. The final combined capture at `screenshots/decision-desk-comparison.html` shows the headline wrapping, status placement, panels, and date row aligned to the selected reference. The remaining content differences are the two intentional data limitations listed above.

**Implementation Checklist**

- [x] Decision-first LP status with an accessible redemption CTA.
- [x] Position impact and “shown/withheld” information panels.
- [x] Current and stale valuation states with a computed deadline.
- [x] Mobile stacking and keyboard-accessible prototype controls.
- [x] Final same-state source and implementation comparison.

**Follow-up Polish**

- Revisit the source mock’s per-unit estimate and aggregate LP percentage if the product model later supplies approved values.

final result: passed
