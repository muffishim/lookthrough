# HackCanton Season 3 submission readiness

Target track: **Investment Infrastructure: Funds, DAOs & Governance Tools**.

## Verified working

- Public repository: `https://github.com/muffishim/lookthrough` at `0a5b84a`, containing the MVP, the tests, the executed-run proof, the demo frames and the submission material.
- Local role-based MVP: `npm start`, with manager, administrator, standard LP, enhanced LP and auditor paths.
- Compiled Daml source and DAR build script (`scripts/build-daml.ps1`).
- **12 Daml Script tests execute on a real Daml ledger service** (`scripts/test-daml.ps1`, no node or network required). They cover stale-valuation refusal, the exact 30-day boundary, restatement rejection, future valuation rejection, recipient privacy, reviewer separation, pending drafts surviving position replacement, partial redemption, and the rights upgrade. JUnit evidence in `docs/evidence/daml-junit.xml`.
- 15 Node workflow, authorization, privacy, persistence and Canton adapter tests (`npm test`).
- 15 static checks (`npm run verify`).
- Fresh UX audit screenshots and demo script from `docs/audit-2026-10-04.md`.
- **The full five-party workflow executes end to end against a real Canton participant.** `npm run devnet:execute` uploads the DAR and submits fund creation, both position proposals and acceptances, a valuation, disclosure preparation and reviewer approval, eight commands in total, at offsets 26 to 47. Reproducible against the local Canton 3.5.6 sandbox; ledger proof in `docs/evidence/devnet-proof.json`.
- DevNet adapter and reproducible smoke command in `scripts/devnet-smoke.mjs`.
- **The running workspace is wired to that participant.** `/api/health` reports `mode: canton-devnet`, `ledgerConnected: true` and `devnetActionsReady: true`, and the app header reads *Canton DevNet connected*. Recording a valuation, publishing a disclosure and requesting a redemption each submit through `server/devnet-bridge.mjs` before the local audit log is updated, so a successful action is a ledger transaction first.
- Reproducible demo captures: `scripts/capture-demo.mjs` writes seven frames to `screenshots/demo-2026-10-06/` with zero console or page errors.

## Still required before final platform submission

- **Run the same workflow against the shared Season 3 DevNet participant** and publish that proof. The local Canton run above proves the adapter and the contract; the shared participant is what judges can inspect. This needs a token or OIDC credentials plus five party IDs from the Season 3 organisers. **No node hosting is required**, only the shared participant endpoint in `.env.example`.
- Complete the project profile and select one official track.
- Confirm the account has accumulated and burned 1,000 Mana and has at least one journal entry.
- Publish the demo or a video of no more than five minutes, pitch material covering problem, Canton use, target users, GTM and validation, and any required team information.
- Customer validation: no user interviews, tests or validation notes exist yet. This is a scored judging category and is currently empty.
- Do not select BitSafe Gold unless a Decentralized Party deployment path is accepted and the live DevNet/MainNet integration is actually demonstrated. Do not select Grofty unless the app genuinely integrates Grofty Wallet and reaches its MainNet requirements.
