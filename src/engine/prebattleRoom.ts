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

import { EXIT_FADE_OUT, EXIT_FADE_OUT_TICKS, FADE_IN, FADE_IN_TICKS, WARP_FADE_OUT } from "./paletteFade.ts";

export type PrebattleRoomPhase =
  | "fadingOut"
  | "black"
  | "fadingIn"
  | "roomHold"
  | "printing"
  | "idle"
  | "messageClosing"
  | "walking"
  | "warpFade";

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

// --- S6 slice 1a: A-press -> closemessage -> guided walk -> warp fade -------
// data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:43-52/378-
// 381 (docs/battle-bringup-notes.md §1): A on the settled "Right this way,
// please!" -> closemessage -> EventScript_WalkToBattleRoomLv50 (applymovement
// attendant + player, issued before one shared waitmovement 0 - they walk
// simultaneously, attendant finishing 1 tile early then set_invisible) ->
// warp (fade to black). Pinned against
// tools/compare/traces-groundtruth/battle1-intro.json (dense per-frame
// captures + tools/probe/ram-probe.py's gObjectEvents/gSprites/
// gSpriteCoordOffsetX/Y watch, docs/battle-bringup-notes.md "Slice-0 ground
// truth"), not sampled/estimated - every entry below is a direct RAM/pixel
// readout, not a nominal 16-frames-per-tile assumption (the brief's own
// warning: this codebase's timing is NOT always the naive value).
//
// Registration lag (module doc precedent, e.g. confirmReveal's own closing-
// tick lag): the A-press's 2-frame pulse (trace ticks 400-401) leaves the
// settled message on screen byte-identical through tick 402 - first visible
// change is tick 403. Modeled as a 2-tick "messageClosing" phase (elapsed
// 0-1, created directly at the press tick so it already covers ticks 401-
// 402) before "walking" begins at elapsed 0 = trace tick 403.
export const MESSAGE_CLOSING_TICKS = 2;

/**
 * Per-tick walk table, RAM-probed (gObjectEvents[0/1] = player/attendant,
 * gSprites[0/1].x/y, gSpriteCoordOffsetX/Y, gSprites[1]'s invisible flag -
 * see module doc), one row per elapsed tick 0..79 (trace ticks 403-482,
 * ground-truth's own continuous-per-frame-change window's first 80 ticks -
 * the remaining 403-500 window is this same frozen final row, folded into
 * "warpFade"'s own hold instead of duplicated here).
 *
 * Columns: [originX, originY, attendantScreenX, attendantScreenY,
 * attendantInvisible(0/1), playerFrame, attendantFrame]. `origin` is the
 * room-tile camera origin (same convention as RoomLayout.cameraOriginPx,
 * prebattleRoomRender.ts) - the PLAYER's own screen position is NOT in this
 * table because it's invariant: RAM-confirmed the field camera exactly
 * cancels the player's own movement (gSprites[0].x + gSpriteCoordOffsetX -
 * 8 stays 112, .y + gSpriteCoordOffsetY - 16 stays 56, every single tick of
 * the walk) - prebattleRoomRender.ts's existing PLAYER_POS constant already
 * *is* that fixed position, reused unchanged. `attendantScreenX/Y` are the
 * already-composed screen pixels (same formula). Frame indices are
 * picture-table poses (object_event_anims.h sAnimTable_Standard, decoded
 * from gSprites[].animNum/animCmdIdx via sAnim_GoNorth/West/South's own
 * ANIMCMD tables - see extract-prebattle-room.ts's doc): 1 face-north, 2
 * face-west, 5/6 north-walk cycle, 7/8 west-walk cycle. Net displacement
 * (originX 16->-16, originY 55->8) matches the script's own 2-tiles-left +
 * 3-tiles-up choreography (docs/battle-bringup-notes.md §1).
 */
const WALK_STEPS: readonly (readonly [number, number, number, number, number, number, number])[] = [
  [16, 55, 111, 41, 0, 5, 7],
  [16, 54, 110, 42, 0, 5, 7],
  [16, 53, 109, 43, 0, 5, 7],
  [16, 52, 108, 44, 0, 5, 7],
  [16, 51, 107, 45, 0, 5, 7],
  [16, 50, 106, 46, 0, 5, 7],
  [16, 49, 105, 47, 0, 5, 7],
  [16, 48, 104, 48, 0, 5, 7],
  [16, 47, 103, 49, 0, 1, 2],
  [16, 46, 102, 50, 0, 1, 2],
  [16, 45, 101, 51, 0, 1, 2],
  [16, 44, 100, 52, 0, 1, 2],
  [16, 43, 99, 53, 0, 1, 2],
  [16, 42, 98, 54, 0, 1, 2],
  [16, 41, 97, 55, 0, 1, 2],
  [16, 40, 96, 56, 0, 1, 2],
  [15, 40, 96, 56, 0, 8, 8],
  [14, 40, 96, 56, 0, 8, 8],
  [13, 40, 96, 56, 0, 8, 8],
  [12, 40, 96, 56, 0, 8, 8],
  [11, 40, 96, 56, 0, 8, 8],
  [10, 40, 96, 56, 0, 8, 8],
  [9, 40, 96, 56, 0, 8, 8],
  [8, 40, 96, 56, 0, 8, 8],
  [7, 40, 96, 56, 0, 2, 2],
  [6, 40, 96, 56, 0, 2, 2],
  [5, 40, 96, 56, 0, 2, 2],
  [4, 40, 96, 56, 0, 2, 2],
  [3, 40, 96, 56, 0, 2, 2],
  [2, 40, 96, 56, 0, 2, 2],
  [1, 40, 96, 56, 0, 2, 2],
  [0, 40, 96, 56, 0, 2, 2],
  [-1, 40, 97, 55, 0, 7, 5],
  [-2, 40, 98, 54, 0, 7, 5],
  [-3, 40, 99, 53, 0, 7, 5],
  [-4, 40, 100, 52, 0, 7, 5],
  [-5, 40, 101, 51, 0, 7, 5],
  [-6, 40, 102, 50, 0, 7, 5],
  [-7, 40, 103, 49, 0, 7, 5],
  [-8, 40, 104, 48, 0, 7, 5],
  [-9, 40, 105, 47, 0, 2, 1],
  [-10, 40, 106, 46, 0, 2, 1],
  [-11, 40, 107, 45, 0, 2, 1],
  [-12, 40, 108, 44, 0, 2, 1],
  [-13, 40, 109, 43, 0, 2, 1],
  [-14, 40, 110, 42, 0, 2, 1],
  [-15, 40, 111, 41, 0, 2, 1],
  [-16, 40, 112, 40, 0, 2, 1],
  [-16, 39, 112, 40, 0, 6, 6],
  [-16, 38, 112, 40, 0, 6, 6],
  [-16, 37, 112, 40, 0, 6, 6],
  [-16, 36, 112, 40, 0, 6, 6],
  [-16, 35, 112, 40, 0, 6, 6],
  [-16, 34, 112, 40, 0, 6, 6],
  [-16, 33, 112, 40, 0, 6, 6],
  [-16, 32, 112, 40, 0, 6, 6],
  [-16, 31, 112, 40, 0, 1, 1],
  [-16, 30, 112, 40, 0, 1, 1],
  [-16, 29, 112, 40, 0, 1, 1],
  [-16, 28, 112, 40, 0, 1, 1],
  [-16, 27, 112, 40, 0, 1, 1],
  [-16, 26, 112, 40, 0, 1, 1],
  [-16, 25, 112, 40, 0, 1, 1],
  [-16, 24, 112, 40, 0, 1, 1],
  [-16, 23, 112, 41, 1, 5, 1],
  [-16, 22, 112, 42, 1, 5, 1],
  [-16, 21, 112, 43, 1, 5, 1],
  [-16, 20, 112, 44, 1, 5, 1],
  [-16, 19, 112, 45, 1, 5, 1],
  [-16, 18, 112, 46, 1, 5, 1],
  [-16, 17, 112, 47, 1, 5, 1],
  [-16, 16, 112, 48, 1, 5, 1],
  [-16, 15, 112, 49, 1, 1, 1],
  [-16, 14, 112, 50, 1, 1, 1],
  [-16, 13, 112, 51, 1, 1, 1],
  [-16, 12, 112, 52, 1, 1, 1],
  [-16, 11, 112, 53, 1, 1, 1],
  [-16, 10, 112, 54, 1, 1, 1],
  [-16, 9, 112, 55, 1, 1, 1],
  [-16, 8, 112, 56, 1, 1, 1],
];

export const WALK_TICKS = WALK_STEPS.length;

export interface WalkVisual {
  originX: number;
  originY: number;
  attendantX: number;
  attendantY: number;
  attendantVisible: boolean;
  playerFrame: number;
  attendantFrame: number;
}

function stepToVisual(row: readonly [number, number, number, number, number, number, number]): WalkVisual {
  const [originX, originY, attendantX, attendantY, attendantInvisible, playerFrame, attendantFrame] = row;
  return { originX, originY, attendantX, attendantY, attendantVisible: attendantInvisible === 0, playerFrame, attendantFrame };
}

/** WALK_STEPS[elapsed], clamped to the last (frozen) row - "warpFade" reads the same clamp implicitly via WALK_TICKS-1. */
export function walkVisual(elapsed: number): WalkVisual {
  return stepToVisual(WALK_STEPS[Math.min(elapsed, WALK_STEPS.length - 1)]!);
}

/** The walk's frozen final position (data/maps/.../scripts.inc:50's shared `waitmovement 0` settling) - "warpFade" renders this unchanged under the fade. */
export const WARP_FADE_FROZEN_VISUAL: WalkVisual = stepToVisual(WALK_STEPS[WALK_STEPS.length - 1]!);

export { WARP_FADE_OUT };

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
      // MSGBOX_DEFAULT blocks on player A - core.ts detects the press and
      // starts "messageClosing" directly (see that phase's doc); this case
      // only covers ticks with no press yet, holding byte-identical.
      return state;
    case "messageClosing":
      if (elapsed >= MESSAGE_CLOSING_TICKS) return { phase: "walking", elapsed: 0 };
      return { phase: "messageClosing", elapsed };
    case "walking":
      if (elapsed >= WALK_TICKS) return { phase: "warpFade", elapsed: 0 };
      return { phase: "walking", elapsed };
    case "warpFade":
      // The warp fade settles fully black (WARP_FADE_OUT) and then holds -
      // out of this slice's scope is whatever the destination room shows
      // once the game itself finishes warping (docs/battle-bringup-notes.md
      // "Slice-0 ground truth" §2: frame 520+); this phase just keeps
      // rendering solid black indefinitely past that point, matching the
      // step brief's own allowance.
      return { phase: "warpFade", elapsed };
  }
}

/** Number of MESSAGE_TEXT characters to render this tick; 0 before the box appears, full length once settled/idle/closing. */
export function visiblePrintedChars(state: PrebattleRoomState): number {
  if (state.phase === "printing") return Math.min(state.elapsed, MESSAGE_PRINT_TICKS);
  if (state.phase === "idle" || state.phase === "messageClosing") return MESSAGE_PRINT_TICKS;
  return 0;
}

export function messageBoxVisible(state: PrebattleRoomState): boolean {
  return state.phase === "printing" || state.phase === "idle" || state.phase === "messageClosing";
}

export { EXIT_FADE_OUT, FADE_IN };
