// Random2 R1: surrogate route table for the receipt (same routes as tests/animation/liveRandom2R1MoveAdapters.test.ts).
//   node --experimental-strip-types tools/integration/random2R1/routeReceipt.ts > /tmp/routes.json
import { createHash } from "node:crypto";
import { random2Route } from "./routeHarness.ts";
import { generatedCommandAnimationReplay } from "../generatedCommandAnimationReplay.ts";

const SEED_A = 0x1234abcd, SEED_B = 0xfeed0042;
const ROUTES = [
  { move: "MOVE_DOUBLE_KICK", id: 24, seed: 51, streak: 0, slot: 0 as const, turns: 2 },
  { move: "MOVE_ASTONISH", id: 310, seed: 8, streak: 0, slot: 2 as const, turns: 2 },
  { move: "MOVE_THRASH", id: 37, seed: 26, streak: 21, slot: 1 as const, turns: 2 },
  { move: "MOVE_FLAIL", id: 175, seed: 43, streak: 0, slot: 2 as const, turns: 2 },
  { move: "MOVE_WISH", id: 273, seed: 16, streak: 14, slot: 3 as const, turns: 2 },
];
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const out = ROUTES.map((r) => {
  const slots = Array(r.turns).fill(r.slot) as (0 | 1 | 2 | 3)[];
  const a = random2Route(r.seed, "on", slots, r.streak, SEED_A);
  const a2 = random2Route(r.seed, "on", slots, r.streak, SEED_A);
  const b = random2Route(r.seed, "on", slots, r.streak, SEED_B);
  const off = random2Route(r.seed, "off", slots, r.streak, SEED_A);
  const bodies = a.bodies.filter((x) => x.moveId === r.id);
  const bBodies = b.bodies.filter((x) => x.moveId === r.id);
  // Scene ON/OFF: HITMARKER_NO_ANIMATIONS (0x80) and the presentation event counter nextEventSequence differ by design
  // (identical difference without the presentation seam: plainOff below); everything else must be equal.
  const strip = (v: (typeof a.run.boundaries)[number]) => ({ ...v, nextEventSequence: 0,
    rules: { ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } } });
  const plainOn = generatedCommandAnimationReplay(r.seed, "on", slots, r.streak, false, true);
  const plainOff = generatedCommandAnimationReplay(r.seed, "off", slots, r.streak, false, true);
  return {
    route: `random2-r1/${r.move.replace("MOVE_", "").toLowerCase().replace("_", "-")}/seed${r.seed}-streak${r.streak}-slot${r.slot}-${r.turns}turns`,
    ...r, presentationSeeds: { a: SEED_A.toString(16), b: SEED_B.toString(16) },
    stalled: a.run.stalled, boundaries: a.run.boundaries.length, followingPrompt: a.run.state.battleCommandPresentation?.lifecycle.phase,
    bodies: bodies.map((x, i) => ({ key: x.key, attacker: x.attacker, turn: x.turn, power: x.power, ages: x.ages.length,
      firstAge: x.ages[0], lastAge: x.ages.at(-1), adapterActiveEveryAge: x.active.every(Boolean), provenance: x.provenance,
      activationHostFrame: x.activationHostFrame, wordsSeedA: x.words, wordsSeedB: bBodies[i]?.words ?? null,
      wordsDifferAcrossSeeds: JSON.stringify(x.words) !== JSON.stringify(bBodies[i]?.words),
      framesDigestSeedA: digest(x.frameDigests) })),
    // The presentation seam never touches logical state: the seam run equals the plain orchestrator replay.
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
console.log(JSON.stringify(out, null, 1));
