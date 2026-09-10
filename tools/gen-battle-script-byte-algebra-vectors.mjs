#!/usr/bin/env node
// Differential corpus for the byte-algebra trio: B_SCR_OP_BICBYTE
// (src/engine/battleScriptSetByte.ts), B_SCR_OP_ORBYTE (the orbyte slice of
// src/engine/battleScriptStatbuffchangeOpcode.ts), and B_SCR_OP_BICWORD
// (src/engine/battleScriptDamagingWeatherOpcode.ts). Expected outputs,
// controls, and registration errors are produced only by executing the
// canonical TypeScript factories on the real committed Battle Script
// program (and, for registration edges, on that same program with only the
// opcode under test's instructions swapped -- every OTHER opcode the shared
// factory also validates stays real and committed, so those unrelated
// validations never fire).
//
// The one deliberate exception is the Rust module's own beyond-committed-
// universe bicbyte-pointer Halt mirror: canonical TypeScript actually
// SUCCEEDS for every listed SETBYTE pointer (it models the full byte-lvalue
// universe), so there is no TS oracle value for the case where this port's
// narrower Rust runtime halts instead. That divergence is intentionally
// pinned only by a native Rust unit test (`battle_script_byte_algebra.rs`),
// not by this generator.
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-byte-algebra-vectors.mjs

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
  "battle_script_byte_algebra_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

const [
  programModule,
  machineModule,
  rulesModule,
  setByteModule,
  statbuffchangeModule,
  damagingWeatherModule,
] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptSetByte.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot, "src", "engine", "battleScriptStatbuffchangeOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot, "src", "engine", "battleScriptDamagingWeatherOpcode.ts",
  )).href),
]);

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-byte-algebra-vectors: " + message);
}

function freezeArray(values) { return Object.freeze(values.slice()); }
function hex8(value) { return "0x" + (value & 0xff).toString(16).padStart(2, "0"); }
function hex32(value) { return "0x" + (value >>> 0).toString(16).padStart(8, "0"); }
function rustString(value) { return JSON.stringify(value); }

const BICBYTE_OPCODE_NAME = "B_SCR_OP_BICBYTE";
const BICBYTE_OPCODE_ID = 0x36;
const BICBYTE_DISPATCHER = "Cmd_bicbyte";
const ORBYTE_OPCODE_NAME = "B_SCR_OP_ORBYTE";
const ORBYTE_OPCODE_ID = 0x33;
const ORBYTE_DISPATCHER = "Cmd_orbyte";
const BICWORD_OPCODE_NAME = "B_SCR_OP_BICWORD";
const BICWORD_OPCODE_ID = 0x38;

const stubPorts = Object.freeze({
  isControllerIdle: () => true,
  resolveBattlerForBattleScript: () => null,
});

const program = programModule.loadBattleScriptProgram();

const bicbyteInstructions = freezeArray(
  program.instructions.filter((i) => i.opcodeName === BICBYTE_OPCODE_NAME),
);
const orbyteInstructions = freezeArray(
  program.instructions.filter((i) => i.opcodeName === ORBYTE_OPCODE_NAME),
);
const bicwordInstructions = freezeArray(
  program.instructions.filter((i) => i.opcodeName === BICWORD_OPCODE_NAME),
);
assert(bicbyteInstructions.length === 11, "bicbyte call site count drifted to " + bicbyteInstructions.length);
assert(orbyteInstructions.length === 11, "orbyte call site count drifted to " + orbyteInstructions.length);
assert(bicwordInstructions.length === 3, "bicword call site count drifted to " + bicwordInstructions.length);

const bicbyteHandlers = setByteModule.createBattleScriptBicbyteCommandHandlers(program);
const bicbyteHandler = bicbyteHandlers[BICBYTE_OPCODE_ID];
assert(typeof bicbyteHandler === "function", "canonical bicbyte handler not registered at 0x36");

const statbuffchangeHandlers = statbuffchangeModule.createBattleScriptStatbuffchangeOpcodeHandlers(
  program, stubPorts,
);
const orbyteHandler = statbuffchangeHandlers[ORBYTE_OPCODE_ID];
assert(typeof orbyteHandler === "function", "canonical orbyte handler not registered at 0x33");

const damagingWeatherHandlers = damagingWeatherModule.createBattleScriptDamagingWeatherOpcodeHandlers(
  program, stubPorts,
);
const bicwordHandler = damagingWeatherHandlers[BICWORD_OPCODE_ID];
assert(typeof bicwordHandler === "function", "canonical bicword handler not registered at 0x38");

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

function makeRules({ moveResultFlags, hitMarker, battleOutcome, critMultiplier, weather }) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray([0, 1, 2, 3].map(fixedBattler)),
    selectorRoles: Object.freeze({ attacker: 0, target: 1, effectBattler: 2, fainted: null }),
    scriptingBattler: 0, battlerWithAbility: 0, atkCancelerTracker: 0, battleOutcome,
    currentMove: 33, currentMovePosition: 0, moveResultFlags, dmgMultiplier: 1, critMultiplier,
    moveEffectByte: 0, missType: 0, hitMarker, multiHitCounter: 0, battleMoveDamage: 0, painSplitHp: 0,
    bideDmg: freezeArray([0, 0, 0, 0]), lockedMoves: freezeArray([0, 0, 0, 0]),
    chosenMovePositions: freezeArray([0, 0, 0, 0]), sideStatuses: freezeArray([0, 0]),
    weather, weatherTimer: 0, randomTurnNumber: 0,
  });
}

function projectRules(rules) {
  return Object.freeze({
    moveResultFlags: rules.moveResultFlags & 0xff,
    hitMarker: rules.hitMarker >>> 0,
    battleOutcome: rules.battleOutcome & 0xff,
    critMultiplier: rules.critMultiplier & 0xff,
    weather: rules.weather >>> 0,
  });
}

function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

function operandSpec(operand) {
  return Object.freeze({ widthBytes: operand.widthBytes, expression: operand.expression });
}
function instructionSpec(instruction) {
  return Object.freeze({
    opcodeName: instruction.opcodeName,
    programCounter: instruction.programCounter,
    opcodeId: instruction.opcodeId,
    dispatcher: instruction.dispatcher ?? "",
    operands: freezeArray(instruction.operands.map(operandSpec)),
  });
}

function invoke(handler, instruction, rules) {
  const before = projectRules(rules);
  const machine = machineModule.createBattleScriptMachine(program, "BattleScript_EffectHit", rules, 0x0bad_f000);
  const state = Object.freeze({ ...machine, programCounter: instruction.programCounter });
  let controlKind = null;
  let error = null;
  let resultProjection = null;
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
    } else {
      assert(controlKind === "advance", "unexpected control kind " + controlKind);
      resultProjection = projectRules(transition.rulesContext ?? rules);
    }
  } catch (caught) {
    assert(caught instanceof Error, "handler threw non-Error");
    error = caught.message;
  }
  return Object.freeze({ before, controlKind, error, resultProjection, haltConstruct, haltLine });
}

// ---------------------------------------------------------------------
// Behavior cases
// ---------------------------------------------------------------------

const behaviorCases = [];
function addBehavior(opcode, label, category, handler, instruction, rules) {
  const key = opcode + ":" + label;
  assert(!behaviorCases.some((c) => c.key === key), "duplicate behavior label " + key);
  const outcome = invoke(handler, instruction, rules);
  behaviorCases.push(Object.freeze({
    key, opcode, label, category,
    instruction: instructionSpec(instruction),
    initial: outcome.before,
    controlKind: outcome.controlKind,
    result: outcome.resultProjection,
    error: outcome.error,
    haltConstruct: outcome.haltConstruct,
    haltLine: outcome.haltLine,
  }));
}

// bicbyte: every distinct committed call site executed at least once.
for (const instruction of bicbyteInstructions) {
  addBehavior(
    "bicbyte", "canonical_site_pc_" + instruction.programCounter, "canonical-site",
    bicbyteHandler, instruction,
    makeRules({ moveResultFlags: 0xff, hitMarker: 0, battleOutcome: 3, critMultiplier: 1, weather: 0 }),
  );
}
// bicbyte: each of the 3 masks against a flags byte with all relevant bits set AND one already-clear.
const BICBYTE_MASK_SITE_BY_MASK = new Map();
for (const instruction of bicbyteInstructions) {
  const mask = instruction.operands[1].expression;
  if (!BICBYTE_MASK_SITE_BY_MASK.has(mask)) BICBYTE_MASK_SITE_BY_MASK.set(mask, instruction);
}
assert(BICBYTE_MASK_SITE_BY_MASK.size === 3, "expected exactly 3 distinct bicbyte masks");
let bicbyteSalt = 0;
for (const [maskExpr, instruction] of BICBYTE_MASK_SITE_BY_MASK) {
  const maskValue = setByteModule.resolveBattleScriptSetByteValue(maskExpr);
  const slug = "mask_" + (bicbyteSalt++);
  addBehavior(
    "bicbyte", slug + "_bits_set", "mask-idempotence-set", bicbyteHandler, instruction,
    makeRules({ moveResultFlags: maskValue, hitMarker: 0, battleOutcome: 5, critMultiplier: 2, weather: 7 }),
  );
  addBehavior(
    "bicbyte", slug + "_bits_clear", "mask-idempotence-clear", bicbyteHandler, instruction,
    makeRules({ moveResultFlags: 0, hitMarker: 0, battleOutcome: 5, critMultiplier: 2, weather: 7 }),
  );
}

// orbyte: every distinct committed call site executed at least once.
for (const instruction of orbyteInstructions) {
  addBehavior(
    "orbyte", "canonical_site_pc_" + instruction.programCounter, "canonical-site",
    orbyteHandler, instruction,
    makeRules({ moveResultFlags: 0, hitMarker: 0, battleOutcome: 1, critMultiplier: 1, weather: 0 }),
  );
}
// orbyte: each of the 3 values with the bit already set (no-op) and clear.
const ORBYTE_VALUE_SITE_BY_VALUE = new Map();
for (const instruction of orbyteInstructions) {
  const valueExpr = instruction.operands[1].expression;
  if (!ORBYTE_VALUE_SITE_BY_VALUE.has(valueExpr)) ORBYTE_VALUE_SITE_BY_VALUE.set(valueExpr, instruction);
}
assert(ORBYTE_VALUE_SITE_BY_VALUE.size === 3, "expected exactly 3 distinct orbyte values");
let orbyteSalt = 0;
for (const [valueExpr, instruction] of ORBYTE_VALUE_SITE_BY_VALUE) {
  const bit = { MOVE_RESULT_MISSED: 1, MOVE_RESULT_DOESNT_AFFECT_FOE: 8, MOVE_RESULT_FAILED: 32 }[valueExpr];
  assert(bit !== undefined, "unrecognized orbyte value expression " + valueExpr);
  const slug = "value_" + (orbyteSalt++);
  addBehavior(
    "orbyte", slug + "_bit_already_set", "value-idempotence-set", orbyteHandler, instruction,
    makeRules({ moveResultFlags: bit, hitMarker: 0, battleOutcome: 2, critMultiplier: 3, weather: 9 }),
  );
  addBehavior(
    "orbyte", slug + "_bit_clear", "value-idempotence-clear", orbyteHandler, instruction,
    makeRules({ moveResultFlags: 0, hitMarker: 0, battleOutcome: 2, critMultiplier: 3, weather: 9 }),
  );
}

// bicword: each of the 3 committed sites with hitMarker carrying all masked bits vs none.
const BICWORD_TERM_BITS = {
  "HITMARKER_IGNORE_BIDE | HITMARKER_IGNORE_SUBSTITUTE | HITMARKER_PASSIVE_HP_UPDATE | HITMARKER_GRUDGE":
    (1 << 5) | (1 << 8) | (1 << 20) | (1 << 24),
  "HITMARKER_IGNORE_UNDERGROUND": 1 << 17,
  "HITMARKER_WAKE_UP_CLEAR": 1 << 4,
};
for (const instruction of bicwordInstructions) {
  const valueExpr = instruction.operands[1].expression;
  const mask = BICWORD_TERM_BITS[valueExpr];
  assert(mask !== undefined, "unrecognized bicword value expression " + valueExpr);
  addBehavior(
    "bicword", "site_pc_" + instruction.programCounter + "_all_bits", "canonical-site-all-bits",
    bicwordHandler, instruction,
    makeRules({ moveResultFlags: 0, hitMarker: 0xffff_ffff, battleOutcome: 4, critMultiplier: 1, weather: 0 }),
  );
  addBehavior(
    "bicword", "site_pc_" + instruction.programCounter + "_no_bits", "canonical-site-no-bits",
    bicwordHandler, instruction,
    makeRules({ moveResultFlags: 0, hitMarker: 0, battleOutcome: 4, critMultiplier: 1, weather: 0 }),
  );
}
// bicword: a custom unsupported-operand instruction -> Halt reason verbatim.
{
  const template = bicwordInstructions[0];
  const customInstruction = Object.freeze({
    ...template,
    programCounter: 0x9000,
    operands: freezeArray([
      Object.freeze({ ...template.operands[0], expression: "gBattleMoveDamage" }),
      Object.freeze({ ...template.operands[1], expression: "HITMARKER_NOT_A_REAL_FLAG" }),
    ]),
  });
  addBehavior(
    "bicword", "unsupported_operand_pair", "unsupported-operand", bicwordHandler, customInstruction,
    makeRules({ moveResultFlags: 0, hitMarker: 0xffff_ffff, battleOutcome: 6, critMultiplier: 1, weather: 0 }),
  );
}

assert(behaviorCases.length >= 40 && behaviorCases.length <= 60,
  "behavior case count " + behaviorCases.length + " outside the ~40-60 target band");

// ---------------------------------------------------------------------
// Registration cases
// ---------------------------------------------------------------------

function syntheticFrom(template, overrides) {
  return Object.freeze({
    ...template,
    ...overrides,
    operands: overrides.operands
      ? freezeArray(overrides.operands.map((operand, index) => Object.freeze({
        ...(template.operands[index] ?? template.operands[0]),
        widthBytes: operand.widthBytes,
        expression: operand.expression,
      })))
      : template.operands,
  });
}

const registrationCases = [];
function addRegistration(opcode, label, run) {
  let error = null;
  let opcodeId = null;
  try {
    opcodeId = run();
  } catch (caught) {
    assert(caught instanceof Error, "registration threw non-Error for " + label);
    error = caught.message;
  }
  registrationCases.push(Object.freeze({ opcode, label, error, opcodeId }));
}

// bicbyte: standalone factory, no cross-opcode dependency.
const bicbyteTemplate = bicbyteInstructions[0];
addRegistration("bicbyte", "wrong_count", () => {
  const custom = Object.freeze({ ...program, instructions: bicbyteInstructions.slice(0, 10) });
  return Object.keys(setByteModule.createBattleScriptBicbyteCommandHandlers(custom))[0];
});
addRegistration("bicbyte", "bad_shape_wrong_dispatcher", () => {
  const bad = syntheticFrom(bicbyteTemplate, { dispatcher: "Cmd_setbyte" });
  const custom = Object.freeze({
    ...program,
    instructions: freezeArray([bad, ...bicbyteInstructions.slice(1)]),
  });
  return Object.keys(setByteModule.createBattleScriptBicbyteCommandHandlers(custom))[0];
});
addRegistration("bicbyte", "unknown_pointer", () => {
  const bad = syntheticFrom(bicbyteTemplate, {
    operands: [{ widthBytes: 4, expression: "gBogusPointer" }, operandSpec(bicbyteTemplate.operands[1])],
  });
  const custom = Object.freeze({
    ...program,
    instructions: freezeArray([bad, ...bicbyteInstructions.slice(1)]),
  });
  return Object.keys(setByteModule.createBattleScriptBicbyteCommandHandlers(custom))[0];
});
addRegistration("bicbyte", "unknown_mask", () => {
  const bad = syntheticFrom(bicbyteTemplate, {
    operands: [operandSpec(bicbyteTemplate.operands[0]), { widthBytes: 1, expression: "MOVE_RESULT_ONE_HIT_KO" }],
  });
  const custom = Object.freeze({
    ...program,
    instructions: freezeArray([bad, ...bicbyteInstructions.slice(1)]),
  });
  return Object.keys(setByteModule.createBattleScriptBicbyteCommandHandlers(custom))[0];
});
addRegistration("bicbyte", "canonical_all_11", () => {
  return Object.keys(setByteModule.createBattleScriptBicbyteCommandHandlers(program))[0];
});

// orbyte: nested in the shared statbuffchange factory -- swap only orbyte rows,
// leave every other committed instruction (including all 31 statbuffchange
// starts) untouched so unrelated validations never fire.
function programWithOrbyte(replacementOrbyteInstructions) {
  const others = program.instructions.filter((i) => i.opcodeName !== ORBYTE_OPCODE_NAME);
  return Object.freeze({ ...program, instructions: freezeArray([...replacementOrbyteInstructions, ...others]) });
}
const orbyteTemplate = orbyteInstructions[0];
addRegistration("orbyte", "wrong_count", () => {
  const custom = programWithOrbyte(orbyteInstructions.slice(0, 10));
  statbuffchangeModule.createBattleScriptStatbuffchangeOpcodeHandlers(custom, stubPorts);
  return "unexpectedly-registered";
});
addRegistration("orbyte", "bad_shape", () => {
  const bad = syntheticFrom(orbyteTemplate, {
    operands: [operandSpec(orbyteTemplate.operands[0])],
  });
  const custom = programWithOrbyte([bad, ...orbyteInstructions.slice(1)]);
  statbuffchangeModule.createBattleScriptStatbuffchangeOpcodeHandlers(custom, stubPorts);
  return "unexpectedly-registered";
});
addRegistration("orbyte", "unknown_pointer", () => {
  const bad = syntheticFrom(orbyteTemplate, {
    operands: [{ widthBytes: 4, expression: "gBattleOutcome" }, operandSpec(orbyteTemplate.operands[1])],
  });
  const custom = programWithOrbyte([bad, ...orbyteInstructions.slice(1)]);
  statbuffchangeModule.createBattleScriptStatbuffchangeOpcodeHandlers(custom, stubPorts);
  return "unexpectedly-registered";
});
addRegistration("orbyte", "unknown_value", () => {
  const bad = syntheticFrom(orbyteTemplate, {
    operands: [operandSpec(orbyteTemplate.operands[0]), { widthBytes: 1, expression: "MOVE_RESULT_ONE_HIT_KO" }],
  });
  const custom = programWithOrbyte([bad, ...orbyteInstructions.slice(1)]);
  statbuffchangeModule.createBattleScriptStatbuffchangeOpcodeHandlers(custom, stubPorts);
  return "unexpectedly-registered";
});
addRegistration("orbyte", "wrong_dispatcher_still_registers", () => {
  const bad = syntheticFrom(orbyteTemplate, { dispatcher: "Cmd_completely_bogus" });
  const custom = programWithOrbyte([bad, ...orbyteInstructions.slice(1)]);
  const handlers = statbuffchangeModule.createBattleScriptStatbuffchangeOpcodeHandlers(custom, stubPorts);
  return String(ORBYTE_OPCODE_ID in handlers);
});
addRegistration("orbyte", "canonical_all_11", () => {
  return String(ORBYTE_OPCODE_ID in statbuffchangeHandlers);
});

// bicword: registration validates nothing -- the only failure mode is a
// program with zero B_SCR_OP_BICWORD instructions.
addRegistration("bicword", "missing_opcode", () => {
  const custom = Object.freeze({
    ...program,
    instructions: program.instructions.filter((i) => i.opcodeName !== BICWORD_OPCODE_NAME),
  });
  damagingWeatherModule.createBattleScriptDamagingWeatherOpcodeHandlers(custom, stubPorts);
  return "unexpectedly-registered";
});
addRegistration("bicword", "canonical_all_3", () => {
  return String(BICWORD_OPCODE_ID in damagingWeatherHandlers);
});

assert(registrationCases.length === 13, "registration case count drifted to " + registrationCases.length);

// ---------------------------------------------------------------------
// Source/decomp evidence (independently re-derived, sed-verified separately
// in the metadata test).
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
assert(sourceLine(commandSource, 3864).trim() === "static void Cmd_orbyte(void)", "orbyte handler line drifted");
assert(sourceLine(commandSource, 3889).trim() === "static void Cmd_bicbyte(void)", "bicbyte handler line drifted");
assert(sourceLine(commandSource, 3905).trim() === "static void Cmd_bicword(void)", "bicword handler line drifted");
assert((scriptSource.match(/^\tbicbyte /gm) ?? []).length === 11, "bicbyte program count drifted");
assert((scriptSource.match(/^\torbyte /gm) ?? []).length === 11, "orbyte program count drifted");
assert((scriptSource.match(/^\tbicword /gm) ?? []).length === 3, "bicword program count drifted");

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(value[key], (counts.get(value[key]) ?? 0) + 1);
  return freezeArray([...counts.entries()]);
}
const behaviorCategoryCensus = census(behaviorCases, "category");
const behaviorControlCensus = census(behaviorCases, "controlKind");
const registrationOutcomeCensus = census(
  registrationCases.map((c) => Object.freeze({ outcome: c.error === null ? "registered" : "error" })),
  "outcome",
);
const domainCensus = freezeArray([
  ["bicbyte-concrete-starts", bicbyteInstructions.length],
  ["orbyte-concrete-starts", orbyteInstructions.length],
  ["bicword-concrete-starts", bicwordInstructions.length],
  ["bicbyte-distinct-masks", BICBYTE_MASK_SITE_BY_MASK.size],
  ["orbyte-distinct-values", ORBYTE_VALUE_SITE_BY_VALUE.size],
  ["bicword-distinct-values", Object.keys(BICWORD_TERM_BITS).length],
  ["setbyte-pointer-universe", setByteModule.BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.length],
  ["behavior-cases", behaviorCases.length],
  ["registration-cases", registrationCases.length],
]);

const corpus = Object.freeze({
  domainCensus, behaviorCategoryCensus, behaviorControlCensus, registrationOutcomeCensus,
  behaviorCases, registrationCases,
});
const corpusText = JSON.stringify(corpus);
const corpusSha256 = crypto.createHash("sha256").update(corpusText).digest("hex");

// ---------------------------------------------------------------------
// Rust emission
// ---------------------------------------------------------------------

function rustOperand(op) {
  return `ByteAlgebraOperand { width_bytes: ${op.widthBytes}, expression: ${rustString(op.expression)} }`;
}
function rustInstruction(instr) {
  return `ByteAlgebraInstruction { opcode_name: ${rustString(instr.opcodeName)}, program_counter: ${instr.programCounter}, opcode_id: ${hex8(instr.opcodeId)}, dispatcher: ${rustString(instr.dispatcher)}, operands: &[${instr.operands.map(rustOperand).join(", ")}] }`;
}
function rustRules(rules) {
  return `ByteAlgebraVectorRules { move_result_flags: ${hex8(rules.moveResultFlags)}, hit_marker: ${hex32(rules.hitMarker)}, battle_outcome: ${hex8(rules.battleOutcome)}, crit_multiplier: ${hex8(rules.critMultiplier)}, weather: ${hex32(rules.weather)} }`;
}
function rustOptionStr(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustOptionU32(value) { return value === null ? "None" : `Some(${value})`; }

const lines = [];
lines.push("//! @generated by core-rs/tools/gen-battle-script-byte-algebra-vectors.mjs.");
lines.push("//! Source: executing canonical src/engine/battleScriptSetByte.ts,");
lines.push("//! battleScriptStatbuffchangeOpcode.ts, and battleScriptDamagingWeatherOpcode.ts via Node.");
lines.push("//! Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-byte-algebra-vectors.mjs.");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ByteAlgebraOperand { pub width_bytes: u8, pub expression: &'static str }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ByteAlgebraInstruction {");
lines.push("    pub opcode_name: &'static str, pub program_counter: u32, pub opcode_id: u8,");
lines.push("    pub dispatcher: &'static str, pub operands: &'static [ByteAlgebraOperand],");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ByteAlgebraVectorRules {");
lines.push("    pub move_result_flags: u8, pub hit_marker: u32, pub battle_outcome: u8,");
lines.push("    pub crit_multiplier: u8, pub weather: u32,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ByteAlgebraBehaviorVectorCase {");
lines.push("    pub opcode: &'static str, pub label: &'static str, pub category: &'static str,");
lines.push("    pub instruction: ByteAlgebraInstruction, pub initial: ByteAlgebraVectorRules,");
lines.push("    pub control_kind: &'static str, pub result: Option<ByteAlgebraVectorRules>,");
lines.push("    pub error: Option<&'static str>, pub halt_construct: Option<&'static str>,");
lines.push("    pub halt_line: Option<u32>,");
lines.push("}");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct ByteAlgebraRegistrationVectorCase {");
lines.push("    pub opcode: &'static str, pub label: &'static str, pub error: Option<&'static str>,");
lines.push("    pub opcode_id: Option<&'static str>,");
lines.push("}");
lines.push(`pub const BATTLE_SCRIPT_BYTE_ALGEBRA_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusSha256)};`);
lines.push(`pub const BATTLE_SCRIPT_BYTE_ALGEBRA_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`);
lines.push(`pub const BATTLE_SCRIPT_BYTE_ALGEBRA_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [${domainCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_BYTE_ALGEBRA_CATEGORY_CENSUS: [(&str, usize); ${behaviorCategoryCensus.length}] = [${behaviorCategoryCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_BYTE_ALGEBRA_CONTROL_CENSUS: [(&str, usize); ${behaviorControlCensus.length}] = [${behaviorControlCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub const BATTLE_SCRIPT_BYTE_ALGEBRA_REGISTRATION_OUTCOME_CENSUS: [(&str, usize); ${registrationOutcomeCensus.length}] = [${registrationOutcomeCensus.map(([n, c]) => `(${rustString(n)}, ${c})`).join(", ")}];`);
lines.push(`pub static BATTLE_SCRIPT_BYTE_ALGEBRA_BEHAVIOR_CASES: [ByteAlgebraBehaviorVectorCase; ${behaviorCases.length}] = [`);
for (const c of behaviorCases) {
  lines.push("    ByteAlgebraBehaviorVectorCase {");
  lines.push(`        opcode: ${rustString(c.opcode)}, label: ${rustString(c.label)}, category: ${rustString(c.category)},`);
  lines.push(`        instruction: ${rustInstruction(c.instruction)},`);
  lines.push(`        initial: ${rustRules(c.initial)},`);
  lines.push(`        control_kind: ${rustString(c.controlKind ?? "error")},`);
  lines.push(`        result: ${c.result === null ? "None" : `Some(${rustRules(c.result)})`},`);
  lines.push(`        error: ${rustOptionStr(c.error)}, halt_construct: ${rustOptionStr(c.haltConstruct)},`);
  lines.push(`        halt_line: ${rustOptionU32(c.haltLine)},`);
  lines.push("    },");
}
lines.push("];");
lines.push(`pub static BATTLE_SCRIPT_BYTE_ALGEBRA_REGISTRATION_CASES: [ByteAlgebraRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const c of registrationCases) {
  lines.push("    ByteAlgebraRegistrationVectorCase {");
  lines.push(`        opcode: ${rustString(c.opcode)}, label: ${rustString(c.label)}, error: ${rustOptionStr(c.error)},`);
  lines.push(`        opcode_id: ${c.opcodeId === null ? "None" : `Some(${rustString(String(c.opcodeId))})`},`);
  lines.push("    },");
}
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
if (!formatted) throw new Error("gen-battle-script-byte-algebra-vectors: could not find rustfmt");
const generated = fs.readFileSync(outputPath);
console.log(`gen-battle-script-byte-algebra-vectors: wrote ${path.relative(workspaceRoot, outputPath)}`);
console.log(`gen-battle-script-byte-algebra-vectors: ${behaviorCases.length} behavior cases, ${registrationCases.length} registration cases`);
console.log(`gen-battle-script-byte-algebra-vectors: corpus sha256 ${corpusSha256} bytes ${Buffer.byteLength(corpusText)}`);
console.log(`gen-battle-script-byte-algebra-vectors: generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`gen-battle-script-byte-algebra-vectors: generator sha256 ${crypto.createHash("sha256").update(fs.readFileSync(scriptPath)).digest("hex")} bytes ${fs.statSync(scriptPath).size}`);
