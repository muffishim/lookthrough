# HackCanton Season 3 submission readiness

Target track: **Investment Infrastructure: Funds, DAOs & Governance Tools**.

## Verified working

- Public repository: `https://github.com/muffishim/lookthrough`. **Only the first commit is pushed; the workspace app, server, tests and submission material are not yet in it.**
- Local role-based MVP: `npm start`, with manager, administrator, standard LP, enhanced LP and auditor paths.
- Compiled Daml source and DAR build script (`scripts/build-daml.ps1`).
- **12 Daml Script tests execute on a real Daml ledger service** (`scripts/test-daml.ps1`, no node or network required). They cover stale-valuation refusal, the exact 30-day boundary, restatement rejection, future valuation rejection, recipient privacy, reviewer separation, pending drafts surviving position replacement, partial redemption, and the rights upgrade. JUnit evidence in `docs/evidence/daml-junit.xml`.
- 14 Node workflow, authorization, privacy, persistence and Canton adapter tests (`npm test`).
- 15 static checks (`npm run verify`).
- Fresh UX audit screenshots and demo script from `docs/audit-2026-10-04.md`.
- DevNet adapter and reproducible smoke command in `scripts/devnet-smoke.mjs`.

## Still required before final platform submission

- **Push the workspace to the public repository.** Everything above the first commit is local only, so the published repo does not yet contain the MVP, tests or submission material.
- Run the authenticated DevNet smoke path and publish the resulting public proof or demo video. This needs a token or OIDC credentials plus five party IDs from the Season 3 organisers. **No node hosting is required**, only the shared participant endpoint in `.env.example`.
- Complete the project profile and select one official track.
- Confirm the account has accumulated and burned 1,000 Mana and has at least one journal entry.
- Publish the demo or a video of no more than five minutes, pitch material covering problem, Canton use, target users, GTM and validation, and any required team information.
- Customer validation: no user interviews, tests or validation notes exist yet. This is a scored judging category and is currently empty.
- Do not select BitSafe Gold unless a Decentralized Party deployment path is accepted and the live DevNet/MainNet integration is actually demonstrated. Do not select Grofty unless the app genuinely integrates Grofty Wallet and reaches its MainNet requirements.
