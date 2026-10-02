#!/usr/bin/env node
// Differential corpus for the B_SCR_OP_TYPECALC (0x06) leaf --
// `typecalcOpcodeHandler` in src/engine/battleScriptHitChainOpcode.ts
// (:1631-1710, doc comment :1628-1645).
//
// Expected damage/flags/error values come only from executing the canonical
// TypeScript handler -- reached through the real
// `createBattleScriptHitChainOpcodeHandlers` factory and a real committed
// typecalc instruction from the loaded program -- plus, for the
// missing-opcode registration case only, a custom program with every
// typecalc instruction filtered out. This generator owns bounded input
// construction and Rust literal emission; it must never reimplement
// applyStab, the type-effectiveness table lookup, or the flag algebra.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-typecalc-vectors.mjs

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
  "battle_script_typecalc_vectors_gen.rs",
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

const TYPECALC_NAME = "B_SCR_OP_TYPECALC";
const TYPECALC_ID = 0x06;
const TYPECALC_DISPATCHER = "Cmd_typecalc";
const ENTRY_LABEL = "BattleScript_EffectStockpile"; // any valid label; programCounter is overridden.
const STATUS2_FORESIGHT = 1 << 29;
const MOVE_STRUGGLE = 165;
const ABILITY_LEVITATE = 26;
const ABILITY_WONDER_GUARD = 25;
const MOVE_RESULT_MISSED = 1 << 0;
const MOVE_RESULT_SUPER_EFFECTIVE = 1 << 1;
const MOVE_RESULT_NOT_VERY_EFFECTIVE = 1 << 2;
const MOVE_RESULT_DOESNT_AFFECT_FOE = 1 << 3;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-typecalc-vectors: ${message}`);
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
const MOVE_TACKLE = 33; // TYPE_NORMAL, power 35
const MOVE_THUNDERBOLT = 84; // TYPE_ELECTRIC, power 40
const MOVE_STATUS_ZERO_POWER = 0; // TYPE_NORMAL, power 0
const MOVE_DARK_44 = 44; // TYPE_DARK, power 60 (super effective vs Ghost)

function defaultBattlerSpec(index) {
  return {
    side: index % 2, ability: 0, item: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"], species: 1 + index,
    attack: 60 + index * 3, defense: 60 + index * 2, spAttack: 60 + index, spDefense: 60 + index * 4,
    level: 50, hp: 100, maxHP: 100, status1: 0, status2: 0, status3: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6], flashFireBoosted: 0, helpingHand: 0,
  };
}

function canonicalBattler(spec, index) {
  return Object.freeze({
    side: spec.side, ability: spec.ability, hp: spec.hp, maxHP: spec.maxHP,
    moves: Object.freeze([278, 33, 45, 98]), pp: Object.freeze([10, 20, 15, 25]),
    status1: spec.status1, status2: spec.status2, status3: spec.status3,
    substituteHP: 0, rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0, rechargeTimer: 0,
    flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0, tauntTimer: 0, usedTauntedMove: 0,
    usedImprisonedMove: 0, item: spec.item, statStages: Object.freeze(spec.statStages.slice()),
    types: Object.freeze(spec.types.slice()), species: spec.species,
    attack: spec.attack, defense: spec.defense, spAttack: spec.spAttack, spDefense: spec.spDefense,
    speed: 60, level: spec.level, friendship: 70, partyIndex: index,
    flashFireBoosted: spec.flashFireBoosted, helpingHand: spec.helpingHand,
    targetNotAffected: 0,
  });
}

function canonicalRulesRaw({
  battlerSpecs, attacker, target, battlersCount = 2,
  currentMove = MOVE_TACKLE, dynamicMoveType = 0,
  battleMoveDamage = 10, moveResultFlags = 0, missType = 0, lastUsedAbility = 0,
  lastLandedMoves = [1, 2, 3, 4], lastHitByType = [5, 6, 7, 8],
  aiObservedAbilityIds = [0, 0, 0, 0],
  battleTypeFlags = battlersCount === 4 ? 1 << 0 : 0,
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
    critMultiplier: 1,
    moveEffectByte: 0,
    missType,
    hitMarker: 0,
    multiHitCounter: 0,
    lastUsedAbility,
    lastUsedItem: 0,
    usedHeldItems: Object.freeze([0, 0, 0, 0]),
    lastLandedMoves: freezeArray(lastLandedMoves),
    lastHitByType: freezeArray(lastHitByType),
    aiObservedAbilityIds: freezeArray(aiObservedAbilityIds),
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
    dynamicBasePower: 0,
    dynamicMoveType,
    weather: 0,
    enigmaBerryHoldEffects: freezeArray([0, 0, 0, 0]),
    enigmaBerryHoldEffectParams: freezeArray([0, 0, 0, 0]),
    battleMoveDamage,
  });
}

// Same "safe placeholder, then splice" trick as the damagecalc/base-damage
// generators: `createBattleScriptRulesContext` eagerly resolves
// `currentMoveEffect` from `currentMove` at construction time, which throws
// BEFORE the typecalc handler's own `requireMoveRow` ever runs. Construction
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
    types: freezeArray(b.types.map((t) => TYPE_NAME_TO_ID[t])),
    ability: b.ability, status2: b.status2, targetNotAffected: b.targetNotAffected,
  });
}
function projectRules(rules) {
  return Object.freeze({
    battlers: freezeArray(rules.battlers.map(projectBattler)),
    currentMove: rules.currentMove,
    dynamicMoveType: rules.dynamicMoveType,
    battleMoveDamage: rules.battleMoveDamage,
    moveResultFlags: rules.moveResultFlags,
    missType: rules.missType,
    lastUsedAbility: rules.lastUsedAbility,
    lastLandedMoves: freezeArray(rules.moveHistory.lastLandedMoves),
    lastHitByType: freezeArray(rules.moveHistory.lastHitByType),
    aiObservedAbilityIds: freezeArray(rules.aiObservedAbilityIds),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
  });
}
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

const program = programModule.loadBattleScriptProgram();
const typecalcInstructions = program.instructions.filter((value) => value.opcodeName === TYPECALC_NAME);
assert(typecalcInstructions.length === 23, `typecalc concrete-start count drifted: ${typecalcInstructions.length}`);
for (const instruction of typecalcInstructions) {
  assert(instruction.opcodeId === TYPECALC_ID, "typecalc opcode id drifted");
  assert(instruction.dispatcher === TYPECALC_DISPATCHER, "typecalc dispatcher drifted");
  assert(instruction.operands.length === 0, "typecalc unexpectedly carries operands");
}
const firstInstruction = typecalcInstructions[0];

const ports = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: () => {},
  resolveBattlerForBattleScript: () => 0,
});
const handlers = opcodeModule.createBattleScriptHitChainOpcodeHandlers(program, ports);
const typecalcHandler = handlers[TYPECALC_ID];
assert(typeof typecalcHandler === "function", "typecalc handler did not register");

function instructionSpec() {
  return Object.freeze({
    opcodeName: TYPECALC_NAME, opcodeId: TYPECALC_ID, dispatcher: TYPECALC_DISPATCHER,
    programCounter: firstInstruction.programCounter,
  });
}

function sourceOutcome(rulesSpec) {
  const rules = canonicalRules(rulesSpec);
  const before = projectRules(rules);
  try {
    const scaffold = machineModule.createBattleScriptMachine(program, ENTRY_LABEL, rules, 0x2244_6688);
    const state = Object.freeze({ ...scaffold, programCounter: firstInstruction.programCounter });
    const transition = typecalcHandler({ program, instruction: instructionSpec(), state });
    assert(Object.isFrozen(transition.rulesContext ?? rules), "canonical output rules must be frozen");
    assert(same(projectRules(rules), before), "canonical handler mutated input rules");
    assert((transition.events ?? []).length === 0, "typecalc must never emit events");
    assert(transition.control.kind === "advance", "typecalc must always advance");
    const outRules = transition.rulesContext ?? rules;
    return Object.freeze({ expected: projectRules(outRules), error: null });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    return Object.freeze({ expected: null, error: error.message });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return "advance";
  if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
  if (outcome.error.includes("requires a target role")) return "missing-target-role";
  if (outcome.error.includes("has no source-derived gBattleMoves row")) return "unknown-move-row";
  if (outcome.error.includes("unknown numeric type id")) return "unknown-type-id";
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

// --- Struggle precedence -----------------------------------------------
addCase("struggle_advances_with_no_roles", "struggle", { ...baseSpec(), attacker: null, target: null, currentMove: MOVE_STRUGGLE });

// --- Role errors ---------------------------------------------------------
addCase("missing_attacker_role", "role-errors", { ...baseSpec(), attacker: null });
addCase("missing_target_role", "role-errors", { ...baseSpec(), target: null });
addCase("missing_attacker_wins_over_missing_target", "role-errors", { ...baseSpec(), attacker: null, target: null });

// --- Move-row-before-type-resolution precedence --------------------------
addCase("unknown_move_row_error", "move-resolution", baseSpec({ currentMove: 60000 }));
addCase(
  "unknown_move_row_wins_over_bad_dynamic_type", "move-resolution",
  baseSpec({ currentMove: 60000, dynamicMoveType: 0x3f }),
);
addCase("unknown_dynamic_type_id", "move-resolution", baseSpec({ dynamicMoveType: 0x3f }));
addCase("dynamic_type_masked_0x80_is_normal", "move-resolution", baseSpec({ dynamicMoveType: 0x80 }));

// --- STAB --------------------------------------------------------------
addCase("stab_single_type_attacker", "stab", withBattler(baseSpec(), 0, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }));
addCase("stab_dual_type_attacker_second_slot", "stab", withBattler(baseSpec(), 0, { types: ["TYPE_WATER", "TYPE_NORMAL"] }));
addCase("no_stab_mismatched_types", "stab", withBattler(baseSpec(), 0, { types: ["TYPE_WATER", "TYPE_FIRE"] }));

// --- Levitate short-circuit ----------------------------------------------
addCase(
  "levitate_static_ground_move", "levitate",
  withBattler(baseSpec({ currentMove: 89 /* EARTHQUAKE, TYPE_GROUND */ }), 1, { ability: ABILITY_LEVITATE }),
);
addCase(
  "levitate_via_dynamic_ground_type", "levitate",
  withBattler(baseSpec({ dynamicMoveType: TYPE_NAME_TO_ID.TYPE_GROUND }), 1, { ability: ABILITY_LEVITATE }),
);
addCase(
  "levitate_stab_still_applies", "levitate",
  withBattler(
    withBattler(baseSpec({ dynamicMoveType: TYPE_NAME_TO_ID.TYPE_GROUND }), 0, { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }),
    1, { ability: ABILITY_LEVITATE },
  ),
);
addCase(
  "levitate_preserves_prior_flag_bits", "levitate",
  withBattler(
    baseSpec({ dynamicMoveType: TYPE_NAME_TO_ID.TYPE_GROUND, moveResultFlags: MOVE_RESULT_SUPER_EFFECTIVE }),
    1, { ability: ABILITY_LEVITATE },
  ),
);
addCase(
  "levitate_reveal_writes_when_unobserved", "levitate",
  withBattler(baseSpec({ dynamicMoveType: TYPE_NAME_TO_ID.TYPE_GROUND }), 1, { ability: ABILITY_LEVITATE }),
);
addCase(
  "levitate_reveal_is_identity_when_already_observed", "levitate",
  withBattler(
    baseSpec({ dynamicMoveType: TYPE_NAME_TO_ID.TYPE_GROUND, aiObservedAbilityIds: [0, ABILITY_LEVITATE, 0, 0] }),
    1, { ability: ABILITY_LEVITATE },
  ),
);
addCase(
  "levitate_clears_landed_cells_only_at_target", "levitate",
  withBattler(
    baseSpec({ dynamicMoveType: TYPE_NAME_TO_ID.TYPE_GROUND, lastLandedMoves: [9, 9, 9, 9], lastHitByType: [8, 8, 8, 8] }),
    1, { ability: ABILITY_LEVITATE },
  ),
);
addCase(
  "not_ground_move_no_levitate_miss", "levitate",
  withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 1, { ability: ABILITY_LEVITATE }),
);

// --- Type loop: immunity flag algebra -------------------------------------
addCase(
  "immune_matchup_clears_prior_se_and_nve", "type-loop-immune",
  withBattler(
    baseSpec({ currentMove: MOVE_TACKLE, moveResultFlags: MOVE_RESULT_SUPER_EFFECTIVE | MOVE_RESULT_NOT_VERY_EFFECTIVE }),
    1, { types: ["TYPE_GHOST", "TYPE_GHOST"] },
  ),
);
addCase(
  "fighting_immune_to_ghost", "type-loop-immune",
  withBattler(baseSpec({ currentMove: 2 /* KARATE_CHOP, TYPE_FIGHTING */ }), 1, { types: ["TYPE_GHOST", "TYPE_GHOST"] }),
);

// --- Type loop: 0.5x branch (SE-set-clears vs sets-NVE) -------------------
addCase(
  "half_effective_clears_prior_super_effective", "type-loop-half",
  withBattler(baseSpec({ currentMove: MOVE_THUNDERBOLT, moveResultFlags: MOVE_RESULT_SUPER_EFFECTIVE }), 1, { types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"] }),
);
addCase(
  "half_effective_sets_not_very_effective", "type-loop-half",
  withBattler(baseSpec({ currentMove: MOVE_THUNDERBOLT }), 1, { types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"] }),
);

// --- Type loop: 2x branch (symmetric) -------------------------------------
addCase(
  "double_effective_clears_prior_not_very_effective", "type-loop-double",
  withBattler(baseSpec({ currentMove: MOVE_THUNDERBOLT, moveResultFlags: MOVE_RESULT_NOT_VERY_EFFECTIVE }), 1, { types: ["TYPE_WATER", "TYPE_WATER"] }),
);
addCase(
  "double_effective_sets_super_effective", "type-loop-double",
  withBattler(baseSpec({ currentMove: MOVE_THUNDERBOLT }), 1, { types: ["TYPE_WATER", "TYPE_WATER"] }),
);

// --- Type loop: 4x dual (two entries, damage trunc twice) -----------------
addCase(
  "quadruple_effective_dual_type", "type-loop-quad",
  withBattler(baseSpec({ currentMove: MOVE_THUNDERBOLT }), 1, { types: ["TYPE_WATER", "TYPE_FLYING"] }),
);

// --- Type loop: min-1 floor ------------------------------------------------
addCase(
  "min_one_floor_on_tiny_damage", "type-loop-floor",
  withBattler(baseSpec({ currentMove: MOVE_THUNDERBOLT, battleMoveDamage: 1 }), 1, { types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"] }),
);

// --- Type loop: dual-type same-type dedup ---------------------------------
addCase(
  "dual_type_dedup_applies_once", "type-loop-dedup",
  withBattler(baseSpec({ currentMove: MOVE_THUNDERBOLT }), 1, { types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"] }),
);

// --- Type loop: power == 0 skips flag writes but not damage ---------------
addCase(
  "power_zero_skips_flag_write_not_damage", "type-loop-power-zero",
  withBattler(baseSpec({ currentMove: MOVE_STATUS_ZERO_POWER }), 1, { types: ["TYPE_ROCK", "TYPE_ROCK"] }),
);

// --- Type loop: NO_EFFECT-preset skips flag writes ------------------------
addCase(
  "no_effect_preset_skips_flag_write", "type-loop-no-effect-preset",
  withBattler(baseSpec({ currentMove: MOVE_THUNDERBOLT, moveResultFlags: MOVE_RESULT_MISSED | MOVE_RESULT_DOESNT_AFFECT_FOE | (1 << 5) }), 1, { types: ["TYPE_WATER", "TYPE_WATER"] }),
);

// --- Foresight ------------------------------------------------------------
addCase(
  "foresight_skips_ghost_for_normal", "foresight",
  withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 1, { types: ["TYPE_GHOST", "TYPE_GHOST"], status2: STATUS2_FORESIGHT }),
);
addCase(
  "foresight_skips_ghost_for_fighting", "foresight",
  withBattler(baseSpec({ currentMove: 2 /* KARATE_CHOP */ }), 1, { types: ["TYPE_GHOST", "TYPE_GHOST"], status2: STATUS2_FORESIGHT }),
);
addCase(
  "foresight_does_not_skip_ghost_for_dark_move", "foresight",
  withBattler(baseSpec({ currentMove: MOVE_DARK_44 }), 1, { types: ["TYPE_GHOST", "TYPE_GHOST"], status2: STATUS2_FORESIGHT }),
);
addCase(
  "foresight_without_ghost_defender_is_no_op", "foresight",
  withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 1, { types: ["TYPE_WATER", "TYPE_WATER"], status2: STATUS2_FORESIGHT }),
);

// --- Wonder Guard -----------------------------------------------------------
addCase(
  "wonder_guard_not_super_effective_misses", "wonder-guard",
  withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 1, { ability: ABILITY_WONDER_GUARD }),
);
addCase(
  "wonder_guard_super_effective_only_no_miss", "wonder-guard",
  withBattler(baseSpec({ currentMove: MOVE_THUNDERBOLT }), 1, { ability: ABILITY_WONDER_GUARD, types: ["TYPE_WATER", "TYPE_WATER"] }),
);
addCase(
  "wonder_guard_power_zero_no_miss", "wonder-guard",
  withBattler(baseSpec({ currentMove: MOVE_STATUS_ZERO_POWER }), 1, { ability: ABILITY_WONDER_GUARD }),
);
addCase(
  "wonder_guard_preset_super_and_not_very_effective_misses", "wonder-guard",
  withBattler(baseSpec({ currentMove: MOVE_TACKLE, moveResultFlags: MOVE_RESULT_SUPER_EFFECTIVE | MOVE_RESULT_NOT_VERY_EFFECTIVE }), 1, { ability: ABILITY_WONDER_GUARD }),
);
addCase(
  "wonder_guard_reveal_identity_when_already_observed", "wonder-guard",
  withBattler(baseSpec({ currentMove: MOVE_TACKLE, aiObservedAbilityIds: [0, ABILITY_WONDER_GUARD, 0, 0] }), 1, { ability: ABILITY_WONDER_GUARD }),
);

// --- targetNotAffected --------------------------------------------------
addCase(
  "target_not_affected_set_on_doesnt_affect_foe", "target-not-affected",
  withBattler(baseSpec({ currentMove: MOVE_TACKLE }), 1, { types: ["TYPE_GHOST", "TYPE_GHOST"] }),
);
addCase(
  "target_not_affected_unset_when_move_lands", "target-not-affected",
  baseSpec({ currentMove: MOVE_TACKLE }),
);

const uniqueLabels = new Set(cases.map((value) => value.label));
assert(uniqueLabels.size === cases.length, "duplicate case labels");

// === Registration ============================================================
function sourceRegistration(instructions) {
  const customProgram = Object.freeze({ ...program, instructions: freezeArray(instructions) });
  try {
    const registered = opcodeModule.createBattleScriptHitChainOpcodeHandlers(customProgram, ports);
    assert(typeof registered[TYPECALC_ID] === "function", "typecalc handler missing after successful registration");
    return Object.freeze({ registeredOpcodeId: TYPECALC_ID, error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ registeredOpcodeId: null, error: error.message });
  }
}
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
  dedupedInstructions.some((value) => value.opcodeName === TYPECALC_NAME),
  "deduplicated program lost the typecalc entry",
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
  "typecalc_missing_from_program",
  dedupedInstructions.filter((value) => value.opcodeName !== TYPECALC_NAME),
);
addRegistration(
  "duplicate_later_entry_ignored_find_first",
  [...dedupedInstructions, Object.freeze({
    opcodeName: TYPECALC_NAME, opcodeId: 0xee, programCounter: 999_999,
    dispatcher: TYPECALC_DISPATCHER, operands: [],
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

function rustArr4u16(values) { return `[${values.map(hex16).join(", ")}]`; }
function rustArr4u8(values) { return `[${values.map(hex8).join(", ")}]`; }
function rustOptionU8(value) { return value === null || value === undefined ? "None" : `Some(${value}u8)`; }
function rustOptionalU8Hex(value) { return value === null || value === undefined ? "None" : `Some(${hex8(value)})`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustBattlerState(value) {
  return `BattleScriptTypecalcVectorBattlerState { types: [${value.types.join(", ")}], ability: ${hex16(value.ability)}, status2: ${hex32(value.status2)}, target_not_affected: ${value.targetNotAffected}u8 }`;
}
function rustState(value) {
  return [
    "BattleScriptTypecalcVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `current_move: ${hex16(value.currentMove)}, dynamic_move_type: ${value.dynamicMoveType}u8,`,
    `battle_move_damage: ${rustI32(value.battleMoveDamage)}, move_result_flags: ${hex32(value.moveResultFlags)},`,
    `miss_type: ${value.missType}u8, last_used_ability: ${hex16(value.lastUsedAbility)},`,
    `last_landed_moves: ${rustArr4u16(value.lastLandedMoves)}, last_hit_by_type: ${rustArr4u16(value.lastHitByType)},`,
    `ai_observed_ability_ids: ${rustArr4u8(value.aiObservedAbilityIds)},`,
    `attacker: ${rustOptionU8(value.attacker)}, target: ${rustOptionU8(value.target)},`,
    "}",
  ].join(" ");
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustInstruction(value) {
  return `BattleScriptTypecalcInstruction { opcode_name: ${rustString(value.opcodeName)}, opcode_id: ${hex8(value.opcodeId)}, program_counter: ${value.programCounter} }`;
}
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-typecalc-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptHitChainOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_typecalc::BattleScriptTypecalcInstruction;");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TYPECALC_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TYPECALC_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_TYPECALC_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TYPECALC_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`);
lines.push(`pub const BATTLE_SCRIPT_TYPECALC_CONCRETE_CALL_SITE_COUNT: usize = ${typecalcInstructions.length};`);
lines.push(`pub const BATTLE_SCRIPT_TYPECALC_FIRST_PROGRAM_COUNTER: u32 = ${firstInstruction.programCounter};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTypecalcVectorBattlerState { pub types: [u8; 2], pub ability: u16, pub status2: u32, pub target_not_affected: u8 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTypecalcVectorState { pub battlers: [BattleScriptTypecalcVectorBattlerState; 4], pub current_move: u16, pub dynamic_move_type: u8, pub battle_move_damage: i32, pub move_result_flags: u32, pub miss_type: u8, pub last_used_ability: u16, pub last_landed_moves: [u16; 4], pub last_hit_by_type: [u16; 4], pub ai_observed_ability_ids: [u8; 4], pub attacker: Option<u8>, pub target: Option<u8> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTypecalcVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub initial: BattleScriptTypecalcVectorState, pub expected: Option<BattleScriptTypecalcVectorState>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTypecalcRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptTypecalcInstruction<'static>], pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TYPECALC_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TYPECALC_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TYPECALC_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TYPECALC_CASES: [BattleScriptTypecalcVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTypecalcVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.error)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_TYPECALC_REGISTRATION_CASES: [BattleScriptTypecalcRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTypecalcRegistrationVectorCase {");
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
if (!formatted) throw new Error("gen-battle-script-typecalc-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES, `generated file ${generated.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
