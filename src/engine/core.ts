// Pure engine core: no DOM, no timers, no Math.random. tick() advances game
// state by exactly one frame given the held buttons; render() draws the
// current state into a 240x160 RGBA buffer. The browser shell (src/main.ts)
// and tools/compare/appTrace.ts both drive this same core.

import type { GbaButton } from "../input.ts";
import { ANCHOR_DRAFT_SCREEN_STATE, MENU_OPTION_OTHERS, moveCursor, moveMenuCursor, renderFactoryDraftScreen, type DraftScreenState } from "./factoryDraftScreen.ts";
import { INITIAL_KEY_REPEAT_STATE, readKeys, type KeyRepeatState } from "./keyRepeat.ts";
import { advanceMonPic, closeMonPic, isMonPicInputReady, openMonPic } from "./monPic.ts";

export { SCREEN_WIDTH, SCREEN_HEIGHT } from "./framebuffer.ts";

export interface EngineState {
  frame: number;
  draftScreen: DraftScreenState;
  keyRepeat: KeyRepeatState;
}

export function createInitialState(): EngineState {
  return {
    frame: 0,
    draftScreen: ANCHOR_DRAFT_SCREEN_STATE,
    keyRepeat: INITIAL_KEY_REPEAT_STATE,
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
  let monPic = advanceMonPic(draftScreen.monPic);

  if (draftScreen.mode === "cursor") {
    if (newAndRepeatedKeys.has("RIGHT")) {
      draftScreen = { ...draftScreen, cursorPos: moveCursor(draftScreen.cursorPos, 1), hasActed: true };
    } else if (newAndRepeatedKeys.has("LEFT")) {
      draftScreen = { ...draftScreen, cursorPos: moveCursor(draftScreen.cursorPos, -1), hasActed: true };
    } else if (newKeys.has("A")) {
      draftScreen = { ...draftScreen, mode: "menu", menuCursorPos: 0 };
      monPic = openMonPic(draftScreen.hasActed);
    }
  } else if (isMonPicInputReady(monPic)) {
    // Select_Task_HandleMenu's STATE_MENU_HANDLE_INPUT: only reachable once
    // the mon pic finishes opening (see monPic.ts).
    if (newAndRepeatedKeys.has("DOWN")) {
      draftScreen = { ...draftScreen, menuCursorPos: moveMenuCursor(draftScreen.menuCursorPos, 1), hasActed: true };
    } else if (newAndRepeatedKeys.has("UP")) {
      draftScreen = { ...draftScreen, menuCursorPos: moveMenuCursor(draftScreen.menuCursorPos, -1), hasActed: true };
    } else if (newKeys.has("B")) {
      draftScreen = { ...draftScreen, mode: "cursor" };
      monPic = closeMonPic(draftScreen.hasActed);
    } else if (newKeys.has("A") && draftScreen.menuCursorPos === MENU_OPTION_OTHERS) {
      // Select_OptionOthers: closes the popup with no selection change,
      // identical to B (SUMMARY/RENT are S4/S5, out of scope here).
      draftScreen = { ...draftScreen, mode: "cursor" };
      monPic = closeMonPic(draftScreen.hasActed);
    }
  }

  draftScreen = { ...draftScreen, monPic };
  return { ...state, frame: state.frame + 1, draftScreen, keyRepeat };
}

export function render(state: EngineState): Uint8Array {
  return renderFactoryDraftScreen(state.draftScreen);
}
