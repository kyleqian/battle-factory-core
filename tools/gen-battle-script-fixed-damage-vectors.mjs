#!/usr/bin/env node
// Differential corpus for the fixed-damage cluster: B_SCR_OP_DMGTOLEVEL
// (0x9F), B_SCR_OP_PSYWAVEDAMAGEEFFECT (0xA0), B_SCR_OP_DAMAGETOHALFTARGETHP
// (0x94), B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE (0xD8). The first three and
// last one live in src/engine/battleScriptHitChainOpcode.ts; damagetohalf-
// targethp lives in src/engine/battleScriptRankedBatch1Opcode.ts, with its
// own registration convention.
//
// Expected values come only from executing the canonical TypeScript
// handlers through their real factories against the real committed program
// (custom programs only for registration-error cases and the unresolved-
// jump-target case). This generator owns bounded input construction and
// Rust literal emission; it must never reimplement requireBattlerRole,
// halfTargetHpDamage, resolveBattleScriptLabel, or advanceRngValue.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-fixed-damage-vectors.mjs

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
  "battle_script_fixed_damage_vectors_gen.rs",
);
const rustfmtConfig = path.join(workspaceRoot, "core-rs", "rustfmt.toml");
const GENERATED_FILE_MAX_BYTES = 6_000_000;

const [programModule, machineModule, hitChainModule, rankedModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptHitChainOpcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRankedBatch1Opcode.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts")).href),
]);

const NAMES = {
  dmgtolevel: { name: "B_SCR_OP_DMGTOLEVEL", id: 0x9f, dispatcher: "Cmd_dmgtolevel" },
  psywavedamageeffect: { name: "B_SCR_OP_PSYWAVEDAMAGEEFFECT", id: 0xa0, dispatcher: "Cmd_psywavedamageeffect" },
  damagetohalftargethp: { name: "B_SCR_OP_DAMAGETOHALFTARGETHP", id: 0x94, dispatcher: "Cmd_damagetohalftargethp" },
  setdamagetohealthdifference: {
    name: "B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE", id: 0xd8, dispatcher: "Cmd_setdamagetohealthdifference",
  },
};
const CALL_SITE_COUNTS = {
  dmgtolevel: 1, psywavedamageeffect: 1, damagetohalftargethp: 1, setdamagetohealthdifference: 1,
};

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-fixed-damage-vectors: ${message}`);
}
function freezeArray(values) { return Object.freeze(values.slice()); }
function hex8(value) { return `0x${(value & 0xff).toString(16).padStart(2, "0")}`; }
function hex32(value) { return `0x${(value >>> 0).toString(16).padStart(8, "0")}`; }
function rustString(value) { return JSON.stringify(value); }

function defaultBattlerSpec(index) {
  return {
    side: index % 2, ability: 0, item: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"], species: 1 + index,
    attack: 60 + index * 3, defense: 60 + index * 2, spAttack: 60 + index, spDefense: 60 + index * 4,
    level: 50, hp: 100, maxHP: 100, status1: 0, status2: 0, status3: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6], flashFireBoosted: 0, helpingHand: 0,
    endured: 0, focusBanded: 0,
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
    targetNotAffected: 0, endured: spec.endured,
    specialStatus: Object.freeze({ focusBanded: spec.focusBanded }),
  });
}

function canonicalRules({ battlerSpecs, attacker, target, battleMoveDamage = 10 }) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: freezeArray(battlerSpecs.map(canonicalBattler)),
    selectorRoles: Object.freeze({ attacker, target, effectBattler: target ?? attacker }),
    scriptingBattler: attacker ?? 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 33,
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
    aiObservedItemEffects: Object.freeze([0, 0, 0, 0]),
    party: Object.freeze({
      player: freezeArray([0, 1, 2, 3, 4, 5].map(() => Object.freeze({ species: 1, isEgg: false, hp: 100 }))),
      opponent: freezeArray([0, 1, 2, 3, 4, 5].map(() => Object.freeze({ species: 1, isEgg: false, hp: 100 }))),
    }),
    battleTopology: Object.freeze({
      battlersCount: 2, battleTypeFlags: 0,
      battlerPositions: Object.freeze([0, 1, 0xff, 0xff]),
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
    enigmaBerryHoldEffects: Object.freeze([0, 0, 0, 0]),
    enigmaBerryHoldEffectParams: Object.freeze([0, 0, 0, 0]),
    battleMoveDamage,
  });
}

function baseSpec(overrides = {}) {
  const battlerSpecs = [0, 1, 2, 3].map((index) => defaultBattlerSpec(index));
  return { battlerSpecs, attacker: 0, target: 1, ...overrides };
}
function withBattler(spec, index, changes) {
  const battlerSpecs = spec.battlerSpecs.map((value, i) => (i === index ? { ...value, ...changes } : value));
  return { ...spec, battlerSpecs };
}

function projectRules(rules) {
  return Object.freeze({
    levels: freezeArray(rules.battlers.map((b) => b.level)),
    hps: freezeArray(rules.battlers.map((b) => b.hp)),
    battleMoveDamage: rules.battleMoveDamage,
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
const instructionsByOpcode = {};
for (const key of Object.keys(NAMES)) {
  const found = program.instructions.filter((value) => value.opcodeName === NAMES[key].name);
  assert(found.length === CALL_SITE_COUNTS[key], `${key} concrete call-site count drifted: ${found.length}`);
  instructionsByOpcode[key] = found;
}
const setdamageInstruction = instructionsByOpcode.setdamagetohealthdifference[0];
assert(setdamageInstruction.operands.length === 1, "setdamagetohealthdifference must carry exactly 1 operand");

const ports = Object.freeze({
  isControllerIdle: () => true,
  prepareMessage: () => {},
  resolveBattlerForBattleScript: () => 0,
});
const hitChainHandlers = hitChainModule.createBattleScriptHitChainOpcodeHandlers(program, ports);
const rankedHandlers = rankedModule.createBattleScriptRankedBatch1OpcodeHandlers(program);

const handlerByOpcode = {
  dmgtolevel: hitChainHandlers[NAMES.dmgtolevel.id],
  psywavedamageeffect: hitChainHandlers[NAMES.psywavedamageeffect.id],
  damagetohalftargethp: rankedHandlers[NAMES.damagetohalftargethp.id],
  setdamagetohealthdifference: hitChainHandlers[NAMES.setdamagetohealthdifference.id],
};
for (const key of Object.keys(handlerByOpcode)) {
  assert(typeof handlerByOpcode[key] === "function", `${key} handler did not register`);
}

const ENTRY_LABEL = "BattleScript_EffectStockpile"; // any valid label; programCounter is overridden.

// `instructionOverride` lets the unresolved-jump-target case fabricate a
// bogus operand expression on top of the real committed instruction, without
// hand-rolling the rest of the instruction shape.
function sourceOutcome(key, rulesSpec, rngInSpec, instructionOverride) {
  const handler = handlerByOpcode[key];
  const rules = canonicalRules(rulesSpec);
  const before = projectRules(rules);
  const rngIn = makeRng((rngInSpec?.value ?? 0) >>> 0, rngInSpec?.calls ?? 0);
  const instruction = instructionOverride ?? instructionsByOpcode[key][0];
  try {
    const scaffold = machineModule.createBattleScriptMachine(program, ENTRY_LABEL, rules, 0x2244_6688);
    const state = Object.freeze({ ...scaffold, programCounter: instruction.programCounter, rng: rngIn });
    const transition = handler({ program, instruction, state });
    assert(same(projectRules(rules), before), "canonical handler mutated input rules");
    assert((transition.events ?? []).length === 0, "must never emit events");
    const controlKind = transition.control.kind;
    assert(controlKind === "advance" || controlKind === "jump", `unexpected control kind ${controlKind}`);
    const outRules = transition.rulesContext ?? rules;
    const outRng = transition.rng ?? rngIn;
    const newDrawCount = outRng.ledger.length - rngIn.ledger.length;
    assert(newDrawCount >= 0, `ledger shrank by ${newDrawCount}`);
    const draws = [];
    for (let i = 0; i < newDrawCount; i += 1) {
      const tail = outRng.ledger[rngIn.ledger.length + i];
      draws.push(Object.freeze({
        call: tail.call, reason: tail.reason, before: tail.before, after: tail.after, randomValue: tail.randomValue,
        provenance: Object.freeze({ ...tail.provenance }),
      }));
    }
    return Object.freeze({
      controlKind, jumpProgramCounter: controlKind === "jump" ? transition.control.programCounter : null,
      expected: controlKind === "advance" ? projectRules(outRules) : null,
      rngIn: { value: rngIn.value, calls: rngIn.calls },
      rngOut: { value: outRng.value, calls: outRng.calls },
      draws: freezeArray(draws),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    return Object.freeze({
      controlKind: null, jumpProgramCounter: null, expected: null,
      rngIn: { value: rngIn.value, calls: rngIn.calls }, rngOut: null, draws: freezeArray([]),
      error: error.message,
    });
  }
}

function branchFor(outcome) {
  if (outcome.error !== null) {
    if (outcome.error.includes("requires a attacker role")) return "missing-attacker-role";
    if (outcome.error.includes("requires a target role")) return "missing-target-role";
    if (outcome.error.includes("unresolved jump target")) return "unresolved-jump-target";
    throw new Error(`unknown canonical error: ${outcome.error}`);
  }
  if (outcome.controlKind === "jump") return "jump";
  if (outcome.draws.length === 0) return "advance-no-draw";
  if (outcome.draws.length === 1) return "advance-single-draw";
  return "advance-multi-draw";
}

const cases = [];
function addCase(label, category, key, rulesSpec, rngInSpec, instructionOverride) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(key, rulesSpec, rngInSpec, instructionOverride);
  const instruction = instructionOverride ?? instructionsByOpcode[key][0];
  cases.push(Object.freeze({
    label, category, opcode: key, branch: branchFor(outcome),
    initial: projectRules(canonicalRules(rulesSpec)),
    instruction: Object.freeze({
      opcodeName: instruction.opcodeName, opcodeId: instruction.opcodeId,
      programCounter: instruction.programCounter, dispatcher: instruction.dispatcher,
      sourceLabel: instruction.source.label, sourceStatementLine: instruction.source.statementLine,
      operandCount: instruction.operands.length,
      jumpTargetExpression: key === "setdamagetohealthdifference" ? instruction.operands[0].expression : "",
    }),
    ...outcome,
  }));
}

// --- dmgtolevel ------------------------------------------------------------
addCase("dmgtolevel_level_50", "dmgtolevel", "dmgtolevel", withBattler(baseSpec(), 0, { level: 50 }));
addCase("dmgtolevel_level_1", "dmgtolevel", "dmgtolevel", withBattler(baseSpec(), 0, { level: 1 }));
addCase("dmgtolevel_level_100_extreme", "dmgtolevel", "dmgtolevel", withBattler(baseSpec(), 0, { level: 100 }));
addCase("dmgtolevel_missing_attacker_role", "dmgtolevel", "dmgtolevel", { ...baseSpec(), attacker: null });

// --- psywavedamageeffect -----------------------------------------------------
// Search bounded seed ranges for real advanceRngValue-derived outputs
// producing exactly 1-draw and exactly 2-draw sequences (never hand-computed
// LCG arithmetic -- delegated to the TS machine itself via sourceOutcome).
function findPsywaveSeed(wantDrawCount, excludeSeeds) {
  for (let candidate = 0; candidate < 200_000; candidate += 1) {
    if (excludeSeeds?.has(candidate)) continue;
    const outcome = sourceOutcome(
      "psywavedamageeffect", withBattler(baseSpec(), 0, { level: 50 }),
      { value: candidate, calls: 0 },
    );
    if (outcome.draws.length === wantDrawCount) return candidate;
  }
  throw new Error(`no seed found for psywave draw count ${wantDrawCount}`);
}
const SEED_PSYWAVE_ONE_DRAW = findPsywaveSeed(1);
const SEED_PSYWAVE_TWO_DRAWS = findPsywaveSeed(2, new Set([SEED_PSYWAVE_ONE_DRAW]));
addCase(
  "psywave_one_draw_accepted_immediately", "psywave", "psywavedamageeffect",
  withBattler(baseSpec(), 0, { level: 50 }), { value: SEED_PSYWAVE_ONE_DRAW, calls: 0 },
);
addCase(
  "psywave_two_draws_first_rejected", "psywave", "psywavedamageeffect",
  withBattler(baseSpec(), 0, { level: 50 }), { value: SEED_PSYWAVE_TWO_DRAWS, calls: 0 },
);
addCase(
  "psywave_level_100_extreme", "psywave", "psywavedamageeffect",
  withBattler(baseSpec(), 0, { level: 100 }), { value: SEED_PSYWAVE_ONE_DRAW, calls: 0 },
);
addCase(
  "psywave_nonzero_starting_calls", "psywave", "psywavedamageeffect",
  withBattler(baseSpec(), 0, { level: 50 }), { value: SEED_PSYWAVE_ONE_DRAW, calls: 41 },
);
addCase(
  "psywave_missing_attacker_role", "psywave", "psywavedamageeffect",
  { ...baseSpec(), attacker: null }, { value: SEED_PSYWAVE_ONE_DRAW, calls: 0 },
);
function findPsywaveRandSeed(wantRand, excludeSeeds) {
  for (let candidate = 0; candidate < 200_000; candidate += 1) {
    if (excludeSeeds?.has(candidate)) continue;
    const outcome = sourceOutcome(
      "psywavedamageeffect", withBattler(baseSpec(), 0, { level: 50 }),
      { value: candidate, calls: 0 },
    );
    if (outcome.draws.length === 1 && (outcome.draws[0].randomValue % 16) === wantRand) return candidate;
  }
  throw new Error(`no seed found for psywave rand boundary ${wantRand}`);
}
const SEED_PSYWAVE_RAND_ZERO = findPsywaveRandSeed(0, new Set([SEED_PSYWAVE_ONE_DRAW, SEED_PSYWAVE_TWO_DRAWS]));
const SEED_PSYWAVE_RAND_TEN = findPsywaveRandSeed(10, new Set([SEED_PSYWAVE_ONE_DRAW, SEED_PSYWAVE_TWO_DRAWS, SEED_PSYWAVE_RAND_ZERO]));
addCase(
  "psywave_rand_zero_boundary_accepted", "psywave", "psywavedamageeffect",
  withBattler(baseSpec(), 0, { level: 50 }), { value: SEED_PSYWAVE_RAND_ZERO, calls: 0 },
);
addCase(
  "psywave_rand_ten_boundary_accepted", "psywave", "psywavedamageeffect",
  withBattler(baseSpec(), 0, { level: 50 }), { value: SEED_PSYWAVE_RAND_TEN, calls: 0 },
);

// --- damagetohalftargethp -----------------------------------------------------
addCase("halfhp_one_floors_to_one", "halfhp", "damagetohalftargethp", withBattler(baseSpec(), 1, { hp: 1 }));
addCase("halfhp_two_exact_half", "halfhp", "damagetohalftargethp", withBattler(baseSpec(), 1, { hp: 2 }));
addCase("halfhp_seven_truncates_odd", "halfhp", "damagetohalftargethp", withBattler(baseSpec(), 1, { hp: 7 }));
addCase("halfhp_large_value", "halfhp", "damagetohalftargethp", withBattler(baseSpec(), 1, { hp: 401 }));
addCase(
  "halfhp_missing_target_role", "halfhp", "damagetohalftargethp",
  { ...baseSpec(), target: null },
);

// --- setdamagetohealthdifference ----------------------------------------------
addCase(
  "healthdiff_target_above_attacker_advances", "healthdiff", "setdamagetohealthdifference",
  (() => {
    let spec = baseSpec();
    spec = withBattler(spec, 0, { hp: 30 });
    spec = withBattler(spec, 1, { hp: 90 });
    return spec;
  })(),
);
addCase(
  "healthdiff_hp_equal_jumps", "healthdiff", "setdamagetohealthdifference",
  (() => {
    let spec = baseSpec();
    spec = withBattler(spec, 0, { hp: 50 });
    spec = withBattler(spec, 1, { hp: 50 });
    return spec;
  })(),
);
addCase(
  "healthdiff_target_below_attacker_jumps", "healthdiff", "setdamagetohealthdifference",
  (() => {
    let spec = baseSpec();
    spec = withBattler(spec, 0, { hp: 90 });
    spec = withBattler(spec, 1, { hp: 10 });
    return spec;
  })(),
);
addCase(
  "healthdiff_target_one_above_attacker_no_jump", "healthdiff", "setdamagetohealthdifference",
  (() => {
    let spec = baseSpec();
    spec = withBattler(spec, 0, { hp: 50 });
    spec = withBattler(spec, 1, { hp: 51 });
    return spec;
  })(),
);
addCase(
  "healthdiff_missing_attacker_role", "healthdiff", "setdamagetohealthdifference",
  { ...baseSpec(), attacker: null },
);
addCase(
  "healthdiff_missing_target_role", "healthdiff", "setdamagetohealthdifference",
  { ...baseSpec(), target: null },
);
{
  const bogusInstruction = Object.freeze({
    ...setdamageInstruction,
    operands: Object.freeze([Object.freeze({ ...setdamageInstruction.operands[0], expression: "BogusUnresolvableLabel" })]),
  });
  let spec = baseSpec();
  spec = withBattler(spec, 0, { hp: 50 });
  spec = withBattler(spec, 1, { hp: 50 });
  addCase(
    "healthdiff_unresolved_jump_target_errors", "healthdiff", "setdamagetohealthdifference",
    spec, undefined, bogusInstruction,
  );
}

const uniqueLabels = new Set(cases.map((value) => value.label));
assert(uniqueLabels.size === cases.length, "duplicate case labels");

// === Registration ============================================================
function sourceHitChainRegistration(instructions) {
  const customProgram = Object.freeze({ ...program, instructions: freezeArray(instructions) });
  try {
    const registered = hitChainModule.createBattleScriptHitChainOpcodeHandlers(customProgram, ports);
    for (const key of ["dmgtolevel", "psywavedamageeffect", "setdamagetohealthdifference"]) {
      assert(typeof registered[NAMES[key].id] === "function", `${key} handler missing after successful registration`);
    }
    return Object.freeze({ registered: true, error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ registered: false, error: error.message });
  }
}
function sourceRankedRegistration(instructions) {
  const customProgram = Object.freeze({ ...program, instructions: freezeArray(instructions) });
  try {
    const registered = rankedModule.createBattleScriptRankedBatch1OpcodeHandlers(customProgram);
    assert(typeof registered[NAMES.damagetohalftargethp.id] === "function", "damagetohalftargethp handler missing after successful registration");
    return Object.freeze({ registered: true, error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ registered: false, error: error.message });
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

const registrationCases = [];
function addRegistration(label, convention, instructions) {
  const outcome = convention === "hit-chain" ? sourceHitChainRegistration(instructions) : sourceRankedRegistration(instructions);
  registrationCases.push(Object.freeze({
    label, convention,
    instructions: freezeArray(instructions.map((value) => Object.freeze({
      opcodeName: value.opcodeName, opcodeId: value.opcodeId, programCounter: value.programCounter,
      dispatcher: value.dispatcher, sourceLabel: value.source.label, sourceStatementLine: value.source.statementLine,
      operandCount: value.operands.length,
    }))),
    expectedRegistered: outcome.registered, expectedError: outcome.error,
  }));
}

addRegistration("hitchain_full_program_registers_all_three", "hit-chain", dedupedInstructions);
addRegistration(
  "dmgtolevel_missing_from_program", "hit-chain",
  dedupedInstructions.filter((value) => value.opcodeName !== NAMES.dmgtolevel.name),
);
addRegistration(
  "psywavedamageeffect_missing_from_program", "hit-chain",
  dedupedInstructions.filter((value) => value.opcodeName !== NAMES.psywavedamageeffect.name),
);
addRegistration(
  "setdamagetohealthdifference_missing_from_program", "hit-chain",
  dedupedInstructions.filter((value) => value.opcodeName !== NAMES.setdamagetohealthdifference.name),
);

// createBattleScriptRankedBatch1OpcodeHandlers registers ALL SIX ranked
// opcodes unconditionally, so a registration probe must supply real concrete
// starts for the other five and vary only the damagetohalftargethp entry.
const RANKED_OPCODE_NAMES = [
  "B_SCR_OP_SCALEDAMAGEBYHEALTHRATIO", "B_SCR_OP_JUMPIFARRAYEQUAL",
  "B_SCR_OP_MAGNITUDEDAMAGECALCULATION", "B_SCR_OP_MAXATTACKHALVEHP",
  "B_SCR_OP_DAMAGETOHALFTARGETHP", "B_SCR_OP_HIDDENPOWERCALC",
];
const rankedBaseInstructions = RANKED_OPCODE_NAMES.map((name) => {
  const found = program.instructions.find((value) => value.opcodeName === name);
  assert(found, `ranked base instruction missing for ${name}`);
  return found;
});
function rankedInstructionsWithHalfHpReplaced(replacement) {
  return rankedBaseInstructions
    .filter((value) => value.opcodeName !== "B_SCR_OP_DAMAGETOHALFTARGETHP")
    .concat(replacement);
}
const halfInstruction = instructionsByOpcode.damagetohalftargethp[0];
addRegistration("halfhp_success_exactly_one", "ranked", rankedBaseInstructions);
addRegistration(
  "halfhp_duplicate_two_instructions", "ranked",
  rankedInstructionsWithHalfHpReplaced([halfInstruction, halfInstruction]),
);
addRegistration(
  "halfhp_wrong_dispatcher", "ranked",
  rankedInstructionsWithHalfHpReplaced([Object.freeze({ ...halfInstruction, dispatcher: "Cmd_other" })]),
);
addRegistration(
  "halfhp_nonzero_operands", "ranked",
  rankedInstructionsWithHalfHpReplaced([
    Object.freeze({ ...halfInstruction, operands: Object.freeze([Object.freeze({ width: 1, expression: "0" })]) }),
  ]),
);
addRegistration(
  "halfhp_missing_entirely", "ranked",
  rankedBaseInstructions.filter((value) => value.opcodeName !== "B_SCR_OP_DAMAGETOHALFTARGETHP"),
);

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}
const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const opcodeCensus = census(cases, (value) => value.opcode);
const registrationConventionCensus = census(registrationCases, (value) => value.convention);
const registrationBranchCensus = census(registrationCases, (value) => (value.expectedError === null ? "registered" : "not-registered"));

const corpus = Object.freeze({
  categoryCensus, branchCensus, opcodeCensus, registrationConventionCensus, registrationBranchCensus,
  cases, registrationCases,
});
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generatorBytes = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generatorBytes).digest("hex");

function rustOptionU8(value) { return value === null || value === undefined ? "None" : `Some(${value}u8)`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustArr4i32(values) { return `[${values.map((v) => `${v}i32`).join(", ")}]`; }
function rustState(value) {
  return `BattleScriptFixedDamageVectorRules { levels: ${rustArr4i32(value.levels)}, hps: ${rustArr4i32(value.hps)}, battle_move_damage: ${value.battleMoveDamage}i32, attacker: ${rustOptionU8(value.attacker)}, target: ${rustOptionU8(value.target)} }`;
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustRng(value) { return `BattleScriptFixedDamageVectorRng { value: ${hex32(value.value)}, calls: ${value.calls}u32 }`; }
function rustOptionalRng(value) { return value === null ? "None" : `Some(${rustRng(value)})`; }
function rustProvenance(value) {
  return `BattleScriptFixedDamageVectorProvenance { program_counter: ${value.programCounter}u32, opcode_id: ${hex8(value.opcodeId)}, opcode_name: ${rustString(value.opcodeName)}, dispatcher: ${rustString(value.dispatcher)}, source_label: ${rustString(value.sourceLabel)}, source_statement_line: ${value.sourceStatementLine}u32 }`;
}
function rustDraw(value) {
  return `BattleScriptFixedDamageVectorDraw { call: ${value.call}u32, reason: ${rustString(value.reason)}, before: ${hex32(value.before)}, after: ${hex32(value.after)}, random_value: 0x${(value.randomValue & 0xffff).toString(16).padStart(4, "0")}, provenance: ${rustProvenance(value.provenance)} }`;
}
function rustDraws(values) { return `&[${values.map(rustDraw).join(", ")}]`; }
function rustInstruction(value) {
  return `BattleScriptFixedDamageVectorInstruction { opcode_name: ${rustString(value.opcodeName)}, opcode_id: ${hex8(value.opcodeId)}, program_counter: ${value.programCounter}, dispatcher: ${rustString(value.dispatcher)}, source_label: ${rustString(value.sourceLabel)}, source_statement_line: ${value.sourceStatementLine}u32, operand_count: ${value.operandCount}usize, jump_target_expression: ${rustString(value.jumpTargetExpression ?? "")} }`;
}
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}
function rustControlKind(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustJumpPc(value) { return value === null || value === undefined ? "None" : `Some(${value}u32)`; }

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-fixed-damage-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptHitChainOpcode.ts and");
lines.push("// battleScriptRankedBatch1Opcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_FIXED_DAMAGE_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_FIXED_DAMAGE_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_FIXED_DAMAGE_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_FIXED_DAMAGE_VECTOR_GENERATOR_BYTES: usize = ${generatorBytes.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFixedDamageVectorRules { pub levels: [i32; 4], pub hps: [i32; 4], pub battle_move_damage: i32, pub attacker: Option<u8>, pub target: Option<u8> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFixedDamageVectorRng { pub value: u32, pub calls: u32 }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFixedDamageVectorProvenance { pub program_counter: u32, pub opcode_id: u8, pub opcode_name: &'static str, pub dispatcher: &'static str, pub source_label: &'static str, pub source_statement_line: u32 }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFixedDamageVectorDraw { pub call: u32, pub reason: &'static str, pub before: u32, pub after: u32, pub random_value: u16, pub provenance: BattleScriptFixedDamageVectorProvenance }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFixedDamageVectorInstruction { pub opcode_name: &'static str, pub opcode_id: u8, pub program_counter: u32, pub dispatcher: &'static str, pub source_label: &'static str, pub source_statement_line: u32, pub operand_count: usize, pub jump_target_expression: &'static str }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFixedDamageVectorCase { pub label: &'static str, pub category: &'static str, pub opcode: &'static str, pub branch: &'static str, pub initial: BattleScriptFixedDamageVectorRules, pub instruction: BattleScriptFixedDamageVectorInstruction, pub rng_in: BattleScriptFixedDamageVectorRng, pub control_kind: Option<&'static str>, pub jump_program_counter: Option<u32>, pub expected: Option<BattleScriptFixedDamageVectorRules>, pub expected_rng_out: Option<BattleScriptFixedDamageVectorRng>, pub expected_draws: &'static [BattleScriptFixedDamageVectorDraw], pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, PartialEq, Eq)]");
lines.push("pub struct BattleScriptFixedDamageRegistrationVectorCase { pub label: &'static str, pub convention: &'static str, pub instructions: &'static [BattleScriptFixedDamageVectorInstruction], pub expected_registered: bool, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_FIXED_DAMAGE_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_FIXED_DAMAGE_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_FIXED_DAMAGE_OPCODE_CENSUS", opcodeCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_FIXED_DAMAGE_REGISTRATION_CONVENTION_CENSUS", registrationConventionCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_FIXED_DAMAGE_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_FIXED_DAMAGE_CASES: [BattleScriptFixedDamageVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptFixedDamageVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, opcode: ${rustString(value.opcode)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        rng_in: ${rustRng(value.rngIn)},`);
  lines.push(`        control_kind: ${rustControlKind(value.controlKind)}, jump_program_counter: ${rustJumpPc(value.jumpProgramCounter)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        expected_rng_out: ${rustOptionalRng(value.rngOut)},`);
  lines.push(`        expected_draws: ${rustDraws(value.draws)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.error)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_FIXED_DAMAGE_REGISTRATION_CASES: [BattleScriptFixedDamageRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptFixedDamageRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, convention: ${rustString(value.convention)},`);
  lines.push(`        instructions: &[${value.instructions.map(rustInstruction).join(", ")}],`);
  lines.push(`        expected_registered: ${value.expectedRegistered}, expected_error: ${rustOptionalString(value.expectedError)},`);
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
if (!formatted) throw new Error("gen-battle-script-fixed-damage-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
assert(generated.length <= GENERATED_FILE_MAX_BYTES, `generated file ${generated.length} exceeds ${GENERATED_FILE_MAX_BYTES}`);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
console.log(`generator sha256 ${generatorHash} bytes ${generatorBytes.length}`);
