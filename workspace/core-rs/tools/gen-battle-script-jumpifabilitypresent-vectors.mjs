#!/usr/bin/env node
// Canonical TypeScript differential corpus for Cmd_jumpifabilitypresent.
// Run from any cwd with:
// node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifabilitypresent-vectors.mjs

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const outputPath = path.join(workspaceRoot, "core-rs/crates/factory-core/src/battle_script_jumpifabilitypresent_vectors_gen.rs");
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptJumpifabilitypresentOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptRulesContext.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_JUMPIFABILITYPRESENT";
const OPCODE_ID = 0x43;
const DISPATCHER = "Cmd_jumpifabilitypresent";
const TARGET = "BattleScript_SolarBeamDecideTurn";
const ABILITIES = Object.freeze([
  Object.freeze({ expression: "ABILITY_CLOUD_NINE", id: 13, token: "cloud_nine" }),
  Object.freeze({ expression: "ABILITY_AIR_LOCK", id: 77, token: "air_lock" }),
]);
const TOPOLOGIES = Object.freeze([2, 4]);
const POSITIONS = Object.freeze([0, 1, 2, 3]);
const HP_DOMAIN = Object.freeze([0, 1, 0xffff]);
const HP_TOKENS = Object.freeze(["fainted", "living_one", "living_max"]);
const assert = (condition, message) => {
  if (!condition) throw new Error(`jumpifabilitypresent generator: ${message}`);
};
const frozen = (values) => Object.freeze(values.slice());
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const program = programModule.loadBattleScriptProgram();
const sites = frozen(program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME));
assert(sites.length === 2, `expected two sites, got ${sites.length}`);
assert(sites.every((site) => site.opcodeId === OPCODE_ID && site.dispatcher === DISPATCHER), "opcode/dispatcher drift");
assert(sites[0].programCounter === 1317 && sites[1].programCounter === 1318, "program counter drift");
assert(sites.every((site) => site.operands.length === 2 && site.operands[0].widthBytes === 1 && site.operands[1].widthBytes === 4), "operand shape drift");
assert(sites[0].operands[0].expression === ABILITIES[0].expression, "Cloud Nine site drift");
assert(sites[1].operands[0].expression === ABILITIES[1].expression, "Air Lock site drift");
assert(sites.every((site) => site.operands[1].expression === TARGET), "target expression drift");
const targetEntry = programModule.resolveBattleScriptLabel(program, TARGET);
assert(targetEntry?.programCounter === 1320, "target program counter drift");
const handlers = opcodeModule.createBattleScriptJumpifabilitypresentOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical handler missing");

function makeBattler(index, ability, hp, salt) {
  return Object.freeze({
    side: index % 2,
    ability,
    hp,
    maxHP: 0xffff,
    moves: frozen([76, 33 + index, 207, 0]),
    pp: frozen([10, 35 - index, 15, 0]),
    status1: ((0x0101_0101 * (index + 1)) ^ salt) >>> 0,
    status2: ((0x1000_0001 * (index + 1)) ^ (salt * 3)) >>> 0,
    status3: ((0x8000_0000 >>> index) | salt) >>> 0,
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
    item: (salt * 37 + index * 101) & 0xffff,
    statStages: frozen([6, 6, 6, 6, 6, 6, 6, 6]),
    types: frozen(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: 19 + index,
    attack: 50,
    defense: 51,
    spAttack: 52,
    spDefense: 53,
    level: 50,
    friendship: 70,
    partyIndex: index,
  });
}

function makeProjection({ battlersCount, focus, ability, hp, salt }) {
  const battlers = POSITIONS.map((index) => makeBattler(
    index,
    index === focus ? ability : index + 1,
    index === focus ? hp : 10 + ((salt + index * 79) % 600),
    salt,
  ));
  return Object.freeze({
    battlers: frozen(battlers),
    battlersCount,
    absentBattlerFlags: (0x0a ^ salt) & 0x0f,
    selectorRoles: frozen([salt % 4, (salt + 1) % 4, (salt + 2) % 4, null]),
    currentMove: 76,
    battleMoveDamage: [-0x8000_0000, -1, 0, 1, 0x7fff_ffff][salt % 5],
    moveResultFlags: (0x80 ^ salt) & 0xff,
    hitMarker: (0x4000_0002 ^ (salt * 17)) >>> 0,
    weather: (0x0000_0067 ^ salt) >>> 0,
  });
}

function canonicalRules(value) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: value.battlers,
    selectorRoles: {
      attacker: value.selectorRoles[0],
      target: value.selectorRoles[1],
      effectBattler: value.selectorRoles[2],
      fainted: value.selectorRoles[3],
    },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: value.currentMove,
    currentMovePosition: 0,
    moveResultFlags: value.moveResultFlags,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: value.hitMarker,
    multiHitCounter: 0,
    battleMoveDamage: value.battleMoveDamage,
    absentBattlerFlags: value.absentBattlerFlags,
    weather: value.weather,
    battleTopology: {
      battlersCount: value.battlersCount,
      battleTypeFlags: value.battlersCount === 4 ? 1 : 0,
      battlerPositions: value.battlersCount === 4 ? [0, 1, 2, 3] : [0, 1, 0xff, 0xff],
    },
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: frozen(rules.battlers.map((battler) => Object.freeze({
      ability: battler.ability,
      hp: battler.hp,
      maxHP: battler.maxHP,
      status1: battler.status1,
      status2: battler.status2,
      status3: battler.status3,
      item: battler.item,
      moves: frozen(battler.moves),
      pp: frozen(battler.pp),
    }))),
    battlersCount: rules.battleTopology.battlersCount,
    absentBattlerFlags: rules.absentBattlerFlags,
    selectorRoles: frozen([
      rules.selectorRoles.attacker,
      rules.selectorRoles.target,
      rules.selectorRoles.effectBattler,
      rules.selectorRoles.fainted,
    ]),
    currentMove: rules.currentMove,
    battleMoveDamage: rules.battleMoveDamage,
    moveResultFlags: rules.moveResultFlags,
    hitMarker: rules.hitMarker,
    weather: rules.weather,
  });
}

function activeProgram(targetResolves) {
  if (targetResolves) return program;
  const entries = { ...program.labelEntries };
  delete entries[TARGET];
  return Object.freeze({ ...program, labelEntries: Object.freeze(entries) });
}

function executionInstruction(site, abilityExpression) {
  if (site.operands[0].expression === abilityExpression) return site;
  return Object.freeze({
    ...site,
    operands: frozen([
      Object.freeze({ ...site.operands[0], expression: abilityExpression }),
      site.operands[1],
    ]),
  });
}

function sourceOutcome(site, projection, targetResolves, applications, abilityExpression) {
  const rules = canonicalRules(projection);
  const before = vectorState(rules);
  const selectedProgram = activeProgram(targetResolves);
  const instruction = executionInstruction(site, abilityExpression);
  const controls = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const state = Object.freeze({
        ...machineModule.createBattleScriptMachine(selectedProgram, site.source.label, rules, (0x5123_0000 + application) >>> 0),
        programCounter: site.programCounter,
      });
      const transition = handler({ program: selectedProgram, instruction, state });
      assert(transition.rulesContext === rules, "handler replaced rules context");
      assert(transition.scheduler === state.scheduler, "handler changed scheduler");
      assert(transition.rng === state.rng, "handler consumed RNG");
      assert(transition.events.length === 0, "handler emitted event");
      assert(same(vectorState(rules), before), "handler mutated rules");
      controls.push(transition.control.kind === "advance"
        ? Object.freeze({ kind: "advance", programCounter: null })
        : Object.freeze({ kind: "jump", programCounter: transition.control.programCounter }));
    }
    return Object.freeze({ expected: vectorState(rules), controls: frozen(controls), error: null });
  } catch (error) {
    assert(error instanceof Error, `non-Error throw ${String(error)}`);
    assert(same(vectorState(rules), before), "throwing handler mutated rules");
    return Object.freeze({ expected: null, controls: frozen(controls), error: error.message });
  }
}

function branch(outcome) {
  if (outcome.error?.startsWith("Cmd_jumpifabilitypresent: unvalidated ability operand")) return "unvalidated-ability";
  if (outcome.error?.startsWith("Cmd_jumpifabilitypresent: unresolved jump target")) return "unresolved-label";
  return outcome.controls.map((control) => control.kind).join("-then-");
}

const cases = [];
function addCase({ label, category, siteIndex, projection, targetResolves = true, applications = 1, abilityExpression }) {
  assert(/^[a-z0-9_]+$/.test(label), `bad label ${label}`);
  assert(!cases.some((entry) => entry.label === label), `duplicate label ${label}`);
  const site = sites[siteIndex];
  const expression = abilityExpression ?? site.operands[0].expression;
  const outcome = sourceOutcome(site, projection, targetResolves, applications, expression);
  cases.push(Object.freeze({
    label,
    category,
    branch: branch(outcome),
    applications,
    execution: Object.freeze({
      abilityExpression: expression,
      jumpTargetExpression: site.operands[1].expression,
      resolvedJumpProgramCounter: targetResolves ? targetEntry.programCounter : null,
    }),
    initial: vectorState(canonicalRules(projection)),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

let salt = 1;
for (const battlersCount of TOPOLOGIES) {
  for (const [siteIndex, siteAbility] of ABILITIES.entries()) {
    const sibling = ABILITIES[1 - siteIndex];
    const abilityKinds = [
      Object.freeze({ token: "match", id: siteAbility.id }),
      Object.freeze({ token: "sibling", id: sibling.id }),
      Object.freeze({ token: "none", id: 1 }),
    ];
    for (const focus of POSITIONS) {
      for (const abilityKind of abilityKinds) {
        for (const [hpIndex, hp] of HP_DOMAIN.entries()) {
          addCase({
            label: `topology_${battlersCount}_site_${siteAbility.token}_slot_${focus}_${abilityKind.token}_${HP_TOKENS[hpIndex]}`,
            category: "dense-topology-position-life-ability-matrix",
            siteIndex,
            projection: makeProjection({ battlersCount, focus, ability: abilityKind.id, hp, salt: salt++ }),
          });
        }
      }
    }
  }
}

for (const [siteIndex, ability] of ABILITIES.entries()) {
  addCase({
    label: `site_${ability.token}_absent_skips_unresolved_label`,
    category: "late-label-resolution",
    siteIndex,
    targetResolves: false,
    projection: makeProjection({ battlersCount: 4, focus: siteIndex, ability: 1, hp: 1, salt: salt++ }),
  });
  addCase({
    label: `site_${ability.token}_present_reaches_unresolved_label`,
    category: "late-label-resolution",
    siteIndex,
    targetResolves: false,
    projection: makeProjection({ battlersCount: 4, focus: siteIndex, ability: ability.id, hp: 1, salt: salt++ }),
  });
  addCase({
    label: `site_${ability.token}_repeated_jump`,
    category: "repeated-application",
    siteIndex,
    applications: 2,
    projection: makeProjection({ battlersCount: 4, focus: 3 - siteIndex, ability: ability.id, hp: 0xffff, salt: salt++ }),
  });
  addCase({
    label: `site_${ability.token}_repeated_advance`,
    category: "repeated-application",
    siteIndex,
    applications: 2,
    projection: makeProjection({ battlersCount: 2, focus: 2 + siteIndex, ability: ability.id, hp: 1, salt: salt++ }),
  });
}
addCase({
  label: "direct_unvalidated_ability_precedes_scan_and_label",
  category: "direct-handler-validation",
  siteIndex: 0,
  targetResolves: false,
  abilityExpression: "ABILITY_DRIZZLE",
  projection: makeProjection({ battlersCount: 4, focus: 0, ability: 2, hp: 1, salt: salt++ }),
});

function cloneInstruction(siteIndex, overrides = {}) {
  const base = sites[siteIndex];
  const rawOperands = overrides.operands ?? base.operands.map((operand) => ({
    widthBytes: operand.widthBytes,
    expression: operand.expression,
  }));
  const operands = frozen(rawOperands.map((operand, index) => Object.freeze({
    ...(base.operands[index] ?? base.operands[0]),
    widthBytes: operand.widthBytes,
    expression: operand.expression,
  })));
  return Object.freeze({
    opcodeName: overrides.opcodeName ?? base.opcodeName,
    programCounter: overrides.programCounter ?? base.programCounter,
    opcodeId: overrides.opcodeId ?? base.opcodeId,
    dispatcher: overrides.dispatcher ?? base.dispatcher,
    operands,
    instruction: Object.freeze({
      ...base,
      opcodeName: overrides.opcodeName ?? base.opcodeName,
      programCounter: overrides.programCounter ?? base.programCounter,
      opcodeId: overrides.opcodeId ?? base.opcodeId,
      dispatcher: overrides.dispatcher ?? base.dispatcher,
      operands,
    }),
  });
}

function registrationOutcome(values) {
  const synthetic = Object.freeze({ ...program, instructions: frozen(values.map((value) => value.instruction)) });
  try {
    const result = opcodeModule.createBattleScriptJumpifabilitypresentOpcodeHandlers(synthetic);
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
    : outcome.error.startsWith(`${OPCODE_NAME} requires both concrete starts`)
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
      operandWidths: frozen(value.operands.map((operand) => operand.widthBytes)),
      operandExpressions: frozen(value.operands.map((operand) => operand.expression)),
    }))),
    expectedBindings: outcome.bindings,
    expectedError: outcome.error,
  }));
}

addRegistration("canonical", [cloneInstruction(0), cloneInstruction(1)]);
addRegistration("reversed_first_binding", [cloneInstruction(1, { opcodeId: 0xa1 }), cloneInstruction(0, { opcodeId: 0xfe })]);
addRegistration("zero", [cloneInstruction(0, { opcodeName: "B_SCR_OP_CALL" })]);
addRegistration("one_precedes_shape", [cloneInstruction(0, { operands: [] })]);
addRegistration("three_precedes_shape", [cloneInstruction(0), cloneInstruction(1, { operands: [] }), cloneInstruction(0)]);
addRegistration("first_zero_operands", [cloneInstruction(0, { operands: [] }), cloneInstruction(1)]);
addRegistration("first_one_operand", [cloneInstruction(0, { operands: [{ widthBytes: 1, expression: ABILITIES[0].expression }] }), cloneInstruction(1)]);
addRegistration("first_three_operands", [cloneInstruction(0, { operands: [{ widthBytes: 1, expression: ABILITIES[0].expression }, { widthBytes: 4, expression: TARGET }, { widthBytes: 1, expression: "0" }] }), cloneInstruction(1)]);
addRegistration("first_bad_ability_width", [cloneInstruction(0, { operands: [{ widthBytes: 2, expression: ABILITIES[0].expression }, { widthBytes: 4, expression: TARGET }] }), cloneInstruction(1)]);
addRegistration("second_bad_pointer_width", [cloneInstruction(0), cloneInstruction(1, { operands: [{ widthBytes: 1, expression: ABILITIES[1].expression }, { widthBytes: 2, expression: TARGET }] })]);
addRegistration("first_unknown_ability", [cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "ABILITY_DRIZZLE" }, { widthBytes: 4, expression: TARGET }] }), cloneInstruction(1)]);
addRegistration("second_unknown_ability", [cloneInstruction(0), cloneInstruction(1, { operands: [{ widthBytes: 1, expression: "ABILITY_DROUGHT" }, { widthBytes: 4, expression: TARGET }] })]);
addRegistration("duplicate_supported_expression_allowed", [cloneInstruction(0), cloneInstruction(1, { operands: [{ widthBytes: 1, expression: ABILITIES[0].expression }, { widthBytes: 4, expression: TARGET }] })]);
addRegistration("foreign_dispatchers_allowed", [cloneInstruction(0, { dispatcher: "Cmd_other" }), cloneInstruction(1, { dispatcher: "Cmd_other2" })]);
addRegistration("arbitrary_pointer_expressions_allowed", [cloneInstruction(0, { operands: [{ widthBytes: 1, expression: ABILITIES[0].expression }, { widthBytes: 4, expression: "MissingA" }] }), cloneInstruction(1, { operands: [{ widthBytes: 1, expression: ABILITIES[1].expression }, { widthBytes: 4, expression: "MissingB" }] })]);

function census(values, key) {
  const result = new Map();
  for (const value of values) result.set(value[key], (result.get(value[key]) ?? 0) + 1);
  return frozen(Array.from(result.entries()));
}
const domainCensus = frozen([
  ["topology-values", TOPOLOGIES.length],
  ["battler-positions", POSITIONS.length],
  ["concrete-call-sites", sites.length],
  ["supported-ability-expressions", ABILITIES.length],
  ["ability-kinds-per-site", 3],
  ["hp-values", HP_DOMAIN.length],
  ["dense-matrix-combinations", TOPOLOGIES.length * sites.length * POSITIONS.length * 3 * HP_DOMAIN.length],
  ["application-count-values", 2],
  ["registration-shape-cases", registrationCases.length],
]);
const categoryCensus = census(cases, "category");
const branchCensus = census(cases, "branch");
const registrationBranchCensus = census(registrationCases, "branch");
const corpus = Object.freeze({ domainCensus, categoryCensus, branchCensus, registrationBranchCensus, cases, registrationCases });
const corpusText = JSON.stringify(corpus);
const corpusSha = crypto.createHash("sha256").update(corpusText).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorSha = crypto.createHash("sha256").update(generatorBytes).digest("hex");
const rs = JSON.stringify;
const u8 = (value) => `0x${value.toString(16).padStart(2, "0")}`;
const u16 = (value) => `0x${value.toString(16).padStart(4, "0")}`;
const u32 = (value) => `0x${value.toString(16).padStart(8, "0")}`;
const i32 = (value) => value === -0x8000_0000 ? "i32::MIN" : value === 0x7fff_ffff ? "i32::MAX" : String(value);
const optionU8 = (value) => value === null ? "None" : `Some(${u8(value)})`;
const optionU32 = (value) => value === null ? "None" : `Some(${value})`;
const topology = (value) => value === 2
  ? "BattleScriptJumpifabilitypresentBattlersCount::Singles"
  : "BattleScriptJumpifabilitypresentBattlersCount::Doubles";
function battler(value) {
  return `BattleScriptJumpifabilitypresentBattlerState { ability: ${u8(value.ability)}, hp: ${u16(value.hp)}, max_hp: ${u16(value.maxHP)}, status1: ${u32(value.status1)}, status2: ${u32(value.status2)}, status3: ${u32(value.status3)}, item: ${u16(value.item)}, moves: [${value.moves.map(u16).join(", ")}], pp: [${value.pp.map(u8).join(", ")}] }`;
}
function state(value) {
  return `BattleScriptJumpifabilitypresentRules { battlers: [${value.battlers.map(battler).join(", ")}], battlers_count: ${topology(value.battlersCount)}, absent_battler_flags: ${u8(value.absentBattlerFlags)}, selector_roles: [${value.selectorRoles.map(optionU8).join(", ")}], current_move: ${u16(value.currentMove)}, battle_move_damage: ${i32(value.battleMoveDamage)}, move_result_flags: ${u8(value.moveResultFlags)}, hit_marker: ${u32(value.hitMarker)}, weather: ${u32(value.weather)} }`;
}
const optionState = (value) => value === null ? "None" : `Some(${state(value)})`;
const controls = (values) => `&[${values.map((value) => value.kind === "advance"
  ? "BattleScriptJumpifabilitypresentControl::Advance"
  : `BattleScriptJumpifabilitypresentControl::Jump { program_counter: ${value.programCounter} }`).join(", ")}]`;
const optionString = (value) => value === null ? "None" : `Some(${rs(value)})`;
function registrationInstruction(value) {
  return `BattleScriptJumpifabilitypresentVectorRegistrationInstruction { opcode_name: ${rs(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${u8(value.opcodeId)}, dispatcher: ${rs(value.dispatcher)}, operand_widths: &[${value.operandWidths.map(u8).join(", ")}], operand_expressions: &[${value.operandExpressions.map(rs).join(", ")}] }`;
}
const lines = [
  "// GENERATED by core-rs/tools/gen-battle-script-jumpifabilitypresent-vectors.mjs; do not edit.",
  "// Source: executing canonical src/engine/battleScriptJumpifabilitypresentOpcode.ts via node.",
  "// Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifabilitypresent-vectors.mjs.",
  "use crate::battle_script_jumpifabilitypresent::{BattleScriptJumpifabilitypresentBattlerState, BattleScriptJumpifabilitypresentBattlersCount, BattleScriptJumpifabilitypresentControl, BattleScriptJumpifabilitypresentRules};",
  `pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_VECTOR_CORPUS_SHA256: &str = ${rs(corpusSha)};`,
  `pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`,
  `pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_VECTOR_GENERATOR_SHA256: &str = ${rs(generatorSha)};`,
  `pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`,
  `pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [${domainCensus.map(([name, count]) => `(${rs(name)}, ${count})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [${categoryCensus.map(([name, count]) => `(${rs(name)}, ${count})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [${branchCensus.map(([name, count]) => `(${rs(name)}, ${count})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_REGISTRATION_BRANCH_CENSUS: [(&str, usize); ${registrationBranchCensus.length}] = [${registrationBranchCensus.map(([name, count]) => `(${rs(name)}, ${count})`).join(", ")}];`,
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifabilitypresentVectorExecution { pub ability_expression: &'static str, pub jump_target_expression: &'static str, pub resolved_jump_program_counter: Option<u32> }",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifabilitypresentVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub applications: u8, pub execution: BattleScriptJumpifabilitypresentVectorExecution, pub initial: BattleScriptJumpifabilitypresentRules, pub expected: Option<BattleScriptJumpifabilitypresentRules>, pub controls: &'static [BattleScriptJumpifabilitypresentControl], pub expected_error: Option<&'static str> }",
  `pub static BATTLE_SCRIPT_JUMPIFABILITYPRESENT_CASES: [BattleScriptJumpifabilitypresentVectorCase; ${cases.length}] = [`,
];
for (const value of cases) {
  lines.push(`BattleScriptJumpifabilitypresentVectorCase { label: ${rs(value.label)}, category: ${rs(value.category)}, branch: ${rs(value.branch)}, applications: ${value.applications}, execution: BattleScriptJumpifabilitypresentVectorExecution { ability_expression: ${rs(value.execution.abilityExpression)}, jump_target_expression: ${rs(value.execution.jumpTargetExpression)}, resolved_jump_program_counter: ${optionU32(value.execution.resolvedJumpProgramCounter)} }, initial: ${state(value.initial)}, expected: ${optionState(value.expected)}, controls: ${controls(value.controls)}, expected_error: ${optionString(value.expectedError)} },`);
}
lines.push("];", "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifabilitypresentVectorRegistrationInstruction { pub opcode_name: &'static str, pub program_counter: u32, pub opcode_id: u8, pub dispatcher: &'static str, pub operand_widths: &'static [u8], pub operand_expressions: &'static [&'static str] }", "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifabilitypresentVectorRegistrationCase { pub label: &'static str, pub branch: &'static str, pub instructions: &'static [BattleScriptJumpifabilitypresentVectorRegistrationInstruction], pub expected_bindings: &'static [u8], pub expected_error: Option<&'static str> }", `pub const BATTLE_SCRIPT_JUMPIFABILITYPRESENT_REGISTRATION_CASES: [BattleScriptJumpifabilitypresentVectorRegistrationCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`BattleScriptJumpifabilitypresentVectorRegistrationCase { label: ${rs(value.label)}, branch: ${rs(value.branch)}, instructions: &[${value.instructions.map(registrationInstruction).join(", ")}], expected_bindings: &[${value.expectedBindings.map(u8).join(", ")}], expected_error: ${optionString(value.expectedError)} },`);
}
lines.push("];", "");
const generated = `${lines.join("\n")}\n`;
fs.writeFileSync(outputPath, generated);
const rustupBin = path.join(process.env.HOME ?? "", ".rustup/toolchains/stable-aarch64-apple-darwin/bin");
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
