// Extends issue142-shadow-rows.json to ids added after it (selectors batch 76/217/236/250).
//   (mgba venv) issue142ActivationProbe.py tools/battle-lab/mechanic-<s>.json .integration/i142sel/<s>.json   (one per scenario)
//   node tools/integration/issue142ShadowRowsExtra.mjs     -> tools/integration/fixtures/issue142-selectors-activation-probes.json
//                                                            + tools/integration/fixtures/issue142-shadow-rows-extra.json
// shadowRow = activationFrame - first displayed ROM frame (denseWindow.startFrame / denseSegments[0][0]) + ageOffset(0);
// activationFrame = start of the move-id interval (gAnimScriptActive && sAnimMoveIndex == move) that contains the first frame.
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
const d = "tools/integration/fixtures/";
const ids = { MOONLIGHT: 236, PRESENT: 217, SOLAR_BEAM: 76, WHIRLPOOL: 250 };
const probes = {}, rows = [];
for (const f of readdirSync(d).filter(x => /^selectors-(moonlight|present|solar|whirl)/.test(x)).sort()) {
  const j = JSON.parse(readFileSync(d + f, "utf8"));
  const m = j.sourceFixture ? { ...JSON.parse(readFileSync(j.sourceFixture, "utf8")), ...j } : j;
  const key = m.scenario.replace("tools/battle-lab/mechanic-", "").replace(".json", "");
  const pf = `.integration/i142sel/${key}.json`;
  if (existsSync(pf)) probes[m.scenario] = JSON.parse(readFileSync(pf, "utf8")).intervals;
  const iv = probes[m.scenario].filter(i => i.move === ids[m.move]);
  const start = m.denseSegments ? m.denseSegments[0][0] : (m.denseWindow ?? m.sourceWindow).startFrame;
  const body = iv.find(i => i.start <= start && start < i.end);
  const shadowRow = body.start - start;
  rows.push({ id: ids[m.move], move: m.move, orientation: m.attacker.geometry.side, variant: f.replace(/^selectors-|\.json$/g, ""),
    requestFields: m.requestFields, activationFrame: body.start, windowStart: start, ageOffset: 0, shadowRow,
    cleanupFrame: body.end, tailFirstAge: body.end - start, inWindow: shadowRow >= 0, sources: { fixture: d + f, scenario: m.scenario, body: "normal", activation: "issue142-selectors-activation-probes.json" } });
}
writeFileSync(d + "issue142-selectors-activation-probes.json", JSON.stringify(probes, null, 1) + "\n");
writeFileSync(d + "issue142-shadow-rows-extra.json", JSON.stringify({ schema: "issue142-shadow-rows-extra/v1", generated: "tools/integration/issue142ShadowRowsExtra.mjs", rows }, null, 1) + "\n");
console.log(rows.map(r => `${r.variant}: act ${r.activationFrame} start ${r.windowStart} row ${r.shadowRow}`).join("\n"));
