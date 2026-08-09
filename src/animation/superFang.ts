import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";
import { shakeMonInPlaceOffsetAtTick } from "./shakeMonInPlace.ts";
import { shakeMonOffsetAtTick } from "./shakeMon.ts";

export type SuperFangSide = "player" | "opponent";

export interface SuperFangFangSprite {
  readonly kind: "superFang";
  /** `gSuperFangAnimCmds`: tile offsets 0, 16, 32, 48. */
  readonly frame: 0 | 1 | 2 | 3;
  readonly x: number;
  readonly y: number;
}

export interface SuperFangComplexPaletteBlend {
  /** `complex_palette_blend F_PAL_BG`, not either battler palette. */
  readonly target: "red" | "white";
  readonly coefficient: 14;
}

export interface SuperFangState {
  readonly age: number;
  /** `AnimTask_ShakeMonInPlace` followed by `gHorizontalLungeSpriteTemplate`. */
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  /** `AnimTask_BlendMonInAndOut(ATTACKER, RGB(31, 6, 1), 12, 4, 1)`. */
  readonly attackerBlendCoefficient: number;
  /** `gSuperFangSpriteTemplate` / `AnimSuperFang`. */
  readonly fang: SuperFangFangSprite | null;
  /** The final `AnimTask_ShakeMon(TARGET, 0, 7, 12, 1)`. */
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  /** The script's two one-shot `complex_palette_blend` writes. */
  readonly complexPaletteBlend: SuperFangComplexPaletteBlend | null;
}

/** First source-active display of `Move_SUPER_FANG` is age zero. */
export const SUPER_FANG_FIRST_SHAKE_AGE = 4;
export const SUPER_FANG_SECOND_SHAKE_AGE = 42;
export const SUPER_FANG_LUNGE_AGE = 160;
export const SUPER_FANG_SPRITE_AGE = 166;
export const SUPER_FANG_COMPLEX_BLEND_AGE = 176;

/**
 * Source-faithful `AnimTask_BlendMonInAndOut` coefficient.  The task starts
 * at age 42, waits its supplied four ticks, then writes 1..12 and 11..1 in
 * four-display runs.  Palette writes are intentionally represented as RAM
 * state; the scene compositor applies the shared one-display latch.
 */
export function superFangAttackerBlendCoefficientAtAge(age: number): number {
  if (age < 45 || age > 136) return 0;
  const phase = Math.floor((age - 45) / 4);
  return phase <= 11 ? phase + 1 : 23 - phase;
}

function superFangFrameAtAge(age: number): 0 | 1 | 2 | 3 | null {
  const localAge = age - SUPER_FANG_SPRITE_AGE;
  if (localAge === 0) return 0;
  if (localAge === 1 || localAge === 2) return 1;
  if (localAge === 3 || localAge === 4) return 2;
  if (localAge >= 5 && localAge <= 8) return 3;
  return null;
}

/**
 * `createvisualtask` priority 2 inserts both Super Fang in-place tasks ahead
 * of the animation controller's current RunTasks slot.  Their initializer
 * has already called the step once, so the just-created task receives one
 * more regular step before the first readable RAM row.  This source scheduler
 * handoff skips helper tick 1 after the creation row (verified bilaterally
 * from `gTasks` data[1]/data[3], not framebuffer timing).
 */
function superFangInPlaceOffsetAtAge(
  age: number,
  startAge: number,
  xOffset: number,
  numShakes: number,
): Readonly<{ x2: number; y2: number }> {
  const localAge = age - startAge;
  const taskTick = localAge <= 0 ? localAge : localAge + 1;
  return shakeMonInPlaceOffsetAtTick(xOffset, 0, numShakes, 1, taskTick);
}

/**
 * Complete `Move_SUPER_FANG` source body, `0x082cd35a..0x082cd3db`.
 *
 * Every timing is relative to the move script's first active source frame;
 * there are no trace-frame or battle-number conditions.  The super-fang
 * sprite deliberately owns its short, non-affine four-frame program rather
 * than borrowing Hyper Fang's affine `gFangSpriteTemplate` program.
 */
export function superFangAtAge(
  age: number,
  attackerSide: SuperFangSide,
  targetCenter: Readonly<{ x: number; y: number }>,
): SuperFangState {
  const firstShake = superFangInPlaceOffsetAtAge(
    age, SUPER_FANG_FIRST_SHAKE_AGE, 1, 20,
  );
  const secondShake = superFangInPlaceOffsetAtAge(
    age, SUPER_FANG_SECOND_SHAKE_AGE, 3, 48,
  );
  const lunge = horizontalLungeX2AtTick(4, 4, attackerSide, age - (SUPER_FANG_LUNGE_AGE - 1));
  const attackerOffset = age >= SUPER_FANG_LUNGE_AGE
    ? { x2: lunge, y2: 0 }
    : age >= SUPER_FANG_SECOND_SHAKE_AGE
      ? secondShake
      : firstShake;
  const frame = superFangFrameAtAge(age);
  const complexPaletteBlend = age >= SUPER_FANG_COMPLEX_BLEND_AGE
    && age <= SUPER_FANG_COMPLEX_BLEND_AGE + 2
    ? { target: "red" as const, coefficient: 14 as const }
    : age >= SUPER_FANG_COMPLEX_BLEND_AGE + 3
      && age <= SUPER_FANG_COMPLEX_BLEND_AGE + 7
      ? { target: "white" as const, coefficient: 14 as const }
      : null;
  return {
    age,
    attackerOffset,
    attackerBlendCoefficient: superFangAttackerBlendCoefficientAtAge(age),
    fang: frame === null ? null : {
      kind: "superFang",
      frame,
      x: targetCenter.x,
      y: targetCenter.y,
    },
    // The priority-2 target `AnimTask_ShakeMon` receives the same-frame
    // regular RunTasks step after its initializer, so its first readable
    // state is helper tick 1 (zero), then ticks 2..23.
    targetOffset: shakeMonOffsetAtTick(
      0, 7, 12, 1, age - SUPER_FANG_COMPLEX_BLEND_AGE + 1,
    ),
    complexPaletteBlend,
  };
}
