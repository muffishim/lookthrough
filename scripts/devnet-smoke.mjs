#!/usr/bin/env node
/*
 * Reproducible DevNet path. It intentionally requires --execute before it can
 * upload a DAR or submit commands. Credentials stay in environment variables.
 *
 * Required: CANTON_ACCESS_TOKEN (or OIDC credentials), CANTON_GP_PARTY,
 * CANTON_REVIEWER_PARTY, CANTON_AUDITOR_PARTY, CANTON_STANDARD_LP_PARTY,
 * CANTON_ENHANCED_LP_PARTY.
 */
import { existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createCantonClient, CantonError, cantonConfig, createCommand, exerciseCommand, templateId, waitForActiveContract } from "../server/canton.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = cantonConfig();
const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");
const upload = !args.has("--skip-upload");
const fundTemplate = templateId("Lookthrough", "Fund");
const proposalTemplate = templateId("Lookthrough", "PositionProposal");
const positionTemplate = templateId("Lookthrough", "LpPosition");
const valuationTemplate = templateId("Lookthrough", "Valuation");
const draftTemplate = templateId("Lookthrough", "DisclosureDraft");
const receiptTemplate = templateId("Lookthrough", "DisclosureReceipt");
const redemptionTemplate = templateId("Lookthrough", "Redemption");
const standardRights = "Standard";
const enhancedRights = "Enhanced";
const fundId = config.fundId;
const eventId = process.env.CANTON_EVENT_ID || "EVENT-DEVNET-001";
const requireEnv = (name, value) => { if (!value) throw new Error(`${name} is required.`); return value; };
const createArgs = event => event?.createArgument || event?.createArguments || event?.create_argument || event?.create_arguments || {};
const parties = execute ? {
  gp: requireEnv("CANTON_GP_PARTY", config.gpParty), reviewer: requireEnv("CANTON_REVIEWER_PARTY", config.reviewerParty),
  auditor: requireEnv("CANTON_AUDITOR_PARTY", config.auditorParty), standard: requireEnv("CANTON_STANDARD_LP_PARTY", config.standardLpParty),
  enhanced: requireEnv("CANTON_ENHANCED_LP_PARTY", config.enhancedLpParty)
} : {};
const dar = resolve(root, "lookthrough.dar");
if (!existsSync(dar)) throw new Error("lookthrough.dar is missing. Run scripts/build-daml.ps1 first.");
const client = createCantonClient(config);
const proof = { mode: "canton-devnet", baseUrl: config.baseUrl, fundId, eventId, templateIds: { fundTemplate, proposalTemplate, positionTemplate, valuationTemplate, draftTemplate, receiptTemplate, redemptionTemplate }, commands: [] };
async function run(label, actAs, commands, readAs = actAs) {
  const response = await client.submit({ commands, actAs: [actAs], readAs: Array.isArray(readAs) ? readAs : [readAs], userId: config.userId, workflowId: `lookthrough-${label}-${Date.now()}` });
  const result = { label, actAs, updateId: response.updateId, completionOffset: response.completionOffset };
  proof.commands.push(result); console.log(`${label}: ${response.updateId || "submitted"} @ ${response.completionOffset ?? "?"}`); return response;
}
async function find(party, template, predicate = () => true) {
  return waitForActiveContract(client, { party, template, predicate });
}
async function main() {
  const health = await client.health();
  console.log(JSON.stringify({ endpoint: health.baseUrl, connected: health.connected, ledgerEnd: health.ledgerEnd ?? null }, null, 2));
  if (!execute) {
    console.log("Dry run only. Add --execute to upload the DAR and submit the five-party workflow.");
    return;
  }
  if (!health.connected) throw new Error(`DevNet is not reachable: ${health.error || "unknown error"}`);
  if (upload) { await client.uploadDar(dar); console.log("DAR uploaded to the participant."); }
  await run("fund", parties.gp, [createCommand(fundTemplate, { fundId, name: "Azim Fund I", gp: parties.gp,
    reviewer: parties.reviewer, auditors: [parties.auditor], disclosureIntervalDays: 30, latestValuation: null })], [parties.gp, parties.reviewer]);
  const fund = await find(parties.gp, fundTemplate, event => createArgs(event).fundId === fundId);
  const fundCid = fund.contractId || fund.contract_id;
  proof.fundContractId = fundCid;
  await run("proposal-standard", parties.gp, [exerciseCommand(fundTemplate, fundCid, "ProposePosition", { lp: parties.standard,
    rights: standardRights, policyReference: "LPA §8.2", commitment: 250000, units: 250000 })], [parties.gp, parties.standard]);
  const standardProposal = await find(parties.standard, proposalTemplate, event => createArgs(event).lp === parties.standard);
  const standardProposalCid = standardProposal.contractId || standardProposal.contract_id;
  await run("accept-standard", parties.standard, [exerciseCommand(proposalTemplate, standardProposalCid, "AcceptPosition", {})], [parties.standard, parties.gp]);
  const standardPosition = await find(parties.standard, positionTemplate, event => createArgs(event).lp === parties.standard);
  const standardPositionCid = standardPosition.contractId || standardPosition.contract_id;
  await run("proposal-enhanced", parties.gp, [exerciseCommand(fundTemplate, fundCid, "ProposePosition", { lp: parties.enhanced,
    rights: enhancedRights, policyReference: "SIDE-LETTER-004", commitment: 4000000, units: 4000000 })], [parties.gp, parties.enhanced]);
  const enhancedProposal = await find(parties.enhanced, proposalTemplate, event => createArgs(event).lp === parties.enhanced);
  const enhancedProposalCid = enhancedProposal.contractId || enhancedProposal.contract_id;
  await run("accept-enhanced", parties.enhanced, [exerciseCommand(proposalTemplate, enhancedProposalCid, "AcceptPosition", {})], [parties.enhanced, parties.gp]);
  const enhancedPosition = await find(parties.enhanced, positionTemplate, event => createArgs(event).lp === parties.enhanced);
  const enhancedPositionCid = enhancedPosition.contractId || enhancedPosition.contract_id;
  const asOf = process.env.CANTON_VALUATION_ASOF || new Date().toISOString();
  await run("valuation", parties.gp, [exerciseCommand(fundTemplate, fundCid, "StrikeValuation", { asOf, navPerUnit: 1.25,
    distributionsPerUnit: 0, feesAccruedPerUnit: 0, basis: "Fictional administrator-approved NAV",
    positionIds: [standardPositionCid, enhancedPositionCid] })], [parties.gp, parties.standard, parties.enhanced]);
  const updatedFund = await find(parties.gp, fundTemplate, event => createArgs(event).fundId === fundId);
  proof.fundContractIdAfterValuation = updatedFund.contractId || updatedFund.contract_id;
  const updatedStandard = await find(parties.standard, positionTemplate, event => createArgs(event).lp === parties.standard);
  const updatedEnhanced = await find(parties.enhanced, positionTemplate, event => createArgs(event).lp === parties.enhanced);
  await run("prepare-disclosure", parties.gp, [exerciseCommand(fundTemplate, proof.fundContractIdAfterValuation, "PrepareDisclosure", {
    eventId, standardText: "Economic impact disclosed; portfolio identity withheld.",
    enhancedText: "Fictional Northwind Robotics position revalued to $41.2m.", positionIds: [updatedStandard.contractId || updatedStandard.contract_id, updatedEnhanced.contractId || updatedEnhanced.contract_id]
  })], [parties.gp, parties.reviewer]);
  const draft = await find(parties.reviewer, draftTemplate, event => createArgs(event).eventId === eventId);
  await run("approve-disclosure", parties.reviewer, [exerciseCommand(draftTemplate, draft.contractId || draft.contract_id, "ApproveAndPublish", {})], [parties.reviewer, parties.standard, parties.enhanced, parties.auditor]);
  const receipts = await client.activeContracts({ party: parties.standard, includeCreatedEventBlob: true });
  proof.receiptQuery = { returned: Array.isArray(receipts) ? receipts.length : (receipts.activeContracts?.length ?? receipts.active_contracts?.length ?? 0), template: receiptTemplate };
  writeFileSync(resolve(root, "docs/evidence/devnet-proof.json"), JSON.stringify(proof, null, 2) + "\n");
  console.log("DevNet workflow complete. Proof written to docs/evidence/devnet-proof.json");
}
main().catch(error => { if (error instanceof CantonError) console.error(`CantonError: ${error.message}\n${error.detail ? JSON.stringify(error.detail) : ""}`); else console.error(error.message); process.exitCode = 1; });
