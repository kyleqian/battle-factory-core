import { describe, expect, it } from "vitest";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const LOW_KICK = 67;
const SPLASH = 150;
const PLAYER_LOW_KICK = Object.freeze({
  kind: "use-move" as const,
  moveSlot: 0 as const,
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
    rngSeed: 0x36d2_3b62,
    player: {
      species: 67,
      moveId: LOW_KICK,
      moves: [LOW_KICK, 0, 0, 0],
      pp: [20, 0, 0, 0],
      attack: 120,
      defense: 200,
      spAttack: 50,
      spDefense: 200,
      speed: 100,
      hp: 1000,
      types: ["TYPE_FIGHTING", "TYPE_FIGHTING"],
    },
    trainer: {
      species: 113,
      moveId: SPLASH,
      moves: [SPLASH, SPLASH, SPLASH, SPLASH],
      pp: [40, 40, 40, 40],
      attack: 50,
      defense: 200,
      spAttack: 50,
      spDefense: 200,
      speed: 50,
      hp: 1000,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    },
  };
}

describe("Factory full-turn Low Kick through shared damage and cleanup", () => {
  it("spends PP, hits through common accuracy/type/damage/messages, and resets dynamic power at the next decision", () => {
    const initial = createFactoryFullTurnBattleState(config());
    const initialRules = initial.rules.rulesContext;
    const afterPlayer = submitFactoryFullTurnDecision(initial, {
      requestId: 1,
      side: "player",
      decision: PLAYER_LOW_KICK,
    });
    if (afterPlayer.kind !== "decision-required") {
      throw new Error("expected trainer command request");
    }
    const result = submitFactoryFullTurnDecision(afterPlayer.state, {
      requestId: 2,
      side: "trainer",
      decision: TRAINER_SPLASH,
    });
    if (result.kind !== "decision-required") {
      throw new Error(`expected next player command request, got ${result.kind}`);
    }

    const rules = result.state.rules.rulesContext;
    expect(rules.battlers[0].pp).toEqual([19, 0, 0, 0]);
    expect(rules.battlers[1].pp).toEqual([39, 40, 40, 40]);
    expect(rules.battlers[0].hp).toBe(initialRules.battlers[0].hp);
    expect(rules.battlers[1].hp).toBeLessThan(initialRules.battlers[1].hp);
    expect(initialRules.battlers[1].hp - rules.battlers[1].hp)
      .toBe(rules.hpDealt);
    expect(rules.dynamicBasePower).toBe(0);
    expect(rules.dmgMultiplier).toBe(1);
    expect(rules.moveResultFlags).toBe(0);

    const eventKinds = result.events.map(({ payload }) =>
      payload.kind === "message"
        ? `${payload.kind}:${payload.messageId}`
        : payload.kind
    );
    const usedLowKick = eventKinds.indexOf("message:STRINGID_USEDMOVE");
    const lowKickPp = eventKinds.indexOf("set-battler-pp-data");
    const healthBar = eventKinds.indexOf("health-bar-update");
    const hpUpdate = eventKinds.indexOf("hp-change");
    const effectiveness = eventKinds.indexOf(
      "message:STRINGID_SUPEREFFECTIVE",
    );
    const usedSplash = eventKinds.indexOf(
      "message:STRINGID_USEDMOVE",
      usedLowKick + 1,
    );
    expect(usedLowKick).toBeGreaterThanOrEqual(0);
    expect(lowKickPp).toBeGreaterThan(usedLowKick);
    expect(healthBar).toBeGreaterThan(lowKickPp);
    expect(hpUpdate).toBeGreaterThan(healthBar);
    expect(effectiveness).toBeGreaterThan(hpUpdate);
    expect(usedSplash).toBeGreaterThan(effectiveness);
    expect(eventKinds).not.toContain("message:STRINGID_ITDOESNTAFFECT");
    expect(Object.isFrozen(rules)).toBe(true);
    expect(initial.rules.rulesContext.dynamicBasePower).toBe(0);
  });
});
