import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnHiJumpKickView,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  HI_JUMP_KICK_ALPHA_FIRST_AGE,
  HI_JUMP_KICK_CLEAR_AGE,
  hiJumpKickAtAge,
} from "../../src/animation/hiJumpKick.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Side = "player" | "opponent";
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
type Task = { readonly slot: number; readonly func: number; readonly data: readonly number[] };
type Frame = {
  readonly frame: number;
  readonly sha256: string;
  readonly scriptPtr: number;
  readonly animScriptActive: boolean;
  readonly battleAnimAttacker: number;
  readonly battleAnimTarget: number;
  readonly player: Record<string, unknown>;
  readonly opponent: Record<string, unknown>;
  readonly playerSprite: Sprite;
  readonly opponentSprite: Sprite;
  readonly tasks: readonly Task[];
  readonly moveSprites: readonly Sprite[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly tileTags: readonly number[];
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly se1: { readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] };
  readonly se2: { readonly songHeader: number };
  readonly registers: { readonly dispcnt: number; readonly bldcnt: number; readonly bldalpha: number; readonly bldy: number };
  readonly immutableState: unknown;
  readonly engine: { readonly currentMove: number };
};
type Probe = {
  readonly schema: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly callbacks: Readonly<Record<string, number>>;
  readonly templates: Readonly<Record<string, number>>;
  readonly taskFuncs: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly frames: readonly Frame[];
};
type Fixture = {
  readonly schema: string;
  readonly oracleProfile: "battle-scene-on";
  readonly scenario: string;
  readonly probe: string;
  readonly orientation: "player-back" | "opponent-front";
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly appStage: { readonly presentationAge: number };
  readonly attackerSide: Side;
  readonly targetSide: Side;
  readonly attacker: unknown;
  readonly target: unknown;
  readonly fieldProfile: Record<string, unknown>;
  readonly evidenceSchema: string;
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly acceptance: { readonly status: "exact"; readonly componentMatching: number; readonly framebufferMatching: number };
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) {
  throw new Error("usage: hiJumpKickPortable.ts <player fixture> <opponent fixture>");
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const receipts = new Map<string, string>();
const IDENTITY: Matrix = { a: 256, b: 0, c: 0, d: 256 };

function rawRgbHash(probe: Probe, rgbDir: string): string {
  const hash = createHash("sha256");
  for (const frame of probe.frames) {
    hash.update(readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`)));
  }
  return hash.digest("hex");
}

function normalizedChangeMap(fixture: Fixture, rgbDir: string): string {
  const run = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], {
    cwd: root,
    encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(`${fixture.orientation}: change-map generation failed`);
  const separator = run.stdout.indexOf(" — ");
  if (separator < 0) throw new Error(`${fixture.orientation}: change-map header changed`);
  return `# ${basename(fixture.changeMap)} raw RGB888 — ${run.stdout.slice(separator + 3)}`;
}

function runFresh(fixture: Fixture): { readonly probe: Probe; readonly rgbDir: string; readonly bytes: Buffer; readonly scratch: string } {
  const scratch = createScratchDir(`pokebench-hi-jump-kick-${fixture.orientation}-`);
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
  const bytes = readFileSync(output);
  return { probe: JSON.parse(bytes.toString("utf8")) as Probe, rgbDir, bytes, scratch };
}

function targetPan(side: Side): number {
  return side === "player" ? -63 : 63;
}

function verify(path: string, runNumber: number): void {
  const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as Fixture;
  const fresh = runFresh(fixture);
  const { probe, rgbDir, bytes, scratch } = fresh;
  const evidenceHash = createHash("sha256").update(bytes).digest("hex");
  const rgbHash = rawRgbHash(probe, rgbDir);
  const changeMap = normalizedChangeMap(fixture, rgbDir);
  const failures: string[] = [];
  let componentMatches = 0;
  let framebufferMatches = 0;
  if (fixture.oracleProfile !== "battle-scene-on"
    || probe.schema !== fixture.evidenceSchema
    || !same(probe.sourceWindow, fixture.denseWindow)
    || probe.frames.length !== fixture.denseWindow.frameCount
    || evidenceHash !== fixture.evidenceSha256
    || evidenceHash !== fixture.secondFreshEvidenceSha256
    || rgbHash !== fixture.rawRgbSha256
    || createHash("sha256").update(changeMap).digest("hex") !== fixture.changeMapSha256
    || changeMap !== readFileSync(resolve(root, fixture.changeMap), "utf8")) {
    failures.push(`${fixture.orientation}: stable source receipt/window drift (${evidenceHash}/${rgbHash})`);
  }

  const stage = createSceneOnMovePresentation({
    move: "HI_JUMP_KICK",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  } as never);
  const first = probe.frames[0]!;
  const targetCenter = (fixture.target as { geometry: { animationCenter: { x: number; y: number } } }).geometry.animationCenter;
  const targetSpriteName = fixture.targetSide === "player" ? "playerSprite" : "opponentSprite";
  const attackerSpriteName = fixture.attackerSide === "player" ? "playerSprite" : "opponentSprite";
  for (const [age, oracle] of probe.frames.entries()) {
    const before = failures.length;
    const rgb = readFileSync(join(rgbDir, `${String(oracle.frame).padStart(5, "0")}.rgb`));
    if (createHash("sha256").update(rgb).digest("hex") !== oracle.sha256) failures.push(`age ${age}: RGB frame hash`);
    const predicted = hiJumpKickAtAge(age, fixture.attackerSide, fixture.targetSide, targetCenter);
    const seam = sceneOnHiJumpKickView({ ...stage, age });
    const { age: _age, attacker: _attacker, target: _target, ...seamState } = seam;
    if (!same(predicted, seamState)) failures.push(`age ${age}: typed seam`);
    if (oracle.animScriptActive !== predicted.active) failures.push(`age ${age}: active/cleanup`);
    if (oracle.engine.currentMove !== 136) failures.push(`age ${age}: current move`);

    const attacker = oracle[attackerSpriteName];
    const target = oracle[targetSpriteName];
    if (attacker.x2 !== predicted.attackerOffset.x2 || attacker.y2 !== predicted.attackerOffset.y2) failures.push(`age ${age}: attacker live OAM`);
    if (target.x2 !== predicted.targetX2 || target.y2 !== 0 || target.invisible !== predicted.targetOnMonBg) failures.push(`age ${age}: target live OAM/monbg`);

    const slideOffsets = oracle.moveSprites.filter((sprite) => sprite.template === probe.templates.gSlideMonToOffsetSpriteTemplate);
    const slideOriginals = oracle.moveSprites.filter((sprite) => sprite.template === probe.templates.gSlideMonToOriginalPosSpriteTemplate);
    if (slideOffsets.length !== predicted.slideToOffsetCount || slideOriginals.length !== predicted.slideToOriginalCount) failures.push(`age ${age}: slide lifetimes`);
    for (const sprite of [...slideOffsets, ...slideOriginals]) {
      if (sprite.data.length !== 8 || ![probe.callbacks.SlideMonToOffset, probe.callbacks.TranslateSpriteLinearByIdFixedPoint, probe.callbacks.SlideMonToOriginalPos_Step, probe.callbacks.DestroyAnimSprite].includes(sprite.callback)) failures.push(`age ${age}: slide callback/data`);
    }

    const feet = oracle.moveSprites.filter((sprite) => sprite.template === probe.templates.gJumpKickSpriteTemplate);
    if (feet.length !== Number(predicted.foot !== null)) failures.push(`age ${age}: gJumpKickSpriteTemplate lifetime`);
    if (predicted.foot && feet.length === 1) {
      const foot = feet[0]!;
      if (foot.x !== predicted.foot.x || foot.y !== predicted.foot.y
        || foot.x2 !== predicted.foot.x2 || foot.y2 !== predicted.foot.y2
        || foot.animNum !== 1 || foot.matrix.a !== 256 || foot.matrix.d !== 256
        || foot.data.length !== 8
        || foot.callback !== (age === 45
          ? probe.callbacks.DestroyAnimSprite
          : probe.callbacks.AnimTranslateLinear_WithFollowup)) {
        failures.push(`age ${age}: HJK foot callback/OAM/data`);
      }
    }

    const splats = oracle.moveSprites.filter((sprite) => sprite.template === probe.templates.gBasicHitSplatSpriteTemplate);
    if (splats.length !== Number(predicted.hitsplat !== null)) failures.push(`age ${age}: hitsplat lifetime`);
    if (predicted.hitsplat && splats.length === 1) {
      const splat = splats[0]!;
      const expectedHardware = age === 47 ? IDENTITY : { a: 303, b: 0, c: 0, d: 303 };
      if (splat.x !== predicted.hitsplat.x || splat.y !== predicted.hitsplat.y
        || splat.animNum !== 0 || !same(splat.matrix, { a: 303, b: 0, c: 0, d: 303 })
        || !same(splat.hardwareMatrix, expectedHardware)
        || splat.callback !== (age === 56 ? probe.callbacks.DestroyAnimSprite : probe.callbacks.RunStoredCallbackWhenAffineAnimEnds)) {
        failures.push(`age ${age}: animation-1 hitsplat callback/matrix`);
      }
    }

    const shakeTasks = oracle.tasks.filter((task) => task.func === probe.taskFuncs.AnimTask_ShakeMonInPlace_Step || task.func === probe.taskFuncs.AnimTask_ShakeMonInPlace);
    if (shakeTasks.length !== Number(predicted.shakeTaskActive)) failures.push(`age ${age}: ShakeMonInPlace task lifetime`);
    for (const task of shakeTasks) {
      if (task.data[2] !== 11 || task.data[4] !== 1 || task.data[5] !== 6 || task.data.length !== 16) failures.push(`age ${age}: ShakeMonInPlace args/data`);
    }

    const alphaExpected = age >= HI_JUMP_KICK_ALPHA_FIRST_AGE && age < HI_JUMP_KICK_CLEAR_AGE;
    if (oracle.registers.bldcnt !== (alphaExpected ? 0x3f40 : 0)
      || oracle.registers.bldalpha !== (alphaExpected ? 0x080c : 0)
      || oracle.registers.bldy !== 0) failures.push(`age ${age}: alpha registers`);
    if ((oracle.paletteTags.includes(10143)) !== (age < 90)
      || oracle.paletteTags.includes(10135) !== (age >= 3 && age < 90)) failures.push(`age ${age}: asset tags`);
    if (oracle.fadedPalette.length !== 512 || oracle.unfadedPalette.length !== 512 || oracle.hardwarePalette.length !== 512
      || oracle.paletteTags.length !== 16 || oracle.tileTags.length !== 128 || oracle.softwareOam.length !== 128
      || oracle.hardwareOam.length !== 128 || oracle.hardwareMatrices.length !== 32) failures.push(`age ${age}: hardware inventory`);

    const event = predicted.soundEvents[0];
    if (event) {
      const activeTrack = oracle.se1.tracks.some((track) => (track.flags & 0x80) !== 0 && track.panX === targetPan(event.panSide));
      if (oracle.se1.songHeader !== probe.songHeaders[event.song] || !activeTrack) failures.push(`age ${age}: audio cue/pan`);
    }
    if (!same(oracle.immutableState, first.immutableState)) failures.push(`age ${age}: immutable battle state`);
    for (const side of ["player", "opponent"] as const) {
      const now = oracle[side];
      const initial = first[side];
      for (const key of ["species", "hp", "maxHp", "item", "status1", "status2", "status3"]) {
        if (now[key] !== initial[key]) failures.push(`age ${age}: live state ${side}.${key}`);
      }
    }

    if (failures.length === before) componentMatches += 1;
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const app = render(engine);
    let framebufferExact = true;
    for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
      if (app[pixel * 4] !== rgb[pixel * 3]
        || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
        || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) {
        framebufferExact = false;
        break;
      }
    }
    if (framebufferExact) framebufferMatches += 1;
    else failures.push(`age ${age}: framebuffer`);
  }

  if (componentMatches !== fixture.acceptance.componentMatching) failures.push(`component ${componentMatches}/${probe.frames.length}`);
  if (framebufferMatches !== fixture.acceptance.framebufferMatching) failures.push(`framebuffer ${framebufferMatches}/${probe.frames.length}`);
  if (runNumber === 1) receipts.set(fixture.orientation, evidenceHash);
  else if (receipts.get(fixture.orientation) !== evidenceHash) failures.push(`run ${runNumber}: fresh receipt`);
  console.log(`${fixture.orientation} run ${runNumber}: components ${componentMatches}/${probe.frames.length}; framebuffer ${framebufferMatches}/${probe.frames.length}; evidence ${evidenceHash}; RGB ${rgbHash}`);
  if (failures.length) {
    console.error(failures.filter((line) => !line.includes(": framebuffer")).slice(0, 80).join("\n"));
    console.error(failures.filter((line) => line.includes(": framebuffer")).slice(0, 2).join("\n"));
    console.error(`scratch: ${scratch}`);
  }
  if (failures.length || componentMatches !== probe.frames.length || framebufferMatches !== probe.frames.length) process.exitCode = 1;
}

for (const path of fixturePaths) verify(path, 1);
for (const path of fixturePaths) verify(path, 2);
if (process.exitCode) throw new Error("Hi Jump Kick portable acceptance failed");
