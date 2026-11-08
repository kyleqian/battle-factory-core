/**
 * Dense Scene-ON Focus Punch evidence verifier.
 *
 * This is development-only: it drives the source-built ROM through the
 * validated probe and compares the pure reducer, typed seam, source hardware,
 * raw RGB, change map, and live core framebuffer.  Production imports none of
 * these fixtures, probes, ROM files, or RGB buffers.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { focusPunchAtAge } from "../../src/animation/focusPunch.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFocusPunchView,
  type SceneOnFocusPunchConfig,
  type SceneOnMovePresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Side = "player" | "opponent";
type Matrix = { readonly a: number; readonly b: number; readonly c: number; readonly d: number };
type Sprite = {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly template: number;
  readonly callback: number;
  readonly invisible: boolean;
  readonly matrix: Matrix;
  readonly hardwareMatrix: Matrix;
};
type Task = { readonly func: number; readonly data: readonly number[] };
type Frame = {
  readonly frame: number;
  readonly sha256: string;
  readonly animScriptActive: boolean;
  readonly player: Record<string, unknown>;
  readonly opponent: Record<string, unknown>;
  readonly playerSprite: Sprite;
  readonly opponentSprite: Sprite;
  readonly tasks: readonly Task[];
  readonly moveSprites: Readonly<Record<string, readonly Sprite[]>>;
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly tileTags: readonly number[];
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly se1: {
    readonly songHeader: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
  readonly registers: { readonly bldcnt: number; readonly bldalpha: number; readonly bldy: number };
  readonly backgroundPositions: Readonly<Record<string, number>>;
};
type Probe = {
  readonly schema: string;
  readonly moveId: number;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly templates: Readonly<Record<string, number>>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly frames: readonly Frame[];
};
type Fixture = SceneOnFocusPunchConfig & {
  readonly schema: "focus-punch-portable-evidence/v1";
  readonly oracleProfile: "battle-scene-on";
  readonly orientation: string;
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly role: "bilateral" | "geometry-control";
  readonly expected?: Readonly<{
    readonly evidenceSha256: string;
    readonly rawRgbSha256: string;
    readonly changeMapSha256: string;
    readonly semanticRows: number;
    readonly framebufferRows: number;
  }>;
};
type Fresh = {
  readonly probe: Probe;
  readonly bytes: Buffer;
  readonly rgbDir: string;
  readonly scratch: string;
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const paths = process.argv.slice(2);
if (paths.length < 1) {
  throw new Error("usage: focusPunchPortable.ts <player fixture> [opponent fixture] [geometry control]");
}
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const identity: Matrix = { a: 256, b: 0, c: 0, d: 256 };

function hash(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function runFresh(fixture: Fixture): Fresh {
  const scratch = createScratchDir(`pokebench-focus-punch-${fixture.orientation.replace(/[^a-z0-9]+/gi, "-")}-`);
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
  if (run.status !== 0) throw new Error(`${fixture.orientation}: probe failed (${run.status})`);
  const bytes = readFileSync(output);
  return { probe: JSON.parse(bytes.toString("utf8")) as Probe, bytes, rgbDir, scratch };
}

function rawRgbHash(probe: Probe, rgbDir: string): string {
  const receipt = createHash("sha256");
  for (const frame of probe.frames) {
    receipt.update(readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`)));
  }
  return receipt.digest("hex");
}

function changeMapHash(rgbDir: string): string {
  const run = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], {
    cwd: root,
    encoding: "utf8",
  });
  if (run.status !== 0) throw new Error("Focus Punch change-map generation failed");
  // The output directory is scratch-specific.  The body is the complete raw
  // RGB change map, so normalize only that nondeterministic header pathname.
  const lines = run.stdout.trimEnd().split("\n");
  lines[0] = "# Focus Punch dense raw RGB888";
  return hash(`${lines.join("\n")}\n`);
}

function sourceFadeTaskActive(age: number, targetSide: Side): boolean {
  return (age >= 10 && age <= 47)
    || (age >= 111 && age <= (targetSide === "opponent" ? 148 : 147));
}

function sourceBldcnt(age: number, targetSide: Side): number {
  if (age >= 52 && age <= 111) return 0x3f40;
  return (age >= 11 && age <= 47)
    || (age >= 112 && age <= (targetSide === "opponent" ? 148 : 147))
    ? 0x00e8
    : 0;
}

function sourceBldalpha(age: number, targetSide: Side): number {
  return age >= 52 && age <= (targetSide === "opponent" ? 149 : 148)
    ? 0x080c
    : 0;
}

function targetPan(side: Side): number {
  return side === "player" ? -63 : 63;
}

function visibleTask(
  frame: Frame,
  pointer: number | undefined,
): boolean {
  return pointer !== undefined && frame.tasks.some((task) => task.func === pointer);
}

function verifyFrame(
  fixture: Fixture,
  probe: Probe,
  stage: SceneOnMovePresentationState<SceneOnFocusPunchConfig>,
  oracle: Frame,
  age: number,
  rgbDir: string,
): { readonly failures: readonly string[]; readonly framebufferDifferentPixels: number } {
  const failures: string[] = [];
  const targetSide = fixture.target.geometry.side;
  const targetSprite = targetSide === "player" ? oracle.playerSprite : oracle.opponentSprite;
  const predicted = focusPunchAtAge(age, targetSide, fixture.target.geometry.animationCenter);
  const seam = sceneOnFocusPunchView({ ...stage, age });
  const { age: _age, attacker: _attacker, target: _target, ...seamState } = seam;
  if (!same(predicted, seamState)) failures.push("typed seam");
  if (oracle.animScriptActive !== predicted.active) failures.push("active/cleanup");
  if (oracle.registers.bldcnt !== sourceBldcnt(age, targetSide)
    || oracle.registers.bldalpha !== sourceBldalpha(age, targetSide)
    || oracle.registers.bldy !== predicted.background.bldy) failures.push("blend registers");
  const impactTag = 10135;
  const handsAndFeetTag = 10143;
  for (const [tag, loaded, name] of [
    [impactTag, predicted.impactLoaded, "IMPACT"],
    [handsAndFeetTag, predicted.handsAndFeetLoaded, "HANDS_AND_FEET"],
  ] as const) {
    if (oracle.paletteTags.includes(tag) !== loaded || oracle.tileTags.includes(tag) !== loaded) {
      failures.push(`${name} resource`);
    }
  }
  if (targetSprite.invisible !== predicted.targetOnMonBg
    || targetSprite.x2 !== predicted.targetOffset.x2
    || targetSprite.y2 !== predicted.targetOffset.y2) failures.push("target monbg/ShakeMon OAM");
  if (predicted.targetOnMonBg) {
    const bg = targetSide === "opponent" ? "gBattle_BG1" : "gBattle_BG2";
    if (oracle.backgroundPositions[`${bg}_X`] !== -fixture.target.geometry.spriteCorner.x - predicted.targetOffset.x2
      || oracle.backgroundPositions[`${bg}_Y`] !== -fixture.target.geometry.spriteCorner.y) {
      failures.push("target monbg registers");
    }
  }
  const fist = oracle.moveSprites.gFocusPunchFistSpriteTemplate ?? [];
  if ((predicted.fist === null) !== (fist.length === 0)) failures.push("FocusPunchFist lifetime");
  if (predicted.fist && fist.length === 1) {
    const current = fist[0]!;
    const prior = focusPunchAtAge(age - 1, targetSide, fixture.target.geometry.animationCenter).fist;
    if (current.x !== predicted.fist.x || current.y !== predicted.fist.y || current.x2 !== predicted.fist.x2
      || !same(current.matrix, {
        a: predicted.fist.matrix.pa, b: predicted.fist.matrix.pb,
        c: predicted.fist.matrix.pc, d: predicted.fist.matrix.pd,
      })
      || !same(current.hardwareMatrix, prior ? {
        a: prior.matrix.pa, b: prior.matrix.pb, c: prior.matrix.pc, d: prior.matrix.pd,
      } : identity)) failures.push("FocusPunchFist OAM/matrix latch");
  }
  const hits = oracle.moveSprites.gBasicHitSplatSpriteTemplate ?? [];
  if (hits.length !== predicted.hitsplats.length) failures.push("basic hitsplat lifetime");
  if (hits.length === 1 && predicted.hitsplats.length === 1) {
    const current = hits[0]!;
    const expected = predicted.hitsplats[0]!;
    if (current.x !== expected.x || current.y !== expected.y
      || !same(current.matrix, identity) || !same(current.hardwareMatrix, identity)) {
      failures.push("basic hitsplat OAM/matrix");
    }
  }
  const shakeTask = visibleTask(oracle, probe.taskFuncs.AnimTask_ShakeMon)
    || visibleTask(oracle, probe.taskFuncs.AnimTask_ShakeMon_Step);
  if (shakeTask !== (age >= 64 && age <= 109)) failures.push("ShakeMon task lifecycle");
  if (visibleTask(oracle, probe.taskFuncs.Task_FadeToBg) !== sourceFadeTaskActive(age, targetSide)) {
    failures.push("Task_FadeToBg lifecycle");
  }
  const updateMonBg = visibleTask(oracle, probe.taskFuncs.Task_UpdateMonBg);
  if (updateMonBg !== (age >= 49 && age <= (targetSide === "opponent" ? 152 : 151))) {
    failures.push("Task_UpdateMonBg lifecycle");
  }
  const clearMonBg = visibleTask(oracle, probe.taskFuncs.Task_ClearMonBg);
  if (clearMonBg !== (age >= (targetSide === "opponent" ? 150 : 149)
    && age <= (targetSide === "opponent" ? 152 : 151))) failures.push("Task_ClearMonBg lifecycle");
  if (predicted.sound) {
    const audibleTargetTrack = oracle.se1.tracks.some((track) =>
      (track.flags & 0x80) !== 0 && track.panX === targetPan(targetSide));
    if (oracle.se1.songHeader !== probe.songHeaders[predicted.sound] || !audibleTargetTrack) {
      failures.push(`${predicted.sound} audio/pan`);
    }
  }
  if (oracle.fadedPalette.length !== 512 || oracle.unfadedPalette.length !== 512
    || oracle.hardwarePalette.length !== 512 || oracle.softwareOam.length !== 128
    || oracle.hardwareOam.length !== 128 || oracle.hardwareMatrices.length !== 32) {
    failures.push("palette/OAM/matrix hardware inventory");
  }
  const rgb = readFileSync(join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`));
  if (hash(rgb) !== oracle.sha256) failures.push("raw RGB hash");
  const engine: EngineState = {
    ...createInitialState(),
    rngMode: "frontierBattle",
    sceneOnPresentation: { ...stage, age },
  };
  const app = render(engine);
  let framebufferDifferentPixels = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== rgb[pixel * 3]
      || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) framebufferDifferentPixels += 1;
  }
  return { failures, framebufferDifferentPixels };
}

const runReceipts = new Map<string, Readonly<{ evidence: string; raw: string; changeMap: string }>>();

function verify(fixturePath: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const fresh = runFresh(fixture);
  const { probe, bytes, rgbDir, scratch } = fresh;
  const evidence = hash(bytes);
  const raw = rawRgbHash(probe, rgbDir);
  const changeMap = changeMapHash(rgbDir);
  const failures: string[] = [];
  if (fixture.schema !== "focus-punch-portable-evidence/v1"
    || fixture.oracleProfile !== "battle-scene-on"
    || probe.schema !== "focus-punch-dense-evidence/v1"
    || probe.moveId !== 264
    || !same(probe.sourceWindow, fixture.denseWindow)
    || probe.frames.length !== fixture.denseWindow.frameCount) failures.push("fixture/source window");
  const stage = createSceneOnMovePresentation({
    move: "FOCUS_PUNCH",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  let semanticRows = 0;
  let framebufferRows = 0;
  let largestDiff = 0;
  let firstResidual: string | null = null;
  const residualCounts = new Map<string, number>();
  for (const [age, frame] of probe.frames.entries()) {
    const result = verifyFrame(fixture, probe, stage, frame, age, rgbDir);
    if (result.failures.length === 0) semanticRows += 1;
    else {
      if (firstResidual === null) firstResidual = `age ${age}: ${result.failures.join(", ")}`;
      for (const residual of result.failures) {
        residualCounts.set(residual, (residualCounts.get(residual) ?? 0) + 1);
      }
    }
    if (result.framebufferDifferentPixels === 0) framebufferRows += 1;
    largestDiff = Math.max(largestDiff, result.framebufferDifferentPixels);
  }
  if (fixture.expected) {
    if (fixture.expected.evidenceSha256 !== evidence || fixture.expected.rawRgbSha256 !== raw
      || fixture.expected.changeMapSha256 !== changeMap) failures.push("retained receipt/change map");
    if (fixture.expected.semanticRows !== semanticRows || fixture.expected.framebufferRows !== framebufferRows) {
      failures.push("retained reducer/framebuffer count");
    }
  }
  const prior = runReceipts.get(fixture.orientation);
  if (prior && !same(prior, { evidence, raw, changeMap })) failures.push("fresh-run receipt");
  else runReceipts.set(fixture.orientation, { evidence, raw, changeMap });
  console.log(
    `${fixture.orientation} run ${runNumber}: semantic ${semanticRows}/${probe.frames.length}; `
    + `core framebuffer ${framebufferRows}/${probe.frames.length}; `
    + `evidence ${evidence}; RGB ${raw}; changemap ${changeMap}; `
    + `max diff ${largestDiff}${firstResidual ? `; ${firstResidual}` : ""}`
    + `${residualCounts.size ? `; residual counts ${JSON.stringify(Object.fromEntries(residualCounts))}` : ""}`,
  );
  if (semanticRows !== probe.frames.length || failures.length) {
    console.error(`${fixture.orientation}: ${failures.join(", ") || "semantic source mismatch"}; scratch: ${scratch}`);
    process.exitCode = 1;
  }
}

for (let run = 1; run <= 2; run += 1) {
  for (const fixturePath of paths) verify(fixturePath, run);
}
if (process.exitCode) throw new Error("Focus Punch portable evidence verification failed");
