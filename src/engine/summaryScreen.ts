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

/**
 * Task_HandleInput -> ChangePage -> PssScroll{Right,Left} observed clock.
 * The task handoff/window clear becomes visible at +4; seven 32px scroll
 * steps follow and the destination owns input at +10.
 */
export const SUMMARY_PAGE_TRANSITION_TICKS = 10;

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
  /** Ticks since the entry fade settled; presentation-only, page changes do not reset it. */
  openElapsed: number;
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
  openElapsed: 0,
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
    openElapsed: 0,
    selectedSlot: cursorPos,
    page: "info",
    mode: options.mode ?? "SUMMARY_MODE_LOCK_MOVES",
    returnTarget: options.returnTarget ?? "draft",
  };
}

/** pokemon_summary_screen.c's close path, triggered by B on the (unlocked, per SUMMARY_MODE_LOCK_MOVES) Info page. */
export function requestSummaryScreenExit(state: SummaryScreenState): SummaryScreenState {
  if (!state.isOpen || state.pageTransition) return state;
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
  if (!state.isOpen || state.transition || state.pageTransition) return state;
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

/** Advance entry/exit and page-scroll state machines by one tick. Call every engine tick. */
export function advanceSummaryScreen(state: SummaryScreenState): SummaryScreenState {
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
  if (!t) return state.isOpen ? { ...state, openElapsed: state.openElapsed + 1 } : state;
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
