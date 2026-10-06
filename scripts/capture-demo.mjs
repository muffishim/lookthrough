import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "screenshots", `demo-${new Date().toISOString().slice(0, 10)}`);
const base = process.env.DEMO_URL || "http://127.0.0.1:4173/";

const candidates = [process.env.PLAYWRIGHT_PATH, "playwright", "C:/Users/toyin/Documents/aneroid.games/node_modules/playwright"].filter(Boolean);
let playwright;
let lastImportError;
for (const candidate of candidates) {
  let specifier = candidate;
  if (/^[a-zA-Z]:[\\/]/.test(candidate)) {
    const target = resolve(candidate);
    specifier = pathToFileURL(/\.[cm]?js$/.test(target) ? target : resolve(target, "index.js")).href;
  }
  try { ({ default: playwright } = await import(specifier)); break; } catch (error) { lastImportError = error; }
}
if (!playwright) throw new Error(`Playwright not found. Set PLAYWRIGHT_PATH. Last error: ${lastImportError?.message}`);

const errors = [];
const shots = [
  { name: "01-manager-overview", role: "gp", page: "overview" },
  { name: "02-manager-disclosures", role: "gp", page: "disclosures" },
  { name: "03-administrator-review", role: "reviewer", page: "disclosures" },
  { name: "04-standard-investor", role: "lp-standard", page: "overview" },
  { name: "05-enhanced-investor", role: "lp-enhanced", page: "overview" },
  { name: "06-auditor-evidence", role: "auditor", page: "activity" }
];

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 });
page.on("console", message => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
page.on("pageerror", error => errors.push(`pageerror: ${error.message}`));

await mkdir(out, { recursive: true });

async function open(path) {
  await page.goto(base.replace(/\/$/, "") + path, { waitUntil: "networkidle" });
  await page.waitForSelector("#view:not([aria-busy='true'])", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(400);
}

await open("/");
const header = await page.textContent("#ledger-mode");
const note = (await page.textContent("#demo-note")).replace(/\s+/g, " ").trim();
console.log(`ledger badge : ${header}`);
console.log(`demo note    : ${note}`);

for (const shot of shots) {
  await open("/");
  await page.selectOption("#identity", shot.role);
  await page.waitForFunction(() => document.querySelector("#view")?.getAttribute("aria-busy") !== "true", { timeout: 20000 });
  if (shot.page !== "overview") await page.click(`[data-page="${shot.page}"]`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(out, `${shot.name}.png`), fullPage: true });
  console.log(`captured     : ${shot.name}.png`);
}

await open("/web/prototype.html");
await page.waitForTimeout(700);
await page.screenshot({ path: resolve(out, "07-earlier-design-reference.png"), fullPage: true });
console.log("captured     : 07-earlier-design-reference.png");

await browser.close();
await writeFile(resolve(out, "capture-report.txt"), [
  `captured: ${new Date().toISOString()}`,
  `url: ${base}`,
  `ledger badge: ${header}`,
  `demo note: ${note}`,
  `console or page errors: ${errors.length}`,
  ...errors.map(e => `  - ${e}`)
].join("\n") + "\n");

console.log(errors.length ? `\n${errors.length} error(s):\n` + errors.join("\n") : "\nNo console or page errors.");
process.exitCode = errors.length ? 1 : 0;
