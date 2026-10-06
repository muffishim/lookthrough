import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createWorkflow, ROLES, WorkflowError } from "./workflow.mjs";
import { createCantonClient } from "./canton.mjs";
import { createDevnetBridge } from "./devnet-bridge.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = resolve(root, "web");
const json = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
};
async function body(req) {
  let result = "";
  for await (const chunk of req) {
    result += chunk;
    if (Buffer.byteLength(result) > 20000) throw new WorkflowError(413, "Request body is too large.");
  }
  try {
    const parsed = JSON.parse(result || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("object required");
    return parsed;
  }
  catch { throw new WorkflowError(400, "Request body must be valid JSON."); }
}
export function createAppServer({ workflow = createWorkflow(), canton = createCantonClient(), bridge = createDevnetBridge({ canton }), host = "127.0.0.1" } = {}) {
const sessions = new Map();
function actor(req) {
  const cookie = req.headers.cookie?.match(/(?:^|;\s*)lookthrough=([a-f0-9]{48})(?:;|$)/)?.[1];
  const session = sessions.get(cookie);
  if (!session || session.expires < Date.now()) throw new WorkflowError(401, "Choose a demonstration identity.");
  return session.role;
}
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };
return createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'");
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method !== "GET" && req.headers.origin &&
        req.headers.origin !== "http://" + req.headers.host)
      throw new WorkflowError(403, "Cross-origin writes are not accepted.");
    if (url.pathname === "/api/health") {
      const ledger = canton.configured ? await canton.health() : { configured: false, connected: false, baseUrl: canton.config.baseUrl };
      return json(res, 200, { mode: ledger.connected ? "canton-devnet" : "local-simulation", ledgerConnected: ledger.connected, devnetActionsReady: bridge.ready, ledger });
    }
    if (req.method === "POST" && url.pathname === "/api/session") {
      const input = await body(req);
      if (!ROLES.includes(input.role)) throw new WorkflowError(400, "Unknown demonstration identity.");
      const token = randomBytes(24).toString("hex");
      for (const [key, session] of sessions) if (session.expires < Date.now()) sessions.delete(key);
      sessions.set(token, { role: input.role, expires: Date.now() + 3600000 });
      res.setHeader("Set-Cookie", "lookthrough=" + token + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600");
      return json(res, 200, { role: input.role, warning: "Demonstration identity selection is not production authentication." });
    }
    if (url.pathname.startsWith("/api/")) {
      const role = actor(req);
      if (req.method === "GET" && url.pathname === "/api/view") return json(res, 200, workflow.view(role));
      if (req.method === "GET" && url.pathname === "/api/evidence") {
        res.setHeader("Content-Disposition", 'attachment; filename="lookthrough-local-evidence.json"');
        return json(res, 200, workflow.evidence(role));
      }
      if (req.method === "POST") {
        const input = await body(req);
        if (url.pathname === "/api/disclosures") {
          if (role === "gp" && bridge.ready) await bridge.prepare(input);
          return json(res, 201, workflow.prepare(role, input));
        }
        const match = url.pathname.match(/^\/api\/disclosures\/([a-f0-9-]+)\/decision$/);
        if (match) {
          const localResult = workflow.view("gp").drafts.find(d => d.id === match[1]);
          if (bridge.ready && role === "reviewer" && input.decision === "approve") await bridge.decide({ ...input, eventId: localResult?.eventId });
          return json(res, 200, workflow.decide(role, match[1], input));
        }
        if (url.pathname === "/api/valuations") {
          if (bridge.ready && role === "gp") await bridge.strike(input);
          return json(res, 201, workflow.strike(role, input));
        }
        if (url.pathname === "/api/redemptions") {
          if (bridge.ready && (role === "lp-standard" || role === "lp-enhanced")) await bridge.redeem(role, input);
          return json(res, 201, workflow.redeem(role, input));
        }
      }
      throw new WorkflowError(404, "Unknown API route.");
    }
    if (req.method !== "GET") throw new WorkflowError(405, "Method not supported.");
    const path = url.pathname === "/" ? "app.html" : decodeURIComponent(url.pathname.replace(/^\/(web\/)?/, ""));
    const target = resolve(webRoot, path);
    if (!target.startsWith(webRoot + sep)) throw new WorkflowError(404, "Page not found.");
    if (!mime[extname(target)] || !statSync(target).isFile()) throw new WorkflowError(404, "Page not found.");
    res.writeHead(200, { "Content-Type": mime[extname(target)], "Cache-Control": "no-store" });
    res.end(readFileSync(target));
  } catch (error) {
    json(res, error.status ?? (error.code === "ENOENT" ? 404 : 500),
      { error: error.status ? error.message : error.code === "ENOENT" ? "Page not found." : "The workflow could not be completed." });
    if (!error.status && error.code !== "ENOENT") console.error(error);
  }
});
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4173);
  const host = process.env.HOST ?? "127.0.0.1";
  const workflow = createWorkflow({ file: resolve(root, ".runtime", "workflow.jsonl") });
  const canton = createCantonClient();
  createAppServer({ workflow, canton, bridge: createDevnetBridge({ canton }), host }).listen(port, host, () => console.log(
    "Lookthrough local workflow demo: http://" + host + ":" + port +
    "\nFictional data. Choose a demonstration identity to begin." +
    (canton.configured ? "\nCanton ledger: " + canton.config.baseUrl : "\nCanton is not connected.")));
}
