# Lookthrough: one-page brief

**Track 3, Investment Infrastructure: Funds, DAOs & Governance Tools.** Submitted also
to Track 4, Data & Analytics & Ecosystem Dashboards, because the deliverable is a
permissioned analytics layer over fund administration contracts.

Lookthrough is a permissioned disclosure layer for tokenized private funds built on
Canton. It lets funds keep portfolio data private while giving LPs, auditors and
other authorised participants exactly the information they are entitled to see. Every
disclosure is timestamped, attributable and reconstructable, so investors can make
decisions without forcing funds to expose their entire book.

## The problem

A tokenized limited partner interest tells its holder one thing: *you own 0.4% of the
fund.* It does not say what the fund holds, what that stake is worth, what fees have
accrued, or when any of those numbers were struck. A holder about to redeem is making
the decision on a valuation that may be months old, with no way to see whether
something material happened since.

The obvious answer is to make the fund transparent, and funds cannot do that. Holdings
include bilateral negotiations, unannounced transactions and valuations that
competitors and other LPs are not entitled to see. On a network where tokens transfer
continuously, a disclosed position is a front-runnable position. So the fund stays
quiet, and the investor stays uninformed. Today the resolution is a quarterly PDF and,
for the auditor, a set of untimestamped CSV files.

Both sides of that trade are correct. Nothing has been built to satisfy both.

## Who it is for

The user is the limited partner. The customer is the general partner or fund
administrator, who pays because self-serve reporting shrinks their investor relations
workload and keeps LPs from running a diligence process that delays the next
commitment. The auditor is a second, smaller buyer.

The LPs who benefit most are smaller allocators and non-US investors who never
negotiated audit rights into their side letters. Sophisticated LPs with contractual
information rights can already get this by email.

## What it does

1. The fund discloses positions, valuations and material events to a portal party
   through an explicit choice on its own contract, on a schedule the contract
   enforces.
2. The portal serves each reader only what that reader is entitled to see. A standard
   LP sees their position, fees and material events. An LP with enhanced rights sees
   position-level detail. An auditor reconstructs the fund as it stood on any past
   date. A prospective LP gets a sanitised diligence view, so no data room is needed.
3. Where a confidential event would move an LP's position, the disclosure carries the
   impact and withholds the event. Enough to decide, not enough to expose the fund.

The two things it catches are restatement and asymmetric disclosure. A valuation is
immutable once struck, so a figure cannot be quietly moved; a valuation cannot be
struck for a date the fund has already passed. And the recipient set is held on-ledger
with each disclosure, so one LP being shown more than another is provable rather than
deniable.

## What it does not claim

It cannot force disclosure and it cannot catch a fund that lies consistently to
everyone. What it does is make disclosure permissioned, timestamped, attributable and
reconstructable, and it makes absence visible: a 94 day old valuation reads as a 94
day old valuation, and a redemption requested without a current disclosure is refused
by the fund's own contract rather than by our policy.

This is a narrower claim than "protects investors", and it is one a general partner
would actually sign up for. That is deliberate.

## Why Canton

On a public chain, fund holdings are public by default, the investor can already see
them, and no product is needed. The data we need is legitimately private, which means
building it requires a party inside the privacy boundary that the fund deliberately
admits. The privacy is the reason the product exists, and it is also the moat: to
build it you need the contract design that scopes each reader's view, and a node
holding the history that makes reconstruction possible.

Token Standard V2, CIP-112, is live on Canton mainnet, so the LP share itself can be a
standard instrument rather than a bespoke token.

## Why now

DTCC's tokenization service is launching in October with DTC-custodied Treasuries,
equities and ETFs. The settlement rails are arriving on schedule. The reporting layer
above them has not been built, and on a privacy network it cannot be built by
scraping.

## Pilot plan

Three steps, in order.

1. One real fund, one real administrator. Stand up the four contract templates and
   register a single production fund with its own auditor. Strike two valuations and
   confirm the redemption rule fires when one goes stale.
2. Admit three LPs of different rights tiers, one prospective investor, and the
   auditor. Run one reporting cycle end to end and replace the quarterly PDF with the
   portal view.
3. Turn on the disclosure log as a GP-facing screen, and measure whether the IR team
   answers fewer ad hoc questions than in step 2.

**Required integrations:** a Canton participant node for the fund's administrator, the
Ledger API in front of the portal, the participant query store indexing that node into
PostgreSQL, and the fund's existing transfer agent or admin platform as the system of
record for share issuance. No wallet integration is required in the pilot, because
participants are known in advance.

## How we would know it worked

Baseline first: count how many ad hoc information requests the IR team fields per
quarter, and how many days the audit takes to reconcile, before and after. If the IR
count does not fall, the GP has no reason to pay, and we should have said so earlier.

## MVP materials in this submission

- A working prototype covering six reader roles, including the refusal of a stale
  redemption: `web/prototype.html`, opens in a browser with no build step.
- Daml source for five templates, including the immutability and staleness
  invariants: `daml/src/Lookthrough/`. Not yet compiled; see `README.md`.
- Design direction and an automated structural and accessibility check:
  `DESIGN.md`, `scripts/verify.mjs`.

## Honest gaps

No real fund data, and no real users. The fund in the prototype is fictional and
labelled as such on every screen. The contracts have not been through a compiler. No
user interviews have been run yet, which is the single most valuable thing still
missing from this submission, and the cheapest to fix this week.
