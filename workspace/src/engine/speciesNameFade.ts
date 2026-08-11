// Select_Task_FadeSpeciesName (reference/pokeemerald/src/battle_factory_screen.c:2277-2330):
// the perpetual "breathe" that pulses the rental-pool species name
// (SELECT_WIN_SPECIES, drawn in TEXT_COLOR_RED = palette index 4 of the
// PALNUM_FADE_TEXT bank) toward black and back, forever, whenever cursor
// mode is on screen. State machine (RAM-verified tick-by-tick via
// tools/probe/ram-probe.py against the anchor, struct fields at
// sFactorySelectScreen+0x2A2.."+0x2A9 - see that tool's usage note):
//
//   FADESTATE_RUN (only while `active`): `coeffDelay` increments every tick;
//   when it exceeds 6 it resets to 0 and `coeff` moves by 1 (+1 while
//   `fadeOut`, else -1). BlendPalette(coeff) is (conceptually) called this
//   same tick. `coeff > 5` clears `fadeOut`; `coeff === 0` enters
//   FADESTATE_DELAY (16 ticks, unconditional - does NOT check `active`) and
//   sets `fadeOut` back TRUE.
//
// A subtle, RAM-confirmed consequence of the `coeff === 0` check running
// unconditionally (not just "on a fresh decrement"): coeff STARTS at 0, so
// every RUN tick before `coeffDelay` first overflows past 6 *also* satisfies
// `coeff === 0` and bounces straight back to a 16-tick DELAY - the ramp from
// a fresh activation takes 7 separate (1-tick RUN + 16-tick DELAY) bounces
// before `coeff` ever leaves 0, i.e. 6*(1+16) + 1 = 103 ticks of
// (uninterrupted) active time before the first visible step - this is
// exactly ROADMAP.md's empirically-observed "~104 cumulative cursor-mode
// ticks" idle-stable budget. The same bounce recurs every time the
// down-ramp returns to coeff 0, not just on first activation.
//
// Render lag: like this codebase's other GBA-hardware-queued writes (see
// paletteFade.ts's module doc, ISSUES.md #5's WIN0V mechanism record),
// BlendPalette's write to gPlttBufferFaded only reaches the framebuffer one
// VBlank later - RAM-confirmed pixel-for-pixel (dense probe: RAM `coeff`
// steps 0->1 at tick T, the rendered species-name color only changes at
// tick T+1). `renderCoeff` below carries the previous tick's `coeff` for
// exactly this reason.
//
// Activation/deactivation call sites (RAM-grepped, battle_factory_screen.c):
// `active` goes FALSE the instant a popup opens (STATE_CHOOSE_MONS_HANDLE_INPUT's
// A-press, :1689) and TRUE again once cursor mode resumes - popup B-close
// (:1636), RENT/DESELECT's own "continue choosing" return (:1611, but NOT
// the 3rd/confirming pick - that path skips straight to the YES/NO task
// without touching `active`), OTHERS (:1636's shared path), and a decline
// (:1556 A-on-NO, :1567 B-anywhere). `coeffDelay`/`coeff`/`fadeOut`/the
// FADESTATE_DELAY countdown are never reset by any of these - only
// FADESTATE_INIT (screen creation, once ever) resets them, so a popup
// detour just pauses (RUN's body no-ops while inactive; DELAY's own
// countdown keeps running regardless) rather than restarting the breathe.
import { blendComponentToBlack } from "./paletteFade.ts";

export type SpeciesFadeTaskState = "run" | "delay";

export interface SpeciesNameFadeState {
  active: boolean;
  tState: SpeciesFadeTaskState;
  coeffDelay: number;
  coeff: number;
  fadeOut: boolean;
  delay: number;
  /** BlendPalette's last-applied coeff, held one tick behind `coeff` for rendering - see module doc's render-lag note. */
  renderCoeff: number;
}

/**
 * Anchor state (RAM-probed at the canonical draft-screen snapshot, tick 0):
 * cursor mode has already been active for a while by the time the anchor is
 * captured - `coeffDelay`/`coeff` sit at 0 (mid quiet-bounce), `delay` at 15
 * (one tick from a DELAY-phase rollover). Forward-simulating from exactly
 * this seed reproduces every RAM-sampled tick through the first real
 * coeff-1 step (tick 104) and beyond, and the corresponding rendered pixel
 * (blend of TEXT_COLOR_RED, coeff 5 -> RGB 173,0,0) exactly matches the
 * oracle sample that opened ISSUES #11.
 */
export const ANCHOR_SPECIES_NAME_FADE_STATE: SpeciesNameFadeState = {
  active: true,
  tState: "delay",
  coeffDelay: 0,
  coeff: 0,
  fadeOut: true,
  delay: 15,
  renderCoeff: 0,
};

/** Select_Task_FadeSpeciesName's FADESTATE_RUN/FADESTATE_DELAY, one tick - see module doc. */
export function advanceSpeciesNameFade(state: SpeciesNameFadeState): SpeciesNameFadeState {
  const renderCoeff = state.coeff;

  if (state.tState === "delay") {
    if (state.delay > 14) {
      return { ...state, delay: 0, tState: "run", renderCoeff };
    }
    return { ...state, delay: state.delay + 1, renderCoeff };
  }

  // FADESTATE_RUN: no-ops entirely while inactive (frozen, not reset).
  if (!state.active) return { ...state, renderCoeff };

  let coeffDelay = state.coeffDelay + 1;
  let coeff = state.coeff;
  let fadeOut = state.fadeOut;
  if (coeffDelay > 6) {
    coeffDelay = 0;
    coeff = fadeOut ? coeff + 1 : coeff - 1;
  }

  let tState: SpeciesFadeTaskState = "run";
  let delay = state.delay;
  if (coeff > 5) {
    fadeOut = false;
  } else if (coeff === 0) {
    tState = "delay";
    fadeOut = true;
    delay = 0;
  }

  return { ...state, coeffDelay, coeff, fadeOut, tState, delay, renderCoeff };
}

export function activateSpeciesNameFade(state: SpeciesNameFadeState): SpeciesNameFadeState {
  return state.active ? state : { ...state, active: true };
}

export function deactivateSpeciesNameFade(state: SpeciesNameFadeState): SpeciesNameFadeState {
  return state.active ? { ...state, active: false } : state;
}

/** text.pal's unfaded TEXT_COLOR_RED (species name fg): (255,0,0). */
const SPECIES_RED: readonly [number, number, number] = [255, 0, 0];

/**
 * util.c:264 BlendPalette, target color RGB_BLACK, applied per-channel to
 * an 8-bit-expanded component - reuses paletteFade.ts's already oracle-
 * verified `blendComponentToBlack` (identical formula; that module's `y`
 * argument is just this module's `coeff`, BlendPalette doesn't care that
 * fadeSpeciesNameCoeff's own state machine only ever drives it 0-6 instead
 * of the screen-fade's 0-16). Oracle-pinned sample: coeff 5 -> (173,0,0).
 */
export function speciesNameColor(renderCoeff: number): { r: number; g: number; b: number } {
  const [r, g, b] = SPECIES_RED;
  return {
    r: blendComponentToBlack(r, renderCoeff),
    g: blendComponentToBlack(g, renderCoeff),
    b: blendComponentToBlack(b, renderCoeff),
  };
}
