import { describe, expect, it } from "vitest";
import { advanceBattleScriptAttackCancelerTruant } from "../src/engine/battleScriptActionAdmission.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ABILITY_TRUANT,
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
  BATTLE_SCRIPT_MOVE_RESULT_MISSED,
} from "../src/engine/battleScriptSourceConstants.ts";

const SOURCE_PC = 0x1234_5678;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([0, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([35, 0, 0, 0]),
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
  });
}

function rules(changes: Partial<BattleScriptRulesContextInput> = {}) {
  return createBattleScriptRulesContext({
    battlers: changes.battlers ?? [battler(), battler(), battler(), battler()],
    selectorRoles: changes.selectorRoles ?? {
      attacker: 0,
      target: 1,
      effectBattler: 1,
    },
    scriptingBattler: changes.scriptingBattler ?? 0,
    atkCancelerTracker: changes.atkCancelerTracker
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_TRUANT,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? 33,
    currentMovePosition: changes.currentMovePosition ?? 0,
    moveResultFlags: changes.moveResultFlags ?? 0,
    dmgMultiplier: changes.dmgMultiplier ?? 1,
    critMultiplier: changes.critMultiplier ?? 1,
    moveEffectByte: changes.moveEffectByte ?? 0,
    missType: changes.missType ?? 0,
    hitMarker: changes.hitMarker ?? 0,
    multiHitCounter: changes.multiHitCounter ?? 0,
  });
}

describe("source-shaped attack-canceler Truant phase", () => {
  it("pins constants and preserves every field when ability is not Truant", () => {
    expect(BATTLE_SCRIPT_ABILITY_TRUANT).toBe(54);
    expect(BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_RECHARGE).toBe(4);
    const source = rules({ moveResultFlags: 0xa4, hitMarker: 0x4000_0040 });
    const result = advanceBattleScriptAttackCancelerTruant(source, SOURCE_PC);
    expect(result).toMatchObject({
      kind: "advance",
      reason: "not-truant",
      receipt: {
        ability: { value: 0, sourceConstant: "ABILITY_TRUANT", matches: false },
        truantCounter: { value: 0, isNonzero: false },
        cancelMultiTurnMoves: { kind: "not-invoked" },
        effect: 0,
        script: { kind: "preserve", sourceProgramCounter: SOURCE_PC },
        multistringChooser: { kind: "preserve" },
        tracker: {
          before: 3,
          after: 4,
          sourcePhaseBefore: "CANCELER_TRUANT",
          sourcePhaseAfter: "CANCELER_RECHARGE",
        },
      },
    });
    expect(result.rulesContext.battlers).toBe(source.battlers);
    expect(result.rulesContext.hitMarker).toBe(source.hitMarker);
    expect(result.rulesContext.moveResultFlags).toBe(source.moveResultFlags);
  });

  it("does not loaf when Truant's source-width counter is zero", () => {
    const source = rules({
      battlers: [
        battler({ ability: BATTLE_SCRIPT_ABILITY_TRUANT, truantCounter: 0 }),
        battler(),
        battler(),
        battler(),
      ],
    });
    const result = advanceBattleScriptAttackCancelerTruant(source, SOURCE_PC);
    expect(result).toMatchObject({
      kind: "advance",
      reason: "truant-idle-turn",
      receipt: {
        cancelMultiTurnMoves: { kind: "not-invoked" },
        effect: 0,
      },
    });
    expect(result.rulesContext.battlers).toBe(source.battlers);
  });

  it("exhaustively applies the one-bit counter domain for every attacker id", () => {
    for (const attacker of [0, 1, 2, 3] as const) {
      for (const truantCounter of [0, 1] as const) {
        const battlers = [battler(), battler(), battler(), battler()];
        battlers[attacker] = battler({
          ability: BATTLE_SCRIPT_ABILITY_TRUANT,
          truantCounter,
          status2: 0xa000_1375,
          status3: 0x8004_00c1,
          rolloutTimer: 15,
          furyCutterCounter: 255,
        });
        const source = rules({
          battlers,
          selectorRoles: { attacker, target: 0, effectBattler: 3 },
          hitMarker: 0x4000_0040,
          moveResultFlags: 0xa4,
        });
        const result = advanceBattleScriptAttackCancelerTruant(source, SOURCE_PC);
        expect(result.kind).toBe("advance");
        if (result.kind !== "advance") throw new Error("expected Truant phase");
        expect(result.reason).toBe(
          truantCounter === 1 ? "truant-active" : "truant-idle-turn",
        );
        if (truantCounter === 0) {
          expect(result.rulesContext.battlers).toBe(source.battlers);
          expect(result.rulesContext.hitMarker).toBe(source.hitMarker);
          expect(result.rulesContext.moveResultFlags).toBe(source.moveResultFlags);
          expect(result.receipt).toMatchObject({
            effect: 0,
            script: { kind: "preserve", sourceProgramCounter: SOURCE_PC },
            multistringChooser: { kind: "preserve" },
            cancelMultiTurnMoves: { kind: "not-invoked" },
          });
          continue;
        }
        expect(result.rulesContext.battlers[attacker]).toMatchObject({
          ability: BATTLE_SCRIPT_ABILITY_TRUANT,
          truantCounter,
          status2: 0xa000_0005,
          status3: 0x8000_0001,
          rolloutTimer: 0,
          furyCutterCounter: 0,
        });
        expect(result.rulesContext.hitMarker).toBe(
          (source.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE) >>> 0,
        );
        expect(result.rulesContext.moveResultFlags).toBe(
          source.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED,
        );
        expect(result.receipt).toMatchObject({
          effect: 1,
          script: {
            kind: "handoff",
            sourceProgramCounter: SOURCE_PC,
            targetLabel: "BattleScript_MoveUsedLoafingAround",
          },
          multistringChooser: {
            kind: "set",
            sourceConstant: "B_MSG_LOAFING",
            value: 0,
          },
          cancelMultiTurnMoves: {
            kind: "invoked",
            receipt: { battler: attacker },
          },
        });
        for (const id of [0, 1, 2, 3] as const) {
          if (id !== attacker) {
            expect(result.rulesContext.battlers[id]).toBe(source.battlers[id]);
          }
        }
      }
    }
  });

  it("ORs masks idempotently and preserves helper identities when already clear", () => {
    const source = rules({
      battlers: [
        battler({
          ability: BATTLE_SCRIPT_ABILITY_TRUANT,
          truantCounter: 1,
        }),
        battler(),
        battler(),
        battler(),
      ],
      hitMarker: BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
      moveResultFlags: BATTLE_SCRIPT_MOVE_RESULT_MISSED,
    });
    const first = advanceBattleScriptAttackCancelerTruant(source, SOURCE_PC);
    const replay = advanceBattleScriptAttackCancelerTruant(source, SOURCE_PC);
    expect(replay).toEqual(first);
    expect(first.kind).toBe("advance");
    if (first.kind !== "advance") throw new Error("expected Truant phase");
    expect(first.rulesContext.battlers).toBe(source.battlers);
    expect(first.receipt.hitMarker.addedMask).toBe(0);
    expect(first.receipt.moveResultFlags.addedMask).toBe(0);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.receipt)).toBe(true);
    expect(Object.isFrozen(first.receipt.cancelMultiTurnMoves)).toBe(true);
    if (first.receipt.cancelMultiTurnMoves.kind === "invoked") {
      expect(Object.isFrozen(first.receipt.cancelMultiTurnMoves.receipt)).toBe(true);
    }
  });

  it("gates before attacker ownership and validates roles, counters, and source PC widths", () => {
    for (const tracker of [0, 1, 2, 4, 255]) {
      const source = rules({ atkCancelerTracker: tracker, selectorRoles: {} });
      expect(advanceBattleScriptAttackCancelerTruant(source, SOURCE_PC)).toEqual({
        kind: "not-at-source-phase",
        rulesContext: source,
        receipt: {
          sourcePhase: "CANCELER_TRUANT",
          tracker: { before: tracker, after: tracker },
        },
      });
    }
    expect(() => advanceBattleScriptAttackCancelerTruant(
      rules({ selectorRoles: {} }),
      SOURCE_PC,
    )).toThrow(/truant phase requires an attacker role/);
    for (const truantCounter of [-1, 2, 7, 255, 1.5, Number.NaN]) {
      expect(() => rules({
        battlers: [
          battler({ truantCounter: truantCounter as 0 | 1 }),
          battler(),
          battler(),
          battler(),
        ],
      })).toThrow(/truantCounter must be an unsigned integer <= 1/);
    }
    for (const sourcePc of [-1, 1.5, 0x1_0000_0000]) {
      expect(() => advanceBattleScriptAttackCancelerTruant(
        rules(),
        sourcePc,
      )).toThrow(/source program counter must be a u32/);
    }
  });
});
