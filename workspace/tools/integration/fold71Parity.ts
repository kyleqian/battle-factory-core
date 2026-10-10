// fold71: Scene ON/OFF parity on the live-share census seed-927 route (Ninjask Speed Boost) plus a cross-tree digest.
//   node --experimental-strip-types --no-warnings tools/integration/fold71Parity.ts [seed=927] [streak=9]
// Census battle index 277 of range 650..999 -> streak (277 * 11) % 49 = 9. Prints one JSON line: per-scene boundary digests (rules context
// minus animArg1, which only a STATS_CHANGE operand reads), the ON == OFF verdict (hitMarker differs only by the 0x80 scene bit),
// and the STATS_CHANGE arguments seen in the ON run.
import { createHash } from "node:crypto";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const seed = Number(process.argv[2] ?? 927), streak = Number(process.argv[3] ?? 9);
// Cycle the four slots for as many turns as the battle lasts (the replay throws once it loses battle ownership: take the longest that completes).
const slotsOf = (n: number) => Array.from({ length: n }, (_, i) => (i % 4) as 0 | 1 | 2 | 3);
const run = (scene: "on" | "off", n: number) => generatedCommandAnimationReplay(seed, scene, slotsOf(n), streak, true, true);
let turns = 1;
for (; turns < 60; turns++) { try { run("off", turns + 1); } catch { break; } }
const on = run("on", turns), off = run("off", turns);
let equal = on.boundaries.length === off.boundaries.length;
const digest = (r: typeof on) => createHash("sha256").update(JSON.stringify(r.boundaries.map((b) => {
  const { hitMarker, animArg1, ...rest } = b.rules.rulesContext as Record<string, unknown>;
  return { rng: b.rng, rest, boundary: b.boundary };
}))).digest("hex");
for (let i = 0; equal && i < on.boundaries.length; i++) {
  const a = on.boundaries[i]!, b = off.boundaries[i]!;
  const { hitMarker: am, ...ar } = a.rules.rulesContext, { hitMarker: bm, ...br } = b.rules.rulesContext;
  equal = JSON.stringify(a.rng) === JSON.stringify(b.rng) && JSON.stringify(ar) === JSON.stringify(br) && (am ^ bm) === 0x80
    && JSON.stringify(a.boundary) === JSON.stringify(b.boundary);
}
const statsChange = (r: typeof on) => r.semanticEvents.map((e) => e.event as { payload?: { animationId?: string; arguments?: string[] } })
  .filter((e) => e.payload?.animationId === "STATS_CHANGE").map((e) => e.payload!.arguments!.join(","));
console.log(JSON.stringify({ seed, streak, turns, boundaries: on.boundaries.length, onOffEqual: equal, digestOn: digest(on), digestOff: digest(off),
  statsChangeOn: statsChange(on), statsChangeOff: statsChange(off) }));
