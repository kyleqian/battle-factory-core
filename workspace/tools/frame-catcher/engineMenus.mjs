// Frame catcher: which menu of the engine waits for the player (tools/frame-catcher/README.md). The kinds are shared with the
// ROM side (romMenus in romRun.py): a menu is a screen where a press makes a choice, so the ROM is only ever given a press there
// after the engine's matching press. `sig` is the cursor state, used to check that the ROM sits at the same entry.

function summarySig(s) {
  return `${s.page}:${s.selectedSlot ?? "-"}:${s.moveSelect ? s.moveSelect.selectedMoveIndex ?? "m" : "-"}`;
}
function summaryReady(s) {
  return s && s.isOpen && !s.transition && !s.pageTransition && !s.monTransition && !(s.inputLockTicks > 0);
}

// The RECORD / RETIRE question (postwin.ts) is a menu only once its YES/NO box is drawn: the ROM prints the question first
// (`message` + `waitmessage`, then `multichoicedefault ... MULTI_YESNO`, BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:108-115),
// so the ROM's YES/NO opens about 70 frames after the A on RECORD. Counted from the A, the GO ON menu and the question were one
// anchor on the engine side, and the ROM's YES/NO was bound to the next GO ON menu and answered YES (seed 19, Scene OFF, after
// battle 2). engineRun.mjs passes the game's own postwinQuestionWindowVisible; without it (an older build) the question counts from the A.
// The Lobby's "record your last BATTLE FACTORY match?" YES/NO after a round ends, won or lost (BattleFrontier_BattleFactoryLobby/
// scripts.inc:76-85, `multichoicedefault 20, 8, MULTI_YESNO, 1`): a menu from the frame its box is drawn until it is answered. Without it
// the ROM's YES/NO was an unplanned menu and the run stopped there (seed 9, Scene OFF, after battle 7).
let questionWindowVisible = null;
let terminalRecordMenuDrawn = null;
export function setQuestionWindowVisible(fn) { questionWindowVisible = fn; }
export function setTerminalRecordMenuDrawn(fn) { terminalRecordMenuDrawn = fn; }

// lbb1: the game draws the question's YES/NO window and takes its input on one frame (POSTWIN_QUESTION_WINDOW_DELAYS is both), and
// so does the GO ON menu asked again after the question is answered NO or B, or after "battle was recorded" (scripts.inc:111-119,
// 131-135: back to AskReadyForOpponent, which prints "The Nth match is next!" again with `message` + `waitmessage`, then opens the
// `multichoice`; postwin.ts keeps the answered question until that menu takes input). A press on that first frame left no frame on which
// the menu waited, so the plan had no anchor and the ROM's menu was unplanned: fcm1 s89-off-ws stopped there (RECORD -> NO, ours 137,134,
// the ROM's menu 144,776). On the ROM both open when `waitmessage` returns, Task_HandleMultichoiceInput taking input a few frames later
// (sProcessInputDelay, script_menu.c:129). So both are menus from the frame their text is fully printed (the game's own
// postwinQuestionVisibleChars / POSTWIN_QUESTION_TEXT_TOTAL and postwinQuestionReprintSettled, passed by engineRun.mjs); the menu asked
// again opens on GO ON (advancePostwin's re-ask, as the ROM's). Without them (an older build) as before.
let questionTextSettled = null;
let reaskTextSettled = null;
export function setQuestionTextSettled(fn) { questionTextSettled = fn; }
export function setReaskTextSettled(fn) { reaskTextSettled = fn; }

// The Lobby attendant's menus between two rounds (fcr2, factoryLobbyAttendant.ts): "take the challenge?" CHALLENGE / INFO / EXIT and the
// level choice are the ROM's `multichoice` (Task_HandleMultichoiceInput, BattleFrontier_BattleFactoryLobby/scripts.inc:125, 134); "I need
// to save the game. Is that okay?" is MSGBOX_YESNO (Task_HandleYesNoInput, :138); the save dialog's "Would you like to save the game?" and
// "There is already a saved file." YES/NO are start_menu.c's own (SaveConfirmInputCallback / SaveOverwriteInputCallback under
// SaveGameTask). Each is a menu from the frame its box is drawn (`attendantAcceptsInput` on the menu's page) until it is answered.
// engineRun.mjs passes the game's module; without it (an older build) the Lobby has no menus, as before.
let attendantModule = null;
export function setAttendantModule(mod) { attendantModule = mod; }
const ATTENDANT_MENU_KIND = { challenge: "field.multichoice", level: "field.multichoice", yesNo: "field.yesno" };

export function attendantMenuOf(att, mod = attendantModule) {
  if (!att || !mod || att.phase !== "talk") return null;
  const def = mod.ATTENDANT_SCREENS[att.screen];
  if (!def || def.menu === null || att.page !== def.pages.length - 1 || !mod.attendantAcceptsInput(att)) return null;
  return { kind: ATTENDANT_MENU_KIND[def.menu], sig: String(att.cursor) };
}

export function menuOf(st) {
  // first: the Lobby attendant owns the input, while the last round's orchestrator, postwin and terminal states are still kept
  if (st.lobbyAttendant) return attendantMenuOf(st.lobbyAttendant);
  const orch = st.factoryRoundBattleOrchestrator;
  if (orch) {
    const cmd = orch.battleCommandPresentation;
    const res = orch.battleResolutionPresentation;
    const voluntary = cmd && cmd.lifecycle.phase === "party-handoff" ? orch.battlePartySelect : null;
    const forced = res && res.lifecycle.phase === "forced-party-handoff" ? orch.battleForcedPartySelect ?? orch.battlePartySelect : null;
    const ps = voluntary ?? forced;
    const partyOpen = !!ps;
    if (partyOpen) {
      if (ps.summary) return summaryReady(ps.summary) ? { kind: "summary", sig: summarySig(ps.summary) } : null;
      if (ps.outcome) return null;
      if (ps.message) return null;
      if (ps.submenuOpen) return { kind: "battle.partySub", sig: String(ps.actionCursor) };
      return { kind: "battle.party", sig: String(ps.cursor) };
    }
    if (cmd && !res) {
      if (cmd.lifecycle.phase === "action-menu") return { kind: "battle.action", sig: String(cmd.actionCursor) };
      if (cmd.lifecycle.phase === "fight-menu") return { kind: "battle.fight", sig: String(cmd.fightCursor) };
    }
  }
  if (st.factorySwap) {
    const sw = st.factorySwap.controller;
    if (sw.phase === "playerPicker" || sw.phase === "enemyPicker") return { kind: "swap.pick", sig: `${sw.cursor}` };
    if (sw.phase === "playerOptions") return { kind: "swap.menu", sig: `${sw.playerOptionCursor}` };
    if (sw.phase === "acceptPrompt" || sw.phase === "quitPrompt") return { kind: "swap.yesno", sig: `${sw.yesNoCursor}` };
    // the swap screen's SUMMARY (the ROM side sees Task_HandleInput, as for the draft's and the party menu's summaries)
    if (sw.phase === "summaryFade") return summaryReady(st.summaryScreen) ? { kind: "summary", sig: summarySig(st.summaryScreen) } : null;
    return null;
  }
  // before the postwin: the Lobby terminal keeps a postwin state
  const term = st.factoryTerminal;
  if (term && terminalRecordMenuDrawn && !term.recordDisabled && term.recordChoice === null && terminalRecordMenuDrawn(term)) {
    return { kind: "field.multichoice", sig: String(term.recordMenuCursor) };
  }
  const pw = st.postwin;
  if (pw) {
    if (pw.question && pw.questionYesElapsed === null && pw.questionDismissElapsed === null) {
      if (questionTextSettled ? !questionTextSettled(pw) : questionWindowVisible && !questionWindowVisible(pw)) return null;
      return { kind: "field.multichoice", sig: `q${pw.questionCursorPos}` };
    }
    if (pw.question && pw.dialoguePage === 0 && reaskTextSettled && reaskTextSettled(pw)) return { kind: "field.multichoice", sig: "0" };
    if (pw.dialoguePage === 0 && pw.continuationCursorPos !== null && pw.continuationConfirmElapsed === null && !pw.question) {
      return { kind: "field.multichoice", sig: String(pw.continuationCursorPos) };
    }
    if (pw.dialoguePage === 4 && pw.swapCursorPos !== null && pw.swapDeclineElapsed === null) return { kind: "field.yesno", sig: String(pw.swapCursorPos) };
    return null;
  }
  if (orch || st.prebattleEntry || st.prebattleRoom || st.battleRoom || st.battleScene || st.factoryTerminal || st.lobbyFreeRoam || st.lobbyAttendant) return null;
  if (st.summaryScreen?.isOpen || st.summaryScreen?.transition) return summaryReady(st.summaryScreen) ? { kind: "summary", sig: summarySig(st.summaryScreen) } : null;
  const d = st.draftScreen;
  if (!d) return null;
  if (d.confirmReveal) return d.confirmReveal.phase === "shown" ? { kind: "draft.yesno", sig: String(d.yesNoCursorPos) } : null;
  if (d.mode === "cursor") return { kind: "draft.cursor", sig: `${d.cursorPos}` };
  if (d.mode === "menu") return { kind: "draft.menu", sig: `${d.menuCursorPos}` };
  if (d.mode === "invalid") return { kind: "draft.invalid", sig: "" };
  return null;
}

/** The screen owner, for the report (the soak driver's surface names). */
export function surfaceOf(state) {
  const orch = state.factoryRoundBattleOrchestrator;
  if (orch?.battleResolutionPresentation) return `resolution:${orch.battleResolutionPresentation.lifecycle.phase}`;
  if (orch?.battleStartIntro) return "battleStartIntro";
  if (orch?.battleCommandPresentation) return `command:${orch.battleCommandPresentation.lifecycle.phase}`;
  if (state.lobbyAttendant) return `lobbyAttendant:${state.lobbyAttendant.phase}:${state.lobbyAttendant.screen}`;
  if (state.lobbyFreeRoam) return "lobbyFreeRoam";
  if (state.factoryTerminal) return "factoryTerminal";
  if (state.factorySwap) return `factorySwap:${state.factorySwap.controller.phase}`;
  if (state.postwin) return `postwin:page${state.postwin.dialoguePage}`;
  if (state.battleScene) return "battleScene";
  if (state.battleRoom) return `battleRoom:${state.battleRoom.phase}`;
  if (state.prebattleRoom) return `prebattleRoom:${state.prebattleRoom.phase}`;
  if (state.prebattleEntry) return `prebattleEntry:${state.prebattleEntry.phase}`;
  if (state.summaryScreen?.isOpen) return "summaryScreen";
  return `draft:${state.draftScreen?.mode}`;
}
