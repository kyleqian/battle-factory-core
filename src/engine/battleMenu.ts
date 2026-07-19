// S6 send-out slice 1: the "Go! ONIX!" message-box clear + print + settled
// static hold (docs/battle-menu-notes.md §1-§2, trace ticks 1563-1594 of
// tools/compare/traces-groundtruth/battle1-menu-dense.json, same 40-segment
// button script as battle1-intro/sendout.json). Picks up the instant the
// opponent's already-settled "sent out GROVYLE!" hold (battleScene.ts's
// `drawSendOutHandoff`, held indefinitely through trace tick 1562) breaks.
//
// Source: BattleIntroPrintPlayerSendsOut (src/battle_main.c) ->
// PrepareStringBattle(STRINGID_INTROSENDOUT, ...) -> sText_GoPkmn = "Go!
// {B_PLAYER_MON1_NAME}!" (battle_message.c:396) -> "Go! ONIX!" (9 printable
// chars). Same window/font/cadence mechanism as battle-scene-notes.md
// §3.1-3.2 and battleScene.ts's own `textVisibleChars`/`sendOutTextVisibleChars`
// (B_WIN_MSG, FONT_NORMAL, GetPlayerTextSpeedDelay() = 1 tick/char at this
// save's optionsTextSpeed=FAST): pure functions of the absolute trace tick,
// reused by battleScene.ts's existing `drawMessageTextLines` draw helper -
// this module owns only the string + cadence, not the drawing.
//
// Pixel-verified this session (docs/battle-menu-notes.md §1/§2, re-confirmed
// directly against the oracle via tools/compare/traces/menu-text.json): tick
// 1563 clears the box AND draws the first glyph "G" in the same tick (no
// blank-box frame), 1564-1571 print the remaining 8 characters 1/tick
// including a pixel-silent-but-charged space at 1566, 1572+ holds static.

/** `sText_GoPkmn` resolved for this save's rental pool (single line, fits `B_WIN_MSG`'s line 1 - never wraps to line 2). */
export const GO_TEXT = "Go! ONIX!";

/** Total printable characters (docs/battle-menu-notes.md §2 - arithmetic-exact, 9 ticks for 9 chars including the silent space). */
export const GO_TEXT_TOTAL_CHARS = GO_TEXT.length;

/** Trace tick the message box clears and the first glyph ("G") draws, in the same tick (docs/battle-menu-notes.md §1, tick 1563). */
export const GO_TEXT_START_TICK = 1563;

/** First trace tick with no new character left to print (1572) - static from here on (docs/battle-menu-notes.md §1/§2). */
export const GO_TEXT_STATIC_FROM_TICK = GO_TEXT_START_TICK + GO_TEXT_TOTAL_CHARS;

/** Visible character count (0..GO_TEXT_TOTAL_CHARS) of "Go! ONIX!" at absolute trace tick `t`. Same 1-tick/char mechanism as `battleScene.ts`'s `textVisibleChars`/`sendOutTextVisibleChars` - spaces are pixel-silent but still charged a tick. */
export function goTextVisibleChars(t: number): number {
  if (t < GO_TEXT_START_TICK) return 0;
  return Math.min(GO_TEXT_TOTAL_CHARS, t - GO_TEXT_START_TICK + 1);
}
