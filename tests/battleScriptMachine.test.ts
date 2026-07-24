import { describe, expect, it } from "vitest";
import {
  advanceBattleScriptInstruction,
  createBattleScriptControlHandlers,
  createBattleScriptMachine,
  inspectBattleScriptMachine,
  runBattleScriptMachine,
  stepBattleScriptMachine,
  type BattleScriptOpcodeHandlers,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";

const program = loadBattleScriptProgram();
const controls = createBattleScriptControlHandlers(program);

function instructionAt(label: string) {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`missing test label ${label}`);
  return program.instructions[entry.programCounter]!;
}

describe("typed Battle Script program", () => {
  it("compiles every committed concrete opcode start into immutable typed IR", () => {
    expect(program.counts).toEqual({
      labels: 619,
      sourceStatements: 3275,
      emittedStatements: 6948,
      instructions: 3306,
      topologyOpcodes: 249,
    });
    expect(program.instructions).toHaveLength(3306);
    expect(program.instructions.map((instruction) => instruction.programCounter)).toEqual(
      Array.from({ length: 3306 }, (_, index) => index),
    );
    expect(Object.isFrozen(program)).toBe(true);
    expect(Object.isFrozen(program.instructions)).toBe(true);
    for (const instruction of program.instructions) {
      expect(instruction.opcodeId).toBeGreaterThanOrEqual(0);
      expect(instruction.opcodeName).toMatch(/^B_SCR_OP_[A-Z0-9_]+$/);
      expect(instruction.dispatcher).toMatch(/^Cmd_[A-Za-z0-9_]+$/);
      expect(Object.isFrozen(instruction)).toBe(true);
      expect(Object.isFrozen(instruction.operands)).toBe(true);
      for (const operand of instruction.operands) {
        expect([1, 2, 4]).toContain(operand.widthBytes);
        expect(operand.expression.length).toBeGreaterThan(0);
      }
    }
  });

  it("resolves empty and consecutive alias labels to their honest next opcode entry", () => {
    const table = resolveBattleScriptLabel(program, "gBattleScriptsForMoveEffects")!;
    const effectHit = resolveBattleScriptLabel(program, "BattleScript_EffectHit")!;
    expect(table.programCounter).toBe(effectHit.programCounter);
    expect(table.aliases).toEqual(["gBattleScriptsForMoveEffects", "BattleScript_EffectHit"]);

    const morningSun = resolveBattleScriptLabel(program, "BattleScript_EffectMorningSun")!;
    const synthesis = resolveBattleScriptLabel(program, "BattleScript_EffectSynthesis")!;
    const moonlight = resolveBattleScriptLabel(program, "BattleScript_EffectMoonlight")!;
    expect(morningSun.programCounter).toBe(synthesis.programCounter);
    expect(synthesis.programCounter).toBe(moonlight.programCounter);
    expect(moonlight.aliases).toEqual([
      "BattleScript_EffectMorningSun",
      "BattleScript_EffectSynthesis",
      "BattleScript_EffectMoonlight",
    ]);
    expect(instructionAt("BattleScript_EffectMorningSun").source.label).toBe("BattleScript_EffectMoonlight");
  });

  it("preserves a wrapper-expanded setword invocation as four distinct typed opcodes", () => {
    const entry = resolveBattleScriptLabel(program, "BattleScript_EffectDragonRage")!;
    const setword = program.instructions.filter(
      (instruction) => instruction.source.label === entry.label && instruction.source.statementLine === 826,
    );
    expect(setword).toHaveLength(4);
    expect(setword.map((instruction) => [instruction.opcodeId, instruction.opcodeName])).toEqual([
      [46, "B_SCR_OP_SETBYTE"],
      [46, "B_SCR_OP_SETBYTE"],
      [46, "B_SCR_OP_SETBYTE"],
      [46, "B_SCR_OP_SETBYTE"],
    ]);
    expect(setword.map((instruction) => instruction.operands.map((operand) => [operand.widthBytes, operand.expression]))).toEqual([
      [[4, "gBattleMoveDamage"], [1, "(40) & 0xFF"]],
      [[4, "gBattleMoveDamage + 1"], [1, "((40) >> 8) & 0xFF"]],
      [[4, "gBattleMoveDamage + 2"], [1, "((40) >> 16) & 0xFF"]],
      [[4, "gBattleMoveDamage + 3"], [1, "((40) >> 24) & 0xFF"]],
    ]);
    for (const instruction of setword) {
      expect(instruction.source).toMatchObject({
        invocationMnemonic: "setword",
        sourceMacro: "setbyte",
        wrapperPath: ["setword", "setbyte"],
      });
    }
  });
});

describe("pure Battle Script control machine", () => {
  it("executes real goto and terminal control transitions", () => {
    const initial = createBattleScriptMachine(program, "BattleScript_StatUpEnd");
    const goto = stepBattleScriptMachine(program, initial, controls);
    expect(goto.kind).toBe("advanced");
    expect(goto.state.programCounter).toBe(resolveBattleScriptLabel(program, "BattleScript_MoveEnd")!.programCounter);
    expect(goto.state.callStack).toEqual([]);
    expect(initial.programCounter).toBe(resolveBattleScriptLabel(program, "BattleScript_StatUpEnd")!.programCounter);
    expect(initial.instructionsExecuted).toBe(0);

    const terminalState = createBattleScriptMachine(program, "BattleScript_BeatUpEnd");
    const end = stepBattleScriptMachine(program, terminalState, controls);
    expect(end.kind).toBe("halted");
    expect(end.state.haltReason).toEqual({
      kind: "terminal",
      programCounter: terminalState.programCounter,
      opcodeId: 61,
      opcodeName: "B_SCR_OP_END",
    });
    expect(end.state.instructionsExecuted).toBe(1);
  });

  it("pushes a real call return address and pops it after injected leaf handlers", () => {
    const initial = createBattleScriptMachine(program, "BattleScript_SpikesOnAttacker");
    const callPc = program.instructions.findIndex(
      (instruction) => instruction.source.label === "BattleScript_SpikesOnAttacker"
        && instruction.source.statementLine === 3392,
    );
    const beforeCall = Object.freeze({
      ...initial,
      programCounter: callPc,
    });
    const call = stepBattleScriptMachine(program, beforeCall, controls);
    expect(call.kind).toBe("advanced");
    expect(call.state.programCounter).toBe(
      resolveBattleScriptLabel(program, "BattleScript_PrintHurtBySpikes")!.programCounter,
    );
    expect(call.state.callStack).toEqual([callPc + 1]);

    const print = instructionAt("BattleScript_PrintHurtBySpikes");
    const wait = program.instructions[print.programCounter + 1]!;
    expect([print.opcodeName, wait.opcodeName]).toEqual([
      "B_SCR_OP_PRINTSTRING",
      "B_SCR_OP_WAITMESSAGE",
    ]);
    const leafHandlers: BattleScriptOpcodeHandlers = Object.freeze({
      ...controls,
      [print.opcodeId]: advanceBattleScriptInstruction,
      [wait.opcodeId]: advanceBattleScriptInstruction,
    });
    const printStep = stepBattleScriptMachine(program, call.state, leafHandlers);
    const waitStep = stepBattleScriptMachine(program, printStep.state, leafHandlers);
    const returned = stepBattleScriptMachine(program, waitStep.state, leafHandlers);
    expect(returned.kind).toBe("advanced");
    expect(returned.state.programCounter).toBe(callPc + 1);
    expect(returned.state.callStack).toEqual([]);
    expect(call.state.callStack).toEqual([callPc + 1]);
  });

  it("halts with structured unsupported data and keeps END3 outside the safe subset", () => {
    expect(Object.keys(controls).map(Number).sort((left, right) => left - right)).toEqual([
      40,
      60,
      61,
      62,
      65,
    ]);
    const unsupported = stepBattleScriptMachine(
      program,
      createBattleScriptMachine(program, "BattleScript_EffectHit"),
      controls,
    );
    expect(unsupported.kind).toBe("unsupported");
    expect(unsupported.state.haltReason).toMatchObject({
      kind: "unsupported-opcode",
      opcodeId: 42,
      opcodeName: "B_SCR_OP_JUMPIFHALFWORD",
      dispatcher: "Cmd_jumpifhalfword",
    });
    expect(unsupported.state.instructionsExecuted).toBe(0);

    const end3 = program.instructions.find((instruction) => instruction.opcodeName === "B_SCR_OP_END3")!;
    const end3State = Object.freeze({
      programCounter: end3.programCounter,
      callStack: Object.freeze([]),
      instructionsExecuted: 0,
      haltReason: null,
    });
    const end3Result = stepBattleScriptMachine(program, end3State, controls);
    expect(end3Result.kind).toBe("unsupported");
    expect(end3Result.state.haltReason).toMatchObject({
      kind: "unsupported-opcode",
      opcodeId: 63,
      opcodeName: "B_SCR_OP_END3",
    });
  });

  it("supports END2's shared terminal boundary and reports bare RETURN underflow", () => {
    const end2 = stepBattleScriptMachine(
      program,
      createBattleScriptMachine(program, "BattleScript_FaintedMonEnd"),
      controls,
    );
    expect(end2.kind).toBe("halted");
    expect(end2.state.haltReason).toMatchObject({
      kind: "terminal",
      opcodeId: 62,
      opcodeName: "B_SCR_OP_END2",
    });

    const bareReturn = stepBattleScriptMachine(
      program,
      createBattleScriptMachine(program, "BattleScript_PursuitDmgOnSwitchOutRet"),
      controls,
    );
    expect(bareReturn.kind).toBe("halted");
    expect(bareReturn.state.haltReason).toMatchObject({
      kind: "return-stack-underflow",
    });
    expect(bareReturn.state.instructionsExecuted).toBe(1);
  });

  it("protects a generic injected-handler loop with an explicit instruction budget", () => {
    const initial = createBattleScriptMachine(program, "BattleScript_EffectHit");
    const instruction = program.instructions[initial.programCounter]!;
    const loopHandlers: BattleScriptOpcodeHandlers = Object.freeze({
      ...controls,
      [instruction.opcodeId]: ({ state }) => Object.freeze({
        kind: "jump",
        programCounter: state.programCounter,
      }),
    });
    const result = runBattleScriptMachine(program, initial, loopHandlers, 7);
    expect(result.kind).toBe("budget-exhausted");
    expect(result.state.programCounter).toBe(initial.programCounter);
    expect(result.state.instructionsExecuted).toBe(7);
    expect(result.state.haltReason).toEqual({
      kind: "instruction-budget",
      programCounter: initial.programCounter,
      budget: 7,
    });
  });

  it("returns detached immutable inspection data without changing machine state", () => {
    const state = createBattleScriptMachine(program, "BattleScript_EffectMorningSun");
    const before = {
      programCounter: state.programCounter,
      callStack: [...state.callStack],
      instructionsExecuted: state.instructionsExecuted,
      haltReason: state.haltReason,
    };
    const inspection = inspectBattleScriptMachine(program, state);
    expect(inspection.labels).toEqual([
      "BattleScript_EffectMorningSun",
      "BattleScript_EffectSynthesis",
      "BattleScript_EffectMoonlight",
    ]);
    expect(Object.isFrozen(inspection)).toBe(true);
    expect(Object.isFrozen(inspection.callStack)).toBe(true);
    expect(Object.isFrozen(inspection.currentInstruction)).toBe(true);
    expect({
      programCounter: state.programCounter,
      callStack: [...state.callStack],
      instructionsExecuted: state.instructionsExecuted,
      haltReason: state.haltReason,
    }).toEqual(before);
    expect(inspectBattleScriptMachine(program, state)).toEqual(inspection);
  });
});
