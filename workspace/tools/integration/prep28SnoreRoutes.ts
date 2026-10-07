// prep28: Snore (173) later bodies on generated routes where Sleep Powder (79) is in the history: lend known / declined per body.
//   run: node --experimental-strip-types tools/integration/prep28SnoreRoutes.ts <seedStart> <seedEnd> <out.json>
// Candidate routes: player lead has 79 and opponent lead has 173 -> [x,x,x] (x = the 79 slot); player lead has 173 and opponent lead has 79 -> [x,c,c] for every x.
import { writeFileSync } from "node:fs";
import { scanRoute } from "./orderCrossBodyRouteScan.ts";
import { SPRITE_ORDER_PRODUCTION_BODIES } from "../../src/engine/spriteOrderProductionPlans.ts";

const [a, b, out] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]!];
const rows: Record<string, unknown>[] = [];
for (let seed = a; seed < b; seed += 1) {
  let base; try { base = scanRoute(seed, []); } catch { continue; }
  const [player, opponent] = base.leadMoves as [readonly number[], readonly number[]];
  const cands: (0 | 1 | 2 | 3)[][] = [];
  if (opponent.includes(173)) player.forEach((m, x) => { if (m === 79) cands.push([x as 0 | 1 | 2 | 3, x as 0 | 1 | 2 | 3, x as 0 | 1 | 2 | 3]); });
  if (player.includes(173) && opponent.includes(79)) player.forEach((m, c) => { if (m === 173) for (const x of [0, 1, 2, 3] as const) if (x !== c && player[x]) cands.push([x, c as 0 | 1 | 2 | 3, c as 0 | 1 | 2 | 3]); });
  for (const slots of cands) {
    let r; try { r = scanRoute(seed, slots); } catch { continue; }
    for (const body of r.bodies) {
      if (body.moveId !== 173) continue;
      const earlier = r.bodies.filter(x => x.index < body.index);
      const blocker = earlier.find(x => !(`${x.moveId}:${x.side}` in SPRITE_ORDER_PRODUCTION_BODIES));
      rows.push({ seed, slots, index: body.index, side: body.side, known: body.known, agrees: body.agrees, blocker: blocker ? `${blocker.moveId}:${blocker.side}` : null, earlier: earlier.map(x => `${x.moveId}:${x.side}`) });
    }
  }
}
writeFileSync(out, JSON.stringify(rows) + "\n");
console.log(rows.length, "snore bodies", rows.filter(r => r.known).length, "known");
