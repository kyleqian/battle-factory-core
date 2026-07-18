import { describe, expect, it } from "vitest";
import { advanceRngValue } from "../src/engine/rng.ts";
import {
  BATTLE_1_FRONTIER_MON_INDICES,
  generateBattle1OpponentTeam,
  natureFromPersonality,
  pickFrontierTransition,
  randomU16,
  randomU32,
  rollPersonalityForNature,
} from "../src/engine/opponentGen.ts";

// ---------------------------------------------------------------------------
// Ground truth: docs/battle-bringup-notes.md "Slice-0 ground truth" §3.1
// (RAM-probed via tools/probe/ram-probe.py against the committed trace
// tools/compare/traces-groundtruth/battle1-intro.json). Trainer 50 (DESTIN)'s
// battle-1 team, gFrontierTempParty = [188, 184, 135] (§5):
//   Grovyle (slot 1):   28 rejection iterations, personality 1094072807, nature RELAXED (7)
//   Murkrow (slot 2):   16 rejection iterations, personality 3475344024, nature QUIRKY (24)
//   Pidgeotto (slot 3): 95 rejection iterations, personality 3971699699, nature QUIRKY (24)
//   Transition select: one Random() = 22624, 22624 % 12 = 4 -> B_TRANSITION_FRONTIER_CIRCLES_MEET (id 34)
//
// ANCHOR USED BELOW: the dossier does not RAM-dump the gRngValue at the exact
// instant Grovyle's rejection loop begins (the per-tick trace only samples
// coarse VBlank boundaries, and the whole 3-mon + transition sequence spans
// several of those — see §3.1's own tick numbers, which are timing, not
// logic). Instead this suite *derives* that starting value independently by
// inverting the LCG from the pinned personality itself:
//   1. Random32() = Random() | (Random() << 16) exposes only the upper 16
//      bits of each of its two LCG steps (r_lo from the first call, r_hi from
//      the second - see opponentGen.ts's randomU32 doc). Grovyle's pinned
//      personality (1094072807) fixes r_lo = personality & 0xffff and
//      r_hi = (personality >> 16) & 0xffff exactly.
//   2. Brute-forcing the 65536 possible low-16-bits of the first call's
//      resulting LCG state (call it s1, with upper16(s1) = r_lo) for one
//      whose forward LCG step s2 = f(s1) has upper16(s2) = r_hi yields
//      exactly 2 candidates for s2 (the gRngValue immediately after
//      Grovyle's successful draw).
//   3. Inverting each candidate 56 steps back (28 iterations x 2 steps per
//      Random32) gives a candidate pre-loop state; forward-simulating
//      rollPersonalityForNature confirms which candidate is self-consistent
//      (reaches personality 1094072807 in exactly 28 iterations, not fewer).
//   4. Chaining candidate 1 (0x7b9fce20 / 2074070560) forward through
//      Murkrow's and Pidgeotto's loops does NOT reproduce their pinned
//      personalities with zero gap between loops - see "ambient gap"
//      discovery below. Advancing by exactly 11 plain Random() calls after
//      Grovyle's loop and 7 after Murkrow's loop before starting the next
//      mon's loop reproduces BOTH remaining personalities bit-for-bit, and
//      advancing 8 more before the transition draw reproduces the dossier's
//      own cited raw value (22624) bit-for-bit too - a coincidental match
//      this precise (4 independent 16-95-bit-wide exact matches) is not
//      statistically plausible, so this chain is treated as confirmed
//      ground truth, not a guess.
//
// This *corrects* a premise in this step's brief: FillFactoryFrontierTrainerParty's
// C loop (src/battle_tower.c:1862-1880) itself has zero RNG calls between mon
// iterations - "the post-Grovyle LCG state feeds Murkrow's loop" is only true
// modulo these ambient gaps. They are NOT part of the rejection loop's own
// shape (which reproduces every pinned value exactly on its own, with no
// fudging - see the "loop shape alone" tests below); they most likely
// reflect genuine per-VBlank Random() draws elsewhere in the frame while this
// sequence executes (Random() fires every VBlank throughout this whole
// window per docs/battle-bringup-notes.md §0), and are therefore
// session/timing-dependent, matching that same section's warning that
// opponent personalities are "session-input-dependent, not anchor-fixed
// constants." generateBattle1OpponentTeam takes them as an explicit
// parameter rather than baking them in as if they were universal constants.
const STARTING_RNG_VALUE = 0x7b9fce20; // 2074070560 - see derivation above
const AMBIENT_GAP_STEPS = [0, 11, 7, 8] as const;

const RELAXED_NATURE = 7;
const QUIRKY_NATURE = 24;

describe("randomU16 / randomU32", () => {
  it("randomU16 advances gRngValue via the LCG and returns its upper 16 bits, independent of advanceRngValue", () => {
    const next = advanceRngValue(STARTING_RNG_VALUE);
    const result = randomU16(STARTING_RNG_VALUE);
    expect(result.rngValue).toBe(next);
    expect(result.value).toBe((next >>> 16) & 0xffff);
  });

  it("randomU32 assigns the low word to the FIRST LCG step and the high word to the SECOND", () => {
    // Random32() = Random() | (Random() << 16) (include/random.h) - order of
    // the two Random() calls is a real ambiguity in the C macro (see
    // opponentGen.ts's randomU32 doc); this is the assignment confirmed
    // against the RAM-dumped personalities (the reverse assignment fails to
    // reproduce any of them - see the derivation comment above).
    const first = randomU16(STARTING_RNG_VALUE);
    const second = randomU16(first.rngValue);
    const combined = randomU32(STARTING_RNG_VALUE);
    expect(combined.rngValue).toBe(second.rngValue);
    expect(combined.value).toBe((first.value | (second.value << 16)) >>> 0);
  });
});

describe("natureFromPersonality", () => {
  it("matches GetNatureFromPersonality (personality % 25) for the 3 pinned personalities", () => {
    expect(natureFromPersonality(1094072807)).toBe(RELAXED_NATURE);
    expect(natureFromPersonality(3475344024)).toBe(QUIRKY_NATURE);
    expect(natureFromPersonality(3971699699)).toBe(QUIRKY_NATURE);
  });
});

describe("rollPersonalityForNature — the rejection loop alone, pinned per-mon", () => {
  it("Grovyle (slot 1): 28 iterations from STARTING_RNG_VALUE, personality 1094072807 (RELAXED)", () => {
    const result = rollPersonalityForNature(STARTING_RNG_VALUE, RELAXED_NATURE);
    expect(result.iterations).toBe(28);
    expect(result.personality).toBe(1094072807);
    expect(result.rngValue).toBe(1094078808);
  });

  it("Murkrow (slot 2): 16 iterations from the post-Grovyle+11-step state, personality 3475344024 (QUIRKY)", () => {
    const grovyle = rollPersonalityForNature(STARTING_RNG_VALUE, RELAXED_NATURE);
    let state = grovyle.rngValue;
    for (let i = 0; i < 11; i++) state = randomU16(state).rngValue;
    const result = rollPersonalityForNature(state, QUIRKY_NATURE);
    expect(result.iterations).toBe(16);
    expect(result.personality).toBe(3475344024);
    expect(result.rngValue).toBe(3475319573);
  });

  it("Pidgeotto (slot 3): 95 iterations from the post-Murkrow+7-step state, personality 3971699699 (QUIRKY)", () => {
    const grovyle = rollPersonalityForNature(STARTING_RNG_VALUE, RELAXED_NATURE);
    let state = grovyle.rngValue;
    for (let i = 0; i < 11; i++) state = randomU16(state).rngValue;
    const murkrow = rollPersonalityForNature(state, QUIRKY_NATURE);
    state = murkrow.rngValue;
    for (let i = 0; i < 7; i++) state = randomU16(state).rngValue;
    const result = rollPersonalityForNature(state, QUIRKY_NATURE);
    expect(result.iterations).toBe(95);
    expect(result.personality).toBe(3971699699);
    expect(result.rngValue).toBe(3971701576);
  });

  it("without the ambient gap, chaining Grovyle's ending state directly into Murkrow's loop does NOT reproduce the pinned value", () => {
    // Documents the discrepancy precisely (first divergent value), per this
    // step's instruction not to fudge the loop shape until it fits - the
    // rejection loop itself is correct (see tests above); the gap is real.
    const grovyle = rollPersonalityForNature(STARTING_RNG_VALUE, RELAXED_NATURE);
    const zeroGapMurkrow = rollPersonalityForNature(grovyle.rngValue, QUIRKY_NATURE);
    expect(zeroGapMurkrow.personality).not.toBe(3475344024);
  });
});

describe("pickFrontierTransition", () => {
  it("picks index 4 (id 34, B_TRANSITION_FRONTIER_CIRCLES_MEET) from the pinned pre-draw state, raw Random() = 22624", () => {
    const pidgeotto = (() => {
      const grovyle = rollPersonalityForNature(STARTING_RNG_VALUE, RELAXED_NATURE);
      let state = grovyle.rngValue;
      for (let i = 0; i < 11; i++) state = randomU16(state).rngValue;
      const murkrow = rollPersonalityForNature(state, QUIRKY_NATURE);
      state = murkrow.rngValue;
      for (let i = 0; i < 7; i++) state = randomU16(state).rngValue;
      return rollPersonalityForNature(state, QUIRKY_NATURE);
    })();
    let state = pidgeotto.rngValue;
    for (let i = 0; i < 8; i++) state = randomU16(state).rngValue;

    const transition = pickFrontierTransition(state);
    expect(transition.raw).toBe(22624);
    expect(transition.tableIndex).toBe(4);
    expect(transition.transitionId).toBe(34);
  });
});

describe("generateBattle1OpponentTeam — the full chained value chain", () => {
  it("reproduces all 3 personalities, iteration counts, and the transition pick from a single starting gRngValue", () => {
    const result = generateBattle1OpponentTeam(STARTING_RNG_VALUE, AMBIENT_GAP_STEPS);

    expect(result.mons).toHaveLength(3);
    expect(BATTLE_1_FRONTIER_MON_INDICES).toEqual([188, 184, 135]);

    const [grovyle, murkrow, pidgeotto] = result.mons;
    expect(grovyle).toEqual({ rngValue: 1094078808, personality: 1094072807, iterations: 28 });
    expect(murkrow).toEqual({ rngValue: 3475319573, personality: 3475344024, iterations: 16 });
    expect(pidgeotto).toEqual({ rngValue: 3971701576, personality: 3971699699, iterations: 95 });

    expect(natureFromPersonality(grovyle!.personality)).toBe(RELAXED_NATURE);
    expect(natureFromPersonality(murkrow!.personality)).toBe(QUIRKY_NATURE);
    expect(natureFromPersonality(pidgeotto!.personality)).toBe(QUIRKY_NATURE);

    expect(result.transition).toEqual({
      rngValue: 1482697859,
      tableIndex: 4,
      transitionId: 34,
      raw: 22624,
    });
  });

  it("defaults to zero ambient gap (the literal back-to-back algorithm as written in source)", () => {
    const noGap = generateBattle1OpponentTeam(STARTING_RNG_VALUE);
    const explicitZero = generateBattle1OpponentTeam(STARTING_RNG_VALUE, [0, 0, 0, 0]);
    expect(noGap).toEqual(explicitZero);
    // and it genuinely differs from the ground-truth chain (the gap matters):
    const withGap = generateBattle1OpponentTeam(STARTING_RNG_VALUE, AMBIENT_GAP_STEPS);
    expect(noGap.mons[1]).not.toEqual(withGap.mons[1]);
  });
});
