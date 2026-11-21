// lbb1 (docs/lbb1-lobby-b-press.md): menus of three entries or fewer do not wrap on the ROM. InitMultichoiceCheckWrap sets tDoWrap only
// above three entries (script_menu.c:143-146), so CHALLENGE / INFO / EXIT, the level choice and GO ON / REST / RETIRE run
// Menu_ProcessInputNoWrap; MSGBOX_YESNO and the save dialog's YES/NO run Menu_ProcessInputNoWrapClearOnChoose. A press at an end leaves the
// cursor where it is (and plays nothing). GO ON / RECORD / REST / RETIRE (four entries) wraps.
import { describe, expect, it } from "vitest";
import {
  advanceFactoryLobbyAttendant,
  attendantAcceptsInput,
  createFactoryLobbyAttendantState,
  type AttendantInput,
  type AttendantScreenId,
  type FactoryLobbyAttendantState,
} from "../src/engine/factoryLobbyAttendant.ts";
import { INITIAL_POSTWIN_STATE, movePostwinContinuationCursor, postwinContinuationInputReadyDelay } from "../src/engine/postwin.ts";

const NONE: AttendantInput = { a: false, b: false, up: false, down: false };
const A: AttendantInput = { ...NONE, a: true };
const UP: AttendantInput = { ...NONE, up: true };
const DOWN: AttendantInput = { ...NONE, down: true };

/** A through the conversation (cursor on the first entry, as the ROM's) until `screen`'s menu takes input. */
function toMenu(screen: AttendantScreenId): FactoryLobbyAttendantState {
  let s = createFactoryLobbyAttendantState(0);
  for (let i = 0; i < 4000; i += 1) {
    if (s.screen === screen && attendantAcceptsInput(s)) return s;
    s = advanceFactoryLobbyAttendant(s, attendantAcceptsInput(s) && i % 2 === 0 ? A : NONE);
  }
  throw new Error(`menu ${screen} not reached`);
}

/** One press, then a tick with none (the level and YES/NO cursors show one frame later: pendingCursor). */
function move(s: FactoryLobbyAttendantState, input: AttendantInput): FactoryLobbyAttendantState {
  return advanceFactoryLobbyAttendant(advanceFactoryLobbyAttendant(s, input), NONE);
}

describe("lbb1: the Lobby attendant's menus do not wrap", () => {
  for (const [screen, entries] of [["ask", 3], ["level", 3], ["saveQuestion", 2], ["saveInfo", 2], ["overwrite", 2]] as const) {
    it(`${screen}: UP on the first entry and DOWN on the last leave the cursor`, () => {
      let s = toMenu(screen);
      expect(s.cursor).toBe(0);
      s = move(s, UP);
      expect(s.cursor).toBe(0);
      expect(s.pendingCursor).toBeUndefined();
      for (let i = 1; i < entries; i += 1) s = move(s, DOWN);
      expect(s.cursor).toBe(entries - 1);
      s = move(s, DOWN);
      expect(s.cursor).toBe(entries - 1);
      s = move(s, UP);
      expect(s.cursor).toBe(entries - 2);
    });
  }
});

describe("lbb1: the postwin's GO ON menu wraps with four entries, not with three", () => {
  const menu = (disableRecordBattle: boolean, cursor: 0 | 1 | 2 | 3) => ({
    ...INITIAL_POSTWIN_STATE,
    elapsed: 2_000 + postwinContinuationInputReadyDelay(INITIAL_POSTWIN_STATE),
    healDismissElapsed: 2_000,
    continuationCursorPos: cursor,
    continuationCursorDisplayPos: cursor,
    disableRecordBattle,
  });

  it("GO ON / RECORD / REST / RETIRE: UP on GO ON goes to RETIRE, DOWN on RETIRE to GO ON (Menu_ProcessInput)", () => {
    expect(movePostwinContinuationCursor(menu(false, 0), -1).continuationCursorPos).toBe(3);
    expect(movePostwinContinuationCursor(menu(false, 3), 1).continuationCursorPos).toBe(0);
  });

  it("GO ON / REST / RETIRE (after a recorded battle): the ends hold (Menu_ProcessInputNoWrap)", () => {
    const top = menu(true, 0);
    expect(movePostwinContinuationCursor(top, -1)).toBe(top);
    const bottom = menu(true, 2);
    expect(movePostwinContinuationCursor(bottom, 1)).toBe(bottom);
    expect(movePostwinContinuationCursor(top, 1).continuationCursorPos).toBe(1);
    expect(movePostwinContinuationCursor(bottom, -1).continuationCursorPos).toBe(1);
  });
});
