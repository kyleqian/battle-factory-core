// Tier-1 pins for the opt-in "winning-coverage" soak policy
// (tools/soak/randomRoundSoakDriver.ts): identical to "winning" except the
// draft, which rents the 3-of-6 offered rentals maximising a COVERAGE-FIRST
// lexicographic score -- (offensive coverage, defensive diversity, base-stat
// total) -- instead of a random 3-of-6.
//
// The measurement instrument for docs/soak-policy-strength-scout-2026-08-23.md's
// lever 4': the scout's §3 explains that the WITHHELD bulk+STAB draft
// heuristic lost because it starves type coverage, so base-stat total is
// demoted here from the primary axis to a pure tiebreak.
//
// The driver pin below deliberately asserts NO literal trio: it stages a real
// draft screen by driving the production tick loop, then requires the slots
// the driver actually rented (and their rent ORDER) to equal what
// `pickCoverageDraftPicks` returns for that same offer.

import { describe, expect, it } from "vitest";
import { createInitialState, tick, type EngineState } from "../src/engine/core.ts";
import type { GbaButton } from "../src/input.ts";
import {
  ActionLog,
  RandomPlayer,
  Rng,
  coverageDraftTypeWeights,
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
 * Three low-bulk rentals whose damaging moves cover three disjoint-ish
 * offensive types (FIRE / ELECTRIC / FIGHTING super-effective sets union to
 * 9 of the 17 defending types; dropping any one of them loses coverage).
 */
const COVERAGE_MONS: readonly CoverageDraftRental[] = [
  rental("SPECIES_VULPIX", ["TYPE_FIRE", "TYPE_FIRE"], [{ power: 40, type: "TYPE_FIRE" }]),
  rental("SPECIES_PIKACHU", ["TYPE_ELECTRIC", "TYPE_ELECTRIC"], [
    { power: 40, type: "TYPE_ELECTRIC" },
  ]),
  rental("SPECIES_MACHOP", ["TYPE_FIGHTING", "TYPE_FIGHTING"], [
    { power: 50, type: "TYPE_FIGHTING" },
  ]),
];

/**
 * Three far bulkier NORMAL-type rentals whose only damaging moves are NORMAL
 * -- a type that is super-effective against nothing at all, so this trio's
 * offensive coverage is 0 and its distinct-type count is 1, however big its
 * base-stat total is (Snorlax 540 + Kangaskhan 490 + Tauros 490).
 */
const BULKY_MONO_MONS: readonly CoverageDraftRental[] = [
  rental("SPECIES_SNORLAX", ["TYPE_NORMAL", "TYPE_NORMAL"], [{ power: 130, type: "TYPE_NORMAL" }]),
  rental("SPECIES_KANGASKHAN", ["TYPE_NORMAL", "TYPE_NORMAL"], [
    { power: 100, type: "TYPE_NORMAL" },
  ]),
  rental("SPECIES_TAUROS", ["TYPE_NORMAL", "TYPE_NORMAL"], [{ power: 100, type: "TYPE_NORMAL" }]),
];

/** Offer A: the coverage trio sits in slots 0/1/2. */
const OFFER_A: readonly CoverageDraftRental[] = [...COVERAGE_MONS, ...BULKY_MONO_MONS];
/** Offer B: the same six, interleaved, so the pin can't pass on slot position. */
const OFFER_B: readonly CoverageDraftRental[] = [
  BULKY_MONO_MONS[0]!,
  COVERAGE_MONS[0]!,
  BULKY_MONO_MONS[1]!,
  COVERAGE_MONS[1]!,
  BULKY_MONO_MONS[2]!,
  COVERAGE_MONS[2]!,
];

/** Drives the production tick loop until the draft's three rentals are all selected. */
function stageCompletedDraft(seed: number, maxFrames = 20_000): EngineState {
  const player = new RandomPlayer(new Rng(seed), new ActionLog(false), "winning-coverage");
  let state = createInitialState();
  let seen = state;
  for (let frame = 0; frame < maxFrames; frame += 1) {
    const selected = state.draftScreen.selectedIds.filter((id) => id !== 0).length;
    if (selected === 3) return state;
    // Keep the last state whose draft screen still owns input, so the
    // returned state's `rentals` are the offer that was actually drafted.
    seen = state;
    const buttons: ReadonlySet<GbaButton> = player.decide(state);
    state = tick(state, buttons);
  }
  throw new Error(`seed ${seed}: draft not completed within ${maxFrames} frames (last ${seen.frame})`);
}

describe("winning-coverage soak policy: coverage-first draft scorer", () => {
  it("prefers three distinct attacking types over a mono-type trio of higher base stats", () => {
    for (const [label, offer, expectedSet] of [
      ["offer A", OFFER_A, new Set([0, 1, 2])],
      ["offer B", OFFER_B, new Set([1, 3, 5])],
    ] as const) {
      const chosen = pickCoverageDraftPicks(offer);
      expect(new Set(chosen.picks), label).toEqual(expectedSet);

      // ...and it is a genuine lexicographic win, not a tiebreak accident:
      // the coverage trio scores strictly better offensively AND defensively
      // while scoring strictly WORSE on the demoted base-stat tiebreak.
      const weights = coverageDraftTypeWeights(offer);
      const coverageScore = scoreCoverageDraftTrio(COVERAGE_MONS, weights);
      const bulkyScore = scoreCoverageDraftTrio(BULKY_MONO_MONS, weights);
      expect(coverageScore.offensive, label).toBeGreaterThan(bulkyScore.offensive);
      expect(bulkyScore.offensive, label).toBe(0);
      expect(coverageScore.defensive, label).toBe(3);
      expect(bulkyScore.defensive, label).toBe(1);
      expect(coverageScore.bst, label).toBeLessThan(bulkyScore.bst);
    }
  });

  it("breaks a genuine (offensive, defensive) tie on summed base-stat total", () => {
    // Six FIRE-type rentals with the identical single FIRE move: every trio
    // has the same offensive coverage (1 distinct attacking type) and the
    // same defensive diversity (1 distinct type, no shared 4x), so only the
    // demoted base-stat tiebreak can decide. Slots 1/3/5 are the bulky half.
    const fireMove: Move[] = [{ power: 40, type: "TYPE_FIRE" }];
    const fireTypes = ["TYPE_FIRE", "TYPE_FIRE"];
    const offer: CoverageDraftRental[] = [
      rental("SPECIES_VULPIX", fireTypes, fireMove), // 299
      rental("SPECIES_ARCANINE", fireTypes, fireMove), // 555
      rental("SPECIES_SLUGMA", fireTypes, fireMove), // 250
      rental("SPECIES_CHARIZARD", ["TYPE_FIRE", "TYPE_FIRE"], fireMove), // 534 (typed mono here on purpose)
      rental("SPECIES_TORCHIC", fireTypes, fireMove), // 310
      rental("SPECIES_MAGCARGO", fireTypes, fireMove), // 410
    ];
    const weights = coverageDraftTypeWeights(offer);
    const a = scoreCoverageDraftTrio([offer[1]!, offer[3]!, offer[5]!], weights);
    const b = scoreCoverageDraftTrio([offer[0]!, offer[2]!, offer[4]!], weights);
    expect(a.offensive).toBe(b.offensive);
    expect(a.defensive).toBe(b.defensive);
    expect(a.bst).toBeGreaterThan(b.bst);

    expect(new Set(pickCoverageDraftPicks(offer).picks)).toEqual(new Set([1, 3, 5]));
  });

  it("is deterministic: the same offer always yields the same trio and score", () => {
    for (const offer of [OFFER_A, OFFER_B]) {
      const first = pickCoverageDraftPicks(offer);
      for (let repeat = 0; repeat < 8; repeat += 1) {
        const again = pickCoverageDraftPicks(offer);
        expect(again.picks).toEqual(first.picks);
        expect(again.score).toEqual(first.score);
      }
    }
  });

  it("always declines the postwin swap offer and never enters the swap screen", () => {
    // Regression pin: the policy's spec is "identical to 'winning' except
    // the draft", but as first landed it missed the swap-offer decline list
    // (written per-policy for "oracle-strength") and fell through to
    // "full"'s 50/50 roll -- seed 0 accepted 64 offers and random-walked
    // the swap screen. Same trap class as ISSUES #99; the decline is now
    // keyed on the driver's own `winningLike` so a future winning-like
    // policy can't miss it again.
    const notes: string[] = [];
    // Seed 0 wins battle 1 and reaches its first swap offer well inside
    // this cap (the "winning" pin in randomRoundSoak.test.ts sees one by
    // frame ~15,000; 32,000 gives headroom for the different draft).
    runSeed(0, {
      policy: "winning-coverage",
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
    // Several seeds so the pin covers more than one generated offer.
    for (const seed of [0, 3, 12] as const) {
      const state = stageCompletedDraft(seed);
      const expected = pickCoverageDraftPicks(state.draftScreen.rentals);
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
