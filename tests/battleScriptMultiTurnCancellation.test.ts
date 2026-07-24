import { describe, expect, it } from "vitest";
import {
  BATTLE_SCRIPT_CANCEL_MULTI_TURN_STATUS2_MASK,
  cancelBattleScriptMultiTurnMoves,
} from "../src/engine/battleScriptMultiTurnCancellation.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
} from "../src/engine/battleScriptSourceConstants.ts";

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    pp: changes.pp ?? Object.freeze([10, 20, 30, 40]),
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0,
    truantCounter: changes.truantCounter ?? 0,
  });
}

function contextInput(
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContextInput {
  return {
    battlers: changes.battlers ?? [battler(), battler(), battler(), battler()],
    selectorRoles: changes.selectorRoles ?? { attacker: 0, effectBattler: 1 },
    atkCancelerTracker: changes.atkCancelerTracker ?? 0,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? 92,
    currentMovePosition: changes.currentMovePosition ?? 0,
    moveResultFlags: changes.moveResultFlags ?? 0,
    dmgMultiplier: changes.dmgMultiplier ?? 1,
    critMultiplier: changes.critMultiplier ?? 1,
    moveEffectByte: changes.moveEffectByte ?? 0,
    missType: changes.missType ?? 0,
    hitMarker: changes.hitMarker ?? 0,
    multiHitCounter: changes.multiHitCounter ?? 0,
  };
}

function rules(changes: Partial<BattleScriptRulesContextInput> = {}) {
  return createBattleScriptRulesContext(contextInput(changes));
}

describe("source CancelMultiTurnMoves rules helper", () => {
  it("pins every individual source mask and their exact combination", () => {
    expect(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR).toBe(0x70);
    expect(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_BIDE).toBe(0x300);
    expect(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_LOCK_CONFUSE).toBe(0xc00);
    expect(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS).toBe(0x1000);
    expect(BATTLE_SCRIPT_CANCEL_MULTI_TURN_STATUS2_MASK).toBe(0x1f70);
    expect(BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE).toBe(0x0004_00c0);
  });

  for (const [name, mask] of Object.entries({
    STATUS2_MULTIPLETURNS: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
    STATUS2_LOCK_CONFUSE: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_LOCK_CONFUSE,
    STATUS2_UPROAR: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR,
    STATUS2_BIDE: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_BIDE,
  })) {
    it(`clears only ${name}`, () => {
      const preserved = 0x8200_008f;
      const source = rules({
        battlers: [battler({ status2: (preserved | mask) >>> 0 }), battler(), battler(), battler()],
      });
      const result = cancelBattleScriptMultiTurnMoves(source, 0);
      expect(result.receipt.status2).toEqual({
        before: (preserved | mask) >>> 0,
        after: (preserved & ~BATTLE_SCRIPT_CANCEL_MULTI_TURN_STATUS2_MASK) >>> 0,
      });
    });
  }

  it("clears every non-empty combination of the four status2 masks", () => {
    const masks = [
      BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
      BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_LOCK_CONFUSE,
      BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR,
      BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_BIDE,
    ];
    for (let selection = 1; selection < 1 << masks.length; selection += 1) {
      const selectedMask = masks.reduce((combined, mask, index) => (
        selection & (1 << index) ? combined | mask : combined
      ), 0) >>> 0;
      const source = rules({
        battlers: [battler({ status2: selectedMask }), battler(), battler(), battler()],
      });
      const result = cancelBattleScriptMultiTurnMoves(source, 0);
      expect(result.receipt.status2).toEqual({
        before: selectedMask,
        after: 0,
      });
    }
  });

  it("clears each semi-invulnerable status3 constituent and their combination", () => {
    for (const status3 of [1 << 6, 1 << 7, 1 << 18, BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE]) {
      const source = rules({
        battlers: [battler({ status3 }), battler(), battler(), battler()],
      });
      expect(cancelBattleScriptMultiTurnMoves(source, 0).receipt.status3).toEqual({
        before: status3,
        after: 0,
      });
    }
  });

  it("clears all status2 masks, only semi-invulnerable status3, and both counters", () => {
    const source = rules({
      battlers: [
        battler(),
        battler(),
        battler({
          hp: 77,
          pp: [1, 2, 3, 4],
          status1: 0x1234_5678,
          status2: 0xc20f_1fff,
          status3: 0xa5a5_a5a5,
          substituteHP: 31,
          rolloutTimer: 15,
          furyCutterCounter: 255,
        }),
        battler(),
      ],
      selectorRoles: { attacker: 1, effectBattler: 3 },
      atkCancelerTracker: 9,
      battleOutcome: 4,
      currentMove: 205,
      currentMovePosition: 3,
      moveResultFlags: 0xa5,
      dmgMultiplier: 7,
      critMultiplier: 2,
      moveEffectByte: 0xcc,
      missType: 6,
      hitMarker: 0xfeed_beef,
      multiHitCounter: 8,
    });
    const result = cancelBattleScriptMultiTurnMoves(source, 2);
    expect(result).toEqual({
      rulesContext: {
        ...source,
        battlers: [
          source.battlers[0],
          source.battlers[1],
          {
            ...source.battlers[2],
            status2: (source.battlers[2].status2 & ~0x1f70) >>> 0,
            status3: (source.battlers[2].status3 & ~0x0004_00c0) >>> 0,
            rolloutTimer: 0,
            furyCutterCounter: 0,
          },
          source.battlers[3],
        ],
      },
      receipt: {
        battler: 2,
        status2: {
          before: source.battlers[2].status2,
          after: (source.battlers[2].status2 & ~0x1f70) >>> 0,
        },
        status3: {
          before: source.battlers[2].status3,
          after: (source.battlers[2].status3 & ~0x0004_00c0) >>> 0,
        },
        rolloutTimer: { before: 15, after: 0 },
        furyCutterCounter: { before: 255, after: 0 },
      },
    });
    expect(result.rulesContext.battlers[0]).toBe(source.battlers[0]);
    expect(result.rulesContext.battlers[1]).toBe(source.battlers[1]);
    expect(result.rulesContext.battlers[2]).not.toBe(source.battlers[2]);
    expect(result.rulesContext.battlers[2].pp).toBe(source.battlers[2].pp);
    expect(result.rulesContext.battlers[3]).toBe(source.battlers[3]);
    expect(result.rulesContext.selectorRoles).toBe(source.selectorRoles);
  });

  it("selects the requested battler independently of attacker/effect roles", () => {
    const battlers = [0, 1, 2, 3].map((index) => battler({
      status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS | index,
      rolloutTimer: index + 1,
      furyCutterCounter: index + 2,
    }));
    for (const selected of [0, 1, 2, 3] as const) {
      const source = rules({
        battlers,
        selectorRoles: { attacker: 3, effectBattler: 0 },
      });
      const result = cancelBattleScriptMultiTurnMoves(source, selected);
      for (const index of [0, 1, 2, 3] as const) {
        expect(result.rulesContext.battlers[index]).toBe(
          index === selected ? result.rulesContext.battlers[selected] : source.battlers[index],
        );
        if (index !== selected) {
          expect(result.rulesContext.battlers[index]).toBe(source.battlers[index]);
        }
      }
      expect(result.receipt.battler).toBe(selected);
      expect(result.rulesContext.battlers[selected]).not.toBe(source.battlers[selected]);
    }
  });

  it("preserves context and nested identity when there is nothing to clear", () => {
    const source = rules({
      battlers: [battler({ status2: 0x8000_008f, status3: 0x6000_0108 }), battler(), battler(), battler()],
    });
    const result = cancelBattleScriptMultiTurnMoves(source, 0);
    expect(result.rulesContext).toBe(source);
    expect(result.rulesContext.battlers).toBe(source.battlers);
    expect(result.rulesContext.battlers[0]).toBe(source.battlers[0]);
  });

  it("is deterministic and deeply freezes the typed receipt and replacement", () => {
    const source = rules({
      battlers: [battler({ status2: 0x1f70, status3: 0x400c0, rolloutTimer: 5, furyCutterCounter: 4 }), battler(), battler(), battler()],
    });
    const first = cancelBattleScriptMultiTurnMoves(source, 0);
    expect(cancelBattleScriptMultiTurnMoves(source, 0)).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.receipt)).toBe(true);
    expect(Object.isFrozen(first.receipt.status2)).toBe(true);
    expect(Object.isFrozen(first.receipt.status3)).toBe(true);
    expect(Object.isFrozen(first.receipt.rolloutTimer)).toBe(true);
    expect(Object.isFrozen(first.receipt.furyCutterCounter)).toBe(true);
    expect(Object.isFrozen(first.rulesContext)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers[0])).toBe(true);
  });

  it("rejects invalid battler ids and exact-width disable counters", () => {
    const source = rules();
    for (const invalid of [-1, 4, 1.5, Number.NaN]) {
      expect(() => cancelBattleScriptMultiTurnMoves(
        source,
        invalid as 0,
      )).toThrow(/battler id 0\.\.3/);
    }
    for (const rolloutTimer of [-1, 16, 1.5, Number.NaN]) {
      expect(() => rules({
        battlers: [battler({ rolloutTimer }), battler(), battler(), battler()],
      })).toThrow(/rolloutTimer must be an unsigned integer <= 15/);
    }
    for (const furyCutterCounter of [-1, 256, 1.5, Number.NaN]) {
      expect(() => rules({
        battlers: [battler({ furyCutterCounter }), battler(), battler(), battler()],
      })).toThrow(/furyCutterCounter must be an unsigned integer <= 255/);
    }
  });
});
