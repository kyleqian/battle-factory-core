import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import {
  slideMonToOffsetAtTick,
} from "./slideMon.ts";

export type RollingKickSide = "player" | "opponent";

export interface RollingKickSprite {
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
}

export interface RollingKickState {
  readonly active: boolean;
  readonly handsAndFeetLoaded: boolean;
  readonly impactLoaded: boolean;
  readonly targetOnMonBg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly slidingFoot: RollingKickSprite | null;
  readonly hitsplat: Readonly<{ x: number; y: number }> | null;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly sound: "SE_M_DOUBLE_TEAM" | "SE_M_VITAL_THROW2" | null;
  readonly soundPanSide: RollingKickSide | null;
}

export const ROLLING_KICK_FRAME_COUNT = 55;

function gbaSin(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function ellipticalAttackerOffset(
  age: number,
  attackerSide: RollingKickSide,
): { x2: number; y2: number } {
  if (age < 10 || age >= 24) return { x2: 0, y2: 0 };
  const angle = (age - 9) * 16;
  const width = attackerSide === "player" ? 18 : -18;
  return {
    x2: gbaSin(angle, width),
    y2: -gbaSin(angle + 64, 6) + 6,
  };
}

function slidingAttackerOffset(
  age: number,
  attackerSide: RollingKickSide,
): { x2: number; y2: number } {
  if (age < 25) return ellipticalAttackerOffset(age, attackerSide);
  if (age < 43) {
    return slideMonToOffsetAtTick({
      battlerSide: attackerSide,
      targetXOffset: 20,
      targetYOffset: 0,
      mirrorVertical: false,
      durationTicks: 4,
    }, age - 25);
  }
  if (age < 53) {
    // `clearmonbg` pauses the dummy callback for two display intervals after
    // its second step. These are callback/display latches, indexed only from
    // this source command's creation age.
    const playerX = [17, 15, 15, 15, 12, 10, 7, 5, 2, 0] as const;
    const opponentX = [-18, -15, -15, -15, -13, -10, -8, -5, -3, 0] as const;
    return {
      x2: (attackerSide === "player" ? playerX : opponentX)[age - 43]!,
      y2: 0,
    };
  }
  return { x2: 0, y2: 0 };
}

function targetShakeAtAge(age: number): { x2: number; y2: number } {
  // AnimTask_ShakeMon is created after the task pass. Its creation/display
  // latch consumes two source callbacks before the battler OAM first exposes
  // the alternating 5px offset.
  if (age === 34 || age === 35 || age === 38 || age === 39) {
    return { x2: 5, y2: 0 };
  }
  return { x2: 0, y2: 0 };
}

/** Pure, source-relative `Move_ROLLING_KICK`; gameplay state is never read. */
export function rollingKickAtAge(
  age: number,
  attackerSide: RollingKickSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): RollingKickState {
  const direction = attackerSide === "player" ? 1 : -1;
  const footAge = age - 25;
  const footCallbacks = footAge + 1;
  const footDelta = linearTranslationDeltaQ8(48 * direction, 10);
  return {
    active: age >= 0 && age < ROLLING_KICK_FRAME_COUNT - 1,
    handsAndFeetLoaded: age >= 1 && age < ROLLING_KICK_FRAME_COUNT - 1,
    impactLoaded: age >= 2 && age < ROLLING_KICK_FRAME_COUNT - 1,
    targetOnMonBg: age >= 3 && age < 43,
    alpha: age >= 10 && age < 43 ? { eva: 12, evb: 8 } : null,
    attackerOffset: slidingAttackerOffset(age, attackerSide),
    slidingFoot: footAge >= 0 && footAge < 10
      ? {
          x: targetCenter.x - 24 * direction,
          y: targetCenter.y,
          x2: linearTranslationOffsetAfterCallbacks(
            footDelta,
            footCallbacks,
            10,
          ),
          y2: 0,
        }
      : null,
    hitsplat: age >= 32 && age < 42
      ? {
          x: targetCenter.x - 8 * direction,
          y: targetCenter.y,
        }
      : null,
    targetOffset: targetShakeAtAge(age),
    sound: age === 10 || age === 16
      ? "SE_M_DOUBLE_TEAM"
      : age === 32
        ? "SE_M_VITAL_THROW2"
        : null,
    soundPanSide: age === 10 || age === 16
      ? attackerSide
      : age === 32
        ? (attackerSide === "player" ? "opponent" : "player")
        : null,
  };
}
