import { describe, expect, it } from "vitest";
import { advanceBattleScriptAttackCancelerTaunted } from "../src/engine/battleScriptActionAdmission.ts";
import {
  createBattleScriptRulesContext,
  resolveBattleScriptCurrentMovePower,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
} from "../src/engine/battleScriptSourceConstants.ts";

const SOURCE_PC = 0xfedc_ba98;
const TACKLE = 33;
const GROWL = 45;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    pp: changes.pp ?? Object.freeze([0, 0, 0, 0]),
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
    selectorRoles: changes.selectorRoles ?? { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: changes.scriptingBattler ?? 3,
    atkCancelerTracker: changes.atkCancelerTracker
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_TAUNTED,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? GROWL,
    currentMovePosition: changes.currentMovePosition ?? 0,
    moveResultFlags: changes.moveResultFlags ?? 0xa4,
    dmgMultiplier: changes.dmgMultiplier ?? 1,
    critMultiplier: changes.critMultiplier ?? 1,
    moveEffectByte: changes.moveEffectByte ?? 0,
    missType: changes.missType ?? 0,
    hitMarker: changes.hitMarker ?? 0x4000_0040,
    multiHitCounter: changes.multiHitCounter ?? 9,
  });
}

describe("source-shaped attack-canceler taunted phase", () => {
  it("derives exact u8 move power and pins both predicate clauses and timer boundaries", () => {
    expect(resolveBattleScriptCurrentMovePower(GROWL)).toBe(0);
    expect(resolveBattleScriptCurrentMovePower(TACKLE)).toBe(35);
    for (const [tauntTimer, currentMove, taken] of [
      [0, GROWL, false],
      [15, TACKLE, false],
      [15, GROWL, true],
    ] as const) {
      const source = rules({
        battlers: [battler({ tauntTimer, usedTauntedMove: 1 }), battler(), battler(), battler()],
        currentMove,
      });
      const result = advanceBattleScriptAttackCancelerTaunted(source, SOURCE_PC);
      expect(result).toMatchObject({
        kind: "advance",
        reason: taken ? "taunted-status-move" : "move-not-taunted",
        rulesContext: { atkCancelerTracker: 8 },
        receipt: {
          tauntTimer: { value: tauntTimer, isNonzero: tauntTimer !== 0 },
          movePower: { currentMove, value: currentMove === GROWL ? 0 : 35 },
          usedTauntedMove: { before: 1, after: 1 },
          effect: taken ? 1 : 0,
          tracker: { before: 7, after: 8 },
        },
      });
      if (!taken) {
        expect(result.rulesContext.battlers).toBe(source.battlers);
        expect(result.rulesContext.hitMarker).toBe(source.hitMarker);
      }
    }
  });

  it("takes in source order for both flag states and every attacker", () => {
    for (const attacker of [0, 1, 2, 3] as const) {
      for (const usedTauntedMove of [0, 1] as const) {
        const battlers = [battler(), battler(), battler(), battler()];
        battlers[attacker] = battler({
          tauntTimer: 15,
          usedTauntedMove,
          status2: 0xa000_1375,
          status3: 0x8004_00c1,
          rolloutTimer: 15,
          furyCutterCounter: 255,
        });
        const source = rules({ battlers, selectorRoles: { attacker, target: 1, effectBattler: 2 } });
        const result = advanceBattleScriptAttackCancelerTaunted(source, SOURCE_PC);
        expect(result).toMatchObject({
          kind: "advance",
          reason: "taunted-status-move",
          rulesContext: {
            hitMarker: (source.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE) >>> 0,
          },
          receipt: {
            usedTauntedMove: { before: usedTauntedMove, after: 1 },
            cancelMultiTurnMoves: { kind: "invoked", receipt: { battler: attacker } },
            script: {
              kind: "handoff",
              sourceProgramCounter: SOURCE_PC,
              targetLabel: "BattleScript_MoveUsedIsTaunted",
            },
            effect: 1,
          },
        });
        expect(result.rulesContext.battlers[attacker]).toMatchObject({
          usedTauntedMove: 1,
          status2: 0xa000_0005,
          status3: 0x8000_0001,
          rolloutTimer: 0,
          furyCutterCounter: 0,
        });
        for (const id of [0, 1, 2, 3] as const) {
          if (id !== attacker) expect(result.rulesContext.battlers[id]).toBe(source.battlers[id]);
        }
      }
    }
  });

  it("preserves presets and identities, owns no scripting battler, and deeply freezes receipts", () => {
    const source = rules({
      battlers: [battler({ tauntTimer: 1, usedTauntedMove: 1 }), battler(), battler(), battler()],
      scriptingBattler: 2,
      hitMarker: BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
    });
    const first = advanceBattleScriptAttackCancelerTaunted(source, SOURCE_PC);
    expect(advanceBattleScriptAttackCancelerTaunted(source, SOURCE_PC)).toEqual(first);
    expect(first.kind).toBe("advance");
    if (first.kind !== "advance") throw new Error("expected taunted phase");
    expect(first.rulesContext.scriptingBattler).toBe(2);
    expect(first.receipt.hitMarker.addedMask).toBe(0);
    expect(Object.keys(first.receipt).sort()).toEqual([
      "attacker", "cancelMultiTurnMoves", "effect", "hitMarker", "movePower",
      "reason", "script", "sourcePhase", "tauntTimer", "tracker", "usedTauntedMove",
    ]);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.rulesContext)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers[0])).toBe(true);
    expect(Object.isFrozen(first.receipt.movePower)).toBe(true);
  });

  it("gates before roles, advances once, and rejects invalid source widths", () => {
    for (const tracker of [0, 6, 8, 255]) {
      const source = rules({ atkCancelerTracker: tracker, selectorRoles: {} });
      expect(advanceBattleScriptAttackCancelerTaunted(source, SOURCE_PC)).toEqual({
        kind: "not-at-source-phase",
        rulesContext: source,
        receipt: {
          sourcePhase: "CANCELER_TAUNTED",
          tracker: { before: tracker, after: tracker },
        },
      });
    }
    expect(() => advanceBattleScriptAttackCancelerTaunted(
      rules({ selectorRoles: {} }), SOURCE_PC,
    )).toThrow(/taunted phase requires an attacker role/);
    for (const sourcePc of [-1, 1.5, 0x1_0000_0000]) {
      expect(() => advanceBattleScriptAttackCancelerTaunted(rules(), sourcePc))
        .toThrow(/source program counter must be a u32/);
    }
    for (const tauntTimer of [-1, 16, 255, 1.5, Number.NaN]) {
      expect(() => rules({
        battlers: [
          battler({ tauntTimer }),
          battler(),
          battler(),
          battler(),
        ],
      })).toThrow(/tauntTimer must be an unsigned integer <= 15/);
    }
    for (const usedTauntedMove of [-1, 2, 255, 1.5, Number.NaN]) {
      expect(() => rules({
        battlers: [
          battler({ usedTauntedMove: usedTauntedMove as 0 | 1 }),
          battler(),
          battler(),
          battler(),
        ],
      })).toThrow(/usedTauntedMove must be an unsigned integer <= 1/);
    }
  });
});
