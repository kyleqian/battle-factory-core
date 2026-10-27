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
        if (!end.motionFinished || end.affine !== null) failures.push(`${name}: motion did not finish`);
      }
    }
    expect(failures).toEqual([]);
  }, 600_000);

  it("reports the approximate (frame program only) species explicitly", () => {
    const approximate = summaryFrontAnimation.species.filter((entry) =>
      summaryFrontMotionIsApproximate(entry.motion.type),
    );
    const implemented = summaryFrontAnimation.species.length - approximate.length;
    // 20 transcribed callbacks cover 239 / 376 species; the other 137 hold
    // still while their source frame program runs (never throw).
    expect(SUMMARY_FRONT_IMPLEMENTED_MOTIONS.length).toBe(20);
    expect(implemented).toBe(239);
    for (const entry of approximate) {
      const species = entry.species.replace("SPECIES_", "");
      expect(summaryFrontSpritePresentation(species, SUMMARY_INITIAL_MON_ANIMATION_START + 20, false)).toMatchObject({
        motionClaim: "approximate-static",
        x2: 0,
        y2: 0,
        affine: null,
      });
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
    let state = run(openSummaryScreen(0), 59);
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

describe("newly transcribed motion golden pins (pokemon_animation.c by hand)", () => {
  const at = (species: string, elapsed: number) =>
    summaryFrontSpritePresentation(
      species,
      SUMMARY_INITIAL_MON_ANIMATION_START + summaryFrontAnimationDelay(species) + elapsed,
      false,
    );

  it("ANIM_V_SHAKE: y2 = Sin(60k % 256, 3) from call k, visible at elapsed k + 1, done after call 39", () => {
    const species = speciesWith("ANIM_V_SHAKE");
    // gSineTable[60] = 254, [120] = 49, [180] = -244:
    // k=0: 0; k=1: 3*254>>8 = 2; k=2: 3*49>>8 = 0; k=3: 3*-244>>8 = -3.
    expect([1, 2, 3, 4].map((e) => at(species, e).y2)).toEqual([0, 2, 0, -3]);
    expect(at(species, 39)).toMatchObject({ motionFinished: false });
    expect(at(species, 40)).toMatchObject({ motionFinished: true, y2: 0 });
  });

  it("ANIM_V_STRETCH: affine from call k at elapsed k + 2; xScale = Sin(k*128/40, 16) + 256", () => {
    const species = speciesWith("ANIM_V_STRETCH");
    expect(at(species, 1).affine).toBeNull();
    // k=0: index2 0 -> (256, 256), y2 0.
    expect(at(species, 2)).toMatchObject({ affine: { xScale: 256, yScale: 256 }, y2: 0 });
    // k=10: index2 = 10*128/40 = 32 (gSineTable[32] = 181): Sin(32,16) = 11;
    // data[7] += 51 -> index1 51 (gSineTable[51] = 243): Sin(51,8) = 7;
    // yScale = 256 - Sin(32,40) - 7 = 256 - 28 - 7 = 221; posY = 35/8 = 4.
    expect(at(species, 12)).toMatchObject({ affine: { xScale: 267, yScale: 221 }, y2: -4 });
    expect(at(species, 43)).toMatchObject({ affine: null, motionFinished: true });
  });

  it("ANIM_H_SHAKE: x2 = Sin(60k % 256, 3) with no TryFlipX", () => {
    const species = speciesWith("ANIM_H_SHAKE");
    expect([1, 2, 3, 4].map((e) => at(species, e).x2)).toEqual([0, 2, 0, -3]);
  });
});

function speciesWith(type: string): string {
  return summaryFrontAnimation.species.find((entry) => entry.motion.type === type && !entry.noFlip)!.species.replace("SPECIES_", "");
}

function summaryFrontAnimationDelay(species: string): number {
  return summaryFrontAnimation.species.find((entry) => entry.species === `SPECIES_${species}`)!.delay;
}
