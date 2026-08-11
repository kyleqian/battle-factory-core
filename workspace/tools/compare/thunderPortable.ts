import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  thunderAtAge,
  thunderDisplayedTargetY2AtAge,
} from "../../src/animation/thunder.ts";
import {
  createSceneOnMovePresentation,
  sceneOnThunderView,
  type SceneOnDragonRageFieldProfile,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture {
  readonly schema: "scene-on-portable-evidence/v1";
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: string;
  readonly appStage: { readonly presentationAge: number };
  readonly sourceAnimationWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly targetEffectCenter: Readonly<{ x: number; y: number }>;
  readonly fieldProfile: SceneOnDragonRageFieldProfile;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: {
    readonly status: "exact";
    readonly componentMatching: number;
    readonly framebufferMatching: number;
  };
}

interface ProbeSprite {
  readonly slot: number;
  readonly template: { readonly symbol?: string };
  readonly attr0: number;
  readonly attr1: number;
  readonly attr2: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
}

interface ProbeTask {
  readonly slot: number;
  readonly func: { readonly symbol?: string };
  readonly data: readonly number[];
}

interface ProbeFrame {
  readonly frame: number;
  readonly sha256: string;
  readonly currentMove: number;
  readonly gAnimScriptActive: number;
  readonly battleAnimScriptOffset: number | null;
  readonly gAnimFramesToWait: number;
  readonly attacker: number;
  readonly target: number;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly ProbeTask[];
  readonly sprites: readonly ProbeSprite[];
  readonly playerSprite: ProbeSprite;
  readonly opponentSprite: ProbeSprite;
  readonly hardwareOam: readonly string[];
  readonly fadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly registers: Readonly<{
    bg3hofs: number;
    bldcnt: number;
    bldy: number;
  }>;
  readonly se1: Readonly<{
    songHeader: number;
    tracks: readonly { readonly flags: number; readonly panX: number }[];
  }>;
}

interface Probe {
  readonly schema: "thunder-dense-evidence/v1";
  readonly sourceAnimationWindow: Fixture["sourceAnimationWindow"];
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly frames: readonly ProbeFrame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: thunderPortable.ts <player fixture> <opponent fixture>");
}

const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function runFresh(fixture: Fixture, repeat: number) {
  const scratch = createScratchDir(`pokebench-thunder-${repeat}-`);
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"),
    resolve(root, fixture.probe), resolve(root, fixture.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`fresh ${fixture.orientation} probe failed`);
  return { probe: JSON.parse(readFileSync(output, "utf8")) as Probe, output, rgbDir, scratch };
}

function sourceFrames(fixture: Fixture, probe: Probe): readonly ProbeFrame[] {
  return probe.frames.filter(({ frame }) => frame >= fixture.sourceAnimationWindow.startFrame
    && frame <= fixture.sourceAnimationWindow.endFrame);
}

function rawSequenceHash(fixture: Fixture, probe: Probe, rgbDir: string): string {
  const hash = createHash("sha256");
  for (const frame of sourceFrames(fixture, probe)) {
    const rgb = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    if (sha256(rgb) !== frame.sha256) throw new Error(`RGB digest drift at ${frame.frame}`);
    hash.update(rgb);
  }
  return hash.digest("hex");
}

function oamU16(raw: string, byteOffset: number): number {
  return Number.parseInt(raw.slice(byteOffset * 2 + 2, byteOffset * 2 + 4)
    + raw.slice(byteOffset * 2, byteOffset * 2 + 2), 16);
}

function framebufferDifference(app: Uint8Array, oracle: Buffer): string | null {
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    const a = pixel * 4, o = pixel * 3;
    if (app[a] === oracle[o] && app[a + 1] === oracle[o + 1]
      && app[a + 2] === oracle[o + 2]) continue;
    count += 1;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return count === 0 ? null : `${count}px bbox ${minX},${minY}-${maxX},${maxY}`;
}

function checkComponents(fixture: Fixture, probe: Probe) {
  const stage = createSceneOnMovePresentation({
    move: "THUNDER",
    attacker: fixture.attacker,
    target: fixture.target,
    targetEffectCenter: fixture.targetEffectCenter,
    fieldProfile: fixture.fieldProfile,
  });
  let matches = 0;
  const errors: string[] = [];
  const frames = sourceFrames(fixture, probe);
  for (const [index, oracle] of frames.entries()) {
    const age = fixture.appStage.presentationAge
      + oracle.frame - fixture.sourceAnimationWindow.startFrame;
    const expected = thunderAtAge(age, fixture.target.geometry.side, fixture.targetEffectCenter);
    const seam = sceneOnThunderView({ ...stage, age });
    const target = fixture.target.geometry.side === "player"
      ? oracle.playerSprite : oracle.opponentSprite;
    const lightning = oracle.sprites.filter(({ template }) =>
      template.symbol === "gLightningSpriteTemplate");
    const sprites = lightning.length === expected.sprites.length
      && expected.sprites.every((sprite) => lightning.some((got) =>
        got.slot === sprite.slot && got.x === sprite.x && got.y === sprite.y
        && got.x2 === 0 && got.y2 === 0 && got.attr2 === sprite.attr2
        && got.subpriority === sprite.subpriority));
    const tasks = expected.tasks.every((task) => oracle.tasks.some((got) =>
      got.slot === task.slot && got.func.symbol === task.function
      && same(got.data, task.data)));
    const previous = thunderAtAge(age - 1, fixture.target.geometry.side, fixture.targetEffectCenter);
    const hardware = previous.sprites.every((sprite) => oracle.hardwareOam.some((raw) => {
      const attr0 = oamU16(raw, 0), attr1 = oamU16(raw, 2), attr2 = oamU16(raw, 4);
      return (attr0 & 0xff) === ((sprite.y - 16) & 0xff)
        && (attr1 & 0x1ff) === ((sprite.x - 16) & 0x1ff)
        && attr2 === sprite.attr2;
    }));
    const targetHardwareY = fixture.target.geometry.spriteCorner.y
      + thunderDisplayedTargetY2AtAge(age);
    const targetHardware = oracle.hardwareOam.some((raw) =>
      oamU16(raw, 4) === target.attr2
      && (oamU16(raw, 0) & 0xff) === (targetHardwareY & 0xff)
      && (oamU16(raw, 2) & 0x1ff)
        === (fixture.target.geometry.spriteCorner.x & 0x1ff));
    const shadow = oracle.sprites.find(({ template }) =>
      template.symbol === "gSpriteTemplate_EnemyShadow");
    const shadowHardware = fixture.attacker.geometry.side !== "opponent"
      || age !== 0
      || (shadow !== undefined && oracle.hardwareOam.some((raw) =>
        oamU16(raw, 0) === shadow.attr0
        && oamU16(raw, 2) === shadow.attr1
        && oamU16(raw, 4) === shadow.attr2));
    // BeginNormalPaletteFade's from-black initializer synchronously replaces
    // the preceding white inversion in both software and hardware palette
    // RAM. Ordinary writes retain the one-display palette latch.
    const synchronousFromBlackStart = expected.palette.blend === "fromBlack"
      && expected.palette.blendY === 16;
    const paletteReference = synchronousFromBlackStart
      ? oracle.fadedPalette
      : frames[index - 1]?.fadedPalette;
    const paletteLatch = index === 0 || oracle.hardwarePalette.slice(0, 256)
      .every((color, offset) => color === paletteReference?.[offset]);
    const bg3 = expected.background?.sliding?.hardwareX ?? 0;
    const fade = expected.background?.fade;
    const registers = oracle.registers.bg3hofs === bg3
      && oracle.registers.bldcnt === (
        fade === null || fade === undefined || age === 4 || age === 222 ? 0 : 232
      )
      && oracle.registers.bldy === (fade?.blendY ?? 0);
    const sound = expected.soundRestart === null || (
      oracle.se1.songHeader === probe.songHeaders[expected.soundRestart]
      && oracle.se1.tracks[0]?.flags === 131
      && oracle.se1.tracks[0]?.panX === expected.soundPan
    );
    const script = oracle.currentMove === 87
      && Boolean(oracle.gAnimScriptActive) === expected.active
      && oracle.battleAnimScriptOffset === expected.sourceOffset
      && oracle.gAnimFramesToWait === expected.framesToWait;
    const battlers = target.x2 === 0 && target.y2 === expected.targetOffset.y2;
    const counts = oracle.visualTaskCount === expected.visualTaskCount
      && oracle.soundTaskCount === expected.soundTaskCount;
    const seamShape = same(
      { ...seam, age: undefined, attacker: undefined, target: undefined }, expected,
    );
    if (script && battlers && sprites && tasks && hardware && targetHardware
      && shadowHardware && paletteLatch
      && registers && sound && counts && seamShape) matches += 1;
    else errors.push(`frame ${oracle.frame}/age ${age}: script=${script} battlers=${battlers}`
      + ` sprites=${sprites} tasks=${tasks} hardware=${hardware}/${targetHardware}/${shadowHardware}`
      + ` palette=${paletteLatch}`
      + ` registers=${registers} sound=${sound} counts=${counts} seam=${seamShape}`);
  }
  return { matches, errors };
}

function checkFramebuffers(fixture: Fixture, probe: Probe, rgbDir: string) {
  const stage = createSceneOnMovePresentation({
    move: "THUNDER", attacker: fixture.attacker, target: fixture.target,
    targetEffectCenter: fixture.targetEffectCenter, fieldProfile: fixture.fieldProfile,
  });
  let matches = 0;
  const errors: string[] = [];
  for (const oracle of sourceFrames(fixture, probe)) {
    const age = fixture.appStage.presentationAge
      + oracle.frame - fixture.sourceAnimationWindow.startFrame;
    const engine: EngineState = {
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const difference = framebufferDifference(
      render(engine),
      readFileSync(join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`)),
    );
    if (difference === null) matches += 1;
    else errors.push(`frame ${oracle.frame}/age ${age}: ${difference}`);
  }
  return { matches, errors };
}

let failed = false;
for (const fixturePath of fixturePaths) {
  const fixture = JSON.parse(readFileSync(resolve(root, fixturePath), "utf8")) as Fixture;
  let first: ReturnType<typeof runFresh> | undefined;
  for (let repeat = 1; repeat <= 2; repeat += 1) {
    const fresh = runFresh(fixture, repeat);
    const evidence = sha256(readFileSync(fresh.output));
    const raw = rawSequenceHash(fixture, fresh.probe, fresh.rgbDir);
    if (fresh.probe.schema !== "thunder-dense-evidence/v1"
      || !same(fresh.probe.sourceAnimationWindow, fixture.sourceAnimationWindow)
      || evidence !== fixture.evidenceSha256 || raw !== fixture.rawRgbSha256) {
      failed = true;
      console.error(`${fixture.orientation} fresh ${repeat}: evidence drift ${evidence}/${raw}`);
    }
    if (repeat === 1) first = fresh;
  }
  if (first === undefined) throw new Error("missing fresh probe");
  const components = checkComponents(fixture, first.probe);
  const framebuffers = checkFramebuffers(fixture, first.probe, first.rgbDir);
  const total = fixture.sourceAnimationWindow.frameCount;
  console.log(`${fixture.orientation}: source/components/seam ${components.matches}/${total}; framebuffer ${framebuffers.matches}/${total}`);
  if (components.errors.length) console.error(components.errors.slice(0, 24).join("\n"));
  if (framebuffers.errors.length) console.error(framebuffers.errors.slice(0, 24).join("\n"));
  if (components.matches !== total || framebuffers.matches !== total
    || components.matches !== fixture.acceptance.componentMatching
    || framebuffers.matches !== fixture.acceptance.framebufferMatching) {
    failed = true;
    console.error(`scratch: ${first.scratch}`);
  }
}
if (failed) process.exit(1);
