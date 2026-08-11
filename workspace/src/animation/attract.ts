import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";

export type AttractSide = "player" | "opponent";
export interface AttractPoint { readonly x: number; readonly y: number }

export interface AttractHeart {
  readonly kind: "projectile" | "burst" | "rising";
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly invisible: boolean;
  /** False only for a sprite allocated after this frame's OAM transfer. */
  readonly submitted: boolean;
  readonly callback:
    | "AnimRedHeartRising"
    | "AnimRedHeartProjectile_Step"
    | "AnimParticleBurst"
    | "WaitAnimForDuration"
    | "AnimRedHeartRising_Step";
  readonly data: readonly number[];
}

export interface AttractState {
  readonly active: boolean;
  readonly redHeartLoaded: boolean;
  readonly scriptOffset: 0 | 3 | 28 | 39 | 110 | 123 | 149 | 229 | 248;
  readonly attackerOffset: Readonly<{ x2: number; y2: 0 }>;
  readonly projectile: AttractHeart | null;
  readonly bursts: readonly AttractHeart[];
  readonly rising: readonly AttractHeart[];
  readonly heartsBackground: Readonly<{
    loaded: boolean;
    visible: boolean;
    eva: number;
    evb: number;
  }>;
  readonly targetBlendCoefficient: number;
  readonly sound:
    | "SE_M_CHARM"
    | "SE_M_ATTRACT"
    | "SE_M_ATTRACT2"
    | null;
  readonly soundPanSide: AttractSide | null;
}

export const ATTRACT_FRAME_COUNT = 435;
export const ATTRACT_FIRST_INACTIVE_AGE = 434;

const BURST_ARGS = [
  { data1: 160, data2: -32, slot: 3 },
  { data1: -256, data2: -40, slot: 4 },
  { data1: 128, data2: -16, slot: 5 },
  { data1: 416, data2: -38, slot: 7 },
  { data1: -128, data2: -22, slot: 9 },
  { data1: -384, data2: -31, slot: 10 },
] as const;

const RISING_ARGS = [
  { x: 16, speed: 256, delay: 0, slot: 3 },
  { x: 224, speed: 240, delay: 15, slot: 4 },
  { x: 126, speed: 272, delay: 30, slot: 5 },
  { x: 80, speed: 224, delay: 45, slot: 7 },
  { x: 170, speed: 272, delay: 60, slot: 9 },
  { x: 40, speed: 256, delay: 75, slot: 10 },
  { x: 112, speed: 256, delay: 90, slot: 11 },
  { x: 200, speed: 272, delay: 90, slot: 12 },
] as const;

function gbaSin(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function scriptOffsetAtAge(age: number): AttractState["scriptOffset"] {
  if (age <= 0) return 0;
  if (age <= 3) return 3;
  if (age <= 20) return 28;
  if (age <= 116) return 39;
  if (age <= 157) return 110;
  if (age <= 159) return 123;
  if (age <= 160) return 149;
  if (age <= 237) return 229;
  return 248;
}

function swayAtAge(age: number, attackerSide: AttractSide) {
  if (age < 4 || age > 34) return { x2: 0, y2: 0 as const };
  const callbacks = age - 3;
  const amplitude = attackerSide === "player" ? 12 : -12;
  return {
    x2: gbaSin(callbacks * 16, amplitude),
    y2: 0 as const,
  };
}

function projectileAtAge(
  age: number,
  attackerSide: AttractSide,
  attacker: AttractPoint,
  target: AttractPoint,
): AttractHeart | null {
  if (age < 21 || age > 115) return null;
  const callbacks = age - 20;
  const x = attacker.x + (attackerSide === "player" ? 20 : -20);
  const y = attacker.y - 8;
  const dx = linearTranslationDeltaQ8(target.x - x, 95);
  const dy = linearTranslationDeltaQ8(target.y - y, 95);
  const x2 = linearTranslationOffsetAfterCallbacks(dx, callbacks, 95);
  const y2 = linearTranslationOffsetAfterCallbacks(dy, callbacks, 95)
    + gbaSin((callbacks - 1) * 4, 14);
  return {
    kind: "projectile",
    slot: 3,
    x,
    y,
    x2,
    y2,
    invisible: false,
    submitted: true,
    callback: "AnimRedHeartProjectile_Step",
    data: [
      95 - callbacks,
      Math.abs(dx),
      Math.abs(dy),
      Math.abs(dx) * callbacks,
      Math.abs(dy) * callbacks,
      callbacks * 4,
      0,
      0,
    ],
  };
}

function burstsAtAge(age: number, target: AttractPoint): AttractHeart[] {
  if (age < 117 || age > 156) return [];
  const steps = age - 116;
  const data3 = steps * 3;
  return BURST_ARGS.map((args) => ({
    kind: "burst" as const,
    slot: args.slot,
    x: target.x,
    y: target.y,
    x2: (args.data1 * steps) >> 8,
    y2: gbaSin(data3 - 3, args.data2),
    invisible: data3 > 100 && data3 % 2 !== 0,
    submitted: true,
    callback: "AnimParticleBurst" as const,
    data: [
      1,
      args.data1,
      args.data2,
      data3,
      args.data1 * steps,
      0,
      0,
      0,
    ],
  }));
}

function risingAtAge(
  age: number,
  attackerSide: AttractSide,
  target: AttractPoint,
): AttractHeart[] {
  const initialized = RISING_ARGS.flatMap<AttractHeart>((args, index) => {
    const createdAge = index === 0 ? 160 : 161;
    if (age < createdAge) return [];
    const callbackStart = index === 0 ? 161 : 161 + args.delay;
    const callbacks = Math.max(0, age - callbackStart);
    const data2 = callbacks * args.speed;
    const data3 = (callbacks * 3) & 0xff;
    const y2 = -(data2 >>> 8);
    if (callbacks > 0 && 160 + y2 <= 64) return [];
    const waiting = age < callbackStart;
    return [{
      kind: "rising" as const,
      slot: args.slot,
      x: args.x,
      y: 160,
      x2: callbacks ? gbaSin(data3 - 3, 4) : 0,
      y2,
      invisible:
        callbacks > 0 && 160 + y2 <= 72 && data3 % 2 !== 0,
      submitted: true,
      callback: waiting
        ? "WaitAnimForDuration" as const
        : "AnimRedHeartRising_Step" as const,
      data: [
        waiting
          ? Math.max(0, args.delay - Math.max(0, age - createdAge + 1))
          : 0,
        args.speed,
        data2,
        data3,
        0,
        0,
        0,
        0,
      ],
    }];
  });
  // With an opponent-side attacker the animation script resumes after the
  // sprite walk has already passed slot 4. The second createsprite allocation
  // is therefore present in RAM at age 160 but is not submitted to OAM until
  // its initializer runs on the following frame.
  if (age === 160 && attackerSide === "opponent") {
    initialized.push({
      kind: "rising",
      slot: 4,
      x: target.x,
      y: target.y,
      x2: 0,
      y2: 0,
      invisible: false,
      submitted: false,
      callback: "AnimRedHeartRising",
      data: [0, 0, 0, 0, 0, 0, 0, 0],
    });
  }
  return initialized;
}

function backgroundAtAge(age: number): AttractState["heartsBackground"] {
  if (age < 158 || age >= 434) {
    return { loaded: false, visible: false, eva: 0, evb: 16 };
  }
  let eva = 0;
  if (age >= 165 && age <= 224) eva = Math.floor((age - 161) / 4);
  else if (age >= 225 && age <= 369) eva = 16;
  else if (age >= 370 && age <= 433) {
    eva = 16 - Math.floor((age - 366) / 4);
  }
  eva = Math.max(0, Math.min(16, eva));
  return {
    loaded: true,
    visible: age < 432,
    eva,
    evb: 16 - eva,
  };
}

function targetBlendAtAge(age: number): number {
  const phase = (from: number, topStart: number, downStart: number) => {
    if (age < from || age >= downStart + 24) return 0;
    if (age < topStart) return 2 + 2 * Math.floor((age - from) / 6);
    if (age < downStart) return 10;
    return Math.max(0, 8 - 2 * Math.floor((age - downStart) / 6));
  };
  return phase(244, 268, 280) || phase(316, 340, 352);
}

/** Pure source-relative port of Move_ATTRACT's sole successful body. */
export function attractAtAge(
  age: number,
  attackerSide: AttractSide,
  attackerCenter: AttractPoint,
  targetCenter: AttractPoint,
): AttractState {
  const sound = age === 4 || age === 16 || age === 28
    ? "SE_M_CHARM"
    : age === 117
      ? "SE_M_ATTRACT"
      : age === 176
        ? "SE_M_ATTRACT2"
        : null;
  return {
    active: age >= 0 && age < ATTRACT_FIRST_INACTIVE_AGE,
    redHeartLoaded: age >= 0 && age < ATTRACT_FRAME_COUNT,
    scriptOffset: scriptOffsetAtAge(age),
    attackerOffset: swayAtAge(age, attackerSide),
    projectile: projectileAtAge(
      age,
      attackerSide,
      attackerCenter,
      targetCenter,
    ),
    bursts: burstsAtAge(age, targetCenter),
    rising: risingAtAge(age, attackerSide, targetCenter),
    heartsBackground: backgroundAtAge(age),
    targetBlendCoefficient: targetBlendAtAge(age),
    sound,
    soundPanSide: sound === "SE_M_ATTRACT2" ? null : sound
      ? (sound === "SE_M_CHARM" ? attackerSide
        : attackerSide === "player" ? "opponent" : "player")
      : null,
  };
}
