import { describe, expect, it } from "vitest";
import { advanceBattleScriptAttackCancelerRecharge } from "../src/engine/battleScriptActionAdmission.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "../src/engine/battleScriptSourceConstants.ts";

const SOURCE_PC = 0x1234_5678;
const RECHARGE = BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE;

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
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_RECHARGE,
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

describe("source-shaped attack-canceler recharge phase", () => {
  it("pins source constants and preserves fields when recharge is unset", () => {
    expect(RECHARGE).toBe(1 << 22);
    expect(BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_FLINCH).toBe(5);
    const source = rules({
      battlers: [battler({ status2: 0x8000_0005, rechargeTimer: 255 }), battler(), battler(), battler()],
      hitMarker: 0x40,
      moveResultFlags: 0xa4,
    });
    const result = advanceBattleScriptAttackCancelerRecharge(source, SOURCE_PC);
    expect(result).toMatchObject({
      kind: "advance",
      reason: "not-recharging",
      receipt: {
        status2: { before: 0x8000_0005, after: 0x8000_0005 },
        rechargeTimer: { before: 255, after: 255 },
        cancelMultiTurnMoves: { kind: "not-invoked" },
        hitMarker: { before: 0x40, after: 0x40 },
        effect: 0,
        script: { kind: "preserve", sourceProgramCounter: SOURCE_PC },
        message: { kind: "preserve" },
        tracker: {
          before: 4,
          after: 5,
          sourcePhaseBefore: "CANCELER_RECHARGE",
          sourcePhaseAfter: "CANCELER_FLINCH",
        },
      },
    });
    expect(result.rulesContext.battlers).toBe(source.battlers);
    expect(result.rulesContext.moveResultFlags).toBe(source.moveResultFlags);
  });

  it("applies the taken branch for every attacker and u8 timer boundary", () => {
    for (const attacker of [0, 1, 2, 3] as const) {
      for (const rechargeTimer of [0, 255]) {
        const battlers = [battler(), battler(), battler(), battler()];
        battlers[attacker] = battler({
          status2: (0xa000_1375 | RECHARGE) >>> 0,
          status3: 0x8004_00c1,
          rechargeTimer,
          rolloutTimer: 15,
          furyCutterCounter: 255,
        });
        const source = rules({
          battlers,
          selectorRoles: { attacker, target: 0, effectBattler: 3 },
          hitMarker: 0x4000_0040,
          moveResultFlags: 0xa4,
        });
        const result = advanceBattleScriptAttackCancelerRecharge(source, SOURCE_PC);
        expect(result.kind).toBe("advance");
        if (result.kind !== "advance") throw new Error("expected recharge phase");
        expect(result.rulesContext.battlers[attacker]).toMatchObject({
          status2: 0xa000_0005,
          status3: 0x8000_0001,
          rechargeTimer: 0,
          rolloutTimer: 0,
          furyCutterCounter: 0,
        });
        expect(result.rulesContext.hitMarker).toBe(
          (source.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE) >>> 0,
        );
        expect(result.rulesContext.moveResultFlags).toBe(source.moveResultFlags);
        expect(result.receipt).toMatchObject({
          reason: "must-recharge",
          status2: { clearedMask: RECHARGE },
          rechargeTimer: { before: rechargeTimer, after: 0 },
          cancelMultiTurnMoves: {
            kind: "invoked",
            receipt: { battler: attacker },
          },
          effect: 1,
          script: {
            kind: "handoff",
            sourceProgramCounter: SOURCE_PC,
            targetLabel: "BattleScript_MoveUsedMustRecharge",
          },
          message: {
            kind: "script-owned",
            sourceConstant: "STRINGID_PKMNMUSTRECHARGE",
            value: 130,
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

  it("is deterministic, frozen, and preserves helper identities when already clear", () => {
    const source = rules({
      battlers: [battler({ status2: RECHARGE, rechargeTimer: 0 }), battler(), battler(), battler()],
      hitMarker: BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
    });
    const first = advanceBattleScriptAttackCancelerRecharge(source, SOURCE_PC);
    expect(advanceBattleScriptAttackCancelerRecharge(source, SOURCE_PC)).toEqual(first);
    expect(first.kind).toBe("advance");
    if (first.kind !== "advance") throw new Error("expected recharge phase");
    expect(first.receipt.hitMarker.addedMask).toBe(0);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.receipt)).toBe(true);
    expect(Object.isFrozen(first.receipt.rechargeTimer)).toBe(true);
    expect(Object.isFrozen(first.receipt.cancelMultiTurnMoves)).toBe(true);
    if (first.receipt.cancelMultiTurnMoves.kind === "invoked") {
      expect(Object.isFrozen(first.receipt.cancelMultiTurnMoves.receipt)).toBe(true);
    }
  });

  it("gates before attacker ownership and validates timer and source PC widths", () => {
    for (const tracker of [0, 1, 2, 3, 5, 255]) {
      const source = rules({ atkCancelerTracker: tracker, selectorRoles: {} });
      expect(advanceBattleScriptAttackCancelerRecharge(source, SOURCE_PC)).toEqual({
        kind: "not-at-source-phase",
        rulesContext: source,
        receipt: {
          sourcePhase: "CANCELER_RECHARGE",
          tracker: { before: tracker, after: tracker },
        },
      });
    }
    expect(() => advanceBattleScriptAttackCancelerRecharge(
      rules({ selectorRoles: {} }),
      SOURCE_PC,
    )).toThrow(/recharge phase requires an attacker role/);
    for (const rechargeTimer of [-1, 256, 1.5, Number.NaN]) {
      expect(() => rules({
        battlers: [
          battler({ rechargeTimer }),
          battler(),
          battler(),
          battler(),
        ],
      })).toThrow(/rechargeTimer must be an unsigned integer <= 255/);
    }
    for (const sourcePc of [-1, 1.5, 0x1_0000_0000]) {
      expect(() => advanceBattleScriptAttackCancelerRecharge(
        rules(),
        sourcePc,
      )).toThrow(/source program counter must be a u32/);
    }
  });
});
