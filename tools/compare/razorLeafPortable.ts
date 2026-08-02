import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import {
  razorLeafAtAge,
  type RazorLeafParticle,
  type RazorLeafCutter,
} from "../../src/animation/razorLeaf.ts";
import {
  createSceneOnMovePresentation,
  sceneOnRazorLeafView,
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
  attr0: number; attr1: number; attr2: number;
  x: number; y: number; x2: number; y2: number;
  callback: number; template: number;
}
interface Frame {
  frame: number;
  playerSprite: { x2: number; y2: number };
  opponentSprite: { x2: number; y2: number };
  sprites: readonly Sprite[];
  tasks: readonly unknown[];
  hardwareOam: readonly (readonly number[])[];
  fadedPalette: readonly number[];
  hardwarePalette: readonly number[];
  bldcnt: number; bldalpha: number;
  se1: { songHeader: number; tracks: readonly { flags: number; panX: number }[] };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePath = process.argv[2]
  ?? "tools/compare/fixtures/razor-leaf-player-weepinbell-opponent-shuckle.json";
const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-razor-leaf-portable-");
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
    gRazorLeafParticleSpriteTemplate: number;
    gRazorLeafCutterSpriteTemplate: number;
  };
  callbacks: Record<string, number>;
  songHeaders: Record<string, number>;
  frames: readonly Frame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "RAZOR_LEAF",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});

function particleShape(sprite: RazorLeafParticle): string {
  const callback = sprite.callback === "step1"
    ? probe.callbacks.AnimRazorLeafParticle_Step1
    : probe.callbacks.AnimRazorLeafParticle_Step2;
  return [
    sprite.x, sprite.y, sprite.x2, sprite.y2,
    305 + sprite.tileOffset, callback, 0, 0,
  ].join(",");
}
function cutterShape(sprite: RazorLeafCutter): string {
  return [
    sprite.x, sprite.y, sprite.x2, sprite.y2, 341,
    probe.callbacks.AnimTranslateLinearSingleSineWave_Step,
    Number(sprite.hFlip), Number(sprite.vFlip),
  ].join(",");
}
function oracleShape(sprite: Sprite): string {
  const hFlip = (sprite.attr1 >> 12) & 1;
  const vFlip = (sprite.attr1 >> 13) & 1;
  return [
    sprite.x, sprite.y, sprite.x2, sprite.y2, sprite.attr2 & 1023,
    sprite.callback,
    sprite.template === probe.templates.gRazorLeafCutterSpriteTemplate ? hFlip : 0,
    sprite.template === probe.templates.gRazorLeafCutterSpriteTemplate ? vFlip : 0,
  ].join(",");
}
function hardwareShape(
  particles: readonly RazorLeafParticle[],
  cutters: readonly RazorLeafCutter[],
): readonly string[] {
  return [
    ...particles.map((sprite) => [
      305 + sprite.tileOffset,
      (sprite.y + sprite.y2 - 8) & 0xff,
      (sprite.x + sprite.x2 - 8) & 0x1ff,
      0,
    ].join(",")),
    ...cutters.map((sprite) => [
      341,
      (sprite.y + sprite.y2 - 8) & 0xff,
      (sprite.x + sprite.x2 - 16) & 0x1ff,
      Number(sprite.hFlip) | (Number(sprite.vFlip) << 1),
    ].join(",")),
  ].sort();
}

const failures: string[] = [];
let matches = 0;
let framebufferMatches = 0;
const framebufferMismatches: string[] = [];
let wroteDiagnostic = false;
for (
  let frame = fixture.denseWindow.startFrame;
  frame <= fixture.denseWindow.endFrame;
  frame += 1
) {
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const expected = razorLeafAtAge(
    age,
    fixture.attackerSide,
    fixture.attacker.geometry.animationCenter,
    fixture.target.geometry.animationCenter,
  );
  const seam = sceneOnRazorLeafView({ ...stage, age });
  const expectedSoftware = [
    ...expected.particles.map(particleShape),
    ...expected.cutters.map(cutterShape),
  ].sort();
  const actualSoftware = oracle.sprites.map(oracleShape).sort();
  const software = JSON.stringify(actualSoftware) === JSON.stringify(expectedSoftware);
  const targetSprite = fixture.target.geometry.side === "player"
    ? oracle.playerSprite : oracle.opponentSprite;
  const shake = targetSprite.x2 === expected.targetX2 && targetSprite.y2 === 0;
  const task = oracle.tasks.length === Number(expected.targetX2 !== 0);
  const registers = expected.alpha
    ? oracle.bldcnt === 16192 && oracle.bldalpha === 2060
    : oracle.bldcnt === 0 && oracle.bldalpha === 0;
  const palette = oracle.hardwarePalette.every(
    (color, index) => color === oracle.fadedPalette[index],
  );
  const prior = razorLeafAtAge(
    age - 1,
    fixture.attackerSide,
    fixture.attacker.geometry.animationCenter,
    fixture.target.geometry.animationCenter,
  );
  const actualHardware = oracle.hardwareOam
    .filter((oam) => {
      if ((((oam[0] ?? 0) >> 8) & 3) === 2) return false;
      const tile = (oam[2] ?? 0) & 1023;
      return (tile >= 305 && tile <= 337) || tile === 341;
    })
    .map((oam) => [
      (oam[2] ?? 0) & 1023,
      (oam[0] ?? 0) & 0xff,
      (oam[1] ?? 0) & 0x1ff,
      ((oam[1] ?? 0) >> 12) & 3,
    ].join(","))
    .sort();
  const hardware = JSON.stringify(actualHardware)
    === JSON.stringify(hardwareShape(prior.particles, prior.cutters));
  const sound = expected.soundRestart === null || (
    oracle.se1.songHeader === probe.songHeaders[expected.soundRestart]
    && oracle.se1.tracks[0]?.flags === 131
    && oracle.se1.tracks[0]?.panX === (
      expected.soundRestart === "SE_M_RAZOR_WIND"
        ? fixture.attackerSide === "player" ? 63 : -63
        : fixture.attackerSide === "player" ? -64 : 63
    )
  );
  const seamShape = JSON.stringify({
    ...seam, age: undefined, attacker: undefined, target: undefined,
  }) === JSON.stringify(expected);
  const partner = age !== 123 || (
    expected.defenderPartnerShakeRequested
    && !expected.defenderPartnerShakeActive
    && oracle.tasks.length === 1
  );
  if (software && shake && task && registers && palette && hardware && sound && seamShape && partner) {
    matches += 1;
  } else {
    failures.push(
      `frame ${frame}/age ${age}: software=${software} shake=${shake} task=${task} registers=${registers} palette=${palette} hardware=${hardware} sound=${sound} seam=${seamShape} partner=${partner}`
      + (software ? "" : `\n actual=${JSON.stringify(actualSoftware)}\n expect=${JSON.stringify(expectedSoftware)}`),
    );
  }
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
  `RAZOR_LEAF source components + typed seam ${matches}/${total}; framebuffer ${framebufferMatches}/${total}`,
);
if (matches !== total || framebufferMatches !== total) {
  console.error(failures.slice(0, 20).join("\n"));
  console.error(`framebuffer mismatch age:pixels: ${framebufferMismatches.join(",")}`);
  console.error(`scratch: ${scratch}`);
  process.exit(1);
}
