// The final-confirm reveal, docs/confirm-flow-notes.md: once the 3rd RENT
// confirm's own popup-close finishes (monPic.ts's existing CloseMonPic path -
// nothing new there), Select_Task_HandleYesNo's STATE_YESNO_SHOW_MONS runs
// Select_ShowChosenMons()/Select_Task_OpenChosenMonPics (battle_factory_
// screen.c:2131-2244): three sSpriteTemplate_Select_MonPicBgAnim border
// sprites (x=44/120/196, y=64) all auto-begin the SAME sAffineAnim_Select_
// MonPicBg_Opening affine anim monPic.ts's single-ball flash already models
// (identical GFXTAG_MON_PIC_BG_ANIM sprite template/anim table - see that
// module's OPEN_TABLE_* flash entries), simultaneously at all 3 positions;
// once all 3 finish (oracle-verified same duration as the single-ball case,
// 12 ticks), the middle sprite's callback spawns Select_Task_
// OpenChosenMonPics, a full-width WIN0 window (x16-224, vs the single popup's
// x88-152) growing top/bottom by 4px/tick from the same degenerate (64,65)
// to (32,96); once open, Select_CreateChosenMonsSprites() creates the 3 real
// front-sprite pics (ordered by selectedId, not slot index) and clears
// monPicAnimating - Select_Task_HandleYesNo's own gate (STATE_YESNO_SHOW_
// OPTIONS) then shows the YES/NO box next tick.
//
// RAM/register-verified (ISSUES #8: direct REG_DISPCNT/REG_WIN0V reads +
// gSprites[] located by known screen position, not struct-offset guessing):
// close settles into the plain grid at confirm-tick+20 (matching monPic.ts's
// existing 20-tick CLOSE_TABLE_B exactly, no new close timing needed), the
// flash phase's first visible pixel lands 1 tick later (OAM-creation lag,
// same pattern as every other sprite-visibility split in this screen), the
// wide window holds its degenerate (64,65) state for 2 ticks (WIN0-on and
// BG3-ShowBg are separate task states/ticks, not simultaneous) before
// growing over 8 more ticks to (32,96), holds 1 more tick, then the 3 mon
// pics + YES/NO box appear together.

export type ConfirmRevealPhase = "flash" | "window" | "shown";

export interface ConfirmRevealState {
  phase: ConfirmRevealPhase;
  /** Ticks since this phase started; -1 during the 1-tick OAM-creation lag before the flash's first pixel is visible. */
  elapsed: number;
}

/** sAffineAnim_Select_MonPicBg_Opening, same table monPic.ts's flash entries already pin (1/1/4/4/8/8/16/16/32/32/64/64). */
const FLASH_WIDTHS = [1, 1, 4, 4, 8, 8, 16, 16, 32, 32, 64, 64];

/**
 * Select_Task_OpenChosenMonPics: case0 sets the degenerate (64,65) window +
 * DISPCNT_WIN0_ON (1 tick), case1 does ShowBg(3)/BLDCNT setup with NO window
 * change (1 tick - RAM/register-verified this slice via direct DISPCNT/WIN0V
 * reads, ISSUES #8: BG3's DISPCNT bit lands one tick after WIN0's own, a
 * separate case/tick from case0, not simultaneous as originally modeled),
 * THEN case2's -4/+4-per-tick growth (8 ticks) to (32,96), holding there 2
 * more ticks (idx9/idx10/idx11 below) while Select_CreateChosenMonsSprites's
 * own sprite-creation lag catches up. The hold length (2, not 1) is
 * oracle-pixel-verified (ISSUES #8 gap 2): dense captures of
 * confirm-flow.json show the fully-grown (32,96) window rendered unchanged
 * for 3 consecutive frames (idx9-11) before the 3 mon pics + YES/NO box
 * appear on the 4th - a plain RAM read of gSprites[] (the probe this
 * boundary's fix originally shipped with) had suggested the 3 chosen-mon
 * sprites are created 1-2 ticks apart (slot0 before slots1/2), but the
 * ACTUAL RENDERED PIXELS (re-verified directly against the oracle's own
 * PNGs, not just RAM) show all 3 appearing together on one frame, one tick
 * later than this table previously modeled - the RAM-level creation-order
 * stagger exists but is fully absorbed by the BuildOamBuffer-before-RunTasks
 * lag (same family as OPEN_TABLE_B's own creation lag, monPic.ts) and never
 * reaches the screen as a visible per-slot stagger, so `monsAndYesNoVisible`
 * staying a single flag (not 3 per-slot flags) is correct as modeled.
 */
const WINDOW_STEPS: { top: number; bottom: number }[] = [
  { top: 64, bottom: 65 },
  { top: 64, bottom: 65 },
  { top: 60, bottom: 69 },
  { top: 56, bottom: 73 },
  { top: 52, bottom: 77 },
  { top: 48, bottom: 81 },
  { top: 44, bottom: 85 },
  { top: 40, bottom: 89 },
  { top: 36, bottom: 93 },
  { top: 32, bottom: 96 },
  { top: 32, bottom: 96 },
  { top: 32, bottom: 96 },
];

export const WIDE_WINDOW_LEFT = 16;
export const WIDE_WINDOW_RIGHT = 224;
/** Select_ShowChosenMons/Select_CreateChosenMonsSprites: border-deco centers 44/120/196, front-sprite centers 48/120/192 (corner i*72+16,32 + half-size 32,32). */
export const REVEAL_FLASH_CENTERS = [44, 120, 196] as const;
export const REVEAL_MON_CENTERS_X = [48, 120, 192] as const;
export const REVEAL_MON_CENTER_Y = 64;

/** Select_ShowChosenMons: the reveal starts the instant monPic.ts's close phase reaches "closed" (see core.ts) - 1 tick of nothing-new-yet (OAM creation lag) before the flash's first pixel. */
export const INITIAL_CONFIRM_REVEAL_STATE: ConfirmRevealState = { phase: "flash", elapsed: -1 };

export function advanceConfirmReveal(state: ConfirmRevealState | null): ConfirmRevealState | null {
  if (!state) return null;
  if (state.phase === "shown") {
    // elapsed 0->1 gates cursorVisible (see getConfirmRevealVisual); steady past that.
    return state.elapsed >= 1 ? state : { phase: "shown", elapsed: state.elapsed + 1 };
  }
  const elapsed = state.elapsed + 1;
  if (state.phase === "flash") {
    if (elapsed >= FLASH_WIDTHS.length) return { phase: "window", elapsed: 0 };
    return { phase: "flash", elapsed };
  }
  if (elapsed >= WINDOW_STEPS.length) return { phase: "shown", elapsed: 0 };
  return { phase: "window", elapsed };
}

export interface ConfirmRevealVisual {
  /** Border-deco flash bar widths at REVEAL_FLASH_CENTERS (parallel array); null outside the flash phase. */
  flashWidths: readonly number[] | null;
  /** Wide WIN0 window (WIDE_WINDOW_LEFT/RIGHT x this range), bottom exclusive; null when not yet open. */
  window: { top: number; bottom: number } | null;
  /** The 3 real mon-pic sprites + YES/NO text (Select_CreateChosenMonsSprites/Select_ShowYesNoOptions - see dossier's "same tick" note). */
  monsAndYesNoVisible: boolean;
  /** The YES/NO cursor highlight bar (OAM), oracle-measured 1 tick behind monsAndYesNoVisible - same window-copy-vs-OAM lag as every other popup in this screen. */
  cursorVisible: boolean;
}

const HIDDEN_REVEAL: ConfirmRevealVisual = { flashWidths: null, window: null, monsAndYesNoVisible: false, cursorVisible: false };

export function getConfirmRevealVisual(state: ConfirmRevealState | null): ConfirmRevealVisual {
  if (!state) return HIDDEN_REVEAL;
  if (state.phase === "flash") {
    if (state.elapsed < 0) return HIDDEN_REVEAL;
    const w = FLASH_WIDTHS[state.elapsed] ?? FLASH_WIDTHS[FLASH_WIDTHS.length - 1]!;
    return { flashWidths: [w, w, w], window: null, monsAndYesNoVisible: false, cursorVisible: false };
  }
  if (state.phase === "window") {
    const step = WINDOW_STEPS[state.elapsed] ?? WINDOW_STEPS[WINDOW_STEPS.length - 1]!;
    return { flashWidths: null, window: step, monsAndYesNoVisible: false, cursorVisible: false };
  }
  return { flashWidths: null, window: { top: 32, bottom: 96 }, monsAndYesNoVisible: true, cursorVisible: state.elapsed >= 1 };
}

/** Select_ShowYesNoOptions: default cursor position is YES (row 0). UP/DOWN toggle + YES/decline presses are out of scope this slice (see docs/confirm-flow-notes.md's decline-path stretch goal). */
export const INITIAL_YES_NO_CURSOR_POS = 0;

/**
 * ISSUES #9 (RAM-probed: all 3 ball slots simultaneously, dense confirm-flow-
 * shaped idle window, cross-correlated tick-by-tick against ballAnim.ts's
 * internal cmdIndex): `Select_CreateChosenMonsSprites()`'s own per-frame cost
 * (creating the 3 real front-sprite mon pics, clearing `monPicAnimating`) - a
 * RunTasks()-side cost, same shape as `Select_PrintMonCategory`/`Select_
 * PrintSelectMonString`'s already-modeled text-print cost (ballAnimMultiBall.
 * test.ts's root cause) - lands 1 tick on every currently-active ball's own
 * `SpriteCB_Pokeball` advance, near the reveal's own window-fully-grown hold
 * (empirically bounded to a 4-tick window around here by this session's probe
 * script; not narrower without a finer-grained trace). Modeled as a
 * DISPLAY-ONLY correction (ballAnim.ts's `displayTile` chain) rather than an
 * actual `ballAnimStall` entry: no ball's own RNG-roll boundary falls in this
 * window for any committed/probed trace, so whether the underlying mechanism
 * also nudges internal roll timing is unobserved and, per this slice's brief,
 * out of scope to guess at - only the visible symptom (ball OBJ pixels) is
 * fixed here, and the RNG-critical `advanceBallAnimCore` stays untouched.
 */
export function isRevealStallActive(state: ConfirmRevealState | null): boolean {
  if (!state) return false;
  if (state.phase === "shown") return true;
  return state.phase === "window" && state.elapsed >= WINDOW_STEPS.length - 3;
}
