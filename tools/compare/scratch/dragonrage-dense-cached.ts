// Full dense framebuffer comparator against an already-cached probe/rgb dir
// (reuse, no new oracle call) - used to bisect DRAGON_RAGE_FRAMEBUFFER_
// SHAKE_AGE_LAG between 1 and 2 quickly.
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { createInitialState, render, type EngineState } from "../../../src/engine/core.ts";

const root = resolve(dirname(new URL(import.meta.url).pathname), "../../..");
const fixture = JSON.parse(
  readFileSync(resolve(root, "tools/compare/fixtures/dragon-rage-player-charmeleon-opponent-onix.json"), "utf8"),
) as { denseWindow: { startFrame: number; endFrame: number }; attacker: any; target: any; fieldProfile: any };

const scratch = process.argv[2]!;

function oracleRgbAt(frame: number): Buffer {
  return readFileSync(join(scratch, "rgb", `${String(frame).padStart(5, "0")}.rgb`));
}

const { createSceneOnMovePresentation } = await import("../../../src/engine/sceneOnPresentation.ts");
const stage = createSceneOnMovePresentation({
  move: "DRAGON_RAGE",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});

function framebufferMatches(age: number): boolean {
  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const rgba = render(engine);
  const oracle = oracleRgbAt(age + fixture.denseWindow.startFrame);
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      oracle[pixel * 3] !== rgba[pixel * 4]
      || oracle[pixel * 3 + 1] !== rgba[pixel * 4 + 1]
      || oracle[pixel * 3 + 2] !== rgba[pixel * 4 + 2]
    ) return false;
  }
  return true;
}

let matches = 0;
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
const mismatchAges: number[] = [];
for (let age = 0; age < total; age += 1) {
  if (framebufferMatches(age)) matches += 1;
  else if (mismatchAges.length < 200) mismatchAges.push(age);
}
console.log(`${matches}/${total} framebuffer frames matched (current committed lag constants)`);
console.log(`first mismatch ages: ${mismatchAges.join(",")}`);
