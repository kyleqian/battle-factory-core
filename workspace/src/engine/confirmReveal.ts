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
// flash phase's first visible pixel lands 2 ticks later (OAM-creation lag,
// same pattern as every other sprite-visibility split in this screen -
// ISSUES #10, this session: oracle-pixel-verified as 2 ticks, not 1), the
// wide window holds its degenerate (64,65) state for 1 tick (ISSUES #10
// dropped the previously-modeled 2nd hold once the flash table's own missing
// hidden tick is accounted for - net duration unchanged) before growing over
// 8 more ticks to (32,96), holds 2 more ticks, then the 3 mon pics + YES/NO
// box appear together.

import type { BallAnimState } from "./ballAnim.ts";

export type ConfirmRevealPhase = "flash" | "window" | "shown" | "closing";

export interface ConfirmRevealState {
  phase: ConfirmRevealPhase;
  /** Ticks since this phase started; -1 and 0 during the 2-tick OAM-creation lag before the flash's first pixel is visible (ISSUES #10 - see FLASH_WIDTHS' own doc). */
  elapsed: number;
  /**
   * "closing" only: the 3 chosen species, snapshotted at decline time - the
   * 3rd pick's `selectedIds` entry is already cleared same-tick as decline
   * (RAM-verified, docs/confirm-flow-notes.md §3), but the mon pics
   * themselves stay visually up through elapsed 0-2 (see UNREVEAL doc) -
   * `chosenMonSpecies` can't be re-derived from live state during that hold
   * since the 3rd slot no longer resolves to a pick rank.
   */
  decliningSpecies?: readonly string[];
  /**
   * "closing" only: the declined slot's own `BallAnimState`, snapshotted the
   * tick before decline (ISSUES #12 - the same window-blend the 6-ball grid
   * shows through the reveal window keeps rendering this ball as still-
   * selected, frozen on its last live animation frame, through elapsed 0-2 -
   * oracle-pixel-verified exact match via `blend8` against `pokeball.
   * selectedPalette` for all 3 hold ticks, switching to the live (gray,
   * `ballAnims[slot] === null`) rendering only at elapsed 3 - same hold
   * window as `decliningSpecies` above, just for the background ball layer
   * instead of the front-sprite mon pic).
   */
  decliningBallAnim?: BallAnimState | null;
  /**
   * "closing" only: true when this teardown was triggered by A-on-YES
   * (battle_factory_screen.c:1547, Select_HideChosenMons() called directly
   * from Select_Task_HandleYesNo) rather than decline
   * (Select_DeclineChosenMons, which also calls Select_HideChosenMons() -
   * the SAME 20-tick teardown either way, docs/rent-flow-notes.md §2). core.ts
   * reads this once the phase reaches null to decide whether to resume
   * cursor-mode input (decline) or start the exit fade into the pre-battle
   * room (accept, see prebattleRoom.ts).
   */
  accepting?: boolean;
  /**
   * "closing" only, accept path: every active ball's `BallAnimState` as of
   * the tick closing started (before that tick's own advance) - ISSUES #14.
   * `Select_Task_CloseChosenMonPics`'s own per-frame creation cost (already
   * known to permanently stall every active ball's internal `cmdIndex`
   * starting the NEXT tick, core.ts's `ballAnimStall = activeSlotsBeforeAction`
   * at `wasClosingAtZero`) ALSO delays that first tick's own render by one
   * tick - same family as `isRevealStallActive`'s reveal-open case, but here
   * the very next tick freezes via `ballAnimStall` before a live re-read
   * could self-correct, so a display-only lag (this file's usual fix for
   * this family) would leave the wrong tile frozen for the stall's whole
   * duration instead of correcting for one tick. Used only to override the
   * window's background ball-grid layer's rendering for elapsed 1 (oracle-
   * pixel-verified via `accept-prebattle.json` frame 262: the one ball whose
   * internal `cmdIndex` happened to cross a tile boundary that exact tick
   * showed a 36px diff, gone once the window reads this frozen snapshot
   * instead of the already-advanced live state for that one render).
   */
  preCloseBallAnims?: readonly (BallAnimState | null)[];
}

/**
 * sAffineAnim_Select_MonPicBg_Opening, same table monPic.ts's flash entries
 * already pin (1/1/4/4/8/8/16/16/32/32/64/64) - indexed by `elapsed - 1`, not
 * `elapsed` (ISSUES #10, RAM/oracle-verified this session via direct pixel
 * sampling of `confirm-flow`'s bar1/bar3 flash centers - x44/x196, both
 * uncontaminated by any other on-screen element unlike the shared x120
 * position bar2 sits at): the OAM-creation lag documented on
 * `ConfirmRevealState.elapsed` is 2 ticks, not 1 - `elapsed 0` is ALSO
 * hidden, matching `monPic.ts`'s own OPEN_TABLE_* shape (3 HIDDEN entries
 * before its first `flash(1)`, idx0-2, vs this table's previously-assumed 1).
 * Confirmed via `bin/oracle run` + direct RGB sampling at (x, y=64) for
 * x=44/196 across confirm-flow's exact button script: width stays 0 through
 * the tick this engine previously rendered as `FLASH_WIDTHS[0]` (width 1),
 * and the true 1/1/4/4/8/8/16/16/32/32/64/64 sequence lands one tick later,
 * unchanged in every other respect (values, doubling cadence, final-64 hold
 * length all pixel-confirmed exact). See WINDOW_STEPS' own doc for how the
 * matching 1-tick compensation (removing its now-redundant 2nd degenerate
 * hold) keeps the total confirm-to-"shown" duration unchanged, so
 * ISSUES #9's already-RAM-verified ball-anim/stall timing is undisturbed.
 */
const FLASH_WIDTHS = [1, 1, 4, 4, 8, 8, 16, 16, 32, 32, 64, 64];

/**
 * Select_Task_OpenChosenMonPics: case0 sets the degenerate (64,65) window +
 * DISPCNT_WIN0_ON (1 tick), THEN case2's -4/+4-per-tick growth (8 ticks) to
 * (32,96), holding there 2 more ticks (idx8/idx9/idx10 below) while
 * Select_CreateChosenMonsSprites's own sprite-creation lag catches up.
 *
 * ISSUES #10 (this session, RAM/oracle-verified via `bin/oracle run` + direct
 * RGB sampling of confirm-flow's exact button script): case1's own
 * ShowBg(3)/BLDCNT-setup tick - previously modeled as a SECOND (64,65)
 * degenerate hold, idx1 below - does not produce a second visually-distinct
 * held frame once FLASH_WIDTHS' own missing hidden tick (see that table's
 * doc) is accounted for: sampling BG3's wash color at (x=120, y=56..75)
 * frame-by-frame shows the window growing to (60,69) exactly 1 tick after
 * its first degenerate frame, not 2 - so this table drops the old idx1
 * duplicate (11 entries now, down from 12). This is the exact 1-tick
 * compensation FLASH_WIDTHS' own new hidden tick needs: net zero change to
 * the total confirm-to-"shown" duration, so every already-RAM-verified
 * absolute tick downstream (ISSUES #9's ball-anim/stall timing, the
 * mons+YES/NO appearance tick) stays exactly where it was. The hold-before-
 * mons-appear length (2, not 1 - now idx8/idx9/idx10) is unchanged,
 * independently oracle-pixel-verified (ISSUES #8 gap 2): dense captures show
 * the fully-grown (32,96) window rendered unchanged for 3 consecutive frames
 * before the 3 mon pics + YES/NO box appear on the 4th - a plain RAM read of
 * gSprites[] had suggested the 3 chosen-mon sprites are created 1-2 ticks
 * apart (slot0 before slots1/2), but the ACTUAL RENDERED PIXELS show all 3
 * appearing together on one frame - the RAM-level creation-order stagger is
 * fully absorbed by the BuildOamBuffer-before-RunTasks lag (same family as
 * OPEN_TABLE_B's own creation lag, monPic.ts) and never reaches the screen as
 * a visible per-slot stagger, so `monsAndYesNoVisible` staying a single flag
 * (not 3 per-slot flags) is correct as modeled.
 */
const WINDOW_STEPS: { top: number; bottom: number }[] = [
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

/**
 * Select_DeclineChosenMons/Select_HideChosenMons (docs/confirm-flow-notes.md §3,
 * dense oracle-diff this slice - `tools/compare/traces/confirm-decline.json`):
 * B-anywhere-in-YES/NO or A-on-NO both run this exact 20-tick un-reveal (RAM-
 * verified total, monPicAnimating flips 0->1 on the decline press tick and back
 * 1->0 twenty ticks later), source-identical either way (:1551-1570) - core.ts
 * models both as the same transition. Shape, oracle-pinned tick by tick:
 *  - elapsed 0: still renders the settled "shown" visual unchanged (2-tick
 *    render lag before ANY visible effect - same family as this screen's other
 *    same-tick-state/lagged-render splits, e.g. RentConfirmRedrawState).
 *  - elapsed 1 (ISSUES #12 root cause #2a, oracle-pixel-verified via dense
 *    per-tick capture + region diff of `confirm-decline.json` frames 253-256,
 *    WIN_OPTIONS glyph clusters x183-199/y116-124+y132-140): the YES/NO
 *    TEXT is already gone - `FillWindowPixelBuffer`+`CopyWindowToVram`'s
 *    erase reaches the screen one tick earlier than the cursor-highlight
 *    sprite's own `invisible` flag does (a real split between the two sub-
 *    effects of `Select_ErasePopupMenu`, not a single instant toggle) - but
 *    the highlight itself, the wide window, and the 3 mon pics are all still
 *    fully shown.
 *  - elapsed 2: the info text has reverted to "Select the third POKéMON."
 *    (Select_PrintSelectMonString, immediate per source) and the wide window
 *    takes its first shrink step, but the cursor-highlight sprite is
 *    STILL visible here too (ISSUES #12 root cause #2b, same evidence as
 *    2a: oracle's highlight-red pixels, e.g. (220,143)/(190,129), persist
 *    through this tick) - one tick later than the old model's cutoff - and
 *    the 3 mon pics + wide window are still fully shown (Select_HideChosenMons
 *    hasn't reached its own close task yet).
 *  - elapsed 3: the cursor-highlight sprite is finally gone too (matching
 *    `gSprites[menuCursorSpriteId].invisible`'s own 1-tick-later OAM lag
 *    behind the window-buffer erase, same "sprite trails the window by one
 *    tick" family as this screen's other OAM/BG splits, e.g. ISSUES #10).
 *  - elapsed 3-9 (7 ticks): the wide window shrinks - UNREVEAL_WINDOW_STEPS
 *    below (top/bottom only, oracle-verified NOT a clean mirror of WINDOW_STEPS
 *    read backwards: the growth table's first shrink step is skipped/collapsed
 *    into elapsed2's still-open hold, landing directly on the 2nd growth step's
 *    value - same "duplicate hold/skip" shape this screen's other window tables
 *    already show, e.g. monPic.ts's OPEN_TABLE_A/C). The 3 mon pics are gone
 *    (Select_HideChosenMons destroys them before this task starts) - the plain
 *    6-ball grid + cursor arrow show through the shrinking window.
 *  - elapsed 10: window fully collapsed AND invisible for exactly 1 tick
 *    (matching monPic.ts CLOSE_TABLE_B's own idx9 HIDDEN tick between its
 *    window and flash portions - same border-sprite-teardown gap).
 *  - elapsed 11-19 (9 ticks): the 3 border-deco sprites' own
 *    sAffineAnim_Select_MonPicBg_Closing zoom-out anim, rendered as flash bars
 *    at the same REVEAL_FLASH_CENTERS as the open direction - UNREVEAL_FLASH_
 *    WIDTHS below, reusing monPic.ts's own CLOSE_TABLE_B flash-shrink sequence
 *    (32,32,16,16,8,8,4,4,1 - the same "SAME closing anim" the brief pointed
 *    at) with its final duplicate hold dropped to fit this budget's 9 slots
 *    (20 total ticks is 2 shorter than CLOSE_TABLE_B's single-popup 20-entry
 *    table despite sharing the same anim, because this table has no separate
 *    OPEN_STEADY baseline entry and one less flash hold - both budgeted into
 *    the extra elapsed0-2 hold/erase ticks above instead).
 */
const UNREVEAL_WINDOW_STEPS: { top: number; bottom: number }[] = [
  { top: 36, bottom: 92 },
  { top: 40, bottom: 88 },
  { top: 44, bottom: 84 },
  { top: 48, bottom: 80 },
  { top: 52, bottom: 76 },
  { top: 56, bottom: 72 },
  { top: 60, bottom: 68 },
  { top: 64, bottom: 65 },
];
const UNREVEAL_FLASH_WIDTHS = [32, 32, 16, 16, 8, 8, 4, 4, 1];
const UNREVEAL_TOTAL_TICKS = 20;

export const WIDE_WINDOW_LEFT = 16;
export const WIDE_WINDOW_RIGHT = 224;
/** Select_ShowChosenMons/Select_CreateChosenMonsSprites: border-deco centers 44/120/196, front-sprite centers 48/120/192 (corner i*72+16,32 + half-size 32,32). */
export const REVEAL_FLASH_CENTERS = [44, 120, 196] as const;
export const REVEAL_MON_CENTERS_X = [48, 120, 192] as const;
export const REVEAL_MON_CENTER_Y = 64;

/** Select_ShowChosenMons: the reveal starts the instant monPic.ts's close phase reaches "closed" (see core.ts) - 2 ticks of nothing-new-yet (OAM creation lag, ISSUES #10) before the flash's first pixel. */
export const INITIAL_CONFIRM_REVEAL_STATE: ConfirmRevealState = { phase: "flash", elapsed: -1 };

export function advanceConfirmReveal(state: ConfirmRevealState | null): ConfirmRevealState | null {
  if (!state) return null;
  if (state.phase === "shown") {
    // elapsed 0->1 gates cursorVisible (see getConfirmRevealVisual); steady past that.
    return state.elapsed >= 1 ? state : { phase: "shown", elapsed: state.elapsed + 1 };
  }
  const elapsed = state.elapsed + 1;
  if (state.phase === "flash") {
    // +1 vs FLASH_WIDTHS.length: elapsed 0 is a 2nd hidden tick (ISSUES #10), so the
    // table (indexed elapsed-1, see getConfirmRevealVisual) needs elapsed up to its length.
    if (elapsed >= FLASH_WIDTHS.length + 1) return { phase: "window", elapsed: 0 };
    return { phase: "flash", elapsed };
  }
  if (state.phase === "window") {
    if (elapsed >= WINDOW_STEPS.length) return { phase: "shown", elapsed: 0 };
    return { phase: "window", elapsed };
  }
  // "closing": UNREVEAL_TOTAL_TICKS ticks total (RAM-verified, docs/confirm-flow-notes.md
  // §3); once elapsed reaches that, the un-reveal is done and confirmReveal itself goes
  // away (null) - core.ts's normal cursor-mode input resumes the very same tick.
  if (elapsed >= UNREVEAL_TOTAL_TICKS) return null;
  return {
    phase: "closing",
    elapsed,
    decliningSpecies: state.decliningSpecies,
    decliningBallAnim: state.decliningBallAnim,
    accepting: state.accepting,
    preCloseBallAnims: state.preCloseBallAnims,
  };
}

export interface ConfirmRevealVisual {
  /** Border-deco flash bar widths at REVEAL_FLASH_CENTERS (parallel array); null outside a flash sub-phase. */
  flashWidths: readonly number[] | null;
  /** Wide WIN0 window (WIDE_WINDOW_LEFT/RIGHT x this range), bottom exclusive; null when not shown. */
  window: { top: number; bottom: number } | null;
  /** The 3 real mon-pic sprites (Select_CreateChosenMonsSprites/Select_HideChosenMons). */
  monsVisible: boolean;
  /** Non-null only during "closing"'s early hold (see ConfirmRevealState.decliningSpecies doc) - overrides chosenMonSpecies(state) for that window since live selectedIds no longer resolves the 3rd pick. */
  monsSpeciesOverride: readonly string[] | null;
  /** Non-null only during the same "closing" hold as `monsSpeciesOverride` (see ConfirmRevealState.decliningBallAnim doc) - overrides the declined slot's ball rendering in the window's background ball-grid layer, which otherwise reads the live (already-deselected) state. */
  decliningBallAnim: BallAnimState | null;
  /** Non-null only on "closing"'s accept-path elapsed 1 (see ConfirmRevealState.preCloseBallAnims doc) - overrides EVERY active slot's ball rendering in the window's background ball-grid layer with their pre-closing snapshot, for that one tick only. */
  ballAnimOverride: readonly (BallAnimState | null)[] | null;
  /** The YES/NO text itself (Select_ShowYesNoOptions/Select_ErasePopupMenu) - erased immediately on decline, 2 ticks before monsVisible follows (see UNREVEAL doc). */
  yesNoVisible: boolean;
  /** The YES/NO cursor highlight bar (OAM), oracle-measured 1 tick behind yesNoVisible on the way in - same window-copy-vs-OAM lag as every other popup in this screen. */
  cursorVisible: boolean;
}

const HIDDEN_REVEAL: ConfirmRevealVisual = {
  flashWidths: null,
  window: null,
  monsVisible: false,
  monsSpeciesOverride: null,
  decliningBallAnim: null,
  ballAnimOverride: null,
  yesNoVisible: false,
  cursorVisible: false,
};

/**
 * Pure tick->shape lookup for the "closing" un-reveal's window/flash portion
 * (UNREVEAL_WINDOW_STEPS then UNREVEAL_FLASH_WIDTHS, see their own docs) -
 * factored out so both decline (real elapsed) and accept (elapsed shifted
 * one tick early, see getConfirmRevealVisual's ISSUES #14 note) read the
 * SAME table via the same tick->shape mapping.
 */
function closingWindowStep(tick: number): { window: { top: number; bottom: number } | null; flashWidths: readonly number[] | null } {
  if (tick < 2) return { window: { top: 32, bottom: 96 }, flashWidths: null };
  const windowIdx = tick - 2;
  if (windowIdx < UNREVEAL_WINDOW_STEPS.length) return { window: UNREVEAL_WINDOW_STEPS[windowIdx]!, flashWidths: null };
  const flashIdx = windowIdx - UNREVEAL_WINDOW_STEPS.length - 1;
  if (flashIdx < 0 || flashIdx >= UNREVEAL_FLASH_WIDTHS.length) return { window: null, flashWidths: null };
  const w = UNREVEAL_FLASH_WIDTHS[flashIdx]!;
  return { window: null, flashWidths: [w, w, w] };
}

export function getConfirmRevealVisual(state: ConfirmRevealState | null): ConfirmRevealVisual {
  if (!state) return HIDDEN_REVEAL;
  if (state.phase === "flash") {
    // elapsed -1 (OAM creation) and 0 (ISSUES #10's 2nd hidden tick) are both hidden.
    if (state.elapsed < 1) return HIDDEN_REVEAL;
    const w = FLASH_WIDTHS[state.elapsed - 1] ?? FLASH_WIDTHS[FLASH_WIDTHS.length - 1]!;
    return { ...HIDDEN_REVEAL, flashWidths: [w, w, w] };
  }
  if (state.phase === "window") {
    const step = WINDOW_STEPS[state.elapsed] ?? WINDOW_STEPS[WINDOW_STEPS.length - 1]!;
    return { ...HIDDEN_REVEAL, window: step };
  }
  if (state.phase === "shown") {
    return { ...HIDDEN_REVEAL, window: { top: 32, bottom: 96 }, monsVisible: true, yesNoVisible: true, cursorVisible: state.elapsed >= 1 };
  }
  // "closing" (the un-reveal, see UNREVEAL_WINDOW_STEPS/UNREVEAL_FLASH_WIDTHS doc).
  const decliningSpecies = state.decliningSpecies ?? null;
  const decliningBallAnim = state.decliningBallAnim ?? null;
  // battle_factory_screen.c:1544-1550 vs :1556-1557: A-on-YES calls
  // Select_HideChosenMons() directly and NEVER calls
  // Select_ErasePopupMenu(SELECT_WIN_YES_NO) (that call is decline-only,
  // source-confirmed - accept has no equivalent anywhere in
  // Select_Task_HandleYesNo/Select_Task_Exit). So unlike decline, the YES/NO
  // box + cursor highlight are NOT erased mid-closing for accept - they stay
  // fully drawn for the entire 20-tick closing window and only disappear
  // once the whole-screen exit fade (prebattleRoom.ts's "fadingOut") covers
  // them, same as everything else on screen. Oracle-confirmed this session
  // (accept-prebattle.json dense probe): the YES/NO text and highlight are
  // still visible well past decline's elapsed-1/elapsed-3 erase points.
  const accepting = state.accepting === true;
  // ISSUES #14 (RAM/pixel-verified this session, accept-prebattle.json dense
  // per-tick diff cross-referenced against a scratch engine replay): the
  // window-shrink/flash-shrink TABLE ITSELF (UNREVEAL_WINDOW_STEPS then
  // UNREVEAL_FLASH_WIDTHS) also lands one tick earlier on accept than on
  // decline - the exact same "decline's extra same-tick work delays the
  // render by a tick" mechanism as `monsVisible` above (ISSUES #9/#13
  // family), just not previously applied to this table. Confirmed by
  // reproducing every one of the residual's diff-pixel counts exactly: e.g.
  // frame 273's 48px = (UNREVEAL_FLASH_WIDTHS[1]-UNREVEAL_FLASH_WIDTHS[2])*3
  // flash centers = (32-16)*3, frame 275's 24px = (16-8)*3, 277's 12px =
  // (8-4)*3, 279's 9px = (4-1)*3 - a clean one-tick-ahead table read, not
  // hardware jitter. The clamp at the table's last tick (19, not 20) matches
  // decline's own tail behavior: decline's final flash tick (elapsed 19,
  // width 1) is immediately followed by the closingFlashResidual's own
  // width-1 draw (core.ts, ISSUES #13) once confirmReveal goes null - i.e.
  // decline already HOLDS its last table value for 2 real ticks at the tail,
  // so accept's shifted read lands on that same held value rather than
  // running off the end of the table.
  const windowTick = accepting ? Math.min(state.elapsed + 1, UNREVEAL_TOTAL_TICKS - 1) : state.elapsed;
  const { window, flashWidths } = closingWindowStep(windowTick);
  return {
    ...HIDDEN_REVEAL,
    window,
    flashWidths,
    // elapsed 0: fully unchanged "shown" visual. elapsed 1: the YES/NO TEXT
    // is already erased (ISSUES #12 root cause #2a) while the window, the 3
    // mon pics, and the cursor highlight all stay open. elapsed 2: the
    // window takes its first shrink step and the mon-select message reverts
    // (immediate, core.ts) - oracle-pixel-verified NOT a duplicate hold of
    // the full-open window like the reveal-in direction's own ISSUES #10
    // gap, the shrink starts the same tick the text-erase already landed -
    // but the 3 mon pics, the declined slot's frozen ball snapshot, AND the
    // cursor highlight (ISSUES #12 root cause #2b) all still hold through
    // this tick too: the highlight sprite trails the window-text erase by a
    // full tick, only gone starting elapsed 3.
    // Accept-only (oracle-pixel-verified this session, accept-prebattle.json):
    // the 3 mon pics disappear a full tick earlier than decline's own elapsed-3
    // cutoff - decline's extra same-tick work (Select_HandleMonSelectionChange
    // + Select_PrintSelectMonString, both absent from the accept branch)
    // delays when FreeAndDestroyMonPicSprite's effect reaches that frame's
    // render, same family as ISSUES #9/#13's "extra per-frame work costs a
    // tick" pattern - accept has none of that extra work, so its mon pics
    // vanish on schedule instead of one tick late.
    monsVisible: state.elapsed <= 2 && (accepting ? state.elapsed <= 1 : true),
    monsSpeciesOverride: state.elapsed <= 2 ? decliningSpecies : null,
    decliningBallAnim: state.elapsed <= 2 ? decliningBallAnim : null,
    // ISSUES #14: only accept's own elapsed 1 render needs the pre-closing
    // ball snapshot (see ConfirmRevealState.preCloseBallAnims doc) - by
    // elapsed 2 the window reads UNREVEAL_WINDOW_STEPS' own shrink (a
    // different tick entirely) and every ball's live state is correct again.
    ballAnimOverride: accepting && state.elapsed === 1 ? (state.preCloseBallAnims ?? null) : null,
    yesNoVisible: accepting || state.elapsed === 0,
    cursorVisible: accepting || state.elapsed <= 2,
  };
}

/** Select_ShowYesNoOptions: default cursor position is YES (row 0), re-applied every time the popup shows (see core.ts's reveal-start trigger). */
export const INITIAL_YES_NO_CURSOR_POS = 0;

/** Select_UpdateYesNoCursorPosition (:1390-1409): a simple 2-state toggle, not a wrap-around list - UP/DOWN both just flip between the only two positions. */
export function toggleYesNoCursor(pos: number): number {
  return pos === 0 ? 1 : 0;
}

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
