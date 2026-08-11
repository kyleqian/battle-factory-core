import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { megaKickAtAge } from "../../src/animation/megaKick.ts";
import {
  createSceneOnMovePresentation,
  sceneOnMegaKickView,
  type SceneOnMegaKickConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Fixture = SceneOnMegaKickConfig & {
  readonly schema: "mega-kick-portable-evidence/v1";
  readonly oracleProfile: "battle-scene-on";
  readonly scenario: string;
  readonly probe: "tools/compare/megaKickProbe.py";
  readonly orientation: "player-back" | "opponent-front";
  readonly attackerSide: "player" | "opponent";
  readonly targetSide: "player" | "opponent";
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: 160 };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: {
    readonly status: "exact";
    readonly componentMatching: 160;
    readonly framebufferMatching: 160;
  };
};

type Matrix = { readonly a: number; readonly b: number; readonly c: number; readonly d: number };
type Sprite = {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly template: number;
  readonly callback: number;
  readonly subpriority: number;
  readonly invisible: boolean;
  readonly animNum: number;
  readonly matrix: Matrix;
  readonly hardwareMatrix: Matrix;
  readonly data: readonly number[];
};
type Task = { readonly func: number; readonly data: readonly number[] };
type Frame = {
  readonly frame: number;
  readonly sha256: string;
  readonly scriptPtr: number;
  readonly animScriptActive: boolean;
  readonly player: Record<string, unknown>;
  readonly opponent: Record<string, unknown>;
  readonly playerSprite: Sprite;
  readonly opponentSprite: Sprite;
  readonly tasks: readonly Task[];
  readonly moveSprites: Readonly<Record<string, readonly Sprite[]>>;
  readonly paletteTags: readonly number[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly tileTags: readonly number[];
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly se1: {
    readonly songHeader: number;
    readonly status: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
  readonly registers: { readonly dispcnt: number; readonly bldcnt: number; readonly bldalpha: number; readonly bldy: number };
};
type Probe = {
  readonly schema: "mega-kick-dense-evidence/v1";
  readonly sourceWindow: Fixture["sourceWindow"];
  readonly scriptBounds: { readonly Move_MEGA_KICK: number; readonly Move_COMET_PUNCH: number };
  readonly templates: Record<string, number>;
  readonly taskFuncs: Record<string, number>;
  readonly songHeaders: Record<string, number>;
  readonly frames: readonly Frame[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length !== 2) {
  throw new Error("usage: megaKickPortable.ts <player fixture> <opponent fixture>");
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const receipts = new Map<string, string>();
const identityMatrix: Matrix = { a: 256, b: 0, c: 0, d: 256 };

function targetPan(side: "player" | "opponent"): number {
  return side === "player" ? -63 : 63;
}

function framebufferDiff(app: Uint8Array, rgb: Buffer): number {
  let diff = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (
      app[pixel * 4] !== rgb[pixel * 3]
      || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]
    ) diff += 1;
  }
  return diff;
}

function runFresh(fixture: Fixture): { readonly probe: Probe; readonly rgbDir: string; readonly scratch: string } {
  const scratch = createScratchDir(`pokebench-mega-kick-${fixture.orientation}-`);
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
  if (run.status !== 0) throw new Error(`fresh ${fixture.orientation} probe failed (${run.status})`);
  return { probe: JSON.parse(readFileSync(output, "utf8")) as Probe, rgbDir, scratch };
}

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const { probe, rgbDir, scratch } = runFresh(fixture);
  const source = probe.frames;
  if (
    fixture.schema !== "mega-kick-portable-evidence/v1"
    || fixture.oracleProfile !== "battle-scene-on"
    || probe.schema !== "mega-kick-dense-evidence/v1"
    || !same(probe.sourceWindow, fixture.sourceWindow)
    || source.length !== fixture.sourceWindow.frameCount
  ) throw new Error(`${fixture.orientation}: incomplete source window`);

  const stage = createSceneOnMovePresentation({
    move: "MEGA_KICK",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const first = source[0]!;
  const receipt = createHash("sha256");
  const rawWindow = createHash("sha256");
  const failures: string[] = [];
  let componentMatches = 0;
  let framebufferMatches = 0;

  for (const [age, oracle] of source.entries()) {
    const failureStart = failures.length;
    const rgb = readFileSync(join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`));
    receipt.update(JSON.stringify(oracle));
    receipt.update(rgb);
    rawWindow.update(rgb);
    if (createHash("sha256").update(rgb).digest("hex") !== oracle.sha256) {
      failures.push(`age ${age}: raw RGB hash`);
    }

    const predicted = megaKickAtAge(
      age, fixture.targetSide, fixture.target.geometry.animationCenter,
    );
    const displayed = megaKickAtAge(
      age - 1, fixture.targetSide, fixture.target.geometry.animationCenter,
    );
    const seam = sceneOnMegaKickView({ ...stage, age });
    const { age: _age, attacker: _attacker, target: _target, ...seamState } = seam;
    if (!same(predicted, seamState)) failures.push(`age ${age}: typed seam`);
    if (predicted.active !== oracle.animScriptActive) failures.push(`age ${age}: cleanup latch`);
    if (age === 0 && !(
      oracle.scriptPtr >= probe.scriptBounds.Move_MEGA_KICK
      && oracle.scriptPtr < probe.scriptBounds.Move_COMET_PUNCH
    )) failures.push(`age ${age}: pointer-isolated entry`);

    const alphaRam = age >= 14 && age < 114;
    const restore = age >= 121 && age <= 157;
    const registers = oracle.registers;
    if (alphaRam
      ? registers.bldcnt !== 0x3f40 || registers.bldalpha !== 0x080c || registers.bldy !== 0
      : restore
        ? registers.bldcnt !== 0x00e8 || registers.bldalpha !== 0
          || registers.bldy !== predicted.background.restoreBldy
        : registers.bldcnt !== 0 || registers.bldalpha !== 0 || registers.bldy !== 0
    ) failures.push(`age ${age}: alpha/restore registers`);

    const targetSprite = fixture.targetSide === "player" ? oracle.playerSprite : oracle.opponentSprite;
    // `monbg` writes its source state at age 3, but Task_UpdateMonBg reaches
    // hardware at age 7; its release at 114 is immediately displayed.
    if (
      targetSprite.invisible !== (age >= 7 && age <= 113)
      || (age >= 71 && age <= 113
        && (targetSprite.x2 !== predicted.targetOffset.x2 || targetSprite.y2 !== predicted.targetOffset.y2))
    ) failures.push(`age ${age}: monbg/ShakeMon2 state`);

    const fist = oracle.moveSprites.gMegaPunchKickSpriteTemplate ?? [];
    const fistHardware = displayed.fist === null
      ? identityMatrix
      : {
          a: displayed.fist.matrix.pa, b: displayed.fist.matrix.pb,
          c: displayed.fist.matrix.pc, d: displayed.fist.matrix.pd,
        };
    if (
      predicted.fist === null
        ? fist.length !== 0
        : fist.length !== 1
          || fist[0]!.animNum !== 1
          || fist[0]!.x !== predicted.fist.x || fist[0]!.y !== predicted.fist.y
          || !same(fist[0]!.matrix, {
            a: predicted.fist.matrix.pa, b: predicted.fist.matrix.pb,
            c: predicted.fist.matrix.pc, d: predicted.fist.matrix.pd,
          })
          || !same(fist[0]!.hardwareMatrix, fistHardware)
    ) failures.push(`age ${age}: variant-1 foot and RAM + 1 matrix`);

    const hitsplats = oracle.moveSprites.gBasicHitSplatSpriteTemplate ?? [];
    // `CreateSpriteAndAnimate` adds the player-side battler subpriority;
    // the mirrored target's sprites therefore own subpriority 38, not 28.
    const targetEffectSubpriority = fixture.targetSide === "player" ? 38 : 28;
    if (hitsplats.length !== (predicted.hitsplatVisible ? 1 : 0)
      || predicted.hitsplatVisible && (
        hitsplats[0]!.x !== fixture.target.geometry.animationCenter.x
        || hitsplats[0]!.y !== fixture.target.geometry.animationCenter.y
        || hitsplats[0]!.subpriority !== targetEffectSubpriority
      )
    ) failures.push(`age ${age}: hitsplat lifecycle`);
    const palettes = oracle.moveSprites.gComplexPaletteBlendSpriteTemplate ?? [];
    const expectedComplex = age >= 71 && age <= 78;
    if (palettes.length !== (expectedComplex ? 1 : 0)
      || expectedComplex && (
        palettes[0]!.x !== fixture.target.geometry.animationCenter.x
        || palettes[0]!.y !== fixture.target.geometry.animationCenter.y
        || palettes[0]!.subpriority !== targetEffectSubpriority
      )
    ) failures.push(`age ${age}: complex palette lifecycle`);
    const shake = oracle.tasks.some((task) =>
      task.func === probe.taskFuncs.AnimTask_ShakeMon2
      || task.func === probe.taskFuncs.AnimTask_ShakeMon2_Step,
    );
    if (shake !== (age >= 71 && age <= 112)) failures.push(`age ${age}: ShakeMon2 task`);

    const impactTag = oracle.paletteTags.includes(10135);
    const handsAndFeetTag = oracle.paletteTags.includes(10143);
    if (impactTag !== (age >= 1 && age <= 158)
      || handsAndFeetTag !== (age >= 4 && age <= 158)
    ) failures.push(`age ${age}: asset load latch`);
    if (
      oracle.fadedPalette.length !== 512 || oracle.unfadedPalette.length !== 512
      || oracle.hardwarePalette.length !== 512 || oracle.paletteTags.length !== 16
      || oracle.tileTags.length !== 128 || oracle.softwareOam.length !== 128
      || oracle.hardwareOam.length !== 128 || oracle.hardwareMatrices.length !== 32
    ) failures.push(`age ${age}: palette/OAM hardware shape`);

    if (predicted.sound !== null) {
      const audibleTargetTrack = oracle.se1.tracks.some((track) =>
        (track.flags & 0x80) !== 0 && track.panX === targetPan(fixture.targetSide),
      );
      if (oracle.se1.songHeader !== probe.songHeaders[predicted.sound] || !audibleTargetTrack) {
        failures.push(`age ${age}: ${predicted.sound} target-pan cue`);
      }
    }
    for (const side of ["player", "opponent"] as const) {
      const now = oracle[side];
      const initial = first[side];
      for (const key of ["species", "hp", "maxHp", "item", "status1", "status2", "status3"]) {
        if (now[key] !== initial[key]) failures.push(`age ${age}: gameplay ${side}.${key}`);
      }
    }

    if (failures.length === failureStart) componentMatches += 1;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const diff = framebufferDiff(render(engine), rgb);
    if (diff === 0) framebufferMatches += 1;
    else failures.push(`age ${age}: framebuffer diff ${diff}`);
  }

  const evidenceSha256 = receipt.digest("hex");
  const rawRgbSha256 = rawWindow.digest("hex");
  if (evidenceSha256 !== fixture.evidenceSha256) {
    failures.push(`evidence receipt ${evidenceSha256} !== ${fixture.evidenceSha256}`);
  }
  if (rawRgbSha256 !== fixture.rawRgbSha256) {
    failures.push(`raw RGB receipt ${rawRgbSha256} !== ${fixture.rawRgbSha256}`);
  }
  if (componentMatches !== fixture.acceptance.componentMatching) {
    failures.push(`component acceptance ${componentMatches}/160`);
  }
  if (framebufferMatches !== fixture.acceptance.framebufferMatching) {
    failures.push(`framebuffer acceptance ${framebufferMatches}/160`);
  }
  if (runNumber === 1) receipts.set(fixture.orientation, evidenceSha256);
  else if (receipts.get(fixture.orientation) !== evidenceSha256) failures.push("fresh-run receipt");
  console.log(
    `${fixture.orientation} run ${runNumber}: ${componentMatches}/160 semantic checks; `
    + `${framebufferMatches}/160 production framebuffer; evidence/raw-RGB receipts ${evidenceSha256}/${rawRgbSha256}`,
  );
  if (failures.length) {
    console.error(failures.slice(0, 40).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exit(1);
  }
}

for (let run = 1; run <= 2; run += 1) for (const path of paths) verify(path, run);
