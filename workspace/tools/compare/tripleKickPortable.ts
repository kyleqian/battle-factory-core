import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnTripleKickView,
  type SceneOnPresentationBattler,
  type SceneOnTripleKickConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  tripleKickAtAge,
  type TripleKickGeometry,
  type TripleKickMoveTurn,
} from "../../src/animation/tripleKick.ts";
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
  readonly animScriptActive: boolean; readonly moveTurn: number;
  readonly visualTaskCount: number; readonly soundTaskCount: number;
  readonly tasks: readonly Task[]; readonly sprites: readonly Sprite[];
  readonly playerSprite: Sprite; readonly opponentSprite: Sprite;
  readonly battlers: unknown; readonly parties: unknown;
  readonly engine: { readonly currentMove: number };
  readonly immutableState: unknown; readonly animationRng: number;
  readonly softwareOam: readonly string[]; readonly hardwareOam: readonly string[];
  readonly fadedPalette: readonly number[]; readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly softwareMatrices: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly paletteTags: readonly number[]; readonly tileTags: readonly number[];
  readonly registers: { readonly dispcnt: number; readonly bldcnt: number; readonly bldalpha: number; readonly bldy: number };
  readonly se1: { readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] };
  readonly se2: { readonly songHeader: number; readonly tracks: readonly { readonly flags: number; readonly panX: number }[] };
};
type ProbeWindow = {
  readonly moveTurn: TripleKickMoveTurn;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly frames: readonly Frame[];
};
type Probe = {
  readonly schema: string; readonly moveId: number;
  readonly sourceSymbols: Readonly<Record<string, number>>;
  readonly componentSymbols: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<string, number>>;
  readonly topology: { readonly templates: readonly string[]; readonly callbacks: readonly string[]; readonly tasks: readonly string[] };
  readonly windows: readonly ProbeWindow[];
};
type WindowReceipt = {
  readonly moveTurn: TripleKickMoveTurn; readonly startFrame: number;
  readonly endFrame: number; readonly frameCount: number;
  readonly playerHp: number; readonly opponentHp: number; readonly targetIdleX2: number;
  readonly changeMap?: string; readonly changeMapSha256?: string;
  readonly acceptance?: { readonly sourceReducerMatching: number; readonly typedSeamMatching: number; readonly componentMatching: number; readonly framebufferMatching: number };
};
type OrientationReceipt = {
  readonly orientation: "player-back" | "opponent-front";
  readonly scenario: string; readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string; readonly rawRgbSha256: string;
  readonly branchRawRgbSha256: readonly string[];
  readonly windows: readonly WindowReceipt[];
};
type Receipt = {
  readonly schema: string; readonly oracleProfile: string; readonly move: string;
  readonly status: "checkpoint" | "exact"; readonly orientations: readonly OrientationReceipt[];
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const receiptPath = resolve(root, process.argv[2] ?? "tools/compare/fixtures/triple-kick-branch-receipts.json");
const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Receipt;
const FRAME_BYTES = 240 * 160 * 3;
const IDENTITY = [256, 0, 0, 256];
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
const sha = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");

function battlers(orientation: OrientationReceipt): Readonly<{ attacker: SceneOnPresentationBattler; target: SceneOnPresentationBattler }> {
  if (orientation.orientation === "player-back") {
    return {
      attacker: { species: "HITMONTOP", geometry: { side: "player", spriteCorner: { x: 40, y: 53 }, animationCenter: { x: 72, y: 85 }, battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } },
    };
  }
  return {
    attacker: { species: "HITMONTOP", geometry: { side: "opponent", spriteCorner: { x: 144, y: 13 }, animationCenter: { x: 176, y: 45 }, battlePositionCenter: { x: 176, y: 40 } } },
    target: { species: "ONIX", geometry: { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } } },
  };
}

function runFresh(orientation: OrientationReceipt) {
  const scratch = createScratchDir(`pokebench-triple-kick-${orientation.orientation}-`);
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), join(root, "tools/compare/tripleKickProbe.py"),
    resolve(root, orientation.scenario), output, rgbDir,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`${orientation.orientation}: fresh probe failed (${run.status})`);
  const bytes = readFileSync(output);
  const probe = JSON.parse(bytes.toString("utf8")) as Probe;
  const branches = probe.windows.map((window) => readBranchRgb(rgbDir, window.moveTurn));
  return { bytes, probe, branches, raw: Buffer.concat(branches), rgbDir, scratch };
}

function readBranchRgb(rgbDir: string, moveTurn: TripleKickMoveTurn): Buffer {
  const chunks: Buffer[] = [];
  for (let age = 0; age < 37; age += 1) {
    chunks.push(readFileSync(join(rgbDir, `turn-${moveTurn}`, `${String(age).padStart(3, "0")}.rgb`)));
  }
  return Buffer.concat(chunks);
}

function normalizedChangeMap(path: string, rgbDir: string, moveTurn: TripleKickMoveTurn): string {
  const run = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), join(rgbDir, `turn-${moveTurn}`)], { cwd: root, encoding: "utf8" });
  if (run.status !== 0) throw new Error(`turn ${moveTurn}: change-map generation failed`);
  const separator = run.stdout.indexOf(" — ");
  if (separator < 0) throw new Error(`turn ${moveTurn}: change-map header changed`);
  return `# ${basename(path)} raw RGB888 — ${run.stdout.slice(separator + 3)}`;
}

function stage(orientation: OrientationReceipt, window: WindowReceipt): SceneOnTripleKickConfig {
  const { attacker, target } = battlers(orientation);
  return {
    move: "TRIPLE_KICK", moveTurn: window.moveTurn, attacker, target,
    fieldProfile: {
      playerHp: window.playerHp, playerMaxHp: orientation.orientation === "player-back" ? 157 : 142,
      opponentHp: window.opponentHp, opponentMaxHp: orientation.orientation === "player-back" ? 142 : 157,
      playerGender: "male", opponentGender: "male",
    },
  };
}

function geometry(config: SceneOnTripleKickConfig): TripleKickGeometry {
  return { attackerSide: config.attacker.geometry.side, targetCenter: config.target.geometry.animationCenter };
}

function frameExact(app: Uint8Array, rgb: Buffer): boolean {
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== rgb[pixel * 3] || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) return false;
  }
  return true;
}

function frameDiff(app: Uint8Array, rgb: Buffer): string {
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] === rgb[pixel * 3] && app[pixel * 4 + 1] === rgb[pixel * 3 + 1]
      && app[pixel * 4 + 2] === rgb[pixel * 3 + 2]) continue;
    count += 1;
    const x = pixel % 240, y = Math.floor(pixel / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return `${count}px bbox ${minX},${minY}-${maxX},${maxY}`;
}

function validateWindow(orientation: OrientationReceipt, windowReceipt: WindowReceipt, window: ProbeWindow, rgb: Buffer, songHeader: number) {
  const failures: string[] = [];
  const config = stage(orientation, windowReceipt);
  const presentation = createSceneOnMovePresentation(config);
  const sourceGeometry = geometry(config);
  const first = window.frames[0]!;
  const attackerKey = config.attacker.geometry.side === "player" ? "playerSprite" : "opponentSprite";
  const targetKey = config.target.geometry.side === "player" ? "playerSprite" : "opponentSprite";
  let sourceReducer = 0, typedSeam = 0, component = 0, framebuffer = 0;
  for (const [age, oracle] of window.frames.entries()) {
    const rowFailures: string[] = [];
    const predicted = tripleKickAtAge(age, windowReceipt.moveTurn, sourceGeometry);
    const view = sceneOnTripleKickView({ ...presentation, age });
    const { age: _age, attacker: _attacker, target: _target, ...seamState } = view;
    if (same(predicted, seamState)) typedSeam += 1; else rowFailures.push("typed seam");
    if (oracle.animScriptActive !== predicted.active || oracle.engine.currentMove !== 167
      || oracle.moveTurn !== windowReceipt.moveTurn) rowFailures.push("script active/current move/branch");
    const attacker = oracle[attackerKey];
    const target = oracle[targetKey];
    if (attacker.x !== config.attacker.geometry.animationCenter.x || attacker.y !== config.attacker.geometry.animationCenter.y
      || attacker.x2 !== 0 || attacker.y2 !== 0) rowFailures.push("attacker OAM");
    const targetX2 = age < 10 ? windowReceipt.targetIdleX2 : predicted.targetX2;
    if (target.x2 !== targetX2 || target.y2 !== 0 || target.invisible !== predicted.targetOnMonBg) rowFailures.push("target OAM/monbg/ShakeMon");
    const feet = oracle.sprites.filter((sprite) => sprite.template.symbol === "gFistFootSpriteTemplate");
    const splats = oracle.sprites.filter((sprite) => sprite.template.symbol === "gBasicHitSplatSpriteTemplate");
    if (feet.length !== Number(predicted.foot !== null) || splats.length !== Number(predicted.hitsplat !== null)) rowFailures.push("sprite lifetime");
    if (predicted.foot && predicted.hitsplat) {
      const foot = feet[0], splat = splats[0];
      if (!foot || !splat || foot.slot !== 3 || splat.slot !== 4 || foot.x !== predicted.foot.x
        || foot.y !== predicted.foot.y || foot.animNum !== 1 || foot.data[0] !== predicted.foot.remaining
        || splat.x !== predicted.hitsplat.x || splat.y !== predicted.hitsplat.y
        || !same(splat.matrix, [predicted.hitsplat.matrix, 0, 0, predicted.hitsplat.matrix])) rowFailures.push("wide foot/hitsplat OAM/matrix/allocator");
    }
    const shakes = oracle.tasks.filter((task) => task.func.symbol === "AnimTask_ShakeMon_Step");
    if (shakes.length !== Number(predicted.shakeTaskActive)) rowFailures.push("ShakeMon lifetime");
    const spec = windowReceipt.moveTurn === 2 ? { x: 6 } : { x: 4 };
    if (shakes[0] && (shakes[0].data[2] !== 1 || shakes[0].data[4] !== spec.x || shakes[0].data[5] !== 0
      || shakes[0].data[0] !== target.slot)) rowFailures.push("ShakeMon task data");
    if (oracle.visualTaskCount !== feet.length + splats.length + shakes.length || oracle.soundTaskCount !== 0) rowFailures.push("visual/sound task counts");
    const handsTag = oracle.paletteTags.includes(10143) && oracle.tileTags.includes(10143);
    const impactTag = oracle.paletteTags.includes(10135) && oracle.tileTags.includes(10135);
    if (handsTag !== predicted.handsAndFeetLoaded || impactTag !== predicted.impactLoaded) rowFailures.push("resource tags");
    const alpha = predicted.alpha !== null;
    if (oracle.registers.dispcnt !== 0x3f40 || oracle.registers.bldcnt !== (alpha ? 0x3f40 : 0)
      || oracle.registers.bldalpha !== (alpha ? 0x080c : 0) || oracle.registers.bldy !== 0) rowFailures.push("display/blend registers");
    if (predicted.soundEvents.length) {
      const pan = config.target.geometry.side === "player" ? -63 : 63;
      if (oracle.se1.songHeader !== songHeader
        || !oracle.se1.tracks.some((track) => (track.flags & 0x80) !== 0 && track.panX === pan)) rowFailures.push("audio cue/pan");
    }
    if (oracle.se1.tracks.length !== 3 || oracle.se2.tracks.length !== 3) rowFailures.push("audio topology");
    if (!same(oracle.battlers, first.battlers) || !same(oracle.parties, first.parties)
      || !same(oracle.immutableState, first.immutableState)) rowFailures.push("immutable battle state");
    if (oracle.fadedPalette.length !== 512 || oracle.unfadedPalette.length !== 512 || oracle.hardwarePalette.length !== 512
      || oracle.paletteTags.length !== 16 || oracle.tileTags.length !== 128 || oracle.softwareOam.length !== 128
      || oracle.hardwareOam.length !== 128 || oracle.softwareMatrices.length !== 32 || oracle.hardwareMatrices.length !== 32) rowFailures.push("hardware inventory");
    const previous = age > 0 ? window.frames[age - 1]! : oracle;
    if (age > 0 && !same(oracle.hardwareOam, previous.softwareOam)) rowFailures.push("RAM+1 OAM latch");
    if (age > 0 && !same(oracle.hardwareMatrices, previous.softwareMatrices)) rowFailures.push("RAM+1 matrix latch");
    const previousPredicted = age > 0 ? tripleKickAtAge(age - 1, windowReceipt.moveTurn, sourceGeometry) : predicted;
    const paletteSource = predicted.targetOnMonBg && !previousPredicted.targetOnMonBg
      ? oracle.fadedPalette : previous.fadedPalette;
    if (!same(oracle.hardwarePalette, paletteSource)) rowFailures.push("source palette transfer latch");
    const frameRgb = rgb.subarray(age * FRAME_BYTES, (age + 1) * FRAME_BYTES);
    if (sha(frameRgb) !== oracle.sha256) rowFailures.push("frame RGB hash");
    if (!rowFailures.length) { sourceReducer += 1; component += 1; }
    else failures.push(`turn ${windowReceipt.moveTurn} age ${age}: ${rowFailures.join(", ")}`);
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...presentation, age } };
    const app = render(engine);
    if (frameExact(app, frameRgb)) framebuffer += 1;
    else failures.push(`turn ${windowReceipt.moveTurn} age ${age}: framebuffer ${frameDiff(app, frameRgb)}`);
  }
  return { sourceReducer, typedSeam, component, framebuffer, failures };
}

if (receipt.schema !== "triple-kick-branch-receipts/v1" || receipt.oracleProfile !== "battle-scene-on"
  || receipt.move !== "TRIPLE_KICK" || receipt.orientations.length !== 2) throw new Error("Triple Kick receipt contract changed");

for (const orientation of receipt.orientations) {
  const first = runFresh(orientation), second = runFresh(orientation);
  const failures: string[] = [];
  const evidence = sha(first.bytes), secondEvidence = sha(second.bytes);
  if (first.probe.schema !== "triple-kick-dense-evidence/v1" || second.probe.schema !== first.probe.schema
    || first.probe.moveId !== 167 || first.probe.windows.length !== 3 || second.probe.windows.length !== 3) failures.push("probe schema/move/windows");
  if (!same(first.probe.sourceSymbols, { Move_TRIPLE_KICK: 0x082d2293, TripleKickContinue: 0x082d22b3, TripleKickLeft: 0x082d22b8, TripleKickRight: 0x082d22ee, TripleKickCenter: 0x082d2324, Move_DYNAMIC_PUNCH: 0x082d235a })
    || !same(second.probe.sourceSymbols, first.probe.sourceSymbols)) failures.push("source pointer bounds");
  if (evidence !== secondEvidence || evidence !== orientation.evidenceSha256 || secondEvidence !== orientation.secondFreshEvidenceSha256) failures.push(`twice-fresh receipt ${evidence}/${secondEvidence}`);
  if (sha(first.raw) !== orientation.rawRgbSha256 || sha(second.raw) !== orientation.rawRgbSha256) failures.push("raw RGB aggregate");
  for (let turn = 0; turn < 3; turn += 1) {
    if (sha(first.branches[turn]!) !== orientation.branchRawRgbSha256[turn]
      || sha(second.branches[turn]!) !== orientation.branchRawRgbSha256[turn]) failures.push(`turn ${turn} raw RGB`);
  }
  const requiredComponents = ["gFistFootSpriteTemplate", "gBasicHitSplatSpriteTemplate", "AnimBasicFistOrFoot", "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step", "gBattleAnimSpriteGfx_HandsAndFeet", "gBattleAnimSpritePal_HandsAndFeet", "gBattleAnimSpriteGfx_Impact", "gBattleAnimSpritePal_Impact"];
  for (const probe of [first.probe, second.probe]) {
    if (!probe.topology.templates.includes("gFistFootSpriteTemplate") || !probe.topology.templates.includes("gBasicHitSplatSpriteTemplate")
      || !probe.topology.callbacks.includes("WaitAnimForDuration") || !probe.topology.callbacks.includes("RunStoredCallbackWhenAffineAnimEnds")
      || !probe.topology.tasks.includes("AnimTask_ShakeMon_Step") || requiredComponents.some((name) => !(name in probe.componentSymbols))) failures.push("source component topology");
  }
  for (const [index, windowReceipt] of orientation.windows.entries()) {
    const firstWindow = first.probe.windows[index]!, secondWindow = second.probe.windows[index]!;
    const denseWindow = { startFrame: windowReceipt.startFrame, endFrame: windowReceipt.endFrame, frameCount: windowReceipt.frameCount };
    if (windowReceipt.moveTurn !== index || !same(firstWindow.sourceWindow, denseWindow) || !same(secondWindow.sourceWindow, denseWindow)
      || firstWindow.frames.length !== 37 || secondWindow.frames.length !== 37) failures.push(`turn ${index} dense window`);
    if (windowReceipt.changeMap && windowReceipt.changeMapSha256) {
      const committed = readFileSync(resolve(root, windowReceipt.changeMap), "utf8");
      const firstMap = normalizedChangeMap(windowReceipt.changeMap, first.rgbDir, windowReceipt.moveTurn);
      const secondMap = normalizedChangeMap(windowReceipt.changeMap, second.rgbDir, windowReceipt.moveTurn);
      if (firstMap !== committed || secondMap !== committed || sha(committed) !== windowReceipt.changeMapSha256) failures.push(`turn ${index} normalized change map`);
    } else if (receipt.status === "exact") failures.push(`turn ${index} missing exact change map`);
    const firstRows = validateWindow(orientation, windowReceipt, firstWindow, first.branches[index]!, first.probe.songHeaders.SE_M_VITAL_THROW2!);
    const secondRows = validateWindow(orientation, windowReceipt, secondWindow, second.branches[index]!, second.probe.songHeaders.SE_M_VITAL_THROW2!);
    const expected = windowReceipt.acceptance ?? { sourceReducerMatching: 37, typedSeamMatching: 37, componentMatching: 37, framebufferMatching: 37 };
    for (const [run, rows] of [[1, firstRows], [2, secondRows]] as const) {
      if (rows.sourceReducer !== expected.sourceReducerMatching || rows.typedSeam !== expected.typedSeamMatching
        || rows.component !== expected.componentMatching || rows.framebuffer !== expected.framebufferMatching) failures.push(`turn ${index} run ${run}: ${rows.sourceReducer}/${rows.typedSeam}/${rows.component}/${rows.framebuffer}`);
      failures.push(...rows.failures.map((failure) => `run ${run}: ${failure}`));
    }
    console.log(`${orientation.orientation} turn ${index}: reducer ${firstRows.sourceReducer}/37, seam ${firstRows.typedSeam}/37, components ${firstRows.component}/37, framebuffer ${firstRows.framebuffer}/37; twice fresh`);
  }
  if (failures.length) {
    console.error(failures.slice(0, 120).join("\n"));
    console.error(`scratch: ${first.scratch}\n${second.scratch}`);
    throw new Error(`${orientation.orientation}: Triple Kick exact acceptance failed`);
  }
}
