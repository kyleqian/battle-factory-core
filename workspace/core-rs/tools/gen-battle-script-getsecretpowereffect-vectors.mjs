#!/usr/bin/env node
// Canonical TypeScript differential corpus for Cmd_getsecretpowereffect.
// Run from any cwd with:
// node --experimental-strip-types core-rs/tools/gen-battle-script-getsecretpowereffect-vectors.mjs

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const outputPath = path.join(workspaceRoot, "core-rs/crates/factory-core/src/battle_script_getsecretpowereffect_vectors_gen.rs");
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptGetSecretPowerEffectOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptRulesContext.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_GETSECRETPOWEREFFECT";
const OPCODE_ID = 0xe4;
const DISPATCHER = "Cmd_getsecretpowereffect";
const ENTRY_LABEL = "BattleScript_EffectSecretPower";
const CURRENT_MOVE = 290; // SECRET_POWER; the only fixed valid move id every case uses.

const assert = (condition, message) => {
  if (!condition) throw new Error(`getsecretpowereffect generator: ${message}`);
};
const frozen = (values) => Object.freeze(values.slice());

const program = programModule.loadBattleScriptProgram();
const sites = frozen(program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME));
assert(sites.length === 1, `expected one site, got ${sites.length}`);
const [site] = sites;
assert(site.opcodeId === OPCODE_ID, "opcode id drift");
assert(site.dispatcher === DISPATCHER, "dispatcher drift");
assert(site.operands.length === 0, "operand shape drift");
assert(site.programCounter === 1835, "program counter drift");
assert(site.source.label === ENTRY_LABEL, "entry label drift");

const handlers = opcodeModule.createBattleScriptGetSecretPowerEffectOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical handler missing");

function makeBattler(index, salt) {
  return Object.freeze({
    side: index % 2,
    ability: (salt + index) % 0xff,
    hp: 50 + ((salt * 7 + index) % 300),
    maxHP: 400,
    moves: frozen([CURRENT_MOVE, 33 + index, 207, 0]),
    pp: frozen([10, 35 - index, 15, 0]),
    status1: ((salt * 3 + index) >>> 0) & 0x7f,
    status2: ((salt * 11 + index * 5) >>> 0) & 0xffff,
    status3: ((salt * 13 + index * 9) >>> 0) & 0xffff,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    item: (salt * 17 + index) % 0xffff,
    statStages: frozen([6, 6, 6, 6, 6, 6, 6, 6]),
    types: frozen(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: 19 + index,
    attack: 50,
    defense: 51,
    spAttack: 52,
    spDefense: 53,
    speed: 60,
    level: 50,
    friendship: 70,
    partyIndex: index % 3,
  });
}

function canonicalRules({ gBattleEnvironment, moveEffectByte, salt }) {
  const battlers = [0, 1, 2, 3].map((index) => makeBattler(index, salt + index * 97));
  const roleBase = salt % 4;
  return rulesModule.createBattleScriptRulesContext({
    battlers: frozen(battlers),
    selectorRoles: {
      attacker: roleBase,
      target: (roleBase + 1) % 4,
      effectBattler: (roleBase + 2) % 4,
      fainted: salt % 5 === 0 ? null : (roleBase + 3) % 4,
    },
    scriptingBattler: roleBase,
    atkCancelerTracker: salt % 0xff,
    battleOutcome: 0,
    currentMove: CURRENT_MOVE,
    currentMovePosition: salt % 4,
    gBattleEnvironment,
    moveResultFlags: salt % 0xff,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte,
    missType: salt % 0xff,
    hitMarker: (salt * 0x1000_0001) >>> 0,
    multiHitCounter: salt % 0xff,
    lockedMoves: frozen([salt % 0x300, (salt + 1) % 0x300, (salt + 2) % 0x300, (salt + 3) % 0x300]),
  });
}

function vectorBattler(battler) {
  return Object.freeze({
    side: battler.side,
    ability: battler.ability,
    hp: battler.hp,
    item: battler.item,
    status1: battler.status1,
    status2: battler.status2,
    status3: battler.status3,
  });
}

function vectorState(rules) {
  return Object.freeze({
    gBattleEnvironment: rules.gBattleEnvironment,
    moveEffectByte: rules.moveEffectByte,
    siblings: Object.freeze({
      battlers: frozen(rules.battlers.map(vectorBattler)),
      selectorRoles: frozen([
        rules.selectorRoles.attacker,
        rules.selectorRoles.target,
        rules.selectorRoles.effectBattler,
        rules.selectorRoles.fainted,
      ]),
      currentMove: rules.currentMove,
      hitMarker: rules.hitMarker,
    }),
  });
}
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function sourceOutcome(rules) {
  const before = vectorState(rules);
  const state = Object.freeze({
    ...machineModule.createBattleScriptMachine(program, ENTRY_LABEL, rules, 0x4a19_0000),
    programCounter: site.programCounter,
  });
  const transition = handler({ program, instruction: site, state });
  assert(transition.scheduler === state.scheduler, "handler changed scheduler");
  assert(transition.rng === state.rng, "handler consumed RNG");
  assert(transition.events.length === 0, "handler emitted an event");
  assert(transition.control.kind === "advance", "handler control was not advance");
  assert(same(vectorState(rules), before), "handler mutated its input rules");
  return vectorState(transition.rulesContext);
}

const cases = [];
function addCase({ label, category, gBattleEnvironment, moveEffectByte, salt }) {
  assert(/^[a-z0-9_]+$/.test(label), `bad label ${label}`);
  assert(!cases.some((entry) => entry.label === label), `duplicate label ${label}`);
  const rules = canonicalRules({ gBattleEnvironment, moveEffectByte, salt });
  const initial = vectorState(rules);
  const expected = sourceOutcome(rules);
  const expectedMoveEffect = opcodeModule.secretPowerMoveEffectForEnvironment(gBattleEnvironment);
  assert(expected.moveEffectByte === expectedMoveEffect, `pure mapping disagreement for ${label}`);
  assert(same(expected.siblings, initial.siblings), `sibling drift for ${label}`);
  assert(expected.gBattleEnvironment === gBattleEnvironment, `environment drift for ${label}`);
  cases.push(Object.freeze({ label, category, gBattleEnvironment, moveEffectByte, initial, expected }));
}

let salt = 1;
// Full raw u8 environment domain, proving every value -- named and default
// -- maps through the opcode exactly like the pure function.
for (let environment = 0; environment <= 0xff; environment += 1) {
  addCase({
    label: `domain_environment_${environment}`,
    category: "environment-domain",
    gBattleEnvironment: environment,
    moveEffectByte: 0xff,
    salt: salt++,
  });
}

// A representative subset -- every named environment, both unnamed
// BUILDING/PLAIN ids, and boundary/default samples -- crossed with the
// three canonical prior-byte fixtures, to prove overwrite semantics
// (including the already-correct and the 0xff previous-value cases).
const REPRESENTATIVE_ENVIRONMENTS = frozen([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 15, 0x7f, 0x80, 0xff]);
for (const environment of REPRESENTATIVE_ENVIRONMENTS) {
  const expected = opcodeModule.secretPowerMoveEffectForEnvironment(environment);
  const beforeValues = new Map([
    ["zero", 0],
    ["expected", expected],
    ["max", 0xff],
  ]);
  for (const [token, moveEffectByte] of beforeValues) {
    addCase({
      label: `overwrite_environment_${environment}_before_${token}`,
      category: "overwrite-semantics",
      gBattleEnvironment: environment,
      moveEffectByte,
      salt: salt++,
    });
  }
}

function cloneSite(overrides = {}) {
  const operands = frozen((overrides.operands ?? []).map((operand) => Object.freeze({ ...operand })));
  return Object.freeze({
    opcodeName: overrides.opcodeName ?? site.opcodeName,
    programCounter: overrides.programCounter ?? site.programCounter,
    opcodeId: overrides.opcodeId ?? site.opcodeId,
    dispatcher: overrides.dispatcher ?? site.dispatcher,
    operands,
    instruction: Object.freeze({
      ...site,
      opcodeName: overrides.opcodeName ?? site.opcodeName,
      programCounter: overrides.programCounter ?? site.programCounter,
      opcodeId: overrides.opcodeId ?? site.opcodeId,
      dispatcher: overrides.dispatcher ?? site.dispatcher,
      operands,
    }),
  });
}

function registrationOutcome(values) {
  const synthetic = Object.freeze({ ...program, instructions: frozen(values.map((value) => value.instruction)) });
  try {
    const result = opcodeModule.createBattleScriptGetSecretPowerEffectOpcodeHandlers(synthetic);
    return Object.freeze({ bindings: frozen(Object.keys(result).map(Number).sort((a, b) => a - b)), error: null });
  } catch (error) {
    assert(error instanceof Error, "registration threw non-Error");
    return Object.freeze({ bindings: frozen([]), error: error.message });
  }
}

const registrationCases = [];
function addRegistration(label, values) {
  const outcome = registrationOutcome(values);
  const branchName = outcome.error === null
    ? "registered"
    : outcome.error.startsWith(`${OPCODE_NAME} requires exactly 1 concrete start`)
      ? "wrong-cardinality"
      : "invalid-shape";
  registrationCases.push(Object.freeze({
    label,
    branch: branchName,
    instructions: frozen(values.map((value) => Object.freeze({
      opcodeName: value.opcodeName,
      programCounter: value.programCounter,
      opcodeId: value.opcodeId,
      dispatcher: value.dispatcher,
      operandCount: value.operands.length,
    }))),
    expectedBindings: outcome.bindings,
    expectedError: outcome.error,
  }));
}

const VALID = cloneSite();
addRegistration("valid_single_start", [VALID]);
addRegistration("zero_starts", [cloneSite({ opcodeName: "B_SCR_OP_CALL" })]);
addRegistration("two_starts", [VALID, cloneSite({ programCounter: site.programCounter + 1 })]);
addRegistration("wrong_opcode_id", [cloneSite({ opcodeId: 0xa1 })]);
addRegistration("wrong_dispatcher", [cloneSite({ dispatcher: "Cmd_other" })]);
addRegistration("nonzero_operand_count", [
  cloneSite({ operands: [{ widthBytes: 1, expression: "BS_TARGET" }] }),
]);

function census(values, key) {
  const result = new Map();
  for (const value of values) result.set(value[key], (result.get(value[key]) ?? 0) + 1);
  return frozen(Array.from(result.entries()));
}
const domainCensus = frozen([
  ["environment-domain-values", 256],
  ["representative-environments", REPRESENTATIVE_ENVIRONMENTS.length],
  ["prior-move-effect-byte-fixtures", 3],
  ["registration-shape-cases", registrationCases.length],
]);
const categoryCensus = census(cases, "category");
const registrationBranchCensus = census(registrationCases, "branch");
const corpus = Object.freeze({ domainCensus, categoryCensus, registrationBranchCensus, cases, registrationCases });
const corpusText = JSON.stringify(corpus);
const corpusSha = crypto.createHash("sha256").update(corpusText).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorSha = crypto.createHash("sha256").update(generatorBytes).digest("hex");
const rs = JSON.stringify;
const optionU8 = (value) => value === null || value === undefined ? "None" : `Some(0x${value.toString(16).padStart(2, "0")})`;
function battlerState(value) {
  return `BattleScriptGetsecretpowereffectBattlerState { side: ${value.side}, ability: ${value.ability}, hp: ${value.hp}, item: ${value.item}, status1: ${value.status1}, status2: ${value.status2}, status3: ${value.status3} }`;
}
function siblings(value) {
  return `BattleScriptGetsecretpowereffectSiblings { battlers: [${value.battlers.map(battlerState).join(", ")}], selector_roles: BattleScriptGetsecretpowereffectRoles { attacker: ${optionU8(value.selectorRoles[0])}, target: ${optionU8(value.selectorRoles[1])}, effect_battler: ${optionU8(value.selectorRoles[2])}, fainted: ${optionU8(value.selectorRoles[3])} }, current_move: ${value.currentMove}, hit_marker: ${value.hitMarker} }`;
}
function state(value) {
  return `BattleScriptGetsecretpowereffectRules { g_battle_environment: 0x${value.gBattleEnvironment.toString(16).padStart(2, "0")}, move_effect_byte: 0x${value.moveEffectByte.toString(16).padStart(2, "0")}, siblings: ${siblings(value.siblings)} }`;
}
function registrationInstruction(value) {
  return `BattleScriptGetsecretpowereffectVectorRegistrationInstruction { opcode_name: ${rs(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${value.opcodeId}, dispatcher: ${rs(value.dispatcher)}, operand_count: ${value.operandCount} }`;
}
const optionString = (value) => value === null ? "None" : `Some(${rs(value)})`;
const lines = [
  "// GENERATED by core-rs/tools/gen-battle-script-getsecretpowereffect-vectors.mjs; do not edit.",
  "// Source: executing canonical src/engine/battleScriptGetSecretPowerEffectOpcode.ts via node.",
  "// Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-getsecretpowereffect-vectors.mjs.",
  "use crate::battle_script_getsecretpowereffect::{BattleScriptGetsecretpowereffectBattlerState, BattleScriptGetsecretpowereffectRoles, BattleScriptGetsecretpowereffectRules, BattleScriptGetsecretpowereffectSiblings};",
  `pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_VECTOR_CORPUS_SHA256: &str = ${rs(corpusSha)};`,
  `pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`,
  `pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_VECTOR_GENERATOR_SHA256: &str = ${rs(generatorSha)};`,
  `pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`,
  `pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [${domainCensus.map(([name, count]) => `(${rs(name)}, ${count})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [${categoryCensus.map(([name, count]) => `(${rs(name)}, ${count})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_REGISTRATION_BRANCH_CENSUS: [(&str, usize); ${registrationBranchCensus.length}] = [${registrationBranchCensus.map(([name, count]) => `(${rs(name)}, ${count})`).join(", ")}];`,
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptGetsecretpowereffectVectorCase { pub label: &'static str, pub category: &'static str, pub g_battle_environment: u8, pub move_effect_byte: u8, pub initial: BattleScriptGetsecretpowereffectRules, pub expected: BattleScriptGetsecretpowereffectRules }",
  `pub static BATTLE_SCRIPT_GETSECRETPOWEREFFECT_CASES: [BattleScriptGetsecretpowereffectVectorCase; ${cases.length}] = [`,
];
for (const value of cases) {
  lines.push(`BattleScriptGetsecretpowereffectVectorCase { label: ${rs(value.label)}, category: ${rs(value.category)}, g_battle_environment: 0x${value.gBattleEnvironment.toString(16).padStart(2, "0")}, move_effect_byte: 0x${value.moveEffectByte.toString(16).padStart(2, "0")}, initial: ${state(value.initial)}, expected: ${state(value.expected)} },`);
}
lines.push(
  "];",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptGetsecretpowereffectVectorRegistrationInstruction { pub opcode_name: &'static str, pub program_counter: u32, pub opcode_id: u8, pub dispatcher: &'static str, pub operand_count: usize }",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptGetsecretpowereffectVectorRegistrationCase { pub label: &'static str, pub branch: &'static str, pub instructions: &'static [BattleScriptGetsecretpowereffectVectorRegistrationInstruction], pub expected_bindings: &'static [u8], pub expected_error: Option<&'static str> }",
  `pub const BATTLE_SCRIPT_GETSECRETPOWEREFFECT_REGISTRATION_CASES: [BattleScriptGetsecretpowereffectVectorRegistrationCase; ${registrationCases.length}] = [`,
);
for (const value of registrationCases) {
  lines.push(`BattleScriptGetsecretpowereffectVectorRegistrationCase { label: ${rs(value.label)}, branch: ${rs(value.branch)}, instructions: &[${value.instructions.map(registrationInstruction).join(", ")}], expected_bindings: &[${value.expectedBindings.join(", ")}], expected_error: ${optionString(value.expectedError)} },`);
}
lines.push("];", "");
const generated = `${lines.join("\n")}\n`;
fs.writeFileSync(outputPath, generated);
const rustupBin = path.join(process.env.HOME ?? "", ".cargo/bin");
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", "--config-path", path.join(workspaceRoot, "core-rs"), outputPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
assert(formatted, "could not find rustfmt");
const generatedBytes = fs.readFileSync(outputPath);
const generatedSha = crypto.createHash("sha256").update(generatedBytes).digest("hex");
process.stdout.write(`wrote ${path.relative(workspaceRoot, outputPath)}: ${cases.length} behavior cases, ${registrationCases.length} registration cases, ${generatedBytes.length} bytes, corpus ${corpusSha}, generated ${generatedSha}\n`);
