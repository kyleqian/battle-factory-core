import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { selfDestructAtAge } from "../../src/animation/selfDestruct.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSelfDestructView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  scenario: string; probe: string;
  denseWindow: { startFrame: number; endFrame: number };
  appStage: { presentationAge: number };
  attackerSide: "player" | "opponent";
  attackerCenter: { x: number; y: number };
  attacker: SceneOnPresentationBattler;
  target: SceneOnPresentationBattler;
  fieldProfile: {
    playerHp: number; playerMaxHp: number;
    opponentHp: number; opponentMaxHp: number;
    playerGender?: "male" | "female";
    opponentGender?: "male" | "female";
  };
}
interface Frame {
  frame: number;
  playerSprite: { x2: number }; opponentSprite: { x2: number };
  sprites: readonly { x: number; y: number; attr2: number }[];
  fadedPalette: readonly number[]; unfadedPalette: readonly number[];
  se1: { songHeader: number; tracks: readonly { flags: number; panX: number }[] };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = process.argv[2]
  ?? "tools/compare/fixtures/self-destruct-player-sudowoodo-opponent-shuckle.json";
const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-self-destruct-portable-");
const output = join(scratch, "probe.json");
const rgbDir = join(scratch, "rgb");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const run = spawnSync("python3", [
  join(root, "tools/run-mgba-probe.py"), output, "--",
  join(vendor, "mgba-venv/bin/python"), resolve(root, fixture.probe),
  resolve(root, fixture.scenario), output, rgbDir,
], { cwd: root, encoding: "utf8" });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

const probe = JSON.parse(readFileSync(output, "utf8")) as {
  templates: { gExplosionSpriteTemplate: number };
  songHeaders: { SE_M_SELF_DESTRUCT: number };
  frames: readonly Frame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const blend = (color: number, coefficient: number) => {
  const r = color & 31;
  const g = (color >> 5) & 31;
  const b = (color >> 10) & 31;
  return (Math.floor((r * (16 - coefficient) + 31 * coefficient) / 16))
    | (Math.floor(g * (16 - coefficient) / 16) << 5)
    | (Math.floor(b * (16 - coefficient) / 16) << 10);
};
const failures: string[] = [];
let matches = 0;
let framebufferMatches = 0;
const framebufferMismatches: number[] = [];
const stage = createSceneOnMovePresentation({
  move: "SELF_DESTRUCT",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
for (let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const expected = selfDestructAtAge(age, fixture.attackerSide, fixture.attackerCenter);
  const seam = sceneOnSelfDestructView({ ...stage, age });
  const oracleSprites = oracle.sprites.map((sprite) =>
    `${sprite.x},${sprite.y},${sprite.attr2 & 1023}`,
  ).sort();
  const expectedSprites = expected.explosions.map((item) =>
    `${item.x},${item.y},${305 + item.frame * 16}`,
  ).sort();
  const spriteShape = JSON.stringify(oracleSprites) === JSON.stringify(expectedSprites);
  const shakeShape = oracle.playerSprite.x2 === expected.battlerX2
    && oracle.opponentSprite.x2 === expected.battlerX2;
  const paletteStart = fixture.attackerSide === "player" ? 256 : 272;
  const paletteShape = Array.from({ length: 16 }, (_, index) => index).every(
    (index) => oracle.fadedPalette[paletteStart + index]
      === blend(oracle.unfadedPalette[paletteStart + index]!, expected.attackerPaletteY),
  );
  const spawn = age >= 0 && age <= 72 && age % 8 === 0;
  const soundShape = !spawn || (
    oracle.se1.songHeader === probe.songHeaders.SE_M_SELF_DESTRUCT
    && oracle.se1.tracks[0]?.flags === 131
    && (oracle.se1.tracks[0]?.panX ?? 0)
      === (fixture.attackerSide === "player" ? -64 : 63)
  );
  const seamShape = seam.battlerX2 === expected.battlerX2
    && seam.attackerPaletteY === expected.attackerPaletteY
    && seam.explosions.length === expected.explosions.length;
  if (spriteShape && shakeShape && paletteShape && soundShape && seamShape) {
    matches += 1;
  }
  else failures.push(
    `frame ${frame}/age ${age}: sprites=${spriteShape} shake=${shakeShape} palette=${paletteShape} sound=${soundShape} seam=${seamShape}`,
  );
  const engine: EngineState = {
    ...createInitialState(), rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const app = render(engine);
  const rgb = readFileSync(
    join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
  );
  let exact = true;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      app[pixel * 4] !== rgb[pixel * 3]
      || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
    ) {
      exact = false;
      break;
    }
  }
  if (exact) framebufferMatches += 1;
  else framebufferMismatches.push(age);
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `SELF_DESTRUCT source components ${matches}/${total}; framebuffer ${framebufferMatches}/${total}`,
);
if (matches !== total || framebufferMatches !== total) {
  console.error(failures.slice(0, 30).join("\n"));
  console.error(`framebuffer mismatch ages: ${framebufferMismatches.join(",")}`);
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
