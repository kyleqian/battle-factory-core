import { describe, expect, it } from "vitest";
import { advanceBattleScriptAttackCancelerParalyzed } from "../src/engine/battleScriptActionAdmission.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
  BATTLE_SCRIPT_STATUS1_PARALYSIS,
} from "../src/engine/battleScriptSourceConstants.ts";

const PC = 0x1234_5678;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? [1, 0, 0, 0] as const,
    pp: changes.pp ?? [35, 0, 0, 0] as const,
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
  });
}

function rules(changes: Partial<BattleScriptRulesContextInput> = {}) {
  return createBattleScriptRulesContext({
    battlers: changes.battlers ?? [
      battler(),
      battler({ side: 1 }),
      battler(),
      battler({ side: 1 }),
    ],
    selectorRoles: changes.selectorRoles ?? {
      attacker: 0,
      target: 1,
      effectBattler: 1,
    },
    scriptingBattler: changes.scriptingBattler ?? 3,
    atkCancelerTracker: changes.atkCancelerTracker
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_PARALYZED,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? 1,
    currentMovePosition: changes.currentMovePosition ?? 0,
    moveResultFlags: changes.moveResultFlags ?? 0,
    dmgMultiplier: changes.dmgMultiplier ?? 1,
    critMultiplier: changes.critMultiplier ?? 1,
    moveEffectByte: changes.moveEffectByte ?? 0,
    missType: changes.missType ?? 0,
    hitMarker: changes.hitMarker ?? 0x40,
    multiHitCounter: changes.multiHitCounter ?? 0,
    multistringChooser: changes.multistringChooser ?? 9,
    battleMoveDamage: changes.battleMoveDamage ?? 777,
  });
}

describe("source-shaped attack-canceler paralyzed phase", () => {
  it("pins the exact predicate and advances without an RNG draw when not paralyzed", () => {
    const source = rules({
      battlers: [battler({ status1: 0xffff_ffbf }), battler(), battler(), battler()],
    });
    const result = advanceBattleScriptAttackCancelerParalyzed(source, PC, 0xffff_ffff);
    expect(result).toMatchObject({
      kind: "advance",
      reason: "not-paralyzed",
      rngValue: 0xffff_ffff,
      rulesContext: { atkCancelerTracker: 11, hitMarker: source.hitMarker },
      receipt: {
        statusPredicate: {
          status1: 0xffff_ffbf,
          sourceMask: "STATUS1_PARALYSIS",
          mask: BATTLE_SCRIPT_STATUS1_PARALYSIS,
          matches: false,
        },
        rng: { kind: "preserve", callsConsumed: 0 },
        prlzImmobility: { before: 0, after: 0 },
        effect: 0,
        script: { kind: "preserve", sourceProgramCounter: PC },
        tracker: {
          before: 10,
          after: 11,
          sourcePhaseBefore: "CANCELER_PARALYZED",
          sourcePhaseAfter: "CANCELER_IN_LOVE",
        },
      },
    });
    expect(result.rulesContext.battlers).toBe(source.battlers);
  });

  it("draws exactly once for paralyzed battlers and preserves action on modulo misses", () => {
    const cases = [
      { seed: 4, after: 119118375, randomValue: 1817, modulo: 1 },
      { seed: 1, after: 1103539936, randomValue: 16838, modulo: 2 },
      { seed: 3, after: 3310570426, randomValue: 50515, modulo: 3 },
    ] as const;
    for (const expected of cases) {
      const source = rules({
        battlers: [battler({ status1: BATTLE_SCRIPT_STATUS1_PARALYSIS }), battler(), battler(), battler()],
      });
      const result = advanceBattleScriptAttackCancelerParalyzed(source, PC, expected.seed);
      expect(result).toMatchObject({
        reason: "paralysis-check-passed",
        rngValue: expected.after,
        rulesContext: { hitMarker: source.hitMarker, atkCancelerTracker: 11 },
        receipt: {
          rng: {
            kind: "draw",
            sourceOperation: "Random() % 4",
            before: expected.seed,
            after: expected.after,
            randomValue: expected.randomValue,
            modulo: expected.modulo,
            callsConsumed: 1,
          },
          prlzImmobility: { before: 0, after: 0 },
          hitMarker: { addedMask: 0 },
          effect: 0,
          script: { kind: "preserve" },
        },
      });
    }
  });

  it("pins modulo boundaries 0, 3, 4, and 65535", () => {
    const cases = [
      { seed: 0, randomValue: 0, modulo: 0, reason: "fully-paralyzed" },
      { seed: 29969, randomValue: 3, modulo: 3, reason: "paralysis-check-passed" },
      { seed: 83127, randomValue: 4, modulo: 0, reason: "fully-paralyzed" },
      { seed: 76347, randomValue: 65535, modulo: 3, reason: "paralysis-check-passed" },
    ] as const;
    for (const expected of cases) {
      const result = advanceBattleScriptAttackCancelerParalyzed(
        rules({ battlers: [battler({ status1: 0x40 }), battler(), battler(), battler()] }),
        PC,
        expected.seed,
      );
      if (result.kind !== "advance") throw new Error("expected phase advance");
      expect(result.reason).toBe(expected.reason);
      expect(result.receipt.rng).toMatchObject({
        randomValue: expected.randomValue,
        modulo: expected.modulo,
      });
    }
  });

  it("sets the correct indexed ProtectStruct flag and owns the unable handoff for all battlers", () => {
    for (const attacker of [0, 1, 2, 3] as const) {
      const bs = [
        battler({ side: 1 }),
        battler({ side: 0 }),
        battler({ side: 1 }),
        battler({ side: 0 }),
      ];
      bs[attacker] = battler({
        side: (attacker % 2 === 0 ? 1 : 0),
        status1: 0x8000_0040,
      });
      const source = rules({
        battlers: bs,
        selectorRoles: { attacker, target: 3, effectBattler: 2 },
        hitMarker: 0x4000_0040,
      });
      const result = advanceBattleScriptAttackCancelerParalyzed(source, PC, 0);
      expect(result).toMatchObject({
        reason: "fully-paralyzed",
        rulesContext: {
          hitMarker: (source.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE) >>> 0,
          atkCancelerTracker: 11,
        },
        receipt: {
          prlzImmobility: { before: 0, after: 1 },
          multiTurnCancellation: {
            kind: "deferred-to-script",
            targetLabel: "BattleScript_MoveUsedIsParalyzed",
            sourceCommand: "cancelmultiturnmoves BS_ATTACKER",
          },
          hitMarker: { addedMask: BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE },
          effect: 1,
          script: {
            kind: "handoff",
            sourceProgramCounter: PC,
            targetLabel: "BattleScript_MoveUsedIsParalyzed",
          },
        },
      });
      expect(result.rulesContext.battlers[attacker].prlzImmobility).toBe(1);
      for (const other of [0, 1, 2, 3] as const) {
        if (other !== attacker) expect(result.rulesContext.battlers[other]).toBe(source.battlers[other]);
      }
    }
  });

  it("preserves preset flags and markers while still recording the taken branch", () => {
    const source = rules({
      battlers: [battler({ status1: 0x40, prlzImmobility: 1 }), battler(), battler(), battler()],
      hitMarker: (0x4000_0000 | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE) >>> 0,
    });
    const result = advanceBattleScriptAttackCancelerParalyzed(source, PC, 0);
    if (result.kind !== "advance") throw new Error("expected phase advance");
    expect(result.rulesContext.battlers).toBe(source.battlers);
    expect(result.receipt.prlzImmobility).toEqual({ before: 1, after: 1 });
    expect(result.receipt.hitMarker).toMatchObject({ addedMask: 0, clearedMask: 0 });
    expect(result.receipt.effect).toBe(1);
  });

  it("gates and rejects missing or invalid context without consuming RNG", () => {
    const source = rules({ atkCancelerTracker: 9 });
    const gated = advanceBattleScriptAttackCancelerParalyzed(source, PC, 0xffff_ffff);
    expect(gated).toMatchObject({
      kind: "not-at-source-phase",
      rngValue: 0xffff_ffff,
      receipt: { rng: { kind: "preserve", callsConsumed: 0 } },
    });
    expect(gated.rulesContext).toBe(source);
    expect(() => advanceBattleScriptAttackCancelerParalyzed(
      rules({ selectorRoles: { attacker: null, target: 1, effectBattler: 1 } }),
      PC,
      0,
    )).toThrow(/requires an attacker role/);
    for (const invalid of [-1, 0x1_0000_0000, 1.5, Number.NaN]) {
      expect(() => advanceBattleScriptAttackCancelerParalyzed(rules(), PC, invalid))
        .toThrow(/RNG value must be a u32/);
    }
    expect(() => advanceBattleScriptAttackCancelerParalyzed(rules(), -1, 0))
      .toThrow(/program counter must be a u32/);
    expect(() => rules({ battlers: [
      battler({ prlzImmobility: 2 as 0 | 1 }), battler(), battler(), battler(),
    ] })).toThrow(/prlzImmobility/);
  });

  it("is immutable, deterministic, and deeply freezes explicit receipts", () => {
    const source = rules({
      battlers: [battler({ status1: 0x40 }), battler(), battler(), battler()],
    });
    const before = JSON.stringify(source);
    const first = advanceBattleScriptAttackCancelerParalyzed(source, PC, 0);
    if (first.kind !== "advance") throw new Error("expected phase advance");
    expect(advanceBattleScriptAttackCancelerParalyzed(source, PC, 0)).toEqual(first);
    expect(JSON.stringify(source)).toBe(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.rulesContext)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers[0])).toBe(true);
    expect(Object.isFrozen(first.receipt)).toBe(true);
    expect(Object.isFrozen(first.receipt.statusPredicate)).toBe(true);
    expect(Object.isFrozen(first.receipt.rng)).toBe(true);
    expect(Object.isFrozen(first.receipt.multiTurnCancellation)).toBe(true);
    expect(Object.isFrozen(first.receipt.tracker)).toBe(true);
  });
});
