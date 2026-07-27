import { describe, expect, it } from "vitest";
import confuseRayFixture from "../tools/battle-lab/mechanic-confuse-ray-status2animation-off.json" with { type: "json" };
import toxicFixture from "../tools/battle-lab/mechanic-toxic-statusanimation-off.json" with { type: "json" };
import mechanicLabEvidence from "./fixtures/status-animation-mechanic-lab-evidence.json" with { type: "json" };
import type { BattleScriptBattlerId } from "../src/engine/battleScriptEvents.ts";
import {
  createBattleScriptSchedulerState,
  stepBattleScriptMachine,
  type BattleScriptOpcodeHandlerContext,
} from "../src/engine/battleScriptMachine.ts";
import {
  acknowledgeBattleScriptStatusRulesController,
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  createBattleScriptStatusRulesHandlers,
  prepareRulesStatusAnimation,
  resolveRulesBattlerForBattleScript,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_BATTLER_SELECTORS,
  BATTLE_SCRIPT_HITMARKER_DESTINYBOND,
  BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
  BATTLE_SCRIPT_HITMARKER_SYNCHRONIZE_EFFECT,
  BATTLE_SCRIPT_MOVE_VALUES_CLEANUP_HITMARKER_MASK,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
} from "../src/engine/battleScriptSourceConstants.ts";
import {
  loadBattleScriptProgram,
  type BattleScriptInstruction,
  type BattleScriptOperand,
} from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();
const primaryInstruction = program.instructions[804]!;
const maskedInstruction = program.instructions[2760]!;
const explicitInstruction = program.instructions[2754]!;
const cleanupInstruction = program.instructions[116]!;

function battler(
  status1 = 0,
  status2 = 0,
  status3 = 0,
  substituteHP = 0,
  hp = 100,
  pp: readonly [number, number, number, number] = [10, 20, 30, 40],
  rolloutTimer = 0,
  furyCutterCounter = 0,
  truantCounter: 0 | 1 = 0,
  rechargeTimer = 0,
  flinchImmobility: 0 | 1 = 0,
) {
  return Object.freeze({
    side: 0 as const,
    ability: 0,
    hp,
    moves: Object.freeze([0, 0, 0, 0] as const),
    pp,
    status1,
    status2,
    status3,
    substituteHP,
    rolloutTimer,
    furyCutterCounter,
    truantCounter,
    rechargeTimer,
    flinchImmobility,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
  });
}

function input(
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContextInput {
  return {
    battlers: changes.battlers ?? [
      battler(0x80, 0x0005_0004),
      battler(0x40, 0x1000_0003),
      battler(0x20, 0x0800_0002),
      battler(0x08, 0x000f_0001),
    ],
    selectorRoles: changes.selectorRoles ?? { attacker: 3, effectBattler: 1 },
    scriptingBattler: changes.scriptingBattler ?? 0,
    atkCancelerTracker: changes.atkCancelerTracker ?? 0,
    battleOutcome: changes.battleOutcome ?? 0,
    currentMove: changes.currentMove ?? 92,
    currentMovePosition: changes.currentMovePosition ?? 0,
    lastUsedAbility: changes.lastUsedAbility ?? 0,
    moveResultFlags: changes.moveResultFlags ?? 0xf3,
    dmgMultiplier: changes.dmgMultiplier ?? 7,
    critMultiplier: changes.critMultiplier ?? 9,
    moveEffectByte: changes.moveEffectByte ?? 0xe1,
    missType: changes.missType ?? 5,
    hitMarker: changes.hitMarker ?? 0,
    multiHitCounter: changes.multiHitCounter ?? 0,
  };
}

function rules(
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext(input(changes));
}

function externalPorts(
  idle = true,
): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => idle,
    prepareMessage: () => null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: () => null,
    resolveByteOperand: () => null,
  });
}

function stateAt(
  instruction: BattleScriptInstruction,
  sourceRules = rules(),
) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    instruction.source.label,
    sourceRules,
    0x1234_5678,
    externalPorts(),
  );
  return {
    ...execution,
    state: Object.freeze({
      ...execution.state,
      programCounter: instruction.programCounter,
    }),
  };
}

function contextAt(
  instruction: BattleScriptInstruction,
  sourceRules = rules(),
): BattleScriptOpcodeHandlerContext<BattleScriptRulesContext> {
  const execution = stateAt(instruction, sourceRules);
  return Object.freeze({ program, instruction, state: execution.state });
}

function selector(expression: string): BattleScriptOperand {
  return Object.freeze({
    widthBytes: 1,
    expression,
    sourceMacro: "test-selector",
    sourceMacroLine: 0,
    wrapperPath: Object.freeze([]),
  });
}

describe("source-shaped Battle Script rules context", () => {
  it("creates exactly four deeply frozen battlers and the proven non-presentation fields", () => {
    const source = input();
    const created = createBattleScriptRulesContext(source);
    expect(Object.keys(created).sort()).toEqual([
      "absentBattlerFlags",
      "animArg1",
      "animTargetsHit",
      "animTurn",
      "atkCancelerTracker",
      "battleCommunication0",
      "battleCommunication1",
      "battleMoveDamage",
      "battleOutcome",
      "battleStructAbsentBattlerFlags",
      "battleTopology",
      "battlerByTurnOrder",
      "battlers",
      "bideDmg",
      "bideTarget",
      "changedItems",
      "choicedMove",
      "chosenMove",
      "critMultiplier",
      "currentMove",
      "currentMoveEffect",
      "currentMovePosition",
      "currentMovePower",
      "currentTurnActionNumber",
      "dmgMultiplier",
      "dynamicMoveType",
      "enigmaBerryHoldEffects",
      "giveExpState",
      "hitMarker",
      "hpDealt",
      "lastUsedAbility",
      "learnMoveState",
      "lvlBoxState",
      "missType",
      "mistTimers",
      "monToSwitchIntoId",
      "moveEffectByte",
      "moveHistory",
      "moveResultFlags",
      "moveendState",
      "multiHitCounter",
      "multiHitEffect",
      "multistringChooser",
      "party",
      "scriptingBattler",
      "scriptingBideDmg",
      "selectorRoles",
      "sideStatuses",
      "sideTimers",
      "statAnimPlayed",
      "statChanger",
      "tripleKickPower",
      "twoTurnStringId",
      "weather",
      "weatherTimer",
    ]);
    expect(created.battlers).toHaveLength(4);
    expect(Object.isFrozen(created)).toBe(true);
    expect(Object.isFrozen(created.battlers)).toBe(true);
    expect(Object.isFrozen(created.bideDmg)).toBe(true);
    expect(Object.isFrozen(created.bideTarget)).toBe(true);
    expect(Object.isFrozen(created.choicedMove)).toBe(true);
    expect(Object.isFrozen(created.changedItems)).toBe(true);
    expect(Object.isFrozen(created.enigmaBerryHoldEffects)).toBe(true);
    expect(Object.isFrozen(created.moveHistory)).toBe(true);
    expect(Object.isFrozen(created.battleTopology)).toBe(true);
    expect(Object.isFrozen(created.battleTopology.battlerPositions)).toBe(true);
    expect(Object.isFrozen(created.selectorRoles)).toBe(true);
    expect(created.battlers.every(Object.isFrozen)).toBe(true);
    expect(created.battlers.every((value) => Object.isFrozen(value.pp))).toBe(true);
    expect(created.battlers[0]).not.toBe(source.battlers[0]);
  });

  it("rejects malformed battler arrays, source widths, counters, and invalid roles", () => {
    const invalidInputs = [
      { battlers: input().battlers.slice(0, 3) },
      { battlers: [{ ...battler(), ability: 256 }, ...input().battlers.slice(1)] },
      { battlers: [battler(-1), ...input().battlers.slice(1)] },
      { battlers: [battler(0, 0, 0, 256), ...input().battlers.slice(1)] },
      { battlers: [battler(0, 0, 0, 0, -1), ...input().battlers.slice(1)] },
      { battlers: [battler(0, 0, 0, 0, 1, [0, 0, 0, 256]), ...input().battlers.slice(1)] },
      { battleOutcome: 256 },
      { atkCancelerTracker: 256 },
      { currentMove: 0x1_0000 },
      { currentMovePosition: 4 },
      { lastUsedAbility: 256 },
      { moveResultFlags: 256 },
      { dmgMultiplier: -1 },
      { critMultiplier: 256 },
      { moveEffectByte: -1 },
      { missType: 256 },
      { hitMarker: -1 },
      { multiHitCounter: 256 },
      { selectorRoles: { attacker: 4 as BattleScriptBattlerId, effectBattler: 0 } },
      { selectorRoles: { attacker: 0, target: 4 as BattleScriptBattlerId } },
      { selectorRoles: { attacker: 0, effectBattler: -1 as BattleScriptBattlerId } },
    ];
    for (const invalid of invalidInputs) {
      expect(() => createBattleScriptRulesContext(input(invalid as never))).toThrow();
    }
  });

  it("maps the supported named and numeric GetBattlerForBattleScript selectors", () => {
    const context = contextAt(
      primaryInstruction,
      rules({ selectorRoles: { attacker: 3, effectBattler: 1, target: 2, fainted: 0 }, scriptingBattler: 1 }),
    );
    expect(BATTLE_SCRIPT_BATTLER_SELECTORS).toEqual({
      BS_TARGET: 0,
      BS_ATTACKER: 1,
      BS_EFFECT_BATTLER: 2,
      BS_FAINTED: 3,
      BS_SCRIPTING: 10,
    });
    expect(resolveRulesBattlerForBattleScript(context, selector("BS_TARGET"))).toBe(2);
    expect(resolveRulesBattlerForBattleScript(context, selector("0"))).toBe(2);
    expect(resolveRulesBattlerForBattleScript(context, selector("0x0"))).toBe(2);
    expect(resolveRulesBattlerForBattleScript(context, selector("BS_ATTACKER"))).toBe(3);
    expect(resolveRulesBattlerForBattleScript(context, selector("1"))).toBe(3);
    expect(resolveRulesBattlerForBattleScript(context, selector("0x1"))).toBe(3);
    expect(resolveRulesBattlerForBattleScript(context, selector("BS_EFFECT_BATTLER"))).toBe(1);
    expect(resolveRulesBattlerForBattleScript(context, selector("2"))).toBe(1);
    // BS_FAINTED (battle_util.c:713-715): a role distinct from BS_TARGET, only
    // ever written by the fainted-actions orchestration -- proven here as a
    // pure selector mapping, independent of that orchestration's own tests.
    expect(resolveRulesBattlerForBattleScript(context, selector("BS_FAINTED"))).toBe(0);
    expect(resolveRulesBattlerForBattleScript(context, selector("3"))).toBe(0);
    expect(resolveRulesBattlerForBattleScript(context, selector("0x3"))).toBe(0);
    // BS_SCRIPTING (battle_util.c:711-713): gBattleScripting.battler, the
    // ItemBattleEffects end-turn scripts' own selector (docs/endturn-
    // abilities-items-ground-truth.md §1c/§5 slice 4) -- always populated
    // (non-nullable rules field), unlike the other roles above.
    expect(resolveRulesBattlerForBattleScript(context, selector("BS_SCRIPTING"))).toBe(1);
    expect(resolveRulesBattlerForBattleScript(context, selector("10"))).toBe(1);
    expect(resolveRulesBattlerForBattleScript(context, selector("0xa"))).toBe(1);
  });

  it("returns unavailable for missing supported roles and every unsupported/invalid selector", () => {
    const missing = contextAt(primaryInstruction, rules({ selectorRoles: {} }));
    expect(resolveRulesBattlerForBattleScript(missing, selector("BS_TARGET"))).toBeNull();
    expect(resolveRulesBattlerForBattleScript(missing, selector("BS_ATTACKER"))).toBeNull();
    expect(resolveRulesBattlerForBattleScript(missing, selector("BS_EFFECT_BATTLER"))).toBeNull();
    expect(resolveRulesBattlerForBattleScript(missing, selector("BS_FAINTED"))).toBeNull();
    for (const expression of ["7", "255", "-1", "bogus"]) {
      expect(resolveRulesBattlerForBattleScript(missing, selector(expression))).toBeNull();
    }
  });

  it("prepares live status1, actual masked status2, and raw explicit receipts", () => {
    const context = contextAt(primaryInstruction);
    expect(prepareRulesStatusAnimation(
      context,
      1,
      Object.freeze({ kind: "live-status1" }),
    )).toEqual({
      kind: "emit",
      receipt: { kind: "status-animation", battler: 1, isStatus2: 0, status: 0x40 },
    });
    expect(prepareRulesStatusAnimation(
      context,
      0,
      Object.freeze({
        kind: "masked-live-status2",
        wantedMask: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_INFATUATION,
      }),
    )).toEqual({
      kind: "emit",
      receipt: {
        kind: "status-animation",
        battler: 0,
        isStatus2: 1,
        status: 0x0005_0000,
      },
    });
    expect(prepareRulesStatusAnimation(
      context,
      1,
      Object.freeze({ kind: "explicit-status", isStatus2: 0x7e, status: 0x7856_3412 }),
    )).toEqual({
      kind: "emit",
      receipt: {
        kind: "status-animation",
        battler: 1,
        isStatus2: 0x7e,
        status: 0x7856_3412,
      },
    });
  });

  it("retains live confusion turn bits instead of forwarding the whole mask", () => {
    for (const confusionTurns of [1, 2, 3, 4, 5, 6, 7]) {
      const sourceRules = rules({
        battlers: [
          battler(0, 0x1000_0000 | confusionTurns),
          battler(),
          battler(),
          battler(),
        ],
      });
      const prepared = prepareRulesStatusAnimation(
        contextAt(maskedInstruction, sourceRules),
        0,
        Object.freeze({
          kind: "masked-live-status2",
          wantedMask: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CONFUSION,
        }),
      );
      expect(prepared).toMatchObject({
        kind: "emit",
        receipt: { isStatus2: 1, status: confusionTurns },
      });
    }
  });

  it("suppresses for each source predicate and all non-empty combinations", () => {
    for (let predicates = 1; predicates < 8; predicates += 1) {
      const sourceRules = rules({
        battlers: [
          battler(
            0x80,
            4,
            predicates & 1 ? BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE : 0,
            predicates & 2 ? 1 : 0,
          ),
          battler(),
          battler(),
          battler(),
        ],
        hitMarker: predicates & 4 ? BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS : 0,
      });
      for (const request of [
        Object.freeze({ kind: "live-status1" as const }),
        Object.freeze({ kind: "masked-live-status2" as const, wantedMask: 7 }),
        Object.freeze({ kind: "explicit-status" as const, isStatus2: 1, status: 7 }),
      ]) {
        const prepared = prepareRulesStatusAnimation(
          contextAt(primaryInstruction, sourceRules),
          0,
          request,
        );
        expect(prepared).toEqual({ kind: "suppress" });
        expect(Object.isFrozen(prepared)).toBe(true);
      }
    }
  });

  it("suppresses for each constituent semi-invulnerable status3 bit", () => {
    for (const status3 of [1 << 6, 1 << 7, 1 << 18]) {
      const sourceRules = rules({
        battlers: [battler(0x80, 4, status3), battler(), battler(), battler()],
      });
      expect(prepareRulesStatusAnimation(
        contextAt(primaryInstruction, sourceRules),
        0,
        Object.freeze({ kind: "live-status1" }),
      )).toEqual({ kind: "suppress" });
    }
  });

  it("returns frozen deterministic receipts without mutating any source input", () => {
    const originalInput = input();
    const sourceRules = createBattleScriptRulesContext(originalInput);
    const context = contextAt(maskedInstruction, sourceRules);
    const request = Object.freeze({
      kind: "masked-live-status2" as const,
      wantedMask: 0xffff_ffff,
    });
    const first = prepareRulesStatusAnimation(context, 2, request);
    const second = prepareRulesStatusAnimation(context, 2, request);
    expect(second).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first?.kind).toBe("emit");
    if (first?.kind === "emit") expect(Object.isFrozen(first.receipt)).toBe(true);
    expect(sourceRules).toEqual(createBattleScriptRulesContext(originalInput));
    expect(sourceRules.battlers[2].status2).toBe(0x0800_0002);
  });
});

describe("production status rules handler and execution seam", () => {
  it("composes all 109 source-safe controls, source, multi-hit, cleanup, SETBYTE, BICBYTE, attackcanceler, hit-chain, move-end, jumpifbyte, jumpifword, jumpifhalfword, jumpifstatus3condition, orword, openpartyscreen, switchin, getexp, checkteamslost, statbuffchange, set-side-status, set-weather, damaging-weather, trycastformdatachange, ingrain/leechseed/wrap, removeitem, status-primary (SETEFFECTPRIMARY/JUMPIFSTATUS/JUMPIFTYPE/JUMPIFSIDEAFFECTING/JUMPIFCANTMAKEASLEEP, docs/status-cluster-ground-truth.md), fixed-damage/TYPECALC2 (DMGTOLEVEL/PSYWAVEDAMAGEEFFECT/TYPECALC2/REMOVELIGHTSCREENREFLECT, docs/fixed-damage-cluster-ground-truth.md), Counter/Mirror Coat (COUNTERDAMAGECALCULATOR/MIRRORCOATDAMAGECALCULATOR, docs/counter-retaliation-design.md), and setyawn (SETYAWN, docs/yawn-thrash-endturn-design.md §1a) handlers once", () => {
    const handlers = createBattleScriptStatusRulesHandlers(program, externalPorts());
    expect(Object.keys(handlers).map(Number).sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12,
      13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 25, 26, 27, 28,
      29, 30, 31, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43,
      45, 46, 47, 49, 50, 51, 53, 54, 56, 57, 58, 60,
      61, 62, 63, 65, 69, 70, 71, 73, 74, 76, 77, 78, 80, 81,
      82, 83, 84, 85, 86, 92, 97, 98, 100, 101, 102, 104,
      105, 106, 111, 115, 118, 125, 126, 127, 128, 131, 132, 137, 141, 146,
      149, 150, 152, 153, 159, 160, 161, 162, 184, 187, 200, 213, 215, 216, 231, 238, 248,
    ]);
  });

  it("executes cleanup with exact field resets and preserves unrelated production identity", () => {
    const sourceRules = rules({
      hitMarker: 0xffff_ffff,
      multiHitCounter: 4,
    });
    const execution = stateAt(cleanupInstruction, sourceRules);
    const result = stepBattleScriptMachine(
      program,
      execution.state,
      execution.handlers,
    );

    expect(result.kind).toBe("advanced");
    expect(result.state.rulesContext).not.toBe(sourceRules);
    expect(result.state.rulesContext).toMatchObject({
      moveResultFlags: 0,
      dmgMultiplier: 1,
      critMultiplier: 1,
      moveEffectByte: 0,
      missType: 0,
      hitMarker: 0xffff_bfbf,
      multiHitCounter: 4,
    });
    expect(BATTLE_SCRIPT_MOVE_VALUES_CLEANUP_HITMARKER_MASK).toBe(
      BATTLE_SCRIPT_HITMARKER_DESTINYBOND
      | BATTLE_SCRIPT_HITMARKER_SYNCHRONIZE_EFFECT,
    );
    expect(result.state.rulesContext.battlers).toBe(sourceRules.battlers);
    expect(result.state.rulesContext.battlers[0]).toBe(sourceRules.battlers[0]);
    expect(result.state.rulesContext.selectorRoles).toBe(sourceRules.selectorRoles);
    expect(result.state.scheduler).toBe(execution.state.scheduler);
    expect(result.state.rng).toBe(execution.state.rng);
    expect(result.state.events).toBe(execution.state.events);
    expect(result.state.rng).toMatchObject({ value: 0x1234_5678, calls: 0, ledger: [] });
    expect(Object.isFrozen(result.state.rulesContext)).toBe(true);
  });

  it("repeats cleanup idempotently and deterministically without scheduling, RNG, or events", () => {
    const execute = (sourceRules: BattleScriptRulesContext) => {
      const execution = stateAt(cleanupInstruction, sourceRules);
      return stepBattleScriptMachine(
        program,
        execution.state,
        execution.handlers,
      ).state;
    };
    const sourceRules = rules({
      hitMarker: BATTLE_SCRIPT_MOVE_VALUES_CLEANUP_HITMARKER_MASK | (1 << 20),
    });
    const first = execute(sourceRules);
    const replay = execute(sourceRules);
    const repeated = execute(first.rulesContext);

    expect(replay).toEqual(first);
    expect(repeated.rulesContext).toEqual(first.rulesContext);
    expect(repeated.rulesContext.hitMarker).toBe(1 << 20);
    expect(repeated.scheduler).toEqual(first.scheduler);
    expect(repeated.rng).toEqual(first.rng);
    expect(repeated.rng.calls).toBe(0);
    expect(repeated.events).toEqual([]);
  });

  it("keeps all status-animation opcodes working identically before and after cleanup", () => {
    const sourceRules = rules({
      hitMarker: BATTLE_SCRIPT_MOVE_VALUES_CLEANUP_HITMARKER_MASK,
    });
    const cleanupExecution = stateAt(cleanupInstruction, sourceRules);
    const cleaned = stepBattleScriptMachine(
      program,
      cleanupExecution.state,
      cleanupExecution.handlers,
    ).state.rulesContext;

    for (const instruction of [
      primaryInstruction,
      maskedInstruction,
      explicitInstruction,
    ]) {
      const before = stateAt(instruction, sourceRules);
      const after = stateAt(instruction, cleaned);
      const beforeResult = stepBattleScriptMachine(
        program,
        before.state,
        before.handlers,
      );
      const afterResult = stepBattleScriptMachine(
        program,
        after.state,
        after.handlers,
      );
      expect(afterResult.kind).toBe("advanced");
      expect(afterResult.state.events).toEqual(beforeResult.state.events);
      expect(afterResult.state.scheduler).toEqual(beforeResult.state.scheduler);
      expect(afterResult.state.rng).toEqual(beforeResult.state.rng);
      expect(afterResult.state.rulesContext).toBe(cleaned);
    }
  });

  it("executes all three requests through live rules, preserves rules/RNG, and acknowledges", () => {
    const cases = [
      [primaryInstruction, 0, 0x08],
      [maskedInstruction, 1, 1],
      [explicitInstruction, 1, 7],
    ] as const;
    for (const [instruction, expectedIsStatus2, expectedStatus] of cases) {
      const execution = stateAt(instruction);
      const result = stepBattleScriptMachine(program, execution.state, execution.handlers);
      expect(result.kind).toBe("advanced");
      expect(result.state.rulesContext).toBe(execution.state.rulesContext);
      expect(result.state.rng).toBe(execution.state.rng);
      expect(result.state.rng).toMatchObject({ value: 0x1234_5678, calls: 0, ledger: [] });
      expect(result.state.events.at(-1)).toMatchObject({
        kind: "status-animation",
        battler: 3,
        isStatus2: expectedIsStatus2,
        status: expectedStatus,
      });
      expect(result.state.scheduler.pendingControllerBattlers).toEqual([3]);
      const acknowledged = acknowledgeBattleScriptStatusRulesController(
        result.state.scheduler,
        3,
      );
      expect(acknowledged.pendingControllerBattlers).toEqual([]);
      expect(result.state.scheduler.pendingControllerBattlers).toEqual([3]);
    }
  });

  it("identity-blocks missing bindings and advances suppressed execution without events", () => {
    const missingExecution = stateAt(
      primaryInstruction,
      rules({ selectorRoles: { attacker: null, effectBattler: null } }),
    );
    const missing = stepBattleScriptMachine(
      program,
      missingExecution.state,
      missingExecution.handlers,
    );
    expect(missing.kind).toBe("blocked");
    expect(missing.state).toBe(missingExecution.state);

    const suppressedExecution = stateAt(
      primaryInstruction,
      rules({ hitMarker: BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS }),
    );
    const suppressed = stepBattleScriptMachine(
      program,
      suppressedExecution.state,
      suppressedExecution.handlers,
    );
    expect(suppressed.kind).toBe("advanced");
    expect(suppressed.state.events).toBe(suppressedExecution.state.events);
    expect(suppressed.state.rulesContext).toBe(suppressedExecution.state.rulesContext);
    expect(suppressed.state.rng).toBe(suppressedExecution.state.rng);
    expect(suppressed.state.scheduler).toMatchObject({
      activeBattler: 3,
      pendingControllerBattlers: [],
    });
  });

  it("keeps controller-busy execution identity-blocked before live rules reads", () => {
    const sourceRules = rules();
    const execution = createBattleScriptStatusRulesExecution(
      program,
      primaryInstruction.source.label,
      sourceRules,
      7,
      externalPorts(false),
      createBattleScriptSchedulerState(),
    );
    const state = Object.freeze({
      ...execution.state,
      programCounter: primaryInstruction.programCounter,
    });
    const result = stepBattleScriptMachine(program, state, execution.handlers);
    expect(result.kind).toBe("blocked");
    expect(result.state).toBe(state);
  });
});

describe("committed OFF Mechanics Lab status facts", () => {
  it("pins zero PP Ups and the stock-created Toxic status1 0x80 fact", () => {
    expect(toxicFixture.profile).toBe("battle-scene-off");
    expect(toxicFixture.overrides.battlers.player.moves[0]).toBe(
      mechanicLabEvidence.toxic.moveId,
    );
    expect(toxicFixture.overrides.battlers.player.ppUps).toEqual([0, 0, 0, 0]);
    expect(toxicFixture.overrides.battlers.opponent.ppUps).toEqual([0, 0, 0, 0]);
    expect(mechanicLabEvidence.toxic).toMatchObject({
      initialPp: 10,
      finalPp: 9,
      initialStatus1: 0,
      finalStatus1: 0x80,
    });
  });

  it("pins zero PP Ups and live confusion status2/turn bits equal to 4", () => {
    expect(confuseRayFixture.profile).toBe("battle-scene-off");
    expect(confuseRayFixture.overrides.battlers.player.moves[0]).toBe(
      mechanicLabEvidence.confuseRay.moveId,
    );
    expect(confuseRayFixture.overrides.battlers.player.ppUps).toEqual([0, 0, 0, 0]);
    expect(confuseRayFixture.overrides.battlers.opponent.ppUps).toEqual([0, 0, 0, 0]);
    expect(mechanicLabEvidence.confuseRay).toMatchObject({
      initialPp: 10,
      finalPp: 9,
      initialStatus2: 0,
      finalStatus2: 4,
      initialConfusionTurns: 0,
      finalConfusionTurns: 4,
    });
    expect(
      mechanicLabEvidence.confuseRay.finalStatus2
      & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CONFUSION,
    ).toBe(4);
  });
});
