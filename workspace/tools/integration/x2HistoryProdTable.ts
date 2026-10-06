// x2-history #148: production speciesFrontIdleRestOffsetOrZero vs the ROM per-species table (fixtures/x2-history/species-rest-x2.json); writes fixtures/x2-history/species-prod-vs-rom.json
// usage: npx vite-node tools/integration/x2HistoryProdTable.ts
import { readFileSync, writeFileSync } from "node:fs";
import { speciesFrontIdleRestOffset, speciesFrontIdleRestOffsetOrZero } from "../../src/animation/speciesIdleAnim.ts";
const rom = JSON.parse(readFileSync("tools/integration/fixtures/x2-history/species-rest-x2.json", "utf8")) as { all: Record<string, { opponentFront: { x2: number; y2: number } }> };
const mismatches: Record<string, unknown> = {}; let unported = 0, exact = 0;
for (const [name, v] of Object.entries(rom.all)) {
  const prod = speciesFrontIdleRestOffsetOrZero(name);
  if (speciesFrontIdleRestOffset(name) === null) unported++;
  if (prod.x2 === v.opponentFront.x2 && prod.y2 === v.opponentFront.y2) exact++; else mismatches[name] = { prod, rom: v.opponentFront };
}
const out = { species: Object.keys(rom.all).length, exact, unportedFallbackToZero: unported, mismatches };
writeFileSync("tools/integration/fixtures/x2-history/species-prod-vs-rom.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
