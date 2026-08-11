import { describe, expect, it } from "vitest";
import {
  parseBattleState,
  serializeBattleState,
  type BattleState,
} from "../src/engine/battleDecisionBoundary.ts";
import {
  createFactoryAsleepMoveBattleState,
  reduceFactoryAsleepMoveDecision,
  submitFactoryAsleepMoveDecision,
  type FactoryBattleScriptDecisionRules,
} from "../src/engine/factoryBattleScriptDecision.ts";
import {
  submitFactoryAiMaskZeroDecision,
  type FactoryAiMaskZeroView,
} from "../src/engine/factoryAiDecisionPolicy.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import { writeBattleScriptRulesByte } from "../src/engine/battleScriptSetByte.ts";

const ZERO_STAGES = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0] as const);

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: 0 as const,
    ability: 0,
    hp: 100,
    item: 0,
    moves: Object.freeze([0, 0, 0, 0] as const),
    pp: Object.freeze([0, 0, 0, 0] as const),
    statStages: ZERO_STAGES,
    status1: 0,
    status2: 0,
    status3: 0,
    specialStatus: Object.freeze({
      restoredBattlerSprite: 0 as const,
      physicalDmg: 0,
      specialDmg: 0,
    }),
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0 as const,
    rechargeTimer: 0,
    flinchImmobility: 0 as const,
    disabledMove: 0,
    usedDisabledMove: 0 as const,
    tauntTimer: 0,
    usedTauntedMove: 0 as const,
    usedImprisonedMove: 0 as const,
    chargingTurn: 0 as const,
    ...changes,
  });
}

function contextInput(
  battlers: readonly BattleScriptRulesBattler[],
): BattleScriptRulesContextInput {
  return {
    battlers,
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 92,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
  };
}

function fourBattlers(first = battler()): readonly BattleScriptRulesBattler[] {
  return [first, battler({ side: 1 }), battler(), battler({ side: 1 })];
}

const playerConfig = Object.freeze({
  playerSetId: 15,
  trainerSetId: 291,
  commandSide: "player" as const,
  playerHp: 110,
  trainerHp: 135,
  sleepTurns: 4,
  rngSeed: 0xf4c9_6838,
  requestId: 41,
});

const trainerConfig = Object.freeze({
  ...playerConfig,
  commandSide: "trainer" as const,
  rngSeed: 1,
  requestId: 73,
});

const trainerAiView: FactoryAiMaskZeroView = Object.freeze({
  schema: "factory-ai-view/v1",
  mode: "factory-level-50-singles",
  active: Object.freeze({ aiBattler: 1, targetBattler: 0 }),
  factory: Object.freeze({
    levelMode: 0,
    battleMode: 0,
    factoryWinStreak: 0,
    trainerOpponentId: 50,
  }),
  moves: Object.freeze([85, 86, 69, 273] as const),
});

describe("Cmd_moveend battler metadata dependency", () => {
  it("validates-source-widths-and-four-battler-cardinality", () => {
    const valid = battler({
      item: 0xffff,
      statStages: [-0x80, 0x7f, -1, 0, 1, 6, 12, 42],
      specialStatus: {
        restoredBattlerSprite: 1,
        physicalDmg: -0x8000_0000,
        specialDmg: 0x7fff_ffff,
      },
      chargingTurn: 1,
    });
    expect(createBattleScriptRulesContext(contextInput(fourBattlers(valid))).battlers[0])
      .toMatchObject(valid);

    const invalidFirstBattlers = [
      battler({ item: -1 }),
      battler({ item: 0x1_0000 }),
      battler({ statStages: [0, 0, 0, 0, 0, 0, 0] }),
      battler({ statStages: [0, 0, 0, 0, 0, 0, 0, 0, 0] }),
      battler({ statStages: [-0x81, 0, 0, 0, 0, 0, 0, 0] }),
      battler({ statStages: [0x80, 0, 0, 0, 0, 0, 0, 0] }),
      battler({ specialStatus: null as never }),
      battler({ specialStatus: { restoredBattlerSprite: 2 as 0, physicalDmg: 0, specialDmg: 0 } }),
      battler({ specialStatus: { restoredBattlerSprite: 0, physicalDmg: -0x8000_0001, specialDmg: 0 } }),
      battler({ specialStatus: { restoredBattlerSprite: 0, physicalDmg: 0, specialDmg: 0x8000_0000 } }),
      battler({ chargingTurn: 2 as 0 }),
    ];
    for (const invalid of invalidFirstBattlers) {
      expect(() => createBattleScriptRulesContext(contextInput(fourBattlers(invalid))))
        .toThrow();
    }
    for (const malformed of [fourBattlers().slice(0, 3), [...fourBattlers(), battler()]]) {
      expect(() => createBattleScriptRulesContext(contextInput(malformed))).toThrow(
        "exactly four indexed battlers",
      );
    }
  });

  it("preserves-s8-battler-metadata-by-identity-and-freezes-recursively", () => {
    const source = createBattleScriptRulesContext(contextInput(fourBattlers(battler({
      item: 0xabcd,
      statStages: [-128, -64, -1, 0, 1, 6, 12, 127],
      specialStatus: {
        restoredBattlerSprite: 1,
        physicalDmg: -123_456,
        specialDmg: 789_012,
      },
      chargingTurn: 1,
    }))));

    expect(Object.isFrozen(source.battlers)).toBe(true);
    expect(Object.isFrozen(source.battlers[0])).toBe(true);
    expect(Object.isFrozen(source.battlers[0].statStages)).toBe(true);
    expect(Object.isFrozen(source.battlers[0].specialStatus)).toBe(true);

    const written = writeBattleScriptRulesByte(source, "sMOVEEND_STATE", 7);
    expect(written).not.toBeNull();
    expect(written?.battlers).toBe(source.battlers);
    expect(written?.battlers[0]).toBe(source.battlers[0]);
    expect(written?.battlers[0].statStages).toBe(source.battlers[0].statStages);
    expect(written?.battlers[0].specialStatus).toBe(source.battlers[0].specialStatus);
    expect(written?.choicedMove).toBe(source.choicedMove);
    expect(written?.changedItems).toBe(source.changedItems);
    expect(written?.enigmaBerryHoldEffects).toBe(source.enigmaBerryHoldEffects);
    expect(written?.battleTopology).toBe(source.battleTopology);
    expect(written?.moveendState).toBe(7);
  });

  it("round-trips-public-battle-state-metadata-through-canonical-json", () => {
    const state = createFactoryAsleepMoveBattleState(playerConfig);
    const restored = parseBattleState(
      serializeBattleState(state),
    ) as BattleState<FactoryBattleScriptDecisionRules>;

    expect(restored).toEqual(state);
    expect(restored.rules.rulesContext.battlers[0]).toMatchObject({
      item: 196,
      statStages: [6, 6, 6, 6, 6, 6, 6, 6],
      specialStatus: {
        restoredBattlerSprite: 0,
        physicalDmg: 0,
        specialDmg: 0,
      },
      chargingTurn: 0,
    });
    expect(Object.isFrozen(restored.rules.rulesContext.battlers[0].statStages)).toBe(true);
    expect(Object.isFrozen(restored.rules.rulesContext.battlers[0].specialStatus)).toBe(true);
    expect(restored.rules.rulesContext).toMatchObject({
      chosenMove: 0,
      choicedMove: [0, 0, 0, 0],
      changedItems: [0, 0, 0, 0],
      absentBattlerFlags: 0b1100,
      battleStructAbsentBattlerFlags: 0b1100,
      dynamicMoveType: 0,
      enigmaBerryHoldEffects: [0, 0, 0, 0],
      battleTopology: {
        battlersCount: 2,
        battleTypeFlags: 0x0008_0008,
        battlerPositions: [0, 1, 0xff, 0xff],
      },
    });
    expect(Object.isFrozen(restored.rules.rulesContext.choicedMove)).toBe(true);
    expect(Object.isFrozen(restored.rules.rulesContext.changedItems)).toBe(true);
    expect(Object.isFrozen(restored.rules.rulesContext.enigmaBerryHoldEffects)).toBe(true);
  });

  it("preserves-metadata-through-existing-player-and-ai-vertical-replay-regression", () => {
    const player = createFactoryAsleepMoveBattleState(playerConfig);
    const playerResult = submitFactoryAsleepMoveDecision(player, {
      requestId: 41,
      side: "player",
      decision: { kind: "use-move", moveSlot: 1, targetBattler: 0 },
    });
    expect(playerResult.kind).toBe("machine-barrier");
    expect(playerResult.state.rules.rulesContext.battlers.map(({ item }) => item))
      .toEqual([196, 171, 0, 0]);
    expect(playerResult.state.rules.rulesContext.battlers[0].statStages)
      .toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
    expect(playerResult.state.rules.rulesContext).toMatchObject({
      chosenMove: 182,
      choicedMove: [0, 0, 0, 0],
      changedItems: [0, 0, 0, 0],
      absentBattlerFlags: 0b1100,
      battleStructAbsentBattlerFlags: 0b1100,
      dynamicMoveType: 0,
      enigmaBerryHoldEffects: [0, 0, 0, 0],
    });
    expect(playerResult.state.rules.rulesContext.choicedMove)
      .toEqual(player.rules.rulesContext.choicedMove);
    expect(playerResult.state.rules.rulesContext.changedItems)
      .toEqual(player.rules.rulesContext.changedItems);
    expect(playerResult.state.rules.rulesContext.enigmaBerryHoldEffects)
      .toEqual(player.rules.rulesContext.enigmaBerryHoldEffects);
    expect(playerResult.state.rules.rulesContext.battleTopology)
      .toEqual(player.rules.rulesContext.battleTopology);
    const replayedPlayerResult = parseBattleState(
      serializeBattleState(playerResult.state),
    ) as BattleState<FactoryBattleScriptDecisionRules>;
    expect(replayedPlayerResult).toEqual(playerResult.state);
    expect(Object.isFrozen(replayedPlayerResult.rules.rulesContext.choicedMove)).toBe(true);

    const trainer = createFactoryAsleepMoveBattleState(trainerConfig);
    const trainerResult = submitFactoryAiMaskZeroDecision(
      trainer,
      trainerAiView,
      reduceFactoryAsleepMoveDecision,
    );
    expect(trainerResult.transition.kind).toBe("machine-barrier");
    expect(trainerResult.transition.state.rules.rulesContext.battlers.map(({ item }) => item))
      .toEqual([196, 171, 0, 0]);
    expect(trainerResult.transition.state.rules.rulesContext.battlers[1].statStages)
      .toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
    expect(trainerResult.transition.state.rules.rulesContext).toMatchObject({
      chosenMove: 273,
      choicedMove: [0, 0, 0, 0],
      changedItems: [0, 0, 0, 0],
      absentBattlerFlags: 0b1100,
      battleStructAbsentBattlerFlags: 0b1100,
      dynamicMoveType: 0,
      enigmaBerryHoldEffects: [0, 0, 0, 0],
    });
    expect(trainerResult.transition.state.rules.rulesContext.choicedMove)
      .toEqual(trainer.rules.rulesContext.choicedMove);
    expect(trainerResult.transition.state.rules.rulesContext.changedItems)
      .toEqual(trainer.rules.rulesContext.changedItems);
    expect(trainerResult.transition.state.rules.rulesContext.enigmaBerryHoldEffects)
      .toEqual(trainer.rules.rulesContext.enigmaBerryHoldEffects);
    expect(trainerResult.transition.state.rules.rulesContext.battleTopology)
      .toEqual(trainer.rules.rulesContext.battleTopology);
    expect(trainerResult.transition.state.rng).toEqual({
      value: 0x79e3_9ac4,
      calls: 5,
    });
  });
});
