// lbw5: replay every candidate of a lbw5-sweep.py output through the engine and print the first mismatch per candidate.
// usage: node tools/probe/lbw5-check.ts SWEEP.json [NAME_FILTER]
import { readFileSync } from "node:fs";
import { firstMismatch, type SweepFixture } from "../../tests/helpers/lbwPlayerReplay.ts";

const [path, filter] = process.argv.slice(2);
if (!path) throw new Error("usage: lbw5-check.ts SWEEP.json [NAME_FILTER]");
const all = JSON.parse(readFileSync(path, "utf8")) as SweepFixture[];
let bad = 0;
for (const fx of all) {
  if (filter && !fx.name?.includes(filter)) continue;
  const m = firstMismatch(fx);
  if (m) bad += 1;
  console.log(`${fx.name}: ${m === null ? "OK" : `frame +${m.index + 1} ${m.what} got ${JSON.stringify(m.got)} want ${JSON.stringify(m.want)}`}`);
}
console.log(`${all.length} candidates, ${bad} mismatching`);
