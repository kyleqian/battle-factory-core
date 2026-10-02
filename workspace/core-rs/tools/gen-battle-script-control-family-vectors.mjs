#!/usr/bin/env node
// Differential corpus for the machine-control family: B_SCR_OP_GOTO (0x28),
// B_SCR_OP_RETURN (0x3C), B_SCR_OP_END (0x3D), B_SCR_OP_END2 (0x3E),
// B_SCR_OP_END3 (0x3F), B_SCR_OP_CALL (0x41). Expected outputs are produced
// only by executing the canonical TypeScript
// (createBattleScriptControlHandlers, stepBattleScriptMachine,
// createBattleScriptMachine) on the real committed Battle Script program
// (and, for halt/registration edges, on that program with targeted surgery:
// instruction operand overrides or filtered start instructions).
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-control-family-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outputPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "battle_script_control_family_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

const [programModule, machineModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-control-family-vectors: " + message);
}

function freezeArray(values) { return Object.freeze(values.slice()); }
function hex8(value) { return "0x" + (value & 0xff).toString(16).padStart(2, "0"); }
function rustString(value) { return JSON.stringify(value); }

const OPCODES = Object.freeze({
  goto: { name: "B_SCR_OP_GOTO", id: 0x28 },
  return: { name: "B_SCR_OP_RETURN", id: 0x3c },
  end: { name: "B_SCR_OP_END", id: 0x3d },
  end2: { name: "B_SCR_OP_END2", id: 0x3e },
  end3: { name: "B_SCR_OP_END3", id: 0x3f },
  call: { name: "B_SCR_OP_CALL", id: 0x41 },
});

const program = programModule.loadBattleScriptProgram();
const handlers = machineModule.createBattleScriptControlHandlers(program);
for (const { name, id } of Object.values(OPCODES)) {
  assert(typeof handlers[id] === "function", `canonical ${name} handler not registered at ${hex8(id)}`);
}

// ---------------------------------------------------------------------
// Inert rules-context fixture (array-family precedent) -- this family
// reads no rules at all, so this is only used to drive
// createBattleScriptMachine; every case asserts it comes back unchanged.
// ---------------------------------------------------------------------

function fixedBattler() {
  return Object.freeze({
    side: 0, ability: 1, hp: 100, maxHP: 100, moves: freezeArray([33, 45, 98, 57]),
    pp: freezeArray([35, 10, 15, 20]), status1: 0, status2: 0, status3: 0, item: 0,
    statStages: freezeArray([6, 6, 6, 6, 6, 6, 6, 6]),
    types: freezeArray(["TYPE_NORMAL", "TYPE_NORMAL"]), species: 1, attack: 50, defense: 51,
    speed: 52, spAttack: 53, spDefense: 54, level: 50, friendship: 70, partyIndex: 0,
    substituteHP: 0, rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0, usedTauntedMove: 0,
    usedImprisonedMove: 0,
  });
}

function makeRules() {
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray([0, 1, 2, 3].map(fixedBattler)),
    battleTopology: Object.freeze({
      battlersCount: 2,
      battlerPositions: freezeArray([0, 1, 2, 3]),
      battleTypeFlags: 0,
    }),
    selectorRoles: Object.freeze({ attacker: 0, target: 1, effectBattler: 2, fainted: null }),
    scriptingBattler: 0, battlerWithAbility: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: 33, currentMovePosition: 0, moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1,
    moveEffectByte: 0, missType: 0, hitMarker: 0, multiHitCounter: 0, battleMoveDamage: 0, painSplitHp: 0,
    bideDmg: freezeArray([0, 0, 0, 0]), lockedMoves: freezeArray([0, 0, 0, 0]),
    chosenMovePositions: freezeArray([0, 0, 0, 0]), sideStatuses: freezeArray([0, 0]),
    weather: 0, weatherTimer: 0, randomTurnNumber: 0,
    battleCommunication0: 0, battleCommunication1: 0,
    battlerByTurnOrder: freezeArray([0, 1, 2, 3]),
  });
}
const rulesContext = makeRules();

function stateAt(sourceProgram, programCounter, callStack) {
  const base = machineModule.createBattleScriptMachine(sourceProgram, "BattleScript_EffectHit", rulesContext, 0x0bad_f000);
  return Object.freeze({ ...base, programCounter, callStack: freezeArray(callStack) });
}

function runStep(sourceProgram, programCounter, callStack) {
  const state = stateAt(sourceProgram, programCounter, callStack);
  const result = machineModule.stepBattleScriptMachine(sourceProgram, state, handlers);
  assert(result.state.rulesContext === rulesContext, "a control handler mutated the inert rules context");
  return result;
}

function programWithInstructionAt(programCounter, mutate) {
  const original = program.instructions[programCounter];
  const instructions = program.instructions.slice();
  instructions[programCounter] = mutate(original);
  return Object.freeze({ ...program, instructions: freezeArray(instructions) });
}

function withSingleOperand(instruction, overrides) {
  const base = instruction.operands[0];
  return Object.freeze({
    ...instruction,
    operands: freezeArray([Object.freeze({ ...base, ...overrides })]),
  });
}

// ---------------------------------------------------------------------
// Committed site catalogs + census
// ---------------------------------------------------------------------

const sitesByOpcode = {};
for (const [key, { name }] of Object.entries(OPCODES)) {
  sitesByOpcode[key] = freezeArray(program.instructions.filter((i) => i.opcodeName === name));
}
const expectedCensus = { goto: 285, call: 29, return: 73, end: 13, end2: 64, end3: 10 };
for (const [key, expected] of Object.entries(expectedCensus)) {
  assert(
    sitesByOpcode[key].length === expected,
    `${key} committed site count drifted to ${sitesByOpcode[key].length}, expected ${expected}`,
  );
}

// ---------------------------------------------------------------------
// Compact per-opcode resolution tables (goto/call: every committed site's
// resolved target or halt; return/end/end2/end3: sorted site program
// counters + shared opcode id).
// ---------------------------------------------------------------------

function resolveDirective(handler, instruction, programCounter) {
  const state = stateAt(program, programCounter, []);
  const transition = handler({ program, instruction, state });
  assert(transition.rulesContext === rulesContext, "resolution handler mutated rules");
  return transition.control;
}

function gotoResolutionRow(instruction) {
  const control = resolveDirective(handlers[OPCODES.goto.id], instruction, instruction.programCounter);
  return Object.freeze({
    programCounter: instruction.programCounter,
    controlKind: control.kind,
    targetProgramCounter: control.kind === "jump" ? control.programCounter : null,
    haltExpression: control.kind === "halt" ? control.reason.expression : null,
  });
}
const gotoResolutionRows = freezeArray(sitesByOpcode.goto.map(gotoResolutionRow));
assert(gotoResolutionRows.length === 285, "goto resolution table size drifted");
assert(
  gotoResolutionRows.every((row) => row.controlKind === "jump"),
  "expected every committed goto site to resolve cleanly",
);

function callResolutionRow(instruction) {
  const control = resolveDirective(handlers[OPCODES.call.id], instruction, instruction.programCounter);
  return Object.freeze({
    programCounter: instruction.programCounter,
    controlKind: control.kind,
    targetProgramCounter: control.kind === "call" ? control.programCounter : null,
    pushedReturnProgramCounter: control.kind === "call" ? instruction.programCounter + 1 : null,
    haltExpression: control.kind === "halt" ? control.reason.expression : null,
  });
}
const callResolutionRows = freezeArray(sitesByOpcode.call.map(callResolutionRow));
assert(callResolutionRows.length === 29, "call resolution table size drifted");
assert(
  callResolutionRows.every((row) => row.controlKind === "call"),
  "expected every committed call site to resolve cleanly",
);

function siteCensusTable(key) {
  const opcodeId = OPCODES[key].id;
  const programCounters = freezeArray(sitesByOpcode[key].map((i) => i.programCounter).sort((a, b) => a - b));
  return Object.freeze({ opcodeId, programCounters });
}
const returnSiteCensus = siteCensusTable("return");
const endSiteCensus = siteCensusTable("end");
const end2SiteCensus = siteCensusTable("end2");
const end3SiteCensus = siteCensusTable("end3");

// ---------------------------------------------------------------------
// Full behavior cases, driven end-to-end through stepBattleScriptMachine.
// ---------------------------------------------------------------------

const behaviorCases = [];
function operandSnapshot(instruction) {
  if (!instruction) {
    return Object.freeze({
      operandCount: null, operand0WidthBytes: null, operand0Expression: null,
      resolvedTargetProgramCounter: null,
    });
  }
  const first = instruction.operands[0];
  const entry = first ? programModule.resolveBattleScriptLabel(program, first.expression) : undefined;
  return Object.freeze({
    operandCount: instruction.operands.length,
    operand0WidthBytes: first ? first.widthBytes : null,
    operand0Expression: first ? first.expression : null,
    resolvedTargetProgramCounter: entry ? entry.programCounter : null,
  });
}
function addCase(label, category, kind, opts, instructionForOperands) {
  assert(!behaviorCases.some((c) => c.label === label), "duplicate behavior label " + label);
  behaviorCases.push(Object.freeze({
    label, category, kind, ...operandSnapshot(instructionForOperands), ...opts,
  }));
}

function projectResult(result) {
  return Object.freeze({
    resultProgramCounter: result.state.programCounter,
    resultCallStack: freezeArray(result.state.callStack),
    haltKind: result.state.haltReason ? result.state.haltReason.kind : null,
    haltExpression: result.state.haltReason && "expression" in result.state.haltReason
      ? result.state.haltReason.expression
      : null,
    haltOpcodeId: result.state.haltReason && "opcodeId" in result.state.haltReason
      ? result.state.haltReason.opcodeId
      : null,
    haltOpcodeName: result.state.haltReason && "opcodeName" in result.state.haltReason
      ? result.state.haltReason.opcodeName
      : null,
  });
}

// GOTO: one committed jump.
const gotoSite = sitesByOpcode.goto[0];
addCase("goto_committed_site_jumps", "canonical-site", "goto", {
  initialProgramCounter: gotoSite.programCounter, initialCallStack: [9, 99],
  opcodeId: OPCODES.goto.id, opcodeName: "B_SCR_OP_GOTO",
  ...projectResult(runStep(program, gotoSite.programCounter, [9, 99])),
}, gotoSite);

// GOTO custom-surgery halts.
function gotoHaltCase(label, mutate, callStack) {
  const customProgram = programWithInstructionAt(gotoSite.programCounter, mutate);
  const mutatedInstruction = customProgram.instructions[gotoSite.programCounter];
  const result = runStep(customProgram, gotoSite.programCounter, callStack);
  addCase(label, "unsupported-operand", "goto", {
    initialProgramCounter: gotoSite.programCounter, initialCallStack: callStack,
    opcodeId: OPCODES.goto.id, opcodeName: "B_SCR_OP_GOTO",
    ...projectResult(result),
  }, mutatedInstruction);
}
gotoHaltCase("goto_custom_missing_operand_halts",
  (instruction) => Object.freeze({ ...instruction, operands: freezeArray([]) }), []);
gotoHaltCase("goto_custom_wrong_width_halts",
  (instruction) => withSingleOperand(instruction, { widthBytes: 1 }), []);
gotoHaltCase("goto_custom_unresolved_label_halts",
  (instruction) => withSingleOperand(instruction, { expression: "BattleScript_NoSuchLabel" }), []);
gotoHaltCase("goto_custom_two_operand_resolvable_first_still_halts",
  (instruction) => Object.freeze({
    ...instruction,
    operands: freezeArray([instruction.operands[0], Object.freeze({ ...instruction.operands[0], expression: "ExtraOperand" })]),
  }), []);
assert(
  behaviorCases.find((c) => c.label === "goto_custom_two_operand_resolvable_first_still_halts").haltExpression
    === gotoSite.operands[0].expression,
  "two-operand goto halt must report operand[0]'s real expression, not <missing>",
);

// CALL: nested depth-2 chain then two returns (LIFO pin), all on the real
// committed program, rebuilding the cursor at each target site's pc.
const callSiteA = sitesByOpcode.call[0];
const callSiteB = sitesByOpcode.call[1];
const returnSiteX = sitesByOpcode.return[0];
const returnSiteY = sitesByOpcode.return[1];

const step1 = runStep(program, callSiteA.programCounter, []);
addCase("call_chain_step1_enters_a", "nested-call-chain", "call", {
  initialProgramCounter: callSiteA.programCounter, initialCallStack: [],
  opcodeId: OPCODES.call.id, opcodeName: "B_SCR_OP_CALL",
  ...projectResult(step1),
}, callSiteA);
const step2 = runStep(program, callSiteB.programCounter, step1.state.callStack);
addCase("call_chain_step2_enters_b", "nested-call-chain", "call", {
  initialProgramCounter: callSiteB.programCounter, initialCallStack: freezeArray(step1.state.callStack),
  opcodeId: OPCODES.call.id, opcodeName: "B_SCR_OP_CALL",
  ...projectResult(step2),
}, callSiteB);
const step3 = runStep(program, returnSiteX.programCounter, step2.state.callStack);
addCase("call_chain_step3_returns_to_b_continuation", "nested-call-chain", "return", {
  initialProgramCounter: returnSiteX.programCounter, initialCallStack: freezeArray(step2.state.callStack),
  opcodeId: OPCODES.return.id, opcodeName: "B_SCR_OP_RETURN",
  ...projectResult(step3),
});
assert(step3.state.programCounter === callSiteB.programCounter + 1, "step3 must resume right after call B");
const step4 = runStep(program, returnSiteY.programCounter, step3.state.callStack);
addCase("call_chain_step4_returns_to_a_continuation", "nested-call-chain", "return", {
  initialProgramCounter: returnSiteY.programCounter, initialCallStack: freezeArray(step3.state.callStack),
  opcodeId: OPCODES.return.id, opcodeName: "B_SCR_OP_RETURN",
  ...projectResult(step4),
});
assert(step4.state.programCounter === callSiteA.programCounter + 1, "step4 must resume right after call A");
assert(step4.state.callStack.length === 0, "step4 must leave the call stack empty");

// CALL custom-surgery halts -- identical ladder to goto.
function callHaltCase(label, mutate, callStack) {
  const customProgram = programWithInstructionAt(callSiteA.programCounter, mutate);
  const mutatedInstruction = customProgram.instructions[callSiteA.programCounter];
  const result = runStep(customProgram, callSiteA.programCounter, callStack);
  addCase(label, "unsupported-operand", "call", {
    initialProgramCounter: callSiteA.programCounter, initialCallStack: callStack,
    opcodeId: OPCODES.call.id, opcodeName: "B_SCR_OP_CALL",
    ...projectResult(result),
  }, mutatedInstruction);
}
callHaltCase("call_custom_missing_operand_halts",
  (instruction) => Object.freeze({ ...instruction, operands: freezeArray([]) }), []);
callHaltCase("call_custom_wrong_width_halts",
  (instruction) => withSingleOperand(instruction, { widthBytes: 1 }), []);
callHaltCase("call_custom_unresolved_label_halts",
  (instruction) => withSingleOperand(instruction, { expression: "BattleScript_NoSuchLabel" }), []);
callHaltCase("call_custom_two_operand_resolvable_first_still_halts",
  (instruction) => Object.freeze({
    ...instruction,
    operands: freezeArray([instruction.operands[0], Object.freeze({ ...instruction.operands[0], expression: "ExtraOperand" })]),
  }), []);

// RETURN: depth 1, depth 2, and empty (underflow leaves pc unchanged).
const returnSite = sitesByOpcode.return[2];
addCase("return_depth1", "canonical-site", "return", {
  initialProgramCounter: returnSite.programCounter, initialCallStack: [999],
  opcodeId: OPCODES.return.id, opcodeName: "B_SCR_OP_RETURN",
  ...projectResult(runStep(program, returnSite.programCounter, [999])),
});
addCase("return_depth2", "canonical-site", "return", {
  initialProgramCounter: returnSite.programCounter, initialCallStack: [888, 999],
  opcodeId: OPCODES.return.id, opcodeName: "B_SCR_OP_RETURN",
  ...projectResult(runStep(program, returnSite.programCounter, [888, 999])),
});
addCase("return_empty_underflow_leaves_pc", "canonical-site", "return", {
  initialProgramCounter: returnSite.programCounter, initialCallStack: [],
  opcodeId: OPCODES.return.id, opcodeName: "B_SCR_OP_RETURN",
  ...projectResult(runStep(program, returnSite.programCounter, [])),
});

// END / END2: one committed terminal halt each, distinct opcodeIds/names.
const endSite = sitesByOpcode.end[0];
addCase("end_committed_site_terminal_halt", "canonical-site", "end", {
  initialProgramCounter: endSite.programCounter, initialCallStack: [5],
  opcodeId: OPCODES.end.id, opcodeName: "B_SCR_OP_END",
  ...projectResult(runStep(program, endSite.programCounter, [5])),
});
const end2Site = sitesByOpcode.end2[0];
addCase("end2_committed_site_terminal_halt", "canonical-site", "end2", {
  initialProgramCounter: end2Site.programCounter, initialCallStack: [5],
  opcodeId: OPCODES.end2.id, opcodeName: "B_SCR_OP_END2",
  ...projectResult(runStep(program, end2Site.programCounter, [5])),
});

// END3: empty halts its own "end3" reason; non-empty matches RETURN's
// post-state exactly at the same call stack.
const end3Site = sitesByOpcode.end3[0];
addCase("end3_empty_call_stack_halts_end3_kind", "canonical-site", "end3", {
  initialProgramCounter: end3Site.programCounter, initialCallStack: [],
  opcodeId: OPCODES.end3.id, opcodeName: "B_SCR_OP_END3",
  ...projectResult(runStep(program, end3Site.programCounter, [])),
});
addCase("end3_nonempty_call_stack_matches_return", "equivalence", "end3", {
  initialProgramCounter: end3Site.programCounter, initialCallStack: [777],
  opcodeId: OPCODES.end3.id, opcodeName: "B_SCR_OP_END3",
  ...projectResult(runStep(program, end3Site.programCounter, [777])),
});
addCase("return_for_end3_equivalence", "equivalence", "return", {
  initialProgramCounter: returnSite.programCounter, initialCallStack: [777],
  opcodeId: OPCODES.return.id, opcodeName: "B_SCR_OP_RETURN",
  ...projectResult(runStep(program, returnSite.programCounter, [777])),
});
{
  const end3Case = behaviorCases.find((c) => c.label === "end3_nonempty_call_stack_matches_return");
  const returnCase = behaviorCases.find((c) => c.label === "return_for_end3_equivalence");
  assert(
    end3Case.resultProgramCounter === returnCase.resultProgramCounter
      && JSON.stringify(end3Case.resultCallStack) === JSON.stringify(returnCase.resultCallStack),
    "end3-vs-return equivalence pin failed in canonical TS itself",
  );
}

// Extra canonical-site diversity cases to round out the behavior corpus.
const gotoSite2 = sitesByOpcode.goto[1];
addCase("goto_second_committed_site_jumps_empty_stack", "canonical-site", "goto", {
  initialProgramCounter: gotoSite2.programCounter, initialCallStack: [],
  opcodeId: OPCODES.goto.id, opcodeName: "B_SCR_OP_GOTO",
  ...projectResult(runStep(program, gotoSite2.programCounter, [])),
}, gotoSite2);
const endSite2 = sitesByOpcode.end[1];
addCase("end_second_committed_site_terminal_halt", "canonical-site", "end", {
  initialProgramCounter: endSite2.programCounter, initialCallStack: [],
  opcodeId: OPCODES.end.id, opcodeName: "B_SCR_OP_END",
  ...projectResult(runStep(program, endSite2.programCounter, [])),
});
const end2Site2 = sitesByOpcode.end2[1];
addCase("end2_second_committed_site_terminal_halt", "canonical-site", "end2", {
  initialProgramCounter: end2Site2.programCounter, initialCallStack: [],
  opcodeId: OPCODES.end2.id, opcodeName: "B_SCR_OP_END2",
  ...projectResult(runStep(program, end2Site2.programCounter, [])),
});
const returnSite2 = sitesByOpcode.return[3];
addCase("return_depth1_second_site", "canonical-site", "return", {
  initialProgramCounter: returnSite2.programCounter, initialCallStack: [321],
  opcodeId: OPCODES.return.id, opcodeName: "B_SCR_OP_RETURN",
  ...projectResult(runStep(program, returnSite2.programCounter, [321])),
});
const end3Site2 = sitesByOpcode.end3[1];
addCase("end3_second_committed_site_empty_halts", "canonical-site", "end3", {
  initialProgramCounter: end3Site2.programCounter, initialCallStack: [],
  opcodeId: OPCODES.end3.id, opcodeName: "B_SCR_OP_END3",
  ...projectResult(runStep(program, end3Site2.programCounter, [])),
});
const callSiteC = sitesByOpcode.call[2];
addCase("call_single_enter_independent_site", "canonical-site", "call", {
  initialProgramCounter: callSiteC.programCounter, initialCallStack: [],
  opcodeId: OPCODES.call.id, opcodeName: "B_SCR_OP_CALL",
  ...projectResult(runStep(program, callSiteC.programCounter, [])),
}, callSiteC);

assert(
  behaviorCases.length >= 26 && behaviorCases.length <= 34,
  "behavior case count " + behaviorCases.length + " outside the 26-36 target band",
);

// ---------------------------------------------------------------------
// Registration cases: 6/6 install + absent-opcode error for two opcodes.
// ---------------------------------------------------------------------

const registrationCases = [];
function addRegistration(label, run) {
  let error = null;
  let opcodeId = null;
  try {
    opcodeId = run();
  } catch (caught) {
    assert(caught instanceof Error, "registration threw non-Error for " + label);
    error = caught.message;
  }
  registrationCases.push(Object.freeze({ label, error, opcodeId }));
}
function programWithout(opcodeName) {
  return Object.freeze({
    ...program,
    instructions: freezeArray(program.instructions.filter((i) => i.opcodeName !== opcodeName)),
  });
}
for (const key of ["goto", "return", "end", "end2", "end3", "call"]) {
  const { name, id } = OPCODES[key];
  addRegistration(`${key}_canonical`, () => {
    const built = machineModule.createBattleScriptControlHandlers(program);
    assert(typeof built[id] === "function", `${name} missing after full build`);
    return id;
  });
}
addRegistration("goto_missing", () => {
  machineModule.createBattleScriptControlHandlers(programWithout(OPCODES.goto.name));
  return "unexpectedly-registered";
});
addRegistration("end3_missing", () => {
  machineModule.createBattleScriptControlHandlers(programWithout(OPCODES.end3.name));
  return "unexpectedly-registered";
});
assert(registrationCases.length === 8, "registration case count drifted to " + registrationCases.length);

// ---------------------------------------------------------------------
// Source/decomp evidence
// ---------------------------------------------------------------------

function sourceLine(source, number) {
  const result = source.split("\n")[number - 1];
  assert(result !== undefined, "missing source line " + number);
  return result;
}
const commandSource = fs.readFileSync(path.join(
  workspaceRoot, "reference", "pokeemerald", "src", "battle_script_commands.c"), "utf8");
const scriptSource = fs.readFileSync(path.join(
  workspaceRoot, "reference", "pokeemerald", "data", "battle_scripts_1.s"), "utf8");
assert(sourceLine(commandSource, 3652).trim() === "static void Cmd_goto(void)", "Cmd_goto line drifted");
assert(sourceLine(commandSource, 3945).trim() === "static void Cmd_return(void)", "Cmd_return line drifted");
assert(sourceLine(commandSource, 3950).trim() === "static void Cmd_end(void)", "Cmd_end line drifted");
assert(sourceLine(commandSource, 3960).trim() === "static void Cmd_end2(void)", "Cmd_end2 line drifted");
assert(sourceLine(commandSource, 3967).trim() === "static void Cmd_end3(void)", "Cmd_end3 line drifted");
assert(sourceLine(commandSource, 3975).trim() === "static void Cmd_call(void)", "Cmd_call line drifted");
assert((scriptSource.match(/^\tgoto /gm) ?? []).length === 285, "goto program count drifted");
assert((scriptSource.match(/^\tcall /gm) ?? []).length === 29, "call program count drifted");
assert((scriptSource.match(/^\treturn$/gm) ?? []).length === 73, "return program count drifted");
assert((scriptSource.match(/^\tend$/gm) ?? []).length === 13, "end program count drifted");
assert((scriptSource.match(/^\tend2$/gm) ?? []).length === 64, "end2 program count drifted");
assert((scriptSource.match(/^\tend3$/gm) ?? []).length === 10, "end3 program count drifted");

// ---------------------------------------------------------------------
// Census + corpus
// ---------------------------------------------------------------------

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(value[key], (counts.get(value[key]) ?? 0) + 1);
  return freezeArray([...counts.entries()]);
}
const behaviorCategoryCensus = census(behaviorCases, "category");
const behaviorKindCensus = census(behaviorCases, "kind");
const registrationOutcomeCensus = census(
  registrationCases.map((c) => Object.freeze({ outcome: c.error === null ? "registered" : "error" })),
  "outcome",
);
const domainCensus = freezeArray([
  ["goto-concrete-starts", sitesByOpcode.goto.length],
  ["call-concrete-starts", sitesByOpcode.call.length],
  ["return-concrete-starts", sitesByOpcode.return.length],
  ["end-concrete-starts", sitesByOpcode.end.length],
  ["end2-concrete-starts", sitesByOpcode.end2.length],
  ["end3-concrete-starts", sitesByOpcode.end3.length],
  ["behavior-cases", behaviorCases.length],
  ["registration-cases", registrationCases.length],
]);

const corpus = Object.freeze({
  domainCensus, behaviorCategoryCensus, behaviorKindCensus, registrationOutcomeCensus,
  gotoResolutionRows, callResolutionRows,
  returnSiteCensus, endSiteCensus, end2SiteCensus, end3SiteCensus,
  behaviorCases, registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusSha256 = crypto.createHash("sha256").update(corpusText).digest("hex");

// ---------------------------------------------------------------------
// Rust emission
// ---------------------------------------------------------------------

function rustOptU32(value) { return value === null || value === undefined ? "None" : `Some(${value})`; }
function rustOptionStr(value) { return value === null || value === undefined ? "None" : `Some(${rustString(value)})`; }
function rustU32Array(values) { return `&[${values.join(", ")}]`; }

function rustGotoRow(row) {
  return `ControlFamilyGotoResolutionRow { program_counter: ${row.programCounter}, control_kind: ${rustString(row.controlKind)}, target_program_counter: ${rustOptU32(row.targetProgramCounter)}, halt_expression: ${rustOptionStr(row.haltExpression)} }`;
}
function rustCallRow(row) {
  return `ControlFamilyCallResolutionRow { program_counter: ${row.programCounter}, control_kind: ${rustString(row.controlKind)}, target_program_counter: ${rustOptU32(row.targetProgramCounter)}, pushed_return_program_counter: ${rustOptU32(row.pushedReturnProgramCounter)}, halt_expression: ${rustOptionStr(row.haltExpression)} }`;
}
function rustSiteCensus(table) {
  return `ControlFamilySiteCensusTable { opcode_id: ${hex8(table.opcodeId)}, program_counters: ${rustU32Array(table.programCounters)} }`;
}
function rustOptU8(value) { return value === null || value === undefined ? "None" : `Some(${value})`; }
function rustBehaviorCase(c) {
  return `ControlFamilyBehaviorVectorCase {
        label: ${rustString(c.label)}, category: ${rustString(c.category)}, kind: ${rustString(c.kind)},
        initial_program_counter: ${c.initialProgramCounter}, initial_call_stack: ${rustU32Array(c.initialCallStack)},
        opcode_id: ${hex8(c.opcodeId)}, opcode_name: ${rustString(c.opcodeName)},
        operand_count: ${rustOptU8(c.operandCount)}, operand0_width_bytes: ${rustOptU8(c.operand0WidthBytes)},
        operand0_expression: ${rustOptionStr(c.operand0Expression)},
        resolved_target_program_counter: ${rustOptU32(c.resolvedTargetProgramCounter)},
        result_program_counter: ${c.resultProgramCounter}, result_call_stack: ${rustU32Array(c.resultCallStack)},
        halt_kind: ${rustOptionStr(c.haltKind)}, halt_expression: ${rustOptionStr(c.haltExpression)},
        halt_opcode_id: ${c.haltOpcodeId === null ? "None" : `Some(${hex8(c.haltOpcodeId)})`},
        halt_opcode_name: ${rustOptionStr(c.haltOpcodeName)},
    }`;
}
function rustRegistrationCase(c) {
  return `ControlFamilyRegistrationVectorCase {
        label: ${rustString(c.label)}, error: ${rustOptionStr(c.error)},
        opcode_id: ${c.opcodeId === null ? "None" : `Some(${rustString(String(c.opcodeId))})`},
    }`;
}

const lines = [];
lines.push("//! @generated by core-rs/tools/gen-battle-script-control-family-vectors.mjs.");
lines.push("//! Source: executing canonical src/engine/battleScriptMachine.ts via Node.");
lines.push("//! Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-control-family-vectors.mjs.");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ControlFamilyGotoResolutionRow {");
lines.push("    pub program_counter: u32, pub control_kind: &'static str, pub target_program_counter: Option<u32>,");
lines.push("    pub halt_expression: Option<&'static str>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ControlFamilyCallResolutionRow {");
lines.push("    pub program_counter: u32, pub control_kind: &'static str, pub target_program_counter: Option<u32>,");
lines.push("    pub pushed_return_program_counter: Option<u32>, pub halt_expression: Option<&'static str>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ControlFamilySiteCensusTable {");
lines.push("    pub opcode_id: u8, pub program_counters: &'static [u32],");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ControlFamilyBehaviorVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str, pub kind: &'static str,");
lines.push("    pub initial_program_counter: u32, pub initial_call_stack: &'static [u32],");
lines.push("    pub opcode_id: u8, pub opcode_name: &'static str,");
lines.push("    pub operand_count: Option<u8>, pub operand0_width_bytes: Option<u8>,");
lines.push("    pub operand0_expression: Option<&'static str>, pub resolved_target_program_counter: Option<u32>,");
lines.push("    pub result_program_counter: u32, pub result_call_stack: &'static [u32],");
lines.push("    pub halt_kind: Option<&'static str>, pub halt_expression: Option<&'static str>,");
lines.push("    pub halt_opcode_id: Option<u8>, pub halt_opcode_name: Option<&'static str>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ControlFamilyRegistrationVectorCase {");
lines.push("    pub label: &'static str, pub error: Option<&'static str>, pub opcode_id: Option<&'static str>,");
lines.push("}");
lines.push(`pub const BATTLE_SCRIPT_CONTROL_FAMILY_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusSha256)};`);
lines.push(`pub const BATTLE_SCRIPT_CONTROL_FAMILY_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push(`pub const BATTLE_SCRIPT_CONTROL_FAMILY_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [${domainCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_CONTROL_FAMILY_REGISTRATION_OUTCOME_CENSUS: [(&str, usize); ${registrationOutcomeCensus.length}] = [${registrationOutcomeCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub static BATTLE_SCRIPT_CONTROL_FAMILY_GOTO_RESOLUTION_ROWS: [ControlFamilyGotoResolutionRow; ${gotoResolutionRows.length}] = [`);
for (const row of gotoResolutionRows) lines.push("    " + rustGotoRow(row) + ",");
lines.push("];");
lines.push(`pub static BATTLE_SCRIPT_CONTROL_FAMILY_CALL_RESOLUTION_ROWS: [ControlFamilyCallResolutionRow; ${callResolutionRows.length}] = [`);
for (const row of callResolutionRows) lines.push("    " + rustCallRow(row) + ",");
lines.push("];");
lines.push(`pub static BATTLE_SCRIPT_CONTROL_FAMILY_RETURN_SITE_CENSUS: ControlFamilySiteCensusTable = ${rustSiteCensus(returnSiteCensus)};`);
lines.push(`pub static BATTLE_SCRIPT_CONTROL_FAMILY_END_SITE_CENSUS: ControlFamilySiteCensusTable = ${rustSiteCensus(endSiteCensus)};`);
lines.push(`pub static BATTLE_SCRIPT_CONTROL_FAMILY_END2_SITE_CENSUS: ControlFamilySiteCensusTable = ${rustSiteCensus(end2SiteCensus)};`);
lines.push(`pub static BATTLE_SCRIPT_CONTROL_FAMILY_END3_SITE_CENSUS: ControlFamilySiteCensusTable = ${rustSiteCensus(end3SiteCensus)};`);
lines.push(`pub static BATTLE_SCRIPT_CONTROL_FAMILY_BEHAVIOR_CASES: [ControlFamilyBehaviorVectorCase; ${behaviorCases.length}] = [`);
for (const c of behaviorCases) lines.push("    " + rustBehaviorCase(c) + ",");
lines.push("];");
lines.push(`pub static BATTLE_SCRIPT_CONTROL_FAMILY_REGISTRATION_CASES: [ControlFamilyRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const c of registrationCases) lines.push("    " + rustRegistrationCase(c) + ",");
lines.push("];");

fs.writeFileSync(outputPath, lines.join("\n") + "\n", "utf8");
const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "1.97.1-x86_64-unknown-linux-gnu", "bin");
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", "--config-path", rustfmtConfig, outputPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-control-family-vectors: could not find rustfmt");
const generated = fs.readFileSync(outputPath);
console.log(`gen-battle-script-control-family-vectors: wrote ${path.relative(workspaceRoot, outputPath)}`);
console.log(`gen-battle-script-control-family-vectors: ${behaviorCases.length} behavior, ${registrationCases.length} registration cases`);
console.log(`gen-battle-script-control-family-vectors: ${gotoResolutionRows.length} goto rows, ${callResolutionRows.length} call rows`);
console.log(`gen-battle-script-control-family-vectors: corpus sha256 ${corpusSha256} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-control-family-vectors: generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`gen-battle-script-control-family-vectors: generator sha256 ${crypto.createHash("sha256").update(fs.readFileSync(scriptPath)).digest("hex")} bytes ${fs.statSync(scriptPath).size}`);
