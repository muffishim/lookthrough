import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";

export const ROLES = ["gp", "reviewer", "lp-standard", "lp-enhanced", "auditor"];
export class WorkflowError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new WorkflowError(status, message); };
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const requireRole = (actor, ...allowed) => {
  if (!allowed.includes(actor)) fail(403, "Your role is not authorized for this action.");
};
const text = (value, name, max = 4000) => {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail(400, name + " must be nonempty text of at most " + max + " characters.");
  return value.trim();
};
const date = value => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value + "T00:00:00Z")) ||
      new Date(value + "T00:00:00Z").toISOString().slice(0, 10) !== value)
    fail(400, "Use a valid date in YYYY-MM-DD format.");
  return value + "T00:00:00Z";
};

export function createWorkflow({ file, clock = () => new Date(), seed = true } = {}) {
  let records = [];
  let state = { fund: { id: "AZIM-01", name: "Azim Fund I", windowDays: 30 },
    positions: {}, drafts: [], receipts: [], redemptions: [], valuations: [] };
  function replay(event) {
    const p = event.payload;
    if (event.type === "FundInitialized") {
      state.positions = structuredClone(p.positions);
      state.valuations = structuredClone(p.valuations);
    } else if (event.type === "DisclosurePrepared") state.drafts.push({ ...p, status: "pending" });
    else if (event.type === "DisclosurePublished") {
      const draft = state.drafts.find(d => d.id === p.draftId);
      draft.status = "published";
      draft.decisionAt = event.at;
      state.receipts.push(...p.receipts);
    } else if (event.type === "DisclosureRejected") {
      const draft = state.drafts.find(d => d.id === p.draftId);
      draft.status = "rejected"; draft.reason = p.reason; draft.decisionAt = event.at;
    } else if (event.type === "ValuationStruck") {
      state.valuations.push(p);
      for (const position of Object.values(state.positions)) {
        position.valuationAsOf = p.asOf; position.navCents = p.navCents;
      }
    } else if (event.type === "RedemptionRequested") {
      const position = state.positions[p.lp];
      position.units = (BigInt(position.units) - BigInt(p.units)).toString();
      state.redemptions.push(p);
    }
  }
  if (file && existsSync(file)) {
    const lines = readFileSync(file, "utf8").trim().split("\n").filter(Boolean);
    let previousHash = "0".repeat(64);
    for (const line of lines) {
      const event = JSON.parse(line);
      const { hash: digest, ...body } = event;
      if (event.previousHash !== previousHash || hash(body) !== digest)
        throw new Error("Audit log integrity check failed. Restore from a trusted copy.");
      replay(event); records.push(event); previousHash = digest;
    }
  }
  function append(type, actor, payload) {
    const body = { sequence: records.length + 1, id: randomUUID(), type, actor,
      at: clock().toISOString(), payload, previousHash: records.at(-1)?.hash ?? "0".repeat(64) };
    const event = { ...body, hash: hash(body) };
    if (file) { mkdirSync(dirname(file), { recursive: true }); appendFileSync(file, JSON.stringify(event) + "\n"); }
    replay(event); records.push(event);
    return event;
  }
  if (seed && !records.length) {
    append("FundInitialized", "setup", {
      positions: {
        "lp-standard": { name: "Tomas", rights: "Standard", policyReference: "LPA §8.2",
          units: "250000", commitmentCents: "25000000", valuationAsOf: "2026-06-23T00:00:00Z", navCents: 100 },
        "lp-enhanced": { name: "Priya", rights: "Enhanced", policyReference: "Side letter SL-004",
          units: "4000000", commitmentCents: "400000000", valuationAsOf: "2026-06-23T00:00:00Z", navCents: 100 }
      },
      valuations: [{ id: "sample-opening-valuation", asOf: "2026-06-23T00:00:00Z",
        navCents: 100, basis: "Fictional opening valuation", recordedAt: clock().toISOString() }]
    });
  }
  function eligibility(position) {
    const asOf = Date.parse(position.valuationAsOf);
    const now = clock().getTime();
    return Number.isFinite(asOf) && asOf <= now && now <= asOf + state.fund.windowDays * 86400000;
  }
  const validActor = actor => { if (!ROLES.includes(actor)) fail(401, "Select a valid demonstration identity."); };
  function view(actor) {
    validActor(actor);
    const result = { mode: "local-simulation", now: clock().toISOString(),
      fund: state.fund, actor, ledgerConnected: false };
    if (actor.startsWith("lp-")) {
      const position = state.positions[actor];
      return structuredClone({ ...result, position: { ...position, redemptionEligible: eligibility(position),
        navValueCents: (BigInt(position.units) * BigInt(position.navCents)).toString() },
        receipts: state.receipts.filter(r => r.lp === actor),
        redemptions: state.redemptions.filter(r => r.lp === actor),
        valuations: state.valuations });
    }
    return structuredClone({ ...result, positions: state.positions, drafts: state.drafts,
      ...(actor === "gp" ? { draftSuggestions: {
        standardText: "A portfolio revaluation has increased the fund's indicative value. Economic impact is disclosed; the investment identity is withheld under LPA §8.2.",
        enhancedText: "Northwind Robotics has been revalued. The fictional position value is $41.2m. This view includes the investment identity under side letter SL-004."
      } } : {}),
      receipts: state.receipts, redemptions: state.redemptions, valuations: state.valuations,
      events: records.map(e => ({ sequence: e.sequence, id: e.id, type: e.type,
        actor: e.actor, at: e.at, hash: e.hash, previousHash: e.previousHash })) });
  }
  function prepare(actor, input) {
    requireRole(actor, "gp");
    const id = randomUUID();
    const draft = { id, eventId: text(input.eventId, "Event reference", 100),
      standardText: text(input.standardText, "Standard disclosure"),
      enhancedText: text(input.enhancedText, "Enhanced disclosure"),
      preparedAt: clock().toISOString(), preparedBy: actor,
      recipients: Object.entries(state.positions).filter(([,p]) => BigInt(p.units) > 0n)
        .map(([lp, p]) => ({ lp, rights: p.rights, policyReference: p.policyReference })) };
    if (!draft.recipients.length) fail(409, "This fund has no active recipient positions.");
    if (state.drafts.some(d => d.eventId === draft.eventId)) fail(409, "This event reference already exists.");
    append("DisclosurePrepared", actor, draft);
    return { id };
  }
  function decide(actor, id, input) {
    requireRole(actor, "reviewer");
    const draft = state.drafts.find(d => d.id === id);
    if (!draft || draft.status !== "pending") fail(409, "This draft is no longer pending review.");
    if (input.decision === "reject") {
      append("DisclosureRejected", actor, { draftId: id, reason: text(input.reason, "Rejection reason", 1000) });
      return { status: "rejected" };
    }
    if (input.decision !== "approve") fail(400, "Choose approve or reject.");
    const publishedAt = clock().toISOString();
    const receipts = draft.recipients.map(recipient => {
      const payload = recipient.rights === "Enhanced" ? draft.enhancedText : draft.standardText;
      return { id: randomUUID(), eventId: draft.eventId, draftId: id, ...recipient,
        payload, payloadHash: createHash("sha256").update(payload).digest("hex"),
        publishedAt, preparedBy: draft.preparedBy, approvedBy: actor };
    });
    append("DisclosurePublished", actor, { draftId: id, receipts });
    return { status: "published", receiptCount: receipts.length };
  }
  function strike(actor, input) {
    requireRole(actor, "gp");
    const asOf = date(input.asOf);
    if (Date.parse(asOf) > clock().getTime()) fail(422, "A valuation cannot be future-dated.");
    if (state.valuations.some(v => Date.parse(v.asOf) >= Date.parse(asOf)))
      fail(409, "A valuation cannot restate a date already struck.");
    if (!Number.isSafeInteger(input.navCents) || input.navCents <= 0 || input.navCents > 100000000)
      fail(400, "NAV must be a positive whole number of cents, up to 1,000,000 dollars per unit.");
    const valuation = { id: randomUUID(), asOf, navCents: input.navCents,
      basis: text(input.basis, "Valuation basis", 1000), recordedAt: clock().toISOString() };
    append("ValuationStruck", actor, valuation);
    return structuredClone(valuation);
  }
  function redeem(actor, input) {
    requireRole(actor, "lp-standard", "lp-enhanced");
    if ("requestedAt" in input || "asOf" in input) fail(400, "The server supplies the decision timestamp.");
    const position = state.positions[actor];
    if (!eligibility(position)) fail(422, "Redemption refused: the disclosed valuation is outside the 30 day window.");
    const unitsText = String(input.units ?? "");
    if (!/^[1-9]\d{0,15}$/.test(unitsText)) fail(400, "Request a positive whole number of units.");
    const units = BigInt(unitsText);
    if (units > BigInt(position.units)) fail(422, "Requested units exceed your available position.");
    const request = { id: randomUUID(), lp: actor, units: units.toString(),
      navCents: position.navCents, indicativeValueCents: (units * BigInt(position.navCents)).toString(),
      valuationAsOf: position.valuationAsOf, requestedAt: clock().toISOString(),
      status: "reserved", settlement: "not-performed" };
    append("RedemptionRequested", actor, request);
    return structuredClone(request);
  }
  function evidence(actor) {
    requireRole(actor, "auditor", "gp");
    return { mode: "local-simulation", ledgerConnected: false,
      caveat: "A SHA-256 linked local log detects accidental edits. The host can rewrite it; this is not Canton consensus or independent notarization.",
      exportedAt: clock().toISOString(), records: structuredClone(records) };
  }
  return { view, prepare, decide, strike, redeem, evidence };
}
