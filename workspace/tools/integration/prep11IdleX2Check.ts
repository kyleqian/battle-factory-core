// Part A: does production's species front-idle-rest table (src/animation/speciesIdleAnim.ts; the source of liveBattlerAnchors().frontIdleRest.x2, already used for Crabhammer / Magical Leaf / Psybeam)
// reproduce the ROM opponent-battler x2 measured at Leaf Blade age 0 (fixtures/prep11/leaf-idle-x2.json)?  npx vite-node tools/integration/prep11IdleX2Check.ts
import { readFileSync } from "node:fs";
import { speciesFrontIdleRestOffsetOrZero } from "../../src/animation/speciesIdleAnim.ts";
const rom = JSON.parse(readFileSync("tools/integration/fixtures/prep11/leaf-idle-x2.json", "utf8")) as Record<string, number[][]>;
let bad = 0;
for (const [name, series] of Object.entries(rom)) {
  const prod = speciesFrontIdleRestOffsetOrZero(name);
  const ok = prod.x2 === series[0]![2]; if (!ok) bad++;
  console.log(name.padEnd(9), "ROM x2 at ages 0/5:", series[0]![2], series[1]![2], " production frontIdleRest:", JSON.stringify(prod), ok ? "OK" : "MISMATCH");
}
console.log(bad === 0 ? "production table == ROM for all species" : `${bad} mismatches`);
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
console.log("ported (non-null) for:", Object.keys(rom).filter(n => speciesFrontIdleRestOffset(n) !== null).join(",") || "none of them (all fall back to {0,0})");
