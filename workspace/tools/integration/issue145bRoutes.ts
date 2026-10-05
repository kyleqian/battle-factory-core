// #145b ordinary-input routes: adapter active every age + ON/OFF logical parity at each action-menu boundary.
//   npx vite-node tools/integration/issue145bRoutes.ts [maxSeed]
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
const want = new Map<number, string>(process.env.ONLY_SALT ? [[265, "SMELLING_SALT"]] : [[88, "ROCK_THROW"], [193, "FORESIGHT"], [113, "LIGHT_SCREEN"], [248, "FUTURE_SIGHT"], [265, "SMELLING_SALT"], [193, "FORESIGHT"]]);
// Scene bit 0x80 of hitMarker excluded; nextEventSequence differs by the scene-ON-only presentation event (not logical).
const strip = (b: unknown) => JSON.stringify(b, (k, v) => (k === "nextEventSequence" ? undefined : k === "hitMarker" ? (v as number) & ~0x80 : v));
const maxSeed = Number(process.argv[2] ?? 80), minSeed = Number(process.argv[3] ?? 0);
const found = new Set<number>();
for (let seed = minSeed; seed < maxSeed && found.size < want.size; seed++) {
  for (const slot of [0, 1, 2, 3] as const) {
    let on;
    try { on = generatedCommandAnimationReplay(seed, "on", [slot], Number(process.env.STREAK ?? 0)); } catch { continue; }
    const body = on.animations.find((a) => want.has(a.moveId) && !found.has(a.moveId));
    if (!body) continue;
    const off = generatedCommandAnimationReplay(seed, "off", [slot], Number(process.env.STREAK ?? 0));
    const parity = on.boundaries.length === off.boundaries.length
      && on.boundaries.every((b, i) => strip(b) === strip(off.boundaries[i]));
    found.add(body.moveId);
    console.log(JSON.stringify({ name: want.get(body.moveId), id: body.moveId, attacker: body.attacker, seed, slot, ages: body.ages.length,
      active: body.adapterActive.every(Boolean), contiguous: body.ages.every((a, i) => a === body.ages[0]! + i),
      boundaries: on.boundaries.length, parity }));
  }
}
console.log(JSON.stringify({ missing: [...want.keys()].filter((k) => !found.has(k)) }));
