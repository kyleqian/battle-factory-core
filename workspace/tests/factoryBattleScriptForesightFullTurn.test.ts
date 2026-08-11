import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";
import { BATTLE_SCRIPT_STATUS2_FORESIGHT } from "../src/engine/battleScriptSourceConstants.ts";

const TACKLE = 33;
const FORESIGHT = 193;
const SPLASH = 150;

const PLAYER_TACKLE = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});
const PLAYER_FORESIGHT = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 1 as const,
  targetBattler: 1 as const,
});
const TRAINER_SPLASH = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
  targetBattler: 1 as const,
});

function config(): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: 1,
    player: {
      species: 67,
      moveId: TACKLE,
      moves: [TACKLE, FORESIGHT, 0, 0],
      pp: [35, 40, 0, 0],
      attack: 100,
      defense: 500,
      spAttack: 50,
      spDefense: 500,
      speed: 100,
      hp: 1000,
      types: ["TYPE_FIGHTING", "TYPE_FIGHTING"],
    },
    trainer: {
      species: 93,
      moveId: SPLASH,
      moves: [SPLASH, SPLASH, SPLASH, SPLASH],
      pp: [40, 40, 40, 40],
      attack: 10,
      defense: 100,
      spAttack: 10,
      spDefense: 100,
      speed: 50,
      hp: 1000,
      types: ["TYPE_GHOST", "TYPE_POISON"],
    },
  };
}

type DecisionResult = ReturnType<typeof submitFactoryFullTurnDecision>;
type DecisionRequired = Extract<DecisionResult, { kind: "decision-required" }>;

function executeTurn(
  state: DecisionRequired["state"],
  requestId: number,
  playerDecision: typeof PLAYER_TACKLE | typeof PLAYER_FORESIGHT,
): DecisionRequired {
  const afterPlayer = submitFactoryFullTurnDecision(state, {
    requestId,
    side: "player",
    decision: playerDecision,
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected trainer command request");
  }
  const afterTrainer = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: requestId + 1,
    side: "trainer",
    decision: TRAINER_SPLASH,
  });
  if (afterTrainer.kind !== "decision-required") {
    throw new Error(`expected next player command request, got ${JSON.stringify(afterTrainer)}`);
  }
  return afterTrainer;
}

describe("Factory full-turn Foresight shared-consumer receipt", () => {
  it(
    "keeps a shared hit immune before Foresight, orders PP/message/status work, "
      + "then damages through the shared type path and accepts an idempotent repeat",
    () => {
      const initial = createFactoryFullTurnBattleState(config());
      const initialHp = initial.rules.rulesContext.battlers[1].hp;

      const immuneTurn = executeTurn(initial, 1, PLAYER_TACKLE);
      expect(immuneTurn.state.rules.rulesContext.battlers[1].hp).toBe(initialHp);
      expect(immuneTurn.state.rules.rulesContext.battlers[0].pp).toEqual([
        34, 40, 0, 0,
      ]);
      expect(immuneTurn.events.some(({ payload }) =>
        payload.kind === "message"
        && payload.messageId === "STRINGID_ITDOESNTAFFECT"
      )).toBe(true);

      const foresightTurn = executeTurn(
        immuneTurn.state,
        3,
        PLAYER_FORESIGHT,
      );
      const afterSet = foresightTurn.state.rules.rulesContext;
      expect(afterSet.battlers[0].pp).toEqual([34, 39, 0, 0]);
      expect(afterSet.battlers[1].status2 & BATTLE_SCRIPT_STATUS2_FORESIGHT)
        .toBe(BATTLE_SCRIPT_STATUS2_FORESIGHT);
      expect(afterSet.battlers[1].hp).toBe(initialHp);
      const setKinds = foresightTurn.events.map(({ payload }) =>
        payload.kind === "message"
          ? `${payload.kind}:${payload.messageId}`
          : payload.kind
      );
      expect(setKinds.indexOf("set-battler-pp-data")).toBeGreaterThan(
        setKinds.indexOf("message:STRINGID_USEDMOVE"),
      );
      expect(setKinds.indexOf("message:STRINGID_PKMNIDENTIFIED"))
        .toBeGreaterThan(setKinds.indexOf("set-battler-pp-data"));

      const damageTurn = executeTurn(
        foresightTurn.state,
        5,
        PLAYER_TACKLE,
      );
      const afterDamage = damageTurn.state.rules.rulesContext;
      expect(afterDamage.battlers[0].pp).toEqual([33, 39, 0, 0]);
      expect(afterDamage.battlers[1].hp).toBeLessThan(initialHp);
      expect(damageTurn.events.some(({ payload }) =>
        payload.kind === "message"
        && payload.messageId === "STRINGID_ITDOESNTAFFECT"
      )).toBe(false);

      const repeatTurn = executeTurn(
        damageTurn.state,
        7,
        PLAYER_FORESIGHT,
      );
      const afterRepeat = repeatTurn.state.rules.rulesContext;
      expect(afterRepeat.battlers[0].pp).toEqual([33, 38, 0, 0]);
      expect(afterRepeat.battlers[1].hp).toBe(afterDamage.battlers[1].hp);
      expect(afterRepeat.battlers[1].status2)
        .toBe(afterDamage.battlers[1].status2);
      expect(repeatTurn.events.some(({ payload }) =>
        payload.kind === "message"
        && payload.messageId === "STRINGID_PKMNIDENTIFIED"
      )).toBe(true);
      expect(repeatTurn.events.some(({ payload }) =>
        payload.kind === "message"
        && payload.messageId === "STRINGID_BUTITFAILED"
      )).toBe(false);
    },
  );
});
