/**
 * Pure source-relative reducer for Move_HAIL.
 *
 * This is the presentation half of Hail only.  The source cursor, palette
 * ramps, animation RNG, sound loop, sprite/task allocators, affine matrices,
 * and one-row hardware transfer latches are modeled here; weather, damage,
 * battle RNG, turn order, and facility state remain outside this seam.
 */
import { advanceRngValue } from "../engine/rng.ts";

export const HAIL_WINDOW_ROWS = 158;
export const HAIL_TAG = 10263;
export const ICE_CRYSTALS_TAG = 10141;
export const HAIL_SELECTED_PALETTES = 0x0000_000e;
export const HAIL_SOURCE_BASE = 0x082c_dc76;

const NEUTRAL_MATRIX = [256, 0, 0, 256] as const;
const HAIL_MATRIX_VALUES = [256, 273, 292] as const;
const CRYSTAL_MATRIX_VALUES = [256, 318, 310, 303, 296, 289, 283, 277, 271, 266, 261, 256] as const;

export interface HailTarget {
  readonly targetX: number;
  readonly targetY: number;
  readonly initialX: number;
  readonly initialY: -8;
  readonly impact: boolean;
}

export interface HailProfile {
  /** gRng2Value in the first retained Move_HAIL source row. */
  readonly animationRngAtAge0: number;
  /** Live non-Hail OBJ slots at source entry. */
  readonly occupiedSpriteSlots: readonly number[];
  /** Live affine matrix slots at source entry. */
  readonly occupiedAffineMatrixSlots: readonly number[];
  /** Source-derived ten-coordinate Hail table after battler resolution. */
  readonly targets: readonly [HailTarget, HailTarget, HailTarget, HailTarget, HailTarget, HailTarget, HailTarget, HailTarget, HailTarget, HailTarget];
  /** Palette snapshots at the two loadspritegfx edges and source entry. */
  readonly unfadedPaletteBeforeLoad: readonly number[];
  readonly fadedPaletteBeforeLoad: readonly number[];
  readonly hardwarePaletteAtAge0: readonly number[];
  readonly unfadedPaletteAfterHailLoad: readonly number[];
  readonly fadedPaletteAfterHailLoad: readonly number[];
  readonly unfadedPaletteAfterCrystalLoad: readonly number[];
  readonly fadedPaletteAfterCrystalLoad: readonly number[];
  /** Hardware affine matrix snapshot at the first retained row. */
  readonly hardwareMatricesAtAge0?: readonly (readonly [number, number, number, number])[];
}

export interface HailTask {
  readonly slot: 0 | 1;
  readonly callback: "AnimTask_Hail2" | "AnimTask_BlendSpriteColor_Step2" | "Task_LoopAndPlaySE";
  readonly data: readonly number[];
}

export interface HailParticle {
  readonly kind: "particle";
  readonly slot: number;
  readonly matrixNum: number;
  readonly template: "gHailParticleSpriteTemplate";
  readonly callback: "AnimHailBegin";
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly animNum: 0;
  readonly animCmdIndex: 0;
  readonly animDelayCounter: 0;
  readonly subpriority: 18;
  readonly invisible: false;
  readonly matrix: readonly [number, 0, 0, number];
  readonly data: readonly [number, 0, 0, number, number, number, 0, 1];
  readonly attr: readonly [number, number, 31025];
  readonly birthAge: number;
}

export interface HailCrystal {
  readonly kind: "crystal";
  readonly slot: number;
  readonly matrixNum: number;
  readonly template: "gIceCrystalHitLargeSpriteTemplate";
  readonly callback: "AnimHailContinue";
  readonly x: number;
  readonly y: number;
  readonly x2: 0;
  readonly y2: 0;
  readonly animNum: 0;
  readonly animCmdIndex: 0;
  readonly animDelayCounter: 0;
  readonly subpriority: 18;
  readonly invisible: false;
  readonly matrix: readonly [number, 0, 0, number];
  readonly data: readonly [number, 0, 0, 0, 0, 0, 0, 1];
  readonly attr: readonly [number, number, 35129];
  readonly birthAge: number;
}

export type HailSprite = HailParticle | HailCrystal;

export interface HailPaletteState {
  readonly selectedPalettes: 0x0000000e;
  readonly coefficient: number;
  readonly hardwareCoefficient: number;
  readonly unfaded: readonly number[];
  readonly faded: readonly number[];
  readonly hardware: readonly number[];
}

export interface HailState {
  readonly age: number;
  readonly active: boolean;
  readonly source: Readonly<{
    readonly owner: "Move_HAIL";
    readonly offset: 0 | 3 | 6 | 23 | 37 | 55;
    readonly pointer: number;
    readonly pointerParity: 0 | 1;
    readonly wait: number;
    readonly args: readonly number[];
  }>;
  readonly animationRng: number;
  readonly tasks: readonly HailTask[];
  readonly sprites: readonly HailSprite[];
  readonly oam: Readonly<{
    readonly transferLagRows: 1;
    readonly software: readonly Readonly<{ slot: number; attr: readonly number[] }>[];
    readonly hardware: readonly Readonly<{ slot: number; attr: readonly number[] }>[];
  }>;
  readonly matrices: Readonly<{
    readonly software: readonly (readonly [number, number, number, number])[];
    readonly hardware: readonly (readonly [number, number, number, number])[];
    readonly transferLagRows: 1;
  }>;
  readonly palette: HailPaletteState;
  readonly resources: Readonly<{
    readonly tileTags: readonly number[];
    readonly paletteTags: readonly number[];
    readonly loaded: boolean;
  }>;
  readonly audio: Readonly<{
    readonly starts: readonly Readonly<{ readonly age: 34; readonly sound: "SE_M_HAIL"; readonly id: 242; readonly pan: 0 }>[];
    readonly current: "SE_M_HAIL" | null;
    readonly active: boolean;
    readonly status: 0 | 3 | 0x80000000;
    readonly loop: Readonly<{ readonly interval: 8; readonly count: 10; readonly taskActive: boolean }>;
  }>;
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0 | 1;
}

type InternalParticle = {
  kind: "particle";
  slot: number;
  matrixNum: number;
  target: HailTarget;
  affineNum: 0 | 1 | 2;
  birthAge: number;
};
type InternalCrystal = {
  kind: "crystal";
  slot: number;
  matrixNum: number;
  targetX: number;
  targetY: number;
  birthAge: number;
  /** A newly created crystal can be visited by the same ascending OAM pass. */
  timerOffset: 0 | 1;
};
type InternalSprite = InternalParticle | InternalCrystal;

const zeroArgs = (): readonly number[] => [0, 0, 0, 0, 0, 0, 0, 0];
const blendUpArgs = (): readonly number[] => [1, 3, 0, 6, 0, 0, 0, 0];
const blendDownArgs = (): readonly number[] => [1, 3, 6, 0, 0, 0, 0, 0];

function sourceAtAge(age: number): HailState["source"] {
  let offset: HailState["source"]["offset"];
  let wait: number;
  let args: readonly number[];
  if (age <= 0) { offset = 0; wait = 0; args = zeroArgs(); }
  else if (age <= 3) { offset = 3; wait = age === 1 ? 1 : 0; args = zeroArgs(); }
  else if (age <= 6) { offset = 6; wait = age === 4 ? 1 : 0; args = zeroArgs(); }
  else if (age <= 33) { offset = 23; wait = 1; args = blendUpArgs(); }
  else if (age <= 129) { offset = 37; wait = 1; args = blendUpArgs(); }
  else { offset = 55; wait = 1; args = blendDownArgs(); }
  const pointer = HAIL_SOURCE_BASE + offset;
  return { owner: "Move_HAIL", offset, pointer, pointerParity: (pointer & 1) as 0 | 1, wait, args };
}

function hailBlendCoefficientAtAge(age: number): number {
  // BlendBattleAnimPal's task is created on the script edge, but its first
  // visible write lands after the three-frame delay.  The source task data
  // therefore leads the faded-palette edge by one task cycle.
  if (age < 13) return 0;
  if (age <= 32) return Math.min(6, Math.floor((age - 9) / 4));
  if (age <= 135) return 6;
  if (age <= 155) return Math.max(0, 6 - Math.floor((age - 132) / 4));
  return 0;
}

function blendPalette(unfaded: readonly number[], baseFaded: readonly number[], coefficient: number): number[] {
  return unfaded.map((color, index) => {
    if ((HAIL_SELECTED_PALETTES & (1 << Math.floor(index / 16))) === 0) return baseFaded[index]!;
    const blend = (component: number): number => component + ((-component * coefficient) >> 4);
    return blend(color & 31) | (blend((color >> 5) & 31) << 5) | (blend((color >> 10) & 31) << 10);
  });
}

function paletteAtAge(age: number, profile: HailProfile): HailPaletteState {
  const unfaded = age < 1
    ? profile.unfadedPaletteBeforeLoad
    : age < 4 ? profile.unfadedPaletteAfterHailLoad : profile.unfadedPaletteAfterCrystalLoad;
  const baseFaded = age < 1
    ? profile.fadedPaletteBeforeLoad
    : age < 4 ? profile.fadedPaletteAfterHailLoad : profile.fadedPaletteAfterCrystalLoad;
  const coefficient = hailBlendCoefficientAtAge(age);
  const hardwareCoefficient = age > 0 ? hailBlendCoefficientAtAge(age - 1) : 0;
  const hardware = age === 0
    ? [...profile.hardwarePaletteAtAge0]
    : paletteAtAge(age - 1, profile).faded;
  return {
    selectedPalettes: HAIL_SELECTED_PALETTES,
    coefficient,
    hardwareCoefficient,
    unfaded: [...unfaded],
    faded: age === 0 ? [...baseFaded] : blendPalette(unfaded, baseFaded, coefficient),
    hardware,
  };
}

function matrixAtAge(sprite: InternalSprite, age: number): number {
  const elapsed = age - sprite.birthAge + (sprite.kind === "crystal" ? sprite.timerOffset : 0);
  if (sprite.kind === "particle") return elapsed === 0 ? 256 : (HAIL_MATRIX_VALUES[sprite.affineNum] ?? 256);
  return CRYSTAL_MATRIX_VALUES[Math.min(elapsed, CRYSTAL_MATRIX_VALUES.length - 1)] ?? 256;
}

function particleAttr(sprite: InternalParticle, age: number, x: number, y: number): readonly [number, number, 31025] {
  const ready = age > sprite.birthAge;
  const attr0 = ready ? 0x100 + ((y - 8) & 0xff) : 0x100;
  const attr1 = 0x4000 + sprite.matrixNum * 0x200 + (ready ? ((x - 8) & 0x1ff) : 0);
  return [attr0, attr1, 31025];
}

function crystalAttr(sprite: InternalCrystal): readonly [number, number, 35129] {
  return [0x8500 + ((sprite.targetY - 8) & 0xff), sprite.matrixNum * 0x200 + ((sprite.targetX - 4) & 0x1ff), 35129];
}

function toPublic(sprite: InternalSprite, age: number): HailSprite {
  if (sprite.kind === "particle") {
    const elapsed = age - sprite.birthAge;
    const x = sprite.target.initialX + elapsed * 4;
    const y = -8 + elapsed * 8;
    return {
      kind: "particle", slot: sprite.slot, matrixNum: sprite.matrixNum,
      template: "gHailParticleSpriteTemplate", callback: "AnimHailBegin", x, y,
      x2: 0, y2: 0, animNum: 0, animCmdIndex: 0, animDelayCounter: 0,
      subpriority: 18, invisible: false,
      matrix: [matrixAtAge(sprite, age), 0, 0, matrixAtAge(sprite, age)],
      data: [sprite.target.impact ? 1 : 0, 0, 0, sprite.target.targetX, sprite.target.targetY, sprite.affineNum, 0, 1],
      attr: particleAttr(sprite, age, x, y), birthAge: sprite.birthAge,
    };
  }
  const matrix = matrixAtAge(sprite, age);
  const timer = age - sprite.birthAge + sprite.timerOffset;
  return {
    kind: "crystal", slot: sprite.slot, matrixNum: sprite.matrixNum,
    template: "gIceCrystalHitLargeSpriteTemplate", callback: "AnimHailContinue",
    x: sprite.targetX, y: sprite.targetY, x2: 0, y2: 0, animNum: 0,
    animCmdIndex: 0, animDelayCounter: 0, subpriority: 18, invisible: false,
    matrix: [matrix, 0, 0, matrix],
    data: [timer, 0, 0, 0, 0, 0, 0, 1],
    attr: crystalAttr(sprite), birthAge: sprite.birthAge,
  };
}

function freeSlot(objects: readonly InternalSprite[], occupied: readonly number[]): number {
  const used = new Set([...occupied, ...objects.map((sprite) => sprite.slot)]);
  let slot = 0;
  while (used.has(slot)) slot += 1;
  return slot;
}

function freeMatrix(objects: readonly InternalSprite[], occupied: readonly number[]): number {
  const used = new Set([...occupied, ...objects.map((sprite) => sprite.matrixNum)]);
  let matrix = 0;
  while (used.has(matrix)) matrix += 1;
  return matrix;
}

function spawnAges(): readonly Readonly<{ readonly group: number; readonly affineNum: 0 | 1 | 2 }>[] {
  return Array.from({ length: 10 }, (_, group) => [0, 1, 2].map((affineNum) => ({ group, affineNum: affineNum as 0 | 1 | 2 })) as Readonly<{ group: number; affineNum: 0 | 1 | 2 }>[]).flat();
}

function simulate(age: number, profile: HailProfile): readonly InternalSprite[] {
  let objects: InternalSprite[] = [];
  const births = spawnAges();
  for (let current = 1; current <= age; current += 1) {
    const previous = [...objects].sort((a, b) => a.slot - b.slot);
    for (const sprite of previous) {
      if (!objects.includes(sprite)) continue;
      if (sprite.kind === "crystal") {
        if (current - sprite.birthAge + sprite.timerOffset >= 20) objects = objects.filter((candidate) => candidate !== sprite);
        continue;
      }
      const elapsed = current - sprite.birthAge;
      const x = sprite.target.initialX + elapsed * 4;
      const y = -8 + elapsed * 8;
      if (x < sprite.target.targetX && y < sprite.target.targetY) continue;
      if (sprite.target.impact && sprite.affineNum === 0) {
        const crystal: InternalCrystal = {
          kind: "crystal", slot: freeSlot(objects, profile.occupiedSpriteSlots),
          matrixNum: freeMatrix(objects, profile.occupiedAffineMatrixSlots),
          targetX: sprite.target.targetX, targetY: sprite.target.targetY, birthAge: current,
          timerOffset: 0,
        };
        if (crystal.slot > sprite.slot) crystal.timerOffset = 1;
        objects.push(crystal);
      }
      objects = objects.filter((candidate) => candidate !== sprite);
    }
    for (const { group, affineNum } of births) {
      const birthAge = 37 + group * 8 + affineNum * 2;
      if (birthAge !== current) continue;
      const target = profile.targets[group]!;
      objects.push({
        kind: "particle", slot: freeSlot(objects, profile.occupiedSpriteSlots),
        matrixNum: freeMatrix(objects, profile.occupiedAffineMatrixSlots),
        target, affineNum, birthAge,
      });
    }
  }
  return objects.sort((a, b) => a.slot - b.slot);
}

function hailTaskAtAge(age: number, count: number): HailTask | null {
  if (age < 34 || age > 128) return null;
  let state: number; let affine: number; let group: number; let delay: number; let timer: number;
  if (age === 34) [state, affine, group, delay, timer] = [0, 0, 0, 1, 0];
  else if (age === 35) [state, affine, group, delay, timer] = [0, 0, 0, 2, 0];
  else if (age === 36) [state, affine, group, delay, timer] = [1, 0, 0, 0, 0];
  else if (age >= 37 && age <= 112) {
    const local = (age - 37) % 8;
    group = Math.floor((age - 37) / 8);
    if (local === 0) [state, affine, delay, timer] = [1, 1, 0, 1];
    else if (local === 1) [state, affine, delay, timer] = [1, 1, 0, 0];
    else if (local === 2) [state, affine, delay, timer] = [1, 2, 0, 1];
    else if (local === 3) [state, affine, delay, timer] = [1, 2, 0, 0];
    else if (local === 4) [state, affine, delay, timer] = [0, 3, 0, 0];
    else if (local === 5) [state, affine, delay, timer] = [0, 3, 1, 0];
    else if (local === 6) [state, affine, delay, timer] = [0, 3, 2, 0];
    else [state, affine, delay, timer] = [1, 0, 0, 0];
    if (local >= 4) group += 1;
  } else if (age === 113) [state, affine, group, delay, timer] = [2, 3, 10, 0, 0];
  else [state, affine, group, delay, timer] = [2, 3, 10, 0, 0];
  if (group === undefined) group = age >= 37 ? Math.floor((age - 37) / 8) : 0;
  return { slot: 0, callback: "AnimTask_Hail2", data: [state!, count, affine!, group!, delay!, timer!, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
}

function soundTaskAtAge(age: number): HailTask | null {
  if (age < 34 || age > 113) return null;
  const local = age - 34;
  return { slot: 1, callback: "Task_LoopAndPlaySE", data: [242, 0, 8, 9 - Math.floor((local + 1) / 9), 0, 0, 0, 0, (local + 1) % 9, 0, 0, 0, 0, 0, 0, 0] };
}

function blendTaskAtAge(age: number): HailTask | null {
  if ((age < 7 || age > 32) && (age < 130 || age > 155)) return null;
  const down = age >= 130;
  const local = age - (down ? 130 : 7);
  const coefficient = down ? Math.max(0, 6 - Math.floor((local + 2) / 4)) : Math.min(6, Math.floor((local + 2) / 4));
  return { slot: 0, callback: "AnimTask_BlendSpriteColor_Step2", data: [14, 0, 3, down ? 6 : 0, down ? 0 : 6, 0, 0, 0, 0, (local + 2) % 4, coefficient, 0, 0, 0, 0, 0] };
}

function animationRngAtAge(age: number, seed: number): number {
  let value = seed >>> 0;
  for (let current = 1; current <= age; current += 1) value = advanceRngValue(value);
  return value;
}

function audioAtAge(age: number): HailState["audio"] {
  const active = age >= 34 && age < 146;
  let status: 0 | 3 | 0x80000000 = 0x80000000;
  if (age >= 34 && age < 146) status = age === 34 || (age >= 42 && (age - 42) % 9 === 0) ? 0 : 3;
  return {
    starts: age === 34 ? [{ age: 34, sound: "SE_M_HAIL", id: 242, pan: 0 }] : [],
    current: age >= 34 ? "SE_M_HAIL" : null,
    active, status,
    loop: { interval: 8, count: 10, taskActive: age >= 34 && age <= 113 },
  };
}

/** age=0 is the first retained Move_HAIL source row. */
export function hailAtAge(age: number, profile: HailProfile): HailState {
  if (!Number.isInteger(age) || age < 0) throw new Error("Hail age must be a nonnegative integer");
  const lengths = [
    profile.unfadedPaletteBeforeLoad, profile.fadedPaletteBeforeLoad,
    profile.hardwarePaletteAtAge0, profile.unfadedPaletteAfterHailLoad,
    profile.fadedPaletteAfterHailLoad, profile.unfadedPaletteAfterCrystalLoad,
    profile.fadedPaletteAfterCrystalLoad,
  ];
  if (lengths.some((palette) => palette.length !== 512)) throw new Error("Hail palette profiles must contain 512 colors");
  if (profile.targets.length !== 10) throw new Error("Hail target table must contain ten entries");
  const sprites = simulate(age, profile).map((sprite) => toPublic(sprite, age));
  const priorSprites = age > 0 ? simulate(age - 1, profile).map((sprite) => toPublic(sprite, age - 1)) : [];
  const softwareMatrices = Array.from({ length: 32 }, (_, index) => {
    const sprite = simulate(age, profile).find((candidate) => candidate.matrixNum === index);
    const value = sprite === undefined ? 256 : matrixAtAge(sprite, age);
    return [value, 0, 0, value] as const;
  });
  const hardwareMatrices = age === 0
    ? (profile.hardwareMatricesAtAge0 ? profile.hardwareMatricesAtAge0.map((matrix) => [...matrix] as const) : Array.from({ length: 32 }, () => NEUTRAL_MATRIX))
    : Array.from({ length: 32 }, (_, index) => {
      const sprite = simulate(age - 1, profile).find((candidate) => candidate.matrixNum === index);
      const value = sprite === undefined ? 256 : matrixAtAge(sprite, age - 1);
      return [value, 0, 0, value] as const;
    });
  const tasks = [blendTaskAtAge(age), hailTaskAtAge(age, sprites.length), soundTaskAtAge(age)].filter((task): task is HailTask => task !== null);
  const resourceLoaded = age >= 1 && age <= 156;
  return {
    age, active: age < HAIL_WINDOW_ROWS - 1, source: sourceAtAge(age),
    animationRng: animationRngAtAge(age, profile.animationRngAtAge0), tasks, sprites,
    oam: {
      transferLagRows: 1,
      software: sprites.map(({ slot, attr }) => ({ slot, attr })),
      hardware: priorSprites.map(({ slot, attr }) => ({ slot, attr })),
    },
    matrices: { software: softwareMatrices, hardware: hardwareMatrices, transferLagRows: 1 },
    palette: paletteAtAge(age, profile),
    resources: {
      tileTags: resourceLoaded ? [HAIL_TAG, ...(age >= 4 ? [ICE_CRYSTALS_TAG] : [])] : [],
      paletteTags: resourceLoaded ? [HAIL_TAG, ...(age >= 4 ? [ICE_CRYSTALS_TAG] : [])] : [],
      loaded: resourceLoaded,
    },
    audio: audioAtAge(age),
    visualTaskCount: tasks.filter((task) => task.callback !== "Task_LoopAndPlaySE").length,
    soundTaskCount: soundTaskAtAge(age) === null ? 0 : 1,
  };
}
