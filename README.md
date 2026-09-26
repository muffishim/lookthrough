# Lookthrough

Lookthrough is a permissioned disclosure layer for tokenized private funds built on
Canton. It lets funds keep portfolio data private while giving LPs, auditors and
other authorised participants exactly the information they are entitled to see. Every
disclosure is timestamped, attributable and reconstructable, so investors can make
decisions without forcing funds to expose their entire book.

## Status, stated honestly

| Piece | State |
|---|---|
| `web/prototype.html` | Working single-file prototype. Open it in a browser, no build step. All data is fictional. |
| `DESIGN.md` | Written. Design Read declared, dials ENERGY 1 / RHYTHM 2 / MOTION 1. |
| `daml/src/Lookthrough/Lookthrough.daml` | **Compiles.** `lookthrough.dar`, 422 KB, built by `scripts/build-daml.ps1`. |
| `scripts/verify.mjs` | 50 assertions, including WCAG contrast maths read from the CSS tokens. |
| `scripts/clickthrough.mjs` | 23 assertions in a real Chromium, desktop 1440 and mobile 390. |

## Building the Daml

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-daml.ps1
```

The bare `dpm` binary installs a mismatched component set, and its `dpm build`
exits 0 while producing nothing at all. The script therefore drives `damlc`
directly against the package database inside the damlc distribution, and judges
success by the exit code and the presence of the DAR rather than by output.

## SDK notes worth keeping

Written against Daml SDK 3.5.2, whose API differs from older references in ways
that all cost a compile cycle to discover:

- Primitives (`Text`, `Party`, `Decimal`, `ContractId`, `List`) come from the
  implicit Prelude. `Daml.Prim` no longer exists and `DA.Types` does not export them.
- The time type is `Time`, not `datetime`. `DA.Time` exports `subTime` and
  `wholeDays`; there is no `diffDays` anywhere in the standard library.
- Contract updates are `create this with field = value` followed by `archive self`.
  The parenthesised form and `createAndArchive` do not parse.
- A choice's `observer` clause must precede `controller`.
- A template may have only one `ensure`, and it takes no message. Use `abort "..."`
  inside a choice body, which is better anyway because the message is the product.
- `` `notMember` `` and other backtick template functions are gone. Use `elem`.

## What is true in the prototype and what is invented

Everything on screen is sample data. Azim Fund I does not exist. The party IDs,
disclosure payload references, valuations and figures are invented to demonstrate
the interface. The interface is the deliverable; the numbers are not evidence of
anything.

What the prototype does demonstrate, because it is real logic rather than mockup
chrome:

- Switching reader changes what is visible. A standard LP does not see position-level
  detail; an auditor sees the full valuation series; a prospective LP sees a sanitised
  view with an explicit withheld list.
- The provenance strip and every as-at marker change when the disclosure goes cold.
- Requesting a redemption is refused when the last valuation is outside the window, and
  the refusal explains that the rule is in the fund contract. It is accepted when the
  valuation is current. This is the product's central mechanism, working.
- Dragging the as-at control reconstructs the whole view at a past date.
- Taking the index offline produces an error state that distinguishes "the ledger is
  fine, the reconstruction failed" from an empty page.

## The contracts

Five templates in one module:

- `Fund` holds the disclosure window, the auditor list, the optional portal party, and
  the valuation watermark. It refuses a redemption when `latestValuation` is older than
  the window, and refuses to strike a valuation for a date it has already passed.
- `Valuation` is immutable once struck. There is no edit path, which is the point:
  history cannot be restated.
- `MaterialEvent` carries a disclosed impact range with the underlying detail withheld.
  `disclosedTo` is the list of parties who received it, held on-ledger.
- `LpPosition` is one contract per LP, because Daml visibility is per contract and not
  per field. A standard LP therefore cannot see another LP's row by construction.
- `Redemption` is the record of an accepted redemption.

## Next, in order

1. Write Daml Script tests for the two invariants that matter: redemption refused
   when stale, and restatement refused. This needs `daml-script` back in
   `daml.yaml` dependencies, which requires a working registry fetch.
2. Run the package on a real ledger with `dpm sandbox`, then point the dashboard
   at the Ledger API and replace the sample data.
3. Register for HackCanton Season 3 before spending anything on infrastructure.
4. Stand up the Azure node only once there is something to serve on it. The
   hackathon does not require a public node, and a node with no working
   dashboard is a cost centre, not a demo.
