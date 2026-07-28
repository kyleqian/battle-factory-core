import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";
import { slideMonToOriginalPosAtTick } from "./slideMon.ts";
import { windUpLungeAtTick } from "./windUpLunge.ts";

export type SpikeCannonSide = "player" | "opponent";

export interface SpikeCannonSprite {
  readonly kind: "needle" | "impact";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly matrix: Readonly<{ a: number; b: number; c: number; d: number }>;
  readonly animation: 0 | 2;
  readonly oamSlot: number;
  readonly callback: "translate" | "destroy" | "affine" | "destroy-affine";
}

export interface SpikeCannonSoundEvent {
  readonly age: number;
  readonly song: "SE_M_RAZOR_WIND2" | "SE_M_HORN_ATTACK";
  readonly pan: number;
}

export interface SpikeCannonEffect {
  readonly attackerSide: SpikeCannonSide;
  readonly active: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly targetMonbg: boolean;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly windUpTask: "step1" | "step2" | null;
  readonly returnTaskActive: boolean;
  readonly shakeTaskActive: boolean;
  readonly sprites: readonly SpikeCannonSprite[];
  readonly soundEvents: readonly SpikeCannonSoundEvent[];
}

const WIND_UP = {
  horizontalSpeed: -4,
  waveAmplitude: 0,
  windUpDuration: 4,
  delayBeforeLunge: 6,
  targetXOffset: 8,
  lungeDuration: 4,
} as const;

const STINGERS = [
  { initialX: 10, initialY: -8, targetX: -8, targetY: -8, oamSlot: 4 },
  { initialX: 18, initialY: 0, targetX: 0, targetY: 0, oamSlot: 5 },
  { initialX: 26, initialY: 8, targetX: 8, targetY: 8, oamSlot: 7 },
] as const;

const IMPACTS = [
  { x: -8, y: -8, oamSlot: 3 },
  { x: 0, y: 0, oamSlot: 4 },
  { x: 8, y: 8, oamSlot: 5 },
] as const;

/** BIOS ArcTan2Neg/ObjAffineSet receipts for Spike Cannon's shared vector. */
export function spikeCannonNeedleMatrix(
  attackerSide: SpikeCannonSide,
): Readonly<{ a: number; b: number; c: number; d: number }> {
  return attackerSide === "player"
    ? { a: 131, b: 219, c: -219, d: 131 }
    : { a: -109, b: -231, c: 231, d: -109 };
}

function stingerSprite(
  age: number,
  index: number,
  attackerSide: SpikeCannonSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): SpikeCannonSprite | null {
  const localAge = age - 24;
  if (localAge < 0 || localAge > 20) return null;
  const args = STINGERS[index]!;
  const side = attackerSide === "player" ? 1 : -1;
  const startX = attackerCenter.x + side * args.initialX;
  const startY = attackerCenter.y + side * args.initialY;
  const endX = targetCenter.x + side * args.targetX;
  const endY = targetCenter.y + side * args.targetY;
  const callbacks = Math.min(localAge + 1, 20);
  return {
    kind: "needle",
    x: startX,
    y: startY,
    x2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(endX - startX, 20),
      callbacks,
      20,
    ),
    y2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(endY - startY, 20),
      callbacks,
      20,
    ),
    matrix: spikeCannonNeedleMatrix(attackerSide),
    animation: 0,
    oamSlot: args.oamSlot,
    callback: localAge === 20 ? "destroy" : "translate",
  };
}

/**
 * Complete 84-frame source-pointer body of `Move_SPIKE_CANNON`.
 *
 * Age zero is the first `loadspritegfx ANIM_TAG_NEEDLE` display and age 83
 * is the first inactive cleanup display. All scheduling is relative to that
 * source boundary.
 */
export function spikeCannonEffectAtAge(
  age: number,
  attackerSide: SpikeCannonSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): SpikeCannonEffect {
  const wind = windUpLungeAtTick(WIND_UP, attackerSide, age - 10);
  let attackerOffset = age >= 10 && age <= 23
    ? wind.offset
    : { x2: 0, y2: 0 };
  if (age >= 24 && age <= 28) {
    const side = attackerSide === "player" ? 1 : -1;
    attackerOffset = slideMonToOriginalPosAtTick({
      currentX2: 4 * side,
      currentY2: 0,
      axisSnapMode: 0,
      durationTicks: 5,
    }, age - 24);
  }

  const sprites: SpikeCannonSprite[] = STINGERS.flatMap((_, index) => {
    const sprite = stingerSprite(
      age,
      index,
      attackerSide,
      attackerCenter,
      targetCenter,
    );
    return sprite ? [sprite] : [];
  });
  const impactLocalAge = age - 46;
  if (impactLocalAge >= 0 && impactLocalAge <= 9) {
    const side = attackerSide === "player" ? 1 : -1;
    for (const impact of IMPACTS) {
      sprites.push({
        kind: "impact",
        x: targetCenter.x + side * impact.x,
        y: targetCenter.y + side * impact.y,
        x2: 0,
        y2: 0,
        matrix: { a: 372, b: 0, c: 0, d: 372 },
        animation: 2,
        oamSlot: impact.oamSlot,
        callback: impactLocalAge === 9 ? "destroy-affine" : "affine",
      });
    }
  }

  const attackerPan = attackerSide === "player" ? -64 : 63;
  const targetPan = attackerSide === "player" ? 63 : -63;
  return {
    attackerSide,
    active: age >= 0 && age <= 82,
    alpha: age >= 10 && age <= 58 ? { eva: 12, evb: 8 } : null,
    targetMonbg: age >= 7 && age <= 61,
    attackerOffset,
    targetOffset: age >= 46 && age <= 58
      ? shakeMon2OffsetAtTick(3, 0, 7, 1, age - 45)
      : { x2: 0, y2: 0 },
    windUpTask: age >= 10 && age <= 12
      ? "step1"
      : age >= 13 && age <= 22
        ? "step2"
        : null,
    returnTaskActive: age >= 24 && age <= 28,
    shakeTaskActive: age >= 46 && age <= 57,
    sprites,
    soundEvents: [
      { age: 24, song: "SE_M_RAZOR_WIND2", pan: attackerPan },
      { age: 29, song: "SE_M_RAZOR_WIND2", pan: attackerPan },
      { age: 35, song: "SE_M_RAZOR_WIND2", pan: attackerPan },
      { age: 46, song: "SE_M_HORN_ATTACK", pan: targetPan },
      { age: 51, song: "SE_M_HORN_ATTACK", pan: targetPan },
      { age: 57, song: "SE_M_HORN_ATTACK", pan: targetPan },
    ],
  };
}
