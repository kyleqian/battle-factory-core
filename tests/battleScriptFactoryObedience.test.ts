import { describe, expect, it } from "vitest";
import {
  BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE,
  joinBattleScriptAttackCancelerFactoryObedience,
  joinBattleScriptAttackCancelerMovesBlock,
  joinBattleScriptAttackCancelerSelectedMovePp,
  type BattleScriptAttackCancelerSelectedMovePpJoinResult,
  type BattleScriptMovesBlockState,
} from "../src/engine/battleScriptAbilityMovesBlock.ts";
import {
  advanceBattleScriptAttackCancelerUnableToUseMove,
} from "../src/engine/battleScriptAttackCanceler.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
  BATTLE_SCRIPT_ABILITY_TRUANT,
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_HITMARKER_OBEYS,
  BATTLE_SCRIPT_MOVE_RESULT_MISSED,
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "../src/engine/battleScriptSourceConstants.ts";

const PC = 0x0800_1234;
const TOXIC = 92;
const HYPER_VOICE = 304;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([TOXIC, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([10, 0, 0, 0]),
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0,
    truantCounter: changes.truantCounter ?? 0,
    rechargeTimer: changes.rechargeTimer ?? 0,
    flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? 0,
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    confusionSelfDmg: changes.confusionSelfDmg ?? 0,
    prlzImmobility: changes.prlzImmobility ?? 0,
    loveImmobility: changes.loveImmobility ?? 0,
  });
}

function rules(
  attacker: 0 | 1,
  changes: Partial<BattleScriptRulesContextInput> = {},
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  const target = (attacker ^ 1) as 0 | 1;
  const battlers = [
    battler({ side: 0 }),
    battler({ side: 1 }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  battlers[attacker] = battler({
    side: attacker === 0 ? 0 : 1,
    ...attackerChanges,
  });
  battlers[target] = battler({
    side: target === 0 ? 0 : 1,
    ...targetChanges,
  });
  return createBattleScriptRulesContext({
    battlers: changes.battlers ?? battlers,
    selectorRoles: changes.selectorRoles ?? {
      attacker,
      target,
      effectBattler: target,
    },
    scriptingBattler: changes.scriptingBattler ?? 3,
    atkCancelerTracker: changes.atkCancelerTracker
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_END,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? TOXIC,
    currentMovePosition: changes.currentMovePosition ?? 0,
    lastUsedAbility: changes.lastUsedAbility ?? 7,
    moveResultFlags: changes.moveResultFlags ?? 0x20,
    dmgMultiplier: changes.dmgMultiplier ?? 1,
    critMultiplier: changes.critMultiplier ?? 1,
    moveEffectByte: changes.moveEffectByte ?? 0,
    missType: changes.missType ?? 0,
    hitMarker: changes.hitMarker ?? 0x40,
    multiHitCounter: changes.multiHitCounter ?? 0,
    multistringChooser: changes.multistringChooser ?? 0,
    battleMoveDamage: changes.battleMoveDamage ?? 0,
  });
}

function state(
  rulesContext: BattleScriptRulesContext,
  rngValue = 0x1234_5678,
  rngCallsConsumed = 91,
): BattleScriptMovesBlockState {
  return Object.freeze({ rulesContext, rngValue, rngCallsConsumed });
}

function throughPp(
  rulesContext: BattleScriptRulesContext,
): BattleScriptAttackCancelerSelectedMovePpJoinResult {
  const canceler = advanceBattleScriptAttackCancelerUnableToUseMove(
    state(rulesContext),
    PC,
  );
  const movesBlock = joinBattleScriptAttackCancelerMovesBlock(canceler, PC);
  return joinBattleScriptAttackCancelerSelectedMovePp(movesBlock, PC);
}

function expectDeepFrozen(value: unknown, seen = new Set<unknown>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value as Record<string, unknown>)) {
    expectDeepFrozen(child, seen);
  }
}

describe("Cmd_attackcanceler Factory-scoped obedience join", () => {
  it("sets OBEYS after Factory-obedient helper returns on both singles sides", () => {
    expect(BATTLE_SCRIPT_HITMARKER_OBEYS).toBe(1 << 25);
    expect(BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE).toEqual({
      facility: "BATTLE_FACTORY",
      sourceBattleTypeFlag: "BATTLE_TYPE_FACTORY",
      sourceFrontierMask: "BATTLE_TYPE_FRONTIER",
    });

    for (const attacker of [0, 1] as const) {
      const upstream = throughPp(rules(attacker, { hitMarker: 0x40 }));
      const result = joinBattleScriptAttackCancelerFactoryObedience(
        upstream,
        BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE,
        PC,
      );
      expect(result).toMatchObject({
        kind: "continue",
        effect: 0,
        rulesContext: {
          hitMarker: 0x40 | BATTLE_SCRIPT_HITMARKER_OBEYS,
        },
        rngValue: upstream.rngValue,
        rngCallsConsumed: upstream.rngCallsConsumed,
        receipt: {
          sourceFunction: "Cmd_attackcanceler",
          sourceCondition: "selected-slot PP admission continued",
          scope: BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE,
          attacker: {
            battler: attacker,
            side: attacker === 0 ? 0 : 1,
          },
          gate: {
            obeysAlreadySet: false,
            multiTurn: false,
            helper: {
              kind: "called",
              sourceFunction: "IsMonDisobedient",
              result: "DISOBEDIENCE_OBEDIENT",
              sourceEarlyReturn: attacker === 0
                ? "BATTLE_TYPE_FRONTIER-before-ownership-badges-level-rng"
                : "opponent-side-before-factory-check",
            },
          },
          hitMarker: {
            before: 0x40,
            after: 0x40 | BATTLE_SCRIPT_HITMARKER_OBEYS,
            addedMask: BATTLE_SCRIPT_HITMARKER_OBEYS,
            clearedMask: 0,
            sourceMask: "HITMARKER_OBEYS",
            mask: BATTLE_SCRIPT_HITMARKER_OBEYS,
          },
          programCounter: {
            kind: "preserve",
            sourceProgramCounter: PC,
            continuation: "after-obedience-before-Magic-Coat",
          },
          rng: {
            kind: "preserve",
            before: upstream.rngValue,
            after: upstream.rngValue,
            callsBefore: upstream.rngCallsConsumed,
            callsAfter: upstream.rngCallsConsumed,
            callsConsumed: 0,
          },
        },
      });
      expect(result.receipt.selectedMovePp).toBe(upstream.receipt);
    }
  });

  it("skips the helper for preexisting OBEYS and multi-turn, then sets OBEYS exactly", () => {
    const cases = [
      {
        upstream: throughPp(rules(0, {
          hitMarker: 0x40 | BATTLE_SCRIPT_HITMARKER_OBEYS,
        })),
        helperReason: "HITMARKER_OBEYS-already-set",
        addedMask: 0,
      },
      {
        upstream: throughPp(rules(1, {}, {
          pp: [0, 0, 0, 0],
          status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
        })),
        helperReason: "STATUS2_MULTIPLETURNS",
        addedMask: BATTLE_SCRIPT_HITMARKER_OBEYS,
      },
    ] as const;

    for (const { upstream, helperReason, addedMask } of cases) {
      expect(upstream.kind).toBe("continue");
      const result = joinBattleScriptAttackCancelerFactoryObedience(
        upstream,
        BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE,
        PC,
      );
      expect(result.kind).toBe("continue");
      if (result.kind !== "continue") throw new Error("expected obedience continuation");
      expect(result.receipt.gate.helper).toEqual({
        kind: "not-called",
        reason: helperReason,
      });
      expect(result.receipt.hitMarker.addedMask).toBe(addedMask);
      expect(
        result.rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_OBEYS,
      ).toBe(BATTLE_SCRIPT_HITMARKER_OBEYS);
      expect(result.rngValue).toBe(upstream.rngValue);
      expect(result.rngCallsConsumed).toBe(upstream.rngCallsConsumed);
    }
  });

  it("bypasses obedience for canceler effects 1/2, Soundproof, and no PP", () => {
    const effectOne = throughPp(rules(
      0,
      { atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_TRUANT },
      { ability: BATTLE_SCRIPT_ABILITY_TRUANT, truantCounter: 1, pp: [0, 0, 0, 0] },
    ));
    const effectTwo = throughPp(rules(
      1,
      { atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_ASLEEP },
      { status1: 3, pp: [0, 0, 0, 0] },
    ));
    const soundproof = throughPp(rules(
      0,
      { currentMove: HYPER_VOICE },
      { pp: [0, 0, 0, 0] },
      { ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
    ));
    const noPp = throughPp(rules(
      1,
      { moveResultFlags: 0x20 },
      { pp: [0, 0, 0, 0] },
    ));

    for (const [upstream, kind, effect, reason] of [
      [effectOne, "canceler-effect", 1, "canceler-effect-nonzero"],
      [effectTwo, "canceler-effect", 2, "canceler-effect-nonzero"],
      [soundproof, "moves-block", 1, "moves-block-effect-nonzero"],
      [noPp, "selected-move-no-pp", 0, "selected-move-has-no-pp"],
    ] as const) {
      const result = joinBattleScriptAttackCancelerFactoryObedience(
        upstream,
        BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE,
        PC,
      );
      expect(result).toMatchObject({
        kind,
        effect,
        receipt: {
          obedience: {
            kind: "not-called",
            reason,
          },
          rng: {
            callsConsumed: 0,
          },
        },
      });
      expect(result.rulesContext).toBe(upstream.rulesContext);
      expect(result.receipt.selectedMovePp).toBe(upstream.receipt);
      expect(result.rngValue).toBe(upstream.rngValue);
      expect(result.rngCallsConsumed).toBe(upstream.rngCallsConsumed);
    }
    expect(noPp.rulesContext.moveResultFlags).toBe(
      0x20 | BATTLE_SCRIPT_MOVE_RESULT_MISSED,
    );
  });

  it("changes only HITMARKER_OBEYS on a continuing source state", () => {
    const upstream = throughPp(rules(
      1,
      {
        moveResultFlags: 0xa4,
        hitMarker: 0x0080_0240,
        lastUsedAbility: 17,
      },
      { pp: [5, 4, 3, 2], status2: 0x40 },
    ));
    const result = joinBattleScriptAttackCancelerFactoryObedience(
      upstream,
      BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE,
      PC,
    );
    expect(result.kind).toBe("continue");
    expect(result.rulesContext).toEqual({
      ...upstream.rulesContext,
      hitMarker:
        upstream.rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_OBEYS,
    });
    expect(result.rulesContext.battlers).toBe(upstream.rulesContext.battlers);
    expect(result.rulesContext.selectorRoles).toBe(
      upstream.rulesContext.selectorRoles,
    );
  });

  it("is deterministic, immutable, recursively frozen, and consumes zero RNG", () => {
    const upstream = throughPp(rules(0, { hitMarker: 0x40 }));
    const before = JSON.stringify(upstream);
    const first = joinBattleScriptAttackCancelerFactoryObedience(
      upstream,
      BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE,
      PC,
    );
    const replay = joinBattleScriptAttackCancelerFactoryObedience(
      upstream,
      BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE,
      PC,
    );
    expect(replay).toEqual(first);
    expect(JSON.stringify(upstream)).toBe(before);
    expect(first.rngValue).toBe(upstream.rngValue);
    expect(first.rngCallsConsumed).toBe(upstream.rngCallsConsumed);
    expect(first.receipt.selectedMovePp).toBe(upstream.receipt);
    expectDeepFrozen(first);
  });

  it("rejects invalid/non-Factory scope, input, composition, and source PC", () => {
    const valid = throughPp(rules(0));
    for (const invalidScope of [
      null,
      {},
      {
        facility: "STORY",
        sourceBattleTypeFlag: "BATTLE_TYPE_TRAINER",
        sourceFrontierMask: "NONE",
      },
      {
        facility: "BATTLE_FACTORY",
        sourceBattleTypeFlag: "BATTLE_TYPE_FACTORY",
        sourceFrontierMask: "NONE",
      },
    ]) {
      expect(() => joinBattleScriptAttackCancelerFactoryObedience(
        valid,
        invalidScope as never,
        PC,
      )).toThrow(/requires explicit Battle Factory\/Frontier scope/);
    }
    expect(() => joinBattleScriptAttackCancelerFactoryObedience(
      null as never,
      BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE,
      PC,
    )).toThrow(/requires a selected-move PP result/);
    for (const invalidPc of [-1, 1.5, 0x1_0000_0000, Number.NaN]) {
      expect(() => joinBattleScriptAttackCancelerFactoryObedience(
        valid,
        BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE,
        invalidPc,
      )).toThrow(/source program counter must be a u32/);
    }
    for (const invalid of [
      { ...valid, kind: "moves-block", effect: 0 },
      { ...valid, kind: "continue", effect: 1 },
      { ...valid, receipt: null },
    ]) {
      expect(() => joinBattleScriptAttackCancelerFactoryObedience(
        invalid as never,
        BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE,
        PC,
      )).toThrow(/requires a consistent selected-move PP result/);
    }
  });
});
