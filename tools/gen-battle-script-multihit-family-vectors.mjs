#!/usr/bin/env node
// Differential corpus for the B_SCR_OP_SETMULTIHIT (0x26) /
// B_SCR_OP_DECREMENTMULTIHIT (0x27) / B_SCR_OP_SETMULTIHITCOUNTER (0x8D) /
// B_SCR_OP_INITMULTIHITSTRING (0x8E) / B_SCR_OP_JUMPIFHASNOHP (0xE3)
// quintet. Expected outputs, controls, RNG draws, and registration errors
// are produced only by executing the canonical
// createBattleScriptRuleCommandHandlers (src/engine/battleScriptRuleCommands.ts)
// on the real committed Battle Script program with its two canonical
// production ports (resolveByteOperand, resolveRulesBattlerForBattleScript).
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-multihit-family-vectors.mjs

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
  "battle_script_multihit_family_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

const [programModule, machineModule, rulesModule, ruleCommandsModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRuleCommands.ts")).href),
]);

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-multihit-family-vectors: " + message);
}

function freezeArray(values) { return Object.freeze(values.slice()); }
function hex8(value) { return "0x" + (value & 0xff).toString(16).padStart(2, "0"); }
function rustString(value) { return JSON.stringify(value); }
function rustOptStr(value) { return value === null || value === undefined ? "None" : `Some(${rustString(value)})`; }
function rustOptU8(value) { return value === null || value === undefined ? "None" : `Some(${hex8(value)})`; }
function rustOptU32(value) { return value === null || value === undefined ? "None" : `Some(${value})`; }

const SETMULTIHIT_NAME = "B_SCR_OP_SETMULTIHIT";
const SETMULTIHIT_ID = 0x26;
const DECREMENTMULTIHIT_NAME = "B_SCR_OP_DECREMENTMULTIHIT";
const DECREMENTMULTIHIT_ID = 0x27;
const SETMULTIHITCOUNTER_NAME = "B_SCR_OP_SETMULTIHITCOUNTER";
const SETMULTIHITCOUNTER_ID = 0x8d;
const INITMULTIHITSTRING_NAME = "B_SCR_OP_INITMULTIHITSTRING";
const INITMULTIHITSTRING_ID = 0x8e;
const JUMPIFHASNOHP_NAME = "B_SCR_OP_JUMPIFHASNOHP";
const JUMPIFHASNOHP_ID = 0xe3;

const program = programModule.loadBattleScriptProgram();

function occurrences(name) {
  return freezeArray(program.instructions.filter((i) => i.opcodeName === name));
}
const setmultihitInstrs = occurrences(SETMULTIHIT_NAME);
assert(setmultihitInstrs.length === 3, "setmultihit census drifted to " + setmultihitInstrs.length);
const decrementInstrs = occurrences(DECREMENTMULTIHIT_NAME);
assert(decrementInstrs.length === 3, "decrementmultihit census drifted to " + decrementInstrs.length);
const counterInstrs = occurrences(SETMULTIHITCOUNTER_NAME);
assert(counterInstrs.length === 3, "setmultihitcounter census drifted to " + counterInstrs.length);
const initInstrs = occurrences(INITMULTIHITSTRING_NAME);
assert(initInstrs.length === 4, "initmultihitstring census drifted to " + initInstrs.length);
const hasnohpInstrs = occurrences(JUMPIFHASNOHP_NAME);
assert(hasnohpInstrs.length === 5, "jumpifhasnohp census drifted to " + hasnohpInstrs.length);

// The canonical production resolveByteOperand port
// (factoryBattleScriptFullTurnDecision.ts:1370-1371, quoted verbatim -- not
// a standalone export, so reproduced here).
function resolveByteOperand(_context, operand) {
  return /^[0-9]+$/.test(operand.expression) ? Number(operand.expression) : null;
}
const resolveBattlerForBattleScript = rulesModule.resolveRulesBattlerForBattleScript;

const handlers = ruleCommandsModule.createBattleScriptRuleCommandHandlers(
  program, resolveByteOperand, resolveBattlerForBattleScript,
);

function fixedBattler(hp) {
  return Object.freeze({
    side: 0, ability: 1, hp, maxHP: 100, moves: freezeArray([33, 45, 98, 57]),
    pp: freezeArray([35, 10, 15, 20]), status1: 0, status2: 0, status3: 0, item: 0,
    statStages: freezeArray([6, 6, 6, 6, 6, 6, 6, 6]),
    types: freezeArray(["TYPE_NORMAL", "TYPE_NORMAL"]), species: 1, attack: 50, defense: 51,
    speed: 52, spAttack: 53, spDefense: 54, level: 50, friendship: 70, partyIndex: 0,
    substituteHP: 0, rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0, usedTauntedMove: 0,
    usedImprisonedMove: 0,
  });
}

function makeRules(overrides) {
  const {
    attacker = 0, target = 1, effectBattler = 2, fainted = null, scriptingBattler = 0,
    multiHitCounter = 9, multiHitStringCounter = 3, battlerHp = [100, 100, 100, 100],
  } = overrides;
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray(battlerHp.map((hp) => fixedBattler(hp))),
    battleTopology: Object.freeze({
      battlersCount: 2, battlerPositions: freezeArray([0, 1, 2, 3]), battleTypeFlags: 0,
    }),
    selectorRoles: Object.freeze({ attacker, target, effectBattler, fainted }),
    scriptingBattler, battlerWithAbility: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: 33, currentMovePosition: 0, moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1,
    moveEffectByte: 0, missType: 0, hitMarker: 0, multiHitCounter, multiHitStringCounter,
    battleMoveDamage: 0, painSplitHp: 0,
    bideDmg: freezeArray([0, 0, 0, 0]), lockedMoves: freezeArray([0, 0, 0, 0]),
    chosenMovePositions: freezeArray([0, 0, 0, 0]), sideStatuses: freezeArray([0, 0]),
    weather: 0, weatherTimer: 0, randomTurnNumber: 0,
    battleCommunication0: 0, battleCommunication1: 0,
    battlerByTurnOrder: freezeArray([0, 1, 2, 3]),
  });
}

function rustRules(rules) {
  return `MultihitVectorRules { multi_hit_counter: ${hex8(rules.multiHitCounter)}, multi_hit_string_counter: ${hex8(rules.multiHitStringCounter)}, selector_attacker: ${rustOptU8(rules.selectorRoles.attacker)}, selector_target: ${rustOptU8(rules.selectorRoles.target)}, selector_effect_battler: ${rustOptU8(rules.selectorRoles.effectBattler)}, selector_fainted: ${rustOptU8(rules.selectorRoles.fainted)}, scripting_battler: ${hex8(rules.scriptingBattler)}, battlers_hp: [${rules.battlers.map((b) => b.hp).join(", ")}] }`;
}

function rustOperands(operands) {
  return `&[${operands.map((o) => `MultihitOperandVector { width_bytes: ${o.widthBytes}, expression: ${rustString(o.expression)} }`).join(", ")}]`;
}

function operandSpec(operand) {
  return Object.freeze({ widthBytes: operand.widthBytes, expression: operand.expression });
}

function customInstruction(template, operandExpressions, pcOffset) {
  const operands = operandExpressions.map((entry, index) => {
    const base = template.operands[index] ?? template.operands[0];
    return Object.freeze({ ...base, expression: entry.expression, widthBytes: entry.widthBytes ?? base.widthBytes });
  });
  return Object.freeze({
    ...template,
    programCounter: template.programCounter + pcOffset,
    operands: freezeArray(operands),
  });
}

// invoke() calls the registered handler directly (array-family precedent),
// bypassing stepBattleScriptMachine so malformed/custom operand shapes not
// present in the committed program can be exercised too.
function invoke(instruction, rules, rngSeed) {
  const machine = machineModule.createBattleScriptMachine(program, "BattleScript_EffectHit", rules, rngSeed ?? 0x0bad_f000);
  const state = Object.freeze({ ...machine, programCounter: instruction.programCounter });
  const handler = handlers[instruction.opcodeId];
  assert(typeof handler === "function", "no canonical handler registered for opcode " + instruction.opcodeId);
  let error = null;
  let transition = null;
  try {
    transition = handler({ program, instruction, state });
  } catch (caught) {
    assert(caught instanceof Error, "handler threw non-Error");
    error = caught.message;
  }
  return { transition, error };
}

// ---------------------------------------------------------------------
// SETMULTIHIT
// ---------------------------------------------------------------------

const setmultihitCases = [];
function addSetMultiHit(label, category, instruction, rules) {
  assert(!setmultihitCases.some((c) => c.label === label), "duplicate setmultihit label " + label);
  const { transition, error } = invoke(instruction, rules);
  assert(error === null, `setmultihit case ${label} unexpectedly threw: ${error}`);
  const control = transition.control;
  const entry = {
    label, category, programCounter: instruction.programCounter, opcodeId: instruction.opcodeId,
    operands: freezeArray(instruction.operands.map(operandSpec)), initial: rules,
    controlKind: control.kind, resultCounter: null, blockOperandExpression: null,
    haltOperandExpression: null, haltReceived: null,
  };
  if (control.kind === "advance") {
    entry.resultCounter = transition.rulesContext.multiHitCounter;
  } else if (control.kind === "block") {
    assert(control.reason.kind === "source-context-unavailable" && control.reason.port === "resolve-byte");
    entry.blockOperandExpression = control.reason.operandExpression;
  } else if (control.kind === "halt") {
    assert(control.reason.kind === "invalid-source-operand");
    entry.haltOperandExpression = control.reason.operandExpression;
    entry.haltReceived = control.reason.received;
  } else {
    throw new Error("unexpected setmultihit control kind " + control.kind);
  }
  setmultihitCases.push(Object.freeze(entry));
}

const site1390 = setmultihitInstrs.find((i) => i.source.statementLine === 1390);
const site3093 = setmultihitInstrs.find((i) => i.source.statementLine === 3093);
const site3096 = setmultihitInstrs.find((i) => i.source.statementLine === 3096);
assert(site1390 && site3093 && site3096, "expected all three setmultihit committed sites");
addSetMultiHit("setmultihit_site_1390_value_3", "canonical-site", site1390, makeRules({}));
addSetMultiHit("setmultihit_site_3093_value_1", "canonical-site", site3093, makeRules({}));
addSetMultiHit("setmultihit_site_3096_value_2", "canonical-site", site3096, makeRules({}));

const setmultihitTemplate = setmultihitInstrs[0];
addSetMultiHit(
  "setmultihit_custom_nonnumeric_blocks", "custom-block",
  customInstruction(setmultihitTemplate, [{ expression: "MULTI_HIT_COUNT" }], 1),
  makeRules({}),
);
addSetMultiHit(
  "setmultihit_custom_two_operands_halts", "custom-shape",
  customInstruction(setmultihitTemplate, [{ expression: "3" }, { expression: "3" }], 2),
  makeRules({}),
);
addSetMultiHit(
  "setmultihit_custom_out_of_range_value_halts", "custom-value",
  customInstruction(setmultihitTemplate, [{ expression: "256" }], 3),
  makeRules({}),
);
addSetMultiHit(
  "setmultihit_custom_missing_operand_halts", "custom-shape",
  customInstruction(setmultihitTemplate, [], 4),
  makeRules({}),
);

// ---------------------------------------------------------------------
// DECREMENTMULTIHIT
// ---------------------------------------------------------------------

const decrementCases = [];
function addDecrement(label, category, instruction, rules) {
  assert(!decrementCases.some((c) => c.label === label), "duplicate decrementmultihit label " + label);
  const { transition, error } = invoke(instruction, rules);
  assert(error === null, `decrementmultihit case ${label} unexpectedly threw: ${error}`);
  const control = transition.control;
  const entry = {
    label, category, programCounter: instruction.programCounter,
    operands: freezeArray(instruction.operands.map(operandSpec)),
    initialCounter: rules.multiHitCounter, controlKind: control.kind,
    resultCounter: transition.rulesContext.multiHitCounter,
    jumpProgramCounter: null, haltExpression: null,
  };
  if (control.kind === "jump") {
    entry.jumpProgramCounter = control.programCounter;
  } else if (control.kind === "halt") {
    assert(control.reason.kind === "invalid-control-target");
    entry.haltExpression = control.reason.expression;
  } else {
    assert(control.kind === "advance", "unexpected decrementmultihit control kind " + control.kind);
  }
  decrementCases.push(Object.freeze(entry));
}

const dsite639 = decrementInstrs.find((i) => i.source.statementLine === 639);
const dsite1420 = decrementInstrs.find((i) => i.source.statementLine === 1420);
const dsite3104 = decrementInstrs.find((i) => i.source.statementLine === 3104);
assert(dsite639 && dsite1420 && dsite3104, "expected all three decrementmultihit committed sites");
addDecrement("decrementmultihit_site_639_from_2_jumps", "canonical-site", dsite639, makeRules({ multiHitCounter: 2 }));
addDecrement("decrementmultihit_site_1420_from_1_advances", "canonical-site", dsite1420, makeRules({ multiHitCounter: 1 }));
addDecrement("decrementmultihit_site_3104_from_0_wraps_and_jumps", "canonical-site", dsite3104, makeRules({ multiHitCounter: 0 }));

const decrementTemplate = decrementInstrs[0];
addDecrement(
  "decrementmultihit_custom_bad_target_halts_but_decrements", "custom-halt",
  customInstruction(decrementTemplate, [{ expression: "BattleScript_NotARealLabel" }], 1),
  makeRules({ multiHitCounter: 3 }),
);
addDecrement(
  "decrementmultihit_custom_missing_operand_halts_but_decrements", "custom-halt",
  customInstruction(decrementTemplate, [], 2),
  makeRules({ multiHitCounter: 3 }),
);

// ---------------------------------------------------------------------
// SETMULTIHITCOUNTER
// ---------------------------------------------------------------------

const counterCases = [];
function addCounter(label, category, instruction, rules, rngSeed) {
  assert(!counterCases.some((c) => c.label === label), "duplicate setmultihitcounter label " + label);
  const { transition, error } = invoke(instruction, rules, rngSeed);
  assert(error === null, `setmultihitcounter case ${label} unexpectedly threw: ${error}`);
  const control = transition.control;
  const entry = {
    label, category, programCounter: instruction.programCounter, opcodeId: instruction.opcodeId,
    operands: freezeArray(instruction.operands.map(operandSpec)), initial: rules, rngSeed: rngSeed ?? 0x0bad_f000,
    sourceLabel: instruction.source.label, sourceStatementLine: instruction.source.statementLine,
    controlKind: control.kind, resultCounter: null, rngAfterValue: null, rngAfterCalls: null,
    draws: [], blockOperandExpression: null, haltOperandExpression: null, haltReceived: null,
  };
  if (control.kind === "advance") {
    entry.resultCounter = transition.rulesContext.multiHitCounter;
    entry.rngAfterValue = transition.rng.value;
    entry.rngAfterCalls = transition.rng.calls;
    entry.draws = freezeArray(transition.rng.ledger.map((draw) => Object.freeze({
      call: draw.call, reason: draw.reason, before: draw.before, after: draw.after, randomValue: draw.randomValue,
      programCounter: draw.provenance.programCounter, opcodeId: draw.provenance.opcodeId,
      opcodeName: draw.provenance.opcodeName, dispatcher: draw.provenance.dispatcher,
      sourceLabel: draw.provenance.sourceLabel, sourceStatementLine: draw.provenance.sourceStatementLine,
    })));
  } else if (control.kind === "block") {
    assert(control.reason.kind === "source-context-unavailable" && control.reason.port === "resolve-byte");
    entry.blockOperandExpression = control.reason.operandExpression;
  } else if (control.kind === "halt") {
    assert(control.reason.kind === "invalid-source-operand");
    entry.haltOperandExpression = control.reason.operandExpression;
    entry.haltReceived = control.reason.received;
  } else {
    throw new Error("unexpected setmultihitcounter control kind " + control.kind);
  }
  counterCases.push(Object.freeze(entry));
}

const csite609 = counterInstrs.find((i) => i.source.statementLine === 609);
const csite844 = counterInstrs.find((i) => i.source.statementLine === 844);
const csite1081 = counterInstrs.find((i) => i.source.statementLine === 1081);
assert(csite609 && csite844 && csite1081, "expected all three setmultihitcounter committed sites");
addCounter("setmultihitcounter_site_844_value_2_zero_draws", "canonical-site", csite844, makeRules({}));
addCounter("setmultihitcounter_site_1081_value_2_zero_draws", "canonical-site", csite1081, makeRules({}));

// site 609 (value 0) is the RNG path. Search deterministically for a seed
// giving a one-draw path (initial&3 <= 1) and a seed giving a two-draw path
// (initial&3 > 1).
function findSeedFor(predicate) {
  for (let seed = 0; seed < 4096; seed++) {
    const { transition } = invoke(csite609, makeRules({}), seed);
    const draws = transition.rng.ledger;
    if (predicate(draws)) return seed;
  }
  throw new Error("could not find a seed matching the requested draw shape");
}
const oneDrawSeed = findSeedFor((draws) => draws.length === 1);
const twoDrawSeed = findSeedFor((draws) => draws.length === 2);
addCounter("setmultihitcounter_site_609_value_0_one_draw", "canonical-site-rng", csite609, makeRules({}), oneDrawSeed);
addCounter("setmultihitcounter_site_609_value_0_two_draws", "canonical-site-rng", csite609, makeRules({}), twoDrawSeed);

const counterTemplate = counterInstrs[0];
addCounter(
  "setmultihitcounter_custom_nonnumeric_blocks", "custom-block",
  customInstruction(counterTemplate, [{ expression: "MULTI_HIT_COUNT" }], 1),
  makeRules({}),
);

// ---------------------------------------------------------------------
// INITMULTIHITSTRING
// ---------------------------------------------------------------------

const initCases = [];
function addInit(label, instruction, rules) {
  assert(!initCases.some((c) => c.label === label), "duplicate initmultihitstring label " + label);
  const { transition, error } = invoke(instruction, rules);
  assert(error === null, `initmultihitstring case ${label} unexpectedly threw: ${error}`);
  assert(transition.control.kind === "advance", "initmultihitstring always advances");
  initCases.push(Object.freeze({
    label, initialStringCounter: rules.multiHitStringCounter, initialCounter: rules.multiHitCounter,
    resultStringCounter: transition.rulesContext.multiHitStringCounter,
  }));
}
const initLabels = ["setmultihit_effect", "double_hit_effect", "twineedle_effect", "triple_kick_effect"];
initInstrs.forEach((instruction, index) => {
  addInit(
    `initmultihitstring_site_${instruction.source.statementLine}_${initLabels[index]}`,
    instruction,
    makeRules({ multiHitStringCounter: 7, multiHitCounter: 5 }),
  );
});

// ---------------------------------------------------------------------
// JUMPIFHASNOHP
// ---------------------------------------------------------------------

const hasnohpCases = [];
function addHasNoHp(label, category, instruction, rules) {
  assert(!hasnohpCases.some((c) => c.label === label), "duplicate jumpifhasnohp label " + label);
  const { transition, error } = invoke(instruction, rules);
  const entry = {
    label, category, programCounter: instruction.programCounter, opcodeId: instruction.opcodeId,
    operands: freezeArray(instruction.operands.map(operandSpec)), initial: rules,
    controlKind: error !== null ? "error" : transition.control.kind, jumpProgramCounter: null,
    blockOperandExpression: null, haltOperandExpression: null, haltReceived: null, error,
  };
  if (error === null) {
    const control = transition.control;
    if (control.kind === "jump") {
      entry.jumpProgramCounter = control.programCounter;
    } else if (control.kind === "block") {
      assert(control.reason.kind === "source-context-unavailable" && control.reason.port === "resolve-battler-for-battle-script");
      entry.blockOperandExpression = control.reason.operandExpression;
    } else if (control.kind === "halt") {
      assert(control.reason.kind === "invalid-source-operand");
      entry.haltOperandExpression = control.reason.operandExpression;
      entry.haltReceived = control.reason.received;
    } else {
      assert(control.kind === "advance", "unexpected jumpifhasnohp control kind " + control.kind);
    }
  }
  hasnohpCases.push(Object.freeze(entry));
}

for (const instruction of hasnohpInstrs) {
  const isTarget = instruction.operands[0].expression === "BS_TARGET";
  const battlerIndex = isTarget ? 1 : 0;
  const label = `jumpifhasnohp_site_${instruction.source.statementLine}`;
  addHasNoHp(`${label}_hp_nonzero_advances`, "canonical-site", instruction, makeRules({ battlerHp: [100, 100, 100, 100] }));
  const hpZero = [100, 100, 100, 100];
  hpZero[battlerIndex] = 0;
  addHasNoHp(`${label}_hp_zero_jumps`, "canonical-site", instruction, makeRules({ battlerHp: hpZero }));
}

const hasnohpTemplate = hasnohpInstrs.find((i) => i.operands[0].expression === "BS_ATTACKER");
addHasNoHp(
  "jumpifhasnohp_custom_missing_attacker_role_blocks", "custom-block",
  hasnohpTemplate, makeRules({ attacker: null }),
);
addHasNoHp(
  "jumpifhasnohp_custom_unresolved_target_throws", "custom-error",
  customInstruction(hasnohpTemplate, [{ expression: "BS_ATTACKER" }, { expression: "BattleScript_NotARealLabel" }], 1),
  makeRules({ battlerHp: [0, 100, 100, 100] }),
);
addHasNoHp(
  "jumpifhasnohp_custom_bad_shape_halts", "custom-shape",
  customInstruction(hasnohpTemplate, [{ expression: "BS_ATTACKER", widthBytes: 2 }], 2),
  makeRules({}),
);

// ---------------------------------------------------------------------
// Registration cases
// ---------------------------------------------------------------------

const registrationCases = [];
function programWithout(opcodeName) {
  return Object.freeze({
    ...program,
    instructions: program.instructions.filter((i) => i.opcodeName !== opcodeName),
  });
}
function addRegistration(label, opcodeName, run) {
  let error = null;
  try {
    run();
  } catch (caught) {
    assert(caught instanceof Error, "registration threw non-Error for " + label);
    error = caught.message;
  }
  registrationCases.push(Object.freeze({ label, opcodeName, error }));
}
for (const name of [
  SETMULTIHIT_NAME, DECREMENTMULTIHIT_NAME, SETMULTIHITCOUNTER_NAME, INITMULTIHITSTRING_NAME, JUMPIFHASNOHP_NAME,
]) {
  addRegistration(`${name}_present`, name, () => {
    assert(typeof handlers[program.instructions.find((i) => i.opcodeName === name).opcodeId] === "function");
  });
}
addRegistration(`${SETMULTIHIT_NAME}_missing`, SETMULTIHIT_NAME, () => {
  ruleCommandsModule.createBattleScriptRuleCommandHandlers(programWithout(SETMULTIHIT_NAME), resolveByteOperand, resolveBattlerForBattleScript);
});
addRegistration(`${JUMPIFHASNOHP_NAME}_missing`, JUMPIFHASNOHP_NAME, () => {
  ruleCommandsModule.createBattleScriptRuleCommandHandlers(programWithout(JUMPIFHASNOHP_NAME), resolveByteOperand, resolveBattlerForBattleScript);
});

assert(registrationCases.length === 7, "registration case count drifted to " + registrationCases.length);

const behaviorCaseCount = setmultihitCases.length + decrementCases.length + counterCases.length
  + initCases.length + hasnohpCases.length;
assert(behaviorCaseCount >= 34 && behaviorCaseCount <= 44,
  "behavior case count " + behaviorCaseCount + " outside the 34-44 target band");

// ---------------------------------------------------------------------
// Source/decomp evidence + census
// ---------------------------------------------------------------------

function sourceLine(source, number) {
  const result = source.split("\n")[number - 1];
  assert(result !== undefined, "missing source line " + number);
  return result;
}
const commandSource = fs.readFileSync(path.join(workspaceRoot, "reference", "pokeemerald", "src", "battle_script_commands.c"), "utf8");
const scriptSource = fs.readFileSync(path.join(workspaceRoot, "reference", "pokeemerald", "data", "battle_scripts_1.s"), "utf8");
assert(sourceLine(commandSource, 3638).trim() === "static void Cmd_setmultihit(void)", "setmultihit handler line drifted");
assert(sourceLine(commandSource, 3644).trim() === "static void Cmd_decrementmultihit(void)", "decrementmultihit handler line drifted");
assert(sourceLine(commandSource, 7139).trim() === "static void Cmd_setmultihitcounter(void)", "setmultihitcounter handler line drifted");
assert(sourceLine(commandSource, 7157).trim() === "static void Cmd_initmultihitstring(void)", "initmultihitstring handler line drifted");
assert(sourceLine(commandSource, 9609).trim() === "static void Cmd_jumpifhasnohp(void)", "jumpifhasnohp handler line drifted");
assert((scriptSource.match(/^\tsetmultihit /gm) ?? []).length === 3, "setmultihit program count drifted");
assert((scriptSource.match(/^\tdecrementmultihit /gm) ?? []).length === 3, "decrementmultihit program count drifted");
assert((scriptSource.match(/^\tsetmultihitcounter /gm) ?? []).length === 3, "setmultihitcounter program count drifted");
assert((scriptSource.match(/^\tinitmultihitstring$/gm) ?? []).length === 4, "initmultihitstring program count drifted");
assert((scriptSource.match(/^\tjumpifhasnohp /gm) ?? []).length === 5, "jumpifhasnohp program count drifted");

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(value[key], (counts.get(value[key]) ?? 0) + 1);
  return freezeArray([...counts.entries()]);
}
const domainCensus = freezeArray([
  ["setmultihit-concrete-starts", setmultihitInstrs.length],
  ["decrementmultihit-concrete-starts", decrementInstrs.length],
  ["setmultihitcounter-concrete-starts", counterInstrs.length],
  ["initmultihitstring-concrete-starts", initInstrs.length],
  ["jumpifhasnohp-concrete-starts", hasnohpInstrs.length],
  ["setmultihit-cases", setmultihitCases.length],
  ["decrementmultihit-cases", decrementCases.length],
  ["setmultihitcounter-cases", counterCases.length],
  ["initmultihitstring-cases", initCases.length],
  ["jumpifhasnohp-cases", hasnohpCases.length],
  ["registration-cases", registrationCases.length],
]);
const controlCensus = census(
  [...setmultihitCases, ...decrementCases, ...counterCases, ...hasnohpCases].map((c) => Object.freeze({ controlKind: c.controlKind })),
  "controlKind",
);
const registrationOutcomeCensus = census(
  registrationCases.map((c) => Object.freeze({ outcome: c.error === null ? "registered" : "error" })),
  "outcome",
);

const corpus = Object.freeze({
  domainCensus, controlCensus, registrationOutcomeCensus,
  setmultihitCases, decrementCases, counterCases, initCases, hasnohpCases, registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusSha256 = crypto.createHash("sha256").update(corpusText).digest("hex");

// ---------------------------------------------------------------------
// Rust emission
// ---------------------------------------------------------------------

function rustDraw(draw) {
  return `MultihitDrawVector { call: ${draw.call}, reason: ${rustString(draw.reason)}, before: ${draw.before}, after: ${draw.after}, random_value: ${draw.randomValue}, program_counter: ${draw.programCounter}, opcode_id: ${hex8(draw.opcodeId)}, opcode_name: ${rustString(draw.opcodeName)}, dispatcher: ${rustString(draw.dispatcher)}, source_label: ${rustString(draw.sourceLabel)}, source_statement_line: ${draw.sourceStatementLine} }`;
}

function rustSetMultiHitCase(c) {
  return `SetMultiHitVectorCase {
        label: ${rustString(c.label)}, category: ${rustString(c.category)},
        program_counter: ${c.programCounter}, opcode_id: ${hex8(c.opcodeId)},
        operands: ${rustOperands(c.operands)}, initial: ${rustRules(c.initial)},
        control_kind: ${rustString(c.controlKind)}, result_counter: ${rustOptU8(c.resultCounter)},
        block_operand_expression: ${rustOptStr(c.blockOperandExpression)},
        halt_operand_expression: ${rustOptStr(c.haltOperandExpression)},
        halt_received: ${rustOptStr(c.haltReceived)},
    }`;
}

function rustDecrementCase(c) {
  return `DecrementMultiHitVectorCase {
        label: ${rustString(c.label)}, category: ${rustString(c.category)}, program_counter: ${c.programCounter},
        operands: ${rustOperands(c.operands)},
        initial_counter: ${hex8(c.initialCounter)}, control_kind: ${rustString(c.controlKind)},
        result_counter: ${hex8(c.resultCounter)}, jump_program_counter: ${rustOptU32(c.jumpProgramCounter)},
        halt_expression: ${rustOptStr(c.haltExpression)},
    }`;
}

function rustCounterCase(c) {
  return `SetMultiHitCounterVectorCase {
        label: ${rustString(c.label)}, category: ${rustString(c.category)},
        program_counter: ${c.programCounter}, opcode_id: ${hex8(c.opcodeId)},
        operands: ${rustOperands(c.operands)}, initial: ${rustRules(c.initial)}, rng_seed: ${c.rngSeed},
        source_label: ${rustString(c.sourceLabel)}, source_statement_line: ${c.sourceStatementLine},
        control_kind: ${rustString(c.controlKind)}, result_counter: ${rustOptU8(c.resultCounter)},
        rng_after_value: ${rustOptU32(c.rngAfterValue)}, rng_after_calls: ${rustOptU32(c.rngAfterCalls)},
        draws: &[${c.draws.map(rustDraw).join(", ")}],
        block_operand_expression: ${rustOptStr(c.blockOperandExpression)},
        halt_operand_expression: ${rustOptStr(c.haltOperandExpression)},
        halt_received: ${rustOptStr(c.haltReceived)},
    }`;
}

function rustInitCase(c) {
  return `InitMultiHitStringVectorCase {
        label: ${rustString(c.label)}, initial_string_counter: ${hex8(c.initialStringCounter)},
        initial_counter: ${hex8(c.initialCounter)}, result_string_counter: ${hex8(c.resultStringCounter)},
    }`;
}

function rustHasNoHpCase(c) {
  return `JumpifHasNoHpVectorCase {
        label: ${rustString(c.label)}, category: ${rustString(c.category)},
        program_counter: ${c.programCounter}, opcode_id: ${hex8(c.opcodeId)},
        operands: ${rustOperands(c.operands)}, initial: ${rustRules(c.initial)},
        control_kind: ${rustString(c.controlKind)}, jump_program_counter: ${rustOptU32(c.jumpProgramCounter)},
        block_operand_expression: ${rustOptStr(c.blockOperandExpression)},
        halt_operand_expression: ${rustOptStr(c.haltOperandExpression)},
        halt_received: ${rustOptStr(c.haltReceived)}, error: ${rustOptStr(c.error)},
    }`;
}

function rustRegistrationCase(c) {
  return `MultihitRegistrationVectorCase { label: ${rustString(c.label)}, opcode_name: ${rustString(c.opcodeName)}, error: ${rustOptStr(c.error)} }`;
}

const lines = [];
lines.push("//! @generated by core-rs/tools/gen-battle-script-multihit-family-vectors.mjs.");
lines.push("//! Source: executing canonical src/engine/battleScriptRuleCommands.ts via Node.");
lines.push("//! Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-multihit-family-vectors.mjs.");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct MultihitVectorRules {");
lines.push("    pub multi_hit_counter: u8, pub multi_hit_string_counter: u8,");
lines.push("    pub selector_attacker: Option<u8>, pub selector_target: Option<u8>,");
lines.push("    pub selector_effect_battler: Option<u8>, pub selector_fainted: Option<u8>,");
lines.push("    pub scripting_battler: u8, pub battlers_hp: [u16; 4],");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct MultihitOperandVector { pub width_bytes: u8, pub expression: &'static str }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct MultihitDrawVector {");
lines.push("    pub call: u32, pub reason: &'static str, pub before: u32, pub after: u32, pub random_value: u16,");
lines.push("    pub program_counter: u32, pub opcode_id: u8, pub opcode_name: &'static str, pub dispatcher: &'static str,");
lines.push("    pub source_label: &'static str, pub source_statement_line: u32,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct SetMultiHitVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str, pub program_counter: u32, pub opcode_id: u8,");
lines.push("    pub operands: &'static [MultihitOperandVector], pub initial: MultihitVectorRules,");
lines.push("    pub control_kind: &'static str, pub result_counter: Option<u8>,");
lines.push("    pub block_operand_expression: Option<&'static str>, pub halt_operand_expression: Option<&'static str>,");
lines.push("    pub halt_received: Option<&'static str>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct DecrementMultiHitVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str, pub program_counter: u32,");
lines.push("    pub operands: &'static [MultihitOperandVector], pub initial_counter: u8,");
lines.push("    pub control_kind: &'static str, pub result_counter: u8, pub jump_program_counter: Option<u32>,");
lines.push("    pub halt_expression: Option<&'static str>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct SetMultiHitCounterVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str, pub program_counter: u32, pub opcode_id: u8,");
lines.push("    pub operands: &'static [MultihitOperandVector], pub initial: MultihitVectorRules, pub rng_seed: u32,");
lines.push("    pub source_label: &'static str, pub source_statement_line: u32,");
lines.push("    pub control_kind: &'static str, pub result_counter: Option<u8>,");
lines.push("    pub rng_after_value: Option<u32>, pub rng_after_calls: Option<u32>,");
lines.push("    pub draws: &'static [MultihitDrawVector],");
lines.push("    pub block_operand_expression: Option<&'static str>, pub halt_operand_expression: Option<&'static str>,");
lines.push("    pub halt_received: Option<&'static str>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct InitMultiHitStringVectorCase {");
lines.push("    pub label: &'static str, pub initial_string_counter: u8, pub initial_counter: u8,");
lines.push("    pub result_string_counter: u8,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct JumpifHasNoHpVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str, pub program_counter: u32, pub opcode_id: u8,");
lines.push("    pub operands: &'static [MultihitOperandVector], pub initial: MultihitVectorRules,");
lines.push("    pub control_kind: &'static str, pub jump_program_counter: Option<u32>,");
lines.push("    pub block_operand_expression: Option<&'static str>, pub halt_operand_expression: Option<&'static str>,");
lines.push("    pub halt_received: Option<&'static str>, pub error: Option<&'static str>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct MultihitRegistrationVectorCase {");
lines.push("    pub label: &'static str, pub opcode_name: &'static str, pub error: Option<&'static str>,");
lines.push("}");
lines.push(`pub const BATTLE_SCRIPT_MULTIHIT_FAMILY_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusSha256)};`);
lines.push(`pub const BATTLE_SCRIPT_MULTIHIT_FAMILY_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push(`pub const BATTLE_SCRIPT_MULTIHIT_FAMILY_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [${domainCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_MULTIHIT_FAMILY_CONTROL_CENSUS: [(&str, usize); ${controlCensus.length}] = [${controlCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_MULTIHIT_FAMILY_REGISTRATION_OUTCOME_CENSUS: [(&str, usize); ${registrationOutcomeCensus.length}] = [${registrationOutcomeCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub static BATTLE_SCRIPT_SETMULTIHIT_CASES: [SetMultiHitVectorCase; ${setmultihitCases.length}] = [`);
for (const c of setmultihitCases) lines.push("    " + rustSetMultiHitCase(c) + ",");
lines.push("];");
lines.push(`pub static BATTLE_SCRIPT_DECREMENTMULTIHIT_CASES: [DecrementMultiHitVectorCase; ${decrementCases.length}] = [`);
for (const c of decrementCases) lines.push("    " + rustDecrementCase(c) + ",");
lines.push("];");
lines.push(`pub static BATTLE_SCRIPT_SETMULTIHITCOUNTER_CASES: [SetMultiHitCounterVectorCase; ${counterCases.length}] = [`);
for (const c of counterCases) lines.push("    " + rustCounterCase(c) + ",");
lines.push("];");
lines.push(`pub static BATTLE_SCRIPT_INITMULTIHITSTRING_CASES: [InitMultiHitStringVectorCase; ${initCases.length}] = [`);
for (const c of initCases) lines.push("    " + rustInitCase(c) + ",");
lines.push("];");
lines.push(`pub static BATTLE_SCRIPT_JUMPIFHASNOHP_CASES: [JumpifHasNoHpVectorCase; ${hasnohpCases.length}] = [`);
for (const c of hasnohpCases) lines.push("    " + rustHasNoHpCase(c) + ",");
lines.push("];");
lines.push(`pub static BATTLE_SCRIPT_MULTIHIT_FAMILY_REGISTRATION_CASES: [MultihitRegistrationVectorCase; ${registrationCases.length}] = [`);
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
if (!formatted) throw new Error("gen-battle-script-multihit-family-vectors: could not find rustfmt");
const generated = fs.readFileSync(outputPath);
console.log(`gen-battle-script-multihit-family-vectors: wrote ${path.relative(workspaceRoot, outputPath)}`);
console.log(`gen-battle-script-multihit-family-vectors: ${setmultihitCases.length} setmultihit, ${decrementCases.length} decrementmultihit, ${counterCases.length} setmultihitcounter, ${initCases.length} initmultihitstring, ${hasnohpCases.length} jumpifhasnohp, ${registrationCases.length} registration cases`);
console.log(`gen-battle-script-multihit-family-vectors: corpus sha256 ${corpusSha256} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-multihit-family-vectors: generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`gen-battle-script-multihit-family-vectors: generator sha256 ${crypto.createHash("sha256").update(fs.readFileSync(scriptPath)).digest("hex")} bytes ${fs.statSync(scriptPath).size}`);
