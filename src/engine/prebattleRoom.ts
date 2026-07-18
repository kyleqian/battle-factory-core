// S5 final slice: the YES-press accept path, battle_factory_screen.c's
// Select_Task_HandleYesNo (A on YES) -> Select_Task_Exit ->
// CB2_ReturnToFieldContinueScript, landing in
// BattleFrontier_BattleFactoryPreBattleRoom_EventScript_EnterBattleRoom
// (data/maps/.../scripts.inc:43-52): msgbox Text_RightThisWay, MSGBOX_DEFAULT.
//
// A-on-YES (:1547) calls Select_HideChosenMons() - THE SAME function the
// decline path (Select_DeclineChosenMons, :1972) calls - so the confirm
// window's teardown (confirmReveal.ts's "closing" phase, 20 ticks, already
// oracle-pinned for decline) is source-identical for accept: this module
// does not re-model it. The only difference is what happens once
// monPicAnimating clears: decline resumes cursor-mode input; accept's
// Select_Task_Exit (its own `if (monPicAnimating) return;` gate, :1495-1502)
// instead runs `BeginNormalPaletteFade(PALETTES_ALL, 0, 0, 16, RGB_BLACK)`
// the same tick - core.ts wires this module's INITIAL_PREBATTLE_ROOM_STATE
// to start there.
//
// Dense oracle probe this session (tools/compare/traces/accept-prebattle.json's
// button script, docs/rent-flow-notes.md §4: YES press-tick 264), every frame
// 258-371, cross-checked via direct pixel sampling (not just sha-diff, since
// the draft screen's own background animations - ball rock, species-name
// breathe, YES/NO cursor blink - keep changing the framebuffer independent of
// the fade, confirm-flow-notes.md/rent-flow-notes.md's own Risk 1 pattern):
//
// 1. **The fade-out does NOT start at the YES press** - it's gated behind the
//    full 20-tick closing/un-reveal window (confirmReveal.ts UNREVEAL_TOTAL_TICKS),
//    exactly like decline's cursor-input-resume. Once confirmReveal goes null
//    (press+20), the SAME `BeginNormalPaletteFade(PALETTES_ALL,0,0,16,RGB_BLACK)`
//    call site paletteFade.ts already models as EXIT_FADE_OUT (startDelay 3,
//    18 ticks to fully black) reproduces this fade exactly: sampling a static
//    background pixel (2,2) unaffected by any sprite, first dim step lands
//    tick+23 from the YES press = (20 closing ticks) + startDelay 3 - matching
//    EXIT_FADE_OUT's own startDelay exactly once re-based on "ticks since
//    confirmReveal->null" instead of "ticks since press". Full black (both BG
//    and OBJ layers) by tick+38 = 20+18, matching EXIT_FADE_OUT_TICKS.
// 2. **Black hold is 14 ticks** (NOT EXIT_BLACK_HOLD_TICKS's 20, a different
//    constant - this is a field-script-driven hold, `Select_CopyMonsToPlayerParty`
//    + task/sprite/buffer teardown + CB2_ReturnToFieldContinueScript's own
//    resume-script dispatch, not the summary screen's CB2_InitSelectScreen
//    LoadGraphics cost) - pixel-verified via the same static-pixel sample,
//    solid (0,0,0) from the fade's own settle tick through 14 ticks later.
// 3. **The room fade-in reuses FADE_IN exactly** (startDelay 0, 15 ticks) -
//    first visible (non-black) pixel lands the very first tick of this phase
//    (no dead frames), matching FADE_IN's own "first step already visible at
//    tick 0" shape pixel-for-pixel (sampled (2,2) again: 24,24,0 at the first
//    fadingIn tick, i.e. already partially lit, not pure black).
// 4. **Settled room, no message box, holds exactly 9 ticks** (ROOM_HOLD_TICKS)
//    before the message box appears - matches rent-flow-notes.md §4's
//    "9-frame hold" shape (this session's own absolute frame numbers differ
//    slightly from that scout trace's, since this is a fresh trace built
//    from the same button script, not the same emulator run - only the
//    *relative* tick counts are load-bearing).
// 5. **The message box (frame art + white interior) appears fully formed in
//    ONE tick** (no grow/slide-in animation) - sha-diffing the box's rect
//    (y112-159, x0-239 - NOT y96-159/full-64px as
//    docs/prebattle-room-notes.md §3 guessed from an un-cross-referenced
//    pixel scan; this session's own column scan at x=120/x=1 found the real
//    box is 48px tall, y112-159, still screen-bottom-anchored - see
//    prebattleRoomRender.ts's module doc for the corrected geometry) against
//    the prior settled-room tick shows the whole box changing in one frame,
//    zero characters printed yet.
// 6. **Text prints exactly 1 character/tick, linearly, no pauses** - pixel-
//    column-scanned (not sha-diffed, which falsely suggested periodic
//    "pause" frames at every 5th tick until cross-checked: those ticks land
//    exactly on the string's 3 space characters, which are real printer
//    advances that simply produce zero new ink pixels, not a timing stall).
//    24 total characters advance over 24 ticks (elapsed 0..23), matching
//    "Right this way, please!".length === 23 printable glyphs plus the
//    initial empty-box tick.
//
// Risk / not verified this session: the exact A-press-to-closemessage
// behavior past full-printed idle is S6 scope (out of bounds here); this
// module's "idle" phase never advances past the fully-printed hold, matching
// the oracle's own confirmed non-auto-advancing MSGBOX_DEFAULT (rent-flow-
// notes.md §4: byte-identical 361-963 on the original scout trace).

import { EXIT_FADE_OUT, EXIT_FADE_OUT_TICKS, FADE_IN, FADE_IN_TICKS } from "./paletteFade.ts";

export type PrebattleRoomPhase = "fadingOut" | "black" | "fadingIn" | "roomHold" | "printing" | "idle";

export interface PrebattleRoomState {
  phase: PrebattleRoomPhase;
  /** Ticks since this phase started (0 = the tick the phase became active). */
  elapsed: number;
}

/** Oracle-pinned (see module doc point 2) - distinct from paletteFade.ts's EXIT_BLACK_HOLD_TICKS (20, a different call site/screen). */
export const EXIT_TO_ROOM_BLACK_HOLD_TICKS = 14;
/** Oracle-pinned (see module doc point 4): settled room, no message box. */
export const ROOM_HOLD_TICKS = 8;

/** BattleFrontier_BattleFactoryPreBattleRoom_Text_RightThisWay (scripts.inc:612-613). */
export const MESSAGE_TEXT = "Right this way, please!";
/** Oracle-pinned (see module doc point 6): one tick per printable character. */
export const MESSAGE_PRINT_TICKS = MESSAGE_TEXT.length;

/** battle_factory_screen.c:1547/1495-1502 - core.ts triggers this the same tick confirmReveal's "closing" phase (accepting variant) reaches null. */
export const INITIAL_PREBATTLE_ROOM_STATE: PrebattleRoomState = { phase: "fadingOut", elapsed: 0 };

export function advancePrebattleRoom(state: PrebattleRoomState | null): PrebattleRoomState | null {
  if (!state) return null;
  const elapsed = state.elapsed + 1;
  switch (state.phase) {
    case "fadingOut":
      if (elapsed >= EXIT_FADE_OUT_TICKS) return { phase: "black", elapsed: 0 };
      return { phase: "fadingOut", elapsed };
    case "black":
      if (elapsed >= EXIT_TO_ROOM_BLACK_HOLD_TICKS) return { phase: "fadingIn", elapsed: 0 };
      return { phase: "black", elapsed };
    case "fadingIn":
      if (elapsed >= FADE_IN_TICKS) return { phase: "roomHold", elapsed: 0 };
      return { phase: "fadingIn", elapsed };
    case "roomHold":
      if (elapsed >= ROOM_HOLD_TICKS) return { phase: "printing", elapsed: 0 };
      return { phase: "roomHold", elapsed };
    case "printing":
      if (elapsed >= MESSAGE_PRINT_TICKS) return { phase: "idle", elapsed: 0 };
      return { phase: "printing", elapsed };
    case "idle":
      // MSGBOX_DEFAULT blocks on player A (S6 scope) - holds byte-identical.
      return state;
  }
}

/** Number of MESSAGE_TEXT characters to render this tick; 0 before the box appears, full length once settled/idle. */
export function visiblePrintedChars(state: PrebattleRoomState): number {
  if (state.phase === "printing") return Math.min(state.elapsed, MESSAGE_PRINT_TICKS);
  if (state.phase === "idle") return MESSAGE_PRINT_TICKS;
  return 0;
}

export function messageBoxVisible(state: PrebattleRoomState): boolean {
  return state.phase === "printing" || state.phase === "idle";
}

export { EXIT_FADE_OUT, FADE_IN };
