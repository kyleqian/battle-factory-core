import { describe, expect, it } from "vitest";
import { advanceBattleScriptAttackCancelerConfused } from "../src/engine/battleScriptActionAdmission.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
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
    confusionDamage: changes.confusionDamage,
  });
}

function rules(changes: Partial<BattleScriptRulesContextInput> = {}) {
  return createBattleScriptRulesContext({
    battlers: changes.battlers ?? [battler(), battler({ side: 1 }), battler(), battler({ side: 1 })],
    selectorRoles: changes.selectorRoles ?? { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: changes.scriptingBattler ?? 3,
    atkCancelerTracker: changes.atkCancelerTracker
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_CONFUSED,
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

describe("source-shaped attack-canceler confused phase", () => {
  it("does nothing but advance once when not confused", () => {
    const source = rules();
    const result = advanceBattleScriptAttackCancelerConfused(source, PC, 0x89ab_cdef);
    expect(result).toMatchObject({
      kind: "advance",
      reason: "not-confused",
      rngValue: 0x89ab_cdef,
      rulesContext: { atkCancelerTracker: 10 },
      receipt: {
        confusionCounter: { before: 0, after: 0, decrement: 0 },
        rng: { kind: "preserve", callsConsumed: 0 },
        effect: 0,
        script: { kind: "preserve" },
        tracker: { before: 9, after: 10 },
      },
    });
    expect(result.rulesContext.battlers).toBe(source.battlers);
  });

  it("snaps out at counter one without drawing and preserves unrelated status bits", () => {
    const source = rules({ battlers: [battler({ status2: 0xa000_0001 }), battler(), battler(), battler()] });
    const result = advanceBattleScriptAttackCancelerConfused(source, PC, 3);
    expect(result).toMatchObject({
      reason: "snapped-out",
      rngValue: 3,
      receipt: {
        confusionCounter: { before: 1, after: 0, decrement: 1 },
        rng: { kind: "preserve", reason: "snapped-out", callsConsumed: 0 },
        cursor: { kind: "push", sourceProgramCounter: PC },
        script: { targetLabel: "BattleScript_MoveUsedIsConfusedNoMore" },
        effect: 1,
      },
    });
    expect(result.rulesContext.battlers[0].status2).toBe(0xa000_0000);
  });

  it("uses exactly one ordered Emerald draw and continues on Random() & 1", () => {
    const source = rules({ battlers: [battler({ status2: 3 }), battler(), battler(), battler()] });
    const result = advanceBattleScriptAttackCancelerConfused(source, PC, 3);
    expect(result).toMatchObject({
      reason: "confused-continues",
      rngValue: 3310570426,
      rulesContext: { multistringChooser: 0 },
      receipt: {
        rng: {
          kind: "draw",
          sourceOperation: "Random() & 1",
          before: 3,
          after: 3310570426,
          lowBit: 1,
          callsConsumed: 1,
        },
        cursor: { kind: "push" },
        multistringChooser: { sourceConstant: "FALSE", value: 0 },
        hitMarker: { addedMask: 0 },
      },
    });
    expect(result.rulesContext.battlers[0].status2).toBe(2);
  });

  it("owns self-hit target, damage, protect, unable marker, and deferred script cancellation", () => {
    for (const attacker of [0, 1, 2, 3] as const) {
      const bs = [battler(), battler(), battler(), battler()];
      bs[attacker] = battler({
        side: attacker & 1 ? 1 : 0,
        status2: 5,
        confusionSelfDmg: 0,
        confusionDamage: {
          level: 50,
          attack: 100,
          defense: 80,
          attackStage: 6,
          defenseStage: 6,
          isBurned: false,
          hasGuts: false,
        },
      });
      const source = rules({
        battlers: bs,
        selectorRoles: { attacker, target: ((attacker + 1) % 4) as 0 | 1 | 2 | 3, effectBattler: 3 },
      });
      const result = advanceBattleScriptAttackCancelerConfused(source, PC, 0);
      expect(result).toMatchObject({
        reason: "confusion-self-hit",
        rulesContext: {
          selectorRoles: { target: attacker },
          battleMoveDamage: 24,
          multistringChooser: 1,
          hitMarker: (source.hitMarker | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE) >>> 0,
        },
        receipt: {
          battleMoveDamage: {
            after: 24,
            calculation: {
              kind: "CalculateBaseDamage",
              move: 1,
              powerOverride: 40,
              attacker,
              defender: attacker,
            },
          },
          confusionSelfDmg: { before: 0, after: 1 },
          multiTurnCancellation: {
            kind: "deferred-to-script",
            targetLabel: "BattleScript_DoSelfConfusionDmg",
          },
          hitMarker: { addedMask: BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE },
          script: { targetLabel: "BattleScript_MoveUsedIsConfused" },
          effect: 1,
        },
      });
      expect(result.rulesContext.battlers[attacker].confusionSelfDmg).toBe(1);
    }
  });

  it("rejects unreachable counters and missing/invalid self-hit damage context", () => {
    for (const counter of [6, 7]) {
      expect(() => advanceBattleScriptAttackCancelerConfused(
        rules({ battlers: [battler({ status2: counter }), battler(), battler(), battler()] }),
        PC,
        0,
      )).toThrow(/source-reachable encoding 0..5/);
    }
    expect(() => advanceBattleScriptAttackCancelerConfused(
      rules({ battlers: [battler({ status2: 2 }), battler(), battler(), battler()] }),
      PC,
      0,
    )).toThrow(/requires attacker confusionDamage context/);
    expect(() => rules({ battlers: [
      battler({ confusionDamage: { level: 256, attack: 1, defense: 1, attackStage: 6, defenseStage: 6, isBurned: false, hasGuts: false } }),
      battler(), battler(), battler(),
    ] })).toThrow(/confusionDamage.level/);
  });

  it("gates without RNG or mutation and returns deeply frozen deterministic results", () => {
    const source = rules({ atkCancelerTracker: 8 });
    const gated = advanceBattleScriptAttackCancelerConfused(source, PC, 0xffff_ffff);
    expect(gated).toMatchObject({
      kind: "not-at-source-phase",
      rngValue: 0xffff_ffff,
      receipt: { rng: { kind: "preserve", callsConsumed: 0 } },
    });
    expect(gated.rulesContext).toBe(source);

    const selfHit = rules({ battlers: [battler({
      status2: 2,
      confusionDamage: { level: 50, attack: 100, defense: 80, attackStage: 6, defenseStage: 6, isBurned: false, hasGuts: false },
    }), battler(), battler(), battler()] });
    const before = JSON.stringify(selfHit);
    const first = advanceBattleScriptAttackCancelerConfused(selfHit, PC, 0);
    expect(advanceBattleScriptAttackCancelerConfused(selfHit, PC, 0)).toEqual(first);
    expect(JSON.stringify(selfHit)).toBe(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.receipt)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers[0].confusionDamage)).toBe(true);
  });
});
