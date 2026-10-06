# Lookthrough: pitch material

## What it is

Lookthrough is a permissioned disclosure layer for private funds. A fund manager and a fund administrator prepare one event with two payloads. Each investor receives the payload their agreement permits, as a receipt on Canton. The same ledger refuses a redemption when the last disclosed valuation has gone stale.

## The problem

A private fund discloses a material event, and its investors do not all have the same right to know what happened.

One limited partner is bound by the confidentiality clause in the fund agreement. Another negotiated a side letter that names the portfolio company. Today the manager sends one document to everyone and over-discloses to the first group, or keeps separate versions and trusts that the right file reached the right inbox. Neither option is auditable after the fact.

Redemptions carry the same problem in a different shape. A fund can only price a redemption against a valuation that is still fresh. If an administrator strikes a valuation on 6 October and a request arrives on 20 November, someone has to notice that the number is old. In an email and spreadsheet process, that someone is a person remembering to check.

Lookthrough moves both checks into the contract.

The market is moving toward this kind of structure. A white paper from Boston Consulting Group, Invesco and Aptos Labs, published on 29 October 2024, estimated that tokenized fund assets could exceed US$600 billion by 2030, up from more than US$2 billion in October 2024. Funds that hold assets on a ledger and still disclose by email have moved the ownership record and left the information rights behind.

## Why Canton

The product rule and the contract rule are the same rule. That is the whole reason for building on Canton.

In Lookthrough, the Daml contract choices are where the policy lives:

- A redemption contract asserts that the latest disclosed valuation is not in the future, not older than the disclosure window, and not a restated date. If the valuation is stale, `RequestRedemption` aborts and no units are reserved. The application does not get to override this, because there is no code path around it.
- `StrikeValuation` refuses to restate a date that has already been struck. The record of what investors were told does not move.
- A disclosure draft names the manager as signatory and a separate administrator as the party who can publish it. A manager cannot approve their own draft, because the choice is not theirs to exercise.
- A receipt is created for each investor with only their permitted payload, and the investor parties are the ones who can see it. The standard investor's receipt does not contain the enhanced text at all, so there is nothing to filter on the client.

Canton supplies three things this needs. Private, permissioned data, so a receipt is visible to the party it was written for and the parties with a recorded interest in it. Multi-party atomicity, so publishing one disclosure and issuing both investors' receipts happen in a single transaction, or none of them do. And contract logic that both parties have signed, so the refusal is a fact about the agreement rather than a validation rule in someone's server.

Every claim above is executed, not asserted. `scripts/test-daml.ps1` runs 12 Daml Script tests against a real Daml ledger service, covering stale-valuation refusal, the exact 30-day boundary, restatement rejection, future valuation rejection, recipient privacy, reviewer separation, pending drafts surviving position replacement, partial redemption, and the rights upgrade. `docs/evidence/daml-junit.xml` holds the results.

## Who it is for

Four roles are in the workflow, and each one has a different reason to open it.

The fund manager prepares the event. They want to publish a material development once and let recorded rights decide who sees which version of it.

The fund administrator reviews it. They are a separate party from the manager, and their approval is what turns a draft into a delivered receipt. This is the control an auditor will ask about first.

The limited partners read their own view. A standard investor sees economic impact. An enhanced investor, under a side letter, sees the named position. Both hold a receipt that records what they were told, when, and under which clause.

The auditor follows the decision from the receipt back to the contract that produced it, and exports the record.

The buyer in practice is the party that already runs this process and already owns the control: the fund administrator, or the operations team at a manager who services several funds. The manager feels the pain, but the administrator has the budget and the existing relationship.

## Where it runs now

The workspace runs locally on `npm start` with all five roles.

`npm run devnet:execute` uploads `lookthrough.dar` to a Canton participant and submits eight commands: fund creation, both position proposals and acceptances, a valuation, disclosure preparation and reviewer approval. They land at offsets 26 to 47. `docs/evidence/devnet-proof.json` records the transaction IDs, the template IDs and the contract IDs from that run.

The running workspace is wired to the same participant. `/api/health` reports `mode: canton-devnet`, `ledgerConnected: true` and `devnetActionsReady: true`, and the header reads *Canton DevNet connected*. Recording a valuation, publishing a disclosure and requesting a redemption each submit to the ledger before the local audit log records anything.

`npm test` runs 15 Node tests over the workflow, authorization, privacy, persistence and Canton adapter. `npm run verify` runs 15 static checks. The DAR validates with Daml SDK 3.5.2.

Seven demo frames, captured with no console or page errors, are in `screenshots/demo-2026-10-06/`. Frame 04 is the same disclosure read by the standard investor; frame 05 is the enhanced investor reading the payload that frame 04 does not contain.

## Go to market

This is a plan, not traction. Nothing below has happened yet.

Start with one fund whose transfer agent already handles the reporting cycle. The administrator runs Lookthrough for that fund alongside the process they have now, for one quarter, and the output goes to the same investors on the same dates. The measure is whether the receipts match what the administrator would have sent, and whether any stale-valuation request that used to slip through is now refused.

The channel is the Canton ecosystem, because the buyer has to be on Canton for any of this to be enforced rather than promised. Fund administrators, transfer agents and tokenization platforms already building there are the first conversations.

After that, sell the auditor's export. An audit trail that can be reproduced from a ledger without a person assembling it is the part that survives a change of administrator.

Pricing has not been set.

## Validation

Two different things are usually meant by this word, and only one of them is done.

**What has been proved.** The contract rules execute on a real ledger and refuse the wrong answers. Twelve Daml Script tests cover every refusal path, and they fail the build if a rule regresses. The five-party workflow ran end to end against a Canton participant with a reproducible proof file. The workspace was driven through the full manager to administrator to investor to auditor path against that ledger, and the screenshots above are from that run. A defect found only against the real ledger, JSON encoding of Daml numeric types, was found this way and fixed.

**What has not been done.** No one has been interviewed. There are no customer conversations, no design partners, no letters of intent, and no pricing research. A market number from a white paper is not evidence that a specific administrator will buy this.

The next step is five conversations, with fund administrators and operations leads at managers running two to twenty funds, asking three things: how many separate versions of a disclosure they produce per event, who checks valuation freshness before accepting a redemption today, and what their auditor asked for the last time they were reviewed. Until those conversations happen, the problem statement above is a reasoned hypothesis.

## Team

`[TEAM: names, roles, and relevant background. This section must be filled in by the submitter before the platform profile is published.]`

## Sources

- Boston Consulting Group, Invesco and Aptos Labs, *Tokenized Funds: The Third Revolution in Asset Management Decoded*, white paper, 29 October 2024. BCG press release: https://www.bcg.com/press/29october2024-tokenized-funds-the-third-revolution-in-asset-management-decoded. The US$600 billion figure is BCG's estimate for 2030, not an observed value.
