// Random2 R4: ordinary-route receipt rows for Rain Dance / Water Pulse (surrogate, random2Route) and Hail (exact).
//   node --experimental-strip-types --no-warnings tools/integration/random2R4/routeReceipt.ts > /tmp/r4-routes.json
import { createHash } from "node:crypto";
import { random2Route } from "../random2R1/routeHarness.ts";
import { generatedCommandAnimationReplay } from "../generatedCommandAnimationReplay.ts";

const SEED_A = 0x1234abcd, SEED_B = 0xfeed0042;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const ROUTES = [
  { move: "MOVE_RAIN_DANCE", id: 240, seed: 2, streak: 21, slot: 1 as const },
  { move: "MOVE_WATER_PULSE", id: 352, seed: 7, streak: 7, slot: 1 as const },
];
const strip = (v: any) => ({ ...v, nextEventSequence: 0,
  rules: { ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } } });
const out: unknown[] = ROUTES.map((r) => {
  const slots = [r.slot];
  const a = random2Route(r.seed, "on", slots, r.streak, SEED_A), a2 = random2Route(r.seed, "on", slots, r.streak, SEED_A);
  const b = random2Route(r.seed, "on", slots, r.streak, SEED_B), off = random2Route(r.seed, "off", slots, r.streak, SEED_A);
  const bodies = a.bodies.filter((x) => x.moveId === r.id), bBodies = b.bodies.filter((x) => x.moveId === r.id);
  const plainOn = generatedCommandAnimationReplay(r.seed, "on", slots, r.streak, false, true);
  const plainOff = generatedCommandAnimationReplay(r.seed, "off", slots, r.streak, false, true);
  return {
    route: `random2-r4/${r.move.replace("MOVE_", "").toLowerCase().replace("_", "-")}/seed${r.seed}-streak${r.streak}-slot${r.slot}-1turn`,
    ...r, presentationSeeds: { a: SEED_A.toString(16), b: SEED_B.toString(16) }, stalled: a.run.stalled,
    boundaries: a.run.boundaries.length, followingPrompt: a.run.state.battleCommandPresentation?.lifecycle.phase,
    bodies: bodies.map((x, i) => ({ key: x.key, attacker: x.attacker, ages: x.ages.length, firstAge: x.ages[0], lastAge: x.ages.at(-1),
      adapterActiveEveryAge: x.active.every(Boolean), provenance: x.provenance, activationHostFrame: x.activationHostFrame,
      wordsDifferAcrossSeeds: JSON.stringify(x.words) !== JSON.stringify(bBodies[i]?.words ?? null), framesDigestSeedA: digest(x.frameDigests) })),
    seamNeutral: JSON.stringify(a.run.boundaries) === JSON.stringify(plainOn.boundaries)
      && JSON.stringify(a.run.state.facilityState) === JSON.stringify(plainOn.state.facilityState),
    sameSeedFramesIdentical: JSON.stringify(a.bodies) === JSON.stringify(a2.bodies),
    seedParity: { boundariesEqual: JSON.stringify(a.run.boundaries) === JSON.stringify(b.run.boundaries),
      facilityEqual: JSON.stringify(a.run.state.facilityState) === JSON.stringify(b.run.state.facilityState),
      rngValueEqual: a.run.state.round.rules.rngValue === b.run.state.round.rules.rngValue },
    sceneOnOffParity: { offBodies: off.bodies.length,
      boundariesEqualExceptSceneBitAndEventCounter: JSON.stringify(a.run.boundaries.map(strip)) === JSON.stringify(off.run.boundaries.map(strip)),
      onOffDifferenceSameWithoutSeam: JSON.stringify(off.run.boundaries) === JSON.stringify(plainOff.boundaries),
      facilityEqual: JSON.stringify(a.run.state.facilityState) === JSON.stringify(off.run.state.facilityState),
      rngValueEqual: a.run.state.round.rules.rngValue === off.run.state.round.rules.rngValue },
  };
});
{
  const on = generatedCommandAnimationReplay(1, "on", [3], 0), off = generatedCommandAnimationReplay(1, "off", [3], 0);
  const bodies = on.animations.filter((x) => x.moveId === 258 && x.attacker === 0);
  out.push({ route: "prep14/hail/seed1-streak0-slot3-1turn", move: "MOVE_HAIL", id: 258, seed: 1, streak: 0, slot: 3, stalled: on.stalled,
    followingPrompt: on.state.battleCommandPresentation?.lifecycle.phase,
    bodies: bodies.map((x) => ({ ages: x.ages.length, adapterActiveEveryAge: x.adapterActive.every(Boolean) })),
    sceneOnOffParity: { boundariesEqual: JSON.stringify(on.boundaries.map(strip)) === JSON.stringify(off.boundaries.map(strip)),
      facilityEqual: JSON.stringify(on.state.facilityState) === JSON.stringify(off.state.facilityState),
      rngValueEqual: on.state.round.rules.rngValue === off.state.round.rules.rngValue } });
}
console.log(JSON.stringify(out, null, 1));
