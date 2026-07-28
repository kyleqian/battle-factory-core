import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const TACKLE = 33;
const REVENGE = 279;
const SPLASH = 150;
const PLAYER_REVENGE = Object.freeze({
  kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 1 as const,
});
const TRAINER_TACKLE = Object.freeze({
  kind: "use-move" as const, moveSlot: 0 as const, targetBattler: 0 as const,
});
const TRAINER_SPLASH = Object.freeze({
  kind: "use-move" as const, moveSlot: 1 as const, targetBattler: 1 as const,
});

function config(): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: 0x36d2_3b62,
    player: {
      species: 66, moveId: REVENGE, moves: [REVENGE, 0, 0, 0],
      pp: [10, 0, 0, 0], attack: 120, defense: 100,
      spAttack: 50, spDefense: 100, speed: 50, hp: 1000,
      types: ["TYPE_FIGHTING", "TYPE_FIGHTING"],
    },
    trainer: {
      species: 113, moveId: TACKLE, moves: [TACKLE, SPLASH, 0, 0],
      pp: [35, 40, 0, 0], attack: 80, defense: 200,
      spAttack: 50, spDefense: 200, speed: 100, hp: 1000,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    },
  };
}

type State = ReturnType<typeof createFactoryFullTurnBattleState>;

function executeTurn(
  state: State,
  requestId: number,
  trainerDecision: typeof TRAINER_TACKLE | typeof TRAINER_SPLASH,
) {
  const afterPlayer = submitFactoryFullTurnDecision(state, {
    requestId, side: "player", decision: PLAYER_REVENGE,
  });
  if (afterPlayer.kind !== "decision-required") {
    throw new Error("expected trainer command request");
  }
  const afterTrainer = submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: requestId + 1, side: "trainer", decision: trainerDecision,
  });
  if (afterTrainer.kind !== "decision-required") {
    throw new Error("expected next player command request");
  }
  return afterTrainer;
}

describe("Factory full-turn Revenge shared receipt and cleanup", () => {
  it("records a real faster hit, doubles Revenge on the common path, then cannot leak the receipt", () => {
    const initial = createFactoryFullTurnBattleState(config());
    const damagedTurn = executeTurn(initial, 1, TRAINER_TACKLE);
    const afterDamaged = damagedTurn.state.rules.rulesContext;

    expect(afterDamaged.battlers[0].hp).toBeLessThan(1000);
    expect(afterDamaged.battlers[1].hp).toBeLessThan(1000);
    expect(afterDamaged.battlers[0].pp).toEqual([9, 0, 0, 0]);
    expect(afterDamaged.battlers[1].pp).toEqual([34, 40, 0, 0]);
    expect(afterDamaged.dmgMultiplier).toBe(2);
    expect(1000 - afterDamaged.battlers[1].hp).toBe(afterDamaged.hpDealt);

    const eventKinds = damagedTurn.events.map(({ payload }) =>
      payload.kind === "message"
        ? `${payload.kind}:${payload.messageId}`
        : payload.kind
    );
    const firstUsedMove = eventKinds.indexOf("message:STRINGID_USEDMOVE");
    const firstPp = eventKinds.indexOf("set-battler-pp-data");
    const secondUsedMove = eventKinds.indexOf(
      "message:STRINGID_USEDMOVE",
      firstUsedMove + 1,
    );
    const secondPp = eventKinds.indexOf("set-battler-pp-data", firstPp + 1);
    expect(firstUsedMove).toBeGreaterThanOrEqual(0);
    expect(firstPp).toBeGreaterThan(firstUsedMove);
    expect(secondUsedMove).toBeGreaterThan(firstPp);
    expect(secondPp).toBeGreaterThan(secondUsedMove);

    // BattleTurnPassed's shared TurnValuesCleanUp(FALSE) clears the receipt
    // before the fresh decision boundary, while leaving unrelated HP/PP.
    expect(afterDamaged.battlers[0]).toMatchObject({
      protectPhysicalDmg: 0,
      protectPhysicalBattlerId: 0,
      protectSpecialDmg: 0,
      protectSpecialBattlerId: 0,
    });

    const hpBeforeUndamaged = afterDamaged.battlers[1].hp;
    const undamagedTurn = executeTurn(damagedTurn.state, 3, TRAINER_SPLASH);
    const afterUndamaged = undamagedTurn.state.rules.rulesContext;
    expect(afterUndamaged.dmgMultiplier).toBe(1);
    expect(afterUndamaged.battlers[0].hp).toBe(afterDamaged.battlers[0].hp);
    expect(afterUndamaged.battlers[0].pp).toEqual([8, 0, 0, 0]);
    expect(afterUndamaged.battlers[1].pp).toEqual([34, 39, 0, 0]);
    expect(hpBeforeUndamaged - afterUndamaged.battlers[1].hp)
      .toBe(afterUndamaged.hpDealt);
    expect(afterDamaged.hpDealt).toBeGreaterThan(afterUndamaged.hpDealt);
    expect(afterUndamaged.battlers[0]).toMatchObject({
      protectPhysicalDmg: 0,
      protectPhysicalBattlerId: 0,
      protectSpecialDmg: 0,
      protectSpecialBattlerId: 0,
    });
  });
});
