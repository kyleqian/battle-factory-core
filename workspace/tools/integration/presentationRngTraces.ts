/**
 * Regenerates the committed Scene-ON differential traces for the presentation RNG infrastructure
 * (docs/presentation-rng.md): the ordinary draft -> generated battle route of
 * tests/playableAnimationIntegration.test.ts with live Shadow Punch / Confuse Ray bodies, captured
 * around the battle-start host seed frame and every third age of each live body. The seeded copy
 * carries a non-default SessionTrace.presentationRng to prove the stream is not consumed yet.
 *
 *   node --experimental-strip-types tools/integration/presentationRngTraces.ts
 */
import { writeFileSync } from "node:fs";
import { PRESENTATION_RNG_POLICY_V1 } from "../../src/engine/presentationRngHost.ts";
import { playableAnimationReplay } from "./playableAnimationReplay.ts";

const run = playableAnimationReplay("on", [0, 1, 0]);
const seedFrame = run.boundaries[0]!.frame - run.boundaries[0]!.presentationRng.host!.frame;
const captures = new Set<number>();
for (let frame = seedFrame - 2; frame <= seedFrame + 6; frame += 1) captures.add(frame);
for (const observation of run.observations) {
  for (let age = 0; age < (observation.duration ?? 0); age += 3) captures.add(observation.frame + age);
  if (observation.duration) captures.add(observation.frame + observation.duration - 1);
}
captures.add(run.state.frame);
const base = {
  appRoute: "generated-orchestrator",
  oracleProfile: "battle-scene-on",
  battleScene: "on",
};
const body = {
  segments: run.trace.segments.map(segment => ({ frames: segment.frames, buttons: segment.buttons })),
  captureFrames: [...captures].filter(frame => frame >= 1 && frame <= run.state.frame).sort((a, b) => a - b),
};
writeFileSync("tools/compare/traces/presentation-rng-playable-live-bodies-on.json", JSON.stringify({ ...base, ...body }) + "\n");
writeFileSync("tools/compare/traces/presentation-rng-playable-live-bodies-seeded-on.json", JSON.stringify({
  ...base, presentationRng: { seed: "1234abcd", policy: PRESENTATION_RNG_POLICY_V1 }, ...body,
}) + "\n");
console.log({ seedFrame, frames: run.state.frame, captures: body.captureFrames.length,
  bodies: run.observations.map(o => ({ moveId: o.moveId, frame: o.frame, liveDuration: o.duration })) });
