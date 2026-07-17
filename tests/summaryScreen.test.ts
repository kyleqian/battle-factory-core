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
  requestSummaryScreenExit,
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
    expect(state.page).toBe("info");
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
  });

  it("settles in exactly 59 ticks total from the A press, matching the oracle's press-tick+59", () => {
    const state = run(openSummaryScreen(1), 59);
    expect(state.transition).toBeNull();
    expect(state.onInfoPage).toBe(true);
    expect(state.selectedSlot).toBe(1);
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
    expect(state.selectedSlot).toBe(2); // gLastViewedMonIndex restoration is out of scope this slice - no UP/DOWN yet.
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
});
