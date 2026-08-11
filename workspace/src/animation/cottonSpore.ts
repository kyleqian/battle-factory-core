import {
  sporeParticlesAtAge,
  type SporeParticle,
  type SporePoint,
  type SporeSide,
} from "./spore.ts";

export interface CottonSporeState {
  readonly active: boolean;
  readonly sporeLoaded: boolean;
  readonly targetMonBg: boolean;
  readonly splitBgPriority: boolean;
  readonly alpha: null;
  readonly doubleBattlePriorityTask: false;
  readonly scriptOffset: 0 | 3 | 5 | 28 | 31 | 51 | 70 | 89;
  readonly particles: readonly SporeParticle[];
  readonly sound: "SE_M_POISON_POWDER" | null;
  readonly soundPanSide: SporeSide | null;
  readonly soundLoopActive: boolean;
}

export const COTTON_SPORE_FRAME_COUNT = 204;
export const COTTON_SPORE_FIRST_INACTIVE_AGE = 203;

const SPAWN_AGES = [7, 21, 35, 49, 63, 77, 91, 105, 119] as const;
const SOUND_AGES = new Set([7, 25, 44, 63, 82, 101, 120, 139, 158, 177]);

function scriptOffsetAtAge(age: number): CottonSporeState["scriptOffset"] {
  if (age <= 0) return 0;
  if (age <= 3) return 3;
  if (age <= 6) return 5;
  for (const spawnAge of SPAWN_AGES) {
    if (age >= spawnAge && age < spawnAge + 14) {
      return ([51, 70, 89] as const)[SPAWN_AGES.indexOf(spawnAge) % 3]!;
    }
  }
  if (age <= 198) return 28;
  return 31;
}

/**
 * Pure source-relative `Move_COTTON_SPORE` body. The Speed drop and accuracy
 * result are immutable battle-engine inputs outside this presentation.
 */
export function cottonSporeAtAge(
  age: number,
  targetSide: SporeSide,
  targetCenter: SporePoint,
): CottonSporeState {
  const sound = SOUND_AGES.has(age) ? "SE_M_POISON_POWDER" : null;
  return {
    active: age >= 0 && age < COTTON_SPORE_FIRST_INACTIVE_AGE,
    sporeLoaded: age >= 1 && age < COTTON_SPORE_FIRST_INACTIVE_AGE,
    targetMonBg: age >= 4 && age < 202,
    splitBgPriority: age >= 5,
    alpha: null,
    doubleBattlePriorityTask: false,
    scriptOffset: scriptOffsetAtAge(age),
    particles: sporeParticlesAtAge(age, targetCenter, false),
    sound,
    soundPanSide: sound ? targetSide : null,
    soundLoopActive: age >= 7 && age < 177,
  };
}
