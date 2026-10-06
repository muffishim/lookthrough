import { CantonError, exerciseCommand, templateId, createdEvent, sameTemplate } from "./canton.mjs";

const templates = {
  fund: templateId("Lookthrough", "Fund"), position: templateId("Lookthrough", "LpPosition"),
  draft: templateId("Lookthrough", "DisclosureDraft")
};
const fail = message => { throw new CantonError(message, 503); };
const cid = event => event?.contractId || event?.contract_id;
const args = event => event?.createArgument || event?.createArguments || event?.create_argument || event?.create_arguments || {};

export function createDevnetBridge({ canton }) {
  const c = canton.config;
  const ready = Boolean(canton.configured && c.gpParty && c.reviewerParty && c.auditorParty && c.standardLpParty && c.enhancedLpParty);
  async function find(party, template, predicate) {
    if (!ready) fail("DevNet action sync is not configured. Set the five CANTON_*_PARTY values.");
    const result = await canton.activeContracts({ party, includeCreatedEventBlob: true });
    const list = Array.isArray(result) ? result : result.activeContracts || result.active_contracts || result;
    const matches = (Array.isArray(list) ? list : []).map(createdEvent).filter(event =>
      (!template || sameTemplate(event.templateId || event.template_id, template)) && predicate(args(event), event));
    if (!matches.length) throw new CantonError(`No active ${template} contract matched the requested workflow.`, 409);
    return matches.at(-1);
  }
  async function prepare(input) {
    const fund = await find(c.gpParty, templates.fund, a => a.fundId === c.fundId);
    const standard = await find(c.gpParty, templates.position, a => a.lp === c.standardLpParty);
    const enhanced = await find(c.gpParty, templates.position, a => a.lp === c.enhancedLpParty);
    return canton.submit({ actAs: [c.gpParty], readAs: [c.gpParty, c.reviewerParty], commands: [exerciseCommand(templates.fund, cid(fund), "PrepareDisclosure", {
      eventId: input.eventId, standardText: input.standardText, enhancedText: input.enhancedText,
      positionIds: [cid(standard), cid(enhanced)]
    })] });
  }
  async function decide(input) {
    const draft = await find(c.reviewerParty, templates.draft, a => a.eventId === input.eventId);
    if (input.decision !== "approve") throw new CantonError("DevNet bridge currently publishes approvals; use the local rejection path for review feedback.", 409);
    return canton.submit({ actAs: [c.reviewerParty], readAs: [c.reviewerParty, c.standardLpParty, c.enhancedLpParty, c.auditorParty], commands: [exerciseCommand(templates.draft, cid(draft), "ApproveAndPublish", {})] });
  }
  async function strike(input) {
    const fund = await find(c.gpParty, templates.fund, a => a.fundId === c.fundId);
    const standard = await find(c.gpParty, templates.position, a => a.lp === c.standardLpParty);
    const enhanced = await find(c.gpParty, templates.position, a => a.lp === c.enhancedLpParty);
    const asOf = input.asOf.includes("T") ? input.asOf : input.asOf + "T00:00:00Z";
    return canton.submit({ actAs: [c.gpParty], readAs: [c.gpParty, c.standardLpParty, c.enhancedLpParty, c.auditorParty], commands: [exerciseCommand(templates.fund, cid(fund), "StrikeValuation", {
      asOf, navPerUnit: Number(input.navCents) / 100, distributionsPerUnit: 0,
      feesAccruedPerUnit: 0, basis: input.basis, positionIds: [cid(standard), cid(enhanced)]
    })] });
  }
  async function redeem(actor, input) {
    const party = actor === "lp-standard" ? c.standardLpParty : c.enhancedLpParty;
    const position = await find(party, templates.position, a => a.lp === party);
    return canton.submit({ actAs: [party], readAs: [party, c.gpParty, c.auditorParty], commands: [exerciseCommand(templates.position, cid(position), "RequestRedemption", { requestedUnits: Number(input.units) })] });
  }
  return { ready, prepare, decide, strike, redeem };
}
