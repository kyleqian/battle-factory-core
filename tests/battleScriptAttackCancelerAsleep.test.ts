import { describe, expect, it } from "vitest";
import mechanicLabEvidence from "./fixtures/attack-canceler-asleep-mechanic-lab-evidence.json" with { type: "json" };
import {
  advanceBattleScriptAttackCancelerAsleep,
} from "../src/engine/battleScriptActionAdmission.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ABILITY_EARLY_BIRD,
  BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
  BATTLE_SCRIPT_ATTACK_CANCELER_PHASES,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
  BATTLE_SCRIPT_MOVE_SLEEP_TALK,
  BATTLE_SCRIPT_MOVE_SNORE,
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "../src/engine/battleScriptSourceConstants.ts";

const SOURCE_PC = 0x0123_4567;
const OTHER_STATUS1 = 0x0000_0bc8;
const OTHER_STATUS2 = 0x4000_0085;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    moves: changes.moves ?? Object.freeze([0, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([10, 20, 30, 40]),
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

function input(
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContextInput {
  return {
    battlers: changes.battlers ?? [battler(), battler(), battler(), battler()],
    selectorRoles: changes.selectorRoles ?? {
      attacker: 0,
      target: 1,
      effectBattler: 1,
    },
    scriptingBattler: changes.scriptingBattler ?? 0,
    atkCancelerTracker: changes.atkCancelerTracker
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_ASLEEP,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? 92,
    currentMovePosition: changes.currentMovePosition ?? 0,
    moveResultFlags: changes.moveResultFlags ?? 0x24,
    dmgMultiplier: changes.dmgMultiplier ?? 7,
    critMultiplier: changes.critMultiplier ?? 9,
    moveEffectByte: changes.moveEffectByte ?? 0xe1,
    missType: changes.missType ?? 5,
    hitMarker: changes.hitMarker ?? 0x40,
    multiHitCounter: changes.multiHitCounter ?? 3,
  };
}

function rules(changes: Partial<BattleScriptRulesContextInput> = {}) {
  return createBattleScriptRulesContext(input(changes));
}

describe("source-shaped attack-canceler asleep phase", () => {
  it("pins fresh zero-PP-Up Scene-OFF sleep cancellation evidence", () => {
    expect(mechanicLabEvidence).toMatchObject({
      oracleProfile: "battle-scene-off",
      fixture: "tools/battle-lab/attack-canceler-asleep-off.json",
      playerSetId: 274,
      playerSpecies: 64,
      playerMoveId: 33,
      playerMoveName: "TACKLE",
      opponentSetId: 291,
      opponentSpecies: 353,
      opponentMoveId: 79,
      opponentMoveName: "SLEEP_POWDER",
      playerPpUps: [0, 0, 0, 0],
      opponentPpUps: [0, 0, 0, 0],
      sleepAppliedFrame: 200,
      sleepCounterBeforeAdmission: 4,
      canceledMoveFrame: 300,
      sleepCounterAfterAdmission: 3,
      playerPpBeforeAdmission: 35,
      playerPpAfterAdmission: 35,
      playerHpBeforeAdmission: 136,
      playerHpAfterAdmission: 136,
      rngBeforeAdmission: 4106679800,
      rngAfterAdmission: 4106679800,
      currentMoveAtCanceledFrame: 33,
      battleOutcome: 0,
    });
    expect(mechanicLabEvidence.fixtureSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(mechanicLabEvidence.freshManifestSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(mechanicLabEvidence.sleepAppliedFrameSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(mechanicLabEvidence.canceledMoveFrameSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("pins the exact source constants and stops at CANCELER_FROZEN", () => {
    expect(BATTLE_SCRIPT_STATUS1_SLEEP).toBe(7);
    expect(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR).toBe(0x70);
    expect(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE).toBe(0x0800_0000);
    expect(BATTLE_SCRIPT_ABILITY_SOUNDPROOF).toBe(43);
    expect(BATTLE_SCRIPT_ABILITY_EARLY_BIRD).toBe(48);
    expect(BATTLE_SCRIPT_MOVE_SNORE).toBe(173);
    expect(BATTLE_SCRIPT_MOVE_SLEEP_TALK).toBe(214);
    expect(BATTLE_SCRIPT_ATTACK_CANCELER_PHASES).toEqual({
      CANCELER_FLAGS: 0,
      CANCELER_ASLEEP: 1,
      CANCELER_FROZEN: 2,
      CANCELER_TRUANT: 3,
      CANCELER_RECHARGE: 4,
      CANCELER_FLINCH: 5,
      CANCELER_DISABLED: 6,
      CANCELER_TAUNTED: 7,
      CANCELER_IMPRISONED: 8,
      CANCELER_CONFUSED: 9,
      CANCELER_PARALYZED: 10,
      CANCELER_IN_LOVE: 11,
      CANCELER_BIDE: 12,
      CANCELER_THAW: 13,
    });
  });

  it("advances an awake attacker without scanning, scripting, or requesting a write", () => {
    const source = rules({
      battlers: [
        battler({ status1: OTHER_STATUS1, status2: OTHER_STATUS2 }),
        battler({ status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR }),
        battler(),
        battler(),
      ],
    });
    const result = advanceBattleScriptAttackCancelerAsleep(source, SOURCE_PC);
    expect(result).toMatchObject({
      kind: "advance",
      reason: "not-asleep",
      receipt: {
        sourcePhase: "CANCELER_ASLEEP",
        attacker: 0,
        sleepCounter: { before: 0, after: 0, decrement: 0 },
        uproarScan: {
          performed: false,
          checkedBattlers: [],
          sourceBattler: null,
          blockedBySoundproof: false,
          scriptingBattler: { kind: "preserve" },
          targetBattler: {
            kind: "preserve",
            battler: 1,
            sourceSentinelWrite: "unreachable-at-attack-canceler-entry",
          },
          helperMultistringChooser: {
            kind: "not-written",
            reason: "no-uproar-source",
          },
        },
        effect: 0,
        script: { kind: "preserve", sourceProgramCounter: SOURCE_PC },
        cursor: { kind: "preserve" },
        multistringChooser: { kind: "preserve" },
        statusController: { kind: "none" },
        tracker: {
          before: 1,
          after: 2,
          sourcePhaseBefore: "CANCELER_ASLEEP",
          sourcePhaseAfter: "CANCELER_FROZEN",
        },
      },
    });
    expect(result.rulesContext.battlers).toBe(source.battlers);
    expect(result.rulesContext.hitMarker).toBe(source.hitMarker);
  });

  it("exhaustively owns every reachable Uproar source/target relation and transient chooser write", () => {
    for (const uproarOwner of [0, 1, 2, 3] as const) {
      for (const initialTarget of [0, 1, 2, 3] as const) {
        const sourceBattlers = [battler(), battler(), battler(), battler()];
        sourceBattlers[2] = battler({
          ability: BATTLE_SCRIPT_ABILITY_EARLY_BIRD,
          status1: OTHER_STATUS1 | 7,
          status2: OTHER_STATUS2 | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE,
        });
        sourceBattlers[uproarOwner] = battler({
          ...sourceBattlers[uproarOwner],
          status2: (
            sourceBattlers[uproarOwner]!.status2
            | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR
          ) >>> 0,
        });
        const source = rules({
          battlers: sourceBattlers,
          selectorRoles: { attacker: 2, target: initialTarget, effectBattler: 0 },
          currentMove: BATTLE_SCRIPT_MOVE_SLEEP_TALK,
        });
        const result = advanceBattleScriptAttackCancelerAsleep(source, SOURCE_PC);
        expect(result.kind).toBe("advance");
        if (result.kind !== "advance") throw new Error("expected asleep phase");
        expect(result.reason).toBe("uproar-woke");
        expect(result.receipt.uproarScan).toEqual({
          performed: true,
          checkedBattlers: [0, 1, 2, 3].slice(0, uproarOwner + 1),
          sourceBattler: uproarOwner,
          blockedBySoundproof: false,
          scriptingBattler: { kind: "set", battler: uproarOwner },
          targetBattler: {
            kind: "preserve",
            battler: initialTarget,
            sourceSentinelWrite: "unreachable-at-attack-canceler-entry",
          },
          helperMultistringChooser: initialTarget === uproarOwner
              ? {
                kind: "written-then-overwritten",
                targetRelation: "same-as-uproar-source",
                sourceConstant: "B_MSG_CANT_SLEEP_UPROAR",
                value: 0,
                overwrittenBeforeHandoffBy: "B_MSG_WOKE_UP_UPROAR",
              }
              : {
                kind: "written-then-overwritten",
                targetRelation: "different-from-uproar-source",
                sourceConstant: "B_MSG_UPROAR_KEPT_AWAKE",
                value: 1,
                overwrittenBeforeHandoffBy: "B_MSG_WOKE_UP_UPROAR",
              },
        });
        expect(result.rulesContext.selectorRoles).toBe(source.selectorRoles);
        expect(result.receipt.sleepCounter).toEqual({
          before: 7,
          after: 0,
          decrement: 0,
        });
        expect(result.rulesContext.battlers[2].status1).toBe(OTHER_STATUS1);
        expect(
          result.rulesContext.battlers[2].status2
          & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE
        ).toBe(0);
        expect(result.receipt.effect).toBe(2);
        expect(result.receipt.script).toEqual({
          kind: "handoff",
          sourceProgramCounter: SOURCE_PC,
          targetLabel: "BattleScript_MoveUsedWokeUp",
        });
        expect(result.receipt.cursor).toEqual({
          kind: "push",
          sourceProgramCounter: SOURCE_PC,
        });
        expect(result.receipt.multistringChooser).toEqual({
          kind: "set",
          sourceConstant: "B_MSG_WOKE_UP_UPROAR",
          value: 1,
        });
        expect(result.receipt.statusController).toEqual({
          kind: "request-status1-write",
          battler: 2,
          sourceRequest: "REQUEST_STATUS_BATTLE",
          offset: 0,
          size: 4,
          value: OTHER_STATUS1,
          markForControllerExecution: true,
        });
      }
    }
  });

  it("lets Soundproof block every Uproar battler before ordinary sleep decrement", () => {
    const source = rules({
      battlers: [
        battler({ status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR }),
        battler({ status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR }),
        battler({
          ability: BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
          status1: OTHER_STATUS1 | 3,
          status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE,
        }),
        battler({ status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR }),
      ],
      selectorRoles: { attacker: 2, target: 1, effectBattler: 0 },
    });
    const result = advanceBattleScriptAttackCancelerAsleep(source, SOURCE_PC);
    expect(result.kind).toBe("advance");
    if (result.kind !== "advance") throw new Error("expected asleep phase");
    expect(result.reason).toBe("asleep");
    expect(result.receipt.uproarScan).toEqual({
      performed: true,
      checkedBattlers: [0, 1, 2, 3],
      sourceBattler: null,
      blockedBySoundproof: true,
      scriptingBattler: { kind: "preserve" },
      targetBattler: {
        kind: "preserve",
        battler: 1,
        sourceSentinelWrite: "unreachable-at-attack-canceler-entry",
      },
      helperMultistringChooser: {
        kind: "not-written",
        reason: "no-uproar-source",
      },
    });
    expect(result.receipt.sleepCounter).toEqual({ before: 3, after: 2, decrement: 1 });
    expect(
      result.rulesContext.battlers[2].status2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE
    ).not.toBe(0);
  });

  it("pins every counter, Early Bird decrement, and Snore/Sleep Talk exception combination", () => {
    for (const ability of [0, BATTLE_SCRIPT_ABILITY_EARLY_BIRD]) {
      for (let counter = 1; counter <= 7; counter += 1) {
        for (const move of [92, BATTLE_SCRIPT_MOVE_SNORE, BATTLE_SCRIPT_MOVE_SLEEP_TALK]) {
          const source = rules({
            battlers: [
              battler({
                ability,
                status1: OTHER_STATUS1 | counter,
                status2: OTHER_STATUS2 | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE,
              }),
              battler(),
              battler(),
              battler(),
            ],
            currentMove: move,
          });
          const result = advanceBattleScriptAttackCancelerAsleep(source, SOURCE_PC);
          expect(result.kind).toBe("advance");
          if (result.kind !== "advance") throw new Error("expected asleep phase");
          const decrement = ability === BATTLE_SCRIPT_ABILITY_EARLY_BIRD ? 2 : 1;
          const after = counter < decrement ? 0 : counter - decrement;
          const exception = move === BATTLE_SCRIPT_MOVE_SNORE
            || move === BATTLE_SCRIPT_MOVE_SLEEP_TALK;
          const expectedReason = after === 0
            ? "woke-up"
            : exception
              ? "sleep-move-allowed"
              : "asleep";
          expect(result.reason).toBe(expectedReason);
          expect(result.receipt.sleepCounter).toEqual({
            before: counter,
            after,
            decrement,
          });
          expect(result.rulesContext.battlers[0].status1).toBe(OTHER_STATUS1 | after);
          expect(result.receipt.effect).toBe(
            expectedReason === "sleep-move-allowed" ? 0 : 2,
          );
          expect(result.receipt.statusController.kind).toBe(
            expectedReason === "sleep-move-allowed"
              ? "none"
              : "request-status1-write",
          );
          if (expectedReason === "woke-up") {
            expect(result.receipt.script).toEqual({
              kind: "handoff",
              sourceProgramCounter: SOURCE_PC,
              targetLabel: "BattleScript_MoveUsedWokeUp",
            });
            expect(result.receipt.cursor).toEqual({
              kind: "push",
              sourceProgramCounter: SOURCE_PC,
            });
            expect(result.receipt.multistringChooser).toEqual({
              kind: "set",
              sourceConstant: "B_MSG_WOKE_UP",
              value: 0,
            });
            expect(result.receipt.statusController).toMatchObject({
              kind: "request-status1-write",
              battler: 0,
              value: OTHER_STATUS1,
            });
          } else if (expectedReason === "sleep-move-allowed") {
            expect(result.receipt.script).toEqual({
              kind: "preserve",
              sourceProgramCounter: SOURCE_PC,
            });
            expect(result.receipt.cursor).toEqual({ kind: "preserve" });
            expect(result.receipt.multistringChooser).toEqual({ kind: "preserve" });
          }
          expect(
            result.rulesContext.battlers[0].status2
            & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE
          ).toBe(after === 0 ? 0 : BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE);
        }
      }
    }
  });

  it("uses strict source comparison to prevent Early Bird underflow and preserves non-sleep bits", () => {
    const source = rules({
      battlers: [
        battler({
          ability: BATTLE_SCRIPT_ABILITY_EARLY_BIRD,
          status1: 0xffff_fff9,
        }),
        battler(),
        battler(),
        battler(),
      ],
    });
    const result = advanceBattleScriptAttackCancelerAsleep(source, SOURCE_PC);
    expect(result.kind).toBe("advance");
    if (result.kind !== "advance") throw new Error("expected asleep phase");
    expect(result.receipt.sleepCounter).toEqual({ before: 1, after: 0, decrement: 2 });
    expect(result.rulesContext.battlers[0].status1).toBe(0xffff_fff8);
    expect(result.receipt.status1.clearedMask).toBe(1);
    expect(result.receipt.status1.addedMask).toBe(0);
  });

  it("selects the exact asleep effects without cursor push or message selection", () => {
    const source = rules({
      battlers: [battler({ status1: 4 }), battler(), battler(), battler()],
      hitMarker: 0x40,
    });
    const result = advanceBattleScriptAttackCancelerAsleep(source, SOURCE_PC);
    expect(result.kind).toBe("advance");
    if (result.kind !== "advance") throw new Error("expected asleep phase");
    expect(result.receipt).toMatchObject({
      reason: "asleep",
      hitMarker: {
        before: 0x40,
        after: 0x0008_0040,
        addedMask: BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
        clearedMask: 0,
      },
      effect: 2,
      script: {
        kind: "handoff",
        sourceProgramCounter: SOURCE_PC,
        targetLabel: "BattleScript_MoveUsedIsAsleep",
      },
      cursor: { kind: "preserve" },
      multistringChooser: { kind: "preserve" },
      statusController: {
        kind: "request-status1-write",
        battler: 0,
        sourceRequest: "REQUEST_STATUS_BATTLE",
        offset: 0,
        size: 4,
        value: 3,
        markForControllerExecution: true,
      },
    });
  });

  it("is identity-gated before role lookup and rejects invalid roles and source PCs", () => {
    for (const tracker of [0, 2, 14, 255]) {
      const source = rules({ atkCancelerTracker: tracker, selectorRoles: {} });
      const result = advanceBattleScriptAttackCancelerAsleep(source, SOURCE_PC);
      expect(result).toEqual({
        kind: "not-at-source-phase",
        rulesContext: source,
        receipt: {
          sourcePhase: "CANCELER_ASLEEP",
          tracker: { before: tracker, after: tracker },
        },
      });
      expect(result.rulesContext).toBe(source);
    }
    expect(() => advanceBattleScriptAttackCancelerAsleep(
      rules({ selectorRoles: {} }),
      SOURCE_PC,
    )).toThrow(/asleep phase requires an attacker role/);
    expect(() => advanceBattleScriptAttackCancelerAsleep(
      rules({ selectorRoles: { attacker: 0, target: null, effectBattler: 1 } }),
      SOURCE_PC,
    )).toThrow(/requires the target selected by HandleAction_UseMove/);
    for (const invalidPc of [-1, 1.5, 0x1_0000_0000]) {
      expect(() => advanceBattleScriptAttackCancelerAsleep(
        rules(),
        invalidPc,
      )).toThrow(/must be a u32/);
    }
  });

  it("is deterministic, immutable, deeply frozen, and preserves unrelated identities", () => {
    const sourceInput = input({
      battlers: [
        battler(),
        battler({
          ability: BATTLE_SCRIPT_ABILITY_EARLY_BIRD,
          hp: 77,
          pp: [1, 2, 3, 4],
          status1: OTHER_STATUS1 | 5,
          status2: OTHER_STATUS2,
          status3: 0xa5a5_a5a5,
          substituteHP: 31,
          rolloutTimer: 15,
          furyCutterCounter: 9,
        }),
        battler(),
        battler(),
      ],
      selectorRoles: { attacker: 1, target: 2, effectBattler: 3 },
    });
    const source = createBattleScriptRulesContext(sourceInput);
    const first = advanceBattleScriptAttackCancelerAsleep(source, SOURCE_PC);
    const replay = advanceBattleScriptAttackCancelerAsleep(source, SOURCE_PC);
    expect(replay).toEqual(first);
    expect(first.kind).toBe("advance");
    if (first.kind !== "advance") throw new Error("expected asleep phase");
    expect(source).toEqual(createBattleScriptRulesContext(sourceInput));
    expect(first.rulesContext.battlers[0]).toBe(source.battlers[0]);
    expect(first.rulesContext.battlers[1]).not.toBe(source.battlers[1]);
    expect(first.rulesContext.battlers[1].pp).toBe(source.battlers[1].pp);
    expect(first.rulesContext.battlers[2]).toBe(source.battlers[2]);
    expect(first.rulesContext.battlers[3]).toBe(source.battlers[3]);
    expect(first.rulesContext.selectorRoles).toBe(source.selectorRoles);
    expect(first.rulesContext).toMatchObject({
      battleOutcome: source.battleOutcome,
      currentMove: source.currentMove,
      currentMovePosition: source.currentMovePosition,
      moveResultFlags: source.moveResultFlags,
      dmgMultiplier: source.dmgMultiplier,
      critMultiplier: source.critMultiplier,
      moveEffectByte: source.moveEffectByte,
      missType: source.missType,
      multiHitCounter: source.multiHitCounter,
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.receipt)).toBe(true);
    expect(Object.isFrozen(first.receipt.sleepCounter)).toBe(true);
    expect(Object.isFrozen(first.receipt.uproarScan)).toBe(true);
    expect(Object.isFrozen(first.receipt.uproarScan.checkedBattlers)).toBe(true);
    expect(Object.isFrozen(first.receipt.uproarScan.scriptingBattler)).toBe(true);
    expect(Object.isFrozen(first.receipt.uproarScan.targetBattler)).toBe(true);
    expect(Object.isFrozen(first.receipt.uproarScan.helperMultistringChooser)).toBe(true);
    expect(Object.isFrozen(first.receipt.status1)).toBe(true);
    expect(Object.isFrozen(first.receipt.status2)).toBe(true);
    expect(Object.isFrozen(first.receipt.hitMarker)).toBe(true);
    expect(Object.isFrozen(first.receipt.script)).toBe(true);
    expect(Object.isFrozen(first.receipt.cursor)).toBe(true);
    expect(Object.isFrozen(first.receipt.multistringChooser)).toBe(true);
    expect(Object.isFrozen(first.receipt.statusController)).toBe(true);
    expect(Object.isFrozen(first.receipt.tracker)).toBe(true);
    expect(Object.isFrozen(first.rulesContext)).toBe(true);
  });
});
