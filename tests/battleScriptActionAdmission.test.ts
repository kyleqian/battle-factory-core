import { describe, expect, it } from "vitest";
import mechanicLabEvidence from "./fixtures/action-admission-mechanic-lab-evidence.json" with { type: "json" };
import {
  preflightBattleScriptActionEntry,
  preflightBattleScriptSelectedMovePp,
} from "../src/engine/battleScriptActionAdmission.ts";
import {
  createBattleScriptRulesContext,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_ACTION_FINISHED,
  BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP,
  BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
  BATTLE_SCRIPT_MOVE_RESULT_MISSED,
  BATTLE_SCRIPT_MOVE_STRUGGLE,
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "../src/engine/battleScriptSourceConstants.ts";

const SOURCE_PC = 0x0123_4567;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    hp: changes.hp ?? 100,
    pp: changes.pp ?? Object.freeze([10, 20, 30, 40]),
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0,
  });
}

function contextInput(
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContextInput {
  return {
    battlers: changes.battlers ?? [
      battler(),
      battler(),
      battler(),
      battler(),
    ],
    selectorRoles: changes.selectorRoles ?? { attacker: 0, effectBattler: 1 },
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

describe("source-shaped action-admission entry preflight", () => {
  it("pins the fresh zero-PP-Up Scene-OFF Mechanics Lab evidence", () => {
    expect(mechanicLabEvidence).toMatchObject({
      oracleProfile: "battle-scene-off",
      fixture: "tools/battle-lab/attack-spine-no-pp-off.json",
      moveId: 92,
      moveName: "TOXIC",
      opponentSetId: 349,
      opponentSpecies: 82,
      opponentTypes: [13, 8],
      ppUps: [0, 0, 0, 0],
      initialPp: 10,
      ppAfterTenOrdinarySelections: 0,
      ppAfterEleventhSelectionAttempt: 0,
      finalFrame: 8074,
      finalPlayerControllerCommand: 17,
      finalPlayerControllerCommandName: "CONTROLLER_PRINTSTRINGPLAYERONLY",
      finalControllerExecFlags: 1,
      playerHp: 136,
      opponentHp: 146,
      battleOutcome: 0,
    });
    expect(mechanicLabEvidence.fixtureSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(mechanicLabEvidence.freshManifestSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(mechanicLabEvidence.finalFrameSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("pins the exact source constants used by this bounded slice", () => {
    expect(BATTLE_SCRIPT_ACTION_FINISHED).toBe(12);
    expect(BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING).toBe(1 << 9);
    expect(BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE).toBe(1 << 19);
    expect(BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP).toBe(1 << 23);
    expect(BATTLE_SCRIPT_MOVE_RESULT_MISSED).toBe(1);
    expect(BATTLE_SCRIPT_MOVE_STRUGGLE).toBe(165);
    expect(BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS).toBe(1 << 12);
  });

  it("finishes an already-resolved battle before inspecting attacker state", () => {
    const source = rules({
      battleOutcome: 3,
      battlers: [battler({ hp: 0, pp: [0, 0, 0, 0] }), battler(), battler(), battler()],
      hitMarker: 0x0000_0040,
      moveResultFlags: 0x24,
    });
    const result = preflightBattleScriptActionEntry(source, SOURCE_PC);
    expect(result).toEqual({
      kind: "stop",
      reason: "battle-outcome-finished",
      rulesContext: source,
      receipt: {
        sourceCheckpoint: "entry",
        programCounter: { kind: "preserve", sourceProgramCounter: SOURCE_PC },
        currentAction: {
          kind: "set",
          sourceConstant: "B_ACTION_FINISHED",
          value: 12,
        },
        moveResultFlags: {
          before: 0x24,
          after: 0x24,
          addedMask: 0,
          clearedMask: 0,
        },
        hitMarker: {
          before: 0x40,
          after: 0x40,
          addedMask: 0,
          clearedMask: 0,
        },
      },
    });
  });

  it("routes a fainted attacker to MoveEnd and adds only the unable marker", () => {
    const source = rules({
      battlers: [battler(), battler(), battler({ hp: 0 }), battler()],
      selectorRoles: { attacker: 2, effectBattler: 0 },
      hitMarker: 0x0000_0040,
      moveResultFlags: 0x24,
    });
    const result = preflightBattleScriptActionEntry(source, SOURCE_PC);
    expect(result.kind).toBe("stop");
    expect(result.reason).toBe("fainted-attacker");
    expect(result.receipt).toEqual({
      sourceCheckpoint: "entry",
      programCounter: {
        kind: "jump",
        sourceProgramCounter: SOURCE_PC,
        targetLabel: "BattleScript_MoveEnd",
      },
      currentAction: { kind: "preserve" },
      moveResultFlags: {
        before: 0x24,
        after: 0x24,
        addedMask: 0,
        clearedMask: 0,
      },
      hitMarker: {
        before: 0x40,
        after: 0x0008_0040,
        addedMask: 0x0008_0000,
        clearedMask: 0,
      },
    });
    expect(result.rulesContext).not.toBe(source);
    expect(result.rulesContext.hitMarker).toBe(
      0x40 | BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
    );
    expect(result.rulesContext.battlers).toBe(source.battlers);
    expect(result.rulesContext.selectorRoles).toBe(source.selectorRoles);
  });

  it("hands ordinary and no-attack-string faint states to the unimplemented canceler", () => {
    for (const source of [
      rules(),
      rules({
        battlers: [battler({ hp: 0 }), battler(), battler(), battler()],
        hitMarker: BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
      }),
    ]) {
      const result = preflightBattleScriptActionEntry(source, SOURCE_PC);
      expect(result).toMatchObject({
        kind: "continue",
        reason: "continue-to-unable-to-use-move",
        rulesContext: source,
        receipt: {
          sourceCheckpoint: "entry",
          programCounter: { kind: "preserve", sourceProgramCounter: SOURCE_PC },
          currentAction: { kind: "preserve" },
        },
      });
    }
  });
});

describe("source-shaped selected-move PP admission preflight", () => {
  it("exhaustively fails only when all five source no-PP predicates hold", () => {
    for (let predicateBits = 0; predicateBits < 32; predicateBits += 1) {
      const ppZero = (predicateBits & 1) !== 0;
      const notStruggle = (predicateBits & 2) !== 0;
      const noAllowNoPp = (predicateBits & 4) !== 0;
      const noAttackString = (predicateBits & 8) !== 0;
      const noMultiTurn = (predicateBits & 16) !== 0;
      const source = rules({
        battlers: [
          battler({
            pp: [7, ppZero ? 0 : 1, 9, 11],
            status2: noMultiTurn
              ? 0
              : BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
          }),
          battler(),
          battler(),
          battler(),
        ],
        currentMovePosition: 1,
        currentMove: notStruggle ? 92 : BATTLE_SCRIPT_MOVE_STRUGGLE,
        hitMarker: (
          (noAllowNoPp ? 0 : BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP)
          | (noAttackString ? 0 : BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING)
        ),
        moveResultFlags: 0x20,
      });
      const result = preflightBattleScriptSelectedMovePp(source, SOURCE_PC);
      const shouldFail = predicateBits === 31;
      expect(result.kind).toBe(shouldFail ? "stop" : "continue");
      expect(result.reason).toBe(
        shouldFail
          ? "selected-move-has-no-pp"
          : "continue-to-obedience",
      );
      expect(result.rulesContext.moveResultFlags).toBe(
        shouldFail ? 0x21 : 0x20,
      );
      expect(result.rulesContext.hitMarker).toBe(
        source.hitMarker & ~BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP,
      );
    }
  });

  it("names the exact NoPPForMove PC and missed-result effects", () => {
    const source = rules({
      battlers: [battler({ pp: [8, 6, 0, 2] }), battler(), battler(), battler()],
      currentMovePosition: 2,
      moveResultFlags: 0x28,
      hitMarker: 0x40,
    });
    const result = preflightBattleScriptSelectedMovePp(source, SOURCE_PC);
    expect(result).toMatchObject({
      kind: "stop",
      reason: "selected-move-has-no-pp",
      receipt: {
        sourceCheckpoint: "after-unable-and-move-block",
        programCounter: {
          kind: "jump",
          sourceProgramCounter: SOURCE_PC,
          targetLabel: "BattleScript_NoPPForMove",
        },
        currentAction: { kind: "preserve" },
        moveResultFlags: {
          before: 0x28,
          after: 0x29,
          addedMask: 1,
          clearedMask: 0,
        },
        hitMarker: {
          before: 0x40,
          after: 0x40,
          addedMask: 0,
          clearedMask: 0,
        },
      },
    });
    expect(result.rulesContext.battlers).toBe(source.battlers);
    expect(result.rulesContext.selectorRoles).toBe(source.selectorRoles);
  });

  it("continues for Struggle, allow-no-PP, no-attack-string, multi-turn, and nonzero PP", () => {
    const zeroPpBattlers = [battler({ pp: [0, 2, 3, 4] }), battler(), battler(), battler()];
    const cases = [
      rules({ battlers: zeroPpBattlers, currentMove: BATTLE_SCRIPT_MOVE_STRUGGLE }),
      rules({ battlers: zeroPpBattlers, hitMarker: BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP }),
      rules({ battlers: zeroPpBattlers, hitMarker: BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING }),
      rules({
        battlers: [
          battler({
            pp: [0, 2, 3, 4],
            status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
          }),
          battler(),
          battler(),
          battler(),
        ],
      }),
      rules(),
    ];
    for (const source of cases) {
      const result = preflightBattleScriptSelectedMovePp(source, SOURCE_PC);
      expect(result).toMatchObject({
        kind: "continue",
        reason: "continue-to-obedience",
        receipt: {
          sourceCheckpoint: "after-unable-and-move-block",
          programCounter: { kind: "preserve", sourceProgramCounter: SOURCE_PC },
          currentAction: { kind: "preserve" },
        },
      });
      expect(result.rulesContext.hitMarker).toBe(
        source.hitMarker & ~BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP,
      );
    }
  });

  it("is deterministic, deeply frozen, non-mutating, and identity-preserving", () => {
    const sourceInput = contextInput({
      battlers: [battler({ pp: [0, 4, 5, 6] }), battler(), battler(), battler()],
      hitMarker: BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP | 0x40,
      moveResultFlags: 0x20,
    });
    const source = createBattleScriptRulesContext(sourceInput);
    const first = preflightBattleScriptSelectedMovePp(source, SOURCE_PC);
    const replay = preflightBattleScriptSelectedMovePp(source, SOURCE_PC);
    expect(replay).toEqual(first);
    expect(source).toEqual(createBattleScriptRulesContext(sourceInput));
    expect(first.rulesContext).not.toBe(source);
    expect(first.rulesContext.battlers).toBe(source.battlers);
    expect(first.rulesContext.battlers[0]).toBe(source.battlers[0]);
    expect(first.rulesContext.battlers[0].pp).toBe(source.battlers[0].pp);
    expect(first.rulesContext.selectorRoles).toBe(source.selectorRoles);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.receipt)).toBe(true);
    expect(Object.isFrozen(first.receipt.programCounter)).toBe(true);
    expect(Object.isFrozen(first.receipt.currentAction)).toBe(true);
    expect(Object.isFrozen(first.receipt.moveResultFlags)).toBe(true);
    expect(Object.isFrozen(first.receipt.hitMarker)).toBe(true);
    expect(Object.isFrozen(first.rulesContext)).toBe(true);

    const unchangedSource = rules();
    const unchanged = preflightBattleScriptSelectedMovePp(
      unchangedSource,
      SOURCE_PC,
    );
    expect(unchanged.rulesContext).toBe(unchangedSource);
    expect(unchanged.rulesContext.hitMarker).toBe(0);
  });

  it("rejects missing attacker ownership and invalid source PCs", () => {
    const missing = rules({ selectorRoles: { effectBattler: 1 } });
    expect(() => preflightBattleScriptActionEntry(missing, SOURCE_PC)).toThrow(
      /requires an attacker role/,
    );
    expect(() => preflightBattleScriptSelectedMovePp(missing, SOURCE_PC)).toThrow(
      /requires an attacker role/,
    );
    for (const invalidPc of [-1, 0x1_0000_0000, 1.5]) {
      expect(() => preflightBattleScriptActionEntry(rules(), invalidPc)).toThrow(
        /must be a u32/,
      );
    }
  });
});
