import { describe, expect, it } from "vitest";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  generateInitialFactoryRentals,
  getFactoryRentalRank,
  getLevel50FactoryRentalRange,
  getLevel50InitialRentalFixedIv,
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

// --- retail sFixedIVTable[8] overread (ISSUES #118) ------------------------

describe("Battle Factory initial rentals — retail's sFixedIVTable[8] random-IV overread", () => {
  it("pins GetFactoryMonFixedIV's own clamp: argument exactly 8 overreads, 9+ clamps to row 7", () => {
    // battle_factory.c:748-750's non-BUGFIX `#else`: the bound check is
    // `challengeNum > ARRAY_COUNT(sFixedIVTable)` -- STRICTLY greater than 8
    // -- so argument 8 is unclamped and reads one row past the table.
    expect(getLevel50InitialRentalFixedIv(7, false)).toBe(31); // row 7 {31, 31}
    expect(getLevel50InitialRentalFixedIv(7, true)).toBe(110); // argument 8
    expect(getLevel50InitialRentalFixedIv(8, false)).toBe(110); // argument 8
    expect(getLevel50InitialRentalFixedIv(8, true)).toBe(31); // argument 9 -> row 7
    expect(getLevel50InitialRentalFixedIv(9, false)).toBe(31); // argument 9 -> row 7
    expect(getLevel50InitialRentalFixedIv(9, true)).toBe(31); // argument 10 -> row 7
    expect(getLevel50InitialRentalFixedIv(10, false)).toBe(31); // argument 10 -> row 7
    // Without the 9+ clamp the challenge-8 fix would only move the old throw
    // one challenge deeper, so these two are the load-bearing pins.
    expect(getLevel50InitialRentalFixedIv(50, true)).toBe(31);
  });

  it("rolls exactly two CreateBoxMon IV words per rental at challengeNum 8, right after its personality pair", () => {
    const result = generate(PLAYER_TRAINER_ID, 56);
    expect(result.challengeNum).toBe(8);
    expect(result.rentalRank).toBe(0);

    const ivDraws = result.drawLedger.filter((draw) => draw.phase === "random-ivs");
    expect(ivDraws).toHaveLength(12); // two per rental, all six slots
    expect(ivDraws.map((draw) => draw.purpose)).toEqual(
      [0, 1, 2, 3, 4, 5].flatMap(() => ["random-ivs-low", "random-ivs-high"]),
    );
    // A random-ivs entry carries the drawn word and nothing else -- neither
    // the selection group nor the personality group (pokemon.c:2277-2293).
    for (const draw of ivDraws) {
      expect(draw.range).toBeUndefined();
      expect(draw.betterRange).toBeUndefined();
      expect(draw.candidateSetId).toBeUndefined();
      expect(draw.selectionOutcome).toBeUndefined();
      expect(draw.personality).toBeUndefined();
      expect(draw.personalityOutcome).toBeUndefined();
      expect(draw.rngAfter).toBe(advanceRngValue(draw.rngBefore));
      expect(draw.randomU16).toBe(draw.rngAfter >>> 16);
    }
    // The two words follow the ACCEPTED personality pair immediately: the
    // personality is passed in and OT_ID_PRESET reads fixedOtId, so neither
    // costs a draw in between.
    for (let rentalIndex = 0; rentalIndex < 6; rentalIndex += 1) {
      const rental = result.rentals[rentalIndex]!;
      const [low, high] = result.drawLedger
        .filter((draw) => draw.phase === "random-ivs" && draw.rentalIndex === rentalIndex);
      expect(low!.position).toBe(rental.personalityDrawPositions[1] + 1);
      expect(high!.position).toBe(low!.position + 1);
      expect(rental.ivs).toBeDefined();
      // battle_factory_screen.c:1824 saves MON_DATA_ATK_IV as RentalMon.ivs.
      expect(rental.fixedIv).toBe(rental.ivs!.attack);
      // 110 is the fixed-IV ARGUMENT, never a stored IV.
      expect(rental.fixedIv).toBeLessThan(32);
    }
  });

  it("derives rental 0's six IVs by hand from its two drawn words", () => {
    const result = generate(PLAYER_TRAINER_ID, 56);
    const [low, high] = result.drawLedger
      .filter((draw) => draw.phase === "random-ivs" && draw.rentalIndex === 0)
      .map((draw) => draw.randomU16);
    expect([low, high]).toEqual([56_643, 28_792]);

    // pokemon.c:2274-2293, five bits per stat, low bits first.
    //   56643 = 0b1101_1101_0100_0011
    //     hp      =  56643        & 31 = 56643 - 32*1770 = 3
    //     attack  = (56643 >>  5) & 31 =  1770 - 32*  55 = 10
    //     defense = (56643 >> 10) & 31 =    55 - 32      = 23
    //   28792 = 0b0111_0000_0111_1000
    //     speed     =  28792        & 31 = 28792 - 32*899 = 24
    //     spAttack  = (28792 >>  5) & 31 =   899 - 32* 28 = 3
    //     spDefense = (28792 >> 10) & 31 =    28          = 28
    expect(result.rentals[0]!.ivs).toEqual({
      hp: 3, attack: 10, defense: 23, speed: 24, spAttack: 3, spDefense: 28,
    });
    expect(result.rentals[0]!.fixedIv).toBe(10);

    // The constructed mon carries the rolled spread, not a uniform ATK IV.
    const member = createFactoryCorpusPartyMember(result.rentals[0]!);
    expect(member.ivs).toEqual(result.rentals[0]!.ivs);
  });

  it("rolls IVs only for the better-range slots at challengeNum 7 (argument 8), leaving the rest uniform 31", () => {
    // battle_factory_screen.c:1762-1764: slots below the rental rank use
    // GetFactoryMonFixedIV(challengeNum + 1). rentsCount 100 -> rank 5, so
    // slots 0..4 take argument 8 (the overread) and slot 5 takes argument 7.
    const result = generate(PLAYER_TRAINER_ID, 49, 100);
    expect(result.challengeNum).toBe(7);
    expect(result.rentalRank).toBe(5);

    const ivDraws = result.drawLedger.filter((draw) => draw.phase === "random-ivs");
    expect(ivDraws).toHaveLength(10);
    expect([...new Set(ivDraws.map((draw) => draw.rentalIndex))]).toEqual([0, 1, 2, 3, 4]);
    expect(result.rentals[5]!.ivs).toEqual({
      hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31,
    });
    expect(result.rentals[5]!.fixedIv).toBe(31);
  });

  it("draws no IV words and keeps the uniform spread below USE_RANDOM_IVS", () => {
    const result = generate(PLAYER_TRAINER_ID, 0);
    expect(result.drawLedger.some((draw) => draw.phase === "random-ivs")).toBe(false);
    for (const rental of result.rentals) {
      expect(rental.fixedIv).toBe(3); // row 0 {3, 6}
      expect(rental.ivs).toEqual({
        hp: 3, attack: 3, defense: 3, speed: 3, spAttack: 3, spDefense: 3,
      });
    }
  });
});
