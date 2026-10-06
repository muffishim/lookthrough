# Platform copy: paste-ready fields

Everything below is ready to paste into the HackCanton Season 3 submission. Where a field needs information only the submitter has, it is marked `[FILL IN]`.

## Project name

```
Lookthrough
```

## One line

```
A permissioned disclosure layer that gives each investor the version of a fund event their agreement permits, and refuses a redemption when the valuation behind it has gone stale.
```

## Short description

Use this where the platform asks for a summary or tagline field.

```
Lookthrough is a disclosure and redemption workflow for tokenized private funds. The manager prepares one event with a standard and an enhanced payload, a separate administrator approves it, and each investor receives a receipt containing only the payload their agreement allows. Valuation freshness and no-restatement are enforced by the Daml contract, so a stale redemption request is refused by the ledger rather than caught by a person.
```

## Long description

Use this for the main project description.

```
Private funds have to disclose material events, and their investors do not all have the same right to know what happened. One limited partner is bound by the fund agreement's confidentiality clause. Another negotiated a side letter naming the portfolio company. Managers handle this today with separate document versions and manual checks, which is auditable only if someone kept the right record.

Lookthrough moves the two checks that matter into the contract.

Disclosure: the manager prepares one event with a standard payload and an enhanced payload. A fund administrator, who is a separate party from the manager, approves it. Publishing creates one receipt per investor on Canton, each containing only that investor's permitted payload. The standard investor's receipt does not contain the enhanced text at all.

Redemption: the fund contract asserts that the latest disclosed valuation is current, is not future-dated, and has not been restated. A request against a stale valuation aborts and reserves nothing. The application cannot override this because there is no code path around it.

Built on Canton for permissioned data and multi-party atomicity: receipts are visible to the parties with a recorded interest, and publishing a disclosure with both receipts is a single transaction or none of it happens.

What runs today: a local workspace with five roles, 12 Daml Script tests executing against a real ledger service, 15 Node tests, and an eight-command five-party workflow that executed end to end against a Canton participant with a reproducible proof file. The workspace is wired to that participant, so valuation, disclosure and redemption actions submit to the ledger before anything is recorded locally.

Repository: https://github.com/muffishim/lookthrough
```

## Track selection

Select **Track 3: Investment Infrastructure: Funds, DAOs & Governance Tools**. Do not select any other track.

Reason for the selection, for the notes field if one is offered:

```
The product is fund infrastructure. It handles how a fund discloses material events to investors with different information rights, how an administrator approves publication as a control separate from the manager, how a valuation watermark governs whether a redemption can be accepted, and how an auditor reproduces the trail. Every one of these is a fund operation, and every one of them is enforced by a Daml contract on Canton.
```

## Journal entry

The platform requires at least one journal entry. Draft:

```
Week one: the contract model and the workspace. We wrote the Daml templates for the fund, position, valuation, disclosure draft, receipt and redemption, then built a five-role workspace around them. The rule we kept returning to is that a redemption is only valid against a valuation that is still inside the disclosure window, and that a struck date is never restated. Those two behaviours are in the contract choices, not in the server.

Week two: running it against Canton. Uploading the DAR and submitting the workflow through the JSON Ledger API surfaced problems the local simulation could not. Daml numeric types arrive as JSON strings, contract IDs come back wrapped in an envelope, and template IDs carry a package hash on the ledger while commands use a module prefix. All three only appeared against a real participant. The executed run now produces a proof file with the transaction and contract IDs, and the workspace reports the ledger as connected.

What is left: the shared Season 3 participant needs credentials we have requested, and validation needs conversations with the fund administrators who would actually run this. Both are honest gaps, and we would rather name them than round them off.
```

Edit the dates and details to match when the work was actually done.

## Tags

```
canton
daml
private-funds
tokenization
fund-administration
disclosure
```

## Demo video

Title:

```
Lookthrough: permissioned disclosure and stale-valuation refusal on Canton
```

Description:

```
A five-minute walkthrough of Lookthrough on Azim Fund I, a fictional private fund.

0:00 The workspace and the five roles.
0:30 The manager prepares a disclosure with a standard payload and an enhanced payload.
1:30 A separate administrator approves it, which issues one receipt per investor.
2:15 The standard investor reads the withheld-identity payload; the enhanced investor reads the named position from the same event.
3:15 The manager records a forward valuation, and an investor requests a partial redemption against it.
4:15 The same request against a stale valuation is refused by the contract, with no units reserved.
4:40 The auditor exports the evidence.

Every action in the walkthrough is submitted to a Canton participant first. The refusal in the last step comes from the Daml contract, not from an application check.

Repository: https://github.com/muffishim/lookthrough
```

Adjust the timestamps after the video is recorded.

## Fields that need the submitter

- `[FILL IN] Team members, roles and background.` See `04-pitch.md`, Team section.
- `[FILL IN] Repository URL is correct at the time of writing; confirm it before submitting.`
- `[FILL IN] Project profile screenshots.` `screenshots/demo-2026-10-06/` holds seven frames captured with no console errors.
- `[FILL IN] Live URL, if the deployment goes ahead. See `06-deploy.md`.`
