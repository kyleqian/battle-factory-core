import { describe, expect, it } from "vitest";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  generateInitialFactoryRentals,
  getFactoryRentalRank,
  getLevel50FactoryRentalRange,
  type FactoryInitialRentalGenerationResult,
} from "../src/engine/factoryRentalGeneration.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

const PLAYER_TRAINER_ID = 0x1234_5678;

function generate(
  rngValue: number,
  factoryWinStreak = 0,
  rentsCount = 0,
  constructionRngValue?: number,
): FactoryInitialRentalGenerationResult {
  return generateInitialFactoryRentals({
    rngValue,
    factoryWinStreak,
    rentsCount,
    playerTrainerId: PLAYER_TRAINER_ID,
    constructionRngValue,
  });
}

function compactRecords(result: FactoryInitialRentalGenerationResult) {
  return result.rentals.map((rental) => ({
    setId: rental.setId,
    personality: rental.personality,
    fixedIv: rental.fixedIv,
    abilitySlot: rental.abilitySlot,
    otId: rental.otId,
    speciesName: rental.speciesName,
    itemId: rental.itemId,
    nature: rental.nature,
    selectionDrawPosition: rental.selectionDrawPosition,
    personalityDrawPositions: rental.personalityDrawPositions,
  }));
}

function expectContiguousRandomLedger(result: FactoryInitialRentalGenerationResult): void {
  for (let i = 0; i < result.drawLedger.length; i++) {
    const entry = result.drawLedger[i]!;
    expect(entry.position, `draw ${i} position`).toBe(i);
    expect(entry.rngAfter, `draw ${i} LCG`).toBe(advanceRngValue(entry.rngBefore));
    expect(entry.randomU16, `draw ${i} Random() return`).toBe(entry.rngAfter >>> 16);
    if (i > 0) {
      const previous = result.drawLedger[i - 1]!;
      const isConstructionCheckpoint = previous.phase === "set-selection"
        && entry.phase === "personality"
        && entry.rngBefore !== previous.rngAfter;
      if (!isConstructionCheckpoint) {
        expect(entry.rngBefore, `draw ${i} consumes prior cursor`).toBe(previous.rngAfter);
      }
    }
  }
}

describe("Battle Factory initial rental generation", () => {
  it("pins the challenge-0 six full records and every one of 198 Random() calls for seed 0", () => {
    const result = generate(0);

    expect(result).toMatchObject({
      challengeNum: 0,
      rentalRank: 0,
      selectionRngValue: 1742452232,
      rngValue: 4158915758,
    });
    expect(result.drawLedger).toHaveLength(198);
    expect(result.drawLedger.filter((draw) => draw.phase === "set-selection")).toHaveLength(8);
    expect(compactRecords(result)).toEqual([
      {
        setId: 110, personality: 813709149, fixedIv: 3, abilitySlot: 1,
        otId: PLAYER_TRAINER_ID, speciesName: "SPECIES_GRIMER", itemId: 135,
        nature: 24, selectionDrawPosition: 0, personalityDrawPositions: [22, 23],
      },
      {
        setId: 155, personality: 4276564499, fixedIv: 3, abilitySlot: 1,
        otId: PLAYER_TRAINER_ID, speciesName: "SPECIES_POLIWHIRL", itemId: 171,
        nature: 24, selectionDrawPosition: 2, personalityDrawPositions: [26, 27],
      },
      {
        setId: 140, personality: 3187899706, fixedIv: 3, abilitySlot: 0,
        otId: PLAYER_TRAINER_ID, speciesName: "SPECIES_LILEEP", itemId: 221,
        nature: 6, selectionDrawPosition: 3, personalityDrawPositions: [124, 125],
      },
      {
        setId: 168, personality: 2276043732, fixedIv: 3, abilitySlot: 0,
        otId: PLAYER_TRAINER_ID, speciesName: "SPECIES_PORYGON", itemId: 142,
        nature: 7, selectionDrawPosition: 4, personalityDrawPositions: [136, 137],
      },
      {
        setId: 197, personality: 4249714839, fixedIv: 3, abilitySlot: 1,
        otId: PLAYER_TRAINER_ID, speciesName: "SPECIES_RATICATE", itemId: 217,
        nature: 14, selectionDrawPosition: 6, personalityDrawPositions: [160, 161],
      },
      {
        setId: 147, personality: 4158934324, fixedIv: 3, abilitySlot: 0,
        otId: PLAYER_TRAINER_ID, speciesName: "SPECIES_NIDORINO", itemId: 196,
        nature: 24, selectionDrawPosition: 7, personalityDrawPositions: [196, 197],
      },
    ]);
    expectContiguousRandomLedger(result);
  });

  it("uses rank 5's better challenge-1 range and IVs for exactly the first five slots", () => {
    // GetNumPastRentalsRank: battle_factory.c:868-886. The slot comparison
    // is `i < rentalRank` at :557, and construction repeats it at
    // battle_factory_screen.c:1761-1764.
    const result = generate(42, 0, 43);

    expect(result.rentalRank).toBe(5);
    expect(result.drawLedger).toHaveLength(522);
    expect(result.drawLedger.filter((draw) => draw.phase === "set-selection")).toHaveLength(6);
    expect(result.rentals.map((rental) => rental.setId)).toEqual([246, 166, 193, 162, 205, 127]);
    expect(result.rentals.map((rental) => rental.fixedIv)).toEqual([6, 6, 6, 6, 6, 3]);
    expect(result.rentals.map((rental) => rental.personality)).toEqual([
      2645381821, 1853524403, 1286626275, 1814712376, 1819851975, 570663874,
    ]);
    expect(result.drawLedger.filter((draw) => draw.phase === "set-selection").map((draw) => ({
      better: draw.betterRange,
      range: draw.range,
    }))).toEqual([
      { better: true, range: { start: 162, end: 266 } },
      { better: true, range: { start: 162, end: 266 } },
      { better: true, range: { start: 162, end: 266 } },
      { better: true, range: { start: 162, end: 266 } },
      { better: true, range: { start: 162, end: 266 } },
      { better: false, range: { start: 110, end: 199 } },
    ]);
    expectContiguousRandomLedger(result);
  });

  it("consumes the duplicate-set candidate draw before retrying, with no hidden draw", () => {
    // battle_factory.c:568-570 breaks when `existingMonId == monId`;
    // :579-580 immediately continues. GetFactoryMonId's one Random() at
    // :844/:850/:861 was already consumed, so the next ledger position is
    // the next candidate attempt.
    const result = generate(2);
    const selection = result.drawLedger.filter((draw) => draw.phase === "set-selection");

    expect(result.drawLedger).toHaveLength(335);
    expect(selection).toHaveLength(11);
    expect(selection.map((draw) => [draw.candidateSetId, draw.selectionOutcome])).toEqual([
      [126, "unown"],
      [115, "accepted"],
      [136, "accepted"],
      [117, "accepted"],
      [178, "accepted"],
      [111, "duplicate-item"],
      [178, "duplicate-set"],
      [163, "accepted"],
      [117, "duplicate-set"],
      [131, "duplicate-item"],
      [152, "accepted"],
    ]);
    expect(selection[6]!.rngAfter).toBe(selection[7]!.rngBefore);
    expect(result.rentals.map((rental) => rental.setId)).toEqual([115, 136, 117, 178, 163, 152]);
    expectContiguousRandomLedger(result);
  });

  it("consumes the duplicate-item candidate draw before retrying, with ITEM_NONE exempt", () => {
    // battle_factory.c:583-593 rejects only when existing item != ITEM_NONE
    // and the resolved held item ids match. The candidate's one range draw
    // remains spent; there is no draw inside either comparison loop.
    const result = generate(0);
    const selection = result.drawLedger.filter((draw) => draw.phase === "set-selection");

    expect(result.drawLedger).toHaveLength(198);
    expect(selection).toHaveLength(8);
    expect(selection[1]).toMatchObject({
      candidateSetId: 124,
      selectionOutcome: "duplicate-item",
    });
    expect(selection[5]).toMatchObject({
      candidateSetId: 120,
      selectionOutcome: "duplicate-item",
    });
    expect(selection[1]!.rngAfter).toBe(selection[2]!.rngBefore);
    expect(selection[5]!.rngAfter).toBe(selection[6]!.rngBefore);
    expectContiguousRandomLedger(result);
  });

  it("reproduces the source's stateful third-same-species rejection exactly", () => {
    // The C is subtler than its comment: :571-576 records the first repeated
    // species in currSpecies without breaking; a later repeat breaks. Seed
    // 237 at challenge 7 accepts LAPRAS sets 821/822, then rejects set 820.
    // The rejection spends only GetFactoryMonId's already-recorded draw.
    const result = generate(237, 49, 0, 0);
    const selection = result.drawLedger.filter((draw) => draw.phase === "set-selection");

    expect(result.drawLedger).toHaveLength(286);
    expect(selection).toHaveLength(12);
    expect(selection.map((draw) => [draw.candidateSetId, draw.selectionOutcome])).toEqual([
      [574, "accepted"],
      [821, "accepted"],
      [822, "accepted"],
      [798, "duplicate-item"],
      [676, "duplicate-item"],
      [420, "accepted"],
      [605, "accepted"],
      [765, "duplicate-item"],
      [571, "duplicate-item"],
      [820, "duplicate-species"],
      [831, "duplicate-item"],
      [513, "accepted"],
    ]);
    expect(selection[9]!.rngAfter).toBe(selection[10]!.rngBefore);
    expect(result.rentals.map((rental) => rental.speciesName)).toEqual([
      "SPECIES_BRELOOM", "SPECIES_LAPRAS", "SPECIES_LAPRAS",
      "SPECIES_MUK", "SPECIES_NIDOQUEEN", "SPECIES_ARMALDO",
    ]);
    expectContiguousRandomLedger(result);
  });

  it("constructs every generated full record through the rung-5 corpus adapter", () => {
    const cases = [
      generate(0),
      generate(42, 0, 43),
      generate(237, 49, 0, 0),
    ];

    for (const result of cases) {
      for (const rental of result.rentals) {
        const member = createFactoryCorpusPartyMember(rental);
        expect(member).toMatchObject({
          setId: rental.setId,
          personality: rental.personality,
          abilitySlot: rental.abilitySlot,
          abilityNum: rental.abilitySlot,
          speciesName: rental.speciesName,
          nature: rental.nature,
          item: rental.itemId,
          level: 50,
        });
        expect(member.ivs).toEqual({
          hp: rental.fixedIv,
          attack: rental.fixedIv,
          defense: rental.fixedIv,
          speed: rental.fixedIv,
          spAttack: rental.fixedIv,
          spDefense: rental.fixedIv,
        });
      }
    }
  });

  it("pins range clamping and every rental-rank threshold from the C tables", () => {
    expect([0, 14, 15, 21, 22, 28, 29, 35, 36, 42, 43].map(getFactoryRentalRank))
      .toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5]);
    expect(getLevel50FactoryRentalRange(0, false)).toEqual({ start: 110, end: 199 });
    expect(getLevel50FactoryRentalRange(0, true)).toEqual({ start: 162, end: 266 });
    expect(getLevel50FactoryRentalRange(6, true)).toEqual({ start: 372, end: 849 });
    expect(getLevel50FactoryRentalRange(7, false)).toEqual({ start: 372, end: 849 });
    expect(getLevel50FactoryRentalRange(7, true)).toEqual({ start: 372, end: 849 });
  });
});
