export type ThunderWaveSide = "player" | "opponent";

export interface ThunderWaveBolt {
  readonly kind: "bolt";
  readonly slot: 3 | 4 | 5 | 7 | 9;
  readonly x: number;
  readonly y: number;
  readonly tileOffset: 0 | 1 | 2 | 3;
  readonly localAge: number;
}

export interface ThunderWaveBand {
  readonly kind: "band";
  readonly slot: 3 | 4 | 5 | 7 | 9 | 10;
  readonly x: number;
  readonly y: number;
  readonly tileOffset: 0 | 8;
  readonly localAge: number;
  readonly hidden: boolean;
}

export interface ThunderWaveState {
  readonly active: boolean;
  readonly assets: Readonly<{
    readonly spark: boolean;
    readonly spark2: boolean;
    readonly sparkH: boolean;
  }>;
  readonly backgroundPaletteY: number;
  readonly visualTaskCount: number;
  readonly bolts: readonly ThunderWaveBolt[];
  readonly bands: readonly ThunderWaveBand[];
  readonly soundRestart:
    | "SE_M_THUNDER_WAVE"
    | "SE_M_THUNDERBOLT2"
    | null;
  readonly soundPan: -63 | 63 | null;
}

export const THUNDER_WAVE_FRAME_COUNT = 120;
export const THUNDER_WAVE_BOLT_CREATION_AGES = [28, 30, 32, 34, 36] as const;
export const THUNDER_WAVE_BAND_CREATION_AGES = [50, 56, 62] as const;
export const THUNDER_WAVE_LOOP_SOUND_AGES = [50, 60, 71, 82] as const;

const BOLT_SLOTS = [3, 4, 5, 7, 9] as const;
const BOLT_TILE_OFFSETS = [0, 1, 2, 3, 0] as const;
const BAND_SLOTS = [[3, 4], [5, 7], [9, 10]] as const;

function backgroundPaletteYAtAge(age: number): number {
  if (age < 10) return 0;
  if (age <= 15) return age - 9;
  if (age <= 112) return 6;
  if (age <= 117) return 118 - age;
  return 0;
}

/**
 * Pure source-relative reducer for `Move_THUNDER_WAVE`.
 *
 * Age zero is the first display with the source script active at offset zero.
 * The reducer ends at the first inactive cleanup display (age 119); the later
 * `Task_DoStatusAnimation` belongs to battle presentation outside this unit.
 */
export function thunderWaveAtAge(
  age: number,
  attackerSide: ThunderWaveSide,
  targetAnimationCenter: Readonly<{ x: number; y: number }>,
  targetBattlePositionCenter: Readonly<{ x: number; y: number }>,
): ThunderWaveState {
  const bolts: ThunderWaveBolt[] = [];
  for (const [index, creationAge] of THUNDER_WAVE_BOLT_CREATION_AGES.entries()) {
    const localAge = age - creationAge;
    if (localAge < 0 || localAge >= 14) continue;
    bolts.push({
      kind: "bolt",
      slot: BOLT_SLOTS[index]!,
      x: targetBattlePositionCenter.x,
      y: targetBattlePositionCenter.y - 32 + index * 16,
      tileOffset: BOLT_TILE_OFFSETS[index]!,
      localAge,
    });
  }

  const bands: ThunderWaveBand[] = [];
  for (const [index, creationAge] of THUNDER_WAVE_BAND_CREATION_AGES.entries()) {
    const localAge = age - creationAge;
    if (localAge < 0 || localAge >= 50) continue;
    const hidden = Math.floor((localAge + 1) / 3) % 2 === 1;
    for (const [half, xOffset] of [-16, 16].entries()) {
      bands.push({
        kind: "band",
        slot: BAND_SLOTS[index]![half]!,
        x: targetAnimationCenter.x + xOffset,
        y: targetAnimationCenter.y - 16 + index * 16,
        tileOffset: half === 0 ? 0 : 8,
        localAge,
        hidden,
      });
    }
  }

  const loopSound = THUNDER_WAVE_LOOP_SOUND_AGES.includes(age as never);
  return {
    active: age >= 0 && age < THUNDER_WAVE_FRAME_COUNT - 1,
    assets: {
      spark: age >= 1 && age < 119,
      spark2: age >= 4 && age < 119,
      sparkH: age >= 7 && age < 119,
    },
    backgroundPaletteY: backgroundPaletteYAtAge(age),
    visualTaskCount:
      Number(age >= 10 && age <= 14)
      + Number(age >= 28 && age <= 37)
      + bands.length
      + Number(age >= 113 && age <= 117),
    bolts,
    bands,
    soundRestart: age === 28
      ? "SE_M_THUNDER_WAVE"
      : loopSound ? "SE_M_THUNDERBOLT2" : null,
    soundPan: age === 28 || loopSound
      ? attackerSide === "player" ? 63 : -63
      : null,
  };
}
