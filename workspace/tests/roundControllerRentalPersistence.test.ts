import { describe, expect, it } from "vitest";
import {
  healFactoryKernelParty,
  type BattleMon,
  type BattleOpponent,
  type BattleParty,
  type FactoryKernelParty,
  type FactoryRentalParty,
  type FixtureBattleScenario,
} from "../src/engine/battleScenario.ts";
import {
  advanceRoundController,
  chooseRoundSwap,
  completeBattlePresentation,
  createRoundController,
  resolveRoundBattle,
  type RoundControllerState,
} from "../src/engine/roundController.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { generateFactoryOpponent } from "../src/engine/factoryOpponentGeneration.ts";
import { generateInitialFactoryRentals } from "../src/engine/factoryRentalGeneration.ts";

const PLAYER_TRAINER_ID = 0x1234_5678;

function battleParty(records: FactoryRentalParty, prefix: string): BattleParty {
  return records.map((record, index): BattleMon => {
    const member = createFactoryCorpusPartyMember(record);
    return {
      id: `${prefix}-${index}`,
      species: member.speciesName,
      maxHp: member.maxHP,
      hp: member.hp,
      status: "none",
    };
  }) as unknown as BattleParty;
}

function acknowledgeAndAdvance(state: RoundControllerState): RoundControllerState {
  const commandId = state.presentation?.command.commandId;
  if (commandId === undefined) throw new Error("expected a presentation command");
  return advanceRoundController(
    completeBattlePresentation(state, { commandId }),
  );
}

function reachSwapOffer(
  scenario: FixtureBattleScenario,
  playerKernelParty: FactoryKernelParty,
  opponentKernelParty: FactoryKernelParty,
): RoundControllerState {
  let state = acknowledgeAndAdvance(createRoundController(scenario));
  state = resolveRoundBattle(state, {
    outcome: "win",
    playerParty: state.rules.playerParty.map((mon) => ({
      ...mon,
      hp: Math.max(1, mon.hp - 10),
      status: "burn" as const,
    })) as unknown as BattleParty,
    opponentParty: state.rules.currentOpponent.party.map((mon) => ({
      ...mon,
      hp: 0,
    })) as unknown as BattleParty,
    playerKernelParty,
    opponentKernelParty,
    rngValue: 0x8765_4321,
  });
  state = acknowledgeAndAdvance(state);
  return completeBattlePresentation(state, {
    commandId: state.presentation!.command.commandId,
  });
}

function generatedScenario(): {
  scenario: FixtureBattleScenario;
  playerRecords: FactoryRentalParty;
  opponentRecords: FactoryRentalParty;
  opponentKernelParty: FactoryKernelParty;
} {
  const rentals = generateInitialFactoryRentals({
    rngValue: 0,
    factoryWinStreak: 0,
    rentsCount: 0,
    playerTrainerId: PLAYER_TRAINER_ID,
  });
  const playerRecords = rentals.rentals.slice(0, 3) as unknown as FactoryRentalParty;
  const generatedOpponent = generateFactoryOpponent({
    rngValue: rentals.rngValue,
    factoryWinStreak: 0,
    battleIndex: 0,
    storedTrainerIds: [],
    savedRentalSetIds: rentals.rentals.map((record) => record.setId),
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
  });
  const opponentRecords = generatedOpponent.opponents as FactoryRentalParty;
  const opponentParty = battleParty(opponentRecords, "foe");
  const opponentPool: BattleOpponent[] = Array.from({ length: 7 }, (_, index) => ({
    id: `trainer-${index}`,
    trainerName: `TRAINER ${index}`,
    party: opponentParty,
    rentalRecords: opponentRecords,
  }));
  return {
    scenario: {
      id: "full-rental-round",
      playerParty: battleParty(playerRecords, "player"),
      playerRentalRecords: playerRecords,
      opponentPool,
      opponentSelectionInputs: [0, 0, 0, 0, 0, 0, 0],
      initialRngValue: generatedOpponent.rngValue,
    },
    playerRecords,
    opponentRecords,
    opponentKernelParty: generatedOpponent.party,
  };
}

describe("RoundController full Factory rental persistence", () => {
  it("accepts one defeated record atomically and rebuilds that exact rung-5 member for battle 2", () => {
    const fixture = generatedScenario();
    const playerKernelParty = healFactoryKernelParty(fixture.playerRecords);
    const spentOpponentParty = fixture.opponentKernelParty.map((member, index) => ({
      ...member,
      hp: index === 2 ? 0 : member.hp,
      status1: index === 2 ? 1 << 4 : member.status1,
      item: index === 2 ? 0 : member.item,
      pp: index === 2 ? [0, 0, 0, 0] as const : member.pp,
    })) as unknown as FactoryKernelParty;
    let state = reachSwapOffer(
      fixture.scenario,
      playerKernelParty,
      spentOpponentParty,
    );

    state = chooseRoundSwap(state, {
      type: "accept",
      playerPartyIndex: 1,
      opponentPartyIndex: 2,
    });
    expect(state.rules.playerRentalRecords![1]).toEqual(fixture.opponentRecords[2]);
    expect(state.rules.playerKernelParty![1]).toMatchObject({
      item: 0,
      hp: 0,
      status1: 1 << 4,
      pp: [0, 0, 0, 0],
    });

    state = acknowledgeAndAdvance(state);
    expect(state.rules.battleIndex).toBe(1);
    expect(state.rules.playerRentalRecords![1]).toEqual(fixture.opponentRecords[2]);
    expect(state.rules.playerKernelParty![1]).toEqual(
      createFactoryCorpusPartyMember(fixture.opponentRecords[2]!),
    );
    expect(state.rules.playerParty[1]).toMatchObject({
      hp: state.rules.playerParty[1].maxHp,
      status: "none",
    });
  });

  it("declines without changing a record and restores the same full party build", () => {
    const fixture = generatedScenario();
    const originalKernelParty = healFactoryKernelParty(fixture.playerRecords);
    const spentPlayerParty = originalKernelParty.map((member) => ({
      ...member,
      hp: 1,
      status1: 1 << 3,
      item: 0,
      pp: [0, 0, 0, 0] as const,
    })) as unknown as FactoryKernelParty;
    let state = reachSwapOffer(
      fixture.scenario,
      spentPlayerParty,
      fixture.opponentKernelParty,
    );

    state = chooseRoundSwap(state, { type: "decline" });
    expect(state.rules.playerRentalRecords).toEqual(fixture.playerRecords);
    expect(state.rules.playerKernelParty).toEqual(spentPlayerParty);

    state = acknowledgeAndAdvance(state);
    expect(state.rules.playerRentalRecords).toEqual(fixture.playerRecords);
    expect(state.rules.playerKernelParty).toEqual(originalKernelParty);
    expect(state.rules.playerKernelParty!.every((member) => (
      member.hp === member.maxHP
      && member.status1 === 0
      && member.item !== 0
    ))).toBe(true);
  });

  it("restores PP with the source packed PP-Up arithmetic instead of current PP", () => {
    const fixture = generatedScenario();
    const canonical = healFactoryKernelParty(fixture.playerRecords);
    const staged = canonical.map((member, index) => ({
      ...member,
      ppBonuses: index === 0 ? 0b11_10_01_00 : member.ppBonuses,
      pp: [1, 1, 1, 1] as const,
    })) as unknown as FactoryKernelParty;
    const healed = healFactoryKernelParty(fixture.playerRecords, staged);

    expect(healed[0].ppUps).toEqual([0, 1, 2, 3]);
    expect(healed[0].pp).toEqual(canonical[0].pp.map(
      (basePp, index) => basePp + Math.floor(basePp * 20 * index / 100),
    ));
    expect(healed[0].ppBonuses).toBe(0b11_10_01_00);
  });
});
