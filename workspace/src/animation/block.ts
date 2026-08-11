import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

export type BlockSide = "player" | "opponent";

export interface BlockXSprite {
  readonly x: number;
  readonly y: number;
  readonly y2: number;
  readonly data0: number;
  readonly data1: number;
  readonly data2: number;
  readonly invisible: boolean;
  readonly callback: "AnimBlockX_Step";
}

export interface BlockState {
  readonly active: boolean;
  readonly xSignLoaded: boolean;
  readonly scriptOffset: 0 | 3 | 14;
  readonly xSign: BlockXSprite | null;
  readonly sound: "SE_M_SWAGGER" | "SE_M_SKETCH" | "SE_M_LEER" | null;
  readonly soundPanSide: BlockSide | null;
}

export const BLOCK_FIRST_INACTIVE_AGE = {
  playerTarget: 145,
  opponentTarget: 140,
} as const;

function sine(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function spriteAtAge(
  age: number,
  targetSide: BlockSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): BlockXSprite | null {
  if (age < 4) return null;
  const landingAge = targetSide === "player" ? 18 : 13;
  const destroyAge = targetSide === "player" ? 144 : 139;
  if (age >= destroyAge) return null;

  let data0 = 0;
  let data1 = 0;
  let data2 = 0;
  let y2 = (targetSide === "player" ? -144 : -96)
    + (age - 3) * 10;
  if (age >= landingAge) {
    y2 = 0;
    const afterLanding = age - landingAge;
    if (afterLanding < 32) {
      data0 = 1;
      data1 = afterLanding * 4;
      y2 = -(sine(data1, 256) >> 3) || 0;
    } else if (afterLanding < 54) {
      data0 = 2;
      data1 = (afterLanding - 32) * 6;
      y2 = -(sine(data1, 256) >> 4) || 0;
    } else if (afterLanding < 63) {
      data0 = 3;
      data1 = afterLanding - 54;
    } else {
      data0 = 4;
      const flicker = afterLanding - 63;
      data2 = Math.floor(flicker / 9);
      data1 = flicker % 9;
    }
  }
  return {
    x: targetCenter.x,
    y: targetCenter.y,
    y2,
    data0,
    data1,
    data2,
    invisible: data0 === 4 && Boolean(data2 & 1),
    callback: "AnimBlockX_Step",
  };
}

/** Pure source-relative port of Move_BLOCK and AnimBlockX. */
export function blockAtAge(
  age: number,
  targetSide: BlockSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): BlockState {
  const landingAge = targetSide === "player" ? 18 : 13;
  const secondSketchAge = landingAge + 32;
  const leerAge = landingAge + 63;
  const firstInactive = targetSide === "player"
    ? BLOCK_FIRST_INACTIVE_AGE.playerTarget
    : BLOCK_FIRST_INACTIVE_AGE.opponentTarget;
  const sound = age === 4 ? "SE_M_SWAGGER"
    : age === landingAge || age === secondSketchAge ? "SE_M_SKETCH"
    : age === leerAge ? "SE_M_LEER"
    : null;
  return {
    active: age >= 0 && age < firstInactive,
    xSignLoaded: age >= 1 && age < firstInactive,
    scriptOffset: age <= 0 ? 0 : age <= 3 ? 3 : 14,
    xSign: spriteAtAge(age, targetSide, targetCenter),
    sound,
    soundPanSide: sound ? targetSide : null,
  };
}
