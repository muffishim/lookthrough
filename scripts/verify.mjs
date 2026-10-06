// Static checks complement the executable workflow tests; they do not prove ledger behavior.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(resolve(root, "web/app.css"), "utf8");
const token = name => css.match(new RegExp(name + ":\\s*(#[0-9A-Fa-f]{6})"))[1];
const lum = hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255)
  .map(v => v <= .04045 ? v / 12.92 : ((v + .055)/1.055)**2.4)
  .reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i],0);
const contrast = (fg,bg) => (Math.max(lum(fg),lum(bg))+.05)/(Math.min(lum(fg),lum(bg))+.05);
let count = 0;
for (const [name,fg,bg,min] of [
  ["body text",token("--ink"),token("--paper"),4.5], ["secondary text",token("--muted"),token("--paper"),4.5],
  ["sidebar text",token("--muted"),token("--surface"),4.5], ["blue button",token("--paper"),token("--blue"),4.5],
  ["fresh status",token("--green"),"#F2F8F4",4.5], ["stale status",token("--amber"),"#FBF5EA",4.5],
  ["input boundaries","#918A82",token("--paper"),3]
]) { const ratio=contrast(fg,bg); assert.ok(ratio>=min,name+" contrast"); console.log("PASS " + name + ": " + ratio.toFixed(2) + ":1"); count++; }
for (const path of ["web/app.mjs","server/index.mjs","server/workflow.mjs","server/canton.mjs","server/devnet-bridge.mjs","scripts/devnet-smoke.mjs","tests/canton.test.mjs","tests/workflow.test.mjs"]) {
  const result = spawnSync(process.execPath,["--check",resolve(root,path)],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr); console.log("PASS syntax: "+path); count++;
}
console.log(count + " static checks passed. This is not a full accessibility audit or a Daml runtime test.");
