// prep11 (docs/next-adapters-prep11.md): issue142-shadow-rows-extra.json rows for the prep11 live adapters, from the live dense
// fixtures (fixtures/prep11-live). Every window starts at the activation frame (row 0) for all nine moves.
// usage (workspace root): node tools/integration/issue142ShadowRowsPrep11.mjs   (idempotent: replaces its own rows)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const FX = "tools/integration/fixtures", extraPath = `${FX}/issue142-shadow-rows-extra.json`;
const extra = JSON.parse(readFileSync(extraPath, "utf8"));
const ids = { LEECH_SEED: 73, TRI_ATTACK: 161, PETAL_DANCE: 80, DESTINY_BOND: 194, AIR_CUTTER: 314, FORESIGHT: 193, SKY_UPPERCUT: 327, RECYCLE: 278, SPIDER_WEB: 169 };
const rows = [], seen = new Set();
for (const f of readdirSync(`${FX}/prep11-live`).sort()) {
  const d = JSON.parse(readFileSync(`${FX}/prep11-live/${f}`, "utf8"));
  const id = ids[d.move]; if (id === undefined) continue;
  const orientation = d.attacker.geometry.side, key = `${id}/${orientation}`;
  // Alternate-species fixtures duplicate an orientation: the first (base) fixture per (move, orientation) is the row.
  if (seen.has(key) || /-alt-/.test(f)) continue;
  seen.add(key);
  rows.push({
    id, move: d.move, orientation, variant: `prep11-${d.move.toLowerCase().replaceAll("_", "-")}-${orientation}`,
    activationFrame: d.denseWindow.startFrame, windowStart: d.denseWindow.startFrame, ageOffset: 0, shadowRow: 0,
    cleanupFrame: null, tailFirstAge: null, inWindow: true,
    sources: { fixture: `${FX}/prep11-live/${f}`, body: "normal", activation: "tools/integration/fixtures/prep11-*.json draft (activation == accepted window start; docs/next-adapters-prep11.md s3)" },
  });
}
extra.rows = extra.rows.filter(r => !String(r.variant).startsWith("prep11-")).concat(rows);
extra.generated += " (+ prep11 rows from issue142ShadowRowsPrep11.mjs)";
writeFileSync(extraPath, JSON.stringify(extra, null, 1) + "\n");
console.log(rows.map(r => `${r.id}/${r.orientation}`).join(" "));
