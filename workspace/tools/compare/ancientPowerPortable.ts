import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  ancientPowerAtAge,
  ANCIENT_POWER_ATTACKER_SHAKE,
  ANCIENT_POWER_COMPONENTS,
  ANCIENT_POWER_TARGET_SHAKE,
} from "../../src/animation/ancientPower.ts";
import {
  validateAncientPowerProbeSurface,
  type AncientPowerProbeSpriteSurface,
} from "../../src/animation/ancientPowerEvidence.ts";
import {
  createSceneOnMovePresentation,
  sceneOnAncientPowerView,
  type SceneOnAncientPowerConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render, type EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";

interface Receipt {
  readonly status: string;
  readonly source: { readonly sourceWindow: { readonly frameCount: number } };
  readonly orientations: Record<"player-back" | "opponent-front", {
    readonly scenario: string;
    readonly scenarioSha256: string;
    readonly freshStateSha256: string;
    readonly freshRawRgbSha256: string;
    readonly changeMap: string;
    readonly changeMapSha256: string;
  }>;
  readonly topology: { readonly tasks: readonly string[]; readonly moveSprites: readonly string[]; readonly allTemplates: readonly string[] };
}

interface SpriteRow {
  readonly slot: number;
  readonly template: { readonly symbol: string | null };
  readonly callback: { readonly symbol: string | null };
  readonly attr: readonly number[];
  readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
  readonly subpriority: number;
  readonly invisible: number;
  readonly data: readonly number[];
}
interface TaskRow {
  readonly slot: number;
  readonly func: { readonly symbol: string | null };
  readonly data: readonly number[];
}
interface SoundTrackRow { readonly flags: number; readonly pan: number; readonly panX: number }
interface SoundRow {
  readonly songHeader: number;
  readonly songHeaderIdentity: { readonly symbol: string | null };
  readonly tracks: readonly SoundTrackRow[];
}
interface FrameRow {
  readonly frame: number; readonly sha256: string; readonly gAnimScriptActive: boolean;
  readonly scriptOffset: number | null;
  readonly visualTaskCount: number;
  readonly tasks: readonly TaskRow[];
  readonly sprites: readonly SpriteRow[];
  readonly animationBattlers: Readonly<{ attacker: number; target: number; spriteIds: readonly number[] }>;
  readonly battlerSprites: Readonly<{ attacker: SpriteRow; target: SpriteRow }>;
  readonly spriteOrder: readonly number[];
  readonly battleBg3: Readonly<{ x: number; y: number }>;
  readonly battlers: Readonly<Record<"player" | "opponent", Readonly<Record<string, unknown>>>>;
  readonly parties: unknown; readonly engine: unknown; readonly immutableState: unknown;
  readonly softwareOam: readonly string[]; readonly hardwareOam: readonly string[];
  readonly softwareMatrices: readonly (readonly number[])[]; readonly hardwareMatrices: readonly (readonly number[])[];
  readonly fadedPalette: readonly number[]; readonly hardwarePalette: readonly number[];
  readonly tileTags: readonly number[]; readonly paletteTags: readonly number[];
  readonly registers: Readonly<Record<string, number>>;
  readonly se1: SoundRow;
  readonly se2: SoundRow;
}
interface Probe {
  readonly schema: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly topology: { readonly tasks: readonly string[]; readonly templates: readonly string[] };
  readonly sourceSymbols: Readonly<{ SE_M_DRAGON_RAGE: number; SE_M_SELF_DESTRUCT: number }>;
  readonly frames: readonly FrameRow[];
}

const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const receipt = JSON.parse(readFileSync(join(root, "tools/compare/fixtures/ancient-power-dense-evidence.json"), "utf8")) as Receipt;
const args = new Set(process.argv.slice(2));
const requireExact = args.has("--require-exact");
const once = args.has("--once");
const sha256 = (bytes: Buffer | string): string => createHash("sha256").update(bytes).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const first = new Map<string, readonly [string, string, string]>();

function normalizedChangeMap(path: string, rgbDir: string): string {
  const run = spawnSync("python3", [join(root, "tools/compare/frame-changemap.py"), rgbDir], {
    cwd: root, encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(`change-map generation failed (${run.status})`);
  const separator = run.stdout.indexOf(" — ");
  const header = readFileSync(resolve(root, path), "utf8").split("\n", 1)[0]!;
  if (separator < 0) throw new Error("change-map header changed");
  return `${header.split(" — ", 1)[0]} — ${run.stdout.slice(separator + 3)}`;
}

function configFor(orientation: "player-back" | "opponent-front"): SceneOnAncientPowerConfig {
  const player = orientation === "player-back";
  return {
    move: "ANCIENT_POWER",
    attacker: { species: "BALTOY", geometry: player
      ? { side: "player", spriteCorner: { x: 40, y: 56 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } }
      : { side: "opponent", spriteCorner: { x: 144, y: 20 }, animationCenter: { x: 176, y: 52 }, battlePositionCenter: { x: 176, y: 40 } } },
    target: { species: "ONIX", geometry: player
      ? { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } }
      : { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } } },
    fieldProfile: player
      ? { playerHp: 98, playerMaxHp: 116, opponentHp: 142, opponentMaxHp: 142, playerGender: "none", opponentGender: "male" }
      : { playerHp: 142, playerMaxHp: 142, opponentHp: 98, opponentMaxHp: 116, playerGender: "male", opponentGender: "none" },
  };
}

function runFresh(orientation: "player-back" | "opponent-front"): { probe: Probe; bytes: Buffer; rgbDir: string; scratch: string } {
  const row = receipt.orientations[orientation];
  const scenarioBytes = readFileSync(resolve(root, row.scenario));
  if (sha256(scenarioBytes) !== row.scenarioSha256) throw new Error(`${orientation}: stale/mutated scenario`);
  const scratch = createScratchDir(`pokebench-ancient-power-${orientation}-`);
  const output = join(scratch, "probe.json");
  const rgbDir = join(scratch, "rgb");
  const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
  const run = spawnSync("python3", [join(root, "tools/run-mgba-probe.py"), output, "--",
    join(vendor, "mgba-venv/bin/python"), join(root, "tools/compare/ancientPowerProbe.py"),
    resolve(root, row.scenario), output, rgbDir], {
    cwd: root, encoding: "utf8", env: { ...process.env, PYTHONPATH: join(vendor, "libmgba-py") },
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.status !== 0) throw new Error(`${orientation}: fresh probe failed (${run.status})`);
  const bytes = readFileSync(output);
  return { probe: JSON.parse(bytes.toString("utf8")) as Probe, bytes, rgbDir, scratch };
}

function framebufferDiff(app: Uint8Array, raw: Buffer): { count: number; bbox: string } {
  let count = 0, minX = 240, minY = 160, maxX = -1, maxY = -1;
  for (let p = 0; p < 38400; p += 1) {
    const a = p * 4, r = p * 3;
    if (app[a] === raw[r] && app[a + 1] === raw[r + 1] && app[a + 2] === raw[r + 2]) continue;
    count += 1; const x = p % 240, y = Math.floor(p / 240);
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { count, bbox: count === 0 ? "none" : `${minX},${minY}-${maxX},${maxY}` };
}

type Orientation = "player-back" | "opponent-front";
type OwnedSpriteName = "gShakeMonOrPlatformSpriteTemplate" | "gSlideMonToOffsetSpriteTemplate"
  | "gSlideMonToOriginalPosSpriteTemplate" | "gBasicHitSplatSpriteTemplate";

const ownedSpriteNames: readonly OwnedSpriteName[] = [
  "gShakeMonOrPlatformSpriteTemplate",
  "gSlideMonToOffsetSpriteTemplate",
  "gSlideMonToOriginalPosSpriteTemplate",
  "gBasicHitSplatSpriteTemplate",
];
const ownedTaskNames = new Set(["AnimTask_ShakeMon2_Step", "Task_UpdateMonBg", "Task_ClearMonBg"]);
const bgScroll = (value: number): number => value & 0x1ff;

function matchingSprites(frame: FrameRow, template: OwnedSpriteName): readonly SpriteRow[] {
  return frame.sprites.filter((sprite) => sprite.template.symbol === template);
}

function matchingTasks(frame: FrameRow, symbol: string): readonly TaskRow[] {
  return frame.tasks.filter((task) => task.func.symbol === symbol);
}

function expectedHelperAtAge(age: number): Readonly<{
  template: OwnedSpriteName;
  callback: string;
  data: readonly number[];
}> | null {
  if (age >= 10 && age <= 19) {
    const elapsed = age - 10;
    return {
      template: "gShakeMonOrPlatformSpriteTemplate",
      callback: "AnimShakeMonOrBattlePlatforms_Step",
      data: [elapsed % 4 === 0 || elapsed % 4 === 3 ? -4 : 4, elapsed % 2, 1, 9 - elapsed, 0, 1],
    };
  }
  if (age >= 72 && age <= 76) {
    const elapsed = age - 72;
    return {
      template: "gSlideMonToOffsetSpriteTemplate",
      callback: elapsed === 4 ? "DestroyAnimSprite" : "TranslateSpriteLinearByIdFixedPoint",
      data: [],
    };
  }
  if (age >= 88 && age <= 94) {
    return { template: "gSlideMonToOriginalPosSpriteTemplate", callback: "SlideMonToOriginalPos_Step", data: [] };
  }
  return null;
}

function expectedShakeTaskAtAge(
  age: number,
  creationAge: number,
  numTimes: number,
  spriteId: number,
  xOffset: number,
): readonly number[] | null {
  const elapsed = age - creationAge;
  if (elapsed < 0 || elapsed > numTimes * 2 - 3) return null;
  return [spriteId, numTimes - 1 - Math.floor(elapsed / 2), 1, elapsed % 2 === 0 ? 1 : 0, xOffset, 0];
}

function expectedVisualTaskCount(age: number, rockCount: number): number {
  const helper = expectedHelperAtAge(age) ? 1 : 0;
  const shake = expectedShakeTaskAtAge(age, ANCIENT_POWER_ATTACKER_SHAKE.creationAge,
    ANCIENT_POWER_ATTACKER_SHAKE.numTimes, 0, ANCIENT_POWER_ATTACKER_SHAKE.xOffset)
    || expectedShakeTaskAtAge(age, ANCIENT_POWER_TARGET_SHAKE.creationAge,
      ANCIENT_POWER_TARGET_SHAKE.numTimes, 0, ANCIENT_POWER_TARGET_SHAKE.xOffset) ? 1 : 0;
  const hit = age >= 77 && age <= 86 ? 1 : 0;
  return rockCount + helper + shake + hit;
}

function expectedAudio(
  age: number,
  orientation: Orientation,
  base: FrameRow,
  sourceSymbols: Probe["sourceSymbols"],
): Readonly<{ header: number; headerSymbol: string; flags: number; panX: number }> {
  if (age < 10) {
    return {
      header: base.se1.songHeader,
      headerSymbol: base.se1.songHeaderIdentity.symbol ?? "",
      flags: base.se1.tracks[0]!.flags,
      panX: base.se1.tracks[0]!.panX,
    };
  }
  const attackerPan = orientation === "player-back" ? -64 : 63;
  const targetPan = orientation === "player-back" ? 63 : -63;
  if (age < 77) {
    return {
      header: sourceSymbols.SE_M_DRAGON_RAGE,
      headerSymbol: "se_m_dragon_rage",
      flags: age === 10 ? 131 : 128,
      panX: attackerPan,
    };
  }
  return {
    header: sourceSymbols.SE_M_SELF_DESTRUCT,
    headerSymbol: "se_m_self_destruct",
    flags: age >= 126 ? 0 : age === 77 ? 131 : 128,
    panX: targetPan,
  };
}

function verifyAudio(
  failures: string[],
  age: number,
  frame: FrameRow,
  orientation: Orientation,
  base: FrameRow,
  sourceSymbols: Probe["sourceSymbols"],
): void {
  const expected = expectedAudio(age, orientation, base, sourceSymbols);
  const track = frame.se1.tracks[0];
  if (!track || frame.se1.songHeader !== expected.header
    || frame.se1.songHeaderIdentity.symbol !== expected.headerSymbol
    || track.flags !== expected.flags || track.panX !== expected.panX) failures.push(`age ${age}: SE1 header/timing/pan`);
  if (!same(frame.se1.tracks.slice(1), base.se1.tracks.slice(1))
    || frame.se2.songHeader !== base.se2.songHeader
    || frame.se2.songHeaderIdentity.symbol !== base.se2.songHeaderIdentity.symbol
    || !same(frame.se2.tracks, base.se2.tracks)) failures.push(`age ${age}: SE channel isolation`);
}

function verifySourceState(
  failures: string[],
  age: number,
  frame: FrameRow,
  base: FrameRow,
  expected: ReturnType<typeof ancientPowerAtAge>,
  config: SceneOnAncientPowerConfig,
  orientation: Orientation,
): void {
  const expectedAttackerBattler = orientation === "player-back" ? 0 : 1;
  const expectedTargetBattler = orientation === "player-back" ? 1 : 0;
  if (frame.animationBattlers.attacker !== expectedAttackerBattler
    || frame.animationBattlers.target !== expectedTargetBattler
    || frame.animationBattlers.spriteIds[frame.animationBattlers.attacker] !== frame.battlerSprites.attacker.slot
    || frame.animationBattlers.spriteIds[frame.animationBattlers.target] !== frame.battlerSprites.target.slot) {
    failures.push(`age ${age}: battler sprite binding`);
  }
  const targetLiveX2 = age >= ANCIENT_POWER_TARGET_SHAKE.creationAge
    ? expected.sourceTargetX2
    : base.battlerSprites.target.x2;
  const expectedRockOrder = expected.rocks.slice().sort((a, b) => a.oamOrder - b.oamOrder).map((rock) => rock.sourceSlot);
  const sourceRockSlots = new Set(expectedRockOrder);
  const actualRockOrder = frame.spriteOrder.filter((slot) => sourceRockSlots.has(slot));
  const surfaceActual = {
    attacker: frame.battlerSprites.attacker,
    target: frame.battlerSprites.target,
    battleBg3: frame.battleBg3,
    registers: frame.registers,
    rockSpriteOrder: actualRockOrder,
  } as const;
  const surfaceExpected = {
    attacker: {
      slot: base.battlerSprites.attacker.slot,
      x: config.attacker.geometry.animationCenter.x,
      y: config.attacker.geometry.animationCenter.y,
      x2: expected.sourceAttackerX2,
      y2: 0,
      invisible: base.battlerSprites.attacker.invisible,
    },
    target: {
      slot: base.battlerSprites.target.slot,
      x: config.target.geometry.animationCenter.x,
      y: config.target.geometry.animationCenter.y,
      x2: targetLiveX2,
      y2: 0,
      invisible: expected.sourceMonBgActive ? 1 : 0,
    },
    battleBg3: { x: 0, y: expected.sourceBg3Y },
    registers: {
      bg3hofs: 0,
      bg3vofs: bgScroll(expected.bg3vofs),
      bldcnt: expected.bldcnt,
      bldalpha: expected.bldalpha,
    },
    rockSpriteOrder: expectedRockOrder,
  } satisfies { readonly attacker: AncientPowerProbeSpriteSurface; readonly target: AncientPowerProbeSpriteSurface;
    readonly battleBg3: Readonly<{ x: number; y: number }>; readonly registers: Readonly<{ bg3hofs: number; bg3vofs: number; bldcnt: number; bldalpha: number }>; readonly rockSpriteOrder: readonly number[] };
  for (const failure of validateAncientPowerProbeSurface(surfaceActual, surfaceExpected)) failures.push(`age ${age}: source ${failure}`);

  const rocks = frame.sprites.filter((sprite) => sprite.template.symbol === "gAncientPowerRockSpriteTemplate")
    .sort((a, b) => a.slot - b.slot);
  const expectedRocks = expected.rocks.slice().sort((a, b) => a.sourceSlot - b.sourceSlot);
  const sourceRocks = rocks.map((rock) => [rock.slot, rock.x, rock.y, rock.y2, ((rock.attr[2]! & 0x3ff) - 537) / 16]);
  const reducedRocks = expectedRocks.map((rock) => [rock.sourceSlot, rock.centerX, rock.centerY, rock.y2, rock.animNum]);
  if (!same(sourceRocks, reducedRocks)) failures.push(`age ${age}: rock state`);
}

function verifyOwnedLifetimes(
  failures: string[],
  age: number,
  frame: FrameRow,
  expected: ReturnType<typeof ancientPowerAtAge>,
): void {
  const helper = expectedHelperAtAge(age);
  const helperSprites = ownedSpriteNames.flatMap((name) => matchingSprites(frame, name));
  const expectedNamedSpriteCount = helper ? 1 : 0;
  const hit = matchingSprites(frame, "gBasicHitSplatSpriteTemplate");
  const expectedHit = age >= 77 && age <= 86;
  if (hit.length !== (expectedHit ? 1 : 0)
    || hit.some((sprite) => sprite.slot !== 4 || sprite.invisible !== 0
      || sprite.callback.symbol !== (age === 86 ? "DestroyAnimSprite" : "RunStoredCallbackWhenAffineAnimEnds"))) {
    failures.push(`age ${age}: IMPACT lifetime`);
  }
  const nonImpactHelpers = helperSprites.filter((sprite) => sprite.template.symbol !== "gBasicHitSplatSpriteTemplate");
  if (nonImpactHelpers.length !== expectedNamedSpriteCount) failures.push(`age ${age}: helper lifetime`);
  if (helper) {
    const sprite = matchingSprites(frame, helper.template)[0];
    if (!sprite || sprite.slot !== 3 || sprite.invisible !== 1 || sprite.callback.symbol !== helper.callback) {
      failures.push(`age ${age}: ${helper.template} lifecycle`);
    } else if (helper.template === "gShakeMonOrPlatformSpriteTemplate" && !same(sprite.data.slice(0, 6), helper.data)) {
      failures.push(`age ${age}: platform shake schedule`);
    } else if (helper.template === "gSlideMonToOffsetSpriteTemplate") {
      const elapsed = age - 72;
      const delta = frame.battlerSprites.attacker.slot === 6 ? 1024 : -1024;
      const data = [Math.max(3 - elapsed, 0), delta, 0, delta * Math.min(elapsed + 1, 4), 0, frame.battlerSprites.attacker.slot];
      if (!same(sprite.data.slice(0, 6), data)) failures.push(`age ${age}: slide-to-offset schedule`);
    } else if (helper.template === "gSlideMonToOriginalPosSpriteTemplate") {
      const elapsed = age - 88;
      const delta = frame.battlerSprites.attacker.slot === 6 ? -585 : 585;
      const held = frame.battlerSprites.attacker.slot === 6 ? 16 : -16;
      if (!same(sprite.data.slice(0, 6), [6 - elapsed, delta, 0, delta * (elapsed + 1), 0, held])) failures.push(`age ${age}: slide-to-original schedule`);
    }
  }

  const attackerTask = expectedShakeTaskAtAge(age, ANCIENT_POWER_ATTACKER_SHAKE.creationAge,
    ANCIENT_POWER_ATTACKER_SHAKE.numTimes, frame.battlerSprites.attacker.slot, ANCIENT_POWER_ATTACKER_SHAKE.xOffset);
  const targetTask = expectedShakeTaskAtAge(age, ANCIENT_POWER_TARGET_SHAKE.creationAge,
    ANCIENT_POWER_TARGET_SHAKE.numTimes, frame.battlerSprites.target.slot, ANCIENT_POWER_TARGET_SHAKE.xOffset);
  const shakeTasks = matchingTasks(frame, "AnimTask_ShakeMon2_Step");
  const expectedShake = attackerTask ?? targetTask;
  if (shakeTasks.length !== (expectedShake ? 1 : 0)
    || (expectedShake && (shakeTasks[0]!.slot !== 0 || !same(shakeTasks[0]!.data.slice(0, 6), expectedShake)))) {
    failures.push(`age ${age}: ShakeMon2 task schedule`);
  }
  const updateTasks = matchingTasks(frame, "Task_UpdateMonBg");
  const clearTasks = matchingTasks(frame, "Task_ClearMonBg");
  const expectedUpdate = age >= 7 && age <= 98;
  const expectedClear = age >= 96 && age <= 98;
  if (updateTasks.length !== (expectedUpdate ? 1 : 0)
    || (expectedUpdate && (updateTasks[0]!.slot !== 1
      || updateTasks[0]!.data[0] !== frame.battlerSprites.target.slot
      || updateTasks[0]!.data[1] !== frame.battlerSprites.target.x + (frame.animationBattlers.target === 1 ? 1 : 0)
      || updateTasks[0]!.data[2] !== frame.battlerSprites.target.y))) failures.push(`age ${age}: monbg update lifecycle`);
  if (clearTasks.length !== (expectedClear ? 1 : 0)
    || (expectedClear && (clearTasks[0]!.slot !== 0 || clearTasks[0]!.data[0] !== 0
      || clearTasks[0]!.data[1] !== (age === 96 ? 1 : 2)
      || clearTasks[0]!.data[2] !== frame.animationBattlers.target))) failures.push(`age ${age}: monbg cleanup lifecycle`);
  const unexpectedOwned = frame.tasks.filter((task) => ownedTaskNames.has(task.func.symbol ?? "")
    && task.func.symbol !== "AnimTask_ShakeMon2_Step" && task.func.symbol !== "Task_UpdateMonBg" && task.func.symbol !== "Task_ClearMonBg");
  if (unexpectedOwned.length) failures.push(`age ${age}: unexpected move-owned task`);
  if (frame.visualTaskCount !== expectedVisualTaskCount(age, expected.rocks.length)) failures.push(`age ${age}: visual task count`);
}

function verify(orientation: "player-back" | "opponent-front", runNumber: number): void {
  const { probe, bytes, rgbDir, scratch } = runFresh(orientation);
  const failures: string[] = [];
  const total = receipt.source.sourceWindow.frameCount;
  if (probe.schema !== "ancient-power-dense-evidence/v1" || probe.frames.length !== total
    || probe.frames[0]?.scriptOffset !== 0 || probe.frames.at(-1)?.gAnimScriptActive !== false)
    failures.push("complete pointer-bounded window");
  if (!same(probe.topology.tasks, receipt.topology.tasks)) failures.push("topology tasks");
  if (!same(probe.topology.templates, receipt.topology.allTemplates)) failures.push("topology templates");
  if (ANCIENT_POWER_COMPONENTS.length !== 12) failures.push("generated 12-component graph");
  const config = configFor(orientation);
  const stage = createSceneOnMovePresentation(config);
  const base = probe.frames[0]!;
  let reducerRows = 0, seamRows = 0, componentRows = 0, latchRows = 0, framebufferRows = 0;
  const residuals: Array<{ age: number; count: number; bbox: string }> = [];
  const rawDigest = createHash("sha256");
  for (const [age, frame] of probe.frames.entries()) {
    const sourceFailures: string[] = [];
    const componentFailures: string[] = [];
    const raw = readFileSync(join(rgbDir, `${String(frame.frame).padStart(5, "0")}.rgb`));
    rawDigest.update(raw);
    if (sha256(raw) !== frame.sha256) sourceFailures.push(`age ${age}: raw RGB hash`);
    const expected = ancientPowerAtAge(age, {
      attackerCenter: config.attacker.geometry.animationCenter,
      attackerBattlePositionCenter: config.attacker.geometry.battlePositionCenter,
      attackerSide: config.attacker.geometry.side,
    });
    const seam = sceneOnAncientPowerView({ ...stage, age });
    const { attacker: _a, target: _t, ...seamBody } = seam;
    if (same(expected, seamBody)) seamRows += 1; else failures.push(`age ${age}: seam`);
    if (expected.active !== frame.gAnimScriptActive) sourceFailures.push(`age ${age}: active cleanup`);
    verifySourceState(sourceFailures, age, frame, base, expected, config, orientation);
    if (sourceFailures.length === 0) reducerRows += 1;

    const rocks = frame.sprites.filter((sprite) => sprite.template.symbol === "gAncientPowerRockSpriteTemplate");
    if (rocks.length !== expected.rocks.length) componentFailures.push(`age ${age}: rock topology`);
    verifyOwnedLifetimes(componentFailures, age, frame, expected);
    const tileLoaded = frame.tileTags.includes(10058), paletteLoaded = frame.paletteTags.includes(10058);
    if (tileLoaded !== expected.resources.rocks || paletteLoaded !== expected.resources.rocks
      || frame.tileTags.filter((tag) => tag === 10058).length !== (expected.resources.rocks ? 1 : 0)
      || frame.paletteTags.filter((tag) => tag === 10058).length !== (expected.resources.rocks ? 1 : 0)) componentFailures.push(`age ${age}: ROCKS tags`);
    const impactLoaded = frame.tileTags.includes(10135) && frame.paletteTags.includes(10135);
    if (impactLoaded !== expected.resources.impact
      || frame.tileTags.filter((tag) => tag === 10135).length !== (expected.resources.impact ? 1 : 0)
      || frame.paletteTags.filter((tag) => tag === 10135).length !== (expected.resources.impact ? 1 : 0)) componentFailures.push(`age ${age}: IMPACT tags`);
    verifyAudio(componentFailures, age, frame, orientation, base, probe.sourceSymbols);
    if (!same(frame.battlers, base.battlers) || !same(frame.parties, base.parties)
      || !same(frame.engine, base.engine) || !same(frame.immutableState, base.immutableState)) componentFailures.push(`age ${age}: immutable state`);
    if (frame.softwareOam.length !== 128 || frame.hardwareOam.length !== 128
      || frame.softwareMatrices.length !== 32 || frame.hardwareMatrices.length !== 32
      || frame.fadedPalette.length !== 512 || frame.hardwarePalette.length !== 512) componentFailures.push(`age ${age}: full state shapes`);
    if (age > 0) {
      const prior = probe.frames[age - 1]!;
      if (same(frame.hardwareOam, prior.softwareOam) && same(frame.hardwareMatrices, prior.softwareMatrices)
        && same(frame.hardwarePalette, age === 7 ? frame.fadedPalette : prior.fadedPalette)) latchRows += 1;
      else componentFailures.push(`age ${age}: OAM/matrix/palette transfer`);
    }
    if (sourceFailures.length === 0 && componentFailures.length === 0) componentRows += 1;
    failures.push(...sourceFailures, ...componentFailures);
    const engine: EngineState = { ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...stage, age } };
    const diff = framebufferDiff(render(engine), raw);
    if (diff.count === 0) framebufferRows += 1; else residuals.push({ age, ...diff });
  }
  const changeMap = normalizedChangeMap(receipt.orientations[orientation].changeMap, rgbDir);
  const receipts = [sha256(bytes), rawDigest.digest("hex"), sha256(changeMap)] as const;
  const row = receipt.orientations[orientation];
  if (receipts[0] !== row.freshStateSha256 || receipts[1] !== row.freshRawRgbSha256
    || receipts[2] !== row.changeMapSha256
    || changeMap !== readFileSync(resolve(root, row.changeMap), "utf8")) failures.push("fresh receipt/change-map rejects stale archive/scenario");
  if (runNumber === 1) first.set(orientation, receipts); else if (!same(first.get(orientation), receipts)) failures.push("twice-fresh stability");
  const exact = reducerRows === total && seamRows === total && componentRows === total
    && latchRows === total - 1 && framebufferRows === total;
  if (requireExact && !exact) failures.push("--require-exact complete acceptance");
  console.log(`${orientation} run ${runNumber}: reducer/seam/component/latch/framebuffer ${reducerRows}/${seamRows}/${componentRows}/${latchRows}/${framebufferRows}/${total}; receipts ${receipts.join("/")}`);
  if (residuals.length) {
    const worst = residuals.slice().sort((a, b) => b.count - a.count)[0]!;
    console.log(`residual ages ${residuals.map((r) => r.age).join(",")}; peak ${worst.count}px age ${worst.age} bbox ${worst.bbox}`);
    console.log(`first ${JSON.stringify(residuals.slice(0, 16))}; tail ${JSON.stringify(residuals.slice(-12))}`);
  }
  if (failures.length) {
    console.error([...new Set(failures)].slice(0, 100).join("\n"));
    console.error(`scratch: ${scratch}`);
    process.exitCode = 1;
  }
}

const orientations = args.has("--player-only")
  ? (["player-back"] as const)
  : args.has("--opponent-only")
    ? (["opponent-front"] as const)
    : (["player-back", "opponent-front"] as const);
for (let run = 1; run <= (once ? 1 : 2); run += 1)
  for (const orientation of orientations) verify(orientation, run);
