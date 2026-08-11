import { shakeMonInPlaceOffsetAtTick } from "./shakeMonInPlace.ts";

/**
 * Complete, source-relative `Move_THRASH` visual body.
 *
 * The body is the compact script in `data/battle_anim_scripts.s`:
 *
 *   loadspritegfx ANIM_TAG_IMPACT
 *   loadspritegfx ANIM_TAG_HANDS_AND_FEET
 *   createvisualtask AnimTask_ThrashMoveMonHorizontal, 2
 *   createvisualtask AnimTask_ThrashMoveMonVertical, 2
 *   createsprite gFistFootRandomPosSpriteTemplate, ANIM_TARGET, 3, 1, 10, N
 *   createvisualtask AnimTask_ShakeMonInPlace, ANIM_TARGET, X, 0, N, 1
 *
 * three times, with 28-frame script delays between the fist/shake pairs.
 * `age` is RAM truth relative to the pointer-bounded move window.  The
 * reducer deliberately accepts the four `Random2()` words consumed by each
 * fist callback; it never owns battle/animation RNG or advances it.
 *
 * The Scene-ON compositor applies the evidence-proven hardware latches:
 * plain fist/child OAM and vertical position render from RAM+1, while the
 * horizontal affine task and each ShakeMonInPlace target outline render from
 * RAM+2.  This module remains the source-side state only.
 */

export type ThrashBattlerSide = "player" | "opponent";

export interface ThrashRandomWords {
  /** The four source `Random2()` results in callback order: x, y, x sign, y sign. */
  readonly x: number;
  readonly y: number;
  readonly xSign: number;
  readonly ySign: number;
}

export interface ThrashGeometry {
  readonly attackerSide: ThrashBattlerSide;
  readonly targetSide: ThrashBattlerSide;
  /** `GetBattlerSpriteCoord(ANIM_TARGET, BATTLER_COORD_X_2/Y_PIC)` at creation. */
  readonly targetCenter: Readonly<{ x: number; y: number }>;
  /** Source sprite dimensions used by `AnimFistOrFootRandomPos`. */
  readonly targetDimensions: Readonly<{ width: number; height: number }>;
  /** The three callback-owned groups of four `Random2()` words. */
  readonly fistRandom: readonly [
    ThrashRandomWords,
    ThrashRandomWords,
    ThrashRandomWords,
  ];
}

export interface ThrashAffineMatrix {
  readonly a: number;
  readonly b: 0;
  readonly c: 0;
  readonly d: number;
}

export interface ThrashFistSprite {
  /** `gFistFootRandomPosSpriteTemplate` OAM slot, stable in this isolated body. */
  readonly slot: 3;
  /** The basic hitsplat child is allocated immediately after its fist. */
  readonly childSlot: 4;
  readonly x: number;
  readonly y: number;
  /** `StartSpriteAnim(..., gBattleAnimArgs[3])`: 0, 1, then 3. */
  readonly animation: 0 | 1 | 3;
  /** `gBattleAnimArgs[1] = 10`; callback decrements it on the spawn frame. */
  readonly remaining: number;
}

export interface ThrashHitsplatSprite {
  readonly slot: 4;
  readonly parentSlot: 3;
  readonly x: number;
  readonly y: number;
  /** `gBasicHitSplatSpriteTemplate` affine animation 0 is the identity matrix. */
  readonly matrix: ThrashAffineMatrix;
}

export interface ThrashShakeTask {
  readonly startAge: number;
  readonly xOffset: 4 | 8;
  readonly yOffset: 0;
  readonly numShakes: 7 | 16;
  readonly frameDelay: 1;
  readonly active: boolean;
}

export interface ThrashSoundEvent {
  readonly age: number;
  readonly song: "SE_M_COMET_PUNCH" | "SE_M_VITAL_THROW2" | "SE_M_MEGA_KICK2";
  readonly panTarget: true;
}

export interface ThrashState {
  readonly active: boolean;
  readonly impactLoaded: boolean;
  readonly handsAndFeetLoaded: boolean;
  /** Source sprite x/y deltas written by `AnimTask_ThrashMoveMonVertical`. */
  readonly attackerPosition: Readonly<{ x: number; y: number }>;
  /** Source affine matrix written by `AnimTask_ThrashMoveMonHorizontal`. */
  readonly attackerMatrix: ThrashAffineMatrix;
  /** Source x2/y2 delta from the target's pre-task idle values. */
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly horizontalTaskActive: boolean;
  readonly verticalTaskActive: boolean;
  readonly shakeTask: ThrashShakeTask | null;
  readonly fists: readonly ThrashFistSprite[];
  readonly hitsplats: readonly ThrashHitsplatSprite[];
  readonly soundEvents: readonly ThrashSoundEvent[];
}

/**
 * `SetBattlerSpriteYOffsetFromYScale` for the affine-double attacker.  The
 * caller supplies the source `gMon{Back,Front}PicCoords` y offset; this keeps
 * the move reducer free of a species table while preserving the task's exact
 * OAM anchor calculation.
 */
export function thrashAffineYOffset(
  matrixD: number,
  battlerPicYOffset: number,
): number {
  const unscaledHeight = 64 - battlerPicYOffset * 2;
  const scaledHeight = Math.min(
    128,
    Math.trunc((unscaledHeight * 256) / matrixD),
  );
  return Math.trunc((unscaledHeight - scaledHeight) / 2);
}

const IDENTITY: ThrashAffineMatrix = { a: 256, b: 0, c: 0, d: 256 };
const FIST_LIFETIME = 10;
/** Pointer-relative source ages where the async `loadspritegfx` tags arrive. */
const IMPACT_LOADED_AGE = 1;
const HANDS_AND_FEET_LOADED_AGE = 4;
const FIRST_FIST_AGE = 7;
const FIST_SPECS = [
  {
    startAge: FIRST_FIST_AGE,
    animation: 0 as const,
    shake: { xOffset: 4 as const, numShakes: 7 as const },
    song: "SE_M_COMET_PUNCH" as const,
  },
  {
    startAge: FIRST_FIST_AGE + 30,
    animation: 1 as const,
    shake: { xOffset: 4 as const, numShakes: 7 as const },
    song: "SE_M_VITAL_THROW2" as const,
  },
  {
    startAge: FIRST_FIST_AGE + 60,
    animation: 3 as const,
    shake: { xOffset: 8 as const, numShakes: 16 as const },
    song: "SE_M_MEGA_KICK2" as const,
  },
] as const;

/**
 * `gThrashMoveMonAffineAnimCmds`: four seven-frame scale commands followed
 * by `AFFINEANIMCMD_LOOP(2)`.  The command boundary has an identity frame,
 * hence cycles start at ages 7, 36, and 65 and finish through age 93.
 */
function thrashHorizontalMatrix(age: number): {
  readonly active: boolean;
  readonly matrix: ThrashAffineMatrix;
} {
  const relative = age - FIRST_FIST_AGE;
  if (relative < 0 || relative >= 87) return { active: false, matrix: IDENTITY };
  const local = relative % 29;
  if (local === 28) return { active: true, matrix: IDENTITY };
  const command = Math.floor(local / 7);
  const frame = (local % 7) + 1;
  const deltas = [
    { a: -10, d: 9 },
    { a: 20, d: -20 },
    { a: -20, d: 20 },
    { a: 10, d: -9 },
  ] as const;
  let a = 256;
  let d = 256;
  for (let index = 0; index < command; index += 1) {
    a += deltas[index]!.a * 7;
    d += deltas[index]!.d * 7;
  }
  a += deltas[command]!.a * frame;
  d += deltas[command]!.d * frame;
  return { active: true, matrix: { a, b: 0, c: 0, d } };
}

/**
 * Literal task port of `AnimTask_ThrashMoveMonVertical_Step`.  The initializer
 * sets `data[2]=+/-4`, `data[3]=7`, `data[4]=3`, then the task runs once on
 * the observed creation age.  Position stays relative so the seam owns the
 * battler's real source base coordinate.
 */
function thrashVerticalPosition(age: number, side: ThrashBattlerSide): {
  readonly active: boolean;
  readonly position: Readonly<{ x: number; y: number }>;
} {
  const steps = age - FIRST_FIST_AGE + 1;
  if (steps <= 0) return { active: false, position: { x: 0, y: 0 } };
  let x = 0;
  let y = 0;
  let xDelta = side === "player" ? 4 : -4;
  let countdown = 7;
  let repeats = 3;
  let state = 0;
  let yDelay = 0;
  let yIndex = 0;
  let alive = true;
  for (let tick = 0; tick < steps && alive; tick += 1) {
    yDelay += 1;
    if (yDelay > 2) {
      yDelay = 0;
      yIndex += 1;
      y += yIndex & 1 ? 2 : -2;
    }
    if (state === 0) {
      x += xDelta;
      countdown -= 1;
      if (countdown === 0) {
        countdown = 14;
        state = 1;
      }
    } else if (state === 1) {
      x -= xDelta;
      countdown -= 1;
      if (countdown === 0) {
        countdown = 7;
        state = 2;
      }
    } else {
      x += xDelta;
      countdown -= 1;
      if (countdown === 0) {
        repeats -= 1;
        if (repeats !== 0) {
          countdown = 7;
          state = 0;
        } else {
          if (yIndex & 1) y -= 2;
          alive = false;
        }
      }
    }
  }
  return { active: alive, position: { x, y } };
}

function fistAnchor(
  words: ThrashRandomWords,
  geometry: ThrashGeometry,
): Readonly<{ x: number; y: number }> {
  const xModulo = Math.floor(geometry.targetDimensions.width / 2);
  const yModulo = Math.floor(geometry.targetDimensions.height / 4);
  let x = words.x % xModulo;
  let y = words.y % yModulo;
  if (words.xSign & 1) x = -x;
  if (words.ySign & 1) y = -y;
  if (geometry.targetSide === "player") y -= 16;
  return { x: geometry.targetCenter.x + x, y: geometry.targetCenter.y + y };
}

function activeShake(age: number): ThrashShakeTask | null {
  for (const spec of FIST_SPECS) {
    // The source initializer calls Step synchronously, and the pointer window
    // first observes the task after its initial delay decrement.  Thus source
    // age N maps to `shakeMonInPlaceSequence` tick N-start+1; the terminal
    // restore destroys the task at age 18/48/101 before the snapshot.
    const tick = age - spec.startAge + 1;
    const sequence = shakeMonInPlaceSequenceLength(
      spec.shake.xOffset,
      spec.shake.numShakes,
    );
    // The final sequence sample restores x2 and destroys the task in the
    // same scheduler pass, so it is observable as a zero but never as a live
    // task.  The first source row is sequence tick 1, per the initial
    // callback/delay ordering above.
    if (tick >= 1 && tick < sequence - 1) {
      return {
        startAge: spec.startAge,
        xOffset: spec.shake.xOffset,
        yOffset: 0,
        numShakes: spec.shake.numShakes,
        frameDelay: 1,
        active: true,
      };
    }
  }
  return null;
}

function targetOffset(age: number): Readonly<{ x2: number; y2: number }> {
  for (const spec of FIST_SPECS) {
    const tick = age - spec.startAge + 1;
    if (tick < 1) continue;
    const length = shakeMonInPlaceSequenceLength(
      spec.shake.xOffset,
      spec.shake.numShakes,
    );
    const sequence = shakeMonInPlaceOffsetAtTick(
      spec.shake.xOffset,
      0,
      spec.shake.numShakes,
      1,
      tick,
    );
    // A later shake cannot overlap an earlier schedule; its terminal restore
    // is the first zero exactly as the source task self-destroys.
    if (tick <= length - 1) return sequence;
  }
  return { x2: 0, y2: 0 };
}

function shakeMonInPlaceSequenceLength(
  xOffset: number,
  numShakes: number,
): number {
  // `frameDelay=1` emits two samples per shake plus the final restore sample.
  // Keep this source scheduler arithmetic local rather than materializing a
  // mutable task; the actual offsets remain delegated to the 1:1 shared port.
  void xOffset;
  return numShakes * 2 - 1;
}

function fistSprites(age: number, geometry: ThrashGeometry): readonly ThrashFistSprite[] {
  return FIST_SPECS.flatMap((spec, index) => {
    const elapsed = age - spec.startAge;
    if (elapsed < 0 || elapsed >= FIST_LIFETIME) return [];
    const anchor = fistAnchor(geometry.fistRandom[index]!, geometry);
    return [{
      slot: 3,
      childSlot: 4,
      x: anchor.x,
      y: anchor.y,
      animation: spec.animation,
      remaining: FIST_LIFETIME - elapsed - 1,
    }];
  });
}

/** Complete source-relative state for every age, including first inactive cleanup. */
export function thrashAtAge(age: number, geometry: ThrashGeometry): ThrashState {
  const horizontal = thrashHorizontalMatrix(age);
  const vertical = thrashVerticalPosition(age, geometry.attackerSide);
  const fists = fistSprites(age, geometry);
  const active = age >= 0 && age < 102;
  const shakeTask = active ? activeShake(age) : null;
  return {
    active,
    impactLoaded: active && age >= IMPACT_LOADED_AGE,
    handsAndFeetLoaded: active && age >= HANDS_AND_FEET_LOADED_AGE,
    attackerPosition: active ? vertical.position : { x: 0, y: 0 },
    attackerMatrix: active ? horizontal.matrix : IDENTITY,
    targetOffset: active ? targetOffset(age) : { x2: 0, y2: 0 },
    horizontalTaskActive: active && horizontal.active,
    verticalTaskActive: active && vertical.active,
    shakeTask,
    fists: active ? fists : [],
    hitsplats: active
      ? fists.map((fist) => ({
        slot: 4,
        parentSlot: 3,
        x: fist.x,
        y: fist.y,
        matrix: IDENTITY,
      }))
      : [],
    soundEvents: FIST_SPECS.flatMap((spec) => age === spec.startAge
      ? [{ age: spec.startAge, song: spec.song, panTarget: true }]
      : []),
  };
}

/**
 * Displayed target x2 for a compositor age.  A `createvisualtask
 * ShakeMonInPlace` initializer writes its first offset before the ordinary
 * task/OAM phase, so its creation sample reaches the framebuffer after one
 * transfer; every subsequent task write uses the measured RAM+2 path.  This
 * is one source scheduler boundary per script invocation, not a framebuffer
 * lookup or a frame-specific pixel exception.
 */
export function thrashDisplayedTargetOffsetAtAge(
  framebufferAge: number,
  geometry: ThrashGeometry,
): Readonly<{ x2: number; y2: number }> {
  const initializerWasCopied = FIST_SPECS.some(
    (spec) => framebufferAge === spec.startAge + 1,
  );
  return thrashAtAge(
    framebufferAge - (initializerWasCopied ? 1 : 2),
    geometry,
  ).targetOffset;
}
