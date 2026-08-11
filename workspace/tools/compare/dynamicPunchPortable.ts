import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { dynamicPunchAtAge } from "../../src/animation/dynamicPunch.ts";
import {
  createSceneOnMovePresentation,
  sceneOnDynamicPunchView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { PNG } from "pngjs";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  scenario: string;
  probe: string;
  denseWindow: { startFrame: number; endFrame: number };
  appStage: { presentationAge: number };
  attackerSide: "player" | "opponent";
  attacker: SceneOnPresentationBattler;
  target: SceneOnPresentationBattler;
  fieldProfile: {
    playerHp: number; playerMaxHp: number;
    opponentHp: number; opponentMaxHp: number;
  };
}
interface Sprite {
  template: number; x: number; y: number; attr2: number;
  matrix: readonly number[]; hardwareMatrix: readonly number[];
}
interface Frame {
  frame: number;
  playerSprite: { x2: number; y2: number };
  opponentSprite: { x2: number; y2: number };
  sprites: readonly Sprite[];
  fadedPalette: readonly number[];
  hardwarePalette: readonly number[];
  hardwareOam: readonly (readonly number[])[];
  bldcnt: number; bldalpha: number;
  se1: {
    songHeader: number;
    tracks: readonly { flags: number; panX: number }[];
  };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = process.argv[2]
  ?? "tools/compare/fixtures/dynamic-punch-player-hitmonchan-opponent-shuckle.json";
const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-dynamic-punch-portable-");
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
  templates: {
    gFistFootSpriteTemplate: number;
    gBasicHitSplatSpriteTemplate: number;
    gExplosionSpriteTemplate: number;
  };
  songHeaders: {
    SE_M_VITAL_THROW2: number;
    SE_M_SELF_DESTRUCT: number;
  };
  frames: readonly Frame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "DYNAMIC_PUNCH",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
const failures: string[] = [];
let matches = 0;
let framebufferMatches = 0;
const framebufferMismatches: string[] = [];
let wroteDiagnostic = false;
for (let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame; frame += 1) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const expected = dynamicPunchAtAge(
    age,
    fixture.attackerSide,
    fixture.target.geometry.animationCenter,
    fixture.target.geometry.battlePositionCenter,
  );
  const seam = sceneOnDynamicPunchView({ ...stage, age });
  const fist = oracle.sprites.filter(
    (sprite) => sprite.template === probe.templates.gFistFootSpriteTemplate,
  );
  const hitsplat = oracle.sprites.filter(
    (sprite) => sprite.template === probe.templates.gBasicHitSplatSpriteTemplate,
  );
  const explosions = oracle.sprites.filter(
    (sprite) => sprite.template === probe.templates.gExplosionSpriteTemplate,
  );
  const fistShape = fist.length === Number(expected.fistVisible)
    && fist.every((sprite) =>
      sprite.x === expected.fistPosition.x && sprite.y === expected.fistPosition.y);
  const hitsplatShape = hitsplat.length === Number(expected.hitsplatVisible)
    && hitsplat.every((sprite) =>
      sprite.x === expected.hitsplatPosition.x
      && sprite.y === expected.hitsplatPosition.y
      && JSON.stringify(sprite.matrix) === "[256,0,0,256]"
      && JSON.stringify(sprite.hardwareMatrix) === "[256,0,0,256]");
  const explosionShape = JSON.stringify(explosions.map((sprite) =>
    `${sprite.x},${sprite.y},${(sprite.attr2 & 1023) - 537}`,
  ).sort()) === JSON.stringify(expected.explosions.map((sprite) =>
    `${sprite.x},${sprite.y},${sprite.frame * 16}`,
  ).sort());
  const targetSprite = fixture.target.geometry.side === "player"
    ? oracle.playerSprite : oracle.opponentSprite;
  const shakeShape = targetSprite.x2 === expected.targetX2
    && targetSprite.y2 === expected.targetY2;
  const registers = expected.alpha
    ? oracle.bldcnt === 16192 && oracle.bldalpha === 2060
    : oracle.bldcnt === 0 && oracle.bldalpha === 0;
  const sound = expected.sound === null || (
    oracle.se1.songHeader === probe.songHeaders[expected.sound]
    && oracle.se1.tracks[0]?.flags === 131
    && oracle.se1.tracks[0]?.panX
      === (fixture.target.geometry.side === "player" ? -63 : 63)
  );
  const activeHardware = oracle.hardwareOam.filter((oam) =>
    (((oam[0] ?? 0) & 0x0300) !== 0x0200)
  );
  const prior = dynamicPunchAtAge(
    age - 1,
    fixture.attackerSide,
    fixture.target.geometry.animationCenter,
    fixture.target.geometry.battlePositionCenter,
  );
  const hardwareFists = activeHardware.filter(
    (oam) => ((oam[2] ?? 0) & 1023) === 305,
  ).length;
  const hardwareHitsplats = activeHardware.filter(
    (oam) => ((oam[2] ?? 0) & 1023) === 433,
  ).length;
  const hardwareExplosions = activeHardware.filter((oam) => {
    const tile = (oam[2] ?? 0) & 1023;
    return tile >= 537 && tile <= 585;
  }).length;
  const hardwareOam = hardwareFists === Number(prior.fistVisible)
    && hardwareHitsplats === Number(prior.hitsplatVisible)
    && hardwareExplosions === prior.explosions.length;
  const hardwarePalette = oracle.hardwarePalette.every(
    (color, index) => color === oracle.fadedPalette[index],
  );
  const seamShape = JSON.stringify({
    ...seam,
    attacker: undefined,
    target: undefined,
    age: undefined,
  }) === JSON.stringify(expected);
  if (
    fistShape && hitsplatShape && explosionShape && shakeShape
    && registers && sound && hardwareOam && hardwarePalette && seamShape
  ) matches += 1;
  else failures.push(
    `frame ${frame}/age ${age}: fist=${fistShape} hitsplat=${hitsplatShape} explosions=${explosionShape} shake=${shakeShape} registers=${registers} sound=${sound} hardwareOam=${hardwareOam}(${hardwareFists}/${hardwareHitsplats}/${hardwareExplosions}) hardwarePalette=${hardwarePalette} seam=${seamShape}`,
  );
  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const app = render(engine);
  const rgb = readFileSync(
    join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`),
  );
  let diffPixels = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      app[pixel * 4] !== rgb[pixel * 3]
      || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
    ) diffPixels += 1;
  }
  if (diffPixels === 0) framebufferMatches += 1;
  else {
    framebufferMismatches.push(`${age}:${diffPixels}`);
    if (!wroteDiagnostic) {
      const oracleRgba = Buffer.alloc(240 * 160 * 4);
      const diffRgba = Buffer.alloc(240 * 160 * 4);
      for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
        oracleRgba[pixel * 4] = rgb[pixel * 3]!;
        oracleRgba[pixel * 4 + 1] = rgb[pixel * 3 + 1]!;
        oracleRgba[pixel * 4 + 2] = rgb[pixel * 3 + 2]!;
        oracleRgba[pixel * 4 + 3] = 255;
        if (
          app[pixel * 4] !== rgb[pixel * 3]
          || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
          || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
        ) {
          diffRgba[pixel * 4] = 255;
          diffRgba[pixel * 4 + 3] = 255;
        }
      }
      writeFileSync(join(scratch, `oracle-age-${age}.png`), PNG.sync.write({
        width: 240, height: 160, data: oracleRgba,
      }));
      writeFileSync(join(scratch, `app-age-${age}.png`), PNG.sync.write({
        width: 240, height: 160, data: Buffer.from(app),
      }));
      writeFileSync(join(scratch, `diff-age-${age}.png`), PNG.sync.write({
        width: 240, height: 160, data: diffRgba,
      }));
      wroteDiagnostic = true;
    }
  }
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(
  `DYNAMIC_PUNCH source components + typed seam ${matches}/${total}; framebuffer ${framebufferMatches}/${total}`,
);
if (matches !== total || framebufferMatches !== total) {
  console.error(failures.slice(0, 30).join("\n"));
  console.error(`framebuffer mismatch age:pixels: ${framebufferMismatches.join(",")}`);
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
