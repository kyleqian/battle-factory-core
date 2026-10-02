#!/usr/bin/env node
// Differential corpus for the B_SCR_OP_DAMAGECALC (0x05) leaf --
// `damagecalcOpcodeHandler` in src/engine/battleScriptHitChainOpcode.ts
// (:1602-1626, doc comment :1583-1601).
//
// Expected damage values and thrown messages come only from executing the
// canonical TypeScript handler -- reached through the real
// `createBattleScriptHitChainOpcodeHandlers` factory and a real committed
// damagecalc instruction from the loaded program -- plus, for the
// missing-opcode registration case only, a custom program with every
// damagecalc instruction filtered out. This generator owns bounded input
// construction and Rust literal emission; it must never reimplement
// CalculateBaseDamage, resolveBattleScriptMoveType, or the shared
// base-damage helper's own math.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-damagecalc-vectors.mjs

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
  "battle_script_damagecalc_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");
const GENERATED_FILE_MAX_BYTES = 6_000_000;

const [programModule, machineModule, opcodeModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptHitChainOpcode.ts")).href),
]);
const rulesModule = await import(
  pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href
);

const DAMAGECALC_NAME = "B_SCR_OP_DAMAGECALC";
const DAMAGECALC_ID = 0x05;
const DAMAGECALC_DISPATCHER = "Cmd_damagecalc";
const ENTRY_LABEL = "BattleScript_EffectStockpile"; // any valid label; programCounter is overridden.
const STATUS3_CHARGED_UP = 1 << 9;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-damagecalc-vectors: ${message}`);
}
function freezeArray(values) { return Object.freeze(values.slice()); }
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
const TYPE_ELECTRIC = 13;
const MOVE_TACKLE = 33; // physical Normal, power 35
const MOVE_THUNDERBOLT = 84; // TYPE_ELECTRIC special
const ITEM_CHOICE_BAND = 186;
const STATUS3_MUDSPORT = 1 << 16;

function defaultBattlerSpec(index) {
  return {
    side: index % 2, ability: 0, item: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"], species: 1 + index,
    attack: 60 + index * 3, defense: 60 + index * 2, spAttack: 60 + index, spDefense: 60 + index * 4,
    level: 50, hp: 100, maxHP: 100, status1: 0, status3: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6], flashFireBoosted: 0, helpingHand: 0,
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
    flashFireBoosted: spec.flashFireBoosted, helpingHand: spec.helpingHand,
  });
}

function canonicalRulesRaw({
  battlerSpecs, attacker, target, battlersCount = 2,
  currentMove = MOVE_TACKLE, dynamicBasePower = 0, dynamicMoveType = 0, weather = 0,
  critMultiplier = 1, dmgMultiplier = 1,
  battleTypeFlags = battlersCount === 4 ? 1 << 0 : 0,
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
    moveResultFlags: 0,
    dmgMultiplier,
    critMultiplier,
    moveEffectByte: 0,
    missType: 0,
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
    multistringChooser: 0xff,
    dynamicBasePower,
    dynamicMoveType,
    weather,
    enigmaBerryHoldEffects: freezeArray(enigmaBerryHoldEffects),
    enigmaBerryHoldEffectParams: freezeArray(enigmaBerryHoldEffectParams),
    battleMoveDamage: 0,
  });
}

// `createBattleScriptRulesContext` eagerly resolves `currentMoveEffect` from
// `currentMove` at construction time, which throws BEFORE the damagecalc
// handler's own pre-helper move-type lookup ever runs -- same
// "unreachable through the full pipeline" shape as the sibling base-damage
// generator. To replay the handler's OWN unknown-move error, construction
// uses a safe placeholder move and the real (possibly invalid) currentMove
// is spliced into the frozen context afterward, never touching
// construction-time validation.
function canonicalRules(spec) {
  const wantedMove = spec.currentMove ?? MOVE_TACKLE;
  try {
    return canonicalRulesRaw(spec);
  } catch {
    const placeholder = canonicalRulesRaw({ ...spec, currentMove: MOVE_TACKLE });
    return Object.freeze({ ...placeholder, currentMove: wantedMove });
  }
}

function baseSpec(overrides = {}) {
  const battlerSpecs = [0, 1, 2, 3].map((index) => defaultBattlerSpec(index));
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
    helpingHand: b.helpingHand ?? 0,
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
    dmgMultiplier: rules.dmgMultiplier,
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    enigmaBerryHoldEffects: freezeArray(rules.enigmaBerryHoldEffects),
    enigmaBerryHoldEffectParams: freezeArray(rules.enigmaBerryHoldEffectParams),
    battleMoveDamage: rules.battleMoveDamage,
  });
}
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

const program = programModule.loadBattleScriptProgram();
const damagecalcInstructions = program.instructions.filter((value) => value.opcodeName === DAMAGECALC_NAME);
assert(damagecalcInstructions.length === 11, `damagecalc concrete-start count drifted: ${damagecalcInstructions.length}`);
for (const instruction of damagecalcInstructions) {
  assert(instruction.opcodeId === DAMAGECALC_ID, "damagecalc opcode id drifted");
  assert(instruction.dispatcher === DAMAGECALC_DISPATCHER, "damagecalc dispatcher drifted");
  assert(instruction.operands.length === 0, "damagecalc unexpectedly carries operands");
}
const firstInstruction = damagecalcInstructions[0];

const ports = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: () => {},
  resolveBattlerForBattleScript: () => 0,
});
const handlers = opcodeModule.createBattleScriptHitChainOpcodeHandlers(program, ports);
const damagecalcHandler = handlers[DAMAGECALC_ID];
assert(typeof damagecalcHandler === "function", "damagecalc handler did not register");

function instructionSpec() {
  return Object.freeze({
    opcodeName: DAMAGECALC_NAME, opcodeId: DAMAGECALC_ID, dispatcher: DAMAGECALC_DISPATCHER,
    programCounter: firstInstruction.programCounter,
  });
}

function sourceOutcome(rulesSpec) {
  const rules = canonicalRules(rulesSpec);
  const before = projectRules(rules);
  try {
    const scaffold = machineModule.createBattleScriptMachine(program, ENTRY_LABEL, rules, 0x2244_6688);
    const state = Object.freeze({ ...scaffold, programCounter: firstInstruction.programCounter });
    const transition = damagecalcHandler({ program, instruction: instructionSpec(), state });
    assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
    assert(same(projectRules(rules), before), "canonical handler mutated input rules");
    assert((transition.events ?? []).length === 0, "damagecalc must never emit events");
    assert(transition.control.kind === "advance", "damagecalc must always advance");
    return Object.freeze({ expected: projectRules(transition.rulesContext), error: null });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    return Object.freeze({ expected: null, error: error.message });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return "advance";
  if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
  if (outcome.error.includes("has no source-derived gBattleMoves type")) return "unknown-move-type";
  if (outcome.error.includes("unknown numeric type id")) return "unknown-type-id";
  if (outcome.error.includes("requires a target role")) return "helper-missing-target-role";
  if (outcome.error.includes("outside the source gItems corpus")) return "helper-item-out-of-range";
  throw new Error(`unknown canonical error: ${outcome.error}`);
}

const cases = [];
function addCase(label, category, rulesSpec) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(rulesSpec);
  cases.push(Object.freeze({
    label, category, branch: branchFor(outcome),
    initial: projectRules(canonicalRules(rulesSpec)),
    ...outcome,
  }));
}

// --- Role errors -----------------------------------------------------------
addCase("missing_attacker_role", "role-errors", { ...baseSpec(), attacker: null });
addCase(
  "missing_attacker_role_wins_over_unknown_move", "role-errors",
  { ...baseSpec({ currentMove: 60000 }), attacker: null },
);
addCase("helper_missing_target_role", "role-errors", { ...baseSpec(), target: null });

// --- Pre-helper move-type resolution ---------------------------------------
addCase("unknown_move_error", "move-type", baseSpec({ currentMove: 60000 }));
addCase(
  "unknown_move_wins_over_helper_missing_target_role", "move-type",
  { ...baseSpec({ currentMove: 60000 }), target: null },
);
addCase("dynamic_type_out_of_domain_error", "move-type", baseSpec({ dynamicMoveType: 0x3f }));
addCase("dynamic_type_masked_0x80_is_normal", "move-type", baseSpec({ dynamicMoveType: 0x80 }));

// --- crit_multiplier x dmg_multiplier order ---------------------------------
for (const crit of [1, 2]) {
  for (const dmg of [1, 2, 3]) {
    addCase(`multiplier_order_crit${crit}_dmg${dmg}`, "multiplier-order", baseSpec({ critMultiplier: crit, dmgMultiplier: dmg }));
  }
}

// --- Charge doubling matrix (status bit x resolved-Electric, both directions)
addCase(
  "charge_bit_set_static_electric_doubles", "charge",
  withBattler(baseSpec({ currentMove: MOVE_THUNDERBOLT }), 0, { status3: STATUS3_CHARGED_UP }),
);
addCase(
  "charge_bit_clear_static_electric_no_double", "charge",
  baseSpec({ currentMove: MOVE_THUNDERBOLT }),
);
addCase(
  "charge_bit_set_dynamic_electric_doubles_non_electric_move", "charge",
  withBattler(baseSpec({ currentMove: MOVE_TACKLE, dynamicMoveType: TYPE_ELECTRIC }), 0, { status3: STATUS3_CHARGED_UP }),
);
addCase(
  "charge_bit_set_static_electric_dynamic_normal_no_double", "charge",
  withBattler(baseSpec({ currentMove: MOVE_THUNDERBOLT, dynamicMoveType: 0x80 }), 0, { status3: STATUS3_CHARGED_UP }),
);
addCase(
  "charge_bit_set_other_battler_no_double", "charge",
  withBattler(baseSpec({ currentMove: MOVE_THUNDERBOLT }), 1, { status3: STATUS3_CHARGED_UP }),
);

// --- Helping Hand truncation, order pin (odd damage to observe truncation) -
{
  let spec = withBattler(baseSpec({ currentMove: MOVE_THUNDERBOLT }), 0, { status3: STATUS3_CHARGED_UP, attack: 61, helpingHand: 0 });
  addCase("helping_hand_off_odd_damage", "helping-hand", spec);
  spec = withBattler(spec, 0, { helpingHand: 1 });
  addCase("helping_hand_on_truncates_after_charge_double", "helping-hand", spec);
}
addCase("helping_hand_only_no_charge", "helping-hand", withBattler(baseSpec({ attack: 61 }), 0, { helpingHand: 1 }));

// --- Shared-helper wiring: sport-halved and item-boosted pins --------------
addCase(
  "sport_halved_via_shared_helper", "helper-wiring",
  withBattler(baseSpec({ currentMove: MOVE_THUNDERBOLT }), 0, { status3: STATUS3_MUDSPORT }),
);
addCase(
  "item_boosted_via_shared_helper", "helper-wiring",
  withBattler(baseSpec(), 0, { item: ITEM_CHOICE_BAND }),
);

// --- Helper item-out-of-range error propagation -----------------------------
addCase(
  "helper_item_out_of_range_error", "helper-error",
  withBattler(baseSpec(), 0, { item: 60000 }),
);

// === Registration ============================================================
function sourceRegistration(instructions) {
  const customProgram = Object.freeze({ ...program, instructions: freezeArray(instructions) });
  try {
    const registered = opcodeModule.createBattleScriptHitChainOpcodeHandlers(customProgram, ports);
    assert(typeof registered[DAMAGECALC_ID] === "function", "damagecalc handler missing after successful registration");
    return Object.freeze({ registeredOpcodeId: DAMAGECALC_ID, error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ registeredOpcodeId: null, error: error.message });
  }
}
// `install()` only ever needs the FIRST instruction matching each opcode
// name, so a program deduplicated down to one (real, in-order) instruction
// per distinct opcode name registers identically to the full ~3300-
// instruction committed program while keeping the emitted Rust literal
// corpus small. This still genuinely drives the real
// `createBattleScriptHitChainOpcodeHandlers` factory, just over a smaller
// -- but still real, still first-occurrence -- input.
const dedupedInstructions = [];
{
  const seenNames = new Set();
  for (const instruction of program.instructions) {
    if (!seenNames.has(instruction.opcodeName)) {
      seenNames.add(instruction.opcodeName);
      dedupedInstructions.push(instruction);
    }
  }
}
assert(
  dedupedInstructions.some((value) => value.opcodeName === DAMAGECALC_NAME),
  "deduplicated program lost the damagecalc entry",
);

const registrationCases = [];
function addRegistration(label, instructions) {
  const outcome = sourceRegistration(instructions);
  registrationCases.push(Object.freeze({
    label,
    instructions: freezeArray(instructions.map((value) => Object.freeze({
      opcodeName: value.opcodeName, opcodeId: value.opcodeId, programCounter: value.programCounter,
    }))),
    expectedOpcodeId: outcome.registeredOpcodeId, expectedError: outcome.error,
  }));
}
addRegistration("full_committed_program_registers", dedupedInstructions);
addRegistration(
  "damagecalc_missing_from_program",
  dedupedInstructions.filter((value) => value.opcodeName !== DAMAGECALC_NAME),
);
addRegistration(
  "duplicate_later_entry_ignored_find_first",
  [...dedupedInstructions, Object.freeze({
    opcodeName: DAMAGECALC_NAME, opcodeId: 0xee, programCounter: 999_999,
    dispatcher: DAMAGECALC_DISPATCHER, operands: [],
  })],
);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}
const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, (value) => (value.expectedError === null ? "registered" : "missing-opcode"));

const corpus = Object.freeze({ categoryCensus, branchCensus, registrationBranchCensus, cases, registrationCases });
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");

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
  return `BattleScriptDamagecalcVectorBattlerState { base: ${rustBaseBattler(value)}, helping_hand: ${value.helpingHand}u8 }`;
}
function rustArr4u16(values) { return `[${values.map(hex16).join(", ")}]`; }
function rustArr4i32(values) { return `[${values.map(rustI32).join(", ")}]`; }
function rustOptionU8(value) { return value === null || value === undefined ? "None" : `Some(${value}u8)`; }
function rustState(value) {
  return [
    "BattleScriptDamagecalcVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `battlers_count: ${value.battlersCount}u8, battle_type_flags: ${hex32(value.battleTypeFlags)}, weather: ${hex32(value.weather)},`,
    `current_move: ${hex16(value.currentMove)}, dynamic_base_power: ${hex16(value.dynamicBasePower)}, dynamic_move_type: ${value.dynamicMoveType}u8,`,
    `crit_multiplier: ${value.critMultiplier}u8, dmg_multiplier: ${value.dmgMultiplier}u8,`,
    `attacker: ${rustOptionU8(value.attacker)}, target: ${rustOptionU8(value.target)},`,
    `enigma_berry_hold_effects: ${rustArr4u16(value.enigmaBerryHoldEffects)}, enigma_berry_hold_effect_params: ${rustArr4i32(value.enigmaBerryHoldEffectParams)},`,
    `battle_move_damage: ${rustI32(value.battleMoveDamage)},`,
    "}",
  ].join(" ");
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustOptionalU8Hex(value) { return value === null || value === undefined ? "None" : `Some(${hex8(value)})`; }
function rustInstruction(value) {
  return `BattleScriptDamagecalcInstruction { opcode_name: ${rustString(value.opcodeName)}, opcode_id: ${hex8(value.opcodeId)}, program_counter: ${value.programCounter} }`;
}
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-damagecalc-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptHitChainOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_base_damage::BattleScriptBaseDamageBattlerState;");
lines.push("use crate::battle_script_damagecalc::BattleScriptDamagecalcInstruction;");
lines.push("use crate::damage_calc::StatStages;");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_DAMAGECALC_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_DAMAGECALC_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_DAMAGECALC_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_DAMAGECALC_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`);
lines.push(`pub const BATTLE_SCRIPT_DAMAGECALC_CONCRETE_CALL_SITE_COUNT: usize = ${damagecalcInstructions.length};`);
lines.push(`pub const BATTLE_SCRIPT_DAMAGECALC_FIRST_PROGRAM_COUNTER: u32 = ${firstInstruction.programCounter};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptDamagecalcVectorBattlerState { pub base: BattleScriptBaseDamageBattlerState, pub helping_hand: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptDamagecalcVectorState { pub battlers: [BattleScriptDamagecalcVectorBattlerState; 4], pub battlers_count: u8, pub battle_type_flags: u32, pub weather: u32, pub current_move: u16, pub dynamic_base_power: u16, pub dynamic_move_type: u8, pub crit_multiplier: u8, pub dmg_multiplier: u8, pub attacker: Option<u8>, pub target: Option<u8>, pub enigma_berry_hold_effects: [u16; 4], pub enigma_berry_hold_effect_params: [i32; 4], pub battle_move_damage: i32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptDamagecalcVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub initial: BattleScriptDamagecalcVectorState, pub expected: Option<BattleScriptDamagecalcVectorState>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptDamagecalcRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptDamagecalcInstruction<'static>], pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_DAMAGECALC_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_DAMAGECALC_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_DAMAGECALC_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_DAMAGECALC_CASES: [BattleScriptDamagecalcVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptDamagecalcVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.error)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_DAMAGECALC_REGISTRATION_CASES: [BattleScriptDamagecalcRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptDamagecalcRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        instructions: &[${value.instructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        expected_opcode_id: ${rustOptionalU8Hex(value.expectedOpcodeId)}, expected_error: ${rustOptionalString(value.expectedError)},`);
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
if (!formatted) throw new Error("gen-battle-script-damagecalc-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES, `generated file ${generated.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
