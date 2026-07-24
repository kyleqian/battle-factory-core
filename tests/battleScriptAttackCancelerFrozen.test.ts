import { describe, expect, it } from "vitest";
import {
  advanceBattleScriptAttackCancelerFrozen,
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
  BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
  BATTLE_SCRIPT_STATUS1_FREEZE,
} from "../src/engine/battleScriptSourceConstants.ts";

const SOURCE_PC = 0x0123_4567;
const OTHER_STATUS1 = 0x8000;
const TACKLE = 33;
const FLAME_WHEEL = 172;

function battler(
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    pp: changes.pp ?? Object.freeze([35, 20, 30, 40]),
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0,
  });
}

function rules(
  changes: Partial<BattleScriptRulesContextInput> = {},
) {
  return createBattleScriptRulesContext({
    battlers: changes.battlers ?? [battler(), battler(), battler(), battler()],
    selectorRoles: changes.selectorRoles ?? {
      attacker: 0,
      target: 1,
      effectBattler: 1,
    },
    atkCancelerTracker: changes.atkCancelerTracker
      ?? BATTLE_SCRIPT_ATTACK_CANCELER_PHASES.CANCELER_FROZEN,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? TACKLE,
    currentMovePosition: changes.currentMovePosition ?? 0,
    moveResultFlags: changes.moveResultFlags ?? 0x24,
    dmgMultiplier: changes.dmgMultiplier ?? 7,
    critMultiplier: changes.critMultiplier ?? 9,
    moveEffectByte: changes.moveEffectByte ?? 0xe1,
    missType: changes.missType ?? 5,
    hitMarker: changes.hitMarker ?? 0x40,
    multiHitCounter: changes.multiHitCounter ?? 3,
  });
}

describe("source-shaped attack-canceler frozen phase", () => {
  it("pins source constants and resolves move effects from the generated gBattleMoves topology", () => {
    expect(BATTLE_SCRIPT_STATUS1_FREEZE).toBe(1 << 5);
    expect(BATTLE_SCRIPT_EFFECT_THAW_HIT).toBe(125);
    expect(resolveBattleScriptCurrentMoveEffect(TACKLE)).toBe(0);
    expect(resolveBattleScriptCurrentMoveEffect(FLAME_WHEEL)).toBe(125);
    expect(resolveBattleScriptCurrentMoveEffect(221)).toBe(125);
    expect(() => resolveBattleScriptCurrentMoveEffect(355)).toThrow(
      /no source-derived gBattleMoves effect/,
    );
  });

  it("advances a non-frozen attacker without drawing RNG or changing source-owned fields", () => {
    const source = rules({
      battlers: [
        battler({ status1: OTHER_STATUS1 }),
        battler(),
        battler(),
        battler(),
      ],
    });
    const result = advanceBattleScriptAttackCancelerFrozen(source, SOURCE_PC, 7);
    expect(result).toMatchObject({
      kind: "advance",
      reason: "not-frozen",
      rngValue: 7,
      receipt: {
        sourcePhase: "CANCELER_FROZEN",
        moveEffect: {
          currentMove: TACKLE,
          sourceField: "gBattleMoves[gCurrentMove].effect",
          value: 0,
          isThawHit: false,
        },
        rng: {
          kind: "preserve",
          value: 7,
          reason: "attacker-not-frozen",
        },
        effect: 0,
        script: { kind: "preserve", sourceProgramCounter: SOURCE_PC },
        cursor: { kind: "preserve" },
        multistringChooser: { kind: "preserve" },
        statusController: { kind: "none" },
        tracker: {
          before: 2,
          after: 3,
          sourcePhaseBefore: "CANCELER_FROZEN",
          sourcePhaseAfter: "CANCELER_TRUANT",
        },
      },
    });
    expect(result.rulesContext.battlers).toBe(source.battlers);
    expect(result.rulesContext.hitMarker).toBe(source.hitMarker);
  });

  it("exhaustively cancels an ordinary move for every failed-thaw remainder", () => {
    const seedsByRemainder = [undefined, 2, 4, 1, 6] as const;
    for (const remainder of [1, 2, 3, 4] as const) {
      const seed = seedsByRemainder[remainder]!;
      const source = rules({
        battlers: [
          battler({ status1: OTHER_STATUS1 | BATTLE_SCRIPT_STATUS1_FREEZE }),
          battler(),
          battler(),
          battler(),
        ],
        hitMarker: 0x40,
      });
      const result = advanceBattleScriptAttackCancelerFrozen(
        source,
        SOURCE_PC,
        seed,
      );
      expect(result.kind).toBe("advance");
      if (result.kind !== "advance") throw new Error("expected frozen phase");
      expect(result.reason).toBe("frozen");
      expect(result.receipt.rng).toMatchObject({
        kind: "draw",
        name: "CANCELER_FROZEN_THAW_CHECK",
        sourceCall: "Random",
        modulo: 5,
        before: seed,
        remainder,
      });
      expect(result.receipt.effect).toBe(2);
      expect(result.receipt.script).toEqual({
        kind: "handoff",
        sourceProgramCounter: SOURCE_PC,
        targetLabel: "BattleScript_MoveUsedIsFrozen",
      });
      expect(result.receipt.hitMarker).toEqual({
        before: 0x40,
        after: 0x240,
        addedMask: BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
        clearedMask: 0,
      });
      expect(result.receipt.statusController).toMatchObject({
        kind: "request-status1-write",
        battler: 0,
        sourceRequest: "REQUEST_STATUS_BATTLE",
        offset: 0,
        size: 4,
        value: OTHER_STATUS1 | BATTLE_SCRIPT_STATUS1_FREEZE,
        markForControllerExecution: true,
      });
    }
  });

  it("lets each source EFFECT_THAW_HIT move continue after a failed thaw roll", () => {
    for (const move of [FLAME_WHEEL, 221]) {
      const source = rules({
        battlers: [
          battler({
            pp: move === FLAME_WHEEL ? [25, 0, 0, 0] : [5, 0, 0, 0],
            status1: OTHER_STATUS1 | BATTLE_SCRIPT_STATUS1_FREEZE,
          }),
          battler(),
          battler(),
          battler(),
        ],
        currentMove: move,
      });
      const result = advanceBattleScriptAttackCancelerFrozen(
        source,
        SOURCE_PC,
        1,
      );
      expect(result).toMatchObject({
        kind: "advance",
        reason: "thaw-hit-allowed",
        receipt: {
          moveEffect: { value: 125, isThawHit: true },
          rng: { kind: "draw", remainder: 3 },
          effect: 0,
          script: { kind: "preserve", sourceProgramCounter: SOURCE_PC },
          cursor: { kind: "preserve" },
          multistringChooser: { kind: "preserve" },
          statusController: { kind: "none" },
        },
      });
      expect(result.rulesContext.battlers).toBe(source.battlers);
      expect(result.rulesContext.hitMarker).toBe(source.hitMarker);
    }
  });

  it("thaws on remainder zero for both ordinary and thaw-hit effects", () => {
    for (const move of [TACKLE, FLAME_WHEEL]) {
      const source = rules({
        battlers: [
          battler({ status1: OTHER_STATUS1 | BATTLE_SCRIPT_STATUS1_FREEZE }),
          battler(),
          battler(),
          battler(),
        ],
        currentMove: move,
        hitMarker: 0x240,
      });
      const result = advanceBattleScriptAttackCancelerFrozen(
        source,
        SOURCE_PC,
        0,
      );
      expect(result.kind).toBe("advance");
      if (result.kind !== "advance") throw new Error("expected frozen phase");
      expect(result.reason).toBe("thawed");
      expect(result.rulesContext.battlers[0].status1).toBe(OTHER_STATUS1);
      expect(result.rulesContext.hitMarker).toBe(0x240);
      expect(result.receipt).toMatchObject({
        rng: { kind: "draw", before: 0, after: 24691, randomValue: 0, remainder: 0 },
        status1: {
          before: OTHER_STATUS1 | BATTLE_SCRIPT_STATUS1_FREEZE,
          after: OTHER_STATUS1,
          addedMask: 0,
          clearedMask: BATTLE_SCRIPT_STATUS1_FREEZE,
        },
        effect: 2,
        script: {
          kind: "handoff",
          sourceProgramCounter: SOURCE_PC,
          targetLabel: "BattleScript_MoveUsedUnfroze",
        },
        cursor: { kind: "push", sourceProgramCounter: SOURCE_PC },
        multistringChooser: {
          kind: "set",
          sourceConstant: "B_MSG_DEFROSTED",
          value: 0,
        },
        statusController: {
          kind: "request-status1-write",
          battler: 0,
          value: OTHER_STATUS1,
        },
      });
    }
  });

  it("gates before role/RNG ownership and validates exact input widths", () => {
    for (const tracker of [0, 1, 3, 14, 255]) {
      const source = rules({ atkCancelerTracker: tracker, selectorRoles: {} });
      const result = advanceBattleScriptAttackCancelerFrozen(
        source,
        SOURCE_PC,
        0xffff_ffff,
      );
      expect(result).toEqual({
        kind: "not-at-source-phase",
        rulesContext: source,
        rngValue: 0xffff_ffff,
        receipt: {
          sourcePhase: "CANCELER_FROZEN",
          tracker: { before: tracker, after: tracker },
          rng: { kind: "preserve", value: 0xffff_ffff },
        },
      });
    }
    expect(() => advanceBattleScriptAttackCancelerFrozen(
      rules({ selectorRoles: {} }),
      SOURCE_PC,
      0,
    )).toThrow(/frozen phase requires an attacker role/);
    for (const invalid of [-1, 1.5, 0x1_0000_0000]) {
      expect(() => advanceBattleScriptAttackCancelerFrozen(
        rules(),
        SOURCE_PC,
        invalid,
      )).toThrow(/RNG value must be a u32/);
    }
  });

  it("is deterministic, immutable, deeply frozen, and preserves unrelated identities", () => {
    const source = rules({
      battlers: [
        battler(),
        battler({
          ability: 48,
          hp: 77,
          pp: [1, 2, 3, 4],
          status1: OTHER_STATUS1 | BATTLE_SCRIPT_STATUS1_FREEZE,
          status2: 0x4000_0085,
          status3: 0xa5a5_a5a5,
          substituteHP: 31,
          rolloutTimer: 15,
          furyCutterCounter: 9,
        }),
        battler(),
        battler(),
      ],
      selectorRoles: { attacker: 1, target: 2, effectBattler: 3 },
      currentMove: FLAME_WHEEL,
    });
    const first = advanceBattleScriptAttackCancelerFrozen(source, SOURCE_PC, 0);
    const replay = advanceBattleScriptAttackCancelerFrozen(source, SOURCE_PC, 0);
    expect(replay).toEqual(first);
    expect(first.kind).toBe("advance");
    if (first.kind !== "advance") throw new Error("expected frozen phase");
    expect(first.rulesContext.battlers[0]).toBe(source.battlers[0]);
    expect(first.rulesContext.battlers[1]).not.toBe(source.battlers[1]);
    expect(first.rulesContext.battlers[1].pp).toBe(source.battlers[1].pp);
    expect(first.rulesContext.battlers[2]).toBe(source.battlers[2]);
    expect(first.rulesContext.battlers[3]).toBe(source.battlers[3]);
    expect(first.rulesContext.selectorRoles).toBe(source.selectorRoles);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.receipt)).toBe(true);
    expect(Object.isFrozen(first.receipt.moveEffect)).toBe(true);
    expect(Object.isFrozen(first.receipt.rng)).toBe(true);
    expect(Object.isFrozen(first.receipt.status1)).toBe(true);
    expect(Object.isFrozen(first.receipt.hitMarker)).toBe(true);
    expect(Object.isFrozen(first.receipt.script)).toBe(true);
    expect(Object.isFrozen(first.receipt.cursor)).toBe(true);
    expect(Object.isFrozen(first.receipt.multistringChooser)).toBe(true);
    expect(Object.isFrozen(first.receipt.statusController)).toBe(true);
    expect(Object.isFrozen(first.receipt.tracker)).toBe(true);
    expect(Object.isFrozen(first.rulesContext)).toBe(true);
  });
});
