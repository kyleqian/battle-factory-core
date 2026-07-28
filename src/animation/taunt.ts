import {
  swaggerAngerMarkAtAge,
  type SwaggerAngerMark,
  type SwaggerPoint,
  type SwaggerSide,
} from "./swagger.ts";

/**
 * Source-shaped reducer for `Move_TAUNT`.
 *
 * Age zero is the script's first displayed
 * `gThoughtBubbleSpriteTemplate`. The script offsets are relative; no
 * controller or battle-state timing is represented here.
 */

export type TauntSide = SwaggerSide;
export type TauntPoint = SwaggerPoint;

export interface TauntThoughtBubble {
  readonly kind: "thoughtBubble";
  readonly age: number;
  readonly x: number;
  readonly y: number;
  readonly frame: 0 | 1 | 2 | 3;
  readonly hFlip: boolean;
  readonly phase: "forward" | "hold" | "reverse" | "cleanup";
}

export interface TauntFinger {
  readonly kind: "finger";
  readonly age: number;
  readonly x: number;
  readonly y: number;
  readonly frame: 0 | 1 | 2;
  readonly hFlip: boolean;
  readonly phase: "point" | "wag" | "linger";
}

export type TauntSound =
  | "SE_M_METRONOME"
  | "SE_M_TAIL_WHIP"
  | "SE_M_SWAGGER2";

export interface TauntState {
  readonly thoughtBubble: TauntThoughtBubble | null;
  readonly finger: TauntFinger | null;
  readonly angerMarks: readonly SwaggerAngerMark[];
  readonly soundRestart: TauntSound | null;
  readonly soundPanSide: TauntSide | null;
  readonly blend: Readonly<{ bldcnt: 0; bldalpha: 0; bldy: 0 }>;
}

export const TAUNT_FINGER_CREATION_AGE = 8;
export const TAUNT_FIRST_ANGER_CREATION_AGE = 74;
export const TAUNT_SECOND_ANGER_CREATION_AGE = 106;
export const TAUNT_LAST_SOFTWARE_OAM_AGE = 122;
export const TAUNT_LAST_HARDWARE_OAM_AGE = 123;
export const TAUNT_TEARDOWN_AGE = 124;

function thoughtFrame(age: number): 0 | 1 | 2 | 3 {
  if (age === 0 || age >= 59) return 0;
  if (age <= 2 || age >= 57) return 1;
  if (age <= 4 || age >= 55) return 2;
  return 3;
}

export function tauntThoughtBubbleAtAge(
  age: number,
  attackerSide: TauntSide,
  origin: TauntPoint,
): TauntThoughtBubble | null {
  if (age < 0 || age >= 63) return null;
  return {
    kind: "thoughtBubble",
    age,
    x: origin.x,
    y: origin.y,
    frame: thoughtFrame(age),
    // Thought-bubble animations 0/2 are the player-side hFlip programs.
    hFlip: attackerSide === "player",
    phase: age < 8 ? "forward"
      : age < 53 ? "hold"
      : age < 61 ? "reverse"
      : "cleanup",
  };
}

const WAG_FRAMES = [0, 1, 2, 1, 0, 1, 2] as const;

export function tauntFingerAtAge(
  age: number,
  attackerSide: TauntSide,
  origin: TauntPoint,
): TauntFinger | null {
  const spriteAge = age - TAUNT_FINGER_CREATION_AGE;
  if (spriteAge < 0 || spriteAge >= 45) return null;
  const wagAge = spriteAge - 10;
  const wagIndex = wagAge < 0 ? 0 : Math.min(6, Math.trunc(wagAge / 4));
  return {
    kind: "finger",
    age: spriteAge,
    x: origin.x,
    y: origin.y,
    frame: WAG_FRAMES[wagIndex]!,
    hFlip: attackerSide === "opponent",
    phase: spriteAge < 10 ? "point" : spriteAge < 38 ? "wag" : "linger",
  };
}

export function tauntAtAge(
  age: number,
  attackerSide: TauntSide,
  attackerHead: TauntPoint,
  targetSide: TauntSide,
  targetCenter: TauntPoint,
): TauntState {
  const soundRestart = age === 0 ? "SE_M_METRONOME"
    : age === 14 || age === 30 ? "SE_M_TAIL_WHIP"
    : age === TAUNT_FIRST_ANGER_CREATION_AGE
      || age === TAUNT_SECOND_ANGER_CREATION_AGE ? "SE_M_SWAGGER2"
    : null;
  return {
    thoughtBubble: tauntThoughtBubbleAtAge(age, attackerSide, attackerHead),
    finger: tauntFingerAtAge(age, attackerSide, attackerHead),
    angerMarks: [
      swaggerAngerMarkAtAge(
        age, 0, TAUNT_FIRST_ANGER_CREATION_AGE, targetSide, targetCenter,
      ),
      swaggerAngerMarkAtAge(
        age, 1, TAUNT_SECOND_ANGER_CREATION_AGE, targetSide, targetCenter,
      ),
    ].filter((mark): mark is SwaggerAngerMark => mark !== null),
    soundRestart,
    soundPanSide: soundRestart === null ? null
      : soundRestart === "SE_M_SWAGGER2" ? targetSide : attackerSide,
    blend: { bldcnt: 0, bldalpha: 0, bldy: 0 },
  };
}
