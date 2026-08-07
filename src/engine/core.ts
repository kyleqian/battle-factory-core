// Pure engine core: no DOM, no timers, no Math.random. tick() advances game
// state by exactly one frame given the held buttons; render() draws the
// current state into a 240x160 RGBA buffer. The browser shell (src/main.ts)
// and tools/compare/appTrace.ts both drive this same core.

import type { GbaButton } from "../input.ts";
import {
  ANCHOR_DRAFT_RENTAL_RECORDS,
  MENU_OPTION_OTHERS,
  MENU_OPTION_RENT,
  MENU_OPTION_SUMMARY,
  advanceCursorRedraw,
  advanceMenuHighlightRedraw,
  advanceRentConfirmRedraw,
  applyDeselect,
  applySelect,
  chosenMonSpecies,
  createDraftScreenStateFromRentalRecords,
  cursorMoveStallsBalls,
  isMonsConfirmed,
  moveCursor,
  moveMenuCursor,
  drawYesNoOverlayFaded,
  renderFactoryDraftScreen,
  renderFactoryDraftScreenFaded,
  selectedRentalParty,
  selectMonMessage,
  type DraftScreenState,
} from "./factoryDraftScreen.ts";
import {
  advanceConfirmReveal,
  INITIAL_CONFIRM_REVEAL_STATE,
  INITIAL_YES_NO_CURSOR_POS,
  isRevealStallActive,
  toggleYesNoCursor,
} from "./confirmReveal.ts";
import { INITIAL_KEY_REPEAT_STATE, readKeys, type KeyRepeatState } from "./keyRepeat.ts";
import { advanceMonPic, closeMonPic, isCursorInputReady, isMonPicInputReady, openMonPic } from "./monPic.ts";
import { activateSpeciesNameFade, advanceSpeciesNameFade, deactivateSpeciesNameFade } from "./speciesNameFade.ts";
import { advanceBallAnim, initialBallAnimState } from "./ballAnim.ts";
import { ANCHOR_RNG_VALUE, advanceRngValue } from "./rng.ts";
import { createFramebuffer, fillFramebuffer } from "./framebuffer.ts";
import {
  bgFadeY,
  ENTRY_BLACK_HOLD_TICKS,
  ENTRY_FADE_OUT,
  EXIT_BLACK_HOLD_TICKS,
  EXIT_FADE_OUT,
  FADE_IN,
  objFadeY,
} from "./paletteFade.ts";
import {
  CLOSED_SUMMARY_SCREEN_STATE,
  advanceSummaryScreen,
  openSummaryScreen,
  requestSummaryMonChange,
  requestSummaryMoveSelect,
  requestSummaryMoveSelectClose,
  requestSummaryMoveSelectionChange,
  requestSummaryScreenExit,
  requestSummaryPageChange,
  summaryPageLayerOffsets,
  type SummaryScreenState,
} from "./summaryScreen.ts";
import {
  renderSummaryBattleMovesPage,
  renderSummaryBattleMoveSelectPage,
  renderSummaryContestMovesPage,
  renderSummaryInfoPage,
  renderSummaryInfoPageFaded,
  renderSummaryMonTransition,
  renderSummaryPageCleared,
  renderSummaryPageFaded,
  renderSummaryPageTransition,
  renderSummarySkillsPage,
} from "./summaryInfoPage.ts";
import {
  advancePrebattleRoom,
  INITIAL_PREBATTLE_ROOM_STATE,
  messageBoxVisible,
  visiblePrintedChars,
  EXIT_TO_ROOM_BLACK_HOLD_TICKS,
  WARP_FADE_FROZEN_VISUAL,
  WARP_FADE_OUT,
  walkVisual,
  type PrebattleRoomState,
} from "./prebattleRoom.ts";
import {
  drawMessageBox,
  drawMessageBoxFrame,
  drawMessageBoxFrameFaded,
  drawMessageBoxText,
  drawMessageBoxTextFaded,
  drawStandardWindowFrame,
  drawStandardWindowText,
  renderPrebattleRoomScene,
  renderPrebattleRoomWalkScene,
} from "./prebattleRoomRender.ts";
import {
  advanceBattleRoom,
  battleRoomQuoteInputReady,
  entryStep,
  INITIAL_BATTLE_2_ROOM_STATE,
  INITIAL_BATTLE_ROOM_STATE,
  BATTLE_2_SCENE_HANDOFF_ELAPSED,
  msgboxVisual,
  opponentSetupExtraRngSteps,
  SETTLED_SCENE_ELAPSED,
  WARP_FADE_TO_ROOM_ELAPSED,
  type BattleRoomState,
} from "./battleRoom.ts";
import { renderBattleRoomEntryScene } from "./battleRoomRender.ts";
import { applyBattleTransitionOverlay, exitFadeY } from "./battleTransition.ts";
import {
  actionMenuInputReady,
  advanceBattleScene,
  applyFastFadeToBlack,
  applyTurn17PostwinFastFade,
  battle2PreTurnRngCalls,
  battle2Turn1RngCalls,
  drawBattleResolutionSceneOffFadeMask,
  fastFadeUpdatesForLocalTick,
  INITIAL_BATTLE_SCENE_STATE,
  renderBattleScene,
  renderBattleResolutionForcedPartySelect,
  renderBattleResolutionSceneOffView,
  renderGeneratedBattleCommandPresentation,
  renderGeneratedBattleStartPreSendOut,
  renderSceneOnMovePresentation,
  renderSceneOffTurnView,
  sendOutHandoffTick,
  sendOutPressEligible,
  TICK0 as SCENE_TICK0,
  TURN5_SITRUS_MENU_REOPEN_GATE_DELAY,
  TURN8_MENU_REDRAW_DELAY,
  TURN9_MENU_REDRAW_DELAY,
  TURN10_ROCKSLIDE_MENU_REDRAW_DELAY,
  TURN11_ROCKSLIDE_MENU_REDRAW_DELAY,
  TURN12_ROCKSLIDE_MENU_REDRAW_DELAY,
  TURN13_SWITCHIN_MENU_REDRAW_AFTER_DISMISS,
  TURN14_DRAGONBREATH_MENU_REDRAW_DELAY,
  TURN16_FIRE_PUNCH_MENU_REDRAW_DELAY,
  opponentFaintDismissEligible,
  turn15KoDismissEligible,
  turn17KoDismissEligible,
  turn17LossDismissEligible,
  turn17OutcomeDismissEligible,
  type BattleSceneState,
} from "./battleScene.ts";
import {
  advanceSceneOnMovePresentation,
  type SceneOnMovePresentationState,
} from "../animation/sceneOnPresentation.ts";
import {
  CANONICAL_FORCED_SWITCH_PARTY,
  CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
  partySendOutBattleMenuReady,
} from "./partySelect.ts";
import { CANONICAL_OPPONENT_FLY_RESOLUTION } from "./turn15FlyResolutionAdapter.ts";
import { resolveTurn13LatestCompletedCommandHandoff } from "./turn13ResolutionAdapter.ts";
import {
  createOpponentFaintPresentationOwner,
  opponentFaintContinuationElapsed,
  storeOpponentFaintDismiss,
} from "./opponentFaintPresentationOwner.ts";
import { resolveTurn5LatestCompletedCommandHandoff } from "./turn5ResolutionAdapter.ts";
import { resolveTurn6LatestCompletedCommandHandoff } from "./turn6ResolutionAdapter.ts";
import { resolveTurn7LatestCompletedCommandHandoff } from "./turn7ResolutionAdapter.ts";
import { resolveTurn8LatestCompletedCommandHandoff } from "./turn8ResolutionAdapter.ts";
import { resolveTurn9LatestCompletedCommandHandoff } from "./turn9ResolutionAdapter.ts";
import { resolveTurn10LatestCompletedCommandHandoff } from "./turn10ResolutionAdapter.ts";
import { resolveTurn11LatestCompletedCommandHandoff } from "./turn11ResolutionAdapter.ts";
import { resolveTurn12LatestCompletedCommandHandoff } from "./turn12ResolutionAdapter.ts";
import {
  consumeNextCommandReopenGuard,
  createNextCommandReopenGuard,
  isLatestCompletedCommandHandoffReady,
  isLatestCompletedCommandLifecycleActive,
  latestCompletedCommandPresentationEpoch,
  withNextCommandReopenGuard,
  type LatestCompletedCommandHandoff,
} from "./nextCommandHandoff.ts";
import { isTurn1ChooseActionBounceReset } from "./turn1ChooseActionReset.ts";
import {
  turn1CompletedResolutionNextCommandHandoffFromLatest,
  resolveTurn1LatestCompletedCommandHandoff,
} from "./turn1ResolutionAdapter.ts";
import { isTurn2ChooseActionBounceReset } from "./turn2ChooseActionReset.ts";
import {
  isTurn2LatestCompletedCommandLifecycleActive,
  resolveTurn2LatestCompletedCommandHandoff,
  turn2FightCommandPresentationFromLatest,
} from "./turn2ResolutionAdapter.ts";
import { isTurn3ChooseActionBounceReset } from "./turn3ChooseActionReset.ts";
import {
  isTurn3LatestCompletedCommandLifecycleActive,
  resolveTurn3LatestCompletedCommandHandoff,
  turn3FightCommandPresentationFromLatest,
} from "./turn3ResolutionAdapter.ts";
import { isTurn4ChooseActionBounceReset } from "./turn4ChooseActionReset.ts";
import {
  isTurn4LatestCompletedCommandLifecycleActive,
  resolveTurn4LatestCompletedCommandHandoff,
  turn4FightCommandPresentationFromLatest,
} from "./turn4ResolutionAdapter.ts";
import { CANONICAL_FIRE_PUNCH_RESOLUTION } from "./turn16FirePunchResolutionAdapter.ts";
import {
  advanceBattleSceneForcedPartySelect,
  beginBattleSceneFollowingResolution,
  beginBattleSceneForcedPartySelect,
  createBattleSceneResolutionOwner,
  storeBattleSceneFollowingResolutionMenuRedraw,
} from "./battleSceneResolutionOwner.ts";
import {
  advanceFightSubmenuDisplay,
  closeFightSubmenu,
  CLOSED_FIGHT_SUBMENU_STATE,
  confirmFightMove,
  FIGHT_SUBMENU_CLOSE_DELAY,
  FIGHT_SUBMENU_OPEN_DELAY,
  MENU_DRAW_TICK,
  moveFightCursor,
  openFightSubmenu,
  TURN6_ROCKSLIDE_REOPEN_GATE_DELAY,
  TURN7_ROCKSLIDE_REOPEN_GATE_DELAY,
} from "./battleMenu.ts";
import { activeMonMoveset, createBattleSetup, rentalMoveset, type BattleSetupState } from "./battleSetup.ts";
import { factoryTrainerPresentationForOpponent } from "./factoryTrainerPresentation.ts";
import {
  advancePostwin,
  acceptPostwinContinuation,
  acceptPostwinDialoguePage,
  acceptPostwinHealDismiss,
  acceptPostwinQuestionDismiss,
  acceptPostwinRecordedMessageDismiss,
  createBattleReturnHoldState,
  createPostwinState,
  createPostwinStateFromOpponentRentalRecords,
  createPostwinStateFromRound,
  POSTWIN_BATTLE_ROOM_FADE_OUT_AGE,
  POSTWIN_BATTLE_ROOM_FIRST_AGE,
  POSTWIN_COUNTER_ROOM_FIRST_AGE,
  POSTWIN_HEAL_BOX_AGE,
  POSTWIN_HEAL_LINE1,
  POSTWIN_HEAL_LINE2,
  POSTWIN_NEXT_BOX_CLEAR_DELAY,
  POSTWIN_NEXT_LINE1,
  POSTWIN_NEXT_LINE2,
  POSTWIN_CONTINUATION_MENU_VISIBLE_DELAY,
  POSTWIN_DIALOGUE_OLD_TEXT_END_DELAY,
  POSTWIN_DIALOGUE_BLANK_DELAY,
  POSTWIN_SWAP_MENU_VISIBLE_DELAY,
  POSTWIN_RIGHT_THIS_WAY,
  POSTWIN_IN_BATTLE_CLEAR_AGE,
  POSTWIN_QUESTION_RECORD_TEXT,
  POSTWIN_QUESTION_RETIRE_TEXT,
  POSTWIN_QUESTION_WINDOW_CLEAR_DELAY,
  POSTWIN_RECORDED_BOX_CLEAR_DELAY,
  POSTWIN_RECORDED_TEXT,
  POSTWIN_RETIRE_FADE_FIRST_DELAY,
  POSTWIN_RETIRE_BLACK_AGE_DELAY,
  POSTWIN_RETIRE_FADE_IN_DELAY,
  acceptPostwinSwapDecline,
  beginPostwinNextBattleGuide,
  acceptPostwinRightThisWayDismiss,
  postwinDialogueDelay,
  postwinDialogueInputReady,
  postwinDialogueVisibleChars,
  postwinHealVisibleChars,
  postwinQuestionReprintVisibleChars,
  postwinQuestionVisibleChars,
  postwinQuestionWindowVisible,
  postwinQuestionMenuReady,
  postwinQuestionYesDelay,
  postwinRecordedVisibleChars,
  postwinRecordedInputReady,
  movePostwinContinuationCursor,
  movePostwinSwapCursor,
  movePostwinQuestionCursor,
  acceptPostwinQuestionYes,
  postwinContinuationInputReady,
  postwinNextVisibleChars,
  postwinPhase,
  postwinRightThisWayVisibleChars,
  postwinRightThisWayInputReady,
  postwinRngSteps,
  type PostwinState,
} from "./postwin.ts";
import type { BattleScenario } from "./battleScenario.ts";
import {
  advanceRoundController,
  completeBattlePresentation,
  createRoundController,
  type RoundControllerState,
} from "./roundController.ts";
import {
  advanceStagedBattleTurn,
  type StagedBattleTurnState,
} from "./stagedBattleTurn.ts";
import {
  advanceFactorySwapPresentation,
  beginFactorySwapSummaryReturn,
  createCanonicalFactorySwapPresentation,
  createPendingFactorySwapPresentation,
  factorySwapBallTile,
  factorySwapAcceptExitBgFadeY,
  factorySwapAcceptExitObjFadeY,
  factorySwapQuitExitBgFadeY,
  factorySwapQuitExitObjFadeY,
  factorySwapPlayerOptionBallTile,
  factorySwapSummaryReturnBallTile,
  handleFactorySwapPresentationInput,
  submitFactorySwapRoundDecision,
  type FactorySwapPresentationState,
} from "./factorySwapPresentation.ts";
import { factorySwapRoundDecision } from "./factorySwap.ts";
import { renderFactorySwapPicker } from "./factorySwapRender.ts";
import {
  advanceFactoryTerminalPresentation,
  createFactoryTerminalLossPresentation,
  createFactoryTerminalPresentation,
  FACTORY_LOSS_TERMINAL_PROFILE,
  factoryTerminalCompletion,
  factoryTerminalDeclineBoxGoneAge,
  type FactoryTerminalPresentationState,
} from "./factoryTerminalPresentation.ts";
import {
  advanceFactoryLobbyFreeRoam,
  createFactoryLobbyFreeRoamState,
  type FactoryLobbyFreeRoamState,
  type LobbyDirection,
} from "./factoryLobbyFreeRoam.ts";
import { renderFactoryLobbyFreeRoam } from "./factoryTerminalRender.ts";
import { renderFactoryTerminalPresentation } from "./factoryTerminalRender.ts";
import {
  renderBattlePartySelect,
  type PartySelectCloseRenderAssets,
} from "./battlePartySelect.ts";
import {
  createBattleCommandPresentationRenderView,
} from "./battleCommandPresentationRender.ts";
import type { BattleCommandPresentationState } from "./battleCommandPresentation.ts";
import {
  advanceFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
  advanceFactoryRoundPresentation,
  beginFactoryRoundBattleStartIntro,
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  preGenerateFactoryRoundNextOpponent,
  type FactoryRoundBattleOrchestratorState,
} from "./factoryRoundBattleOrchestrator.ts";
import {
  ANCHOR_BATTLE_1_BATTLE_INIT_RNG_VALUE,
  createFactoryAnchorSession,
} from "./factoryAnchorSession.ts";
import { CANONICAL_DESTIN_PRESENTATION } from "./factoryTrainerPresentation.ts";
import {
  createBattleResolutionPresentationRenderView,
  renderBattleResolutionPresentation,
} from "./battleResolutionPresentationRender.ts";
import {
  createBattleTerminalResolutionPresentation,
  storeBattleTerminalPresentationDismiss,
} from "./battleResolutionPresentation.ts";

/**
 * Builds the source-owned completed-command chain once the turn-4 lifecycle
 * reaches its first generic boundary.  The links are immutable data carried
 * by each receipt; consumption below never discovers an edge from a turn
 * field or a PP value.
 */
function createCanonicalCompletedCommandChain(): LatestCompletedCommandHandoff {
  const retained = resolveTurn13LatestCompletedCommandHandoff();
  const retainedContent = retained.content?.retainedResolution;
  if (retainedContent === undefined) {
    throw new Error("next-command handoff: retained FLY command has no presentation owner");
  }
  const final = withNextCommandReopenGuard(
    retained,
    createNextCommandReopenGuard({
      minimumConfirmElapsed: TURN14_DRAGONBREATH_MENU_REDRAW_DELAY,
      requiredActiveResolutionSegment: retainedContent.segments[0],
      successor: {
        resolutionOwner: createBattleSceneResolutionOwner(
          CANONICAL_OPPONENT_FLY_RESOLUTION.strikeResolution,
        ),
      },
    }),
  );
  const eighth = withNextCommandReopenGuard(
    resolveTurn12LatestCompletedCommandHandoff(),
    createNextCommandReopenGuard({
      minimumConfirmElapsed: 0,
      minimumOpponentFaintContinuationElapsed:
        TURN13_SWITCHIN_MENU_REDRAW_AFTER_DISMISS,
      successor: {
        handoff: final,
        // This is the same immutable charge owner retained by generic
        // content; no independent turn-13 owner is reconstructed here.
        resolutionOwner: retainedContent.owner,
      },
    }),
  );
  const seventh = withNextCommandReopenGuard(
    resolveTurn11LatestCompletedCommandHandoff(),
    createNextCommandReopenGuard({
      minimumConfirmElapsed: TURN12_ROCKSLIDE_MENU_REDRAW_DELAY,
      successor: { handoff: eighth },
    }),
  );
  const sixth = withNextCommandReopenGuard(
    resolveTurn10LatestCompletedCommandHandoff(),
    createNextCommandReopenGuard({
      minimumConfirmElapsed: TURN11_ROCKSLIDE_MENU_REDRAW_DELAY,
      successor: { handoff: seventh },
    }),
  );
  const fifth = withNextCommandReopenGuard(
    resolveTurn9LatestCompletedCommandHandoff(),
    createNextCommandReopenGuard({
      minimumConfirmElapsed: TURN10_ROCKSLIDE_MENU_REDRAW_DELAY,
      successor: { handoff: sixth },
    }),
  );
  const fourth = withNextCommandReopenGuard(
    resolveTurn8LatestCompletedCommandHandoff(),
    createNextCommandReopenGuard({
      minimumConfirmElapsed: TURN9_MENU_REDRAW_DELAY,
      successor: { handoff: fifth },
    }),
  );
  const third = withNextCommandReopenGuard(
    resolveTurn7LatestCompletedCommandHandoff(),
    createNextCommandReopenGuard({
      minimumConfirmElapsed: TURN8_MENU_REDRAW_DELAY,
      successor: { handoff: fourth },
    }),
  );
  const second = withNextCommandReopenGuard(
    resolveTurn6LatestCompletedCommandHandoff(),
    createNextCommandReopenGuard({
      minimumConfirmElapsed: TURN7_ROCKSLIDE_REOPEN_GATE_DELAY,
      successor: { handoff: third },
    }),
  );
  return withNextCommandReopenGuard(
    resolveTurn5LatestCompletedCommandHandoff(),
    createNextCommandReopenGuard({
      minimumConfirmElapsed: TURN6_ROCKSLIDE_REOPEN_GATE_DELAY,
      successor: { handoff: second },
    }),
  );
}

export { SCREEN_WIDTH, SCREEN_HEIGHT } from "./framebuffer.ts";

export type InteractiveBattleRoute =
  | "generated-orchestrator"
  | "canonical-recorded";

export interface EngineState {
  frame: number;
  /** Immutable owner choice, consulted only at the battle-room handoff. */
  appRoute: InteractiveBattleRoute;
  /** Live cursors at each Battle-1 personality-construction burst. */
  battle1OpponentConstructionRngValues: readonly number[];
  draftScreen: DraftScreenState;
  keyRepeat: KeyRepeatState;
  summaryScreen: SummaryScreenState;
  /** null until A-on-YES (S5 final slice); see prebattleRoom.ts. Once set, no input is processed and this owns rendering exclusively - draftScreen still advances its ball anims through the "fadingOut" phase (see tick()'s prebattleRoom branch) since the real sprites aren't torn down until the fade completes. */
  prebattleRoom: PrebattleRoomState | null;
  /** null until prebattleRoom's "warpFade" phase hands off (S6 slice 2a); see battleRoom.ts. Once set, no input is processed and this owns rendering exclusively. */
  battleRoom: BattleRoomState | null;
  /** null until battleRoom's encounter-selected Frontier transition reaches its post-fade black handoff; see battleScene.ts/battleRoom.ts. Once set, no input is processed and this owns rendering exclusively. */
  battleScene: BattleSceneState | null;
  /** Non-null from the accepted Battle-1 loss quote through the counter flow. */
  postwin: PostwinState | null;
  /** Immutable identity/party/moveset selected for the current battle. */
  battleSetup: BattleSetupState | null;
  /** gMain.inBattle-equivalent RNG ownership. */
  rngMode: "vblank" | "frontierBattle";
  /** gRngValue (src/random.c). */
  rngValue: number;
  /** gBattleControllerExecFlags, modeled through Battle 2 choose-action. */
  battleControllerExecFlags: number;
  /**
   * Pure generic round rules, opt-in through createInitialState's scenario
   * injection. The canonical pixel path remains unwired and therefore null.
   */
  roundController: RoundControllerState | null;
  /** Dev-probe staged battle port; null on the ordinary production path. */
  stagedBattleTurn: StagedBattleTurnState | null;
  /** Dev-probe relative Battle Scene ON move presentation. */
  sceneOnPresentation: SceneOnMovePresentationState | null;
  /** Live Factory swap-YES controller + presentation adapter. */
  factorySwap: FactorySwapPresentationState | null;
  /** Source-relative Factory lobby terminal adapter for roundLost. */
  factoryTerminal: FactoryTerminalPresentationState | null;
  /** App-visible generated battle-command route; production installs it after draft. */
  factoryRoundBattleOrchestrator: FactoryRoundBattleOrchestratorState | null;
  /**
   * Walkable Factory Lobby after the LOSS/RETIRE terminal's decline chain
   * completes ("We look forward to your next visit." dismiss, tick 5093 of
   * the loss timeline). Null until that handoff; see factoryLobbyFreeRoam.ts.
   */
  lobbyFreeRoam: FactoryLobbyFreeRoamState | null;
}

/** battleRoom "settled" phase's own elapsed (0 = trace tick 843, see battleTransition.ts) at which core.ts hands off to battleScene.ts - trace tick 1040 (battleScene.ts's own TICK0), the ground-truth trace's own window start. Ticks 1030-1039 are flat black either way (battleTransition's own exit-fade hold and battleScene's own pre-reveal hold render byte-identical solid black), so the exact handoff point within that range is inconsequential to pixels. */
const BATTLE_SCENE_HANDOFF_ELAPSED = SCENE_TICK0 - 843;
/**
 * CB2_InitBattleInternal sets gMain.inBattle after the field transition has
 * handed off to battleScene. RAM pins the final per-VBlank call to scene age
 * 5; subsequent frontier-battle frames advance RNG only on explicit calls.
 */
export const BATTLE_IN_BATTLE_FIRST_ELAPSED = 5;

export interface InitialEngineStateOptions {
  readonly battleScenario?: BattleScenario;
  readonly appRoute?: InteractiveBattleRoute;
}

type FactoryTerminalCommand =
  Parameters<typeof createFactoryTerminalPresentation>[0];

function terminalCommandForRound(
  round: RoundControllerState | null,
): FactoryTerminalCommand | null {
  const command = round?.presentation?.command;
  return command?.type === "roundLost" || command?.type === "roundCompleted"
    ? command
    : null;
}

function pendingFactoryTerminalCommand(
  generated: FactoryRoundBattleOrchestratorState | null,
  legacy: RoundControllerState | null,
): FactoryTerminalCommand | null {
  return terminalCommandForRound(generated?.round ?? null)
    ?? terminalCommandForRound(legacy);
}

const GB_BUTTON_TO_LOBBY_DIR: Readonly<Record<GbaButton, LobbyDirection | null>> = {
  UP: "north",
  DOWN: "south",
  LEFT: "west",
  RIGHT: "east",
  A: null,
  B: null,
  SELECT: null,
  START: null,
  L: null,
  R: null,
};

function lobbyHeldDirections(buttons: ReadonlySet<GbaButton>): ReadonlySet<LobbyDirection> {
  const held = new Set<LobbyDirection>();
  for (const button of buttons) {
    const dir = GB_BUTTON_TO_LOBBY_DIR[button];
    if (dir !== null) held.add(dir);
  }
  return held;
}

export function createInitialState(
  options: InitialEngineStateOptions = {},
): EngineState {
  return {
    frame: 0,
    appRoute: options.appRoute ?? "generated-orchestrator",
    battle1OpponentConstructionRngValues: Object.freeze([]),
    draftScreen: createDraftScreenStateFromRentalRecords(ANCHOR_DRAFT_RENTAL_RECORDS),
    keyRepeat: INITIAL_KEY_REPEAT_STATE,
    summaryScreen: CLOSED_SUMMARY_SCREEN_STATE,
    prebattleRoom: null,
    battleRoom: null,
    battleScene: null,
    postwin: null,
    battleSetup: null,
    rngMode: "vblank",
    rngValue: ANCHOR_RNG_VALUE,
    battleControllerExecFlags: 0,
    roundController: options.battleScenario
      ? createRoundController(options.battleScenario)
      : null,
    stagedBattleTurn: null,
    sceneOnPresentation: null,
    factorySwap: null,
    factoryTerminal: null,
    factoryRoundBattleOrchestrator: null,
    lobbyFreeRoam: null,
  };
}

/**
 * Advance the engine by one frame, reproducing battle_factory_screen.c's
 * Select_Task_HandleChooseMons (cursor mode) / Select_Task_HandleMenu (menu
 * mode) input handling: JOY_REPEAT(LEFT/RIGHT) moves the slot cursor (with
 * wrap), JOY_NEW(A) opens the SUMMARY/RENT/OTHERS menu, JOY_REPEAT(UP/DOWN)
 * moves the menu cursor (with wrap), JOY_NEW(B) closes it back to cursor
 * mode. Ball-open animation timing and SUMMARY/RENT selection are out of
 * scope for this stage (S4/S5).
 */
export function tick(state: EngineState, buttons: ReadonlySet<GbaButton>): EngineState {
  const { newKeys, newAndRepeatedKeys, next: keyRepeat } = readKeys(buttons, state.keyRepeat);
  let draftScreen = state.draftScreen;
  let summaryScreen = advanceSummaryScreen(state.summaryScreen);
  // main.c:366: frontier battles freeze the per-VBlank call. Postwin handles
  // its clear tick and small teardown bursts explicitly below.
  let rngValue =
    state.rngMode === "vblank"
      ? advanceRngValue(state.rngValue)
      : state.rngValue;
  let rngMode = state.rngMode;
  let prebattleRoom: PrebattleRoomState | null = state.prebattleRoom;
  let battleRoom: BattleRoomState | null = state.battleRoom;
  let battleScene: BattleSceneState | null = state.battleScene;
  let postwin: PostwinState | null = state.postwin;
  let battleSetup: BattleSetupState | null = state.battleSetup;
  let battleControllerExecFlags = state.battleControllerExecFlags ?? 0;
  let battle1OpponentConstructionRngValues =
    state.battle1OpponentConstructionRngValues ?? [];
  let roundController = state.roundController;
  let factorySwap = state.factorySwap ?? null;
  let factoryTerminal = state.factoryTerminal;
  let factoryRoundBattleOrchestrator =
    state.factoryRoundBattleOrchestrator;
  const currentTrainerPresentation = factoryTrainerPresentationForOpponent(
    state.factoryRoundBattleOrchestrator?.round.rules.currentOpponent
      ?? state.roundController?.rules.currentOpponent,
  ) ?? undefined;
  const pendingTerminalCommand = pendingFactoryTerminalCommand(
    factoryRoundBattleOrchestrator,
    roundController,
  );
  if (
    factoryTerminal === null &&
    pendingTerminalCommand !== null
  ) {
    factoryTerminal = createFactoryTerminalPresentation(pendingTerminalCommand);
  }

  if (state.factoryRoundBattleOrchestrator?.battleResolutionPresentation) {
    const preAdvanceResolution =
      state.factoryRoundBattleOrchestrator.battleResolutionPresentation;
    factoryRoundBattleOrchestrator = advanceFactoryRoundBattleResolution(
      state.factoryRoundBattleOrchestrator,
      newKeys,
    );
    const generatedRound = factoryRoundBattleOrchestrator.round;
    const generatedCommandType = generatedRound.presentation?.command.type ?? null;
    const generatedPostwin =
      postwin !== null
        ? postwin
        : generatedCommandType === "battleWon"
          ? createPostwinStateFromRound(
              generatedRound,
              createBattleResolutionPresentationRenderView(preAdvanceResolution),
            )
          : generatedCommandType === "roundLost"
              || generatedCommandType === "roundCompleted"
            ? createBattleReturnHoldState(
                createBattleResolutionPresentationRenderView(preAdvanceResolution),
              )
            : postwin;
    const generatedTerminalCommand = terminalCommandForRound(generatedRound);
    const generatedFactoryTerminal =
      factoryTerminal === null && generatedTerminalCommand !== null
        ? createFactoryTerminalPresentation(generatedTerminalCommand)
        : factoryTerminal;
    return {
      ...state,
      frame: state.frame + 1,
      keyRepeat,
      factoryRoundBattleOrchestrator,
      postwin: generatedPostwin,
      factoryTerminal: generatedFactoryTerminal,
      rngMode: "frontierBattle",
      rngValue:
        factoryRoundBattleOrchestrator.battle?.rng.value ?? state.rngValue,
    };
  }

  if (state.factoryRoundBattleOrchestrator?.battleStartIntro) {
    const factoryRoundBattleOrchestrator = advanceFactoryRoundBattleStartIntro(
      state.factoryRoundBattleOrchestrator,
      newKeys,
    );
    const intro = factoryRoundBattleOrchestrator.battleStartIntro;
    return {
      ...state,
      frame: state.frame + 1,
      keyRepeat,
      factoryRoundBattleOrchestrator,
      rngMode:
        intro !== null && intro.elapsed < BATTLE_IN_BATTLE_FIRST_ELAPSED
          ? rngMode
          : "frontierBattle",
      rngValue:
        factoryRoundBattleOrchestrator.battle?.rng.value ?? rngValue,
    };
  }

  if (state.factoryRoundBattleOrchestrator?.battleCommandPresentation) {
    const factoryRoundBattleOrchestrator = advanceFactoryRoundBattleCommand(
      state.factoryRoundBattleOrchestrator,
      newKeys,
    );
    return {
      ...state,
      frame: state.frame + 1,
      keyRepeat,
      factoryRoundBattleOrchestrator,
      rngMode: "frontierBattle",
      rngValue:
        factoryRoundBattleOrchestrator.battle?.rng.value ?? state.rngValue,
    };
  }

  if (state.lobbyFreeRoam) {
    // Free-roam Lobby overworld owns both input and rendering once the
    // terminal decline chain has handed off (factoryLobbyFreeRoam.ts). A/B
    // are no-ops (silent NPCs, no PC, no exit warp — user decisions).
    const lobbyFreeRoam = advanceFactoryLobbyFreeRoam(state.lobbyFreeRoam, {
      heldDirs: lobbyHeldDirections(buttons),
    });
    return {
      ...state,
      frame: state.frame + 1,
      keyRepeat,
      lobbyFreeRoam,
      rngMode: "vblank",
      rngValue,
    };
  }

  if (factoryTerminal) {
    factoryTerminal = advanceFactoryTerminalPresentation(
      factoryTerminal,
      {
        pressedA: newKeys.has("A"),
        pressedB: newKeys.has("B"),
        pressedUp: newKeys.has("UP"),
        pressedDown: newKeys.has("DOWN"),
      },
    );
    const completion = factoryTerminalCompletion(factoryTerminal);
    roundController =
      completion !== null &&
      state.roundController?.presentation?.command.commandId ===
        completion.commandId
        ? completeBattlePresentation(state.roundController, completion)
        : state.roundController;
    if (
      completion !== null &&
      factoryRoundBattleOrchestrator?.round.presentation?.command.commandId ===
        completion.commandId
    ) {
      factoryRoundBattleOrchestrator = completeFactoryRoundPresentation(
        factoryRoundBattleOrchestrator,
        completion,
      );
    }
    // docs/factory-lobby-freeroam-ground-truth.md §2: the decline chain's
    // final dismiss closes the farewell box into the free-roam Lobby field
    // (`closemessage` -> `setvar` -> `releaseall`, tick 5093 of the loss
    // timeline). From that box-gone age the app hands input/rendering to the
    // walkable-lobby overworld (factoryLobbyFreeRoam.ts); until then the
    // terminal presentation still owns the screen.
    const freeRoamBoxGoneAge = factoryTerminalDeclineBoxGoneAge(factoryTerminal);
    const lobbyFreeRoam =
      freeRoamBoxGoneAge !== null && factoryTerminal.age >= freeRoamBoxGoneAge
        ? state.lobbyFreeRoam ?? createFactoryLobbyFreeRoamState()
        : state.lobbyFreeRoam;
    return {
      ...state,
      frame: state.frame + 1,
      keyRepeat,
      // The shared return-to-field span (docs/post-terminal-return-to-lobby-
      // ground-truth.md §3) keeps advancing its own elapsed clock underneath
      // factoryTerminal's own (out-of-this-slice, roundLost/roundCompleted)
      // presentation, exactly as it already does underneath the postwin
      // branch below for WIN -- this branch is the LOSS/roundCompleted
      // sibling of that same requirement (render() prefers this state over
      // factoryTerminal until its own phase reaches "counterRoom").
      postwin: postwin ? advancePostwin(postwin) : postwin,
      factoryTerminal,
      roundController,
      factoryRoundBattleOrchestrator,
      lobbyFreeRoam,
      rngMode: "vblank",
      rngValue,
    };
  }

  if (state.sceneOnPresentation) {
    return {
      ...state,
      frame: state.frame + 1,
      keyRepeat,
      sceneOnPresentation: advanceSceneOnMovePresentation(
        state.sceneOnPresentation,
      ),
      rngMode: "frontierBattle",
    };
  }

  if (state.stagedBattleTurn) {
    const stagedBattleTurn = advanceStagedBattleTurn(
      state.stagedBattleTurn,
      newKeys.has("A"),
    );
    return {
      ...state,
      frame: state.frame + 1,
      keyRepeat,
      stagedBattleTurn,
      rngMode: "frontierBattle",
      rngValue:
        stagedBattleTurn.kernelTransition?.state.rng.value ??
        stagedBattleTurn.presentation?.resolved.state.rngValue ??
        state.rngValue,
      battleControllerExecFlags:
        stagedBattleTurn.phase === "inputReady" ? 1 : 0,
      battleScene: state.battleScene
        ? advanceBattleScene(state.battleScene)
        : state.battleScene,
    };
  }

  if (postwin) {
    let nextPostwin = advancePostwin(postwin);
    if (factorySwap) {
      const returnedToField =
        factorySwap.fieldHandoff === "CB2_ReturnToFieldContinueScript";
      let nextFactorySwap: FactorySwapPresentationState | null =
        advanceFactorySwapPresentation(factorySwap);
      if (factoryRoundBattleOrchestrator !== null) {
        const pending =
          factoryRoundBattleOrchestrator.round.presentation?.command;
        const decision = factorySwapRoundDecision(
          nextFactorySwap.controller,
        );
        if (pending?.type === "swapOffer" && decision !== null) {
          factoryRoundBattleOrchestrator = chooseFactoryRoundSwap(
            completeFactoryRoundPresentation(
              factoryRoundBattleOrchestrator,
              { commandId: pending.commandId },
            ),
            decision,
          );
        }
      } else if (roundController !== null) {
        roundController = submitFactorySwapRoundDecision(
          roundController,
          nextFactorySwap,
        );
      }
      if (
        returnedToField &&
        factoryRoundBattleOrchestrator?.round.presentation?.command.type
          === "swapResolved"
      ) {
        const pending =
          factoryRoundBattleOrchestrator.round.presentation.command;
        factoryRoundBattleOrchestrator = advanceFactoryRoundPresentation(
          completeFactoryRoundPresentation(
            factoryRoundBattleOrchestrator,
            { commandId: pending.commandId },
          ),
        );
        nextPostwin = beginPostwinNextBattleGuide(nextPostwin);
        nextFactorySwap = null;
      }
      if (nextFactorySwap?.controller.phase === "summaryFade") {
        if (
          summaryScreen.onInfoPage &&
          nextFactorySwap.phaseElapsed >= 63 &&
          newKeys.has("B")
        ) {
          summaryScreen = requestSummaryScreenExit(summaryScreen);
          nextFactorySwap = beginFactorySwapSummaryReturn(nextFactorySwap);
        }
      } else if (
        nextFactorySwap !== null &&
        nextFactorySwap.controller.phase !== "summaryReturn"
      ) {
        const directional = (["LEFT", "RIGHT", "UP", "DOWN"] as const)
          .find((button) => newAndRepeatedKeys.has(button));
        const action = (["A", "B"] as const).find((button) => newKeys.has(button));
        if (directional) {
          nextFactorySwap = handleFactorySwapPresentationInput(
            nextFactorySwap,
            directional,
          );
        } else if (action) {
          nextFactorySwap = handleFactorySwapPresentationInput(
            nextFactorySwap,
            action,
          );
        }
        if (
          nextFactorySwap.controller.phase === "summaryFade" &&
          factorySwap.controller.phase === "playerOptions"
        ) {
          summaryScreen = openSummaryScreen(
            nextFactorySwap.controller.cursor,
            {
              mode: "SUMMARY_MODE_NORMAL",
              returnTarget: "factorySwap",
            },
          );
        }
      }
      return {
        ...state,
        frame: state.frame + 1,
        keyRepeat,
        postwin: nextPostwin,
        factorySwap: nextFactorySwap,
        roundController,
        factoryRoundBattleOrchestrator,
        summaryScreen,
        rngMode,
        rngValue,
      };
    }
    if (prebattleRoom) {
      const advancedPrebattleRoom = advancePrebattleRoom(prebattleRoom)!;
      prebattleRoom = advancedPrebattleRoom;
      if (
        advancedPrebattleRoom.phase === "warpFade" &&
        advancedPrebattleRoom.elapsed === WARP_FADE_TO_ROOM_ELAPSED
      ) {
        prebattleRoom = null;
        battleRoom = {
          ...INITIAL_BATTLE_2_ROOM_STATE,
          trainerPresentation: currentTrainerPresentation,
        };
      }
    } else if (battleRoom) {
      if (battleRoomQuoteInputReady(battleRoom) && newKeys.has("A")) {
        battleRoom = {
          ...battleRoom,
          phase: "msgboxClosing",
          elapsed: 0,
        };
      } else {
        battleRoom = advanceBattleRoom(battleRoom);
        for (let i = 0; i < opponentSetupExtraRngSteps(battleRoom); i += 1) {
          rngValue = advanceRngValue(rngValue);
        }
        if (
          battleRoom.phase === "settled" &&
          battleRoom.elapsed === BATTLE_2_SCENE_HANDOFF_ELAPSED
        ) {
          const generatedPending =
            factoryRoundBattleOrchestrator?.round.presentation?.command;
          if (generatedPending?.type === "battleStart") {
            battleRoom = null;
            postwin = null;
            factoryRoundBattleOrchestrator =
              beginFactoryRoundBattleStartIntro(
                factoryRoundBattleOrchestrator!,
              );
          } else if (battleRoom.encounter === "jenson") {
            battleSetup = createBattleSetup(
              draftScreen,
              "jenson",
              nextPostwin.playerPartyHp,
            );
            const trainerPresentation = battleRoom.trainerPresentation;
            battleRoom = null;
            battleScene = {
              ...INITIAL_BATTLE_SCENE_STATE,
              encounter: "jenson",
              trainerPresentation,
              fightSubmenu: {
                ...CLOSED_FIGHT_SUBMENU_STATE,
                activeMonMoveset: battleSetup.activeMonMoveset,
              },
            };
            postwin = null;
          }
        }
      }
    } else if (
      nextPostwin.healDismissElapsed === null &&
      newKeys.has("A")
    ) {
      nextPostwin = acceptPostwinHealDismiss(nextPostwin);
    } else if (
      nextPostwin.swapDeclineElapsed !== null &&
      nextPostwin.rightThisWayDismissElapsed === null &&
      postwinRightThisWayInputReady(postwin) &&
      newKeys.has("A")
    ) {
      nextPostwin = acceptPostwinRightThisWayDismiss(nextPostwin);
      prebattleRoom = { phase: "messageClosing", elapsed: 0 };
    } else if (
      nextPostwin.question !== null &&
      nextPostwin.questionDismissElapsed === null &&
      nextPostwin.questionYesElapsed === null
    ) {
      // RECORD/RETIRE question phase: UP/DOWN move the YES/NO window cursor
      // (default NO), and A resolves the choice -- NO dismisses back to the
      // re-ask, YES takes the branch route (record save / retire warp). The
      // input-ready gate lives inside each reducer (the window must draw).
      if (newAndRepeatedKeys.has("UP")) {
        nextPostwin = movePostwinQuestionCursor(nextPostwin, -1);
      } else if (newAndRepeatedKeys.has("DOWN")) {
        nextPostwin = movePostwinQuestionCursor(nextPostwin, 1);
      } else if (newKeys.has("A")) {
        if (nextPostwin.questionCursorPos === 0) {
          nextPostwin = acceptPostwinQuestionYes(nextPostwin);
        } else {
          nextPostwin = acceptPostwinQuestionDismiss(nextPostwin);
        }
      }
    } else if (
      nextPostwin.question !== null &&
      nextPostwin.questionYesElapsed !== null &&
      nextPostwin.recordedMessageDismissElapsed === null &&
      nextPostwin.question.kind === "record" &&
      postwinRecordedInputReady(nextPostwin) &&
      newKeys.has("A")
    ) {
      // RECORD-YES recorded-message hold: the dismiss-A resolves it back to
      // the continuation menu (the re-ask, which drops RECORD per §7a).
      nextPostwin = acceptPostwinRecordedMessageDismiss(nextPostwin);
    } else if (
      nextPostwin.question === null &&
      postwinContinuationInputReady(nextPostwin)
    ) {
      if (newAndRepeatedKeys.has("DOWN")) {
        nextPostwin = movePostwinContinuationCursor(nextPostwin, 1);
      } else if (newAndRepeatedKeys.has("UP")) {
        nextPostwin = movePostwinContinuationCursor(nextPostwin, -1);
      } else if (newKeys.has("A")) {
        const beforeContinuation = nextPostwin;
        nextPostwin = acceptPostwinContinuation(nextPostwin);
        // Source `AskSwapMon` (`pre-battle-room scripts.inc:137-149`)
        // generates the next opponent before the type/style commentary and
        // the swap offer, so pre-generate at the accepted GO ON edge. The
        // orchestrator seam is idempotent and no-ops on staged canonical
        // postwins, mid-battle rounds, or already-published pendings.
        if (
          beforeContinuation.dialoguePage === 0 &&
          nextPostwin.dialoguePage === 1 &&
          factoryRoundBattleOrchestrator !== null
        ) {
          factoryRoundBattleOrchestrator = preGenerateFactoryRoundNextOpponent(
            factoryRoundBattleOrchestrator,
          );
        }
      }
    }
    if (
      nextPostwin.dialoguePage >= 1 &&
      nextPostwin.dialoguePage <= 3 &&
      postwinDialogueInputReady(nextPostwin) &&
      newKeys.has("A")
    ) {
      const completingBattleWin = nextPostwin.dialoguePage === 3;
      nextPostwin = acceptPostwinDialoguePage(nextPostwin);
      if (completingBattleWin && nextPostwin.dialoguePage === 4) {
        const generatedPending =
          factoryRoundBattleOrchestrator?.round.presentation;
        if (generatedPending?.command.type === "battleWon") {
          factoryRoundBattleOrchestrator = advanceFactoryRoundPresentation(
            completeFactoryRoundPresentation(
              factoryRoundBattleOrchestrator!,
              { commandId: generatedPending.command.commandId },
            ),
          );
        } else if (
          roundController?.presentation?.command.type === "battleWon"
        ) {
          roundController = advanceRoundController(
            completeBattlePresentation(roundController, {
              commandId:
                roundController.presentation.command.commandId,
            }),
          );
        }
      }
    }
    if (
      nextPostwin.dialoguePage === 4 &&
      nextPostwin.swapDeclineElapsed === null &&
      postwinDialogueInputReady(nextPostwin)
    ) {
      if (newAndRepeatedKeys.has("DOWN")) {
        nextPostwin = movePostwinSwapCursor(nextPostwin, 1);
      } else if (newAndRepeatedKeys.has("UP")) {
        nextPostwin = movePostwinSwapCursor(nextPostwin, -1);
      } else if (newKeys.has("A")) {
        if (nextPostwin.swapCursorPos === 0) {
          const liveRound =
            factoryRoundBattleOrchestrator?.round ?? roundController;
          const pendingSwap = liveRound === null
            ? null
            : createPendingFactorySwapPresentation(liveRound);
          if (
            factoryRoundBattleOrchestrator !== null
            && pendingSwap === null
          ) {
            throw new Error(
              "generated postwin YES requires its orchestrator swapOffer",
            );
          }
          factorySwap =
            pendingSwap ?? createCanonicalFactorySwapPresentation();
        } else {
          nextPostwin = acceptPostwinSwapDecline(nextPostwin);
          const pending =
            factoryRoundBattleOrchestrator?.round.presentation?.command;
          if (pending?.type === "swapOffer") {
            factoryRoundBattleOrchestrator = chooseFactoryRoundSwap(
              completeFactoryRoundPresentation(
                factoryRoundBattleOrchestrator!,
                { commandId: pending.commandId },
              ),
              { type: "decline" },
            );
            const resolved =
              factoryRoundBattleOrchestrator.round.presentation?.command;
            if (resolved?.type !== "swapResolved") {
              throw new Error(
                "generated postwin NO must publish swapResolved",
              );
            }
            factoryRoundBattleOrchestrator =
              advanceFactoryRoundPresentation(
                completeFactoryRoundPresentation(
                  factoryRoundBattleOrchestrator,
                  { commandId: resolved.commandId },
                ),
              );
          }
        }
      }
    }
    // The generic VBlank call above already supplied one step after the
    // mode has resumed. Before the clear tick it supplied none.
    const totalSteps = postwinRngSteps(
      nextPostwin.elapsed,
      nextPostwin.continuationConfirmElapsed,
      nextPostwin.rightThisWayDismissElapsed,
    );
    const alreadyAdvanced = rngMode === "vblank" ? 1 : 0;
    for (let i = alreadyAdvanced; i < totalSteps; i += 1) {
      rngValue = advanceRngValue(rngValue);
    }
    if (
      postwin !== null &&
      nextPostwin.elapsed >= POSTWIN_IN_BATTLE_CLEAR_AGE
    ) {
      rngMode = "vblank";
      battleScene = null;
    }
    return {
      ...state,
      frame: state.frame + 1,
      draftScreen,
      keyRepeat,
      summaryScreen,
      prebattleRoom,
      battleRoom,
      battleScene,
      postwin: postwin === null ? null : nextPostwin,
      battleSetup,
      rngMode,
      rngValue,
      factorySwap,
      roundController,
      factoryRoundBattleOrchestrator,
    };
  }

  if (battleScene) {
    // S6 send-out slice: the only input this window ever reads is A-press
    // #3 (trace tick 1420, docs/battle-scene-notes.md §7.2) during the idle
    // "would like to battle!♥" hold - captured directly into the flat
    // `elapsed` state (battleScene.ts module doc), not a phase transition.
    if (battleScene.sendOutPressElapsed === null && newKeys.has("A") && sendOutPressEligible(SCENE_TICK0 + battleScene.elapsed)) {
      battleScene = { ...battleScene, sendOutPressElapsed: battleScene.elapsed };
    }
    // The faint-text controller publishes its typed owner at the settled
    // input-ready boundary. A fresh A then atomically retains the accepted
    // edge, frozen cursor, and automatic opponent switch-in continuation.
    const nextSceneElapsed = battleScene.elapsed + 1;
    if (
      battleScene.opponentFaintPresentationOwner === null
      && opponentFaintDismissEligible(SCENE_TICK0 + nextSceneElapsed)
    ) {
      battleScene = {
        ...battleScene,
        opponentFaintPresentationOwner: createOpponentFaintPresentationOwner(),
      };
    }
    const opponentFaintOwner = battleScene.opponentFaintPresentationOwner;
    if (opponentFaintOwner !== null && newKeys.has("A")) {
      const storedOwner = storeOpponentFaintDismiss(opponentFaintOwner, nextSceneElapsed);
      if (storedOwner !== opponentFaintOwner) {
        battleScene = { ...battleScene, opponentFaintPresentationOwner: storedOwner };
      }
    }
    const resolutionOwner = battleScene.resolutionOwner ?? null;
    const forcedPartySelect = resolutionOwner?.forcedPartySelect ?? null;
    if (
      resolutionOwner !== null &&
      resolutionOwner.resolution.forcedRequest !== null &&
      forcedPartySelect === null &&
      newKeys.has("A") &&
      turn15KoDismissEligible(SCENE_TICK0 + battleScene.elapsed + 1)
    ) {
      battleScene = {
        ...battleScene,
        resolutionOwner: beginBattleSceneForcedPartySelect(
          resolutionOwner,
          CANONICAL_FORCED_SWITCH_RENTAL_RECORDS,
          CANONICAL_FORCED_SWITCH_PARTY,
        ),
      };
    } else if (resolutionOwner !== null && forcedPartySelect !== null) {
      const previousParty = forcedPartySelect;
      const nextOwner = advanceBattleSceneForcedPartySelect(
        resolutionOwner,
        newKeys,
      );
      const nextParty = nextOwner.forcedPartySelect!;
      // The completed SEND OUT creates a fresh PlayerHandleChooseAction
      // controller. Reset the stale, already-confirmed turn-15 submenu at
      // that relative boundary and carry MAGBY's real moveset into the
      // ordinary FIGHT reducer. This is keyed only to the SEND OUT clock:
      // delaying confirmation moves the handoff with it.
      const fightSubmenu =
        previousParty.sendOutElapsed !== null &&
        nextParty.sendOutElapsed !== null &&
        !partySendOutBattleMenuReady(previousParty.sendOutElapsed) &&
        partySendOutBattleMenuReady(nextParty.sendOutElapsed)
          ? { ...CLOSED_FIGHT_SUBMENU_STATE, activeMonMoveset: rentalMoveset("MAGBY") }
          : battleScene.fightSubmenu;
      battleScene = {
        ...battleScene,
        fightSubmenu,
        resolutionOwner: nextOwner,
      };
    }
    // Turn 17's opponent-faint text is a genuine input gate.  Register only
    // a fresh A edge after the confirmation-relative wait-cursor epoch; an
    // early edge is dropped, and idle time alone can never dismiss it.
    if (
      battleScene.terminalResolution !== null &&
      battleScene.terminalResolution !== undefined &&
      battleScene.terminalResolution.faintDismissElapsed === null &&
      newKeys.has("A") &&
      turn17KoDismissEligible(
        battleScene.elapsed + 1,
        battleScene.terminalResolution.confirmElapsed,
      )
    ) {
      const terminalResolution = storeBattleTerminalPresentationDismiss(
        battleScene.terminalResolution,
        "faint",
        battleScene.elapsed + 1,
      );
      battleScene = {
        ...battleScene,
        terminalResolution,
      };
    }
    // The frontier-win printstring is a second, independent input gate.
    // Store its real A edge once; rendering freezes that exact cursor pose
    // until the trainer-slide controller becomes visible.
    if (
      battleScene.terminalResolution?.faintDismissElapsed !== null &&
      battleScene.terminalResolution?.faintDismissElapsed !== undefined &&
      battleScene.terminalResolution.resultDismissElapsed === null &&
      newKeys.has("A") &&
      turn17OutcomeDismissEligible(
        battleScene.elapsed + 1,
        battleScene.terminalResolution.faintDismissElapsed,
        battleScene.trainerPresentation,
      )
    ) {
      const terminalResolution = storeBattleTerminalPresentationDismiss(
        battleScene.terminalResolution,
        "result",
        battleScene.elapsed + 1,
      );
      battleScene = {
        ...battleScene,
        terminalResolution,
      };
    }
    // DESTIN's expanded Easy Chat quote ends in PAUSE_UNTIL_PRESS. Unlike
    // the prior battle printers this wait draws no cursor, but it remains a
    // genuine one-shot A gate. The accepted edge starts every postwin clock.
    if (
      battleScene.terminalResolution?.resultDismissElapsed !== null &&
      battleScene.terminalResolution?.resultDismissElapsed !== undefined &&
      battleScene.terminalResolution.lossDismissElapsed === null &&
      newKeys.has("A") &&
      turn17LossDismissEligible(
        battleScene.elapsed + 1,
        battleScene.terminalResolution.resultDismissElapsed,
        battleScene.trainerPresentation,
      )
    ) {
      const terminalResolution = storeBattleTerminalPresentationDismiss(
        battleScene.terminalResolution,
        "loss",
        battleScene.elapsed + 1,
      );
      battleScene = {
        ...battleScene,
        terminalResolution,
      };
      const opponentRecords =
        state.roundController?.rules.currentOpponent.rentalRecords;
      postwin = opponentRecords === undefined
        ? createPostwinState()
        : createPostwinStateFromOpponentRentalRecords(opponentRecords);
      battleScene = advanceBattleScene(battleScene);
      return {
        ...state,
        frame: state.frame + 1,
        draftScreen,
        keyRepeat,
        summaryScreen,
        prebattleRoom,
        battleRoom,
        battleScene,
        postwin,
        rngMode,
        rngValue,
      };
    }
    // S7 FIGHT-submenu slice (docs/battle-turn-notes.md §11): the settled
    // action menu's own A-press opens it (FIGHT presumed already
    // highlighted - this engine doesn't model the action menu's own BAG/
    // POKéMON/RUN cursor, out of §11's own scope); nav is JOY_NEW-gated
    // only, no auto-repeat (finding 2, empirically confirmed via the
    // held-DOWN check); B starts the close. The 1-tick display lag must
    // catch up BEFORE this tick's own input is applied (see
    // `advanceFightSubmenuDisplay`'s own doc) - hence this runs before the
    // input checks below, not after.
    const priorFightConfirmElapsed = battleScene.fightSubmenu.confirmElapsed;
    let fightSubmenu = advanceFightSubmenuDisplay(battleScene.fightSubmenu);
    // `battleScene.elapsed` here is still this tick's PRE-increment value
    // (advanceBattleScene hasn't run yet) - the trace tick this tick's own
    // input is read on is one past that (`+1`), same convention `render`'s
    // own `t = TICK0 + elapsed` uses post-increment. `sendOutPressElapsed`
    // above stores the pre-increment value instead (an established, if
    // inconsistent, convention this slice doesn't touch) - kept independent
    // here since `FIGHT_SUBMENU_OPEN_DELAY`/`FIGHT_SUBMENU_CLOSE_DELAY` are
    // pixel-fit directly against the true press tick and would otherwise be
    // off by one (found empirically this session: the app opened/closed
    // exactly 1 tick early against the oracle until this was corrected).
    const sceneT = SCENE_TICK0 + battleScene.elapsed + 1;
    const battle2HandoffTick =
      battleScene.encounter === "jenson" && battleScene.sendOutPressElapsed !== null
        ? sendOutHandoffTick(
            SCENE_TICK0 + battleScene.sendOutPressElapsed,
            battleScene.encounter,
            battleScene.trainerPresentation,
          )
        : null;
    const partySendOutElapsed = battleScene.resolutionOwner
      ?.forcedPartySelect?.sendOutElapsed;
    const currentActiveMoveset = () =>
      partySendOutElapsed !== null &&
      partySendOutElapsed !== undefined &&
      partySendOutBattleMenuReady(partySendOutElapsed)
        ? fightSubmenu.activeMonMoveset
        : activeMonMoveset(draftScreen);
    let latestCompletedCommandHandoff = battleScene.latestCompletedCommandHandoff ?? null;
    let lockedActionOwner = battleScene.resolutionOwner ?? null;
    let terminalResolution = battleScene.terminalResolution ?? null;
    const opponentFaintContinuationAge = opponentFaintContinuationElapsed(
      battleScene.opponentFaintPresentationOwner,
      battleScene.elapsed + 1,
    );
    const genericReopenTransition = latestCompletedCommandHandoff?.reopenGuard === undefined
      ? null
      : consumeNextCommandReopenGuard(
        latestCompletedCommandHandoff.reopenGuard,
        lockedActionOwner,
        fightSubmenu,
        newKeys,
        battleScene.elapsed + 1,
        opponentFaintContinuationAge,
      );
    if (
      latestCompletedCommandHandoff === null
      && isTurn1ChooseActionBounceReset(
        fightSubmenu.confirmElapsed,
        battleScene.elapsed + 1,
      )
    ) {
      // The first completed-command receipt is published at the real
      // HandleInputChooseAction -> DoBounceEffect reset, not at the later A
      // that opens FIGHT. Its semantic epoch content remains immutable
      // through every B-close/A-reopen cycle before turn 2.
      latestCompletedCommandHandoff = resolveTurn1LatestCompletedCommandHandoff(
        battleScene.elapsed + 1,
      );
    }
    if (
      turn2FightCommandPresentationFromLatest(latestCompletedCommandHandoff) === null
      && turn1CompletedResolutionNextCommandHandoffFromLatest(latestCompletedCommandHandoff) !== null
      && isLatestCompletedCommandLifecycleActive(
        latestCompletedCommandHandoff,
        fightSubmenu.openElapsed,
      )
      && isTurn2ChooseActionBounceReset(
        fightSubmenu.confirmElapsed,
        battleScene.elapsed + 1,
      )
    ) {
      latestCompletedCommandHandoff = resolveTurn2LatestCompletedCommandHandoff(
        battleScene.elapsed + 1,
      );
    }
    if (
      turn3FightCommandPresentationFromLatest(latestCompletedCommandHandoff) === null
      && isTurn2LatestCompletedCommandLifecycleActive(
        latestCompletedCommandHandoff,
        fightSubmenu.openElapsed,
      )
      && isTurn3ChooseActionBounceReset(
        fightSubmenu.confirmElapsed,
        battleScene.elapsed + 1,
      )
    ) {
      latestCompletedCommandHandoff = resolveTurn3LatestCompletedCommandHandoff(
        battleScene.elapsed + 1,
      );
    }
    if (
      turn4FightCommandPresentationFromLatest(latestCompletedCommandHandoff) === null
      && isTurn3LatestCompletedCommandLifecycleActive(
        latestCompletedCommandHandoff,
        fightSubmenu.openElapsed,
      )
      && isTurn4ChooseActionBounceReset(
        fightSubmenu.confirmElapsed,
        battleScene.elapsed + 1,
      )
    ) {
      latestCompletedCommandHandoff = resolveTurn4LatestCompletedCommandHandoff(
        battleScene.elapsed + 1,
        latestCompletedCommandHandoff!,
      );
    }
    if (fightSubmenu.openElapsed === null) {
      const actionReady = battle2HandoffTick === null
        ? sceneT >= MENU_DRAW_TICK
        : actionMenuInputReady(sceneT, battle2HandoffTick);
      if (newKeys.has("A") && actionReady) {
        // S8 engine dependency (docs/battle-menu-notes.md §13c): the FIGHT
        // submenu's moveset is derived fresh from the draft screen's own
        // confirmed rental picks (`draftScreen` is untouched by this branch,
        // so this is stable/idempotent across the whole battle) instead of
        // a battle-1-fixed literal.
        fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, currentActiveMoveset());
      }
    } else if (
      fightSubmenu.closeElapsed === null &&
      fightSubmenu.confirmElapsed === null &&
      sceneT >= SCENE_TICK0 + fightSubmenu.openElapsed + FIGHT_SUBMENU_OPEN_DELAY
    ) {
      // S7 slice A (docs/battle-turn-notes.md §9's 2nd A press, battleMenu.ts's
      // new Slice 7): A on the highlighted move hands off to turn kickoff -
      // once confirmed, `HandleInputChooseMove` is no longer the active
      // controller function (source-confirmed, battleMenu.ts's own Slice 7
      // doc), so no further input (nav, B) is read at all - matching that,
      // this whole branch's own guard excludes `confirmElapsed !== null`
      // above rather than re-checking it per input case. Gated to cursor 0
      // (ROCK_SLIDE, turn 1), 1 (BIND, turn 8, S7 slice P), or 2
      // (DRAGON_BREATH, turn 2, S7 slice E1) - the only three moves this
      // trace's own oracle ground truth covers; SANDSTORM's own confirm
      // timing/text is unverified and out of scope.
      if (newKeys.has("A") && (fightSubmenu.cursor === 0 || fightSubmenu.cursor === 1 || fightSubmenu.cursor === 2)) {
        fightSubmenu = confirmFightMove(fightSubmenu, battleScene.elapsed + 1);
      } else if (newKeys.has("B")) {
        fightSubmenu = closeFightSubmenu(fightSubmenu, battleScene.elapsed + 1);
      } else if (newKeys.has("LEFT")) {
        fightSubmenu = { ...fightSubmenu, cursor: moveFightCursor(fightSubmenu.cursor, "LEFT") };
      } else if (newKeys.has("RIGHT")) {
        fightSubmenu = { ...fightSubmenu, cursor: moveFightCursor(fightSubmenu.cursor, "RIGHT") };
      } else if (newKeys.has("UP")) {
        fightSubmenu = { ...fightSubmenu, cursor: moveFightCursor(fightSubmenu.cursor, "UP") };
      } else if (newKeys.has("DOWN")) {
        fightSubmenu = { ...fightSubmenu, cursor: moveFightCursor(fightSubmenu.cursor, "DOWN") };
      }
    } else if (
      fightSubmenu.closeElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.closeElapsed + FIGHT_SUBMENU_CLOSE_DELAY
    ) {
      // ISSUES #25 fix: a B-close (`closeElapsed !== null`) used to strand
      // the submenu forever - no other branch's guard could ever fire again
      // (branch 1 needs `openElapsed === null`; the nav branch above needs
      // `closeElapsed === null`; every turn-epoch branch below needs
      // `confirmElapsed !== null`, never set on a B-close). Oracle-proven
      // (docs/battle-menu-notes.md §ISSUES-25): once the close redraw's own
      // round-trip settles (same `FIGHT_SUBMENU_CLOSE_DELAY` gate the resumed
      // action menu's own redraw uses), a fresh A-press reopens FIGHT again -
      // at EVERY turn epoch, not just before the first confirm, and without
      // advancing any `turnNResolved` flag (this is a same-epoch reopen, not
      // a turn boundary). `gMoveSelectionCursor` is real per-battler RAM
      // state that persists across close/reopen exactly as it already
      // persists across turns (the turn-3 reopen below passes its own
      // literal `initialCursor` for the same reason) - modeled generically
      // here by threading the CURRENT (never-reset) `fightSubmenu.cursor`
      // through instead of a literal, rather than special-casing "closed"
      // cursor state separately.
      //
      // `+2` (not the usual `+1` press-tick convention every other
      // `openFightSubmenu` call site here uses): oracle-probed dense against
      // `tools/compare/traces/fight-submenu-reopen.json` (docs/battle-menu-
      // notes.md §ISSUES-25) - this specific reopen's own DMA-wait redraw is
      // pixel-confirmed to land exactly ONE TICK LATER than
      // `FIGHT_SUBMENU_OPEN_DELAY` alone predicts from the true press tick
      // (revealed at pressTick+6, not +5 - the plain `+1` encoding
      // mismatched by a full-frame 7280px/19% diff at the wrong tick,
      // 0 diff once corrected). Unlike the first open / turn-epoch reopens
      // (which re-enter FIGHT from a genuinely fresh `PlayerHandleChooseAction`
      // call after a whole turn's engine processing), this reopen fires while
      // still mid-poll inside the settled action menu's own continuously-live
      // `HandleInputChooseAction` - plausibly a real extra tick of input-
      // buffering latency specific to that path, not proven from source.
      // Encoding the extra tick into `openElapsed` itself (rather than a
      // second reveal-delay constant) delays both consumers of `openElapsed`
      // - the render's `revealTick` and the nav-input gate above - in
      // lockstep, matching what the oracle actually shows for both.
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 2, currentActiveMoveset(), fightSubmenu.cursor, true);
    } else if (
      !isLatestCompletedCommandLifecycleActive(
        latestCompletedCommandHandoff,
        fightSubmenu.openElapsed,
      ) &&
      isLatestCompletedCommandHandoffReady(latestCompletedCommandHandoff)
      && turn1CompletedResolutionNextCommandHandoffFromLatest(
        latestCompletedCommandHandoff,
      ) !== null
      && latestCompletedCommandPresentationEpoch(latestCompletedCommandHandoff) !== null
      &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A")
    ) {
      // S7 slice E1 (docs/battle-turn-notes.md §12): turn 1's whole
      // resolution has redrawn the settled action menu by now
      // (`ROCK_SLIDE_MENU_REDRAW_DELAY` past its own confirm) - a fresh
      // A-press reopens FIGHT for turn 2, same generic `openFightSubmenu`
      // turn 1's own first open used (cursor rests at slot 0, matching the
      // ground truth: turn 1's own rest was also slot 0 - see
      // `openFightSubmenu`'s own doc for the caveat this doesn't generalize
      // cursor persistence beyond that coincidence).
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen));
    } else if (
      !isLatestCompletedCommandLifecycleActive(
        latestCompletedCommandHandoff,
        fightSubmenu.openElapsed,
      ) &&
      turn2FightCommandPresentationFromLatest(latestCompletedCommandHandoff) !== null &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A")
    ) {
      // The source-owned turn-2 receipt makes the settled action menu ready;
      // this later A only opens the turn-3 command lifecycle. Its submenu
      // (including same-turn B-close/A-reopen) consumes the immutable 2197
      // presentation epoch rather than publishing a replacement.
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen), 2);
    } else if (
      !isLatestCompletedCommandLifecycleActive(
        latestCompletedCommandHandoff,
        fightSubmenu.openElapsed,
      ) &&
      turn3FightCommandPresentationFromLatest(latestCompletedCommandHandoff) !== null &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A")
    ) {
      // The source-owned turn-3 receipt makes the settled action menu ready;
      // this later A only opens the turn-4 command lifecycle. Its submenu
      // (including same-turn B-close/A-reopen) consumes the immutable 3172
      // presentation epoch rather than publishing a replacement.
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen));
    } else if (
      !isLatestCompletedCommandLifecycleActive(
        latestCompletedCommandHandoff,
        fightSubmenu.openElapsed,
      ) &&
      turn4FightCommandPresentationFromLatest(latestCompletedCommandHandoff) !== null &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A")
    ) {
      // The source-owned turn-4 receipt makes the settled menu ready. This
      // later A only opens the turn-5 command lifecycle and retains the
      // immutable epoch through any B-close/A-reopen cycle.
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen));
    } else if (
      isTurn4LatestCompletedCommandLifecycleActive(
        latestCompletedCommandHandoff,
        fightSubmenu.openElapsed,
      ) &&
      // The turn-1 generic receipt carries an optional presentation epoch;
      // that typed content is the staged early-boundary form and is replaced
      // here by the first 5-13 guard-owned receipt. A later generic receipt
      // has no such epoch and can never re-enter this legacy 4->5 boundary.
      (latestCompletedCommandHandoff === null
        || latestCompletedCommandPresentationEpoch(latestCompletedCommandHandoff) !== null) &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN5_SITRUS_MENU_REOPEN_GATE_DELAY
    ) {
      // The first generic owner is published only at the real settled edge
      // that formerly created the turn-5 receipt.  Its own guard carries
      // every following reopen, so the core never resumes a turn-keyed
      // predecessor/successor ladder after this point.
      latestCompletedCommandHandoff = createCanonicalCompletedCommandChain();
      fightSubmenu = openFightSubmenu(
        battleScene.elapsed + 1,
        activeMonMoveset(draftScreen),
        latestCompletedCommandHandoff.persistedMoveSlot,
      );
    } else if (genericReopenTransition !== null) {
      const successor = genericReopenTransition.handoff ?? latestCompletedCommandHandoff!;
      fightSubmenu = openFightSubmenu(
        battleScene.elapsed + 1,
        currentActiveMoveset(),
        successor.persistedMoveSlot,
      );
      latestCompletedCommandHandoff = successor;
      lockedActionOwner = genericReopenTransition.resolutionOwner;
    } else if (
      lockedActionOwner !== null &&
      lockedActionOwner.followingPresentation !== null &&
      lockedActionOwner.followingPresentation.menuRedrawElapsed === null &&
      partySendOutElapsed !== null &&
      partySendOutElapsed !== undefined &&
      partySendOutBattleMenuReady(partySendOutElapsed) &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN16_FIRE_PUNCH_MENU_REDRAW_DELAY
    ) {
      // Turn 16's confirmation-relative FIRE_PUNCH/burn tail has created a
      // fresh action controller. Preserve that redraw anchor - on the fresh
      // submenu itself, since it must survive until THIS submenu's own
      // confirmation seeds the terminal resolution below - before replacing
      // the old confirmed submenu with turn 17's own state.
      const menuRedrawElapsed =
        fightSubmenu.confirmElapsed + TURN16_FIRE_PUNCH_MENU_REDRAW_DELAY;
      fightSubmenu = openFightSubmenu(
        battleScene.elapsed + 1,
        fightSubmenu.activeMonMoveset,
        fightSubmenu.cursor,
        false,
      );
      lockedActionOwner = storeBattleSceneFollowingResolutionMenuRedraw(
        lockedActionOwner,
        menuRedrawElapsed,
      );
    }
    if (
      lockedActionOwner !== null
      && lockedActionOwner.followingPresentation === null
      && lockedActionOwner.forcedPartySelect !== null
      && lockedActionOwner.forcedPartySelect.sendOutElapsed !== null
      && partySendOutElapsed !== null
      && partySendOutElapsed !== undefined
      && partySendOutBattleMenuReady(partySendOutElapsed)
      && priorFightConfirmElapsed === null
      && fightSubmenu.confirmElapsed !== null
    ) {
      lockedActionOwner = beginBattleSceneFollowingResolution(
        lockedActionOwner,
        CANONICAL_FIRE_PUNCH_RESOLUTION.resolution,
        fightSubmenu.confirmElapsed,
      );
    }
    const followingPresentation = lockedActionOwner?.followingPresentation ?? null;
    if (
      terminalResolution === null
      && followingPresentation?.menuRedrawElapsed !== null
      && followingPresentation?.menuRedrawElapsed !== undefined
      && priorFightConfirmElapsed === null
      && fightSubmenu.confirmElapsed !== null
    ) {
      const trainer = currentTrainerPresentation ?? {
        className: "BUG CATCHER",
        name: "DESTIN",
        speechLose: ["PLEASE I NEED", "SOME WATER"] as const,
      };
      terminalResolution = createBattleTerminalResolutionPresentation({
        pendingBoundary: Object.freeze({
          kind: "terminal" as const,
          outcome: "player-win" as const,
        }),
        resultLines: [
          "Player defeated",
          `${trainer.className} ${trainer.name}!`,
        ],
        opponentLossLines: trainer.speechLose,
        confirmElapsed: fightSubmenu.confirmElapsed,
        menuRedrawElapsed: followingPresentation.menuRedrawElapsed,
      });
    }
    battleScene = {
      ...battleScene,
      fightSubmenu,
      latestCompletedCommandHandoff,
      resolutionOwner: lockedActionOwner,
      terminalResolution,
    };
    const previousBattle2RngCalls = battle2HandoffTick === null
      ? 0
      : battle2PreTurnRngCalls(sceneT - 1, battle2HandoffTick);
    const nextBattle2RngCalls = battle2HandoffTick === null
      ? 0
      : battle2PreTurnRngCalls(sceneT, battle2HandoffTick);
    for (let i = previousBattle2RngCalls; i < nextBattle2RngCalls; i += 1) {
      rngValue = advanceRngValue(rngValue);
    }
    if (
      battle2HandoffTick !== null &&
      battleScene.encounter === "jenson" &&
      battleScene.fightSubmenu.confirmElapsed !== null
    ) {
      const confirmTick =
        SCENE_TICK0 + battleScene.fightSubmenu.confirmElapsed;
      const previousTurnCalls = battle2Turn1RngCalls(sceneT - 1, confirmTick);
      const nextTurnCalls = battle2Turn1RngCalls(sceneT, confirmTick);
      for (let i = previousTurnCalls; i < nextTurnCalls; i += 1) {
        rngValue = advanceRngValue(rngValue);
      }
    }
    if (
      battle2HandoffTick !== null &&
      actionMenuInputReady(sceneT, battle2HandoffTick)
    ) {
      battleControllerExecFlags = 1;
    }
    battleScene = advanceBattleScene(battleScene);
    if (
      rngMode === "vblank" &&
      battleScene.elapsed >= BATTLE_IN_BATTLE_FIRST_ELAPSED
    ) {
      rngMode = "frontierBattle";
    }
    return {
      ...state,
      frame: state.frame + 1,
      draftScreen,
      keyRepeat,
      summaryScreen,
      prebattleRoom,
      battleRoom,
      battleScene,
      postwin,
      rngMode,
      rngValue,
      battleControllerExecFlags,
    };
  }

  if (battleRoom) {
    // S6 slice 2c: msgboxIdle's own A-press gate - the only input this
    // window ever reads (ticks 520-717 are input-free, see battleRoom.ts's
    // own "entering" phase doc). Same idiom as prebattleRoom.ts's own
    // "idle" -> "messageClosing" gate: created directly (not via
    // advanceBattleRoom) so this same tick already reflects it - see
    // battleRoom.ts's §8.3 doc for the close-latency derivation.
    if (battleRoomQuoteInputReady(battleRoom) && newKeys.has("A")) {
      battleRoom = { ...battleRoom, phase: "msgboxClosing", elapsed: 0 };
    } else {
      battleRoom = advanceBattleRoom(battleRoom);
      const extraRngSteps = opponentSetupExtraRngSteps(battleRoom);
      if (extraRngSteps > 1 && battleRoom.encounter !== "jenson") {
        battle1OpponentConstructionRngValues = Object.freeze([
          ...battle1OpponentConstructionRngValues,
          rngValue,
        ]);
      }
      for (let i = 0; i < extraRngSteps; i += 1) {
        rngValue = advanceRngValue(rngValue);
      }
      // S6 scene-assembly handoff (battleScene.ts doc): the CIRCLES_MEET
      // transition's own post-fade black hold ("settled" phase) is
      // indefinite on its own - this is the fixed elapsed count matching
      // the ground-truth trace's own window start (trace tick 1040).
      if (battleRoom?.phase === "settled" && battleRoom.elapsed === BATTLE_SCENE_HANDOFF_ELAPSED) {
        if (state.appRoute === "generated-orchestrator") {
          if (battle1OpponentConstructionRngValues.length !== 3) {
            throw new Error(
              "generated-orchestrator route requires three live construction cursors",
            );
          }
          const playerRentalRecords = selectedRentalParty(draftScreen);
          const savedRentalRecords = draftScreen.rentals.map(
            ({ source }) => source,
          );
          const roomTrainer =
            battleRoom.trainerPresentation ?? CANONICAL_DESTIN_PRESENTATION;
          battleRoom = null;
          return {
            ...state,
            frame: state.frame + 1,
            draftScreen,
            keyRepeat,
            summaryScreen,
            prebattleRoom,
            battleRoom,
            battleScene: null,
            battleSetup: null,
            factoryRoundBattleOrchestrator: beginFactoryRoundBattleStartIntro(
              createFactoryAnchorSession({
                playerRentalRecords,
                savedRentalRecords,
                roomTrainer,
                constructionRngValues:
                  battle1OpponentConstructionRngValues as unknown as readonly [
                    number, number, number,
                  ],
                freshBattleRngValue: ANCHOR_BATTLE_1_BATTLE_INIT_RNG_VALUE,
              }),
            ),
            battle1OpponentConstructionRngValues,
            rngMode,
            rngValue,
          };
        } else {
          battleSetup = createBattleSetup(draftScreen, battleRoom.encounter ?? "destin");
          const trainerPresentation = battleRoom.trainerPresentation;
          battleRoom = null;
          battleScene = {
            ...INITIAL_BATTLE_SCENE_STATE,
            encounter: battleSetup.encounter,
            trainerPresentation,
            fightSubmenu: {
              ...CLOSED_FIGHT_SUBMENU_STATE,
              activeMonMoveset: battleSetup.activeMonMoveset,
            },
          };
        }
      }
    }
    return { ...state, frame: state.frame + 1, draftScreen, keyRepeat, summaryScreen, prebattleRoom, battleRoom, battleScene, battleSetup, battle1OpponentConstructionRngValues, rngMode, rngValue };
  }

  if (prebattleRoom) {
    // Select_Task_Exit's fade + CB2_ReturnToFieldContinueScript's field-script
    // resume own the screen exclusively from here - no input is processed.
    // But Select_DestroyAllSprites/DestroyTask(fadeSpeciesNameTaskId) etc.
    // (battle_factory_screen.c:1512-1519) only run once the fade itself
    // completes (`if (!UpdatePaletteFade())`, state 1) - so every ball still
    // rented keeps its SpriteCB_Pokeball idle/rock anim (and RNG roll) alive
    // through the whole "fadingOut" phase, oracle-confirmed this session
    // (dense diff against a frozen-draftScreen render left ~1-14% of the
    // frame wrong on every fadingOut tick; advancing ballAnims here closed
    // it). Once the fade reaches "black", the sprites are gone for good.
    if (prebattleRoom.phase === "fadingOut") {
      const ballAnims = draftScreen.ballAnims.slice();
      for (let i = 0; i < ballAnims.length; i += 1) {
        const anim = ballAnims[i];
        if (!anim) continue;
        const result = advanceBallAnim(anim, rngValue, i === 0, false);
        ballAnims[i] = result.state;
        rngValue = result.rngValue;
      }
      draftScreen = { ...draftScreen, ballAnims };
    }
    // S6 slice 1a: MSGBOX_DEFAULT's own A-press gate (prebattleRoom.ts's
    // "messageClosing" doc) - the only input this screen ever reads. Created
    // directly (not via advancePrebattleRoom) so this same tick already
    // reflects it, matching every other same-tick-state-creation site in
    // this file (e.g. the "wasAccepting" branch below).
    if (prebattleRoom.phase === "idle" && newKeys.has("A")) {
      prebattleRoom = { phase: "messageClosing", elapsed: 0 };
    } else {
      prebattleRoom = advancePrebattleRoom(prebattleRoom);
      // S6 slice 2a handoff (battleRoom.ts doc): the warp fade holds solid
      // black indefinitely on its own (WARP_FADE_OUT clamps once fully
      // faded) - this is the one fixed elapsed count at which the
      // ground-truth trace's room actually becomes visible again.
      if (prebattleRoom?.phase === "warpFade" && prebattleRoom.elapsed === WARP_FADE_TO_ROOM_ELAPSED) {
        prebattleRoom = null;
        battleRoom = {
          ...INITIAL_BATTLE_ROOM_STATE,
          trainerPresentation:
            currentTrainerPresentation
            ?? (state.appRoute === "generated-orchestrator"
              ? CANONICAL_DESTIN_PRESENTATION
              : undefined),
        };
      }
    }
    return { ...state, frame: state.frame + 1, draftScreen, keyRepeat, summaryScreen, prebattleRoom, battleRoom, battleScene, rngValue };
  }

  if (summaryScreen.transition) {
    // Select_Task_OpenSummaryScreen's STATE_SUMMARY_FADE/CLEAN/SHOW (and the
    // symmetric close path) own the screen exclusively while a fade is in
    // flight - the draft screen's own tasks are torn down/frozen, so no
    // input is processed and none of its per-tick redraw state advances.
  } else if (summaryScreen.pageTransition || summaryScreen.monTransition) {
    // ChangePage and ChangeSummaryPokemon replace Task_HandleInput, so all
    // fresh input is rejected until their task returns input ownership.
  } else if (summaryScreen.isOpen) {
    // pokemon_summary_screen.c Task_HandleInput's exact directional priority.
    if (summaryScreen.moveSelect) {
      if (newKeys.has("UP")) {
        summaryScreen = requestSummaryMoveSelectionChange(summaryScreen, "up");
      } else if (newKeys.has("DOWN")) {
        summaryScreen = requestSummaryMoveSelectionChange(summaryScreen, "down");
      } else if (newKeys.has("A") || newKeys.has("B")) {
        summaryScreen = requestSummaryMoveSelectClose(summaryScreen);
      }
    } else if (newKeys.has("UP")) summaryScreen = requestSummaryMonChange(summaryScreen, "up");
    else if (newKeys.has("DOWN")) summaryScreen = requestSummaryMonChange(summaryScreen, "down");
    else if (newKeys.has("LEFT")) summaryScreen = requestSummaryPageChange(summaryScreen, "left");
    else if (newKeys.has("RIGHT")) summaryScreen = requestSummaryPageChange(summaryScreen, "right");
    else if (newKeys.has("A")) summaryScreen = requestSummaryMoveSelect(summaryScreen);
    else if (newKeys.has("B")) summaryScreen = requestSummaryScreenExit(summaryScreen);
  } else {
    let monPic = advanceMonPic(draftScreen.monPic);
    let cursorRedraw = advanceCursorRedraw(draftScreen.cursorRedraw);
    let menuHighlightRedraw = advanceMenuHighlightRedraw(draftScreen.menuHighlightRedraw);
    let rentConfirmRedraw = advanceRentConfirmRedraw(draftScreen.rentConfirmRedraw);
    let yesNoCursorRedraw = advanceMenuHighlightRedraw(draftScreen.yesNoCursorRedraw);
    let speciesNameFade = advanceSpeciesNameFade(draftScreen.speciesNameFade);

    // SpriteCB_Pokeball (ballAnim.ts): every currently-rented ball's idle/
    // rocking anim advances every tick regardless of menu state, each
    // potentially consuming a further Random() draw this tick - EXCEPT a
    // ball listed in `ballAnimStall` (ISSUES #6: a cursor move or RENT/
    // DESELECT confirm on the previous tick stalls it exactly one tick -
    // see DraftScreenState.ballAnimStall doc).
    const ballAnims = draftScreen.ballAnims.slice();
    const stalledSlots = draftScreen.ballAnimStall;
    // ISSUES #9: Select_CreateChosenMonsSprites's own per-frame cost stalls
    // every active ball's display by 1 more tick, near the reveal's
    // window-fully-grown hold - see confirmReveal.ts's isRevealStallActive
    // doc and ballAnim.ts's BallAnimState.displayTile doc.
    const revealStallActive = isRevealStallActive(draftScreen.confirmReveal);
    for (let i = 0; i < ballAnims.length; i += 1) {
      const anim = ballAnims[i];
      if (!anim) continue;
      if (stalledSlots.includes(i)) continue;
      // ISSUES #7/#9: slot 0's own internal cmdIndex model runs 1 tick early
      // vs RAM only during its first moving cycle (pre-existing, RAM-
      // confirmed); every other slot's cmdIndex matches RAM exactly and only
      // needs the real hardware's 1-tick OAM lag - see ballAnim.ts's
      // BallAnimState.displayTile doc.
      const result = advanceBallAnim(anim, rngValue, i === 0, revealStallActive);
      ballAnims[i] = result.state;
      rngValue = result.rngValue;
    }
    // Slots active *before* this tick's own action mutates ballAnims - what
    // a LEFT/RIGHT move or RENT/DESELECT confirm below (if either fires)
    // stalls starting next tick.
    const activeSlotsBeforeAction = ballAnims.reduce<number[]>((acc, a, i) => {
      if (a) acc.push(i);
      return acc;
    }, []);
    let ballAnimStall: readonly number[] = [];

    // docs/confirm-flow-notes.md: the 3rd RENT confirm's own selectingMonsState++
    // (applied on a prior tick, below) ends cursor/menu input permanently -
    // Select_Task_HandleYesNo takes over once the confirm's own popup close
    // (monPic, unchanged) finishes. See confirmReveal.ts.
    const confirmed = isMonsConfirmed(draftScreen.selectingMonsState);
    const wasClosingAtZero = draftScreen.confirmReveal?.phase === "closing" && draftScreen.confirmReveal.elapsed === 0;
    const wasClosing = draftScreen.confirmReveal?.phase === "closing";
    let confirmReveal = advanceConfirmReveal(draftScreen.confirmReveal);
    // ISSUES #13 residual (see DraftScreenState.closingFlashResidual's doc):
    // the closing zoom-out's own final width-1 flash pixel is still visible
    // on screen the one tick confirmReveal itself goes null.
    const closingFlashResidual = wasClosing && confirmReveal === null;
    // S5 final slice: the accept path's closing/un-reveal (same 20-tick
    // teardown as decline, see prebattleRoom.ts's module doc) just finished -
    // hand off to the exit fade instead of resuming cursor-mode input.
    const wasAccepting = draftScreen.confirmReveal?.phase === "closing" && draftScreen.confirmReveal.accepting === true;
    if (wasAccepting && confirmReveal === null) {
      prebattleRoom = INITIAL_PREBATTLE_ROOM_STATE;
    }
    if (wasClosingAtZero && confirmReveal?.phase === "closing" && confirmReveal.elapsed === 1) {
      // battle_factory_screen.c:1556/1567: a decline sets fadeSpeciesNameActive
      // TRUE the same *source* statement as Select_DeclineChosenMons, but
      // RAM-probing confirm-decline.json's actual decline (tools/probe/
      // ram-probe.py) shows the real `active` flag flips one tick after
      // monPicAnimating/selectingMonsState/mons[2].selectedId - all 3 of
      // which flip in lockstep with THIS engine's own decline branch below,
      // at the same tick the A/B press registers. So this engine's decline
      // branch is NOT firing early (ISSUES #12's prior hypothesis, disproven
      // this session - ISSUES #12 has the full evidence trail and the
      // separate real root cause of the 253-255 residual, a ball-render
      // hold gap, unrelated to this timing): this +1 IS the correct, real
      // compensation for a genuine one-tick-later flip of this one flag,
      // kept as-is.
      // battle_factory_screen.c:1547-1549: A-on-YES does NOT set
      // fadeSpeciesNameActive (only the decline/B branches do) - the whole
      // species-name window is being torn down anyway as part of the exit,
      // so this only matters if a future trace needs the fade's internal
      // state, not for any pixel this slice renders.
      if (!draftScreen.confirmReveal?.accepting) {
        speciesNameFade = activateSpeciesNameFade(speciesNameFade);
      }
      // ISSUES #13: Select_Task_CloseChosenMonPics's own per-frame creation
      // cost (same family as Select_CreateChosenMonsSprites's reveal-side
      // cost, ISSUES #9) stalls every still-active ball's own internal
      // cmdIndex advance by exactly 1 more tick, landing here (closing
      // elapsed 0->1, the same tick the un-reveal's window-shrink task
      // itself gets created). RAM/pixel-verified via confirm-decline.json's
      // grid-slot ball icons (slot0 at x16-48/y48-80, slot1 at x51-83/
      // y48-80): the app rendered every subsequent MOVING_CMDS tile
      // transition exactly 1 tick before the oracle, for the REST of the
      // trace (including frames well past confirmReveal going null, e.g.
      // 286/294/302) - a permanent downstream shift only explainable by a
      // genuine one-tick internal stall (not a brief display-only lag like
      // isRevealStallActive, which self-corrects and can't cascade past its
      // own active window). Reuses the exact ballAnimStall mechanism
      // ISSUES #6 already established for cursor moves/RENT confirms (skip
      // advanceBallAnim entirely for these slots on the next tick) - the
      // declined slot is already null by this point so activeSlotsBeforeAction
      // naturally excludes it, no filter needed.
      ballAnimStall = activeSlotsBeforeAction;
    }
    if (confirmed && !confirmReveal && monPic.phase === "closed" && !wasAccepting) {
      confirmReveal = INITIAL_CONFIRM_REVEAL_STATE;
      // Select_ShowYesNoOptions resets yesNoCursorPos to YES every time the
      // popup (re)shows - relevant once a decline lets the 3rd pick re-open.
      draftScreen = { ...draftScreen, yesNoCursorPos: INITIAL_YES_NO_CURSOR_POS };
    }

    // Select_Task_HandleChooseMons (battle_factory_screen.c:1671-1673) early-
    // returns while sFactorySelectScreen->monPicAnimating is TRUE, dropping
    // LEFT/RIGHT/A-open alike - see isCursorInputReady's doc for the
    // RAM-verified gate window.
    if (confirmReveal) {
      // A reveal/YES-NO/un-reveal is in flight - only STATE_YESNO_SHOW_OPTIONS
      // (confirmReveal.phase === "shown") ever reads input; the flash/window/
      // closing sub-phases are all animation-only, matching monPicAnimating's
      // own blanket lockout (see isCursorInputReady's doc, same family).
      if (confirmReveal.phase === "shown") {
        if (newAndRepeatedKeys.has("UP") || newAndRepeatedKeys.has("DOWN")) {
          // Select_UpdateYesNoCursorPosition (:1390-1409): JOY_REPEAT-gated
          // 0<->1 toggle (see confirmReveal.ts's toggleYesNoCursor doc).
          yesNoCursorRedraw = { fromMenuCursorPos: draftScreen.yesNoCursorPos, elapsed: 0 };
          draftScreen = { ...draftScreen, yesNoCursorPos: toggleYesNoCursor(draftScreen.yesNoCursorPos) };
        } else if (newKeys.has("B") || (newKeys.has("A") && draftScreen.yesNoCursorPos === 1)) {
          // docs/confirm-flow-notes.md §3: B-anywhere-in-YES/NO and A-on-NO
          // are source-identical decline paths - both erase the popup, drop
          // the 3rd pick (same slot RENT put it in - cursorPos never moved),
          // and start the 20-tick un-reveal (confirmReveal.ts's "closing").
          const slot = draftScreen.cursorPos;
          const decliningSpecies = chosenMonSpecies(draftScreen);
          // ISSUES #12: the window's background ball-grid layer keeps
          // rendering this slot as still-selected (frozen on its last live
          // frame) through the same elapsed 0-2 hold decliningSpecies covers
          // above - see ConfirmRevealState.decliningBallAnim's doc.
          const decliningBallAnim = draftScreen.ballAnims[slot];
          const { selectedIds, selectingMonsState } = applyDeselect(draftScreen.selectedIds, draftScreen.selectingMonsState, slot);
          ballAnims[slot] = null;
          // Select_PrintSelectMonString is the same text-printer function
          // RENT/DESELECT's own confirm uses - same knock-on stall for every
          // OTHER currently-rented ball (see DraftScreenState.ballAnimStall doc).
          ballAnimStall = activeSlotsBeforeAction.filter((i) => i !== slot);
          // Select_PrintSelectMonString's own redraw lag applies here too -
          // reuse RentConfirmRedrawState's exact fromMessage/elapsed<2 hold
          // (see RentConfirmRedrawState doc; fromSelected is inert here since
          // the RENT/DESELECT popup label it also covers isn't on screen).
          rentConfirmRedraw = { fromMessage: draftScreen.message, fromSelected: true, elapsed: 0 };
          draftScreen = {
            ...draftScreen,
            selectedIds,
            selectingMonsState,
            message: selectMonMessage(selectingMonsState),
          };
          confirmReveal = { phase: "closing", elapsed: 0, decliningSpecies, decliningBallAnim };
        } else if (newKeys.has("A") && draftScreen.yesNoCursorPos === 0) {
          // battle_factory_screen.c:1544-1550: A-on-YES calls the SAME
          // Select_HideChosenMons() decline uses (see prebattleRoom.ts's
          // module doc) - the identical 20-tick closing/un-reveal, just with
          // no deselection (nothing about the 3 picks changes, so no
          // decliningSpecies/decliningBallAnim snapshot is needed - the ball
          // grid behind the shrinking window keeps reading live state, which
          // stays valid throughout). ISSUES #14: preCloseBallAnims snapshots
          // every ball's pre-tick state so the window's very next render
          // (elapsed 1) can freeze it for one tick - see that field's doc.
          confirmReveal = { phase: "closing", elapsed: 0, accepting: true, preCloseBallAnims: draftScreen.ballAnims };
        }
      }
    } else if (confirmed) {
      // Still waiting for the 3rd confirm's own popup close (monPic) to
      // finish before the reveal can start - no input processed either way.
    } else if (draftScreen.mode === "cursor" && isCursorInputReady(monPic)) {
      if (newAndRepeatedKeys.has("RIGHT")) {
        const nextCursorPos = moveCursor(draftScreen.cursorPos, 1);
        cursorRedraw = { fromCursorPos: draftScreen.cursorPos, elapsed: 0, fast: activeSlotsBeforeAction.length >= 2 };
        if (cursorMoveStallsBalls(draftScreen.slots[nextCursorPos]!.species)) ballAnimStall = activeSlotsBeforeAction;
        draftScreen = { ...draftScreen, cursorPos: nextCursorPos, hasActed: true };
      } else if (newAndRepeatedKeys.has("LEFT")) {
        const nextCursorPos = moveCursor(draftScreen.cursorPos, -1);
        cursorRedraw = { fromCursorPos: draftScreen.cursorPos, elapsed: 0, fast: activeSlotsBeforeAction.length >= 2 };
        if (cursorMoveStallsBalls(draftScreen.slots[nextCursorPos]!.species)) ballAnimStall = activeSlotsBeforeAction;
        draftScreen = { ...draftScreen, cursorPos: nextCursorPos, hasActed: true };
      } else if (newKeys.has("A")) {
        monPic = openMonPic(draftScreen.hasActed, draftScreen.hasOpenedMonPic);
        draftScreen = { ...draftScreen, mode: "menu", menuCursorPos: 0, hasOpenedMonPic: true };
        // battle_factory_screen.c:1689 - opening the popup pauses the breathe
        // (frozen, not reset - see speciesNameFade.ts doc).
        speciesNameFade = deactivateSpeciesNameFade(speciesNameFade);
      }
    } else if (isMonPicInputReady(monPic)) {
      // Select_Task_HandleMenu's STATE_MENU_HANDLE_INPUT: only reachable once
      // the mon pic finishes opening (see monPic.ts).
      if (newAndRepeatedKeys.has("DOWN")) {
        menuHighlightRedraw = { fromMenuCursorPos: draftScreen.menuCursorPos, elapsed: 0 };
        draftScreen = { ...draftScreen, menuCursorPos: moveMenuCursor(draftScreen.menuCursorPos, 1), hasActed: true };
      } else if (newAndRepeatedKeys.has("UP")) {
        menuHighlightRedraw = { fromMenuCursorPos: draftScreen.menuCursorPos, elapsed: 0 };
        draftScreen = { ...draftScreen, menuCursorPos: moveMenuCursor(draftScreen.menuCursorPos, -1), hasActed: true };
      } else if (newKeys.has("B")) {
        draftScreen = { ...draftScreen, mode: "cursor" };
        monPic = closeMonPic(monPic.variant);
        // battle_factory_screen.c:1636 - B-close resumes the breathe.
        speciesNameFade = activateSpeciesNameFade(speciesNameFade);
      } else if (newKeys.has("A") && draftScreen.menuCursorPos === MENU_OPTION_SUMMARY) {
        summaryScreen = openSummaryScreen(draftScreen.cursorPos);
      } else if (newKeys.has("A") && draftScreen.menuCursorPos === MENU_OPTION_RENT) {
        // Select_OptionRentDeselect (:1949-1970): RENT/DESELECT share this one
        // slot/handler, context-sensitive on the cursored ball's selectedId.
        const slot = draftScreen.cursorPos;
        const isSelected = draftScreen.selectedIds[slot] !== 0;
        const { selectedIds, selectingMonsState } = isSelected
          ? applyDeselect(draftScreen.selectedIds, draftScreen.selectingMonsState, slot)
          : applySelect(draftScreen.selectedIds, draftScreen.selectingMonsState, slot);
        ballAnims[slot] = isSelected ? null : initialBallAnimState();
        rentConfirmRedraw = { fromMessage: draftScreen.message, fromSelected: isSelected, elapsed: 0 };
        ballAnimStall = activeSlotsBeforeAction.filter((i) => i !== slot);
        draftScreen = {
          ...draftScreen,
          mode: "cursor",
          selectedIds,
          selectingMonsState,
          message: selectMonMessage(selectingMonsState),
        };
        monPic = closeMonPic(monPic.variant);
        // battle_factory_screen.c:1965-1969/1611 - RENT/DESELECT resumes the
        // breathe UNLESS this was the confirming 3rd pick (SELECT_CONFIRM_MONS
        // skips straight to the YES/NO task without touching `active`).
        if (!isMonsConfirmed(selectingMonsState)) speciesNameFade = activateSpeciesNameFade(speciesNameFade);
      } else if (newKeys.has("A") && draftScreen.menuCursorPos === MENU_OPTION_OTHERS) {
        // Select_OptionOthers: closes the popup with no selection change,
        // identical to B.
        draftScreen = { ...draftScreen, mode: "cursor" };
        monPic = closeMonPic(monPic.variant);
        speciesNameFade = activateSpeciesNameFade(speciesNameFade);
      }
    }

    draftScreen = {
      ...draftScreen,
      monPic,
      cursorRedraw,
      menuHighlightRedraw,
      ballAnims,
      rentConfirmRedraw,
      ballAnimStall,
      confirmReveal,
      yesNoCursorRedraw,
      speciesNameFade,
      closingFlashResidual,
    };
  }

  return { ...state, frame: state.frame + 1, draftScreen, keyRepeat, summaryScreen, prebattleRoom, rngValue };
}

function blackFrame(): Uint8Array {
  const fb = createFramebuffer();
  fillFramebuffer(fb, 0, 0, 0);
  return fb;
}

/**
 * S6 slice 2a: bgFadeY/objFadeY called with `elapsed` directly (NOT
 * elapsed+1) - see battleRoom.ts module doc point 1, oracle-verified
 * against a dense per-frame brightness probe. S6 slice 2c: once past
 * "entering", the scene itself (camera/scientists/opponent/fade) is fully
 * settled - SETTLED_SCENE_ELAPSED feeds entryStep/scientistTurnFrame/
 * opponentStep/bgFadeY/objFadeY a value past every one of their own clamp
 * thresholds (battleRoom.ts's SETTLED_SCENE_ELAPSED doc) since `elapsed`
 * itself is phase-relative (small) in the msgbox phases, not the original
 * ticks-since-tick-520 count.
 */
function renderBattleRoomState(state: EngineState): Uint8Array {
  const b = state.battleRoom!;
  const transition = b.encounter === "jenson"
    ? "asymmetricSpiralInSeq"
    : "circlesMeet";
  const sceneElapsed = b.phase === "entering" ? b.elapsed : SETTLED_SCENE_ELAPSED;
  const step = entryStep(sceneElapsed);
  let bgY = bgFadeY(sceneElapsed, FADE_IN);
  let objY = objFadeY(sceneElapsed, FADE_IN);
  // S6 transition slice: "settled" holds the static no-box scene (tick 843)
  // then, still keyed by the SAME elapsed counter, plays the encounter's
  // selected Frontier circle transition (battleTransition.ts). The room
  // scene's own share of that
  // transition's exit-to-black fade (room tiles + NPCs) reuses
  // renderBattleRoomEntryScene's existing bgFadeY/objFadeY params (see
  // battleTransition.ts's exitFadeY doc for the BG/OBJ 1-tick-lag split);
  // everything else (gray flicker, circle sprites, center-logo blend) is a
  // post-process overlay, no new phase needed.
  if (b.phase === "settled") {
    bgY = exitFadeY(b.elapsed, transition);
    objY = exitFadeY(b.elapsed - 1, transition);
  }
  const fb = createFramebuffer();
  renderBattleRoomEntryScene(fb, step, sceneElapsed, bgY, objY, msgboxVisual(b), b);
  if (b.phase === "settled") applyBattleTransitionOverlay(fb, b.elapsed, transition);
  return fb;
}

function renderPrebattleRoomState(state: EngineState): Uint8Array {
  const p = state.prebattleRoom!;
  const returningFromBattle =
    state.postwin?.rightThisWayDismissElapsed != null;
  if (p.phase === "fadingOut") {
    const ticks = p.elapsed + 1;
    const bgY = bgFadeY(ticks, EXIT_FADE_OUT);
    const objY = objFadeY(ticks, EXIT_FADE_OUT);
    const fb = renderFactoryDraftScreenFaded(state.draftScreen, bgY, objY);
    // Select_ErasePopupMenu(SELECT_WIN_YES_NO) is never called on the accept
    // path (see drawYesNoOverlayFaded's doc) - the YES/NO box + cursor stay
    // on screen, fading with everything else, until fully black.
    drawYesNoOverlayFaded(fb, state.draftScreen, bgY, objY);
    return fb;
  }
  if (p.phase === "black") {
    // Same quirk as the summary screen's own black hold (see render()'s
    // comment below): the hold's last tick already peeks at the room fade-
    // in's first step.
    if (p.elapsed + 1 < EXIT_TO_ROOM_BLACK_HOLD_TICKS) return blackFrame();
    const fb = createFramebuffer();
    renderPrebattleRoomScene(fb, bgFadeY(0, FADE_IN), objFadeY(0, FADE_IN));
    return fb;
  }
  if (p.phase === "fadingIn") {
    const ticks = p.elapsed + 1;
    const fb = createFramebuffer();
    renderPrebattleRoomScene(fb, bgFadeY(ticks, FADE_IN), objFadeY(ticks, FADE_IN));
    return fb;
  }
  if (p.phase === "walking") {
    const v = walkVisual(p.elapsed, returningFromBattle);
    const fb = createFramebuffer();
    renderPrebattleRoomWalkScene(
      fb,
      { x: v.originX, y: v.originY },
      v.playerFrame,
      { x: v.attendantX, y: v.attendantY, frameIndex: v.attendantFrame, visible: v.attendantVisible },
    );
    return fb;
  }
  if (p.phase === "warpFade") {
    // WARP_FADE_FROZEN_VISUAL: the walk's own final position, held fixed
    // while BeginNormalPaletteFade darkens the screen (prebattleRoom.ts doc).
    const v = WARP_FADE_FROZEN_VISUAL;
    const ticks = p.elapsed + 1;
    const bgY = bgFadeY(ticks, WARP_FADE_OUT);
    const objY = objFadeY(ticks, WARP_FADE_OUT);
    const fb = createFramebuffer();
    renderPrebattleRoomWalkScene(
      fb,
      { x: v.originX, y: v.originY },
      v.playerFrame,
      { x: v.attendantX, y: v.attendantY, frameIndex: v.attendantFrame, visible: v.attendantVisible },
      bgY,
      objY,
    );
    return fb;
  }
  const fb = createFramebuffer();
  renderPrebattleRoomScene(fb);
  if (messageBoxVisible(p)) drawMessageBox(fb, visiblePrintedChars(p));
  return fb;
}

const POSTWIN_ROOM_FADE_OUT = {
  startDelay: 0,
  startY: 0,
  targetY: 16,
} as const;

const SWAP_ENTRY_FADE_OUT = {
  startDelay: 3,
  startY: 0,
  targetY: 16,
} as const;

function renderFactorySwapEntryFade(state: EngineState): Uint8Array {
  const swap = state.factorySwap!;
  const fb = createFramebuffer();
  const bgY = bgFadeY(swap.elapsed, SWAP_ENTRY_FADE_OUT);
  const objY = objFadeY(swap.elapsed, SWAP_ENTRY_FADE_OUT);
  renderPrebattleRoomScene(fb, bgY, objY);
  drawMessageBoxFrameFaded(fb, bgY);
  const lines = state.postwin!.scoutingLines[3];
  drawMessageBoxTextFaded(fb, lines[0], 16, 121, bgY);
  drawMessageBoxTextFaded(fb, lines[1], 16, 137, bgY);
  return fb;
}

function renderPostwinState(state: EngineState): Uint8Array {
  const postwin = state.postwin!;
  if (postwin.rightThisWayDismissElapsed !== null) {
    if (state.prebattleRoom) return renderPrebattleRoomState(state);
    if (state.battleRoom) return renderBattleRoomState(state);
  }
  const age = postwin.elapsed;
  const phase = postwinPhase(age);
  if (phase === "battleHold" || phase === "battleFade") {
    const fb = createFramebuffer();
    if (postwin.frozenSceneView) {
      renderBattleResolutionSceneOffView(fb, postwin.frozenSceneView);
      if (phase === "battleFade") {
        const mask = createFramebuffer();
        drawBattleResolutionSceneOffFadeMask(mask, postwin.frozenSceneView);
        const { bgUpdates, objUpdates } = fastFadeUpdatesForLocalTick(age - 6);
        applyFastFadeToBlack(fb, mask, bgUpdates, objUpdates);
      }
      return fb;
    }
    if (!state.battleScene) return blackFrame();
    renderBattleScene(fb, state.battleScene);
    applyTurn17PostwinFastFade(fb, state.battleScene, age);
    return fb;
  }
  if (phase === "blackAfterBattle" || phase === "blackBeforeCounter") {
    return blackFrame();
  }
  if (phase === "battleRoom") {
    const fb = createFramebuffer();
    const sceneElapsed = SETTLED_SCENE_ELAPSED;
    const step = entryStep(sceneElapsed);
    const fadingOut = age >= POSTWIN_BATTLE_ROOM_FADE_OUT_AGE;
    const local = fadingOut
      ? age - POSTWIN_BATTLE_ROOM_FADE_OUT_AGE
      : age - POSTWIN_BATTLE_ROOM_FIRST_AGE;
    const timing = fadingOut ? POSTWIN_ROOM_FADE_OUT : FADE_IN;
    renderBattleRoomEntryScene(
      fb,
      step,
      sceneElapsed,
      bgFadeY(local, timing),
      objFadeY(local, timing),
    );
    return fb;
  }

  const fb = createFramebuffer();
  const fadeLocal = age - POSTWIN_COUNTER_ROOM_FIRST_AGE;
  const retireYesDelay =
    postwin.question?.kind === "retire"
      ? postwinQuestionYesDelay(postwin)
      : -1;
  if (retireYesDelay >= POSTWIN_RETIRE_FADE_FIRST_DELAY) {
    return renderPostwinRetireWarp(retireYesDelay);
  }
  renderPrebattleRoomScene(
    fb,
    bgFadeY(fadeLocal, FADE_IN),
    objFadeY(fadeLocal, FADE_IN),
  );
  if (age >= POSTWIN_HEAL_BOX_AGE) {
    drawMessageBoxFrame(fb);
    const healDismiss = postwin.healDismissElapsed;
    const beforeContinuation =
      healDismiss === null ||
      age < healDismiss + POSTWIN_NEXT_BOX_CLEAR_DELAY;
    const drawLines = (line1: string, line2: string, chars: number): void => {
      if (chars <= 0) return;
      drawMessageBoxText(
        fb,
        line1.slice(0, Math.min(chars, line1.length)),
        16,
        121,
      );
      if (chars > line1.length) {
        drawMessageBoxText(
          fb,
          line2.slice(0, chars - line1.length),
          16,
          137,
        );
      }
    };

    if (postwin.question !== null) {
      const q = postwin.question;
      const qText = q.kind === "record"
        ? POSTWIN_QUESTION_RECORD_TEXT
        : POSTWIN_QUESTION_RETIRE_TEXT;
      const dismissed = postwin.questionDismissElapsed !== null;
      const qDelay = age - q.edgeElapsed;
      const dDelay = dismissed ? age - postwin.questionDismissElapsed! : -1;
      const yesDelay = postwinQuestionYesDelay(postwin);
      if (postwin.recordedMessageDismissElapsed !== null) {
        // RECORD-YES recorded message resolved back to the menu: the message
        // holds through +3 after the dismiss-A, the box clears at +4, then
        // the ReadyFor2ndOpponent reprint re-types (the §7b re-ask, which
        // drops the RECORD entry). Mirrors the NO-dismiss re-ask schedule.
        const rDelay = age - postwin.recordedMessageDismissElapsed;
        if (rDelay <= 3) {
          drawLines(
            POSTWIN_RECORDED_TEXT[0],
            POSTWIN_RECORDED_TEXT[1],
            postwinRecordedVisibleChars(postwin),
          );
        } else if (rDelay !== 4) {
          drawLines(
            POSTWIN_NEXT_LINE1,
            POSTWIN_NEXT_LINE2,
            postwinQuestionReprintVisibleChars(postwin),
          );
        }
      } else if (yesDelay >= 0 && q.kind === "record") {
        // RECORD-YES: window clears +2 after the A-on-YES edge, the question
        // box holds through the save-SE span (+2..+22), clears at +23, then
        // "{PLAYER}'s battle was recorded" types from +24.
        if (yesDelay <= 1) {
          drawLines(qText[0], qText[1], qText[0].length + qText[1].length);
        } else if (yesDelay < POSTWIN_RECORDED_BOX_CLEAR_DELAY) {
          drawLines(qText[0], qText[1], qText[0].length + qText[1].length);
        } else if (yesDelay !== POSTWIN_RECORDED_BOX_CLEAR_DELAY) {
          drawLines(
            POSTWIN_RECORDED_TEXT[0],
            POSTWIN_RECORDED_TEXT[1],
            postwinRecordedVisibleChars(postwin),
          );
        }
      } else if (dismissed) {
        // Dismiss transition: question stays fully shown through +3 (the
        // default-NO A press + 2 more frames), box clears at +4, then the
        // ReadyFor2ndOpponent reprint re-types.
        if (dDelay <= 3) {
          drawLines(qText[0], qText[1], qText[0].length + qText[1].length);
        } else if (dDelay !== 4) {
          drawLines(
            POSTWIN_NEXT_LINE1,
            POSTWIN_NEXT_LINE2,
            postwinQuestionReprintVisibleChars(postwin),
          );
        }
      } else if (qDelay <= 3) {
        // Select-close visual: the 4-choice menu window clears while the
        // "2nd match" message is still in the box (ground-truth §1 6641-6642).
        drawLines(
          POSTWIN_NEXT_LINE1,
          POSTWIN_NEXT_LINE2,
          POSTWIN_NEXT_LINE1.length + POSTWIN_NEXT_LINE2.length,
        );
      } else if (qDelay !== 4) {
        drawLines(qText[0], qText[1], postwinQuestionVisibleChars(postwin));
      }
      // The YES/NO multichoice window (same 4x4 std-window at tile (20,8)
      // as the Lobby record prompt, ground-truth §3 correction: the window
      // IS visible during the question hold). It draws from the window-edge
      // offset and clears when the question box clears on dismiss (NO path)
      // or +2 after the A-on-YES edge (YES path). The cursor copies the
      // logical YES/NO position one tick after a UP/DOWN move.
      const windowCleared =
        dismissed ? age - postwin.questionDismissElapsed! > 1
          : yesDelay >= 0 ? yesDelay >= POSTWIN_QUESTION_WINDOW_CLEAR_DELAY
            : false;
      if (postwinQuestionWindowVisible(postwin) && !windowCleared) {
        drawStandardWindowFrame(fb, 160, 64, 4, 4);
        drawStandardWindowText(fb, "YES", 176, 73);
        drawStandardWindowText(fb, "NO", 176, 89);
        drawStandardWindowText(
          fb,
          "▶",
          168,
          73 + (postwin.questionCursorDisplayPos ?? postwin.questionCursorPos ?? 1) * 16,
        );
      }
    } else if (beforeContinuation) {
      drawLines(
        POSTWIN_HEAL_LINE1,
        POSTWIN_HEAL_LINE2,
        postwinHealVisibleChars(age),
      );
    } else if (postwin.dialoguePage === 0) {
      drawLines(
        POSTWIN_NEXT_LINE1,
        POSTWIN_NEXT_LINE2,
        postwinNextVisibleChars(postwin),
      );
    } else if (postwin.swapDeclineElapsed !== null) {
      const declineDelay = age - postwin.swapDeclineElapsed;
      if (declineDelay <= POSTWIN_DIALOGUE_OLD_TEXT_END_DELAY) {
        const previous = postwin.scoutingLines[3];
        drawLines(
          previous[0],
          previous[1],
          previous[0].length + previous[1].length,
        );
      } else if (declineDelay !== POSTWIN_DIALOGUE_BLANK_DELAY) {
        drawLines(
          POSTWIN_RIGHT_THIS_WAY,
          "",
          postwinRightThisWayVisibleChars(postwin),
        );
      }
    } else {
      const delay = postwinDialogueDelay(postwin)!;
      if (delay <= POSTWIN_DIALOGUE_OLD_TEXT_END_DELAY) {
        if (postwin.dialoguePage === 1) {
          drawLines(
            POSTWIN_NEXT_LINE1,
            POSTWIN_NEXT_LINE2,
            POSTWIN_NEXT_LINE1.length + POSTWIN_NEXT_LINE2.length,
          );
        } else {
          const previous = postwin.scoutingLines[postwin.dialoguePage - 2]!;
          drawLines(
            previous[0],
            previous[1],
            previous[0].length + previous[1].length,
          );
        }
      } else if (delay !== POSTWIN_DIALOGUE_BLANK_DELAY) {
        const lines = postwin.scoutingLines[postwin.dialoguePage - 1]!;
        drawLines(
          lines[0],
          lines[1],
          postwinDialogueVisibleChars(postwin),
        );
      }
    }

    const dialogueDelay = postwinDialogueDelay(postwin);
    const normalMenuVisible =
      postwin.question === null &&
      (
        postwin.dialoguePage === 0 ||
        (postwin.dialoguePage === 1 && dialogueDelay === 0)
      );
    const questionMenuVisible =
      postwin.question !== null &&
      (
        (
          postwin.questionDismissElapsed === null &&
          postwin.recordedMessageDismissElapsed === null &&
          age - postwin.question.edgeElapsed <= 1
        ) ||
        postwinQuestionMenuReady(postwin)
      );
    if (
      healDismiss !== null &&
      age >= healDismiss + POSTWIN_CONTINUATION_MENU_VISIBLE_DELAY &&
      (normalMenuVisible || questionMenuVisible)
    ) {
      // The 3-option GO ON / REST / RETIRE variant after a successful
      // RECORD-YES (`MULTI_GO_ON_REST_RETIRE` at tile (20,6), §7a/§7b): the
      // window drops the RECORD row, shifting its position +1 tile x / +2
      // tiles y from the 4-option (19,4), and the text rows move up to the
      // 4-option's rows 2-4. Measured byte-exact from the §7b held frame.
      const disabledRecord = postwin.disableRecordBattle;
      drawStandardWindowFrame(
        fb,
        disabledRecord ? 160 : 152,
        disabledRecord ? 48 : 32,
        6,
        disabledRecord ? 6 : 8,
      );
      const choices = disabledRecord
        ? ["GO ON", "REST", "RETIRE"]
        : ["GO ON", "RECORD", "REST", "RETIRE"];
      const firstRow = disabledRecord ? 57 : 41;
      for (let i = 0; i < choices.length; i += 1) {
        drawStandardWindowText(
          fb,
          choices[i]!,
          disabledRecord ? 176 : 168,
          firstRow + i * 16,
        );
      }
      drawStandardWindowText(
        fb,
        "▶",
        disabledRecord ? 168 : 160,
        firstRow + (postwin.continuationCursorDisplayPos ?? postwin.continuationCursorPos ?? 0) * 16,
      );
    }
    if (
      postwin.dialoguePage === 4 &&
      dialogueDelay !== null &&
      dialogueDelay >= POSTWIN_SWAP_MENU_VISIBLE_DELAY &&
      (
        postwin.swapDeclineElapsed === null ||
        age === postwin.swapDeclineElapsed
      )
    ) {
      drawStandardWindowFrame(fb, 160, 64, 5, 4);
      drawStandardWindowText(fb, "YES", 176, 73);
      drawStandardWindowText(fb, "NO", 176, 89);
      drawStandardWindowText(
        fb,
        "▶",
        168,
        73 + (postwin.swapCursorDisplayPos ?? 0) * 16,
      );
    }
  }
  return fb;
}

/**
 * RETIRE-YES warp (docs/postwin-record-retire-ground-truth.md §3a probe:
 * WarpToLobbyLost). `delay` is relative to the accepted A-on-YES canonical
 * edge: the question scene fades out via the shared WARP_FADE_OUT palette
 * fade (+4..+18, BG 1-tick ahead of OBJ), holds black (+19..+37), then the
 * Lobby arrival fade-in renders through the existing loss-terminal
 * presentation machinery (`renderFactoryTerminalPresentation`), whose age 114
 * is the arrival fade-in first frame -- so `age = delay + 76` reproduces the
 * probe's arrival fade-in at +38, message box at +65, and LostChallenge
 * page-0 typing/cursor after that.
 */
function renderPostwinRetireWarp(
  delay: number,
): Uint8Array {
  if (delay < POSTWIN_RETIRE_BLACK_AGE_DELAY) {
    const qText = POSTWIN_QUESTION_RETIRE_TEXT;
    const bgY = bgFadeY(delay, WARP_FADE_OUT);
    const objY = objFadeY(delay, WARP_FADE_OUT);
    const fb = createFramebuffer();
    renderPrebattleRoomScene(fb, bgY, objY);
    if (delay < POSTWIN_RETIRE_FADE_FIRST_DELAY) {
      drawMessageBoxFrame(fb);
    } else {
      drawMessageBoxFrameFaded(fb, bgY);
    }
    drawMessageBoxTextFaded(fb, qText[0], 16, 121, bgY);
    drawMessageBoxTextFaded(fb, qText[1], 16, 137, bgY);
    return fb;
  }
  if (delay < POSTWIN_RETIRE_FADE_IN_DELAY) return blackFrame();
  const terminalAge = delay - POSTWIN_RETIRE_FADE_IN_DELAY +
    FACTORY_LOSS_TERMINAL_PROFILE.fieldFirstAge;
  const terminal = {
    ...createFactoryTerminalLossPresentation({
      type: "roundLost" as const,
      commandId: 0,
      battleIndex: 0,
    }),
    age: terminalAge,
  };
  return renderFactoryTerminalPresentation(terminal, () => blackFrame());
}

/**
 * ISSUES #80 slice 6: the party-select field-reveal (1019-1034) draws the
 * settled battle field through the SAME scene view the resolution presentation
 * renders at 1035+ (both mons out, no message), then blends it from black.
 * Built from the live battle-command presentation, whose `field`/`fieldArt`/
 * `healthboxes`/`spriteVisibility` are the resolution's own inputs.
 */
function partySelectCloseRenderAssets(
  presentation: BattleCommandPresentationState,
): PartySelectCloseRenderAssets {
  const view = createBattleCommandPresentationRenderView(presentation);
  const player = view.spriteVisibility.player;
  const opponent = view.spriteVisibility.opponent;
  return {
    drawField(fb: Uint8Array): void {
      renderBattleResolutionSceneOffView(fb, {
        field: view.field as unknown as import("./battleResolutionPresentationRender.ts").BattleResolutionPresentationRenderView["field"],
        fieldArt: view.fieldArt,
        healthboxes: view.healthboxes,
        message: null,
        effect: null,
        visibility: Object.freeze({
          player: Object.freeze({ sprite: player, healthbox: true }),
          opponent: Object.freeze({ sprite: opponent, healthbox: true }),
        }),
        waitCursor: null,
        bottom: "blank",
        confirmHandoff: null,
        switchIn: null,
        midBattleSwitchIn: null,
        switchOut: null,
        partySummary: null,
        midBattleSwitchFade: null,
        midBattleSwitchParticles: null,
        trainerSlide: null,
      });
    },
  };
}

function renderWithoutFactoryTerminal(state: EngineState): Uint8Array {
  if (state.factoryRoundBattleOrchestrator?.battleStartIntro) {
    const fb = createFramebuffer();
    renderGeneratedBattleStartPreSendOut(
      fb,
      state.factoryRoundBattleOrchestrator.battleStartIntro,
    );
    return fb;
  }
  if (state.factoryRoundBattleOrchestrator?.battleResolutionPresentation) {
    const fb = createFramebuffer();
    const resolution =
      state.factoryRoundBattleOrchestrator.battleResolutionPresentation;
    const forced = state.factoryRoundBattleOrchestrator.battleForcedPartySelect;
    if (forced) {
      renderBattleResolutionForcedPartySelect(
        fb,
        createBattleResolutionPresentationRenderView(resolution),
        forced,
      );
    } else {
      renderBattleResolutionPresentation(
        fb,
        resolution,
        { drawScene: renderBattleResolutionSceneOffView },
      );
    }
    return fb;
  }
  if (state.factoryRoundBattleOrchestrator?.battleCommandPresentation) {
    const fb = createFramebuffer();
    const presentation = state.factoryRoundBattleOrchestrator.battleCommandPresentation;
    const selector = state.factoryRoundBattleOrchestrator.battlePartySelect;
    if (selector) {
      renderBattlePartySelect(fb, selector, partySelectCloseRenderAssets(presentation));
    } else {
      renderGeneratedBattleCommandPresentation(fb, presentation);
    }
    return fb;
  }
  if (state.factorySwap) {
    const swap = state.factorySwap;
    if (swap.elapsed === 0) return renderPostwinState(state);
    if (swap.elapsed < 19) return renderFactorySwapEntryFade(state);
    if (swap.elapsed < 44) return blackFrame();
    const tile = factorySwapBallTile(swap.elapsed);
    const fadeLocal = swap.elapsed - 44;
    if (
      swap.controller.phase === "summaryFade" ||
      swap.controller.phase === "summaryReturn" ||
      swap.returnedFromSummary
    ) {
      const renderPopup = (bgY: number, objY: number): Uint8Array =>
        renderFactorySwapPicker({
          state: {
            ...swap.controller,
            phase: "playerOptions",
          },
          ballTiles:
            swap.controller.phase === "summaryReturn" ||
              swap.returnedFromSummary
              ? [
                  factorySwapSummaryReturnBallTile(
                    swap.summaryReturnClock ?? 0,
                  ),
                  factorySwapSummaryReturnBallTile(
                    swap.summaryReturnClock ?? 0,
                  ),
                  factorySwapSummaryReturnBallTile(
                    swap.summaryReturnClock ?? 0,
                  ),
                ]
              : [tile, tile, tile],
          speciesRenderCoeff: swap.speciesNameFade.renderCoeff,
          bgFadeY: bgY,
          objFadeY: objY,
          // A settled OpenMonPic/Swap_ShowSummaryMonSprite composition.
          phaseElapsed:
            swap.controller.phase === "summaryFade"
              ? 58 + swap.phaseElapsed
              : swap.controller.phase === "summaryReturn"
                ? 58 + Math.max(0, swap.phaseElapsed - 42)
                : 59,
          selectedBallIndex: swap.selectedBallIndex,
          selectedBallTile:
            swap.controller.phase === "summaryReturn" ||
              swap.selectedBallClock === null
              ? null
              : factorySwapPlayerOptionBallTile(swap.selectedBallClock),
        });
      const summary = state.summaryScreen;
      const transition = summary.transition;
      const summaryMonAnimClock = summary.monAnimClock ?? summary.openElapsed + 1;
      const animateSwitchedMon = summary.monAnimClock !== null;
      if (!transition) {
        if (summary.monTransition) {
          return renderSummaryMonTransition(
            state.draftScreen.rentals,
            summary.monTransition,
            summaryMonAnimClock,
            animateSwitchedMon,
            summary.page,
          );
        }
        return summary.onInfoPage
          ? renderSummaryInfoPage(state.draftScreen.rentals, summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon)
          : renderPopup(0, 0);
      }
      const isEntry = transition.direction === "toSummary";
      if (transition.phase === "black") {
        const holdTicks = isEntry ? ENTRY_BLACK_HOLD_TICKS : 25;
        if (transition.elapsed + 1 < holdTicks) return blackFrame();
        const bgY = bgFadeY(0, FADE_IN);
        const objY = objFadeY(0, FADE_IN);
        return isEntry
          ? renderSummaryInfoPageFaded(state.draftScreen.rentals, summary.selectedSlot, bgY, objY)
          : renderPopup(bgY, objY);
      }
      const timing =
        transition.phase === "fadingIn"
          ? FADE_IN
          : isEntry
            ? ENTRY_FADE_OUT
            : EXIT_FADE_OUT;
      const ticks = transition.elapsed + 1;
      const bgY = bgFadeY(ticks, timing);
      const objY = objFadeY(ticks, timing);
      const showingPopup = isEntry === (transition.phase === "fadingOut");
      return showingPopup
        ? renderPopup(bgY, objY)
        : renderSummaryInfoPageFaded(
            state.draftScreen.rentals,
            summary.selectedSlot,
            bgY,
            objY,
            summaryMonAnimClock,
            animateSwitchedMon,
          );
    }
    const exiting =
      swap.controller.phase === "acceptExit" ||
      swap.controller.phase === "quitExit" ||
      (
        swap.controller.phase === "complete" &&
        swap.fieldHandoff === "CB2_ReturnToFieldContinueScript"
      );
    return renderFactorySwapPicker({
      state: swap.controller,
      ballTiles: [
        swap.controller.phase === "quitReturn" && swap.phaseElapsed >= 8
          ? factorySwapBallTile(swap.elapsed - 1)
          : tile,
        tile,
        tile,
      ],
      speciesRenderCoeff: swap.speciesNameFade.renderCoeff,
      bgFadeY: exiting
        ? swap.controller.phase === "quitExit" ||
            swap.controller.result === "keptParty"
          ? factorySwapQuitExitBgFadeY(swap.phaseElapsed)
          : factorySwapAcceptExitBgFadeY(swap.phaseElapsed)
        : bgFadeY(fadeLocal, FADE_IN),
      objFadeY: exiting
        ? swap.controller.phase === "quitExit" ||
            swap.controller.result === "keptParty"
          ? factorySwapQuitExitObjFadeY(swap.phaseElapsed)
          : factorySwapAcceptExitObjFadeY(swap.phaseElapsed)
        : objFadeY(fadeLocal, FADE_IN),
      phaseElapsed: swap.phaseElapsed,
      selectedBallIndex: swap.selectedBallIndex,
      selectedBallTile:
        swap.selectedBallClock === null
          ? null
          : factorySwapPlayerOptionBallTile(swap.selectedBallClock),
      loadedDisplaySpecies: swap.loadedDisplaySpecies,
      duplicateDisplayCopied: swap.returnedFromDuplicate ?? false,
    });
  }
  if (state.postwin) return renderPostwinState(state);
  if (state.sceneOnPresentation) {
    const fb = createFramebuffer();
    renderSceneOnMovePresentation(fb, state.sceneOnPresentation);
    return fb;
  }
  if (state.stagedBattleTurn) {
    const fb = createFramebuffer();
    const staged = state.stagedBattleTurn;
    if (staged.phase === "awaitingConfirm") {
      renderSceneOffTurnView(fb, {
        ...staged.sceneOffIdentity,
        opponentHp: staged.initialOpponentHp,
        messageLines: null,
        messageChars: 0,
        statEffectAge: null,
        bottom: "fight",
        playerY2: 1,
      });
      return fb;
    }
    const presentation = staged.presentation!;
    const command = presentation.commands[presentation.commandIndex] ?? null;
    const elapsed = staged.adapter?.elapsed ?? 0;
    const hpCommand = presentation.commands.find((candidate) =>
      candidate.type === "hp" && candidate.target === "opponent"
    );
    if (!hpCommand || hpCommand.type !== "hp") {
      throw new Error(
        "Scene OFF staged turn requires an opponent HP semantic command",
      );
    }
    const statIndex = presentation.commands.findIndex(
      (candidate) => candidate.type === "stat",
    );
    const statTextIndex = presentation.commands.findIndex(
      (candidate, index) =>
        candidate.type === "text" && statIndex >= 0 && index > statIndex,
    );
    const playerMoveDone =
      presentation.commandIndex >= 1 ||
      (presentation.commandIndex === 0 && elapsed >= 139);
    const statStarted =
      statIndex >= 0 && presentation.commandIndex >= statIndex;
    const statTextStarted =
      statTextIndex >= 0 && presentation.commandIndex >= statTextIndex;
    const inputVisible = staged.phase === "inputReady" && staged.inputReadyElapsed >= 6;
    const latestText = [...presentation.commands
      .slice(0, presentation.commandIndex + 1)]
      .reverse()
      .find((candidate) => candidate.type === "text");
    const lines = command?.type === "text"
      ? command.lines
      : latestText?.type === "text"
        ? latestText.lines
        : null;
    renderSceneOffTurnView(fb, {
      ...staged.sceneOffIdentity,
      opponentHp: playerMoveDone ? hpCommand.to : hpCommand.from,
      messageLines: lines,
      messageChars:
        command?.type === "text" && lines
          ? Math.min(
              lines.join("").length,
              Math.max(
                0,
                elapsed -
                  (presentation.commandIndex === 0
                    ? 12
                    : presentation.commandIndex === statTextIndex
                      ? -2
                      : 0),
              ),
            )
          : lines?.join("").length ?? 0,
      statEffectAge: statStarted && !statTextStarted
        ? elapsed * 2 + 94
        : null,
      bottom: inputVisible
        ? "action"
        : staged.phase === "inputReady"
          ? "blank"
          : presentation.commandIndex === 0 && elapsed < 13
            ? "fight"
            : "message",
      playerY2:
        presentation.commandIndex === 0 && elapsed < 13 ? 1 : 0,
    });
    return fb;
  }
  if (state.battleScene) {
    const fb = createFramebuffer();
    renderBattleScene(fb, state.battleScene);
    return fb;
  }
  if (state.battleRoom) return renderBattleRoomState(state);
  if (state.prebattleRoom) return renderPrebattleRoomState(state);
  const summary = state.summaryScreen;
  const t = summary.transition;
  const summaryMonAnimClock = summary.monAnimClock ?? summary.openElapsed + 1;
  const animateSwitchedMon = summary.monAnimClock !== null;
  if (!t) {
    if (summary.moveSelect) {
      return renderSummaryBattleMoveSelectPage(
        state.draftScreen.rentals,
        summary.selectedSlot,
        summaryMonAnimClock,
        summary.moveSelect,
        animateSwitchedMon,
        summary.page as "battleMoves" | "contestMoves",
      );
    }
    if (summary.monTransition) {
      return renderSummaryMonTransition(
        state.draftScreen.rentals,
        summary.monTransition,
        summaryMonAnimClock,
        animateSwitchedMon,
        summary.page,
      );
    }
    if (summary.pageTransition) {
      // ChangePage's task handoff is installed immediately but its outgoing
      // window timing follows which BG layer moves. A forward wipe parks
      // the destination off-screen while Info clears for two callbacks; a
      // reverse wipe leaves the outgoing Skills layer fully settled for one
      // callback, then clears its BG0 windows as that source layer moves.
      // The persistent mon callback continues through both handoffs.
      const pageTransition = summary.pageTransition;
      const layers = summaryPageLayerOffsets(pageTransition);
      if (pageTransition.elapsed === 0) {
        return pageTransition.fromPage === "skills"
          ? renderSummarySkillsPage(state.draftScreen.rentals, summary.selectedSlot, summary.openElapsed + 1, animateSwitchedMon)
          : pageTransition.fromPage === "battleMoves"
            ? renderSummaryBattleMovesPage(state.draftScreen.rentals, summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon)
            : pageTransition.fromPage === "contestMoves"
              ? renderSummaryContestMovesPage(state.draftScreen.rentals, summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon)
              : renderSummaryInfoPage(state.draftScreen.rentals, summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon);
      }
      if (layers.movingPage === pageTransition.toPage && pageTransition.elapsed <= 2) {
        return renderSummaryPageCleared(
          state.draftScreen.rentals,
          summary.selectedSlot,
          summaryMonAnimClock,
          pageTransition.fromPage,
          animateSwitchedMon,
        );
      }
      return renderSummaryPageTransition(
        state.draftScreen.rentals,
        summary.selectedSlot,
        pageTransition,
        summaryMonAnimClock,
        animateSwitchedMon,
      );
    }
    return summary.isOpen
      ? summary.page === "skills"
        ? renderSummarySkillsPage(state.draftScreen.rentals, summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon)
        : summary.page === "battleMoves"
          ? renderSummaryBattleMovesPage(state.draftScreen.rentals, summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon)
          : summary.page === "contestMoves"
            ? renderSummaryContestMovesPage(state.draftScreen.rentals, summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon)
        : renderSummaryInfoPage(state.draftScreen.rentals, summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon)
      : renderFactoryDraftScreen(state.draftScreen);
  }
  const isEntry = t.direction === "toSummary";
  if (t.phase === "black") {
    // Both directions' black hold shares the same quirk (oracle-verified
    // fresh dense B-exit probe, ISSUES #4 - this does NOT depend on
    // direction): the hold's own last tick already shows the following
    // fade-in's first step, not pure black.
    const holdTicks = isEntry ? ENTRY_BLACK_HOLD_TICKS : EXIT_BLACK_HOLD_TICKS;
    if (t.elapsed + 1 < holdTicks) return blackFrame();
    const bgY = bgFadeY(0, FADE_IN);
    const objY = objFadeY(0, FADE_IN);
    return isEntry
      ? renderSummaryInfoPageFaded(state.draftScreen.rentals, summary.selectedSlot, bgY, objY)
      : renderFactoryDraftScreenFaded(state.draftScreen, bgY, objY);
  }

  const timing = t.phase === "fadingIn" ? FADE_IN : isEntry ? ENTRY_FADE_OUT : EXIT_FADE_OUT;
  // +1: BeginNormalPaletteFade's own UpdateNormalPaletteFade call (palette.c)
  // applies its first blend step within the same tick the fade is triggered
  // - `elapsed` (0 = the trigger tick itself) is one tick "behind" the ticks
  // argument these curves expect (0 = one VBlank of fade already applied);
  // oracle-verified empirically for BOTH directions (dense capture diverges
  // exactly one tick earlier than `bgFadeY(t.elapsed, timing)` alone
  // predicts) - a fresh isolated B-exit probe (ISSUES #4) confirmed the same
  // +1 applies on the exit path too, once the exit's own dense probe is
  // pressed strictly inside the settled Info page's stable pixel window
  // (press-tick 105/106 register; 104 is silently dropped - Task_HandleInput
  // / gPaletteFade.active isn't actually ready that early despite the pixels
  // already looking stable, a real gotcha worth remembering for future
  // probes of this screen).
  const ticks = t.elapsed + 1;
  const bgY = bgFadeY(ticks, timing);
  const objY = objFadeY(ticks, timing);
  const showingDraft = isEntry === (t.phase === "fadingOut");
  return showingDraft
    ? renderFactoryDraftScreenFaded(state.draftScreen, bgY, objY)
    : renderSummaryPageFaded(
        state.draftScreen.rentals,
        summary.selectedSlot,
        summary.page,
        bgY,
        objY,
        summaryMonAnimClock,
        animateSwitchedMon,
      );
}

export function render(state: EngineState): Uint8Array {
  // docs/post-terminal-return-to-lobby-ground-truth.md §3: the 108-tick
  // fade/black/battle-room-flash/black return-to-field span is shared,
  // byte-identical machinery ahead of EITHER outcome's own destination-map
  // content (postwin's "counterRoom" phase for WIN; factoryTerminal for
  // roundLost/roundCompleted) -- so it must render ahead of the
  // factoryTerminal dispatch below, not just postwin's usual (WIN-only)
  // precedence inside renderWithoutFactoryTerminal.
  if (state.postwin && postwinPhase(state.postwin.elapsed) !== "counterRoom") {
    return renderPostwinState(state);
  }
  // Free-roam Lobby owns the screen once the decline chain hands off
  // (factoryLobbyFreeRoam.ts); its spawn frame is byte-identical to the
  // terminal's bare-field frame, so the handoff is invisible.
  if (state.lobbyFreeRoam) {
    return renderFactoryLobbyFreeRoam(state.lobbyFreeRoam);
  }
  const generatedTerminalCommand = terminalCommandForRound(
    state.factoryRoundBattleOrchestrator?.round ?? null,
  );
  const pendingTerminalCommand =
    generatedTerminalCommand ?? terminalCommandForRound(state.roundController);
  const terminalPresentation =
    state.factoryTerminal ??
    (
      pendingTerminalCommand === null
        ? null
        : createFactoryTerminalPresentation(pendingTerminalCommand)
    );
  if (terminalPresentation) {
    return renderFactoryTerminalPresentation(
      terminalPresentation,
      // finishBattle deliberately clears the generated battle/resolution owner
      // before publishing its terminal round command. Do not let the terminal
      // profile's two prior-presentation frames expose the unrelated draft.
      () => generatedTerminalCommand === null
        ? renderWithoutFactoryTerminal({ ...state, factoryTerminal: null })
        : blackFrame(),
    );
  }
  return renderWithoutFactoryTerminal(state);
}
