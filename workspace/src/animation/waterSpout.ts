/**
 * Source-shaped, presentation-only primitives for Move_WATER_SPOUT.
 *
 * The live scene supplies HP, battler geometry, allocator slots, and the
 * animation-local seed.  This module does not read battle recordings and
 * does not own damage, HP mutation, or the battle RNG.
 */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type WaterSpoutSide = "player" | "opponent";
export type WaterSpoutPowerTier = 0 | 1 | 2 | 3;

export const WATER_SPOUT_GLOWY_BLUE_ORB_TAG = 10268;
export const WATER_SPOUT_WATER_IMPACT_TAG = 10148;
export const WATER_SPOUT_IMPACT_AFFINE_ANIM = 3;
export const WATER_SPOUT_HORIZONTAL_SHAKE = { target: "ANIM_TARGET", amplitude: 0, duration: 12 } as const;

export interface WaterSpoutLiveInputs {
  readonly attackerSide: WaterSpoutSide;
  readonly attackerHp: number;
  readonly attackerMaxHp: number;
  readonly attackerEffectCenter: Readonly<{ x: number; y: number }>;
  readonly attackerSubpriority: number;
  readonly launchTaskSlot: number;
  readonly launchSpriteSlots: readonly number[];
  /** Free affine slots in the allocator's source scan order. */
  readonly impactAffineSlots?: readonly number[];
  /** Effective source height used by SetBattlerSpriteYOffsetFromYScale. */
  readonly attackerSourceHeight?: number;
  readonly animationRng: number;
  /** Persistent source `sSpriteOrder`, immediately before component allocation. */
  readonly spriteOrderSeed?: readonly number[];
}

export interface WaterSpoutSpriteState {
  readonly kind: "launch" | "rain" | "impact";
  readonly slot: number;
  readonly sourceCreationOrder: number;
  readonly birthAge: number;
  readonly x: number;
  readonly y: number;
  readonly subpriority: number;
  readonly invisible: boolean;
  readonly matrixNum: number;
  readonly matrix: readonly [number, number, number, number];
}

export interface WaterSpoutFrame {
  readonly age: number;
  readonly active: boolean;
  readonly source: Readonly<{ readonly offset: number; readonly wait: number }>;
  readonly launchTaskActive: boolean;
  readonly rainTaskActive: boolean;
  readonly launchDestroyAge: number;
  readonly rainStartAge: number;
  readonly attacker: Readonly<{
    readonly x: number; readonly y: number; readonly x2: number; readonly y2: number;
    readonly matrix: readonly [number, number, number, number]; readonly affine: boolean;
  }>;
  readonly targetX2: number;
  readonly monbgEnabled: boolean;
  readonly blendEnabled: boolean;
  readonly sprites: readonly WaterSpoutSpriteState[];
  readonly painterOrder: readonly number[];
  readonly resourcesRetained: boolean;
  readonly audio: readonly Readonly<{ age: number; song: "HEADBUTT" | "DIVE" | "SURF"; pan: "attacker" | "target" }>[];
}

type MutableLaunchOrb = {
  kind: "launch"; slot: number; order: number; birthAge: number; x: number; y: number;
  fixedX: number; fixedY: number; velocityX: number; velocityY: number;
  data0: number; index: number; alive: boolean;
};
type MutableRainOrb = {
  kind: "rain"; slot: number; order: number; birthAge: number; x: number; y: number;
  impactY: number; alive: boolean;
};
type MutableImpact = {
  kind: "impact"; slot: number; order: number; birthAge: number; x: number; y: number;
  invisible: boolean; blinkDelay: number; blinkCount: number; alive: boolean;
  matrixNum: number; matrixScale: number;
};
type MutableSprite = MutableLaunchOrb | MutableRainOrb | MutableImpact;

type MutableLaunchTask = {
  state: number; d2: number; d3: number; d4: number; liveOrbs: number;
  waveLeft: number; xScale: number; yScale: number; dx: number; dy: number;
  endX: number; endY: number; x: number; y: number; x2: number; y2: number;
  active: boolean;
};

const WATER_SPOUT_MAX_END_AGE = 277;
const WATER_SPOUT_LAUNCH_AFFINE_LAG2 = new Set([
  ...Array.from({ length: 32 }, (_, index) => index + 11),
  ...Array.from({ length: 8 }, (_, index) => index + 48),
  ...Array.from({ length: 8 }, (_, index) => index + 76),
]);
const WATER_SPOUT_TIMELINE_CACHE = new WeakMap<Readonly<WaterSpoutLiveInputs>, readonly WaterSpoutFrame[]>();

function matrixFromScale(xScale: number, yScale: number): readonly [number, number, number, number] {
  // SetOamMatrix writes the task's fixed-point values directly.  These are
  // the hardware matrix coefficients, not sprite-space scale factors that
  // need to be inverted by the presentation reducer.
  return [xScale, 0, 0, yScale];
}

function prepareLaunchWave(task: MutableLaunchTask, endX: number, endY: number, duration: number): void {
  task.waveLeft = duration;
  task.endX = endX;
  task.endY = endY;
  task.dx = Math.trunc((endX - task.xScale) / duration);
  task.dy = Math.trunc((endY - task.yScale) / duration);
}

function updateLaunchWave(task: MutableLaunchTask, sourceHeight: number): boolean {
  if (task.waveLeft === 0) return false;
  task.waveLeft -= 1;
  if (task.waveLeft !== 0) {
    task.xScale += task.dx;
    task.yScale += task.dy;
  } else {
    task.xScale = task.endX;
    task.yScale = task.endY;
  }
  if (task.waveLeft !== 0) {
    const scaled = Math.min(128, Math.trunc((sourceHeight << 8) / task.yScale));
    task.y2 = Math.trunc((sourceHeight - scaled) / 2);
  } else task.y2 = 0;
  return task.waveLeft !== 0;
}

function freeSlot(inputs: Readonly<WaterSpoutLiveInputs>, sprites: readonly MutableSprite[]): number {
  const occupied = new Set(sprites.filter((sprite) => sprite.alive).map((sprite) => sprite.slot));
  const slot = inputs.launchSpriteSlots.find((candidate) => !occupied.has(candidate));
  if (slot === undefined) throw new Error("Water Spout sprite allocator exhausted");
  return slot;
}

function freeMatrix(inputs: Readonly<WaterSpoutLiveInputs>, sprites: readonly MutableSprite[]): number {
  const candidates = inputs.impactAffineSlots ?? [0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const occupied = new Set(sprites.filter((sprite): sprite is MutableImpact => sprite.alive && sprite.kind === "impact").map((sprite) => sprite.matrixNum));
  const slot = candidates.find((candidate) => !occupied.has(candidate));
  if (slot === undefined) throw new Error("Water Spout affine allocator exhausted");
  return slot;
}

function sourceCursor(age: number, launchDestroyAge: number, rainStartAge: number): { offset: number; wait: number } {
  if (age === 0) return { offset: 0, wait: 0 };
  if (age < 4) return { offset: 3, wait: age === 1 ? 1 : 0 };
  if (age < 7) return { offset: 6, wait: age === 4 ? 1 : 0 };
  if (age < 10) return { offset: 8, wait: age === 7 ? 1 : 0 };
  if (age <= 55) return { offset: 24, wait: Math.max(0, 54 - age) };
  if (age <= launchDestroyAge) return { offset: 28, wait: 1 };
  if (age < rainStartAge) return { offset: 31, wait: Math.max(0, rainStartAge - age - 2) };
  return { offset: 45, wait: 1 };
}

function launchTaskStep(
  task: MutableLaunchTask,
  inputs: Readonly<WaterSpoutLiveInputs>,
  sprites: MutableSprite[],
  order: { value: number },
): void {
  const sourceHeight = inputs.attackerSourceHeight ?? 40;
  const updateOpening = (): void => {
    task.d3 += 1;
    if (task.d3 > 1) {
      task.d3 = 0;
      task.d4 += 1;
      if (task.d4 & 1) { task.x2 = 3; task.y += 1; } else task.x2 = -3;
    }
    if (!updateLaunchWave(task, sourceHeight)) {
      const scaled = Math.min(128, Math.trunc((sourceHeight << 8) / task.yScale));
      task.y2 = Math.trunc((sourceHeight - scaled) / 2);
      task.x2 = 0; task.d3 = 0; task.d4 = 0; task.state = 2;
    }
  };
  const updateLaunchShake = (): void => {
    task.d3 += 1;
    if (task.d3 > 1) {
      task.d3 = 0; task.d4 += 1;
      if (task.d4 & 1) task.y2 += 2; else task.y2 -= 2;
      if (task.d4 === 10) {
        prepareLaunchWave(task, 0x100, 0x100, 8);
        task.d3 = 0; task.d4 = 0; task.state = 6;
      }
    }
  };
  switch (task.state) {
    case 0:
      prepareLaunchWave(task, 0xe0, 0x200, 32); task.state = 1; updateOpening();
      break;
    case 1: updateOpening(); break;
    case 2:
      task.d3 += 1;
      if (task.d3 > 4) { prepareLaunchWave(task, 0x180, 0xe0, 8); task.d3 = 0; task.state = 3; }
      break;
    case 3:
      if (!updateLaunchWave(task, sourceHeight)) { task.d3 = 0; task.d4 = 0; task.state = 4; }
      break;
    case 4: {
      const seeds = waterSpoutLaunchOrbSeeds(inputs);
      for (const seed of seeds) {
        sprites.push({ kind: "launch", slot: seed.slot, order: order.value++, birthAge: 55, x: seed.x, y: seed.y,
          fixedX: seed.data[2], fixedY: seed.data[3], velocityX: seed.data[4], velocityY: seed.data[5],
          data0: seed.data[0], index: seed.index, alive: true });
      }
      task.liveOrbs = seeds.length; task.state = 5;
      // Source falls through to case 5 on the creation callback.
      updateLaunchShake();
      break;
    }
    case 5: updateLaunchShake(); break;
    case 6:
      task.y -= 1;
      if (!updateLaunchWave(task, sourceHeight)) {
        task.xScale = 0x100; task.yScale = 0x100;
        task.y = inputs.attackerEffectCenter.y - (inputs.attackerSide === "player" ? 8 : 0);
        task.x2 = 0; task.y2 = 0; task.d4 = 0; task.state = 7;
      }
      break;
    case 7:
      if (task.liveOrbs === 0) task.active = false;
      break;
  }
}

function waterSpoutMovePower(hp: number, maxHp: number): number {
  return Math.max(1, Math.trunc(hp * 150 / maxHp));
}

function shakeInitialOffset(hp: number, maxHp: number): number {
  // AnimTask_HorizontalShake receives intensity 0, so the source derives its
  // offset from gAnimMovePower.  Water Spout's scaledamagebyhealthratio has
  // already replaced that power with floor(150 * HP / maxHP).
  return Math.trunc(waterSpoutMovePower(hp, maxHp) / 10) + 3;
}

function shakeDuration(initialOffset: number): number {
  return 2 * WATER_SPOUT_HORIZONTAL_SHAKE.duration + 8 * (initialOffset - 1);
}

function shakeX2(age: number, creationAge: number, duration: number, initialOffset: number): number {
  const local = age - creationAge;
  if (local < 1 || local >= duration) return 0;
  const callback = Math.floor((local + 1) / 2);
  if (callback <= 12) return callback & 1 ? Math.ceil(initialOffset / 2) : -Math.floor(initialOffset / 2);
  const decayCallback = callback - 12;
  const magnitude = initialOffset - 1 - Math.floor((decayCallback - 1) / 4);
  if (magnitude <= 0) return 0;
  const timer = (decayCallback - 1) % 4;
  return timer & 1 ? -Math.floor(magnitude / 2) : Math.ceil(magnitude / 2);
}

/** Complete source-callback reducer for Water Spout's retained full-HP body. */
export function waterSpoutTimeline(inputs: Readonly<WaterSpoutLiveInputs>): readonly WaterSpoutFrame[] {
  const cached = WATER_SPOUT_TIMELINE_CACHE.get(inputs);
  if (cached) return cached;
  const tier = waterSpoutPowerTier(inputs.attackerHp, inputs.attackerMaxHp);
  if (inputs.launchSpriteSlots.length < waterSpoutLaunchOrbCount(tier)) throw new Error("Water Spout allocator profile too small");
  const task: MutableLaunchTask = {
    state: 0, d2: 0, d3: 0, d4: 0, liveOrbs: 0, waveLeft: 0,
    xScale: 0x100, yScale: 0x100, dx: 0, dy: 0, endX: 0x100, endY: 0x100,
    x: inputs.attackerEffectCenter.x,
    y: inputs.attackerEffectCenter.y - (inputs.attackerSide === "player" ? 8 : 0),
    x2: 0, y2: 0, active: false,
  };
  const sprites: MutableSprite[] = [];
  const frames: WaterSpoutFrame[] = [];
  const order = { value: 0 };
  let launchDestroyAge = -1;
  let rainStartAge = Number.POSITIVE_INFINITY;
  let shakeCreationAge = Number.POSITIVE_INFINITY;
  const attempts = waterSpoutRainAttempts(inputs.attackerSide, tier);
  let nextRain = 0;
  let spriteOrder = inputs.spriteOrderSeed?.slice()
    ?? Array.from({ length: 64 }, (_, slot) => slot);
  if (spriteOrder.length !== 64 || new Set(spriteOrder).size !== 64) throw new Error("Water Spout sprite order seed must permute all 64 slots");

  const targetShakeInitialOffset = shakeInitialOffset(inputs.attackerHp, inputs.attackerMaxHp);
  const targetShakeDuration = shakeDuration(targetShakeInitialOffset);
  for (let age = 0; age <= WATER_SPOUT_MAX_END_AGE; age += 1) {
    if (age === 10) task.active = true;

    // AnimateSprites scans slots before the visual-task pass. A hit created
    // into a later slot therefore receives its first affine/callback update
    // on the creation row; one created into an earlier slot waits a row.
    for (let slot = 0; slot < 64; slot += 1) {
      const sprite = sprites.find((candidate) => candidate.alive && candidate.slot === slot);
      if (!sprite) continue;
      if (sprite.kind === "launch") {
        if (age <= 55) continue;
        if (sprite.data0 === 0) {
          sprite.velocityX += (sprite.index % 6) * 3;
          sprite.velocityY += (sprite.index % 3) * 3;
          sprite.data0 = 1;
        }
        sprite.fixedX += sprite.velocityX; sprite.fixedY += sprite.velocityY;
        sprite.x = sprite.fixedX >> 4; sprite.y = sprite.fixedY >> 4;
        if (sprite.x < -8 || sprite.x > 248 || sprite.y < -8 || sprite.y > 120) {
          sprite.alive = false; task.liveOrbs -= 1;
        }
      } else if (sprite.kind === "rain") {
        sprite.y += 8;
        if (sprite.y >= sprite.impactY) {
          const impactSlot = freeSlot(inputs, sprites);
          const matrixNum = freeMatrix(inputs, sprites);
          sprites.push({ kind: "impact", slot: impactSlot, order: order.value++, birthAge: age, x: sprite.x, y: sprite.y,
            invisible: false, blinkDelay: 0, blinkCount: 0, alive: true, matrixNum, matrixScale: 256 });
          sprite.alive = false;
          if (!Number.isFinite(shakeCreationAge)) shakeCreationAge = age;
        }
      } else {
        sprite.matrixScale = 512;
        sprite.blinkDelay += 1;
        if (sprite.blinkDelay > 1) {
          sprite.blinkDelay = 0; sprite.invisible = !sprite.invisible; sprite.blinkCount += 1;
          if (sprite.blinkCount === 12) sprite.alive = false;
        }
      }
    }

    if (task.active) {
      launchTaskStep(task, inputs, sprites, order);
      if (!task.active) { launchDestroyAge = age; rainStartAge = age + 19; }
    }
    if (age >= rainStartAge && nextRain < attempts.length && age === rainStartAge + 4 + nextRain * 3) {
      const attempt = attempts[nextRain]!;
      sprites.push({ kind: "rain", slot: freeSlot(inputs, sprites), order: order.value++, birthAge: age, x: attempt.x, y: 0,
        impactY: attempt.impactY, alive: true });
      nextRain += 1;
    }

    const launchMatrix = matrixFromScale(task.xScale, task.yScale);
    const liveSprites = sprites.filter((sprite) => sprite.alive).map((sprite): WaterSpoutSpriteState => ({
      kind: sprite.kind, slot: sprite.slot, sourceCreationOrder: sprite.order, birthAge: sprite.birthAge, x: sprite.x, y: sprite.y,
      subpriority: sprite.kind === "launch" ? inputs.attackerSubpriority - 1 : sprite.kind === "impact" ? 1 : 0,
      invisible: sprite.kind === "impact" ? sprite.invisible : false,
      matrixNum: sprite.kind === "impact" ? sprite.matrixNum : 0,
      matrix: sprite.kind === "impact" ? [sprite.matrixScale, 0, 0, sprite.matrixScale] : [256, 0, 0, 256],
    })).sort((left, right) => left.slot - right.slot);
    const keys = new Map(liveSprites.map((sprite) => [sprite.slot, sprite]));
    for (let index = 1; index < spriteOrder.length; index += 1) {
      let cursor = index;
      while (cursor > 0) {
        const prior = keys.get(spriteOrder[cursor - 1]!);
        const next = keys.get(spriteOrder[cursor]!);
        const priorSub = prior?.subpriority ?? 0xff;
        const nextSub = next?.subpriority ?? 0xff;
        const swap = priorSub > nextSub
          || (priorSub === nextSub && (prior?.y ?? 160) < (next?.y ?? 160));
        if (!swap) break;
        [spriteOrder[cursor - 1], spriteOrder[cursor]] = [spriteOrder[cursor]!, spriteOrder[cursor - 1]!];
        cursor -= 1;
      }
    }
    const painterOrder = spriteOrder.filter((slot) => keys.has(slot)).reverse();
    frames.push({
      age, active: true,
      source: sourceCursor(age, launchDestroyAge < 0 ? age : launchDestroyAge, rainStartAge),
      launchTaskActive: task.active,
      rainTaskActive: age >= rainStartAge && (nextRain < attempts.length || liveSprites.some((sprite) => sprite.kind === "rain" || sprite.kind === "impact")),
      launchDestroyAge, rainStartAge,
      attacker: { x: task.x, y: task.y, x2: task.x2, y2: task.y2, matrix: launchMatrix, affine: task.active && task.state < 7 },
      targetX2: shakeX2(age, shakeCreationAge, targetShakeDuration, targetShakeInitialOffset),
      monbgEnabled: age >= 7 && age < rainStartAge,
      blendEnabled: age >= 10 && age < rainStartAge,
      sprites: liveSprites,
      painterOrder,
      resourcesRetained: age >= 1,
      audio: [
        ...(age === 10 ? [{ age, song: "HEADBUTT" as const, pan: "attacker" as const }] : []),
        ...(age === 56 ? [{ age, song: "DIVE" as const, pan: "attacker" as const }] : []),
        ...(age === rainStartAge ? [{ age, song: "SURF" as const, pan: "target" as const }] : []),
      ],
    });
  }
  // Fill cursor-derived lifecycle fields that were unknown before the launch
  // task reached its source-owned terminal condition.
  // `end` is held by the longer of SE_M_SURF (98 displayed rows from its
  // source-relative start) and the HP-power-derived HorizontalShake task.
  // The latter remains live for duration rows and yields one pointer cleanup
  // row before the first inactive display.
  const endAge = Math.max(rainStartAge + 98, shakeCreationAge + targetShakeDuration + 1);
  const complete = frames.slice(0, endAge + 1).map((frame) => ({
    ...frame,
    active: frame.age < endAge,
    resourcesRetained: frame.age >= 1 && frame.age < endAge,
    launchDestroyAge,
    rainStartAge,
    source: sourceCursor(frame.age, launchDestroyAge, rainStartAge),
  }));
  WATER_SPOUT_TIMELINE_CACHE.set(inputs, complete);
  return complete;
}

export function waterSpoutAtAge(age: number, inputs: Readonly<WaterSpoutLiveInputs>): WaterSpoutFrame {
  const timeline = waterSpoutTimeline(inputs);
  if (!Number.isInteger(age) || age < 0 || age >= timeline.length) throw new Error("Water Spout age out of range");
  return timeline[age]!;
}

export function waterSpoutLaunchMatrixSourceAge(displayAge: number): number {
  return Math.max(0, displayAge - (WATER_SPOUT_LAUNCH_AFFINE_LAG2.has(displayAge) ? 2 : 1));
}

export interface WaterSpoutLaunchOrbSeed {
  readonly index: number;
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly subpriority: number;
  readonly velocityX: number;
  readonly velocityY: number;
  readonly immediateCallback: boolean;
  readonly data: readonly [0 | 1, number, number, number, number, number, number, 2];
}

export interface WaterSpoutRainAttempt {
  readonly index: number;
  /** Age in executions of AnimTask_WaterSpoutRain_Step, not a battle tick. */
  readonly taskCallbackAge: number;
  readonly x: number;
  readonly impactY: number;
  readonly sineIndex: number;
  readonly nextX: number;
  readonly fallCallbacks: number;
  readonly impactCallbacks: 24;
}

function assertU16(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) throw new Error(`invalid ${label}`);
}

function sine(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function cosine(angle: number, amplitude: number): number {
  return sine(angle + 64, amplitude);
}

/** Exact GetWaterSpoutPowerForAnim quarter test, including u16 / 4 truncation. */
export function waterSpoutPowerTier(hp: number, maxHp: number): WaterSpoutPowerTier {
  assertU16(hp, "Water Spout HP");
  assertU16(maxHp, "Water Spout max HP");
  if (maxHp === 0 || hp > maxHp) throw new Error("invalid Water Spout live HP pair");
  const quarter = Math.trunc(maxHp / 4);
  for (let tier = 0; tier < 3; tier += 1) {
    if (hp < quarter * (tier + 1)) return tier as WaterSpoutPowerTier;
  }
  return 3;
}

export function waterSpoutLaunchOrbCount(tier: WaterSpoutPowerTier): number {
  const increment = 4 - tier;
  return Math.ceil(20 / increment);
}

/** CreateWaterSpoutLaunchDroplets plus the alternating immediate callback. */
export function waterSpoutLaunchOrbSeeds(
  inputs: Readonly<WaterSpoutLiveInputs>,
): readonly WaterSpoutLaunchOrbSeed[] {
  const tier = waterSpoutPowerTier(inputs.attackerHp, inputs.attackerMaxHp);
  const increment = 4 - tier;
  const count = waterSpoutLaunchOrbCount(tier);
  if (!Number.isInteger(inputs.launchTaskSlot) || inputs.launchTaskSlot < 0
    || inputs.launchSpriteSlots.length < count
    || !Number.isInteger(inputs.attackerSubpriority)) throw new Error("invalid Water Spout launch profile");
  const result: WaterSpoutLaunchOrbSeed[] = [];
  let trigIndex = 172;
  let creationOrder = 0;
  for (let i = 0; i < 20; i += increment) {
    const immediateCallback = (creationOrder & 1) !== 0;
    let velocityX = cosine(trigIndex, 64);
    let velocityY = sine(trigIndex, 64);
    // AnimSmallWaterOrb applies these once, on its first callback. The task
    // calls only alternating new sprites immediately; the rest retain the
    // unadjusted seed until the next scheduler pass.
    if (immediateCallback) {
      velocityX += (i % 6) * 3;
      velocityY += (i % 3) * 3;
    }
    let fixedX = inputs.attackerEffectCenter.x * 16;
    let fixedY = inputs.attackerEffectCenter.y * 16;
    if (immediateCallback) { fixedX += velocityX; fixedY += velocityY; }
    result.push({
      index: i,
      slot: inputs.launchSpriteSlots[creationOrder]!,
      x: fixedX >> 4,
      y: fixedY >> 4,
      subpriority: inputs.attackerSubpriority - 1,
      velocityX,
      velocityY,
      immediateCallback,
      data: [immediateCallback ? 1 : 0, i, fixedX, fixedY, velocityX, velocityY, inputs.launchTaskSlot, 2],
    });
    creationOrder += 1;
    trigIndex = (trigIndex + increment * 2) & 0xff;
  }
  return result;
}

export function waterSpoutRainAttemptCount(tier: WaterSpoutPowerTier): number {
  return tier * 5 + 5;
}

/** Signed low 32-bit ISO_RANDOMIZE2 used by the source before its modulo. */
export function waterSpoutIsoRandomize2(value: number): number {
  return (Math.imul(1103515245, value) + 12345) | 0;
}

/** CreateWaterSpoutRainDroplet for every tier-owned attempt. */
export function waterSpoutRainAttempts(
  side: WaterSpoutSide,
  tier: WaterSpoutPowerTier,
): readonly WaterSpoutRainAttempt[] {
  const minX = side === "player" ? 136 : 16;
  const baseY = side === "player" ? 40 : 80;
  const width = 98;
  const result: WaterSpoutRainAttempt[] = [];
  let x = minX + 49;
  let sineIndex = 0;
  for (let index = 0; index < waterSpoutRainAttemptCount(tier); index += 1) {
    const impactY = ((GBA_SINE_TABLE_256[sineIndex]! + 3) >> 4) + baseY;
    const nextX = (waterSpoutIsoRandomize2(x) % width) + minX;
    result.push({
      index, taskCallbackAge: (index + 1) * 3, x, impactY, sineIndex, nextX,
      fallCallbacks: Math.ceil(impactY / 8), impactCallbacks: 24,
    });
    sineIndex = (sineIndex + 39) & 0xff;
    x = nextX;
  }
  return result;
}

export function waterSpoutComponentPlan(inputs: Readonly<WaterSpoutLiveInputs>) {
  const tier = waterSpoutPowerTier(inputs.attackerHp, inputs.attackerMaxHp);
  return {
    tier,
    launch: waterSpoutLaunchOrbSeeds(inputs),
    rain: waterSpoutRainAttempts(inputs.attackerSide, tier),
    impact: { affineAnim: WATER_SPOUT_IMPACT_AFFINE_ANIM, blinkCallbacks: 24 },
    shake: WATER_SPOUT_HORIZONTAL_SHAKE,
    resources: {
      glowyBlueOrb: WATER_SPOUT_GLOWY_BLUE_ORB_TAG,
      waterImpact: WATER_SPOUT_WATER_IMPACT_TAG,
    },
    animationRng: inputs.animationRng,
  } as const;
}
