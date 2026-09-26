# Lookthrough: Design Direction

Dial: ENERGY 1 / RHYTHM 2 / MOTION 1

## Design Read

Reading this as: a permissioned disclosure console for allocators and fund administrators, in a light document-like institutional language, dial ENERGY 1 / RHYTHM 2 / MOTION 1.

## Direction

Document, not dashboard. The artefact this product replaces is a fund fact sheet or an audited statement, so the interface inherits that lineage: paper-toned ground, hairline rules, serif identity, and a figure that always carries the date it was true as at.

Density is compact. This is a reading surface. Allocators compare numbers, so numbers get tabular figures, aligned columns, and no decoration competing with them.

Surfaces are flat sections divided by rules. No floating cards. Elevation is expressed by rule weight and whitespace, not shadow. Shadow is reserved for exactly one thing: the element that is currently being read.

Type mood: editorial, restrained, three voices maximum.

Motion: state changes only, 120ms cross-fade. Nothing enters, nothing floats.

## Palette

| Token | Value | Role |
|---|---|---|
| `--paper` | `#FBFAF8` | Ground. Warm off-white so the page reads as a document rather than a screen. |
| `--ink` | `#16161A` | Primary text and rules. |
| `--muted` | `#5F5C56` | Secondary text, labels, provenance lines. 6.4:1 on paper. |
| `--rule` | `#DCD9D2` | Hairline section and table rules. |
| `--rule-strong` | `#B8B4AB` | The as-at marker rule, the one rule allowed to be heavier. |
| `--stale` | `#9A2B1E` | Signal. Stale valuations, blocked actions, withheld content. Never decorative. |
| `--current` | `#2F5D3A` | Signal. Disclosed and within window. Never decorative. |

Two core colours (ink, paper), two functional signals, neutrals that do not count. Both signals are permitted one reason each: `--stale` marks the absence of a disclosure, `--current` marks its presence. Removing either destroys the product's central claim, which is that silence is visible.

## Typography

- **Newsreader** (serif) for the fund identity, view titles, and the material-event headline. Reason: the product's artefact is a disclosure document, and a serif carries that without decoration.
- **IBM Plex Sans** for labels, body, and table cells. Reason: it has genuine tabular figures, which this product needs more than almost anything else, and it is not a default AI grotesque.
- **IBM Plex Mono** for ledger identifiers only: party IDs, disclosure payload hashes, contract IDs. Reason: these are verbatim on-ledger strings where character ambiguity is a correctness bug, not a style choice.

Three weights per component maximum. Numbers are never bolded for emphasis; emphasis is weight, and the single heaviest weight on any screen belongs to the focal figure.

## Identity motif

**The as-at rule.** Every figure in the product is followed by a hairline marker and a date: "as at 31 Mar 2026". This is not decoration. It is the product's central claim rendered as a visual system, and it repeats on every figure in every view.

The second motif is the **RESTRICTED stamp**: a small uppercase label with a strikethrough rule, used only where the fund has withheld something. It appears where a reader would expect information and does not. That absence is the design.

Neither motif survives a logo swap, which is the test for whether this design has its own character.

## Layout

- Masthead: fund identity, the reader's role, and the as-at date. Hairline under it, never a box.
- Provenance strip: disclosure age and valuation age, side by side, before any figure. Reason: staleness is the first thing a reader needs, so it is the first thing on the page.
- One focal element per screen. On the LP view it is the material event. On the GP view it is the disclosure log. On the auditor view it is the valuation series. On the prospective LP view it is the restricted list.
- Sections divided by rules and whitespace, not by repeated card containers. R-14 and R-05 reason: the content is a sequence of statements, so the layout is a document flow.
- Mobile: the four-column figure table collapses to a two-line stacked pair per row, with the label above the value. The as-at marker moves inline rather than disappearing.

## Do

- Tabular numerals everywhere a figure appears.
- An explicit date on every figure.
- Say what is withheld, next to what is shown.
- One alarm colour, used only for absence and blockage.

## Don't

- Cards inside cards, or any surface that appears to float.
- Gradients, glow, or glass.
- Colour as decoration, or more than one signal colour in view at once.
- A chart where a number does the job. There are no charts in this product.
- A marketing navigation bar. This is an application surface, and every control on it resolves to something real.
