/**
 * ISSUES #91 pin: a Frontier Brain win at a battleIndex before the round's
 * natural 7th (staged via an elevated starting `factoryWinStreak`, the same
 * shape the soak driver's own repro used) must not leave the following
 * ordinary generation's `storedTrainerIds` one entry short of what
 * `selectFactoryTrainer`'s one-entry-per-prior-battle guard demands. The
 * fix folds the brain's own `trainerId` into the *next* generation's history
 * input only (`storedTrainerIdsForNextGeneration`,
 * `factoryRoundBattleOrchestrator.ts`) -- never into the brain's own
 * scheduled `storedTrainerIds`, which the natural battleIndex-6 shape
 * (`factoryBrainRoundShape.test.ts`, unmodified by this fix) keeps
 * byte-identical to the ROM, which never writes anything for the brain.
 */
import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../src/engine/battleScenario.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { TRAINER_FRONTIER_BRAIN } from "../src/engine/factoryAiMaskSelection.ts";
import { getFactoryFrontierBrainStatus } from "../src/engine/frontierBrainStatus.ts";
import {
  advanceFactoryRoundPresentation,
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  preGenerateFactoryRoundNextOpponent,
  type FactoryRoundBattleOrchestratorConfig,
  type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  advanceRoundController,
  completeBattlePresentation,
  resolveRoundBattle,
} from "../src/engine/roundController.ts";

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const natureByName = new Map(naturesData.natures.map((row) => [row.name, row.index]));

function record(setId: number, fixedIv = 31): FactoryRentalRecord {
  const set = frontierMonsData.entries[setId]!;
  const personality = natureByName.get(set.nature)!;
  const input = {
    setId,
    personality,
    fixedIv,
    abilitySlot: (personality & 1) as 0 | 1,
    otId: PLAYER_TRAINER_ID,
  };
  return Object.freeze({
    ...input,
    abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot,
  });
}

function roundConfig(factoryWinStreak: number): FactoryRoundBattleOrchestratorConfig {
  const playerRecords = [record(664), record(678), record(527)] as const;
  const savedRentalRecords = [...playerRecords, record(1), record(2), record(3)] as const;
  return {
    id: "issue-91-brain-win-lower-index",
    rngValue: 4,
    factoryWinStreak,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 0,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords: playerRecords,
      savedRentalRecords,
    },
    factorySymbolsCount: 0,
  };
}

function acknowledgeAndAdvance(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  const commandId = state.round.presentation?.command.commandId;
  if (commandId === undefined) throw new Error("expected a presentation command");
  return advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(state, { commandId }),
  );
}

/**
 * Bypasses kernel play and resolves the pending `battleStart` command
 * straight to a win, mirroring `factoryBrainRoundShape.test.ts`'s own
 * outcome-shortcut helper (`assertBrainRoundOutcome`) -- scripting a real
 * kernel win against a generated Brain party is out of scope for this pin.
 */
function winCurrentBattle(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  const start = state.round.presentation?.command;
  if (start?.type !== "battleStart") throw new Error("expected a pending battle-start command");
  let round = advanceRoundController(
    completeBattlePresentation(state.round, { commandId: start.commandId }),
  );
  round = resolveRoundBattle(round, {
    outcome: "win",
    playerParty: round.rules.playerParty,
    opponentParty: round.rules.currentOpponent.party,
    rngValue: round.rules.rngValue,
  });
  return { ...state, round };
}

describe("ISSUES #91: Frontier Brain win below the round's natural 7th battleIndex", () => {
  it("battleIndex 0 brain win: GO ON pre-generation succeeds, and the following ordinary generation folds the brain's id into storedTrainerIds", () => {
    // battleIndex 0's effective streak (20 + 1 modifier = 21) is exactly the
    // silver threshold -- the same staged repro shape ISSUES #91 used.
    const config = roundConfig(20);
    expect(getFactoryFrontierBrainStatus({
      battleMode: "singles",
      winStreak: 20,
      symbolsCount: 0,
    })).toBe("silver");

    let state = createFactoryRoundBattleOrchestrator(config);
    expect(state.opponentGenerations[0]!.kind).toBe("frontier-brain");
    expect(state.opponentGenerations[0]!.storedTrainerIds).toEqual([]);

    state = winCurrentBattle(state);
    expect(state.round.rules.phase).toBe("presentingBattleWin");

    // The #91 repro: pre-fix, this threw "storedTrainerIds must contain the
    // 1 prior battle selections" (factoryTrainerSchedule.ts:145) the instant
    // GO ON's pre-generation seam ran.
    state = preGenerateFactoryRoundNextOpponent(state);
    const pending = state.pendingNextOpponent;
    expect(pending).not.toBeNull();
    expect(pending!.kind).toBe("ordinary");
    if (pending!.kind !== "ordinary") throw new Error("unreachable: asserted above");

    // Chosen shape: the brain's own trainerId folds into the *next*
    // generation's history only, so `selectFactoryTrainer`'s
    // one-entry-per-prior-battle guard is satisfied; it can never collide
    // with an ordinary trainerId (TRAINER_FRONTIER_BRAIN is 1022, ordinary
    // ids never exceed 299).
    expect(pending!.generation.storedTrainerIds[0]).toBe(TRAINER_FRONTIER_BRAIN);
    expect(pending!.generation.storedTrainerIds).toHaveLength(2);

    // Publish it and confirm the round genuinely continues past the brain.
    state = acknowledgeAndAdvance(state);
    expect(state.round.rules.phase).toBe("awaitingSwapDecision");
    const offerId = state.round.presentation?.command.commandId;
    if (offerId === undefined) throw new Error("expected swap offer");
    state = completeFactoryRoundPresentation(state, { commandId: offerId });
    state = chooseFactoryRoundSwap(state, { type: "decline" });
    expect(state.round.rules.phase).toBe("presentingSwapResult");
    state = acknowledgeAndAdvance(state);

    expect(state.round.rules.battleIndex).toBe(1);
    expect(state.round.rules.currentOpponent.frontierBrain).toBeUndefined();
    expect(state.opponentGenerations[1]!.storedTrainerIds[0]).toBe(TRAINER_FRONTIER_BRAIN);
  });
});
