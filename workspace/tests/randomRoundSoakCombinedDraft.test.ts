// Tier-1 pins for the opt-in "winning-combined" soak policy
// (tools/soak/randomRoundSoakDriver.ts): identical to "winning-coverage"
// except the draft's trio search, which maximises the same coverage-first
// lexicographic score only over trios whose summed base-stat total meets a
// strength floor -- the MEAN candidate-trio total, i.e. what a random
// 3-of-6 draft fields in expectation.
//
// The COMBINED-score lever docs/soak-policy-strength-scout-2026-08-23.md's
// "Result -- lever 4'" closing paragraph left standing: lever 4 (bulk+STAB
// primary) starved coverage, lever 4' (pure coverage, bst a tiebreak)
// starved bulk -- mirror-image failure modes, so this policy is coverage
// subject to not-below-average bulk.

import { describe, expect, it } from "vitest";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import type { GbaButton } from "../src/input.ts";
import {
  ActionLog,
  RandomPlayer,
  Rng,
  combinedDraftBstFloor,
  coverageDraftTypeWeights,
  pickCombinedDraftPicks,
  pickCoverageDraftPicks,
  runSeed,
  scoreCoverageDraftTrio,
  type CoverageDraftRental,
} from "../tools/soak/randomRoundSoakDriver.ts";

type Move = { power: number; type: string };

function rental(species: string, types: string[], moves: Move[]): CoverageDraftRental {
  return { species, types, moves };
}

/**
 * Three frail rentals with three disjoint attacking types (the same building
 * block as the winning-coverage pins): the pure-coverage pick, and a trio
 * whose summed base-stat total sits BELOW the six-offer mean-trio floor.
 */
const FRAIL_COVERAGE_MONS: readonly CoverageDraftRental[] = [
  rental("SPECIES_VULPIX", ["TYPE_FIRE", "TYPE_FIRE"], [{ power: 40, type: "TYPE_FIRE" }]),
  rental("SPECIES_PIKACHU", ["TYPE_ELECTRIC", "TYPE_ELECTRIC"], [
    { power: 40, type: "TYPE_ELECTRIC" },
  ]),
  rental("SPECIES_MACHOP", ["TYPE_FIGHTING", "TYPE_FIGHTING"], [
    { power: 50, type: "TYPE_FIGHTING" },
  ]),
];

/** Three far bulkier mono-NORMAL rentals whose only moves are NORMAL (no coverage). */
const BULKY_MONO_MONS: readonly CoverageDraftRental[] = [
  rental("SPECIES_SNORLAX", ["TYPE_NORMAL", "TYPE_NORMAL"], [{ power: 130, type: "TYPE_NORMAL" }]),
  rental("SPECIES_KANGASKHAN", ["TYPE_NORMAL", "TYPE_NORMAL"], [
    { power: 100, type: "TYPE_NORMAL" },
  ]),
  rental("SPECIES_TAUROS", ["TYPE_NORMAL", "TYPE_NORMAL"], [{ power: 100, type: "TYPE_NORMAL" }]),
];

/** Frail coverage trio in slots 0/1/2, bulky mono trio in slots 3/4/5. */
const OFFER_A: readonly CoverageDraftRental[] = [...FRAIL_COVERAGE_MONS, ...BULKY_MONO_MONS];
/** The same six interleaved, so no pin can pass on slot position alone. */
const OFFER_B: readonly CoverageDraftRental[] = [
  BULKY_MONO_MONS[0]!,
  FRAIL_COVERAGE_MONS[0]!,
  BULKY_MONO_MONS[1]!,
  FRAIL_COVERAGE_MONS[1]!,
  BULKY_MONO_MONS[2]!,
  FRAIL_COVERAGE_MONS[2]!,
];

/** Drives the production tick loop until the draft's three rentals are all selected. */
function stageCompletedDraft(seed: number, maxFrames = 20_000): EngineState {
  const player = new RandomPlayer(new Rng(seed), new ActionLog(false), "winning-combined");
  let state = createInitialState();
  for (let frame = 0; frame < maxFrames; frame += 1) {
    const selected = state.draftScreen.selectedIds.filter((id) => id !== 0).length;
    if (selected === 3) return state;
    const buttons: ReadonlySet<GbaButton> = player.decide(state);
    state = tick(state, buttons);
  }
  throw new Error(`seed ${seed}: draft not completed within ${maxFrames} frames`);
}

describe("winning-combined soak policy: coverage draft with a strength floor", () => {
  it("floor is the mean candidate-trio base-stat total (half the six offers' sum)", () => {
    // Each rental sits in 10 of the 20 trios, so the mean trio total is half
    // the six offers' summed totals. The frail trio and the bulky trio are
    // complements, so their bst scores sum to the whole offer's total.
    for (const offer of [OFFER_A, OFFER_B]) {
      const weights = coverageDraftTypeWeights(offer);
      const frailBst = scoreCoverageDraftTrio(FRAIL_COVERAGE_MONS, weights).bst;
      const bulkyBst = scoreCoverageDraftTrio(BULKY_MONO_MONS, weights).bst;
      const floor = combinedDraftBstFloor(offer);
      expect(floor).toBe(Math.ceil((frailBst + bulkyBst) / 2));
      // The gap that makes this offer a binding test case: the bulky trio
      // meets the floor, the frail coverage trio does not.
      expect(bulkyBst).toBeGreaterThanOrEqual(floor);
      expect(frailBst).toBeLessThan(floor);
    }
  });

  it("picks the best-coverage trio that meets the floor, not the pure-coverage trio", () => {
    for (const [label, offer, expectedSet] of [
      // Eligible trios need two of the three bulky mons (one bulky plus both
      // frail-coverage mons is still below the mean-trio floor), so the best
      // eligible coverage is two bulky + MACHOP (FIGHTING hits the offer's
      // own NORMAL-heavy pool hardest); SNORLAX+KANGASKHAN win the pair by
      // the bst tiebreak (TAUROS ties KANGASKHAN, earliest combination
      // keeps KANGASKHAN's lower slot).
      ["offer A", OFFER_A, new Set([2, 3, 4])],
      ["offer B", OFFER_B, new Set([5, 0, 2])],
    ] as const) {
      const combined = pickCombinedDraftPicks(offer);
      const coverage = pickCoverageDraftPicks(offer);
      expect(new Set(combined.picks), label).toEqual(expectedSet);
      // The floor genuinely bound: pure coverage chose a trio below it.
      expect(coverage.score.bst, label).toBeLessThan(combined.floor);
      expect(combined.score.bst, label).toBeGreaterThanOrEqual(combined.floor);
      // ...and the two policies genuinely disagree on this offer.
      expect(new Set(combined.picks), label).not.toEqual(new Set(coverage.picks));
    }
  });

  it("matches winning-coverage exactly when the coverage trio already meets the floor", () => {
    // Six mono-FIRE rentals with one identical FIRE move: every trio scores
    // the same coverage, so both policies fall to the bst tiebreak and must
    // choose the same (bulkiest eligible) trio.
    const fireMove: Move[] = [{ power: 40, type: "TYPE_FIRE" }];
    const fireTypes = ["TYPE_FIRE", "TYPE_FIRE"];
    const offer: CoverageDraftRental[] = [
      rental("SPECIES_VULPIX", fireTypes, fireMove),
      rental("SPECIES_ARCANINE", fireTypes, fireMove),
      rental("SPECIES_SLUGMA", fireTypes, fireMove),
      rental("SPECIES_CHARIZARD", fireTypes, fireMove),
      rental("SPECIES_TORCHIC", fireTypes, fireMove),
      rental("SPECIES_MAGCARGO", fireTypes, fireMove),
    ];
    const combined = pickCombinedDraftPicks(offer);
    const coverage = pickCoverageDraftPicks(offer);
    expect(combined.picks).toEqual(coverage.picks);
    expect(combined.score).toEqual(coverage.score);
    expect(combined.score.bst).toBeGreaterThanOrEqual(combined.floor);
  });

  it("is deterministic: the same offer always yields the same trio, score and floor", () => {
    for (const offer of [OFFER_A, OFFER_B]) {
      const first = pickCombinedDraftPicks(offer);
      for (let repeat = 0; repeat < 8; repeat += 1) {
        const again = pickCombinedDraftPicks(offer);
        expect(again.picks).toEqual(first.picks);
        expect(again.score).toEqual(first.score);
        expect(again.floor).toBe(first.floor);
      }
    }
  });

  it("always declines the postwin swap offer and never enters the swap screen", () => {
    // Spec pin (the exact miss winning-coverage shipped with): the policy is
    // "identical to winning-coverage except the draft", and the driver's
    // swap-offer decline is keyed on winningLike, which must include this
    // policy.
    const notes: string[] = [];
    runSeed(0, {
      policy: "winning-combined",
      maxFrames: 32_000,
      renderEvery: 0,
      onNote: (entry) => notes.push(entry.what),
    });
    const swapOfferNotes = notes.filter((note) => note.startsWith("swap offer:"));
    expect(swapOfferNotes.length).toBeGreaterThan(0);
    expect(swapOfferNotes.every((note) => note === "swap offer: NO")).toBe(true);
    expect(notes.some((note) => note.startsWith("swap screen:"))).toBe(false);
  });

  it("rents exactly the scorer's trio, in the scorer's rent order, on a staged draft", () => {
    for (const seed of [0, 3, 12] as const) {
      const state = stageCompletedDraft(seed);
      const expected = pickCombinedDraftPicks(state.draftScreen.rentals);
      // selectedIds[slot] is the ball's 1-based pick number (0 = unrented),
      // so this recovers both the trio and the order it was rented in.
      const rentedInOrder = state.draftScreen.selectedIds
        .map((id, slot) => ({ id, slot }))
        .filter((entry) => entry.id !== 0)
        .sort((x, y) => x.id - y.id)
        .map((entry) => entry.slot);
      expect(rentedInOrder, `seed ${seed}`).toEqual([...expected.picks]);
    }
  });
});
