import { describe, expect, it } from "vitest";
import type {
  FactoryRentalParty,
  FactoryRentalRecord,
} from "../src/engine/battleScenario.ts";
import { TICK0 as BATTLE_SCENE_TICK0 } from "../src/engine/battleScene.ts";
import {
  createInitialState,
  tick,
  type GeneratedBattleSessionFactory,
} from "../src/engine/core.ts";
import { selectedRentalParty } from "../src/engine/factoryDraftScreen.ts";
import {
  createFactoryRoundBattleOrchestrator,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";

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

function sessionFactory(
  calls: Array<{
    player: FactoryRentalParty;
    saved: readonly FactoryRentalRecord[];
  }>,
): GeneratedBattleSessionFactory {
  return (playerRentalRecords, savedRentalRecords) => {
    calls.push({ player: playerRentalRecords, saved: savedRentalRecords });
    return createFactoryRoundBattleOrchestrator({
      id: "interactive-routing-test",
      rngValue: 4,
      factoryWinStreak: 0,
      playerTrainerId: playerRentalRecords[0].otId ?? 0x89ab_cdef,
      battleTowerLevel50WinStreak: 0,
      facilityState: { rentsCount: 0 },
      rentals: {
        type: "currentRecords",
        playerRentalRecords,
        savedRentalRecords: savedRentalRecords as readonly [
          FactoryRentalRecord,
          FactoryRentalRecord,
          FactoryRentalRecord,
          FactoryRentalRecord,
          FactoryRentalRecord,
          FactoryRentalRecord,
        ],
      },
    });
  };
}

function atBattleHandoff(
  options: Parameters<typeof createInitialState>[0],
  selectedIds: number[],
) {
  const state = createInitialState(options);
  return {
    ...state,
    draftScreen: { ...state.draftScreen, selectedIds },
    battleRoom: {
      phase: "settled" as const,
      elapsed: HANDOFF_ELAPSED - 1,
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

  it("installs only the injected generated owner with HAUNTER first", () => {
    const calls: Array<{
      player: FactoryRentalParty;
      saved: readonly FactoryRentalRecord[];
    }> = [];
    const before = atBattleHandoff(
      {
        appRoute: "generated-orchestrator",
        generatedBattleSessionFactory: sessionFactory(calls),
      },
      selectedIdsForSlots(4, 0, 2),
    );
    const after = tick(before, new Set());
    expect(after.battleRoom).toBeNull();
    expect(after.battleScene).toBeNull();
    expect(after.battleSetup).toBeNull();
    expect(after.factoryRoundBattleOrchestrator).not.toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.player).toEqual([
      before.draftScreen.rentals[4]!.source,
      before.draftScreen.rentals[0]!.source,
      before.draftScreen.rentals[2]!.source,
    ]);
    expect(calls[0]!.saved).toEqual(
      before.draftScreen.rentals.map(({ source }) => source),
    );
    expect(
      (after.factoryRoundBattleOrchestrator as FactoryRoundBattleOrchestratorState)
        .round.rules.playerRentalRecords,
    ).toEqual(calls[0]!.player);
  });
});
