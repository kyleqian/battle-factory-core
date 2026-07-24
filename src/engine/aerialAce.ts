export type AerialAceSide = "player" | "opponent";

export interface AerialAceOffset {
  readonly x2: number;
  readonly y2: number;
}

export interface AerialAceTrace extends AerialAceOffset {
  readonly slot: 4 | 7;
  readonly winsOamTie: boolean;
}

export interface AerialAceSlice extends AerialAceOffset {
  readonly frame: 0 | 1 | 2 | 3;
}

export interface AerialAceAnimationState {
  readonly attackerOffset: AerialAceOffset;
  readonly traces: readonly AerialAceTrace[];
  readonly slice: AerialAceSlice | null;
  readonly targetShakeY2: number;
  readonly paletteBlendCoeff: 0 | 10;
}

/**
 * `AnimCuttingSlice` ignores the createsprite battler argument after
 * subpriority selection and anchors to `gBattleAnimTarget` instead. Its
 * fixed script args are `(40, -32, 0)`; player-side targets receive the
 * callback's additional +8 Y adjustment.
 */
export function aerialAceSliceBase(
  targetPosition: Readonly<{ x: number; y: number }>,
  targetSide: AerialAceSide,
): Readonly<{ x: number; y: number }> {
  return {
    x: targetPosition.x + 40,
    y: targetPosition.y - 32 + (targetSide === "player" ? 8 : 0),
  };
}

/**
 * The staged opponent-front corner includes the settled front-animation
 * OAM x2=+1. AERIAL ACE's monbg target copy starts from the source base
 * coordinate and the restored OBJ keeps that reset after teardown.
 */
export function aerialAceTargetSpriteXAtAge(
  animationAge: number,
  targetSide: AerialAceSide,
  stagedCornerX: number,
): number {
  return stagedCornerX - (
    targetSide === "opponent" && animationAge >= 57 ? 1 : 0
  );
}

/**
 * Ages are relative to gCurrentMove installation, with the optional
 * player-side printer offset applied by the presentation seam. They are
 * derived from Move_AERIAL_ACE's independent choreography, not QUICK
 * ATTACK's impact script.
 */
export const AERIAL_ACE_SLICE_FIRST_AGE = 50;
export const AERIAL_ACE_TRAVEL_FIRST_AGE = 51;
export const AERIAL_ACE_PALETTE_FIRST_AGE = 57;
export const AERIAL_ACE_SHAKE_FIRST_AGE = 59;
export const AERIAL_ACE_LAST_BODY_AGE = 74;

const PLAYER_TRAVEL: readonly AerialAceOffset[] = Object.freeze([
  Object.freeze({ x2: 16, y2: 2 }),
  Object.freeze({ x2: 24, y2: 6 }),
  Object.freeze({ x2: 16, y2: 11 }),
  Object.freeze({ x2: 0, y2: 12 }),
  Object.freeze({ x2: -17, y2: 11 }),
  Object.freeze({ x2: -24, y2: 6 }),
]);

const OPPONENT_TRAVEL: readonly AerialAceOffset[] = Object.freeze([
  Object.freeze({ x2: -17, y2: 2 }),
  Object.freeze({ x2: -24, y2: 6 }),
  Object.freeze({ x2: -17, y2: 11 }),
  Object.freeze({ x2: 0, y2: 12 }),
  Object.freeze({ x2: 16, y2: 11 }),
  Object.freeze({ x2: 24, y2: 6 }),
]);

export function aerialAceTravelAtAge(
  age: number,
  attackerSide: AerialAceSide,
): AerialAceOffset {
  return (
    attackerSide === "player" ? PLAYER_TRAVEL : OPPONENT_TRAVEL
  )[age - AERIAL_ACE_TRAVEL_FIRST_AGE] ?? { x2: 0, y2: 0 };
}

function sideOffset(
  player: AerialAceOffset,
  opponent: AerialAceOffset,
  side: AerialAceSide,
): AerialAceOffset {
  return side === "player" ? player : opponent;
}

/**
 * Move_AERIAL_ACE uses the same TraceMon task primitive as QUICK ATTACK,
 * but its OAM ordering is independent: slot 4 normally loses to the live
 * mon and wins only on its first life's final display; slot 7 wins.
 */
export function aerialAceTracesAtAge(
  age: number,
  attackerSide: AerialAceSide,
): readonly AerialAceTrace[] {
  const traces: AerialAceTrace[] = [];
  if (age >= 52 && age <= 57) {
    traces.push({
      slot: 4,
      ...sideOffset(
        { x2: 16, y2: 2 },
        { x2: -17, y2: 2 },
        attackerSide,
      ),
      winsOamTie: age === 57,
    });
  }
  if (age >= 62 && age <= 69) {
    traces.push({ slot: 4, x2: 0, y2: 0, winsOamTie: false });
  }
  if (age >= 57 && age <= 62) {
    traces.push({
      slot: 7,
      ...sideOffset(
        { x2: -24, y2: 6 },
        { x2: 24, y2: 6 },
        attackerSide,
      ),
      winsOamTie: true,
    });
  }
  return traces;
}

const SLICE_TABLE: readonly AerialAceSlice[] = Object.freeze([
  { x2: -4, y2: 4, frame: 0 },
  { x2: -8, y2: 7, frame: 0 },
  { x2: -12, y2: 11, frame: 0 },
  { x2: -16, y2: 15, frame: 0 },
  { x2: -20, y2: 19, frame: 1 },
  { x2: -23, y2: 22, frame: 1 },
  { x2: -27, y2: 26, frame: 1 },
  { x2: -30, y2: 29, frame: 1 },
  { x2: -33, y2: 32, frame: 1 },
  { x2: -36, y2: 35, frame: 2 },
  { x2: -39, y2: 38, frame: 2 },
  { x2: -42, y2: 41, frame: 2 },
  { x2: -45, y2: 44, frame: 2 },
  { x2: -48, y2: 47, frame: 2 },
  { x2: -51, y2: 50, frame: 3 },
  { x2: -53, y2: 52, frame: 3 },
  { x2: -56, y2: 55, frame: 3 },
  { x2: -58, y2: 57, frame: 3 },
  { x2: -60, y2: 59, frame: 3 },
  { x2: -63, y2: 62, frame: 3 },
  { x2: -63, y2: 62, frame: 3 },
  { x2: -63, y2: 62, frame: 3 },
  { x2: -63, y2: 62, frame: 3 },
  { x2: -63, y2: 62, frame: 3 },
]);

export function aerialAceSliceAtAge(age: number): AerialAceSlice | null {
  return SLICE_TABLE[age - AERIAL_ACE_SLICE_FIRST_AGE] ?? null;
}

export function aerialAceTargetShakeY2(age: number): number {
  const n = age - AERIAL_ACE_SHAKE_FIRST_AGE;
  return n >= 0 && n < 16 && n % 4 < 2 ? 3 : 0;
}

export function aerialAceAnimationAtAge(
  age: number,
  attackerSide: AerialAceSide,
): AerialAceAnimationState {
  return {
    attackerOffset: aerialAceTravelAtAge(age, attackerSide),
    traces: aerialAceTracesAtAge(age, attackerSide),
    slice: aerialAceSliceAtAge(age),
    targetShakeY2: aerialAceTargetShakeY2(age),
    paletteBlendCoeff:
      age >= AERIAL_ACE_PALETTE_FIRST_AGE
      && age < AERIAL_ACE_PALETTE_FIRST_AGE + 3
        ? 10
        : 0,
  };
}
