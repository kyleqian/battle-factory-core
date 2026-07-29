import {
  focusEnergyAtAge,
  type FocusEnergySide,
  type FocusEnergyState,
} from "./focusEnergy.ts";

export interface EndureState extends
  Omit<FocusEnergyState, "attackerPaletteTarget"> {
  readonly attackerPaletteTarget: "red";
}

/**
 * Pure source-relative port of Move_ENDURE's complete 122-display envelope.
 * Its three EndureEffect waves, Dragon Rage sound, ShakeMon2 task, waits,
 * display latches, and cleanup are source-identical to Move_FOCUS_ENERGY;
 * the move-specific BlendColorCycle target is explicitly red.
 */
export function endureAtAge(
  age: number,
  attackerSide: FocusEnergySide,
  attackerCoord: Readonly<{ x: number; y: number }>,
): EndureState {
  return {
    ...focusEnergyAtAge(age, attackerSide, attackerCoord),
    attackerPaletteTarget: "red",
  };
}
