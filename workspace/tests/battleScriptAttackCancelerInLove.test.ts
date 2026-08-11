import { describe, expect, it } from "vitest";
import { advanceBattleScriptAttackCancelerInLove } from "../src/engine/battleScriptActionAdmission.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
} from "../src/engine/battleScriptSourceConstants.ts";

const PC = 0x89ab_cdef;

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
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_IN_LOVE,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? 1,
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
  });
}

describe("source-shaped attack-canceler in-love phase", () => {
  it("pins the four-bit mask and advances without drawing when it is empty", () => {
    expect(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_INFATUATION).toBe(0x000f_0000);
    expect(BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_IN_LOVE).toBe(11);
    expect(BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_BIDE).toBe(12);
    const source = rules({
      battlers: [
        battler({ status2: 0xfff0_ffff, loveImmobility: 1 }),
        battler(),
        battler(),
        battler(),
      ],
      scriptingBattler: 2,
    });
    const result = advanceBattleScriptAttackCancelerInLove(source, PC, 0xffff_ffff);
    expect(result).toMatchObject({
      kind: "advance",
      reason: "not-infatuated",
      rngValue: 0xffff_ffff,
      rulesContext: {
        atkCancelerTracker: 12,
        scriptingBattler: 2,
        hitMarker: source.hitMarker,
      },
      receipt: {
        infatuation: {
          status2: 0xfff0_ffff,
          sourceMask: "STATUS2_INFATUATION",
          mask: 0x000f_0000,
          encodedBits: 0,
          sourceBattler: null,
        },
        scriptingBattler: {
          kind: "preserve",
          before: 2,
          after: 2,
        },
        rng: { kind: "preserve", value: 0xffff_ffff, callsConsumed: 0 },
        loveImmobility: { before: 1, after: 1 },
        multiTurnCancellation: { kind: "not-requested" },
        hitMarker: { addedMask: 0 },
        effect: 0,
        script: { kind: "preserve", sourceProgramCounter: PC },
        scriptStack: { kind: "preserve" },
        tracker: {
          before: 11,
          after: 12,
          sourcePhaseBefore: "CANCELER_IN_LOVE",
          sourcePhaseAfter: "CANCELER_BIDE",
        },
      },
    });
    expect(result.rulesContext.battlers).toBe(source.battlers);
  });

  it("decodes each single infatuation-source bit for every attacker and preserves the continue path", () => {
    for (const attacker of [0, 1, 2, 3] as const) {
      for (const sourceBattler of [0, 1, 2, 3] as const) {
        const indexed = [
          battler({ side: 1 }),
          battler({ side: 0 }),
          battler({ side: 1 }),
          battler({ side: 0 }),
        ];
        const status2 = (
          (1 << (16 + sourceBattler))
          | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
          | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR
          | 0x8000_0000
        ) >>> 0;
        indexed[attacker] = battler({
          side: attacker % 2 as 0 | 1,
          status2,
          status3: BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
          rolloutTimer: 15,
          furyCutterCounter: 255,
        });
        const source = rules({
          battlers: indexed,
          selectorRoles: { attacker, target: 3, effectBattler: 2 },
          scriptingBattler: (sourceBattler + 1) % 4 as 0 | 1 | 2 | 3,
        });
        const result = advanceBattleScriptAttackCancelerInLove(source, PC, 4);
        expect(result).toMatchObject({
          reason: "love-check-passed",
          rngValue: 119118375,
          rulesContext: {
            scriptingBattler: sourceBattler,
            hitMarker: source.hitMarker,
            atkCancelerTracker: 12,
          },
          receipt: {
            infatuation: {
              encodedBits: 1 << sourceBattler,
              sourceBattler,
            },
            scriptingBattler: {
              kind: "derive",
              before: source.scriptingBattler,
              after: sourceBattler,
              sourceFunction: "CountTrailingZeroBits",
            },
            rng: {
              kind: "draw",
              sourceOperation: "Random() & 1",
              before: 4,
              after: 119118375,
              randomValue: 1817,
              lowBit: 1,
              callsConsumed: 1,
            },
            loveImmobility: { before: 0, after: 0 },
            multiTurnCancellation: { kind: "not-requested" },
            hitMarker: { addedMask: 0 },
            effect: 1,
            script: {
              kind: "handoff",
              sourceProgramCounter: PC,
              targetLabel: "BattleScript_MoveUsedIsInLove",
            },
            scriptStack: {
              kind: "push-cursor",
              sourceFunction: "BattleScriptPushCursor",
              sourceProgramCounter: PC,
            },
          },
        });
        expect(result.rulesContext.battlers).toBe(source.battlers);
        expect(result.rulesContext.battlers[attacker].status2).toBe(status2);
        expect(result.rulesContext.battlers[attacker].status3)
          .toBe(BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE);
        expect(result.rulesContext.battlers[attacker].rolloutTimer).toBe(15);
        expect(result.rulesContext.battlers[attacker].furyCutterCounter).toBe(255);
      }
    }
  });

  it("uses BattleScriptPush and immediately applies the exact CancelMultiTurnMoves helper on even draws", () => {
    for (const attacker of [0, 1, 2, 3] as const) {
      const indexed = [battler(), battler({ side: 1 }), battler(), battler({ side: 1 })];
      const beforeStatus2 = (
        1 << (16 + ((attacker + 1) % 4))
        | 0x8000_000f
        | 0x0000_1f70
      ) >>> 0;
      const beforeStatus3 = (0xa000_0108 | BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE) >>> 0;
      indexed[attacker] = battler({
        side: (1 - indexed[attacker]!.side) as 0 | 1,
        status2: beforeStatus2,
        status3: beforeStatus3,
        rolloutTimer: 15,
        furyCutterCounter: 255,
      });
      const source = rules({
        battlers: indexed,
        selectorRoles: { attacker, target: 0, effectBattler: 3 },
      });
      const result = advanceBattleScriptAttackCancelerInLove(source, PC, 0);
      const nextBattler = result.rulesContext.battlers[attacker];
      expect(result).toMatchObject({
        reason: "immobilized-by-love",
        rngValue: 24691,
        rulesContext: {
          hitMarker: (source.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE) >>> 0,
          scriptingBattler: (attacker + 1) % 4,
          atkCancelerTracker: 12,
        },
        receipt: {
          rng: { randomValue: 0, lowBit: 0, callsConsumed: 1 },
          loveImmobility: { before: 0, after: 1 },
          multiTurnCancellation: {
            kind: "immediate",
            sourceFunction: "CancelMultiTurnMoves",
            receipt: {
              battler: attacker,
              status2: {
                before: beforeStatus2,
                after: (beforeStatus2 & ~0x1f70) >>> 0,
              },
              status3: {
                before: beforeStatus3,
                after: (beforeStatus3 & ~BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE) >>> 0,
              },
              rolloutTimer: { before: 15, after: 0 },
              furyCutterCounter: { before: 255, after: 0 },
            },
          },
          hitMarker: { addedMask: BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE },
          effect: 1,
          script: {
            kind: "handoff",
            targetLabel: "BattleScript_MoveUsedIsInLove",
          },
          scriptStack: {
            kind: "push-script",
            sourceFunction: "BattleScriptPush",
            targetLabel: "BattleScript_MoveUsedIsInLoveCantAttack",
          },
        },
      });
      expect(nextBattler.status2).toBe((beforeStatus2 & ~0x1f70) >>> 0);
      expect(nextBattler.loveImmobility).toBe(1);
      for (const other of [0, 1, 2, 3] as const) {
        if (other !== attacker) {
          expect(result.rulesContext.battlers[other]).toBe(source.battlers[other]);
        }
      }
    }
  });

  it("preserves preset unable state while retaining immediate helper ownership", () => {
    const status2 = (0x0001_0000 | 0x8000_000f) >>> 0;
    const source = rules({
      battlers: [
        battler({ status2, loveImmobility: 1 }),
        battler(),
        battler(),
        battler(),
      ],
      hitMarker: (0x4000_0040 | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE) >>> 0,
    });
    const result = advanceBattleScriptAttackCancelerInLove(source, PC, 0);
    if (result.kind !== "advance") throw new Error("expected phase advance");
    expect(result.receipt.loveImmobility).toEqual({ before: 1, after: 1 });
    expect(result.receipt.hitMarker).toMatchObject({ addedMask: 0, clearedMask: 0 });
    expect(result.receipt.multiTurnCancellation).toMatchObject({
      kind: "immediate",
      receipt: {
        status2: { before: status2, after: status2 },
        rolloutTimer: { before: 0, after: 0 },
      },
    });
    expect(result.rulesContext.battlers[0].loveImmobility).toBe(1);
  });

  it("pins both branch values at the u16 Random boundaries with one exact LCG call", () => {
    const cases = [
      { seed: 0, after: 24691, randomValue: 0, lowBit: 0, reason: "immobilized-by-love" },
      { seed: 53158, after: 89633, randomValue: 1, lowBit: 1, reason: "love-check-passed" },
      { seed: 23189, after: 4294858724, randomValue: 65534, lowBit: 0, reason: "immobilized-by-love" },
      { seed: 76347, after: 4294923666, randomValue: 65535, lowBit: 1, reason: "love-check-passed" },
    ] as const;
    for (const expected of cases) {
      const result = advanceBattleScriptAttackCancelerInLove(
        rules({
          battlers: [battler({ status2: 0x0008_0000 }), battler(), battler(), battler()],
        }),
        PC,
        expected.seed,
      );
      expect(result).toMatchObject({
        reason: expected.reason,
        rngValue: expected.after,
        receipt: {
          rng: {
            before: expected.seed,
            after: expected.after,
            randomValue: expected.randomValue,
            lowBit: expected.lowBit,
            callsConsumed: 1,
          },
        },
      });
    }
  });

  it("gates before context use and rejects only source-unreachable nonzero mask encodings", () => {
    const gatedSource = rules({
      atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_PARALYZED,
      selectorRoles: { attacker: null, target: null, effectBattler: null },
    });
    const gated = advanceBattleScriptAttackCancelerInLove(gatedSource, PC, 0xffff_ffff);
    expect(gated).toMatchObject({
      kind: "not-at-source-phase",
      rngValue: 0xffff_ffff,
      receipt: { rng: { kind: "preserve", callsConsumed: 0 } },
    });
    expect(gated.rulesContext).toBe(gatedSource);
    expect(() => advanceBattleScriptAttackCancelerInLove(
      rules({ selectorRoles: { attacker: null, target: 1, effectBattler: 1 } }),
      PC,
      0,
    )).toThrow(/requires an attacker role/);
    for (const encodedBits of [0x3, 0x5, 0x6, 0x9, 0xf]) {
      expect(() => advanceBattleScriptAttackCancelerInLove(
        rules({
          battlers: [
            battler({ status2: encodedBits << 16 }),
            battler(),
            battler(),
            battler(),
          ],
        }),
        PC,
        0,
      )).toThrow(/exactly one source battler bit/);
    }
    for (const invalid of [-1, 0x1_0000_0000, 1.5, Number.NaN]) {
      expect(() => advanceBattleScriptAttackCancelerInLove(rules(), PC, invalid))
        .toThrow(/RNG value must be a u32/);
    }
    expect(() => advanceBattleScriptAttackCancelerInLove(rules(), -1, 0))
      .toThrow(/program counter must be a u32/);
    expect(() => rules({
      battlers: [
        battler({ loveImmobility: 2 as 0 | 1 }),
        battler(),
        battler(),
        battler(),
      ],
    })).toThrow(/loveImmobility/);
  });

  it("is immutable, deterministic, and deeply freezes replacement state and receipts", () => {
    const source = rules({
      battlers: [
        battler({
          status2: 0x0004_1f70,
          status3: BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
          rolloutTimer: 7,
          furyCutterCounter: 8,
        }),
        battler(),
        battler(),
        battler(),
      ],
    });
    const before = JSON.stringify(source);
    const first = advanceBattleScriptAttackCancelerInLove(source, PC, 0);
    if (first.kind !== "advance") throw new Error("expected phase advance");
    expect(advanceBattleScriptAttackCancelerInLove(source, PC, 0)).toEqual(first);
    expect(JSON.stringify(source)).toBe(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.rulesContext)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers[0])).toBe(true);
    expect(Object.isFrozen(first.receipt)).toBe(true);
    expect(Object.isFrozen(first.receipt.infatuation)).toBe(true);
    expect(Object.isFrozen(first.receipt.scriptingBattler)).toBe(true);
    expect(Object.isFrozen(first.receipt.rng)).toBe(true);
    expect(Object.isFrozen(first.receipt.loveImmobility)).toBe(true);
    expect(Object.isFrozen(first.receipt.multiTurnCancellation)).toBe(true);
    if (first.receipt.multiTurnCancellation.kind !== "immediate") {
      throw new Error("expected immediate cancellation");
    }
    expect(Object.isFrozen(first.receipt.multiTurnCancellation.receipt)).toBe(true);
    expect(Object.isFrozen(first.receipt.multiTurnCancellation.receipt.status2)).toBe(true);
    expect(Object.isFrozen(first.receipt.script)).toBe(true);
    expect(Object.isFrozen(first.receipt.scriptStack)).toBe(true);
    expect(Object.isFrozen(first.receipt.tracker)).toBe(true);
  });
});
