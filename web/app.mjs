const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = cents => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(cents) / 100);
const units = value => new Intl.NumberFormat("en-US").format(BigInt(value));
const day = value => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const when = value => day(value) + " · " + new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
const names = { gp: "Meridian", reviewer: "Elena", "lp-standard": "Tomas", "lp-enhanced": "Priya", auditor: "Kwan", setup: "Demo setup" };
const pageNames = { overview: "Overview", disclosures: "Disclosures", activity: "Activity & evidence" };
let state, page = "overview", role = "gp";
async function api(path, input) {
  const response = await fetch("/api/" + path, input === undefined ? { cache: "no-store" } : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result;
}
function notice(message, error = false) {
  $("#notice").innerHTML = message ? `<div class="notice ${error ? "error" : ""}" ${error ? 'role="alert"' : 'role="status"'}>${escape(message)}<button type="button" aria-label="Dismiss message">Dismiss</button></div>` : "";
  $("#notice button")?.addEventListener("click", () => notice(""));
}
async function refresh() { const [view, ledger] = await Promise.all([api("view"), api("health")]); state = { ...view, ledger }; render(); }
async function act(form, path, data, message) {
  const buttons = form.querySelectorAll("button"); buttons.forEach(b => b.disabled = true);
  try { await api(path, data); await refresh(); notice(message); }
  catch (error) { notice(error.message, true); }
  finally { buttons.forEach(b => b.disabled = false); }
}
function empty(message) { return `<div class="empty">${escape(message)}</div>`; }
function heading(eyebrow, title, description) { return `<p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="intro">${description}</p>`; }
function guide() { return `<aside class="side-note"><h3>A disclosure has a lifecycle.</h3><ol class="steps"><li><strong>Prepare</strong><small>The manager writes a standard view and an enhanced view.</small></li><li><strong>Review</strong><small>A separate administrator approves publication.</small></li><li><strong>Deliver</strong><small>Each investor receives the view their agreement permits.</small></li><li><strong>Account</strong><small>An auditor can trace the decision and its receipts.</small></li></ol><p>Rights come from recorded fund agreements and side letters. The model does not decide whether a legal agreement is sufficient.</p></aside>`; }
function positions() {
  return `<div class="section"><h2>Information rights</h2><p class="subtext">Recipients are held separately. Investors see their own position.</p><div class="table-wrap"><table><thead><tr><th>Investor</th><th>Right</th><th>Authority</th><th>Available units</th></tr></thead><tbody>${Object.values(state.positions).map(p => `<tr><td>${escape(p.name)}</td><td><span class="tag ${p.rights === "Enhanced" ? "enhanced" : ""}">${p.rights}</span></td><td>${escape(p.policyReference)}</td><td class="number">${units(p.units)}</td></tr>`).join("")}</tbody></table></div></div>`;
}
function draftTable() {
  return `<div class="section"><h2>Disclosure register</h2><p class="subtext">A prepared draft stays private until the administrator approves it.</p>${state.drafts.length ? `<div class="table-wrap"><table><thead><tr><th>Event</th><th>Prepared</th><th>Status</th></tr></thead><tbody>${[...state.drafts].reverse().map(d => `<tr><td>${escape(d.eventId)}<small>${d.recipients.length} recipients${d.reason ? " · " + escape(d.reason) : ""}</small></td><td>${day(d.preparedAt)}</td><td><span class="tag ${d.status}">${d.status}</span></td></tr>`).join("")}</tbody></table></div>` : empty("No disclosures prepared yet. Start with a material event.")}</div>`;
}
function prepareForm() {
  return `<section class="section"><h2>Prepare a material event</h2><p class="subtext">Write what each right allows. Elena, the fund administrator, must approve both views.</p><form id="prepare"><div class="field"><label for="event-id">Event reference</label><input id="event-id" name="eventId" value="EVENT-${String(state.drafts.length + 1).padStart(3,"0")}" maxlength="100" required></div><div class="field"><label for="standard-text">Standard investor view</label><textarea id="standard-text" name="standardText" maxlength="4000" required>${escape(state.draftSuggestions.standardText)}</textarea><small>The standard investor receives this view under their recorded agreement.</small></div><div class="field"><label for="enhanced-text">Enhanced investor view</label><textarea id="enhanced-text" name="enhancedText" maxlength="4000" required>${escape(state.draftSuggestions.enhancedText)}</textarea><small>The enhanced investor receives this view under their recorded side letter.</small></div><div class="actions"><button class="button" type="submit">Send for review</button><small>Preparation does not publish to investors.</small></div></form></section>`;
}
function valuationForm() {
  const latest = state.valuations.at(-1);
  return `<section class="section"><h2>Record a current valuation</h2><p class="subtext">Latest basis: ${day(latest.asOf)} · ${money(latest.navCents)} per unit. Only a later, nonfuture date is accepted.</p><form id="valuation"><div class="fields-row"><div class="field"><label for="valuation-date">Valuation date (UTC)</label><input id="valuation-date" name="asOf" type="date" value="${state.now.slice(0,10)}" max="${state.now.slice(0,10)}" required></div><div class="field"><label for="nav">NAV per unit (USD)</label><input id="nav" name="nav" type="number" min="0.01" max="1000000" step="0.01" value="1.25" required></div></div><div class="field"><label for="basis">Valuation basis</label><input id="basis" name="basis" value="Fictional administrator-approved valuation" maxlength="1000" required></div><div class="actions"><button type="submit" class="button secondary">Record valuation</button><small>This records an operational basis; it does not verify asset prices.</small></div></form></section>`;
}
function reviewQueue() {
  const pending = state.drafts.filter(d => d.status === "pending");
  return `<section class="section"><h2>Waiting for your decision <span class="tag pending">${pending.length}</span></h2><p class="subtext">Review the wording and recorded rights before publishing. The manager cannot approve their own draft.</p>${pending.length ? pending.map(d => `<article class="review-card"><div class="receipt-head"><h3>${escape(d.eventId)}</h3><span class="tag pending">Pending review</span></div><div class="meta">Prepared by Meridian · ${when(d.preparedAt)} · ${d.recipients.length} recipients</div><div class="compare"><div><strong>Standard view</strong><p>${escape(d.standardText)}</p><small>LPA §8.2 · Tomas</small></div><div><strong>Enhanced view</strong><p>${escape(d.enhancedText)}</p><small>Side letter SL-004 · Priya</small></div></div><form class="approve" data-id="${d.id}"><div class="actions"><button class="button" type="submit">Approve & publish</button><small>Creates a separate receipt for each investor.</small></div></form><details><summary>Return this draft with a reason</summary><form class="reject" data-id="${d.id}"><div class="field"><label for="reason-${d.id}">Reason for returning</label><textarea id="reason-${d.id}" name="reason" maxlength="1000" required></textarea></div><button class="button secondary" type="submit">Return draft</button></form></details></article>`).join("") : empty("Your queue is clear. Switch to Meridian to prepare a disclosure.")}</section>`;
}
function receiptList() {
  return `<section class="section"><h2>${role.startsWith("lp-") ? "Your disclosed events" : "Published receipts"}</h2><p class="subtext">Each receipt records a payload, its authority, the approver and publication time.</p>${state.receipts.length ? [...state.receipts].reverse().map(r => `<article class="receipt"><div class="receipt-head"><h3>${escape(r.eventId)}${role.startsWith("lp-") ? "" : " · " + names[r.lp]}</h3><span class="tag ${r.rights === "Enhanced" ? "enhanced" : ""}">${r.rights}</span></div><p>${escape(r.payload)}</p><div class="meta">${escape(r.policyReference)} · Approved by Elena · ${when(r.publishedAt)}</div><details><summary>Receipt details</summary><div class="hash">Receipt: ${r.id}<br>SHA-256 payload: ${r.payloadHash}</div><p class="meta">The browser shows the scoped local mirror. When DevNet is connected, the participant is the authoritative record and the smoke proof captures its update IDs.</p></details></article>`).join("") : empty("No approved disclosures yet. A manager must prepare a draft and the administrator must publish it.")}</section>`;
}
function lpOverview() {
  const p = state.position, age = Math.floor((Date.parse(state.now) - Date.parse(p.valuationAsOf)) / 86400000);
  return heading("INVESTOR WORKSPACE · " + names[role].toUpperCase(), "Your capital. Your permitted view.", "See what your agreement permits, the valuation behind your position, and the rule behind each request.") +
    `<div class="stats"><div class="stat"><strong>${money(p.navValueCents)}</strong><span>Indicative value of available units</span></div><div class="stat"><strong>${units(p.units)}</strong><span>Available units</span></div><div class="stat"><strong>${p.rights}</strong><span>${escape(p.policyReference)}</span></div></div><div class="grid"><div><div class="rule ${p.redemptionEligible ? "current" : ""}"><strong>${p.redemptionEligible ? "Valuation is within the request window." : "A current valuation is needed."}</strong><p>Valuation date: ${day(p.valuationAsOf)} · ${age} days old. The rule permits requests through exactly 30 days. Eligibility uses the current server time.</p></div><section class="section"><h2>Request a redemption</h2><p class="subtext">An accepted request reserves units from your available position. Cash settlement is outside this demonstration.</p><form id="redemption"><div class="field"><label for="units">Units to reserve</label><input id="units" name="units" inputmode="numeric" pattern="[1-9][0-9]*" value="100000" required><small>Available: ${units(p.units)} units · latest NAV: ${money(p.navCents)} per unit.</small></div><div class="actions"><button class="button" type="submit">${p.redemptionEligible ? "Request redemption" : "Check request eligibility"}</button></div></form></section>${receiptList()}</div>${guide()}</div>`;
}
function activity() {
  const requests = state.redemptions;
  return heading("ACCOUNTABILITY", "Every action has a record.", role.startsWith("lp-") ? "Your receipts and requests, with the basis recorded when each action happened." : "Trace preparation, approval, valuation and unit reservations in the local event log.") +
    `<section class="section"><h2>Redemption register</h2><p class="subtext">Reservations reduce available units. No payment, token transfer or settlement has occurred.</p>${requests.length ? `<div class="table-wrap"><table><thead><tr><th>Requested</th>${role.startsWith("lp-") ? "" : "<th>Investor</th>"}<th>Units</th><th>Indicative value</th><th>Status</th></tr></thead><tbody>${[...requests].reverse().map(r => `<tr><td>${when(r.requestedAt)}<small>NAV dated ${day(r.valuationAsOf)}</small></td>${role.startsWith("lp-") ? "" : `<td>${names[r.lp]}</td>`}<td class="number">${units(r.units)}</td><td class="number">${money(r.indicativeValueCents)}</td><td><span class="tag">Reserved</span></td></tr>`).join("")}</tbody></table></div>` : empty("No units have been reserved yet.")}</section><section class="section"><h2>Valuation history</h2><p class="subtext">Earlier records are retained when a new valuation is added.</p><div class="table-wrap"><table><thead><tr><th>As of</th><th>NAV / unit</th><th>Recorded basis</th></tr></thead><tbody>${[...state.valuations].reverse().map(v => `<tr><td>${day(v.asOf)}</td><td class="number">${money(v.navCents)}</td><td>${escape(v.basis)}</td></tr>`).join("")}</tbody></table></div></section>` +
    (state.events ? `<section class="section"><div class="receipt-head"><div><h2>Local event history</h2><p class="subtext">SHA-256 linked records detect accidental edits. The server host can rewrite the chain.</p></div>${["gp","auditor"].includes(role) ? `<a class="button secondary" href="/api/evidence">Export evidence</a>` : ""}</div><ol class="timeline">${[...state.events].reverse().map(e => `<li><span class="sequence">${String(e.sequence).padStart(2,"0")}</span><div><strong>${escape(e.type.replace(/([a-z])([A-Z])/g,"$1 $2"))}</strong><small>${names[e.actor] || escape(e.actor)} · ${when(e.at)}</small><details><summary>Record hash</summary><div class="hash">${e.hash}<br>Previous: ${e.previousHash}</div></details></div></li>`).join("")}</ol><p class="subtext">This log demonstrates operational traceability. It is not Canton consensus or independent notarization.</p></section>` : "");
}
function render() {
  const connected = Boolean(state.ledger?.ledgerConnected);
  const synced = connected && Boolean(state.ledger?.devnetActionsReady);
  $("#ledger-mode").textContent = synced ? "Canton DevNet connected" : connected ? "Canton connected · local actions" : "Local simulation";
  $("#ledger-dot").style.background = connected ? "#226344" : "#8A4B08";
  $("#demo-note").innerHTML = synced
    ? `<strong>Fictional fund · Canton DevNet connected.</strong> Transactions are submitted through the configured participant. No real money is moved by this sample workflow.`
    : connected
      ? `<strong>Fictional fund · Canton responded.</strong> Add all five party IDs to arm action sync. The current action remains local until the mapping is complete.`
    : `<strong>Fictional fund · Canton is not connected.</strong> Actions are saved on this local server. Configure the DevNet adapter to submit Canton transactions.`;
  $("#page-name").textContent = pageNames[page];
  document.querySelectorAll("[data-page]").forEach(button => {
    const active = button.dataset.page === page; button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  let content;
  if (page === "activity") content = activity();
  else if (page === "disclosures") content = heading("PERMISSIONED DISCLOSURES", "The right information, to the right people.", "Prepared by the manager. Published after review. Delivered according to recorded information rights.") + (role === "gp" ? `<div class="grid"><div>${prepareForm()}${draftTable()}</div>${guide()}</div>` : role === "reviewer" ? reviewQueue() + draftTable() : receiptList());
  else if (role.startsWith("lp-")) content = lpOverview();
  else if (role === "gp") content = heading("MANAGER WORKSPACE", "Give every investor the right view.", "Coordinate disclosures and capital requests in one workspace, with recorded rights and a separate review step.") + `<div class="stats"><div class="stat"><strong>${Object.keys(state.positions).length}</strong><span>Investor positions</span></div><div class="stat"><strong>${state.drafts.filter(d => d.status === "pending").length}</strong><span>Awaiting administrator review</span></div><div class="stat"><strong>${state.receipts.length}</strong><span>Published investor receipts</span></div></div><div class="grid"><div>${prepareForm()}${positions()}${valuationForm()}</div>${guide()}</div>`;
  else if (role === "reviewer") content = heading("ADMINISTRATOR WORKSPACE · ELENA", "A second set of eyes, before publication.", "Review each investor view against its recorded authority, then publish or return the draft with a reason.") + `<div class="grid"><div>${reviewQueue()}${draftTable()}</div>${guide()}</div>`;
  else content = heading("AUDITOR WORKSPACE · KWAN", "Follow the decision, all the way through.", "Review every investor receipt, valuation and reservation. Export the local record for a reproducible audit trail.") + `<div class="actions"><button class="button" id="open-activity">Open activity & evidence</button><small>Read access. Publication and valuation actions belong to other roles.</small></div>${positions()}${receiptList()}`;
  $("#view").innerHTML = content; $("#view").setAttribute("aria-busy", "false"); wire();
}
function wire() {
  $("#prepare")?.addEventListener("submit", event => { event.preventDefault(); const form = event.currentTarget; act(form, "disclosures", Object.fromEntries(new FormData(form)), "Draft prepared. Switch to Elena to review and publish it."); });
  $("#valuation")?.addEventListener("submit", event => { event.preventDefault(); const form = event.currentTarget, data = Object.fromEntries(new FormData(form)); act(form, "valuations", { asOf: data.asOf, navCents: Math.round(Number(data.nav) * 100), basis: data.basis }, "Valuation recorded. Investor request eligibility now uses this basis."); });
  $("#redemption")?.addEventListener("submit", event => { event.preventDefault(); const form = event.currentTarget; act(form, "redemptions", Object.fromEntries(new FormData(form)), "Request accepted and units reserved. No settlement has occurred."); });
  document.querySelectorAll("form.approve").forEach(form => form.addEventListener("submit", event => { event.preventDefault(); act(form, "disclosures/" + form.dataset.id + "/decision", { decision: "approve" }, "Disclosure published. Each investor can now read their own receipt."); }));
  document.querySelectorAll("form.reject").forEach(form => form.addEventListener("submit", event => { event.preventDefault(); act(form, "disclosures/" + form.dataset.id + "/decision", { decision: "reject", reason: new FormData(form).get("reason") }, "Draft returned with a recorded reason. Nothing was published to investors."); }));
  $("#open-activity")?.addEventListener("click", () => { page = "activity"; render(); });
}
document.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => { page = button.dataset.page; notice(""); if (state) render(); }));
$("#identity").addEventListener("change", async event => {
  role = event.target.value; notice(""); $("#view").setAttribute("aria-busy", "true");
  $("#view").innerHTML = '<p class="loading">Opening this role’s view…</p>';
  try { await api("session", { role }); await refresh(); }
  catch (error) { notice(error.message, true); $("#view").innerHTML = '<p class="loading">This view could not be loaded. Choose an identity to retry.</p>'; }
});
try { await api("session", { role }); await refresh(); }
catch (error) { notice(error.message, true); $("#view").innerHTML = '<p class="loading">The local server is unavailable. Choose an identity to retry.</p>'; }
