// prep28: every body's order-lend (known / declined) on the generated routes of the named seeds, over all [x], [x,y] and [x,x,x] slot choices.
//   run: node --experimental-strip-types tools/integration/prep28SeedRoutes.ts <out.json> <seed>...
import { writeFileSync } from "node:fs";
import { scanRoute } from "./orderCrossBodyRouteScan.ts";
import { SPRITE_ORDER_PRODUCTION_BODIES } from "../../src/engine/spriteOrderProductionPlans.ts";

const [out, ...seedArgs] = process.argv.slice(2) as [string, ...string[]];
const S = [0, 1, 2, 3] as const;
const slotSets: (0 | 1 | 2 | 3)[][] = [...S.map(x => [x, x, x]), ...S.flatMap(x => S.filter(y => y !== x).map(y => [x, y]))];
const rows: Record<string, unknown>[] = [];
for (const seed of seedArgs.map(Number)) for (const slots of slotSets) {
  let r; try { r = scanRoute(seed, slots); } catch { continue; }
  r.bodies.forEach((b, i) => {
    const earlier = r.bodies.filter(x => x.index < b.index);
    const blk = earlier.find(x => !(`${x.moveId}:${x.side}` in SPRITE_ORDER_PRODUCTION_BODIES));
    rows.push({ seed, slots, index: b.index, body: `${b.moveId}:${b.side}`, known: b.known, agrees: b.agrees, blocker: blk ? `${blk.moveId}:${blk.side}` : null });
  });
}
writeFileSync(out, JSON.stringify(rows) + "\n");
console.log(rows.length, "bodies", rows.filter(r => r.known).length, "known");
