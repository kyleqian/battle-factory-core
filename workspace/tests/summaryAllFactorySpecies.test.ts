// sfa214: every Battle Frontier set (all Factory rentals and opponents, Level
// 50 and Open) renders every Summary page without a throw, and every species'
// whole front animation runs through the Info page renderer. The Summary
// renderer is a pure function of the rental records (Battle Scene ON / OFF
// share it); the scene-specific routes are covered by the saved-session
// replays in summaryMoveCancelRow.test.ts and below.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import summaryFrontAnimation from "../src/data/gen/summary-front-animation.json" with { type: "json" };
import { createFactoryRentalPresentation } from "../src/engine/factoryRentalPresentation.ts";
import {
  SUMMARY_FRONT_IMPLEMENTED_MOTIONS,
  SUMMARY_INITIAL_MON_ANIMATION_START,
  summaryFrontMotionIsApproximate,
  summaryFrontSpritePresentation,
} from "../src/engine/summaryFrontAnimation.ts";
import {
  renderSummaryBattleMoveSelectPage,
  renderSummaryBattleMovesPage,
  renderSummaryContestMovesPage,
  renderSummaryInfoPage,
  renderSummarySkillsPage,
} from "../src/engine/summaryInfoPage.ts";
import type { SummaryMoveSelectState } from "../src/engine/summaryScreen.ts";
import { replaySessionWithRender } from "./helpers/sessionRenderReplay.ts";

const NATURE_INDEX = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function rental(setId: number) {
  const set = frontierMonsData.entries[setId]!;
  return createFactoryRentalPresentation({
    setId,
    personality: NATURE_INDEX.get(set.nature)!,
    fixedIv: 3,
    abilitySlot: 0,
    otId: 0,
  } as never);
}

function settledSelect(row: number): SummaryMoveSelectState {
  return {
    phase: "open",
    selectedMoveIndex: row,
    presentedMoveIndex: row,
    elapsed: 12,
    selectorAnimationClock: 12,
    pendingPresentedMoveIndex: null,
    pendingPresentationTicks: 0,
  };
}

const firstSetBySpecies = new Map<string, number>();
frontierMonsData.entries.forEach((entry, setId) => {
  if (!firstSetBySpecies.has(entry.species)) firstSetBySpecies.set(entry.species, setId);
});

describe("Summary screen for every Factory species", () => {
  it("renders Info / Skills / Battle Moves / Contest Moves and every move-select row for all 882 sets", () => {
    const failures: string[] = [];
    for (let setId = 0; setId < frontierMonsData.entries.length; setId += 1) {
      try {
        const rentals = [rental(setId)];
        renderSummaryInfoPage(rentals, 0, 40);
        renderSummarySkillsPage(rentals, 0, 40);
        renderSummaryBattleMovesPage(rentals, 0, 40);
        renderSummaryContestMovesPage(rentals, 0, 40);
        for (let row = 0; row <= 4; row += 1) {
          // ChangeSelectedMove never rests on a MOVE_NONE slot.
          if (row < 4 && rentals[0]!.moves[row]!.id === 0) continue;
          renderSummaryBattleMoveSelectPage(rentals, 0, 40, settledSelect(row));
          renderSummaryBattleMoveSelectPage(rentals, 0, 40, settledSelect(row), false, "contestMoves");
        }
      } catch (error) {
        failures.push(`${setId} ${frontierMonsData.entries[setId]!.species}: ${String(error)}`);
      }
    }
    expect(failures).toEqual([]);
  }, 600_000);

  it("runs each of the 376 species' whole front animation through the Info renderer (initial and replacement)", () => {
    expect(firstSetBySpecies.size).toBe(376);
    const failures: string[] = [];
    for (const [species, setId] of firstSetBySpecies) {
      const name = species.replace("SPECIES_", "");
      const rentals = [rental(setId)];
      for (const replacement of [false, true]) {
        let previous = "";
        for (let clock = 0; clock < 400; clock += 1) {
          // Render every clock whose presentation differs from the previous one.
          const presentation = JSON.stringify(summaryFrontSpritePresentation(name, clock, replacement));
          if (presentation === previous) continue;
          previous = presentation;
          try {
            renderSummaryInfoPage(rentals, 0, clock, replacement);
          } catch (error) {
            failures.push(`${name} clock ${clock}: ${String(error)}`);
            break;
          }
        }
        const end = summaryFrontSpritePresentation(name, 399, replacement);
        if (!end.motionFinished || end.matrix !== null) failures.push(`${name}: motion did not finish`);
      }
    }
    expect(failures).toEqual([]);
  }, 600_000);

  it("leaves no species on the approximate (frame program only) fallback (sfa2)", () => {
    const approximate = summaryFrontAnimation.species.filter((entry) =>
      summaryFrontMotionIsApproximate(entry.motion.type),
    );
    // 62 transcribed callbacks cover all 376 species; tests/sfa2SummaryFrontAnimRom.test.ts pins each against the ROM.
    expect(SUMMARY_FRONT_IMPLEMENTED_MOTIONS.length).toBe(62);
    expect(approximate).toEqual([]);
    for (const entry of summaryFrontAnimation.species) {
      const species = entry.species.replace("SPECIES_", "");
      expect(summaryFrontSpritePresentation(species, SUMMARY_INITIAL_MON_ANIMATION_START + 20, false).motionClaim).toBe("source");
    }
  });

  it.each(["off-03", "on-17"])("replays saved random-play session %s with tick + render", (name) => {
    const trace = JSON.parse(
      readFileSync(new URL(`./fixtures/summary-crash-sessions/${name}.session.json`, import.meta.url), "utf8"),
    );
    const total = trace.segments.reduce((sum: number, segment: { frames: number }) => sum + segment.frames, 0);
    expect(replaySessionWithRender(trace)).toEqual({ frames: total, error: null });
  }, 120_000);
});

describe("MOVE_NONE slots (12 Level 50 / Open sets: CATERPIE, DITTO, UNOWN, ...)", () => {
  it("move-select steps past empty slots to CANCEL and back, like ChangeSelectedMove", async () => {
    const { advanceSummaryScreen, openSummaryScreen, requestSummaryMoveSelect, requestSummaryMoveSelectionChange,
      requestSummaryPageChange, SUMMARY_PAGE_TRANSITION_TICKS } = await import("../src/engine/summaryScreen.ts");
    const run = (state: ReturnType<typeof openSummaryScreen>, ticks: number) => {
      for (let i = 0; i < ticks; i += 1) state = advanceSummaryScreen(state);
      return state;
    };
    let state = run(openSummaryScreen(0), 63);
    for (let i = 0; i < 2; i += 1) state = run(requestSummaryPageChange(state, "right"), SUMMARY_PAGE_TRANSITION_TICKS);
    state = run(requestSummaryMoveSelect(state), 12);
    const ditto = [true, false, false, false]; // set 54: TRANSFORM, -, -, -
    const rows: number[] = [];
    for (const direction of ["down", "down", "up", "up"] as const) {
      state = run(requestSummaryMoveSelectionChange(state, direction, ditto), 8);
      rows.push(state.moveSelect!.selectedMoveIndex);
    }
    expect(rows).toEqual([4, 0, 4, 0]);
    expect(rental(54).moves.map((move) => move.id === 0)).toEqual([false, true, true, true]);
  });
});
