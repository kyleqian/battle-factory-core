// Pure engine core: no DOM, no timers, no Math.random. tick() advances game
// state by exactly one frame given the held buttons; render() draws the
// current state into a 240x160 RGBA buffer. The browser shell (src/main.ts)
// and tools/compare/appTrace.ts both drive this same core.

import type { GbaButton } from "../input.ts";
import {
  ANCHOR_DRAFT_SCREEN_STATE,
  MENU_OPTION_OTHERS,
  MENU_OPTION_RENT,
  MENU_OPTION_SUMMARY,
  advanceCursorRedraw,
  advanceMenuHighlightRedraw,
  advanceRentConfirmRedraw,
  applyDeselect,
  applySelect,
  chosenMonSpecies,
  cursorMoveStallsBalls,
  isMonsConfirmed,
  moveCursor,
  moveMenuCursor,
  drawYesNoOverlayFaded,
  renderFactoryDraftScreen,
  renderFactoryDraftScreenFaded,
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
  advanceBattleScene,
  applyTurn17PostwinFastFade,
  DRAGONBREATH_MENU_REDRAW_DELAY,
  INITIAL_BATTLE_SCENE_STATE,
  renderBattleScene,
  renderSceneOnMovePresentation,
  renderSceneOffTurnView,
  sendOutHandoffTick,
  sendOutPressEligible,
  TICK0 as SCENE_TICK0,
  TURN3_ROCKSLIDE_REOPEN_GATE_DELAY,
  TURN4_ROCKSLIDE_MENU_REDRAW_DELAY,
  TURN5_SITRUS_MENU_REOPEN_GATE_DELAY,
  TURN8_MENU_REDRAW_DELAY,
  TURN9_MENU_REDRAW_DELAY,
  TURN10_ROCKSLIDE_MENU_REDRAW_DELAY,
  TURN11_ROCKSLIDE_MENU_REDRAW_DELAY,
  TURN12_ROCKSLIDE_MENU_REDRAW_DELAY,
  TURN13_DRAGONBREATH_MENU_REDRAW_DELAY,
  TURN14_DRAGONBREATH_MENU_REDRAW_DELAY,
  TURN16_FIRE_PUNCH_MENU_REDRAW_DELAY,
  turn5RockSlideKoDismissEligible,
  turn13KoDismissEligible,
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
  actionMenuInputReady,
  battle2PreTurnRngCalls,
} from "./battle2ActionMenu.ts";
import {
  battle2Turn1RngCalls,
  battle2Turn1State,
  type Battle2Turn1State,
} from "./battle2Turn1.ts";
import { advancePartySelect, INITIAL_PARTY_SELECT_STATE, partySendOutBattleMenuReady } from "./partySelect.ts";
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
  ROCK_SLIDE_MENU_REDRAW_DELAY,
  TURN6_ROCKSLIDE_REOPEN_GATE_DELAY,
  TURN7_ROCKSLIDE_REOPEN_GATE_DELAY,
} from "./battleMenu.ts";
import { activeMonMoveset, createBattleSetup, rentalMoveset, type BattleSetupState } from "./battleSetup.ts";
import { createFactoryCorpusParty } from "./factoryCorpusParty.ts";
import { factoryTrainerPresentationForOpponent } from "./factoryTrainerPresentation.ts";
import {
  advancePostwin,
  acceptPostwinContinuation,
  acceptPostwinDialoguePage,
  acceptPostwinHealDismiss,
  createPostwinState,
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
  acceptPostwinSwapDecline,
  acceptPostwinRightThisWayDismiss,
  postwinDialogueDelay,
  postwinDialogueInputReady,
  postwinDialogueVisibleChars,
  postwinHealVisibleChars,
  movePostwinContinuationCursor,
  movePostwinSwapCursor,
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
  factorySwapBallTile,
  factorySwapAcceptExitBgFadeY,
  factorySwapAcceptExitObjFadeY,
  factorySwapQuitExitBgFadeY,
  factorySwapQuitExitObjFadeY,
  factorySwapPlayerOptionBallTile,
  factorySwapSummaryReturnBallTile,
  handleFactorySwapPresentationInput,
  type FactorySwapPresentationState,
} from "./factorySwapPresentation.ts";
import { renderFactorySwapPicker } from "./factorySwapRender.ts";
import {
  advanceFactoryTerminalPresentation,
  createFactoryTerminalPresentation,
  factoryTerminalCompletion,
  type FactoryTerminalPresentationState,
} from "./factoryTerminalPresentation.ts";
import { renderFactoryTerminalPresentation } from "./factoryTerminalRender.ts";

export { SCREEN_WIDTH, SCREEN_HEIGHT } from "./framebuffer.ts";

export interface EngineState {
  frame: number;
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
  /** Confirm-relative hidden state for Battle 2's bounded first ROCK SLIDE. */
  battle2Turn1: Battle2Turn1State | null;
  /**
   * Pure generic round rules, opt-in through createInitialState's scenario
   * injection. The canonical pixel path remains unwired and therefore null.
   */
  roundController: RoundControllerState | null;
  /** Dev-probe staged battle port; null on the canonical production path. */
  stagedBattleTurn: StagedBattleTurnState | null;
  /** Dev-probe relative Battle Scene ON move presentation. */
  sceneOnPresentation: SceneOnMovePresentationState | null;
  /** Live Factory swap-YES controller + presentation adapter. */
  factorySwap: FactorySwapPresentationState | null;
  /** Source-relative Factory lobby terminal adapter for roundLost. */
  factoryTerminal: FactoryTerminalPresentationState | null;
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
}

export function createInitialState(
  options: InitialEngineStateOptions = {},
): EngineState {
  return {
    frame: 0,
    draftScreen: ANCHOR_DRAFT_SCREEN_STATE,
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
    battle2Turn1: null,
    roundController: options.battleScenario
      ? createRoundController(options.battleScenario)
      : null,
    stagedBattleTurn: null,
    sceneOnPresentation: null,
    factorySwap: null,
    factoryTerminal: null,
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
  let battle2Turn1 = state.battle2Turn1 ?? null;
  let factorySwap = state.factorySwap ?? null;
  let factoryTerminal = state.factoryTerminal;
  const currentTrainerPresentation = factoryTrainerPresentationForOpponent(
    state.roundController?.rules.currentOpponent,
  ) ?? undefined;
  const pendingTerminalCommand = state.roundController?.presentation?.command;
  if (
    factoryTerminal === null &&
    pendingTerminalCommand !== undefined &&
    (
      pendingTerminalCommand.type === "roundLost" ||
      pendingTerminalCommand.type === "roundCompleted"
    )
  ) {
    factoryTerminal = createFactoryTerminalPresentation(pendingTerminalCommand);
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
    const roundController =
      completion !== null &&
      state.roundController?.presentation?.command.commandId ===
        completion.commandId
        ? completeBattlePresentation(state.roundController, completion)
        : state.roundController;
    return {
      ...state,
      frame: state.frame + 1,
      keyRepeat,
      factoryTerminal,
      roundController,
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
      let nextFactorySwap = advanceFactorySwapPresentation(factorySwap);
      if (nextFactorySwap.controller.phase === "summaryFade") {
        if (
          summaryScreen.onInfoPage &&
          nextFactorySwap.phaseElapsed >= 63 &&
          newKeys.has("B")
        ) {
          summaryScreen = requestSummaryScreenExit(summaryScreen);
          nextFactorySwap = beginFactorySwapSummaryReturn(nextFactorySwap);
        }
      } else if (nextFactorySwap.controller.phase !== "summaryReturn") {
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
          battleRoom.encounter === "jenson" &&
          battleRoom.elapsed === BATTLE_2_SCENE_HANDOFF_ELAPSED
        ) {
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
    } else if (postwinContinuationInputReady(nextPostwin)) {
      if (newAndRepeatedKeys.has("DOWN")) {
        nextPostwin = movePostwinContinuationCursor(nextPostwin, 1);
      } else if (newAndRepeatedKeys.has("UP")) {
        nextPostwin = movePostwinContinuationCursor(nextPostwin, -1);
      } else if (newKeys.has("A")) {
        nextPostwin = acceptPostwinContinuation(nextPostwin);
      }
    }
    if (
      nextPostwin.dialoguePage >= 1 &&
      nextPostwin.dialoguePage <= 3 &&
      postwinDialogueInputReady(nextPostwin) &&
      newKeys.has("A")
    ) {
      nextPostwin = acceptPostwinDialoguePage(nextPostwin);
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
          factorySwap = createCanonicalFactorySwapPresentation();
        } else {
          nextPostwin = acceptPostwinSwapDecline(nextPostwin);
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
    // S7 slice K (docs/battle-turn-notes.md §24): this engine's FIRST
    // input-gated BATTLE TEXT (as opposed to a menu re-open) - turn 5's own
    // "Foe GROVYLE fainted!" message holds indefinitely (see `turn5KoDismiss
    // Elapsed`'s own doc) until the player presses A while the fainted
    // text's own wait-cursor is showing. Uses the same `elapsed+1` ("last
    // frame of the press") convention as `confirmFightMove`/`openFightSubmenu`
    // below (not `sendOutPressElapsed`'s own bare `elapsed`) since this is a
    // real button-press anchor in the same family as those, oracle-confirmed
    // against the committed groundtruth trace's own A-press (frames
    // 6560-6561).
    if (
      battleScene.turn4Resolved &&
      battleScene.turn5KoDismissElapsed === null &&
      newKeys.has("A") &&
      turn5RockSlideKoDismissEligible(SCENE_TICK0 + battleScene.elapsed + 1)
    ) {
      battleScene = { ...battleScene, turn5KoDismissElapsed: battleScene.elapsed + 1 };
    }
    // S7/S8 turn 13 rung 3 (docs/turn13-notes.md §4/§7): Pidgeotto's own
    // DRAGON_BREATH-faint KO-text dismiss - mirrors the `turn5KoDismissElapsed`
    // block above EXACTLY (same gating shape, same "created directly, same
    // tick already reflects it" idiom). Gated on `turn12Resolved` (we can
    // only be inside turn 13's own window once turn 12's reopen has
    // happened) rather than any turn13Resolved flag (that flag doesn't
    // exist yet - the reopen-for-turn-14 transition is a later rung's job).
    if (
      battleScene.turn12Resolved &&
      battleScene.turn13KoDismissElapsed === null &&
      newKeys.has("A") &&
      turn13KoDismissEligible(SCENE_TICK0 + battleScene.elapsed + 1)
    ) {
      battleScene = { ...battleScene, turn13KoDismissElapsed: battleScene.elapsed + 1 };
    }
    // Turn 15's player-side faint is the first forced party-select path.
    // Register the same A edge that dismisses the fully printed ONIX text;
    // subsequent DOWN/A edges are reduced independently by partySelect.ts.
    if (
      battleScene.turn14Resolved &&
      battleScene.turn15PartySelect === undefined &&
      newKeys.has("A") &&
      turn15KoDismissEligible(SCENE_TICK0 + battleScene.elapsed + 1)
    ) {
      battleScene = { ...battleScene, turn15PartySelect: INITIAL_PARTY_SELECT_STATE };
    } else if (battleScene.turn15PartySelect) {
      const previousParty = battleScene.turn15PartySelect;
      const nextParty = advancePartySelect(previousParty, newKeys);
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
        turn15PartySelect: nextParty,
      };
    }
    // Turn 17's opponent-faint text is a genuine input gate.  Register only
    // a fresh A edge after the confirmation-relative wait-cursor epoch; an
    // early edge is dropped, and idle time alone can never dismiss it.
    if (
      (battleScene.turn16Resolved ?? false) &&
      (battleScene.turn17KoDismissElapsed ?? null) === null &&
      battleScene.fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      turn17KoDismissEligible(
        battleScene.elapsed + 1,
        battleScene.fightSubmenu.confirmElapsed,
      )
    ) {
      battleScene = {
        ...battleScene,
        turn17KoDismissElapsed: battleScene.elapsed + 1,
      };
    }
    // The frontier-win printstring is a second, independent input gate.
    // Store its real A edge once; rendering freezes that exact cursor pose
    // until the trainer-slide controller becomes visible.
    if (
      (battleScene.turn17KoDismissElapsed ?? null) !== null &&
      (battleScene.turn17OutcomeDismissElapsed ?? null) === null &&
      newKeys.has("A") &&
      turn17OutcomeDismissEligible(
        battleScene.elapsed + 1,
        battleScene.turn17KoDismissElapsed ?? null,
        battleScene.trainerPresentation,
      )
    ) {
      battleScene = {
        ...battleScene,
        turn17OutcomeDismissElapsed: battleScene.elapsed + 1,
      };
    }
    // DESTIN's expanded Easy Chat quote ends in PAUSE_UNTIL_PRESS. Unlike
    // the prior battle printers this wait draws no cursor, but it remains a
    // genuine one-shot A gate. The accepted edge starts every postwin clock.
    if (
      (battleScene.turn17OutcomeDismissElapsed ?? null) !== null &&
      (battleScene.turn17LossDismissElapsed ?? null) === null &&
      newKeys.has("A") &&
      turn17LossDismissEligible(
        battleScene.elapsed + 1,
        battleScene.turn17OutcomeDismissElapsed ?? null,
        battleScene.trainerPresentation,
      )
    ) {
      battleScene = {
        ...battleScene,
        turn17LossDismissElapsed: battleScene.elapsed + 1,
      };
      const opponentRecords =
        state.roundController?.rules.currentOpponent.rentalRecords;
      postwin = opponentRecords === undefined
        ? createPostwinState()
        : createPostwinState(createFactoryCorpusParty(opponentRecords));
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
    const partySendOutElapsed = battleScene.turn15PartySelect?.sendOutElapsed;
    const currentActiveMoveset = () =>
      partySendOutElapsed !== null &&
      partySendOutElapsed !== undefined &&
      partySendOutBattleMenuReady(partySendOutElapsed)
        ? fightSubmenu.activeMonMoveset
        : activeMonMoveset(draftScreen);
    let turn1Resolved = battleScene.turn1Resolved;
    let turn2Resolved = battleScene.turn2Resolved;
    let turn3Resolved = battleScene.turn3Resolved;
    let turn4Resolved = battleScene.turn4Resolved;
    let turn5Resolved = battleScene.turn5Resolved;
    let turn6Resolved = battleScene.turn6Resolved;
    let turn7Resolved = battleScene.turn7Resolved;
    let turn8Resolved = battleScene.turn8Resolved;
    let turn9Resolved = battleScene.turn9Resolved;
    let turn10Resolved = battleScene.turn10Resolved;
    let turn11Resolved = battleScene.turn11Resolved;
    let turn12Resolved = battleScene.turn12Resolved;
    let turn13Resolved = battleScene.turn13Resolved;
    let turn14Resolved = battleScene.turn14Resolved;
    let turn16Resolved = battleScene.turn16Resolved ?? false;
    let turn17MenuRedrawElapsed = battleScene.turn17MenuRedrawElapsed ?? null;
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
      !turn1Resolved &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + ROCK_SLIDE_MENU_REDRAW_DELAY
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
      turn1Resolved = true;
    } else if (
      turn1Resolved &&
      !turn2Resolved &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + DRAGONBREATH_MENU_REDRAW_DELAY
    ) {
      // S7 slice F (docs/battle-turn-notes.md §13): turn 2's whole resolution
      // has redrawn the settled action menu by now (`DRAGONBREATH_MENU_
      // REDRAW_DELAY` past its own confirm) - a fresh A-press reopens FIGHT
      // for turn 3, cursor persisted at slot 2 (DRAGON_BREATH, where turn 2's
      // own confirm left it) rather than reset to slot 0 - unlike turn 1->2's
      // own reopen, this is a REAL exercise of cursor persistence (turn 1->2
      // rested at slot 0 both times, so it never distinguished "always reset"
      // from "persist" - see `openFightSubmenu`'s own doc).
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen), 2);
      turn2Resolved = true;
    } else if (
      turn2Resolved &&
      !turn3Resolved &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN3_ROCKSLIDE_REOPEN_GATE_DELAY
    ) {
      // S7 slice I (docs/battle-turn-notes.md §13/§22): turn 3's whole
      // ROCK_SLIDE resolution has redrawn the settled action menu by now
      // (`TURN3_ROCKSLIDE_REOPEN_GATE_DELAY` past turn 3's own real confirm)
      // - a fresh A-press reopens FIGHT for turn 4, cursor persisted at slot
      // 0 (ROCK_SLIDE, unchanged since turn 3 - no UP-nav needed this time,
      // §13's own ledger).
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen));
      turn3Resolved = true;
    } else if (
      turn3Resolved &&
      !turn4Resolved &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN4_ROCKSLIDE_MENU_REDRAW_DELAY
    ) {
      // S7 slice J (docs/battle-turn-notes.md §13/§23): turn 4's whole
      // ROCK_SLIDE resolution has redrawn the settled action menu by now
      // (`TURN4_ROCKSLIDE_MENU_REDRAW_DELAY` past turn 4's own real confirm -
      // directly usable, unlike `TURN3_ROCKSLIDE_REOPEN_GATE_DELAY`'s own
      // synthetic-anchor correction, since turn 4's own ROCK_SLIDE was
      // already anchored to a real press) - a fresh A-press reopens FIGHT
      // for turn 5, cursor persisted at slot 0 (ROCK_SLIDE, unchanged since
      // turn 3 - no UP-nav needed this time, §13's own ledger).
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen));
      turn4Resolved = true;
    } else if (
      turn4Resolved &&
      !turn5Resolved &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN5_SITRUS_MENU_REOPEN_GATE_DELAY
    ) {
      // S7 slice N (docs/turn6-notes.md, docs/battle-turn-notes.md §19-24's
      // "parameterize, don't rebuild" pattern): turn 5's whole faint/switch-
      // in/Sitrus-heal sequence has settled the turn-6 action menu by now
      // (`TURN5_SITRUS_MENU_REOPEN_GATE_DELAY` past turn 5's own real
      // confirm) - a fresh A-press reopens FIGHT for turn 6, cursor
      // persisted at slot 0 (ROCK_SLIDE, unchanged since turn 3 - no nav
      // needed, docs/turn6-notes.md §4's own ledger).
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen));
      turn5Resolved = true;
    } else if (
      turn5Resolved &&
      !turn6Resolved &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN6_ROCKSLIDE_REOPEN_GATE_DELAY
    ) {
      // S7 slice O (docs/turn7-notes.md, docs/battle-turn-notes.md §32):
      // turn 6's whole ROCK_SLIDE resolution has redrawn the settled action
      // menu by now (`TURN6_ROCKSLIDE_REOPEN_GATE_DELAY` past turn 6's own
      // real confirm) - a fresh A-press reopens FIGHT for turn 7, cursor
      // persisted at slot 0 (ROCK_SLIDE, unchanged) - no nav needed,
      // turn7-notes §5's own "cursor persistence confirmed" ledger.
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen));
      turn6Resolved = true;
    } else if (
      turn6Resolved &&
      !turn7Resolved &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN7_ROCKSLIDE_REOPEN_GATE_DELAY
    ) {
      // S7 slice P (docs/turn8-notes.md, docs/battle-turn-notes.md §33):
      // turn 7's whole ROCK_SLIDE resolution has redrawn the settled action
      // menu by now (`TURN7_ROCKSLIDE_REOPEN_GATE_DELAY` past turn 7's own
      // real confirm) - a fresh A-press reopens FIGHT for turn 8, cursor
      // persisted at slot 0 (ROCK_SLIDE, unchanged) - the winning line's own
      // divergence happens via the nav branch above (one RIGHT press onto
      // BIND), not at reopen.
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen));
      turn7Resolved = true;
    } else if (
      turn7Resolved &&
      !turn8Resolved &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN8_MENU_REDRAW_DELAY
    ) {
      // S7 slice R (docs/turn9-notes.md, docs/battle-turn-notes.md §35):
      // turn 8's own BIND-miss resolution has redrawn the settled action
      // menu by now (`TURN8_MENU_REDRAW_DELAY` past turn 8's own real
      // confirm - directly usable, same "no synthetic anchor needed" reason
      // `TURN4_ROCKSLIDE_MENU_REDRAW_DELAY` already established) - a fresh
      // A-press reopens FIGHT for turn 9, cursor persisted at slot 1 (BIND,
      // where turn 8's own confirm left it) - turn 9's own `LEFT` press then
      // moves it back onto ROCK_SLIDE via the generic nav branch above.
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen), 1);
      turn8Resolved = true;
    } else if (
      turn8Resolved &&
      !turn9Resolved &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN9_MENU_REDRAW_DELAY
    ) {
      // S7 slice R rung (a) (docs/turn10-notes.md): turn 9's own whole
      // resolution has redrawn the settled action menu by now (`TURN9_MENU_
      // REDRAW_DELAY` past turn 9's own real confirm) - a fresh A-press
      // reopens FIGHT for turn 10, cursor persisted at slot 0 (ROCK_SLIDE,
      // where turn 9's own `LEFT` press + confirm left it) - zero further
      // nav needed, docs/turn10-notes.md §4/§5's own "zero navigation
      // presses this turn" ledger.
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen));
      turn9Resolved = true;
    } else if (
      turn9Resolved &&
      !turn10Resolved &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN10_ROCKSLIDE_MENU_REDRAW_DELAY
    ) {
      // S7 slice R rung 1 (docs/turn11-notes.md): turn 10's own whole
      // ROCK_SLIDE resolution has redrawn the settled action menu by now
      // (`TURN10_ROCKSLIDE_MENU_REDRAW_DELAY` past turn 10's own SYNTHETIC
      // `TURN10_ROCKSLIDE_PRESS_TICK` - no player press for the AI-adjacent
      // second half of a turn, same reason every synthetic `TURNn_ROCKSLIDE_
      // PRESS_TICK` anchor already exists) - a fresh A-press reopens FIGHT
      // for turn 11, cursor persisted at slot 0 (ROCK_SLIDE, unchanged) -
      // zero further nav needed, docs/turn11-notes.md §1's own "zero
      // navigation presses this turn" ledger.
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen));
      turn10Resolved = true;
    } else if (
      turn10Resolved &&
      !turn11Resolved &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN11_ROCKSLIDE_MENU_REDRAW_DELAY
    ) {
      // S7/S8 (docs/turn12-notes.md): turn 11's own whole ROCK_SLIDE
      // resolution has redrawn the settled action menu by now
      // (`TURN11_ROCKSLIDE_MENU_REDRAW_DELAY` past turn 11's own real
      // confirm) - a fresh A-press reopens FIGHT for turn 12, cursor
      // persisted at slot 0 (ROCK_SLIDE, unchanged) - zero further nav
      // needed, docs/turn12-notes.md §1's own "zero navigation presses this
      // turn" ledger.
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen));
      turn11Resolved = true;
    } else if (
      turn11Resolved &&
      !turn12Resolved &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN12_ROCKSLIDE_MENU_REDRAW_DELAY
    ) {
      // S7/S8 (docs/turn13-notes.md): turn 12's own whole ROCK_SLIDE (miss)
      // resolution has redrawn the settled action menu by now
      // (`TURN12_ROCKSLIDE_MENU_REDRAW_DELAY` past turn 12's own synthetic
      // `TURN12_ROCKSLIDE_PRESS_TICK`) - a fresh A-press reopens FIGHT for
      // turn 13, cursor persisted at slot 0 (ROCK_SLIDE, unchanged) - turn
      // 13's own single `DOWN` press then moves it onto DRAGON_BREATH via the
      // generic nav branch above.
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen));
      turn12Resolved = true;
    } else if (
      turn12Resolved &&
      !turn13Resolved &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN13_DRAGONBREATH_MENU_REDRAW_DELAY
    ) {
      // S7/S8 (docs/turn14-notes.md): turn 13's own whole DRAGON_BREATH-
      // faint/MURKROW-switch-in resolution has redrawn the settled action
      // menu by now (`TURN13_DRAGONBREATH_MENU_REDRAW_DELAY` past turn 13's
      // own real confirm) - a fresh A-press reopens FIGHT for turn 14,
      // cursor persisted at slot 2 (DRAGON_BREATH, where turn 13's own
      // confirm left it) - no further nav needed, docs/turn14-notes.md's
      // own "cursor persisted... NO DOWN press this turn" ledger. Mirrors
      // `turn12Resolved`'s own branch exactly, per the brief.
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen), 2);
      turn13Resolved = true;
    } else if (
      turn13Resolved &&
      !turn14Resolved &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN14_DRAGONBREATH_MENU_REDRAW_DELAY
    ) {
      // S7/S8 (docs/turn15-notes.md): turn 14's own whole DRAGON_BREATH-
      // auto-miss resolution has redrawn the settled action menu by now
      // (`TURN14_DRAGONBREATH_MENU_REDRAW_DELAY` past turn 14's own real
      // confirm) - a fresh A-press reopens FIGHT for turn 15, cursor
      // persisted at slot 2 (DRAGON_BREATH, unchanged since turn 13/14) -
      // no further nav needed, docs/turn15-notes.md's own "cursor
      // persisted... no nav" ledger. Mirrors `turn13Resolved`'s own branch
      // exactly, per the brief.
      fightSubmenu = openFightSubmenu(battleScene.elapsed + 1, activeMonMoveset(draftScreen), 2);
      turn14Resolved = true;
    } else if (
      turn14Resolved &&
      !turn16Resolved &&
      partySendOutElapsed !== null &&
      partySendOutElapsed !== undefined &&
      partySendOutBattleMenuReady(partySendOutElapsed) &&
      fightSubmenu.confirmElapsed !== null &&
      newKeys.has("A") &&
      sceneT >= SCENE_TICK0 + fightSubmenu.confirmElapsed + TURN16_FIRE_PUNCH_MENU_REDRAW_DELAY
    ) {
      // Turn 16's confirmation-relative FIRE_PUNCH/burn tail has created a
      // fresh action controller. Preserve that redraw anchor before
      // replacing the old confirmed submenu with turn 17's own state.
      turn17MenuRedrawElapsed = fightSubmenu.confirmElapsed + TURN16_FIRE_PUNCH_MENU_REDRAW_DELAY;
      fightSubmenu = openFightSubmenu(
        battleScene.elapsed + 1,
        fightSubmenu.activeMonMoveset,
        fightSubmenu.cursor,
      );
      turn16Resolved = true;
    }
    battleScene = {
      ...battleScene,
      fightSubmenu,
      turn1Resolved,
      turn2Resolved,
      turn3Resolved,
      turn4Resolved,
      turn5Resolved,
      turn6Resolved,
      turn7Resolved,
      turn8Resolved,
      turn9Resolved,
      turn10Resolved,
      turn11Resolved,
      turn12Resolved,
      turn13Resolved,
      turn14Resolved,
      turn16Resolved,
      turn17MenuRedrawElapsed,
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
      battle2Turn1 = battle2Turn1State(sceneT, confirmTick);
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
      battle2Turn1,
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
      for (let i = 0; i < opponentSetupExtraRngSteps(battleRoom); i += 1) {
        rngValue = advanceRngValue(rngValue);
      }
      // S6 scene-assembly handoff (battleScene.ts doc): the CIRCLES_MEET
      // transition's own post-fade black hold ("settled" phase) is
      // indefinite on its own - this is the fixed elapsed count matching
      // the ground-truth trace's own window start (trace tick 1040).
      if (battleRoom?.phase === "settled" && battleRoom.elapsed === BATTLE_SCENE_HANDOFF_ELAPSED) {
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
    return { ...state, frame: state.frame + 1, draftScreen, keyRepeat, summaryScreen, prebattleRoom, battleRoom, battleScene, battleSetup, rngMode, rngValue };
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
          trainerPresentation: currentTrainerPresentation,
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

    if (beforeContinuation) {
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
    if (
      healDismiss !== null &&
      age >= healDismiss + POSTWIN_CONTINUATION_MENU_VISIBLE_DELAY &&
      (
        postwin.dialoguePage === 0 ||
        (postwin.dialoguePage === 1 && dialogueDelay === 0)
      )
    ) {
      drawStandardWindowFrame(fb, 152, 32, 6, 8);
      const choices = ["GO ON", "RECORD", "REST", "RETIRE"];
      for (let i = 0; i < choices.length; i += 1) {
        drawStandardWindowText(fb, choices[i]!, 168, 41 + i * 16);
      }
      drawStandardWindowText(
        fb,
        "▶",
        160,
        41 + (postwin.continuationCursorPos ?? 0) * 16,
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

function renderWithoutFactoryTerminal(state: EngineState): Uint8Array {
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
            summary.monTransition,
            summaryMonAnimClock,
            animateSwitchedMon,
            summary.page,
          );
        }
        return summary.onInfoPage
          ? renderSummaryInfoPage(summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon)
          : renderPopup(0, 0);
      }
      const isEntry = transition.direction === "toSummary";
      if (transition.phase === "black") {
        const holdTicks = isEntry ? ENTRY_BLACK_HOLD_TICKS : 25;
        if (transition.elapsed + 1 < holdTicks) return blackFrame();
        const bgY = bgFadeY(0, FADE_IN);
        const objY = objFadeY(0, FADE_IN);
        return isEntry
          ? renderSummaryInfoPageFaded(summary.selectedSlot, bgY, objY)
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
        summary.selectedSlot,
        summaryMonAnimClock,
        summary.moveSelect,
        animateSwitchedMon,
        summary.page as "battleMoves" | "contestMoves",
      );
    }
    if (summary.monTransition) {
      return renderSummaryMonTransition(
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
          ? renderSummarySkillsPage(summary.selectedSlot, summary.openElapsed + 1, animateSwitchedMon)
          : pageTransition.fromPage === "battleMoves"
            ? renderSummaryBattleMovesPage(summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon)
            : pageTransition.fromPage === "contestMoves"
              ? renderSummaryContestMovesPage(summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon)
              : renderSummaryInfoPage(summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon);
      }
      if (layers.movingPage === pageTransition.toPage && pageTransition.elapsed <= 2) {
        return renderSummaryPageCleared(
          summary.selectedSlot,
          summaryMonAnimClock,
          pageTransition.fromPage,
          animateSwitchedMon,
        );
      }
      return renderSummaryPageTransition(
        summary.selectedSlot,
        pageTransition,
        summaryMonAnimClock,
        animateSwitchedMon,
      );
    }
    return summary.isOpen
      ? summary.page === "skills"
        ? renderSummarySkillsPage(summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon)
        : summary.page === "battleMoves"
          ? renderSummaryBattleMovesPage(summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon)
          : summary.page === "contestMoves"
            ? renderSummaryContestMovesPage(summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon)
        : renderSummaryInfoPage(summary.selectedSlot, summaryMonAnimClock, animateSwitchedMon)
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
      ? renderSummaryInfoPageFaded(summary.selectedSlot, bgY, objY)
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
        summary.selectedSlot,
        summary.page,
        bgY,
        objY,
        summaryMonAnimClock,
        animateSwitchedMon,
      );
}

export function render(state: EngineState): Uint8Array {
  if (state.factoryTerminal) {
    return renderFactoryTerminalPresentation(
      state.factoryTerminal,
      () => renderWithoutFactoryTerminal({ ...state, factoryTerminal: null }),
    );
  }
  return renderWithoutFactoryTerminal(state);
}
