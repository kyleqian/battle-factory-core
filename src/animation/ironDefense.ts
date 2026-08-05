import { metallicShineAtAge, type MetallicShineState } from "./metallicShine.ts";

export const IRON_DEFENSE_BLEND_DELAY = 8;
export const IRON_DEFENSE_BLEND_NUM_BLENDS = 2;
export const IRON_DEFENSE_BLEND_Y1 = 14;
export const IRON_DEFENSE_BLEND_Y2 = 0;
// The `complex_palette_blend` sprite is created one engine-age tick after the
// MetallicShine task's first step (script interpreter cadence; probe-derived).
export const IRON_DEFENSE_BLEND_START_AGE = 1;

export interface IronDefensePaletteState {
  readonly active: boolean;
  readonly color: "white" | null;
  readonly coefficient: number;
}

export interface IronDefenseState {
  readonly age: number;
  readonly metallic: MetallicShineState;
  readonly palette: IronDefensePaletteState;
}

/**
 * Source reducer for the move's BG-only `complex_palette_blend` pulse
 * (`AnimComplexPaletteBlend`, `battle_anim_normal.c:344-405`) with
 * IRON_DEFENSE's literal args: selector=F_PAL_BG, delay=8, num_blends=2,
 * color1=color2=RGB_WHITEALPHA, blend_y1=14, blend_y2=0. `age=0` is the
 * sprite's creation tick (initializer and the first Step1 run in the same
 * frame), so the initial white-14 blend lands immediately. Step1 alternates
 * blend_y2/blend_y1 every `delay` frames and Step2 restores on its second
 * entry after the final blend. Returns the RAM palette state
 * (`gPlttBufferFaded`) at that age.
 */
export function complexPaletteBlendAtAge(age: number): IronDefensePaletteState {
  const events: Array<{ age: number; coefficient: number }> = [
    { age: 0, coefficient: IRON_DEFENSE_BLEND_Y1 },
  ];
  for (let i = 1; i <= IRON_DEFENSE_BLEND_NUM_BLENDS; i += 1) {
    events.push({
      age: i * IRON_DEFENSE_BLEND_DELAY + (i - 1),
      coefficient: (i & 1) === 1
        ? IRON_DEFENSE_BLEND_Y2
        : IRON_DEFENSE_BLEND_Y1,
    });
  }
  const restoreAge =
    events[events.length - 1]!.age + IRON_DEFENSE_BLEND_DELAY + 2;
  if (age < 0 || age >= restoreAge) {
    return { active: false, color: null, coefficient: 0 };
  }
  let latest = events[0]!;
  for (const event of events) {
    if (age >= event.age) latest = event;
  }
  return {
    active: latest.coefficient > 0,
    color: latest.coefficient > 0 ? "white" : null,
    coefficient: latest.coefficient,
  };
}

/**
 * Complete MOVE_IRON_DEFENSE move-owned body. `age` is the engine-age source
 * frame (dense-window wa offset by the scene's presentation age): the
 * non-permanent MetallicShine starts immediately and the BG-only white
 * palette pulse trails it by `IRON_DEFENSE_BLEND_START_AGE` ticks.
 */
export function ironDefenseAtAge(
  age: number,
  attackerX: number,
  attackerY: number,
): IronDefenseState {
  return {
    age,
    metallic: metallicShineAtAge(age, attackerX, attackerY, false),
    palette: complexPaletteBlendAtAge(age - IRON_DEFENSE_BLEND_START_AGE),
  };
}