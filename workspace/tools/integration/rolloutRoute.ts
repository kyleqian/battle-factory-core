// Rollout ordinary-input route (prep11 s4): the move locks, so ONE input drives several counter bodies.
// usage (workspace root): node --experimental-strip-types --no-warnings tools/integration/rolloutRoute.ts <seed> <streak> <slot> [inputs]
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
const [seed, streak, slot, inputs = "1"] = process.argv.slice(2);
const slots = Array.from({ length: Number(inputs) }, () => Number(slot) as 0 | 1 | 2 | 3);
const run = (scene: "on" | "off") => generatedCommandAnimationReplay(Number(seed), scene, slots, Number(streak), true);
const on = run("on"), off = run("off");
const rollouts = on.requests.filter(r => r.moveId === 205);
const bodies = on.animations.filter(a => a.moveId === 205);
// Scene bit 0x80 of hitMarker excluded; nextEventSequence differs by the scene-ON-only presentation event (not logical).
const strip = (b: unknown) => JSON.stringify(b, (k, v) => (k === "nextEventSequence" ? undefined : k === "hitMarker" ? (v as number) & ~0x80 : v));
const out = {
  route: { seed: Number(seed), streak: Number(streak), slot: Number(slot), inputs: Number(inputs) },
  counters: rollouts.map(r => r.rolloutCounter), powers: rollouts.map(r => r.power),
  bodies: bodies.map(b => ({ attacker: b.attacker, rows: b.ages.length, firstAge: b.ages[0], lastAge: b.ages.at(-1),
    everyAgeAdapterActive: b.adapterActive.every(Boolean), contiguous: b.ages.every((a, i) => a === b.ages[0]! + i) })),
  parity: { onBoundaries: on.boundaries.length, offBoundaries: off.boundaries.length, offRolloutRequests: off.requests.filter(r => r.moveId === 205).length,
    boundariesEqualIgnoringSceneBit: on.boundaries.length === off.boundaries.length && on.boundaries.every((b, i) => strip(b) === strip(off.boundaries[i])),
    finalHpEqual: strip(on.state.battle) === strip(off.state.battle) },
  stalled: { on: on.stalled, off: off.stalled },
};
console.log(JSON.stringify(out, null, 1));
