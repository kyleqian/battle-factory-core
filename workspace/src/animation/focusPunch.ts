import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

/** The side occupied by the scripted animation target. */
export type FocusPunchSide = "player" | "opponent";

export interface FocusPunchPoint {
  readonly x: number;
  readonly y: number;
}

export interface FocusPunchFist {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly matrix: Readonly<{ pa: number; pb: 0; pc: 0; pd: number }>;
}

export interface FocusPunchHitSplat {
  readonly slot: 4;
  readonly x: number;
  readonly y: number;
  readonly matrix: Readonly<{ pa: 256; pb: 0; pc: 0; pd: 256 }>;
}

export type FocusPunchSound =
  | "SE_M_SWAGGER"
  | "SE_M_VITAL_THROW2"
  | "SE_M_MEGA_KICK2";

export interface FocusPunchState {
  /** False on and after the source body's first inactive cleanup row. */
  readonly active: boolean;
  /** `loadspritegfx ANIM_TAG_IMPACT` through `blendoff` cleanup. */
  readonly impactLoaded: boolean;
  /** `loadspritegfx ANIM_TAG_HANDS_AND_FEET` through `blendoff` cleanup. */
  readonly handsAndFeetLoaded: boolean;
  /** The `fadetobg` target selected by `AnimTask_IsTargetPlayerSide`. */
  readonly background: Readonly<{
    readonly variant: FocusPunchSide;
    readonly impact: boolean;
    /** Source BLDY coefficient, including both fade-to-BG passes. */
    readonly bldy: number;
  }>;
  /** `monbg ANIM_DEF_PARTNER` / `clearmonbg ANIM_DEF_PARTNER` lifecycle. */
  readonly targetOnMonBg: boolean;
  /** `setalpha 12, 8` while the impact OBJs use OBJ blend mode. */
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  /** Source `AnimTask_ShakeMon(ANIM_TARGET, 8, 0, 24, 1)` target offset. */
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  /** The `gFocusPunchFistSpriteTemplate` affine/callback state. */
  readonly fist: FocusPunchFist | null;
  /** The four independently-created `gBasicHitSplatSpriteTemplate` sprites. */
  readonly hitsplats: readonly FocusPunchHitSplat[];
  /** Sound command emitted on this source row, if any. */
  readonly sound: FocusPunchSound | null;
}

/**
 * The two side branches differ only in the final target-mon-BG cleanup
 * callback.  The values are source-window ages, not battle/turn timestamps.
 * They are the accepted fixtures' bodies: the per-side split is the age-131
 * restore lag (below), which the default `restoreLag` reproduces.
 */
export const FOCUS_PUNCH_FIRST_INACTIVE_AGE: Readonly<Record<FocusPunchSide, number>> = {
  opponent: 154,
  player: 153,
};

/**
 * S10A fp100 (D4, liveMoveTimingPolicy.ts 264): `restorebg`'s Task_FadeToBg
 * reloads the battle background (LoadDefaultBg) while the screen is black and
 * that frame may overrun VBlank, a lag at body age 131.  With it the
 * return-to-field fade, the target-mon-BG cleanup and the first inactive row
 * all come one row later (154 active rows, else 153).  No battle input
 * decides it (docs/fp100-focus-punch-d4.md).
 */
export function focusPunchFirstInactiveAge(restoreLag: boolean): number {
  return restoreLag ? 154 : 153;
}

function gbaSin(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function fadeInBldy(age: number): number {
  if (age < 12 || age > 47) return 0;
  if (age <= 27) return age - 11;
  if (age <= 31) return 16;
  return 47 - age;
}

function restoreBldy(age: number, restoreLag: boolean): number {
  if (age < 113) return 0;
  if (age <= 128) return age - 112;
  const firstFieldFadeInAge = restoreLag ? 133 : 132;
  if (age < firstFieldFadeInAge) return 16;
  const finalFadeAge = restoreLag ? 148 : 147;
  return Math.max(0, finalFadeAge - age);
}

function targetOffsetAtAge(age: number): Readonly<{ x2: number; y2: number }> {
  // The visual-task creation row is age 64.  Its first target write reaches
  // gSprites two source callbacks later and each task/sprite update pair
  // holds one on/off state.  The task's internal delay counter is consumed
  // between those paired engine passes, so this source-visible timeline is
  // deliberately not a direct index into another move's ShakeMon helper.
  if (age < 66 || age > 109) return { x2: 0, y2: 0 };
  return {
    x2: Math.floor((age - 66) / 2) % 2 === 0 ? 8 : 0,
    y2: 0,
  };
}

function fistAtAge(age: number, targetCenter: FocusPunchPoint): FocusPunchFist | null {
  if (age < 52 || age > 100) return null;
  // `sAffineAnim_FocusPunchFist` starts at 0x200 and applies -0x20 for the
  // first eight callbacks.  ObjAffineSet writes the reciprocal Q8.8 matrix.
  const affineStep = Math.min(age - 52, 7);
  const accumulator = 0x200 - (affineStep + 1) * 0x20;
  const matrixScale = Math.trunc(0x10000 / accumulator);
  const callbackCount = Math.max(0, age - 60);
  return {
    x: targetCenter.x,
    y: targetCenter.y,
    x2: callbackCount > 0 ? gbaSin(callbackCount * 40, 2) : 0,
    matrix: { pa: matrixScale, pb: 0, pc: 0, pd: matrixScale },
  };
}

const HIT_SPLAT_OFFSETS = [
  { start: 64, x: -10, y: -8 },
  { start: 74, x: 10, y: 2 },
  { start: 84, x: 10, y: -6 },
  { start: 94, x: 0, y: 8 },
] as const;

function hitsplatsAtAge(
  age: number,
  targetSide: FocusPunchSide,
  targetCenter: FocusPunchPoint,
): readonly FocusPunchHitSplat[] {
  // `create_basic_hitsplat_sprite ANIM_ATTACKER, ... relative_to=ANIM_TARGET`
  // mirrors its X argument when the attacker is the opponent.  Focus Punch's
  // two target-side branches therefore share the same source offsets but not
  // the same screen-space sign.
  const horizontalDirection = targetSide === "opponent" ? 1 : -1;
  return HIT_SPLAT_OFFSETS.flatMap((hit): FocusPunchHitSplat[] => (
    age >= hit.start && age <= hit.start + 8
      ? [{
          slot: 4,
          x: targetCenter.x + hit.x * horizontalDirection,
          y: targetCenter.y + hit.y,
          matrix: { pa: 256, pb: 0, pc: 0, pd: 256 },
        }]
      : []
  ));
}

function soundAtAge(age: number): FocusPunchSound | null {
  if (age === 52) return "SE_M_SWAGGER";
  if (age === 74 || age === 84) return "SE_M_VITAL_THROW2";
  if (age === 94) return "SE_M_MEGA_KICK2";
  return null;
}

/**
 * Pure, source-relative `Move_FOCUS_PUNCH` presentation state.
 *
 * `age = 0` is the first pointer-owned `Move_FOCUS_PUNCH` source row.  The
 * reducer takes only the resolved target side and geometry; gameplay state,
 * fixtures, absolute battle time, and framebuffer recordings are never read.
 * `restoreLag` is the age-131 lag phase (focusPunchFirstInactiveAge); the
 * default is the accepted fixtures' per-side body.
 */
export function focusPunchAtAge(
  age: number,
  targetSide: FocusPunchSide,
  targetCenter: FocusPunchPoint,
  restoreLag: boolean = targetSide === "opponent",
): FocusPunchState {
  const firstInactive = focusPunchFirstInactiveAge(restoreLag);
  const active = age >= 0 && age < firstInactive;
  const restore = restoreBldy(age, restoreLag);
  const firstFieldFadeInAge = restoreLag ? 133 : 132;
  return {
    active,
    impactLoaded: age >= 1 && age < firstInactive,
    handsAndFeetLoaded: age >= 4 && age < firstInactive,
    background: {
      variant: targetSide,
      // Both tilemap handoffs happen while BLDY is fully black.  The source
      // target-side variant stays selected until its return-to-field fade.
      impact: age >= 28 && age < firstFieldFadeInAge,
      bldy: Math.max(fadeInBldy(age), restore),
    },
    targetOnMonBg: age >= 49 && age < (restoreLag ? 150 : 149),
    alpha: age >= 52 && age < 112 ? { eva: 12, evb: 8 } : null,
    targetOffset: targetOffsetAtAge(age),
    fist: fistAtAge(age, targetCenter),
    hitsplats: hitsplatsAtAge(age, targetSide, targetCenter),
    sound: soundAtAge(age),
  };
}
