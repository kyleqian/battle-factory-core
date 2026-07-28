import { describe, expect, it } from "vitest";
import { advanceBattleScriptAttackCancelerDisabled } from "../src/engine/battleScriptActionAdmission.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
  BATTLE_SCRIPT_MOVE_NONE,
} from "../src/engine/battleScriptSourceConstants.ts";

const SOURCE_PC = 0xfedc_ba98;
const TACKLE = 33;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    item: changes.item ?? 0,
    ivs: changes.ivs ?? Object.freeze({
      hp: 0, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 0,
    }),
    mimickedMoves: changes.mimickedMoves ?? 0,
    stockpileCounter: changes.stockpileCounter ?? 0,
    moves: changes.moves ?? Object.freeze([0, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([35, 0, 0, 0]),
    statStages: changes.statStages ?? Object.freeze([0, 0, 0, 0, 0, 0, 0, 0]),
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    specialStatus: changes.specialStatus ?? Object.freeze({
      restoredBattlerSprite: 0,
      physicalDmg: 0,
      specialDmg: 0,
      shellBellDmg: 0,
    }),
    substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0,
    truantCounter: changes.truantCounter ?? 0,
    rechargeTimer: changes.rechargeTimer ?? 0,
    flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? BATTLE_SCRIPT_MOVE_NONE,
    disableTimer: changes.disableTimer ?? 0,
    disableTimerStartValue: changes.disableTimerStartValue ?? 0,
    encoreTimer: changes.encoreTimer ?? 0,
    encoredMove: changes.encoredMove ?? 0,
    encoredMovePos: changes.encoredMovePos ?? 0,
    encoreTimerStartValue: changes.encoreTimerStartValue ?? 0,
    perishSongTimer: changes.perishSongTimer ?? 0,
    perishSongTimerStartValue: changes.perishSongTimerStartValue ?? 0,
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    targetNotAffected: changes.targetNotAffected ?? 0,
    flag2Unknown: changes.flag2Unknown ?? 0,
    chargingTurn: changes.chargingTurn ?? 0,
    protected: changes.protected ?? 0,
    protectUses: changes.protectUses ?? 0,
    ppNotAffectedByPressure: changes.ppNotAffectedByPressure ?? 0,
    protectPhysicalDmg: changes.protectPhysicalDmg ?? 0,
    protectPhysicalBattlerId: changes.protectPhysicalBattlerId ?? 0,
    protectSpecialDmg: changes.protectSpecialDmg ?? 0,
    protectSpecialBattlerId: changes.protectSpecialBattlerId ?? 0,
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    personality: changes.personality ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 0,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
    maxHP: changes.maxHP ?? changes.hp ?? 100,
    speed: changes.speed ?? 100,
    turnOrderNum: changes.turnOrderNum ?? 1,
    wrappedMove: changes.wrappedMove ?? 0,
    wrappedBy: changes.wrappedBy ?? 0,
    battlerPreventingEscape: changes.battlerPreventingEscape ?? 0,
    isFirstTurn: changes.isFirstTurn ?? 0,
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
    scriptingBattler: changes.scriptingBattler ?? 3,
    atkCancelerTracker: changes.atkCancelerTracker
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_DISABLED,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? TACKLE,
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

describe("source-shaped attack-canceler disabled phase", () => {
  it("pins both predicate clauses and preserves every owned field when untaken", () => {
    expect(BATTLE_SCRIPT_MOVE_NONE).toBe(0);
    expect(BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_DISABLED).toBe(6);
    expect(BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_TAUNTED).toBe(7);
    for (const [disabledMove, currentMove, matches, isNone] of [
      [0, 0, true, true],
      [0, TACKLE, false, true],
      [1, TACKLE, false, false],
      [0xffff, TACKLE, false, false],
    ] as const) {
      const source = rules({
        battlers: [
          battler({
            disabledMove,
            usedDisabledMove: 1,
            status2: 0xa000_1375,
            status3: 0x8004_00c1,
            rolloutTimer: 15,
            furyCutterCounter: 255,
          }),
          battler(),
          battler(),
          battler(),
        ],
        currentMove,
        scriptingBattler: 2,
      });
      const result = advanceBattleScriptAttackCancelerDisabled(source, SOURCE_PC);
      expect(result).toMatchObject({
        kind: "advance",
        reason: "move-not-disabled",
        rulesContext: {
          atkCancelerTracker: 7,
          scriptingBattler: 2,
          hitMarker: source.hitMarker,
        },
        receipt: {
          disabledMove: {
            value: disabledMove,
            currentMove,
            matchesCurrentMove: matches,
            isMoveNone: isNone,
          },
          usedDisabledMove: { before: 1, after: 1 },
          scriptingBattler: { before: 2, after: 2 },
          cancelMultiTurnMoves: { kind: "not-invoked" },
          effect: 0,
          script: { kind: "preserve", sourceProgramCounter: SOURCE_PC },
          tracker: {
            before: 6,
            after: 7,
            sourcePhaseBefore: "CANCELER_DISABLED",
            sourcePhaseAfter: "CANCELER_TAUNTED",
          },
        },
      });
      expect(result.rulesContext.battlers).toBe(source.battlers);
      expect(result.rulesContext.moveResultFlags).toBe(source.moveResultFlags);
      expect(result.rulesContext.multiHitCounter).toBe(source.multiHitCounter);
    }
  });

  it("takes the exact branch for both flag states and every attacker id", () => {
    for (const attacker of [0, 1, 2, 3] as const) {
      for (const usedDisabledMove of [0, 1] as const) {
        const battlers = [battler(), battler(), battler(), battler()];
        battlers[attacker] = battler({
          disabledMove: TACKLE,
          usedDisabledMove,
          status1: 0x20,
          status2: 0xa000_1375,
          status3: 0x8004_00c1,
          rolloutTimer: 15,
          furyCutterCounter: 255,
          truantCounter: 1,
          rechargeTimer: 255,
          flinchImmobility: 1,
        });
        const source = rules({
          battlers,
          selectorRoles: { attacker, target: 1, effectBattler: 2 },
          scriptingBattler: ((attacker + 1) % 4) as 0 | 1 | 2 | 3,
        });
        const result = advanceBattleScriptAttackCancelerDisabled(source, SOURCE_PC);
        expect(result.kind).toBe("advance");
        if (result.kind !== "advance") throw new Error("expected disabled phase");
        expect(result.reason).toBe("disabled-move");
        expect(result.rulesContext.scriptingBattler).toBe(attacker);
        expect(result.rulesContext.battlers[attacker]).toMatchObject({
          disabledMove: TACKLE,
          usedDisabledMove: 1,
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
        expect(result.receipt).toMatchObject({
          usedDisabledMove: { before: usedDisabledMove, after: 1 },
          scriptingBattler: {
            before: source.scriptingBattler,
            after: attacker,
          },
          cancelMultiTurnMoves: {
            kind: "invoked",
            receipt: { battler: attacker },
          },
          effect: 1,
          script: {
            kind: "handoff",
            sourceProgramCounter: SOURCE_PC,
            targetLabel: "BattleScript_MoveUsedIsDisabled",
          },
          tracker: { before: 6, after: 7 },
        });
        expect(Object.keys(result.receipt).sort()).toEqual([
          "attacker",
          "cancelMultiTurnMoves",
          "disabledMove",
          "effect",
          "hitMarker",
          "reason",
          "script",
          "scriptingBattler",
          "sourcePhase",
          "tracker",
          "usedDisabledMove",
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

  it("preserves pre-set helper, marker, flag, and selector identities and deeply freezes output", () => {
    const source = rules({
      battlers: [
        battler({ disabledMove: TACKLE, usedDisabledMove: 1 }),
        battler(),
        battler(),
        battler(),
      ],
      scriptingBattler: 0,
      hitMarker: BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
    });
    const first = advanceBattleScriptAttackCancelerDisabled(source, SOURCE_PC);
    expect(advanceBattleScriptAttackCancelerDisabled(source, SOURCE_PC)).toEqual(first);
    expect(first.kind).toBe("advance");
    if (first.kind !== "advance") throw new Error("expected disabled phase");
    expect(first.receipt.hitMarker.addedMask).toBe(0);
    expect(first.receipt.usedDisabledMove).toEqual({ before: 1, after: 1 });
    expect(first.receipt.scriptingBattler).toEqual({ before: 0, after: 0 });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.rulesContext)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers[0])).toBe(true);
    expect(Object.isFrozen(first.receipt)).toBe(true);
    expect(Object.isFrozen(first.receipt.disabledMove)).toBe(true);
    expect(Object.isFrozen(first.receipt.usedDisabledMove)).toBe(true);
    expect(Object.isFrozen(first.receipt.scriptingBattler)).toBe(true);
  });

  it("gates before roles and rejects missing roles and invalid source widths", () => {
    for (const tracker of [0, 1, 2, 3, 4, 5, 7, 255]) {
      const source = rules({ atkCancelerTracker: tracker, selectorRoles: {} });
      const result = advanceBattleScriptAttackCancelerDisabled(source, SOURCE_PC);
      expect(result).toEqual({
        kind: "not-at-source-phase",
        rulesContext: source,
        receipt: {
          sourcePhase: "CANCELER_DISABLED",
          tracker: { before: tracker, after: tracker },
        },
      });
      expect(result.rulesContext).toBe(source);
    }
    expect(() => advanceBattleScriptAttackCancelerDisabled(
      rules({ selectorRoles: {} }),
      SOURCE_PC,
    )).toThrow(/disabled phase requires an attacker role/);
    for (const sourcePc of [-1, 1.5, 0x1_0000_0000]) {
      expect(() => advanceBattleScriptAttackCancelerDisabled(
        rules(),
        sourcePc,
      )).toThrow(/source program counter must be a u32/);
    }
  });

  it("accepts full u16 disabledMove boundaries and rejects wider or fractional fields", () => {
    for (const disabledMove of [0, 1, 0xff, 0x100, 0xffff]) {
      expect(rules({
        battlers: [
          battler({ disabledMove }),
          battler(),
          battler(),
          battler(),
        ],
      }).battlers[0].disabledMove).toBe(disabledMove);
    }
    for (const disabledMove of [-1, 0x1_0000, 1.5, Number.NaN]) {
      expect(() => rules({
        battlers: [
          battler({ disabledMove }),
          battler(),
          battler(),
          battler(),
        ],
      })).toThrow(/disabledMove must be an unsigned integer <= 65535/);
    }
    for (const usedDisabledMove of [-1, 2, 7, 255, 1.5, Number.NaN]) {
      expect(() => rules({
        battlers: [
          battler({ usedDisabledMove: usedDisabledMove as 0 | 1 }),
          battler(),
          battler(),
          battler(),
        ],
      })).toThrow(/usedDisabledMove must be an unsigned integer <= 1/);
    }
    expect(() => createBattleScriptRulesContext({
      ...rules(),
      scriptingBattler: undefined as unknown as 0,
    })).toThrow(/scriptingBattler must be a battler id 0..3/);
    for (const scriptingBattler of [-1, 4, 255, 1.5]) {
      expect(() => createBattleScriptRulesContext({
        ...rules(),
        scriptingBattler: scriptingBattler as 0,
      })).toThrow(/scriptingBattler must be a battler id 0..3/);
    }
  });
});
