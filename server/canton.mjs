import { createReadStream } from "node:fs";
import { randomUUID } from "node:crypto";

const DEFAULT_URL = "https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export class CantonError extends Error {
  constructor(message, status = 502, detail = "") { super(message); this.status = status; this.detail = detail; }
}

function cleanUrl(value) { return String(value || DEFAULT_URL).replace(/\/$/, ""); }
function required(value, name) { if (!value) throw new CantonError(`${name} is not configured.`, 503); return value; }

export function cantonConfig(env = process.env) {
  return {
    baseUrl: cleanUrl(env.CANTON_JSON_API_URL),
    accessToken: env.CANTON_ACCESS_TOKEN || "",
    oidcTokenUrl: env.CANTON_OIDC_TOKEN_URL || "https://keycloak.naas.noders.services/realms/noders-appsfactory/protocol/openid-connect/token",
    clientId: env.CANTON_OIDC_CLIENT_ID || env.CANTON_CLIENT_ID || "",
    clientSecret: env.CANTON_OIDC_CLIENT_SECRET || env.CANTON_CLIENT_SECRET || "",
    username: env.CANTON_OIDC_USERNAME || env.CANTON_USERNAME || "",
    password: env.CANTON_OIDC_PASSWORD || env.CANTON_PASSWORD || "",
    userId: env.CANTON_USER_ID || "lookthrough-web",
    fundId: env.CANTON_FUND_ID || "AZIM-01",
    gpParty: env.CANTON_GP_PARTY || "",
    reviewerParty: env.CANTON_REVIEWER_PARTY || "",
    auditorParty: env.CANTON_AUDITOR_PARTY || "",
    standardLpParty: env.CANTON_STANDARD_LP_PARTY || "",
    enhancedLpParty: env.CANTON_ENHANCED_LP_PARTY || ""
  };
}

export function createCantonClient(options = {}) {
  const config = { ...cantonConfig(), ...options, baseUrl: cleanUrl(options.baseUrl || cantonConfig().baseUrl) };
  let cachedToken = config.accessToken;
  let tokenExpiry = cachedToken ? Number.MAX_SAFE_INTEGER : 0;

  async function accessToken() {
    if (cachedToken && Date.now() < tokenExpiry - 30_000) return cachedToken;
    if (config.accessToken) return config.accessToken;
    required(config.oidcTokenUrl, "CANTON_OIDC_TOKEN_URL");
    required(config.clientId, "CANTON_OIDC_CLIENT_ID");
    required(config.username, "CANTON_OIDC_USERNAME");
    required(config.password, "CANTON_OIDC_PASSWORD");
    const body = new URLSearchParams({ grant_type: "password", client_id: config.clientId,
      username: config.username, password: config.password });
    if (config.clientSecret) body.set("client_secret", config.clientSecret);
    const response = await fetch(config.oidcTokenUrl, { method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.access_token)
      throw new CantonError("Canton identity provider did not return an access token.", 502,
        typeof payload.error_description === "string" ? payload.error_description : "token request failed");
    cachedToken = payload.access_token;
    tokenExpiry = Date.now() + Number(payload.expires_in || 300) * 1000;
    return cachedToken;
  }

  async function request(path, { method = "GET", body, contentType = "application/json", timeoutMs = 12_000, auth = true } = {}) {
    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = contentType;
    if (auth) headers.Authorization = `Bearer ${await accessToken()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const request = { method, headers,
        body: body === undefined ? undefined : contentType === "application/json" ? JSON.stringify(body) : body,
        signal: controller.signal };
      if (body && typeof body.pipe === "function") request.duplex = "half";
      const response = await fetch(config.baseUrl + path, request);
      const raw = await response.text();
      let payload; try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { raw: raw.slice(0, 500) }; }
      if (!response.ok) throw new CantonError(`Canton API ${method} ${path} returned ${response.status}.`, response.status, payload);
      return payload;
    } catch (error) {
      if (error instanceof CantonError) throw error;
      throw new CantonError(error.name === "AbortError" ? "Canton API request timed out." : "Canton API could not be reached.", 502, error.message);
    } finally { clearTimeout(timer); }
  }

  async function ledgerEnd() { return request("/v2/state/ledger-end"); }
  const configured = Boolean(config.accessToken || (config.clientId && config.username && config.password));
  async function health() {
    const started = Date.now();
    try {
      const end = await ledgerEnd();
      return { configured: true, connected: true, baseUrl: config.baseUrl, ledgerEnd: end,
        latencyMs: Date.now() - started };
    } catch (error) {
      return { configured: true, connected: false, baseUrl: config.baseUrl,
        error: error.message, status: error.status, detail: error.detail, latencyMs: Date.now() - started };
    }
  }
  function eventFormat(includeCreatedEventBlob = false) {
    return { filtersByParty: {},
      filtersForAnyParty: { cumulative: [{ identifierFilter: {
        WildcardFilter: { value: { includeCreatedEventBlob } }
      } }] }, verbose: false };
  }
  async function activeContracts({ party, includeCreatedEventBlob = true, activeAtOffset } = {}) {
    required(party, "a Canton party");
    const format = eventFormat(includeCreatedEventBlob);
    format.filtersByParty = { [party]: { cumulative: [{ identifierFilter: {
      WildcardFilter: { value: { includeCreatedEventBlob } }
    } }] } };
    delete format.filtersForAnyParty;
    let offset = activeAtOffset;
    if (offset === undefined) {
      const end = await ledgerEnd();
      offset = typeof end === "number" ? end : end?.offset ?? end?.ledgerEnd ?? end?.ledger_end;
    }
    if (offset === undefined) throw new CantonError("Canton ledger-end did not return an offset.", 502);
    return request("/v2/state/active-contracts", { method: "POST",
      body: { eventFormat: format, activeAtOffset: offset } });
  }
  async function submit({ commands, actAs, readAs = actAs, userId = config.userId, workflowId = randomUUID(), commandId = randomUUID() }) {
    required(actAs?.length, "actAs party");
    if (!Array.isArray(commands) || !commands.length) throw new CantonError("At least one Canton command is required.", 400);
    return request("/v2/commands/submit-and-wait", { method: "POST", body: {
      commands, userId, commandId, workflowId, actAs, readAs
    } });
  }
  async function uploadDar(file) {
    required(file, "DAR file");
    const body = createReadStream(file);
    return request("/v2/packages", { method: "POST", body, contentType: "application/octet-stream", timeoutMs: 60_000 });
  }
  return { config, configured, request, accessToken, health, ledgerEnd, activeContracts, submit, uploadDar };
}

export function templateId(module, entity) { return `#lookthrough:${module}:${entity}`; }

function damlJson(value) {
  if (Array.isArray(value)) return value.map(damlJson);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, damlJson(item)]));
  return typeof value === "number" ? String(value) : value;
}

export function createCommand(template, createArguments) { return { CreateCommand: { templateId: template, createArguments: damlJson(createArguments) } }; }
export function exerciseCommand(template, contractId, choice, choiceArgument = {}) {
  return { ExerciseCommand: { templateId: template, contractId, choice, choiceArgument: damlJson(choiceArgument) } };
}
export function createdEvent(entry) {
  return entry?.contractEntry?.JsActiveContract?.createdEvent
    || entry?.contractEntry?.createdEvent || entry?.contractEntry?.created_event
    || entry?.activeContract?.createdEvent || entry?.createdEvent || entry;
}
export function sameTemplate(actual, expected) {
  if (!expected) return true;
  if (!actual) return false;
  const core = id => String(id).split(":").slice(-2).join(":");
  return actual === expected || core(actual) === core(expected);
}
export async function waitForActiveContract(client, { party, template, predicate = () => true, attempts = 5 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await client.activeContracts({ party, includeCreatedEventBlob: true });
    const entries = Array.isArray(response) ? response : response.activeContracts || response.active_contracts || response;
    const found = (Array.isArray(entries) ? entries : []).map(createdEvent).find(event => {
      const id = event.templateId || event.template_id;
      return sameTemplate(id, template) && predicate(event);
    });
    if (found) return found;
    await sleep(500 * (attempt + 1));
  }
  throw new CantonError(`Timed out waiting for active Canton contract ${template || ""}.`, 504);
}
