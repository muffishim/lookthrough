# Lookthrough.systems

Lookthrough is a Canton fund operations workspace for permissioned disclosure. A manager prepares two views of a material event, an independent administrator reviews and publishes them, each investor receives only the view their recorded rights permit, and an auditor can reconstruct the decision history.

The target customer is a general partner or fund administrator running a private fund. Standard LPs receive an economic view, enhanced LPs receive the additional detail their side letter permits, and auditors receive the complete operational record. The sample fund and all figures are fictional.

## What is runnable now

- `npm start` serves the role-based workspace at `http://127.0.0.1:4173/`.
- The GP can prepare a disclosure, the reviewer can approve or reject it, and each LP receives a scoped receipt.
- The GP can strike a forward, nonfuture valuation. An LP can request a whole-unit partial redemption only while that valuation is within 30 days. Units are reserved; payment and token settlement are outside this MVP.
- The auditor can inspect the SHA-256 linked local event log and export evidence. The UI says clearly when it is local and when Canton is not connected.
- `npm test` runs 14 workflow, authorization, privacy, freshness, immutability, persistence, HTTP and Canton adapter tests.
- `scripts/build-daml.ps1` compiles and validates the production DAR.
- `scripts/test-daml.ps1` builds and **executes** `tests/daml/WorkflowTests.daml`: 12 Daml Script tests covering stale-valuation refusal, the 30-day boundary, restatement rejection, recipient privacy, reviewer separation, partial redemption and the rights upgrade. Results and a JUnit file are written to `docs/evidence/`.

## Run it

```powershell
npm start
# open http://127.0.0.1:4173/
npm test
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\build-daml.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-daml.ps1
```

`test-daml.ps1` runs the Daml Script tests through `damlc test`, which executes them against the compiler's in-process script service. It needs no Canton node, no sandbox and no network. A partial SDK install can leave `script-service.jar` under the `daml-script` component instead of the `damlc` component's `resources` folder, in which case `damlc test` reports `ScriptServiceException ... script-service.jar does not exist`; copying the file across repairs it.

The local event log is written to `.runtime/workflow.jsonl`, which is ignored by Git. This local log is useful for reproducible demonstrations but is not Canton consensus and can be rewritten by the host.

## Canton DevNet path

The server contains a server-side JSON Ledger API adapter in `server/canton.mjs`. It supports an access token or an OIDC password grant, ledger-end health checks, active-contract queries, DAR upload and `submit-and-wait`. Credentials never go to the browser.

The reproducible smoke path uploads `lookthrough.dar`, creates the Fund, admits two LP positions through GP/LP party actions, strikes a valuation, prepares a disclosure and has the reviewer publish it:

```powershell
$env:CANTON_ACCESS_TOKEN = "..."       # or set the OIDC variables below
$env:CANTON_GP_PARTY = "..."
$env:CANTON_REVIEWER_PARTY = "..."
$env:CANTON_AUDITOR_PARTY = "..."
$env:CANTON_STANDARD_LP_PARTY = "..."
$env:CANTON_ENHANCED_LP_PARTY = "..."
npm run devnet:smoke                       # health check and dry run
npm run devnet:execute                     # uploads and submits transactions
```

With OIDC instead of a token, set `CANTON_OIDC_USERNAME`, `CANTON_OIDC_PASSWORD`, `CANTON_OIDC_CLIENT_ID` and, when required, `CANTON_OIDC_CLIENT_SECRET`. The shared Season 3 JSON endpoint is the default; override it with `CANTON_JSON_API_URL`. `CANTON_USER_ID` defaults to `lookthrough-web`.

`.env.example` lists the required variables. Load a local copy into the server process; do not put credentials in the browser or commit them.

The execute command is intentionally opt-in because it creates contracts on the shared participant. It writes returned update IDs and offsets to `docs/evidence/devnet-proof.json`. A successful local run does not imply a DevNet run; the UI header changes to “Canton DevNet connected” only after an authenticated ledger-end request succeeds.

## Canton model

`daml/src/Lookthrough/Lookthrough.daml` contains the privacy boundary and operational rules. The Fund authorizes proposals, forward valuations and disclosure preparation. Position proposals require LP consent. Positions and receipts are scoped to their LP and auditors. A separate reviewer publishes receipts from a prepared draft. Valuation records are immutable, and redemption choices reserve units without pretending to settle cash.

The local UI mirrors this contract flow so a judge can exercise it without a node. DevNet mode uses the same DAR and party roles through the JSON Ledger API. Production would replace the demonstration identity selector with authenticated OIDC sessions and a participant query store; those are not claimed as implemented here.

## Hackathon submission status

The project is registered as Lookthrough.systems on HackCanton Season 3 and is targeting the official **Investment Infrastructure: Funds, DAOs & Governance Tools** track. The public repository is `https://github.com/muffishim/lookthrough`.

The official judging requirements still need to be completed in the platform: public demo or video, concise pitch materials, one selected track, a completed project profile, a non-empty journal, and 1,000 Mana accumulated and burned. Meaningful Canton integration must be demonstrated by an authenticated DevNet run or equivalent public ledger proof. This repository does not claim that proof until `docs/evidence/devnet-proof.json` is produced from the shared participant.

## Scope and limits

This is an MVP for fund disclosure and capital coordination. It does not custody funds, settle redemptions, verify NAV inputs, provide production authentication, or make legal judgments about an LPA or side letter. The local role selector is explicitly a demonstration identity picker. There is no Grofty Wallet integration and no BitSafe Decentralization Manager integration in this repository yet.
