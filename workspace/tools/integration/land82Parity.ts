// land82: Scene ON vs OFF logical parity on census battles that gained live doll bodies (docs/land82-doll-cells.md).
// The census policy (FIGHT + least-used legal slot) is a plain slot cycle while every slot is legal, so the replay helper's slots
// are 0,1,2,3 repeated; a battle is "the same" when the ON requests contain the expected newly-live doll cells.
//   node --experimental-strip-types --no-warnings tools/integration/land82Parity.ts <seed> <turns> <moveId:side>...
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const [seed, turns, ...want] = process.argv.slice(2);
const streak = (Number(seed) * 11) % 49;
const slots = Array.from({ length: Number(turns) }, (_, i) => (i % 4) as 0 | 1 | 2 | 3);
// Scene OFF presents no move animations (requests is empty by design); the logical parity is the per-boundary rules / RNG / boundary
// records with the scene hit-marker bit (0x80) masked, exactly tests/substituteDollAdapterDecline.test.ts expectParity.
const mask = (v: { rules: any }) => ({ ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } });
const run = (scene: "on" | "off") => {
  const r = generatedCommandAnimationReplay(Number(seed), scene, slots, streak, true, true);
  return { r, bounds: JSON.stringify(r.boundaries.map((b) => [mask(b), b.rng, b.boundary])), nb: r.boundaries.length, keys: r.requests.map((q) => `${q.moveId}:${q.attacker}->${q.target}:t${q.turn}`), cursor: r.state.round.rules.rngValue,
    outcome: JSON.stringify(r.state.round.rules), prompt: r.state.battleCommandPresentation?.lifecycle.phase ?? null,
    facility: JSON.stringify(r.state.facilityState), stalled: r.stalled };
};
const on = run("on"), off = run("off");
const found = want.filter((w) => on.keys.some((k) => k.startsWith(`${w.split(":")[0]}:${w.split(":")[1] === "player" ? 0 : 1}->`)));
if (process.env.DEBUG_KEYS) console.log(JSON.stringify({ on: on.keys, off: off.keys }));
console.log(JSON.stringify({ seed: Number(seed), streak, turns: Number(turns), requests: on.keys.length, wanted: want, found,
  requestsOff: off.keys.length, boundaries: on.nb, boundariesEqual: on.nb === off.nb && on.bounds === off.bounds, cursorEqual: on.cursor === off.cursor, cursor: on.cursor,
  outcomeEqual: on.outcome === off.outcome, facilityEqual: on.facility === off.facility, promptOn: on.prompt, promptOff: off.prompt,
  stalledOn: on.stalled, stalledOff: off.stalled }));
