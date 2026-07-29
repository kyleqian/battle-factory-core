import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";

export type MudShotSide = "player" | "opponent";

export interface MudShotOrb {
  readonly spawnIndex: number;
  readonly oamSlot: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly frame: 0 | 1 | 2 | 3;
  readonly callback: "AnimToTargetInSinWave_Step";
}

export interface MudShotTask {
  readonly kind: "attacker-shake" | "sin-timer" | "target-shake";
  readonly slot: number;
}

export interface MudShotState {
  readonly active: boolean;
  readonly brownOrbLoaded: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly targetMonbg: boolean;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetBaselineX2: number;
  readonly scriptOffset: 0 | 3 | 5 | 29 | 117 | 121 | 139 | 156;
  readonly visualTaskCount: number;
  readonly soundTaskCount: number;
  readonly tasks: readonly MudShotTask[];
  readonly orbs: readonly MudShotOrb[];
  readonly whirlpoolAudio: Readonly<{ pan: number; flags: 128 | 131 }> | null;
  readonly battlerDisplayAge: number;
}

const SPAWN_AGES = Array.from({ length: 22 }, (_, index) => 15 + index * 4);
const OAM_SLOTS = [3, 4, 5, 7, 9, 10, 11, 12] as const;

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

function scriptOffsetAtAge(
  age: number,
): MudShotState["scriptOffset"] {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 5;
  if (age <= 14) return 29;
  if (age >= 103 && age <= 128) return 117;
  if (age >= 129) return 121;
  return (Math.floor((age - 15) / 4) & 1) === 0 ? 139 : 156;
}

function phaseAtCallback(
  spawnIndex: number,
  callbacks: number,
): Readonly<{ phase: number; amplitude: number }> {
  let phase = spawnIndex <= 10
    ? 7 + spawnIndex * 12
    : spawnIndex <= 20
      ? 12 + (spawnIndex - 11) * 12
      : 0;
  let amplitude = spawnIndex <= 10 || spawnIndex === 21 ? 16 : -16;
  for (let callback = 1; callback < callbacks; callback += 1) {
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
  side: MudShotSide,
  attackerPictureOffset: Readonly<{ x: number; y: number }>,
  targetPictureOffset: Readonly<{ x: number; y: number }>,
): MudShotOrb | null {
  const localAge = age - SPAWN_AGES[spawnIndex]!;
  if (localAge < 0 || localAge > 28) return null;
  const callbacks = localAge + 2;
  const x = attackerPictureOffset.x + (side === "player" ? 10 : -10);
  const y = attackerPictureOffset.y + 10;
  const linearX = linearTranslationOffsetAfterCallbacks(
    linearTranslationDeltaQ8(targetPictureOffset.x - x, 30),
    callbacks,
    30,
  );
  const linearY = linearTranslationOffsetAfterCallbacks(
    linearTranslationDeltaQ8(targetPictureOffset.y - y, 30),
    callbacks,
    30,
  );
  const wave = phaseAtCallback(spawnIndex, localAge + 1);
  return {
    spawnIndex,
    oamSlot: OAM_SLOTS[spawnIndex % OAM_SLOTS.length]!,
    x,
    y,
    x2: linearX,
    y2: linearY + Math.floor(
      GBA_SINE_TABLE_256[wave.phase]! * wave.amplitude / 256,
    ),
    frame: ((localAge + 1) & 3) as 0 | 1 | 2 | 3,
    callback: "AnimToTargetInSinWave_Step",
  };
}

/**
 * Complete source-relative `Move_MUD_SHOT` body through first inactive
 * cleanup. The one-display load/free difference is a side-dependent source
 * decompression lifetime; no battle clock participates.
 */
export function mudShotAtAge(
  age: number,
  side: MudShotSide,
  attackerPictureOffset: Readonly<{ x: number; y: number }>,
  targetPictureOffset: Readonly<{ x: number; y: number }>,
): MudShotState {
  const orbs = SPAWN_AGES.flatMap((_, spawnIndex) => {
    const orb = orbAtAge(
      age,
      spawnIndex,
      side,
      attackerPictureOffset,
      targetPictureOffset,
    );
    return orb ? [orb] : [];
  });
  const tasks: MudShotTask[] = [];
  if (age >= 7 && age <= 96) {
    tasks.push({ kind: "attacker-shake", slot: 0 });
  }
  if (age >= 15 && age <= 113) {
    tasks.push({ kind: "sin-timer", slot: 2 });
  }
  if (age >= 39 && age <= 122) {
    tasks.push({ kind: "target-shake", slot: 4 });
  }
  const cleanupAge = side === "player" ? 144 : 143;
  const attackerOffset = shakeOffset(age, 7, 96, 0, 2);
  const targetOffset = shakeOffset(age, 39, 122, 3, 0);
  const panDirection = side === "player" ? 1 : -1;
  const attackerPan = side === "player" ? -64 : 63;
  const audioStep = age <= 130 ? age - 14 : age <= 132 ? 116 : age - 16;
  const whirlpoolAudio = age >= 15 && age <= 135
    ? {
        pan: attackerPan + panDirection * audioStep,
        flags: age === 131 || age === 132 ? 128 as const : 131 as const,
      }
    : null;
  return {
    active: age >= 0 && age < cleanupAge,
    brownOrbLoaded: age >= 1 && age < cleanupAge,
    alpha: age >= 7 && age <= 128 ? { eva: 12, evb: 8 } : null,
    targetMonbg: age >= 7 && age <= 128,
    attackerOffset,
    targetOffset,
    targetBaselineX2: side === "player" && age < 39 ? 1 : 0,
    scriptOffset: scriptOffsetAtAge(age),
    visualTaskCount: tasks.length + orbs.length,
    soundTaskCount: age >= 15
      && age <= (side === "player" ? 142 : 141) ? 1 : 0,
    tasks,
    orbs,
    whirlpoolAudio,
    battlerDisplayAge: age - 1,
  };
}
