// prep28: declined/known order lends of FOCUS consumers as LATER bodies on generated routes (the findConsumerRoutes recipe with a focus set).
//   run: node --experimental-strip-types tools/integration/prep28NamedRoutes.ts <seedStart> <seedEnd> <out.json>
// Run once on master (before) and once with prep28 rows applied (after, tools/integration/prep28ApplyRows.py); compare per (seed, slots, index).
import { writeFileSync } from "node:fs";
import { scanRoute } from "./orderCrossBodyRouteScan.ts";
import { SPRITE_ORDER_PRODUCTION_BODIES } from "../../src/engine/spriteOrderProductionPlans.ts";

const FOCUS = new Set([315, 244, 142, 304, 143, 173, 123, 328, 126]);
const [a, b, out] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]!];
const rows: Record<string, unknown>[] = [];
for (let seed = a; seed < b; seed += 1) {
  let base; try { base = scanRoute(seed, []); } catch { continue; }
  const [player, opponent] = base.leadMoves as [readonly number[], readonly number[]];
  const cands: (0 | 1 | 2 | 3)[][] = [];
  player.forEach((m, c) => { if (FOCUS.has(m)) for (const x of [0, 1, 2, 3] as const) if (x !== c && player[x]) cands.push([x, c as 0 | 1 | 2 | 3]); });
  if (opponent.some(m => FOCUS.has(m))) for (const x of [0, 1, 2, 3] as const) if (player[x]) cands.push([x, x, x]);
  for (const slots of cands) {
    let r; try { r = scanRoute(seed, slots); } catch { continue; }
    for (const body of r.bodies) {
      if (body.index === 0 || !FOCUS.has(body.moveId)) continue;
      const earlier = r.bodies.filter(x => x.index < body.index);
      const blocker = earlier.find(x => !(`${x.moveId}:${x.side}` in SPRITE_ORDER_PRODUCTION_BODIES));
      rows.push({ seed, slots, index: body.index, consumer: `${body.moveId}:${body.side}`, known: body.known, agrees: body.agrees,
        blocker: blocker ? `${blocker.moveId}:${blocker.side}` : null, earlier: earlier.map(x => `${x.moveId}:${x.side}`) });
    }
  }
}
writeFileSync(out, JSON.stringify(rows) + "\n");
console.log(rows.length, "later focus bodies", rows.filter(r => r.known).length, "known");
