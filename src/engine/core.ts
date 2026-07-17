// Pure engine core: no DOM, no timers, no Math.random. tick() advances game
// state by exactly one frame given the held buttons; render() draws the
// current state into a 240x160 RGBA buffer. The browser shell (src/main.ts)
// and tools/compare/appTrace.ts both drive this same core.

import type { GbaButton } from "../input.ts";
import { ANCHOR_DRAFT_SCREEN_STATE, renderFactoryDraftScreen, type DraftScreenState } from "./factoryDraftScreen.ts";

export { SCREEN_WIDTH, SCREEN_HEIGHT } from "./framebuffer.ts";

export interface EngineState {
  frame: number;
  draftScreen: DraftScreenState;
}

export function createInitialState(): EngineState {
  return {
    frame: 0,
    draftScreen: ANCHOR_DRAFT_SCREEN_STATE,
  };
}

/**
 * Advance the engine by one frame. Stage S1 renders only the static anchor
 * frame - cursor movement, menus, and everything else interactive is S2+.
 */
export function tick(state: EngineState, _buttons: ReadonlySet<GbaButton>): EngineState {
  return { ...state, frame: state.frame + 1 };
}

export function render(state: EngineState): Uint8Array {
  return renderFactoryDraftScreen(state.draftScreen);
}
