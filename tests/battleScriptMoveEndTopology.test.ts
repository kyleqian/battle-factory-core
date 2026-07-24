import { describe, expect, it } from "vitest";
import {
  applyBattleScriptMoveEndSubstituteOwnership,
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
  BATTLE_SCRIPT_STATUS2_SUBSTITUTE,
  createBattleScriptRulesContext,
  resolveBattleScriptBattlerAtPosition,
  resolveBattleScriptBattlerPartner,
  resolveBattleScriptMoveEndNextTarget,
  wasBattleScriptBattlerUnableToUseMove,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";

const ZERO_STAGES = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0] as const);

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: 0 as const,
    ability: 0,
    hp: 100,
    item: 0,
    moves: Object.freeze([39, 92, 0, 0] as const),
    pp: Object.freeze([30, 10, 0, 0] as const),
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
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContextInput {
  return {
    battlers: [
      battler(),
      battler({ side: 1 }),
      battler(),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 3, target: 0, effectBattler: 0 },
    scriptingBattler: 3,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 39, // MOVE_TAIL_WHIP, MOVE_TARGET_BOTH
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: {
      battlersCount: 4,
      battleTypeFlags: BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
      // A legal link-style permutation: target id 0's partner is id 1, not 0 ^ 2.
      battlerPositions: [1, 3, 0, 2],
    },
    ...changes,
  };
}

describe("Cmd_moveend topology and pure state prerequisites", () => {
  it("owns-and-validates-exact-topology-widths-cardinality-and-uniqueness", () => {
    const context = createBattleScriptRulesContext(contextInput({
      battleTopology: {
        battlersCount: 4,
        battleTypeFlags: 0xffff_ffff,
        battlerPositions: [3, 1, 2, 0],
      },
    }));
    expect(context.battleTopology).toEqual({
      battlersCount: 4,
      battleTypeFlags: 0xffff_ffff,
      battlerPositions: [3, 1, 2, 0],
    });
    expect(Object.isFrozen(context.battleTopology)).toBe(true);
    expect(Object.isFrozen(context.battleTopology.battlerPositions)).toBe(true);

    const invalid: readonly unknown[] = [
      { battlersCount: -1, battleTypeFlags: 0, battlerPositions: [0, 1, 2, 3] },
      { battlersCount: 0, battleTypeFlags: 0, battlerPositions: [0, 1, 2, 3] },
      { battlersCount: 1, battleTypeFlags: 0, battlerPositions: [0, 1, 2, 3] },
      { battlersCount: 3, battleTypeFlags: 0, battlerPositions: [0, 1, 2, 3] },
      { battlersCount: 5, battleTypeFlags: 1, battlerPositions: [0, 1, 2, 3] },
      { battlersCount: 2, battleTypeFlags: 1, battlerPositions: [0, 1, 2, 3] },
      { battlersCount: 4, battleTypeFlags: 0, battlerPositions: [0, 1, 2, 3] },
      { battlersCount: 2, battleTypeFlags: 0, battlerPositions: [0, 1, 2] },
      { battlersCount: 2, battleTypeFlags: 0, battlerPositions: [0, 4, 2, 3] },
      { battlersCount: 2, battleTypeFlags: 0, battlerPositions: [0, 0, 2, 3] },
    ];
    for (const battleTopology of invalid) {
      expect(() => createBattleScriptRulesContext(contextInput({
        battleTopology: battleTopology as BattleScriptRulesContextInput["battleTopology"],
      })))
        .toThrow();
    }
  });

  it("implements-source-GetBattlerAtPosition-count-sentinel-and-partner-composition", () => {
    const singles = createBattleScriptRulesContext(contextInput({
      battleTopology: {
        battlersCount: 2,
        battleTypeFlags: 0,
        battlerPositions: [0, 1, 0xff, 0xff],
      },
    }));
    expect(resolveBattleScriptBattlerAtPosition(singles.battleTopology, 0)).toBe(0);
    // Source scans only i < gBattlersCount, despite the durable fourth position.
    expect(resolveBattleScriptBattlerAtPosition(singles.battleTopology, 2)).toBe(2);

    const doubles = createBattleScriptRulesContext(contextInput());
    expect(resolveBattleScriptBattlerPartner(doubles.battleTopology, 0)).toBe(1);
    expect(resolveBattleScriptBattlerPartner(doubles.battleTopology, 0))
      .not.toBe(0 ^ 2);
  });

  it("implements-the-exact-nine-branch-WasUnableToUseMove-predicate", () => {
    const branches: readonly Partial<BattleScriptRulesBattler>[] = [
      { prlzImmobility: 1 },
      { targetNotAffected: 1 },
      { usedImprisonedMove: 1 },
      { loveImmobility: 1 },
      { usedDisabledMove: 1 },
      { usedTauntedMove: 1 },
      { flag2Unknown: 1 },
      { flinchImmobility: 1 },
      { confusionSelfDmg: 1 },
    ];
    const clear = createBattleScriptRulesContext(contextInput());
    expect(wasBattleScriptBattlerUnableToUseMove(clear, 0)).toBe(false);
    for (const branch of branches) {
      const context = createBattleScriptRulesContext(contextInput({
        battlers: [
          battler(branch),
          battler({ side: 1 }),
          battler(),
          battler({ side: 1 }),
        ],
      }));
      expect(wasBattleScriptBattlerUnableToUseMove(context, 0)).toBe(true);
    }
    for (const branch of [
      { targetNotAffected: 2 as 0 },
      { flag2Unknown: -1 as 0 },
    ]) {
      expect(() => createBattleScriptRulesContext(contextInput({
        battlers: [
          battler(branch),
          battler({ side: 1 }),
          battler(),
          battler({ side: 1 }),
        ],
      }))).toThrow();
    }
  });

  it("substitute-loops-only-through-gBattlersCount", () => {
    const context = createBattleScriptRulesContext(contextInput({
      battlers: [
        battler({ status2: BATTLE_SCRIPT_STATUS2_SUBSTITUTE, substituteHP: 0 }),
        battler({
          side: 1,
          status2: BATTLE_SCRIPT_STATUS2_SUBSTITUTE,
          substituteHP: 1,
        }),
        battler({ status2: BATTLE_SCRIPT_STATUS2_SUBSTITUTE, substituteHP: 0 }),
        battler({
          side: 1,
          status2: BATTLE_SCRIPT_STATUS2_SUBSTITUTE,
          substituteHP: 0,
        }),
      ],
      battleTopology: {
        battlersCount: 2,
        battleTypeFlags: 0,
        battlerPositions: [0, 1, 0xff, 0xff],
      },
    }));
    const result = applyBattleScriptMoveEndSubstituteOwnership(context);
    expect(result.battlers.map(({ status2 }) => status2)).toEqual([
      0,
      BATTLE_SCRIPT_STATUS2_SUBSTITUTE,
      BATTLE_SCRIPT_STATUS2_SUBSTITUTE,
      BATTLE_SCRIPT_STATUS2_SUBSTITUTE,
    ]);
    expect(result.battlers[1]).toBe(context.battlers[1]);
    expect(result.battlers[2]).toBe(context.battlers[2]);
    expect(result.battlers[3]).toBe(context.battlers[3]);
    expect(result.moveendState).toBe(context.moveendState);
  });

  it("next-target-resolves-partner-by-position-not-battler-parity", () => {
    const context = createBattleScriptRulesContext(contextInput());
    expect(resolveBattleScriptMoveEndNextTarget(context)).toEqual({
      kind: "replay-partner",
      targetBattler: 1,
      hitMarker: BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
      transferRemainder: "cleanup-move-values-and-transfer-effect-script",
    });
  });

  it("pins-each-state-16-gate-and-the-fainted-partner-hitmarker-write", () => {
    const base = contextInput();
    const gated: readonly BattleScriptRulesContextInput[] = [
      { ...base, hitMarker: BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE },
      {
        ...base,
        battleTopology: {
          battlersCount: 2,
          battleTypeFlags: 0,
          battlerPositions: [0, 1, 0xff, 0xff],
        },
      },
      {
        ...base,
        battlers: [
          battler(),
          battler({ side: 1 }),
          battler(),
          battler({ side: 1, chargingTurn: 1 }),
        ],
      },
      { ...base, currentMove: 92 },
      { ...base, hitMarker: BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING },
    ];
    for (const input of gated) {
      expect(resolveBattleScriptMoveEndNextTarget(
        createBattleScriptRulesContext(input),
      )).toMatchObject({
        kind: "advance",
        reason: "not-both-target-replay",
      });
    }

    const fainted = createBattleScriptRulesContext(contextInput({
      battlers: [
        battler(),
        battler({ side: 1, hp: 0 }),
        battler(),
        battler({ side: 1 }),
      ],
    }));
    expect(resolveBattleScriptMoveEndNextTarget(fainted)).toEqual({
      kind: "advance",
      reason: "partner-fainted",
      hitMarker: BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
    });
  });
});
