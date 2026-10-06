import test from "node:test";
import assert from "node:assert/strict";
import { createCantonClient, createCommand, templateId } from "../server/canton.mjs";

test("Canton v2 adapter uses ledger-end offset and eventFormat for ACS reads", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : undefined });
    if (url.endsWith("/v2/state/ledger-end"))
      return new Response(JSON.stringify({ offset: 73 }), { status: 200, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ activeContracts: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const client = createCantonClient({ baseUrl: "https://ledger.test", accessToken: "secret-token" });
    await client.activeContracts({ party: "GP::fingerprint" });
    assert.equal(calls.length, 2);
    assert.match(calls[0].init.headers.Authorization, /^Bearer /);
    assert.equal(calls[1].url, "https://ledger.test/v2/state/active-contracts");
    assert.equal(calls[1].body.activeAtOffset, 73);
    assert.ok(calls[1].body.eventFormat.filtersByParty["GP::fingerprint"]);
    assert.equal(calls[1].body.eventFormat.filtersForAnyParty, undefined);
    assert.equal(calls[1].body.filter, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Canton command helpers emit JSON Ledger API v2 command envelopes", () => {
  const command = createCommand(templateId("Lookthrough", "Fund"), { fundId: "AZIM-01" });
  assert.deepEqual(command, { CreateCommand: { templateId: "#lookthrough:Lookthrough:Fund", createArguments: { fundId: "AZIM-01" } } });
});
