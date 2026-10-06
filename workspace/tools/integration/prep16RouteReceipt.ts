// prep16 ordinary-input route receipt: first-body Overheat / Silver Wind routes (prep16 s3 seeds) + a non-first Silver Wind body that must fall back.
//   node --experimental-strip-types --no-warnings tools/integration/prep16RouteReceipt.ts > /tmp/p16-routes.json
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const strip = (v: any) => ({ ...v, nextEventSequence: 0,
  rules: { ...v.rules, rulesContext: { ...v.rules.rulesContext, hitMarker: v.rules.rulesContext.hitMarker & ~0x80 } } });
const ROUTES = [
  { move: "MOVE_OVERHEAT", id: 315, species: "MAGCARGO", seed: 4, streak: 14, slot: 0 as const, firstBody: true },
  { move: "MOVE_OVERHEAT", id: 315, species: "SOLROCK", seed: 69, streak: 14, slot: 3 as const, firstBody: true },
  { move: "MOVE_SILVER_WIND", id: 318, species: "VOLBEAT", seed: 3, streak: 7, slot: 0 as const, firstBody: true },
  { move: "MOVE_SILVER_WIND", id: 318, species: "VENOMOTH", seed: 8, streak: 7, slot: 0 as const, firstBody: true },
  // The foe acts first: the player's Silver Wind is a later body (BG registers/scroll after the foe body are not tracked) -> scene-off fallback.
  { move: "MOVE_SILVER_WIND", id: 318, species: "BUTTERFREE", seed: 9, streak: 0, slot: 0 as const, firstBody: false },
];
const out = ROUTES.map((r) => {
  const on = generatedCommandAnimationReplay(r.seed, "on", [r.slot], r.streak), off = generatedCommandAnimationReplay(r.seed, "off", [r.slot], r.streak);
  const bodies = on.animations.filter((x) => x.moveId === r.id && x.attacker === 0);
  return { route: `prep16/${r.move.slice(5).toLowerCase().replace("_", "-")}/seed${r.seed}-streak${r.streak}-slot${r.slot}-1turn`, ...r, stalled: on.stalled,
    followingPrompt: on.state.battleCommandPresentation?.lifecycle.phase, boundaries: on.boundaries.length,
    bodies: bodies.map((x) => ({ ages: x.ages.length, firstAge: x.ages[0], lastAge: x.ages.at(-1), adapterActiveEveryAge: x.adapterActive.every(Boolean), adapterActiveAnyAge: x.adapterActive.some(Boolean) })),
    allBodiesAfterFirstOrdinary: on.animations.map((x) => `${x.moveId}/${x.attacker}:${x.ages.length}:${x.adapterActive.some(Boolean)}`),
    sceneOnOffParity: { boundariesEqualExceptSceneBitAndEventCounter: JSON.stringify(on.boundaries.map(strip)) === JSON.stringify(off.boundaries.map(strip)),
      facilityEqual: JSON.stringify(on.state.facilityState) === JSON.stringify(off.state.facilityState),
      rngValueEqual: on.state.round.rules.rngValue === off.state.round.rules.rngValue, stalledEqual: on.stalled === off.stalled } };
});
console.log(JSON.stringify(out, null, 1));
