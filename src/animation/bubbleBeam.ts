import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";

export type BubbleBeamSide = "player" | "opponent";

export interface BubbleBeamProjectile {
  readonly kind: "projectile";
  readonly spawnIndex: number;
  readonly oamSlot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly frame: 0 | 1 | 2;
  readonly matrix: number;
  readonly callback:
    | "AnimWaterBubbleProjectile_Step1"
    | "AnimWaterBubbleProjectile_Step2"
    | "RunStoredCallbackWhenAnimEnds"
    | "AnimWaterBubbleProjectile_Step3"
    | "WaitAnimForDuration"
    | "DestroySpriteAndMatrix";
}

export interface BubbleBeamAfterEffect {
  readonly kind: "after-effect";
  readonly spawnIndex: number;
  readonly oamSlot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly frame: 0;
  readonly matrix: number;
  readonly callback: "AnimBubbleEffect_Step";
}

export interface BubbleBeamSoundEvent {
  readonly age: number;
  readonly song: "SE_M_BUBBLE" | "SE_M_BUBBLE3";
  readonly pan: number;
  readonly player: "SE1";
}

export interface BubbleBeamState {
  readonly active: boolean;
  readonly bubbleLoaded: boolean;
  readonly smallBubblesLoaded: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly targetMonbg: boolean;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetBaselineX2: number;
  readonly scriptOffset:
    | 0 | 3 | 6 | 8 | 15 | 47 | 53 | 57
    | 85 | 112 | 139 | 166 | 193 | 220
    | null;
  readonly visualTaskCount: number;
  readonly soundTaskCount: 0;
  readonly swayTaskActive: boolean;
  readonly projectiles: readonly BubbleBeamProjectile[];
  readonly afterEffects: readonly BubbleBeamAfterEffect[];
  readonly soundEvents: readonly BubbleBeamSoundEvent[];
  readonly battlerDisplayAge: number;
}

const PROJECTILE_ARGS = [
  [0, 35, 70, 0, 256, 50],
  [0, 20, 40, -10, 256, 50],
  [0, 10, -60, 0, 256, 50],
  [0, 15, -15, 10, 256, 50],
  [0, 30, 10, -10, 256, 50],
  [0, 25, -30, 10, 256, 50],
] as const;
const PROJECTILE_SPAWN_AGES = Array.from(
  { length: 18 },
  (_, index) => 13 + index * 5,
);
const PROJECTILE_OAM_SLOTS = [
  3, 5, 9, 11, 13, 15, 17, 19, 21, 23, 4, 7, 10, 12, 14, 3, 5, 9,
] as const;
const AFTER_EFFECT_ARGS = [
  [10, 10], [20, -20], [-20, 15], [0, 0], [-20, -20], [16, -8],
] as const;
const AFTER_EFFECT_SPAWN_AGES = [172, 180, 188, 196, 204, 212] as const;
const AFTER_EFFECT_OAM_SLOTS = [3, 4, 5, 3, 4, 5] as const;
const CALL_OFFSETS = [85, 112, 139, 166, 193, 220] as const;

function sine(index: number, amplitude: number): number {
  return Math.floor(GBA_SINE_TABLE_256[index & 0xff]! * amplitude / 256);
}

function inverseScale(scale: number): number {
  return Math.trunc(0x10000 / scale);
}

function projectileMatrix(localAge: number): number {
  const tick = (localAge + 2) % 20;
  const scale = tick === 0
    ? 256
    : tick <= 10
      ? 256 - tick * 5
      : 206 + (tick - 10) * 5;
  return inverseScale(scale);
}

function projectileCallback(
  localAge: number,
): BubbleBeamProjectile["callback"] {
  if (localAge <= 47) return "AnimWaterBubbleProjectile_Step1";
  if (localAge === 48) return "AnimWaterBubbleProjectile_Step2";
  if (localAge <= 59) return "RunStoredCallbackWhenAnimEnds";
  if (localAge === 60) return "AnimWaterBubbleProjectile_Step3";
  if (localAge <= 71) return "WaitAnimForDuration";
  return "DestroySpriteAndMatrix";
}

function projectileAtAge(
  age: number,
  spawnIndex: number,
  side: BubbleBeamSide,
  attackerPictureOffset: Readonly<{ x: number; y: number }>,
  targetPictureOffset: Readonly<{ x: number; y: number }>,
): BubbleBeamProjectile | null {
  const localAge = age - PROJECTILE_SPAWN_AGES[spawnIndex]!;
  if (localAge < 0 || localAge > 72) return null;
  const [yOffset, xAmplitude, yAmplitude, phase, phaseStep, duration] =
    PROJECTILE_ARGS[spawnIndex % PROJECTILE_ARGS.length]!;
  const sideSign = side === "player" ? 1 : -1;
  const xAmplitudeForSide = xAmplitude * sideSign;
  const startX = attackerPictureOffset.x + 18 * sideSign;
  const unadjustedY = attackerPictureOffset.y + yOffset;
  const initialPhase = phase & 0xff;
  const x = startX - sine(initialPhase, xAmplitudeForSide);
  const y = unadjustedY - sine(initialPhase + 64, yAmplitude);
  const callbacks = Math.min(localAge + 2, duration);
  const trigIndex = initialPhase + (callbacks - 1) * (phaseStep >> 8);
  const x2 = linearTranslationOffsetAfterCallbacks(
    linearTranslationDeltaQ8(targetPictureOffset.x - startX, duration),
    callbacks,
    duration,
  ) + sine(trigIndex, xAmplitudeForSide);
  const y2 = linearTranslationOffsetAfterCallbacks(
    linearTranslationDeltaQ8(targetPictureOffset.y - unadjustedY, duration),
    callbacks,
    duration,
  ) + sine(trigIndex + 64, yAmplitude);
  return {
    kind: "projectile",
    spawnIndex,
    oamSlot: PROJECTILE_OAM_SLOTS[spawnIndex]!,
    x,
    y,
    x2,
    y2,
    frame: localAge <= 48 ? 0 : localAge <= 53 ? 1 : 2,
    matrix: projectileMatrix(localAge),
    callback: projectileCallback(localAge),
  };
}

function afterEffectAtAge(
  age: number,
  spawnIndex: number,
  targetPictureOffset: Readonly<{ x: number; y: number }>,
): BubbleBeamAfterEffect | null {
  const localAge = age - AFTER_EFFECT_SPAWN_AGES[spawnIndex]!;
  if (localAge < 0 || localAge > 20) return null;
  const [xOffset, yOffset] = AFTER_EFFECT_ARGS[spawnIndex]!;
  const callbacks = localAge + 1;
  return {
    kind: "after-effect",
    spawnIndex,
    oamSlot: AFTER_EFFECT_OAM_SLOTS[spawnIndex]!,
    x: targetPictureOffset.x + xOffset,
    y: targetPictureOffset.y + yOffset,
    x2: sine(callbacks * 11, 4),
    y2: callbacks < 6 ? 0 : -((callbacks * 0x30) >> 8),
    frame: 0,
    matrix: inverseScale(156 + callbacks * 5),
    callback: "AnimBubbleEffect_Step",
  };
}

function scriptOffsetAtAge(age: number): BubbleBeamState["scriptOffset"] {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 6;
  if (age <= 9) return 8;
  if (age <= 12) return 15;
  if (age <= 102) return CALL_OFFSETS[Math.floor((age - 13) / 5) % 6]!;
  if (age <= 171) return 47;
  if (age <= 211) return null;
  if (age <= 233) return 53;
  return 57;
}

/**
 * Complete source-relative `Move_BUBBLE_BEAM` body through its first
 * inactive cleanup. All inputs are already-resolved presentation geometry;
 * this reducer never reads battle clocks, damage, RNG, or controller state.
 */
export function bubbleBeamAtAge(
  age: number,
  side: BubbleBeamSide,
  attackerPictureOffset: Readonly<{ x: number; y: number }>,
  targetPictureOffset: Readonly<{ x: number; y: number }>,
): BubbleBeamState {
  const projectiles = PROJECTILE_SPAWN_AGES.flatMap((_, spawnIndex) => {
    const sprite = projectileAtAge(
      age,
      spawnIndex,
      side,
      attackerPictureOffset,
      targetPictureOffset,
    );
    return sprite ? [sprite] : [];
  });
  const afterEffects = AFTER_EFFECT_SPAWN_AGES.flatMap((_, spawnIndex) => {
    const sprite = afterEffectAtAge(age, spawnIndex, targetPictureOffset);
    return sprite ? [sprite] : [];
  });
  const swayTaskActive = age >= 43 && age <= 127;
  const swayCallbacks = age - 42;
  const swayAmplitude = side === "player" ? 3 : -3;
  const targetOffset = swayTaskActive
    ? { x2: sine(swayCallbacks * 12, swayAmplitude), y2: 0 }
    : { x2: 0, y2: 0 };
  const attackerPan = side === "player" ? -64 : 63;
  const targetPan = side === "player" ? 63 : -64;
  const soundEvents: BubbleBeamSoundEvent[] = [
    ...PROJECTILE_SPAWN_AGES.map((eventAge) => ({
      age: eventAge,
      song: "SE_M_BUBBLE" as const,
      pan: attackerPan,
      player: "SE1" as const,
    })),
    ...AFTER_EFFECT_SPAWN_AGES.map((eventAge) => ({
      age: eventAge,
      song: "SE_M_BUBBLE3" as const,
      pan: targetPan,
      player: "SE1" as const,
    })),
  ];
  return {
    active: age >= 0 && age < 238,
    bubbleLoaded: age >= 1 && age < 238,
    smallBubblesLoaded: age >= 4 && age < 238,
    alpha: age >= 10 && age <= 233 ? { eva: 12, evb: 8 } : null,
    targetMonbg: age >= 7 && age <= 236,
    targetOffset,
    targetBaselineX2: side === "player" && age < 43 ? 1 : 0,
    scriptOffset: scriptOffsetAtAge(age),
    visualTaskCount: projectiles.length + afterEffects.length
      + Number(swayTaskActive),
    soundTaskCount: 0,
    swayTaskActive,
    projectiles,
    afterEffects,
    soundEvents,
    battlerDisplayAge: age - 1,
  };
}
