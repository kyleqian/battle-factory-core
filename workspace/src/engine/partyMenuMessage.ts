// Party-menu refusal message printer (party_menu.c DisplayPartyMenuMessage -> PrintMessage, :1706 / :2566).
//
// The text prints one character per frame (GetPlayerTextSpeedDelay() = 1 at this save's FAST text speed); a "\n"
// costs no frame. The strings end in {PAUSE_UNTIL_PRESS}, so the printer only reads A / B (TextPrinterWait,
// text.c:884-899, JOY_NEW) after the last character is out; a press while it is still printing does nothing.
// ROM window (Scene ON, flw252): a 28-character message whose first glyph shows on capture k has its last glyph on
// k + 27; a press whose tick is that capture's tick or later dismisses it, an earlier one is ignored; the window is
// gone 4 captures after the accepting press (Task_PrintAndWaitForText -> Task_ReturnToChooseMonAfterText).

export const PARTY_MESSAGE_CLEAR_LAG_FRAMES = 4;

export interface PartyMessageClock {
  /** Ticks since the message was set (0 on the setting tick); the first glyph draws at 1. */
  readonly messageElapsed: number;
  /** Ticks since the accepting press, or null while the message is still waiting for one. */
  readonly messageDismissElapsed: number | null;
}

export const PARTY_MESSAGE_CLOCK_START: PartyMessageClock = Object.freeze({
  messageElapsed: 0,
  messageDismissElapsed: null,
});

export function partyMessagePrintedChars(message: string): number {
  return message.replaceAll("\n", "").length;
}

export interface PartyMessageStep {
  readonly clock: PartyMessageClock;
  /** True on the tick of the press the printer accepts (play SE_SELECT here). */
  readonly accepted: boolean;
  /** True on the tick the window clears; the caller drops the message. */
  readonly cleared: boolean;
}

export function stepPartyMessage(message: string, clock: PartyMessageClock, pressed: boolean): PartyMessageStep {
  if (clock.messageDismissElapsed !== null) {
    const messageDismissElapsed = clock.messageDismissElapsed + 1;
    return {
      clock: { messageElapsed: clock.messageElapsed + 1, messageDismissElapsed },
      accepted: false,
      cleared: messageDismissElapsed >= PARTY_MESSAGE_CLEAR_LAG_FRAMES,
    };
  }
  const accepted = pressed && clock.messageElapsed >= partyMessagePrintedChars(message);
  return {
    clock: { messageElapsed: clock.messageElapsed + 1, messageDismissElapsed: accepted ? 0 : null },
    accepted,
    cleared: false,
  };
}

/** The two text rows as printed so far, or null before the first glyph. */
export function partyMessageLines(message: string, messageElapsed: number): readonly [string, string] | null {
  if (messageElapsed < 1) return null;
  const [line1 = "", line2 = ""] = message.split("\n");
  const shown = Math.min(messageElapsed, partyMessagePrintedChars(message));
  const first = line1.slice(0, shown);
  return [first, line2.slice(0, Math.max(0, shown - line1.length))];
}
