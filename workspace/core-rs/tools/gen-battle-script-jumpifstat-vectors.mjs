#!/usr/bin/env node
// Canonical TypeScript differential corpus for Cmd_jumpifstat.
// Run from any cwd with:
// node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifstat-vectors.mjs

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(scriptPath), "..", "..");
const outputPath = path.join(workspaceRoot, "core-rs/crates/factory-core/src/battle_script_jumpifstat_vectors_gen.rs");
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptJumpifstatOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src/engine/battleScriptRulesContext.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_JUMPIFSTAT";
const OPCODE_ID = 0x20;
const DISPATCHER = "Cmd_jumpifstat";

// include/constants/battle_script_commands.h:326-331 -- the full 6-comparator
// switch. Cited here (not exported by the TS module) so the pure comparator
// truth table can be asserted independently of the 18-site call-site matrix.
const CMP_EQUAL = 0;
const CMP_NOT_EQUAL = 1;
const CMP_GREATER_THAN = 2;
const CMP_LESS_THAN = 3;
const CMP_COMMON_BITS = 4;
const CMP_NO_COMMON_BITS = 5;
const COMPARATORS = Object.freeze([
  Object.freeze({ expression: "CMP_EQUAL", id: CMP_EQUAL, evaluate: (value, comparand) => value === comparand }),
  Object.freeze({ expression: "CMP_NOT_EQUAL", id: CMP_NOT_EQUAL, evaluate: (value, comparand) => value !== comparand }),
  Object.freeze({ expression: "CMP_GREATER_THAN", id: CMP_GREATER_THAN, evaluate: (value, comparand) => value > comparand }),
  Object.freeze({ expression: "CMP_LESS_THAN", id: CMP_LESS_THAN, evaluate: (value, comparand) => value < comparand }),
  Object.freeze({ expression: "CMP_COMMON_BITS", id: CMP_COMMON_BITS, evaluate: (value, comparand) => (value & comparand) !== 0 }),
  Object.freeze({ expression: "CMP_NO_COMMON_BITS", id: CMP_NO_COMMON_BITS, evaluate: (value, comparand) => (value & comparand) === 0 }),
]);
const STATS = Object.freeze([
  Object.freeze({ expression: "STAT_ATK", id: 1 }),
  Object.freeze({ expression: "STAT_DEF", id: 2 }),
  Object.freeze({ expression: "STAT_SPEED", id: 3 }),
  Object.freeze({ expression: "STAT_SPATK", id: 4 }),
  Object.freeze({ expression: "STAT_SPDEF", id: 5 }),
  Object.freeze({ expression: "STAT_ACC", id: 6 }),
  Object.freeze({ expression: "STAT_EVASION", id: 7 }),
]);
const MIN_STAT_STAGE = 0;
const MAX_STAT_STAGE = 12;
const VALUES = Object.freeze([
  Object.freeze({ expression: "MIN_STAT_STAGE", value: MIN_STAT_STAGE }),
  Object.freeze({ expression: "MAX_STAT_STAGE", value: MAX_STAT_STAGE }),
]);

const assert = (condition, message) => {
  if (!condition) throw new Error(`jumpifstat generator: ${message}`);
};
const frozen = (values) => Object.freeze(values.slice());
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const program = programModule.loadBattleScriptProgram();
const sites = frozen(program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME));
assert(sites.length === 18, `expected eighteen sites, got ${sites.length}`);
assert(sites.every((site) => site.opcodeId === OPCODE_ID && site.dispatcher === DISPATCHER), "opcode/dispatcher drift");
assert(
  sites.every((site) =>
    site.operands.length === 5
    && site.operands[0].widthBytes === 1
    && site.operands[1].widthBytes === 1
    && site.operands[2].widthBytes === 1
    && site.operands[3].widthBytes === 1
    && site.operands[4].widthBytes === 4),
  "operand shape drift",
);

// The generator asserts every concrete site's shape against the loaded
// program below rather than trusting this table as ground truth.
const EXPECTED_SITES = Object.freeze([
  { pc: 988, label: "BattleScript_EffectCurse", battler: "BS_ATTACKER", comparator: "CMP_GREATER_THAN", stat: "STAT_SPEED", value: "MIN_STAT_STAGE", target: "BattleScript_CurseTrySpeed", targetPc: 991 },
  { pc: 989, label: "BattleScript_EffectCurse", battler: "BS_ATTACKER", comparator: "CMP_NOT_EQUAL", stat: "STAT_ATK", value: "MAX_STAT_STAGE", target: "BattleScript_CurseTrySpeed", targetPc: 991 },
  { pc: 990, label: "BattleScript_EffectCurse", battler: "BS_ATTACKER", comparator: "CMP_EQUAL", stat: "STAT_DEF", value: "MAX_STAT_STAGE", target: "BattleScript_ButItFailed", targetPc: 1434 },
  { pc: 1900, label: "BattleScript_EffectTickle", battler: "BS_TARGET", comparator: "CMP_GREATER_THAN", stat: "STAT_ATK", value: "MIN_STAT_STAGE", target: "BattleScript_TickleDoMoveAnim", targetPc: 1902 },
  { pc: 1901, label: "BattleScript_EffectTickle", battler: "BS_TARGET", comparator: "CMP_EQUAL", stat: "STAT_DEF", value: "MIN_STAT_STAGE", target: "BattleScript_CantLowerMultipleStats", targetPc: 1920 },
  { pc: 1928, label: "BattleScript_EffectCosmicPower", battler: "BS_ATTACKER", comparator: "CMP_LESS_THAN", stat: "STAT_DEF", value: "MAX_STAT_STAGE", target: "BattleScript_CosmicPowerDoMoveAnim", targetPc: 1930 },
  { pc: 1929, label: "BattleScript_EffectCosmicPower", battler: "BS_ATTACKER", comparator: "CMP_EQUAL", stat: "STAT_SPDEF", value: "MAX_STAT_STAGE", target: "BattleScript_CantRaiseMultipleStats", targetPc: 1987 },
  { pc: 1950, label: "BattleScript_EffectBulkUp", battler: "BS_ATTACKER", comparator: "CMP_LESS_THAN", stat: "STAT_ATK", value: "MAX_STAT_STAGE", target: "BattleScript_BulkUpDoMoveAnim", targetPc: 1952 },
  { pc: 1951, label: "BattleScript_EffectBulkUp", battler: "BS_ATTACKER", comparator: "CMP_EQUAL", stat: "STAT_DEF", value: "MAX_STAT_STAGE", target: "BattleScript_CantRaiseMultipleStats", targetPc: 1987 },
  { pc: 1970, label: "BattleScript_EffectCalmMind", battler: "BS_ATTACKER", comparator: "CMP_LESS_THAN", stat: "STAT_SPATK", value: "MAX_STAT_STAGE", target: "BattleScript_CalmMindDoMoveAnim", targetPc: 1972 },
  { pc: 1971, label: "BattleScript_EffectCalmMind", battler: "BS_ATTACKER", comparator: "CMP_EQUAL", stat: "STAT_SPDEF", value: "MAX_STAT_STAGE", target: "BattleScript_CantRaiseMultipleStats", targetPc: 1987 },
  { pc: 1995, label: "BattleScript_EffectDragonDance", battler: "BS_ATTACKER", comparator: "CMP_LESS_THAN", stat: "STAT_ATK", value: "MAX_STAT_STAGE", target: "BattleScript_DragonDanceDoMoveAnim", targetPc: 1997 },
  { pc: 1996, label: "BattleScript_EffectDragonDance", battler: "BS_ATTACKER", comparator: "CMP_EQUAL", stat: "STAT_SPEED", value: "MAX_STAT_STAGE", target: "BattleScript_CantRaiseMultipleStats", targetPc: 1987 },
  { pc: 2517, label: "BattleScript_AllStatsUp", battler: "BS_ATTACKER", comparator: "CMP_LESS_THAN", stat: "STAT_ATK", value: "MAX_STAT_STAGE", target: "BattleScript_AllStatsUpAtk", targetPc: 2522 },
  { pc: 2518, label: "BattleScript_AllStatsUp", battler: "BS_ATTACKER", comparator: "CMP_LESS_THAN", stat: "STAT_DEF", value: "MAX_STAT_STAGE", target: "BattleScript_AllStatsUpAtk", targetPc: 2522 },
  { pc: 2519, label: "BattleScript_AllStatsUp", battler: "BS_ATTACKER", comparator: "CMP_LESS_THAN", stat: "STAT_SPEED", value: "MAX_STAT_STAGE", target: "BattleScript_AllStatsUpAtk", targetPc: 2522 },
  { pc: 2520, label: "BattleScript_AllStatsUp", battler: "BS_ATTACKER", comparator: "CMP_LESS_THAN", stat: "STAT_SPATK", value: "MAX_STAT_STAGE", target: "BattleScript_AllStatsUpAtk", targetPc: 2522 },
  { pc: 2521, label: "BattleScript_AllStatsUp", battler: "BS_ATTACKER", comparator: "CMP_EQUAL", stat: "STAT_SPDEF", value: "MAX_STAT_STAGE", target: "BattleScript_AllStatsUpRet", targetPc: 2544 },
]);
assert(sites.length === EXPECTED_SITES.length, "site count drift");
sites.forEach((site, index) => {
  const expected = EXPECTED_SITES[index];
  const [battler, comparator, stat, value, ptr] = site.operands;
  assert(site.programCounter === expected.pc, `site ${index} program counter drift`);
  assert(site.source.label === expected.label, `site ${index} entry label drift`);
  assert(battler.expression === expected.battler, `site ${index} battler selector drift`);
  assert(comparator.expression === expected.comparator, `site ${index} comparator drift`);
  assert(stat.expression === expected.stat, `site ${index} stat drift`);
  assert(value.expression === expected.value, `site ${index} value drift`);
  assert(ptr.expression === expected.target, `site ${index} target expression drift`);
  const resolved = programModule.resolveBattleScriptLabel(program, ptr.expression);
  assert(resolved?.programCounter === expected.targetPc, `site ${index} target program counter drift`);
});
assert(EXPECTED_SITES.filter((site) => site.battler === "BS_ATTACKER").length === 16, "expected sixteen BS_ATTACKER sites");
assert(EXPECTED_SITES.filter((site) => site.battler === "BS_TARGET").length === 2, "expected two BS_TARGET sites");

const handlers = opcodeModule.createBattleScriptJumpifstatOpcodeHandlers(
  program,
  rulesModule.resolveRulesBattlerForBattleScript,
);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical handler missing");

function saltedStage(battlerIndex, statSlot, salt) {
  return (statSlot * 3 + battlerIndex * 5 + salt * 7) % 13;
}

function makeBattler(index, statStages) {
  return Object.freeze({
    side: index % 2,
    ability: 0,
    hp: 100,
    moves: frozen([76, 33 + index, 207, 0]),
    pp: frozen([10, 35 - index, 15, 0]),
    status1: 0,
    status2: 0,
    status3: 0,
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
    statStages,
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

function canonicalRules({ battlersCount, battlerSelector, roleIndex, statId, statValue, salt }) {
  const focus = roleIndex ?? 0;
  const battlers = [0, 1, 2, 3].map((index) => {
    const statStages = frozen([0, 1, 2, 3, 4, 5, 6, 7].map((slot) => saltedStage(index, slot, salt)));
    if (index === focus && statId !== undefined && roleIndex !== null) {
      const withFocus = statStages.slice();
      withFocus[statId] = statValue;
      return makeBattler(index, frozen(withFocus));
    }
    return makeBattler(index, statStages);
  });
  const attacker = battlerSelector === "BS_ATTACKER" ? roleIndex : (focus + 1) % battlersCount;
  const target = battlerSelector === "BS_TARGET" ? roleIndex : (focus + 1) % battlersCount;
  return rulesModule.createBattleScriptRulesContext({
    battlers: frozen(battlers),
    selectorRoles: {
      attacker,
      target,
      effectBattler: (focus + 2) % battlersCount,
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
    battlersStatStages: frozen(rules.battlers.map((battler) => frozen(battler.statStages.slice()))),
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

function executionInstruction(site, comparatorExpression, statExpression, valueExpression) {
  if (
    site.operands[1].expression === comparatorExpression
    && site.operands[2].expression === statExpression
    && site.operands[3].expression === valueExpression
  ) {
    return site;
  }
  return Object.freeze({
    ...site,
    operands: frozen([
      site.operands[0],
      Object.freeze({ ...site.operands[1], expression: comparatorExpression }),
      Object.freeze({ ...site.operands[2], expression: statExpression }),
      Object.freeze({ ...site.operands[3], expression: valueExpression }),
      site.operands[4],
    ]),
  });
}

function sourceOutcome(site, rules, targetResolves, applications, comparatorExpression, statExpression, valueExpression) {
  const before = vectorState(rules);
  const selectedProgram = activeProgram(targetResolves, site.operands[4].expression);
  const instruction = executionInstruction(site, comparatorExpression, statExpression, valueExpression);
  const controls = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const state = Object.freeze({
        ...machineModule.createBattleScriptMachine(selectedProgram, site.source.label, rules, (0x7a51_0000 + application) >>> 0),
        programCounter: site.programCounter,
      });
      const transition = handler({ program: selectedProgram, instruction, state });
      assert(transition.rulesContext === rules, "handler replaced rules context");
      assert(transition.scheduler === state.scheduler, "handler changed scheduler");
      assert(transition.rng === state.rng, "handler consumed RNG");
      assert(transition.events.length === 0, "handler emitted event");
      assert(same(vectorState(rules), before), "handler mutated rules");
      if (transition.control.kind === "advance") {
        controls.push(Object.freeze({ kind: "advance", programCounter: null, operandExpression: null }));
      } else if (transition.control.kind === "jump") {
        controls.push(Object.freeze({ kind: "jump", programCounter: transition.control.programCounter, operandExpression: null }));
      } else if (transition.control.kind === "block") {
        assert(transition.control.reason.kind === "source-context-unavailable", "unexpected block reason");
        controls.push(Object.freeze({ kind: "block", programCounter: null, operandExpression: transition.control.reason.operandExpression }));
      } else {
        throw new Error(`unexpected control kind ${transition.control.kind}`);
      }
    }
    return Object.freeze({ expected: vectorState(rules), controls: frozen(controls), error: null });
  } catch (error) {
    assert(error instanceof Error, `non-Error throw ${String(error)}`);
    assert(same(vectorState(rules), before), "throwing handler mutated rules");
    return Object.freeze({ expected: null, controls: frozen(controls), error: error.message });
  }
}

function branch(outcome) {
  if (outcome.error?.startsWith("validated B_SCR_OP_JUMPIFSTAT became undecodable")) return "undecodable";
  if (outcome.error?.startsWith("Cmd_jumpifstat: unresolved jump target")) return "unresolved-label";
  return outcome.controls.map((control) => control.kind).join("-then-");
}

const cases = [];
function addCase({
  label,
  category,
  siteIndex,
  battlersCount,
  battlerSelector,
  roleIndex,
  statId,
  statValue,
  comparatorExpression,
  statExpression,
  valueExpression,
  targetResolves = true,
  applications = 1,
  salt,
}) {
  assert(/^[a-z0-9_]+$/.test(label), `bad label ${label}`);
  assert(!cases.some((entry) => entry.label === label), `duplicate label ${label}`);
  const site = sites[siteIndex];
  const resolvedBattlerSelector = battlerSelector ?? site.operands[0].expression;
  const resolvedComparatorExpression = comparatorExpression ?? site.operands[1].expression;
  const resolvedStatExpression = statExpression ?? site.operands[2].expression;
  const resolvedValueExpression = valueExpression ?? site.operands[3].expression;
  const rules = canonicalRules({ battlersCount, battlerSelector: resolvedBattlerSelector, roleIndex, statId, statValue, salt });
  const outcome = sourceOutcome(site, rules, targetResolves, applications, resolvedComparatorExpression, resolvedStatExpression, resolvedValueExpression);
  cases.push(Object.freeze({
    label,
    category,
    branch: branch(outcome),
    applications,
    execution: Object.freeze({
      programCounter: site.programCounter,
      comparatorExpression: resolvedComparatorExpression,
      statExpression: resolvedStatExpression,
      valueExpression: resolvedValueExpression,
      battlerOperandExpression: site.operands[0].expression,
      battler: roleIndex,
      jumpTargetExpression: site.operands[4].expression,
      resolvedJumpProgramCounter: targetResolves ? EXPECTED_SITES[siteIndex].targetPc : null,
    }),
    initial: vectorState(rules),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

let salt = 1;
const STAT_STAGE_DOMAIN = frozen([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

for (const [siteIndex, siteInfo] of EXPECTED_SITES.entries()) {
  const stat = STATS.find((entry) => entry.expression === siteInfo.stat);
  for (const battlersCount of [2, 4]) {
    const roles = battlersCount === 2 ? [0, 1] : [0, 1, 2, 3];
    for (const roleIndex of roles) {
      for (const statValue of STAT_STAGE_DOMAIN) {
        addCase({
          label: `site_${siteIndex}_topology_${battlersCount}_role_${roleIndex}_stage_${statValue}`,
          category: "dense-site-topology-role-stage-matrix",
          siteIndex,
          battlersCount,
          roleIndex,
          statId: stat.id,
          statValue,
          salt: salt++,
        });
      }
    }
  }
}

for (const comparator of COMPARATORS) {
  for (const comparand of VALUES) {
    for (const value of STAT_STAGE_DOMAIN) {
      addCase({
        label: `comparator_${comparator.expression.toLowerCase()}_value_${value}_comparand_${comparand.expression.toLowerCase()}`,
        category: "comparator-truth-table",
        siteIndex: 0,
        battlersCount: 4,
        roleIndex: 0,
        statId: STATS[0].id,
        statValue: value,
        comparatorExpression: comparator.expression,
        valueExpression: comparand.expression,
        salt: salt++,
      });
    }
  }
}

for (const [siteIndex, siteInfo] of EXPECTED_SITES.entries()) {
  const comparator = COMPARATORS.find((entry) => entry.expression === siteInfo.comparator);
  const comparand = VALUES.find((entry) => entry.expression === siteInfo.value).value;
  const stat = STATS.find((entry) => entry.expression === siteInfo.stat);
  const jumpValue = STAT_STAGE_DOMAIN.find((value) => comparator.evaluate(value, comparand));
  const advanceValue = STAT_STAGE_DOMAIN.find((value) => !comparator.evaluate(value, comparand));
  addCase({
    label: `site_${siteIndex}_repeated_jump`,
    category: "repeated-application",
    siteIndex,
    battlersCount: 4,
    roleIndex: (siteIndex + 1) % 4,
    statId: stat.id,
    statValue: jumpValue,
    applications: 2,
    salt: salt++,
  });
  addCase({
    label: `site_${siteIndex}_repeated_advance`,
    category: "repeated-application",
    siteIndex,
    battlersCount: 2,
    roleIndex: siteIndex % 2,
    statId: stat.id,
    statValue: advanceValue,
    applications: 2,
    salt: salt++,
  });
}

addCase({
  label: "direct_null_battler_precedes_stat_read",
  category: "direct-handler-validation",
  siteIndex: 0,
  battlersCount: 4,
  roleIndex: null,
  statId: STATS[2].id,
  statValue: 0,
  salt: salt++,
});
addCase({
  label: "direct_null_battler_precedes_stat_read_target_selector",
  category: "direct-handler-validation",
  siteIndex: 3,
  battlersCount: 4,
  roleIndex: null,
  statId: STATS[0].id,
  statValue: 0,
  salt: salt++,
});
addCase({
  label: "direct_unknown_comparator_expression_precedes_battler_resolution",
  category: "direct-handler-validation",
  siteIndex: 0,
  battlersCount: 4,
  roleIndex: null,
  statId: STATS[2].id,
  statValue: 0,
  comparatorExpression: "CMP_MAYBE",
  salt: salt++,
});
addCase({
  label: "direct_unknown_stat_expression_precedes_battler_resolution",
  category: "direct-handler-validation",
  siteIndex: 0,
  battlersCount: 4,
  roleIndex: 1,
  statId: STATS[2].id,
  statValue: 0,
  statExpression: "STAT_HP",
  salt: salt++,
});
addCase({
  label: "direct_unknown_value_expression_precedes_battler_resolution",
  category: "direct-handler-validation",
  siteIndex: 0,
  battlersCount: 4,
  roleIndex: 1,
  statId: STATS[2].id,
  statValue: 0,
  valueExpression: "DEFAULT_STAT_STAGE",
  salt: salt++,
});
{
  const siteIndex = 0;
  const siteInfo = EXPECTED_SITES[siteIndex];
  const comparator = COMPARATORS.find((entry) => entry.expression === siteInfo.comparator);
  const comparand = VALUES.find((entry) => entry.expression === siteInfo.value).value;
  const stat = STATS.find((entry) => entry.expression === siteInfo.stat);
  const jumpValue = STAT_STAGE_DOMAIN.find((value) => comparator.evaluate(value, comparand));
  addCase({
    label: "direct_defensive_unresolved_label_after_true_comparison",
    category: "direct-handler-validation",
    siteIndex,
    battlersCount: 4,
    roleIndex: 1,
    statId: stat.id,
    statValue: jumpValue,
    targetResolves: false,
    salt: salt++,
  });
}

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

function registrationOutcome(values, targetProgram) {
  const synthetic = Object.freeze({ ...(targetProgram ?? program), instructions: frozen(values.map((value) => value.instruction)) });
  try {
    const result = opcodeModule.createBattleScriptJumpifstatOpcodeHandlers(synthetic, rulesModule.resolveRulesBattlerForBattleScript);
    return Object.freeze({ bindings: frozen(Object.keys(result).map(Number).sort((a, b) => a - b)), error: null });
  } catch (error) {
    assert(error instanceof Error, "registration threw non-Error");
    return Object.freeze({ bindings: frozen([]), error: error.message });
  }
}

const registrationCases = [];
function addRegistration(label, values, targetProgram) {
  const outcome = registrationOutcome(values, targetProgram);
  const branchName = outcome.error === null
    ? "registered"
    : outcome.error.startsWith(`${OPCODE_NAME} requires all 18 concrete starts`)
      ? "wrong-cardinality"
      : outcome.error.startsWith(`invalid ${OPCODE_NAME} shape`)
        ? "invalid-shape"
        : outcome.error.startsWith(`unknown ${OPCODE_NAME} comparator`)
          ? "unknown-comparator"
          : outcome.error.startsWith(`unknown ${OPCODE_NAME} stat`)
            ? "unknown-stat"
            : outcome.error.startsWith(`unknown ${OPCODE_NAME} value`)
              ? "unknown-value"
              : "unresolved-label";
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

const ALL_EIGHTEEN = Array.from({ length: 18 }, (_, index) => cloneInstruction(index));
addRegistration("canonical", ALL_EIGHTEEN);
addRegistration("seventeen_starts", ALL_EIGHTEEN.slice(0, 17));
addRegistration("nineteen_starts", [...ALL_EIGHTEEN, cloneInstruction(0, { opcodeId: 0xa1 })]);
addRegistration("zero_starts", [cloneInstruction(0, { opcodeName: "B_SCR_OP_CALL" })]);
addRegistration("operand_count_wrong", [
  cloneInstruction(0, {
    operands: [
      { widthBytes: 1, expression: "BS_ATTACKER" },
      { widthBytes: 1, expression: "CMP_GREATER_THAN" },
      { widthBytes: 1, expression: "STAT_SPEED" },
      { widthBytes: 1, expression: "MIN_STAT_STAGE" },
    ],
  }),
  ...ALL_EIGHTEEN.slice(1),
]);
addRegistration("battler_width_wrong", [
  cloneInstruction(0, { operands: [{ widthBytes: 2, expression: "BS_ATTACKER" }, { widthBytes: 1, expression: "CMP_GREATER_THAN" }, { widthBytes: 1, expression: "STAT_SPEED" }, { widthBytes: 1, expression: "MIN_STAT_STAGE" }, { widthBytes: 4, expression: "BattleScript_CurseTrySpeed" }] }),
  ...ALL_EIGHTEEN.slice(1),
]);
addRegistration("comparator_width_wrong", [
  cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "BS_ATTACKER" }, { widthBytes: 4, expression: "CMP_GREATER_THAN" }, { widthBytes: 1, expression: "STAT_SPEED" }, { widthBytes: 1, expression: "MIN_STAT_STAGE" }, { widthBytes: 4, expression: "BattleScript_CurseTrySpeed" }] }),
  ...ALL_EIGHTEEN.slice(1),
]);
addRegistration("stat_width_wrong", [
  cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "BS_ATTACKER" }, { widthBytes: 1, expression: "CMP_GREATER_THAN" }, { widthBytes: 4, expression: "STAT_SPEED" }, { widthBytes: 1, expression: "MIN_STAT_STAGE" }, { widthBytes: 4, expression: "BattleScript_CurseTrySpeed" }] }),
  ...ALL_EIGHTEEN.slice(1),
]);
addRegistration("value_width_wrong", [
  cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "BS_ATTACKER" }, { widthBytes: 1, expression: "CMP_GREATER_THAN" }, { widthBytes: 1, expression: "STAT_SPEED" }, { widthBytes: 4, expression: "MIN_STAT_STAGE" }, { widthBytes: 4, expression: "BattleScript_CurseTrySpeed" }] }),
  ...ALL_EIGHTEEN.slice(1),
]);
addRegistration("pointer_width_wrong", [
  cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "BS_ATTACKER" }, { widthBytes: 1, expression: "CMP_GREATER_THAN" }, { widthBytes: 1, expression: "STAT_SPEED" }, { widthBytes: 1, expression: "MIN_STAT_STAGE" }, { widthBytes: 1, expression: "BattleScript_CurseTrySpeed" }] }),
  ...ALL_EIGHTEEN.slice(1),
]);
addRegistration("unknown_comparator", [
  cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "BS_ATTACKER" }, { widthBytes: 1, expression: "CMP_MAYBE" }, { widthBytes: 1, expression: "STAT_SPEED" }, { widthBytes: 1, expression: "MIN_STAT_STAGE" }, { widthBytes: 4, expression: "BattleScript_CurseTrySpeed" }] }),
  ...ALL_EIGHTEEN.slice(1),
]);
addRegistration("unknown_stat", [
  cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "BS_ATTACKER" }, { widthBytes: 1, expression: "CMP_GREATER_THAN" }, { widthBytes: 1, expression: "STAT_HP" }, { widthBytes: 1, expression: "MIN_STAT_STAGE" }, { widthBytes: 4, expression: "BattleScript_CurseTrySpeed" }] }),
  ...ALL_EIGHTEEN.slice(1),
]);
addRegistration("unknown_value", [
  cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "BS_ATTACKER" }, { widthBytes: 1, expression: "CMP_GREATER_THAN" }, { widthBytes: 1, expression: "STAT_SPEED" }, { widthBytes: 1, expression: "DEFAULT_STAT_STAGE" }, { widthBytes: 4, expression: "BattleScript_CurseTrySpeed" }] }),
  ...ALL_EIGHTEEN.slice(1),
]);
addRegistration(
  "unresolved_label",
  [
    cloneInstruction(0, { operands: [{ widthBytes: 1, expression: "BS_ATTACKER" }, { widthBytes: 1, expression: "CMP_GREATER_THAN" }, { widthBytes: 1, expression: "STAT_SPEED" }, { widthBytes: 1, expression: "MIN_STAT_STAGE" }, { widthBytes: 4, expression: "BattleScript_DoesNotExist" }] }),
    ...ALL_EIGHTEEN.slice(1),
  ],
);
addRegistration("reversed_first_binding", [
  cloneInstruction(17, { opcodeId: 0xa1 }),
  ...ALL_EIGHTEEN.slice(0, 17).map((value, index) => cloneInstruction(index, { opcodeId: 0xfe })),
]);
addRegistration("foreign_dispatchers_allowed", ALL_EIGHTEEN.map((value, index) => cloneInstruction(index, { dispatcher: `Cmd_other${index}` })));

const unresolvedLabelCase = registrationCases.find((entry) => entry.label === "unresolved_label");
assert(unresolvedLabelCase.branch === "unresolved-label", "unresolved_label fixture did not hit the eager label check");

function census(values, key) {
  const result = new Map();
  for (const value of values) result.set(value[key], (result.get(value[key]) ?? 0) + 1);
  return frozen(Array.from(result.entries()));
}
const domainCensus = frozen([
  ["topology-values", 2],
  ["role-values", 4],
  ["concrete-call-sites", sites.length],
  ["stat-stage-domain-values", STAT_STAGE_DOMAIN.length],
  ["comparator-count", COMPARATORS.length],
  ["comparand-count", VALUES.length],
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
const optionU8 = (value) => value === null || value === undefined ? "None" : `Some(${value})`;
const optionU32 = (value) => value === null ? "None" : `Some(${value})`;
const optionString = (value) => value === null ? "None" : `Some(${rs(value)})`;
function state(value) {
  return `BattleScriptJumpifstatRules { battlers_stat_stages: [${value.battlersStatStages.map((stages) => `[${stages.join(", ")}]`).join(", ")}], selector_roles: [${value.selectorRoles.map(optionU8).join(", ")}] }`;
}
const optionState = (value) => value === null ? "None" : `Some(${state(value)})`;
const controls = (values) => `&[${values.map((value) => {
  if (value.kind === "advance") return "BattleScriptJumpifstatControl::Advance";
  if (value.kind === "jump") return `BattleScriptJumpifstatControl::Jump { program_counter: ${value.programCounter} }`;
  return `BattleScriptJumpifstatControl::Block { operand_expression: ${rs(value.operandExpression)} }`;
}).join(", ")}]`;
function registrationInstruction(value) {
  return `BattleScriptJumpifstatVectorRegistrationInstruction { opcode_name: ${rs(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${value.opcodeId}, dispatcher: ${rs(value.dispatcher)}, operand_widths: &[${value.operandWidths.join(", ")}], operand_expressions: &[${value.operandExpressions.map(rs).join(", ")}] }`;
}
const lines = [
  "// GENERATED by core-rs/tools/gen-battle-script-jumpifstat-vectors.mjs; do not edit.",
  "// Source: executing canonical src/engine/battleScriptJumpifstatOpcode.ts via node.",
  "// Regenerate: node --experimental-strip-types core-rs/tools/gen-battle-script-jumpifstat-vectors.mjs.",
  "use crate::battle_script_jumpifstat::{BattleScriptJumpifstatControl, BattleScriptJumpifstatRules};",
  `pub const BATTLE_SCRIPT_JUMPIFSTAT_VECTOR_CORPUS_SHA256: &str = ${rs(corpusSha)};`,
  `pub const BATTLE_SCRIPT_JUMPIFSTAT_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusText)};`,
  `pub const BATTLE_SCRIPT_JUMPIFSTAT_VECTOR_GENERATOR_SHA256: &str = ${rs(generatorSha)};`,
  `pub const BATTLE_SCRIPT_JUMPIFSTAT_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`,
  `pub const BATTLE_SCRIPT_JUMPIFSTAT_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [${domainCensus.map(([name, count]) => `(${rs(name)}, ${count})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_JUMPIFSTAT_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [${categoryCensus.map(([name, count]) => `(${rs(name)}, ${count})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_JUMPIFSTAT_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [${branchCensus.map(([name, count]) => `(${rs(name)}, ${count})`).join(", ")}];`,
  `pub const BATTLE_SCRIPT_JUMPIFSTAT_REGISTRATION_BRANCH_CENSUS: [(&str, usize); ${registrationBranchCensus.length}] = [${registrationBranchCensus.map(([name, count]) => `(${rs(name)}, ${count})`).join(", ")}];`,
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifstatVectorExecution { pub program_counter: u32, pub comparator_expression: &'static str, pub stat_expression: &'static str, pub value_expression: &'static str, pub battler_operand_expression: &'static str, pub battler: Option<u8>, pub jump_target_expression: &'static str, pub resolved_jump_program_counter: Option<u32> }",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifstatVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub applications: u8, pub execution: BattleScriptJumpifstatVectorExecution, pub initial: BattleScriptJumpifstatRules, pub expected: Option<BattleScriptJumpifstatRules>, pub controls: &'static [BattleScriptJumpifstatControl<'static>], pub expected_error: Option<&'static str> }",
  `pub static BATTLE_SCRIPT_JUMPIFSTAT_CASES: [BattleScriptJumpifstatVectorCase; ${cases.length}] = [`,
];
for (const value of cases) {
  lines.push(`BattleScriptJumpifstatVectorCase { label: ${rs(value.label)}, category: ${rs(value.category)}, branch: ${rs(value.branch)}, applications: ${value.applications}, execution: BattleScriptJumpifstatVectorExecution { program_counter: ${value.execution.programCounter}, comparator_expression: ${rs(value.execution.comparatorExpression)}, stat_expression: ${rs(value.execution.statExpression)}, value_expression: ${rs(value.execution.valueExpression)}, battler_operand_expression: ${rs(value.execution.battlerOperandExpression)}, battler: ${optionU8(value.execution.battler)}, jump_target_expression: ${rs(value.execution.jumpTargetExpression)}, resolved_jump_program_counter: ${optionU32(value.execution.resolvedJumpProgramCounter)} }, initial: ${state(value.initial)}, expected: ${optionState(value.expected)}, controls: ${controls(value.controls)}, expected_error: ${optionString(value.expectedError)} },`);
}
lines.push(
  "];",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifstatVectorRegistrationInstruction { pub opcode_name: &'static str, pub program_counter: u32, pub opcode_id: u8, pub dispatcher: &'static str, pub operand_widths: &'static [u8], pub operand_expressions: &'static [&'static str] }",
  "#[derive(Debug, Clone, Copy, PartialEq, Eq)] pub struct BattleScriptJumpifstatVectorRegistrationCase { pub label: &'static str, pub branch: &'static str, pub instructions: &'static [BattleScriptJumpifstatVectorRegistrationInstruction], pub expected_bindings: &'static [u8], pub expected_error: Option<&'static str> }",
  `pub const BATTLE_SCRIPT_JUMPIFSTAT_REGISTRATION_CASES: [BattleScriptJumpifstatVectorRegistrationCase; ${registrationCases.length}] = [`,
);
for (const value of registrationCases) {
  lines.push(`BattleScriptJumpifstatVectorRegistrationCase { label: ${rs(value.label)}, branch: ${rs(value.branch)}, instructions: &[${value.instructions.map(registrationInstruction).join(", ")}], expected_bindings: &[${value.expectedBindings.join(", ")}], expected_error: ${optionString(value.expectedError)} },`);
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
