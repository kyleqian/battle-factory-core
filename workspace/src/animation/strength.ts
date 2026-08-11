import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { slideMonToOriginalPosAtTick } from "./slideMon.ts";

export type StrengthBattlerSide = "player" | "opponent";

export interface StrengthHitSplat {
  readonly x: number;
  readonly y: number;
  readonly animation: 1;
  readonly sourceIndex: 0 | 1 | 2;
}

export interface StrengthState {
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly hitSplats: readonly StrengthHitSplat[];
  readonly shakeAndSinkActive: boolean;
  readonly returnSlideActive: boolean;
  readonly ellipticalTaskActive: boolean;
  readonly shakeMon2Active: boolean;
  readonly monbgActive: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly impactLoaded: boolean;
  readonly audioTriggers: readonly (
    | Readonly<{ sound: "SE_M_TAKE_DOWN"; pan: "attacker" }>
    | Readonly<{ sound: "SE_M_MEGA_KICK2"; pan: "target" }>
  )[];
  readonly active: boolean;
}

const HIT_SPLATS = [
  { age: 54, x: 16, y: 12 },
  { age: 60, x: -16, y: -12 },
  { age: 66, x: 3, y: 4 },
] as const;

function sin(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

/**
 * Displayed `AnimTask_ShakeAndSinkMon(ANIM_ATTACKER,2,0,96,30)`.
 * The creation pose is behind the OAM transfer; ages 7..35 are the 29
 * transferred task poses, including the final pose after task destruction.
 */
function shakeAndSinkAtAge(age: number): { x2: number; y2: number } {
  if (age < 7 || age > 47) return { x2: 0, y2: 0 };
  if (age >= 48) return { x2: 0, y2: 0 };
  const phase = (age - 7) & 3;
  return {
    x2: phase === 0 ? -2 : phase === 2 ? 2 : 0,
    y2: Math.floor((age - 5) * 96 / 256),
  };
}

function attackerAtAge(age: number): { x2: number; y2: number } {
  const sunk = shakeAndSinkAtAge(Math.min(age, 35));
  if (age < 48) return age < 7 ? { x2: 0, y2: 0 } : sunk;
  return slideMonToOriginalPosAtTick({
    currentX2: -2,
    currentY2: 11,
    axisSnapMode: 0,
    durationTicks: 4,
  }, age - 48);
}

function ellipticalAtAge(
  age: number,
  attackerSide: StrengthBattlerSide,
): { x2: number; y2: number } {
  if (age < 48 || age > 77) return { x2: 0, y2: 0 };
  const angle = (age - 47) * 16;
  const width = attackerSide === "player" ? 18 : -18;
  return {
    x2: sin(angle, width),
    y2: -sin(angle + 64, 6) + 6,
  };
}

function shakeMon2AtAge(age: number): { x2: number; y2: number } {
  if (age < 79 || age > 92) return { x2: 0, y2: 0 };
  return { x2: ((Math.floor((age - 79) / 2) & 1) ? 2 : -2), y2: 0 };
}

/**
 * Pure source-relative reducer for Secret Power's sole Factory body,
 * `Move_STRENGTH`. Age zero is the first `gAnimScriptActive` display.
 *
 * This checkpoint deliberately exposes the complete task/resource/audio
 * schedule without claiming framebuffer acceptance; the production
 * compositor remains unwired until its 102-frame both-side window is exact.
 */
export function strengthAtAge(
  age: number,
  attackerSide: StrengthBattlerSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): StrengthState {
  const targetSideSign = attackerSide === "player" ? 1 : -1;
  const hitSplats = HIT_SPLATS.flatMap((hit, sourceIndex) =>
    age >= hit.age && age <= hit.age + 9
      ? [{
          x: targetCenter.x + hit.x * targetSideSign,
          y: targetCenter.y + hit.y,
          animation: 1 as const,
          sourceIndex: sourceIndex as 0 | 1 | 2,
        }]
      : []);
  const audioTriggers = [
    ...(age === 6
      ? [{ sound: "SE_M_TAKE_DOWN" as const, pan: "attacker" as const }]
      : []),
    ...([53, 59, 65].includes(age)
      ? [{ sound: "SE_M_MEGA_KICK2" as const, pan: "target" as const }]
      : []),
  ];
  const ellipse = ellipticalAtAge(age, attackerSide);
  const shake = shakeMon2AtAge(age);
  return {
    attackerOffset: attackerAtAge(age),
    targetOffset: {
      x2: ellipse.x2 + shake.x2,
      y2: ellipse.y2 + shake.y2,
    },
    hitSplats,
    shakeAndSinkActive: age >= 7 && age <= 34,
    returnSlideActive: age >= 48 && age <= 51,
    ellipticalTaskActive: age >= 48 && age <= 77,
    shakeMon2Active: age >= 79 && age <= 92,
    monbgActive: age >= 7 && age <= 93,
    alpha: age >= 7 && age <= 93 ? { eva: 12, evb: 8 } : null,
    impactLoaded: age >= 1 && age <= 100,
    audioTriggers,
    active: age >= 0 && age <= 100,
  };
}
