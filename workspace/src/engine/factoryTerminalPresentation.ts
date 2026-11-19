import { PLAYER_NAME } from "./playerName.ts";
import type {
  BattlePresentationCommand,
  BattlePresentationCompletion,
} from "./battlePresentation.ts";

export interface FactoryTerminalRecordProfile {
  /** Source-owned save-SE wait from party/status restoration to the prompt. */
  readonly recordPromptDelayFromRestore: number;
  readonly recordPromptTextDelay: number;
  readonly recordPromptInputDelay: number;
  readonly recordScrollTicks: number;
  readonly recordThirdLineDelay: number;
  readonly recordMenuDrawDelay: number;
  readonly recordMenuVisibleDelay: number;
  readonly recordMenuInputDelay: number;
  /**
   * The decline branch of the shared record question (NO, or B, on the
   * multichoice) -> EndRecordBattle, the LAST step of either terminal flow.
   * Source: BattleFrontier_BattleFactoryLobby/scripts.inc:81-94 -- after
   * `switch VAR_RESULT` declines, EventScript_EndRecordBattle runs
   * `msgbox Text_LookForwardToNextVisit, MSGBOX_DEFAULT; closemessage;
   * setvar VAR_TEMP_CHALLENGE_STATUS, 255; releaseall; end`. Every age below
   * is relative to the decline edge (the terminal tick the multichoice's NO
   * choice is stored): the multichoice window itself vanishes
   * `declineMenuClearDelay` ticks in (the oracle's first pixel change is the
   * YES/NO window clearing -- the scrolled record question stays drawn until
   * `declineTextClearDelay`), FillWindowPixelBuffer then wipes the box and
   * the farewell prints 1 glyph/tick from `declineTextFirstDelay` (dense
   * 1-tick probe: edge+1 multichoice gone, edge+3 box clears, edge+4 first
   * glyph, 35-glyph line -> edge+38 last glyph, held edge+39+), the farewell
   * message's own A dismiss is accepted from `declineInputDelay` (last
   * glyph + 1, the MSGBOX_DEFAULT waitmessage gate; the real second A lands
   * at edge+102), and the box stays fully drawn through the dismiss for
   * `declineReleaseClearDelay` ticks before closing into the free-roam Lobby
   * field. The farewell holds a plain message box with NO wait-cursor
   * (measured zero red down-arrow pixels across the whole hold; MSGBOX_DEFAULT
   * prints then blocks on waitmessage).
   */
  readonly declineMenuClearDelay: number;
  readonly declineTextClearDelay: number;
  readonly declineTextFirstDelay: number;
  readonly declineInputDelay: number;
  readonly declineReleaseClearDelay: number;
  readonly declineFarewell: readonly [string, string];
  /**
   * ISSUES #104's YES-only remainder: `case 0` calls
   * `EventScript_RecordBattle` -> `EventScript_SaveBattle`
   * (`BattleFrontier_BattleFactoryLobby/scripts.inc:87-88`,
   * `BattleFrontier_BattleTowerLobby/scripts.inc:132-138`) before falling
   * into the same `EndRecordBattle` farewell every answer shares. Oracle
   * dense probe (`tools/battle-lab/scratch-loss-record-yes-probe.json`,
   * `docs/factory-terminal-record-yes-ground-truth.md`) against the
   * held YES/(NO) multichoice edge (the same tick `declineFarewellReleaseAge`
   * arms for every answer): the multichoice cursor vanishes at edge+1 (same
   * `declineMenuClearDelay` every answer shares) but the old record-question
   * text lingers **20 ticks longer than NO's own transition** before the box
   * wipes -- `frontier_savebattle`'s own processing time -- then the message
   * types at the same 1-char/tick cadence. This message's own dismiss
   * re-arms `declineFarewellReleaseAge` at the dismiss tick, so every
   * existing decline-farewell constant/renderer below drives the real
   * farewell from there unmodified.
   */
  readonly recordSavedTextClearDelay: number;
  readonly recordSavedTextFirstDelay: number;
  readonly recordSavedInputDelay: number;
  readonly recordSavedMessage: readonly [string, string];
  /**
   * lbra: with the record question skipped (forfeit), the farewell `msgbox` follows the SE_SAVE wait
   * directly. This is the virtual decline edge (the farewell's box-clear is edge + `declineTextClearDelay`)
   * measured from the party-restore age; the record-question flow's prompt is `recordPromptDelayFromRestore`.
   */
  readonly recordDisabledFarewellEdgeFromRestore: number;
}

export interface FactoryTerminalLossProfile extends FactoryTerminalRecordProfile {
  readonly outcome: "loss";
  readonly blackFirstAge: number;
  readonly fieldFirstAge: number;
  readonly fadeFirstAge: number;
  readonly messageFrameAge: number;
  readonly firstPageTextAge: number;
  readonly firstPageInputReadyAge: number;
  readonly nextPageVisualDelay: number;
  readonly printerHandoffDelay: number;
  readonly statusClearDelayFromSecondRelease: number;
  readonly pages: readonly [
    readonly [string, string],
    readonly [string, string],
    readonly [string, string],
  ];
}

export interface FactoryTerminalRoundWonProfile
  extends FactoryTerminalRecordProfile {
  readonly outcome: "roundWon";
  /** Extra frames of the save before SE_SAVE (SYMBOL_SAVE_EXTRA_FRAMES after a new symbol). */
  readonly saveDelayExtra?: number;
  readonly blackFirstAge: number;
  readonly fieldFirstAge: number;
  readonly fadeFirstAge: number;
  readonly messageFrameAge: number;
  readonly congratulationsTextDelay: number;
  readonly congratulationsInputReadyAge: number;
  readonly awardTextDelay: number;
  readonly awardScrollInputDelay: number;
  readonly awardScrollTicks: number;
  readonly awardThirdLineTextDelay: number;
  readonly awardDefaultInputDelay: number;
  readonly battlePointMutationDelay: number;
  readonly getPointsTextDelay: number;
  readonly fanfareTicks: number;
  readonly exchangeTextDelayFromFanfareEnd: number;
  readonly exchangeInputDelay: number;
  readonly exchangeNextPageVisualDelay: number;
  readonly restoreDelayFromExchangeRelease: number;
  readonly congratulations: readonly [string, string];
  /**
   * `EventScript_WonChallenge`'s brain branch
   * (`BattleFrontier_BattleFactoryLobby/scripts.inc:38-46`, text
   * `Text_CongratsForDefeatingHead:44-46`) -- selected instead of
   * `congratulations` iff the final opponent carries `frontierBrain`
   * (`frontier_isbrain`, itself `gTrainerBattleOpponent_A ==
   * TRAINER_FRONTIER_BRAIN`, `frontier_util.c:1839-1845`), independent of
   * symbol count/status. Every other Lobby mechanic (box-open handshake,
   * `AwardBattlePoints`/`ExchangeMonsAndSave`/`AskRecordBattle` tail) is
   * identical between branches (audit `noland-brain-post-battle-audit.md`
   * §1d) -- only this string differs. `scrollTicks`/`thirdLineTextDelay`
   * reuse `awardScrollTicks`/`awardThirdLineTextDelay` verbatim: the
   * `\l` (CHAR_PROMPT_SCROLL) mid-message scroll this text also contains
   * is the same generic printer animation `award`'s own `\n\l` text
   * already exercises, not something specific to award's string. The two
   * gate ages this shape needs beyond that (when the first two lines
   * finish typing; when the third does) are computed at advance-time from
   * these lines' lengths via the same "input accepted exactly on the tick
   * the last glyph draws" rule that reproduces `congratulationsInputReadyAge`
   * (102) and `awardScrollInputDelay`/`awardDefaultInputDelay` (69/41)
   * with zero slack -- unlike those three, this shape has no live oracle
   * trace to confirm against yet (blocked on the not-yet-built harness
   * `factoryBrain` staging mode, `noland-brain-post-battle-audit.md` §5
   * worklist item 4), so treat it as formula-derived pending that.
   */
  readonly frontierBrainCongratulations: Readonly<{
    readonly lines: readonly [string, string, string];
    readonly scrollTicks: number;
    readonly thirdLineTextDelay: number;
  }>;
  readonly award: readonly [string, string, string];
  readonly getPoints: readonly [string, string];
  readonly exchange: readonly [
    readonly [string, string],
    readonly [string, string],
  ];
  readonly battlePointAward: number;
}

/**
 * Source-relative Scene-OFF loss route from the real post-terminal Lobby
 * warp. Ages are relative to the roundLost publish (dismiss+2), so the
 * shared return-to-field span (rendered by postwin) covers ages 0-113 and
 * this profile's first rendered frame is the Lobby fade-in at age 114 —
 * the real schedule banked dense in ISSUES #73 (fade 114-128, box 141,
 * page-0 "Thank you for participating!" typing 142-169 + cursor 171, the
 * fixture's real A at 301 dismissing it, page-1 return-rentals typing 303+
 * and its real A at 602 dismissing it).
 *
 * The page-0 -> page-1 handoff is the real game's CHAR_PROMPT_CLEAR
 * (text.c RENDER_STATE_CLEAR): the held page survives `nextPageVisualDelay`
 * ticks after the dismiss edge, then FillWindowPixelBuffer wipes the box
 * interior and the next page starts printing the same tick. Page-1's first
 * two characters ("I " of "I will return your POKéMON in exchange") render
 * identically to the empty box frame, which is exactly the oracle's
 * 3-tick clear/reopen look at frames 3535-3537 (empty 3535-3536, first
 * visible glyph "w" at 3537) before the 1-char/tick printer takes over.
 *
 * The page-0 first-glyph age was corrected 143 -> 142 by a dense oracle
 * re-probe over the previously-unverified page-0 span (frames 3374-3403,
 * one tick after the box opens at 3373): the old 143 delayed every page-0
 * typing + cursor frame by one tick. The correction is covered by
 * `tests/factoryTerminalPresentation.test.ts`'s "types page-0's first glyph"
 * pin, red-verified against the old value.
 */
export const FACTORY_LOSS_TERMINAL_PROFILE: FactoryTerminalLossProfile =
  Object.freeze({
    outcome: "loss",
    blackFirstAge: 2,
    fieldFirstAge: 114,
    fadeFirstAge: 114,
    messageFrameAge: 141,
    firstPageTextAge: 142,
    firstPageInputReadyAge: 171,
    nextPageVisualDelay: 2,
    printerHandoffDelay: 2,
    statusClearDelayFromSecondRelease: 50,
    recordPromptDelayFromRestore: 169,
    recordPromptTextDelay: 1,
    recordPromptInputDelay: 63,
    recordScrollTicks: 4,
    recordThirdLineDelay: 7,
    recordMenuDrawDelay: 23,
    recordMenuVisibleDelay: 23,
    recordMenuInputDelay: 25,
    declineMenuClearDelay: 1,
    declineTextClearDelay: 3,
    declineTextFirstDelay: 4,
    declineInputDelay: 39,
    declineReleaseClearDelay: 2,
    declineFarewell: Object.freeze([
      "We look forward to your next visit.",
      "",
    ] as const),
    recordSavedTextClearDelay: 21,
    recordSavedTextFirstDelay: 22,
    recordSavedInputDelay: 70,
    recordSavedMessage: Object.freeze([
      `${PLAYER_NAME}’s battle was recorded`,
      "on the FRONTIER PASS.",
    ] as const),
    recordDisabledFarewellEdgeFromRestore: 166,
    pages: Object.freeze([
      Object.freeze(["Thank you for participating!", ""] as const),
      Object.freeze([
        "I will return your POKéMON in exchange",
        "for our rental POKéMON.",
      ] as const),
      Object.freeze([
        "I must also save the event results.",
        "Please wait.",
      ] as const),
    ] as const),
  });

/**
 * Regular Level-50 seventh-win route. Every clock after the initial map
 * handoff is relative to a stored input edge; the roomy staged releases at
 * +300/+1100/+2200 are evidence inputs, not production timeline branches.
 */
export const FACTORY_ROUND_WON_TERMINAL_PROFILE: FactoryTerminalRoundWonProfile =
  Object.freeze({
    outcome: "roundWon",
    blackFirstAge: 2,
    fieldFirstAge: 13,
    fadeFirstAge: 13,
    messageFrameAge: 40,
    congratulationsTextDelay: 41,
    congratulationsInputReadyAge: 102,
    awardTextDelay: 6,
    // ROM (docs/parity-mac/noland-room-scenes.md, the Lobby after a won Noland battle, presses on their first taken frame): the award text's
    // \l takes a press 70 frames after the congratulations' press, its end 44 after the scroll's (were 69 / 41, from later presses).
    awardScrollInputDelay: 70,
    awardScrollTicks: 4,
    awardThirdLineTextDelay: 7,
    awardDefaultInputDelay: 44,
    battlePointMutationDelay: 1,
    getPointsTextDelay: 3,
    fanfareTicks: 312,
    exchangeTextDelayFromFanfareEnd: 8,
    exchangeInputDelay: 51,
    exchangeNextPageVisualDelay: 2,
    restoreDelayFromExchangeRelease: 49,
    // lbr-f: the won route's record question types / blinks 1 tick earlier than the loss route's (docs/lbrf-won-timing.md). After a win over
    // the Factory Head it is one frame later again (BRAIN_WIN_RECORD_PROMPT_EXTRA_FRAMES).
    recordPromptDelayFromRestore: 168,
    recordPromptTextDelay: 1,
    recordPromptInputDelay: 63,
    recordScrollTicks: 4,
    recordThirdLineDelay: 7,
    recordMenuDrawDelay: 22,
    recordMenuVisibleDelay: 23,
    recordMenuInputDelay: 24,
    declineMenuClearDelay: 1,
    declineTextClearDelay: 3,
    declineTextFirstDelay: 4,
    // lbr-d1: input gates measured on the won tail (docs/lbrd2a-won-tail-rom.md): ROM 41 / 74 (the loss profile's 39 / 70 stay).
    declineInputDelay: 41,
    declineReleaseClearDelay: 2,
    declineFarewell: Object.freeze([
      "We look forward to your next visit.",
      "",
    ] as const),
    recordSavedTextClearDelay: 21,
    recordSavedTextFirstDelay: 22,
    recordSavedInputDelay: 74,
    recordSavedMessage: Object.freeze([
      `${PLAYER_NAME}’s battle was recorded`,
      "on the FRONTIER PASS.",
    ] as const),
    recordDisabledFarewellEdgeFromRestore: 166,
    congratulations: Object.freeze([
      "Congratulations! You’ve won seven",
      "straight Battle Swap matches!",
    ] as const),
    frontierBrainCongratulations: Object.freeze({
      lines: Object.freeze([
        "Congratulations for defeating",
        "the FACTORY HEAD and winning",
        "seven matches in a row!",
      ] as const),
      scrollTicks: 4,
      thirdLineTextDelay: 7,
    }),
    award: Object.freeze([
      "In recognition of your wealth of",
      "knowledge and keen intelligence,",
      "we award you these Battle Point(s).",
    ] as const),
    getPoints: Object.freeze([
      `${PLAYER_NAME} obtained 3 Battle Point(s).`,
      "",
    ] as const),
    exchange: Object.freeze([
      Object.freeze([
        "Let me exchange your POKéMON",
        "for our rental POKéMON.",
      ] as const),
      Object.freeze([
        "I need to save the battle data,",
        "so please wait.",
      ] as const),
    ] as const),
    battlePointAward: 3,
  });

export interface FactoryTerminalLossPresentationState {
  readonly commandId: number;
  readonly battleIndex: number;
  readonly profile: FactoryTerminalLossProfile;
  /** Terminal-local age; zero is the staged CB2_LoadMap handoff. */
  readonly age: number;
  readonly firstPageReleaseAge: number | null;
  readonly secondPageReleaseAge: number | null;
  readonly partyRestored: boolean;
  readonly challengeStatus: "lost" | "clear";
  readonly completed: boolean;
  readonly recordPromptReleaseAge: number | null;
  readonly recordMenuCursor: 0 | 1;
  /**
   * ISSUES #117: age `recordMenuCursor` last flipped. The real ROM's cursor
   * sprite redraw lags the input-processed value by one tick (measured via
   * `tools/compare/traces/loss-terminal-record-cursor-off.json`, frames
   * 4539/4561: `recordMenuCursor` itself must flip on the press-processed
   * tick for confirm-choice correctness, but the rendered arrow stays at the
   * OLD row through that same tick and only shows the new row starting the
   * tick after). Null until the first UP/DOWN.
   */
  readonly recordMenuCursorChangedAge: number | null;
  readonly recordChoice: "yes" | "no" | "cancel" | null;
  /** Age the record menu's NO choice was stored -- the decline edge all
   *  EndRecordBattle clocks are relative to; null until the decline branch. */
  readonly declineFarewellReleaseAge: number | null;
  /** Age the farewell message's own A dismiss is stored. */
  readonly declineDismissAge: number | null;
  /**
   * ISSUES #104: age the YES-only "battle was recorded" message's own A
   * dismiss is stored; null for NO/cancel (never shown) and null for YES
   * until that message's dismiss (`declineFarewellReleaseAge` re-arms to
   * this same tick, so the shared farewell mechanics run from there).
   */
  readonly recordSavedDismissAge: number | null;
  /**
   * lbra: a forfeit sets `frontier.disableRecordBattle` (battle_main.c:5062), so Lobby:77-78
   * (`BattleFrontier_EventScript_GetCantRecordBattle` TRUE) jumps straight to EndRecordBattle:
   * the record question is never asked and `recordChoice` stays null.
   */
  readonly recordDisabled: boolean;
}

export interface FactoryTerminalRoundWonPresentationState {
  readonly commandId: number;
  readonly battleIndex: number;
  readonly profile: FactoryTerminalRoundWonProfile;
  /** Terminal-local age; zero is the staged CB2_LoadMap handoff. */
  readonly age: number;
  /** `frontier_isbrain` result for the final opponent (§ `frontierBrainCongratulations`). */
  readonly frontierBrain: boolean;
  /** Age the implicit `\l` mid-congratulations scroll gate was accepted; stays null when `!frontierBrain`. */
  readonly congratsScrollReleaseAge: number | null;
  readonly congratulationsReleaseAge: number | null;
  readonly awardScrollReleaseAge: number | null;
  readonly awardReleaseAge: number | null;
  readonly battlePointsBeforeAward: number;
  readonly displayedBattlePoints: number;
  readonly fanfareRemaining: number;
  readonly exchangeReleaseAge: number | null;
  readonly partyRestored: boolean;
  readonly challengeStatus: "won" | "clear";
  readonly completed: boolean;
  readonly recordPromptReleaseAge: number | null;
  readonly recordMenuCursor: 0 | 1;
  /** ISSUES #117: see the loss-side field of the same name for the mechanism. */
  readonly recordMenuCursorChangedAge: number | null;
  readonly recordChoice: "yes" | "no" | "cancel" | null;
  /** Age the record menu's NO choice was stored -- the decline edge all
   *  EndRecordBattle clocks are relative to; null until the decline branch. */
  readonly declineFarewellReleaseAge: number | null;
  /** Age the farewell message's own A dismiss is stored. */
  readonly declineDismissAge: number | null;
  /**
   * ISSUES #104: age the YES-only "battle was recorded" message's own A
   * dismiss is stored; null for NO/cancel (never shown) and null for YES
   * until that message's dismiss (`declineFarewellReleaseAge` re-arms to
   * this same tick, so the shared farewell mechanics run from there).
   */
  readonly recordSavedDismissAge: number | null;
  readonly recordDisabled: boolean;
}

export type FactoryTerminalPresentationState =
  | FactoryTerminalLossPresentationState
  | FactoryTerminalRoundWonPresentationState;

export function isFactoryTerminalRoundWon(
  state: FactoryTerminalPresentationState,
): state is FactoryTerminalRoundWonPresentationState {
  return state.profile.outcome === "roundWon";
}

export function createFactoryTerminalLossPresentation(
  command: Pick<
    Extract<BattlePresentationCommand, { readonly type: "roundLost" }>,
    "type" | "commandId" | "battleIndex"
  >,
): FactoryTerminalLossPresentationState {
  return {
    commandId: command.commandId,
    battleIndex: command.battleIndex,
    profile: FACTORY_LOSS_TERMINAL_PROFILE,
    age: 0,
    firstPageReleaseAge: null,
    secondPageReleaseAge: null,
    partyRestored: false,
    challengeStatus: "lost",
    completed: false,
    recordPromptReleaseAge: null,
    recordMenuCursor: 1,
    recordMenuCursorChangedAge: null,
    recordChoice: null,
    declineFarewellReleaseAge: null,
    declineDismissAge: null,
    recordSavedDismissAge: null,
    recordDisabled: false,
  };
}

/**
 * The BP the won script awards (`frontier_givepoints`, frontier_util.c:1853-1910): 3 for the first
 * two challenges, 4 / 5 later, +10 for a Brain win. The default profile is the 3 BP text.
 */
export interface FactoryTerminalBattlePointAward {
  /** The save's BP before the award (the carry's total when the Lobby script runs). */
  readonly before: number;
  readonly awarded: number;
  /** The round gave a new Factory symbol (the Lobby's save then takes SYMBOL_SAVE_EXTRA_FRAMES longer). */
  readonly symbolGranted?: boolean;
}

/**
 * The Lobby's save (factory_save, then playse SE_SAVE and the record question) takes this much longer after a round that gave a new
 * symbol. ROM (docs/parity-mac/noland-room-scenes.md): from the exchange press to the record question 216 frames with no new symbol (two
 * runs), 347 after the silver symbol (three runs) and 341-347 after the gold one (three runs). The cause in the save was not traced.
 */
export const SYMBOL_SAVE_EXTRA_FRAMES = 131;
/**
 * The record question after a won Factory Head battle comes a frame later than after an ordinary seventh win (it follows the save, which
 * writes other data): ROM, two won Noland battles with no new symbol, 169 frames from the party restore (docs/parity-mac/noland-room-scenes.md),
 * against lbr-f's 168 for the seventh win.
 */
export const BRAIN_WIN_RECORD_PROMPT_EXTRA_FRAMES = 1;

function wonProfileForAward(awarded: number, symbolGranted = false, frontierBrain = false): FactoryTerminalRoundWonProfile {
  if (awarded === FACTORY_ROUND_WON_TERMINAL_PROFILE.battlePointAward && !symbolGranted && !frontierBrain) return FACTORY_ROUND_WON_TERMINAL_PROFILE;
  return Object.freeze({
    ...FACTORY_ROUND_WON_TERMINAL_PROFILE,
    battlePointAward: awarded,
    getPoints: Object.freeze([`${PLAYER_NAME} obtained ${awarded} Battle Point(s).`, ""] as const),
    ...(symbolGranted ? { saveDelayExtra: SYMBOL_SAVE_EXTRA_FRAMES } : {}),
    recordPromptDelayFromRestore: FACTORY_ROUND_WON_TERMINAL_PROFILE.recordPromptDelayFromRestore
      + (frontierBrain ? BRAIN_WIN_RECORD_PROMPT_EXTRA_FRAMES : 0) + (symbolGranted ? SYMBOL_SAVE_EXTRA_FRAMES : 0),
  });
}

export function createFactoryTerminalRoundWonPresentation(
  command: Pick<
    Extract<BattlePresentationCommand, { readonly type: "roundCompleted" }>,
    "type" | "commandId" | "battleIndex" | "opponent"
  >,
  award: FactoryTerminalBattlePointAward = { before: 0, awarded: FACTORY_ROUND_WON_TERMINAL_PROFILE.battlePointAward },
): FactoryTerminalRoundWonPresentationState {
  const battlePointsBeforeAward = award.before;
  return {
    commandId: command.commandId,
    battleIndex: command.battleIndex,
    profile: wonProfileForAward(award.awarded, award.symbolGranted === true, command.opponent.frontierBrain !== undefined),
    age: 0,
    frontierBrain: command.opponent.frontierBrain !== undefined,
    congratsScrollReleaseAge: null,
    congratulationsReleaseAge: null,
    awardScrollReleaseAge: null,
    awardReleaseAge: null,
    battlePointsBeforeAward,
    displayedBattlePoints: battlePointsBeforeAward,
    fanfareRemaining: 0,
    exchangeReleaseAge: null,
    partyRestored: false,
    challengeStatus: "won",
    completed: false,
    recordPromptReleaseAge: null,
    recordMenuCursor: 1,
    recordMenuCursorChangedAge: null,
    recordChoice: null,
    declineFarewellReleaseAge: null,
    declineDismissAge: null,
    recordSavedDismissAge: null,
    recordDisabled: false,
  };
}

export function createFactoryTerminalPresentation(
  command: Extract<
    BattlePresentationCommand,
    { readonly type: "roundLost" | "roundCompleted" }
  >,
  award?: FactoryTerminalBattlePointAward,
): FactoryTerminalPresentationState {
  return command.type === "roundLost"
    ? createFactoryTerminalLossPresentation(command)
    : createFactoryTerminalRoundWonPresentation(command, award);
}

/**
 * Source-relative message-box visual phase for a LOSS terminal page,
 * expressing the page-to-page handoff as the real game's CHAR_PROMPT_CLEAR
 * (text.c RENDER_STATE_CLEAR): after a page's release edge its text stays
 * fully on screen for `nextPageVisualDelay` ticks ("held"), then
 * FillWindowPixelBuffer wipes the interior and the next page starts
 * printing from that same tick ("cleared" — the previous page's text is no
 * longer drawn). Page-1's opening "I " of "I will return your POKéMON in
 * exchange" draws onto the box frame itself, so during its first two
 * printing ticks the box reads empty — exactly the oracle's 3535-3536
 * clear/reopen look ahead of the first visible glyph at 3537.
 */
export type FactoryTerminalPageVisualPhase =
  | "idle"
  | "typing"
  | "held"
  | "cleared";

export function factoryTerminalPageVisualPhase(
  state: FactoryTerminalLossPresentationState,
  page: 0 | 1,
): FactoryTerminalPageVisualPhase {
  if (page === 0) {
    if (state.firstPageReleaseAge === null) {
      return state.age < state.profile.firstPageTextAge ? "idle" : "typing";
    }
    return state.age <
      state.firstPageReleaseAge + state.profile.nextPageVisualDelay
      ? "held"
      : "cleared";
  }
  const firstAge = factoryTerminalPageTextFirstAge(state, 1);
  if (firstAge === null || state.age < firstAge) return "idle";
  if (state.secondPageReleaseAge === null) return "typing";
  return state.age <
    state.secondPageReleaseAge + state.profile.nextPageVisualDelay
    ? "held"
    : "cleared";
}

export function factoryTerminalActivePage(
  state: FactoryTerminalLossPresentationState,
): 0 | 1 | 2 {
  if (
    state.secondPageReleaseAge !== null &&
    state.age >=
      state.secondPageReleaseAge + state.profile.nextPageVisualDelay
  ) return 2;
  if (
    state.firstPageReleaseAge !== null &&
    state.age >=
      state.firstPageReleaseAge + state.profile.nextPageVisualDelay
  ) return 1;
  return 0;
}

export function factoryTerminalPageTextFirstAge(
  state: FactoryTerminalLossPresentationState,
  page: 0 | 1 | 2,
): number | null {
  if (page === 0) return state.profile.firstPageTextAge;
  const release =
    page === 1 ? state.firstPageReleaseAge : state.secondPageReleaseAge;
  return release === null ? null : release + state.profile.nextPageVisualDelay;
}

export function factoryTerminalVisibleChars(
  state: FactoryTerminalLossPresentationState,
): number {
  const page = factoryTerminalActivePage(state);
  const firstAge = factoryTerminalPageTextFirstAge(state, page);
  if (firstAge === null || state.age < firstAge) return 0;
  const [line1, line2] = state.profile.pages[page];
  return Math.min(line1.length + line2.length, state.age - firstAge + 1);
}

export function factoryTerminalPageInputReady(
  state: FactoryTerminalLossPresentationState,
): boolean {
  const page = factoryTerminalActivePage(state);
  if (page === 2) return false;
  if (page === 0) return state.age >= state.profile.firstPageInputReadyAge;
  const firstAge = factoryTerminalPageTextFirstAge(state, 1)!;
  const [line1, line2] = state.profile.pages[1];
  return state.age >=
    firstAge + line1.length + line2.length - 1;
}

function advanceFactoryTerminalLossPresentation(
  state: FactoryTerminalLossPresentationState,
  input: {
    readonly pressedA?: boolean;
    readonly pressedB?: boolean;
    readonly pressedUp?: boolean;
    readonly pressedDown?: boolean;
  },
): FactoryTerminalLossPresentationState {
  const age = state.age + 1;
  let firstPageReleaseAge = state.firstPageReleaseAge;
  let secondPageReleaseAge = state.secondPageReleaseAge;
  const atNextAge = { ...state, age };
  if (input.pressedA && factoryTerminalPageInputReady(atNextAge)) {
    if (firstPageReleaseAge === null) firstPageReleaseAge = age;
    else if (secondPageReleaseAge === null) secondPageReleaseAge = age;
  }
  const clearAge =
    secondPageReleaseAge === null
      ? Number.POSITIVE_INFINITY
      : secondPageReleaseAge + state.profile.statusClearDelayFromSecondRelease;
  const completed = age >= clearAge;
  const record = advanceFactoryTerminalRecordPrompt(
    { ...state, age, completed },
    age,
    input,
  );
  return {
    ...state,
    age,
    firstPageReleaseAge,
    secondPageReleaseAge,
    partyRestored: completed,
    challengeStatus: completed ? "clear" : "lost",
    completed,
    ...record,
  };
}

export function factoryTerminalRecordMenuVisible(
  state: FactoryTerminalPresentationState,
): boolean {
  return state.recordPromptReleaseAge !== null &&
    state.age >=
      state.recordPromptReleaseAge + state.profile.recordMenuVisibleDelay;
}

export function factoryTerminalRecordMenuDrawn(
  state: FactoryTerminalPresentationState,
): boolean {
  return state.recordPromptReleaseAge !== null &&
    state.age >=
      state.recordPromptReleaseAge + state.profile.recordMenuDrawDelay;
}

export function factoryTerminalRecordMenuInputReady(
  state: FactoryTerminalPresentationState,
): boolean {
  return state.recordPromptReleaseAge !== null &&
    state.age >=
      state.recordPromptReleaseAge + state.profile.recordMenuInputDelay;
}

export function factoryTerminalDeclineEdgeAge(
  state: FactoryTerminalPresentationState,
): number | null {
  return state.declineFarewellReleaseAge;
}

export function factoryTerminalDeclineMenuClearAge(
  state: FactoryTerminalPresentationState,
): number | null {
  const edge = state.declineFarewellReleaseAge;
  return edge === null
    ? null
    : edge + state.profile.declineMenuClearDelay;
}

export function factoryTerminalDeclineBoxClearAge(
  state: FactoryTerminalPresentationState,
): number | null {
  const edge = state.declineFarewellReleaseAge;
  return edge === null
    ? null
    : edge + state.profile.declineTextClearDelay;
}

export function factoryTerminalDeclineTextFirstAge(
  state: FactoryTerminalPresentationState,
): number | null {
  const edge = state.declineFarewellReleaseAge;
  return edge === null
    ? null
    : edge + state.profile.declineTextFirstDelay;
}

/** ISSUES #104: true while the YES-only "battle was recorded" message is
 *  the active page -- before its own dismiss re-arms `declineFarewellReleaseAge`
 *  for the shared farewell. Always false for NO/cancel. */
export function factoryTerminalRecordSavedMessageActive(
  state: FactoryTerminalPresentationState,
): boolean {
  if (state.recordChoice !== "yes" || state.declineFarewellReleaseAge === null) {
    return false;
  }
  if (state.recordSavedDismissAge === null) return true;
  // Oracle-measured (docs/factory-terminal-record-yes-ground-truth.md): the
  // dismissed message stays drawn for `declineTextClearDelay` more ticks --
  // the SAME box-wipe delay the farewell's own menu-to-text transition
  // uses -- because `declineFarewellReleaseAge` re-armed to this dismiss
  // tick above, and the farewell doesn't wipe the box until its own
  // (unchanged) boxClearAge.
  return state.age <
    state.declineFarewellReleaseAge + state.profile.declineTextClearDelay;
}

export function factoryTerminalRecordSavedBoxClearAge(
  state: FactoryTerminalPresentationState,
): number | null {
  const edge = state.declineFarewellReleaseAge;
  return edge === null
    ? null
    : edge + state.profile.recordSavedTextClearDelay;
}

export function factoryTerminalRecordSavedTextFirstAge(
  state: FactoryTerminalPresentationState,
): number | null {
  const edge = state.declineFarewellReleaseAge;
  return edge === null
    ? null
    : edge + state.profile.recordSavedTextFirstDelay;
}

export function factoryTerminalDeclineBoxGoneAge(
  state: FactoryTerminalPresentationState,
): number | null {
  const dismiss = state.declineDismissAge;
  return dismiss === null
    ? null
    : dismiss + state.profile.declineReleaseClearDelay;
}

export function factoryTerminalRoundWonBattlePointMutationAge(
  state: FactoryTerminalRoundWonPresentationState,
): number | null {
  return state.awardReleaseAge === null
    ? null
    : state.awardReleaseAge + state.profile.battlePointMutationDelay;
}

export function factoryTerminalRestoreAge(
  state: FactoryTerminalPresentationState,
): number | null {
  if (isFactoryTerminalRoundWon(state)) {
    return state.exchangeReleaseAge === null
      ? null
      : state.exchangeReleaseAge +
        state.profile.restoreDelayFromExchangeRelease;
  }
  return state.secondPageReleaseAge === null
    ? null
    : state.secondPageReleaseAge +
      state.profile.statusClearDelayFromSecondRelease;
}

export function factoryTerminalRecordPromptFirstAge(
  state: FactoryTerminalPresentationState,
): number | null {
  const restoreAge = factoryTerminalRestoreAge(state);
  return restoreAge === null
    ? null
    : restoreAge + state.profile.recordPromptDelayFromRestore;
}

export function factoryTerminalRecordPromptTextFirstAge(
  state: FactoryTerminalPresentationState,
): number | null {
  const firstAge = factoryTerminalRecordPromptFirstAge(state);
  return firstAge === null
    ? null
    : firstAge + state.profile.recordPromptTextDelay;
}

export function factoryTerminalRecordPromptInputReady(
  state: FactoryTerminalPresentationState,
): boolean {
  const firstAge = factoryTerminalRecordPromptFirstAge(state);
  return firstAge !== null &&
    state.age >= firstAge + state.profile.recordPromptInputDelay;
}

function advanceFactoryTerminalRecordPrompt<
  State extends FactoryTerminalPresentationState,
>(
  state: State,
  age: number,
  input: {
    readonly pressedA?: boolean;
    readonly pressedB?: boolean;
    readonly pressedUp?: boolean;
    readonly pressedDown?: boolean;
  },
): Pick<
  State,
  | "recordPromptReleaseAge"
  | "recordMenuCursor"
  | "recordMenuCursorChangedAge"
  | "recordChoice"
  | "declineFarewellReleaseAge"
  | "declineDismissAge"
  | "recordSavedDismissAge"
> {
  let recordPromptReleaseAge = state.recordPromptReleaseAge;
  let recordMenuCursor = state.recordMenuCursor;
  let recordMenuCursorChangedAge = state.recordMenuCursorChangedAge;
  let recordChoice = state.recordChoice;
  let declineFarewellReleaseAge = state.declineFarewellReleaseAge;
  let declineDismissAge = state.declineDismissAge;
  let recordSavedDismissAge = state.recordSavedDismissAge;
  const atNextAge = { ...state, age };
  if (state.recordDisabled && declineFarewellReleaseAge === null) {
    const restoreAge = factoryTerminalRestoreAge(atNextAge);
    if (restoreAge !== null) {
      const edge = restoreAge + state.profile.recordDisabledFarewellEdgeFromRestore;
      if (age >= edge) declineFarewellReleaseAge = edge;
    }
  }
  if (
    !state.recordDisabled &&
    recordPromptReleaseAge === null &&
    factoryTerminalRecordPromptInputReady(atNextAge) &&
    (input.pressedA || input.pressedB)
  ) {
    recordPromptReleaseAge = age;
  } else if (
    recordPromptReleaseAge !== null &&
    recordChoice === null &&
    age >= recordPromptReleaseAge + state.profile.recordMenuInputDelay
  ) {
    if (input.pressedUp) {
      if (recordMenuCursor !== 0) recordMenuCursorChangedAge = age;
      recordMenuCursor = 0;
    } else if (input.pressedDown) {
      if (recordMenuCursor !== 1) recordMenuCursorChangedAge = age;
      recordMenuCursor = 1;
    } else if (input.pressedB) recordChoice = "cancel";
    else if (input.pressedA) {
      recordChoice = recordMenuCursor === 0 ? "yes" : "no";
    }
  }
  // EndRecordBattle (ISSUES #104): the real AskRecordBattle multichoice
  // (BattleFrontier_BattleFactoryLobby/scripts.inc:76-94) sends ALL THREE
  // answers into the same farewell. `case 1` (NO) and `case MULTI_B_PRESSED`
  // (cancel) both `goto EndRecordBattle` directly -- byte-identical targets,
  // so cancel is not a stub here, it already matches NO exactly. `case 0`
  // (YES) calls EventScript_RecordBattle -> EventScript_SaveBattle
  // (`frontier_savebattle` + msgbox "{PLAYER}'s battle was recorded on the
  // FRONTIER PASS.", scripts.inc:87-88 /
  // BattleFrontier_BattleTowerLobby/scripts.inc:132-138), which then falls
  // into the same EndRecordBattle (`msgbox Text_LookForwardToNextVisit` +
  // closemessage + releaseall). Standing decision 2026-08-05 (ISSUES.md
  // ~1008, docs/factory-lobby-freeroam-ground-truth.md §4): RECORD is
  // stub-only, no real recording ever -- so this arms the SAME
  // declineFarewellReleaseAge edge for all three answers on confirm
  // (identical to NO's existing pinned timing), and for YES that edge is
  // reused as the "battle was recorded" message's own edge (below) until
  // that message's own dismiss re-arms it to drive the real farewell.
  if (recordChoice !== null && declineFarewellReleaseAge === null) {
    declineFarewellReleaseAge = age;
  }
  const awaitingRecordSavedDismiss =
    recordChoice === "yes" && recordSavedDismissAge === null;
  if (
    awaitingRecordSavedDismiss &&
    declineFarewellReleaseAge !== null &&
    input.pressedA &&
    age >= declineFarewellReleaseAge + state.profile.recordSavedInputDelay
  ) {
    // Dismiss the YES-only "battle was recorded" message and re-arm
    // declineFarewellReleaseAge to THIS tick -- every existing farewell
    // constant/renderer below now drives the real EndRecordBattle text from
    // here, unmodified, exactly mirroring NO/cancel's own single-edge shape.
    recordSavedDismissAge = age;
    declineFarewellReleaseAge = age;
  } else if (
    !awaitingRecordSavedDismiss &&
    declineFarewellReleaseAge !== null &&
    declineDismissAge === null &&
    input.pressedA &&
    age >= declineFarewellReleaseAge + state.profile.declineInputDelay
  ) {
    declineDismissAge = age;
  }
  return {
    recordPromptReleaseAge,
    recordMenuCursor,
    recordMenuCursorChangedAge,
    recordChoice,
    declineFarewellReleaseAge,
    declineDismissAge,
    recordSavedDismissAge,
  };
}

/**
 * `\l` mid-`frontierBrainCongratulations` scroll gate. Live-bisected against
 * the real ROM at age 98 — one tick AFTER the "input accepted exactly on the
 * tick the last glyph draws" rule's 97 (T-1/T pair: 97 rejected, 98 accepted;
 * `tools/probe/bisect-factory-brain-congrats-gates-off.py`,
 * `docs/brain-terminal-live-verification.md`). The `+ 0`-vs-`- 1` term below
 * encodes that measured offset; the last-glyph rule alone under-shoots here.
 */
function frontierBrainCongratsScrollGateReadyAge(
  profile: FactoryTerminalRoundWonProfile,
): number {
  const [line0, line1] = profile.frontierBrainCongratulations.lines;
  return profile.congratulationsTextDelay + line0.length + line1.length;
}

/**
 * Third line's dismiss gate, relative to the scroll gate's own release.
 * Live-bisected at release + 32 — three ticks after the last-glyph rule's
 * + 29 (T-1/T pair: 129 rejected, 130 accepted; same probe/doc as above);
 * the `+ 2` term encodes the measured offset.
 */
function frontierBrainCongratsFinalGateReadyAge(
  profile: FactoryTerminalRoundWonProfile,
  congratsScrollReleaseAge: number,
): number {
  const line2 = profile.frontierBrainCongratulations.lines[2];
  return congratsScrollReleaseAge +
    profile.frontierBrainCongratulations.thirdLineTextDelay + line2.length + 2;
}

export function advanceFactoryTerminalRoundWonPresentation(
  state: FactoryTerminalRoundWonPresentationState,
  input: {
    readonly pressedA?: boolean;
    readonly pressedB?: boolean;
    readonly pressedUp?: boolean;
    readonly pressedDown?: boolean;
  },
): FactoryTerminalRoundWonPresentationState {
  const age = state.age + 1;
  const pressed = input.pressedA || input.pressedB;
  let congratsScrollReleaseAge = state.congratsScrollReleaseAge;
  let congratulationsReleaseAge = state.congratulationsReleaseAge;
  let awardScrollReleaseAge = state.awardScrollReleaseAge;
  let awardReleaseAge = state.awardReleaseAge;
  let exchangeReleaseAge = state.exchangeReleaseAge;

  if (state.frontierBrain && congratsScrollReleaseAge === null) {
    if (pressed && age >= frontierBrainCongratsScrollGateReadyAge(state.profile)) {
      congratsScrollReleaseAge = age;
    }
  } else if (congratulationsReleaseAge === null) {
    const readyAge = state.frontierBrain
      ? frontierBrainCongratsFinalGateReadyAge(state.profile, congratsScrollReleaseAge!)
      : state.profile.congratulationsInputReadyAge;
    if (pressed && age >= readyAge) {
      congratulationsReleaseAge = age;
    }
  } else if (awardScrollReleaseAge === null) {
    if (pressed && age >= congratulationsReleaseAge + state.profile.awardScrollInputDelay) {
      awardScrollReleaseAge = age;
    }
  } else if (awardReleaseAge === null) {
    if (pressed && age >= awardScrollReleaseAge + state.profile.awardDefaultInputDelay) {
      awardReleaseAge = age;
    }
  }

  const mutationAge = awardReleaseAge === null
    ? null
    : awardReleaseAge + state.profile.battlePointMutationDelay;
  const displayedBattlePoints =
    mutationAge !== null && age >= mutationAge
      ? Math.min(
        9999,
        state.battlePointsBeforeAward + state.profile.battlePointAward,
      )
      : state.battlePointsBeforeAward;
  const fanfareRemaining =
    mutationAge === null || age < mutationAge
      ? 0
      : Math.max(0, state.profile.fanfareTicks - (age - mutationAge));
  const fanfareEndAge = mutationAge === null
    ? null
    : mutationAge + state.profile.fanfareTicks;
  const exchangeTextFirstAge = fanfareEndAge === null
    ? null
    : fanfareEndAge + state.profile.exchangeTextDelayFromFanfareEnd;
  if (
    pressed &&
    exchangeReleaseAge === null &&
    exchangeTextFirstAge !== null &&
    age >= exchangeTextFirstAge + state.profile.exchangeInputDelay
  ) {
    exchangeReleaseAge = age;
  }
  const restoreAge = exchangeReleaseAge === null
    ? null
    : exchangeReleaseAge + state.profile.restoreDelayFromExchangeRelease;
  const completed = restoreAge !== null && age >= restoreAge;
  const record = advanceFactoryTerminalRecordPrompt(
    { ...state, age, exchangeReleaseAge, completed },
    age,
    input,
  );

  return {
    ...state,
    age,
    congratsScrollReleaseAge,
    congratulationsReleaseAge,
    awardScrollReleaseAge,
    awardReleaseAge,
    displayedBattlePoints,
    fanfareRemaining,
    exchangeReleaseAge,
    partyRestored: completed,
    challengeStatus: completed ? "clear" : "won",
    completed,
    ...record,
  };
}

export function advanceFactoryTerminalPresentation(
  state: FactoryTerminalLossPresentationState,
  input: {
    readonly pressedA?: boolean;
    readonly pressedB?: boolean;
    readonly pressedUp?: boolean;
    readonly pressedDown?: boolean;
  },
): FactoryTerminalLossPresentationState;
export function advanceFactoryTerminalPresentation(
  state: FactoryTerminalRoundWonPresentationState,
  input: {
    readonly pressedA?: boolean;
    readonly pressedB?: boolean;
    readonly pressedUp?: boolean;
    readonly pressedDown?: boolean;
  },
): FactoryTerminalRoundWonPresentationState;
export function advanceFactoryTerminalPresentation(
  state: FactoryTerminalPresentationState,
  input: {
    readonly pressedA?: boolean;
    readonly pressedB?: boolean;
    readonly pressedUp?: boolean;
    readonly pressedDown?: boolean;
  },
): FactoryTerminalPresentationState;
export function advanceFactoryTerminalPresentation(
  state: FactoryTerminalPresentationState,
  input: {
    readonly pressedA?: boolean;
    readonly pressedB?: boolean;
    readonly pressedUp?: boolean;
    readonly pressedDown?: boolean;
  },
): FactoryTerminalPresentationState {
  return isFactoryTerminalRoundWon(state)
    ? advanceFactoryTerminalRoundWonPresentation(state, input)
    : advanceFactoryTerminalLossPresentation(state, input);
}

export function factoryTerminalCompletion(
  state: FactoryTerminalPresentationState,
): BattlePresentationCompletion | null {
  return state.completed ? { commandId: state.commandId } : null;
}
