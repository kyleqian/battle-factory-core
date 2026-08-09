import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { superFangAtAge } from "../../src/animation/superFang.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSuperFangView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: {
    readonly playerHp: number; readonly playerMaxHp: number;
    readonly opponentHp: number; readonly opponentMaxHp: number;
    readonly playerGender?: "male" | "female";
    readonly opponentGender?: "male" | "female";
  };
}

interface Sprite {
  readonly slot: number;
  readonly attr: readonly number[];
  readonly x: number; readonly y: number;
  readonly x2: number; readonly y2: number;
  readonly template: number;
  readonly animCmdIndex: number;
}

interface ProbeFrame {
  readonly frame: number;
  readonly sourceActive: boolean;
  readonly battlerSprites: readonly Sprite[];
  readonly moveSprites: readonly Sprite[];
  readonly fadedPalette: readonly number[];
  readonly tasks: readonly { readonly func: number; readonly data: readonly number[] }[];
  readonly se1: {
    readonly songHeader: number;
    readonly status: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixture = JSON.parse(readFileSync(resolve(process.argv[2]!), "utf8")) as Fixture;
const scratch = createScratchDir("pokebench-super-fang-portable-");
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
  readonly symbols: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<"SE_M_DRAGON_RAGE" | "SE_M_BITE", number>>;
  readonly frames: readonly ProbeFrame[];
};
const frames = new Map(probe.frames.map((frame) => [frame.frame, frame]));
const stage = createSceneOnMovePresentation({
  move: "SUPER_FANG",
  attacker: fixture.attacker,
  target: fixture.target,
  fieldProfile: fixture.fieldProfile,
});
const first = frames.get(fixture.denseWindow.startFrame);
if (!first) throw new Error("Super Fang probe omitted its first source frame");

function blendColor15(color: number, target: number, coefficient: number): number {
  const blend = (shift: number) => {
    const component = (color >>> shift) & 31;
    const targetComponent = (target >>> shift) & 31;
    return component + (((targetComponent - component) * coefficient) >> 4);
  };
  return blend(0) | (blend(5) << 5) | (blend(10) << 10);
}

function paletteMatches(
  actual: readonly number[],
  baseline: readonly number[],
  start: number,
  count: number,
  target: number,
  coefficient: number,
): boolean {
  for (let index = start; index < start + count; index += 1) {
    if (actual[index] !== blendColor15(baseline[index]!, target, coefficient)) return false;
  }
  return true;
}

let components = 0;
let framebuffers = 0;
const componentMismatches: string[] = [];
const framebufferMismatches: string[] = [];
for (let frame = fixture.denseWindow.startFrame; frame <= fixture.denseWindow.endFrame; frame += 1) {
  const oracle = frames.get(frame);
  if (!oracle) throw new Error(`probe omitted frame ${frame}`);
  const age = fixture.appStage.presentationAge + frame - fixture.denseWindow.startFrame;
  const expected = superFangAtAge(
    age, fixture.attacker.geometry.side, fixture.target.geometry.animationCenter,
  );
  const seam = sceneOnSuperFangView({ ...stage, age });
  const attacker = oracle.battlerSprites[fixture.attacker.geometry.side === "player" ? 0 : 1]!;
  const target = oracle.battlerSprites[fixture.target.geometry.side === "player" ? 0 : 1]!;
  const targetBaselineX2 = fixture.target.geometry.side === "opponent" && age < 176 ? 1 : 0;
  const fang = oracle.moveSprites.filter(
    (sprite) => sprite.template === probe.symbols.gSuperFangSpriteTemplate,
  );
  const lunge = oracle.moveSprites.filter(
    (sprite) => sprite.template === probe.symbols.gHorizontalLungeSpriteTemplate,
  );
  const complex = oracle.moveSprites.filter(
    (sprite) => sprite.template === probe.symbols.gComplexPaletteBlendSpriteTemplate,
  );
  const inPlace = oracle.tasks.filter(
    (task) => task.func === probe.symbols.AnimTask_ShakeMonInPlace_Step,
  );
  const blendTask = oracle.tasks.filter(
    (task) => task.func === probe.symbols.AnimTask_BlendMonInAndOut_Step,
  );
  const targetShake = oracle.tasks.filter(
    (task) => task.func === probe.symbols.AnimTask_ShakeMon_Step,
  );
  const attackerPaletteBank = attacker.attr[2]! >>> 12;
  const attackerPalette = paletteMatches(
    oracle.fadedPalette,
    first.fadedPalette,
    256 + attackerPaletteBank * 16 + 1,
    15,
    31 | (6 << 5) | (1 << 10),
    expected.attackerBlendCoefficient,
  );
  const complexTarget = expected.complexPaletteBlend?.target === "red"
    ? 31 | (2 << 5) | (2 << 10)
    : 0x7fff;
  const complexPalette = paletteMatches(
    oracle.fadedPalette,
    first.fadedPalette,
    16,
    48,
    complexTarget,
    expected.complexPaletteBlend?.coefficient ?? 0,
  );
  const expectedInPlace = (age >= 4 && age <= 40) || (age >= 42 && age <= 134);
  const componentMatches =
    attacker.x2 === expected.attackerOffset.x2
    && attacker.y2 === expected.attackerOffset.y2
    && target.x2 === targetBaselineX2 + expected.targetOffset.x2
    && target.y2 === expected.targetOffset.y2
    && fang.length === (expected.fang ? 1 : 0)
    && (!expected.fang || (fang[0]!.x === expected.fang.x
      && fang[0]!.y === expected.fang.y
      && fang[0]!.animCmdIndex === expected.fang.frame))
    && lunge.length === (age >= 160 && age <= 170 ? 1 : 0)
    && complex.length === (expected.complexPaletteBlend ? 1 : 0)
    && inPlace.length === (expectedInPlace ? 1 : 0)
    && blendTask.length === (age >= 42 && age <= 136 ? 1 : 0)
    && targetShake.length === (age >= 176 && age <= 197 ? 1 : 0)
    && attackerPalette
    && complexPalette
    && JSON.stringify(seam) === JSON.stringify({
      attacker: fixture.attacker,
      target: fixture.target,
      ...expected,
    })
    && (age !== 4 || (oracle.se1.songHeader === probe.songHeaders.SE_M_DRAGON_RAGE
      && oracle.se1.tracks[0]?.panX === (fixture.attacker.geometry.side === "player" ? -64 : 63)))
    && (age !== 166 || (oracle.se1.songHeader === probe.songHeaders.SE_M_BITE
      // Target-side BITE preserves the engine's player-side -63 sentinel;
      // attacker-side DRAGON_RAGE above is independently -64.
      && oracle.se1.tracks[0]?.panX === (fixture.target.geometry.side === "player" ? -63 : 63)));
  if (componentMatches) components += 1;
  else if (componentMismatches.length < 16) {
    componentMismatches.push(
      `${frame}/age${age}: attacker=${attacker.x2},${attacker.y2}`
      + ` target=${target.x2},${target.y2} fang=${fang.length}`
      + ` lunge=${lunge.length} complex=${complex.length} tasks=${inPlace.length}/${blendTask.length}/${targetShake.length}`
      + ` palettes=${attackerPalette}/${complexPalette}`,
    );
  }
  const app: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const rgba = render(app);
  const rgb = readFileSync(join(rgbDir, `${String(frame).padStart(5, "0")}.rgb`));
  let diff = 0;
  let minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (rgba[pixel * 4] !== rgb[pixel * 3]
      || rgba[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
      || rgba[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) {
      diff += 1;
      const x = pixel % 240;
      const y = Math.floor(pixel / 240);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  if (diff === 0) framebuffers += 1;
  else if (framebufferMismatches.length < 20) {
    framebufferMismatches.push(`${frame}/age${age}: ${diff}px @${minX},${minY}-${maxX},${maxY}`);
  }
}
const total = fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1;
console.log(`SUPER_FANG source components ${components}/${total}; framebuffer ${framebuffers}/${total}`);
if (componentMismatches.length) console.log(componentMismatches.join("\n"));
if (framebufferMismatches.length) console.log(`first framebuffer mismatches: ${framebufferMismatches.join(", ")}`);
process.exit(components === total && framebuffers === total ? 0 : 1);
