import { describe, expect, it, vi } from "vitest";
import {
  advanceBattleScriptAttackCancelerImprisoned,
  scanBattleScriptImprisonedMoves,
} from "../src/engine/battleScriptActionAdmission.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
  BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
} from "../src/engine/battleScriptSourceConstants.ts";

const SOURCE_PC = 0xffff_ffff;
const GROWL = 45;
const TACKLE = 33;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([0, 0, 0, 0]),
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
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
  });
}

function rules(changes: Partial<BattleScriptRulesContextInput> = {}) {
  return createBattleScriptRulesContext({
    battlers: changes.battlers ?? [
      battler({ side: 0 }),
      battler({
        side: 1,
        moves: [GROWL, 0, 0, 0],
        status3: BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
      }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: changes.selectorRoles ?? {
      attacker: 0,
      target: 1,
      effectBattler: 1,
    },
    scriptingBattler: changes.scriptingBattler ?? 3,
    atkCancelerTracker: changes.atkCancelerTracker
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_IMPRISONED,
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

describe("source-shaped imprisoned-move predicate", () => {
  // battle_util.c:1142-1163: compare GetBattlerSide, require
  // STATUS3_IMPRISONED_OTHERS, search MAX_MON_MOVES, count per battler.
  it("scans every identity using explicit sides and all four move slots", () => {
    for (const attacker of [0, 1, 2, 3] as const) {
      for (const attackerSide of [0, 1] as const) {
        const opposing = ((attacker + 1) % 4) as 0 | 1 | 2 | 3;
        const ally = ((attacker + 2) % 4) as 0 | 1 | 2 | 3;
        const otherOpponent = ((attacker + 3) % 4) as 0 | 1 | 2 | 3;
        const battlers = [battler(), battler(), battler(), battler()];
        battlers[attacker] = battler({ side: attackerSide });
        battlers[opposing] = battler({
          side: attackerSide === 0 ? 1 : 0,
          moves: [0, TACKLE, 0, GROWL],
          status3: BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
        });
        battlers[ally] = battler({
          side: attackerSide,
          moves: [GROWL, GROWL, GROWL, GROWL],
          status3: BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
        });
        battlers[otherOpponent] = battler({
          side: attackerSide === 0 ? 1 : 0,
          moves: [GROWL, 0, 0, 0],
        });
        const scan = scanBattleScriptImprisonedMoves(
          rules({ battlers }),
          attacker,
          GROWL,
        );
        expect(scan).toMatchObject({
          attacker,
          attackerSide,
          imprisonedMovesCount: 1,
          isImprisoned: true,
        });
        expect(scan.checkedBattlers.map((entry) => entry.battler)).toEqual([0, 1, 2, 3]);
        expect(scan.checkedBattlers[opposing]).toMatchObject({
          checkedMoveSlots: [0, 1, 2, 3],
          matchingMoveSlot: 3,
          contributes: true,
        });
        expect(scan.checkedBattlers[ally].contributes).toBe(false);
        expect(scan.checkedBattlers[otherOpponent].contributes).toBe(false);
      }
    }
  });

  it("counts opposing owners rather than duplicate slots and preserves u16/empty-slot behavior", () => {
    const source = rules({
      battlers: [
        battler({ side: 0 }),
        battler({
          side: 1,
          moves: [GROWL, GROWL, GROWL, GROWL],
          status3: BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
        }),
        battler({ side: 0 }),
        battler({
          side: 1,
          moves: [0xffff, 0, 0, 0],
          status3: BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
        }),
      ],
    });
    expect(scanBattleScriptImprisonedMoves(source, 0, GROWL)).toMatchObject({
      imprisonedMovesCount: 1,
    });
    expect(scanBattleScriptImprisonedMoves(source, 0, 0xffff)).toMatchObject({
      imprisonedMovesCount: 1,
      isImprisoned: true,
    });
    // Source compares raw u16 slots, so MOVE_NONE/empty slots also match 0.
    expect(scanBattleScriptImprisonedMoves(source, 0, 0)).toMatchObject({
      imprisonedMovesCount: 1,
      isImprisoned: true,
    });
    for (const move of [-1, 0x1_0000, 1.5, Number.NaN]) {
      expect(() => scanBattleScriptImprisonedMoves(source, 0, move))
        .toThrow(/move must be a u16/);
    }
  });

  it("returns a deterministic deeply frozen receipt without mutating input", () => {
    const source = rules();
    const before = JSON.stringify(source);
    const first = scanBattleScriptImprisonedMoves(source, 0, GROWL);
    expect(scanBattleScriptImprisonedMoves(source, 0, GROWL)).toEqual(first);
    expect(JSON.stringify(source)).toBe(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.checkedBattlers)).toBe(true);
    expect(Object.isFrozen(first.checkedBattlers[1])).toBe(true);
    expect(Object.isFrozen(first.checkedBattlers[1].moves)).toBe(true);
    expect(Object.isFrozen(first.checkedBattlers[1].checkedMoveSlots)).toBe(true);
  });
});

describe("source-shaped attack-canceler imprisoned phase", () => {
  // battle_util.c:2145-2155; ProtectStruct::usedImprisonedMove is battle.h:118.
  it("owns protect/helper/script/unable/effect and advances exactly once", () => {
    for (const usedImprisonedMove of [0, 1] as const) {
      const source = rules({
        battlers: [
          battler({
            side: 0,
            usedImprisonedMove,
            status2: 0xa000_1375,
            status3: 0x8004_00c1,
            rolloutTimer: 15,
            furyCutterCounter: 255,
          }),
          battler({
            side: 1,
            moves: [0, GROWL, 0, 0],
            status3: BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
          }),
          battler({ side: 0 }),
          battler({ side: 1 }),
        ],
      });
      const result = advanceBattleScriptAttackCancelerImprisoned(source, SOURCE_PC);
      expect(result).toMatchObject({
        kind: "advance",
        reason: "imprisoned-move",
        rulesContext: {
          atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_CONFUSED,
          hitMarker: (source.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE) >>> 0,
        },
        receipt: {
          sourcePhase: "CANCELER_IMPRISONED",
          usedImprisonedMove: { before: usedImprisonedMove, after: 1 },
          cancelMultiTurnMoves: { kind: "invoked", receipt: { battler: 0 } },
          hitMarker: { addedMask: BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE },
          effect: 1,
          script: {
            kind: "handoff",
            sourceProgramCounter: SOURCE_PC,
            targetLabel: "BattleScript_MoveUsedIsImprisoned",
          },
          tracker: {
            before: 8,
            after: 9,
            sourcePhaseBefore: "CANCELER_IMPRISONED",
            sourcePhaseAfter: "CANCELER_CONFUSED",
          },
        },
      });
      expect(result.rulesContext.battlers[0]).toMatchObject({
        usedImprisonedMove: 1,
        status2: 0xa000_0005,
        status3: 0x8000_0001,
        rolloutTimer: 0,
        furyCutterCounter: 0,
      });
    }
  });

  it("preserves all owned state when no opposing imprison user matches", () => {
    const source = rules({
      battlers: [
        battler({ side: 0, usedImprisonedMove: 1 }),
        battler({
          side: 1,
          moves: [TACKLE, 0, 0, 0],
          status3: BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS,
        }),
        battler({ side: 0 }),
        battler({ side: 1 }),
      ],
      hitMarker: BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
    });
    const result = advanceBattleScriptAttackCancelerImprisoned(source, SOURCE_PC);
    expect(result).toMatchObject({
      kind: "advance",
      reason: "move-not-imprisoned",
      receipt: {
        usedImprisonedMove: { before: 1, after: 1 },
        cancelMultiTurnMoves: { kind: "not-invoked" },
        hitMarker: { addedMask: 0 },
        effect: 0,
        script: { kind: "preserve", sourceProgramCounter: SOURCE_PC },
        tracker: { before: 8, after: 9 },
      },
    });
    expect(result.rulesContext.battlers).toBe(source.battlers);
    expect(result.rulesContext.scriptingBattler).toBe(source.scriptingBattler);
  });

  it("is deterministic, deeply frozen, input-immutable, and owns no RNG", () => {
    const random = vi.spyOn(Math, "random");
    const source = rules();
    const before = JSON.stringify(source);
    const first = advanceBattleScriptAttackCancelerImprisoned(source, SOURCE_PC);
    expect(advanceBattleScriptAttackCancelerImprisoned(source, SOURCE_PC)).toEqual(first);
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
    expect(JSON.stringify(source)).toBe(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.rulesContext)).toBe(true);
    expect(Object.isFrozen(first.receipt)).toBe(true);
    if (first.kind !== "advance") throw new Error("expected imprisoned phase");
    expect(Object.isFrozen(first.receipt.imprisonedMoves)).toBe(true);
  });

  it("gates before roles and rejects missing or invalid typed source context", () => {
    for (const tracker of [0, 7, 9, 255]) {
      const source = rules({ atkCancelerTracker: tracker, selectorRoles: {} });
      expect(advanceBattleScriptAttackCancelerImprisoned(source, SOURCE_PC)).toEqual({
        kind: "not-at-source-phase",
        rulesContext: source,
        receipt: {
          sourcePhase: "CANCELER_IMPRISONED",
          tracker: { before: tracker, after: tracker },
        },
      });
    }
    expect(() => advanceBattleScriptAttackCancelerImprisoned(
      rules({ selectorRoles: {} }),
      SOURCE_PC,
    )).toThrow(/imprisoned phase requires an attacker role/);
    for (const sourcePc of [-1, 1.5, 0x1_0000_0000]) {
      expect(() => advanceBattleScriptAttackCancelerImprisoned(rules(), sourcePc))
        .toThrow(/source program counter must be a u32/);
    }
    for (const side of [-1, 2, 255, 1.5, Number.NaN]) {
      expect(() => rules({
        battlers: [
          battler({ side: side as 0 | 1 }),
          battler(),
          battler(),
          battler(),
        ],
      })).toThrow(/side must be an unsigned integer <= 1/);
    }
    for (const usedImprisonedMove of [-1, 2, 255, 1.5, Number.NaN]) {
      expect(() => rules({
        battlers: [
          battler({ usedImprisonedMove: usedImprisonedMove as 0 | 1 }),
          battler(),
          battler(),
          battler(),
        ],
      })).toThrow(/usedImprisonedMove must be an unsigned integer <= 1/);
    }
    expect(() => rules({
      battlers: [
        battler({ moves: [0, 0, 0, 0x1_0000] }),
        battler(),
        battler(),
        battler(),
      ],
    })).toThrow(/moves\[3\] must be an unsigned integer <= 65535/);
    expect(() => createBattleScriptRulesContext({
      ...rules(),
      battlers: [battler(), battler(), battler()] as never,
    })).toThrow(/exactly four indexed battlers/);
  });
});
