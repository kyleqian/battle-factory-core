import { describe, expect, it } from "vitest";
import type {
  BattleMon,
  BattleOpponent,
  BattleParty,
  BattleScenario,
} from "../src/engine/battleScenario.ts";
import {
  advanceRoundController,
  chooseRoundSwap,
  completeBattlePresentation,
  createRoundController,
  resolveRoundBattle,
  RoundTransitionError,
  type RoundControllerState,
} from "../src/engine/roundController.ts";

function mon(id: string, hp = 100, status: BattleMon["status"] = "none"): BattleMon {
  return { id, species: id.toUpperCase(), maxHp: 100, hp, status };
}

function party(prefix: string): BattleParty {
  return [mon(`${prefix}-0`), mon(`${prefix}-1`), mon(`${prefix}-2`)];
}

function scenario(selectionInputs = [0, 0, 0, 0, 0, 0, 0]): BattleScenario {
  const opponentPool: BattleOpponent[] = Array.from({ length: 9 }, (_, index) => ({
    id: `trainer-${index}`,
    trainerName: `TRAINER ${index}`,
    party: party(`foe-${index}`),
  }));
  return {
    id: "seven-battle-fixture",
    playerParty: party("player"),
    opponentPool,
    opponentSelectionInputs: selectionInputs,
    initialRngValue: 0x12345678,
  };
}

function acknowledgeAndAdvance(state: RoundControllerState): RoundControllerState {
  const command = state.presentation?.command;
  if (command === undefined) throw new Error("expected a presentation command");
  return advanceRoundController(
    completeBattlePresentation(state, { commandId: command.commandId }),
  );
}

function winCurrentBattle(state: RoundControllerState, rngValue: number): RoundControllerState {
  return resolveRoundBattle(state, {
    outcome: "win",
    playerParty: state.rules.playerParty.map((member, index) => ({
      ...member,
      hp: 12 + index,
      status: index === 0 ? "burn" as const : member.status,
    })) as unknown as BattleParty,
    opponentParty: state.rules.currentOpponent.party.map((member) => ({
      ...member,
      hp: 0,
    })) as unknown as BattleParty,
    rngValue,
  });
}

function declineAndStartNextBattle(state: RoundControllerState): RoundControllerState {
  state = acknowledgeAndAdvance(state);
  expect(state.rules.phase).toBe("awaitingSwapDecision");
  state = completeBattlePresentation(state, {
    commandId: state.presentation!.command.commandId,
  });
  state = chooseRoundSwap(state, { type: "decline" });
  state = acknowledgeAndAdvance(state);
  return acknowledgeAndAdvance(state);
}

describe("BattleScenario opponent selection", () => {
  it("turns deterministic inputs into a seven-opponent schedule without repeats", () => {
    const first = createRoundController(scenario([8, 8, 8, 8, 8, 8, 8]));
    const second = createRoundController(scenario([8, 8, 8, 8, 8, 8, 8]));
    const ids = first.opponentSchedule.map((opponent) => opponent.id);
    expect(ids).toEqual(second.opponentSchedule.map((opponent) => opponent.id));
    expect(new Set(ids).size).toBe(7);
    expect(ids).toEqual([
      "trainer-8",
      "trainer-0",
      "trainer-2",
      "trainer-4",
      "trainer-6",
      "trainer-1",
      "trainer-7",
    ]);
  });

  it("rejects pools and inputs that cannot define a valid seven-battle round", () => {
    const tooShort = scenario();
    expect(() => createRoundController({
      ...tooShort,
      opponentPool: tooShort.opponentPool.slice(0, 6),
    })).toThrow(/at least 7/);
    expect(() => createRoundController({
      ...tooShort,
      opponentSelectionInputs: [0, 1],
    })).toThrow(/exactly 7/);
    expect(() => createRoundController({
      ...tooShort,
      opponentPool: [
        ...tooShort.opponentPool.slice(0, 8),
        { ...tooShort.opponentPool[8]!, id: tooShort.opponentPool[0]!.id },
      ],
    })).toThrow(/duplicate opponent/);
  });
});

describe("generic seven-battle RoundController", () => {
  it("advances all seven sequential wins and completes the round", () => {
    let state = acknowledgeAndAdvance(createRoundController(scenario()));
    for (let battleIndex = 0; battleIndex < 7; battleIndex += 1) {
      expect(state.rules.phase).toBe("battleActive");
      expect(state.rules.battleIndex).toBe(battleIndex);
      state = winCurrentBattle(state, 0x90000000 + battleIndex);
      if (battleIndex < 6) {
        state = declineAndStartNextBattle(state);
        expect(state.rules.playerParty.every(
          (member) => member.hp === member.maxHp && member.status === "none",
        )).toBe(true);
      }
    }

    expect(state.rules.phase).toBe("roundComplete");
    expect(state.rules.battleIndex).toBe(6);
    expect(state.rules.opponentHistory).toHaveLength(7);
    expect(new Set(state.rules.opponentHistory).size).toBe(7);
    expect(state.presentation?.command.type).toBe("roundCompleted");
    expect(state.rules.rngValue).toBe(0x90000006);
  });

  it("applies an accepted swap and preserves a declined party", () => {
    let state = acknowledgeAndAdvance(createRoundController(scenario()));
    state = winCurrentBattle(state, 111);
    state = acknowledgeAndAdvance(state);
    state = completeBattlePresentation(state, {
      commandId: state.presentation!.command.commandId,
    });
    const offeredId = state.rules.lastBattle!.opponentParty[2].id;
    const retainedIds = state.rules.playerParty.map((member) => member.id);
    state = chooseRoundSwap(state, {
      type: "accept",
      playerPartyIndex: 1,
      opponentPartyIndex: 2,
    });
    expect(state.rules.playerParty.map((member) => member.id)).toEqual([
      retainedIds[0],
      offeredId,
      retainedIds[2],
    ]);
    state = acknowledgeAndAdvance(state);
    state = acknowledgeAndAdvance(state);
    expect(state.rules.playerParty[1]).toMatchObject({
      id: offeredId,
      hp: 100,
      status: "none",
    });

    state = winCurrentBattle(state, 222);
    const beforeDecline = state.rules.playerParty.map((member) => member.id);
    state = declineAndStartNextBattle(state);
    expect(state.rules.playerParty.map((member) => member.id)).toEqual(beforeDecline);
  });

  it("heals HP and status only when advancing to the next battle", () => {
    let state = acknowledgeAndAdvance(createRoundController(scenario()));
    state = winCurrentBattle(state, 333);
    expect(state.rules.playerParty[0]).toMatchObject({ hp: 12, status: "burn" });
    state = acknowledgeAndAdvance(state);
    state = completeBattlePresentation(state, {
      commandId: state.presentation!.command.commandId,
    });
    state = chooseRoundSwap(state, { type: "decline" });
    expect(state.rules.playerParty[0]).toMatchObject({ hp: 12, status: "burn" });
    state = acknowledgeAndAdvance(state);
    state = acknowledgeAndAdvance(state);
    expect(state.rules.playerParty[0]).toMatchObject({ hp: 100, status: "none" });
  });

  it.each([0, 1, 2, 3, 4, 5, 6])(
    "ends the round on a loss from battle index %i",
    (lossIndex) => {
      let state = acknowledgeAndAdvance(createRoundController(scenario()));
      for (let index = 0; index < lossIndex; index += 1) {
        state = declineAndStartNextBattle(winCurrentBattle(state, index + 1));
      }
      state = resolveRoundBattle(state, {
        outcome: "loss",
        playerParty: state.rules.playerParty,
        opponentParty: state.rules.currentOpponent.party,
        rngValue: 0xdead0000 + lossIndex,
      });
      expect(state.rules.phase).toBe("roundLost");
      expect(state.rules.battleIndex).toBe(lossIndex);
      expect(state.presentation?.command.type).toBe("roundLost");
    },
  );
});

describe("BattlePresentation command/completion seam", () => {
  it("acknowledges idempotently without mutating rules or RNG", () => {
    const initial = createRoundController(scenario());
    const rules = initial.rules;
    const completion = { commandId: initial.presentation!.command.commandId };
    const completed = completeBattlePresentation(initial, completion);
    expect(completed.rules).toBe(rules);
    expect(completed.rules.rngValue).toBe(0x12345678);
    expect(completeBattlePresentation(completed, completion)).toBe(completed);
  });

  it("rejects invalid or out-of-order transitions", () => {
    const initial = createRoundController(scenario());
    expect(() => advanceRoundController(initial)).toThrow(RoundTransitionError);
    expect(() => completeBattlePresentation(initial, { commandId: 999 }))
      .toThrow(/does not match/);
    expect(() => resolveRoundBattle(initial, {
      outcome: "win",
      playerParty: initial.rules.playerParty,
      opponentParty: initial.rules.currentOpponent.party,
      rngValue: 1,
    })).toThrow(/battleActive/);

    const active = acknowledgeAndAdvance(initial);
    expect(() => chooseRoundSwap(active, { type: "decline" }))
      .toThrow(/awaitingSwapDecision/);
    const resolved = winCurrentBattle(active, 1);
    expect(() => resolveRoundBattle(resolved, {
      outcome: "win",
      playerParty: resolved.rules.playerParty,
      opponentParty: resolved.rules.currentOpponent.party,
      rngValue: 2,
    })).toThrow(/battleActive/);
  });
});
