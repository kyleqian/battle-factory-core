#!/usr/bin/env node
// Differential corpus for the B_SCR_OP_CRITCALC (0x04) leaf --
// `critcalcOpcodeHandler` in src/engine/battleScriptHitChainOpcode.ts
// (:1437-1489, doc comment :1437-1444).
//
// Expected crit-multiplier/rng/error values come only from executing the
// canonical TypeScript handler -- reached through the real
// `createBattleScriptHitChainOpcodeHandlers` factory and real committed
// critcalc instructions from the loaded program -- plus, for the
// missing-opcode registration case only, a custom program with every
// critcalc instruction filtered out. This generator owns bounded input
// construction and Rust literal emission; it must never reimplement
// getCriticalHitChanceStage, rollIsCriticalHit, resolveBattleScriptBattler-
// HoldEffect, or advanceRngValue.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-critcalc-vectors.mjs

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
  "battle_script_critcalc_vectors_gen.rs",
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

const CRITCALC_NAME = "B_SCR_OP_CRITCALC";
const CRITCALC_ID = 0x04;
const CRITCALC_DISPATCHER = "Cmd_critcalc";
const ENTRY_LABEL = "BattleScript_EffectStockpile"; // any valid label; programCounter is overridden.
const STATUS2_FOCUS_ENERGY = 1 << 20;
const STATUS3_CANT_SCORE_A_CRIT = 1 << 15;
const BATTLE_TYPE_FIRST_BATTLE = 1 << 4;
const BATTLE_TYPE_WALLY_TUTORIAL = 1 << 9;
const ABILITY_BATTLE_ARMOR = 4;
const ABILITY_SHELL_ARMOR = 75;
const SPECIES_FARFETCHD = 83;
const SPECIES_CHANSEY = 113;
const ITEM_SCOPE_LENS = 198;
const ITEM_LUCKY_PUNCH = 222;
const ITEM_STICK = 225;
const MOVE_TACKLE = 33; // EFFECT_HIT (Other)
const MOVE_KARATE_CHOP = 2; // EFFECT_HIGH_CRITICAL
const MOVE_SKY_ATTACK = 143; // EFFECT_SKY_ATTACK
const MOVE_BLAZE_KICK = 299; // EFFECT_BLAZE_KICK
const MOVE_POISON_TAIL = 342; // EFFECT_POISON_TAIL

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-critcalc-vectors: ${message}`);
}
function freezeArray(values) { return Object.freeze(values.slice()); }
function hex8(value) { return `0x${(value & 0xff).toString(16).padStart(2, "0")}`; }
function hex16(value) { return `0x${(value & 0xffff).toString(16).padStart(4, "0")}`; }
function hex32(value) { return `0x${(value >>> 0).toString(16).padStart(8, "0")}`; }
function rustString(value) { return JSON.stringify(value); }

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
  currentMove = MOVE_TACKLE, battleTypeFlags = 0,
  enigmaBerryHoldEffects = [0, 0, 0, 0],
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
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    lastUsedAbility: 0,
    lastUsedItem: 0,
    usedHeldItems: Object.freeze([0, 0, 0, 0]),
    lastLandedMoves: Object.freeze([0, 0, 0, 0]),
    lastHitByType: Object.freeze([0, 0, 0, 0]),
    aiObservedAbilityIds: Object.freeze([0, 0, 0, 0]),
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
    dynamicMoveType: 0,
    weather: 0,
    enigmaBerryHoldEffects: freezeArray(enigmaBerryHoldEffects),
    enigmaBerryHoldEffectParams: freezeArray([0, 0, 0, 0]),
    battleMoveDamage: 10,
  });
}

// Same "safe placeholder, then splice" trick as the typecalc/damagecalc
// generators: `createBattleScriptRulesContext` eagerly resolves
// `currentMoveEffect` from `currentMove` at construction time, which throws
// BEFORE the critcalc handler's own `requireMoveRow` ever runs. Construction
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
  return Object.freeze({ item: b.item, ability: b.ability, species: b.species, status2: b.status2, status3: b.status3 });
}
function projectRules(rules) {
  return Object.freeze({
    battlers: freezeArray(rules.battlers.map(projectBattler)),
    battleTypeFlags: rules.battleTopology.battleTypeFlags,
    currentMove: rules.currentMove,
    critMultiplier: rules.critMultiplier,
    enigmaBerryHoldEffects: freezeArray(rules.enigmaBerryHoldEffects),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
  });
}
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

function makeRng(value, calls) {
  const ledger = [];
  for (let i = 0; i < calls; i += 1) {
    ledger.push(Object.freeze({
      call: i + 1, reason: "seed-placeholder", before: 0, after: 0, randomValue: 0,
      provenance: Object.freeze({
        programCounter: 0, opcodeId: 0, opcodeName: "SEED", dispatcher: "SEED",
        sourceLabel: "SEED", sourceStatementLine: 0,
      }),
    }));
  }
  return Object.freeze({ value, calls, ledger: Object.freeze(ledger) });
}

const program = programModule.loadBattleScriptProgram();
const critcalcInstructions = program.instructions.filter((value) => value.opcodeName === CRITCALC_NAME);
assert(critcalcInstructions.length === 11, `critcalc concrete call-site count drifted: ${critcalcInstructions.length}`);
for (const instruction of critcalcInstructions) {
  assert(instruction.opcodeId === CRITCALC_ID, "critcalc opcode id drifted");
  assert(instruction.dispatcher === CRITCALC_DISPATCHER, "critcalc dispatcher drifted");
  assert(instruction.operands.length === 0, "critcalc unexpectedly carries operands");
}
const firstInstruction = critcalcInstructions[0];
const secondInstruction = critcalcInstructions[1];
assert(firstInstruction.programCounter !== secondInstruction.programCounter, "need two distinct call sites");

const ports = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: () => {},
  resolveBattlerForBattleScript: () => 0,
});
const handlers = opcodeModule.createBattleScriptHitChainOpcodeHandlers(program, ports);
const critcalcHandler = handlers[CRITCALC_ID];
assert(typeof critcalcHandler === "function", "critcalc handler did not register");

function sourceOutcome(rulesSpec, rngInSpec, instruction = firstInstruction) {
  const rules = canonicalRules(rulesSpec);
  const before = projectRules(rules);
  const rngIn = makeRng(rngInSpec.value >>> 0, rngInSpec.calls ?? 0);
  try {
    const scaffold = machineModule.createBattleScriptMachine(program, ENTRY_LABEL, rules, 0x2244_6688);
    const state = Object.freeze({ ...scaffold, programCounter: instruction.programCounter, rng: rngIn });
    const transition = critcalcHandler({ program, instruction, state });
    assert(same(projectRules(rules), before), "canonical handler mutated input rules");
    assert((transition.events ?? []).length === 0, "critcalc must never emit events");
    assert(transition.control.kind === "advance", "critcalc must always advance");
    const outRules = transition.rulesContext ?? rules;
    const outRng = transition.rng ?? rngIn;
    const drewOne = outRng.ledger.length === rngIn.ledger.length + 1;
    assert(
      drewOne || outRng.ledger.length === rngIn.ledger.length,
      "rng ledger grew by neither 0 nor 1",
    );
    const tail = drewOne ? outRng.ledger[outRng.ledger.length - 1] : null;
    return Object.freeze({
      expected: projectRules(outRules),
      rngIn: { value: rngIn.value, calls: rngIn.calls },
      rngOut: { value: outRng.value, calls: outRng.calls },
      draw: tail === null ? null : Object.freeze({
        call: tail.call, reason: tail.reason, before: tail.before, after: tail.after, randomValue: tail.randomValue,
        provenance: Object.freeze({ ...tail.provenance }),
      }),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    return Object.freeze({
      expected: null, rngIn: { value: rngIn.value, calls: rngIn.calls }, rngOut: null, draw: null,
      error: error.message,
    });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return outcome.draw === null ? "immune-no-draw" : "advance-drew";
  if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
  if (outcome.error.includes("requires a target role")) return "missing-target-role";
  if (outcome.error.includes("has no source-derived gBattleMoves row")) return "unknown-move-row";
  throw new Error(`unknown canonical error: ${outcome.error}`);
}

// Search a bounded seed range for one whose Random() upper-16 output lands
// on a chosen side of a modulus threshold -- never hand-computing the LCG,
// only searching over real advanceRngValue-derived outputs the canonical
// engine itself would produce (mirrored in Rust via advance_rng_value, but
// the search predicate here is purely `% divisor` on the real output).
function findSeed(divisor, wantMultiple, excludeDivisor) {
  for (let candidate = 0; candidate < 200_000; candidate += 1) {
    // Mirrors advanceRngValue: gRngValue = 1103515245*value + 24691 (mod 2^32).
    const after = (Math.imul(1103515245, candidate) + 24691) >>> 0;
    const randomValue = (after >>> 16) & 0xffff;
    const isMultiple = randomValue % divisor === 0;
    const excludeOk = excludeDivisor === undefined || randomValue % excludeDivisor !== 0;
    if (isMultiple === wantMultiple && excludeOk) return candidate;
  }
  throw new Error(`no seed found for divisor ${divisor} wantMultiple ${wantMultiple}`);
}

const SEED_STAGE0_HIT = findSeed(16, true); // %16==0 -> crit at stage 0
const SEED_STAGE0_MISS = findSeed(16, false); // %16!=0 -> no crit at stage 0
const SEED_STAGE1_HIT_NOT_STAGE0 = findSeed(8, true, 16); // %8==0 && %16!=0 -> crit at stage>=1, not stage 0
const SEED_STAGE4_HIT = findSeed(2, true); // %2==0 -> crit at stage 4 (1-in-2)
const SEED_STAGE4_MISS = findSeed(2, false); // %2!=0 -> impossible (miss at stage4 needs odd, guaranteed to exist)

const cases = [];
function addCase(label, category, rulesSpec, rngInSpec = { value: 0x1000_0000, calls: 0 }, instruction = firstInstruction) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(rulesSpec, rngInSpec, instruction);
  cases.push(Object.freeze({
    label, category, branch: branchFor(outcome),
    initial: projectRules(canonicalRules(rulesSpec)),
    instruction: Object.freeze({
      opcodeName: instruction.opcodeName, opcodeId: instruction.opcodeId,
      programCounter: instruction.programCounter, dispatcher: instruction.dispatcher,
      sourceLabel: instruction.source.label, sourceStatementLine: instruction.source.statementLine,
    }),
    ...outcome,
  }));
}

// --- Role errors ------------------------------------------------------------
addCase("missing_attacker_role", "role-errors", { ...baseSpec(), attacker: null });
addCase("missing_target_role", "role-errors", { ...baseSpec(), target: null });
addCase("missing_attacker_wins_over_missing_target", "role-errors", { ...baseSpec(), attacker: null, target: null });

// --- Move resolution ---------------------------------------------------------
addCase("unknown_current_move", "move-resolution", baseSpec({ currentMove: 60000 }));

// --- Stage components: move effect ------------------------------------------
addCase("high_critical_move_raises_stage", "stage-move-effect", baseSpec({ currentMove: MOVE_KARATE_CHOP }), { value: SEED_STAGE1_HIT_NOT_STAGE0, calls: 0 });
addCase("sky_attack_move_raises_stage", "stage-move-effect", baseSpec({ currentMove: MOVE_SKY_ATTACK }), { value: SEED_STAGE1_HIT_NOT_STAGE0, calls: 0 });
addCase("blaze_kick_move_raises_stage", "stage-move-effect", baseSpec({ currentMove: MOVE_BLAZE_KICK }), { value: SEED_STAGE1_HIT_NOT_STAGE0, calls: 0 });
addCase("poison_tail_move_raises_stage", "stage-move-effect", baseSpec({ currentMove: MOVE_POISON_TAIL }), { value: SEED_STAGE1_HIT_NOT_STAGE0, calls: 0 });
addCase("other_move_effect_no_stage_bump", "stage-move-effect", baseSpec({ currentMove: MOVE_TACKLE }), { value: SEED_STAGE1_HIT_NOT_STAGE0, calls: 0 });

// --- Stage components: focus energy -----------------------------------------
addCase(
  "focus_energy_raises_stage",
  "stage-focus-energy",
  withBattler(baseSpec(), 0, { status2: STATUS2_FOCUS_ENERGY }),
  { value: SEED_STAGE4_HIT, calls: 0 },
);
addCase(
  "no_focus_energy_no_stage_bump",
  "stage-focus-energy",
  baseSpec(),
  { value: SEED_STAGE1_HIT_NOT_STAGE0, calls: 0 },
);

// --- Stage components: hold effects (both species-gate directions) ---------
addCase(
  "scope_lens_raises_stage",
  "stage-hold-effect",
  withBattler(baseSpec(), 0, { item: ITEM_SCOPE_LENS }),
  { value: SEED_STAGE1_HIT_NOT_STAGE0, calls: 0 },
);
addCase(
  "lucky_punch_chansey_raises_stage_by_two",
  "stage-hold-effect",
  withBattler(baseSpec(), 0, { item: ITEM_LUCKY_PUNCH, species: SPECIES_CHANSEY }),
  { value: SEED_STAGE4_HIT, calls: 0 },
);
addCase(
  "lucky_punch_non_chansey_no_stage_bump",
  "stage-hold-effect",
  withBattler(baseSpec(), 0, { item: ITEM_LUCKY_PUNCH, species: 1 }),
  { value: SEED_STAGE1_HIT_NOT_STAGE0, calls: 0 },
);
addCase(
  "stick_farfetchd_raises_stage_by_two",
  "stage-hold-effect",
  withBattler(baseSpec(), 0, { item: ITEM_STICK, species: SPECIES_FARFETCHD }),
  { value: SEED_STAGE4_HIT, calls: 0 },
);
addCase(
  "stick_non_farfetchd_no_stage_bump",
  "stage-hold-effect",
  withBattler(baseSpec(), 0, { item: ITEM_STICK, species: 1 }),
  { value: SEED_STAGE1_HIT_NOT_STAGE0, calls: 0 },
);

// --- Stage clamp -------------------------------------------------------------
addCase(
  "stacked_exactly_four_at_the_table_boundary",
  "stage-clamp",
  withBattler(baseSpec({ currentMove: MOVE_KARATE_CHOP }), 0, { status2: STATUS2_FOCUS_ENERGY, item: ITEM_SCOPE_LENS }),
  { value: SEED_STAGE4_HIT, calls: 0 },
);
addCase(
  "stacked_over_four_clamps_to_the_same_table_row",
  "stage-clamp",
  withBattler(baseSpec({ currentMove: MOVE_KARATE_CHOP }), 0, { status2: STATUS2_FOCUS_ENERGY, item: ITEM_LUCKY_PUNCH, species: SPECIES_CHANSEY }),
  { value: SEED_STAGE4_HIT, calls: 0 },
);

// --- Crit rolls at stage 0 and a high stage, both sides of the modulus ------
addCase("stage0_roll_hits", "crit-roll", baseSpec(), { value: SEED_STAGE0_HIT, calls: 0 });
addCase("stage0_roll_misses", "crit-roll", baseSpec(), { value: SEED_STAGE0_MISS, calls: 0 });
addCase(
  "stage4_roll_hits",
  "crit-roll",
  withBattler(baseSpec({ currentMove: MOVE_KARATE_CHOP }), 0, { status2: STATUS2_FOCUS_ENERGY, item: ITEM_SCOPE_LENS }),
  { value: SEED_STAGE4_HIT, calls: 0 },
);
addCase(
  "stage4_roll_misses",
  "crit-roll",
  withBattler(baseSpec({ currentMove: MOVE_KARATE_CHOP }), 0, { status2: STATUS2_FOCUS_ENERGY, item: ITEM_SCOPE_LENS }),
  { value: SEED_STAGE4_MISS, calls: 0 },
);

// --- Immunity gates (each pins zero rng consumed) ----------------------------
addCase(
  "immune_battle_armor_consumes_zero_rng",
  "immunity",
  withBattler(baseSpec(), 1, { ability: ABILITY_BATTLE_ARMOR }),
  { value: SEED_STAGE0_HIT, calls: 3 },
);
addCase(
  "immune_shell_armor_consumes_zero_rng",
  "immunity",
  withBattler(baseSpec(), 1, { ability: ABILITY_SHELL_ARMOR }),
  { value: SEED_STAGE0_HIT, calls: 3 },
);
addCase(
  "immune_status3_cant_score_a_crit_consumes_zero_rng",
  "immunity",
  withBattler(baseSpec(), 0, { status3: STATUS3_CANT_SCORE_A_CRIT }),
  { value: SEED_STAGE0_HIT, calls: 3 },
);
addCase(
  "immune_wally_tutorial_flag_consumes_zero_rng",
  "immunity",
  baseSpec({ battleTypeFlags: BATTLE_TYPE_WALLY_TUTORIAL }),
  { value: SEED_STAGE0_HIT, calls: 3 },
);
addCase(
  "immune_first_battle_flag_consumes_zero_rng",
  "immunity",
  baseSpec({ battleTypeFlags: BATTLE_TYPE_FIRST_BATTLE }),
  { value: SEED_STAGE0_HIT, calls: 3 },
);

// --- RNG bookkeeping ----------------------------------------------------------
addCase("nonzero_starting_calls_increments_by_one", "rng-bookkeeping", baseSpec(), { value: SEED_STAGE0_HIT, calls: 41 });

// --- Provenance across two distinct committed call sites ---------------------
addCase("provenance_first_call_site", "provenance", baseSpec(), { value: SEED_STAGE0_MISS, calls: 0 }, firstInstruction);
addCase("provenance_second_call_site", "provenance", baseSpec(), { value: SEED_STAGE0_MISS, calls: 0 }, secondInstruction);

const uniqueLabels = new Set(cases.map((value) => value.label));
assert(uniqueLabels.size === cases.length, "duplicate case labels");

// === Registration ============================================================
function sourceRegistration(instructions) {
  const customProgram = Object.freeze({ ...program, instructions: freezeArray(instructions) });
  try {
    const registered = opcodeModule.createBattleScriptHitChainOpcodeHandlers(customProgram, ports);
    assert(typeof registered[CRITCALC_ID] === "function", "critcalc handler missing after successful registration");
    return Object.freeze({ registeredOpcodeId: CRITCALC_ID, error: null });
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
  dedupedInstructions.some((value) => value.opcodeName === CRITCALC_NAME),
  "deduplicated program lost the critcalc entry",
);

const registrationCases = [];
function addRegistration(label, instructions) {
  const outcome = sourceRegistration(instructions);
  registrationCases.push(Object.freeze({
    label,
    instructions: freezeArray(instructions.map((value) => Object.freeze({
      opcodeName: value.opcodeName, opcodeId: value.opcodeId, programCounter: value.programCounter,
      dispatcher: value.dispatcher, sourceLabel: value.source.label, sourceStatementLine: value.source.statementLine,
    }))),
    expectedOpcodeId: outcome.registeredOpcodeId, expectedError: outcome.error,
  }));
}
addRegistration("full_committed_program_registers", dedupedInstructions);
addRegistration(
  "critcalc_missing_from_program",
  dedupedInstructions.filter((value) => value.opcodeName !== CRITCALC_NAME),
);
addRegistration(
  "duplicate_later_entry_ignored_find_first",
  [...dedupedInstructions, Object.freeze({
    opcodeName: CRITCALC_NAME, opcodeId: 0xee, programCounter: 999_999,
    dispatcher: CRITCALC_DISPATCHER, operands: [],
    source: Object.freeze({
      label: "Ignored", labelLine: 0, statementLine: 0, invocationMnemonic: "critcalc",
      invocationMacroLine: 0, sourceMacro: "critcalc", sourceMacroLine: 0, wrapperPath: Object.freeze([]),
    }),
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

function rustOptionU8(value) { return value === null || value === undefined ? "None" : `Some(${value}u8)`; }
function rustOptionalU8Hex(value) { return value === null || value === undefined ? "None" : `Some(${hex8(value)})`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustArr4u16(values) { return `[${values.map(hex16).join(", ")}]`; }
function rustBattlerState(value) {
  return `BattleScriptCritcalcVectorBattlerState { item: ${hex16(value.item)}, ability: ${hex16(value.ability)}, species: ${hex16(value.species)}, status2: ${hex32(value.status2)}, status3: ${hex32(value.status3)} }`;
}
function rustState(value) {
  return [
    "BattleScriptCritcalcVectorRules {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `battle_type_flags: ${hex32(value.battleTypeFlags)}, current_move: ${hex16(value.currentMove)},`,
    `crit_multiplier: ${value.critMultiplier}u8, enigma_berry_hold_effects: ${rustArr4u16(value.enigmaBerryHoldEffects)},`,
    `attacker: ${rustOptionU8(value.attacker)}, target: ${rustOptionU8(value.target)},`,
    "}",
  ].join(" ");
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustRng(value) { return `BattleScriptCritcalcVectorRng { value: ${hex32(value.value)}, calls: ${value.calls}u32 }`; }
function rustOptionalRng(value) { return value === null ? "None" : `Some(${rustRng(value)})`; }
function rustProvenance(value) {
  return `BattleScriptCritcalcVectorProvenance { program_counter: ${value.programCounter}u32, opcode_id: ${hex8(value.opcodeId)}, opcode_name: ${rustString(value.opcodeName)}, dispatcher: ${rustString(value.dispatcher)}, source_label: ${rustString(value.sourceLabel)}, source_statement_line: ${value.sourceStatementLine}u32 }`;
}
function rustDraw(value) {
  if (value === null) return "None";
  return `Some(BattleScriptCritcalcVectorDraw { call: ${value.call}u32, reason: ${rustString(value.reason)}, before: ${hex32(value.before)}, after: ${hex32(value.after)}, random_value: ${hex16(value.randomValue)}, provenance: ${rustProvenance(value.provenance)} })`;
}
function rustInstruction(value) {
  return `BattleScriptCritcalcInstruction { opcode_name: ${rustString(value.opcodeName)}, opcode_id: ${hex8(value.opcodeId)}, program_counter: ${value.programCounter}, dispatcher: ${rustString(value.dispatcher)}, source_label: ${rustString(value.sourceLabel)}, source_statement_line: ${value.sourceStatementLine}u32 }`;
}
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-critcalc-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptHitChainOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_critcalc::BattleScriptCritcalcInstruction;");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_CRITCALC_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_CRITCALC_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_CRITCALC_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_CRITCALC_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`);
lines.push(`pub const BATTLE_SCRIPT_CRITCALC_CONCRETE_CALL_SITE_COUNT: usize = ${critcalcInstructions.length};`);
lines.push(`pub const BATTLE_SCRIPT_CRITCALC_FIRST_PROGRAM_COUNTER: u32 = ${firstInstruction.programCounter};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptCritcalcVectorBattlerState { pub item: u16, pub ability: u16, pub species: u16, pub status2: u32, pub status3: u32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptCritcalcVectorRules { pub battlers: [BattleScriptCritcalcVectorBattlerState; 4], pub battle_type_flags: u32, pub current_move: u16, pub crit_multiplier: u8, pub enigma_berry_hold_effects: [u16; 4], pub attacker: Option<u8>, pub target: Option<u8> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptCritcalcVectorRng { pub value: u32, pub calls: u32 }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptCritcalcVectorProvenance { pub program_counter: u32, pub opcode_id: u8, pub opcode_name: &'static str, pub dispatcher: &'static str, pub source_label: &'static str, pub source_statement_line: u32 }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptCritcalcVectorDraw { pub call: u32, pub reason: &'static str, pub before: u32, pub after: u32, pub random_value: u16, pub provenance: BattleScriptCritcalcVectorProvenance }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptCritcalcVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub initial: BattleScriptCritcalcVectorRules, pub instruction: BattleScriptCritcalcInstruction<'static>, pub rng_in: BattleScriptCritcalcVectorRng, pub expected: Option<BattleScriptCritcalcVectorRules>, pub expected_rng_out: Option<BattleScriptCritcalcVectorRng>, pub expected_draw: Option<BattleScriptCritcalcVectorDraw>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptCritcalcRegistrationVectorCase { pub label: &'static str, pub instructions: &'static [BattleScriptCritcalcInstruction<'static>], pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_CRITCALC_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_CRITCALC_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_CRITCALC_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_CRITCALC_CASES: [BattleScriptCritcalcVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptCritcalcVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        rng_in: ${rustRng(value.rngIn)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        expected_rng_out: ${rustOptionalRng(value.rngOut)},`);
  lines.push(`        expected_draw: ${rustDraw(value.draw)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.error)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_CRITCALC_REGISTRATION_CASES: [BattleScriptCritcalcRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptCritcalcRegistrationVectorCase {");
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
if (!formatted) throw new Error("gen-battle-script-critcalc-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES, `generated file ${generated.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
