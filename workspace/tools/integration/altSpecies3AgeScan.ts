/**
 * For selected source rows of a retained run, find the live-view age(s) whose render matches the
 * source frame exactly (or the closest), to tell a timing offset from a content defect.
 * usage: altSpecies3AgeScan.ts <live-fixture.json> <run-dir> <fromAge> <toAge> [searchSpan=6]
 */
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const live = JSON.parse(readFileSync(resolve(root, process.argv[2]!), "utf8"));
const fixture = { ...JSON.parse(readFileSync(resolve(root, live.sourceFixture), "utf8")), ...live } as Fixture;
const dir = resolve(root, process.argv[3]!);
const cmp = JSON.parse(readFileSync(join(dir, "live-comparison.json"), "utf8"));
const [from, to, span] = [Number(process.argv[4]), Number(process.argv[5]), Number(process.argv[6] ?? 6)];
const out: unknown[] = [];
for (const row of cmp.comparisons.filter((r: { age: number }) => r.age >= from && r.age <= to)) {
  const rgb = readFileSync(join(dir, "rgb", `${String(row.frame).padStart(5, "0")}.rgb`));
  const cand: [number, number][] = [];
  for (let a = row.age - span; a <= row.age + span; a++) {
    if (a < 0) continue;
    const o = new Uint8Array(240 * 160 * 4);
    try { renderBattleResolutionLiveView(o, liveView(fixture, a)); } catch { continue; }
    let bad = 0;
    for (let p = 0; p < 240 * 112; p++) if (rgb[p * 3] !== o[p * 4] || rgb[p * 3 + 1] !== o[p * 4 + 1] || rgb[p * 3 + 2] !== o[p * 4 + 2]) bad++;
    cand.push([a, bad]);
  }
  cand.sort((x, y) => x[1] - y[1]);
  out.push({ age: row.age, frame: row.frame, residualAtSameAge: row.residualPixels, best: cand.slice(0, 2) });
}
console.log(JSON.stringify(out));
