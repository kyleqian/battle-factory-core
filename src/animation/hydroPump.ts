import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";

export type HydroPumpSide = "player" | "opponent";

export interface HydroPumpOrb {
  readonly spawnIndex: number;
  readonly oamSlot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly frame: 0 | 1 | 2 | 3;
  readonly callback: "AnimToTargetInSinWave_Step";
}

export interface HydroPumpSplat {
  readonly spawnIndex: number;
  readonly oamSlot: number;
  readonly x: number;
  readonly y: number;
  readonly matrix: Readonly<{ a: 303; b: 0; c: 0; d: 303 }>;
  readonly callback:
    | "RunStoredCallbackWhenAffineAnimEnds"
    | "DestroyAnimSprite";
}

export interface HydroPumpTask {
  readonly kind: "attacker-shake" | "sin-timer" | "target-shake";
  readonly slot: number;
}

export interface HydroPumpState {
  readonly active: boolean;
  readonly waterOrbLoaded: boolean;
  readonly waterImpactLoaded: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly targetMonbg: boolean;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetBaselineX2: number;
  readonly scriptOffset:
    | 0 | 3 | 6 | 8 | 32 | 147 | 149 | 154 | 158 | 191 | 223;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly HydroPumpTask[];
  readonly orbs: readonly HydroPumpOrb[];
  readonly splats: readonly HydroPumpSplat[];
  readonly particleOamSlotsBackToFront: readonly number[];
  readonly hydroPumpAudio:
    Readonly<{ pan: number; flags: 0 | 128 | 131 }> | null;
  readonly battlerDisplayAge: number;
}

const ORB_GROUP_START_AGES = Array.from(
  { length: 22 },
  (_, group) => 18 + group * 3,
);
const ORB_OAM_SLOTS = [
  3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23, 24,
  25, 26, 17, 18, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21, 22,
  23, 24, 25, 26, 17, 18, 5, 7,
] as const;
const SPLAT_START_AGES = [36, 48, 60, 72, 84, 90] as const;
const SPLAT_OAM_SLOTS = [
  [17, 18], [3, 4], [3, 4], [3, 4], [3, 4], [9, 10],
] as const;

function shakeOffset(
  age: number,
  startAge: number,
  endAge: number,
  x: number,
  y: number,
): Readonly<{ x2: number; y2: number }> {
  if (age < startAge + 2 || age > endAge) return { x2: 0, y2: 0 };
  return (age - startAge) % 4 >= 2 ? { x2: x, y2: y } : { x2: 0, y2: 0 };
}

function scriptOffsetAtAge(age: number): HydroPumpState["scriptOffset"] {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 6;
  if (age <= 9) return 8;
  if (age <= 17) return 32;
  if (age >= 118) return 158;
  if (age >= 90) return 154;
  if (age >= 87) return 149;
  if (age >= 84) return 147;
  return (Math.floor((age - 18) / 3) & 1) === 0 ? 191 : 223;
}

function phaseAtCallback(
  group: number,
  positiveAmplitude: boolean,
  callbacks: number,
): Readonly<{ phase: number; amplitude: number }> {
  const retArg = group * 9;
  let phase = retArg > 127 ? retArg - 127 : retArg;
  let amplitude = positiveAmplitude ? 16 : -16;
  if (retArg > 127) amplitude = -amplitude;
  for (let callback = 0; callback < callbacks; callback += 1) {
    if (phase + 7 > 127) {
      phase = 0;
      amplitude = -amplitude;
    } else {
      phase += 7;
    }
  }
  return { phase, amplitude };
}

function orbAtAge(
  age: number,
  spawnIndex: number,
  side: HydroPumpSide,
  attackerPictureOffset: Readonly<{ x: number; y: number }>,
  targetPictureOffset: Readonly<{ x: number; y: number }>,
): HydroPumpOrb | null {
  const group = Math.floor(spawnIndex / 2);
  const localAge = age - ORB_GROUP_START_AGES[group]!;
  if (localAge < 0 || localAge > 28) return null;
  const callbacks = localAge + 2;
  const x = attackerPictureOffset.x + (side === "player" ? 10 : -10);
  const y = attackerPictureOffset.y + 10;
  const phase = phaseAtCallback(
    group,
    spawnIndex % 2 === 0,
    localAge + 1,
  );
  return {
    spawnIndex,
    oamSlot: ORB_OAM_SLOTS[spawnIndex]!,
    x,
    y,
    x2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(targetPictureOffset.x - x, 30),
      callbacks,
      30,
    ),
    y2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(targetPictureOffset.y - y, 30),
      callbacks,
      30,
    ) + Math.floor(
      GBA_SINE_TABLE_256[phase.phase]! * phase.amplitude / 256,
    ),
    frame: ((localAge + 1) & 3) as 0 | 1 | 2 | 3,
    callback: "AnimToTargetInSinWave_Step",
  };
}

function particleOamSlotsBackToFrontAtAge(
  age: number,
  side: HydroPumpSide,
  attackerPictureOffset: Readonly<{ x: number; y: number }>,
  targetPictureOffset: Readonly<{ x: number; y: number }>,
): readonly number[] {
  const slotOrder = Array.from({ length: 64 }, (_, slot) => slot);
  let active = new Map<number, { priority: number; y: number }>();
  for (let currentAge = 0; currentAge <= age; currentAge += 1) {
    const orbs = Array.from({ length: 44 }, (_, spawnIndex) =>
      orbAtAge(
        currentAge,
        spawnIndex,
        side,
        attackerPictureOffset,
        targetPictureOffset,
      )
    ).filter((orb): orb is HydroPumpOrb => orb !== null);
    active = new Map<number, { priority: number; y: number }>([
      ...orbs.map((orb) => [
        orb.oamSlot,
        // createsprite's relative priority 3 resolves to subpriority 27.
        { priority: 4, y: orb.y + orb.y2 },
      ] as const),
      ...SPLAT_START_AGES.flatMap((startAge, group) => {
        const localAge = currentAge - startAge;
        if (localAge < 0 || localAge > 9) return [];
        return [-15, 15].map((offset, pairIndex) => [
          SPLAT_OAM_SLOTS[group]![pairIndex]!,
          // The splat's relative priority 4 resolves in front at 26.
          { priority: 3, y: targetPictureOffset.y - offset },
        ] as const);
      }),
    ]);
    // sprite.c SortSprites is stable for an equal priority/Y pair and keeps
    // its prior-frame sSpriteOrder, including across reused sprite slots.
    slotOrder.sort((leftSlot, rightSlot) => {
      const left = active.get(leftSlot);
      const right = active.get(rightSlot);
      if (!left && !right) return 0;
      if (!left) return 1;
      if (!right) return -1;
      return left.priority - right.priority || right.y - left.y;
    });
  }
  return slotOrder.filter((slot) => active.has(slot)).reverse();
}

/**
 * Complete source-relative `Move_HYDRO_PUMP` presentation through the first
 * inactive cleanup. All timing is relative to the first WATER_ORB load.
 */
export function hydroPumpAtAge(
  age: number,
  side: HydroPumpSide,
  attackerPictureOffset: Readonly<{ x: number; y: number }>,
  targetPictureOffset: Readonly<{ x: number; y: number }>,
): HydroPumpState {
  const orbs = Array.from({ length: 44 }, (_, spawnIndex) =>
    orbAtAge(
      age,
      spawnIndex,
      side,
      attackerPictureOffset,
      targetPictureOffset,
    )
  ).filter((orb): orb is HydroPumpOrb => orb !== null);
  const splats = SPLAT_START_AGES.flatMap((startAge, group) => {
    const localAge = age - startAge;
    if (localAge < 0 || localAge > 9) return [];
    return [-15, 15].map((offset, pairIndex): HydroPumpSplat => ({
      spawnIndex: group * 2 + pairIndex,
      oamSlot: SPLAT_OAM_SLOTS[group]![pairIndex]!,
      x: targetPictureOffset.x,
      y: targetPictureOffset.y - offset,
      matrix: { a: 303, b: 0, c: 0, d: 303 },
      callback: localAge === 9
        ? "DestroyAnimSprite"
        : "RunStoredCallbackWhenAffineAnimEnds",
    }));
  });
  const tasks: HydroPumpTask[] = [];
  if (age >= 10 && age <= 87) {
    tasks.push({ kind: "attacker-shake", slot: 0 });
  }
  if (age >= 18 && age <= 116) {
    tasks.push({ kind: "sin-timer", slot: 3 });
  }
  if (age >= 36 && age <= 107) {
    tasks.push({ kind: "target-shake", slot: 4 });
  }
  const movingAudioLastAge = side === "player" ? 81 : 80;
  const soundTaskLastAge = side === "player" ? 80 : 79;
  let hydroPumpAudio: HydroPumpState["hydroPumpAudio"] = null;
  if (age >= 18 && age <= 138) {
    const direction = side === "player" ? 1 : -1;
    const startPan = side === "player" ? -64 : 63;
    const pan = age <= movingAudioLastAge
      ? Math.max(-63, Math.min(
          63,
          startPan + direction * (age - 17) * 2,
        ))
      : side === "player" ? 63 : -63;
    hydroPumpAudio = {
      pan,
      flags: age <= movingAudioLastAge ? 131 : age <= 138 ? 128 : 0,
    };
  }
  return {
    active: age >= 0 && age < 140,
    waterOrbLoaded: age >= 1 && age < 140,
    waterImpactLoaded: age >= 4 && age < 140,
    alpha: age >= 10 && age <= 117 ? { eva: 12, evb: 8 } : null,
    targetMonbg: age >= 10 && age <= 117,
    attackerOffset: shakeOffset(age, 10, 87, 0, 2),
    targetOffset: shakeOffset(age, 36, 107, 3, 0),
    targetBaselineX2: side === "player" && age < 36 ? 1 : 0,
    scriptOffset: scriptOffsetAtAge(age),
    visualTaskCount: tasks.length + orbs.length + splats.length,
    soundTaskCount: age >= 18 && age <= soundTaskLastAge ? 1 : 0,
    tasks,
    orbs,
    splats,
    particleOamSlotsBackToFront: particleOamSlotsBackToFrontAtAge(
      age,
      side,
      attackerPictureOffset,
      targetPictureOffset,
    ),
    hydroPumpAudio,
    battlerDisplayAge: age - 1,
  };
}
