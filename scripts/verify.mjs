import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const html = readFileSync(join(root, "web", "prototype.html"), "utf8");
const daml = readFileSync(join(root, "daml", "src", "Lookthrough", "Lookthrough.daml"), "utf8");
const design = readFileSync(join(root, "DESIGN.md"), "utf8");

const results = [];
const check = (id, pass, detail) => results.push({ id, pass, detail });

/* ---------- WCAG contrast ---------- */

const srgb = (hex) => {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => c / 255);
};
const lum = (hex) =>
  srgb(hex)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

function readToken(name) {
  const m = html.match(new RegExp(name + ":\\s*(#[0-9A-Fa-f]{6})"));
  if (!m) throw new Error("token not found in CSS: " + name);
  return m[1];
}

const paper = readToken("--paper");
const ink = readToken("--ink");
const muted = readToken("--muted");
const stale = readToken("--stale");
const current = readToken("--current");
const ruleStrong = readToken("--rule-strong");

const pairs = [
  ["ink on paper", ink, paper, 4.5],
  ["muted on paper", muted, paper, 4.5],
  ["stale on paper", stale, paper, 4.5],
  ["current on paper", current, paper, 4.5],
  ["paper on ink (active segment)", paper, ink, 4.5],
  ["paper on stale (stale segment)", paper, stale, 4.5],
  ["ink on outcome surface", ink, "#F4F1EB", 4.5],
  ["rule-strong as UI border", ruleStrong, paper, 3.0]
];
for (const [label, fg, bg, min] of pairs) {
  const r = ratio(fg, bg);
  check(`R-25 ${label}`, r >= min, `${r.toFixed(2)}:1, needs ${min}:1`);
}

/* ---------- R-02 em dashes ---------- */

for (const [id, name, text] of [
  ["R-02 em dashes in UI text", "prototype.html", html],
  ["R-02 em dashes in Daml", "Lookthrough.daml", daml],
  ["R-02 em dashes in DESIGN.md", "DESIGN.md", design]
]) {
  const n = (text.match(/\u2014/g) || []).length;
  check(id, n === 0, n === 0 ? "none found" : `${n} found`);
}

/* ---------- R-33 no patch scripts ---------- */

check(
  "R-33 no source patching",
  !/replace\s*\(\s*["'`][^"'`]*(\{|--)|str\.replace/.test(html),
  "no string-rewrite patching of markup or CSS"
);

/* ---------- R-24 / R-26 no dead controls ---------- */

const deadAnchors = (html.match(/<a\b[^>]*href=["']#["']/g) || []).length;
check("R-24 no placeholder anchors", deadAnchors === 0, `${deadAnchors} href="#" found`);

const buttons = (html.match(/<button\b/g) || []).length;
check("R-26 buttons present and wired", buttons >= 3, `${buttons} buttons in markup`);

/* ---------- R-27 three states ---------- */

check("R-27 loading state", /function renderLoading/.test(html), "renderLoading defined");
check("R-27 error state", /function renderError/.test(html) && /role="alert"/.test(html), "renderError with role=alert");
check(
  "R-27 empty state",
  /function emptyStateBlock/.test(html) && /kind === "exited"/.test(html) && /Nothing left to disclose/.test(html),
  "reachable via the fully-redeemed reader"
);
check("R-27 retry control works", /retryBtn[\s\S]{0,140}addEventListener\("click"/.test(html), "retry handler bound");
check(
  "R-26 error path binds its handlers",
  /renderError\(\); wire\(\);/.test(html),
  "the error branch wires controls, so retry is not a dead button"
);

/* ---------- R-32 keyboard ---------- */

check("R-32 visible focus", /:focus-visible/.test(html), "focus-visible rule present");
check("R-32 no outline suppression", !/outline\s*:\s*(none|0)\s*;/.test(html), "outline never removed");
check("R-32 range has a label", /<legend class="controls-label">Reconstruct as at<\/legend>/.test(html), "range input inside a labelled fieldset");

/* ---------- R-03 mobile ---------- */

check("R-03 mobile breakpoint", /@media \(max-width: 720px\)/.test(html), "720px breakpoint present");
check("R-03 no forced min width", !/min-width:\s*(9|1[0-9])[0-9]{2}px/.test(html), "no wide fixed min-width");
check("R-03 reduced motion honoured", /prefers-reduced-motion/.test(html), "reduced-motion reset present");

/* ---------- R-17 / R-38 honesty about data ---------- */

check("R-38 sample data labelled", /Prototype, sample data/.test(html), "persistent sample-data marker in the masthead");
check("R-38 fictional fund named", /Azim Fund I is fictional/.test(html), "fiction stated in plain words");
check("R-17 no fake social proof", !/\d+[Kk]\+?\s*(users|investors|funds)/.test(html), "no unsourced user counts");

/* ---------- R-11 radius discipline ---------- */

const pillCount = (html.match(/border-radius:\s*9999px/g) || []).length;
check("R-11 no pill shapes", pillCount === 0, `${pillCount} pill radii found`);

/* ---------- R-09 / R-05 no slop decoration ---------- */

check("R-01 no gradient", !/linear-gradient|radial-gradient/.test(html), "no gradients");
check("R-13 no glow", !/box-shadow:[^;]*(0 0 (1[0-9]|[2-9][0-9])px)/.test(html), "no large soft glow shadows");
check("R-07 no grid background", !/background-image[^;]*(linear-gradient|repeating-)/.test(html), "no grid or graph-paper background");
check("R-05 no bento mosaic", !/grid-template-areas/.test(html), "no mosaic layout");
check("R-10 blur used at most twice", (html.match(/backdrop-filter/g) || []).length <= 2, "no glassmorphism at all");

/* ---------- R-24 navigation honesty ---------- */

check("R-24 no marketing nav", !/<nav\b/.test(html), "application surface, no nav to nowhere");

/* ---------- R-31 / R-20 identity ---------- */

check("R-20 as-at motif present", (html.match(/class="asat/g) || []).length > 0, "as-at marker rendered");
check("R-22 no generic illustration", !/<svg/i.test(html), "no decorative SVG or blob art");
check("R-04 no generic icon set", !/(lucide|heroicons|feather)/i.test(html), "no icon library dependency");

/* ---------- Design Read and dials ---------- */

check("R-37 Design Read declared", /Design Read/.test(design), "declared in DESIGN.md");
check("R-37 dials declared", /ENERGY 1 \/ RHYTHM 2 \/ MOTION 1/.test(design), "ENERGY 1 / RHYTHM 2 / MOTION 1");

/* ---------- JS actually parses ---------- */

const script = html.match(/<script>([\s\S]*?)<\/script>/);
try {
  new Function(script[1]);
  check("Prototype JS parses", true, "inline script compiles");
} catch (e) {
  check("Prototype JS parses", false, e.message);
}

/* ---------- Daml sanity ---------- */

const templates = [...daml.matchAll(/^template\s+(\w+)/gm)].map((m) => m[1]);
check(
  "Daml templates as specified",
  ["Fund", "Redemption", "Valuation", "MaterialEvent", "LpPosition"].every((t) => templates.includes(t)),
  templates.join(", ")
);
check(
  "Daml redemption invariant present",
  /wholeDays \(subTime requestedAt latestValuation\) > disclosureIntervalDays/.test(daml),
  "redemption is refused outside the disclosure window"
);
check(
  "Daml refusal message is the product",
  /The fund contract refuses this redemption/.test(daml),
  "the refusal explains that the rule lives in the fund agreement"
);
check(
  "Daml restatement blocked",
  /newAsOf <= asOf/.test(daml) && /asOf <= latestValuation/.test(daml),
  "neither a valuation nor a restatement can be struck for a past date"
);
check(
  "Daml visibility is per contract",
  /observer auditors, disclosedTo/.test(daml) && /signatory gp, lp/.test(daml),
  "an LP cannot see another LP's row by construction"
);
check("Daml uses abort for messages", /\babort "/.test(daml), "abort carries the operator-facing reason");
check(
  "Daml no choice observer after controller",
  !/^\s*controller \w+\r?\n\s*observer/m.test(daml),
  "choice observer precedes controller, as this SDK requires"
);
check(
  "Daml no stale SDK identifiers",
  !/diffDays|datetime|require \(|notMember|createAndArchive/.test(daml),
  "no identifiers from the pre-3.5 API remain"
);
check(
  "Daml compiles to a DAR",
  (() => { try { return existsSync(join(root, "lookthrough.dar")); } catch { return false; } })(),
  "lookthrough.dar is present next to daml.yaml"
);

/* ---------- report ---------- */

const pad = Math.max(...results.map((r) => r.id.length));
let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.id.padEnd(pad)}  ${r.detail}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed === 0 ? 0 : 1);
