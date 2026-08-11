import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { cometPunchAtAge } from "../../src/animation/cometPunch.ts";
import {
  createSceneOnMovePresentation,
  sceneOnCometPunchView,
  type SceneOnCometPunchConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Ident = { readonly address: number; readonly symbol: string | null };
type Sprite = { readonly slot: number; readonly x: number; readonly y: number; readonly x2: number; readonly y2: number; readonly invisible: boolean; readonly hFlip: boolean; readonly template: Ident; readonly callback: Ident; readonly animNum: number; readonly matrix: readonly number[]; readonly hardwareMatrix: readonly number[]; readonly data: readonly number[] };
type Task = { readonly func: Ident; readonly data: readonly number[] };
type Frame = { readonly frame: number; readonly sha256: string; readonly scriptPtr: number; readonly scriptOffset: number | null; readonly animScriptActive: boolean; readonly moveTurn: number; readonly visualTaskCount: number; readonly soundTaskCount: number; readonly tasks: readonly Task[]; readonly sprites: readonly Sprite[]; readonly playerSprite: Sprite; readonly opponentSprite: Sprite; readonly battlers: unknown; readonly parties: unknown; readonly engine: { readonly currentMove: number }; readonly immutableState: unknown; readonly animationRng: number; readonly softwareOam: readonly string[]; readonly hardwareOam: readonly string[]; readonly fadedPalette: readonly number[]; readonly unfadedPalette: readonly number[]; readonly hardwarePalette: readonly number[]; readonly softwareMatrices: readonly (readonly number[])[]; readonly hardwareMatrices: readonly (readonly number[])[]; readonly paletteTags: readonly number[]; readonly tileTags: readonly number[]; readonly registers: { readonly dispcnt: number; readonly bldcnt: number; readonly bldalpha: number; readonly bldy: number }; readonly se1: { readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] }; readonly se2: { readonly tracks: readonly unknown[] } };
type Window = { readonly invocation: number; readonly moveTurn: number; readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number }; readonly frames: readonly Frame[] };
type Probe = { readonly schema: string; readonly moveId: number; readonly sourceSymbols: Readonly<Record<string, number>>; readonly componentSymbols: Readonly<Record<string, number>>; readonly songHeaders: Readonly<Record<string, number>>; readonly topology: { readonly templates: readonly string[]; readonly callbacks: readonly string[]; readonly tasks: readonly string[] }; readonly windows: readonly Window[] };
type WindowReceipt = { readonly invocation: number; readonly moveTurn: number; readonly startFrame: number; readonly endFrame: number; readonly frameCount: number; readonly playerHp: number; readonly opponentHp: number; readonly targetIdleX2: number; readonly changeMap: string; readonly changeMapSha256: string; readonly acceptance?: { readonly sourceReducerMatching: number; readonly typedSeamMatching: number; readonly componentMatching: number; readonly framebufferMatching: number } };
type Orientation = { readonly orientation: "player-back" | "opponent-front"; readonly scenario: string; readonly evidenceSha256: string; readonly secondFreshEvidenceSha256: string; readonly rawRgbSha256: string; readonly branchRawRgbSha256: readonly string[]; readonly windows: readonly WindowReceipt[] };
type Receipt = { readonly schema: string; readonly oracleProfile: string; readonly move: string; readonly status: "checkpoint" | "exact"; readonly orientations: readonly Orientation[] };

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const receipt = JSON.parse(readFileSync(resolve(root, process.argv[2] ?? "tools/compare/fixtures/comet-punch-natural-receipts.json"), "utf8")) as Receipt;
const FRAME_BYTES = 240 * 160 * 3;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const sha = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");

function battlers(orientation: Orientation): { attacker: SceneOnPresentationBattler; target: SceneOnPresentationBattler } {
  if (orientation.orientation === "player-back") return {
    attacker: { species: "LEDIAN", geometry: { side: "player", spriteCorner: { x: 40, y: 55 }, animationCenter: { x: 72, y: 87 }, battlePositionCenter: { x: 72, y: 80 } } },
    target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } },
  };
  return {
    attacker: { species: "LEDIAN", geometry: { side: "opponent", spriteCorner: { x: 144, y: 4 }, animationCenter: { x: 176, y: 36 }, battlePositionCenter: { x: 176, y: 40 } } },
    target: { species: "ONIX", geometry: { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } } },
  };
}

function stage(orientation: Orientation, window: WindowReceipt): SceneOnCometPunchConfig {
  const { attacker, target } = battlers(orientation);
  return {
    move: "COMET_PUNCH", moveTurn: window.moveTurn, attacker, target,
    fieldProfile: {
      playerHp: window.playerHp,
      playerMaxHp: orientation.orientation === "player-back" ? 162 : 142,
      opponentHp: window.opponentHp,
      opponentMaxHp: orientation.orientation === "player-back" ? 142 : 162,
      playerGender: "male", opponentGender: "male",
    },
  };
}

function runFresh(orientation: Orientation) {
  const scratch = createScratchDir(`pokebench-comet-punch-${orientation.orientation}-`);
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), join(root, "tools/compare/cometPunchProbe.py"),
    resolve(root, orientation.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`${orientation.orientation}: probe failed ${run.status}`);
  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString("utf8")) as Probe;
  const branches = probe.windows.map((window) => Buffer.concat(
    window.frames.map((_, age) => readFileSync(join(rgbDir, `hit-${window.invocation}`, `${String(age).padStart(3, "0")}.rgb`))),
  ));
  return { scratch, bytes, probe, branches, raw: Buffer.concat(branches), rgbDir };
}

function normalizedMap(path: string, rgbDir: string, hit: number): string {
  const run = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), join(rgbDir, `hit-${hit}`)], { cwd: root, encoding: "utf8" });
  if (run.status !== 0) throw new Error("change-map failed");
  const delimiter = run.stdout.indexOf(" — ");
  return `# ${path} raw RGB888 — ${run.stdout.slice(delimiter + 3)}`;
}

function frameExact(app: Uint8Array, rgb: Buffer): boolean {
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== rgb[pixel * 3] || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1] || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) return false;
  }
  return true;
}

function frameDiff(app: Uint8Array, rgb: Buffer): string {
  let count = 0; let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] === rgb[pixel * 3] && app[pixel * 4 + 1] === rgb[pixel * 3 + 1] && app[pixel * 4 + 2] === rgb[pixel * 3 + 2]) continue;
    count += 1; const x = pixel % 240; const y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return `${count}px ${minX},${minY}-${maxX},${maxY}`;
}

function validate(orientation: Orientation, receiptWindow: WindowReceipt, window: Window, rgb: Buffer, song: number) {
  const failures: string[] = [];
  const config = stage(orientation, receiptWindow);
  const presentation = createSceneOnMovePresentation(config);
  const geometry = { attackerSide: config.attacker.geometry.side, targetCenter: config.target.geometry.animationCenter };
  const first = window.frames[0]!;
  const targetKey = config.target.geometry.side === "player" ? "playerSprite" : "opponentSprite";
  const attackerKey = config.attacker.geometry.side === "player" ? "playerSprite" : "opponentSprite";
  let source = 0; let seam = 0; let component = 0; let framebuffer = 0;
  for (const [age, oracle] of window.frames.entries()) {
    const bad: string[] = [];
    const predicted = cometPunchAtAge(age, receiptWindow.moveTurn, geometry);
    const view = sceneOnCometPunchView({ ...presentation, age });
    const { age: _age, attacker: _attacker, target: _target, ...seamState } = view;
    if (same(predicted, seamState)) seam += 1; else bad.push("typed seam");
    if (oracle.animScriptActive !== predicted.active || oracle.engine.currentMove !== 4 || oracle.moveTurn !== receiptWindow.moveTurn || oracle.scriptPtr < 0x082ca2c3 || oracle.scriptPtr >= 0x082ca33b) bad.push("pointer/currentMove/moveTurn");
    const attacker = oracle[attackerKey];
    const target = oracle[targetKey];
    if (attacker.x !== config.attacker.geometry.animationCenter.x || attacker.y !== config.attacker.geometry.animationCenter.y || attacker.x2 !== 0 || attacker.y2 !== 0) bad.push("attacker OAM");
    const targetX2 = age < 10 ? receiptWindow.targetIdleX2 : predicted.targetX2;
    if (target.x2 !== targetX2 || target.y2 !== 0 || target.invisible !== predicted.targetOnMonBg) bad.push("target OAM/ShakeMon/monbg");
    const splats = oracle.sprites.filter((sprite) => sprite.template.symbol === "gBasicHitSplatSpriteTemplate");
    if (splats.length !== Number(predicted.hitsplat !== null)) bad.push("hitsplat lifetime");
    if (predicted.hitsplat) {
      const sprite = splats[0];
      const callback = age === 19 ? "DestroyAnimSprite" : "RunStoredCallbackWhenAffineAnimEnds";
      if (!sprite || sprite.slot !== 3 || sprite.x !== predicted.hitsplat.x || sprite.y !== predicted.hitsplat.y || sprite.animNum !== 0 || sprite.hFlip || sprite.callback.symbol !== callback || !same(sprite.matrix, [372, 0, 0, 372])) bad.push("hitsplat OAM/matrix");
    }
    const fists = oracle.sprites.filter((sprite) => sprite.template.symbol === "gFistFootSpriteTemplate");
    if (fists.length !== Number(predicted.fist !== null)) bad.push("fist lifetime");
    if (predicted.fist) {
      const sprite = fists[0];
      const callback = age === 18 ? "DestroyAnimSprite" : "WaitAnimForDuration";
      if (!sprite || sprite.slot !== 4 || sprite.x !== predicted.fist.x || sprite.y !== predicted.fist.y || sprite.animNum !== 0 || sprite.hFlip || sprite.callback.symbol !== callback || sprite.data[0] !== predicted.fist.remaining || !same(sprite.matrix, [372, 0, 0, 372])) bad.push("fist OAM/lifetime");
    }
    const shakes = oracle.tasks.filter((task) => task.func.symbol === "AnimTask_ShakeMon_Step");
    if (shakes.length !== Number(predicted.shakeTaskActive)) bad.push("ShakeMon lifetime");
    if (shakes[0] && (shakes[0].data[4] !== 3 || shakes[0].data[5] !== 0 || shakes[0].data[2] !== 1 || shakes[0].data[0] !== target.slot)) bad.push("ShakeMon data");
    if (oracle.visualTaskCount !== splats.length + fists.length + shakes.length) bad.push("visual task count");
    const impactTags = oracle.paletteTags.includes(10135) && oracle.tileTags.includes(10135);
    const handsTags = oracle.paletteTags.includes(10143) && oracle.tileTags.includes(10143);
    if (impactTags !== predicted.impactLoaded || handsTags !== predicted.handsAndFeetLoaded) bad.push("IMPACT/HANDS tags");
    const alpha = predicted.alpha !== null;
    if (oracle.registers.dispcnt !== 0xbf40 || oracle.registers.bldcnt !== (alpha ? 0x3f40 : 0) || oracle.registers.bldalpha !== (alpha ? 0x080c : 0) || oracle.registers.bldy !== 0) bad.push("registers");
    if (predicted.soundEvents.length) {
      const pan = config.target.geometry.side === "player" ? -63 : 63;
      if (oracle.se1.songHeader !== song || !oracle.se1.tracks.some((track) => (track.flags & 0x80) !== 0 && track.panX === pan)) bad.push("audio");
    }
    if (oracle.se1.tracks.length !== 3 || oracle.se2.tracks.length !== 3 || oracle.soundTaskCount !== 0) bad.push("audio topology");
    // The probe records gRng2Value but Comet Punch neither owns nor injects
    // it; the ROM advances it during this visual wait. Battle-owned fields
    // remain fixed for every dense source display.
    if (!same(oracle.battlers, first.battlers) || !same(oracle.parties, first.parties) || !same(oracle.immutableState, first.immutableState)) bad.push("immutable animation-owned state");
    if (oracle.softwareOam.length !== 128 || oracle.hardwareOam.length !== 128 || oracle.softwareMatrices.length !== 32 || oracle.hardwareMatrices.length !== 32 || oracle.fadedPalette.length !== 512 || oracle.unfadedPalette.length !== 512 || oracle.hardwarePalette.length !== 512 || oracle.paletteTags.length !== 16 || oracle.tileTags.length !== 128) bad.push("hardware inventory");
    const previous = age ? window.frames[age - 1]! : oracle;
    if (age && !same(oracle.hardwareOam, previous.softwareOam)) bad.push("RAM+1 OAM");
    if (age && !same(oracle.hardwareMatrices, previous.softwareMatrices)) bad.push("RAM+1 matrix");
    const previousPredicted = age ? cometPunchAtAge(age - 1, receiptWindow.moveTurn, geometry) : predicted;
    const paletteSource = predicted.targetOnMonBg && !previousPredicted.targetOnMonBg ? oracle.fadedPalette : previous.fadedPalette;
    if (!same(oracle.hardwarePalette, paletteSource)) bad.push("palette latch");
    const raw = rgb.subarray(age * FRAME_BYTES, (age + 1) * FRAME_BYTES);
    if (sha(raw) !== oracle.sha256) bad.push("raw RGB hash");
    if (!bad.length) { source += 1; component += 1; } else failures.push(`hit ${window.invocation} age ${age}: ${bad.join(", ")}`);
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...presentation, age } };
    const app = render(engine);
    if (frameExact(app, raw)) framebuffer += 1; else failures.push(`hit ${window.invocation} age ${age}: framebuffer ${frameDiff(app, raw)}`);
  }
  return { source, seam, component, framebuffer, failures };
}

if (receipt.schema !== "comet-punch-natural-receipts/v1" || receipt.oracleProfile !== "battle-scene-on" || receipt.move !== "COMET_PUNCH" || receipt.status !== "exact" || receipt.orientations.length !== 2) throw new Error("receipt contract changed");
for (const orientation of receipt.orientations) {
  const first = runFresh(orientation);
  const second = runFresh(orientation);
  const failures: string[] = [];
  const expectedHits = orientation.orientation === "player-back" ? 4 : 5;
  if (first.probe.schema !== "comet-punch-dense-evidence/v1" || first.probe.moveId !== 4 || first.probe.windows.length !== expectedHits || !first.probe.windows.every((window, index) => window.moveTurn === index) || !new Set(first.probe.windows.map((window) => window.moveTurn & 1)).has(0) || !new Set(first.probe.windows.map((window) => window.moveTurn & 1)).has(1)) failures.push("natural 2-5 hit/controller branches");
  if (!same(first.probe.sourceSymbols, { Move_COMET_PUNCH: 0x082ca2c3, CometPunchContinue: 0x082ca2d7, CometPunchLeft: 0x082ca2f1, CometPunchRight: 0x082ca316, Move_SONIC_BOOM: 0x082ca33b })) failures.push("pointer bounds");
  if (sha(first.bytes) !== orientation.evidenceSha256 || sha(second.bytes) !== orientation.secondFreshEvidenceSha256 || !first.bytes.equals(second.bytes)) failures.push("twice-fresh evidence");
  if (sha(first.raw) !== orientation.rawRgbSha256 || sha(second.raw) !== orientation.rawRgbSha256) failures.push("raw aggregate");
  const requiredTemplates = ["gBasicHitSplatSpriteTemplate", "gFistFootSpriteTemplate"];
  const requiredCallbacks = ["RunStoredCallbackWhenAffineAnimEnds", "WaitAnimForDuration"];
  const requiredTasks = ["AnimTask_ShakeMon_Step"];
  const requiredSymbols = ["gBasicHitSplatSpriteTemplate", "AnimHitSplatBasic", "gFistFootSpriteTemplate", "AnimBasicFistOrFoot", "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step", "gBattleAnimSpriteGfx_Impact", "gBattleAnimSpritePal_Impact", "gBattleAnimSpriteGfx_HandsAndFeet", "gBattleAnimSpritePal_HandsAndFeet"];
  if (requiredTemplates.some((name) => !first.probe.topology.templates.includes(name)) || requiredCallbacks.some((name) => !first.probe.topology.callbacks.includes(name)) || requiredTasks.some((name) => !first.probe.topology.tasks.includes(name)) || requiredSymbols.some((name) => !(name in first.probe.componentSymbols))) failures.push("component topology");
  for (const [index, receiptWindow] of orientation.windows.entries()) {
    const window = first.probe.windows[index]!;
    const secondWindow = second.probe.windows[index]!;
    const dense = { startFrame: receiptWindow.startFrame, endFrame: receiptWindow.endFrame, frameCount: receiptWindow.frameCount };
    if (window.invocation !== index || window.moveTurn !== receiptWindow.moveTurn || !same(window.sourceWindow, dense) || !same(secondWindow.sourceWindow, dense) || window.frames.length !== 37) failures.push(`hit ${index} dense window`);
    if (sha(first.branches[index]!) !== orientation.branchRawRgbSha256[index] || sha(second.branches[index]!) !== orientation.branchRawRgbSha256[index]) failures.push(`hit ${index} RGB`);
    const committedMap = readFileSync(resolve(root, receiptWindow.changeMap), "utf8");
    if (normalizedMap(receiptWindow.changeMap, first.rgbDir, index) !== committedMap || normalizedMap(receiptWindow.changeMap, second.rgbDir, index) !== committedMap || sha(committedMap) !== receiptWindow.changeMapSha256) failures.push(`hit ${index} map`);
    const firstResult = validate(orientation, receiptWindow, window, first.branches[index]!, first.probe.songHeaders.SE_M_COMET_PUNCH!);
    const secondResult = validate(orientation, receiptWindow, secondWindow, second.branches[index]!, second.probe.songHeaders.SE_M_COMET_PUNCH!);
    const expected = receiptWindow.acceptance ?? { sourceReducerMatching: 37, typedSeamMatching: 37, componentMatching: 37, framebufferMatching: 37 };
    for (const [run, result] of [[1, firstResult], [2, secondResult]] as const) {
      if (result.source !== expected.sourceReducerMatching || result.seam !== expected.typedSeamMatching || result.component !== expected.componentMatching || result.framebuffer !== expected.framebufferMatching) failures.push(`hit ${index} run ${run}: ${result.source}/${result.seam}/${result.component}/${result.framebuffer}`);
      failures.push(...result.failures.map((failure) => `run ${run}: ${failure}`));
    }
    console.log(`${orientation.orientation} hit ${index}: reducer ${firstResult.source}/37, seam ${firstResult.seam}/37, components ${firstResult.component}/37, framebuffer ${firstResult.framebuffer}/37; twice fresh`);
  }
  if (failures.length) {
    console.error(failures.slice(0, 180).join("\n"));
    console.error(`scratch: ${first.scratch}\n${second.scratch}`);
    throw new Error(`${orientation.orientation}: Comet Punch acceptance failed`);
  }
}
