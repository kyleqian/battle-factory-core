// sfa214: the move-select cursor on the CANCEL row (pokemon_summary_screen.c
// ChangeSelectedMove's MAX_MON_MOVES branches). The renderer used to index
// rental.moves[4] for POWER/ACCURACY and threw in browser random play
// ("Cannot read properties of undefined (reading 'power')"). The source
// clears the description + POWER/ACCURACY windows and slides the effect panel
// out; leaving CANCEL slides it back in. Timing is oracle-pinned by
// tools/compare/traces/summary-{battle,contest}-move-select-cancel-row.json
// (83 / 83 frames each).

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  advanceSummaryScreen,
  openSummaryScreen,
  requestSummaryMoveSelect,
  requestSummaryMoveSelectClose,
  requestSummaryMoveSelectionChange,
  requestSummaryPageChange,
  SUMMARY_MOVE_CANCEL_INDEX,
  SUMMARY_PAGE_TRANSITION_TICKS,
  summaryMoveDetailIndex,
  summaryMovePanelPresentation,
  summaryMoveSelectorRow,
  type SummaryScreenState,
} from "../src/engine/summaryScreen.ts";
import { renderSummaryBattleMoveSelectPage } from "../src/engine/summaryInfoPage.ts";
import { ANCHOR_DRAFT_SCREEN_STATE } from "../src/engine/factoryDraftScreen.ts";
import { replaySessionWithRender } from "./helpers/sessionRenderReplay.ts";

function run(state: SummaryScreenState, ticks: number): SummaryScreenState {
  for (let i = 0; i < ticks; i += 1) state = advanceSummaryScreen(state);
  return state;
}

function movesPage(page: "battleMoves" | "contestMoves"): SummaryScreenState {
  let state = run(openSummaryScreen(0), 59);
  const turns = page === "battleMoves" ? 2 : 3;
  for (let i = 0; i < turns; i += 1) {
    state = run(requestSummaryPageChange(state, "right"), SUMMARY_PAGE_TRANSITION_TICKS);
  }
  return run(requestSummaryMoveSelect(state), 12);
}

/** Render sequence (n = 0 is the accepting tick) of panel/selector/detail. */
function sequence(state: SummaryScreenState, renders: number) {
  const rows = [];
  for (let n = 0; n < renders; n += 1) {
    if (n > 0) state = advanceSummaryScreen(state);
    const select = state.moveSelect!;
    const panel = summaryMovePanelPresentation(select)!;
    rows.push([
      panel.hiddenColumns,
      panel.labelsShown ? "L" : "-",
      panel.speciesShown ? "S" : "-",
      summaryMoveSelectorRow(select),
      summaryMoveDetailIndex(select) ?? "x",
    ].join(" "));
  }
  return rows;
}

describe("summary move-select CANCEL row", () => {
  it("move -> CANCEL clears details at +1 and slides out 3/6/9/10, re-putting the species window", () => {
    const ready = movesPage("battleMoves");
    const up = requestSummaryMoveSelectionChange(ready, "up");
    expect(up.moveSelect!.selectedMoveIndex).toBe(SUMMARY_MOVE_CANCEL_INDEX);
    expect(sequence(up, 6)).toEqual([
      "0 L - 0 0",
      "3 - - 4 x",
      "6 - - 4 x",
      "9 - - 4 x",
      "10 - S 4 x",
      "10 - S 4 x",
    ]);
  });

  it("CANCEL -> move reveals one render later on Battle Moves than on Contest Moves", () => {
    for (const [page, expected] of [
      ["battleMoves", ["10 - S 4 x", "10 - S 4 x", "10 - S 4 x", "6 - - 0 0", "3 - - 0 0", "0 L - 0 0"]],
      ["contestMoves", ["10 - S 4 x", "10 - S 4 x", "6 - - 0 0", "3 - - 0 0", "0 L - 0 0", "0 L - 0 0"]],
    ] as const) {
      const onCancel = run(requestSummaryMoveSelectionChange(movesPage(page), "up"), 20);
      expect(sequence(requestSummaryMoveSelectionChange(onCancel, "down"), 6), page).toEqual(expected);
    }
  });

  it("closing from CANCEL keeps the slid-out panel and never shows details", () => {
    const onCancel = run(requestSummaryMoveSelectionChange(movesPage("battleMoves"), "up"), 6);
    let state = requestSummaryMoveSelectClose(onCancel);
    while (state.moveSelect) {
      const panel = summaryMovePanelPresentation(state.moveSelect)!;
      expect(panel).toMatchObject({ hiddenColumns: 10, labelsShown: false, speciesShown: true });
      state = advanceSummaryScreen(state);
    }
  });

  it("renders every cursor row and every CANCEL transition frame on both pages without throwing", () => {
    const rentals = ANCHOR_DRAFT_SCREEN_STATE.rentals;
    for (const page of ["battleMoves", "contestMoves"] as const) {
      let state = movesPage(page);
      for (const step of ["up", "down", "down", "down", "down", "down", "up", "up"] as const) {
        state = requestSummaryMoveSelectionChange(state, step);
        for (let n = 0; n < 6; n += 1) {
          expect(() =>
            renderSummaryBattleMoveSelectPage(rentals, 0, 40, state.moveSelect!, false, page),
          ).not.toThrow();
          state = advanceSummaryScreen(state);
        }
      }
      state = requestSummaryMoveSelectClose(state);
      while (state.moveSelect) {
        expect(() => renderSummaryBattleMoveSelectPage(rentals, 0, 40, state.moveSelect!, false, page)).not.toThrow();
        state = advanceSummaryScreen(state);
      }
    }
  });

  it("replays the saved browser random-play session (Scene OFF, frame 1162) with tick + render", () => {
    const trace = JSON.parse(
      readFileSync(new URL("./fixtures/summary-crash-sessions/off-07.session.json", import.meta.url), "utf8"),
    );
    expect(replaySessionWithRender(trace)).toEqual({ frames: 1163, error: null });
  });
});
