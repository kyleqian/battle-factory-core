// Palette-fade math for the S4 summary-screen entry/exit transitions, all of
// which call reference/pokeemerald/src/palette.c's
// `BeginNormalPaletteFade(PALETTES_ALL, 0, startY, targetY, RGB_BLACK)`
// (battle_factory_screen.c:1465 entry-out, pokemon_summary_screen.c:1290
// entry-in, pokemon_summary_screen.c:1510 exit-out,
// battle_factory_screen.c:1217 exit-in - all delay=0, blendColor=RGB_BLACK).
//
// Two facts, both derived from reading palette.c/util.c and then confirmed
// pixel-for-pixel against dense oracle probes (bin/oracle run, every-frame
// captureFrames through all four transitions; see
// docs/summary-screen-notes.md):
//
// 1. `BlendPalette` (util.c:264) runs in 5-bit-per-channel GBA color space:
//    `faded5 = c5 + (((target5 - c5) * y) >> 4)`, y in 0..16. For
//    blendColor=RGB_BLACK (target5=0) this simplifies (floor-equivalent,
//    verified algebraically and pixel-for-pixel) to
//    `faded5 = floor(c5 * (16 - y) / 16)`. Our assets store already-expanded
//    8-bit color (`(c5<<3)|(c5>>2)`, per ROADMAP's color-pipeline note), and
//    that expansion is exactly invertible (`c5 = c8 >> 3`), so
//    `blendComponentToBlack` below takes/returns 8-bit components directly.
//
// 2. `UpdateNormalPaletteFade` (palette.c:406) processes BG palettes and OBJ
//    palettes on *alternating calls* (`objPaletteToggle`), advancing `y` only
//    once both halves of a cycle have run. Net effect, oracle-confirmed on
//    every sampled pixel: the OBJ layer's `y` always lags the BG layer's `y`
//    by exactly one tick (`objY(t) === bgY(t - 1)`), and each `y` step (size
//    2, since deltaY=2 for delay=0) holds for exactly 2 ticks on the BG
//    layer.
//
// Per-transition `startDelay` (ticks between the tick that visibly triggers
// the transition and the BG layer's first non-`startY` frame) is NOT
// derivable from the above - it's task-dispatch lag specific to each call
// site - so it's pinned per transition from the same oracle probes, same
// methodology as monPic.ts's timing tables.

export interface FadeTiming {
  startDelay: number;
  startY: number;
  targetY: number;
}

/** battle_factory_screen.c:1465 STATE_SUMMARY_FADE - draft screen fading to black. Oracle: first step at press-tick+5 (frame 47 of press-tick 42), BG settles (y=16) at +19, OBJ (so fully black) at +20. */
export const ENTRY_FADE_OUT: FadeTiming = { startDelay: 5, startY: 0, targetY: 16 };
/** Frames the screen holds solid black between entry fade-out settling and entry fade-in starting (CB2_InitSummaryScreen's LoadGraphics decompression/setup). Oracle: frames 62-85 of press-tick 42 (24 frames). */
export const ENTRY_BLACK_HOLD_TICKS = 24;
/** pokemon_summary_screen.c:1290 - Info page fading in from black. Oracle: first step already visible at tick 0 (no dead frames), BG settles (y=0) at tick 14, OBJ at tick 15. Shared shape with EXIT_FADE_IN. */
export const FADE_IN: FadeTiming = { startDelay: 0, startY: 16, targetY: 0 };
/** pokemon_summary_screen.c:1510 - Info page fading to black on B. Oracle: first step at B-press-tick+3, BG settles at +17, OBJ (fully black) at +18. */
export const EXIT_FADE_OUT: FadeTiming = { startDelay: 3, startY: 0, targetY: 16 };
/** Frames the screen holds solid black on the way back to the draft screen. Oracle: 20 frames. */
export const EXIT_BLACK_HOLD_TICKS = 20;

/** Ticks a fade-out phase itself spans before the screen is fully black (BG settles at startDelay+2*8-1... pinned directly from the oracle, see module doc): entry 20, exit 18. */
export const ENTRY_FADE_OUT_TICKS = 20;
export const EXIT_FADE_OUT_TICKS = 18;
/** Ticks a fade-in phase spans before both layers settle on the destination screen's true colors (shared by entry and exit - see FADE_IN). */
export const FADE_IN_TICKS = 15;

/**
 * src/engine/prebattleRoom.ts's "warpFade" phase (S6 slice 1a,
 * data/maps/.../scripts.inc:50 `warp MAP_..._BATTLE_ROOM, 6, 11` right
 * after the guided walk's shared `waitmovement 0`): the same
 * BeginNormalPaletteFade(PALETTES_ALL, 0, 0, 16, RGB_BLACK) mechanism as
 * every other transition in this file, timed against
 * `tools/compare/traces-groundtruth/battle1-intro.json`'s own frames (dense
 * pixel sampling of a static room pixel unaffected by any sprite): the walk
 * animation itself freezes 80 ticks after the walk starts (prebattleRoom.ts
 * WALK_STEPS' last entry); 3 ticks later the BG layer's first blend step
 * lands (startDelay 4, matching this fade's own phase-start tick, one past
 * the freeze), then the familiar step-2-every-2-ticks cadence to fully
 * black at +18 (BG) / +19 (OBJ, one-tick lag per this file's own point 2) -
 * both frames sha256-cross-checked against the ground-truth trace's solid
 * black window (frames 501-519, `d8b44303...`).
 */
export const WARP_FADE_OUT: FadeTiming = { startDelay: 4, startY: 0, targetY: 16 };

/** BlendPalette in 5-bit space, target color black, applied to an already-8-bit-expanded component (see module doc point 1). y=0 -> unfaded (c8 back out), y=16 -> 0 (black). */
export function blendComponentToBlack(component8: number, y: number): number {
  const c5 = component8 >> 3;
  const faded5 = Math.floor((c5 * (16 - y)) / 16);
  return (faded5 << 3) | (faded5 >> 2);
}

/**
 * `BlendPalette` in 5-bit space, target color WHITE (`RGB_WHITE`,
 * target5=31 per channel) - the send-out window's `BeginNormalPaletteFade
 * (selectedPalettes, 0, 0, 16, RGB_WHITE)` (docs/battle-scene-notes.md
 * §7.5/§7.9, `battle_anim_throw.c:2056`), same mechanism as
 * `blendComponentToBlack` but blendColor isn't 0 so the `(16-y)` shortcut
 * doesn't apply - uses the general `c5 + (((target5-c5)*y)>>4)` form
 * instead (`util.c:264`'s literal formula, `>>4` truncation not `/16`
 * rounding). Oracle pixel-cross-validated against
 * `tools/compare/traces/sendout.json` (a clean background sample,
 * `battleScene.ts`'s own send-out module doc) at every distinct `y` value
 * 0/2/4/.../16 the trace's fade actually passes through.
 */
export function blendComponentToWhite(component8: number, y: number): number {
  const c5 = component8 >> 3;
  const faded5 = c5 + (((31 - c5) * y) >> 4);
  return (faded5 << 3) | (faded5 >> 2);
}

/** General `BlendPalette` channel math for a non-black/non-white target. */
export function blendComponentToward(
  component8: number,
  target8: number,
  y: number,
): number {
  const c5 = component8 >> 3;
  const target5 = target8 >> 3;
  const faded5 = c5 + (((target5 - c5) * y) >> 4);
  return (faded5 << 3) | (faded5 >> 2);
}

/** The BG layer's fade coefficient `ticks` after the tick that triggered the transition (see FadeTiming.startDelay). Holds `startY` through the dead frames, then steps by 2 every 2 ticks toward `targetY`. */
export function bgFadeY(ticks: number, timing: FadeTiming): number {
  const delta = ticks - timing.startDelay;
  if (delta < 0) return timing.startY;
  const dir = timing.targetY > timing.startY ? 1 : -1;
  const step = Math.floor(delta / 2) + 1;
  const raw = timing.startY + dir * 2 * step;
  return dir > 0 ? Math.min(timing.targetY, raw) : Math.max(timing.targetY, raw);
}

/** The OBJ layer's fade coefficient: always exactly one tick behind the BG layer's (see module doc point 2). */
export function objFadeY(ticks: number, timing: FadeTiming): number {
  return ticks <= 0 ? timing.startY : bgFadeY(ticks - 1, timing);
}
