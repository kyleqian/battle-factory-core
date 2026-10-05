// Appends the anchor4 batch (89, 90, 152, 345, 60, 133) to issue142-shadow-rows-extra.json.
//   (mgba venv) issue142ActivationProbe.py tools/battle-lab/mechanic-<s>.json .integration/i142a4/<s>.json   (one per scenario)
//   node tools/integration/issue142ShadowRowsAnchor4.mjs
// shadowRow = activationFrame - first displayed ROM frame + ageOffset (same definition as issue142ShadowRowsExtra.mjs).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const d = "tools/integration/fixtures/";
const ids = { EARTHQUAKE: 89, FISSURE: 90, CRABHAMMER: 152, MAGICAL_LEAF: 345, PSYBEAM: 60, AMNESIA: 133 };
const path = d + "issue142-shadow-rows-extra.json";
const doc = JSON.parse(readFileSync(path, "utf8"));
doc.rows = doc.rows.filter(r => !r.variant?.startsWith("anchor4-"));
const probes = {};
for (const f of readdirSync(d).filter(x => /^anchor4-.*-(player|opponent)\.json$/.test(x)).sort()) {
  const j = JSON.parse(readFileSync(d + f, "utf8"));
  const m = j.sourceFixture ? { ...JSON.parse(readFileSync(j.sourceFixture, "utf8")), ...j } : j;
  const key = m.scenario.replace("tools/battle-lab/mechanic-", "").replace(".json", "");
  probes[m.scenario] = JSON.parse(readFileSync(`.integration/i142a4/${key}.json`, "utf8")).intervals;
  const w = m.denseWindow ?? m.sourceWindow, ageOffset = m.denseWindow?.ageOffset ?? 0;
  const body = probes[m.scenario].find(i => i.move === ids[m.move] && i.start <= w.startFrame && w.startFrame < i.end);
  const shadowRow = body.start - w.startFrame + ageOffset;
  doc.rows.push({ id: ids[m.move], move: m.move, orientation: m.attacker.geometry.side, variant: "anchor4-" + f.replace(/^anchor4-|\.json$/g, ""),
    activationFrame: body.start, windowStart: w.startFrame, ageOffset, shadowRow, cleanupFrame: body.end, tailFirstAge: body.end - w.startFrame + ageOffset,
    inWindow: shadowRow >= 0, sources: { fixture: d + f, scenario: m.scenario, body: "normal", activation: "issue142-anchor4-activation-probes.json" } });
}
doc.generated += " (+ anchor4 rows from issue142ShadowRowsAnchor4.mjs)";
writeFileSync(d + "issue142-anchor4-activation-probes.json", JSON.stringify(probes, null, 1) + "\n");
writeFileSync(path, JSON.stringify(doc, null, 1) + "\n");
console.log(doc.rows.filter(r => r.variant.startsWith("anchor4-")).map(r => `${r.variant}: act ${r.activationFrame} start ${r.windowStart} row ${r.shadowRow}`).join("\n"));
