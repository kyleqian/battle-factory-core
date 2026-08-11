import { describe, expect, it } from "vitest";
import {
  joinBattleScriptAttackCancelerMovesBlock,
  joinBattleScriptAttackCancelerSelectedMovePp,
  type BattleScriptAttackCancelerMovesBlockJoinResult,
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
  BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP,
  BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
  BATTLE_SCRIPT_MOVE_RESULT_MISSED,
  BATTLE_SCRIPT_MOVE_STRUGGLE,
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
  battlers[attacker] = battler({ side: attacker, ...attackerChanges });
  battlers[target] = battler({ side: target, ...targetChanges });
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

function throughMovesBlock(
  rulesContext: BattleScriptRulesContext,
): BattleScriptAttackCancelerMovesBlockJoinResult {
  const canceler = advanceBattleScriptAttackCancelerUnableToUseMove(
    state(rulesContext),
    PC,
  );
  return joinBattleScriptAttackCancelerMovesBlock(canceler, PC);
}

function expectDeepFrozen(value: unknown, seen = new Set<unknown>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value as Record<string, unknown>)) {
    expectDeepFrozen(child, seen);
  }
}

describe("Cmd_attackcanceler moves-block to selected-slot PP join", () => {
  it("hands no PP to BattleScript_NoPPForMove and adds missed on both singles sides", () => {
    for (const attacker of [0, 1] as const) {
      const upstream = throughMovesBlock(rules(
        attacker,
        { moveResultFlags: 0x20, hitMarker: 0x40 },
        { pp: [0, 4, 5, 6] },
      ));
      const result = joinBattleScriptAttackCancelerSelectedMovePp(upstream, PC);
      expect(result).toMatchObject({
        kind: "selected-move-no-pp",
        effect: 0,
        rulesContext: {
          moveResultFlags: 0x20 | BATTLE_SCRIPT_MOVE_RESULT_MISSED,
          hitMarker: 0x40,
        },
        receipt: {
          sourceFunction: "Cmd_attackcanceler",
          sourceCondition:
            "AtkCanceler_UnableToUseMove() == 0 && AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK, gBattlerTarget, 0, 0, 0) == 0",
          selectedMovePp: {
            sourceCheckpoint: "after-unable-and-move-block",
            programCounter: {
              kind: "jump",
              sourceProgramCounter: PC,
              targetLabel: "BattleScript_NoPPForMove",
            },
            moveResultFlags: {
              before: 0x20,
              after: 0x21,
              addedMask: 1,
              clearedMask: 0,
            },
            hitMarker: {
              before: 0x40,
              after: 0x40,
              addedMask: 0,
              clearedMask: 0,
            },
          },
        },
      });
      expect(result.receipt.cancelerMovesBlock).toBe(upstream.receipt);
    }
  });

  it("continues for Struggle, allow-no-PP, no-attack-string, multi-turn, and sufficient PP", () => {
    for (const attacker of [0, 1] as const) {
      const cases = [
        rules(attacker, { currentMove: BATTLE_SCRIPT_MOVE_STRUGGLE }, { pp: [0, 4, 5, 6] }),
        rules(attacker, { hitMarker: BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP | 0x40 }, { pp: [0, 4, 5, 6] }),
        rules(attacker, { hitMarker: BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING | 0x40 }, { pp: [0, 4, 5, 6] }),
        rules(attacker, {}, {
          pp: [0, 4, 5, 6],
          status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
        }),
        rules(attacker, {}, { pp: [1, 4, 5, 6] }),
      ];
      for (const source of cases) {
        const upstream = throughMovesBlock(source);
        const result = joinBattleScriptAttackCancelerSelectedMovePp(upstream, PC);
        expect(result).toMatchObject({
          kind: "continue",
          effect: 0,
          receipt: {
            selectedMovePp: {
              sourceCheckpoint: "after-unable-and-move-block",
              programCounter: {
                kind: "preserve",
                sourceProgramCounter: PC,
              },
            },
          },
        });
        expect(result.rulesContext.moveResultFlags).toBe(
          upstream.rulesContext.moveResultFlags,
        );
      }
    }
  });

  it("clears exactly HITMARKER_ALLOW_NO_PP only on continuation", () => {
    const upstream = throughMovesBlock(rules(
      1,
      {
        hitMarker:
          BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP
          | BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING
          | 0x40,
      },
      { pp: [0, 4, 5, 6] },
    ));
    const result = joinBattleScriptAttackCancelerSelectedMovePp(upstream, PC);
    expect(result.kind).toBe("continue");
    expect(result.rulesContext.hitMarker).toBe(
      BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING | 0x40,
    );
    expect(result.receipt.selectedMovePp).toMatchObject({
      hitMarker: {
        before:
          BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP
          | BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING
          | 0x40,
        after: BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING | 0x40,
        addedMask: 0,
        clearedMask: BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP,
      },
    });
  });

  it("bypasses PP for prior canceler effects 1 and 2", () => {
    for (const attacker of [0, 1] as const) {
      const effectOne = throughMovesBlock(rules(
        attacker,
        { atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_TRUANT },
        { ability: BATTLE_SCRIPT_ABILITY_TRUANT, truantCounter: 1, pp: [0, 0, 0, 0] },
      ));
      const effectTwo = throughMovesBlock(rules(
        attacker,
        { atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_ASLEEP },
        { status1: 3, pp: [0, 0, 0, 0] },
      ));
      for (const [upstream, effect] of [[effectOne, 1], [effectTwo, 2]] as const) {
        const result = joinBattleScriptAttackCancelerSelectedMovePp(upstream, PC);
        expect(result).toMatchObject({
          kind: "canceler-effect",
          effect,
          receipt: {
            sourceCondition: "AtkCanceler_UnableToUseMove() != 0",
            selectedMovePp: {
              kind: "not-called",
              reason: "prior-effect-nonzero",
            },
          },
        });
        expect(result.rulesContext).toBe(upstream.rulesContext);
        expect(result.receipt.cancelerMovesBlock).toBe(upstream.receipt);
      }
    }
  });

  it("bypasses PP when Soundproof blocks the current sound move", () => {
    for (const attacker of [0, 1] as const) {
      const upstream = throughMovesBlock(rules(
        attacker,
        { currentMove: HYPER_VOICE },
        { pp: [0, 0, 0, 0] },
        { ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF },
      ));
      expect(upstream.kind).toBe("moves-block");
      const result = joinBattleScriptAttackCancelerSelectedMovePp(upstream, PC);
      expect(result).toMatchObject({
        kind: "moves-block",
        effect: 1,
        rulesContext: { moveResultFlags: 0x20 },
        receipt: {
          sourceCondition:
            "AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK, gBattlerTarget, 0, 0, 0) != 0",
          selectedMovePp: {
            kind: "not-called",
            reason: "prior-effect-nonzero",
          },
        },
      });
      expect(result.rulesContext.hitMarker).toBe(upstream.rulesContext.hitMarker);
    }
  });

  it("threads source rules, RNG accounting, and receipts without mutation", () => {
    const upstream = throughMovesBlock(rules(
      1,
      { hitMarker: BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP | 0x40 },
      { pp: [0, 4, 5, 6] },
    ));
    const before = JSON.stringify(upstream);
    const first = joinBattleScriptAttackCancelerSelectedMovePp(upstream, PC);
    const replay = joinBattleScriptAttackCancelerSelectedMovePp(upstream, PC);
    expect(replay).toEqual(first);
    expect(JSON.stringify(upstream)).toBe(before);
    expect(first.rngValue).toBe(upstream.rngValue);
    expect(first.rngCallsConsumed).toBe(upstream.rngCallsConsumed);
    expect(first.receipt.rng).toEqual({
      kind: "preserve",
      before: upstream.rngValue,
      after: upstream.rngValue,
      callsBefore: upstream.rngCallsConsumed,
      callsAfter: upstream.rngCallsConsumed,
      callsConsumed: 0,
    });
    expect(first.receipt.cancelerMovesBlock).toBe(upstream.receipt);
    expectDeepFrozen(first);
  });

  it("rejects invalid composition inputs and source PCs", () => {
    expect(() => joinBattleScriptAttackCancelerSelectedMovePp(
      null as never,
      PC,
    )).toThrow(/requires a canceler\+moves-block result/);
    const valid = throughMovesBlock(rules(0));
    for (const invalidPc of [-1, 1.5, 0x1_0000_0000, Number.NaN]) {
      expect(() => joinBattleScriptAttackCancelerSelectedMovePp(
        valid,
        invalidPc,
      )).toThrow(/source program counter must be a u32/);
    }
    for (const invalid of [
      { ...valid, kind: "moves-block", effect: 0 },
      { ...valid, kind: "continue", effect: 1 },
      { ...valid, receipt: null },
    ]) {
      expect(() => joinBattleScriptAttackCancelerSelectedMovePp(
        invalid as never,
        PC,
      )).toThrow(/requires a consistent canceler\+moves-block result/);
    }
  });
});
