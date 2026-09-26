import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require("C:\\Users\\toyin\\Documents\\aneroid.games\\node_modules\\playwright");

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const target = "file:///" + join(root, "web", "prototype.html").replace(/\\/g, "/");
const shots = join(root, "screenshots");
mkdirSync(shots, { recursive: true });

const results = [];
const check = (id, pass, detail) => results.push({ id, pass, detail });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();

const jsErrors = [];
const netFailures = [];
page.on("pageerror", (e) => jsErrors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") {
    const t = m.text();
    if (/net::|ERR_|Failed to load resource/.test(t)) netFailures.push(t);
    else jsErrors.push(t);
  }
});

await page.goto(target, { waitUntil: "load" });
await page.waitForSelector(".provenance", { timeout: 5000 });

/* ---- 1. every reader renders something different ---- */

const READERS = [
  ["lp-standard", ".focal", "A confidential event could move your position"],
  ["lp-enhanced", ".focal", "A confidential event could move your position"],
  ["gp", ".focal", "What you told them, to whom, and when"],
  ["auditor", ".focal", "The series has not moved"],
  ["prospective", ".focal", "Enough to invest"],
  ["exited", ".focal", "Nothing left to disclose"]
];

const fingerprints = {};
for (const [id, sel, expected] of READERS) {
  await page.click(`#roleSwitch button[data-reader="${id}"]`);
  await page.waitForSelector(sel, { timeout: 5000 });
  const focal = await page.textContent(sel);
  const body = await page.textContent("#main");
  fingerprints[id] = body.replace(/\s+/g, " ").trim();
  check(
    `R-26 reader ${id} renders`,
    focal.includes(expected),
    focal.trim().slice(0, 52)
  );
}

const unique = new Set(Object.values(fingerprints));
check("R-26 views are not identical", unique.size === 6, `${unique.size} distinct renderings`);

/* ---- 2. the LP view withholds what the auditor sees ---- */

await page.click('#roleSwitch button[data-reader="lp-standard"]');
await page.waitForSelector(".focal");
const lpText = await page.textContent("#main");
check("R-38 LP sees the withheld list", /What you are not seeing/.test(lpText), "restricted table present");
check("R-04 LP does not see the position schedule", !/Northwind Robotics\s*held at/.test(lpText), "no position-level detail leaks to a standard LP");

await page.click('#roleSwitch button[data-reader="auditor"]');
await page.waitForSelector(".focal");
const auditText = await page.textContent("#main");
check("R-04 auditor sees the series", /Valuation series/.test(auditText), "reconstruction table present");

/* ---- 3. staleness drives the provenance strip ---- */

await page.click('#roleSwitch button[data-reader="lp-standard"]');
await page.waitForSelector(".focal");
await page.click('#staleness button[data-role="on"]');
await page.waitForTimeout(400);
const currentProv = await page.textContent(".provenance");
check("R-27 current state is marked current", /Within the 30 day window/.test(currentProv), "window confirmed");

await page.click('#staleness button[data-role="off"]');
await page.waitForTimeout(400);
const staleProv = await page.textContent(".provenance");
check("R-27 stale state is marked stale", /Outside the 30 day disclosure window/.test(staleProv), "window breached");

/* ---- 4. redemption is refused when stale, accepted when current ---- */

await page.click("#redeemBtn");
await page.waitForSelector(".outcome.blocked", { timeout: 5000 });
const blocked = await page.textContent(".outcome.blocked");
check("R-26 stale redemption refused", /rule is in the fund agreement/.test(blocked), "refusal attributes the rule to the fund contract");
await page.screenshot({ path: join(shots, "lp-stale-blocked.png"), fullPage: true });

await page.click('#staleness button[data-role="on"]');
await page.waitForTimeout(400);
await page.click("#redeemBtn");
await page.waitForSelector(".outcome.done", { timeout: 5000 });
const done = await page.textContent(".outcome.done");
check("R-26 current redemption accepted", /Redemption accepted/.test(done), "accepted against a live valuation");

/* ---- 5. as-at reconstruction ---- */

await page.click('#staleness button[data-role="off"]');
await page.waitForTimeout(400);
const before = await page.textContent(".provenance");
await page.$eval("#asAt", (el) => {
  el.value = "0";
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.waitForTimeout(500);
const after = await page.textContent(".provenance");
check("R-26 as-at reconstructs a past view", before !== after, "provenance changes with the date slider");
const asatCount = await page.$$eval(".asat", (n) => n.length);
check("R-20 as-at motif on figures", asatCount > 3, `${asatCount} as-at markers rendered`);

/* ---- 6. error state and recovery ---- */

await page.click('#indexControl button');
await page.waitForSelector('[role="alert"]', { timeout: 5000 });
const err = await page.textContent('[role="alert"]');
check("R-27 error state reached", /Cannot reach the disclosure index/.test(err), "index failure rendered");
await page.click("#retryBtn");
await page.waitForSelector(".provenance", { timeout: 5000 });
check("R-27 retry recovers", (await page.$(".provenance")) !== null, "view restored after retry");

/* ---- 7. keyboard operability ---- */

await page.focus("#asAt");
await page.keyboard.press("Tab");
const focusInfo = await page.evaluate(() => ({
  tag: document.activeElement.tagName,
  pressed: document.activeElement.getAttribute("aria-pressed"),
  label: document.activeElement.textContent.trim().slice(0, 40)
}));
const beforeKey = await page.textContent("#main");
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
const afterKey = await page.textContent("#main");
check(
  "R-32 keyboard reaches and activates a control",
  focusInfo.tag === "BUTTON" && beforeKey !== afterKey,
  `Tab reached "${focusInfo.label}", Enter changed the view`
);

/* ---- 8. desktop screenshot of the hero view ---- */

await page.click('#roleSwitch button[data-reader="lp-standard"]');
await page.waitForSelector(".focal");
await page.screenshot({ path: join(shots, "lp-view-desktop.png"), fullPage: true });

await page.click('#roleSwitch button[data-reader="auditor"]');
await page.waitForSelector(".focal");
await page.screenshot({ path: join(shots, "auditor-view-desktop.png"), fullPage: true });

/* ---- 9. mobile, checked for overflow ---- */

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await mobile.newPage();
await mp.goto(target, { waitUntil: "load" });
await mp.waitForSelector(".focal", { timeout: 5000 });

const overflow = await mp.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth
}));
check("R-03 no horizontal overflow at 390px", overflow.scrollWidth <= overflow.innerWidth + 1, `${overflow.scrollWidth}px content in ${overflow.innerWidth}px viewport`);

const asatInline = await mp.$eval(".asat", (el) => getComputedStyle(el).whiteSpace);
check("R-03 as-at marker does not clip on mobile", asatInline !== "nowrap", `white-space: ${asatInline}`);

const tableHeaders = await mp.$$eval(".stack thead", (n) => n.map((el) => getComputedStyle(el).position));
check("R-03 data tables collapse on mobile", tableHeaders.every((p) => p === "absolute"), "stacked row labels instead of a scrolling table");

await mp.screenshot({ path: join(shots, "lp-view-mobile.png"), fullPage: true });
await mobile.close();

/* ---- 10. console hygiene ---- */

check("R-35 no uncaught JavaScript errors", jsErrors.length === 0, jsErrors.length ? jsErrors.slice(0, 2).join(" | ") : "clean");
if (netFailures.length) {
  console.log(`NOTE  ${netFailures.length} network failure(s), expected offline: ${netFailures[0].slice(0, 60)}`);
}

await browser.close();

const pad = Math.max(...results.map((r) => r.id.length));
let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.id.padEnd(pad)}  ${r.detail}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed === 0 ? 0 : 1);
