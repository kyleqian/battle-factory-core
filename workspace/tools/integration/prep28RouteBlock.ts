// prep28: which unplanned predecessor body blocks later order-consumer bodies on generated ordinary routes.
//   run: node --experimental-strip-types tools/integration/prep28RouteBlock.ts [seeds=200] [slots=0,0,0;1,1,1;...] [out.json]
// A "declined consumer" = a later (index>0) body of an order-consuming adapter move whose order lend is unknown; blocker = the first earlier
// body whose (move, side) is not in SPRITE_ORDER_PRODUCTION_BODIES (null when every earlier body is planned: other cause, e.g. party menu / faint).
import { writeFileSync } from "node:fs";
import { scanRoute } from "./orderCrossBodyRouteScan.ts";
import { SPRITE_ORDER_PRODUCTION_BODIES } from "../../src/engine/spriteOrderProductionPlans.ts";

/** Moves whose live adapter reads the lent order (`!spriteOrderInput?.known` guards in src/engine/liveMoveAnimation.ts, prep28 heuristic scan). */
export const CONSUMERS = new Set([19, 53, 58, 63, 80, 88, 91, 104, 123, 126, 129, 142, 143, 157, 161, 169, 174, 189, 193, 194, 195, 202, 209, 210, 215, 216,
  218, 222, 228, 237, 244, 261, 288, 297, 299, 304, 315, 323, 324, 327, 328, 348, 349, 350, 352]);

const seeds = Number(process.argv[2] ?? 200);
const slotSets = (process.argv[3] ?? "0,0,0;1,1,1;2,2,2;3,3,3").split(";").map(s => s.split(",").map(Number) as (0 | 1 | 2 | 3)[]);
const out = process.argv[4];
const planned = (m: number, s: string) => `${m}:${s}` in SPRITE_ORDER_PRODUCTION_BODIES;
const blockers: Record<string, { consumers: Record<string, number>; total: number }> = {};
const declined: { seed: number; slots: number[]; index: number; consumer: string; blocker: string | null; earlier: string[] }[] = [];
let consumerBodies = 0, known = 0, errors = 0;
for (let seed = 0; seed < seeds; seed += 1) for (const slots of slotSets) {
  let r; try { r = scanRoute(seed, slots); } catch { errors += 1; continue; }
  for (const b of r.bodies) {
    if (b.index === 0 || !CONSUMERS.has(b.moveId)) continue;
    consumerBodies += 1;
    if (b.known) { known += 1; continue; }
    const earlier = r.bodies.filter(x => x.index < b.index);
    const first = earlier.find(x => !planned(x.moveId, x.side));
    const blocker = first ? `${first.moveId}:${first.side}` : null;
    declined.push({ seed, slots, index: b.index, consumer: `${b.moveId}:${b.side}`, blocker, earlier: earlier.map(x => `${x.moveId}:${x.side}`) });
    const key = blocker === null ? "other" : blocker.split(":")[0]!;
    const row = (blockers[key] ??= { consumers: {}, total: 0 });
    row.total += 1; row.consumers[String(b.moveId)] = (row.consumers[String(b.moveId)] ?? 0) + 1;
  }
}
const summary = { seeds, slotSets, errors, consumerBodies, known, declined: declined.length,
  blockers: Object.fromEntries(Object.entries(blockers).sort((a, b) => b[1].total - a[1].total)) };
console.log(JSON.stringify(summary));
if (out) writeFileSync(out, JSON.stringify({ ...summary, declined }, null, 1) + "\n");
