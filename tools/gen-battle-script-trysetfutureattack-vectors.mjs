#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTrysetfutureattackOpcode.ts.
//
// Expected controls, projected rules, and ordered errors come only from
// executing the canonical TypeScript handler (and its exported
// calculateFutureAttackBaseDamage) through the real Battle Script machine.
// This generator owns bounded input construction and Rust literal
// emission; it must not independently implement Future Sight/Doom Desire
// damage math.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-trysetfutureattack-vectors.mjs

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
  "battle_script_trysetfutureattack_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptTrysetfutureattackOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYSETFUTUREATTACK";
const OPCODE_ID = 0xc3;
const DISPATCHER = "Cmd_trysetfutureattack";
const ENTRY_LABEL = "BattleScript_EffectFutureSight";
const FAILURE_LABEL = "BattleScript_ButItFailed";
const UNRESOLVED_POINTER = "BattleScript_RustTrysetfutureattackUnresolved";
const BATTLERS = Object.freeze([0, 1, 2, 3]);
const MOVE_FUTURE_SIGHT = 248;
const MOVE_DOOM_DESIRE = 353;
const GENERATED_FILE_MAX_BYTES = 6_000_000;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-trysetfutureattack-vectors: ${message}`);
}
function freezeArray(values) { return Object.freeze(values.slice()); }
function battler(value) { return `BattleScriptTrysetfutureattackBattler::Battler${value}`; }
function optionBattler(value) { return value === null ? "None" : `Some(${battler(value)})`; }
function side(value) {
  return value === 0
    ? "BattleScriptTrysetfutureattackSide::Player"
    : "BattleScriptTrysetfutureattackSide::Opponent";
}
function hex8(value) { return `0x${(value & 0xff).toString(16).padStart(2, "0")}`; }
function hex16(value) { return `0x${(value & 0xffff).toString(16).padStart(4, "0")}`; }
function rustString(value) { return JSON.stringify(value); }
function rustI32(value) { return `${value}i32`; }

// damage_calc.rs TYPE_* ids (include/constants/pokemon.h), pinned in that
// module's doc comment; duplicated here only to translate the TS's string
// type names into the numeric ids the Rust struct carries.
const TYPE_NAME_TO_ID = Object.freeze({
  TYPE_NORMAL: 0, TYPE_FIGHTING: 1, TYPE_FLYING: 2, TYPE_POISON: 3, TYPE_GROUND: 4,
  TYPE_ROCK: 5, TYPE_BUG: 6, TYPE_GHOST: 7, TYPE_STEEL: 8, TYPE_MYSTERY: 9,
  TYPE_FIRE: 10, TYPE_WATER: 11, TYPE_GRASS: 12, TYPE_ELECTRIC: 13, TYPE_PSYCHIC: 14,
  TYPE_ICE: 15, TYPE_DRAGON: 16, TYPE_DARK: 17,
});

// Real item ids (src/data/gen/item-hold-effects.json), one per modifier
// family this leaf's damage helper exercises.
const ITEM_CHOICE_BAND = 186;
const ITEM_METAL_COAT = 199; // HOLD_EFFECT_STEEL_POWER, param 10
const ITEM_TWISTED_SPOON = 214; // HOLD_EFFECT_PSYCHIC_POWER, param 10
const ITEM_DEEP_SEA_TOOTH = 192;
const ITEM_DEEP_SEA_SCALE = 193;
const ITEM_LIGHT_BALL = 202;
const ITEM_METAL_POWDER = 223;
const ITEM_THICK_CLUB = 224;
const ITEM_ENIGMA_BERRY = 175;

const ABILITY_HUGE_POWER = 37;
const ABILITY_PURE_POWER = 74;
const ABILITY_HUSTLE = 55;
const ABILITY_PLUS = 57;
const ABILITY_MINUS = 58;
const ABILITY_GUTS = 62;
const ABILITY_MARVEL_SCALE = 63;
const SPECIES_PIKACHU = 25;
const SPECIES_CUBONE = 104;
const SPECIES_DITTO = 132;
const SPECIES_CLAMPERL = 373;
const STATUS1_BURN = 1 << 4;
const STATUS1_POISON = 1 << 0;

function defaultBattlerSpec(index) {
  return {
    side: index % 2,
    ability: 0,
    item: 0,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    species: 1 + index,
    attack: 60 + index * 3,
    defense: 60 + index * 2,
    spAttack: 60 + index,
    spDefense: 60 + index * 4,
    level: 50,
    speed: 60,
    hp: 100,
    maxHP: 100,
    status1: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    helpingHand: 0,
  };
}

function canonicalBattler(spec, index) {
  return Object.freeze({
    side: spec.side,
    ability: spec.ability,
    hp: spec.hp,
    maxHP: spec.maxHP,
    moves: Object.freeze([278, 33, 45, 98]),
    pp: Object.freeze([10, 20, 15, 25]),
    status1: spec.status1,
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
    item: spec.item,
    statStages: Object.freeze(spec.statStages.slice()),
    types: Object.freeze(spec.types.slice()),
    species: spec.species,
    attack: spec.attack,
    defense: spec.defense,
    spAttack: spec.spAttack,
    spDefense: spec.spDefense,
    speed: spec.speed,
    level: spec.level,
    friendship: 70,
    partyIndex: index,
    helpingHand: spec.helpingHand,
  });
}

function canonicalRules({
  battlerSpecs, attacker, target, battlersCount = 2, absentBattlerFlags = 0,
  sideStatuses = [0, 0], futureSightCounter = [0, 0, 0, 0], futureSightMove = [0, 0, 0, 0],
  futureSightAttacker = [0, 0, 0, 0], futureSightDmg = [0, 0, 0, 0], currentMove = MOVE_FUTURE_SIGHT,
  multistringChooser = 0xff, enigmaBerryHoldEffects = [0, 0, 0, 0], enigmaBerryHoldEffectParams = [0, 0, 0, 0],
}) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray(battlerSpecs.map(canonicalBattler)),
    selectorRoles: Object.freeze({ attacker, target, effectBattler: target }),
    scriptingBattler: attacker ?? 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
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
      battlersCount,
      battleTypeFlags: battlersCount === 4 ? (1 << 0) : 0,
      battlerPositions: battlersCount === 4 ? Object.freeze([0, 1, 2, 3]) : Object.freeze([0, 1, 0xff, 0xff]),
    }),
    absentBattlerFlags,
    sideStatuses: freezeArray(sideStatuses),
    futureSightCounter: freezeArray(futureSightCounter),
    futureSightMove: freezeArray(futureSightMove),
    futureSightAttacker: freezeArray(futureSightAttacker),
    futureSightDmg: freezeArray(futureSightDmg),
    multistringChooser,
    enigmaBerryHoldEffects: freezeArray(enigmaBerryHoldEffects),
    enigmaBerryHoldEffectParams: freezeArray(enigmaBerryHoldEffectParams),
  });
}

function resolvedHoldEffect(rules, id) {
  return rulesModule.resolveBattleScriptBattlerHoldEffect(rules, id);
}
function resolvedHoldEffectParam(rules, id) {
  return rulesModule.resolveBattleScriptBattlerHoldEffectParam(rules, id);
}

function typeId(name) {
  const id = TYPE_NAME_TO_ID[name];
  assert(id !== undefined, `unknown type name ${name}`);
  return id;
}

// Projects the canonical rules context into exactly the fields the narrow
// Rust rules struct carries -- hold effect/param already resolved through
// the canonical resolver (Enigma Berry included), never the raw item id.
function projectRules(rules) {
  return Object.freeze({
    battlers: freezeArray(BATTLERS.map((id) => {
      const b = rules.battlers[id];
      return Object.freeze({
        side: b.side,
        attack: b.attack,
        defense: b.defense,
        spAttack: b.spAttack,
        spDefense: b.spDefense,
        level: b.level,
        types: freezeArray(b.types.map(typeId)),
        statStages: Object.freeze({ atk: b.statStages[1], def: b.statStages[2], spAtk: b.statStages[4], spDef: b.statStages[5] }),
        hp: b.hp,
        status1: b.status1,
        ability: b.ability,
        species: b.species,
        holdEffect: resolvedHoldEffect(rules, id),
        holdEffectParam: resolvedHoldEffectParam(rules, id),
        helpingHand: b.helpingHand ?? 0,
      });
    })),
    battlersCount: rules.battleTopology.battlersCount,
    absentBattlerFlags: rules.absentBattlerFlags,
    sideStatuses: freezeArray(rules.sideStatuses),
    futureSightCounter: freezeArray(rules.futureSightCounter),
    futureSightMove: freezeArray(rules.futureSightMove),
    futureSightAttacker: freezeArray(rules.futureSightAttacker),
    futureSightDmg: freezeArray(rules.futureSightDmg),
    currentMove: rules.currentMove,
    multistringChooser: rules.multistringChooser,
  });
}

function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = program.instructions.filter((value) => value.opcodeName === OPCODE_NAME);
assert(canonicalInstructions.length === 1, "canonical trysetfutureattack singleton drifted");
const canonicalInstruction = canonicalInstructions[0];
assert(canonicalInstruction.opcodeId === OPCODE_ID, "opcode identity drifted");
assert(canonicalInstruction.dispatcher === DISPATCHER, "dispatcher drifted");
assert(canonicalInstruction.programCounter === 1304, "instruction program counter drifted");
assert(canonicalInstruction.operands[0]?.expression === FAILURE_LABEL, "failure label drifted");
assert(
  programModule.resolveBattleScriptLabel(program, FAILURE_LABEL)?.programCounter === 1434,
  "failure resolution drifted",
);
assert(!programModule.resolveBattleScriptLabel(program, UNRESOLVED_POINTER), "unresolved label unexpectedly exists");
const handlers = opcodeModule.createBattleScriptTrysetfutureattackOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical trysetfutureattack handler did not register");

function freezeInstructionSpec({
  opcodeName = OPCODE_NAME, opcodeId = OPCODE_ID, dispatcher = DISPATCHER,
  operandWidths = [4], operandExpressions = [FAILURE_LABEL],
} = {}) {
  return Object.freeze({
    opcodeName, opcodeId, dispatcher,
    operandWidths: freezeArray(operandWidths), operandExpressions: freezeArray(operandExpressions),
  });
}
const CANONICAL_SPEC = freezeInstructionSpec();

function instructionFromSpec(spec) {
  const operands = spec.operandWidths.map((widthBytes, index) => Object.freeze({
    ...canonicalInstruction.operands[0], widthBytes, expression: spec.operandExpressions[index],
  }));
  return Object.freeze({
    ...canonicalInstruction, opcodeName: spec.opcodeName, opcodeId: spec.opcodeId,
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

function sourceOutcome(rulesSpec, instructionSpec) {
  const rules = canonicalRules(rulesSpec);
  const before = projectRules(rules);
  const instruction = instructionFromSpec(instructionSpec);
  try {
    const scaffold = machineModule.createBattleScriptMachine(program, ENTRY_LABEL, rules, 0x1357_9bdf);
    const state = Object.freeze({ ...scaffold, programCounter: canonicalInstruction.programCounter });
    const transition = handler({ program, instruction, state });
    assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
    assert(same(projectRules(rules), before), "canonical handler mutated input rules");
    assert((transition.events ?? []).length === 0, "trysetfutureattack must never emit events");
    const control = controlFromTransition(transition);
    return Object.freeze({
      expectedRules: projectRules(transition.rulesContext), control, error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    return Object.freeze({ expectedRules: null, control: null, error: error.message });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return outcome.control.kind;
  if (outcome.error === "Cmd_trysetfutureattack requires exactly one four-byte script pointer") return "invalid-execution-shape";
  if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
  if (outcome.error.includes("requires a target role")) return "missing-target-role";
  if (outcome.error.startsWith("Cmd_trysetfutureattack unresolved target")) return "unresolved-target";
  throw new Error(`unknown canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, rulesSpec, instructionSpec = CANONICAL_SPEC) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(rulesSpec, instructionSpec);
  cases.push(Object.freeze({
    label, category, branch: branchFor(outcome),
    attacker: rulesSpec.attacker, target: rulesSpec.target,
    initial: projectRules(canonicalRules(rulesSpec)),
    instruction: vectorInstruction(instructionSpec),
    ...outcome,
  }));
}

function baseSpec(overrides = {}) {
  const battlerSpecs = BATTLERS.map((index) => defaultBattlerSpec(index));
  return { battlerSpecs, attacker: 0, target: 1, ...overrides };
}

function withBattler(spec, index, changes) {
  const battlerSpecs = spec.battlerSpecs.map((value, i) => (i === index ? { ...value, ...changes } : value));
  return { ...spec, battlerSpecs };
}

// --- Behavior: role topology across battlersCount 2 and 4 -----------------
for (const battlersCount of [2, 4]) {
  for (const attacker of BATTLERS.slice(0, battlersCount)) {
    for (const target of BATTLERS.slice(0, battlersCount)) {
      if (attacker === target) continue;
      const move = (attacker + target) % 2 === 0 ? MOVE_FUTURE_SIGHT : MOVE_DOOM_DESIRE;
      addCase(
        `role_bc${battlersCount}_a${attacker}_t${target}`,
        "role-topology",
        baseSpec({ attacker, target, battlersCount, currentMove: move }),
      );
    }
  }
}

// --- Behavior: occupied counter fail jump + laziness proof -----------------
for (const counterValue of [1, 2, 3]) {
  const futureSightCounter = [0, 0, 0, 0];
  futureSightCounter[1] = counterValue;
  addCase(`occupied_counter_${counterValue}`, "occupied-counter-fail", baseSpec({ futureSightCounter }));
}
{
  const futureSightCounter = [0, 2, 0, 0];
  addCase(
    "unresolved_target_on_fail_branch", "late-label-resolution",
    baseSpec({ futureSightCounter }),
    freezeInstructionSpec({ operandExpressions: [UNRESOLVED_POINTER] }),
  );
  addCase(
    "unresolved_target_on_success_branch_is_lazy", "late-label-resolution",
    baseSpec({ futureSightCounter: [0, 0, 0, 0] }),
    freezeInstructionSpec({ operandExpressions: [UNRESOLVED_POINTER] }),
  );
}

// --- Behavior: helping hand truncation (odd damage) ------------------------
for (const helpingHand of [0, 1]) {
  let spec = baseSpec({ currentMove: MOVE_FUTURE_SIGHT });
  spec = withBattler(spec, 0, { helpingHand, attack: 63, spAttack: 61 });
  addCase(`helping_hand_${helpingHand}`, "helping-hand-truncation", spec);
}

// --- Behavior: stat-modifier families (each pinned from canonical TS) -----
function familyCase(label, spec) {
  addCase(label, "stat-modifier-family", spec);
}
familyCase("huge_power", withBattler(baseSpec({ currentMove: MOVE_DOOM_DESIRE }), 0, { ability: ABILITY_HUGE_POWER }));
familyCase("pure_power", withBattler(baseSpec({ currentMove: MOVE_DOOM_DESIRE }), 0, { ability: ABILITY_PURE_POWER }));
familyCase(
  "type_boost_item_psychic",
  withBattler(baseSpec({ currentMove: MOVE_FUTURE_SIGHT }), 0, { item: ITEM_TWISTED_SPOON }),
);
familyCase(
  "type_boost_item_steel",
  withBattler(baseSpec({ currentMove: MOVE_DOOM_DESIRE }), 0, { item: ITEM_METAL_COAT }),
);
familyCase("choice_band", withBattler(baseSpec({ currentMove: MOVE_DOOM_DESIRE }), 0, { item: ITEM_CHOICE_BAND }));
familyCase(
  "deep_sea_tooth_attacker",
  withBattler(baseSpec({ currentMove: MOVE_FUTURE_SIGHT }), 0, { item: ITEM_DEEP_SEA_TOOTH, species: SPECIES_CLAMPERL }),
);
familyCase(
  "deep_sea_scale_defender",
  withBattler(baseSpec({ currentMove: MOVE_FUTURE_SIGHT }), 1, { item: ITEM_DEEP_SEA_SCALE, species: SPECIES_CLAMPERL }),
);
familyCase(
  "light_ball",
  withBattler(baseSpec({ currentMove: MOVE_FUTURE_SIGHT }), 0, { item: ITEM_LIGHT_BALL, species: SPECIES_PIKACHU }),
);
familyCase(
  "metal_powder",
  withBattler(baseSpec({ currentMove: MOVE_DOOM_DESIRE }), 1, { item: ITEM_METAL_POWDER, species: SPECIES_DITTO }),
);
familyCase(
  "thick_club",
  withBattler(baseSpec({ currentMove: MOVE_DOOM_DESIRE }), 0, { item: ITEM_THICK_CLUB, species: SPECIES_CUBONE }),
);
familyCase("hustle", withBattler(baseSpec({ currentMove: MOVE_DOOM_DESIRE }), 0, { ability: ABILITY_HUSTLE }));
{
  let spec = baseSpec({ currentMove: MOVE_FUTURE_SIGHT, battlersCount: 4, attacker: 0, target: 2 });
  spec = withBattler(spec, 0, { ability: ABILITY_PLUS });
  spec = withBattler(spec, 1, { ability: ABILITY_MINUS });
  familyCase("plus_minus_present", spec);
}
{
  // Counterpart ability present but absent/fainted: excluded from the scan.
  let spec = baseSpec({ currentMove: MOVE_FUTURE_SIGHT, battlersCount: 4, attacker: 0, target: 2, absentBattlerFlags: 1 << 1 });
  spec = withBattler(spec, 0, { ability: ABILITY_PLUS });
  spec = withBattler(spec, 1, { ability: ABILITY_MINUS, hp: 0 });
  familyCase("plus_minus_absent_excluded", spec);
}
familyCase(
  "guts",
  withBattler(withBattler(baseSpec({ currentMove: MOVE_DOOM_DESIRE }), 0, { ability: ABILITY_GUTS }), 0, { status1: STATUS1_POISON }),
);
familyCase(
  "guts_with_burn_negates_halving",
  withBattler(withBattler(baseSpec({ currentMove: MOVE_DOOM_DESIRE }), 0, { ability: ABILITY_GUTS }), 0, { status1: STATUS1_BURN }),
);
familyCase(
  "burned_without_guts_halves",
  withBattler(baseSpec({ currentMove: MOVE_DOOM_DESIRE }), 0, { status1: STATUS1_BURN }),
);
familyCase(
  "marvel_scale",
  withBattler(withBattler(baseSpec({ currentMove: MOVE_DOOM_DESIRE }), 1, { ability: ABILITY_MARVEL_SCALE }), 1, { status1: STATUS1_POISON }),
);
{
  const spec = { ...baseSpec({ currentMove: MOVE_FUTURE_SIGHT }), enigmaBerryHoldEffects: [57, 0, 0, 0], enigmaBerryHoldEffectParams: [10, 0, 0, 0] };
  familyCase("enigma_berry_psychic_power", withBattler(spec, 0, { item: ITEM_ENIGMA_BERRY }));
}

// --- Behavior: side statuses reflect/light screen + bitwise-or retention --
familyCase("reflect_on_defender_side", baseSpec({ currentMove: MOVE_DOOM_DESIRE, sideStatuses: [0, 1 << 0] }));
familyCase("light_screen_on_defender_side", baseSpec({ currentMove: MOVE_FUTURE_SIGHT, sideStatuses: [0, 1 << 1] }));
familyCase("side_status_futureattack_bit_preexisting_target_side", baseSpec({ sideStatuses: [0, 0x8000] }));
familyCase("side_status_futureattack_bit_preexisting_other_side", baseSpec({ sideStatuses: [0x4000, 0] }));

// --- Behavior: other battlers' future-sight cells retained -----------------
familyCase(
  "other_future_sight_cells_retained",
  baseSpec({
    futureSightCounter: [0, 0, 2, 3], futureSightMove: [0, 0, 248, 353],
    futureSightAttacker: [0, 0, 1, 3], futureSightDmg: [0, 0, 41, 42],
  }),
);

// --- Behavior: stat stages off-center ---------------------------------------
{
  let spec = baseSpec({ currentMove: MOVE_FUTURE_SIGHT });
  spec = withBattler(spec, 0, { statStages: [6, 8, 4, 6, 9, 6, 6, 6] });
  spec = withBattler(spec, 1, { statStages: [6, 3, 10, 6, 6, 5, 6, 6] });
  familyCase("stat_stages_off_center", spec);
}

// --- Behavior: malformed execution shapes precede role checks --------------
for (const [label, spec] of [
  ["malformed_no_operand", freezeInstructionSpec({ operandWidths: [], operandExpressions: [] })],
  ["malformed_two_operands", freezeInstructionSpec({ operandWidths: [4, 4], operandExpressions: [FAILURE_LABEL, FAILURE_LABEL] })],
  ["malformed_pointer_width", freezeInstructionSpec({ operandWidths: [1] })],
]) {
  addCase(label, "malformed-shape-precedes-role", baseSpec(), spec);
}

// --- Registration ------------------------------------------------------
function sourceRegistration(specs) {
  const instructions = freezeArray(specs.map(instructionFromSpec));
  const customProgram = Object.freeze({ ...program, instructions });
  try {
    const registered = opcodeModule.createBattleScriptTrysetfutureattackOpcodeHandlers(customProgram);
    const keys = Object.keys(registered);
    assert(keys.length === 1, "canonical registration emitted more than one key");
    return Object.freeze({ opcodeId: Number(keys[0]), error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ opcodeId: null, error: error.message });
  }
}
const registrationCases = [];
function addRegistration(label, specs) {
  const outcome = sourceRegistration(specs);
  registrationCases.push(Object.freeze({
    label, instructions: freezeArray(specs.map(vectorInstruction)),
    expectedOpcodeId: outcome.opcodeId, expectedError: outcome.error,
  }));
}
const noise = freezeInstructionSpec({ opcodeName: "B_SCR_OP_RUST_NOISE", opcodeId: 0, dispatcher: "Cmd_noise", operandWidths: [], operandExpressions: [] });
addRegistration("one_start", [CANONICAL_SPEC]);
addRegistration("one_start_ignores_noise", [noise, CANONICAL_SPEC, noise]);
addRegistration("wrong_cardinality_zero", []);
addRegistration("wrong_cardinality_two", [CANONICAL_SPEC, CANONICAL_SPEC]);
addRegistration("malformed_wrong_opcode", [freezeInstructionSpec({ opcodeId: 0xc4 })]);
addRegistration("malformed_wrong_dispatcher", [freezeInstructionSpec({ dispatcher: "Cmd_settypetoenvironment" })]);
addRegistration("malformed_zero_operands", [freezeInstructionSpec({ operandWidths: [], operandExpressions: [] })]);
addRegistration("malformed_one_byte_operand", [freezeInstructionSpec({ operandWidths: [1] })]);

// --- calculateFutureAttackBaseDamage error replay (not-a-future-move) -----
function sourceDamageError(rulesSpec, moveId) {
  const rules = canonicalRules(rulesSpec);
  try {
    opcodeModule.calculateFutureAttackBaseDamage(rules, rulesSpec.attacker, rulesSpec.target, moveId);
    throw new Error("expected calculateFutureAttackBaseDamage to throw");
  } catch (error) {
    return error.message;
  }
}
const notAFutureMoveMessage = sourceDamageError(baseSpec(), 33);
assert(
  notAFutureMoveMessage === "Cmd_trysetfutureattack requires Future Sight or Doom Desire, got 33",
  `not-a-future-move message drifted: ${notAFutureMoveMessage}`,
);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}
const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const registrationBranchCensus = census(registrationCases, (value) => (
  value.expectedError === null ? "registered"
    : value.expectedError.startsWith("expected one") ? "wrong-cardinality"
      : "invalid-shape"
));
const domainCensus = Object.freeze([
  ["source-battler-slots", 4],
  ["registration-cases", registrationCases.length],
  ["not-a-future-move-pinned", 1],
]);

const corpus = Object.freeze({ domainCensus, categoryCensus, branchCensus, registrationBranchCensus, cases, registrationCases, notAFutureMoveMessage });
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");

function rustControl(value) {
  if (value === null) return "None";
  return value.kind === "advance" ? "Some(BattleScriptTrysetfutureattackControl::Advance)"
    : `Some(BattleScriptTrysetfutureattackControl::Jump { program_counter: ${value.programCounter} })`;
}
function rustStatStages(value) {
  return `StatStages { atk: ${value.atk}, def: ${value.def}, sp_atk: ${value.spAtk}, sp_def: ${value.spDef} }`;
}
function rustBattlerState(value) {
  return [
    "BattleScriptTrysetfutureattackVectorBattlerState {",
    `side: ${side(value.side)}, attack: ${rustI32(value.attack)}, defense: ${rustI32(value.defense)},`,
    `sp_attack: ${rustI32(value.spAttack)}, sp_defense: ${rustI32(value.spDefense)}, level: ${rustI32(value.level)},`,
    `types: [${value.types.join(", ")}], stat_stages: ${rustStatStages(value.statStages)},`,
    `hp: ${hex16(value.hp)}, status1: ${value.status1}u32, ability: ${hex16(value.ability)}, species: ${hex16(value.species)},`,
    `hold_effect: ${hex16(value.holdEffect)}, hold_effect_param: ${rustI32(value.holdEffectParam)}, helping_hand: ${value.helpingHand}u8,`,
    "}",
  ].join(" ");
}
function rustArr4(values, hex = hex16) { return `[${values.map(hex).join(", ")}]`; }
function rustState(value) {
  return [
    "BattleScriptTrysetfutureattackVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `battlers_count: ${value.battlersCount}u8, absent_battler_flags: ${value.absentBattlerFlags}u32,`,
    `side_statuses: ${rustArr4(value.sideStatuses)},`,
    `future_sight_counter: [${value.futureSightCounter.map((v) => `${v}u8`).join(", ")}],`,
    `future_sight_move: ${rustArr4(value.futureSightMove)},`,
    `future_sight_attacker: [${value.futureSightAttacker.map((v) => `${v}u8`).join(", ")}],`,
    `future_sight_dmg: [${value.futureSightDmg.map(rustI32).join(", ")}],`,
    `current_move: ${hex16(value.currentMove)}, multistring_chooser: ${value.multistringChooser}u8,`,
    "}",
  ].join(" ");
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustInstruction(value) {
  const operands = value.operandWidths.map((width, index) =>
    `BattleScriptTrysetfutureattackOperand { width_bytes: ${width}, expression: ${rustString(value.operandExpressions[index])} }`);
  const resolved = value.resolvedExpression === null ? "None"
    : `Some(BattleScriptTrysetfutureattackResolvedLabel { expression: ${rustString(value.resolvedExpression)}, program_counter: ${value.resolvedProgramCounter} })`;
  return `BattleScriptTrysetfutureattackInstruction { opcode_name: ${rustString(value.opcodeName)}, program_counter: ${value.programCounter}, opcode_id: ${hex8(value.opcodeId)}, dispatcher: ${rustString(value.dispatcher)}, operands: &[${operands.join(", ")}], resolved_target: ${resolved} }`;
}
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-trysetfutureattack-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTrysetfutureattackOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_trysetfutureattack::{");
lines.push("    BattleScriptTrysetfutureattackControl, BattleScriptTrysetfutureattackInstruction,");
lines.push("    BattleScriptTrysetfutureattackOperand, BattleScriptTrysetfutureattackResolvedLabel,");
lines.push("    BattleScriptTrysetfutureattackSide,");
lines.push("};");
lines.push("use crate::damage_calc::StatStages;");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`);
lines.push(`pub const BATTLE_SCRIPT_TRYSETFUTUREATTACK_NOT_A_FUTURE_MOVE_MESSAGE: &str = ${rustString(notAFutureMoveMessage)};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetfutureattackVectorBattlerState { pub side: BattleScriptTrysetfutureattackSide, pub attack: i32, pub defense: i32, pub sp_attack: i32, pub sp_defense: i32, pub level: i32, pub types: [u8; 2], pub stat_stages: StatStages, pub hp: u16, pub status1: u32, pub ability: u16, pub species: u16, pub hold_effect: u16, pub hold_effect_param: i32, pub helping_hand: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetfutureattackVectorState { pub battlers: [BattleScriptTrysetfutureattackVectorBattlerState; 4], pub battlers_count: u8, pub absent_battler_flags: u32, pub side_statuses: [u16; 2], pub future_sight_counter: [u8; 4], pub future_sight_move: [u16; 4], pub future_sight_attacker: [u8; 4], pub future_sight_dmg: [i32; 4], pub current_move: u16, pub multistring_chooser: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetfutureattackVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub attacker: u8, pub target: u8, pub initial: BattleScriptTrysetfutureattackVectorState, pub instruction: BattleScriptTrysetfutureattackInstruction<'static>, pub expected: Option<BattleScriptTrysetfutureattackVectorState>, pub control: Option<BattleScriptTrysetfutureattackControl>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTrysetfutureattackRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptTrysetfutureattackInstruction<'static>], pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSETFUTUREATTACK_DOMAIN_CENSUS", domainCensus, "u64"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSETFUTUREATTACK_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSETFUTUREATTACK_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYSETFUTUREATTACK_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYSETFUTUREATTACK_CASES: [BattleScriptTrysetfutureattackVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrysetfutureattackVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        attacker: ${value.attacker}u8, target: ${value.target}u8,`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        expected: ${rustOptionalState(value.expectedRules)},`);
  lines.push(`        control: ${rustControl(value.control)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.error)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_TRYSETFUTUREATTACK_REGISTRATION_CASES: [BattleScriptTrysetfutureattackRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTrysetfutureattackRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, instructions: &[${value.instructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        expected_opcode_id: ${value.expectedOpcodeId === null ? "None" : `Some(${hex8(value.expectedOpcodeId)})`}, expected_error: ${rustOptionalString(value.expectedError)},`);
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
if (!formatted) throw new Error("gen-battle-script-trysetfutureattack-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES, `generated file ${generated.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
