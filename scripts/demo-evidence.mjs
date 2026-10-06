import { createWorkflow } from "../server/workflow.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workflow = createWorkflow({ clock: () => new Date("2026-10-04T09:00:00Z") });
const observations = [];
try { workflow.redeem("lp-standard", { units: "100000" }); }
catch (error) { observations.push({ step: "Stale request", status: error.status, message: error.message }); }
const { id } = workflow.prepare("gp", { eventId: "EVENT-001", standardText: "Economic impact disclosed. Portfolio identity withheld.", enhancedText: "Fictional Northwind Robotics position revalued to $41.2m." });
try { workflow.decide("gp", id, { decision: "approve" }); }
catch (error) { observations.push({ step: "GP self approval", status: error.status, message: error.message }); }
workflow.decide("reviewer", id, { decision: "approve" });
workflow.strike("gp", { asOf: "2026-10-04", navCents: 125, basis: "Fictional administrator approved NAV" });
workflow.redeem("lp-standard", { units: "100000" });
const output = { generatedBy: "scripts/demo-evidence.mjs", description: "Scripted local simulation. Not a Canton ledger trace or user validation.", observations, standardInvestor: workflow.view("lp-standard"), enhancedInvestor: workflow.view("lp-enhanced"), audit: workflow.evidence("auditor") };
mkdirSync(resolve(root, "docs/evidence"), { recursive: true });
writeFileSync(resolve(root, "docs/evidence/local-workflow.json"), JSON.stringify(output, null, 2) + "\n");
console.log("Saved reproducible local workflow evidence. Remaining standard investor units: " + output.standardInvestor.position.units);
