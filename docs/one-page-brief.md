# Lookthrough.systems — one-page brief

## Value / problem

Private funds need to coordinate valuations, material disclosures and capital requests without exposing every holding to every investor. Today the manager, administrator, LP and auditor often work from different email threads and periodic files. That creates unclear authority, stale decision inputs and weak evidence of who saw what.

## ICP / users

The customer is a general partner or fund administrator running a private fund with multiple information-rights tiers. The standard LP needs a timely economic view. An enhanced LP may receive investment-level detail under a side letter. The fund administrator reviews publication. The auditor needs a complete, attributable history.

## MVP

Lookthrough gives the fund a permissioned workflow:

1. The manager prepares standard and enhanced disclosure text for a material event.
2. A separate administrator approves or returns the draft with a reason.
3. Each LP receives a separate receipt with its policy reference and payload hash.
4. The manager records immutable, forward valuations.
5. An LP can reserve a partial number of units only while the current valuation is within 30 days.
6. The auditor can trace preparation, publication, valuation and reservation and export the evidence.

The local workspace is runnable today with fictional data. The Daml package encodes the intended Canton visibility and authorization model. The DevNet adapter and smoke path upload the DAR and submit the same flow through the JSON Ledger API when a participant token and party IDs are configured.

## Why Canton

Canton lets the fund share a contract with the parties that need a view while keeping other LPs from receiving that contract. Lookthrough uses that privacy boundary for information rights rather than putting an entire fund book in a public feed. Daml choices make the reviewer separation, valuation watermark and unit reservation rules explicit.

## Metrics and validation

There are currently no completed user interviews, so the product claims no customer validation. Technical evidence is concrete: 14 workflow, HTTP and Canton adapter tests pass; the production DAR and test DAR compile and the DAR validates; the captured flow covers role separation, scoped receipts, stale refusal, fresh valuation, partial reservation and evidence export. The next validation is a design-partner walkthrough with a fund administrator, measuring time to prepare a disclosure, review exceptions and answer an LP request.

## Go-to-market hypothesis

Start with fund administrators and transfer-agent partners already operating private-market vehicles. A design partner supplies a fictional or sandbox fund schema, runs one reporting cycle and compares ad-hoc information requests with the workspace flow. This is a distribution hypothesis, not a signed pipeline.

## Submission state

Target one official track: **Investment Infrastructure: Funds, DAOs & Governance Tools**. Before final submission, complete the public DevNet proof or video, project profile, journal, pitch materials and the platform’s 1,000 Mana requirement. Grofty Wallet is not integrated. BitSafe Gold is not claimed without a real Decentralized Party deployment; the Contribution Pool would require a separate reproducible Decentralization Manager LocalNet demo.
