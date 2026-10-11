// aud110: census exposure of the two defects (docs/aud110-live-audit-25.md s3) from a census commands file (ret88Census.sh shards ->
// <dir>/merged.jsonl): opponent-side Harden 106 commands by species front idle rest (the Harden opponent-attacker idle defect) and the
// opponent-attacker Taunt 269 commands (the anger-mark-in-front defect, target on the player side).
//   node --experimental-strip-types --no-warnings tools/integration/aud110Exposure.ts <merged.jsonl>
import { readFileSync } from "node:fs";
import { speciesFrontIdleRestOffsetOrZero } from "../../src/animation/speciesIdleAnim.ts";
import picCoords from "../../src/data/gen/mon-pic-coords.json" with { type: "json" };

const rows = readFileSync(process.argv[2]!, "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((r) => r.kind === "move");
const count = (xs: string[]) => Object.fromEntries([...new Set(xs)].sort().map((k) => [k, xs.filter((x) => x === k).length]));
const hardenOpp = rows.filter((r) => r.moveId === 106 && r.side === "opponent");
const withRest = hardenOpp.filter((r) => { const o = speciesFrontIdleRestOffsetOrZero(r.attacker.replace(/ /g, "_")); return o.x2 !== 0 || o.y2 !== 0; });
// Swagger: exposed when the attacker's picture height 64 - 2 * yOffset differs from the hard-coded 38 (player) / 32 (opponent).
const swaggerRows = rows.filter((r) => r.moveId === 207);
const swaggerHeight = (r: any) => (picCoords as any)[r.side === "player" ? "back" : "front"][r.attacker.replace(/ /g, "_")];
const swaggerExposed = swaggerRows.filter((r) => { const c = swaggerHeight(r); return c !== undefined && 64 - 2 * c.yOffset !== (r.side === "player" ? 38 : 32); });
const tauntOpp = rows.filter((r) => r.moveId === 269 && r.side === "opponent");
const total = (id: number) => rows.filter((r) => r.moveId === id);
console.log(JSON.stringify({
  commands: rows.length,
  harden: { total: total(106).length, live: total(106).filter((r) => r.status === "live").length, opponentSide: hardenOpp.length,
    opponentAttackers: count(hardenOpp.map((r) => r.attacker)), opponentWithNonzeroIdleRest: withRest.length },
  taunt: { total: total(269).length, live: total(269).filter((r) => r.status === "live").length, opponentAttackerCommands: tauntOpp.length,
    battles: [...new Set(tauntOpp.map((r) => r.battle))].length, pairs: count(tauntOpp.map((r) => `${r.attacker}>${r.target}`)) },
  swagger: { total: total(207).length, live: total(207).filter((r) => r.status === "live").length,
    heightDiffersFromHardCoded: swaggerExposed.length, battles: [...new Set(swaggerExposed.map((r) => r.battle))].length,
    unknownSpecies: swaggerRows.filter((r) => swaggerHeight(r) === undefined).length },
  meanLook: { total: total(212).length, live: total(212).filter((r) => r.status === "live").length },
  substitute: { total: total(164).length, live: total(164).filter((r) => r.status === "live").length },
}, null, 1));
