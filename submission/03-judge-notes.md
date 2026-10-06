# Judge notes

## Track fit

**Investment Infrastructure: Funds, DAOs & Governance Tools.** Lookthrough coordinates a GP, administrator, two LP information-rights tiers and an auditor around a private fund workflow.

## Deliverables covered

- **MVP:** fund disclosure, valuation and partial capital-position reservation.
- **Role workflows:** GP/manager, independent reviewer, standard LP, enhanced LP and auditor.
- **Transparency:** separate receipts, policy references, payload hashes and exportable event evidence.
- **Operational logic:** GP-only preparation and valuation, reviewer-only publication, LP consent in Daml, stale valuation refusal and whole-unit reservations.
- **Brief:** see `docs/one-page-brief.md`.

## Canton proof

`daml/src/Lookthrough/Lookthrough.daml` is the contract model. `server/canton.mjs` uses the authenticated JSON Ledger API v2; `server/devnet-bridge.mjs` maps the UI actions to Daml choices; `scripts/devnet-smoke.mjs --execute` is the reproducible five-party path, including a partial redemption request. The repository does not claim a live DevNet transaction until `docs/evidence/devnet-proof.json` is generated from the participant.

## Evidence

- **`powershell -File scripts\test-daml.ps1`: 12 Daml Script tests execute against a Daml ledger service.** They cover stale-valuation refusal, the exact 30-day boundary, rejection of future and restated valuations, recipient privacy, reviewer separation, pending drafts surviving position replacement, partial redemption and the recorded-rights upgrade. JUnit output is written to `docs/evidence/daml-junit.xml`.
- `npm test`: 14 passing workflow, authorization, privacy, persistence and Canton adapter tests.
- `npm run verify`: 15 static checks.
- Production DAR and test DAR compile and validate with Daml SDK 3.5.2 (`damlc validate-dar` reports a valid archive of 30 packages).
- Fresh flow screenshots: `screenshots/audit-2026-10-04/`.

The refusal behaviours above are demonstrated by executed contracts, not asserted in prose.
