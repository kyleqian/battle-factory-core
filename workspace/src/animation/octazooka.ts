/**
 * Pure source-relative reducer for Move_OCTAZOOKA.
 *
 * This ports the move script's cursor, tagged BLACK_BALL / GRAY_SMOKE
 * resource lifetime, `TranslateAnimSpriteToTargetMonLocation`'s immediate
 * `AnimTranslateLinear_WithFollowup` step, and the four
 * `AnimSpriteOnMonPos` animation lifecycles. It deliberately owns no move
 * accuracy, blindness status, damage, battle RNG, turn, or facility state.
 */
import { advanceRngValue } from "../engine/rng.ts";

export const OCTAZOOKA_WINDOW_ROWS = 80;
export const OCTAZOOKA_FIRST_INACTIVE_AGE = 79;
export const OCTAZOOKA_GRAY_SMOKE_TAG = 10030;
export const OCTAZOOKA_BLACK_BALL_TAG = 10017;

const NEUTRAL_MATRIX = [256, 0, 0, 256] as const;
const BALL_ATTR2 = 35121;
const SMOKE_ATTR2 = 31257;
const DESTROY_ANIM_SPRITE_WORDS = [15357, 2058] as const;
const SMOKE_CREATES = [
  { age: 29, x: 8, y: 8 },
  { age: 33, x: -8, y: -8 },
  { age: 37, x: 8, y: -8 },
  { age: 41, x: -8, y: 8 },
] as const;

export type OctazookaSide = "player" | "opponent";

export interface OctazookaProfile {
  /** `gRng2Value` in the first retained Move_OCTAZOOKA source row. */
  readonly animationRngAtAge0: number;
  /** CreateSprite's source-selected slot for the BLACK_BALL. */
  readonly ballSpriteSlot: number;
  /** CreateSprite's source-selected slots in the four smoke command order. */
  readonly smokeSpriteSlots: readonly [number, number, number, number];
  /** GetBattlerSpriteSubpriority(gBattleAnimTarget). */
  readonly targetSubpriority: number;
  /** Resource-allocation-derived OAM tile/palette words. */
  readonly oam?: Readonly<{
    readonly ballAttr2: number;
    readonly smokeAttr2: number;
  }>;
  /** Live palette transfer snapshots; this reducer never reads recordings. */
  readonly palette: Readonly<{
    readonly unfadedAtAge0: readonly number[];
    readonly fadedAtAge0: readonly number[];
    readonly hardwareAtAge0: readonly number[];
    readonly unfadedAfterGraySmokeLoad: readonly number[];
    readonly fadedAfterGraySmokeLoad: readonly number[];
    readonly unfadedAfterBlackBallLoad: readonly number[];
    readonly fadedAfterBlackBallLoad: readonly number[];
  }>;
}

export interface OctazookaSprite {
  readonly slot: number;
  readonly template:
    | "gOctazookaBallSpriteTemplate"
    | "gOctazookaSmokeSpriteTemplate";
  readonly callback:
    | "AnimTranslateLinear_WithFollowup"
    | "AnimSpriteOnMonPos"
    | "DestroyAnimSprite";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly invisible: false;
  readonly matrixNum: 0;
  readonly matrix: readonly [256, 0, 0, 256];
  readonly animation: Readonly<{
    readonly animNum: 0;
    readonly animCmdIndex: 0;
    readonly animDelayCounter: 156 | 44;
  }>;
  readonly data: readonly number[];
  /** Sprite-owned software OAM attrs after callback/animation processing. */
  readonly attr: readonly [number, number, number];
}

export interface OctazookaState {
  readonly age: number;
  readonly active: boolean;
  readonly source: Readonly<{
    readonly owner: "Move_OCTAZOOKA";
    readonly offset: 0 | 3 | 6 | 29 | 51 | 68 | 85 | 100 | 101;
    readonly wait: 0 | 1 | 2;
    readonly args: readonly number[];
  }>;
  readonly animationRng: number;
  readonly sprites: readonly OctazookaSprite[];
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0;
  /** The move creates no visual tasks; its visual count is sprite-owned. */
  readonly taskTopology: readonly [];
  readonly matrices: Readonly<{
    readonly software: readonly (readonly [256, 0, 0, 256])[];
    readonly hardware: readonly (readonly [256, 0, 0, 256])[];
    readonly transferLagRows: 1;
  }>;
  readonly oam: Readonly<{ readonly transferLagRows: 1 }>;
  readonly palette: Readonly<{
    readonly unfaded: readonly number[];
    readonly faded: readonly number[];
    readonly hardware: readonly number[];
    readonly transferLagRows: 1;
  }>;
  readonly resources: Readonly<{
    readonly graySmokeLoaded: boolean;
    readonly blackBallLoaded: boolean;
    readonly tileTags: readonly number[];
    readonly paletteTags: readonly number[];
  }>;
  readonly audio: Readonly<{
    readonly starts: readonly Readonly<{
      readonly age: 7 | 29;
      readonly sound: "SE_M_MEGA_KICK2" | "SE_M_SELF_DESTRUCT";
      readonly id: 141 | 177;
      readonly pan: "SOUND_PAN_ATTACKER" | "SOUND_PAN_TARGET";
    }>[];
    readonly current: "SE_M_MEGA_KICK2" | "SE_M_SELF_DESTRUCT" | null;
    readonly active: boolean;
    readonly status: 0 | 1 | 3 | 0x80000000;
    readonly attackerPan: -64 | 63;
    readonly targetPan: -63 | 63;
    readonly currentPan: -64 | -63 | 63;
  }>;
}

function sourceAtAge(age: number): OctazookaState["source"] {
  const zero = [0, 0, 0, 0, 0, 0, 0, 0];
  const ball = [20, 0, 0, 0, 20, 0, 0, 0];
  if (age <= 0) return { owner: "Move_OCTAZOOKA", offset: 0, wait: 0, args: zero };
  if (age <= 3) return { owner: "Move_OCTAZOOKA", offset: 3, wait: age === 1 ? 1 : 0, args: zero };
  if (age <= 6) return { owner: "Move_OCTAZOOKA", offset: 6, wait: age === 4 ? 1 : 0, args: zero };
  if (age <= 28) return { owner: "Move_OCTAZOOKA", offset: 29, wait: 1, args: ball };
  if (age <= 32) return { owner: "Move_OCTAZOOKA", offset: 51, wait: (2 - Math.min(2, age - 29)) as 0 | 1 | 2, args: [8, 8, 1, 0, 20, 0, 0, 0] };
  if (age <= 36) return { owner: "Move_OCTAZOOKA", offset: 68, wait: (2 - Math.min(2, age - 33)) as 0 | 1 | 2, args: [-8, -8, 1, 0, 20, 0, 0, 0] };
  if (age <= 40) return { owner: "Move_OCTAZOOKA", offset: 85, wait: (2 - Math.min(2, age - 37)) as 0 | 1 | 2, args: [8, -8, 1, 0, 20, 0, 0, 0] };
  if (age <= 56) return { owner: "Move_OCTAZOOKA", offset: 100, wait: 1, args: [-8, 8, 1, 0, 20, 0, 0, 0] };
  return { owner: "Move_OCTAZOOKA", offset: 101, wait: 1, args: [-8, 8, 1, 0, 20, 0, 0, 0] };
}

function animationRngAtAge(age: number, seed: number): number {
  let value = seed >>> 0;
  for (let current = 1; current <= Math.max(0, age); current += 1) {
    value = advanceRngValue(value);
  }
  return value;
}

function rawDelta(distance: number): number {
  const magnitude = Math.trunc(Math.abs(distance) * 256 / 20);
  return distance < 0 ? magnitude | 1 : magnitude & ~1;
}

function displayedOffset(raw: number, negative: boolean, callbacks: number): number {
  const value = Math.trunc(raw * callbacks / 256);
  return negative ? -value : value;
}

function ballAtAge(
  age: number,
  attackerSide: OctazookaSide,
  attacker: Readonly<{ x: number; y: number }>,
  target: Readonly<{ x: number; y: number }>,
  profile: OctazookaProfile,
): OctazookaSprite | null {
  if (age < 7 || age > 27) return null;
  const startX = attacker.x + (attackerSide === "player" ? 20 : -20);
  const startY = attacker.y;
  const xDistance = target.x - startX;
  const yDistance = target.y - startY;
  const xRaw = rawDelta(xDistance);
  const yRaw = rawDelta(yDistance);
  const callbacks = Math.min(20, age - 6);
  const x2 = displayedOffset(xRaw, xDistance < 0, callbacks);
  const y2 = displayedOffset(yRaw, yDistance < 0, callbacks);
  const attr2 = profile.oam?.ballAttr2 ?? BALL_ATTR2;
  return {
    slot: profile.ballSpriteSlot,
    template: "gOctazookaBallSpriteTemplate",
    callback: age === 27 ? "DestroyAnimSprite" : "AnimTranslateLinear_WithFollowup",
    x: startX,
    y: startY,
    x2,
    y2,
    subpriority: profile.targetSubpriority,
    invisible: false,
    matrixNum: 0,
    matrix: NEUTRAL_MATRIX,
    animation: { animNum: 0, animCmdIndex: 0, animDelayCounter: 156 },
    data: [
      20 - callbacks,
      xRaw,
      yRaw,
      xRaw * callbacks,
      yRaw * callbacks,
      0,
      ...DESTROY_ANIM_SPRITE_WORDS,
    ],
    attr: [
      (startY + y2 - 4) & 0xff,
      (startX + x2 - 4) & 0x1ff,
      attr2,
    ],
  };
}

function smokeAtAge(
  age: number,
  index: number,
  targetSide: OctazookaSide,
  target: Readonly<{ x: number; y: number }>,
  profile: OctazookaProfile,
): OctazookaSprite | null {
  const create = SMOKE_CREATES[index]!;
  const elapsed = age - create.age;
  if (elapsed < 0 || elapsed >= 15) return null;
  const frame = Math.min(4, Math.floor((elapsed + 1) / 3));
  const x = target.x + (targetSide === "player" ? -create.x : create.x);
  const y = target.y + create.y;
  const attr2 = (profile.oam?.smokeAttr2 ?? SMOKE_ATTR2) + frame * 16;
  return {
    slot: profile.smokeSpriteSlots[index]!,
    template: "gOctazookaSmokeSpriteTemplate",
    callback: "AnimSpriteOnMonPos",
    x,
    y,
    x2: 0,
    y2: 0,
    subpriority: profile.targetSubpriority,
    invisible: false,
    matrixNum: 0,
    matrix: NEUTRAL_MATRIX,
    animation: { animNum: 0, animCmdIndex: 0, animDelayCounter: 44 },
    data: [1, 0, 0, 0, 0, 0, 0, 0],
    attr: [(y - 16) & 0xff, 0x8000 | ((x - 16) & 0x1ff), attr2],
  };
}

function palettesAtAge(age: number, profile: OctazookaProfile): OctazookaState["palette"] {
  const current = age < 1
    ? [profile.palette.unfadedAtAge0, profile.palette.fadedAtAge0]
    : age < 4
      ? [profile.palette.unfadedAfterGraySmokeLoad, profile.palette.fadedAfterGraySmokeLoad]
      : [profile.palette.unfadedAfterBlackBallLoad, profile.palette.fadedAfterBlackBallLoad];
  const hardware = age <= 1
    ? profile.palette.hardwareAtAge0
    : age <= 4
      ? profile.palette.fadedAfterGraySmokeLoad
      : profile.palette.fadedAfterBlackBallLoad;
  return {
    unfaded: [...current[0]],
    faded: [...current[1]],
    hardware: [...hardware],
    transferLagRows: 1,
  };
}

function audioAtAge(
  age: number,
  attackerSide: OctazookaSide,
  targetSide: OctazookaSide,
): OctazookaState["audio"] {
  const launch = age >= 7 && age < 29;
  const impact = age >= 29;
  const active = age >= 7 && age < OCTAZOOKA_FIRST_INACTIVE_AGE;
  const attackerPan = attackerSide === "player" ? -64 : 63;
  const targetPan = targetSide === "player" ? -63 : 63;
  return {
    starts: [
      { age: 7, sound: "SE_M_MEGA_KICK2", id: 141, pan: "SOUND_PAN_ATTACKER" },
      { age: 29, sound: "SE_M_SELF_DESTRUCT", id: 177, pan: "SOUND_PAN_TARGET" },
    ],
    current: launch ? "SE_M_MEGA_KICK2" : impact ? "SE_M_SELF_DESTRUCT" : null,
    active,
    status: !active ? 0x80000000 : age === 7 || age === 29 ? 0 : launch ? 3 : 1,
    attackerPan,
    targetPan,
    currentPan: launch ? attackerPan : impact ? targetPan : attackerPan,
  };
}

/** `age=0` is the first retained active Move_OCTAZOOKA source row. */
export function octazookaAtAge(
  age: number,
  attackerSide: OctazookaSide,
  attacker: Readonly<{ x: number; y: number }>,
  targetSide: OctazookaSide,
  target: Readonly<{ x: number; y: number }>,
  profile: OctazookaProfile,
): OctazookaState {
  const ball = ballAtAge(age, attackerSide, attacker, target, profile);
  const smokes = SMOKE_CREATES.flatMap((_, index) => {
    const smoke = smokeAtAge(age, index, targetSide, target, profile);
    return smoke ? [smoke] : [];
  });
  const sprites = ball ? [ball, ...smokes] : smokes;
  const graySmokeLoaded = age >= 1 && age < OCTAZOOKA_FIRST_INACTIVE_AGE;
  const blackBallLoaded = age >= 4 && age < OCTAZOOKA_FIRST_INACTIVE_AGE;
  return {
    age,
    active: age >= 0 && age < OCTAZOOKA_FIRST_INACTIVE_AGE,
    source: sourceAtAge(age),
    animationRng: animationRngAtAge(age, profile.animationRngAtAge0),
    sprites,
    visualTaskCount: sprites.length,
    soundTaskCount: 0,
    taskTopology: [],
    matrices: {
      software: Array.from({ length: 32 }, () => NEUTRAL_MATRIX),
      hardware: Array.from({ length: 32 }, () => NEUTRAL_MATRIX),
      transferLagRows: 1,
    },
    oam: { transferLagRows: 1 },
    palette: palettesAtAge(age, profile),
    resources: {
      graySmokeLoaded,
      blackBallLoaded,
      tileTags: [graySmokeLoaded ? OCTAZOOKA_GRAY_SMOKE_TAG : null, blackBallLoaded ? OCTAZOOKA_BLACK_BALL_TAG : null]
        .filter((tag): tag is number => tag !== null),
      paletteTags: [graySmokeLoaded ? OCTAZOOKA_GRAY_SMOKE_TAG : null, blackBallLoaded ? OCTAZOOKA_BLACK_BALL_TAG : null]
        .filter((tag): tag is number => tag !== null),
    },
    audio: audioAtAge(age, attackerSide, targetSide),
  };
}
