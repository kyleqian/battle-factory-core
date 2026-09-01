/** Pure source-relative reducer for Move_SWIFT's visual presentation body. */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type SwiftSide = "player" | "opponent";

export const SWIFT_SOURCE_START = 0x082c_97a9;
export const SWIFT_SOURCE_END_EXCLUSIVE = 0x082c_9862;
export const SWIFT_YELLOW_STAR_TAG = 10174;
export const SWIFT_IMPACT_TAG = 10135;

const STAR_SPECS = [
  { age: 10, targetY: 0, wave: 20 },
  { age: 17, targetY: 5, wave: -18 },
  { age: 24, targetY: -10, wave: 15 },
  { age: 31, targetY: 0, wave: -20 },
  { age: 38, targetY: 0, wave: 12 },
] as const;

export interface SwiftAnimationProfile {
  readonly attackerSide: SwiftSide;
  readonly attackerEffectCenter: Readonly<{ x: number; y: number }>;
  readonly targetAverageCenter: Readonly<{ x: number; y: number }>;
  readonly attackerSpriteSlot: number;
  readonly targetSpriteSlot: number;
  readonly targetInitialOffset: Readonly<{ x2: number; y2: number }>;
  readonly starSlots: readonly [number, number, number, number, number];
  readonly targetShakeTaskSlot: number;
  readonly gameplayRng: number;
  readonly immutableGameplayState?: unknown;
}

export interface SwiftStar {
  readonly kind: "yellow-star";
  readonly index: 0 | 1 | 2 | 3 | 4;
  readonly slot: number;
  readonly callback: "AnimTranslateLinearSingleSineWave_Step";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly invisible: false;
  readonly matrix: readonly [256, 0, 0, 256];
  readonly sourceCreationOrder: number;
}

export interface SwiftFrame {
  readonly age: number;
  readonly active: boolean;
  readonly source: Readonly<{
    active: boolean;
    offset: number;
    pointer: number;
    pointerParity: 0 | 1;
    wait: number;
  }>;
  readonly stars: readonly SwiftStar[];
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetShake: Readonly<{
    slot: number;
    spriteSlot: number;
    callback: "AnimTask_ShakeMon2_Step";
    localAge: number;
  }> | null;
  readonly registers: Readonly<{
    monbg: boolean;
    alpha: readonly [12, 8] | null;
  }>;
  readonly resources: Readonly<{
    yellowStar: Readonly<{ tag: 10174; loaded: boolean }>;
    impact: Readonly<{ tag: 10135; loaded: boolean; instantiated: false }>;
  }>;
  readonly audio: readonly Readonly<{
    age: 10 | 17 | 24 | 31 | 38;
    channel: "SE1";
    song: "se_m_swift";
    pan: -64 | 63;
  }>[];
  readonly gameplay: Readonly<{ rng: number; immutableState: unknown; changed: false }>;
  readonly cleanup: Readonly<{ firstInactive: boolean; resourcesFreed: boolean }>;
}

function assertProfile(profile: Readonly<SwiftAnimationProfile>): void {
  const slots = [profile.attackerSpriteSlot, profile.targetSpriteSlot,
    ...profile.starSlots, profile.targetShakeTaskSlot];
  if ((profile.attackerSide !== "player" && profile.attackerSide !== "opponent")
    || slots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 64)) {
    throw new Error("invalid Swift animation profile");
  }
}

function sourceAtAge(age: number, active: boolean, cleanupStart: number) {
  let offset = 180;
  let wait = 1;
  if (age <= 0) { offset = 0; wait = 0; }
  else if (age <= 3) { offset = 3; wait = age === 1 ? 1 : 0; }
  else if (age <= 6) { offset = 6; wait = age === 4 ? 1 : 0; }
  else if (age <= 9) { offset = 8; wait = age === 7 ? 1 : 0; }
  else if (age <= 16) { offset = 38; wait = Math.max(0, 15 - age); }
  else if (age <= 23) { offset = 65; wait = Math.max(0, 22 - age); }
  else if (age <= 30) { offset = 126; wait = Math.max(0, 29 - age); }
  else if (age <= 37) { offset = 153; wait = Math.max(0, 36 - age); }
  else if (age <= 44) { offset = 180; wait = Math.max(0, 43 - age); }
  else if (age >= cleanupStart) offset = 184;
  const pointer = SWIFT_SOURCE_START + offset;
  return { active, offset, pointer, pointerParity: (pointer & 1) as 0 | 1, wait };
}

function sine(angle: number, amplitude: number): number {
  return (GBA_SINE_TABLE_256[angle & 0xff]! * amplitude) >> 8;
}

function starAtAge(
  age: number,
  index: 0 | 1 | 2 | 3 | 4,
  profile: Readonly<SwiftAnimationProfile>,
): SwiftStar | null {
  const spec = STAR_SPECS[index];
  if (age < spec.age) return null;
  const callbacks = age - spec.age + 1;
  const direction = profile.attackerSide === "player" ? 1 : -1;
  const x = profile.attackerEffectCenter.x + direction * 20;
  const y = profile.attackerEffectCenter.y - 10;
  const targetX = profile.targetAverageCenter.x + direction * 20;
  const targetY = profile.targetAverageCenter.y + spec.targetY;
  const x2 = linearTranslationOffsetAfterCallbacks(
    linearTranslationDeltaQ8(targetX - x, 22), callbacks, Number.MAX_SAFE_INTEGER,
  );
  const linearY = linearTranslationOffsetAfterCallbacks(
    linearTranslationDeltaQ8(targetY - y, 22), callbacks, Number.MAX_SAFE_INTEGER,
  );
  const angle = Math.trunc((0x8000 / 22)) * callbacks >>> 8;
  const y2 = linearY + sine(angle, spec.wave);
  if (x + x2 > 256 || x + x2 < -16 || y + y2 > 160 || y + y2 < -16) return null;
  return {
    kind: "yellow-star", index, slot: profile.starSlots[index],
    callback: "AnimTranslateLinearSingleSineWave_Step", x, y, x2, y2,
    subpriority: (profile.attackerSide === "player" ? 40 : 30) - 3,
    invisible: false, matrix: [256, 0, 0, 256], sourceCreationOrder: index,
  };
}

export function swiftAtAge(age: number, profile: Readonly<SwiftAnimationProfile>): SwiftFrame {
  assertProfile(profile);
  const stars = STAR_SPECS.flatMap((_spec, index) => {
    const star = starAtAge(age, index as 0 | 1 | 2 | 3 | 4, profile);
    return star ? [star] : [];
  });
  const targetShake = age >= 24 && age <= 57 ? {
    slot: profile.targetShakeTaskSlot,
    spriteSlot: profile.targetSpriteSlot,
    callback: "AnimTask_ShakeMon2_Step" as const,
    localAge: age - 24,
  } : null;
  const shaken = age < 24 ? profile.targetInitialOffset
    : age <= 58 ? shakeMon2OffsetAtTick(2, 0, 18, 1, age - 23)
      : { x2: 0, y2: 0 };
  let lastStarAge = 38;
  for (let probeAge = 38; probeAge < 256; probeAge += 1) {
    if (STAR_SPECS.some((_spec, index) => starAtAge(
      probeAge, index as 0 | 1 | 2 | 3 | 4, profile,
    ))) lastStarAge = probeAge;
  }
  const cleanupStart = lastStarAge + 2;
  const active = age >= 0 && age < lastStarAge + 6;
  const firstInactive = age >= 0 && !active;
  const resourcesLoaded = age >= 1 && !firstInactive;
  return {
    age, active, source: sourceAtAge(age, active, cleanupStart), stars,
    targetOffset: shaken, targetShake,
    registers: { monbg: age >= 7 && !firstInactive, alpha: age >= 10 && active ? [12, 8] : null },
    resources: {
      yellowStar: { tag: SWIFT_YELLOW_STAR_TAG, loaded: resourcesLoaded },
      impact: { tag: SWIFT_IMPACT_TAG, loaded: age >= 4 && !firstInactive, instantiated: false },
    },
    audio: STAR_SPECS.some((spec) => spec.age === age) ? [{
      age: age as 10 | 17 | 24 | 31 | 38, channel: "SE1", song: "se_m_swift",
      pan: profile.attackerSide === "player" ? -64 : 63,
    }] : [],
    gameplay: { rng: profile.gameplayRng, immutableState: profile.immutableGameplayState, changed: false },
    cleanup: { firstInactive, resourcesFreed: firstInactive },
  };
}
