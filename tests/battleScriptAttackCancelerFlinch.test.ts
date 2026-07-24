import { describe, expect, it } from "vitest";
import { advanceBattleScriptAttackCancelerFlinch } from "../src/engine/battleScriptActionAdmission.ts";
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
const FLINCHED = BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
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
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_FLINCH,
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

describe("source-shaped attack-canceler flinch phase", () => {
  it("pins source constants and preserves every owned field when flinch is unset", () => {
    expect(FLINCHED).toBe(1 << 3);
    expect(BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_DISABLED).toBe(6);
    const source = rules({
      battlers: [
        battler({
          status2: 0x8000_0005,
          status3: 0x8004_00c1,
          rolloutTimer: 15,
          furyCutterCounter: 255,
          flinchImmobility: 1,
        }),
        battler(),
        battler(),
        battler(),
      ],
      hitMarker: 0x4000_0040,
      moveResultFlags: 0xa4,
    });
    const result = advanceBattleScriptAttackCancelerFlinch(source, SOURCE_PC);
    expect(result).toMatchObject({
      kind: "advance",
      reason: "not-flinched",
      receipt: {
        status2: { before: 0x8000_0005, after: 0x8000_0005 },
        flinchImmobility: { before: 1, after: 1 },
        cancelMultiTurnMoves: { kind: "not-invoked" },
        hitMarker: { before: 0x4000_0040, after: 0x4000_0040 },
        effect: 0,
        script: { kind: "preserve", sourceProgramCounter: SOURCE_PC },
        tracker: {
          before: 5,
          after: 6,
          sourcePhaseBefore: "CANCELER_FLINCH",
          sourcePhaseAfter: "CANCELER_DISABLED",
        },
      },
    });
    expect(result.rulesContext.battlers).toBe(source.battlers);
    expect(result.rulesContext.moveResultFlags).toBe(source.moveResultFlags);
  });

  it("exhaustively handles both one-bit flag values for every attacker id", () => {
    for (const attacker of [0, 1, 2, 3] as const) {
      for (const flinchImmobility of [0, 1] as const) {
        const battlers = [battler(), battler(), battler(), battler()];
        battlers[attacker] = battler({
          status1: 0x20,
          status2: (0xa000_1375 | FLINCHED) >>> 0,
          status3: 0x8004_00c1,
          rolloutTimer: 15,
          furyCutterCounter: 255,
          truantCounter: 1,
          rechargeTimer: 255,
          flinchImmobility,
        });
        const source = rules({
          battlers,
          selectorRoles: { attacker, target: 0, effectBattler: 3 },
          hitMarker: 0x4000_0040,
          moveResultFlags: 0xa4,
          multiHitCounter: 9,
        });
        const result = advanceBattleScriptAttackCancelerFlinch(source, SOURCE_PC);
        expect(result.kind).toBe("advance");
        if (result.kind !== "advance") throw new Error("expected flinch phase");
        expect(result.rulesContext.battlers[attacker]).toMatchObject({
          status1: 0x20,
          status2: 0xa000_0005,
          status3: 0x8000_0001,
          rolloutTimer: 0,
          furyCutterCounter: 0,
          truantCounter: 1,
          rechargeTimer: 255,
          flinchImmobility: 1,
        });
        expect(result.rulesContext.hitMarker).toBe(
          (source.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE) >>> 0,
        );
        expect(result.rulesContext.moveResultFlags).toBe(source.moveResultFlags);
        expect(result.rulesContext.multiHitCounter).toBe(source.multiHitCounter);
        expect(result.receipt).toMatchObject({
          reason: "flinched",
          status2: { clearedMask: FLINCHED },
          flinchImmobility: { before: flinchImmobility, after: 1 },
          cancelMultiTurnMoves: {
            kind: "invoked",
            receipt: {
              battler: attacker,
              status2: {
                before: (0xa000_1375 & ~FLINCHED) >>> 0,
                after: 0xa000_0005,
              },
            },
          },
          effect: 1,
          script: {
            kind: "handoff",
            sourceProgramCounter: SOURCE_PC,
            targetLabel: "BattleScript_MoveUsedFlinched",
          },
          tracker: { before: 5, after: 6 },
        });
        expect(Object.keys(result.receipt).sort()).toEqual([
          "attacker",
          "cancelMultiTurnMoves",
          "effect",
          "flinchImmobility",
          "hitMarker",
          "reason",
          "script",
          "sourcePhase",
          "status2",
          "tracker",
        ]);
        for (const id of [0, 1, 2, 3] as const) {
          if (id !== attacker) {
            expect(result.rulesContext.battlers[id]).toBe(source.battlers[id]);
          }
        }
        expect(source.battlers[attacker]).toStrictEqual(battlers[attacker]);
      }
    }
  });

  it("is deterministic, deeply frozen, and keeps identities when helper fields are clear", () => {
    const source = rules({
      battlers: [
        battler({ status2: FLINCHED, flinchImmobility: 1 }),
        battler(),
        battler(),
        battler(),
      ],
      hitMarker: BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
    });
    const first = advanceBattleScriptAttackCancelerFlinch(source, SOURCE_PC);
    expect(advanceBattleScriptAttackCancelerFlinch(source, SOURCE_PC)).toEqual(first);
    expect(first.kind).toBe("advance");
    if (first.kind !== "advance") throw new Error("expected flinch phase");
    expect(first.receipt.hitMarker.addedMask).toBe(0);
    expect(first.receipt.flinchImmobility).toEqual({ before: 1, after: 1 });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.rulesContext)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers[0])).toBe(true);
    expect(Object.isFrozen(first.receipt)).toBe(true);
    expect(Object.isFrozen(first.receipt.status2)).toBe(true);
    expect(Object.isFrozen(first.receipt.flinchImmobility)).toBe(true);
    expect(Object.isFrozen(first.receipt.cancelMultiTurnMoves)).toBe(true);
    if (first.receipt.cancelMultiTurnMoves.kind === "invoked") {
      expect(Object.isFrozen(first.receipt.cancelMultiTurnMoves.receipt)).toBe(true);
    }
  });

  it("gates before attacker ownership and validates flag and source PC widths", () => {
    for (const tracker of [0, 1, 2, 3, 4, 6, 255]) {
      const source = rules({ atkCancelerTracker: tracker, selectorRoles: {} });
      const result = advanceBattleScriptAttackCancelerFlinch(source, SOURCE_PC);
      expect(result).toEqual({
        kind: "not-at-source-phase",
        rulesContext: source,
        receipt: {
          sourcePhase: "CANCELER_FLINCH",
          tracker: { before: tracker, after: tracker },
        },
      });
      expect(result.rulesContext).toBe(source);
    }
    expect(() => advanceBattleScriptAttackCancelerFlinch(
      rules({ selectorRoles: {} }),
      SOURCE_PC,
    )).toThrow(/flinch phase requires an attacker role/);
    for (const flinchImmobility of [-1, 2, 7, 255, 1.5, Number.NaN]) {
      expect(() => rules({
        battlers: [
          battler({ flinchImmobility: flinchImmobility as 0 | 1 }),
          battler(),
          battler(),
          battler(),
        ],
      })).toThrow(/flinchImmobility must be an unsigned integer <= 1/);
    }
    for (const sourcePc of [-1, 1.5, 0x1_0000_0000]) {
      expect(() => advanceBattleScriptAttackCancelerFlinch(
        rules(),
        sourcePc,
      )).toThrow(/source program counter must be a u32/);
    }
  });
});
