#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptStockpileOpcode.ts (the
// B_SCR_OP_STOCKPILE / B_SCR_OP_STOCKPILETOBASEDAMAGE /
// B_SCR_OP_STOCKPILETOHPHEAL family).
//
// Expected controls, projected rules, and ordered errors come only from
// executing the canonical TypeScript handlers (including
// calculateBattleScriptBaseDamageForCurrentMove for 0x86's non-protected
// path) through the real Battle Script machine. This generator owns bounded
// input construction and Rust literal emission; it must not independently
// implement stockpile/base-damage/heal math.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-stockpile-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot, "core-rs", "crates", "factory-core", "src",
  "battle_script_stockpile_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");
const GENERATED_FILE_MAX_BYTES = 6_000_000;

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptStockpileOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

const STOCKPILE_NAME = "B_SCR_OP_STOCKPILE";
const STOCKPILE_ID = 0x85;
const STOCKPILE_DISPATCHER = "Cmd_stockpile";
const TO_BASE_DAMAGE_NAME = "B_SCR_OP_STOCKPILETOBASEDAMAGE";
const TO_BASE_DAMAGE_ID = 0x86;
const TO_BASE_DAMAGE_DISPATCHER = "Cmd_stockpiletobasedamage";
const TO_HP_HEAL_NAME = "B_SCR_OP_STOCKPILETOHPHEAL";
const TO_HP_HEAL_ID = 0x87;
const TO_HP_HEAL_DISPATCHER = "Cmd_stockpiletohpheal";
const ENTRY_LABEL = "BattleScript_EffectStockpile";
const SPIT_UP_FAIL_LABEL = "BattleScript_SpitUpFail";
const SWALLOW_FAIL_LABEL = "BattleScript_SwallowFail";
const UNRESOLVED_POINTER = "BattleScript_RustStockpileUnresolved";
const BATTLERS = Object.freeze([0, 1, 2, 3]);
const B_MSG_PROTECTED = 1;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-stockpile-vectors: ${message}`);
}
function freezeArray(values) { return Object.freeze(values.slice()); }
function battler(value) { return `BattleScriptStockpileBattler::Battler${value}`; }
function optionBattler(value) { return value === null || value === undefined ? "None" : `Some(${battler(value)})`; }
function hex8(value) { return `0x${(value & 0xff).toString(16).padStart(2, "0")}`; }
function hex16(value) { return `0x${(value & 0xffff).toString(16).padStart(4, "0")}`; }
function hex32(value) { return `0x${(value >>> 0).toString(16).padStart(8, "0")}`; }
function rustString(value) { return JSON.stringify(value); }
function rustI32(value) { return `${value}i32`; }

const TYPE_NAME_TO_ID = Object.freeze({
  TYPE_NORMAL: 0, TYPE_FIGHTING: 1, TYPE_FLYING: 2, TYPE_POISON: 3, TYPE_GROUND: 4,
  TYPE_ROCK: 5, TYPE_BUG: 6, TYPE_GHOST: 7, TYPE_STEEL: 8, TYPE_MYSTERY: 9,
  TYPE_FIRE: 10, TYPE_WATER: 11, TYPE_GRASS: 12, TYPE_ELECTRIC: 13, TYPE_PSYCHIC: 14,
  TYPE_ICE: 15, TYPE_DRAGON: 16, TYPE_DARK: 17,
});

// Real item/species/move ids reused verbatim from the shared base-damage
// helper's own generator (gen-battle-script-base-damage-vectors.mjs) so the
// helper-composition cases exercise the same real modifier families.
const ITEM_CHOICE_BAND = 186;
const MOVE_TACKLE = 33; // physical Normal, power 35
const MOVE_THUNDERBOLT = 84; // TYPE_ELECTRIC special
const STATUS3_MUDSPORT = 1 << 16;

function defaultBattlerSpec(index) {
  return {
    side: index % 2, ability: 0, item: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"], species: 1 + index,
    attack: 60 + index * 3, defense: 60 + index * 2, spAttack: 60 + index, spDefense: 60 + index * 4,
    level: 50, hp: 100, maxHP: 100, status1: 0, status3: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6], flashFireBoosted: 0,
    stockpileCounter: 0, helpingHand: 0,
  };
}

function canonicalBattler(spec, index) {
  return Object.freeze({
    side: spec.side, ability: spec.ability, hp: spec.hp, maxHP: spec.maxHP,
    moves: Object.freeze([278, 33, 45, 98]), pp: Object.freeze([10, 20, 15, 25]),
    status1: spec.status1, status2: 0, status3: spec.status3,
    substituteHP: 0, rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0, usedTauntedMove: 0,
    usedImprisonedMove: 0, item: spec.item, statStages: Object.freeze(spec.statStages.slice()),
    types: Object.freeze(spec.types.slice()), species: spec.species,
    attack: spec.attack, defense: spec.defense, spAttack: spec.spAttack, spDefense: spec.spDefense,
    speed: 60, level: spec.level, friendship: 70, partyIndex: index,
    flashFireBoosted: spec.flashFireBoosted, stockpileCounter: spec.stockpileCounter,
    helpingHand: spec.helpingHand,
  });
}

function canonicalRulesRaw({
  battlerSpecs, attacker, target, battlersCount = 2,
  currentMove = MOVE_TACKLE, dynamicBasePower = 0, dynamicMoveType = 0, weather = 0, critMultiplier = 1,
  battleTypeFlags = battlersCount === 4 ? 1 << 0 : 0,
  missType = 0, moveResultFlags = 0, multistringChooser = 0xff, battleTextBuff1ByteNumber = null,
  battleMoveDamage = 0, animTurn = 0,
  enigmaBerryHoldEffects = [0, 0, 0, 0], enigmaBerryHoldEffectParams = [0, 0, 0, 0],
}) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray(battlerSpecs.map(canonicalBattler)),
    selectorRoles: Object.freeze({ attacker, target, effectBattler: target ?? attacker }),
    scriptingBattler: attacker ?? 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove,
    currentMovePosition: 0,
    moveResultFlags,
    dmgMultiplier: 1,
    critMultiplier,
    moveEffectByte: 0,
    missType,
    hitMarker: 0,
    multiHitCounter: 0,
    lastUsedItem: 0,
    usedHeldItems: Object.freeze([0, 0, 0, 0]),
    party: Object.freeze({
      player: freezeArray([0, 1, 2, 3, 4, 5].map(() => Object.freeze({ species: 1, isEgg: false, hp: 100 }))),
      opponent: freezeArray([0, 1, 2, 3, 4, 5].map(() => Object.freeze({ species: 1, isEgg: false, hp: 100 }))),
    }),
    battleTopology: Object.freeze({
      battlersCount, battleTypeFlags,
      battlerPositions: battlersCount === 4 ? Object.freeze([0, 1, 2, 3]) : Object.freeze([0, 1, 0xff, 0xff]),
    }),
    absentBattlerFlags: 0,
    sideStatuses: Object.freeze([0, 0]),
    futureSightCounter: Object.freeze([0, 0, 0, 0]),
    futureSightMove: Object.freeze([0, 0, 0, 0]),
    futureSightAttacker: Object.freeze([0, 0, 0, 0]),
    futureSightDmg: Object.freeze([0, 0, 0, 0]),
    multistringChooser,
    battleTextBuff1ByteNumber,
    dynamicBasePower,
    dynamicMoveType,
    weather,
    enigmaBerryHoldEffects: freezeArray(enigmaBerryHoldEffects),
    enigmaBerryHoldEffectParams: freezeArray(enigmaBerryHoldEffectParams),
    battleMoveDamage,
    animTurn,
  });
}

// `createBattleScriptRulesContext` eagerly resolves currentMoveEffect at
// construction time, throwing before a missing-role case ever reaches the
// handler under test. Missing-attacker/target-role cases here always keep a
// valid currentMove, so this indirection is defensive parity with the
// sibling base-damage/trysetfutureattack generators, not load-bearing.
function canonicalRules(spec) {
  return canonicalRulesRaw(spec);
}

function baseSpec(overrides = {}) {
  const battlerSpecs = BATTLERS.map((index) => defaultBattlerSpec(index));
  return { battlerSpecs, attacker: 0, target: 1, ...overrides };
}
function withBattler(spec, index, changes) {
  const battlerSpecs = spec.battlerSpecs.map((value, i) => (i === index ? { ...value, ...changes } : value));
  return { ...spec, battlerSpecs };
}

function projectBattler(b) {
  return Object.freeze({
    item: b.item, ability: b.ability, species: b.species,
    types: freezeArray(b.types.map((t) => TYPE_NAME_TO_ID[t])),
    level: b.level, attack: b.attack, defense: b.defense, spAttack: b.spAttack, spDefense: b.spDefense,
    statStages: Object.freeze({ atk: b.statStages[1], def: b.statStages[2], spAtk: b.statStages[4], spDef: b.statStages[5] }),
    hp: b.hp, maxHp: b.maxHP, status1: b.status1, status3: b.status3, flashFireBoosted: b.flashFireBoosted,
    stockpileCounter: b.stockpileCounter, helpingHand: b.helpingHand ?? 0,
  });
}
function projectRules(rules) {
  return Object.freeze({
    battlers: freezeArray(rules.battlers.map(projectBattler)),
    battlersCount: rules.battleTopology.battlersCount,
    battleTypeFlags: rules.battleTopology.battleTypeFlags,
    weather: rules.weather,
    currentMove: rules.currentMove,
    dynamicBasePower: rules.dynamicBasePower,
    dynamicMoveType: rules.dynamicMoveType,
    critMultiplier: rules.critMultiplier,
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    enigmaBerryHoldEffects: freezeArray(rules.enigmaBerryHoldEffects),
    enigmaBerryHoldEffectParams: freezeArray(rules.enigmaBerryHoldEffectParams),
    missType: rules.missType,
    moveResultFlags: rules.moveResultFlags,
    multistringChooser: rules.multistringChooser,
    battleTextBuff1ByteNumber: rules.battleTextBuff1ByteNumber,
    battleMoveDamage: rules.battleMoveDamage,
    animTurn: rules.animTurn,
  });
}
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

const program = programModule.loadBattleScriptProgram();

function canonicalStartsFor(name, expectedCount, opcodeId, dispatcher, operandCount) {
  const instructions = program.instructions.filter((value) => value.opcodeName === name);
  assert(instructions.length === expectedCount, `${name} concrete-start count drifted: ${instructions.length}`);
  for (const instruction of instructions) {
    assert(instruction.opcodeId === opcodeId, `${name} opcode id drifted`);
    assert(instruction.dispatcher === dispatcher, `${name} dispatcher drifted`);
    assert(instruction.operands.length === operandCount, `${name} operand count drifted`);
  }
  return instructions;
}
const stockpileStarts = canonicalStartsFor(STOCKPILE_NAME, 1, STOCKPILE_ID, STOCKPILE_DISPATCHER, 0);
const toBaseDamageStarts = canonicalStartsFor(TO_BASE_DAMAGE_NAME, 2, TO_BASE_DAMAGE_ID, TO_BASE_DAMAGE_DISPATCHER, 1);
const toHpHealStarts = canonicalStartsFor(TO_HP_HEAL_NAME, 1, TO_HP_HEAL_ID, TO_HP_HEAL_DISPATCHER, 1);
assert(stockpileStarts[0].programCounter === 1455, "stockpile program counter drifted");
assert(toBaseDamageStarts[0].programCounter === 1466 && toBaseDamageStarts[1].programCounter === 1477, "stockpiletobasedamage program counters drifted");
assert(toHpHealStarts[0].programCounter === 1484, "stockpiletohpheal program counter drifted");
assert(toBaseDamageStarts[0].operands[0].expression === SPIT_UP_FAIL_LABEL, "SpitUp fail label drifted");
assert(toHpHealStarts[0].operands[0].expression === SWALLOW_FAIL_LABEL, "Swallow fail label drifted");
assert(programModule.resolveBattleScriptLabel(program, SPIT_UP_FAIL_LABEL)?.programCounter === 1470, "SpitUpFail resolution drifted");
assert(programModule.resolveBattleScriptLabel(program, SWALLOW_FAIL_LABEL)?.programCounter === 1486, "SwallowFail resolution drifted");
assert(!programModule.resolveBattleScriptLabel(program, UNRESOLVED_POINTER), "unresolved pointer unexpectedly exists");

const handlers = opcodeModule.createBattleScriptStockpileOpcodeHandlers(program);
const stockpileHandler = handlers[STOCKPILE_ID];
const toBaseDamageHandler = handlers[TO_BASE_DAMAGE_ID];
const toHpHealHandler = handlers[TO_HP_HEAL_ID];
assert(typeof stockpileHandler === "function", "stockpile handler did not register");
assert(typeof toBaseDamageHandler === "function", "stockpiletobasedamage handler did not register");
assert(typeof toHpHealHandler === "function", "stockpiletohpheal handler did not register");

function freezeInstructionSpec({
  opcodeName, opcodeId, dispatcher, operandWidths = [], operandExpressions = [],
  programCounter,
}) {
  return Object.freeze({
    opcodeName, opcodeId, dispatcher,
    operandWidths: freezeArray(operandWidths), operandExpressions: freezeArray(operandExpressions),
    programCounter,
  });
}
const STOCKPILE_SPEC = freezeInstructionSpec({
  opcodeName: STOCKPILE_NAME, opcodeId: STOCKPILE_ID, dispatcher: STOCKPILE_DISPATCHER,
  programCounter: stockpileStarts[0].programCounter,
});
const TO_BASE_DAMAGE_SPEC = freezeInstructionSpec({
  opcodeName: TO_BASE_DAMAGE_NAME, opcodeId: TO_BASE_DAMAGE_ID, dispatcher: TO_BASE_DAMAGE_DISPATCHER,
  operandWidths: [4], operandExpressions: [SPIT_UP_FAIL_LABEL], programCounter: toBaseDamageStarts[0].programCounter,
});
const TO_HP_HEAL_SPEC = freezeInstructionSpec({
  opcodeName: TO_HP_HEAL_NAME, opcodeId: TO_HP_HEAL_ID, dispatcher: TO_HP_HEAL_DISPATCHER,
  operandWidths: [4], operandExpressions: [SWALLOW_FAIL_LABEL], programCounter: toHpHealStarts[0].programCounter,
});

function instructionFromSpec(spec) {
  const operands = spec.operandWidths.map((widthBytes, index) => Object.freeze({
    widthBytes, expression: spec.operandExpressions[index],
  }));
  return Object.freeze({
    opcodeName: spec.opcodeName, programCounter: spec.programCounter, opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher, operands: freezeArray(operands),
  });
}
function vectorInstruction(spec) {
  const instruction = instructionFromSpec(spec);
  const operand = instruction.operands[0];
  const resolved = operand === undefined ? undefined : programModule.resolveBattleScriptLabel(program, operand.expression);
  return Object.freeze({
    opcodeName: instruction.opcodeName, programCounter: instruction.programCounter,
    opcodeId: instruction.opcodeId, dispatcher: instruction.dispatcher,
    operandWidths: freezeArray(spec.operandWidths), operandExpressions: freezeArray(spec.operandExpressions),
    resolvedExpression: resolved === undefined ? null : operand.expression,
    resolvedProgramCounter: resolved === undefined ? null : resolved.programCounter,
  });
}
function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return Object.freeze({ kind: "advance" });
  if (transition.control.kind === "jump") return Object.freeze({ kind: "jump", programCounter: transition.control.programCounter });
  throw new Error(`unexpected canonical control ${transition.control.kind}`);
}

function sourceOutcome(rulesSpec, handler, instructionSpec) {
  const rules = canonicalRules(rulesSpec);
  const before = projectRules(rules);
  const instruction = instructionFromSpec(instructionSpec);
  try {
    const scaffold = machineModule.createBattleScriptMachine(program, ENTRY_LABEL, rules, 0x2244_6688);
    const state = Object.freeze({ ...scaffold, programCounter: instruction.programCounter });
    const transition = handler({ program, instruction, state });
    assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
    assert(same(projectRules(rules), before), "canonical handler mutated input rules");
    assert((transition.events ?? []).length === 0, "stockpile family must never emit events");
    const control = controlFromTransition(transition);
    return Object.freeze({ expectedRules: projectRules(transition.rulesContext), control, error: null });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    return Object.freeze({ expectedRules: null, control: null, error: error.message });
  }
}

function branchFor(handlerName, outcome) {
  if (outcome.error === null) return outcome.control.kind;
  if (outcome.error.startsWith(`invalid ${STOCKPILE_NAME} shape`)
    || outcome.error.startsWith(`invalid ${TO_BASE_DAMAGE_NAME} shape`)
    || outcome.error.startsWith(`invalid ${TO_HP_HEAL_NAME} shape`)) return "invalid-instruction-shape";
  if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
  if (outcome.error.includes("requires a target role")) return "helper-missing-target-role";
  if (outcome.error.startsWith(`${TO_BASE_DAMAGE_DISPATCHER} unresolved failure target`)
    || outcome.error.startsWith(`${TO_HP_HEAL_DISPATCHER} unresolved failure target`)) return "unresolved-failure-target";
  throw new Error(`unknown canonical error (${handlerName}): ${outcome.error}`);
}

const cases = [];
function addCase(label, category, handlerName, handler, rulesSpec, instructionSpec) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(rulesSpec, handler, instructionSpec);
  cases.push(Object.freeze({
    label, category, handlerName, branch: branchFor(handlerName, outcome),
    initial: projectRules(canonicalRules(rulesSpec)),
    instruction: vectorInstruction(instructionSpec),
    ...outcome,
  }));
}

// === 0x85 Cmd_stockpile ===================================================
for (const counter of [0, 1, 2]) {
  const spec = withBattler(baseSpec(), 0, { stockpileCounter: counter });
  addCase(`stockpile_counter_${counter}_increments`, "stockpile", "stockpile", stockpileHandler, spec, STOCKPILE_SPEC);
}
addCase(
  "stockpile_counter_3_caps_preserving_prior_miss_flags", "stockpile", "stockpile", stockpileHandler,
  { ...withBattler(baseSpec(), 0, { stockpileCounter: 3 }), moveResultFlags: 0x8 }, STOCKPILE_SPEC,
);
addCase(
  "stockpile_missing_attacker_role", "stockpile", "stockpile", stockpileHandler,
  { ...baseSpec(), attacker: null }, STOCKPILE_SPEC,
);

// === 0x86 Cmd_stockpiletobasedamage =======================================
addCase(
  "to_base_damage_counter_zero_jumps", "stockpiletobasedamage", "toBaseDamage", toBaseDamageHandler,
  withBattler(baseSpec(), 0, { stockpileCounter: 0 }), TO_BASE_DAMAGE_SPEC,
);
for (const counter of [1, 2, 3]) {
  for (const missType of [0, B_MSG_PROTECTED]) {
    for (const helpingHand of [0, 1]) {
      let spec = withBattler(baseSpec({ missType }), 0, { stockpileCounter: counter, helpingHand });
      // Vary attacker stats per grid cell so damage differs across cases.
      spec = withBattler(spec, 0, { attack: 60 + counter * 5 + helpingHand * 3, level: 45 + counter });
      addCase(
        `to_base_damage_counter${counter}_misstype${missType}_helpinghand${helpingHand}`,
        "stockpiletobasedamage-grid", "toBaseDamage", toBaseDamageHandler, spec, TO_BASE_DAMAGE_SPEC,
      );
    }
  }
}
{
  let spec = withBattler(baseSpec({ currentMove: MOVE_THUNDERBOLT }), 0, { stockpileCounter: 2, status3: STATUS3_MUDSPORT });
  addCase("to_base_damage_sport_halved", "stockpiletobasedamage-real-helper", "toBaseDamage", toBaseDamageHandler, spec, TO_BASE_DAMAGE_SPEC);
}
{
  let spec = withBattler(baseSpec(), 0, { stockpileCounter: 2, item: ITEM_CHOICE_BAND });
  addCase("to_base_damage_item_boosted", "stockpiletobasedamage-real-helper", "toBaseDamage", toBaseDamageHandler, spec, TO_BASE_DAMAGE_SPEC);
}
addCase(
  "to_base_damage_helper_error_missing_target_role", "stockpiletobasedamage-helper-error", "toBaseDamage", toBaseDamageHandler,
  { ...withBattler(baseSpec(), 0, { stockpileCounter: 1 }), target: null }, TO_BASE_DAMAGE_SPEC,
);
addCase(
  "to_base_damage_misstype1_skips_helper_no_target_needed", "stockpiletobasedamage-protected-skip", "toBaseDamage", toBaseDamageHandler,
  { ...withBattler(baseSpec({ missType: B_MSG_PROTECTED }), 0, { stockpileCounter: 1 }), target: null }, TO_BASE_DAMAGE_SPEC,
);
addCase(
  "to_base_damage_missing_attacker_role", "stockpiletobasedamage", "toBaseDamage", toBaseDamageHandler,
  { ...baseSpec(), attacker: null }, TO_BASE_DAMAGE_SPEC,
);
{
  const failSpec = freezeInstructionSpec({
    opcodeName: TO_BASE_DAMAGE_NAME, opcodeId: TO_BASE_DAMAGE_ID, dispatcher: TO_BASE_DAMAGE_DISPATCHER,
    operandWidths: [4], operandExpressions: [UNRESOLVED_POINTER], programCounter: toBaseDamageStarts[0].programCounter,
  });
  addCase(
    "to_base_damage_unresolved_target_on_jump_branch", "stockpiletobasedamage-lazy-label", "toBaseDamage", toBaseDamageHandler,
    withBattler(baseSpec(), 0, { stockpileCounter: 0 }), failSpec,
  );
  addCase(
    "to_base_damage_unresolved_target_on_success_branch_is_lazy", "stockpiletobasedamage-lazy-label", "toBaseDamage", toBaseDamageHandler,
    withBattler(baseSpec(), 0, { stockpileCounter: 1 }), failSpec,
  );
}

// === 0x87 Cmd_stockpiletohpheal ============================================
addCase(
  "to_hp_heal_counter_zero_jumps_chooser_and_counter_retained", "stockpiletohpheal", "toHpHeal", toHpHealHandler,
  withBattler(baseSpec(), 0, { stockpileCounter: 0 }), TO_HP_HEAL_SPEC,
);
addCase(
  "to_hp_heal_full_hp_zeroes_counter_and_overwrites_target", "stockpiletohpheal", "toHpHeal", toHpHealHandler,
  withBattler(baseSpec(), 0, { stockpileCounter: 2, hp: 100, maxHP: 100 }), TO_HP_HEAL_SPEC,
);
for (const counter of [1, 2, 3]) {
  const spec = withBattler(baseSpec(), 0, { stockpileCounter: counter, hp: 40, maxHP: 100 });
  addCase(`to_hp_heal_success_counter_${counter}`, "stockpiletohpheal-heal-shift", "toHpHeal", toHpHealHandler, spec, TO_HP_HEAL_SPEC);
}
addCase(
  "to_hp_heal_floor_max1_tiny_maxhp", "stockpiletohpheal-heal-shift", "toHpHeal", toHpHealHandler,
  withBattler(baseSpec(), 0, { stockpileCounter: 1, hp: 1, maxHP: 2 }), TO_HP_HEAL_SPEC,
);
addCase(
  "to_hp_heal_boundary_hp_eq_maxhp_minus_1", "stockpiletohpheal-heal-shift", "toHpHeal", toHpHealHandler,
  withBattler(baseSpec(), 0, { stockpileCounter: 2, hp: 99, maxHP: 100 }), TO_HP_HEAL_SPEC,
);
for (const attacker of BATTLERS) {
  const spec = withBattler(
    baseSpec({ attacker, target: (attacker + 1) % 4, battlersCount: 4, battleTypeFlags: 1 << 0 }),
    attacker, { stockpileCounter: 2, hp: 40, maxHP: 100 },
  );
  addCase(`to_hp_heal_attacker_role_${attacker}_overwrites_target`, "stockpiletohpheal-role-matrix", "toHpHeal", toHpHealHandler, spec, TO_HP_HEAL_SPEC);
}
addCase(
  "to_hp_heal_missing_attacker_role", "stockpiletohpheal", "toHpHeal", toHpHealHandler,
  { ...baseSpec(), attacker: null }, TO_HP_HEAL_SPEC,
);
{
  const failSpec = freezeInstructionSpec({
    opcodeName: TO_HP_HEAL_NAME, opcodeId: TO_HP_HEAL_ID, dispatcher: TO_HP_HEAL_DISPATCHER,
    operandWidths: [4], operandExpressions: [UNRESOLVED_POINTER], programCounter: toHpHealStarts[0].programCounter,
  });
  addCase(
    "to_hp_heal_unresolved_target_on_counter_zero_jump", "stockpiletohpheal-lazy-label", "toHpHeal", toHpHealHandler,
    withBattler(baseSpec(), 0, { stockpileCounter: 0 }), failSpec,
  );
  addCase(
    "to_hp_heal_unresolved_target_on_full_hp_jump", "stockpiletohpheal-lazy-label", "toHpHeal", toHpHealHandler,
    withBattler(baseSpec(), 0, { stockpileCounter: 2, hp: 100, maxHP: 100 }), failSpec,
  );
  addCase(
    "to_hp_heal_unresolved_target_on_success_branch_is_lazy", "stockpiletohpheal-lazy-label", "toHpHeal", toHpHealHandler,
    withBattler(baseSpec(), 0, { stockpileCounter: 1, hp: 40, maxHP: 100 }), failSpec,
  );
}

// === Registration ===========================================================
function sourceRegistration(specs) {
  const instructions = freezeArray(specs.map(instructionFromSpec));
  const customProgram = Object.freeze({ ...program, instructions });
  try {
    const registered = opcodeModule.createBattleScriptStockpileOpcodeHandlers(customProgram);
    const keys = Object.keys(registered).map(Number).sort((a, b) => a - b);
    return Object.freeze({ opcodeIds: keys, error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ opcodeIds: null, error: error.message });
  }
}
const registrationCases = [];
function addRegistration(label, specs) {
  const outcome = sourceRegistration(specs);
  registrationCases.push(Object.freeze({
    label, instructions: freezeArray(specs.map(vectorInstruction)),
    expectedOpcodeIds: outcome.opcodeIds, expectedError: outcome.error,
  }));
}
const ALL_THREE = [STOCKPILE_SPEC, TO_BASE_DAMAGE_SPEC, TO_BASE_DAMAGE_SPEC, TO_HP_HEAL_SPEC];
addRegistration("valid_registration_returns_three_keys", ALL_THREE);
addRegistration("stockpile_wrong_cardinality_zero", [TO_BASE_DAMAGE_SPEC, TO_BASE_DAMAGE_SPEC, TO_HP_HEAL_SPEC]);
addRegistration("stockpile_wrong_cardinality_two", [STOCKPILE_SPEC, STOCKPILE_SPEC, TO_BASE_DAMAGE_SPEC, TO_BASE_DAMAGE_SPEC, TO_HP_HEAL_SPEC]);
addRegistration("to_base_damage_wrong_cardinality_one", [STOCKPILE_SPEC, TO_BASE_DAMAGE_SPEC, TO_HP_HEAL_SPEC]);
addRegistration("to_base_damage_wrong_cardinality_three", [STOCKPILE_SPEC, TO_BASE_DAMAGE_SPEC, TO_BASE_DAMAGE_SPEC, TO_BASE_DAMAGE_SPEC, TO_HP_HEAL_SPEC]);
addRegistration("to_hp_heal_wrong_cardinality_zero", [STOCKPILE_SPEC, TO_BASE_DAMAGE_SPEC, TO_BASE_DAMAGE_SPEC]);
addRegistration("to_hp_heal_wrong_cardinality_two", [STOCKPILE_SPEC, TO_BASE_DAMAGE_SPEC, TO_BASE_DAMAGE_SPEC, TO_HP_HEAL_SPEC, TO_HP_HEAL_SPEC]);
addRegistration("stockpile_bad_opcode", [
  freezeInstructionSpec({ opcodeName: STOCKPILE_NAME, opcodeId: 0x99, dispatcher: STOCKPILE_DISPATCHER, programCounter: 1 }),
  TO_BASE_DAMAGE_SPEC, TO_BASE_DAMAGE_SPEC, TO_HP_HEAL_SPEC,
]);
addRegistration("stockpile_bad_dispatcher", [
  freezeInstructionSpec({ opcodeName: STOCKPILE_NAME, opcodeId: STOCKPILE_ID, dispatcher: "Cmd_noise", programCounter: 1 }),
  TO_BASE_DAMAGE_SPEC, TO_BASE_DAMAGE_SPEC, TO_HP_HEAL_SPEC,
]);
addRegistration("stockpile_wrong_operand_count", [
  freezeInstructionSpec({ opcodeName: STOCKPILE_NAME, opcodeId: STOCKPILE_ID, dispatcher: STOCKPILE_DISPATCHER, operandWidths: [4], operandExpressions: [SPIT_UP_FAIL_LABEL], programCounter: 1 }),
  TO_BASE_DAMAGE_SPEC, TO_BASE_DAMAGE_SPEC, TO_HP_HEAL_SPEC,
]);
addRegistration("to_base_damage_bad_opcode", [
  STOCKPILE_SPEC,
  freezeInstructionSpec({ opcodeName: TO_BASE_DAMAGE_NAME, opcodeId: 0x99, dispatcher: TO_BASE_DAMAGE_DISPATCHER, operandWidths: [4], operandExpressions: [SPIT_UP_FAIL_LABEL], programCounter: 1 }),
  TO_BASE_DAMAGE_SPEC, TO_HP_HEAL_SPEC,
]);
addRegistration("to_base_damage_bad_dispatcher", [
  STOCKPILE_SPEC,
  freezeInstructionSpec({ opcodeName: TO_BASE_DAMAGE_NAME, opcodeId: TO_BASE_DAMAGE_ID, dispatcher: "Cmd_noise", operandWidths: [4], operandExpressions: [SPIT_UP_FAIL_LABEL], programCounter: 1 }),
  TO_BASE_DAMAGE_SPEC, TO_HP_HEAL_SPEC,
]);
addRegistration("to_base_damage_wrong_operand_count", [
  STOCKPILE_SPEC,
  freezeInstructionSpec({ opcodeName: TO_BASE_DAMAGE_NAME, opcodeId: TO_BASE_DAMAGE_ID, dispatcher: TO_BASE_DAMAGE_DISPATCHER, operandWidths: [], operandExpressions: [], programCounter: 1 }),
  TO_BASE_DAMAGE_SPEC, TO_HP_HEAL_SPEC,
]);
addRegistration("to_base_damage_bad_operand_width", [
  STOCKPILE_SPEC,
  freezeInstructionSpec({ opcodeName: TO_BASE_DAMAGE_NAME, opcodeId: TO_BASE_DAMAGE_ID, dispatcher: TO_BASE_DAMAGE_DISPATCHER, operandWidths: [1], operandExpressions: [SPIT_UP_FAIL_LABEL], programCounter: 1 }),
  TO_BASE_DAMAGE_SPEC, TO_HP_HEAL_SPEC,
]);
addRegistration("to_hp_heal_bad_opcode", [
  STOCKPILE_SPEC, TO_BASE_DAMAGE_SPEC, TO_BASE_DAMAGE_SPEC,
  freezeInstructionSpec({ opcodeName: TO_HP_HEAL_NAME, opcodeId: 0x99, dispatcher: TO_HP_HEAL_DISPATCHER, operandWidths: [4], operandExpressions: [SWALLOW_FAIL_LABEL], programCounter: 1 }),
]);
addRegistration("to_hp_heal_bad_dispatcher", [
  STOCKPILE_SPEC, TO_BASE_DAMAGE_SPEC, TO_BASE_DAMAGE_SPEC,
  freezeInstructionSpec({ opcodeName: TO_HP_HEAL_NAME, opcodeId: TO_HP_HEAL_ID, dispatcher: "Cmd_noise", operandWidths: [4], operandExpressions: [SWALLOW_FAIL_LABEL], programCounter: 1 }),
]);
addRegistration("to_hp_heal_wrong_operand_count", [
  STOCKPILE_SPEC, TO_BASE_DAMAGE_SPEC, TO_BASE_DAMAGE_SPEC,
  freezeInstructionSpec({ opcodeName: TO_HP_HEAL_NAME, opcodeId: TO_HP_HEAL_ID, dispatcher: TO_HP_HEAL_DISPATCHER, operandWidths: [4, 4], operandExpressions: [SWALLOW_FAIL_LABEL, SWALLOW_FAIL_LABEL], programCounter: 1 }),
]);
addRegistration("to_hp_heal_bad_operand_width", [
  STOCKPILE_SPEC, TO_BASE_DAMAGE_SPEC, TO_BASE_DAMAGE_SPEC,
  freezeInstructionSpec({ opcodeName: TO_HP_HEAL_NAME, opcodeId: TO_HP_HEAL_ID, dispatcher: TO_HP_HEAL_DISPATCHER, operandWidths: [1], operandExpressions: [SWALLOW_FAIL_LABEL], programCounter: 1 }),
]);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}
const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, (value) => (
  value.expectedError === null ? "registered"
    : value.expectedError.includes("concrete starts") ? "wrong-cardinality"
      : "invalid-shape"
));
const domainCensus = Object.freeze([
  ["source-battler-slots", 4],
  ["registration-cases", registrationCases.length],
]);

const corpus = Object.freeze({ domainCensus, categoryCensus, branchCensus, registrationBranchCensus, cases, registrationCases });
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");

function rustControl(value) {
  if (value === null) return "None";
  return value.kind === "advance" ? "Some(BattleScriptStockpileControl::Advance)"
    : `Some(BattleScriptStockpileControl::Jump { program_counter: ${value.programCounter} })`;
}
function rustStatStages(value) {
  return `StatStages { atk: ${value.atk}, def: ${value.def}, sp_atk: ${value.spAtk}, sp_def: ${value.spDef} }`;
}
function rustBaseBattler(value) {
  return [
    "BattleScriptBaseDamageBattlerState {",
    `item: ${hex16(value.item)}, ability: ${hex16(value.ability)}, species: ${hex16(value.species)},`,
    `types: [${value.types.join(", ")}], level: ${rustI32(value.level)},`,
    `attack: ${rustI32(value.attack)}, defense: ${rustI32(value.defense)}, sp_attack: ${rustI32(value.spAttack)}, sp_defense: ${rustI32(value.spDefense)},`,
    `stat_stages: ${rustStatStages(value.statStages)},`,
    `hp: ${rustI32(value.hp)}, max_hp: ${rustI32(value.maxHp)}, status1: ${value.status1}u32, status3: ${value.status3}u32,`,
    `flash_fire_boosted: ${value.flashFireBoosted}u8,`,
    "}",
  ].join(" ");
}
function rustBattlerState(value) {
  return `BattleScriptStockpileVectorBattlerState { base: ${rustBaseBattler(value)}, stockpile_counter: ${value.stockpileCounter}u8, helping_hand: ${value.helpingHand}u8 }`;
}
function rustArr4u16(values) { return `[${values.map(hex16).join(", ")}]`; }
function rustArr4i32(values) { return `[${values.map(rustI32).join(", ")}]`; }
function rustOptionU8(value) { return value === null || value === undefined ? "None" : `Some(${value}u8)`; }
function rustOptionU8Battler(value) { return optionBattler(value); }
function rustState(value) {
  return [
    "BattleScriptStockpileVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `battlers_count: ${value.battlersCount}u8, battle_type_flags: ${hex32(value.battleTypeFlags)}, weather: ${hex32(value.weather)},`,
    `current_move: ${hex16(value.currentMove)}, dynamic_base_power: ${hex16(value.dynamicBasePower)}, dynamic_move_type: ${value.dynamicMoveType}u8,`,
    `crit_multiplier: ${value.critMultiplier}u8, attacker: ${rustOptionU8Battler(value.attacker)}, target: ${rustOptionU8Battler(value.target)},`,
    `enigma_berry_hold_effects: ${rustArr4u16(value.enigmaBerryHoldEffects)}, enigma_berry_hold_effect_params: ${rustArr4i32(value.enigmaBerryHoldEffectParams)},`,
    `miss_type: ${value.missType}u8, move_result_flags: ${hex32(value.moveResultFlags)}, multistring_chooser: ${value.multistringChooser}u8,`,
    `battle_text_buff1_byte_number: ${rustOptionU8(value.battleTextBuff1ByteNumber)}, battle_move_damage: ${rustI32(value.battleMoveDamage)}, anim_turn: ${value.animTurn}u8,`,
    "}",
  ].join(" ");
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustInstruction(value) {
  const operands = value.operandWidths.map((width, index) =>
    `BattleScriptStockpileOperand { width_bytes: ${width}, expression: ${rustString(value.operandExpressions[index])} }`);
  const resolved = value.resolvedExpression === null ? "None"
    : `Some(BattleScriptStockpileResolvedLabel { expression: ${rustString(value.resolvedExpression)}, program_counter: ${value.resolvedProgramCounter} })`;
  return `BattleScriptStockpileInstruction { opcode_name: ${rustString(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${hex8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)}, operands: &[${operands.join(", ")}], resolved_target: ${resolved} }`;
}
function rustOpcodeIds(value) {
  if (value === null) return "None";
  assert(value.length === 3, "registration success must always yield exactly three keys");
  return `Some([${value.map(hex8).join(", ")}])`;
}
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-stockpile-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptStockpileOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_base_damage::BattleScriptBaseDamageBattlerState;");
lines.push("use crate::battle_script_stockpile::{");
lines.push("    BattleScriptStockpileBattler, BattleScriptStockpileControl, BattleScriptStockpileInstruction,");
lines.push("    BattleScriptStockpileOperand, BattleScriptStockpileResolvedLabel,");
lines.push("};");
lines.push("use crate::damage_calc::StatStages;");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_STOCKPILE_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_STOCKPILE_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_STOCKPILE_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_STOCKPILE_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptStockpileVectorBattlerState { pub base: BattleScriptBaseDamageBattlerState, pub stockpile_counter: u8, pub helping_hand: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptStockpileVectorState { pub battlers: [BattleScriptStockpileVectorBattlerState; 4], pub battlers_count: u8, pub battle_type_flags: u32, pub weather: u32, pub current_move: u16, pub dynamic_base_power: u16, pub dynamic_move_type: u8, pub crit_multiplier: u8, pub attacker: Option<BattleScriptStockpileBattler>, pub target: Option<BattleScriptStockpileBattler>, pub enigma_berry_hold_effects: [u16; 4], pub enigma_berry_hold_effect_params: [i32; 4], pub miss_type: u8, pub move_result_flags: u32, pub multistring_chooser: u8, pub battle_text_buff1_byte_number: Option<u8>, pub battle_move_damage: i32, pub anim_turn: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptStockpileVectorCase { pub label: &'static str, pub category: &'static str, pub handler_name: &'static str, pub branch: &'static str, pub initial: BattleScriptStockpileVectorState, pub instruction: BattleScriptStockpileInstruction<'static>, pub expected: Option<BattleScriptStockpileVectorState>, pub control: Option<BattleScriptStockpileControl>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptStockpileRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptStockpileInstruction<'static>], pub expected_opcode_ids: Option<[u8; 3]>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_STOCKPILE_DOMAIN_CENSUS", domainCensus, "u64"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_STOCKPILE_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_STOCKPILE_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_STOCKPILE_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_STOCKPILE_CASES: [BattleScriptStockpileVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptStockpileVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, handler_name: ${rustString(value.handlerName)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        expected: ${rustOptionalState(value.expectedRules)},`);
  lines.push(`        control: ${rustControl(value.control)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.error)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_STOCKPILE_REGISTRATION_CASES: [BattleScriptStockpileRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptStockpileRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, instructions: &[${value.instructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        expected_opcode_ids: ${rustOpcodeIds(value.expectedOpcodeIds)}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", "--config-path", rustfmtConfig, outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-stockpile-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES, `generated file ${generated.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
