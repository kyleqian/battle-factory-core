/**
 * Source-relative port of the launch-rock part of Move_ERUPTION.
 *
 * This file deliberately stops at `AnimTask_EruptionLaunchRocks`' cleanup.
 * Falling rocks, HorizontalShake, audio, palette blending, and the scene
 * compositor are separate components.  The caller supplies the ordinary
 * battler geometry and allocator snapshot; no species, set, or evidence
 * identity is used to choose a branch.
 */

export type EruptionLaunchSide = "player" | "opponent";

export const ERUPTION_LAUNCH_WAVE_COUNT = 2;
export const ERUPTION_LAUNCH_ROCKS_PER_WAVE = 7;
export const ERUPTION_LAUNCH_ROCK_TILE_OFFSETS = [64, 68, 72, 76, 80, 64, 68] as const;
export const ERUPTION_LAUNCH_SOURCE_OFFSETS = [33, 46] as const;
export const ERUPTION_LAUNCH_SOURCE_BASE = 0x082c_e30b;
export const ERUPTION_WARM_ROCK_TAG = 10201;

const DISPLAY_WIDTH = 240;
const LAUNCH_ROCK_SUBPRIORITY = 2;
const LAUNCH_ROCK_OAM_PRIORITY = 2;
const TASK_PRIORITY: 2 = 2;
const TASK_LIST_END = 0xfe;
const ACTIVE_SPRITES_INDEX = 6;
const LAUNCH_SPEEDS = [
  [-2, -5], [-1, -1], [3, -6], [4, -2], [2, -8], [-5, -5], [4, -7],
] as const;

export interface EruptionLaunchGeometry {
  /** The source-side battler slot used by `GetAnimBattlerSpriteId`. */
  readonly attackerSpriteSlot: number;
  readonly attackerX: number;
  readonly attackerY: number;
  /** `centerToCornerVecY` for the source battler sprite. */
  readonly centerToCornerVecY: number;
  readonly battlerPicHeight: number;
  readonly battlerYDelta: number;
  /** The matrix allocated by `PrepareBattlerSpriteForRotScale`. */
  readonly matrixNum: number;
  /** Source sprite offsets before this task writes them. */
  readonly initialX2?: number;
  readonly initialY2?: number;
}

export interface EruptionLaunchAllocatorSnapshot {
  /** Inactive sprite slots in the allocator's scan order at wave creation. */
  readonly freeSpriteSlots: readonly number[];
  readonly tileTag: number;
  readonly paletteTag: number;
  /** Warm Rock's tile allocation as observed by the caller. */
  readonly tileRange: readonly [number, number];
  readonly tileRangeBeforeLoad: readonly [number, number];
  readonly paletteSlot: number;
  /** Resource lifetime from the caller's allocator snapshot. */
  readonly loadedAge: number;
  readonly freedAge: number | null;
}

export interface EruptionLaunchWaveInput {
  /** Source age at which `createvisualtask` creates this task. */
  readonly taskStartAge: number;
  /** Source command offset for the task's command cursor. */
  readonly sourceOffset: 33 | 46;
  /** The adjacent sound task's slot and final live source age. */
  readonly companionTaskSlot: number;
  readonly companionTaskEndAge: number;
}

export interface EruptionLaunchProfile {
  readonly side: EruptionLaunchSide;
  readonly geometry: EruptionLaunchGeometry;
  readonly allocator: EruptionLaunchAllocatorSnapshot;
  readonly taskSlot: number;
  readonly waves: readonly [EruptionLaunchWaveInput, EruptionLaunchWaveInput];
  /** Starting value of the animation-only RNG at source age zero. */
  readonly startingAnimationRng: number;
  /** Number of source-relative rows to produce, inclusive of age zero. */
  readonly endAge: number;
}

export interface EruptionLaunchSourceCursor {
  readonly owner: "Move_ERUPTION";
  readonly command: "AnimTask_EruptionLaunchRocks";
  readonly offset: 33 | 46;
  readonly pointer: number;
  readonly pointerParity: 0 | 1;
  readonly wait: 1;
  /** `createvisualtask` has no command arguments. */
  readonly args: readonly [];
  readonly priority: 2;
}

export interface EruptionLaunchTaskState {
  readonly slot: number;
  /** This is the task's linked-list predecessor byte exposed by the probe. */
  readonly priority: number;
  readonly sourcePriority: 2;
  readonly func: "AnimTask_EruptionLaunchRocks_Step";
  readonly data: readonly number[];
  readonly lifetime: readonly [number, number];
}

export interface EruptionLaunchRockState {
  readonly slot: number;
  readonly template: "gEruptionLaunchRockSpriteTemplate";
  readonly callback: "AnimEruptionLaunchRock";
  readonly birthAge: number;
  readonly localAge: number;
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly subpriority: 2;
  readonly invisible: 0 | 1;
  readonly data: readonly number[];
  readonly tileOffset: 64 | 68 | 72 | 76 | 80;
  readonly paletteSlot: number;
  readonly matrixNum: 0;
  readonly matrix: readonly [256, 0, 0, 256];
  readonly attr: readonly [number, number, number];
  /** The first row is created before `BuildOamBuffer` observes it. */
  readonly displayedInOam: boolean;
}

export interface EruptionLaunchBattlerState {
  readonly spriteSlot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly matrixNum: number;
  readonly matrix: readonly [number, 0, 0, number];
  readonly hardwareMatrix: readonly [number, 0, 0, number];
  readonly hardwareMatrixSourceAge: number;
  readonly softwareOamWritten: boolean;
  readonly hardwareOamIsPrecedingSoftware: boolean;
  readonly hardwareMatrixIsPrecedingSoftware: boolean;
}

export interface EruptionLaunchFrame {
  readonly age: number;
  readonly animationRng: number;
  readonly animationRngTransition: Readonly<{ readonly previous: number | null; readonly next: number | null }>;
  readonly source: EruptionLaunchSourceCursor | null;
  readonly task: EruptionLaunchTaskState | null;
  readonly sprites: readonly EruptionLaunchRockState[];
  readonly battler: EruptionLaunchBattlerState | null;
  readonly visualTaskCount: 0 | 1;
  readonly resources: Readonly<{
    readonly tileTag: number;
    readonly paletteTag: number;
    readonly tileRange: readonly [number, number];
    readonly paletteSlot: number;
    readonly tileAllocationRetained: boolean;
    readonly paletteAllocationRetained: boolean;
  }>;
  readonly allocation: Readonly<{
    readonly wave: 0 | 1 | null;
    readonly slots: readonly number[];
    readonly exactScanOrder: true;
  }>;
  readonly oamTransfer: Readonly<{
    readonly transferLagRows: 1;
    readonly hardwareEqualsPrecedingSoftware: boolean;
    readonly matricesEqualsPrecedingSoftware: boolean;
  }>;
  readonly cleanup: Readonly<{
    readonly firstInactive: boolean;
    readonly activeLaunchSprites: number;
    readonly activeLaunchTasks: number;
  }>;
}

interface MutableRock {
  readonly slot: number;
  readonly birthAge: number;
  readonly speedX: number;
  readonly speedY: number;
  readonly tileOffset: 64 | 68 | 72 | 76 | 80;
  data0: number;
  launchStage: number;
  fixedX: number;
  fixedY: number;
  alive: boolean;
}

interface MutableBattler {
  x: number;
  y: number;
  x2: number;
  y2: number;
  xScale: number;
  yScale: number;
}

interface MutableWave {
  readonly index: 0 | 1;
  readonly profile: Readonly<EruptionLaunchProfile>;
  readonly input: EruptionLaunchWaveInput;
  readonly taskData: number[];
  readonly battler: MutableBattler;
  readonly rocks: MutableRock[];
  readonly matrixHistory: Array<readonly [number, 0, 0, number]>;
  active: boolean;
  launchAge: number | null;
  taskEndAge: number | null;
}

function assertProfile(profile: Readonly<EruptionLaunchProfile>): void {
  const { geometry, allocator, waves } = profile;
  if (!Number.isInteger(profile.endAge) || profile.endAge < 0
    || !Number.isInteger(profile.taskSlot) || profile.taskSlot < 0
    || !Number.isInteger(geometry.attackerSpriteSlot) || geometry.attackerSpriteSlot < 0
    || waves[0].sourceOffset !== 33 || waves[1].sourceOffset !== 46
    || waves[0].taskStartAge >= waves[1].taskStartAge
    || allocator.freeSpriteSlots.length < ERUPTION_LAUNCH_ROCKS_PER_WAVE
    || new Set(allocator.freeSpriteSlots).size !== allocator.freeSpriteSlots.length
    || allocator.tileTag !== ERUPTION_WARM_ROCK_TAG
    || allocator.paletteTag !== ERUPTION_WARM_ROCK_TAG
    || allocator.tileRange.length !== 2
    || allocator.tileRangeBeforeLoad.length !== 2
    || allocator.tileRange[1] < 20
    || allocator.paletteSlot < 0 || allocator.paletteSlot >= 16
    || !Number.isInteger(allocator.loadedAge) || allocator.loadedAge < 0
    || (allocator.freedAge !== null
      && (!Number.isInteger(allocator.freedAge) || allocator.freedAge <= allocator.loadedAge))) {
    throw new Error("invalid Eruption launch component profile");
  }
}

function signedShift(value: number, bits: number): number {
  return value >> bits;
}

function animationRngAtAge(age: number, starting: number): number {
  let value = starting >>> 0;
  for (let index = 0; index < age; index += 1) {
    value = (Math.imul(value, 0x41c64e6d) + 0x6073) >>> 0;
  }
  return value;
}

function setRotScale(wave: MutableWave, xScale: number, yScale: number): void {
  wave.battler.xScale = xScale;
  wave.battler.yScale = yScale;
  wave.taskData[9] = xScale;
  wave.taskData[10] = yScale;
}

function setBattlerYOffsetFromYScale(wave: MutableWave): void {
  const { geometry } = wave.profile;
  const variable = geometry.battlerPicHeight - geometry.battlerYDelta * 2;
  let scaled = Math.trunc((variable << 8) / wave.battler.yScale);
  if (scaled > geometry.battlerPicHeight * 2) scaled = geometry.battlerPicHeight * 2;
  wave.battler.y2 = Math.trunc((variable - scaled) / 2);
}

function prepareErupt(wave: MutableWave, endX: number, endY: number, duration: number): void {
  wave.taskData[8] = duration;
  wave.taskData[9] = wave.battler.xScale;
  wave.taskData[10] = wave.battler.yScale;
  wave.taskData[13] = endX;
  wave.taskData[14] = endY;
  wave.taskData[11] = Math.trunc((endX - wave.battler.xScale) / duration);
  wave.taskData[12] = Math.trunc((endY - wave.battler.yScale) / duration);
}

function updateErupt(wave: MutableWave): boolean {
  if (wave.taskData[8] === 0) return false;
  wave.taskData[8]! -= 1;
  if (wave.taskData[8] !== 0) {
    wave.battler.xScale += wave.taskData[11]!;
    wave.battler.yScale += wave.taskData[12]!;
  } else {
    wave.battler.xScale = wave.taskData[13]!;
    wave.battler.yScale = wave.taskData[14]!;
  }
  setRotScale(wave, wave.battler.xScale, wave.battler.yScale);
  if (wave.taskData[8] !== 0) setBattlerYOffsetFromYScale(wave);
  else wave.battler.y2 = 0;
  return wave.taskData[8] !== 0;
}

function createRocks(wave: MutableWave, profile: Readonly<EruptionLaunchProfile>, age: number): void {
  const { geometry, allocator } = profile;
  const sign = profile.side === "player" ? 1 : -1;
  const x = geometry.attackerX + (profile.side === "player" ? -12 : 16);
  const y = wave.battler.y + wave.battler.y2 + geometry.centerToCornerVecY
    + (profile.side === "player" ? 74 : 44);
  wave.launchAge = age;
  wave.rocks.length = 0;
  for (let index = 0; index < ERUPTION_LAUNCH_ROCKS_PER_WAVE; index += 1) {
    const slot = allocator.freeSpriteSlots[index]!;
    const speed = LAUNCH_SPEEDS[index]!;
    wave.rocks.push({
      slot,
      birthAge: age,
      speedX: speed[0] * sign,
      speedY: speed[1],
      tileOffset: ERUPTION_LAUNCH_ROCK_TILE_OFFSETS[index]!,
      data0: 0,
      launchStage: 0,
      fixedX: x * 8,
      fixedY: y * 8,
      alive: true,
    });
  }
}

function updateRock(rock: MutableRock): void {
  if (!rock.alive) return;
  rock.data0 += 1;
  if (rock.data0 > 2) {
    rock.data0 = 0;
    rock.launchStage += 1;
    rock.fixedY += rock.launchStage * rock.launchStage;
  }
  rock.fixedX += rock.speedX * 8;
  rock.fixedY += rock.speedY * 8;
  const x = signedShift(rock.fixedX, 3);
  const y = signedShift(rock.fixedY, 3);
  if (x < -8 || x > DISPLAY_WIDTH + 8 || y < -8 || y > 120) rock.alive = false;
}

function activeRocks(wave: MutableWave): MutableRock[] {
  return wave.rocks.filter((rock) => rock.alive);
}

function advanceRocks(wave: MutableWave, age: number): void {
  if (wave.launchAge === null || age <= wave.launchAge) return;
  for (const rock of wave.rocks) updateRock(rock);
  wave.taskData[6] = activeRocks(wave).length;
}

function runTaskStep(wave: MutableWave, profile: Readonly<EruptionLaunchProfile>, age: number): void {
  const task = wave.taskData;
  switch (task[0]) {
    case 0:
      prepareErupt(wave, 0xe0, 0x200, 32);
      task[0] = 1;
      // Deliberate source fall-through into case 1.
      task[1] = 0;
      task[2] = 0;
      task[3] = 0;
      // falls through
    case 1:
      task[1]! += 1;
      if (task[1]! > 1) {
        task[1] = 0;
        task[2]! += 1;
        wave.battler.x2 = task[2]! & 1 ? 3 : -3;
      }
      if (profile.side === "opponent") {
        task[3]! += 1;
        if (task[3]! > 4) {
          task[3] = 0;
          wave.battler.y += 1;
        }
      }
      if (!updateErupt(wave)) {
        setBattlerYOffsetFromYScale(wave);
        wave.battler.x2 = 0;
        task[1] = 0;
        task[2] = 0;
        task[3] = 0;
        task[0] = 2;
      }
      break;
    case 2:
      task[1]! += 1;
      if (task[1]! > 4) {
        task[1] = 0;
        if (profile.side === "opponent") prepareErupt(wave, 0x180, 0xf0, 6);
        else prepareErupt(wave, 0x180, 0xc0, 6);
        task[0] = 3;
      }
      break;
    case 3:
      if (!updateErupt(wave)) {
        createRocks(wave, profile, age);
        task[6] = ERUPTION_LAUNCH_ROCKS_PER_WAVE;
        task[0] = 4;
      }
      break;
    case 4:
      task[1]! += 1;
      if (task[1]! > 1) {
        task[1] = 0;
        task[2]! += 1;
        if (task[2]! & 1) wave.battler.y2 += 3;
        else wave.battler.y2 -= 3;
      }
      task[3]! += 1;
      if (task[3]! > 24) {
        if (profile.side === "opponent") prepareErupt(wave, 0x100, 0x100, 8);
        else prepareErupt(wave, 0x100, 0x100, 8);
        if (task[2]! & 1) wave.battler.y2 -= 3;
        task[1] = 0;
        task[2] = 0;
        task[3] = 0;
        task[0] = 5;
      }
      break;
    case 5:
      if (profile.side === "opponent") wave.battler.y -= 1;
      if (!updateErupt(wave)) {
        wave.battler.y = profile.geometry.attackerY;
        wave.battler.x2 = 0;
        wave.battler.y2 = 0;
        setRotScale(wave, 0x100, 0x100);
        task[2] = 0;
        task[0] = 6;
      }
      break;
    case 6:
      if (task[6] === 0) {
        wave.active = false;
        wave.taskEndAge = age - 1;
      }
      break;
    default:
      throw new Error(`invalid Eruption launch task state ${task[0]}`);
  }
}

function newWave(index: 0 | 1, profile: Readonly<EruptionLaunchProfile>): MutableWave {
  const { geometry } = profile;
  const data = Array.from({ length: 16 }, () => 0);
  data[4] = geometry.attackerY;
  data[5] = profile.side === "opponent" ? 1 : 0;
  data[15] = geometry.attackerSpriteSlot;
  return {
    index,
    profile,
    input: profile.waves[index],
    taskData: data,
    battler: {
      x: geometry.attackerX,
      y: geometry.attackerY,
      x2: geometry.initialX2 ?? 0,
      y2: geometry.initialY2 ?? 0,
      xScale: 0x100,
      yScale: 0x100,
    },
    rocks: [],
    matrixHistory: [],
    active: false,
    launchAge: null,
    taskEndAge: null,
  };
}

function startWave(wave: MutableWave): void {
  wave.active = true;
  wave.taskData.fill(0);
  wave.taskData[4] = wave.profile.geometry.attackerY;
  wave.taskData[5] = wave.profile.side === "opponent" ? 1 : 0;
  wave.taskData[15] = wave.profile.geometry.attackerSpriteSlot;
  wave.battler.x = wave.profile.geometry.attackerX;
  wave.battler.y = wave.profile.geometry.attackerY;
  wave.battler.x2 = wave.profile.geometry.initialX2 ?? 0;
  wave.battler.y2 = wave.profile.geometry.initialY2 ?? 0;
  wave.battler.xScale = 0x100;
  wave.battler.yScale = 0x100;
  wave.rocks.length = 0;
  wave.launchAge = null;
  wave.taskEndAge = null;
}

function taskLifetime(wave: MutableWave): readonly [number, number] {
  return [wave.input.taskStartAge, wave.taskEndAge ?? wave.input.taskStartAge] as const;
}

function sourceAtAge(wave: MutableWave): EruptionLaunchSourceCursor {
  const pointer = ERUPTION_LAUNCH_SOURCE_BASE + wave.input.sourceOffset;
  // The masked source pointer can only retain its low bit.
  const pointerParity = (pointer & 1) as 0 | 1;
  return {
    owner: "Move_ERUPTION", command: "AnimTask_EruptionLaunchRocks",
    offset: wave.input.sourceOffset,
    pointer,
    pointerParity,
    wait: 1, args: [], priority: TASK_PRIORITY,
  };
}

function rockAttr(rock: MutableRock, profile: Readonly<EruptionLaunchProfile>, age: number): readonly [number, number, number] {
  const x = signedShift(rock.fixedX, 3);
  const y = signedShift(rock.fixedY, 3);
  const tile = profile.allocator.tileRange[0]! + rock.tileOffset;
  const attr2 = ((profile.allocator.paletteSlot << 12)
    | (LAUNCH_ROCK_OAM_PRIORITY << 10)
    | tile) & 0xffff;
  if (age === rock.birthAge) return [0, 0x4000, attr2];
  return [y - 8 & 0xff, 0x4000 | ((x - 8) & 0x1ff), attr2];
}

function rockState(rock: MutableRock, profile: Readonly<EruptionLaunchProfile>, age: number): EruptionLaunchRockState {
  const x = signedShift(rock.fixedX, 3);
  const y = signedShift(rock.fixedY, 3);
  return {
    slot: rock.slot, template: "gEruptionLaunchRockSpriteTemplate", callback: "AnimEruptionLaunchRock",
    birthAge: rock.birthAge, localAge: age - rock.birthAge, x, y, x2: 0, y2: 0,
    subpriority: LAUNCH_ROCK_SUBPRIORITY, invisible: rock.alive ? 0 : 1,
    data: [rock.data0, rock.launchStage, rock.fixedX, rock.fixedY, rock.speedX * 8, rock.speedY * 8, 0, ACTIVE_SPRITES_INDEX],
    tileOffset: rock.tileOffset, paletteSlot: profile.allocator.paletteSlot, matrixNum: 0,
    matrix: [256, 0, 0, 256], attr: rockAttr(rock, profile, age), displayedInOam: age > rock.birthAge,
  };
}

function battlerState(wave: MutableWave, profile: Readonly<EruptionLaunchProfile>, age: number): EruptionLaunchBattlerState {
  const hardwareMatrixSourceAge = Math.max(0, age === wave.input.taskStartAge ? age - 1 : age - 2);
  const hardwareMatrix = wave.matrixHistory[hardwareMatrixSourceAge] ?? [256, 0, 0, 256];
  const matrix = [wave.battler.xScale, 0, 0, wave.battler.yScale] as const;
  return {
    spriteSlot: profile.geometry.attackerSpriteSlot, x: wave.battler.x, y: wave.battler.y,
    x2: wave.battler.x2, y2: wave.battler.y2, matrixNum: profile.geometry.matrixNum,
    matrix, hardwareMatrix, hardwareMatrixSourceAge,
    softwareOamWritten: age > 0, hardwareOamIsPrecedingSoftware: age > 0,
    hardwareMatrixIsPrecedingSoftware: age > 0
      && sameMatrix(hardwareMatrix, wave.matrixHistory[age - 1] ?? [256, 0, 0, 256]),
  };
}

function sameMatrix(a: readonly number[], b: readonly number[]): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

function frameForAge(age: number, profile: Readonly<EruptionLaunchProfile>, waves: readonly MutableWave[]): EruptionLaunchFrame {
  const active = waves.find((wave) => wave.active);
  const activeRocksNow = waves.flatMap((wave) => activeRocks(wave));
  const task = active ? {
    slot: profile.taskSlot,
    priority: age <= active.input.companionTaskEndAge ? active.input.companionTaskSlot : TASK_LIST_END,
    sourcePriority: TASK_PRIORITY,
    func: "AnimTask_EruptionLaunchRocks_Step" as const,
    data: [...active.taskData], lifetime: taskLifetime(active),
  } : null;
  const source = active ? sourceAtAge(active) : null;
  const battler = active ? battlerState(active, profile, age) : null;
  const allocation = active && active.launchAge !== null
    ? { wave: active.index, slots: active.rocks.map((rock) => rock.slot), exactScanOrder: true as const }
    : { wave: null, slots: [], exactScanOrder: true as const };
  return {
    age,
    animationRng: animationRngAtAge(age, profile.startingAnimationRng),
    animationRngTransition: {
      previous: age > 0 ? animationRngAtAge(age - 1, profile.startingAnimationRng) : null,
      next: age < profile.endAge ? animationRngAtAge(age + 1, profile.startingAnimationRng) : null,
    },
    source, task,
    sprites: activeRocksNow.map((rock) => rockState(rock, profile, age)),
    battler,
    visualTaskCount: active ? 1 : 0,
    resources: {
      tileTag: profile.allocator.tileTag, paletteTag: profile.allocator.paletteTag,
      tileRange: (age >= profile.allocator.loadedAge
        ? [...profile.allocator.tileRange]
        : [...profile.allocator.tileRangeBeforeLoad]) as [number, number],
      paletteSlot: profile.allocator.paletteSlot,
      tileAllocationRetained: age >= profile.allocator.loadedAge
        && (profile.allocator.freedAge === null || age < profile.allocator.freedAge),
      paletteAllocationRetained: age >= profile.allocator.loadedAge
        && (profile.allocator.freedAge === null || age < profile.allocator.freedAge),
    },
    allocation,
    oamTransfer: {
      transferLagRows: 1, hardwareEqualsPrecedingSoftware: age > 0,
      matricesEqualsPrecedingSoftware: battler?.hardwareMatrixIsPrecedingSoftware ?? age > 0,
    },
    cleanup: {
      firstInactive: !active && age > profile.waves[1].taskStartAge,
      activeLaunchSprites: activeRocksNow.length,
      activeLaunchTasks: active ? 1 : 0,
    },
  };
}

/** Replay both source task waves from age zero through the first cleanup. */
export function eruptionLaunchTimeline(
  profile: Readonly<EruptionLaunchProfile>,
): readonly EruptionLaunchFrame[] {
  assertProfile(profile);
  const waves = [newWave(0, profile), newWave(1, profile)] as [MutableWave, MutableWave];
  const frames: EruptionLaunchFrame[] = [];
  for (let age = 0; age <= profile.endAge; age += 1) {
    for (const wave of waves) {
      if (!wave.active && age === wave.input.taskStartAge) startWave(wave);
    }
    for (const wave of waves) {
      if (wave.active) advanceRocks(wave, age);
    }
    for (const wave of waves) {
      if (wave.active) runTaskStep(wave, profile, age);
    }
    for (const wave of waves) {
      wave.matrixHistory[age] = wave.active
        ? [wave.battler.xScale, 0, 0, wave.battler.yScale]
        : [256, 0, 0, 256];
    }
    frames.push(frameForAge(age, profile, waves));
  }
  const lifetimes = new Map(waves.map((wave) => [wave.input.sourceOffset, taskLifetime(wave)]));
  return frames.map((frame) => frame.task === null
    ? frame
    : {
        ...frame,
        task: { ...frame.task, lifetime: lifetimes.get(frame.source!.offset)! },
      });
}

/** Source-relative single-age access for callers that do not need a trace. */
export function eruptionLaunchAtAge(
  age: number,
  profile: Readonly<EruptionLaunchProfile>,
): EruptionLaunchFrame {
  if (!Number.isInteger(age) || age < 0 || age > profile.endAge) throw new Error("Eruption launch age out of range");
  return eruptionLaunchTimeline(profile)[age]!;
}
