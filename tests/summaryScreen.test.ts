// Hermetic Tier-1 tests for the S4 summary-screen entry/exit state machine
// (src/engine/summaryScreen.ts): mode transitions, fade-phase tick counters,
// page id, and selected slot. No oracle, no pixels - the tick counts
// themselves are oracle-pinned in paletteFade.ts (see that module's tests
// for the pixel-level derivation).

import { describe, expect, it } from "vitest";
import {
  advanceSummaryScreen,
  CLOSED_SUMMARY_SCREEN_STATE,
  openSummaryScreen,
  requestSummaryMonChange,
  requestSummaryScreenExit,
  requestSummaryPageChange,
  SUMMARY_PAGE_TRANSITION_TICKS,
  SUMMARY_MON_TRANSITION_TICKS,
  summaryPageLayerOffsets,
  type SummaryScreenState,
} from "../src/engine/summaryScreen.ts";

function run(state: SummaryScreenState, ticks: number): SummaryScreenState {
  for (let i = 0; i < ticks; i += 1) state = advanceSummaryScreen(state);
  return state;
}

describe("summaryScreen: closed state", () => {
  it("starts fully on the draft screen", () => {
    expect(CLOSED_SUMMARY_SCREEN_STATE.transition).toBeNull();
    expect(CLOSED_SUMMARY_SCREEN_STATE.onInfoPage).toBe(false);
    expect(CLOSED_SUMMARY_SCREEN_STATE.isOpen).toBe(false);
  });

  it("never changes on its own", () => {
    expect(advanceSummaryScreen(CLOSED_SUMMARY_SCREEN_STATE)).toEqual(CLOSED_SUMMARY_SCREEN_STATE);
  });
});

describe("summaryScreen: entry (A on SUMMARY)", () => {
  it("opens into a toSummary fade-out at the pressed slot", () => {
    const state = openSummaryScreen(3);
    expect(state.transition).toEqual({ direction: "toSummary", phase: "fadingOut", elapsed: 0 });
    expect(state.selectedSlot).toBe(3);
    expect(state.onInfoPage).toBe(false);
    expect(state.isOpen).toBe(false);
    expect(state.page).toBe("info");
  });

  it("carries the source mode and callback origin for a normal Factory swap summary", () => {
    const state = openSummaryScreen(2, {
      mode: "SUMMARY_MODE_NORMAL",
      returnTarget: "factorySwap",
    });
    expect(state).toMatchObject({
      selectedSlot: 2,
      mode: "SUMMARY_MODE_NORMAL",
      returnTarget: "factorySwap",
      page: "info",
    });
  });

  it("moves fadingOut -> black -> fadingIn -> settled (onInfoPage) at the oracle-pinned tick counts (20/24/15, settle at +59)", () => {
    let state = openSummaryScreen(0);
    state = run(state, 19);
    expect(state.transition).toMatchObject({ phase: "fadingOut", elapsed: 19 });
    state = advanceSummaryScreen(state); // tick 20: fadingOut -> black
    expect(state.transition).toMatchObject({ direction: "toSummary", phase: "black", elapsed: 0 });

    state = run(state, 23);
    expect(state.transition).toMatchObject({ phase: "black", elapsed: 23 });
    state = advanceSummaryScreen(state); // tick 20+24=44: black -> fadingIn
    expect(state.transition).toMatchObject({ direction: "toSummary", phase: "fadingIn", elapsed: 0 });

    state = run(state, 14);
    expect(state.transition).toMatchObject({ phase: "fadingIn", elapsed: 14 });
    expect(state.onInfoPage).toBe(false);
    state = advanceSummaryScreen(state); // tick 44+15=59: settled
    expect(state.transition).toBeNull();
    expect(state.onInfoPage).toBe(true);
    expect(state.isOpen).toBe(true);
  });

  it("settles in exactly 59 ticks total from the A press, matching the oracle's press-tick+59", () => {
    const state = run(openSummaryScreen(1), 59);
    expect(state.transition).toBeNull();
    expect(state.onInfoPage).toBe(true);
    expect(state.selectedSlot).toBe(1);
  });
});

describe("summaryScreen: generic page navigation", () => {
  function settled(slot = 0): SummaryScreenState {
    return run(openSummaryScreen(slot), 59);
  }

  it("RIGHT immediately transfers page ownership while preserving the selected slot", () => {
    const state = requestSummaryPageChange(settled(4), "right");
    expect(state.page).toBe("skills");
    expect(state.selectedSlot).toBe(4);
    expect(state.isOpen).toBe(true);
    expect(state.onInfoPage).toBe(false);
    expect(state.pageTransition).toEqual({
      fromPage: "info",
      toPage: "skills",
      direction: "right",
      elapsed: 0,
    });
  });

  it("settles RIGHT and LEFT on the same source-relative 10-tick scroll clock", () => {
    const right = requestSummaryPageChange(settled(2), "right");
    expect(run(right, SUMMARY_PAGE_TRANSITION_TICKS - 1).pageTransition).toMatchObject({
      direction: "right",
      elapsed: 9,
    });
    const skills = run(right, SUMMARY_PAGE_TRANSITION_TICKS);
    expect(skills.pageTransition).toBeNull();
    expect(skills.page).toBe("skills");

    const left = requestSummaryPageChange(skills, "left");
    expect(left.pageTransition).toMatchObject({
      fromPage: "skills",
      toPage: "info",
      direction: "left",
      elapsed: 0,
    });
    const info = run(left, SUMMARY_PAGE_TRANSITION_TICKS);
    expect(info.pageTransition).toBeNull();
    expect(info.page).toBe("info");
    expect(info.onInfoPage).toBe(true);
    expect(info.selectedSlot).toBe(2);
  });

  it("places the moving 256px BG block in generic 32px steps over an immutable selected slot", () => {
    const right = requestSummaryPageChange(settled(5), "right");
    expect(summaryPageLayerOffsets(right.pageTransition!)).toEqual({
      movingPage: "skills",
      movingX: 256,
      fixedPage: "info",
    });
    const right4 = run(right, 4);
    expect(summaryPageLayerOffsets(right4.pageTransition!)).toEqual({
      movingPage: "skills",
      movingX: 128,
      fixedPage: "info",
    });
    const right8 = run(right, 8);
    expect(summaryPageLayerOffsets(right8.pageTransition!)).toEqual({
      movingPage: "skills",
      movingX: 0,
      fixedPage: "info",
    });
    expect(right8.selectedSlot).toBe(5);

    const skills = run(right, SUMMARY_PAGE_TRANSITION_TICKS);
    const left = requestSummaryPageChange(skills, "left");
    expect(summaryPageLayerOffsets(left.pageTransition!)).toEqual({
      movingPage: "skills",
      movingX: 0,
      fixedPage: "info",
    });
    const left1 = run(left, 1);
    expect(summaryPageLayerOffsets(left1.pageTransition!)).toEqual({
      movingPage: "skills",
      movingX: 32,
      fixedPage: "info",
    });
    const left2 = run(left, 2);
    expect(summaryPageLayerOffsets(left2.pageTransition!)).toEqual({
      movingPage: "skills",
      movingX: 64,
      fixedPage: "info",
    });
    const left4 = run(left, 4);
    expect(summaryPageLayerOffsets(left4.pageTransition!)).toEqual({
      movingPage: "skills",
      movingX: 128,
      fixedPage: "info",
    });
    const left9 = run(left, 9);
    expect(summaryPageLayerOffsets(left9.pageTransition!)).toEqual({
      movingPage: "skills",
      movingX: 256,
      fixedPage: "info",
    });
    expect(left4.selectedSlot).toBe(5);
  });

  it("preserves slot ownership and rejects input through the reverse wipe, then restores Info input readiness", () => {
    const skills = run(
      requestSummaryPageChange(settled(4), "right"),
      SUMMARY_PAGE_TRANSITION_TICKS,
    );
    const left = requestSummaryPageChange(skills, "left");
    const inFlight = run(left, SUMMARY_PAGE_TRANSITION_TICKS - 1);
    expect(inFlight).toMatchObject({
      selectedSlot: 4,
      page: "info",
      onInfoPage: true,
      pageTransition: { fromPage: "skills", toPage: "info", direction: "left", elapsed: 9 },
    });
    expect(requestSummaryPageChange(inFlight, "right")).toBe(inFlight);
    expect(requestSummaryScreenExit(inFlight)).toBe(inFlight);

    const ready = advanceSummaryScreen(inFlight);
    expect(ready).toMatchObject({
      selectedSlot: 4,
      page: "info",
      onInfoPage: true,
      pageTransition: null,
      isOpen: true,
    });
    expect(requestSummaryPageChange(ready, "right").pageTransition).toMatchObject({
      fromPage: "info",
      toPage: "skills",
      direction: "right",
      elapsed: 0,
    });
  });

  it("rejects LEFT at the first page and RIGHT at the final page", () => {
    const info = settled();
    expect(requestSummaryPageChange(info, "left")).toBe(info);
    const contest = { ...info, page: "contestMoves" as const, onInfoPage: false };
    expect(requestSummaryPageChange(contest, "right")).toBe(contest);
  });

  it("rejects page changes and B during entry or an active scroll", () => {
    const entry = run(openSummaryScreen(1), 10);
    expect(requestSummaryPageChange(entry, "right")).toBe(entry);
    expect(requestSummaryScreenExit(entry)).toBe(entry);

    const scrolling = requestSummaryPageChange(settled(1), "right");
    expect(requestSummaryPageChange(scrolling, "left")).toBe(scrolling);
    expect(requestSummaryScreenExit(scrolling)).toBe(scrolling);
  });

  it("allows B from a settled Skills page", () => {
    const skills = run(
      requestSummaryPageChange(settled(3), "right"),
      SUMMARY_PAGE_TRANSITION_TICKS,
    );
    const exiting = requestSummaryScreenExit(skills);
    expect(exiting.transition).toEqual({
      direction: "toDraft",
      phase: "fadingOut",
      elapsed: 0,
    });
    expect(exiting.selectedSlot).toBe(3);
    expect(exiting.isOpen).toBe(false);
  });
});

describe("summaryScreen: slot-relative Info-page mon switching", () => {
  function settled(slot = 0): SummaryScreenState {
    return run(openSummaryScreen(slot), 59);
  }

  it("DOWN transfers selected-slot ownership to the relative destination and records direction", () => {
    const switching = requestSummaryMonChange(settled(0), "down");
    expect(switching).toMatchObject({
      selectedSlot: 1,
      page: "info",
      onInfoPage: true,
      monTransition: {
        fromSlot: 0,
        toSlot: 1,
        direction: "down",
        elapsed: 0,
      },
    });
  });

  it("UP owns the inverse relative slot without changing page ownership", () => {
    const switching = requestSummaryMonChange(settled(4), "up");
    expect(switching).toMatchObject({
      selectedSlot: 3,
      page: "info",
      monTransition: {
        fromSlot: 4,
        toSlot: 3,
        direction: "up",
      },
    });
  });

  it("rejects every input path in flight and restores readiness at DOWN+20", () => {
    const switching = requestSummaryMonChange(settled(0), "down");
    const inFlight = run(switching, SUMMARY_MON_TRANSITION_TICKS - 1);
    expect(inFlight.monTransition).toMatchObject({ elapsed: 19, toSlot: 1 });
    expect(requestSummaryMonChange(inFlight, "down")).toBe(inFlight);
    expect(requestSummaryPageChange(inFlight, "right")).toBe(inFlight);
    expect(requestSummaryScreenExit(inFlight)).toBe(inFlight);

    const ready = advanceSummaryScreen(inFlight);
    expect(ready).toMatchObject({
      selectedSlot: 1,
      monTransition: null,
      isOpen: true,
      onInfoPage: true,
      monAnimClock: 0,
    });
    expect(requestSummaryScreenExit(ready).transition).toMatchObject({
      direction: "toDraft",
      phase: "fadingOut",
      elapsed: 0,
    });
  });

  it("clamps at both Info-page ends instead of wrapping the six-rental list", () => {
    const first = settled(0);
    expect(requestSummaryMonChange(first, "up")).toBe(first);

    const last = settled(5);
    expect(requestSummaryMonChange(last, "down")).toBe(last);
  });

  it("does not steal ownership during entry, page scrolling, or a non-Info page", () => {
    const entry = run(openSummaryScreen(2), 10);
    expect(requestSummaryMonChange(entry, "down")).toBe(entry);

    const scrolling = requestSummaryPageChange(settled(2), "right");
    expect(requestSummaryMonChange(scrolling, "down")).toBe(scrolling);

    const skills = run(scrolling, SUMMARY_PAGE_TRANSITION_TICKS);
    expect(requestSummaryMonChange(skills, "down")).toBe(skills);
  });
});

describe("summaryScreen: exit (B on the settled Info page)", () => {
  function settledOnInfoPage(slot: number): SummaryScreenState {
    return run(openSummaryScreen(slot), 59);
  }

  it("B is a no-op while a transition is still in flight", () => {
    const midEntry = run(openSummaryScreen(0), 10);
    expect(requestSummaryScreenExit(midEntry)).toEqual(midEntry);
  });

  it("B on the settled Info page opens a toDraft fade-out", () => {
    const state = requestSummaryScreenExit(settledOnInfoPage(2));
    expect(state.transition).toEqual({ direction: "toDraft", phase: "fadingOut", elapsed: 0 });
    expect(state.onInfoPage).toBe(false);
    expect(state.selectedSlot).toBe(2);
  });

  it("settles back on the draft screen in exactly 53 ticks total from the B press, matching the oracle's B-press-tick+53", () => {
    const afterB = requestSummaryScreenExit(settledOnInfoPage(4));
    const state = run(afterB, 53);
    expect(state.transition).toBeNull();
    expect(state.onInfoPage).toBe(false);
  });

  it("uses the shorter exit fade-out/black-hold tick counts (18/20), not the entry ones (20/24)", () => {
    const afterB = requestSummaryScreenExit(settledOnInfoPage(0));
    const state = run(afterB, 17);
    expect(state.transition).toMatchObject({ phase: "fadingOut", elapsed: 17 });
    const black0 = advanceSummaryScreen(state); // tick 18: fadingOut -> black
    expect(black0.transition).toMatchObject({ direction: "toDraft", phase: "black", elapsed: 0 });
    const black19 = run(black0, 19);
    expect(black19.transition).toMatchObject({ phase: "black", elapsed: 19 });
    const fadingIn0 = advanceSummaryScreen(black19); // tick 18+20=38: black -> fadingIn
    expect(fadingIn0.transition).toMatchObject({ direction: "toDraft", phase: "fadingIn", elapsed: 0 });
  });

  it("holds black five extra callback-rebuild ticks for CB2_InitSwapScreen and settles at B+58", () => {
    const opened = run(
      openSummaryScreen(0, {
        mode: "SUMMARY_MODE_NORMAL",
        returnTarget: "factorySwap",
      }),
      59,
    );
    const afterB = requestSummaryScreenExit(opened);
    const before = run(afterB, 57);
    expect(before.transition).toMatchObject({
      direction: "toDraft",
      phase: "fadingIn",
      elapsed: 14,
    });
    const settled = advanceSummaryScreen(before);
    expect(settled.transition).toBeNull();
    expect(settled.onInfoPage).toBe(false);
    expect(settled.returnTarget).toBe("factorySwap");
  });
});
