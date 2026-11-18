import { describe, expect, it } from "vitest";
import {
  advanceFactoryRoundPresentation, chooseFactoryRoundSwap, completeFactoryRoundPresentation, createFactoryRoundBattleOrchestrator,
  preGenerateFactoryRoundNextOpponent, submitFactoryRoundPlayerDecision, type FactoryRoundBattleOrchestratorState,
} from "../src/engine/factoryRoundBattleOrchestrator.ts";
import { generateFactoryBrainOpponent } from "../src/engine/factoryBrainOpponentGeneration.ts";
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { advanceRngValue } from "../src/engine/rng.ts";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };

// Fix 45 (docs/parity-mac/brain-party-after-swap.md). The Factory Head has no GO ON roll: AskReadyForHead -> AskSwapBeforeHead runs no
// factory_generateopponentmons (BattleFactoryPreBattleRoom scripts.inc:349-376); FillFactoryBrainParty rolls his party at the battle's start
// (battle_tower.c:1857), after the swap, excluding the rentalMons set ids of that moment (battle_factory.c:786-792): the player's three as swapped and
// the beaten trainer's three. So the set the player just swapped away may be his. ROM (round replay, seed 202, challenge 2, ai-v1, swap after every win,
// 128 frames at the last swap prompt): the player swaps set 361 away for set 318; Noland's party is sets 348, 320 and 361.

const PLAYER_TRAINER_ID = 416049562;
const natureByName = new Map(naturesData.natures.map((r) => [r.name, r.index]));
function record(setId: number) {
  const set = (frontierMonsData as any).entries[setId];
  const personality = natureByName.get(set.nature)!;
  const input = { setId, personality, fixedIv: 15, abilitySlot: (personality & 1) as 0 | 1, otId: PLAYER_TRAINER_ID };
  return Object.freeze({ ...input, abilitySlot: createFactoryCorpusPartyMember(input).abilitySlot });
}
const ack = (state: FactoryRoundBattleOrchestratorState) => {
  const commandId = state.round.presentation?.command.commandId;
  if (commandId === undefined) throw new Error("expected a presentation command");
  return advanceFactoryRoundPresentation(completeFactoryRoundPresentation(state, { commandId }));
};

// Streak 19 + battle 1 = 20: the silver Head is battle 2 of this round. Seed 2 wins battle 1 with the first legal move.
function wonFirstBattle(): FactoryRoundBattleOrchestratorState {
  const player = [record(300), record(320), record(340)];
  let state = createFactoryRoundBattleOrchestrator({
    id: "brain-party-after-swap", rngValue: 2, factoryWinStreak: 19, playerTrainerId: PLAYER_TRAINER_ID, battleTowerLevel50WinStreak: 14,
    facilityState: { rentsCount: 0 }, factorySymbolsCount: 0,
    rentals: { type: "currentRecords", playerRentalRecords: player as any, savedRentalRecords: [...player, record(1), record(2), record(3)] as any },
  });
  state = ack(state);
  for (let budget = 0; budget < 200 && state.battle !== null; budget += 1) {
    const request: any = state.battle.boundary.kind === "decision-required" ? state.battle.boundary.request : null;
    state = submitFactoryRoundPlayerDecision(state, request.kind === "forced-switch"
      ? { kind: "switch", partyIndex: request.legalPartyIndexes[0] } : request.legalDecisions.find((d: any) => d.kind === "use-move"));
  }
  expect(state.round.rules.phase).toBe("presentingBattleWin");
  return state;
}

describe("fix 45: the Factory Head's party is rolled after the swap", () => {
  it("GO ON rolls nothing for the Head; the swap's resolution rolls him from the rentals after the swap, where the swapped-away set is allowed", () => {
    let state = wonFirstBattle();
    const beaten = state.round.rules.currentOpponent.rentalRecords!.map((r) => r.setId);
    expect(beaten).toEqual([272, 308, 319]);
    // GO ON (the app's pre-generation seam): no roll.
    state = preGenerateFactoryRoundNextOpponent(state);
    expect(state.pendingNextOpponent).toBeNull();
    state = ack(state);
    // Swap set 300 away for the beaten trainer's 272.
    state = chooseFactoryRoundSwap(completeFactoryRoundPresentation(state, { commandId: state.round.presentation!.command.commandId }),
      { type: "accept", playerPartyIndex: 0, opponentPartyIndex: 0 });
    const afterSwap = [272, 320, 340, ...beaten]; const beforeSwap = [300, 320, 340, ...beaten];
    // A cursor whose roll takes the swapped-away set 300 when only the rentals after the swap are excluded (the source's list); the pre-swap
    // list could never give it.
    let cursor = state.round.rules.rngValue;
    for (let i = 0; i < 20_000; i += 1, cursor = advanceRngValue(cursor)) {
      const roll = generateFactoryBrainOpponent({ rngValue: cursor, factoryWinStreak: 20, playerRentalSetIds: afterSwap, playerTrainerId: PLAYER_TRAINER_ID });
      if (roll.opponents.some((o) => o.setId === 300)) break;
    }
    const expected = generateFactoryBrainOpponent({ rngValue: cursor, factoryWinStreak: 20, playerRentalSetIds: afterSwap, playerTrainerId: PLAYER_TRAINER_ID });
    const preSwapRoll = generateFactoryBrainOpponent({ rngValue: cursor, factoryWinStreak: 20, playerRentalSetIds: beforeSwap, playerTrainerId: PLAYER_TRAINER_ID });
    expect(expected.opponents.map((o) => o.setId)).toContain(300);
    expect(preSwapRoll.opponents.map((o) => o.setId)).not.toContain(300);
    // The round's post-battle cursor is incidental to the rule under test: put the found cursor in its place (the replay tool's seam does the same).
    state = Object.freeze({ ...state, round: Object.freeze({ ...state.round, rules: Object.freeze({ ...state.round.rules, rngValue: cursor }) }) });
    state = ack(state);
    const head = state.opponentGenerations.at(-1)!;
    expect(head.kind).toBe("frontier-brain");
    expect(head.generation.opponents.map((o) => o.setId)).toEqual(expected.opponents.map((o) => o.setId));
    expect(head.generation.opponents.map((o) => o.personality)).toEqual(expected.opponents.map((o) => o.personality));
    expect(state.round.rules.battleIndex).toBe(1);
    expect(state.round.rules.currentOpponent.frontierBrain).toMatchObject({ status: "silver" });
  });
});
