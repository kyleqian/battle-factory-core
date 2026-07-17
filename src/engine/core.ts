// Pure engine core: no DOM, no timers, no Math.random. tick() advances game
// state by exactly one frame given the held buttons; render() draws the
// current state into a 240x160 RGBA buffer. The browser shell (src/main.ts)
// and tools/compare/appTrace.ts both drive this same core.

import type { GbaButton } from "../input.ts";
import {
  ANCHOR_DRAFT_SCREEN_STATE,
  MENU_OPTION_OTHERS,
  MENU_OPTION_SUMMARY,
  advanceCursorRedraw,
  advanceMenuHighlightRedraw,
  moveCursor,
  moveMenuCursor,
  renderFactoryDraftScreen,
  renderFactoryDraftScreenFaded,
  type DraftScreenState,
} from "./factoryDraftScreen.ts";
import { INITIAL_KEY_REPEAT_STATE, readKeys, type KeyRepeatState } from "./keyRepeat.ts";
import { advanceMonPic, closeMonPic, isMonPicInputReady, openMonPic } from "./monPic.ts";
import { createFramebuffer, fillFramebuffer } from "./framebuffer.ts";
import {
  bgFadeY,
  ENTRY_BLACK_HOLD_TICKS,
  ENTRY_FADE_OUT,
  EXIT_BLACK_HOLD_TICKS,
  EXIT_FADE_OUT,
  FADE_IN,
  objFadeY,
} from "./paletteFade.ts";
import {
  CLOSED_SUMMARY_SCREEN_STATE,
  advanceSummaryScreen,
  openSummaryScreen,
  requestSummaryScreenExit,
  type SummaryScreenState,
} from "./summaryScreen.ts";
import { renderSummaryInfoPage, renderSummaryInfoPageFaded } from "./summaryInfoPage.ts";

export { SCREEN_WIDTH, SCREEN_HEIGHT } from "./framebuffer.ts";

export interface EngineState {
  frame: number;
  draftScreen: DraftScreenState;
  keyRepeat: KeyRepeatState;
  summaryScreen: SummaryScreenState;
}

export function createInitialState(): EngineState {
  return {
    frame: 0,
    draftScreen: ANCHOR_DRAFT_SCREEN_STATE,
    keyRepeat: INITIAL_KEY_REPEAT_STATE,
    summaryScreen: CLOSED_SUMMARY_SCREEN_STATE,
  };
}

/**
 * Advance the engine by one frame, reproducing battle_factory_screen.c's
 * Select_Task_HandleChooseMons (cursor mode) / Select_Task_HandleMenu (menu
 * mode) input handling: JOY_REPEAT(LEFT/RIGHT) moves the slot cursor (with
 * wrap), JOY_NEW(A) opens the SUMMARY/RENT/OTHERS menu, JOY_REPEAT(UP/DOWN)
 * moves the menu cursor (with wrap), JOY_NEW(B) closes it back to cursor
 * mode. Ball-open animation timing and SUMMARY/RENT selection are out of
 * scope for this stage (S4/S5).
 */
export function tick(state: EngineState, buttons: ReadonlySet<GbaButton>): EngineState {
  const { newKeys, newAndRepeatedKeys, next: keyRepeat } = readKeys(buttons, state.keyRepeat);
  let draftScreen = state.draftScreen;
  let summaryScreen = advanceSummaryScreen(state.summaryScreen);

  if (summaryScreen.transition) {
    // Select_Task_OpenSummaryScreen's STATE_SUMMARY_FADE/CLEAN/SHOW (and the
    // symmetric close path) own the screen exclusively while a fade is in
    // flight - the draft screen's own tasks are torn down/frozen, so no
    // input is processed and none of its per-tick redraw state advances.
  } else if (summaryScreen.onInfoPage) {
    // pokemon_summary_screen.c's Task_HandleInput on the (lockMovesFlag-gated
    // reachable-but-inert) Info page: only B (Cancel) is wired this slice -
    // mon-switching/page-change/move-select are out of scope (see module doc).
    if (newKeys.has("B")) summaryScreen = requestSummaryScreenExit(summaryScreen);
  } else {
    let monPic = advanceMonPic(draftScreen.monPic);
    let cursorRedraw = advanceCursorRedraw(draftScreen.cursorRedraw);
    let menuHighlightRedraw = advanceMenuHighlightRedraw(draftScreen.menuHighlightRedraw);

    if (draftScreen.mode === "cursor") {
      if (newAndRepeatedKeys.has("RIGHT")) {
        cursorRedraw = { fromCursorPos: draftScreen.cursorPos, elapsed: 0 };
        draftScreen = { ...draftScreen, cursorPos: moveCursor(draftScreen.cursorPos, 1), hasActed: true };
      } else if (newAndRepeatedKeys.has("LEFT")) {
        cursorRedraw = { fromCursorPos: draftScreen.cursorPos, elapsed: 0 };
        draftScreen = { ...draftScreen, cursorPos: moveCursor(draftScreen.cursorPos, -1), hasActed: true };
      } else if (newKeys.has("A")) {
        monPic = openMonPic(draftScreen.hasActed, draftScreen.hasOpenedMonPic);
        draftScreen = { ...draftScreen, mode: "menu", menuCursorPos: 0, hasOpenedMonPic: true };
      }
    } else if (isMonPicInputReady(monPic)) {
      // Select_Task_HandleMenu's STATE_MENU_HANDLE_INPUT: only reachable once
      // the mon pic finishes opening (see monPic.ts).
      if (newAndRepeatedKeys.has("DOWN")) {
        menuHighlightRedraw = { fromMenuCursorPos: draftScreen.menuCursorPos, elapsed: 0 };
        draftScreen = { ...draftScreen, menuCursorPos: moveMenuCursor(draftScreen.menuCursorPos, 1), hasActed: true };
      } else if (newAndRepeatedKeys.has("UP")) {
        menuHighlightRedraw = { fromMenuCursorPos: draftScreen.menuCursorPos, elapsed: 0 };
        draftScreen = { ...draftScreen, menuCursorPos: moveMenuCursor(draftScreen.menuCursorPos, -1), hasActed: true };
      } else if (newKeys.has("B")) {
        draftScreen = { ...draftScreen, mode: "cursor" };
        monPic = closeMonPic(monPic.variant);
      } else if (newKeys.has("A") && draftScreen.menuCursorPos === MENU_OPTION_SUMMARY) {
        summaryScreen = openSummaryScreen(draftScreen.cursorPos);
      } else if (newKeys.has("A") && draftScreen.menuCursorPos === MENU_OPTION_OTHERS) {
        // Select_OptionOthers: closes the popup with no selection change,
        // identical to B (RENT is S5, out of scope here).
        draftScreen = { ...draftScreen, mode: "cursor" };
        monPic = closeMonPic(monPic.variant);
      }
    }

    draftScreen = { ...draftScreen, monPic, cursorRedraw, menuHighlightRedraw };
  }

  return { ...state, frame: state.frame + 1, draftScreen, keyRepeat, summaryScreen };
}

function blackFrame(): Uint8Array {
  const fb = createFramebuffer();
  fillFramebuffer(fb, 0, 0, 0);
  return fb;
}

export function render(state: EngineState): Uint8Array {
  const summary = state.summaryScreen;
  const t = summary.transition;
  if (!t) {
    return summary.onInfoPage ? renderSummaryInfoPage(summary.selectedSlot) : renderFactoryDraftScreen(state.draftScreen);
  }
  if (t.phase === "black") {
    // Same +1 as below: the black hold's own last tick already shows the
    // following fade-in's first step in practice (oracle-verified dense
    // capture - the hold is one tick shorter than ENTRY/EXIT_BLACK_HOLD_TICKS
    // makes it look), not pure black.
    const holdTicks = t.direction === "toSummary" ? ENTRY_BLACK_HOLD_TICKS : EXIT_BLACK_HOLD_TICKS;
    if (t.elapsed + 1 < holdTicks) return blackFrame();
    const bgY = bgFadeY(0, FADE_IN);
    const objY = objFadeY(0, FADE_IN);
    return t.direction === "toSummary"
      ? renderSummaryInfoPageFaded(summary.selectedSlot, bgY, objY)
      : renderFactoryDraftScreenFaded(state.draftScreen, bgY, objY);
  }

  const timing = t.phase === "fadingIn" ? FADE_IN : t.direction === "toSummary" ? ENTRY_FADE_OUT : EXIT_FADE_OUT;
  // +1: BeginNormalPaletteFade's own UpdateNormalPaletteFade call (palette.c)
  // applies its first blend step within the same tick the fade is triggered
  // - `elapsed` (0 = the trigger tick itself) is one tick "behind" the ticks
  // argument these curves expect (0 = one VBlank of fade already applied);
  // oracle-verified empirically (dense capture diverges exactly one tick
  // earlier than `bgFadeY(t.elapsed, timing)` alone predicts - see
  // PROGRESS.md).
  const bgY = bgFadeY(t.elapsed + 1, timing);
  const objY = objFadeY(t.elapsed + 1, timing);
  const showingDraft = (t.direction === "toSummary") === (t.phase === "fadingOut");
  return showingDraft
    ? renderFactoryDraftScreenFaded(state.draftScreen, bgY, objY)
    : renderSummaryInfoPageFaded(summary.selectedSlot, bgY, objY);
}
