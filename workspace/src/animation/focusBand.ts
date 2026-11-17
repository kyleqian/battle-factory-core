import { slideMonToOriginalPosAtTick } from "./slideMon.ts";

/**
 * wsh2: General_FocusBand (data/battle_anim_scripts.s:10500). Age 0 = the frame the script's first command runs (the blend sprite, the
 * SE and AnimTask_SlideMonForFocusBand are all created on it); every number below is then source-derived except the three
 * script-wait constants (FOCUS_BAND_*_FRAME), which were fitted against the ROM (docs/wsh1-general-anim-commands.md "wsh2").
 *
 * - simple_palette_blend (battle_anim_normal.c AnimSimplePaletteBlend -> BeginNormalPaletteFade, palette.c UpdateNormalPaletteFade):
 *   deltaY 2; the BG pass runs on the creation frame, the OBJ pass the frame after it with the same y, then `delay` waiting frames
 *   (counted on BG-pass frames), so one step is `delay + 2` frames and y moves by 2 after the OBJ pass, clamped to the target.
 * - AnimTask_SlideMonForFocusBand (battle_anim_effects_3.c:3585-3719) with args (30, 128, 0, 1, 2, 0, 1): 30 runs of Step1 (the
 *   slide, 128/256 px per run, data[9] alternating every 2 runs) then 30 runs of Step2 (the slide held at 15 px, data[9] toggling every
 *   run); the player's x flag (|0x8000) subtracts, the opponent's adds.
 * - gSlideMonToOriginalPosSpriteTemplate (0, 0, 15): slideMon.ts slideMonToOriginalPosAtTick.
 */
export const FOCUS_BAND_SLIDE_RUNS = 60;
export const FOCUS_BAND_RESTORE_DURATION = 15;
export const FOCUS_BAND_BLEND_DOWN_FRAME = 60;
export const FOCUS_BAND_RESTORE_FRAME = 104;
export const FOCUS_BAND_PALETTE_LEAD = 2;

/** BlendPalette y of a normal palette fade at `frame` after its creation frame (see above); `plane` selects the BG or OBJ pass. */
export function normalPaletteFadeY(
  frame: number, delay: number, startY: number, targetY: number, plane: "bg" | "obj",
): number {
  if (frame < (plane === "bg" ? 0 : 1)) return startY;
  const period = delay + 2;
  const passes = Math.floor((frame - (plane === "bg" ? 0 : 1)) / period);
  const distance = Math.abs(targetY - startY);
  const moved = Math.min(passes * 2, distance);
  return targetY > startY ? startY + moved : startY - moved;
}

function slideRunsX2(opponent: boolean): readonly number[] {
  // Task data indices as in the C: [0] runs left, [1] shake timer (never initialised: 0), [4] shake x, [9] shake offset, [13] shake period, [7] accumulator.
  let d0 = 30, d1 = 0, d4 = 2, d9 = 0, d7 = 0;
  const d13 = [1, 0];
  let phase: 1 | 2 = 1;
  const out: number[] = [];
  for (let run = 1; run <= FOCUS_BAND_SLIDE_RUNS; run += 1) {
    d0 -= 1;
    d1 -= 1;
    if (d1 === -1) {
      if (d9 === 0) { d9 = d4; d4 = -d4; } else d9 = 0;
      d1 = phase === 1 ? d13[0]! : d13[1]!;
    }
    if (phase === 1) d7 = (d7 & 0xffff) + 128;
    const slide = d7 >> 8;
    out.push(opponent ? d9 + slide : d9 - slide);
    if (d0 < 1 && phase === 1) { d0 = 30; phase = 2; }
  }
  return out;
}

const SLIDE_X2 = { player: slideRunsX2(false), opponent: slideRunsX2(true) } as const;

export interface FocusBandRow {
  /** The attacker's ShakeMon-style x2 (sprite->x2) on this frame. */
  readonly x2: number;
  /** BlendPalette y of the attacker's OBJ palette toward RGB_RED. */
  readonly paletteY: number;
}

export function focusBandRowAtAge(age: number, side: "player" | "opponent"): FocusBandRow {
  if (age < 0) return { x2: 0, paletteY: 0 };
  const runs = SLIDE_X2[side];
  const paletteY = age < FOCUS_BAND_BLEND_DOWN_FRAME
    ? normalPaletteFadeY(age + FOCUS_BAND_PALETTE_LEAD, 7, 0, 9, "obj")
    : normalPaletteFadeY(age - FOCUS_BAND_BLEND_DOWN_FRAME + FOCUS_BAND_PALETTE_LEAD, 4, 9, 0, "obj");
  const held = runs[runs.length - 1]!;
  const x2 = age < FOCUS_BAND_SLIDE_RUNS
    ? runs[age]!
    : age < FOCUS_BAND_RESTORE_FRAME
      ? held
      : slideMonToOriginalPosAtTick({ currentX2: held, currentY2: 0, axisSnapMode: 0, durationTicks: FOCUS_BAND_RESTORE_DURATION }, age - FOCUS_BAND_RESTORE_FRAME).x2;
  return { x2, paletteY };
}
