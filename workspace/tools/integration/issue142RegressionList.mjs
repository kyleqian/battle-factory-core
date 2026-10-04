// Lists accepted live-adapter fixtures (tools/integration/fixtures) by whether the OPPONENT species is shadow-elevated.
import { readFileSync, readdirSync, existsSync } from "node:fs";
const dir = "tools/integration/fixtures";
const elev = new Set(JSON.parse(readFileSync("src/assets/gen/battle-enemy-shadow.json", "utf8")).elevatedSpecies);
const out = { elevated: [], nonElevated: [], unresolved: [] };
for (const f of readdirSync(dir).filter(x => x.endsWith(".json")).sort()) {
  if (/^altspecies[23]?-/.test(f) && !/^altspecies3-/.test(f) && !/^altspecies-/.test(f)) continue;
  let j; try { j = JSON.parse(readFileSync(`${dir}/${f}`, "utf8")); } catch { continue; }
  if (!/live-adapter/.test(j.schema ?? "") || /receipt/.test(j.schema)) continue;
  if (/^altspecies2-/.test(f)) continue;
  let m = j;
  if (j.sourceFixture && existsSync(j.sourceFixture)) m = { ...JSON.parse(readFileSync(j.sourceFixture, "utf8")), ...j };
  const opp = m.attacker?.geometry?.side === "opponent" ? m.attacker?.species : m.target?.species;
  const rec = `${dir}/${f}`;
  if (!opp) out.unresolved.push(rec);
  else if (elev.has(`SPECIES_${opp}`)) out.elevated.push({ f: rec, opp });
  else out.nonElevated.push({ f: rec, opp });
}
console.log(JSON.stringify({ elevatedCount: out.elevated.length, nonElevatedCount: out.nonElevated.length, unresolved: out.unresolved }));
if (process.argv[2]) { import("node:fs").then(fs => fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1))); }
