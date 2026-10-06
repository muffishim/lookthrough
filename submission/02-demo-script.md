# Five-minute judge demo

## 1. Set the context — 30 seconds

Open `http://127.0.0.1:4173/`. Explain that Azim Fund I is fictional and that the role picker is a judge-friendly identity switcher. In a live DevNet run the header reads **Canton DevNet connected**; without credentials it reads **Local simulation**.

## 2. Prepare and review — 90 seconds

1. Choose **Meridian · Fund manager**.
2. Show the two disclosure fields: standard economic impact and enhanced investment detail.
3. Send the draft for review.
4. Choose **Elena · Fund administrator** and approve it.
5. Point out that publication creates a separate receipt for each LP.

## 3. Prove privacy — 45 seconds

Switch to **Tomas · Standard investor** and show the economic view. Switch to **Priya · Enhanced investor** and show the additional detail under the recorded side letter. The standard projection never includes Priya’s payload.

## 4. Prove operational logic — 75 seconds

1. Use the manager view to record a forward valuation.
2. Make a partial redemption as Tomas.
3. Point out the reserved units, valuation basis and explicit `settlement: not-performed` state.
4. Try the stale opening valuation path and show that the request is refused without reserving units.

## 5. Prove auditability — 40 seconds

Choose **Kwan · Auditor**, open **Activity & evidence**, show the linked event history and export the JSON evidence. Explain that the local hash chain detects accidental edits; Canton is the authoritative ledger once the authenticated DevNet path is run.

## 6. Technical close — 40 seconds

Show `daml/src/Lookthrough/Lookthrough.daml`, then run `npm test` and `npm run devnet:smoke`. With credentials and the five party IDs loaded, run `npm run devnet:execute`; it uploads the DAR, creates the fund and positions, strikes a valuation, prepares a disclosure and has the reviewer publish it.
