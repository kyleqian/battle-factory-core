// The pre-battle room after the swap screen (rsw1). The swap screen's fade to black ends in CB2_ReturnToFieldContinueScript
// (overworld.c:1677): the map reloads under black, FieldCB_ContinueScript -> FadeInFromBlack lights the room (field_screen_effect.c:95-99,
// 150-155) with no message box, then the script goes on (BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:43-52, 148-158):
//   swapped:      factory_setswapped; msgbox YourSwapIsComplete (MSGBOX_DEFAULT: waits for A/B); msgbox RightThisWay
//   kept party:   msgbox RightThisWay
// The black hold, fade and room hold are the draft's own return to the room (prebattleRoom.ts), measured on the ROM from the swap-exit
// tick: black 14 frames (the last one peeks at the fade's first step), 15 fade frames, 8 settled frames, then the box.

import { EXIT_TO_ROOM_BLACK_HOLD_TICKS, ROOM_HOLD_TICKS } from "./prebattleRoom.ts";
import { FADE_IN_TICKS } from "./paletteFade.ts";

export type SwapReturnKind = "swapped" | "kept";

export interface SwapReturnState {
  readonly kind: SwapReturnKind;
  /** Frames since the swap screen's hand-off to the field (0 on the hand-off frame). */
  readonly elapsed: number;
  /** The postwin clock value that "Right this way" is measured from once the room's own message sequence is over. */
  readonly guideElapsed: number | null;
}

export const SWAP_RETURN_FADE_FIRST_TICK = EXIT_TO_ROOM_BLACK_HOLD_TICKS - 1;
export const SWAP_RETURN_BOX_TICK =
  EXIT_TO_ROOM_BLACK_HOLD_TICKS + FADE_IN_TICKS + ROOM_HOLD_TICKS;

export const SWAP_COMPLETE_LINES = ["Thank you!", "Your POKéMON swap is complete."] as const;
export const SWAP_COMPLETE_CHARS = SWAP_COMPLETE_LINES[0].length + SWAP_COMPLETE_LINES[1].length;

/** `Random()` draws beyond the per-frame VBlank one: the map reload's, ROM-measured at hand-off + 2 / + 3 (1 and 2 extra steps). */
export function swapReturnExtraRngSteps(elapsed: number): number {
  return elapsed === 2 ? 1 : elapsed === 3 ? 2 : 0;
}

export function createSwapReturn(kind: SwapReturnKind): SwapReturnState {
  return { kind, elapsed: 0, guideElapsed: null };
}

/** Characters of "Thank you! / Your POKéMON swap is complete." showing on frame `elapsed` (one per frame after the box appears). */
export function swapReturnThanksVisibleChars(elapsed: number): number {
  return Math.max(0, Math.min(SWAP_COMPLETE_CHARS, elapsed - SWAP_RETURN_BOX_TICK));
}

/** The waitbuttonpress takes A / B two frames after the last glyph shows (ROM-measured, rsw2; the "Right this way" box's gap, postwin.ts). */
export function swapReturnThanksInputReady(elapsed: number): boolean {
  return elapsed >= SWAP_RETURN_BOX_TICK + SWAP_COMPLETE_CHARS + 2;
}
