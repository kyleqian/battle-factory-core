import { describe, expect, it } from "vitest";
import { advanceBattleScriptAttackCancelerBide } from "../src/engine/battleScriptActionAdmission.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_MOVE_BIDE,
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "../src/engine/battleScriptSourceConstants.ts";

const PC = 0x0800_1234;
const RNG = 0xdead_beef;

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
    loveImmobility: changes.loveImmobility ?? 0,
  });
}

function rules(changes: Partial<BattleScriptRulesContextInput> = {}) {
  return createBattleScriptRulesContext({
    battlers: changes.battlers ?? [
      battler({ side: 0 }),
      battler({ side: 1 }),
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
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_BIDE,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? 33,
    currentMovePosition: changes.currentMovePosition ?? 0,
    moveResultFlags: changes.moveResultFlags ?? 0,
    dmgMultiplier: changes.dmgMultiplier ?? 1,
    critMultiplier: changes.critMultiplier ?? 1,
    moveEffectByte: changes.moveEffectByte ?? 0,
    missType: changes.missType ?? 0,
    hitMarker: changes.hitMarker ?? 0x4000_0040,
    multiHitCounter: changes.multiHitCounter ?? 0,
    multistringChooser: changes.multistringChooser ?? 9,
    battleMoveDamage: changes.battleMoveDamage ?? 777,
    bideDmg: changes.bideDmg ?? [0, 0, 0, 0],
    bideTarget: changes.bideTarget ?? [0, 0, 0, 0],
    scriptingBideDmg: changes.scriptingBideDmg ?? -99,
    absentBattlerFlags: changes.absentBattlerFlags ?? 0,
  });
}

function withAttacker(
  attacker: 0 | 1,
  status2: number,
  changes: Partial<BattleScriptRulesContextInput> = {},
) {
  const indexed = [
    battler({ side: 0 }),
    battler({ side: 1 }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  indexed[attacker] = battler({ side: attacker, status2 });
  return rules({
    ...changes,
    battlers: indexed,
    selectorRoles: changes.selectorRoles ?? {
      attacker,
      target: attacker === 0 ? 1 : 0,
      effectBattler: attacker === 0 ? 1 : 0,
    },
  });
}

describe("source-shaped attack-canceler Bide phase", () => {
  it("pins source constants and advances no-Bide state without touching state or RNG", () => {
    expect(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_BIDE).toBe(0x300);
    expect(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS).toBe(0x1000);
    expect(BATTLE_SCRIPT_MOVE_BIDE).toBe(117);
    expect(BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_BIDE).toBe(12);
    expect(BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_THAW).toBe(13);

    for (const attacker of [0, 1] as const) {
      const status2 = 0xa000_10f8;
      const source = withAttacker(attacker, status2, {
        bideDmg: attacker === 0 ? [321, 7, 8, 9] : [7, 321, 8, 9],
        bideTarget: [1, 0, 1, 0],
        selectorRoles: {
          attacker,
          target: null,
          effectBattler: (attacker ^ 1) as 0 | 1,
        },
      });
      const result = advanceBattleScriptAttackCancelerBide(source, PC, RNG);
      expect(result).toMatchObject({
        kind: "advance",
        reason: "not-biding",
        rngValue: RNG,
        rulesContext: {
          atkCancelerTracker: 13,
          currentMove: source.currentMove,
          scriptingBideDmg: -99,
          selectorRoles: { target: null },
        },
        receipt: {
          counter: {
            encodedBefore: 0,
            decrement: 0,
            encodedAfter: 0,
            status2Before: status2,
            status2After: status2,
          },
          accumulatedDamage: { before: 321, after: 321 },
          scriptingBideDamage: { kind: "preserve", before: -99, after: -99 },
          currentMove: { kind: "preserve" },
          target: { kind: "preserve", before: null, after: null },
          rng: { kind: "preserve", value: RNG, callsConsumed: 0 },
          effect: 0,
          script: { kind: "preserve", sourceProgramCounter: PC },
          tracker: {
            before: 12,
            after: 13,
            sourcePhaseBefore: "CANCELER_BIDE",
            sourcePhaseAfter: "CANCELER_THAW",
          },
        },
      });
      expect(result.rulesContext.battlers).toBe(source.battlers);
      expect(result.rulesContext.bideDmg).toBe(source.bideDmg);
      expect(result.rulesContext.bideTarget).toBe(source.bideTarget);
    }
  });

  it("decrements reachable counter 2 and hands continuing storage to BattleScript_BideStoringEnergy", () => {
    for (const attacker of [0, 1] as const) {
      const status2 = 0xf20d_12a5;
      const source = withAttacker(attacker, status2, {
        bideDmg: attacker === 0 ? [456, 0, 0, 0] : [0, 456, 0, 0],
        bideTarget: [1, 0, 1, 0],
      });
      const result = advanceBattleScriptAttackCancelerBide(source, PC, RNG);
      expect(result).toMatchObject({
        reason: "storing-energy",
        rngValue: RNG,
        rulesContext: {
          atkCancelerTracker: 13,
          currentMove: source.currentMove,
          scriptingBideDmg: source.scriptingBideDmg,
        },
        receipt: {
          counter: {
            sourceMask: "STATUS2_BIDE",
            mask: 0x300,
            status2Before: status2,
            encodedBefore: 2,
            decrement: 1,
            status2After: (status2 - 0x100) >>> 0,
            encodedAfter: 1,
          },
          multiTurnStatus: {
            before: true,
            after: true,
            clearingOwner: "not-requested",
          },
          accumulatedDamage: { before: 456, after: 456 },
          target: { kind: "preserve" },
          effect: 1,
          script: {
            kind: "handoff",
            targetLabel: "BattleScript_BideStoringEnergy",
          },
        },
      });
      expect(result.rulesContext.battlers[attacker].status2)
        .toBe((status2 - 0x100) >>> 0);
      expect(
        result.rulesContext.battlers[attacker].status2
        & ~BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_BIDE,
      ).toBe(status2 & ~BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_BIDE);
    }
  });

  it("releases zero energy to the no-energy script without replacing move, damage, target, or multi-turn state", () => {
    for (const attacker of [0, 1] as const) {
      const sourceTarget = attacker === 0 ? 0 : null;
      const status2 = 0x8100_11a5;
      const source = withAttacker(attacker, status2, {
        bideDmg: [0, 0, 22, 33],
        bideTarget: [1, 0, 1, 0],
        selectorRoles: {
          attacker,
          target: sourceTarget,
          effectBattler: (attacker ^ 1) as 0 | 1,
        },
        scriptingBideDmg: 777,
      });
      const result = advanceBattleScriptAttackCancelerBide(source, PC, RNG);
      expect(result).toMatchObject({
        reason: "released-with-no-energy",
        rulesContext: {
          currentMove: 33,
          scriptingBideDmg: 777,
          selectorRoles: { target: sourceTarget },
        },
        receipt: {
          counter: {
            encodedBefore: 1,
            encodedAfter: 0,
            status2After: (status2 - 0x100) >>> 0,
          },
          multiTurnStatus: {
            before: true,
            after: true,
            clearingOwner: "BattleScript_BideNoEnergyToAttack",
          },
          currentMove: { kind: "preserve", before: 33, after: 33 },
          scriptingBideDamage: { kind: "preserve", before: 777, after: 777 },
          target: { kind: "preserve", before: sourceTarget, after: sourceTarget },
          effect: 1,
          script: {
            kind: "handoff",
            targetLabel: "BattleScript_BideNoEnergyToAttack",
          },
        },
      });
      expect(
        result.rulesContext.battlers[attacker].status2
        & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
      ).toBe(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS);
    }
  });

  it("releases positive energy for both singles sides, restoring the saved opposing slot and doubled s32 damage", () => {
    for (const attacker of [0, 1] as const) {
      const savedTarget = (attacker ^ 1) as 0 | 1;
      const storedDamage = attacker === 0 ? 123 : 456;
      const source = withAttacker(attacker, 0xa000_1107, {
        bideDmg: attacker === 0
          ? [storedDamage, 0, 77, 88]
          : [0, storedDamage, 77, 88],
        bideTarget: [1, 0, 1, 0],
        selectorRoles: {
          attacker,
          target: attacker,
          effectBattler: savedTarget,
        },
        scriptingBideDmg: -7,
      });
      const result = advanceBattleScriptAttackCancelerBide(source, PC, RNG);
      expect(result).toMatchObject({
        reason: "released-attack",
        rngValue: RNG,
        rulesContext: {
          currentMove: 117,
          currentMovePower: 1,
          scriptingBideDmg: storedDamage * 2,
          selectorRoles: { attacker, target: savedTarget },
          atkCancelerTracker: 13,
        },
        receipt: {
          accumulatedDamage: { before: storedDamage, after: storedDamage },
          scriptingBideDamage: {
            kind: "set-doubled",
            before: -7,
            after: storedDamage * 2,
            sourceOperation: "gBideDmg[gBattlerAttacker] * 2",
            arithmetic: "signed-s32-two-complement",
          },
          currentMove: {
            kind: "set",
            before: 33,
            after: 117,
            sourceConstant: "MOVE_BIDE",
          },
          target: {
            kind: "restore-saved",
            before: attacker,
            savedTarget,
            after: savedTarget,
            sourceArray: "gBideTarget",
            resolution: "saved-target-present",
          },
          singlesTargetInvariant: {
            absentBattlerFlags: 0,
            rngCallsConsumed: 0,
            absentSavedTargetBranch:
              "source-unreachable-at-level-50-singles-action-boundary",
          },
          rng: { value: RNG, callsConsumed: 0 },
          effect: 1,
          script: { kind: "handoff", targetLabel: "BattleScript_BideAttack" },
        },
      });
      expect(result.rulesContext.bideDmg).toBe(source.bideDmg);
      expect(result.rulesContext.bideTarget).toBe(source.bideTarget);
    }
  });

  it("makes doubled damage width and positive-s32 boundary behavior explicit", () => {
    for (const [storedDamage, doubled] of [
      [1, 2],
      [0x3fff_ffff, 0x7fff_fffe],
      [0x4000_0000, -0x8000_0000],
      [0x7fff_ffff, -2],
    ] as const) {
      const source = withAttacker(0, 0x1100, {
        bideDmg: [storedDamage, 0, 0, 0],
        bideTarget: [1, 0, 0, 0],
      });
      const result = advanceBattleScriptAttackCancelerBide(source, PC, RNG);
      expect(result).toMatchObject({
        reason: "released-attack",
        rulesContext: { scriptingBideDmg: doubled },
        receipt: {
          scriptingBideDamage: {
            after: doubled,
            arithmetic: "signed-s32-two-complement",
          },
        },
      });
    }
  });

  it("gates before Bide context use and rejects missing or source-unreachable singles state", () => {
    const gatedSource = rules({
      atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_IN_LOVE,
      selectorRoles: { attacker: null, target: null, effectBattler: null },
      absentBattlerFlags: 0x0f,
    });
    const gated = advanceBattleScriptAttackCancelerBide(gatedSource, PC, RNG);
    expect(gated).toMatchObject({
      kind: "not-at-source-phase",
      rngValue: RNG,
      receipt: { rng: { kind: "preserve", callsConsumed: 0 } },
    });
    expect(gated.rulesContext).toBe(gatedSource);

    expect(() => advanceBattleScriptAttackCancelerBide(
      rules({ selectorRoles: { attacker: null, target: 1, effectBattler: 1 } }),
      PC,
      RNG,
    )).toThrow(/requires an attacker role/);
    for (const attacker of [2, 3] as const) {
      expect(() => advanceBattleScriptAttackCancelerBide(
        rules({ selectorRoles: { attacker, target: 1, effectBattler: 1 } }),
        PC,
        RNG,
      )).toThrow(/attacker must be battler 0 or 1/);
    }
    expect(() => advanceBattleScriptAttackCancelerBide(
      rules({ absentBattlerFlags: 0x02 }),
      PC,
      RNG,
    )).toThrow(/GetMoveTarget fallback.*source-unreachable/);
    expect(() => advanceBattleScriptAttackCancelerBide(
      withAttacker(0, 0x1300),
      PC,
      RNG,
    )).toThrow(/counter 3 is not reachable/);
    expect(() => advanceBattleScriptAttackCancelerBide(
      withAttacker(0, 0x1100, { bideDmg: [-1, 0, 0, 0] }),
      PC,
      RNG,
    )).toThrow(/must be nonnegative/);
    expect(() => advanceBattleScriptAttackCancelerBide(
      withAttacker(0, 0x1100, {
        bideDmg: [1, 0, 0, 0],
        bideTarget: [0, 0, 0, 0],
      }),
      PC,
      RNG,
    )).toThrow(/must be the opposing active singles slot 1/);
    for (const invalid of [-1, 0x1_0000_0000, 1.5, Number.NaN]) {
      expect(() => advanceBattleScriptAttackCancelerBide(rules(), PC, invalid))
        .toThrow(/RNG value must be a u32/);
    }
    expect(() => advanceBattleScriptAttackCancelerBide(rules(), -1, RNG))
      .toThrow(/program counter must be a u32/);
  });

  it("validates and freezes the new source globals at context construction", () => {
    for (const bideDmg of [[0, 0, 0], [0, 0, 0, 0, 0]]) {
      expect(() => rules({ bideDmg })).toThrow(/exactly four signed/);
    }
    expect(() => rules({ bideDmg: [0, 0x8000_0000, 0, 0] }))
      .toThrow(/signed 32-bit/);
    expect(() => rules({ bideDmg: [-0x8000_0001, 0, 0, 0] }))
      .toThrow(/signed 32-bit/);
    expect(() => rules({ bideTarget: [0, 1, 2] }))
      .toThrow(/exactly four battler ids/);
    expect(() => rules({
      bideTarget: [0, 1, 2, 4 as 0],
    })).toThrow(/bideTarget\[3\].*0\.\.3/);
    expect(() => rules({ scriptingBideDmg: 0x8000_0000 }))
      .toThrow(/signed 32-bit/);
    expect(() => rules({ absentBattlerFlags: 0x10 }))
      .toThrow(/absentBattlerFlags/);

    const source = rules({
      bideDmg: [-0x8000_0000, 0, 1, 0x7fff_ffff],
      bideTarget: [1, 0, 1, 0],
    });
    expect(Object.isFrozen(source.bideDmg)).toBe(true);
    expect(Object.isFrozen(source.bideTarget)).toBe(true);
  });

  it("is immutable, deterministic, and deeply freezes replacement state and every receipt", () => {
    const source = withAttacker(1, 0xe000_1105, {
      bideDmg: [0, 0x4000_0000, 0, 0],
      bideTarget: [1, 0, 1, 0],
      selectorRoles: { attacker: 1, target: null, effectBattler: 0 },
    });
    const before = JSON.stringify(source);
    const first = advanceBattleScriptAttackCancelerBide(source, PC, RNG);
    if (first.kind !== "advance") throw new Error("expected phase advance");
    expect(advanceBattleScriptAttackCancelerBide(source, PC, RNG)).toEqual(first);
    expect(JSON.stringify(source)).toBe(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.rulesContext)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers[1])).toBe(true);
    expect(Object.isFrozen(first.rulesContext.selectorRoles)).toBe(true);
    expect(Object.isFrozen(first.receipt)).toBe(true);
    for (const field of [
      "counter",
      "multiTurnStatus",
      "accumulatedDamage",
      "scriptingBideDamage",
      "currentMove",
      "target",
      "singlesTargetInvariant",
      "rng",
      "script",
      "tracker",
    ] as const) {
      expect(Object.isFrozen(first.receipt[field]), field).toBe(true);
    }
  });
});
