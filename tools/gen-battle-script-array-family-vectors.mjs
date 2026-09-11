#!/usr/bin/env node
// Differential corpus for the B_SCR_OP_JUMPIFARRAYEQUAL (0x2C) /
// B_SCR_OP_JUMPIFARRAYNOTEQUAL (0x2D) / B_SCR_OP_COPYARRAYWITHINDEX (0x32)
// trio. Expected outputs, controls, and registration errors are produced
// only by executing the canonical TypeScript factories
// (createBattleScriptDamagingWeatherOpcodeHandlers,
// createBattleScriptRankedBatch1OpcodeHandlers) on the real committed Battle
// Script program (and, for registration edges, on that program with
// targeted surgery: filtered or duplicated start instructions).
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-array-family-vectors.mjs

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
  "battle_script_array_family_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

const [programModule, machineModule, rulesModule, damagingWeatherModule, rankedBatch1Module] =
  await Promise.all([
    import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
    import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
    import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
    import(pathToFileURL(path.join(
      workspaceRoot, "src", "engine", "battleScriptDamagingWeatherOpcode.ts",
    )).href),
    import(pathToFileURL(path.join(
      workspaceRoot, "src", "engine", "battleScriptRankedBatch1Opcode.ts",
    )).href),
  ]);

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-array-family-vectors: " + message);
}

function freezeArray(values) { return Object.freeze(values.slice()); }
function hex8(value) { return "0x" + (value & 0xff).toString(16).padStart(2, "0"); }
function rustString(value) { return JSON.stringify(value); }

const NOTEQUAL_OPCODE_NAME = "B_SCR_OP_JUMPIFARRAYNOTEQUAL";
const NOTEQUAL_OPCODE_ID = 0x2d;
const EQUAL_OPCODE_NAME = "B_SCR_OP_JUMPIFARRAYEQUAL";
const EQUAL_OPCODE_ID = 0x2c;
const WITHINDEX_OPCODE_NAME = "B_SCR_OP_COPYARRAYWITHINDEX";
const WITHINDEX_OPCODE_ID = 0x32;

const stubPorts = Object.freeze({
  isControllerIdle: () => true,
  resolveBattlerForBattleScript: () => null,
});

const program = programModule.loadBattleScriptProgram();

const notequalInstructions = freezeArray(
  program.instructions.filter((i) => i.opcodeName === NOTEQUAL_OPCODE_NAME),
);
assert(notequalInstructions.length === 7, "notequal call site count drifted to " + notequalInstructions.length);
const equalInstructions = freezeArray(
  program.instructions.filter((i) => i.opcodeName === EQUAL_OPCODE_NAME),
);
assert(equalInstructions.length === 1, "equal call site count drifted to " + equalInstructions.length);
const withindexInstructions = freezeArray(
  program.instructions.filter((i) => i.opcodeName === WITHINDEX_OPCODE_NAME),
);
assert(withindexInstructions.length === 1, "withindex call site count drifted to " + withindexInstructions.length);

const damagingWeatherHandlers = damagingWeatherModule.createBattleScriptDamagingWeatherOpcodeHandlers(
  program, stubPorts,
);
const notequalHandler = damagingWeatherHandlers[NOTEQUAL_OPCODE_ID];
assert(typeof notequalHandler === "function", "canonical notequal handler not registered at 0x2D");
const withindexHandler = damagingWeatherHandlers[WITHINDEX_OPCODE_ID];
assert(typeof withindexHandler === "function", "canonical withindex handler not registered at 0x32");

const rankedBatch1Handlers = rankedBatch1Module.createBattleScriptRankedBatch1OpcodeHandlers(program);
const equalHandler = rankedBatch1Handlers[EQUAL_OPCODE_ID];
assert(typeof equalHandler === "function", "canonical equal handler not registered at 0x2C");

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

function makeRules(overrides) {
  const {
    attacker = 0, target = 1, battlersCount = 2, scriptingBattler = 0,
    battleCommunication0 = 0, battleCommunication1 = 0,
    battlerByTurnOrder = [0, 1, 2, 3],
  } = overrides;
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray([0, 1, 2, 3].map(fixedBattler)),
    battleTopology: Object.freeze({
      battlersCount,
      battlerPositions: freezeArray([0, 1, 2, 3]),
      battleTypeFlags: battlersCount === 4 ? rulesModule.BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE : 0,
    }),
    selectorRoles: Object.freeze({ attacker, target, effectBattler: 2, fainted: null }),
    scriptingBattler, battlerWithAbility: 0, atkCancelerTracker: 0, battleOutcome: 0,
    currentMove: 33, currentMovePosition: 0, moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1,
    moveEffectByte: 0, missType: 0, hitMarker: 0, multiHitCounter: 0, battleMoveDamage: 0, painSplitHp: 0,
    bideDmg: freezeArray([0, 0, 0, 0]), lockedMoves: freezeArray([0, 0, 0, 0]),
    chosenMovePositions: freezeArray([0, 0, 0, 0]), sideStatuses: freezeArray([0, 0]),
    weather: 0, weatherTimer: 0, randomTurnNumber: 0,
    battleCommunication0, battleCommunication1,
    battlerByTurnOrder: freezeArray(battlerByTurnOrder),
  });
}

function projectRules(rules) {
  return Object.freeze({
    selectorAttacker: rules.selectorRoles.attacker,
    selectorTarget: rules.selectorRoles.target,
    battlersCount: rules.battleTopology.battlersCount,
    scriptingBattler: rules.scriptingBattler & 0xff,
    battleCommunication0: rules.battleCommunication0 & 0xff,
    battleCommunication1: rules.battleCommunication1 & 0xff,
    battlerByTurnOrder: freezeArray(rules.battlerByTurnOrder),
  });
}

function invoke(handler, instruction, rules) {
  const before = projectRules(rules);
  const machine = machineModule.createBattleScriptMachine(program, "BattleScript_EffectHit", rules, 0x0bad_f000);
  const state = Object.freeze({ ...machine, programCounter: instruction.programCounter });
  let controlKind = null;
  let error = null;
  let resultProjection = null;
  let jumpProgramCounter = null;
  let haltConstruct = null;
  let haltLine = null;
  try {
    const transition = handler({ program, instruction, state });
    controlKind = transition.control.kind;
    assert(transition.scheduler === state.scheduler, "handler changed scheduler");
    assert(transition.rng === state.rng, "handler consumed RNG");
    assert(transition.events.length === 0, "handler emitted an event");
    if (controlKind === "halt") {
      assert(transition.control.reason.kind === "unsupported-branch", "unexpected halt reason kind");
      haltConstruct = transition.control.reason.sourceConstruct;
      haltLine = transition.control.reason.sourceLine;
      resultProjection = before;
    } else if (controlKind === "jump") {
      jumpProgramCounter = transition.control.programCounter;
      resultProjection = projectRules(transition.rulesContext ?? rules);
    } else {
      assert(controlKind === "advance", "unexpected control kind " + controlKind);
      resultProjection = projectRules(transition.rulesContext ?? rules);
    }
  } catch (caught) {
    assert(caught instanceof Error, "handler threw non-Error");
    error = caught.message;
  }
  return Object.freeze({
    before, controlKind, error, resultProjection, jumpProgramCounter, haltConstruct, haltLine,
  });
}

function operandSpec(operand) {
  return Object.freeze({ widthBytes: operand.widthBytes, expression: operand.expression });
}

function customInstruction(template, overrides, pcOffset) {
  const operands = template.operands.map((operand, index) =>
    index in overrides ? Object.freeze({ ...operand, expression: overrides[index] }) : operand,
  );
  return Object.freeze({
    ...template,
    programCounter: template.programCounter + pcOffset,
    operands: freezeArray(operands),
  });
}

// ---------------------------------------------------------------------
// NOTEQUAL behavior cases
// ---------------------------------------------------------------------

const notequalCases = [];
function addNotequal(label, category, instruction, rules) {
  assert(!notequalCases.some((c) => c.label === label), "duplicate notequal label " + label);
  const outcome = invoke(notequalHandler, instruction, rules);
  notequalCases.push(Object.freeze({
    label, category,
    programCounter: instruction.programCounter,
    opcodeId: instruction.opcodeId,
    mem1Expression: instruction.operands[0].expression,
    mem2Expression: instruction.operands[1].expression,
    sizeExpression: instruction.operands[2].expression,
    ptrExpression: instruction.operands[3].expression,
    initial: outcome.before,
    controlKind: outcome.controlKind ?? "error",
    jumpProgramCounter: outcome.jumpProgramCounter,
    error: outcome.error,
    haltConstruct: outcome.haltConstruct,
    haltLine: outcome.haltLine,
  }));
}

function notequalSiteByPair(mem1, mem2) {
  const matches = notequalInstructions.filter(
    (i) => i.operands[0].expression === mem1 && i.operands[1].expression === mem2,
  );
  assert(matches.length >= 1, `expected committed notequal site (${mem1}, ${mem2})`);
  return matches;
}

const site1512 = notequalSiteByPair("gBattlerAttacker", "gBattlerTarget")[0];
addNotequal("site_1512_normal_unequal", "canonical-site", site1512, makeRules({ attacker: 0, target: 1 }));
addNotequal("site_1512_normal_equal", "canonical-site", site1512, makeRules({ attacker: 1, target: 1 }));
addNotequal("site_1512_missing_attacker_halts", "canonical-site-missing-role", site1512, makeRules({ attacker: null, target: 1 }));
addNotequal("site_1512_missing_target_halts", "canonical-site-missing-role", site1512, makeRules({ attacker: 1, target: null }));

const sbattlerSites = notequalSiteByPair("sBATTLER", "gBattlersCount");
assert(sbattlerSites.length === 2, "expected exactly 2 sBATTLER,gBattlersCount notequal sites");
addNotequal("site_1581_equal", "canonical-site", sbattlerSites[0], makeRules({ scriptingBattler: 2, battlersCount: 2 }));
addNotequal("site_1581_unequal", "canonical-site", sbattlerSites[0], makeRules({ scriptingBattler: 0, battlersCount: 2 }));
addNotequal("site_4004_equal", "canonical-site", sbattlerSites[1], makeRules({ scriptingBattler: 2, battlersCount: 2 }));
addNotequal("site_4004_unequal", "canonical-site", sbattlerSites[1], makeRules({ scriptingBattler: 0, battlersCount: 4 }));

const site2595 = notequalSiteByPair("gBattlerTarget", "gBattlersCount")[0];
addNotequal("site_2595_equal", "canonical-site", site2595, makeRules({ target: 2, battlersCount: 2 }));
addNotequal("site_2595_unequal", "canonical-site", site2595, makeRules({ target: 0, battlersCount: 2 }));

const site2916 = notequalSiteByPair("gBattlerFainted", "gBattlersCount")[0];
addNotequal("site_2916_barrier_halts", "canonical-site-barrier", site2916, makeRules({ battlersCount: 2 }));

const site3221 = notequalSiteByPair("gBattleCommunication", "gBattlersCount")[0];
addNotequal("site_3221_equal", "canonical-site", site3221, makeRules({ battleCommunication0: 2, battlersCount: 2 }));
addNotequal("site_3221_unequal", "canonical-site", site3221, makeRules({ battleCommunication0: 0, battlersCount: 2 }));

const site4443 = notequalSiteByPair("gBattleCommunication + 1", "gBattlersCount")[0];
addNotequal("site_4443_equal", "canonical-site", site4443, makeRules({ battleCommunication1: 2, battlersCount: 2 }));
addNotequal("site_4443_unequal", "canonical-site", site4443, makeRules({ battleCommunication1: 0, battlersCount: 2 }));

assert(notequalInstructions.every((i) =>
  notequalCases.some((c) => c.programCounter === i.programCounter)),
  "not every committed notequal site was exercised");

const notequalTemplate = notequalInstructions[0];
addNotequal("custom_unknown_pointer_halts", "unsupported-operand",
  customInstruction(notequalTemplate, { 0: "gBogusPointer" }, 1), makeRules({}));
addNotequal("custom_unknown_mem2_halts", "unsupported-operand",
  customInstruction(notequalTemplate, { 1: "gAnotherBogusPointer" }, 2), makeRules({}));
addNotequal("custom_size_0x2_halts", "unsupported-operand",
  customInstruction(notequalTemplate, { 0: "sBATTLER", 1: "gBattlersCount", 2: "0x2" }, 3),
  makeRules({ scriptingBattler: 0, battlersCount: 2 }));
addNotequal("custom_unresolved_jump_target_errors", "unresolved-target",
  customInstruction(notequalTemplate, { 0: "sBATTLER", 1: "gBattlersCount", 3: "BattleScript_NoSuchLabel" }, 4),
  makeRules({ scriptingBattler: 0, battlersCount: 2 }));

// ---------------------------------------------------------------------
// EQUAL behavior cases
// ---------------------------------------------------------------------

const equalCases = [];
function addEqual(label, category, instruction, rules) {
  assert(!equalCases.some((c) => c.label === label), "duplicate equal label " + label);
  const outcome = invoke(equalHandler, instruction, rules);
  equalCases.push(Object.freeze({
    label, category,
    programCounter: instruction.programCounter,
    operands: freezeArray(instruction.operands.map(operandSpec)),
    initial: outcome.before,
    controlKind: outcome.controlKind ?? "error",
    jumpProgramCounter: outcome.jumpProgramCounter,
    error: outcome.error,
  }));
}

const equalTemplate = equalInstructions[0];
addEqual("equal_site_2579_unequal_advances", "canonical-site", equalTemplate, makeRules({ attacker: 0, target: 1 }));
addEqual("equal_site_2579_equal_jumps", "canonical-site", equalTemplate, makeRules({ attacker: 1, target: 1 }));
addEqual("equal_site_2579_missing_attacker_errors", "missing-role", equalTemplate, makeRules({ attacker: null, target: 1 }));
addEqual("equal_site_2579_missing_target_errors", "missing-role", equalTemplate, makeRules({ attacker: 1, target: null }));
addEqual("equal_custom_invalid_tuple_errors", "invalid-tuple",
  customInstruction(equalTemplate, { 0: "gBattlerTarget" }, 1), makeRules({ attacker: 0, target: 1 }));

// ---------------------------------------------------------------------
// WITHINDEX behavior cases
// ---------------------------------------------------------------------

const withindexCases = [];
function addWithindex(label, category, rules) {
  assert(!withindexCases.some((c) => c.label === label), "duplicate withindex label " + label);
  const instruction = withindexInstructions[0];
  const outcome = invoke(withindexHandler, instruction, rules);
  withindexCases.push(Object.freeze({
    label, category,
    initial: outcome.before,
    controlKind: outcome.controlKind ?? "error",
    result: outcome.resultProjection,
    error: outcome.error,
  }));
}

addWithindex("withindex_index0", "canonical-site",
  makeRules({ battleCommunication0: 0, battlerByTurnOrder: [3, 2, 1, 0] }));
addWithindex("withindex_index1", "canonical-site",
  makeRules({ battleCommunication0: 1, battlerByTurnOrder: [3, 2, 1, 0] }));
addWithindex("withindex_index2", "canonical-site",
  makeRules({ battleCommunication0: 2, battlerByTurnOrder: [3, 2, 1, 0] }));
addWithindex("withindex_index3", "canonical-site",
  makeRules({ battleCommunication0: 3, battlerByTurnOrder: [3, 2, 1, 0] }));
addWithindex("withindex_index4_out_of_range_errors", "out-of-range",
  makeRules({ battleCommunication0: 4, battlerByTurnOrder: [3, 2, 1, 0] }));

const behaviorCaseCount = notequalCases.length + equalCases.length + withindexCases.length;
assert(behaviorCaseCount >= 28 && behaviorCaseCount <= 36,
  "behavior case count " + behaviorCaseCount + " outside the 28-36 target band");

// ---------------------------------------------------------------------
// Registration cases
// ---------------------------------------------------------------------

const registrationCases = [];
function addRegistration(label, family, run) {
  let error = null;
  let opcodeId = null;
  try {
    opcodeId = run();
  } catch (caught) {
    assert(caught instanceof Error, "registration threw non-Error for " + label);
    error = caught.message;
  }
  registrationCases.push(Object.freeze({ label, family, error, opcodeId }));
}

function programWithout(opcodeName) {
  return Object.freeze({
    ...program,
    instructions: program.instructions.filter((i) => i.opcodeName !== opcodeName),
  });
}
function programWithDuplicated(opcodeName) {
  const original = program.instructions.find((i) => i.opcodeName === opcodeName);
  assert(original, "expected instruction to duplicate for " + opcodeName);
  return Object.freeze({
    ...program,
    instructions: freezeArray([...program.instructions, original]),
  });
}

addRegistration("notequal_missing", "notequal", () => {
  damagingWeatherModule.createBattleScriptDamagingWeatherOpcodeHandlers(programWithout(NOTEQUAL_OPCODE_NAME), stubPorts);
  return "unexpectedly-registered";
});
addRegistration("notequal_canonical", "notequal", () => {
  return String(NOTEQUAL_OPCODE_ID in damagingWeatherHandlers);
});

addRegistration("equal_missing", "equal", () => {
  rankedBatch1Module.createBattleScriptRankedBatch1OpcodeHandlers(programWithout(EQUAL_OPCODE_NAME));
  return "unexpectedly-registered";
});
addRegistration("equal_duplicated", "equal", () => {
  rankedBatch1Module.createBattleScriptRankedBatch1OpcodeHandlers(programWithDuplicated(EQUAL_OPCODE_NAME));
  return "unexpectedly-registered";
});
addRegistration("equal_canonical", "equal", () => {
  return String(EQUAL_OPCODE_ID in rankedBatch1Handlers);
});

addRegistration("withindex_missing", "withindex", () => {
  damagingWeatherModule.createBattleScriptDamagingWeatherOpcodeHandlers(programWithout(WITHINDEX_OPCODE_NAME), stubPorts);
  return "unexpectedly-registered";
});
addRegistration("withindex_duplicated", "withindex", () => {
  damagingWeatherModule.createBattleScriptDamagingWeatherOpcodeHandlers(programWithDuplicated(WITHINDEX_OPCODE_NAME), stubPorts);
  return "unexpectedly-registered";
});
addRegistration("withindex_canonical", "withindex", () => {
  return String(WITHINDEX_OPCODE_ID in damagingWeatherHandlers);
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
assert(sourceLine(commandSource, 3771).trim() === "static void Cmd_jumpifarrayequal(void)", "jumpifarrayequal handler line drifted");
assert(sourceLine(commandSource, 3793).trim() === "static void Cmd_jumpifarraynotequal(void)", "jumpifarraynotequal handler line drifted");
assert(sourceLine(commandSource, 3850).trim() === "static void Cmd_copyarraywithindex(void)", "copyarraywithindex handler line drifted");
assert((scriptSource.match(/^\tjumpifbytenotequal /gm) ?? []).length === 7, "notequal program count drifted");
assert((scriptSource.match(/^\tjumpifbyteequal /gm) ?? []).length === 1, "equal program count drifted");
assert((scriptSource.match(/^\tcopyarraywithindex /gm) ?? []).length === 1, "withindex program count drifted");

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(value[key], (counts.get(value[key]) ?? 0) + 1);
  return freezeArray([...counts.entries()]);
}
const notequalCategoryCensus = census(notequalCases, "category");
const equalCategoryCensus = census(equalCases, "category");
const withindexCategoryCensus = census(withindexCases, "category");
const controlCensus = census(
  [...notequalCases, ...equalCases, ...withindexCases].map((c) => Object.freeze({ controlKind: c.controlKind })),
  "controlKind",
);
const registrationOutcomeCensus = census(
  registrationCases.map((c) => Object.freeze({ outcome: c.error === null ? "registered" : "error" })),
  "outcome",
);
const domainCensus = freezeArray([
  ["notequal-concrete-starts", notequalInstructions.length],
  ["equal-concrete-starts", equalInstructions.length],
  ["withindex-concrete-starts", withindexInstructions.length],
  ["notequal-cases", notequalCases.length],
  ["equal-cases", equalCases.length],
  ["withindex-cases", withindexCases.length],
  ["registration-cases", registrationCases.length],
]);

const corpus = Object.freeze({
  domainCensus, notequalCategoryCensus, equalCategoryCensus, withindexCategoryCensus, controlCensus,
  registrationOutcomeCensus, notequalCases, equalCases, withindexCases, registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusSha256 = crypto.createHash("sha256").update(corpusText).digest("hex");

// ---------------------------------------------------------------------
// Rust emission
// ---------------------------------------------------------------------

function rustOptU8(value) { return value === null || value === undefined ? "None" : `Some(${hex8(value)})`; }
function rustOptU32(value) { return value === null || value === undefined ? "None" : `Some(${value})`; }
function rustOptionStr(value) { return value === null || value === undefined ? "None" : `Some(${rustString(value)})`; }
function rustTurnOrder(order) { return `[${order.map((v) => hex8(v)).join(", ")}]`; }

function rustRules(rules) {
  return `ArrayFamilyVectorRules { selector_attacker: ${rustOptU8(rules.selectorAttacker)}, selector_target: ${rustOptU8(rules.selectorTarget)}, battlers_count: ${hex8(rules.battlersCount)}, scripting_battler: ${hex8(rules.scriptingBattler)}, battle_communication0: ${hex8(rules.battleCommunication0)}, battle_communication1: ${hex8(rules.battleCommunication1)}, battler_by_turn_order: ${rustTurnOrder(rules.battlerByTurnOrder)} }`;
}

function rustNotequalCase(c) {
  return `ArrayFamilyNotEqualBehaviorVectorCase {
        label: ${rustString(c.label)}, category: ${rustString(c.category)},
        program_counter: ${c.programCounter}, opcode_id: ${hex8(c.opcodeId)},
        mem1_expression: ${rustString(c.mem1Expression)}, mem2_expression: ${rustString(c.mem2Expression)},
        size_expression: ${rustString(c.sizeExpression)}, ptr_expression: ${rustString(c.ptrExpression)},
        initial: ${rustRules(c.initial)},
        control_kind: ${rustString(c.controlKind)}, jump_program_counter: ${rustOptU32(c.jumpProgramCounter)},
        error: ${rustOptionStr(c.error)}, halt_construct: ${rustOptionStr(c.haltConstruct)},
        halt_line: ${rustOptU32(c.haltLine)},
    }`;
}

function rustOperand(op) {
  return `ArrayFamilyOperandVector { width_bytes: ${op.widthBytes}, expression: ${rustString(op.expression)} }`;
}
function rustEqualCase(c) {
  return `ArrayFamilyEqualBehaviorVectorCase {
        label: ${rustString(c.label)}, category: ${rustString(c.category)},
        program_counter: ${c.programCounter},
        operands: [${c.operands.map(rustOperand).join(", ")}],
        initial: ${rustRules(c.initial)},
        control_kind: ${rustString(c.controlKind)}, jump_program_counter: ${rustOptU32(c.jumpProgramCounter)},
        error: ${rustOptionStr(c.error)},
    }`;
}

function rustWithindexCase(c) {
  return `ArrayFamilyWithIndexBehaviorVectorCase {
        label: ${rustString(c.label)}, category: ${rustString(c.category)},
        initial: ${rustRules(c.initial)},
        control_kind: ${rustString(c.controlKind)},
        result: ${c.result === null ? "None" : `Some(${rustRules(c.result)})`},
        error: ${rustOptionStr(c.error)},
    }`;
}

function rustRegistrationCase(c) {
  return `ArrayFamilyRegistrationVectorCase {
        label: ${rustString(c.label)}, family: ${rustString(c.family)}, error: ${rustOptionStr(c.error)},
        opcode_id: ${c.opcodeId === null ? "None" : `Some(${rustString(String(c.opcodeId))})`},
    }`;
}

const lines = [];
lines.push("//! @generated by core-rs/tools/gen-battle-script-array-family-vectors.mjs.");
lines.push("//! Source: executing canonical src/engine/battleScriptDamagingWeatherOpcode.ts and");
lines.push("//! battleScriptRankedBatch1Opcode.ts via Node.");
lines.push("//! Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-array-family-vectors.mjs.");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ArrayFamilyVectorRules {");
lines.push("    pub selector_attacker: Option<u8>, pub selector_target: Option<u8>, pub battlers_count: u8,");
lines.push("    pub scripting_battler: u8, pub battle_communication0: u8, pub battle_communication1: u8,");
lines.push("    pub battler_by_turn_order: [u8; 4],");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ArrayFamilyOperandVector { pub width_bytes: u8, pub expression: &'static str }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ArrayFamilyNotEqualBehaviorVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str, pub program_counter: u32, pub opcode_id: u8,");
lines.push("    pub mem1_expression: &'static str, pub mem2_expression: &'static str, pub size_expression: &'static str,");
lines.push("    pub ptr_expression: &'static str, pub initial: ArrayFamilyVectorRules, pub control_kind: &'static str,");
lines.push("    pub jump_program_counter: Option<u32>, pub error: Option<&'static str>,");
lines.push("    pub halt_construct: Option<&'static str>, pub halt_line: Option<u32>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ArrayFamilyEqualBehaviorVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str, pub program_counter: u32,");
lines.push("    pub operands: [ArrayFamilyOperandVector; 4], pub initial: ArrayFamilyVectorRules,");
lines.push("    pub control_kind: &'static str, pub jump_program_counter: Option<u32>, pub error: Option<&'static str>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ArrayFamilyWithIndexBehaviorVectorCase {");
lines.push("    pub label: &'static str, pub category: &'static str, pub initial: ArrayFamilyVectorRules,");
lines.push("    pub control_kind: &'static str, pub result: Option<ArrayFamilyVectorRules>, pub error: Option<&'static str>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ArrayFamilyRegistrationVectorCase {");
lines.push("    pub label: &'static str, pub family: &'static str, pub error: Option<&'static str>,");
lines.push("    pub opcode_id: Option<&'static str>,");
lines.push("}");
lines.push(`pub const BATTLE_SCRIPT_ARRAY_FAMILY_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusSha256)};`);
lines.push(`pub const BATTLE_SCRIPT_ARRAY_FAMILY_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push(`pub const BATTLE_SCRIPT_ARRAY_FAMILY_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [${domainCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_ARRAY_FAMILY_CONTROL_CENSUS: [(&str, usize); ${controlCensus.length}] = [${controlCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_ARRAY_FAMILY_REGISTRATION_OUTCOME_CENSUS: [(&str, usize); ${registrationOutcomeCensus.length}] = [${registrationOutcomeCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub static BATTLE_SCRIPT_ARRAY_FAMILY_NOTEQUAL_CASES: [ArrayFamilyNotEqualBehaviorVectorCase; ${notequalCases.length}] = [`);
for (const c of notequalCases) lines.push("    " + rustNotequalCase(c) + ",");
lines.push("];");
lines.push(`pub static BATTLE_SCRIPT_ARRAY_FAMILY_EQUAL_CASES: [ArrayFamilyEqualBehaviorVectorCase; ${equalCases.length}] = [`);
for (const c of equalCases) lines.push("    " + rustEqualCase(c) + ",");
lines.push("];");
lines.push(`pub static BATTLE_SCRIPT_ARRAY_FAMILY_WITHINDEX_CASES: [ArrayFamilyWithIndexBehaviorVectorCase; ${withindexCases.length}] = [`);
for (const c of withindexCases) lines.push("    " + rustWithindexCase(c) + ",");
lines.push("];");
lines.push(`pub static BATTLE_SCRIPT_ARRAY_FAMILY_REGISTRATION_CASES: [ArrayFamilyRegistrationVectorCase; ${registrationCases.length}] = [`);
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
if (!formatted) throw new Error("gen-battle-script-array-family-vectors: could not find rustfmt");
const generated = fs.readFileSync(outputPath);
console.log(`gen-battle-script-array-family-vectors: wrote ${path.relative(workspaceRoot, outputPath)}`);
console.log(`gen-battle-script-array-family-vectors: ${notequalCases.length} notequal, ${equalCases.length} equal, ${withindexCases.length} withindex, ${registrationCases.length} registration cases`);
console.log(`gen-battle-script-array-family-vectors: corpus sha256 ${corpusSha256} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-array-family-vectors: generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`gen-battle-script-array-family-vectors: generator sha256 ${crypto.createHash("sha256").update(fs.readFileSync(scriptPath)).digest("hex")} bytes ${fs.statSync(scriptPath).size}`);
