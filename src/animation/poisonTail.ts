import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";
import { metallicShineAtAge, type MetallicShineState } from "./metallicShine.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";
import { poisonBubblesAtAge, type SludgeSprite } from "./sludge.ts";

export const POISON_TAIL_BUBBLE_START_AGES =
  [122, 132, 140, 148, 156, 164] as const;

export interface PoisonTailState {
  readonly metallic: MetallicShineState;
  readonly attackerX2: number;
  readonly targetX2: number;
  readonly hitsplatVisible: boolean;
  readonly bubbles: readonly SludgeSprite[];
  readonly monbg: boolean;
  readonly alpha: boolean;
  readonly attackerPaletteRestored: boolean;
}

/**
 * Complete source-relative Move_POISON_TAIL visual body.
 *
 * Age zero is the MetallicShine initializer display. The later constants
 * follow directly from the two interpreter-init displays, the three 32-step
 * shine sweeps and DMA waits, then the script's delay 6 and shared
 * PoisonBubblesEffect cadence.
 */
export function poisonTailAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): PoisonTailState {
  const shineAge = age < 2 ? 0 : age <= 65 ? age - 1
    : age <= 67 ? 64 : age - 3;
  const bubbleBody = poisonBubblesAtAge(
    age,
    attackerSide,
    targetCenter,
    POISON_TAIL_BUBBLE_START_AGES,
    (localAge, spawnIndex) =>
      spawnIndex === 0 && localAge >= 2
        ? Math.max(1, localAge - 2)
        : localAge,
  );
  return {
    metallic: metallicShineAtAge(
      shineAge,
      attackerCenter.x,
      attackerCenter.y,
      true,
    ),
    attackerX2: horizontalLungeX2AtTick(4, 4, attackerSide, age - 102),
    targetX2: age < 111 ? 0 : shakeMonOffsetAtTick(3, 0, 6, 1, age - 110).x2,
    hitsplatVisible: age >= 111 && age <= 120,
    bubbles: bubbleBody,
    monbg: age >= 100 && age <= 121,
    alpha: age >= 103 && age <= 121,
    attackerPaletteRestored: age >= 122,
  };
}
