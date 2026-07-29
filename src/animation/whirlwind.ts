import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type WhirlwindSide = "player" | "opponent";

export interface WhirlwindLine {
  readonly spawnIndex: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly sheetFrame: 0 | 1 | 2;
  readonly hFlip: boolean;
  readonly data0: number;
  readonly remaining: number;
}

export interface WhirlwindState {
  readonly active: boolean;
  readonly linesLoaded: boolean;
  readonly lines: readonly WhirlwindLine[];
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly sound:
    | Readonly<{
        id: "SE_M_DOUBLE_TEAM" | "SE_M_STRING_SHOT";
        pan: number;
      }>
    | null;
}

const LINE_Y_OFFSETS = [-8, 0, 8, 16, 24, 32] as const;
const LINE_SEEKS = [0, 1, 2, 3, 4, 0] as const;
const LINE_FRAMES = [
  { sheetFrame: 0, hFlip: false },
  { sheetFrame: 1, hFlip: false },
  { sheetFrame: 2, hFlip: false },
  { sheetFrame: 1, hFlip: true },
  { sheetFrame: 0, hFlip: true },
] as const;

function signedSine(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function lineAtAge(
  age: number,
  index: number,
  targetSide: WhirlwindSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): WhirlwindLine | null {
  if (age < 4 || age > 63) return null;
  const local = age - 4;
  const seek = LINE_SEEKS[index]!;
  const progress = seek + local + 1;
  const phase = progress % 6;
  // SeekSpriteAnim has already consumed two cells by the first observed
  // callback and holds on the final cell when the seek reaches ANIMCMD_END.
  // AnimWhirlwindLine_Step restarts animation 0 only when data[0] wraps.
  const animationCell = progress < 6
    ? Math.min(progress + 1, 4)
    : Math.min(phase, 4);
  const animation = LINE_FRAMES[animationCell]!;
  return {
    spawnIndex: index,
    x: targetCenter.x - 32 + (targetSide === "player" ? 8 : 0),
    y: targetCenter.y + LINE_Y_OFFSETS[index]!,
    x2: phase * 12,
    sheetFrame: animation.sheetFrame,
    hFlip: animation.hFlip,
    data0: phase,
    remaining: 59 - local,
  };
}

function targetOffsetAtAge(
  age: number,
  attackerSide: WhirlwindSide,
  targetSide: WhirlwindSide,
): Readonly<{ x2: number; y2: number }> {
  if (age >= 11 && age <= 38) {
    return {
      x2: Math.floor((age - 11) / 2) % 2 === 0 ? -4 : 4,
      y2: 0,
    };
  }
  if (age >= 42 && age <= 47) {
    const angle = 32 * (age - 41);
    const width = attackerSide === "player" ? 12 : -12;
    return {
      x2: signedSine(angle, width),
      y2: -signedSine(angle + 64, 6) + 6,
    };
  }
  if (age >= 51) {
    const direction = targetSide === "opponent" ? 1 : -1;
    const cap = targetSide === "opponent" ? 104 : 112;
    return {
      x2: direction * Math.min(cap, 8 * (age - 50)),
      y2: 0,
    };
  }
  return { x2: 0, y2: 0 };
}

/**
 * Hardware-OAM pose shown by the shared framebuffer.
 *
 * `AnimTask_ShakeMon2` initializes its first +4 cell after the OAM build and
 * displays it on the following frame. The later ellipse and slide tasks are
 * created during script processing after that build and first reach hardware
 * OAM two ages after their software task state. These are source-pipeline
 * latches, independent of any absolute battle tick.
 */
export function whirlwindDisplayedTargetOffsetAtAge(
  age: number,
  attackerSide: WhirlwindSide,
  targetSide: WhirlwindSide,
  initialOffset: Readonly<{ x2: number; y2: number }>,
): Readonly<{ x2: number; y2: number }> {
  if (age < 12) return initialOffset;
  if (age <= 40) {
    return shakeMon2OffsetAtTick(4, 0, 15, 1, age - 12);
  }
  if (age >= 44 && age <= 49) {
    return targetOffsetAtAge(age - 2, attackerSide, targetSide);
  }
  if (age >= 53) {
    return targetOffsetAtAge(age - 2, attackerSide, targetSide);
  }
  return { x2: 0, y2: 0 };
}

/** Complete source-relative `Move_WHIRLWIND` body through first cleanup. */
export function whirlwindAtAge(
  age: number,
  attackerSide: WhirlwindSide,
  targetSide: WhirlwindSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): WhirlwindState {
  const pan = attackerSide === "player" ? 63 : -63;
  return {
    active: age >= 0 && age < 82,
    // `loadspritegfx` completes three display frames before the six line
    // sprites are created.
    linesLoaded: age >= 1 && age < 82,
    lines: LINE_SEEKS.flatMap((_, index) => {
      const line = lineAtAge(age, index, targetSide, targetCenter);
      return line ? [line] : [];
    }),
    targetOffset: targetOffsetAtAge(age, attackerSide, targetSide),
    sound: [11, 21, 31, 41].includes(age)
      ? { id: "SE_M_DOUBLE_TEAM", pan }
      : age === 51
        ? { id: "SE_M_STRING_SHOT", pan }
        : null,
  };
}
