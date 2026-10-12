// shp116 (docs/shp116-shadow-lead-and-shadow-punch-d4.md): Scene ON / OFF gameplay parity on the generated seed-54 HAUNTER route (the
// opponent HAUNTER's Shadow Punch into WAILMER: an ELEVATED opponent attacker, so both the shadow105 lead rows and the sp103 restore
// lag row present), fold71Parity.ts's shape.
//   node --experimental-strip-types --no-warnings tools/integration/shp116Parity.ts [seed=54] [slot=3]
// Prints one JSON line: turns, boundaries, the ON == OFF verdict (rng, rules context minus hitMarker (which differs only by the 0x80
// scene bit), boundary), per-scene digests, and the Shadow Punch bodies seen in the ON run (attacker, rows).
import { createHash } from "node:crypto";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const seed = Number(process.argv[2] ?? 54), slot = Number(process.argv[3] ?? 3) as 0 | 1 | 2 | 3;
const run = (scene: "on" | "off", n: number) => generatedCommandAnimationReplay(seed, scene, Array.from({ length: n }, () => slot), 0, true, true);
let turns = 1;
for (; turns < 60; turns++) { try { run("off", turns + 1); } catch { break; } }
const on = run("on", turns), off = run("off", turns);
let equal = on.boundaries.length === off.boundaries.length;
for (let i = 0; equal && i < on.boundaries.length; i++) {
  const a = on.boundaries[i]!, b = off.boundaries[i]!;
  const { hitMarker: am, ...ar } = a.rules.rulesContext, { hitMarker: bm, ...br } = b.rules.rulesContext;
  equal = JSON.stringify(a.rng) === JSON.stringify(b.rng) && JSON.stringify(ar) === JSON.stringify(br) && (am ^ bm) === 0x80
    && JSON.stringify(a.boundary) === JSON.stringify(b.boundary);
}
const digest = (r: typeof on) => createHash("sha256").update(JSON.stringify(r.boundaries.map((b) => {
  const { hitMarker: _m, ...rest } = b.rules.rulesContext as Record<string, unknown>;
  return { rng: b.rng, rest, boundary: b.boundary };
}))).digest("hex");
const shadowPunch = on.animations.filter((a) => a.moveId === 325).map((a) => ({ attacker: a.attacker, player: a.player, opponent: a.opponent,
  rows: a.ages.length, live: a.adapterActive.every(Boolean) }));
console.log(JSON.stringify({ seed, slot, turns, boundaries: on.boundaries.length, onOffEqual: equal, digestOn: digest(on), digestOff: digest(off), shadowPunch }));
