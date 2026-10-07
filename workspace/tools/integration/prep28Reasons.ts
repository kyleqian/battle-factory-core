// prep28: first sprite-order invalidation reason of every generated route (named seeds x all slot choices), from the pure-transform prediction
// (predictTrackers of orderCrossBodyRouteScan.ts).  Groups by reason: what blocks the lend once the planned-body gap is closed.
//   run: node --experimental-strip-types tools/integration/prep28Reasons.ts <out.json> <seed>...
import { writeFileSync } from "node:fs";
import { scanRoute, predictTrackers } from "./orderCrossBodyRouteScan.ts";
const [out, ...seedArgs] = process.argv.slice(2) as [string, ...string[]];
const S = [0, 1, 2, 3] as const;
const slotSets: (0 | 1 | 2 | 3)[][] = [...S.map(x => [x, x, x]), ...S.flatMap(x => S.filter(y => y !== x).map(y => [x, y]))];
const rows: { seed: number; slots: number[]; reason: string | null }[] = [];
for (const seed of seedArgs.map(Number)) for (const slots of slotSets) {
  let r; try { r = scanRoute(seed, slots); } catch { continue; }
  const { positions } = predictTrackers(r.on, r.entryKnown);
  let reason: string | null = null;
  for (const t of positions.values()) if (t.invalidReason) { reason = t.invalidReason; break; }
  rows.push({ seed, slots, reason });
}
writeFileSync(out, JSON.stringify(rows) + "\n");
const c: Record<string, number> = {};
for (const r of rows) c[String(r.reason).replace(/\d+/g, "N")] = (c[String(r.reason).replace(/\d+/g, "N")] ?? 0) + 1;
console.log(JSON.stringify(c));
