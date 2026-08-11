import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnDisableView,
  type SceneOnDisableConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Fixture extends SceneOnDisableConfig {
  readonly schema: string;
  readonly oracleProfile: string;
  readonly orientation: "player-back" | "opponent-front";
  readonly scenario: string;
  readonly probe: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly sourceBounds: { readonly start: string; readonly endExclusive: string };
  readonly probeJsonSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
}
interface Sprite {
  readonly slot: number;
  readonly attr: readonly number[];
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly invisible: boolean;
  readonly subpriority: number;
  readonly matrix: readonly number[];
  readonly template: { readonly address: number; readonly symbol: string | null };
}
interface Task {
  readonly function: { readonly address: number; readonly symbol: string | null };
  readonly data: readonly number[];
}
interface Frame {
  readonly frame: number;
  readonly sha256: string;
  readonly script: { readonly active: boolean; readonly inBounds: boolean };
  readonly sparkles: readonly Sprite[];
  readonly activeTasks: readonly Task[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly battlers: readonly Sprite[];
  readonly hardwareOam: readonly (readonly number[])[];
  readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly registers: { readonly dispcnt: number; readonly bldcnt: number; readonly bldalpha: number };
  readonly battle: Record<string, Record<string, unknown>>;
}
interface Probe {
  readonly schema: string;
  readonly sourceBounds: { readonly start: number; readonly endExclusive: number };
  readonly templates: { readonly sparkle: number };
  readonly taskFuncs: Record<string, number>;
  readonly songHeaders: Record<string, number>;
  readonly frames: readonly Frame[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const args = process.argv.slice(2);
if (args.length !== 2) throw new Error("usage: disablePortable.ts <player-fixture> <opponent-fixture>");
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const stableBattle = (battle: Frame["battle"]) => Object.fromEntries(
  ["player", "opponent"].map((side) => [side, {
    species: battle[side]!.species,
    hp: battle[side]!.hp,
    maxHp: battle[side]!.maxHp,
    item: battle[side]!.item,
    status1: battle[side]!.status1,
    status2: battle[side]!.status2,
    status3: battle[side]!.status3,
    statStages: battle[side]!.statStages,
  }]),
);
function framebufferDiff(app: Uint8ClampedArray, raw: Buffer): number {
  let differing = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== raw[pixel * 3]
      || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) differing += 1;
  }
  return differing;
}

const fresh = new Map<string, { readonly probe: string; readonly raw: string; readonly map: string }>();
for (let runNumber = 1; runNumber <= 2; runNumber += 1) for (const fixturePath of args) {
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8")) as Fixture;
  const scratch = createScratchDir("pokebench-disable-");
  const output = join(scratch, "probe.json");
  const rgb = join(scratch, "rgb");
  // Pass a relative .py command: run-mgba-probe routes it through the
  // harness mGBA interpreter and validates the known teardown SIGSEGV.
  const run = spawnSync("python3", [
    join(root, "tools/run-mgba-probe.py"), output, "--",
    fixture.probe, fixture.scenario, output, rgb,
  ], { cwd: root, encoding: "utf8" });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) process.exit(run.status ?? 1);

  const receiptBytes = readFileSync(output);
  const probe = JSON.parse(receiptBytes.toString("utf8")) as Probe;
  const probeHash = createHash("sha256").update(receiptBytes).digest("hex");
  if (probe.schema !== "disable-dense-evidence/v1"
    || probe.frames.length !== fixture.sourceWindow.frameCount
    || probe.frames[0]!.frame !== fixture.sourceWindow.startFrame
    || probe.frames.at(-1)!.frame !== fixture.sourceWindow.endFrame
    || probe.sourceBounds.start !== Number.parseInt(fixture.sourceBounds.start, 16)
    || probe.sourceBounds.endExclusive !== Number.parseInt(fixture.sourceBounds.endExclusive, 16)
    || probe.taskFuncs.AnimTask_GrowAndGrayscale !== 0x081045b0
    || probe.taskFuncs.AnimTask_GrowAndGrayscale_Step !== 0x08104614
    || probe.songHeaders.SE_M_DETECT === undefined
    || probe.songHeaders.SE_M_BIND === undefined
    || probeHash !== fixture.probeJsonSha256) {
    throw new Error(`${fixture.orientation}: dense source receipt drift`);
  }

  const stage = createSceneOnMovePresentation<SceneOnDisableConfig>({
    move: "DISABLE",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile,
  });
  const targetIndex = fixture.attacker.geometry.side === "player" ? 1 : 0;
  const initialBattle = stableBattle(probe.frames[0]!.battle);
  let sparkleBaseTile: number | null = null;
  let component = 0;
  let seam = 0;
  let hardware = 0;
  let framebuffer = 0;
  const rawHash = createHash("sha256");
  const failures: string[] = [];
  for (let index = 0; index < probe.frames.length; index += 1) {
    const row = probe.frames[index]!;
    const age = row.frame - fixture.sourceWindow.startFrame;
    const view = sceneOnDisableView({ ...stage, age });
    const target = row.battlers[targetIndex]!;
    const sparkle = row.sparkles[0];
    if (sparkle && sparkleBaseTile === null) sparkleBaseTile = sparkle.attr[2]! & 0x3ff;
    const sparkleOffset = sparkle && sparkleBaseTile !== null
      ? (sparkle.attr[2]! & 0x3ff) - sparkleBaseTile
      : null;
    const sparkleExact = view.sparkle === null
      ? sparkle === undefined
      : sparkle !== undefined
        && sparkle.template.address === probe.templates.sparkle
        && sparkle.x === view.sparkle.x
        && sparkle.y === view.sparkle.y
        && sparkle.subpriority === view.sparkle.subpriority
        && sparkleOffset === view.sparkle.tileOffset;
    const growTask = row.activeTasks.find(
      (task) => task.function.symbol === "AnimTask_GrowAndGrayscale_Step",
    );
    const growExact = view.targetScale === null
      ? growTask === undefined && target.matrix[0] === 256
      : growTask !== undefined
        && growTask.data[0] === 103 - age
        && target.matrix[0] === view.targetScale.xScale
        && target.matrix[3] === view.targetScale.yScale
        && (target.attr[0]! & 0x0c00) === 0x0400;
    const monbgTask = row.activeTasks.some(
      (task) => task.function.symbol === "Task_UpdateMonBg",
    );
    const loopSound = row.activeTasks.find(
      (task) => task.function.symbol === "Task_LoopAndPlaySE",
    );
    const expectedPan = fixture.attacker.geometry.side === "player" ? 63 : -63;
    const soundExact = view.soundTaskCount === 0
      ? loopSound === undefined
      : loopSound !== undefined
        && loopSound.data[0] === 170
        && loopSound.data[1] === expectedPan
        && loopSound.data[2] === 15;
    const alphaExact = view.alpha === null
      ? row.registers.bldcnt === 0 && row.registers.bldalpha === 0
      : row.registers.bldcnt === 0x3f40
        && row.registers.bldalpha === 0x0808;
    const componentExact = sparkleExact
      && growExact
      && monbgTask === view.targetInMonBg
      && target.invisible === view.targetObjHidden
      && soundExact
      && row.visualTaskCount === view.visualTaskCount
      && row.soundTaskCount === view.soundTaskCount
      && alphaExact
      && row.script.inBounds
      && same(stableBattle(row.battle), initialBattle);
    if (componentExact) component += 1;
    if (same(view, sceneOnDisableView({ ...stage, age }))) seam += 1;

    const displayedScale = view.displayedTargetScale;
    const prior = probe.frames[index - 1];
    // The measured scaled/original-palette tail uses the OAM/matrix from two
    // RAM ages earlier (age 103 at display age 105); all ordinary scanout
    // rows use the preceding RAM age.
    const scanoutRow = displayedScale?.grayscale === false
      ? probe.frames[index - 2]
      : prior;
    const scanoutTarget = scanoutRow?.battlers[targetIndex];
    const oam = !displayedScale || !scanoutTarget
      || row.hardwareOam.some((entry) => same(entry, scanoutTarget.attr));
    const matrixNum = scanoutTarget ? ((scanoutTarget.attr[1]! >> 9) & 0x1f) : 0;
    const matrix = !displayedScale || !scanoutTarget
      || same(row.hardwareMatrices[matrixNum], scanoutTarget.matrix);
    // Palette/OAM scanout is one display behind RAM.  Every in-window
    // palette row after the baseline matches the preceding faded buffer.
    // `monbg`'s initial BG transfer has not reached the hardware palette on
    // its creation row; subsequent palette writes use the normal +1 latch.
    const palette = !prior || age <= 4 || same(row.hardwarePalette, prior.fadedPalette);
    const shapes = row.hardwareOam.length === 128
      && row.hardwareMatrices.length === 32
      && row.fadedPalette.length === 512
      && row.unfadedPalette.length === 512
      && row.hardwarePalette.length === 512;
    const hardwareExact = oam && matrix && palette && shapes;
    if (hardwareExact) hardware += 1;

    const raw = readFileSync(join(rgb, `${String(row.frame).padStart(5, "0")}.rgb`));
    rawHash.update(raw);
    if (createHash("sha256").update(raw).digest("hex") !== row.sha256) {
      throw new Error(`${fixture.orientation}: raw frame receipt drift`);
    }
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    };
    const diff = framebufferDiff(render(engine), raw);
    if (diff === 0) framebuffer += 1;
    if (!componentExact || !hardwareExact || diff !== 0) {
      failures.push(`${row.frame}/age${age}: component=${componentExact} hardware=${hardwareExact} framebufferDiff=${diff}`);
    }
  }
  const rawDigest = rawHash.digest("hex");
  const mapRun = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgb], {
    cwd: root,
    encoding: "utf8",
  });
  if (mapRun.status !== 0) throw new Error(`${fixture.orientation}: change-map generation failed`);
  const map = mapRun.stdout.replace(/^# .* —/, `# MOVE_DISABLE ${fixture.orientation} —`);
  const mapHash = createHash("sha256").update(map).digest("hex");
  if (rawDigest !== fixture.rawRgbSha256
    || mapHash !== fixture.changeMapSha256
    || map !== readFileSync(resolve(root, fixture.changeMap), "utf8")) {
    throw new Error(`${fixture.orientation}: RGB/change-map receipt drift`);
  }
  const receipt = { probe: probeHash, raw: rawDigest, map: mapHash };
  if (fresh.has(fixture.orientation) && !same(fresh.get(fixture.orientation), receipt)) {
    throw new Error(`${fixture.orientation}: fresh receipts differ`);
  }
  fresh.set(fixture.orientation, receipt);
  console.log(`${fixture.orientation} run ${runNumber}: component ${component}/113; seam ${seam}/113; hardware ${hardware}/113; framebuffer ${framebuffer}/113; probe=${probeHash}; raw=${rawDigest}`);
  if (failures.length) throw new Error(failures.slice(0, 32).join("\n"));
}
