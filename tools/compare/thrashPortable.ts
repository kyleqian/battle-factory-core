import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
  createSceneOnMovePresentation,
  sceneOnThrashDisplayedTargetOffset,
  sceneOnThrashView,
  type SceneOnThrashConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  thrashAffineYOffset,
  thrashAtAge,
  thrashDisplayedTargetOffsetAtAge,
  type ThrashGeometry,
  type ThrashRandomWords,
} from "../../src/animation/thrash.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";

type Side = "player" | "opponent";
type Matrix = readonly [number, number, number, number];
type Ident = { readonly address: number; readonly symbol: string | null };
type Sprite = {
  readonly slot: number;
  readonly template: Ident;
  readonly callback: Ident;
  readonly attr: readonly number[];
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly data: readonly number[];
  readonly raw: string;
  readonly animNum: number;
  readonly matrix: Matrix;
  readonly hardwareMatrix: Matrix;
};
type Task = { readonly func: Ident; readonly data: readonly number[]; readonly raw: string };
type Frame = {
  readonly frame: number;
  readonly scriptOffset: number | null;
  readonly animScriptActive: boolean;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly Task[];
  readonly sprites: readonly Sprite[];
  readonly playerSprite: Sprite;
  readonly opponentSprite: Sprite;
  readonly battlers: unknown;
  readonly parties: unknown;
  readonly immutableState: unknown;
  readonly engine: { readonly currentMove: number };
  readonly softwareOam: readonly string[];
  readonly hardwareOam: readonly string[];
  readonly spriteOrder: readonly number[];
  readonly softwareMatrices: readonly Matrix[];
  readonly hardwareMatrices: readonly Matrix[];
  readonly fadedPalette: readonly number[];
  readonly unfadedPalette: readonly number[];
  readonly hardwarePalette: readonly number[];
  readonly paletteTags: readonly number[];
  readonly tileTags: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly backgroundPositions: Readonly<Record<string, number>>;
  readonly se1: {
    readonly songHeader: number;
    readonly status: number;
    readonly tracks: readonly { readonly flags: number; readonly panX: number }[];
  };
  readonly se2: { readonly status: number };
};
type Probe = {
  readonly schema: "thrash-dense-evidence/v1";
  readonly moveId: number;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly sourceSymbols: Readonly<Record<string, number>>;
  readonly componentSymbols: Readonly<Record<string, number>>;
  readonly songHeaders: Readonly<Record<"SE_M_COMET_PUNCH" | "SE_M_VITAL_THROW2" | "SE_M_MEGA_KICK2", number>>;
  readonly lifecycleCounts: Readonly<Record<string, number>>;
  readonly topology: { readonly templates: readonly string[]; readonly callbacks: readonly string[]; readonly tasks: readonly string[] };
  readonly frames: readonly Frame[];
};
type Battler = {
  readonly species: string;
  readonly geometry: {
    readonly side: Side;
    readonly spriteCorner: Readonly<{ x: number; y: number }>;
    readonly animationCenter: Readonly<{ x: number; y: number }>;
    readonly battlePositionCenter: Readonly<{ x: number; y: number }>;
  };
};
type Fixture = {
  readonly schema: "thrash-portable-exact/v2";
  readonly oracleProfile: "battle-scene-on";
  readonly move: "THRASH";
  readonly orientation: "player-back" | "opponent-front";
  readonly pair: string;
  readonly scenario: string;
  readonly probe: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: 103 };
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMap: string;
  readonly changeMapSha256: string;
  readonly attackerSide: Side;
  readonly targetSide: Side;
  readonly targetIdleX2: number;
  readonly attackerPicYOffset: number;
  readonly attacker: Battler;
  readonly target: Battler;
  readonly fieldProfile: Record<string, unknown>;
  readonly fistRandom: readonly [ThrashRandomWords, ThrashRandomWords, ThrashRandomWords];
  readonly latches: {
    readonly softwareOamToHardware: "RAM+1";
    readonly softwarePaletteToHardware: "RAM+1";
    readonly fistFootAndChildPlainOam: "RAM+1";
    readonly thrashHorizontalAffine: "RAM+2";
    readonly thrashVerticalPosition: "RAM+1";
    readonly shakeMonInPlace: {
      readonly rule: "RAM+2 target-outline pixels outside fist/hitsplat OAM bounds";
      readonly schedules: readonly {
        readonly invocation: "4/0/7/1 #1" | "4/0/7/1 #2" | "8/0/16/1";
        readonly matchesByRamLag: readonly [number, number, number];
        readonly samples: number;
      }[];
    };
  };
  readonly acceptance: {
    readonly status: "exact";
    readonly sourceReducerMatching: 103;
    readonly typedSeamMatching: 103;
    readonly componentMatching: 103;
    readonly framebufferMatching: 103;
  };
};

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const fixturePaths = process.argv.slice(2);
if (!fixturePaths.length) fixturePaths.push(
  "tools/compare/fixtures/thrash-player-tauros-opponent-onix.json",
  "tools/compare/fixtures/thrash-opponent-tauros-player-onix.json",
);
const FRAME_BYTES = 240 * 160 * 3;
const IDENTITY: Matrix = [256, 0, 0, 256];
const sha = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

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

function runFresh(fixture: Fixture): {
  readonly bytes: Buffer;
  readonly probe: Probe;
  readonly rgbDir: string;
  readonly raw: Buffer;
  readonly changeMap: string;
  readonly scratch: string;
} {
  const scratch = createScratchDir(`pokebench-thrash-${fixture.orientation}-`);
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
  return {
    bytes,
    probe,
    rgbDir,
    raw,
    changeMap: normalizedChangeMap(fixture, rgbDir),
    scratch,
  };
}

function geometry(fixture: Fixture): ThrashGeometry {
  return {
    attackerSide: fixture.attackerSide,
    targetSide: fixture.targetSide,
    targetCenter: fixture.target.geometry.animationCenter,
    targetDimensions: { width: 56, height: 64 },
    fistRandom: fixture.fistRandom,
  };
}

function stage(fixture: Fixture) {
  return createSceneOnMovePresentation<SceneOnThrashConfig>({
    move: "THRASH",
    attacker: fixture.attacker,
    target: fixture.target,
    fieldProfile: fixture.fieldProfile as never,
    fistRandom: fixture.fistRandom,
  });
}

function targetPan(side: Side): number {
  return side === "player" ? -63 : 63;
}

function templateSprites(frame: Frame, symbol: string): readonly Sprite[] {
  return frame.sprites.filter((sprite) => sprite.template.symbol === symbol);
}

function task(frame: Frame, symbol: string): Task | undefined {
  return frame.tasks.find((entry) => entry.func.symbol === symbol);
}

function frameExact(app: Uint8Array, rgb: Buffer): boolean {
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== rgb[pixel * 3]
      || app[pixel * 4 + 1] !== rgb[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== rgb[pixel * 3 + 2]) return false;
  }
  return true;
}

/**
 * Re-proves the displayed target motion without treating OAM as pixels.  The
 * target palette witness excludes the complete 32x32 fist/hitsplat OAM box;
 * every invocation must independently choose RAM+2 over RAM+1.
 */
function shakePixelSchedules(
  probe: Probe,
  raw: Buffer,
  fixture: Fixture,
): Fixture["latches"]["shakeMonInPlace"]["schedules"] {
  const targetKey = fixture.orientation === "player-back" ? "opponentSprite" : "playerSprite";
  const initial = probe.frames[0]!;
  const target = initial[targetKey];
  const paletteBank = (target.attr[2]! >> 12) & 15;
  const colors = new Set(initial.hardwarePalette.slice(256 + paletteBank * 16 + 1, 256 + paletteBank * 16 + 16)
    .map((color) => {
      const channel = (value: number): number => (value << 3) | (value >> 2);
      return `${channel(color & 31)},${channel((color >> 5) & 31)},${channel((color >> 10) & 31)}`;
    }));
  const baseX = target.x + target.x2;
  const baseY = target.y + target.y2;
  const firstRgb = raw.subarray(0, FRAME_BYTES);
  const witness: [number, number, number, number, number][] = [];
  for (let y = baseY - 32; y < baseY + 32; y += 1) {
    for (let x = baseX - 32; x < baseX + 32; x += 1) {
      const index = (y * 240 + x) * 3;
      if (colors.has(`${firstRgb[index]},${firstRgb[index + 1]},${firstRgb[index + 2]}`)) {
        witness.push([x, y, firstRgb[index]!, firstRgb[index + 1]!, firstRgb[index + 2]!]);
      }
    }
  }
  if (witness.length < 2_000) throw new Error(`${fixture.orientation}: sparse target witness`);
  const active = probe.frames.map((frame) => task(frame, "AnimTask_ShakeMonInPlace_Step") !== undefined);
  const runs: { start: number; end: number }[] = [];
  for (let age = 0; age < active.length; age += 1) {
    if (!active[age] || active[age - 1]) continue;
    let end = age;
    while (active[end + 1]) end += 1;
    runs.push({ start: age, end: Math.min(end + 2, active.length - 1) });
  }
  if (runs.length !== 3) throw new Error(`${fixture.orientation}: expected three ShakeMonInPlace runs`);
  const names = ["4/0/7/1 #1", "4/0/7/1 #2", "8/0/16/1"] as const;
  return runs.map((run, index) => {
    const painter = probe.frames.slice(run.start, run.end + 1).flatMap((frame) => templateSprites(frame, "gFistFootRandomPosSpriteTemplate"))[0];
    if (!painter) throw new Error(`${fixture.orientation}: ${names[index]} has no fist painter`);
    const left = painter.x + painter.x2 - 16;
    const top = painter.y + painter.y2 - 16;
    const matches = [0, 0, 0];
    let samples = 0;
    for (let age = run.start; age <= run.end; age += 1) {
      const displayed = raw.subarray(age * FRAME_BYTES, (age + 1) * FRAME_BYTES);
      for (let lag = 0; lag <= 2; lag += 1) {
        const source = probe.frames[Math.max(0, age - lag)]![targetKey];
        const dx = source.x + source.x2 - baseX;
        const dy = source.y + source.y2 - baseY;
        for (const [x, y, red, green, blue] of witness) {
          const displayX = x + dx;
          const displayY = y + dy;
          if (displayX >= left && displayX < left + 32 && displayY >= top && displayY < top + 32) continue;
          const offset = (displayY * 240 + displayX) * 3;
          if (displayed[offset] === red && displayed[offset + 1] === green && displayed[offset + 2] === blue) {
            matches[lag]! += 1;
          }
          if (lag === 0) samples += 1;
        }
      }
    }
    if (matches[2]! / samples < 0.9 || matches[2]! - matches[1]! < samples * 0.2) {
      throw new Error(`${fixture.orientation}: ${names[index]} did not prove RAM+2 target pixels`);
    }
    return { invocation: names[index]!, matchesByRamLag: matches as [number, number, number], samples };
  });
}

function validateRows(
  fixture: Fixture,
  fresh: ReturnType<typeof runFresh>,
): { readonly sourceReducer: number; readonly typedSeam: number; readonly component: number; readonly framebuffer: number; readonly failures: readonly string[] } {
  const failures: string[] = [];
  const sourceGeometry = geometry(fixture);
  const presentation = stage(fixture);
  const first = fresh.probe.frames[0]!;
  const attackerKey = fixture.attackerSide === "player" ? "playerSprite" : "opponentSprite";
  const targetKey = fixture.targetSide === "player" ? "playerSprite" : "opponentSprite";
  let sourceReducer = 0;
  let typedSeam = 0;
  let component = 0;
  let framebuffer = 0;
  for (const [age, oracle] of fresh.probe.frames.entries()) {
    const rowFailures: string[] = [];
    const predicted = thrashAtAge(age, sourceGeometry);
    const view = sceneOnThrashView({ ...presentation, age });
    const { age: _age, attacker: _attacker, target: _target, ...seamState } = view;
    if (same(predicted, seamState)) typedSeam += 1;
    else rowFailures.push("typed seam");
    if (oracle.animScriptActive !== predicted.active || oracle.engine.currentMove !== 37) rowFailures.push("script active/current move");
    const attacker = oracle[attackerKey];
    const target = oracle[targetKey];
    const expectedAttackerX = fixture.attacker.geometry.animationCenter.x + predicted.attackerPosition.x;
    const expectedAttackerY = fixture.attacker.geometry.animationCenter.y + predicted.attackerPosition.y;
    const expectedAttackerY2 = predicted.horizontalTaskActive
      ? thrashAffineYOffset(predicted.attackerMatrix.d, fixture.attackerPicYOffset)
      : 0;
    if (attacker.x !== expectedAttackerX || attacker.y !== expectedAttackerY
      || attacker.x2 !== 0 || attacker.y2 !== expectedAttackerY2
      || !same(attacker.matrix, [predicted.attackerMatrix.a, 0, 0, predicted.attackerMatrix.d])) {
      rowFailures.push("attacker source position/matrix");
    }
    if (target.x2 !== fixture.targetIdleX2 + predicted.targetOffset.x2 || target.y2 !== 0) {
      rowFailures.push("target source x2");
    }
    const fists = templateSprites(oracle, "gFistFootRandomPosSpriteTemplate");
    const splats = templateSprites(oracle, "gBasicHitSplatSpriteTemplate");
    if (fists.length !== predicted.fists.length || splats.length !== predicted.hitsplats.length) {
      rowFailures.push("fist/hitsplat lifetime");
    }
    for (const [index, expected] of predicted.fists.entries()) {
      const fist = fists[index];
      const splat = splats[index];
      if (!fist || !splat || fist.slot !== expected.slot || splat.slot !== expected.childSlot
        || fist.x !== expected.x || fist.y !== expected.y || fist.animNum !== expected.animation
        || fist.data[0] !== expected.remaining || splat.x !== expected.x || splat.y !== expected.y
        || !same(splat.matrix, IDENTITY) || !same(splat.hardwareMatrix, IDENTITY)) {
        rowFailures.push("fist/hitsplat OAM/allocator/matrix");
      }
    }
    const horizontal = task(oracle, "AnimTask_ThrashMoveMonHorizontal_Step");
    const vertical = task(oracle, "AnimTask_ThrashMoveMonVertical_Step");
    const shake = task(oracle, "AnimTask_ShakeMonInPlace_Step");
    if (Boolean(horizontal) !== predicted.horizontalTaskActive || Boolean(vertical) !== predicted.verticalTaskActive
      || Boolean(shake) !== Boolean(predicted.shakeTask)) rowFailures.push("task lifetime");
    if (horizontal && (horizontal.data[10] !== predicted.attackerMatrix.a || horizontal.data[11] !== predicted.attackerMatrix.d)) {
      rowFailures.push("horizontal task matrix");
    }
    if (vertical && (vertical.data[5] !== fixture.attacker.geometry.animationCenter.x
      || vertical.data[6] !== fixture.attacker.geometry.animationCenter.y)) rowFailures.push("vertical task base");
    if (shake && predicted.shakeTask && (shake.data[2] !== predicted.shakeTask.numShakes
      || shake.data[4] !== predicted.shakeTask.frameDelay
      || shake.data[5] !== predicted.shakeTask.xOffset * 2
      || shake.data[6] !== 0)) rowFailures.push("ShakeMonInPlace task args");
    const impactTag = oracle.paletteTags.includes(10135) && oracle.tileTags.includes(10135);
    const handsTag = oracle.paletteTags.includes(10143) && oracle.tileTags.includes(10143);
    if (impactTag !== predicted.impactLoaded || handsTag !== predicted.handsAndFeetLoaded) rowFailures.push("resource tags");
    if (oracle.registers.bldcnt !== 0 || oracle.registers.bldalpha !== 0 || oracle.registers.bldy !== 0) rowFailures.push("blend registers");
    if (oracle.fadedPalette.length !== 512 || oracle.unfadedPalette.length !== 512 || oracle.hardwarePalette.length !== 512
      || oracle.paletteTags.length !== 16 || oracle.tileTags.length !== 128 || oracle.softwareOam.length !== 128
      || oracle.hardwareOam.length !== 128 || oracle.softwareMatrices.length !== 32 || oracle.hardwareMatrices.length !== 32
      || oracle.spriteOrder.length !== 64) rowFailures.push("hardware inventory");
    const event = predicted.soundEvents[0];
    if (event) {
      const activeTrack = oracle.se1.tracks.some((track) => (track.flags & 0x80) !== 0 && track.panX === targetPan(fixture.targetSide));
      if (oracle.se1.songHeader !== fresh.probe.songHeaders[event.song] || !activeTrack) rowFailures.push("audio cue/pan");
    }
    if (!same(oracle.battlers, first.battlers) || !same(oracle.parties, first.parties)
      || !same(oracle.immutableState, first.immutableState)) rowFailures.push("immutable battle state");
    if (age > 0 && !same(oracle.hardwareOam, fresh.probe.frames[age - 1]!.softwareOam)) rowFailures.push("RAM+1 OAM latch");
    if (age > 0 && !same(oracle.hardwarePalette, fresh.probe.frames[age - 1]!.fadedPalette)) rowFailures.push("RAM+1 palette latch");
    if (age > 1 && !same(attacker.hardwareMatrix, fresh.probe.frames[age - 2]![attackerKey].matrix)) rowFailures.push("RAM+2 horizontal matrix latch");
    if (!rowFailures.length) {
      sourceReducer += 1;
      component += 1;
    } else {
      failures.push(`age ${age}: ${rowFailures.join(", ")}`);
    }
    const rgb = fresh.raw.subarray(age * FRAME_BYTES, (age + 1) * FRAME_BYTES);
    const engine: EngineState = {
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...presentation, age },
    };
    if (frameExact(render(engine), rgb)) framebuffer += 1;
    else failures.push(`age ${age}: framebuffer`);
    const displayedTarget = sceneOnThrashDisplayedTargetOffset({ ...presentation, age });
    if (!same(displayedTarget, thrashDisplayedTargetOffsetAtAge(age, sourceGeometry))) {
      failures.push(`age ${age}: typed target display seam`);
    }
  }
  return { sourceReducer, typedSeam, component, framebuffer, failures };
}

const coverage = readFileSync(join(root, "ANIMATION_COVERAGE.json"), "utf8");
if (!coverage.includes("MOVE_THRASH exact")) {
  throw new Error("THRASH coverage has not recorded exact promotion");
}
if (!coverage.includes("MOVE_DOUBLE_KICK remains independently unsupported")) {
  throw new Error("THRASH promotion widened into DOUBLE_KICK");
}

for (const fixturePath of fixturePaths) {
  const fixture = JSON.parse(readFileSync(resolve(root, fixturePath), "utf8")) as Fixture;
  const first = runFresh(fixture);
  const second = runFresh(fixture);
  const evidenceFailures: string[] = [];
  const evidence = sha(first.bytes);
  if (fixture.schema !== "thrash-portable-exact/v2" || fixture.oracleProfile !== "battle-scene-on" || fixture.move !== "THRASH") evidenceFailures.push("fixture contract");
  if (first.probe.schema !== "thrash-dense-evidence/v1" || second.probe.schema !== first.probe.schema || first.probe.moveId !== 37) evidenceFailures.push("probe schema/move");
  if (!same(first.probe.sourceWindow, fixture.denseWindow) || !same(second.probe.sourceWindow, fixture.denseWindow)
    || first.probe.frames.length !== 103 || second.probe.frames.length !== 103) evidenceFailures.push("dense 103-frame window");
  if (!same(first.probe.sourceSymbols, { Move_THRASH: 0x082cc981, Move_SING: 0x082cca00 })
    || !same(second.probe.sourceSymbols, first.probe.sourceSymbols)) evidenceFailures.push("source pointer bounds");
  if (evidence !== sha(second.bytes) || evidence !== fixture.evidenceSha256 || sha(second.bytes) !== fixture.secondFreshEvidenceSha256) evidenceFailures.push("twice-fresh receipt");
  if (rawRgbHash(first.probe, first.rgbDir) !== fixture.rawRgbSha256 || rawRgbHash(second.probe, second.rgbDir) !== fixture.rawRgbSha256) evidenceFailures.push("raw RGB");
  const committedMap = readFileSync(resolve(root, fixture.changeMap), "utf8");
  if (first.changeMap !== committedMap || second.changeMap !== committedMap || sha(committedMap) !== fixture.changeMapSha256) evidenceFailures.push("normalized change map");
  const firstShake = shakePixelSchedules(first.probe, first.raw, fixture);
  const secondShake = shakePixelSchedules(second.probe, second.raw, fixture);
  if (!same(firstShake, secondShake) || !same(firstShake, fixture.latches.shakeMonInPlace.schedules)) evidenceFailures.push("three independent RAM+2 shake witnesses");
  const requiredTasks = ["AnimTask_ShakeMonInPlace_Step", "AnimTask_ThrashMoveMonHorizontal_Step", "AnimTask_ThrashMoveMonVertical_Step"];
  const requiredComponents = ["gFistFootRandomPosSpriteTemplate", "gBasicHitSplatSpriteTemplate", "AnimFistOrFootRandomPos", "AnimFistOrFootRandomPos_Step", "AnimTask_ShakeMonInPlace", "AnimTask_ShakeMonInPlace_Step", "AnimTask_ThrashMoveMonHorizontal", "AnimTask_ThrashMoveMonHorizontal_Step", "AnimTask_ThrashMoveMonVertical", "AnimTask_ThrashMoveMonVertical_Step"];
  for (const probe of [first.probe, second.probe]) {
    if (requiredTasks.some((name) => !probe.topology.tasks.includes(name))
      || !probe.topology.templates.includes("gFistFootRandomPosSpriteTemplate")
      || !probe.topology.templates.includes("gBasicHitSplatSpriteTemplate")
      || requiredComponents.some((name) => !(name in probe.componentSymbols))
      || !same(probe.lifecycleCounts, { gFistFootRandomPosSpriteTemplate: 3, gBasicHitSplatSpriteTemplate: 3 })) {
      evidenceFailures.push("source component topology");
    }
  }
  const firstRows = validateRows(fixture, first);
  const secondRows = validateRows(fixture, second);
  for (const [run, result] of [[1, firstRows], [2, secondRows]] as const) {
    if (result.sourceReducer !== fixture.acceptance.sourceReducerMatching
      || result.typedSeam !== fixture.acceptance.typedSeamMatching
      || result.component !== fixture.acceptance.componentMatching
      || result.framebuffer !== fixture.acceptance.framebufferMatching) {
      evidenceFailures.push(`run ${run}: ${result.sourceReducer}/${result.typedSeam}/${result.component}/${result.framebuffer}`);
    }
    evidenceFailures.push(...result.failures.map((failure) => `run ${run}: ${failure}`));
  }
  console.log(`${fixture.orientation}: reducer ${firstRows.sourceReducer}/103, seam ${firstRows.typedSeam}/103, components ${firstRows.component}/103, framebuffer ${firstRows.framebuffer}/103; twice fresh`);
  if (evidenceFailures.length) {
    console.error(evidenceFailures.slice(0, 80).join("\n"));
    console.error(`scratch: ${first.scratch}\n${second.scratch}`);
    throw new Error(`${fixture.orientation}: Thrash exact acceptance failed`);
  }
}
