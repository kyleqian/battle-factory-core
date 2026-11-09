// Shock Wave staged / accepted output digest (S10A reducer-timing change byte-identity proof): for both accepted orientations, every reducer
// state (shockWaveAtAge over ages 0..cleanup + 2, the accepted corpus-built inputs of tools/compare/verifyShockWaveReducer.ts) and every
// staged-presentation framebuffer (render of the accepted config) is hashed. Run before and after a reducer change; equal output = identical.
//   npx vite-node tools/integration/shockWaveStagedDigest.ts [OUT.json]
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { shockWaveAtAge, shockWaveFirstInactiveAge, shockWaveTimingFor } from "../../src/animation/shockWave.ts";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { shockWaveConfigFor, shockWaveInputsFor, type ShockWaveOrientation } from "../compare/verifyShockWaveReducer.ts";

const hash = (v: string | Uint8Array) => createHash("sha256").update(v).digest("hex");
const out: Record<string, unknown> = {};
for (const orientation of ["player-back", "opponent-front"] as ShockWaveOrientation[]) {
  const input = shockWaveInputsFor(orientation), config = shockWaveConfigFor(orientation), cleanup = shockWaveFirstInactiveAge(input);
  const states: string[] = [], frames: string[] = [];
  for (let age = 0; age <= cleanup + 2; age += 1) {
    states.push(hash(JSON.stringify(shockWaveAtAge(age, input))));
    const fb = render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config as never), age } } as never);
    frames.push(hash(fb as Uint8Array));
  }
  out[orientation] = { timing: shockWaveTimingFor(input), timingSideOnly: shockWaveTimingFor({ attackerSide: input.attackerSide }), cleanup,
    statesDigest: hash(states.join()), framesDigest: hash(frames.join()), ages: states.length };
}
const text = JSON.stringify(out, null, 1);
if (process.argv[2]) writeFileSync(process.argv[2], `${text}\n`);
console.log(text);
