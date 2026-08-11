import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import lexicalFactsData from "../src/data/gen/battle-script-handler-lexical-facts.json" with { type: "json" };
import opcodeObservationsData from "../src/data/gen/battle-script-opcode-observations.json" with { type: "json" };
import {
  createBattleScriptMachine,
  stepBattleScriptMachine,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  type BattleScriptProgram,
} from "../src/engine/battleScriptProgram.ts";
import {
  createBattleScriptRulesContext,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS,
  createBattleScriptBicbyteCommandHandlers,
  createBattleScriptSetByteCommandHandlers,
  readBattleScriptRulesByte,
  resolveBattleScriptSetByteValue,
  writeBattleScriptRulesByte,
} from "../src/engine/battleScriptSetByte.ts";

const program = loadBattleScriptProgram();
const starts = program.instructions.filter(({ opcodeId }) => opcodeId === 46);
const bicbyteStarts = program.instructions.filter((instruction) => instruction.opcodeName === "B_SCR_OP_BICBYTE");

function battler(side: 0 | 1) {
  return Object.freeze({
    side,
    ability: 0,
    hp: 100,
    moves: Object.freeze([1, 2, 3, 4] as const),
    pp: Object.freeze([10, 20, 30, 40] as const),
    status1: 0,
    status2: 0,
    status3: 0,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0 as const,
    rechargeTimer: 0,
    flinchImmobility: 0 as const,
    disabledMove: 0,
    usedDisabledMove: 0 as const,
    tauntTimer: 0,
    usedTauntedMove: 0 as const,
    usedImprisonedMove: 0 as const,
  });
}

function rules() {
  return createBattleScriptRulesContext({
    battlers: [battler(0), battler(1), battler(0), battler(1)],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 1,
    atkCancelerTracker: 9,
    battleOutcome: 7,
    currentMove: 1,
    currentMovePosition: 2,
    lastUsedAbility: 3,
    moveResultFlags: 0xa5,
    dmgMultiplier: 7,
    critMultiplier: 9,
    moveEffectByte: 0x81,
    missType: 6,
    hitMarker: 0x7654_3210,
    multiHitCounter: 4,
    multistringChooser: 8,
    battleMoveDamage: -0x0123_4568,
    battleCommunication0: 0x71,
    battleCommunication1: 0x72,
    animTargetsHit: 0x73,
    animTurn: 0x74,
    giveExpState: 0x75,
    learnMoveState: 0x76,
    lvlBoxState: 0x77,
    moveendState: 0x78,
    multiHitEffect: 0x79,
    statChanger: 0x7a,
    statAnimPlayed: 0x7b,
    tripleKickPower: 0x7c7d,
    twoTurnStringId: 0x7e,
  });
}

describe("source-complete Cmd_setbyte", () => {
  it("mechanically pins all 214 fixed [4,1] starts and the complete 24-pointer universe", () => {
    const observation = opcodeObservationsData.opcodes.find(
      ({ slot }) => slot.id === 46,
    )!;
    const lexicalFact = lexicalFactsData.handlers.find(
      ({ symbol }) => symbol === "Cmd_setbyte",
    )!;
    expect(starts).toHaveLength(214);
    expect(observation).toMatchObject({
      slot: {
        id: 46,
        name: "B_SCR_OP_SETBYTE",
        table: { handlerExpression: "Cmd_setbyte" },
      },
      observedInstructionCount: 214,
      observedOperandWidthSequences: [{
        operandWidths: [4, 1],
        occurrenceCount: 214,
      }],
    });
    expect(observation.observedInstructionStartIndexes).toEqual(
      starts.map(({ programCounter }) => programCounter),
    );
    expect(lexicalFact).toMatchObject({
      slot: { index: 46, opcode: "B_SCR_OP_SETBYTE" },
      symbol: "Cmd_setbyte",
      source: { startLine: 3815, endLine: 3821 },
      instructionPointerFacts: {
        advanceExpressions: [{
          line: 3820,
          operation: "compoundAssignment",
          accessExpression: "gBattlescriptCurrInstr",
          statementRaw: "gBattlescriptCurrInstr += 6;",
        }],
      },
      t1ReadInvocations: [],
    });
    expect(starts.every((instruction) =>
      instruction.opcodeName === "B_SCR_OP_SETBYTE"
      && instruction.dispatcher === "Cmd_setbyte"
      && instruction.operands.length === 2
      && instruction.operands[0]?.widthBytes === 4
      && instruction.operands[1]?.widthBytes === 1
    )).toBe(true);
    expect([...new Set(starts.map(({ operands }) => operands[0]!.expression))].sort())
      .toEqual([...BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS].sort());
  });

  it("decodes every one of the 96 concrete value spellings and executes every start", () => {
    const handlers = createBattleScriptSetByteCommandHandlers(program);
    const valueExpressions = new Set(starts.map(({ operands }) => operands[1]!.expression));
    expect(valueExpressions.size).toBe(96);
    for (const expression of valueExpressions) {
      const value = resolveBattleScriptSetByteValue(expression);
      expect(value, expression).not.toBeNull();
      expect(value, expression).toBeGreaterThanOrEqual(0);
      expect(value, expression).toBeLessThanOrEqual(0xff);
    }

    for (const instruction of starts) {
      const sourceRules = rules();
      const initial = createBattleScriptMachine(
        program,
        instruction.source.label,
        sourceRules,
        0x1234_5678,
      );
      const state = Object.freeze({
        ...initial,
        programCounter: instruction.programCounter,
      });
      const result = stepBattleScriptMachine(program, state, handlers);
      const expected = resolveBattleScriptSetByteValue(
        instruction.operands[1]!.expression,
      );
      expect(result.kind, `pc ${instruction.programCounter}`).toBe("advanced");
      expect(result.state.programCounter).toBe(instruction.programCounter + 1);
      expect(result.state.instructionsExecuted).toBe(1);
      expect(readBattleScriptRulesByte(
        result.state.rulesContext,
        instruction.operands[0]!.expression,
      )).toBe(expected);
      expect(result.state.rng).toBe(state.rng);
      expect(result.state.events).toBe(state.events);
      expect(result.state.scheduler).toBe(state.scheduler);
      expect(result.state.callStack).toEqual(state.callStack);
      expect(sourceRules).toEqual(rules());
      expect(Object.isFrozen(result.state.rulesContext)).toBe(true);
    }
  });

  it("preserves all unaffected bytes of signed damage and the triple-kick halfword", () => {
    const source = rules();
    const rawDamage = source.battleMoveDamage >>> 0;
    for (const [expression, offset] of [
      ["gBattleMoveDamage", 0],
      ["gBattleMoveDamage + 1", 1],
      ["gBattleMoveDamage + 2", 2],
      ["gBattleMoveDamage + 3", 3],
    ] as const) {
      const written = writeBattleScriptRulesByte(source, expression, 0x5a)!;
      const mask = 0xff << (offset * 8);
      const expected = (((rawDamage & ~mask) | (0x5a << (offset * 8))) | 0);
      expect(written.battleMoveDamage).toBe(expected);
      expect(written.battleMoveDamage < 0).toBe(expected < 0);
      expect(written.battlers).toBe(source.battlers);
      expect(written.selectorRoles).toBe(source.selectorRoles);
    }

    const low = writeBattleScriptRulesByte(source, "sTRIPLE_KICK_POWER", 0xa1)!;
    const high = writeBattleScriptRulesByte(source, "sTRIPLE_KICK_POWER + 1", 0xb2)!;
    expect(low.tripleKickPower).toBe(0x7ca1);
    expect(high.tripleKickPower).toBe(0xb27d);
    expect(source.tripleKickPower).toBe(0x7c7d);
  });

  it("rejects unknown pointer and value spellings before registering opcode 46", () => {
    const replace = (
      operandIndex: 0 | 1,
      expression: string,
    ): BattleScriptProgram => {
      const first = starts[0]!;
      const instructions = program.instructions.map((instruction) =>
        instruction === first
          ? Object.freeze({
            ...instruction,
            operands: Object.freeze(instruction.operands.map((operand, index) =>
              index === operandIndex ? Object.freeze({ ...operand, expression }) : operand
            )),
          })
          : instruction
      );
      return Object.freeze({ ...program, instructions: Object.freeze(instructions) });
    };

    expect(resolveBattleScriptSetByteValue("MOVE_EFFECT_SLEEP | 0x400")).toBeNull();
    expect(writeBattleScriptRulesByte(rules(), "gUnknownByte", 0)).toBeNull();
    expect(() =>
      createBattleScriptSetByteCommandHandlers(replace(0, "gUnknownByte"))
    ).toThrow(/unknown .* pointer/);
    expect(() =>
      createBattleScriptSetByteCommandHandlers(replace(1, "UNKNOWN_VALUE"))
    ).toThrow(/unknown .* value/);
  });

  it("has no RNG, controller, event, presentation, oracle, or emulator dependency", () => {
    const source = readFileSync(
      new URL("../src/engine/battleScriptSetByte.ts", import.meta.url),
      "utf8",
    );
    for (const forbidden of [
      "drawBattleScriptRng",
      "markBattleScriptControllerPending",
      "./core.ts",
      "./battleScene.ts",
      "Render",
      "document.",
      "window.",
      "Math.random",
      "oracle",
      "mgba",
      "emulator",
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});

describe("source-complete Cmd_bicbyte", () => {
  it("pins all 11 concrete [4,1] starts, one pointer (gMoveResultFlags), three masks", () => {
    expect(bicbyteStarts).toHaveLength(11);
    expect(bicbyteStarts.every((instruction) =>
      instruction.opcodeName === "B_SCR_OP_BICBYTE"
      && instruction.dispatcher === "Cmd_bicbyte"
      && instruction.operands.length === 2
      && instruction.operands[0]?.widthBytes === 4
      && instruction.operands[1]?.widthBytes === 1
    )).toBe(true);
    expect([...new Set(bicbyteStarts.map(({ operands }) => operands[0]!.expression))]).toEqual(["gMoveResultFlags"]);
    expect([...new Set(bicbyteStarts.map(({ operands }) => operands[1]!.expression))].sort()).toEqual([
      "MOVE_RESULT_MISSED",
      "MOVE_RESULT_MISSED | MOVE_RESULT_DOESNT_AFFECT_FOE",
      "MOVE_RESULT_SUPER_EFFECTIVE | MOVE_RESULT_NOT_VERY_EFFECTIVE",
    ]);
    expect(bicbyteStarts.some((i) => i.source.label === "BattleScript_EffectEndeavor")).toBe(true);
  });

  it("clears exactly the masked bits and preserves the rest, for every concrete start (AND-NOT semantics)", () => {
    const handlers = createBattleScriptBicbyteCommandHandlers(program);
    for (const instruction of bicbyteStarts) {
      const sourceRules = rules();
      const initial = createBattleScriptMachine(program, instruction.source.label, sourceRules, 0x1234_5678);
      const state = Object.freeze({ ...initial, programCounter: instruction.programCounter });
      const result = stepBattleScriptMachine(program, state, handlers);
      const mask = resolveBattleScriptSetByteValue(instruction.operands[1]!.expression)!;
      expect(result.kind, `pc ${instruction.programCounter}`).toBe("advanced");
      expect(result.state.programCounter).toBe(instruction.programCounter + 1);
      expect(result.state.rulesContext.moveResultFlags).toBe(sourceRules.moveResultFlags & ~mask & 0xff);
      expect(result.state.rng).toBe(state.rng);
      expect(result.state.events).toBe(state.events);
      expect(result.state.scheduler).toBe(state.scheduler);
      expect(sourceRules).toEqual(rules());
      expect(Object.isFrozen(result.state.rulesContext)).toBe(true);
    }
  });

  it("clears every masked bit when all are set, and is a no-op when none are set", () => {
    const handlers = createBattleScriptBicbyteCommandHandlers(program);
    const endeavorInstruction = bicbyteStarts.find((i) => i.source.label === "BattleScript_EffectEndeavor")!;
    const mask = resolveBattleScriptSetByteValue(endeavorInstruction.operands[1]!.expression)!; // SUPER_EFFECTIVE | NOT_VERY_EFFECTIVE

    const allSet = Object.freeze({ ...rules(), moveResultFlags: 0xff });
    const stateAllSet = Object.freeze({
      ...createBattleScriptMachine(program, endeavorInstruction.source.label, allSet, 1),
      programCounter: endeavorInstruction.programCounter,
    });
    const resultAllSet = stepBattleScriptMachine(program, stateAllSet, handlers);
    expect(resultAllSet.kind).toBe("advanced");
    if (resultAllSet.kind !== "advanced") throw new Error("expected advance");
    expect(resultAllSet.state.rulesContext.moveResultFlags).toBe(0xff & ~mask);

    const noneSet = Object.freeze({ ...rules(), moveResultFlags: 0 });
    const stateNoneSet = Object.freeze({
      ...createBattleScriptMachine(program, endeavorInstruction.source.label, noneSet, 1),
      programCounter: endeavorInstruction.programCounter,
    });
    const resultNoneSet = stepBattleScriptMachine(program, stateNoneSet, handlers);
    expect(resultNoneSet.kind).toBe("advanced");
    if (resultNoneSet.kind !== "advanced") throw new Error("expected advance");
    expect(resultNoneSet.state.rulesContext.moveResultFlags).toBe(0);
  });

  it("rejects unknown pointer and mask spellings before registering, and requires all 11 starts", () => {
    const replace = (operandIndex: 0 | 1, expression: string): BattleScriptProgram => {
      const first = bicbyteStarts[0]!;
      const instructions = program.instructions.map((instruction) =>
        instruction === first
          ? Object.freeze({
            ...instruction,
            operands: Object.freeze(instruction.operands.map((operand, index) =>
              index === operandIndex ? Object.freeze({ ...operand, expression }) : operand
            )),
          })
          : instruction
      );
      return Object.freeze({ ...program, instructions: Object.freeze(instructions) });
    };

    expect(() => createBattleScriptBicbyteCommandHandlers(replace(0, "gUnknownByte"))).toThrow(/unknown .* pointer/);
    // MOVE_RESULT_FOE_ENDURED is no longer unknown (docs/roar-multihit-registration-scout.md §4 rung 5 widened the shared value universe) -- use a genuinely unmapped mask spelling.
    expect(() => createBattleScriptBicbyteCommandHandlers(replace(1, "MOVE_RESULT_NOT_A_REAL_MASK"))).toThrow(/unknown .* mask/);

    const withoutOne = Object.freeze({
      ...program,
      instructions: Object.freeze(program.instructions.filter((i) => i !== bicbyteStarts[0])),
    });
    expect(() => createBattleScriptBicbyteCommandHandlers(withoutOne)).toThrow(/requires all 11/);
  });

  it("has no RNG, controller, event, presentation, oracle, or emulator dependency", () => {
    const source = readFileSync(
      new URL("../src/engine/battleScriptSetByte.ts", import.meta.url),
      "utf8",
    );
    for (const forbidden of ["drawBattleScriptRng", "markBattleScriptControllerPending", "Math.random", "oracle", "mgba", "emulator"]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
