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
  requestSummaryScreenExit,
  type SummaryScreenState,
} from "./summaryScreen.ts";
import { renderSummaryInfoPage, renderSummaryInfoPageFaded } from "./summaryInfoPage.ts";
import {
  advancePrebattleRoom,
  INITIAL_PREBATTLE_ROOM_STATE,
  messageBoxVisible,
  visiblePrintedChars,
  EXIT_TO_ROOM_BLACK_HOLD_TICKS,
  type PrebattleRoomState,
} from "./prebattleRoom.ts";
import { drawMessageBox, renderPrebattleRoomScene } from "./prebattleRoomRender.ts";

export { SCREEN_WIDTH, SCREEN_HEIGHT } from "./framebuffer.ts";

export interface EngineState {
  frame: number;
  draftScreen: DraftScreenState;
  keyRepeat: KeyRepeatState;
  summaryScreen: SummaryScreenState;
  /** null until A-on-YES (S5 final slice); see prebattleRoom.ts. Once set, no input is processed and this owns rendering exclusively - draftScreen still advances its ball anims through the "fadingOut" phase (see tick()'s prebattleRoom branch) since the real sprites aren't torn down until the fade completes. */
  prebattleRoom: PrebattleRoomState | null;
  /** gRngValue (src/random.c) - advances once per VBlank always (main.c:366); see rng.ts. */
  rngValue: number;
}

export function createInitialState(): EngineState {
  return {
    frame: 0,
    draftScreen: ANCHOR_DRAFT_SCREEN_STATE,
    keyRepeat: INITIAL_KEY_REPEAT_STATE,
    summaryScreen: CLOSED_SUMMARY_SCREEN_STATE,
    prebattleRoom: null,
    rngValue: ANCHOR_RNG_VALUE,
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
  // main.c:366 - Random() advances once per VBlank unconditionally outside
  // frontier battles, so this always happens before any ball-roll draw below.
  let rngValue = advanceRngValue(state.rngValue);
  let prebattleRoom: PrebattleRoomState | null = state.prebattleRoom;

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
    prebattleRoom = advancePrebattleRoom(prebattleRoom);
    return { ...state, frame: state.frame + 1, draftScreen, keyRepeat, summaryScreen, prebattleRoom, rngValue };
  }

  if (summaryScreen.transition) {
    // Select_Task_OpenSummaryScreen's STATE_SUMMARY_FADE/CLEAN/SHOW (and the
    // symmetric close path) own the screen exclusively while a fade is in
    // flight - the draft screen's own tasks are torn down/frozen, so no
    // input is processed and none of its per-tick redraw state advances.
  } else if (summaryScreen.onInfoPage) {
    // pokemon_summary_screen.c's Task_HandleInput on the (lockMovesFlag-gated
    // reachable-but-inert) Info page: only B (Cancel) is wired this slice -
    // mon-switching/page-change/move-select are out of scope (see module doc).
    if (newKeys.has("B")) summaryScreen = requestSummaryScreenExit(summaryScreen);
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
          // stays valid throughout).
          confirmReveal = { phase: "closing", elapsed: 0, accepting: true };
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

function renderPrebattleRoomState(state: EngineState): Uint8Array {
  const p = state.prebattleRoom!;
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
  const fb = createFramebuffer();
  renderPrebattleRoomScene(fb);
  if (messageBoxVisible(p)) drawMessageBox(fb, visiblePrintedChars(p));
  return fb;
}

export function render(state: EngineState): Uint8Array {
  if (state.prebattleRoom) return renderPrebattleRoomState(state);
  const summary = state.summaryScreen;
  const t = summary.transition;
  if (!t) {
    return summary.onInfoPage ? renderSummaryInfoPage(summary.selectedSlot) : renderFactoryDraftScreen(state.draftScreen);
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
    : renderSummaryInfoPageFaded(summary.selectedSlot, bgY, objY);
}
