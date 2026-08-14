import { describe, expect, it } from "vitest";
import {
  generateFactoryBrainOpponent,
  getLevel50FactoryBrainFixedIv,
  type FactoryBrainOpponentGenerationInput,
  type FactoryBrainOpponentGenerationResult,
} from "../src/engine/factoryBrainOpponentGeneration.ts";
import { getLevel50FactoryRentalRange } from "../src/engine/factoryRentalGeneration.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

const PLAYER_TRAINER_ID = 0x1234_5678;
const NONOVERLAPPING_LOW_SET_IDS = [0, 1, 2, 3, 4, 5] as const;

function generate(
  rngValue: number,
  overrides: Partial<FactoryBrainOpponentGenerationInput> = {},
): FactoryBrainOpponentGenerationResult {
  return generateFactoryBrainOpponent({
    rngValue,
    factoryWinStreak: 0,
    playerRentalSetIds: NONOVERLAPPING_LOW_SET_IDS,
    playerTrainerId: PLAYER_TRAINER_ID,
    ...overrides,
  });
}

function expectContiguousRandomLedger(result: FactoryBrainOpponentGenerationResult): void {
  for (let i = 0; i < result.drawLedger.length; i += 1) {
    const entry = result.drawLedger[i]!;
    expect(entry.position, `draw ${i} position`).toBe(i);
    expect(entry.rngAfter, `draw ${i} LCG`).toBe(advanceRngValue(entry.rngBefore));
    expect(entry.randomU16, `draw ${i} Random() return`).toBe(entry.rngAfter >>> 16);
    if (i > 0) {
      expect(entry.rngBefore, `draw ${i} consumes prior cursor`).toBe(result.drawLedger[i - 1]!.rngAfter);
    }
  }
}

describe("Battle Factory Frontier Brain opponent generation", () => {
  it("pins the fixed-IV receipts at challengeNum 2 and 5, plus the retail challenge-6 OOB rejection", () => {
    // sFixedIVTable rows, indexed by challengeNum + 2 (battle_factory.c:157-166, 772).
    expect(getLevel50FactoryBrainFixedIv(0)).toBe(9); // row 2: {9, 12}
    expect(getLevel50FactoryBrainFixedIv(1)).toBe(12); // row 3: {12, 15}
    expect(getLevel50FactoryBrainFixedIv(2)).toBe(15); // row 4: {15, 18}
    expect(getLevel50FactoryBrainFixedIv(3)).toBe(21); // row 5: {21, 31}
    expect(getLevel50FactoryBrainFixedIv(4)).toBe(31); // row 6: {31, 31}
    expect(getLevel50FactoryBrainFixedIv(5)).toBe(31); // row 7: {31, 31}
    // challengeNum 6 -> ivArg 8 == ARRAY_COUNT(sFixedIVTable): the non-BUGFIX
    // clamp only fires when the argument is STRICTLY greater than 8, so this
    // is the retail one-past-the-end sFixedIVTable[8] read and is rejected
    // as not portable rather than guessed at.
    expect(() => getLevel50FactoryBrainFixedIv(6)).toThrow(/not portable/);
    // challengeNum >= 7 -> ivArg >= 9 is safely clamped to the last row.
    expect(getLevel50FactoryBrainFixedIv(7)).toBe(31);
    expect(getLevel50FactoryBrainFixedIv(100)).toBe(31);
  });

  it("pins the draw-range receipts at challengeNum 2 and 5, matching the ordinary opponent's range helper", () => {
    const rangeAtChallenge2 = getLevel50FactoryRentalRange(2, false);
    const rangeAtChallenge5 = getLevel50FactoryRentalRange(5, false);
    expect(rangeAtChallenge2).toEqual({ start: 267, end: 371 });
    expect(rangeAtChallenge5).toEqual({ start: 564, end: 659 });

    const atChallenge2 = generate(1, { factoryWinStreak: 14 });
    const atChallenge5 = generate(1, { factoryWinStreak: 35 });
    expect(atChallenge2.challengeNum).toBe(2);
    expect(atChallenge2.fixedIv).toBe(15);
    expect(atChallenge2.drawLedger[0]!.range).toEqual(rangeAtChallenge2);
    expect(atChallenge5.challengeNum).toBe(5);
    expect(atChallenge5.fixedIv).toBe(31);
    expect(atChallenge5.drawLedger[0]!.range).toEqual(rangeAtChallenge5);
  });

  it("proves the Level-50 high-tier rejection is source-real but unreachable, like the ordinary opponent's", () => {
    // battle_factory.c:783-784 guards ids > FRONTIER_MONS_HIGH_TIER (849).
    // FillFactoryBrainParty draws from the exact same
    // getLevel50FactoryRentalRange(challengeNum, false) rows as the ordinary
    // opponent, whose maximum is also 849, so no seed can reach this rule.
    for (let challengeNum = 0; challengeNum < 32; challengeNum += 1) {
      expect(getLevel50FactoryRentalRange(challengeNum, false).end).toBeLessThanOrEqual(849);
    }
  });

  it("rejects a forced Unown draw and keeps drawing for the same opponent slot", () => {
    const result = generate(2);
    const selection = result.drawLedger.filter((draw) => draw.phase === "set-selection");
    expect(selection.slice(0, 2).map((draw) => [draw.candidateSetId, draw.selectionOutcome])).toEqual([
      [126, "unown"], // battle_factory.c:781-782
      [115, "accepted"],
    ]);
    expect(result.opponents.map((o) => o.setId)).toEqual([115, 127, 136]);
    expectContiguousRandomLedger(result);
  });

  it("rejects a forced saved-rental set-id draw by exact monId, not species", () => {
    const result = generate(114, { playerRentalSetIds: [143, 0, 1, 2, 3, 4] });
    const selection = result.drawLedger.filter((draw) => draw.phase === "set-selection");
    expect(selection.slice(0, 2).map((draw) => [draw.candidateSetId, draw.selectionOutcome])).toEqual([
      [143, "saved-rental-set-id"], // battle_factory.c:786-792
      [145, "accepted"],
    ]);
    expectContiguousRandomLedger(result);
  });

  it("rejects a forced duplicate-species draw against the already-chosen party", () => {
    const result = generate(14);
    const selection = result.drawLedger.filter((draw) => draw.phase === "set-selection");
    expect(selection.slice(0, 3).map((draw) => [draw.candidateSetId, draw.selectionOutcome])).toEqual([
      [178, "accepted"],
      [178, "duplicate-species"], // battle_factory.c:794-800
      [160, "accepted"],
    ]);
    expectContiguousRandomLedger(result);
  });

  it("rejects a forced duplicate-item draw (different species, same non-NONE item)", () => {
    const result = generate(6);
    const selection = result.drawLedger.filter((draw) => draw.phase === "set-selection");
    expect(selection.slice(0, 3).map((draw) => [draw.candidateSetId, draw.selectionOutcome])).toEqual([
      [144, "accepted"],
      [178, "duplicate-item"], // battle_factory.c:802-808
      [161, "accepted"],
    ]);
    expectContiguousRandomLedger(result);
  });

  it("reports the earliest source rule when a candidate matches multiple rejection rules", () => {
    // Unown's own set id (126) is also placed in the player's rentals: the
    // unown check (:781-782) runs before the saved-rental check (:786-792),
    // so the outcome must be "unown", not "saved-rental-set-id".
    const unownVsSaved = generate(2, { playerRentalSetIds: [126, 0, 1, 2, 3, 4] });
    const unownVsSavedSelection = unownVsSaved.drawLedger.filter((draw) => draw.phase === "set-selection");
    expect(unownVsSavedSelection[0]!.candidateSetId).toBe(126);
    expect(unownVsSavedSelection[0]!.selectionOutcome).toBe("unown");

    // Set 140 (Lileep, item 221) shares its held item with the first
    // accepted opponent (set 160, Ariados, item 221) AND is one of the
    // player's rentals. The saved-rental check (:786-792) runs before the
    // duplicate-item check (:802-808), so the outcome must be
    // "saved-rental-set-id", not "duplicate-item".
    const savedVsItem = generate(269, { playerRentalSetIds: [115, 116, 120, 131, 140, 149] });
    const savedVsItemSelection = savedVsItem.drawLedger.filter((draw) => draw.phase === "set-selection");
    expect(savedVsItemSelection.slice(0, 2).map((draw) => [draw.candidateSetId, draw.selectionOutcome])).toEqual([
      [160, "accepted"],
      [140, "saved-rental-set-id"],
    ]);
  });

  it("is deterministic: the same input produces an identical frozen result twice", () => {
    const first = generate(15896);
    const second = generate(15896);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.opponents)).toBe(true);
    expect(Object.isFrozen(first.drawLedger)).toBe(true);
  });

  it("walks one full three-mon generation with a hand-derived draw ledger, entry by entry", () => {
    const result = generate(15896);

    expect(result.challengeNum).toBe(0);
    expect(result.fixedIv).toBe(9);
    expect(result.rngValue).toBe(951779210);
    expect(result.drawLedger).toHaveLength(10);
    expectContiguousRandomLedger(result);

    expect(result.drawLedger.map((entry) => ({
      position: entry.position,
      phase: entry.phase,
      purpose: entry.purpose,
      opponentIndex: entry.opponentIndex,
      rngBefore: entry.rngBefore,
      rngAfter: entry.rngAfter,
      randomU16: entry.randomU16,
      candidateSetId: entry.candidateSetId,
      selectionOutcome: entry.selectionOutcome,
      personality: entry.personality,
      personalityOutcome: entry.personalityOutcome,
    }))).toEqual([
      {
        position: 0, phase: "set-selection", purpose: "set-candidate", opponentIndex: 0,
        rngBefore: 15896, rngAfter: 831922347, randomU16: 12694,
        candidateSetId: 114, selectionOutcome: "accepted",
        personality: undefined, personalityOutcome: undefined,
      },
      {
        position: 1, phase: "personality", purpose: "personality-low", opponentIndex: 0,
        rngBefore: 831922347, rngAfter: 2317509442, randomU16: 35362,
        candidateSetId: undefined, selectionOutcome: undefined,
        personality: 3522071074, personalityOutcome: "accepted",
      },
      {
        position: 2, phase: "personality", purpose: "personality-high", opponentIndex: 0,
        rngBefore: 2317509442, rngAfter: 3522084749, randomU16: 53742,
        candidateSetId: undefined, selectionOutcome: undefined,
        personality: 3522071074, personalityOutcome: "accepted",
      },
      {
        position: 3, phase: "set-selection", purpose: "set-candidate", opponentIndex: 1,
        rngBefore: 3522084749, rngAfter: 353559932, randomU16: 5394,
        candidateSetId: 194, selectionOutcome: "accepted",
        personality: undefined, personalityOutcome: undefined,
      },
      {
        position: 4, phase: "personality", purpose: "personality-low", opponentIndex: 1,
        rngBefore: 353559932, rngAfter: 3034570303, randomU16: 46303,
        candidateSetId: undefined, selectionOutcome: undefined,
        personality: 482587871, personalityOutcome: "accepted",
      },
      {
        position: 5, phase: "personality", purpose: "personality-high", opponentIndex: 1,
        rngBefore: 3034570303, rngAfter: 482554694, randomU16: 7363,
        candidateSetId: undefined, selectionOutcome: undefined,
        personality: 482587871, personalityOutcome: "accepted",
      },
      {
        position: 6, phase: "set-selection", purpose: "set-candidate", opponentIndex: 2,
        rngBefore: 482554694, rngAfter: 652249409, randomU16: 9952,
        candidateSetId: 162, selectionOutcome: "duplicate-item",
        personality: undefined, personalityOutcome: undefined,
      },
      {
        position: 7, phase: "set-selection", purpose: "set-candidate", opponentIndex: 2,
        rngBefore: 652249409, rngAfter: 2696060704, randomU16: 41138,
        candidateSetId: 118, selectionOutcome: "accepted",
        personality: undefined, personalityOutcome: undefined,
      },
      {
        position: 8, phase: "personality", purpose: "personality-low", opponentIndex: 2,
        rngBefore: 2696060704, rngAfter: 189391123, randomU16: 2889,
        candidateSetId: undefined, selectionOutcome: undefined,
        personality: 951716681, personalityOutcome: "accepted",
      },
      {
        position: 9, phase: "personality", purpose: "personality-high", opponentIndex: 2,
        rngBefore: 189391123, rngAfter: 951779210, randomU16: 14522,
        candidateSetId: undefined, selectionOutcome: undefined,
        personality: 951716681, personalityOutcome: "accepted",
      },
    ]);

    expect(result.opponents.map((opponent) => ({
      setId: opponent.setId,
      speciesName: opponent.speciesName,
      personality: opponent.personality,
      fixedIv: opponent.fixedIv,
      abilitySlot: opponent.abilitySlot,
      itemId: opponent.itemId,
      nature: opponent.nature,
      otId: opponent.otId,
      selectionDrawPosition: opponent.selectionDrawPosition,
      personalityDrawPositions: opponent.personalityDrawPositions,
    }))).toEqual([
      {
        setId: 114, speciesName: "SPECIES_DROWZEE", personality: 3522071074, fixedIv: 9,
        abilitySlot: 0, itemId: 142, nature: 24, otId: PLAYER_TRAINER_ID,
        selectionDrawPosition: 0, personalityDrawPositions: [1, 2],
      },
      {
        setId: 194, speciesName: "SPECIES_MAGCARGO", personality: 482587871, fixedIv: 9,
        abilitySlot: 1, itemId: 221, nature: 21, otId: PLAYER_TRAINER_ID,
        selectionDrawPosition: 3, personalityDrawPositions: [4, 5],
      },
      {
        setId: 118, speciesName: "SPECIES_DELIBIRD", personality: 951716681, fixedIv: 9,
        abilitySlot: 1, itemId: 212, nature: 6, otId: PLAYER_TRAINER_ID,
        selectionDrawPosition: 7, personalityDrawPositions: [8, 9],
      },
    ]);

    for (const opponent of result.opponents) {
      expect(opponent.member.ivs).toEqual({
        hp: 9, attack: 9, defense: 9, speed: 9, spAttack: 9, spDefense: 9,
      });
      expect(opponent.member.friendship).toBe(0);
      expect(opponent.member.level).toBe(50);
    }
  });
});
