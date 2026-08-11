import frontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };
import type { FactoryRentalRecord } from "../../src/engine/battleScenario.ts";
import { createFactoryCorpusPartyMember } from "../../src/engine/factoryCorpusParty.ts";
import { getLevel50InitialRentalFixedIv } from "../../src/engine/factoryRentalGeneration.ts";
import type { EngineState } from "../../src/engine/core.ts";
import {
  advanceFactoryRoundPresentation,
  beginFactoryRoundBattleStartIntro,
  chooseFactoryRoundSwap,
  completeFactoryRoundPresentation,
  createFactoryRoundBattleOrchestrator,
  preGenerateFactoryRoundNextOpponent,
  type FactoryRoundBattleOrchestratorState,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  advanceRoundController,
  completeBattlePresentation,
  resolveRoundBattle,
} from "../../src/engine/roundController.ts";
import {
  battleIntroSceneAssemblyDisplayLag,
  selectFrontierTransition,
} from "../../src/engine/battleTransition.ts";

const PLAYER_TRAINER_ID = 0x89ab_cdef;
const CHALLENGE2_FIXED_IV = getLevel50InitialRentalFixedIv(2, false);
const natureByName = new Map(
  naturesData.natures.map((row) => [row.name, row.index]),
);

function record(setId: number, fixedIv = CHALLENGE2_FIXED_IV): FactoryRentalRecord {
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

/**
 * Dev-time acceleration through one generated win. Rules, pre-generation,
 * swap decline, and next-battle publication all use the public controller
 * interfaces; only the battle outcome itself is supplied by the proof stage.
 */
function advanceProofWin(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  const start = state.round.presentation?.command;
  if (start?.type !== "battleStart") {
    throw new Error("round proof requires a pending battle-start command");
  }
  let round = advanceRoundController(
    completeBattlePresentation(state.round, { commandId: start.commandId }),
  );
  round = resolveRoundBattle(round, {
    outcome: "win",
    playerParty: round.rules.playerParty,
    opponentParty: round.rules.currentOpponent.party,
    rngValue: round.rules.rngValue,
  });
  let next: FactoryRoundBattleOrchestratorState = {
    ...state,
    round,
    battle: null,
    battleCommandPresentation: null,
    battleResolutionPresentation: null,
    activeBattleCallStart: null,
  };
  next = preGenerateFactoryRoundNextOpponent(next);
  const won = next.round.presentation?.command;
  if (won?.type !== "battleWon") throw new Error("round proof requires battleWon");
  next = advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(next, { commandId: won.commandId }),
  );
  const offer = next.round.presentation?.command;
  if (offer?.type !== "swapOffer") throw new Error("round proof requires swapOffer");
  next = chooseFactoryRoundSwap(
    completeFactoryRoundPresentation(next, { commandId: offer.commandId }),
    { type: "decline" },
  );
  const resolved = next.round.presentation?.command;
  if (resolved?.type !== "swapResolved") {
    throw new Error("round proof requires swapResolved");
  }
  return advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(next, { commandId: resolved.commandId }),
  );
}

/** Stages seed 70's challenge-2 intro at any generated battle index 0..5. */
export function generatedRoundRevealProofStage(
  state: EngineState,
  targetBattleIndex: 0 | 1 | 2 | 3 | 4 | 5,
): EngineState {
  const playerRentalRecords = [record(267), record(268), record(269)] as const;
  let orchestrator = createFactoryRoundBattleOrchestrator({
    id: `factory-round-battle${targetBattleIndex + 1}-reveal-off`,
    rngValue: 70,
    factoryWinStreak: 14,
    playerTrainerId: PLAYER_TRAINER_ID,
    battleTowerLevel50WinStreak: 14,
    facilityState: { rentsCount: 0 },
    rentals: {
      type: "currentRecords",
      playerRentalRecords,
      savedRentalRecords: [
        ...playerRentalRecords,
        record(270),
        record(271),
        record(272),
      ],
    },
  });
  for (let battleIndex = 0; battleIndex < targetBattleIndex; battleIndex += 1) {
    orchestrator = advanceProofWin(orchestrator);
  }
  const transition = selectFrontierTransition(orchestrator.round.rules.rngValue);
  orchestrator = beginFactoryRoundBattleStartIntro(
    orchestrator,
    battleIntroSceneAssemblyDisplayLag(transition.presentation),
  );
  return {
    ...state,
    factoryRoundBattleOrchestrator: orchestrator,
    rngMode: "frontierBattle",
    rngValue: transition.rngValue,
  };
}

// Challenge 2, battle index 5 (Battle 6): LUKAS with set ids 270/341/284.
// Its next transition draw is table index 3, distinct from LILIANA's index 1.
export function generatedRoundBattle6LukasRevealStage(state: EngineState): EngineState {
  return generatedRoundRevealProofStage(state, 5);
}
