import { describe, expect, it } from "vitest";
import {
  generateFactoryOpponent,
  getLevel50FactoryOpponentFixedIv,
  type FactoryOpponentGenerationInput,
  type FactoryOpponentGenerationResult,
} from "../src/engine/factoryOpponentGeneration.ts";
import { getLevel50FactoryRentalRange } from "../src/engine/factoryRentalGeneration.ts";
import { advanceRngValue } from "../src/engine/rng.ts";

const PLAYER_TRAINER_ID = 0x1234_5678;
const INITIAL_RENTAL_SET_IDS = [110, 155, 140, 168, 197, 147] as const;
const NONOVERLAPPING_LOW_SET_IDS = [0, 1, 2, 3, 4, 5] as const;

function generate(
  rngValue: number,
  overrides: Partial<FactoryOpponentGenerationInput> = {},
): FactoryOpponentGenerationResult {
  return generateFactoryOpponent({
    rngValue,
    factoryWinStreak: 0,
    battleIndex: 0,
    storedTrainerIds: [],
    savedRentalSetIds: INITIAL_RENTAL_SET_IDS,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    ...overrides,
  });
}

function expectContiguousRandomLedger(result: FactoryOpponentGenerationResult): void {
  for (let i = 0; i < result.drawLedger.length; i += 1) {
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

describe("Battle Factory generic opponent generation", () => {
  it("pins trainer id, three complete records, and all 219 seed-0 Random() calls", () => {
    const first = generate(0);
    const second = generate(0);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      challengeNum: 0,
      trainerId: 0,
      trainerSourceId: "FRONTIER_TRAINER_BRADY",
      trainerName: "BRADY",
      storedTrainerIds: [0],
      fixedIv: 3,
      selectionRngValue: 4231221723,
      rngValue: 2348285517,
    });
    expect(first.drawLedger).toHaveLength(219);
    expect(first.drawLedger.filter((draw) => draw.phase === "trainer-selection")).toHaveLength(1);
    expect(first.drawLedger.filter((draw) => draw.phase === "set-selection")).toHaveLength(8);
    expect(first.drawLedger.filter((draw) => draw.phase === "personality")).toHaveLength(210);
    expect(first.opponents.map((opponent) => ({
      setId: opponent.setId,
      personality: opponent.personality,
      fixedIv: opponent.fixedIv,
      abilitySlot: opponent.abilitySlot,
      speciesName: opponent.speciesName,
      itemId: opponent.itemId,
      nature: opponent.nature,
      selectionDrawPosition: opponent.selectionDrawPosition,
      personalityDrawPositions: opponent.personalityDrawPositions,
    }))).toEqual([
      {
        setId: 124, personality: 3552946825, fixedIv: 3, abilitySlot: 1,
        speciesName: "SPECIES_TENTACOOL", itemId: 135, nature: 0,
        selectionDrawPosition: 1, personalityDrawPositions: [39, 40],
      },
      {
        setId: 120, personality: 2078778279, fixedIv: 3, abilitySlot: 0,
        speciesName: "SPECIES_PHANPY", itemId: 221, nature: 4,
        selectionDrawPosition: 5, personalityDrawPositions: [133, 134],
      },
      {
        setId: 143, personality: 2348238114, fixedIv: 3, abilitySlot: 0,
        speciesName: "SPECIES_ELEKID", itemId: 133, nature: 14,
        selectionDrawPosition: 8, personalityDrawPositions: [217, 218],
      },
    ]);
    expect(first.party).toEqual(first.opponents.map((opponent) => opponent.member));
    for (const opponent of first.opponents) {
      // The record is the rung-5 adapter output, not a parallel fixture shape.
      expect(opponent.member).toMatchObject({
        setId: opponent.setId,
        personality: opponent.personality,
        abilitySlot: opponent.abilitySlot,
        speciesName: opponent.speciesName,
        item: opponent.itemId,
        nature: opponent.nature,
        level: 50,
        friendship: 0,
      });
      expect(opponent.member.ivs).toEqual({
        hp: 3, attack: 3, defense: 3, speed: 3, spAttack: 3, spDefense: 3,
      });
    }
    expectContiguousRandomLedger(first);
  });

  it("spends one set draw on every saved-rental species rejection", () => {
    const result = generate(0);
    const selection = result.drawLedger.filter((draw) => draw.phase === "set-selection");

    // battle_factory.c:340-347 compares the candidate species against all
    // six rentalMons records. It does not compare exact set ids or items.
    expect(selection.map((draw) => [draw.candidateSetId, draw.selectionOutcome])).toEqual([
      [124, "accepted"],
      [155, "saved-rental-species"],
      [140, "saved-rental-species"],
      [168, "saved-rental-species"],
      [120, "accepted"],
      [197, "saved-rental-species"],
      [147, "saved-rental-species"],
      [143, "accepted"],
    ]);
    expect(selection).toHaveLength(8);
    expect(selection[1]!.rngAfter).toBe(selection[2]!.rngBefore);
    expect(result.drawLedger).toHaveLength(219);
  });

  it("proves Unown, duplicate-species, and duplicate-item retries with fixed seeds", () => {
    const unown = generate(42, { savedRentalSetIds: NONOVERLAPPING_LOW_SET_IDS });
    const duplicates = generate(56, { savedRentalSetIds: NONOVERLAPPING_LOW_SET_IDS });
    const unownSelection = unown.drawLedger.filter((draw) => draw.phase === "set-selection");
    const duplicateSelection = duplicates.drawLedger.filter((draw) => draw.phase === "set-selection");

    // Unown is rejected at battle_factory.c:336-338.
    expect(unownSelection.map((draw) => [draw.candidateSetId, draw.selectionOutcome])).toEqual([
      [189, "accepted"],
      [126, "unown"],
      [155, "accepted"],
      [168, "accepted"],
    ]);
    expect(unown.drawLedger).toHaveLength(81);

    // Species and non-NONE held items are rejected independently at
    // battle_factory.c:353-369. Both rejected attempts already spent their
    // GetFactoryMonId draw and consume nothing else before the next attempt.
    expect(duplicateSelection.map((draw) => [draw.candidateSetId, draw.selectionOutcome])).toEqual([
      [176, "accepted"],
      [176, "duplicate-species"],
      [190, "duplicate-item"],
      [168, "accepted"],
      [183, "accepted"],
    ]);
    expect(duplicates.drawLedger).toHaveLength(102);
    expect(duplicateSelection[1]!.rngAfter).toBe(duplicateSelection[2]!.rngBefore);
    expect(duplicateSelection[2]!.rngAfter).toBe(duplicateSelection[3]!.rngBefore);
    expectContiguousRandomLedger(unown);
    expectContiguousRandomLedger(duplicates);
  });

  it("pins the retail Battle Tower streak IV bug and the final-battle column", () => {
    // FillFactoryFrontierTrainerParty reads towerWinStreaks[..., LEVEL_50],
    // not factoryWinStreaks, in the un-BUGFIX retail build
    // (battle_tower.c:1832-1847).
    expect(getLevel50FactoryOpponentFixedIv(0, 0)).toBe(3);
    expect(getLevel50FactoryOpponentFixedIv(7, 0)).toBe(6);
    expect(getLevel50FactoryOpponentFixedIv(7, 6)).toBe(9);
    expect(getLevel50FactoryOpponentFixedIv(35, 5)).toBe(21);
    expect(getLevel50FactoryOpponentFixedIv(35, 6)).toBe(31);
  });

  it("proves the Level-50 high-tier rejection is source-real but unreachable", () => {
    // battle_factory.c:349-351 guards ids > FRONTIER_MONS_HIGH_TIER (849).
    // Every valid Level-50 GetFactoryMonId range ends at or below 849, so no
    // seed can reach that rejection. Open Level uses different ranges but
    // makes the guard condition false. Pin the Level-50 half of that proof.
    for (let challengeNum = 0; challengeNum < 32; challengeNum += 1) {
      expect(getLevel50FactoryRentalRange(challengeNum, false).end).toBeLessThanOrEqual(849);
    }
  });

  it("selects battles 0, 1, and 2 on one cursor and retries a prior trainer", () => {
    let rngValue = 27;
    let storedTrainerIds: readonly number[] = [];
    let savedRentalSetIds: readonly number[] = INITIAL_RENTAL_SET_IDS;
    const rows: Array<{
      trainerId: number;
      attempts: Array<[number | undefined, string | undefined]>;
      setIds: number[];
      ledgerLength: number;
    }> = [];

    for (let battleIndex = 0; battleIndex < 3; battleIndex += 1) {
      const result = generateFactoryOpponent({
        rngValue,
        factoryWinStreak: battleIndex,
        battleIndex,
        storedTrainerIds,
        savedRentalSetIds,
        playerTrainerId: PLAYER_TRAINER_ID,
        battleTowerLevel50WinStreak: 0,
      });
      rows.push({
        trainerId: result.trainerId,
        attempts: result.drawLedger
          .filter((draw) => draw.phase === "trainer-selection")
          .map((draw) => [draw.trainerId, draw.trainerOutcome]),
        setIds: result.opponents.map((opponent) => opponent.setId),
        ledgerLength: result.drawLedger.length,
      });
      rngValue = result.rngValue;
      storedTrainerIds = result.storedTrainerIds;
      // Source state for later generation: current player three followed by
      // the just-defeated opponent three (battle_factory.c:384-400).
      savedRentalSetIds = [
        ...INITIAL_RENTAL_SET_IDS.slice(0, 3),
        ...result.opponents.map((opponent) => opponent.setId),
      ];
    }

    expect(rows).toEqual([
      {
        trainerId: 18,
        attempts: [[18, "accepted"]],
        setIds: [146, 138, 132],
        ledgerLength: 62,
      },
      {
        trainerId: 44,
        attempts: [[44, "accepted"]],
        setIds: [177, 143, 170],
        ledgerLength: 260,
      },
      {
        trainerId: 16,
        attempts: [[18, "previously-fought"], [16, "accepted"]],
        setIds: [120, 132, 182],
        ledgerLength: 169,
      },
    ]);
    expect(storedTrainerIds).toEqual([18, 44, 16]);
    expect(rngValue).toBe(233560340);
  });
});
