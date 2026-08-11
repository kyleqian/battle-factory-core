import { describe, expect, it } from "vitest";
import {
  advanceBattleScriptAttackCancelerThaw,
} from "../src/engine/battleScriptActionAdmission.ts";
import {
  createBattleScriptRulesContext,
  resolveBattleScriptCurrentMoveEffect,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_EFFECT_THAW_HIT,
  BATTLE_SCRIPT_STATUS1_FREEZE,
} from "../src/engine/battleScriptSourceConstants.ts";

const PC = 0x0800_5678;
const RNG = 0xdead_beef;
const TACKLE = 33;
const FLAME_WHEEL = 172;
const SACRED_FIRE = 221;
const OTHER_STATUS = 0x0080_0047;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([TACKLE, 0, 0, 0]),
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
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_THAW,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? TACKLE,
    currentMovePosition: changes.currentMovePosition ?? 0,
    moveResultFlags: changes.moveResultFlags ?? 0xa5,
    dmgMultiplier: changes.dmgMultiplier ?? 7,
    critMultiplier: changes.critMultiplier ?? 9,
    moveEffectByte: changes.moveEffectByte ?? 0xe1,
    missType: changes.missType ?? 5,
    hitMarker: changes.hitMarker ?? 0x4000_0240,
    multiHitCounter: changes.multiHitCounter ?? 3,
    multistringChooser: changes.multistringChooser ?? 9,
    battleMoveDamage: changes.battleMoveDamage ?? -777,
    bideDmg: changes.bideDmg ?? [11, 22, 33, 44],
    bideTarget: changes.bideTarget ?? [1, 0, 1, 0],
    scriptingBideDmg: changes.scriptingBideDmg ?? -99,
    absentBattlerFlags: changes.absentBattlerFlags ?? 0,
  });
}

function withAttacker(
  attacker: 0 | 1,
  status1: number,
  currentMove: number,
) {
  const battlers = [
    battler({ side: 0 }),
    battler({ side: 1 }),
    battler({ side: 0 }),
    battler({ side: 1 }),
  ];
  battlers[attacker] = battler({
    side: attacker,
    ability: 48,
    hp: 77,
    moves: [currentMove, 214, 117, 1],
    pp: [5, 6, 7, 8],
    status1,
    status2: 0xa000_10f8,
    status3: 0x1234_5678,
    substituteHP: 31,
    rolloutTimer: 15,
    furyCutterCounter: 9,
    truantCounter: 1,
    rechargeTimer: 4,
    flinchImmobility: 1,
    disabledMove: 214,
    usedDisabledMove: 1,
    tauntTimer: 7,
    usedTauntedMove: 1,
    usedImprisonedMove: 1,
    confusionSelfDmg: 1,
    prlzImmobility: 1,
    loveImmobility: 1,
  });
  return rules({
    battlers,
    currentMove,
    selectorRoles: {
      attacker,
      target: (attacker ^ 1) as 0 | 1,
      effectBattler: (attacker ^ 1) as 0 | 1,
    },
  });
}

describe("source-shaped attack-canceler thaw phase", () => {
  it("pins source constants and thaw/non-thaw effects from generated move data", () => {
    expect(BATTLE_SCRIPT_STATUS1_FREEZE).toBe(1 << 5);
    expect(BATTLE_SCRIPT_EFFECT_THAW_HIT).toBe(125);
    expect(BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_THAW).toBe(13);
    expect(BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_END).toBe(14);
    expect(resolveBattleScriptCurrentMoveEffect(TACKLE)).toBe(0);
    expect(resolveBattleScriptCurrentMoveEffect(FLAME_WHEEL)).toBe(125);
    expect(resolveBattleScriptCurrentMoveEffect(SACRED_FIRE)).toBe(125);
  });

  it("advances each non-frozen singles attacker with effect 0 and no controller or RNG ownership", () => {
    for (const attacker of [0, 1] as const) {
      for (const move of [TACKLE, FLAME_WHEEL]) {
        const source = withAttacker(attacker, OTHER_STATUS, move);
        const result = advanceBattleScriptAttackCancelerThaw(source, PC, RNG);
        expect(result).toMatchObject({
          kind: "advance",
          reason: "not-frozen",
          rngValue: RNG,
          rulesContext: {
            atkCancelerTracker: 14,
            multistringChooser: 9,
          },
          receipt: {
            freezePredicate: {
              sourceMask: "STATUS1_FREEZE",
              mask: 0x20,
              status1: OTHER_STATUS,
              matches: false,
            },
            moveEffect: {
              currentMove: move,
              sourceField: "gBattleMoves[gCurrentMove].effect",
              value: resolveBattleScriptCurrentMoveEffect(move),
              matches: move === FLAME_WHEEL,
            },
            status1: {
              before: OTHER_STATUS,
              after: OTHER_STATUS,
              addedMask: 0,
              clearedMask: 0,
            },
            effect: 0,
            script: { kind: "preserve", sourceProgramCounter: PC },
            cursor: { kind: "preserve" },
            multistringChooser: { kind: "preserve" },
            controllerSync: { kind: "none", reason: "effect-zero" },
            rng: { kind: "preserve", value: RNG, callsConsumed: 0 },
            tracker: {
              before: 13,
              after: 14,
              sourcePhaseBefore: "CANCELER_THAW",
              sourcePhaseAfter: "CANCELER_END",
            },
          },
        });
        expect(result.rulesContext.battlers).toBe(source.battlers);
      }
    }
  });

  it("preserves the source quirk: a non-thaw move leaves freeze and script intact but returns effect 2 and synchronizes status", () => {
    for (const attacker of [0, 1] as const) {
      const status1 = OTHER_STATUS | BATTLE_SCRIPT_STATUS1_FREEZE;
      const source = withAttacker(attacker, status1, TACKLE);
      const result = advanceBattleScriptAttackCancelerThaw(source, PC, RNG);
      expect(result).toMatchObject({
        kind: "advance",
        reason: "frozen-status-sync",
        rulesContext: {
          battlers: {
            [attacker]: { status1 },
          },
          multistringChooser: 9,
        },
        receipt: {
          effect: 2,
          status1: {
            before: status1,
            after: status1,
            clearedMask: 0,
          },
          script: { kind: "preserve", sourceProgramCounter: PC },
          cursor: { kind: "preserve" },
          multistringChooser: { kind: "preserve" },
          controllerSync: {
            kind: "frozen-status1-sync",
            activeBattler: {
              sourceGlobal: "gActiveBattler",
              after: attacker,
            },
            emit: {
              sourceFunction: "BtlController_EmitSetMonData",
              sourceRequest: "REQUEST_STATUS_BATTLE",
              offset: 0,
              size: 4,
              value: status1,
            },
            mark: {
              sourceFunction: "MarkBattlerForControllerExec",
              battler: attacker,
            },
          },
          rng: { callsConsumed: 0 },
        },
      });
      expect(result.rulesContext.battlers).toBe(source.battlers);
      expect(result.rulesContext).not.toHaveProperty("activeBattler");
    }
  });

  it("thaws both sides with both thaw-hit effects, preserving all other status bits and handing off exactly", () => {
    for (const attacker of [0, 1] as const) {
      for (const move of [FLAME_WHEEL, SACRED_FIRE]) {
        const status1 = OTHER_STATUS | BATTLE_SCRIPT_STATUS1_FREEZE;
        const source = withAttacker(attacker, status1, move);
        const result = advanceBattleScriptAttackCancelerThaw(source, PC, RNG);
        expect(result).toMatchObject({
          kind: "advance",
          reason: "defrosted-by-move",
          rngValue: RNG,
          rulesContext: {
            battlers: {
              [attacker]: { status1: OTHER_STATUS },
            },
            multistringChooser: 1,
            atkCancelerTracker: 14,
          },
          receipt: {
            moveEffect: {
              value: 125,
              sourceConstant: "EFFECT_THAW_HIT",
              thawHitValue: 125,
              matches: true,
            },
            status1: {
              before: status1,
              after: OTHER_STATUS,
              addedMask: 0,
              clearedMask: BATTLE_SCRIPT_STATUS1_FREEZE,
            },
            effect: 2,
            script: {
              kind: "handoff",
              sourceProgramCounter: PC,
              targetLabel: "BattleScript_MoveUsedUnfroze",
            },
            cursor: { kind: "push", sourceProgramCounter: PC },
            multistringChooser: {
              kind: "set",
              sourceConstant: "B_MSG_DEFROSTED_BY_MOVE",
              value: 1,
            },
            controllerSync: {
              kind: "frozen-status1-sync",
              activeBattler: { after: attacker },
              emit: { value: OTHER_STATUS },
              mark: { battler: attacker },
            },
            rng: { kind: "preserve", value: RNG, callsConsumed: 0 },
          },
        });
        expect(
          result.rulesContext.battlers[attacker].status1
          & ~BATTLE_SCRIPT_STATUS1_FREEZE,
        ).toBe(status1 & ~BATTLE_SCRIPT_STATUS1_FREEZE);
        expect(result.rulesContext.battlers[attacker].status2)
          .toBe(source.battlers[attacker].status2);
      }
    }
  });

  it("preserves preset chooser and unrelated script/controller-related rules state unless thaw-hit owns it", () => {
    const source = withAttacker(
      1,
      OTHER_STATUS | BATTLE_SCRIPT_STATUS1_FREEZE,
      TACKLE,
    );
    const result = advanceBattleScriptAttackCancelerThaw(source, PC, RNG);
    expect(result.rulesContext).toMatchObject({
      selectorRoles: source.selectorRoles,
      scriptingBattler: 3,
      battleOutcome: 0,
      currentMove: TACKLE,
      currentMovePosition: 0,
      moveResultFlags: 0xa5,
      hitMarker: 0x4000_0240,
      multistringChooser: 9,
      battleMoveDamage: -777,
      scriptingBideDmg: -99,
      absentBattlerFlags: 0,
    });
    expect(result.rulesContext.selectorRoles).toBe(source.selectorRoles);
    expect(result.rulesContext.bideDmg).toBe(source.bideDmg);
    expect(result.rulesContext.bideTarget).toBe(source.bideTarget);
  });

  it("gates before context ownership and rejects missing/invalid active singles context and input widths", () => {
    const gatedSource = rules({
      atkCancelerTracker: BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_BIDE,
      selectorRoles: { attacker: null, target: null, effectBattler: null },
    });
    const gated = advanceBattleScriptAttackCancelerThaw(
      gatedSource,
      PC,
      RNG,
    );
    expect(gated).toEqual({
      kind: "not-at-source-phase",
      rulesContext: gatedSource,
      rngValue: RNG,
      receipt: {
        sourcePhase: "CANCELER_THAW",
        tracker: { before: 12, after: 12 },
        rng: { kind: "preserve", value: RNG, callsConsumed: 0 },
      },
    });
    expect(() => advanceBattleScriptAttackCancelerThaw(
      rules({ selectorRoles: { attacker: null } }),
      PC,
      RNG,
    )).toThrow(/thaw phase requires an attacker role/);
    for (const attacker of [2, 3] as const) {
      expect(() => advanceBattleScriptAttackCancelerThaw(
        rules({ selectorRoles: { attacker } }),
        PC,
        RNG,
      )).toThrow(/attacker must be battler 0 or 1/);
    }
    expect(() => rules({ currentMove: 355 })).toThrow(
      /no source-derived gBattleMoves effect/,
    );
    for (const invalid of [-1, 1.5, 0x1_0000_0000, Number.NaN]) {
      expect(() => advanceBattleScriptAttackCancelerThaw(
        rules(),
        PC,
        invalid,
      )).toThrow(/RNG value must be a u32/);
      expect(() => advanceBattleScriptAttackCancelerThaw(
        rules(),
        invalid,
        RNG,
      )).toThrow(/program counter must be a u32/);
    }
  });

  it("is deterministic, input-immutable, deeply frozen, and consumes exactly zero RNG", () => {
    const source = withAttacker(
      1,
      OTHER_STATUS | BATTLE_SCRIPT_STATUS1_FREEZE,
      FLAME_WHEEL,
    );
    const before = JSON.stringify(source);
    const first = advanceBattleScriptAttackCancelerThaw(source, PC, RNG);
    const replay = advanceBattleScriptAttackCancelerThaw(source, PC, RNG);
    expect(replay).toEqual(first);
    expect(JSON.stringify(source)).toBe(before);
    expect(first.rngValue).toBe(RNG);
    expect(first.kind).toBe("advance");
    if (first.kind !== "advance") throw new Error("expected phase advance");
    expect(first.receipt.rng.callsConsumed).toBe(0);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.rulesContext)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers)).toBe(true);
    expect(Object.isFrozen(first.rulesContext.battlers[1])).toBe(true);
    expect(first.rulesContext.battlers[0]).toBe(source.battlers[0]);
    expect(first.rulesContext.battlers[2]).toBe(source.battlers[2]);
    expect(first.rulesContext.battlers[3]).toBe(source.battlers[3]);
    for (const field of [
      "freezePredicate",
      "moveEffect",
      "status1",
      "script",
      "cursor",
      "multistringChooser",
      "controllerSync",
      "rng",
      "tracker",
    ] as const) {
      expect(Object.isFrozen(first.receipt[field]), field).toBe(true);
    }
    if (first.receipt.controllerSync.kind === "frozen-status1-sync") {
      expect(Object.isFrozen(first.receipt.controllerSync.activeBattler)).toBe(true);
      expect(Object.isFrozen(first.receipt.controllerSync.emit)).toBe(true);
      expect(Object.isFrozen(first.receipt.controllerSync.mark)).toBe(true);
    }
  });
});
