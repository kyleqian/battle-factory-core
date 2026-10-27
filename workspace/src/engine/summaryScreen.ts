// S4 slice-1 summary-screen state machine: entry (A on the draft menu's
// SUMMARY option) through the settled static Info page, and B-exit back to
// the draft screen. Reproduces battle_factory_screen.c's
// Select_Task_OpenSummaryScreen (STATE_SUMMARY_FADE/CLEAN/SHOW, :1456-1493)
// and pokemon_summary_screen.c's fade-in/close tasks as three fixed-length
// phases per direction, using paletteFade.ts's oracle-pinned tick counts -
// see docs/summary-screen-notes.md §1/§4 and paletteFade.ts's module doc.
//
// Rendering the destination screens (draft chrome during the entry
// fade-out/exit fade-in, the static Info page during the entry fade-in/exit
// fade-out) is NOT wired up yet - this module only pins the mode/phase/tick
// state machine and the selected-slot/page bookkeeping that S4's next slice
// renders against. See PROGRESS.md for the exact reported remainder.

import {
  ENTRY_BLACK_HOLD_TICKS,
  ENTRY_FADE_OUT_TICKS,
  EXIT_BLACK_HOLD_TICKS,
  EXIT_FADE_OUT_TICKS,
  FADE_IN_TICKS,
} from "./paletteFade.ts";

export type SummaryPhase = "fadingOut" | "black" | "fadingIn";

/** SUMMARY_MODE_LOCK_MOVES's reachable pages (pokemon_summary_screen.c:1121). */
export type SummaryPage = "info" | "skills" | "battleMoves" | "contestMoves";
export type SummaryMode = "SUMMARY_MODE_LOCK_MOVES" | "SUMMARY_MODE_NORMAL";
export type SummaryReturnTarget = "draft" | "factorySwap";
export type SummaryPageDirection = "left" | "right";

export interface SummaryPageTransition {
  readonly fromPage: SummaryPage;
  readonly toPage: SummaryPage;
  readonly direction: SummaryPageDirection;
  /** Source-relative clock: 0 is the accepted input tick, 10 is settled. */
  readonly elapsed: number;
}

export type SummaryMonDirection = "up" | "down";

export interface SummaryMonTransition {
  readonly fromSlot: number;
  readonly toSlot: number;
  readonly direction: SummaryMonDirection;
  /** Source-relative clock: 0 is the accepted input tick, 20 is input-ready. */
  readonly elapsed: number;
}

export type SummaryMoveSelectPhase = "open" | "closing";

/**
 * SwitchToMoveSelection / Task_HandleInput_MoveSelect. LOCK_MOVES still
 * reaches this inspection mode, but A and B both close it before the
 * move-position-switch task can be installed.
 */
export interface SummaryMoveSelectState {
  readonly phase: SummaryMoveSelectPhase;
  /** Source firstMoveIndex; 0..3 are moves and 4 is the CANCEL row. */
  readonly selectedMoveIndex: number;
  /** One-VBlank-lagged index owned by BG/OAM presentation. */
  readonly presentedMoveIndex: number;
  /** Ticks since entry or close was accepted (0 is the accepting tick). */
  readonly elapsed: number;
  /** SpriteCB_MoveSelector's local 0..31 blink clock; navigation resets it. */
  readonly selectorAnimationClock: number;
  /** Non-null through the source's two-tick BG/OAM handoff after navigation. */
  readonly pendingPresentedMoveIndex: number | null;
  readonly pendingPresentationTicks: number;
  /**
   * ChangeSelectedMove's CANCEL-row branches restart Task_SlidePowerAccWindow:
   * a move -> CANCEL step slides the effect panel out (0, +3) and clears the
   * POWER/ACCURACY + description windows; CANCEL -> a move slides it back in
   * (9, -3) and re-puts the label window when the slide ends. Absent/null
   * until the cursor first enters or leaves the CANCEL row.
   */
  readonly cancelSlide?: SummaryMoveCancelSlide | null;
}

export interface SummaryMoveCancelSlide {
  readonly toCancel: boolean;
  /** First render (in `elapsed`) that shows a CANCEL -> move step. */
  readonly revealAt: number;
  /** Ticks since the accepting tick (0 renders the prior panel). */
  readonly elapsed: number;
  /** Panel presentation the accepting tick would have rendered without the step. */
  readonly prior: SummaryMovePanelPresentation;
}

/** BG0/BG1-2 state of the move-effect sliding panel for one render. */
export interface SummaryMovePanelPresentation {
  /** CopyNColumnsToTilemap's tVisibleColumns (0 = fully shown, 10 = gone). */
  readonly hiddenColumns: number;
  /** PSS_LABEL_WINDOW_MOVES_POWER_ACC / APPEAL_JAM tilemap is put. */
  readonly labelsShown: boolean;
  /** PSS_LABEL_WINDOW_PORTRAIT_SPECIES tilemap is put. */
  readonly speciesShown: boolean;
}

const SLIDING_WINDOW_WIDTH = 10; // sPowerAccSlidingWindow / sAppealJamSlidingWindow .width

function cancelSlidePanel(slide: SummaryMoveCancelSlide): SummaryMovePanelPresentation {
  const n = slide.elapsed;
  if (n === 0) return slide.prior;
  if (slide.toCancel) {
    // PositionPowerAccSlidingWindow(0, 3): the task's first step runs on the
    // accepting tick; each step reaches the screen on the following render.
    // Reaching the width re-puts the portrait species window.
    const hiddenColumns = Math.min(SLIDING_WINDOW_WIDTH, n * 3);
    return { hiddenColumns, labelsShown: false, speciesShown: hiddenColumns >= SLIDING_WINDOW_WIDTH };
  }
  // PositionPowerAccSlidingWindow(9, -3) after the species window is cleared;
  // reaching 0 re-puts the POWER/ACCURACY (APPEAL/JAM) label window. Oracle
  // (summary-{battle,contest}-move-select-cancel-row): the step reaches the
  // screen with the ordinary two-render selector handoff on Contest and one
  // render later on Battle (PrintMovePowerAndAccuracy's extra print), then
  // slides 6 / 3 / 0.
  if (n < slide.revealAt) return slide.prior;
  const hiddenColumns = Math.max(0, 6 - (n - slide.revealAt) * 3);
  return { hiddenColumns, labelsShown: hiddenColumns === 0, speciesShown: false };
}

/**
 * The move-effect panel for a move-select render, or null when the ordinary
 * page panel (no move-select tilemap) is shown.
 */
export function summaryMovePanelPresentation(
  select: SummaryMoveSelectState,
): SummaryMovePanelPresentation | null {
  if (select.phase === "closing") {
    // CloseMoveSelectMode only restarts the slide-out when the cursor is on a
    // move; from CANCEL the earlier slide-out keeps running untouched.
    if (select.selectedMoveIndex === SUMMARY_MOVE_CANCEL_INDEX && select.cancelSlide) {
      const panel = cancelSlidePanel(select.cancelSlide);
      return { ...panel, labelsShown: false };
    }
    // The accepting tick still renders the panel the open phase left.
    if (select.elapsed === 0 && select.cancelSlide) return cancelSlidePanel(select.cancelSlide);
    return {
      hiddenColumns: Math.min(SLIDING_WINDOW_WIDTH, select.elapsed * 3),
      labelsShown: select.elapsed === 0,
      speciesShown: false,
    };
  }
  if (select.cancelSlide) return cancelSlidePanel(select.cancelSlide);
  if (select.elapsed < SUMMARY_MOVE_SELECT_INSTALL_TICKS) return null;
  const hiddenColumns = Math.max(0, 9 - (select.elapsed - 2) * 3);
  return { hiddenColumns, labelsShown: select.elapsed >= 5, speciesShown: false };
}

/** Render-time move index whose details (POWER/ACCURACY, description) are drawn, or null. */
export function summaryMoveDetailIndex(select: SummaryMoveSelectState): number | null {
  // PrintMovePowerAndAccuracy's already-mapped label window reaches VRAM one
  // tick before the description/selector OAM handoff.
  const index =
    select.pendingPresentationTicks > 1 ? select.presentedMoveIndex : select.selectedMoveIndex;
  // PrintMoveDetails(MOVE_NONE) clears the description window on CANCEL.
  if (index === SUMMARY_MOVE_CANCEL_INDEX || select.presentedMoveIndex === SUMMARY_MOVE_CANCEL_INDEX) {
    return null;
  }
  return index;
}

export const SUMMARY_MOVE_CANCEL_INDEX = 4;
/** Renders until a CANCEL -> move step reaches the selector, description and panel. */
export function summaryMoveCancelLeaveTicks(page: SummaryPage): number {
  return page === "battleMoves" ? 3 : 2;
}

/**
 * Selector row for a move-select render. A move -> CANCEL step only clears
 * windows, so its selector lands one render before the ordinary two-tick
 * handoff (oracle: summary-battle-move-select-cancel-row frame 200).
 */
export function summaryMoveSelectorRow(select: SummaryMoveSelectState): number {
  return select.selectedMoveIndex === SUMMARY_MOVE_CANCEL_INDEX && select.pendingPresentationTicks <= 1
    ? SUMMARY_MOVE_CANCEL_INDEX
    : select.presentedMoveIndex;
}
export const SUMMARY_MOVE_SELECT_INSTALL_TICKS = 3;
export const SUMMARY_MOVE_SELECT_CLOSE_TICKS = 4;

/**
 * Task_ChangeSummaryMon returns Task_HandleInput on DOWN+21. The visible
 * replacement is staged before then (old portrait removal at +4, new
 * portrait at +16, types at +17, mon info at +18, page text at +19/+20).
 */
export const SUMMARY_MON_TRANSITION_TICKS = 20;
export const SUMMARY_MON_MAX_SLOT = 5;

/**
 * Task_HandleInput -> ChangePage -> PssScroll{Right,Left} observed clock.
 * The task handoff/window clear becomes visible at +4; seven 32px scroll
 * steps follow and the destination owns input at +10.
 */
export const SUMMARY_PAGE_TRANSITION_TICKS = 10;
export const SUMMARY_PAGE_SCROLL_STEP_PX = 32;
export const SUMMARY_PAGE_SCROLL_STEPS = 8;

export interface SummaryPageLayerOffsets {
  /** Page carried by the moving BG1/BG2 layer. */
  readonly movingPage: SummaryPage;
  /** Screen-space X offset of that page's 256px screen block. */
  readonly movingX: number;
  /** Page exposed below the moving layer (BG3 for Info↔Skills). */
  readonly fixedPage: SummaryPage;
}

/**
 * Source-equivalent BG1/BG2 page-block placement during ChangePage.
 *
 * RIGHT points the destination tilemap at the second 32x32 screen block and
 * advances HOFS by 32px per callback, sliding that block in from x=256.
 * LEFT keeps the outgoing block in front and slides it back toward x=256.
 * BG3/OBJ never move.
 */
export function summaryPageLayerOffsets(
  transition: SummaryPageTransition,
): SummaryPageLayerOffsets {
  if (transition.direction === "right") {
    const steps = Math.min(SUMMARY_PAGE_SCROLL_STEPS, transition.elapsed);
    return {
      movingPage: transition.toPage,
      movingX: 256 - steps * SUMMARY_PAGE_SCROLL_STEP_PX,
      fixedPage: transition.fromPage,
    };
  }
  const steps = Math.min(SUMMARY_PAGE_SCROLL_STEPS, transition.elapsed);
  return {
    movingPage: transition.fromPage,
    movingX: steps * SUMMARY_PAGE_SCROLL_STEP_PX,
    fixedPage: transition.toPage,
  };
}

export interface SummaryTransition {
  direction: "toSummary" | "toDraft";
  phase: SummaryPhase;
  /** Ticks since this phase started (0 = the tick the phase became active). */
  elapsed: number;
}

export interface SummaryScreenState {
  /** null once settled on the draft screen (factoryDraftScreen.ts owns rendering); a transition is in flight otherwise. */
  transition: SummaryTransition | null;
  /** True whenever the summary callback owns the screen, including non-Info pages. */
  isOpen: boolean;
  /** True once the entry transition has fully settled on the static Info page. */
  onInfoPage: boolean;
  /** Non-null while ChangePage's input handler is replaced by a scroll task. */
  pageTransition: SummaryPageTransition | null;
  /** Non-null while Task_ChangeSummaryMon owns input and replaces slot data. */
  monTransition: SummaryMonTransition | null;
  /** Non-null while the Moves-page selector or its close slide owns presentation. */
  moveSelect: SummaryMoveSelectState | null;
  /** Ticks since the entry fade settled; presentation-only, page changes do not reset it. */
  openElapsed: number;
  /** Replacement-local front-sprite clock; null before the first mon switch. */
  monAnimClock: number | null;
  /** SELECTABLE_MONS_COUNT - 1 = 5 max; the draft cursor slot the summary opened on / is currently viewing. */
  selectedSlot: number;
  page: SummaryPage;
  /** Exact ShowPokemonSummaryScreen mode supplied by the originating screen. */
  mode: SummaryMode;
  /** Callback destination invoked by CloseSummaryScreen. */
  returnTarget: SummaryReturnTarget;
}

export const CLOSED_SUMMARY_SCREEN_STATE: SummaryScreenState = {
  transition: null,
  isOpen: false,
  onInfoPage: false,
  pageTransition: null,
  monTransition: null,
  moveSelect: null,
  openElapsed: 0,
  monAnimClock: null,
  selectedSlot: 0,
  page: "info",
  mode: "SUMMARY_MODE_LOCK_MOVES",
  returnTarget: "draft",
};

function fadeOutTicks(direction: SummaryTransition["direction"]): number {
  return direction === "toSummary" ? ENTRY_FADE_OUT_TICKS : EXIT_FADE_OUT_TICKS;
}

function blackHoldTicks(direction: SummaryTransition["direction"]): number {
  return direction === "toSummary" ? ENTRY_BLACK_HOLD_TICKS : EXIT_BLACK_HOLD_TICKS;
}

/** Select_Task_OpenSummaryScreen's STATE_SUMMARY_FADE, triggered by A on the draft menu's SUMMARY option. `cursorPos` is the draft screen's currMonId (battle_factory_screen.c:1491). */
export function openSummaryScreen(
  cursorPos: number,
  options: {
    readonly mode?: SummaryMode;
    readonly returnTarget?: SummaryReturnTarget;
  } = {},
): SummaryScreenState {
  return {
    transition: { direction: "toSummary", phase: "fadingOut", elapsed: 0 },
    isOpen: false,
    onInfoPage: false,
    pageTransition: null,
    monTransition: null,
    moveSelect: null,
    openElapsed: 0,
    monAnimClock: null,
    selectedSlot: cursorPos,
    page: "info",
    mode: options.mode ?? "SUMMARY_MODE_LOCK_MOVES",
    returnTarget: options.returnTarget ?? "draft",
  };
}

/** pokemon_summary_screen.c's close path, triggered by B on the (unlocked, per SUMMARY_MODE_LOCK_MOVES) Info page. */
export function requestSummaryScreenExit(state: SummaryScreenState): SummaryScreenState {
  if (!state.isOpen || state.pageTransition || state.monTransition || state.moveSelect) return state;
  return {
    ...state,
    transition: { direction: "toDraft", phase: "fadingOut", elapsed: 0 },
    isOpen: false,
    onInfoPage: false,
  };
}

const PAGE_ORDER: readonly SummaryPage[] = ["info", "skills", "battleMoves", "contestMoves"];

/** ChangePage: accepts a fresh LEFT/RIGHT only while Task_HandleInput owns a settled page. */
export function requestSummaryPageChange(
  state: SummaryScreenState,
  direction: SummaryPageDirection,
): SummaryScreenState {
  if (!state.isOpen || state.transition || state.pageTransition || state.monTransition || state.moveSelect) return state;
  const fromIndex = PAGE_ORDER.indexOf(state.page);
  const delta = direction === "right" ? 1 : -1;
  const toPage = PAGE_ORDER[fromIndex + delta];
  if (!toPage) return state;
  return {
    ...state,
    page: toPage,
    onInfoPage: toPage === "info",
    pageTransition: {
      fromPage: state.page,
      toPage,
      direction,
      elapsed: 0,
    },
  };
}

/**
 * Task_HandleInput -> ChangeSummaryPokemon -> AdvanceMonIndex.
 *
 * The six-rental party is a normal (non-box, non-multi) mon list. Every
 * unlocked page clamps at both ends: UP on slot 0 and DOWN on slot 5 are rejected,
 * with no wrap. Ownership transfers to the destination slot immediately when
 * the replacement task is installed.
 */
export function requestSummaryMonChange(
  state: SummaryScreenState,
  direction: SummaryMonDirection,
): SummaryScreenState {
  if (
    !state.isOpen ||
    state.transition ||
    state.pageTransition ||
    state.monTransition ||
    state.moveSelect
  ) {
    return state;
  }
  const delta = direction === "down" ? 1 : -1;
  const toSlot = state.selectedSlot + delta;
  if (toSlot < 0 || toSlot > SUMMARY_MON_MAX_SLOT) return state;
  return {
    ...state,
    selectedSlot: toSlot,
    monTransition: {
      fromSlot: state.selectedSlot,
      toSlot,
      direction,
      elapsed: 0,
    },
  };
}

/** Task_HandleInput's shared A branch on either Moves page. */
export function requestSummaryMoveSelect(state: SummaryScreenState): SummaryScreenState {
  if (
    !state.isOpen ||
    state.transition ||
    state.pageTransition ||
    state.monTransition ||
    state.moveSelect ||
    (state.page !== "battleMoves" && state.page !== "contestMoves")
  ) {
    return state;
  }
  return {
    ...state,
    moveSelect: {
      phase: "open",
      selectedMoveIndex: 0,
      presentedMoveIndex: 0,
      elapsed: 0,
      selectorAnimationClock: 0,
      pendingPresentedMoveIndex: null,
      pendingPresentationTicks: 0,
    },
  };
}

/** ChangeSelectedMove; all four anchor moves are populated, followed by CANCEL. */
export function requestSummaryMoveSelectionChange(
  state: SummaryScreenState,
  direction: SummaryMonDirection,
): SummaryScreenState {
  const select = state.moveSelect;
  if (!select || select.phase !== "open" || select.elapsed < 1) return state;
  const delta = direction === "down" ? 1 : -1;
  const selectedMoveIndex =
    (select.selectedMoveIndex + delta + SUMMARY_MOVE_CANCEL_INDEX + 1) %
    (SUMMARY_MOVE_CANCEL_INDEX + 1);
  const leavesCancel = select.selectedMoveIndex === SUMMARY_MOVE_CANCEL_INDEX;
  const leaveTicks = summaryMoveCancelLeaveTicks(state.page);
  const entersCancel = selectedMoveIndex === SUMMARY_MOVE_CANCEL_INDEX;
  // Before the install render the ordinary page (no panel, species shown) is up.
  const prior = summaryMovePanelPresentation(select) ?? {
    hiddenColumns: SLIDING_WINDOW_WIDTH,
    labelsShown: false,
    speciesShown: true,
  };
  const cancelSlide =
    leavesCancel || entersCancel
      ? { toCancel: entersCancel, revealAt: entersCancel ? 1 : leaveTicks, elapsed: 0, prior }
      : select.cancelSlide ?? null;
  return {
    ...state,
    moveSelect: {
      ...select,
      selectedMoveIndex,
      ...(cancelSlide ? { cancelSlide } : {}),
      selectorAnimationClock: 0,
      pendingPresentedMoveIndex: selectedMoveIndex,
      pendingPresentationTicks: leavesCancel ? leaveTicks : 2,
    },
  };
}

/** LOCK_MOVES makes both A and B select CloseMoveSelectMode. */
export function requestSummaryMoveSelectClose(state: SummaryScreenState): SummaryScreenState {
  const select = state.moveSelect;
  if (!select || select.phase !== "open" || select.elapsed < 1) return state;
  return {
    ...state,
    moveSelect: {
      ...select,
      phase: "closing",
      elapsed: 0,
      pendingPresentedMoveIndex: null,
      pendingPresentationTicks: 0,
    },
  };
}

function advancedCancelSlide(select: SummaryMoveSelectState): { cancelSlide?: SummaryMoveCancelSlide } {
  const slide = select.cancelSlide;
  if (!slide) return {};
  // The slide task stops at its end column; cap the clock there.
  return { cancelSlide: { ...slide, elapsed: Math.min(slide.elapsed + 1, 8) } };
}

/** Advance entry/exit and page-scroll state machines by one tick. Call every engine tick. */
export function advanceSummaryScreen(state: SummaryScreenState): SummaryScreenState {
  if (state.moveSelect) {
    const select = state.moveSelect;
    if (select.phase === "closing") {
      const elapsed = select.elapsed + 1;
      if (elapsed >= SUMMARY_MOVE_SELECT_CLOSE_TICKS) {
        return {
          ...state,
          moveSelect: null,
          openElapsed: state.openElapsed + 1,
          monAnimClock: state.monAnimClock === null ? null : state.monAnimClock + 1,
        };
      }
      return {
        ...state,
        moveSelect: { ...select, elapsed, ...advancedCancelSlide(select) },
        openElapsed: state.openElapsed + 1,
        monAnimClock: state.monAnimClock === null ? null : state.monAnimClock + 1,
      };
    }
    const elapsed = select.elapsed + 1;
    // SwitchToMoveSelection's synchronous window/tilemap/sprite setup keeps
    // the already-running mon callback two frames behind its ordinary-page
    // cadence. The first visible selector/effect update is the third tick.
    const advanceMonClock = elapsed >= SUMMARY_MOVE_SELECT_INSTALL_TICKS;
    const pendingPresentationTicks = Math.max(0, select.pendingPresentationTicks - 1);
    const installPending =
      select.pendingPresentedMoveIndex !== null && pendingPresentationTicks === 0;
    return {
      ...state,
      moveSelect: {
        ...select,
        elapsed,
        selectorAnimationClock: select.selectorAnimationClock + 1,
        presentedMoveIndex:
          installPending ? select.pendingPresentedMoveIndex! : select.presentedMoveIndex,
        pendingPresentedMoveIndex:
          installPending ? null : select.pendingPresentedMoveIndex,
        pendingPresentationTicks,
        ...advancedCancelSlide(select),
      },
      openElapsed: state.openElapsed + (advanceMonClock ? 1 : 0),
      monAnimClock:
        state.monAnimClock === null
          ? null
          : state.monAnimClock + (advanceMonClock ? 1 : 0),
    };
  }
  if (state.monTransition) {
    const elapsed = state.monTransition.elapsed + 1;
    // Moves pages briefly expose the source window-copy queue after
    // PrintPageSpecificText: row 1, then rows 1-2, before the full window.
    const transitionTicks =
      state.page === "battleMoves" || state.page === "contestMoves"
        ? SUMMARY_MON_TRANSITION_TICKS + 2
        : SUMMARY_MON_TRANSITION_TICKS;
    if (elapsed >= transitionTicks) {
      return {
        ...state,
        monTransition: null,
        isOpen: true,
        onInfoPage: state.page === "info",
        openElapsed: state.openElapsed + 1,
        monAnimClock:
          state.page === "battleMoves" || state.page === "contestMoves" ? 1 : 0,
      };
    }
    return {
      ...state,
      monTransition: { ...state.monTransition, elapsed },
      openElapsed: state.openElapsed + 1,
    };
  }
  if (state.pageTransition) {
    const elapsed = state.pageTransition.elapsed + 1;
    if (elapsed >= SUMMARY_PAGE_TRANSITION_TICKS) {
      return {
        ...state,
        pageTransition: null,
        isOpen: true,
        onInfoPage: state.page === "info",
        openElapsed: state.openElapsed + 1,
      };
    }
    return {
      ...state,
      pageTransition: { ...state.pageTransition, elapsed },
      openElapsed: state.openElapsed + 1,
    };
  }
  const t = state.transition;
  if (!t) {
    return state.isOpen
      ? {
          ...state,
          openElapsed: state.openElapsed + 1,
          monAnimClock: state.monAnimClock === null ? null : state.monAnimClock + 1,
        }
      : state;
  }
  const elapsed = t.elapsed + 1;

  if (t.phase === "fadingOut") {
    if (elapsed >= fadeOutTicks(t.direction)) {
      return { ...state, transition: { direction: t.direction, phase: "black", elapsed: 0 } };
    }
    return { ...state, transition: { ...t, elapsed } };
  }

  if (t.phase === "black") {
    const holdTicks =
      t.direction === "toDraft" && state.returnTarget === "factorySwap"
        // CloseSummaryScreen -> CB2_InitSwapScreen rebuilds through gMain
        // states 0..15 before the destination fade. Oracle: first rebuilt
        // popup fade frame is B+42, versus B+37 for the draft callback.
        ? 25
        : blackHoldTicks(t.direction);
    if (elapsed >= holdTicks) {
      return { ...state, transition: { direction: t.direction, phase: "fadingIn", elapsed: 0 } };
    }
    return { ...state, transition: { ...t, elapsed } };
  }

  // fadingIn
  if (elapsed >= FADE_IN_TICKS) {
    const isOpen = t.direction === "toSummary";
    return {
      ...state,
      transition: null,
      isOpen,
      onInfoPage: isOpen && state.page === "info",
    };
  }
  return { ...state, transition: { ...t, elapsed } };
}
