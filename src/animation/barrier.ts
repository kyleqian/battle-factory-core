import { reflectAtAge, type ReflectState } from "./reflect.ts";

export type BarrierSide = "player" | "opponent";

export interface BarrierState extends Omit<ReflectState, "sparkles"> {
  readonly sourceAge: number;
}

export type DefensiveWallState = BarrierState;

/**
 * Pure source-relative reducer for Move_BARRIER. Age zero is the first
 * in-bounds Move_BARRIER script pointer; the wall is created at age four and
 * the first inactive interpreter cleanup is age 75.
 */
export function defensiveWallAtAge(
  sourceAge: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  side: BarrierSide,
): BarrierState {
  const wall = reflectAtAge(sourceAge - 4, attackerCenter, side);
  return {
    sourceAge,
    wall: wall.wall,
    alpha: wall.alpha,
    opponentBattlerHidden: wall.opponentBattlerHidden,
    soundTaskActive: wall.soundTaskActive,
    active: sourceAge >= 0 && sourceAge < 75,
  };
}

export function barrierAtAge(
  sourceAge: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  side: BarrierSide,
): BarrierState {
  return defensiveWallAtAge(sourceAge, attackerCenter, side);
}

/** Move_MAGIC_COAT has the same command cadence and AnimDefensiveWall body. */
export function magicCoatAtAge(
  sourceAge: number,
  attackerCenter: Readonly<{ x: number; y: number }>,
  side: BarrierSide,
): DefensiveWallState {
  return defensiveWallAtAge(sourceAge, attackerCenter, side);
}
