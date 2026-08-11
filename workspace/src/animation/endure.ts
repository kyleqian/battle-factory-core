import {
  focusEnergyAtAge,
  type FocusEnergySide,
  type FocusEnergyState,
} from "./focusEnergy.ts";

export interface EndureState extends
  Omit<FocusEnergyState, "attackerPaletteTarget" | "scriptOffset"> {
  readonly attackerPaletteTarget: "red";
  readonly scriptOffset:
    | 0 | 3 | 14 | 57 | 62 | 63 | 81 | 98 | 115 | 132;
}

function endureScriptOffsetAtAge(age: number): EndureState["scriptOffset"] {
  if (age === 0) return 0;
  if (age <= 3) return 3;
  if (age <= 9) return 81;
  if (age <= 15) return 98;
  if (age <= 21) return 115;
  if (age <= 27) return 132;
  if (age <= 37) return 14;
  if (age <= 43) return 81;
  if (age <= 49) return 98;
  if (age <= 55) return 115;
  if (age <= 61) return 132;
  if (age <= 71) return 57;
  if (age <= 77) return 81;
  if (age <= 83) return 98;
  if (age <= 89) return 115;
  if (age <= 95) return 132;
  if (age <= 120) return 62;
  return 63;
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
    scriptOffset: endureScriptOffsetAtAge(age),
  };
}
