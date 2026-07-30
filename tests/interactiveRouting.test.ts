import { describe, expect, it } from "vitest";
import { TICK0 as BATTLE_SCENE_TICK0 } from "../src/engine/battleScene.ts";
import {
  createInitialState,
  tick,
  type EngineState,
} from "../src/engine/core.ts";
import {
  ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES,
  ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE,
  ANCHOR_BATTLE_1_PERSONALITIES,
  ANCHOR_BATTLE_1_SELECTION_RNG_VALUE,
  createFactoryAnchorSession,
} from "../src/engine/factoryAnchorSession.ts";
import { generateFactoryOpponent } from "../src/engine/factoryOpponentGeneration.ts";
import { selectedRentalParty } from "../src/engine/factoryDraftScreen.ts";
import {
  factoryBattleStartIntroPhase,
} from "../src/engine/factoryBattleStartIntro.ts";
import { factoryBattleStartField } from "../src/engine/factoryBattleStartPresentation.ts";
import {
  factoryBattleStartPresentationForState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { advanceRngValue } from "../src/engine/rng.ts";
import {
  CANONICAL_DESTIN_PRESENTATION,
  CANONICAL_JENSON_PRESENTATION,
} from "../src/engine/factoryTrainerPresentation.ts";

const HANDOFF_ELAPSED = BATTLE_SCENE_TICK0 - 843;

function selectedIdsForSlots(
  first: number,
  second: number,
  third: number,
): number[] {
  const selectedIds = [0, 0, 0, 0, 0, 0];
  selectedIds[first] = 1;
  selectedIds[second] = 2;
  selectedIds[third] = 3;
  return selectedIds;
}

function atBattleHandoff(
  options: Parameters<typeof createInitialState>[0],
  selectedIds: number[],
) {
  const state = createInitialState(options);
  return {
    ...state,
    draftScreen: { ...state.draftScreen, selectedIds },
    rngValue: 2_100_355_878,
    battle1OpponentConstructionRngValues:
      ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES,
    battleRoom: {
      phase: "settled" as const,
      elapsed: HANDOFF_ELAPSED - 1,
      trainerPresentation: CANONICAL_DESTIN_PRESENTATION,
    },
  };
}

describe("interactive battle routing", () => {
  it("adapts exact compact rental sources in pick-rank order", () => {
    const anchor = createInitialState();
    const haunterFirst = {
      ...anchor.draftScreen,
      selectedIds: selectedIdsForSlots(4, 0, 2),
    };
    expect(selectedRentalParty(haunterFirst)).toEqual([
      anchor.draftScreen.rentals[4]!.source,
      anchor.draftScreen.rentals[0]!.source,
      anchor.draftScreen.rentals[2]!.source,
    ]);
    expect(haunterFirst.rentals[4]!.name).toBe("HAUNTER");

    const differentOrder = {
      ...anchor.draftScreen,
      selectedIds: selectedIdsForSlots(5, 3, 1),
    };
    expect(selectedRentalParty(differentOrder)).toEqual([
      anchor.draftScreen.rentals[5]!.source,
      anchor.draftScreen.rentals[3]!.source,
      anchor.draftScreen.rentals[1]!.source,
    ]);
  });

  it("keeps canonical as the default owner and installs its battle scene", () => {
    const before = atBattleHandoff(
      {},
      selectedIdsForSlots(4, 0, 2),
    );
    expect(before.appRoute).toBe("canonical-recorded");
    const after = tick(before, new Set());
    expect(after.battleRoom).toBeNull();
    expect(after.battleScene).not.toBeNull();
    expect(after.factoryRoundBattleOrchestrator).toBeNull();
  });

  it("installs only the source-pinned generated owner with HAUNTER first", () => {
    const before = atBattleHandoff(
      { appRoute: "generated-orchestrator" },
      selectedIdsForSlots(4, 0, 2),
    );
    const after = tick(before, new Set());
    expect(after.battleRoom).toBeNull();
    expect(after.battleScene).toBeNull();
    expect(after.battleSetup).toBeNull();
    expect(after.factoryRoundBattleOrchestrator).not.toBeNull();
    const orchestrator = after.factoryRoundBattleOrchestrator!;
    expect(factoryBattleStartIntroPhase(orchestrator.battleStartIntro!))
      .toBe("handoff");
    expect(orchestrator.round.presentation?.command.type).toBe("battleStart");
    expect(orchestrator.battle).toBeNull();
    expect(orchestrator.battleCommandPresentation).toBeNull();
    expect(orchestrator.round.rules.playerRentalRecords).toEqual([
      before.draftScreen.rentals[4]!.source,
      before.draftScreen.rentals[0]!.source,
      before.draftScreen.rentals[2]!.source,
    ]);
    expect(orchestrator.opponentGenerations[0]!.trainerId).toBe(50);
    expect(orchestrator.opponentGenerations[0]!.opponents.map(({ setId }) => setId))
      .toEqual([188, 184, 135]);
    expect(orchestrator.opponentGenerations[0]!.opponents.map(({ personality }) => personality))
      .toEqual(ANCHOR_BATTLE_1_PERSONALITIES);
    expect(orchestrator.opponentGenerations[0]!.opponents.map((opponent) => ({
      setId: opponent.setId,
      personality: opponent.personality,
      fixedIv: opponent.fixedIv,
      abilitySlot: opponent.abilitySlot,
      otId: opponent.otId,
      speciesName: opponent.speciesName,
      itemId: opponent.itemId,
      nature: opponent.nature,
      member: {
        species: opponent.member.species,
        moves: opponent.member.moves,
        pp: opponent.member.pp,
        hp: opponent.member.hp,
        stats: [
          opponent.member.attack, opponent.member.defense, opponent.member.speed,
          opponent.member.spAttack, opponent.member.spDefense,
        ],
        ability: opponent.member.ability,
      },
    }))).toEqual([
      {
        setId: 188, personality: 1_094_072_807, fixedIv: 3, abilitySlot: 0,
        otId: 416_049_562, speciesName: "SPECIES_GROVYLE", itemId: 179, nature: 7,
        member: {
          species: 278, moves: [210, 283, 280, 104], pp: [20, 5, 15, 15],
          hp: 143, stats: [103, 56, 90, 91, 71], ability: 65,
        },
      },
      {
        setId: 184, personality: 3_475_344_024, fixedIv: 3, abilitySlot: 0,
        otId: 416_049_562, speciesName: "SPECIES_MURKROW", itemId: 221, nature: 24,
        member: {
          species: 198, moves: [185, 19, 259, 269], pp: [20, 15, 15, 20],
          hp: 142, stats: [91, 69, 97, 91, 69], ability: 15,
        },
      },
      {
        setId: 135, personality: 3_971_699_699, fixedIv: 3, abilitySlot: 0,
        otId: 416_049_562, speciesName: "SPECIES_PIDGEOTTO", itemId: 180, nature: 24,
        member: {
          species: 17, moves: [332, 98, 297, 28], pp: [20, 30, 15, 15],
          hp: 156, stats: [98, 61, 77, 56, 56], ability: 51,
        },
      },
    ]);
    expect(factoryBattleStartPresentationForState(orchestrator)?.opponentTrainer)
      .toEqual(before.battleRoom!.trainerPresentation);
    expect(orchestrator.round.rules.currentOpponent).toMatchObject({
      id: "factory-trainer-50",
      trainerName: "DESTIN",
    });
    expect(orchestrator.round.rules.currentOpponent.rentalRecords)
      .toEqual(orchestrator.opponentGenerations[0]!.opponents);
    expect(orchestrator.round.rules.rngValue).toBe(
      ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE,
    );
    expect(orchestrator.rngSegments.map(
      ({ kind, rngBefore, rngAfter, callEnd, callStart }) =>
        [kind, rngBefore, rngAfter, callEnd - callStart],
    )).toEqual([
      ["opponent-selection", 1_172_530_733, 3_145_421_632, 5],
      ["opponent-construction", 2_074_070_560, 1_094_078_808, 56],
      ["opponent-construction", 3_372_555_893, 3_475_319_573, 32],
      ["opponent-construction", 1_792_028_978, 3_971_701_576, 190],
    ]);
  });

  it("keeps battleStart pending until intro readiness, then settles the same field", () => {
    let state = tick(
      atBattleHandoff(
        { appRoute: "generated-orchestrator" },
        selectedIdsForSlots(4, 0, 2),
      ),
      new Set(),
    );
    const frozen = state.factoryRoundBattleOrchestrator!.battleStartIntro!.command;
    while (
      factoryBattleStartIntroPhase(
        state.factoryRoundBattleOrchestrator!.battleStartIntro!,
      ) !== "awaiting-acknowledgement"
    ) {
      state = tick(state, new Set());
    }
    expect(state.factoryRoundBattleOrchestrator!.round.presentation?.command.type)
      .toBe("battleStart");
    expect(state.factoryRoundBattleOrchestrator!.battle).toBeNull();

    state = tick(state, new Set(["A"]));
    expect(state.factoryRoundBattleOrchestrator!.round.presentation?.command.type)
      .toBe("battleStart");
    while (state.factoryRoundBattleOrchestrator!.battleStartIntro !== null) {
      state = tick(state, new Set());
    }

    const orchestrator = state.factoryRoundBattleOrchestrator!;
    expect(orchestrator.round.presentation).toBeNull();
    expect(orchestrator.battle).not.toBeNull();
    expect(orchestrator.battleCommandPresentation!.lifecycle).toEqual({
      phase: "action-menu",
      phaseElapsed: 2,
    });
    expect(orchestrator.battleCommandPresentation!.field).toEqual(
      factoryBattleStartField(frozen),
    );
  });

  it("captures the three live construction epochs before spending their draws", () => {
    let state: EngineState = {
      ...createInitialState({ appRoute: "generated-orchestrator" }),
      rngValue: 932_779_073,
      battleRoom: {
        phase: "msgboxClosing" as const,
        elapsed: 3,
        trainerPresentation: CANONICAL_DESTIN_PRESENTATION,
      },
    };
    state = tick(state, new Set());
    expect(state.battle1OpponentConstructionRngValues).toEqual([
      ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES[0],
    ]);
    for (let i = 0; i < 11; i += 1) state = tick(state, new Set());
    expect(state.battle1OpponentConstructionRngValues).toEqual(
      ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES.slice(0, 2),
    );
    for (let i = 0; i < 7; i += 1) state = tick(state, new Set());
    expect(state.battle1OpponentConstructionRngValues)
      .toEqual(ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES);
  });

  it("is draw-sensitive at construction and rejects a room/opponent mismatch", () => {
    const anchor = createInitialState();
    const playerRentalRecords = selectedRentalParty({
      ...anchor.draftScreen,
      selectedIds: selectedIdsForSlots(4, 0, 2),
    });
    const savedRentalRecords = anchor.draftScreen.rentals.map(({ source }) => source);
    const shifted = createFactoryAnchorSession({
      playerRentalRecords,
      savedRentalRecords,
      roomTrainer: CANONICAL_DESTIN_PRESENTATION,
      constructionRngValues: [
        advanceRngValue(ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES[0]),
        ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES[1],
        ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES[2],
      ],
      freshBattleRngValue: ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE,
    });
    expect(shifted.opponentGenerations[0]!.opponents.map(({ personality }) => personality))
      .not.toEqual(ANCHOR_BATTLE_1_PERSONALITIES);
    expect(() => createFactoryAnchorSession({
      playerRentalRecords,
      savedRentalRecords,
      roomTrainer: CANONICAL_JENSON_PRESENTATION,
      constructionRngValues: ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES,
      freshBattleRngValue: ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE,
    })).toThrow(/room trainer 58 does not match generated opponent 50/);
  });

  it("cannot substitute the post-transition cursor for pre-anchor selection", () => {
    const input = {
      factoryWinStreak: 0,
      battleIndex: 0,
      storedTrainerIds: [],
      savedRentalSetIds: [156, 149, 180, 153, 179, 181],
      playerTrainerId: 416_049_562,
      battleTowerLevel50WinStreak: 0,
      constructionRngValue: ANCHOR_BATTLE_1_CONSTRUCTION_RNG_VALUES[0],
    };
    const selectedBeforeAnchor = generateFactoryOpponent({
      ...input,
      rngValue: ANCHOR_BATTLE_1_SELECTION_RNG_VALUE,
    });
    const wronglyReselectedAtHandoff = generateFactoryOpponent({
      ...input,
      rngValue: ANCHOR_BATTLE_1_HANDOFF_RNG_VALUE,
    });
    expect([
      selectedBeforeAnchor.trainerId,
      ...selectedBeforeAnchor.opponents.map(({ setId }) => setId),
    ]).toEqual([50, 188, 184, 135]);
    expect([
      wronglyReselectedAtHandoff.trainerId,
      ...wronglyReselectedAtHandoff.opponents.map(({ setId }) => setId),
    ]).not.toEqual([50, 188, 184, 135]);
  });
});
