import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import trainerPicsData from "../src/assets/gen/frontier-trainer-pics.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import {
  createFactoryRoundBattleOrchestrator,
  factoryBattleStartPresentationForState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function record(setId: number): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv: 31,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: PLAYER_TRAINER_ID,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function createShizukaStart() {
  const playerRentalRecords = [record(664), record(678), record(527)] as const;
  const state = createFactoryRoundBattleOrchestrator({
    id: "trainer-pic-shizuka-start-contract",
    // Challenge 2's source trainer range maps this first draw to id 110.
    rngValue: 13,
    factoryWinStreak: 14,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        record(1),
        record(2),
        record(3),
      ],
    },
  });
  return factoryBattleStartPresentationForState(state)!;
}

describe("generated Factory battle-start presentation command", () => {
  it("maps SHIZUKA through facility class to one of the 50 extracted trainer pics", () => {
    const command = createShizukaStart();
    expect(command.opponentTrainer).toMatchObject({
      trainerId: 110,
      trainerSourceId: "FRONTIER_TRAINER_SHIZUKA",
      name: "SHIZUKA",
      facilityClassId: 10,
      facilityClass: "FACILITY_CLASS_BLACK_BELT",
      trainerClassId: 12,
      trainerClass: "TRAINER_CLASS_BLACK_BELT",
      className: "BLACK BELT",
      trainerPicIndex: 11,
      trainerPic: "TRAINER_PIC_BLACK_BELT",
    });
    expect(trainerPicsData.count).toBe(50);
    expect(trainerPicsData.entries.find(
      ({ id }) => id === command.opponentTrainer.trainerPicIndex,
    ))
      .toMatchObject({
        id: 11,
        symbol: "TRAINER_PIC_BLACK_BELT",
      });
  });

  it("freezes complete arbitrary generated party rows and all intro substitutions", () => {
    const command = createShizukaStart();
    expect(command.activePartyIndexes).toEqual({ player: 0, opponent: 0 });
    expect(command.parties.player.map(({ setId }) => setId))
      .toEqual([664, 678, 527]);
    expect(command.parties.opponent).toHaveLength(3);

    for (const party of [command.parties.player, command.parties.opponent]) {
      for (const row of party) {
        expect(row).toEqual(expect.objectContaining({
          setId: expect.any(Number),
          species: expect.any(Number),
          speciesName: expect.any(String),
          personality: expect.any(Number),
          level: 50,
          nature: expect.any(Number),
          natureName: expect.any(String),
          ability: expect.any(Number),
          abilityName: expect.any(String),
          abilitySlot: expect.any(Number),
          item: expect.any(Number),
          itemName: expect.any(String),
          holdEffect: expect.any(Number),
          holdEffectName: expect.any(String),
          hp: expect.any(Number),
          maxHP: expect.any(Number),
          status1: expect.any(Number),
          moves: expect.any(Array),
          pp: expect.any(Array),
          ppUps: expect.any(Array),
          ivs: expect.any(Object),
          evs: expect.any(Object),
        }));
        expect(row.moves).toHaveLength(4);
        expect(row.pp).toHaveLength(4);
        expect(row.ppUps).toHaveLength(4);
        expect(Object.isFrozen(row)).toBe(true);
        expect(Object.isFrozen(row.moves)).toBe(true);
        expect(Object.isFrozen(row.ivs)).toBe(true);
      }
    }

    const opponentActive = command.parties.opponent[0];
    const playerActive = command.parties.player[0];
    expect(command.partySummaries.player)
      .toEqual(["healthy", "healthy", "healthy", "empty", "empty", "empty"]);
    expect(command.partySummaries.opponent)
      .toEqual(["healthy", "healthy", "healthy", "empty", "empty", "empty"]);
    expect(command.text).toEqual({
      wantsToBattle: ["BLACK BELT SHIZUKA", "would like to battle!"],
      opponentSendOut: [
        "BLACK BELT SHIZUKA sent",
        `out ${opponentActive.speciesName.replace(/^SPECIES_/, "")}!`,
      ],
      playerSendOut: [
        `Go! ${playerActive.speciesName.replace(/^SPECIES_/, "")}!`,
      ],
    });
    expect(Object.isFrozen(command)).toBe(true);
    expect(Object.isFrozen(command.parties.player)).toBe(true);
    expect(Object.isFrozen(command.text.opponentSendOut)).toBe(true);
  });
});
