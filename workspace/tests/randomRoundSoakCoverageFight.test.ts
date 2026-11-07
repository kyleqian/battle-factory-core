// Tier-1 pins for the opt-in "coverage-fight" soak policy
// (tools/soak/randomRoundSoakDriver.ts): identical to "winning-coverage" --
// the coverage-first 3-of-6 draft, the swap declines, the winning-like
// switch levers, the same exploration/timing rolls -- EXCEPT the fight
// menu, which commits the LEGAL slot whose move this run has used least so
// far (ties to the lowest slot) instead of the best-scoring damaging move.
//
// Why it exists: `--coverage-json` measured 5 full "winning" chains
// executing 223/276 corpus moves while leaving 27/166 move EFFECTS
// untouched, and the starved class is status/utility -- exactly the class
// that produced ISSUES #126 (Metronome->Bide) and #127 (Baton Pass). A
// least-used-first fight spends every move in every drafted set on purpose.
//
// Hermetic like the rest of the soak pins: the production tick loop through
// the exported driver API, never the emulator and never the oracle.

import { describe, expect, it } from "vitest";
import { SoakCoverageCollector } from "../tools/soak/randomRoundSoakCoverage.ts";
import {
  DEFAULT_MAX_FRAMES_BY_POLICY,
  pickCoverageFightSlot,
  resolveMaxFrames,
  runSeed,
  type SoakPolicy,
} from "../tools/soak/randomRoundSoakDriver.ts";

/** `pickCoverageFightSlot`'s tally argument, spelled as a plain object. */
function uses(counts: Readonly<Record<number, number>>): ReadonlyMap<number, number> {
  return new Map(Object.entries(counts).map(([id, count]) => [Number(id), count]));
}

const ALL_LEGAL = [true, true, true, true] as const;

describe("coverage-fight fight-slot chooser", () => {
  it("commits the legal slot whose move this run has used least", () => {
    // Slot 2's move (33) is the only one nobody has spent yet.
    expect(pickCoverageFightSlot({
      legalSlots: ALL_LEGAL,
      moveIds: [52, 98, 33, 14],
      useCountByMoveId: uses({ 52: 4, 98: 2, 33: 0, 14: 7 }),
    })).toBe(2);
    // A move used once still loses to one used zero times, however weak.
    expect(pickCoverageFightSlot({
      legalSlots: ALL_LEGAL,
      moveIds: [52, 98, 33, 14],
      useCountByMoveId: uses({ 52: 1, 98: 1, 33: 1 }),
    })).toBe(3);
    // An id absent from the tally reads as 0 uses, so an all-empty tally
    // opens on slot 0 and each commit rotates the choice onward.
    expect(pickCoverageFightSlot({
      legalSlots: ALL_LEGAL,
      moveIds: [52, 98, 33, 14],
      useCountByMoveId: uses({}),
    })).toBe(0);
  });

  it("breaks ties to the LOWEST slot", () => {
    // Every legal slot is equally used: slot 0 wins.
    expect(pickCoverageFightSlot({
      legalSlots: ALL_LEGAL,
      moveIds: [52, 98, 33, 14],
      useCountByMoveId: uses({ 52: 3, 98: 3, 33: 3, 14: 3 }),
    })).toBe(0);
    // Slots 1 and 3 tie at the minimum: the lower one wins.
    expect(pickCoverageFightSlot({
      legalSlots: ALL_LEGAL,
      moveIds: [52, 98, 33, 14],
      useCountByMoveId: uses({ 52: 5, 98: 1, 33: 9, 14: 1 }),
    })).toBe(1);
    // Two slots holding the SAME move share one tally entry, so they tie
    // and the lower slot wins.
    expect(pickCoverageFightSlot({
      legalSlots: ALL_LEGAL,
      moveIds: [52, 33, 33, 14],
      useCountByMoveId: uses({ 52: 2, 33: 0, 14: 0 }),
    })).toBe(1);
  });

  it("never chooses an illegal slot, however unused its move is", () => {
    // Slot 0 is the least-used move in the set but is 0-PP/Disabled/etc.
    expect(pickCoverageFightSlot({
      legalSlots: [false, true, true, true],
      moveIds: [52, 98, 33, 14],
      useCountByMoveId: uses({ 52: 0, 98: 5, 33: 1, 14: 9 }),
    })).toBe(2);
    // Only one legal slot left: it is chosen even though it is the most
    // used move on the set.
    expect(pickCoverageFightSlot({
      legalSlots: [false, false, false, true],
      moveIds: [52, 98, 33, 14],
      useCountByMoveId: uses({ 52: 0, 98: 0, 33: 0, 14: 40 }),
    })).toBe(3);
    // Unused-but-illegal slots stay unpicked across every legality mask.
    for (const illegal of [0, 1, 2, 3] as const) {
      const legalSlots = [true, true, true, true];
      legalSlots[illegal] = false;
      const chosen = pickCoverageFightSlot({
        legalSlots,
        moveIds: [52, 98, 33, 14],
        // The illegal slot's move is always the strict minimum.
        useCountByMoveId: uses({ 52: 3, 98: 3, 33: 3, 14: 3, [[52, 98, 33, 14][illegal]!]: 0 }),
      });
      expect(chosen, `illegal slot ${illegal}`).not.toBe(illegal);
    }
    // NO legal slot (forced Struggle: source keeps the banked slot and
    // swaps the MOVE, battle_util.c:99-106) returns slot 0, exactly like
    // `pickWinningFightSlot`'s own no-legal-slot fallback -- the driver's
    // forced-Struggle path is unchanged by this policy.
    expect(pickCoverageFightSlot({
      legalSlots: [false, false, false, false],
      moveIds: [52, 98, 33, 14],
      useCountByMoveId: uses({ 52: 9 }),
    })).toBe(0);
  });
});

describe("coverage-fight policy wiring", () => {
  it("shares winning's per-policy frame budget", () => {
    expect(DEFAULT_MAX_FRAMES_BY_POLICY["coverage-fight"])
      .toBe(DEFAULT_MAX_FRAMES_BY_POLICY.winning);
    expect(resolveMaxFrames("coverage-fight")).toBe(1_000_000);
    expect(resolveMaxFrames("coverage-fight", 5_000)).toBe(5_000);
  });

  it("declines every postwin swap offer, exactly like winning", () => {
    // Same regression class as the "winning-coverage" pin: the decline is
    // keyed on the driver's `winningLike` predicate, which "coverage-fight"
    // must join or it falls through to "full"'s 50/50 roll.
    const notes: string[] = [];
    runSeed(0, {
      policy: "coverage-fight",
      // flw252 (party menu input gated on the open fade, refusals on their printer) moved this exploring trajectory: battle 1 now
      // lasts to turn 93 and the first swap offer comes at frame 76621 (was 37569 / turn 26), so 60_000 no longer reaches one.
      maxFrames: 90_000,
      renderEvery: 0,
      onNote: (entry) => notes.push(entry.what),
    });
    const swapOfferNotes = notes.filter((note) => note.startsWith("swap offer:"));
    expect(swapOfferNotes.length).toBeGreaterThan(0);
    expect(swapOfferNotes.every((note) => note === "swap offer: NO")).toBe(true);
    expect(notes.some((note) => note.startsWith("swap screen:"))).toBe(false);
  });

  it("plans the coverage-first draft, not a random 3-of-6", () => {
    const notes: string[] = [];
    runSeed(0, {
      policy: "coverage-fight",
      maxFrames: 8_000,
      renderEvery: 0,
      onNote: (entry) => notes.push(entry.what),
    });
    // `planCoverageDraft`'s own note, and the "coverage" (not "combined")
    // scorer -- the shared `coverageDraftLike` path, not a copy.
    expect(notes.some((note) => note.startsWith("draft: coverage trio "))).toBe(true);
  });

  it("is deterministic: the same seed replays identically", () => {
    const options = {
      policy: "coverage-fight" as SoakPolicy,
      maxFrames: 40_000,
      renderEvery: 0,
    };
    const first = runSeed(7, options);
    const second = runSeed(7, options);
    expect(second.outcome).toBe(first.outcome);
    expect(second.frames).toBe(first.frames);
    expect(second.turn).toBe(first.turn);
    expect(second.battle).toBe(first.battle);
    expect(second.endState).toBe(first.endState);
  });
});

describe("coverage-fight coverage yield", () => {
  it("executes strictly more distinct player moves than winning on the same seed", () => {
    // Seed 0, 60,000 frames, `--coverage-json`-equivalent options (a
    // run-scoped SoakCoverageCollector handed to runSeed, exactly what the
    // CLI does). Measured at the time of writing: "winning" executes 3
    // distinct player moves (it commits its best-scoring slot every turn),
    // "coverage-fight" executes 22. The pin asserts the strict inequality
    // plus a floor well under the observed margin, so a drift in either
    // trajectory does not turn this into a brittle literal.
    const drive = (policy: SoakPolicy): number => {
      const coverage = new SoakCoverageCollector(policy);
      runSeed(0, { policy, maxFrames: 60_000, renderEvery: 0, coverage });
      return coverage.report().moves.bySide.player.distinct;
    };
    const winning = drive("winning");
    const coverageFight = drive("coverage-fight");
    expect(winning).toBeGreaterThan(0);
    expect(coverageFight).toBeGreaterThan(winning);
    expect(coverageFight).toBeGreaterThanOrEqual(10);
  });
});
