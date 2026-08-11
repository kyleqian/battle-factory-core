import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnDoubleKickView,
  type SceneOnDoubleKickConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  doubleKickAtAge,
  type DoubleKickGeometry,
  type DoubleKickRandomWords,
} from "../../src/animation/doubleKick.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Side = "player" | "opponent";
type Ident = { readonly address: number; readonly symbol: string | null };
type Sprite = {
  readonly slot: number; readonly x: number; readonly y: number;
  readonly x2: number; readonly y2: number; readonly invisible: boolean;
  readonly template: Ident; readonly callback: Ident; readonly animNum: number;
  readonly matrix: readonly number[]; readonly hardwareMatrix: readonly number[];
  readonly data: readonly number[];
};
type Task = { readonly func: Ident; readonly data: readonly number[] };
type Frame = {
  readonly frame: number; readonly sha256: string; readonly scriptPtr: number;
  readonly animScriptActive: boolean; readonly visualTaskCount: number;
  readonly tasks: readonly Task[]; readonly sprites: readonly Sprite[];
  readonly playerSprite: Sprite; readonly opponentSprite: Sprite;
  readonly battlers: unknown; readonly parties: unknown; readonly engine: { readonly currentMove: number };
  readonly immutableState: unknown; readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly string[]; readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[]; readonly hardwarePalette: readonly number[];
  readonly softwareMatrices: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly paletteTags: readonly number[]; readonly tileTags: readonly number[];
  readonly registers: { readonly bldcnt: number; readonly bldalpha: number; readonly bldy: number };
  readonly se1: { readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] };
};
type Probe = {
  readonly schema: string; readonly moveId: number;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly sourceSymbols: Readonly<Record<string, number>>;
  readonly componentSymbols: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly lifecycleCounts: Readonly<Record<string, number>>;
  readonly topology: { readonly templates: readonly string[]; readonly callbacks: readonly string[]; readonly tasks: readonly string[] };
  readonly frames: readonly Frame[];
};
type Battler = { readonly species: string; readonly geometry: { readonly side: Side; readonly spriteCorner: { readonly x: number; readonly y: number }; readonly animationCenter: { readonly x: number; readonly y: number }; readonly battlePositionCenter: { readonly x: number; readonly y: number } } };
type Fixture = {
  readonly schema: string; readonly oracleProfile: string; readonly move: string;
  readonly orientation: string; readonly scenario: string; readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly evidenceSha256: string; readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string; readonly changeMap: string; readonly changeMapSha256: string;
  readonly attackerSide: Side; readonly targetSide: Side; readonly targetIdleX2: number;
  readonly attacker: Battler; readonly target: Battler; readonly fieldProfile: Record<string, unknown>;
  readonly targetDimensions: { readonly width: number; readonly height: number };
  readonly fistRandom: DoubleKickRandomWords;
  readonly acceptance: { readonly sourceReducerMatching: number; readonly typedSeamMatching: number; readonly componentMatching: number; readonly framebufferMatching: number };
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (fixturePaths.length !== 2) throw new Error("usage: doubleKickPortable.ts <player fixture> <opponent fixture>");
const FRAME_BYTES = 240 * 160 * 3;
const IDENTITY = [256, 0, 0, 256];
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const sha = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");

function normalizedChangeMap(fixture: Fixture, rgbDir: string): string {
  const run = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], { cwd: root, encoding: "utf8" });
  if (run.status !== 0) throw new Error(`${fixture.orientation}: change-map generation failed`);
  const separator = run.stdout.indexOf(" — ");
  if (separator < 0) throw new Error(`${fixture.orientation}: change-map header changed`);
  return `# ${basename(fixture.changeMap)} raw RGB888 — ${run.stdout.slice(separator + 3)}`;
}

function runFresh(fixture: Fixture) {
  const scratch = createScratchDir(`pokebench-double-kick-${fixture.orientation}-`);
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
  if (run.status !== 0) throw new Error(`${fixture.orientation}: fresh probe failed (${run.status})`);
  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString("utf8")) as Probe;
  const raw = Buffer.concat(readdirSync(rgbDir).sort().map((file) => readFileSync(join(rgbDir, file))));
  return { bytes, probe, raw, rgbDir, changeMap: normalizedChangeMap(fixture, rgbDir), scratch };
}

function geometry(fixture: Fixture): DoubleKickGeometry {
  return { targetSide: fixture.targetSide, targetCenter: fixture.target.geometry.animationCenter,
    targetDimensions: fixture.targetDimensions, fistRandom: fixture.fistRandom };
}

function stage(fixture: Fixture) {
  return createSceneOnMovePresentation<SceneOnDoubleKickConfig>({
    move: "DOUBLE_KICK", attacker: fixture.attacker, target: fixture.target,
    fieldProfile: fixture.fieldProfile as never, targetDimensions: fixture.targetDimensions,
    fistRandom: fixture.fistRandom,
  });
}

function frameExact(app: Uint8Array, rgb: Buffer): boolean {
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== rgb[pixel * 3] || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) return false;
  }
  return true;
}

function validateRows(fixture: Fixture, fresh: ReturnType<typeof runFresh>) {
  const failures: string[] = [];
  const sourceGeometry = geometry(fixture);
  const presentation = stage(fixture);
  const first = fresh.probe.frames[0]!;
  const attackerKey = fixture.attackerSide === "player" ? "playerSprite" : "opponentSprite";
  const targetKey = fixture.targetSide === "player" ? "playerSprite" : "opponentSprite";
  let sourceReducer = 0, typedSeam = 0, component = 0, framebuffer = 0;
  for (const [age, oracle] of fresh.probe.frames.entries()) {
    const rowFailures: string[] = [];
    const predicted = doubleKickAtAge(age, sourceGeometry);
    const view = sceneOnDoubleKickView({ ...presentation, age });
    const { age: _age, attacker: _attacker, target: _target, ...seamState } = view;
    if (same(predicted, seamState)) typedSeam += 1; else rowFailures.push("typed seam");
    if (oracle.animScriptActive !== predicted.active || oracle.engine.currentMove !== 24) rowFailures.push("script active/current move");
    const attacker = oracle[attackerKey];
    const target = oracle[targetKey];
    if (attacker.x !== fixture.attacker.geometry.animationCenter.x || attacker.y !== fixture.attacker.geometry.animationCenter.y
      || attacker.x2 !== 0 || attacker.y2 !== 0) rowFailures.push("attacker OAM");
    const targetX2 = age < 10 ? fixture.targetIdleX2 : predicted.targetX2;
    if (target.x2 !== targetX2 || target.y2 !== 0 || target.invisible !== predicted.targetOnMonBg) rowFailures.push("target OAM/monbg/ShakeMon");
    const fists = oracle.sprites.filter((sprite) => sprite.template.symbol === "gFistFootRandomPosSpriteTemplate");
    const splats = oracle.sprites.filter((sprite) => sprite.template.symbol === "gBasicHitSplatSpriteTemplate");
    if (fists.length !== Number(predicted.fist !== null) || splats.length !== Number(predicted.hitsplat !== null)) rowFailures.push("sprite lifetime");
    if (predicted.fist && predicted.hitsplat) {
      const fist = fists[0], splat = splats[0];
      if (!fist || !splat || fist.slot !== 3 || splat.slot !== 4 || fist.x !== predicted.fist.x
        || fist.y !== predicted.fist.y || fist.animNum !== 1 || fist.data[0] !== predicted.fist.remaining
        || fist.data[7] !== 4 || splat.x !== predicted.hitsplat.x || splat.y !== predicted.hitsplat.y
        || !same(splat.matrix, IDENTITY) || !same(splat.hardwareMatrix, IDENTITY)) rowFailures.push("fist/child OAM/matrix/allocator");
    }
    const shake = oracle.tasks.find((task) => task.func.symbol === "AnimTask_ShakeMon_Step");
    if (Boolean(shake) !== predicted.shakeTaskActive) rowFailures.push("ShakeMon lifetime");
    if (shake && (shake.data[2] !== 1 || shake.data[4] !== 4 || shake.data[5] !== 0)) rowFailures.push("ShakeMon task data");
    const handsTag = oracle.paletteTags.includes(10143) && oracle.tileTags.includes(10143);
    const impactTag = oracle.paletteTags.includes(10135) && oracle.tileTags.includes(10135);
    if (handsTag !== predicted.handsAndFeetLoaded || impactTag !== predicted.impactLoaded) rowFailures.push("resource tags");
    const alpha = predicted.alpha !== null;
    if (oracle.registers.bldcnt !== (alpha ? 0x3f40 : 0) || oracle.registers.bldalpha !== (alpha ? 0x080c : 0)
      || oracle.registers.bldy !== 0) rowFailures.push("blend registers");
    if (predicted.soundEvents.length) {
      const pan = fixture.targetSide === "player" ? -63 : 63;
      if (oracle.se1.songHeader !== fresh.probe.songHeaders.SE_M_VITAL_THROW2
        || !oracle.se1.tracks.some((track) => (track.flags & 0x80) !== 0 && track.panX === pan)) rowFailures.push("audio cue/pan");
    }
    if (!same(oracle.battlers, first.battlers) || !same(oracle.parties, first.parties)
      || !same(oracle.immutableState, first.immutableState)) rowFailures.push("immutable battle state");
    if (oracle.fadedPalette.length !== 512 || oracle.unfadedPalette.length !== 512 || oracle.hardwarePalette.length !== 512
      || oracle.paletteTags.length !== 16 || oracle.tileTags.length !== 128 || oracle.softwareOam.length !== 128
      || oracle.hardwareOam.length !== 128 || oracle.softwareMatrices.length !== 32 || oracle.hardwareMatrices.length !== 32) rowFailures.push("hardware inventory");
    if (age > 0 && !same(oracle.hardwareOam, fresh.probe.frames[age - 1]!.softwareOam)) rowFailures.push("RAM+1 OAM latch");
    if (age > 0) {
      // Cmd_monbg's OBJ-to-BG palette copy runs before this display's palette
      // DMA, while the two asynchronous loads follow the ordinary RAM+1
      // transfer. Derive the exception from the source transition itself.
      const previous = doubleKickAtAge(age - 1, sourceGeometry);
      const paletteSource = predicted.targetOnMonBg && !previous.targetOnMonBg
        ? oracle.fadedPalette
        : fresh.probe.frames[age - 1]!.fadedPalette;
      if (!same(oracle.hardwarePalette, paletteSource)) rowFailures.push("source palette transfer latch");
    }
    const rgb = fresh.raw.subarray(age * FRAME_BYTES, (age + 1) * FRAME_BYTES);
    if (sha(rgb) !== oracle.sha256) rowFailures.push("frame RGB hash");
    if (!rowFailures.length) { sourceReducer += 1; component += 1; }
    else failures.push(`age ${age}: ${rowFailures.join(", ")}`);
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...presentation, age } };
    if (frameExact(render(engine), rgb)) framebuffer += 1; else failures.push(`age ${age}: framebuffer`);
  }
  return { sourceReducer, typedSeam, component, framebuffer, failures };
}

for (const fixturePath of fixturePaths) {
  const fixture = JSON.parse(readFileSync(resolve(root, fixturePath), "utf8")) as Fixture;
  const first = runFresh(fixture), second = runFresh(fixture);
  const failures: string[] = [];
  const evidence = sha(first.bytes), secondEvidence = sha(second.bytes);
  if (fixture.schema !== "double-kick-portable-exact/v1" || fixture.oracleProfile !== "battle-scene-on" || fixture.move !== "DOUBLE_KICK") failures.push("fixture contract");
  if (first.probe.schema !== "double-kick-dense-evidence/v1" || second.probe.schema !== first.probe.schema || first.probe.moveId !== 24) failures.push("probe schema/move");
  if (!same(first.probe.sourceWindow, fixture.denseWindow) || !same(second.probe.sourceWindow, fixture.denseWindow)
    || first.probe.frames.length !== 36 || second.probe.frames.length !== 36) failures.push("dense window");
  if (!same(first.probe.sourceSymbols, { Move_DOUBLE_KICK: 0x082d2261, Move_TRIPLE_KICK: 0x082d2293 })
    || !same(second.probe.sourceSymbols, first.probe.sourceSymbols)) failures.push("source pointer bounds");
  if (evidence !== secondEvidence || evidence !== fixture.evidenceSha256 || secondEvidence !== fixture.secondFreshEvidenceSha256) failures.push(`twice-fresh receipt ${evidence}/${secondEvidence}`);
  if (sha(first.raw) !== fixture.rawRgbSha256 || sha(second.raw) !== fixture.rawRgbSha256) failures.push("raw RGB");
  const committedMap = readFileSync(resolve(root, fixture.changeMap), "utf8");
  if (first.changeMap !== committedMap || second.changeMap !== committedMap || sha(committedMap) !== fixture.changeMapSha256) failures.push("normalized change map");
  const requiredComponents = ["gFistFootRandomPosSpriteTemplate", "gBasicHitSplatSpriteTemplate", "AnimFistOrFootRandomPos", "AnimFistOrFootRandomPos_Step", "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step", "gBattleAnimSpriteGfx_HandsAndFeet", "gBattleAnimSpritePal_HandsAndFeet", "gBattleAnimSpriteGfx_Impact", "gBattleAnimSpritePal_Impact"];
  for (const probe of [first.probe, second.probe]) {
    if (!probe.topology.templates.includes("gFistFootRandomPosSpriteTemplate") || !probe.topology.templates.includes("gBasicHitSplatSpriteTemplate")
      || !probe.topology.callbacks.includes("AnimFistOrFootRandomPos_Step") || !probe.topology.tasks.includes("AnimTask_ShakeMon_Step")
      || requiredComponents.some((name) => !(name in probe.componentSymbols))
      || !same(probe.lifecycleCounts, { gFistFootRandomPosSpriteTemplate: 1, gBasicHitSplatSpriteTemplate: 1 })) failures.push("source component topology");
  }
  const firstRows = validateRows(fixture, first), secondRows = validateRows(fixture, second);
  for (const [run, result] of [[1, firstRows], [2, secondRows]] as const) {
    if (result.sourceReducer !== fixture.acceptance.sourceReducerMatching || result.typedSeam !== fixture.acceptance.typedSeamMatching
      || result.component !== fixture.acceptance.componentMatching || result.framebuffer !== fixture.acceptance.framebufferMatching) failures.push(`run ${run}: ${result.sourceReducer}/${result.typedSeam}/${result.component}/${result.framebuffer}`);
    failures.push(...result.failures.map((failure) => `run ${run}: ${failure}`));
  }
  console.log(`${fixture.orientation}: reducer ${firstRows.sourceReducer}/36, seam ${firstRows.typedSeam}/36, components ${firstRows.component}/36, framebuffer ${firstRows.framebuffer}/36; twice fresh`);
  if (failures.length) {
    console.error(failures.slice(0, 80).join("\n"));
    console.error(`scratch: ${first.scratch}\n${second.scratch}`);
    throw new Error(`${fixture.orientation}: Double Kick exact acceptance failed`);
  }
}
