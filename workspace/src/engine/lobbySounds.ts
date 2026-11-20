// snd1: the sounds of the Lobby singles-attendant conversation (factoryLobbyAttendant.ts) and the pre-battle room briefing (prebattleEntry.ts),
// both silent before. Write-only presentation (src/audio/soundEvents.ts): reads the before / after states and the tick's input, changes nothing.
// ROM rules and windows: docs/snd1-playtest-sounds.md (soundEventProbe over the lbrb-* lab traces, Battle Scene OFF; the Lobby has no scene).
import {
  ATTENDANT_MENU_ITEMS,
  ATTENDANT_SCREENS,
  ATTENDANT_TIMING,
  attendantAcceptsInput,
  type AttendantInput,
  type FactoryLobbyAttendantState,
} from "./factoryLobbyAttendant.ts";
import { briefingAcceptsInput, type PrebattleEntryState } from "./prebattleEntry.ts";
import { SE_EXIT } from "./battleEndSounds.ts";
import { playScriptSe, playSelectSe, SE_SAVE } from "./screenSounds.ts";

/** A at the attendant opens its script: field_control_avatar.c TryStartInteractionScript plays SE_SELECT for every interaction script. */
export function emitLobbyAttendantOpenSound(): void {
  playSelectSe();
}

/** Called once per collected tick with the conversation before and after `advanceFactoryLobbyAttendant` and that tick's input. */
export function emitLobbyAttendantSounds(before: FactoryLobbyAttendantState, after: FactoryLobbyAttendantState, input: AttendantInput): void {
  // The walk ends in `warp` (BattleFrontier_BattleFactoryLobby scripts.inc): DoWarp's PlaySE(SE_EXIT) (field_screen_effect.c:490) on the
  // warp fade's second frame, as in the pre-battle room (core.ts).
  if (after.phase === "fade" && after.phaseTick === 1) playScriptSe(SE_EXIT);
  if (after.phase === "talk" && after.screen === "saved" && after.lead === null && after.age === ATTENDANT_TIMING.saveSeAge) playScriptSe(SE_SAVE);
  // "<player> saved the game.": SaveSuccesTimer (start_menu.c:947-953) plays SE_SELECT when a held A ends the message (not when the timer does).
  if (before.screen === "saved" && after.screen === "step" && (input.aHeld ?? input.a)) playSelectSe();
  if (!attendantAcceptsInput(before)) return;
  const def = ATTENDANT_SCREENS[before.screen];
  if (def.menu !== null && before.page === def.pages.length - 1) {
    const cursor = before.pendingCursor ?? before.cursor;
    if (input.a) {
      if (before.screen === "level" && cursor === 1) return; // Open Level: A is a no-op here (deliberate divergence), so nothing plays
      playSelectSe(); // the menu's own A (APressMuted FALSE)
      // MSGBOX_YESNO's Task_HandleYesNoInput (script_menu.c) plays one more on NO; the save dialog's own YES/NO (start_menu.c) does not.
      if (before.screen === "saveQuestion" && cursor === 1) playSelectSe();
      return;
    }
    if (input.b) {
      // script_menu.c: B on a multichoice that does not ignore B, or on MSGBOX_YESNO, plays SE_SELECT. The save dialog's YES/NO
      // (start_menu.c SaveConfirmInputCallback / SaveOverwriteInputCallback) takes MENU_B_PRESSED silently (menu.c plays nothing for B).
      if (before.screen === "saveInfo" || before.screen === "overwrite") return;
      playSelectSe();
      return;
    }
    if (input.up || input.down) {
      // Menu_ProcessInputNoWrap / ...ClearOnChoose (menu.c): SE_SELECT only when the cursor moves, and the menu takes A, B, UP, DOWN in that
      // order. No Lobby menu wraps (script_menu.c:143-146 InitMultichoiceCheckWrap wraps only above three entries), so a press at an end is silent.
      const next = cursor + (input.up ? -1 : 1);
      if (next >= 0 && next < ATTENDANT_MENU_ITEMS[def.menu].length) playSelectSe();
      return;
    }
    return;
  }
  if (!input.a && !input.b) return;
  const end = def.pages[before.page]!.end;
  // text.c TextPrinterWaitWithDownArrow: A or B on a `\p` / `\l` page wait plays SE_SELECT. A message's last page ends in
  // waitbuttonpress (MSGBOX_DEFAULT), which is silent.
  if (end === "p" || end === "l") playSelectSe();
}

/** The pre-battle room briefing: an accepted A on a `\p` page plays SE_SELECT (text.c); the message ends (waitbuttonpress) are silent. */
export function emitPrebattleEntrySounds(before: PrebattleEntryState, a: boolean): void {
  if (!a || !briefingAcceptsInput(before)) return;
  const page = before.messages![before.message]![before.page]!;
  if (page.end === "p") playSelectSe();
}
