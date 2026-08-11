import { shakeMonOffsetAtTick } from "./shakeMon.ts";

export type CometPunchSide = "player" | "opponent";
export type CometPunchMoveTurn = number;

export interface CometPunchGeometry {
  readonly attackerSide: CometPunchSide;
  readonly targetCenter: Readonly<{ x: number; y: number }>;
}

export interface CometPunchState {
  readonly active: boolean;
  readonly moveTurn: CometPunchMoveTurn;
  readonly branch: "left" | "right";
  readonly impactLoaded: boolean;
  readonly handsAndFeetLoaded: boolean;
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly targetX2: number;
  readonly shakeTaskActive: boolean;
  readonly hitsplat: Readonly<{ slot: 3; x: number; y: number; matrix: 372 }> | null;
  readonly fist: Readonly<{ slot: 4; x: number; y: number; animation: 0; remaining: number }> | null;
  readonly soundEvents: readonly Readonly<{ age: 10; song: "SE_M_COMET_PUNCH"; panTarget: true }> [];
}

export const COMET_PUNCH_FRAME_COUNT = 37;
export const COMET_PUNCH_EFFECT_AGE = 10;
export const COMET_PUNCH_CLEAR_AGE = 21;

/** Pure pointer-bounded presentation port; the controller owns the 2-5 hits. */
export function cometPunchAtAge(
  age: number,
  moveTurn: CometPunchMoveTurn,
  geometry: CometPunchGeometry,
): CometPunchState {
  const active = age >= 0 && age < COMET_PUNCH_FRAME_COUNT - 1;
  const left = (moveTurn & 1) === 0;
  const mirror = geometry.attackerSide === "player" ? 1 : -1;
  const effectActive = active && age >= COMET_PUNCH_EFFECT_AGE;
  const x = geometry.targetCenter.x + mirror * (left ? -8 : 8);
  // `InitSpritePosToAnimAttacker(..., TRUE)` mirrors the script-relative y
  // offsets when the attacker is on the opponent side. The source OAM has
  // hitsplat at target -8 / fist at target for the player route, then target
  // / target +8 for the opponent route.
  const hitsplatY = geometry.targetCenter.y + (geometry.attackerSide === "player" ? -8 : 0);
  const fistY = hitsplatY + 8;
  const shakeTick = age - COMET_PUNCH_EFFECT_AGE + 1;
  return {
    active,
    moveTurn,
    branch: left ? "left" : "right",
    impactLoaded: active && age >= 1,
    // `loadspritegfx IMPACT` commits at age 1; the following
    // `loadspritegfx HANDS_AND_FEET` commits at age 4.
    handsAndFeetLoaded: active && age >= 4,
    targetOnMonBg: active && age >= 7 && age < COMET_PUNCH_CLEAR_AGE,
    alpha: effectActive && age < COMET_PUNCH_CLEAR_AGE ? { eva: 12, evb: 8 } : null,
    targetX2: effectActive ? shakeMonOffsetAtTick(3, 0, 6, 1, shakeTick).x2 : 0,
    shakeTaskActive: effectActive && age <= 19,
    hitsplat: effectActive && age <= 19 ? { slot: 3, x, y: hitsplatY, matrix: 372 } : null,
    fist: effectActive && age <= 18 ? { slot: 4, x, y: fistY, animation: 0, remaining: Math.max(0, 17 - age) } : null,
    soundEvents: age === COMET_PUNCH_EFFECT_AGE
      ? [{ age: 10, song: "SE_M_COMET_PUNCH", panTarget: true }]
      : [],
  };
}
