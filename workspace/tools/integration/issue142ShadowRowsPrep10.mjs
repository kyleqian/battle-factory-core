// prep10 (docs/next-adapters-prep10.md): issue142-shadow-rows-extra.json rows for the prep10 live adapters, from the live
// dense fixtures (fixtures/prep10-live). Every window starts at the activation frame (row 0) except Spark (activation + 9: row -9).
// usage (workspace root): node tools/integration/issue142ShadowRowsPrep10.mjs   (idempotent: replaces its own rows)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const FX = "tools/integration/fixtures", extraPath = `${FX}/issue142-shadow-rows-extra.json`;
const extra = JSON.parse(readFileSync(extraPath, "utf8"));
const ids = { MAGNITUDE: 222, REVERSAL: 179, PAIN_SPLIT: 220, ROCK_BLAST: 350, RAZOR_WIND: 13, SPARK: 209 };
const rows = [], seen = new Set();
for (const f of readdirSync(`${FX}/prep10-live`).sort()) {
  const d = JSON.parse(readFileSync(`${FX}/prep10-live/${f}`, "utf8"));
  const id = ids[d.move]; if (id === undefined) continue;
  const orientation = d.attacker.geometry.side, key = `${id}/${orientation}`;
  if (seen.has(key) || d.requestFields?.turn > 0) continue;
  // HP-band / alternate-species fixtures duplicate an orientation: the first fixture per (move, orientation) is the row.
  seen.add(key);
  const sparkOffset = d.move === "SPARK" ? 9 : 0;
  const activationFrame = d.denseWindow.startFrame - sparkOffset;
  rows.push({
    id, move: d.move, orientation, variant: `prep10-${d.move.toLowerCase().replace("_", "-")}-${orientation}`,
    activationFrame, windowStart: d.denseWindow.startFrame, ageOffset: 0, shadowRow: -sparkOffset,
    cleanupFrame: null, tailFirstAge: null, inWindow: sparkOffset === 0,
    sources: { fixture: `${FX}/prep10-live/${f}`, body: "normal", activation: "tools/integration/fixtures/prep10-*.json draft (census-activation; docs/next-adapters-prep10.md)" },
    ...(d.move === "MAGNITUDE" || d.move === "REVERSAL" ? { requestFields: { power: d.requestFields.power } } : {}),
  });
}
extra.rows = extra.rows.filter(r => !String(r.variant).startsWith("prep10-")).concat(rows);
writeFileSync(extraPath, JSON.stringify(extra, null, 1) + "\n");
console.log(rows.map(r => `${r.id}/${r.orientation}`).join(" "));
