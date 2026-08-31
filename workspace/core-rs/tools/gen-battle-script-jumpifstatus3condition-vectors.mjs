#!/usr/bin/env node
// Canonical TypeScript differential corpus for Cmd_jumpifstatus3condition.
// Run from any cwd with:
// node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifstatus3condition-vectors.mjs

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const outputPath = path.join(workspaceRoot, "core-rs/crates/factory-core/src/battle_script_jumpifstatus3condition_vectors_gen.rs");
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptJumpifstatus3conditionOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptRulesContext.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_JUMPIFSTATUS3CONDITION";
const OPCODE_ID = 0x21;
const DISPATCHER = "Cmd_jumpifstatus3condition";
const BATTLER_SELECTOR = "BS_TARGET";
const MASKS = Object.freeze([
  Object.freeze({ expression: "STATUS3_ON_AIR", mask: 1 << 6, token: "on_air" }),
  Object.freeze({ expression: "STATUS3_UNDERGROUND", mask: 1 << 7, token: "underground" }),
  Object.freeze({ expression: "STATUS3_MINIMIZED", mask: 1 << 8, token: "minimized" }),
  Object.freeze({ expression: "STATUS3_ROOTED", mask: 1 << 10, token: "rooted" }),
  Object.freeze({ expression: "STATUS3_UNDERWATER", mask: 1 << 18, token: "underwater" }),
]);
const ALL_MASKS = MASKS.reduce((acc, entry) => (acc | entry.mask) >>> 0, 0);
const STATUS3_SEMI_INVULNERABLE = ((1 << 7) | (1 << 6) | (1 << 18)) >>> 0;

const assert = (condition, message) => {
  if (!condition) throw new Error(`jumpifstatus3condition generator: ${message}`);
};
const frozen = (values) => Object.freeze(values.slice());
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const program = programModule.loadBattleScriptProgram();
const sites = frozen(program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME));
assert(sites.length === 7, `expected seven sites, got ${sites.length}`);
assert(sites.every((site) => site.opcodeId === OPCODE_ID && site.dispatcher === DISPATCHER), "opcode/dispatcher drift");
assert(
  sites.every((site) =>
    site.operands.length === 4
    && site.operands[0].widthBytes === 1
    && site.operands[1].widthBytes === 4
    && site.operands[2].widthBytes === 1
    && site.operands[3].widthBytes === 4),
  "operand shape drift",
);
assert(sites.every((site) => site.operands[0].expression === BATTLER_SELECTOR), "battler selector drift");

// The generator asserts every concrete site's shape against the loaded
// program below rather than trusting this table as ground truth.
const EXPECTED_SITES = Object.freeze([
  { pc: 1, label: "BattleScript_EffectHit", status: "STATUS3_UNDERWATER", condition: "TRUE", target: "BattleScript_HitFromAtkCanceler", targetPc: 4 },
  { pc: 276, label: "BattleScript_EffectRoar", status: "STATUS3_ROOTED", condition: "FALSE", target: "BattleScript_PrintMonIsRooted", targetPc: 2636 },
  { pc: 470, label: "BattleScript_EffectTrap", status: "STATUS3_UNDERWATER", condition: "TRUE", target: "BattleScript_DoWrapEffect", targetPc: 473 },
  { pc: 1253, label: "BattleScript_EffectTwister", status: "STATUS3_ON_AIR", condition: "TRUE", target: "BattleScript_FlinchEffect", targetPc: 1256 },
  { pc: 1263, label: "BattleScript_HitsAllWithUndergroundBonusLoop", status: "STATUS3_UNDERGROUND", condition: "TRUE", target: "BattleScript_HitsAllNoUndergroundBonus", targetPc: 1267 },
  { pc: 1310, label: "BattleScript_EffectGust", status: "STATUS3_ON_AIR", condition: "TRUE", target: "BattleScript_EffectHit", targetPc: 0 },
  { pc: 1314, label: "BattleScript_EffectStomp", status: "STATUS3_MINIMIZED", condition: "TRUE", target: "BattleScript_FlinchEffect", targetPc: 1256 },
]);
assert(sites.length === EXPECTED_SITES.length, "site count drift");
sites.forEach((site, index) => {
  const expected = EXPECTED_SITES[index];
  const [, status, condition, ptr] = site.operands;
  assert(site.programCounter === expected.pc, `site ${index} program counter drift`);
  assert(site.source.label === expected.label, `site ${index} entry label drift`);
  assert(status.expression === expected.status, `site ${index} status3 expression drift`);
  assert(condition.expression === expected.condition, `site ${index} condition drift`);
  assert(ptr.expression === expected.target, `site ${index} target expression drift`);
  const resolved = programModule.resolveBattleScriptLabel(program, ptr.expression);
  assert(resolved?.programCounter === expected.targetPc, `site ${index} target program counter drift`);
});

const handlers = opcodeModule.createBattleScriptJumpifstatus3conditionOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical handler missing");

function makeBattler(index, status3) {
  return Object.freeze({
    side: index % 2,
    ability: 0,
    hp: 100,
    moves: frozen([76, 33 + index, 207, 0]),
    pp: frozen([10, 35 - index, 15, 0]),
    status1: 0,
    status2: 0,
    status3,
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
    item: 0,
    statStages: frozen([6, 6, 6, 6, 6, 6, 6, 6]),
    types: frozen(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: 19 + index,
    attack: 50,
    defense: 51,
    spAttack: 52,
    spDefense: 53,
    level: 50,
    friendship: 70,
  });
}

function otherStatus3(index, salt) {
  return ((0x2000_0001 * (index + 1)) ^ (salt * 7)) >>> 0;
}

function canonicalRules({ battlersCount, targetRole, focusIndex, statusValue, salt }) {
  const focus = focusIndex ?? targetRole ?? 0;
  const battlers = [0, 1, 2, 3].map((index) => makeBattler(
    index,
    index === focus ? statusValue : otherStatus3(index, salt),
  ));
  return rulesModule.createBattleScriptRulesContext({
    battlers: frozen(battlers),
    selectorRoles: {
      attacker: targetRole === null ? null : (targetRole + 1) % 4,
      target: targetRole,
      effectBattler: targetRole === null ? null : (targetRole + 2) % 4,
      fainted: null,
    },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 57,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    battleTopology: {
      battlersCount,
      battleTypeFlags: battlersCount === 4 ? 1 : 0,
      battlerPositions: battlersCount === 4 ? [0, 1, 2, 3] : [0, 1, 0xff, 0xff],
    },
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlersStatus3: frozen(rules.battlers.map((battler) => battler.status3)),
    selectorRoles: frozen([
      rules.selectorRoles.attacker,
      rules.selectorRoles.target,
      rules.selectorRoles.effectBattler,
      rules.selectorRoles.fainted,
    ]),
  });
}

function activeProgram(targetResolves, targetExpression) {
  if (targetResolves) return program;
  const entries = { ...program.labelEntries };
  delete entries[targetExpression];
  return Object.freeze({ ...program, labelEntries: Object.freeze(entries) });
}

function executionInstruction(site, statusExpression, conditionExpression) {
  if (site.operands[1].expression === statusExpression && site.operands[2].expression === conditionExpression) {
    return site;
  }
  return Object.freeze({
    ...site,
    operands: frozen([
      site.operands[0],
      Object.freeze({ ...site.operands[1], expression: statusExpression }),
      Object.freeze({ ...site.operands[2], expression: conditionExpression }),
      site.operands[3],
    ]),
  });
}

function sourceOutcome(site, rules, targetResolves, applications, statusExpression, conditionExpression) {
  const before = vectorState(rules);
  const selectedProgram = activeProgram(targetResolves, site.operands[3].expression);
  const instruction = executionInstruction(site, statusExpression, conditionExpression);
  const controls = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const state = Object.freeze({
        ...machineModule.createBattleScriptMachine(selectedProgram, site.source.label, rules, (0x6123_0000 + application) >>> 0),
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
  if (outcome.error?.startsWith("validated B_SCR_OP_JUMPIFSTATUS3CONDITION became undecodable")) return "undecodable";
  if (outcome.error?.startsWith("Cmd_jumpifstatus3condition: unresolved jump target")) return "unresolved-label";
  return outcome.controls.map((control) => control.kind).join("-then-");
}

const cases = [];
function addCase({
  label,
  category,
  siteIndex,
  battlersCount,
  targetRole,
  focusIndex,
  statusValue,
  statusExpression,
  conditionExpression,
  targetResolves = true,
  applications = 1,
  salt,
}) {
  assert(/^[a-z0-9_]+$/.test(label), `bad label ${label}`);
  assert(!cases.some((entry) => entry.label === label), `duplicate label ${label}`);
  const site = sites[siteIndex];
  const resolvedStatusExpression = statusExpression ?? site.operands[1].expression;
  const resolvedConditionExpression = conditionExpression ?? site.operands[2].expression;
  const rules = canonicalRules({ battlersCount, targetRole, focusIndex, statusValue, salt });
  const outcome = sourceOutcome(site, rules, targetResolves, applications, resolvedStatusExpression, resolvedConditionExpression);
  cases.push(Object.freeze({
    label,
    category,
    branch: branch(outcome),
    applications,
    execution: Object.freeze({
      programCounter: site.programCounter,
      statusExpression: resolvedStatusExpression,
      conditionExpression: resolvedConditionExpression,
      battler: targetRole,
      jumpTargetExpression: site.operands[3].expression,
      resolvedJumpProgramCounter: targetResolves ? EXPECTED_SITES[siteIndex].targetPc : null,
    }),
    initial: vectorState(rules),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

let salt = 1;
function statusValueDomain(siteMask) {
  return frozen([
    Object.freeze({ token: "zero", value: 0 }),
    ...MASKS.map((entry) => Object.freeze({ token: entry.token, value: entry.mask })),
    Object.freeze({ token: "all_five", value: ALL_MASKS }),
    Object.freeze({ token: "semi_invulnerable", value: STATUS3_SEMI_INVULNERABLE }),
    Object.freeze({ token: "all_bits", value: 0xffffffff }),
    Object.freeze({ token: "site_mask_complement", value: (0xffffffff ^ siteMask) >>> 0 }),
    Object.freeze({ token: "salt_a", value: 0x9e3779b1 }),
    Object.freeze({ token: "salt_b", value: 0x2545f491 }),
    Object.freeze({ token: "salt_c", value: 0xc2b2ae35 }),
  ]);
}

for (const [siteIndex, siteInfo] of EXPECTED_SITES.entries()) {
  const siteMask = MASKS.find((entry) => entry.expression === siteInfo.status).mask;
  const values = statusValueDomain(siteMask);
  for (const battlersCount of [2, 4]) {
    const roles = battlersCount === 2 ? [0, 1] : [0, 1, 2, 3];
    for (const targetRole of roles) {
      for (const statusValue of values) {
        addCase({
          label: `site_${siteIndex}_topology_${battlersCount}_target_${targetRole}_status_${statusValue.token}`,
          category: "dense-site-topology-target-status-matrix",
          siteIndex,
          battlersCount,
          targetRole,
          statusValue: statusValue.value,
          salt: salt++,
        });
      }
    }
  }
}

for (const [siteIndex, siteInfo] of EXPECTED_SITES.entries()) {
  const siteMask = MASKS.find((entry) => entry.expression === siteInfo.status).mask;
  const condition = siteInfo.condition === "TRUE";
  const advanceValue = condition ? siteMask : 0;
  const jumpValue = condition ? 0 : siteMask;
  addCase({
    label: `site_${siteIndex}_absent_skips_unresolved_label`,
    category: "late-label-resolution",
    siteIndex,
    battlersCount: 4,
    targetRole: siteIndex % 4,
    statusValue: advanceValue,
    targetResolves: false,
    salt: salt++,
  });
  addCase({
    label: `site_${siteIndex}_present_reaches_unresolved_label`,
    category: "late-label-resolution",
    siteIndex,
    battlersCount: 4,
    targetRole: siteIndex % 4,
    statusValue: jumpValue,
    targetResolves: false,
    salt: salt++,
  });
}

for (const [siteIndex, siteInfo] of EXPECTED_SITES.entries()) {
  const siteMask = MASKS.find((entry) => entry.expression === siteInfo.status).mask;
  const condition = siteInfo.condition === "TRUE";
  const jumpValue = condition ? 0 : siteMask;
  const advanceValue = condition ? siteMask : 0;
  addCase({
    label: `site_${siteIndex}_repeated_jump`,
    category: "repeated-application",
    siteIndex,
    battlersCount: 4,
    targetRole: (siteIndex + 1) % 4,
    statusValue: jumpValue,
    applications: 2,
    salt: salt++,
  });
  addCase({
    label: `site_${siteIndex}_repeated_advance`,
    category: "repeated-application",
    siteIndex,
    battlersCount: 2,
    targetRole: siteIndex % 2,
    statusValue: advanceValue,
    applications: 2,
    salt: salt++,
  });
}

addCase({
  label: "direct_null_battler_role_precedes_label_resolution",
  category: "direct-handler-validation",
  siteIndex: 0,
  battlersCount: 4,
  targetRole: null,
  focusIndex: 0,
  statusValue: MASKS.find((entry) => entry.token === "underwater").mask,
  targetResolves: false,
  salt: salt++,
});
addCase({
  label: "direct_unknown_status_expression_precedes_label_resolution",
  category: "direct-handler-validation",
  siteIndex: 0,
  battlersCount: 4,
  targetRole: 1,
  statusValue: 0,
  statusExpression: "STATUS3_SEMI_INVULNERABLE",
  targetResolves: false,
  salt: salt++,
});
addCase({
  label: "direct_unknown_condition_expression_precedes_label_resolution",
  category: "direct-handler-validation",
  siteIndex: 1,
  battlersCount: 4,
  targetRole: 1,
  statusValue: MASKS.find((entry) => entry.token === "rooted").mask,
  conditionExpression: "MAYBE",
  targetResolves: false,
  salt: salt++,
});

function cloneInstruction(siteIndex, overrides = {}) {
  const base = sites[siteIndex];
  const rawOperands = overrides.operands ?? base.operands.map((operand) => ({ widthBytes: operand.widthBytes, expression: operand.expression }));
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
    const result = opcodeModule.createBattleScriptJumpifstatus3conditionOpcodeHandlers(synthetic);
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
    : outcome.error.startsWith(`${OPCODE_NAME} requires all 7 concrete starts`)
      ? "wrong-cardinality"
      : outcome.error.startsWith(`invalid ${OPCODE_NAME} shape`)
        ? "invalid-shape"
        : outcome.error.startsWith(`unknown ${OPCODE_NAME} battler selector`)
          ? "unknown-battler-selector"
          : outcome.error.startsWith(`unknown ${OPCODE_NAME} condition`)
            ? "unknown-condition"
            : "unknown-status3-value";
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

const ALL_SEVEN = [0, 1, 2, 3, 4, 5, 6].map((index) => cloneInstruction(index));
addRegistration("canonical", ALL_SEVEN);
addRegistration("six_starts", ALL_SEVEN.slice(0, 6));
addRegistration("eight_starts", [...ALL_SEVEN, cloneInstruction(0, { opcodeId: 0xa1 })]);
addRegistration("zero_starts", [cloneInstruction(0, { opcodeName: "B_SCR_OP_CALL" })]);
addRegistration("operand_count_wrong", [
  cloneInstruction(0, {
    operands: [
      { widthBytes: 1, expression: "BS_TARGET" },
      { widthBytes: 4, expression: "STATUS3_UNDERWATER" },
      { widthBytes: 1, expression: "TRUE" },
    ],
  }),
  ...ALL_SEVEN.slice(1),
]);
addRegistration("battler_width_wrong", [
  cloneInstruction(0, { operands: [{ widthBytes: 2, expression: "BS_TARGET" }, { widthBytes: 4, expression: "STATUS3_UNDERWATER" }, { widthBytes: 1, expression: "TRUE" }, { widthBytes: 4, expression: "BattleScript_HitFromAtkCanceler" }] }),
  ...ALL_SEVEN.slice(1),
]);
addRegistration("status_width_wrong", [
  cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "BS_TARGET" }, { widthBytes: 1, expression: "STATUS3_UNDERWATER" }, { widthBytes: 1, expression: "TRUE" }, { widthBytes: 4, expression: "BattleScript_HitFromAtkCanceler" }] }),
  ...ALL_SEVEN.slice(1),
]);
addRegistration("condition_width_wrong", [
  cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "BS_TARGET" }, { widthBytes: 4, expression: "STATUS3_UNDERWATER" }, { widthBytes: 4, expression: "TRUE" }, { widthBytes: 4, expression: "BattleScript_HitFromAtkCanceler" }] }),
  ...ALL_SEVEN.slice(1),
]);
addRegistration("pointer_width_wrong", [
  cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "BS_TARGET" }, { widthBytes: 4, expression: "STATUS3_UNDERWATER" }, { widthBytes: 1, expression: "TRUE" }, { widthBytes: 1, expression: "BattleScript_HitFromAtkCanceler" }] }),
  ...ALL_SEVEN.slice(1),
]);
addRegistration("non_bs_target_selector", [
  cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "BS_ATTACKER" }, { widthBytes: 4, expression: "STATUS3_UNDERWATER" }, { widthBytes: 1, expression: "TRUE" }, { widthBytes: 4, expression: "BattleScript_HitFromAtkCanceler" }] }),
  ...ALL_SEVEN.slice(1),
]);
addRegistration("unknown_condition", [
  cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "BS_TARGET" }, { widthBytes: 4, expression: "STATUS3_UNDERWATER" }, { widthBytes: 1, expression: "MAYBE" }, { widthBytes: 4, expression: "BattleScript_HitFromAtkCanceler" }] }),
  ...ALL_SEVEN.slice(1),
]);
addRegistration("unknown_status_expression", [
  cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "BS_TARGET" }, { widthBytes: 4, expression: "STATUS3_SEMI_INVULNERABLE" }, { widthBytes: 1, expression: "TRUE" }, { widthBytes: 4, expression: "BattleScript_HitFromAtkCanceler" }] }),
  ...ALL_SEVEN.slice(1),
]);
addRegistration("reversed_first_binding", [
  cloneInstruction(6, { opcodeId: 0xa1 }),
  ...ALL_SEVEN.slice(0, 6).map((value, index) => cloneInstruction(index, { opcodeId: 0xfe })),
]);
addRegistration("duplicate_supported_expression_allowed", [
  cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "BS_TARGET" }, { widthBytes: 4, expression: "STATUS3_UNDERWATER" }, { widthBytes: 1, expression: "TRUE" }, { widthBytes: 4, expression: "BattleScript_HitFromAtkCanceler" }] }),
  ...ALL_SEVEN.slice(1),
]);
addRegistration("foreign_dispatchers_allowed", ALL_SEVEN.map((value, index) => cloneInstruction(index, { dispatcher: `Cmd_other${index}` })));

function census(values, key) {
  const result = new Map();
  for (const value of values) result.set(value[key], (result.get(value[key]) ?? 0) + 1);
  return frozen(Array.from(result.entries()));
}
const domainCensus = frozen([
  ["topology-values", 2],
  ["target-role-values", 4],
  ["concrete-call-sites", sites.length],
  ["status3-mask-count", MASKS.length],
  ["status3-domain-values-per-site", statusValueDomain(MASKS[0].mask).length],
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
const u32 = (value) => `0x${value.toString(16).padStart(8, "0")}`;
const optionU8 = (value) => value === null ? "None" : `Some(0x${value.toString(16).padStart(2, "0")})`;
const optionU32 = (value) => value === null ? "None" : `Some(${value})`;
function state(value) {
  return `BattleScriptJumpifstatus3conditionRules { battlers_status3: [${value.battlersStatus3.map(u32).join(", ")}], selector_roles: [${value.selectorRoles.map(optionU8).join(", ")}] }`;
}
const optionState = (value) => value === null ? "None" : `Some(${state(value)})`;
const controls = (values) => `&[${values.map((value) => value.kind === "advance"
  ? "BattleScriptJumpifstatus3conditionControl::Advance"
  : `BattleScriptJumpifstatus3conditionControl::Jump { program_counter: ${value.programCounter} }`).join(", ")}]`;
const optionString = (value) => value === null ? "None" : `Some(${rs(value)})`;
function registrationInstruction(value) {
  return `BattleScriptJumpifstatus3conditionVectorRegistrationInstruction { opcode_name: ${rs(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${value.opcodeId}, dispatcher: ${rs(value.dispatcher)}, operand_widths: &[${value.operandWidths.join(", ")}], operand_expressions: &[${value.operandExpressions.map(rs).join(", ")}] }`;
}
const lines = [
  "// GENERATED by core-rs/tools/gen-battle-script-jumpifstatus3condition-vectors.mjs; do not edit.",
  "// Source: executing canonical src/engine/battleScriptJumpifstatus3conditionOpcode.ts via node.",
  "// Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifstatus3condition-vectors.mjs.",
  "use crate::battle_script_jumpifstatus3condition::{BattleScriptJumpifstatus3conditionControl, BattleScriptJumpifstatus3conditionRules};",
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_VECTOR_CORPUS_SHA256: &str = ${rs(corpusSha)};`,
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`,
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_VECTOR_GENERATOR_SHA256: &str = ${rs(generatorSha)};`,
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`,
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [${domainCensus.map(([name, count]) => `(${rs(name)}, ${count})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [${categoryCensus.map(([name, count]) => `(${rs(name)}, ${count})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [${branchCensus.map(([name, count]) => `(${rs(name)}, ${count})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_REGISTRATION_BRANCH_CENSUS: [(&str, usize); ${registrationBranchCensus.length}] = [${registrationBranchCensus.map(([name, count]) => `(${rs(name)}, ${count})`).join(", ")}];`,
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifstatus3conditionVectorExecution { pub program_counter: u32, pub status_expression: &'static str, pub condition_expression: &'static str, pub battler: Option<u8>, pub jump_target_expression: &'static str, pub resolved_jump_program_counter: Option<u32> }",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifstatus3conditionVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub applications: u8, pub execution: BattleScriptJumpifstatus3conditionVectorExecution, pub initial: BattleScriptJumpifstatus3conditionRules, pub expected: Option<BattleScriptJumpifstatus3conditionRules>, pub controls: &'static [BattleScriptJumpifstatus3conditionControl], pub expected_error: Option<&'static str> }",
  `pub static BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_CASES: [BattleScriptJumpifstatus3conditionVectorCase; ${cases.length}] = [`,
];
for (const value of cases) {
  lines.push(`BattleScriptJumpifstatus3conditionVectorCase { label: ${rs(value.label)}, category: ${rs(value.category)}, branch: ${rs(value.branch)}, applications: ${value.applications}, execution: BattleScriptJumpifstatus3conditionVectorExecution { program_counter: ${value.execution.programCounter}, status_expression: ${rs(value.execution.statusExpression)}, condition_expression: ${rs(value.execution.conditionExpression)}, battler: ${optionU8(value.execution.battler)}, jump_target_expression: ${rs(value.execution.jumpTargetExpression)}, resolved_jump_program_counter: ${optionU32(value.execution.resolvedJumpProgramCounter)} }, initial: ${state(value.initial)}, expected: ${optionState(value.expected)}, controls: ${controls(value.controls)}, expected_error: ${optionString(value.expectedError)} },`);
}
lines.push(
  "];",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifstatus3conditionVectorRegistrationInstruction { pub opcode_name: &'static str, pub program_counter: u32, pub opcode_id: u8, pub dispatcher: &'static str, pub operand_widths: &'static [u8], pub operand_expressions: &'static [&'static str] }",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifstatus3conditionVectorRegistrationCase { pub label: &'static str, pub branch: &'static str, pub instructions: &'static [BattleScriptJumpifstatus3conditionVectorRegistrationInstruction], pub expected_bindings: &'static [u8], pub expected_error: Option<&'static str> }",
  `pub const BATTLE_SCRIPT_JUMPIFSTATUS3CONDITION_REGISTRATION_CASES: [BattleScriptJumpifstatus3conditionVectorRegistrationCase; ${registrationCases.length}] = [`,
);
for (const value of registrationCases) {
  lines.push(`BattleScriptJumpifstatus3conditionVectorRegistrationCase { label: ${rs(value.label)}, branch: ${rs(value.branch)}, instructions: &[${value.instructions.map(registrationInstruction).join(", ")}], expected_bindings: &[${value.expectedBindings.join(", ")}], expected_error: ${optionString(value.expectedError)} },`);
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
