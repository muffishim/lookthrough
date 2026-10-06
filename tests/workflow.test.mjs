import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWorkflow, ROLES } from "../server/workflow.mjs";
import { createAppServer } from "../server/index.mjs";

const DAY = 86400000;
const draft = { eventId: "EVENT-001", standardText: "Economic impact, no portfolio identity.",
  enhancedText: "Northwind Robotics, confidential position value 41.2m." };
function fixture(options = {}) {
  let now = new Date("2026-10-04T09:00:00Z");
  const flow = createWorkflow({ ...options, clock: () => now });
  return { flow, advance: ms => { now = new Date(now.getTime() + ms); },
    fresh: () => flow.strike("gp", { asOf: "2026-10-04", navCents: 125, basis: "Fictional approved NAV" }) };
}
const denied = (fn, status) => assert.throws(fn, error => error.status === status);

test("all five roles receive a valid projection; unknown identity is refused", () => {
  const { flow } = fixture();
  for (const role of ROLES) assert.equal(flow.view(role).actor, role);
  denied(() => flow.view("outsider"), 401);
});
test("only the GP can prepare; investors cannot retrieve a pending draft", () => {
  const { flow } = fixture();
  for (const role of ROLES.filter(r => r !== "gp")) denied(() => flow.prepare(role, draft), 403);
  flow.prepare("gp", draft);
  const lp = flow.view("lp-standard");
  assert.equal(lp.receipts.length, 0);
  assert.equal(lp.drafts, undefined);
  assert.equal(lp.draftSuggestions, undefined);
  assert.ok(!JSON.stringify(lp).includes("Northwind"));
});
test("GP cannot self-approve; reviewer publishes exactly one correctly scoped receipt per LP", () => {
  const { flow } = fixture();
  const { id } = flow.prepare("gp", draft);
  for (const role of ROLES.filter(r => r !== "reviewer")) denied(() => flow.decide(role, id, { decision: "approve" }), 403);
  assert.equal(flow.decide("reviewer", id, { decision: "approve" }).receiptCount, 2);
  const standard = flow.view("lp-standard"), enhanced = flow.view("lp-enhanced");
  assert.equal(standard.receipts[0].payload, draft.standardText);
  assert.equal(enhanced.receipts[0].payload, draft.enhancedText);
  assert.equal(standard.receipts[0].policyReference, "LPA §8.2");
  assert.equal(enhanced.receipts[0].policyReference, "Side letter SL-004");
  assert.ok(!JSON.stringify(standard).includes("Priya"));
  assert.ok(!JSON.stringify(standard).includes("Northwind"));
  assert.equal(standard.events, undefined);
  assert.equal(flow.view("auditor").receipts.length, 2);
  denied(() => flow.decide("reviewer", id, { decision: "approve" }), 409);
});
test("rejection requires a reason and produces no investor receipts", () => {
  const { flow } = fixture();
  const { id } = flow.prepare("gp", draft);
  denied(() => flow.decide("reviewer", id, { decision: "reject", reason: "" }), 400);
  flow.decide("reviewer", id, { decision: "reject", reason: "Need approved figures." });
  assert.equal(flow.view("auditor").drafts[0].reason, "Need approved figures.");
  assert.equal(flow.view("lp-standard").receipts.length, 0);
  denied(() => flow.prepare("gp", draft), 409);
});
test("stale requests are refused without reserving any units or writing events", () => {
  const { flow } = fixture();
  const before = flow.evidence("auditor").records.length;
  denied(() => flow.redeem("lp-standard", { units: "100000" }), 422);
  assert.equal(flow.view("lp-standard").position.units, "250000");
  assert.equal(flow.evidence("auditor").records.length, before);
});
test("a fresh partial request reserves units, preserves the fund and records its basis", () => {
  const { flow, fresh } = fixture(); fresh();
  const result = flow.redeem("lp-standard", { units: "100000" });
  assert.equal(result.indicativeValueCents, "12500000");
  assert.equal(result.settlement, "not-performed");
  assert.equal(flow.view("lp-standard").position.units, "150000");
  assert.equal(flow.view("lp-enhanced").position.units, "4000000");
  assert.equal(flow.view("gp").fund.id, "AZIM-01");
  denied(() => flow.redeem("lp-standard", { units: "150001" }), 422);
  flow.redeem("lp-standard", { units: "150000" });
  denied(() => flow.redeem("lp-standard", { units: "1" }), 422);
});
test("freshness includes exactly 30 days and refuses a request one second later", () => {
  const { flow, fresh, advance } = fixture(); fresh();
  advance(30 * DAY - 9 * 3600000);
  assert.equal(flow.view("lp-standard").position.redemptionEligible, true);
  flow.redeem("lp-standard", { units: "1" });
  advance(1000);
  assert.equal(flow.view("lp-standard").position.redemptionEligible, false);
  denied(() => flow.redeem("lp-standard", { units: "1" }), 422);
});
test("investors cannot backdate a decision, choose another party or reserve invalid units", () => {
  const { flow, fresh } = fixture(); fresh();
  denied(() => flow.redeem("gp", { units: "1" }), 403);
  denied(() => flow.redeem("lp-standard", { units: "1", requestedAt: "2026-01-01" }), 400);
  denied(() => flow.redeem("lp-standard", { units: "1", asOf: "2026-01-01" }), 400);
  for (const units of ["0", "-1", "1.5", "1e5", "NaN", "99999999999999999"])
    denied(() => flow.redeem("lp-standard", { units }), 400);
});
test("valuation must be GP supplied, valid, positive, not future dated and strictly forward", () => {
  const { flow, fresh, advance } = fixture();
  const input = { asOf: "2026-10-04", navCents: 125, basis: "Approved" };
  denied(() => flow.strike("reviewer", input), 403);
  denied(() => flow.strike("gp", { ...input, asOf: "2026-10-05" }), 422);
  denied(() => flow.strike("gp", { ...input, asOf: "2026-02-30" }), 400);
  denied(() => flow.strike("gp", { ...input, navCents: 0 }), 400);
  denied(() => flow.strike("gp", { ...input, navCents: 125.5 }), 400);
  fresh();
  denied(() => flow.strike("gp", input), 409);
  advance(DAY);
  flow.strike("gp", { ...input, asOf: "2026-10-05", navCents: 130 });
  assert.equal(flow.view("lp-standard").valuations.length, 3);
  assert.equal(flow.view("lp-standard").valuations[1].navCents, 125);
});
test("read projections cannot mutate workflow state; only GP and auditor can export evidence", () => {
  const { flow } = fixture();
  flow.view("gp").positions["lp-standard"].units = "1";
  assert.equal(flow.view("lp-standard").position.units, "250000");
  for (const role of ["reviewer", "lp-standard", "lp-enhanced"]) denied(() => flow.evidence(role), 403);
  assert.match(flow.evidence("auditor").caveat, /host can rewrite/);
});
test("persistent events replay and detect an edited hash chain", () => {
  const dir = mkdtempSync(join(tmpdir(), "lookthrough-test-")), file = join(dir, "events.jsonl");
  try {
    const { flow, fresh } = fixture({ file }); fresh();
    const { id } = flow.prepare("gp", draft); flow.decide("reviewer", id, { decision: "approve" });
    flow.redeem("lp-standard", { units: "1000" });
    const reopened = fixture({ file }).flow;
    assert.equal(reopened.view("lp-standard").position.units, "249000");
    assert.equal(reopened.view("lp-enhanced").receipts[0].payload, draft.enhancedText);
    writeFileSync(file, readFileSync(file, "utf8").replace("249000", "249001").replace("250000", "250001"));
    assert.throws(() => fixture({ file }), /integrity check failed/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test("HTTP workflow enforces sessions, role guards, scoped responses and safe file serving", async () => {
  const { flow } = fixture();
  const server = createAppServer({ workflow: flow });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const session = async role => {
    const response = await fetch(base + "/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    assert.equal(response.status, 200);
    return response.headers.get("set-cookie").split(";")[0];
  };
  const post = (path, cookie, data, origin) => fetch(base + path, { method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie, ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(data) });
  try {
    assert.equal((await fetch(base + "/api/view")).status, 401);
    const gp = await session("gp"), reviewer = await session("reviewer"), lp = await session("lp-standard");
    assert.equal((await post("/api/disclosures", lp, draft)).status, 403);
    assert.equal((await post("/api/disclosures", gp, draft, "https://unrelated.example")).status, 403);
    assert.equal((await post("/api/disclosures", gp, null)).status, 400);
    const prepared = await post("/api/disclosures", gp, draft); assert.equal(prepared.status, 201);
    const { id } = await prepared.json();
    assert.equal((await post("/api/disclosures/" + id + "/decision", gp, { decision: "approve" })).status, 403);
    assert.equal((await post("/api/disclosures/" + id + "/decision", reviewer, { decision: "approve" })).status, 200);
    const projection = await (await fetch(base + "/api/view", { headers: { Cookie: lp } })).json();
    assert.equal(projection.receipts[0].payload, draft.standardText);
    assert.ok(!JSON.stringify(projection).includes("Northwind"));
    assert.equal((await fetch(base + "/api/evidence", { headers: { Cookie: lp } })).status, 403);
    assert.equal((await fetch(base + "/.git/config")).status, 404);
    assert.equal((await fetch(base + "/server/workflow.mjs")).status, 404);
    assert.ok(!(await (await fetch(base + "/app.mjs")).text()).includes("Northwind"));
    assert.equal((await fetch(base + "/")).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
