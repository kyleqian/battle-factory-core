#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptTryinfatuatingOpcode.ts.
//
// Expected controls, projected output, ordered errors, and registration are
// produced only by calling the canonical TypeScript handler and factory.
// This generator owns bounded input construction and Rust literal emission;
// it must not independently implement gender resolution or Attract behavior.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-tryinfatuating-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "battle_script_tryinfatuating_vectors_gen.rs",
);

const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptTryinfatuatingOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_TRYINFATUATING";
const OPCODE_ID = 0x97;
const DISPATCHER = "Cmd_tryinfatuating";
const ENTRY_LABEL = "BattleScript_EffectAttract";
const FAILURE_POINTER = "BattleScript_ButItFailed";
const OBLIVIOUS_LABEL = "BattleScript_ObliviousPreventsAttraction";
const UNRESOLVED_POINTER = "BattleScript_RustTryinfatuatingUnresolved";
const ABILITY_OBLIVIOUS = 12;
const BATTLERS = Object.freeze([0, 1, 2, 3]);

// Species picks covering every gender-ratio class actually present in
// species-stats.json (0, 31, 63, 127, 191, 254, 255 -- the committed data has
// 63 where some Gen 3 builds instead carry 225; see PROGRESS/PAPERCUT note).
const SPECIES_NIDORAN_M = 32; // ratio 0 (MON_MALE)
const SPECIES_NIDORAN_F = 29; // ratio 254 (MON_FEMALE)
const SPECIES_MAGNEMITE = 81; // ratio 255 (MON_GENDERLESS)
const SPECIES_BULBASAUR = 1; // ratio 31
const SPECIES_GROWLITHE = 58; // ratio 63
const SPECIES_CATERPIE = 10; // ratio 127
const SPECIES_CLEFAIRY = 35; // ratio 191
const RATIO_BY_SPECIES = Object.freeze({
  [SPECIES_BULBASAUR]: 31,
  [SPECIES_GROWLITHE]: 63,
  [SPECIES_CATERPIE]: 127,
  [SPECIES_CLEFAIRY]: 191,
});
const UNKNOWN_SPECIES = 0xffff;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-tryinfatuating-vectors: ${message}`);
}

function hashSalt(salt) {
  return Math.imul(salt ^ 0x9e3779b1, 0x85ebca6b) >>> 0;
}

// A personality with the requested low byte and a deterministic, otherwise
// arbitrary, salted high 24 bits -- the low byte is the only part
// `getMonGender` ever reads.
function personalityWithLowByte(lowByte, salt) {
  const highSalted = hashSalt(salt) & 0xffffff00;
  return (highSalted | (lowByte & 0xff)) >>> 0;
}

// Species/personality profile: `mode` places the personality low byte just
// below, at, or above the species' own gender-ratio threshold (irrelevant
// for the three fixed-literal species, but still varied for salting).
const PROFILES = Object.freeze([
  { label: "male_fixed", species: SPECIES_NIDORAN_M, mode: "fixed" },
  { label: "female_fixed", species: SPECIES_NIDORAN_F, mode: "fixed" },
  { label: "genderless", species: SPECIES_MAGNEMITE, mode: "fixed" },
  { label: "mixed31_below", species: SPECIES_BULBASAUR, mode: "below" },
  { label: "mixed31_at", species: SPECIES_BULBASAUR, mode: "at" },
  { label: "mixed31_above", species: SPECIES_BULBASAUR, mode: "above" },
  { label: "mixed63_below", species: SPECIES_GROWLITHE, mode: "below" },
  { label: "mixed63_at", species: SPECIES_GROWLITHE, mode: "at" },
  { label: "mixed63_above", species: SPECIES_GROWLITHE, mode: "above" },
  { label: "mixed127_below", species: SPECIES_CATERPIE, mode: "below" },
  { label: "mixed127_at", species: SPECIES_CATERPIE, mode: "at" },
  { label: "mixed127_above", species: SPECIES_CATERPIE, mode: "above" },
  { label: "mixed191_below", species: SPECIES_CLEFAIRY, mode: "below" },
  { label: "mixed191_at", species: SPECIES_CLEFAIRY, mode: "at" },
  { label: "mixed191_above", species: SPECIES_CLEFAIRY, mode: "above" },
]);

function profilePersonality(profile, salt) {
  const ratio = RATIO_BY_SPECIES[profile.species];
  if (ratio === undefined) return personalityWithLowByte(salt & 0xff, salt);
  const low = profile.mode === "below" ? ratio - 1 : profile.mode === "at" ? ratio : ratio + 1;
  return personalityWithLowByte(Math.max(0, Math.min(255, low)), salt);
}

const TOPOLOGIES = Object.freeze([
  Object.freeze({
    label: "singles",
    battlersCount: 2,
    battleTypeFlags: 0x8000_0008,
    battlerPositions: Object.freeze([0, 1, 0xfe, 0xff]),
  }),
  Object.freeze({
    label: "doubles",
    battlersCount: 4,
    battleTypeFlags: (1 | 0x0008_0008) >>> 0,
    battlerPositions: Object.freeze([0, 1, 2, 3]),
  }),
]);

// Two role pairs per topology, chosen so every one of the four
// STATUS2_INFATUATED_WITH bits (0..3) is exercised as an attacker at least
// once across the whole matrix.
const ROLE_PAIRS = Object.freeze([
  { topology: TOPOLOGIES[0], attacker: 0, target: 1, label: "singles_a0t1" },
  { topology: TOPOLOGIES[0], attacker: 1, target: 0, label: "singles_a1t0" },
  { topology: TOPOLOGIES[1], attacker: 2, target: 3, label: "doubles_a2t3" },
  { topology: TOPOLOGIES[1], attacker: 3, target: 1, label: "doubles_a3t1" },
]);

function otherBattlerState(index, salt) {
  return Object.freeze({
    species: SPECIES_CATERPIE,
    personality: personalityWithLowByte((index * 37 + salt) & 0xff, salt + index),
    ability: (salt + index * 13) % 40,
    status2: (hashSalt(salt + index * 97) & 0x0fff_ffff) >>> 0,
  });
}

function canonicalBattler(species, personality, ability, status2, salt, index) {
  const hp = 60 + index * 13;
  return Object.freeze({
    side: index & 1,
    ability,
    hp,
    maxHP: hp + 20,
    moves: Object.freeze([213, 33, 45, 98]), // ATTRACT (213) plus filler
    pp: Object.freeze([15, 10, 10, 10]),
    status1: (salt * 7 + index) & 0xff,
    status2,
    status3: (hashSalt(salt + index * 5) & 0xffff) >>> 0,
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
    item: (salt * 11 + index) & 0xffff,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species,
    personality,
    attack: 50 + index,
    defense: 50 + index,
    spAttack: 50 + index,
    spDefense: 50 + index,
    level: 50,
    friendship: 0,
    partyIndex: index,
  });
}

// One full case's input: `attacker`/`target` battler ids plus their
// species/personality/ability/status2, an `aiObservedAbilityIds[target]`
// seed, and salted siblings for the other two (inactive-in-singles) slots.
function makeProjection({
  rolePair,
  attackerSpecies,
  attackerPersonality,
  targetSpecies,
  targetPersonality,
  targetAbility,
  targetStatus2,
  targetAiObservedAbility,
  salt,
}) {
  const { topology, attacker, target } = rolePair;
  const battlers = BATTLERS.map((index) => {
    if (index === attacker) {
      return canonicalBattler(attackerSpecies, attackerPersonality, (salt + 3) % 40, 0, salt, index);
    }
    if (index === target) {
      return canonicalBattler(targetSpecies, targetPersonality, targetAbility, targetStatus2, salt, index);
    }
    const other = otherBattlerState(index, salt);
    return canonicalBattler(other.species, other.personality, other.ability, other.status2, salt, index);
  });
  const aiObservedAbilityIds = BATTLERS.map((index) =>
    index === target ? targetAiObservedAbility : (salt + index * 19) & 0xff);
  return Object.freeze({
    topology,
    attacker,
    target,
    battlers: Object.freeze(battlers),
    aiObservedAbilityIds: Object.freeze(aiObservedAbilityIds),
    lastUsedAbility: (salt * 3 + 1) & 0xff,
    salt,
  });
}

function canonicalRulesFromProjection(projection) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: projection.battlers,
    selectorRoles: Object.freeze({
      attacker: projection.attacker,
      target: projection.target,
      effectBattler: projection.attacker,
    }),
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 213, // MOVE_ATTRACT
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    lastUsedAbility: projection.lastUsedAbility,
    aiObservedAbilityIds: projection.aiObservedAbilityIds,
    battleTopology: projection.topology,
  });
}

function vectorBattlerState(battler) {
  return Object.freeze({
    species: battler.species,
    personality: battler.personality >>> 0,
    ability: battler.ability,
    status2: battler.status2 >>> 0,
  });
}

function vectorState(rules) {
  return Object.freeze({
    battlers: Object.freeze(rules.battlers.map(vectorBattlerState)),
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    lastUsedAbility: rules.lastUsedAbility,
    aiObservedAbilityIds: Object.freeze([...rules.aiObservedAbilityIds]),
  });
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const program = programModule.loadBattleScriptProgram();
const canonicalInstructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(canonicalInstructions.length === 1, "canonical tryinfatuating singleton drifted");
const canonicalInstruction = canonicalInstructions[0];
assert(canonicalInstruction.opcodeId === OPCODE_ID, "canonical opcode drifted");
assert(canonicalInstruction.dispatcher === DISPATCHER, "canonical dispatcher drifted");
assert(canonicalInstruction.source.label === ENTRY_LABEL, "canonical entry drifted");
assert(canonicalInstruction.programCounter === 1118, "canonical program counter drifted");
assert(canonicalInstruction.operands.length === 1, "canonical operand count drifted");
assert(canonicalInstruction.operands[0]?.widthBytes === 4, "canonical pointer width drifted");
assert(canonicalInstruction.operands[0]?.expression === FAILURE_POINTER, "canonical pointer drifted");
const resolvedFailure = programModule.resolveBattleScriptLabel(program, FAILURE_POINTER);
assert(resolvedFailure, "failure label must resolve");
assert(resolvedFailure.programCounter === 1434, "canonical failure target program counter drifted");
const resolvedOblivious = programModule.resolveBattleScriptLabel(program, OBLIVIOUS_LABEL);
assert(resolvedOblivious, "oblivious label must resolve");
assert(resolvedOblivious.programCounter === 2996, "canonical oblivious target program counter drifted");
assert(!programModule.resolveBattleScriptLabel(program, UNRESOLVED_POINTER), "unresolved label unexpectedly exists");
const handlers = opcodeModule.createBattleScriptTryinfatuatingOpcodeHandlers(program);
const handler = handlers[OPCODE_ID];
assert(typeof handler === "function", "canonical tryinfatuating handler did not register");

function freezeInstructionSpec({
  operandExpressions = [FAILURE_POINTER],
  includeObliviousResolution = true,
} = {}) {
  return Object.freeze({ operandExpressions: Object.freeze([...operandExpressions]), includeObliviousResolution });
}

function instructionFromSpec(spec) {
  const operands = spec.operandExpressions.map((expression) => Object.freeze({
    ...canonicalInstruction.operands[0],
    expression,
  }));
  return Object.freeze({ ...canonicalInstruction, operands: Object.freeze(operands) });
}

function vectorInstruction(spec) {
  const instruction = instructionFromSpec(spec);
  const operand = instruction.operands[0];
  const resolvedFail = operand === undefined ? null : (programModule.resolveBattleScriptLabel(program, operand.expression) ?? null);
  const resolvedOblivious = spec.includeObliviousResolution
    ? (programModule.resolveBattleScriptLabel(program, OBLIVIOUS_LABEL) ?? null)
    : null;
  return Object.freeze({
    operandExpressions: Object.freeze([...spec.operandExpressions]),
    resolvedFailExpression: resolvedFail === null ? null : operand.expression,
    resolvedFailProgramCounter: resolvedFail === null ? null : resolvedFail.programCounter,
    resolvedObliviousExpression: resolvedOblivious === null ? null : OBLIVIOUS_LABEL,
    resolvedObliviousProgramCounter: resolvedOblivious === null ? null : resolvedOblivious.programCounter,
  });
}

const CANONICAL_INSTRUCTION = freezeInstructionSpec();

function controlFromTransition(transition) {
  if (transition.control.kind === "advance") return Object.freeze({ kind: "advance" });
  if (transition.control.kind === "jump") return Object.freeze({
    kind: "jump",
    programCounter: transition.control.programCounter,
  });
  throw new Error(`unexpected canonical control ${transition.control.kind}`);
}

function sourceOutcome(projection, instructionSpec, salt) {
  const initialRules = canonicalRulesFromProjection(projection);
  const inputSnapshot = vectorState(initialRules);
  const state = Object.freeze({
    ...machineModule.createBattleScriptMachine(program, ENTRY_LABEL, initialRules, (0x2468_ace0 + salt) >>> 0),
  });
  try {
    const transition = handler({ program, instruction: instructionFromSpec(instructionSpec), state });
    assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler");
    assert(transition.rng === state.rng, "canonical handler changed RNG");
    assert(transition.events.length === 0, "canonical handler emitted event(s)");
    assert(same(vectorState(initialRules), inputSnapshot), "canonical handler mutated input");
    assert(Object.isFrozen(transition.rulesContext), "canonical output rules must be frozen");
    return Object.freeze({
      initial: inputSnapshot,
      expected: vectorState(transition.rulesContext),
      control: controlFromTransition(transition),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical threw non-Error ${String(error)}`);
    assert(same(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated input");
    return Object.freeze({ initial: inputSnapshot, expected: null, control: null, error: error.message });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) return outcome.control.kind;
  if (outcome.error === "Cmd_tryinfatuating requires both an attacker and a target role") return "missing-role";
  if (outcome.error.startsWith("Cmd_tryinfatuating: BattleScript_ObliviousPreventsAttraction")) return "unresolved-oblivious-target";
  if (outcome.error.startsWith("Cmd_tryinfatuating: unresolved jump target")) return "unresolved-fail-target";
  if (outcome.error.startsWith("no genderRatio data for species id")) return "unknown-species";
  throw new Error(`unknown canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, projection, instructionSpec = CANONICAL_INSTRUCTION) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const outcome = sourceOutcome(projection, instructionSpec, projection.salt);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    initial: outcome.initial,
    instruction: vectorInstruction(instructionSpec),
    expected: outcome.expected,
    control: outcome.control,
    expectedError: outcome.error,
  }));
}

// Primary matrix: every gender profile against every other, for both
// attacker and target, across four (topology, role-pair) combinations
// covering every STATUS2_INFATUATED_WITH bit as an attacker at least once.
let saltCounter = 100;
for (const rolePair of ROLE_PAIRS) {
  for (const attackerProfile of PROFILES) {
    for (const targetProfile of PROFILES) {
      const salt = saltCounter++;
      addCase(
        `matrix_${rolePair.label}_${attackerProfile.label}_x_${targetProfile.label}`,
        "gender-profile-matrix",
        makeProjection({
          rolePair,
          attackerSpecies: attackerProfile.species,
          attackerPersonality: profilePersonality(attackerProfile, salt),
          targetSpecies: targetProfile.species,
          targetPersonality: profilePersonality(targetProfile, salt + 1),
          targetAbility: (salt + 5) % 40 === ABILITY_OBLIVIOUS ? 0 : (salt + 5) % 40,
          targetStatus2: 0,
          targetAiObservedAbility: (salt + 9) & 0xff,
          salt,
        }),
      );
    }
  }
}

// STATUS2_INFATUATION sweep: fixed opposite-gender baseline (male vs
// female), target.status2 in {0, infatuated-with-each-battler-bit,
// other-bits-only}.
const STATUS2_VARIANTS = [
  { label: "clear", value: 0 },
  { label: "infatuated_b0", value: 1 << 16 },
  { label: "infatuated_b1", value: 1 << 17 },
  { label: "infatuated_b2", value: 1 << 18 },
  { label: "infatuated_b3", value: 1 << 19 },
  { label: "other_bits_only", value: (1 << 3) | (1 << 20) },
];
for (const rolePair of ROLE_PAIRS) {
  for (const variant of STATUS2_VARIANTS) {
    const salt = saltCounter++;
    addCase(
      `status2_${rolePair.label}_${variant.label}`,
      "status2-infatuation-sweep",
      makeProjection({
        rolePair,
        attackerSpecies: SPECIES_NIDORAN_M,
        attackerPersonality: profilePersonality({ species: SPECIES_NIDORAN_M, mode: "fixed" }, salt),
        targetSpecies: SPECIES_NIDORAN_F,
        targetPersonality: profilePersonality({ species: SPECIES_NIDORAN_F, mode: "fixed" }, salt + 1),
        targetAbility: 0,
        targetStatus2: variant.value,
        targetAiObservedAbility: (salt + 9) & 0xff,
        salt,
      }),
    );
  }
}

// Ability/Oblivious sweep: target ability in {Oblivious, two other values} x
// aiObservedAbilityIds[target] in {already Oblivious, other}, opposite-gender
// baseline so the non-Oblivious rows would otherwise succeed.
const ABILITY_VARIANTS = [ABILITY_OBLIVIOUS, 0, 46];
const AI_OBSERVED_VARIANTS = [ABILITY_OBLIVIOUS, 0];
for (const rolePair of ROLE_PAIRS) {
  for (const ability of ABILITY_VARIANTS) {
    for (const aiObserved of AI_OBSERVED_VARIANTS) {
      const salt = saltCounter++;
      addCase(
        `ability_${rolePair.label}_ab${ability}_ai${aiObserved}`,
        "ability-oblivious-sweep",
        makeProjection({
          rolePair,
          attackerSpecies: SPECIES_NIDORAN_M,
          attackerPersonality: profilePersonality({ species: SPECIES_NIDORAN_M, mode: "fixed" }, salt),
          targetSpecies: SPECIES_NIDORAN_F,
          targetPersonality: profilePersonality({ species: SPECIES_NIDORAN_F, mode: "fixed" }, salt + 1),
          targetAbility: ability,
          targetStatus2: 0,
          targetAiObservedAbility: aiObserved,
          salt,
        }),
      );
    }
  }
}

// Unknown species: attacker species absent from species-stats.json.
{
  const salt = saltCounter++;
  addCase(
    "unknown_attacker_species",
    "unknown-species",
    makeProjection({
      rolePair: ROLE_PAIRS[0],
      attackerSpecies: UNKNOWN_SPECIES,
      attackerPersonality: personalityWithLowByte(salt & 0xff, salt),
      targetSpecies: SPECIES_NIDORAN_F,
      targetPersonality: profilePersonality({ species: SPECIES_NIDORAN_F, mode: "fixed" }, salt + 1),
      targetAbility: 0,
      targetStatus2: 0,
      targetAiObservedAbility: 0,
      salt,
    }),
  );
}
{
  const salt = saltCounter++;
  addCase(
    "unknown_target_species",
    "unknown-species",
    makeProjection({
      rolePair: ROLE_PAIRS[0],
      attackerSpecies: SPECIES_NIDORAN_M,
      attackerPersonality: profilePersonality({ species: SPECIES_NIDORAN_M, mode: "fixed" }, salt),
      targetSpecies: UNKNOWN_SPECIES,
      targetPersonality: personalityWithLowByte((salt + 1) & 0xff, salt + 1),
      targetAbility: 0,
      targetStatus2: 0,
      targetAiObservedAbility: 0,
      salt,
    }),
  );
}

// Missing roles: attacker null, then target null.
{
  const salt = saltCounter++;
  const projection = makeProjection({
    rolePair: ROLE_PAIRS[0],
    attackerSpecies: SPECIES_NIDORAN_M,
    attackerPersonality: profilePersonality({ species: SPECIES_NIDORAN_M, mode: "fixed" }, salt),
    targetSpecies: SPECIES_NIDORAN_F,
    targetPersonality: profilePersonality({ species: SPECIES_NIDORAN_F, mode: "fixed" }, salt + 1),
    targetAbility: 0,
    targetStatus2: 0,
    targetAiObservedAbility: 0,
    salt,
  });
  addCase("missing_attacker_role", "missing-role", Object.freeze({ ...projection, attacker: null }));
}
{
  const salt = saltCounter++;
  const projection = makeProjection({
    rolePair: ROLE_PAIRS[0],
    attackerSpecies: SPECIES_NIDORAN_M,
    attackerPersonality: profilePersonality({ species: SPECIES_NIDORAN_M, mode: "fixed" }, salt),
    targetSpecies: SPECIES_NIDORAN_F,
    targetPersonality: profilePersonality({ species: SPECIES_NIDORAN_F, mode: "fixed" }, salt + 1),
    targetAbility: 0,
    targetStatus2: 0,
    targetAiObservedAbility: 0,
    salt,
  });
  addCase("missing_target_role", "missing-role", Object.freeze({ ...projection, target: null }));
}

// Late label resolution: the operand's failure pointer or the hardcoded
// Oblivious label is unresolved when its branch is actually taken.
{
  const salt = saltCounter++;
  addCase(
    "unresolved_fail_target_when_same_gender",
    "unresolved-fail-target",
    makeProjection({
      rolePair: ROLE_PAIRS[0],
      attackerSpecies: SPECIES_NIDORAN_M,
      attackerPersonality: profilePersonality({ species: SPECIES_NIDORAN_M, mode: "fixed" }, salt),
      targetSpecies: SPECIES_NIDORAN_M,
      targetPersonality: profilePersonality({ species: SPECIES_NIDORAN_M, mode: "fixed" }, salt + 1),
      targetAbility: 0,
      targetStatus2: 0,
      targetAiObservedAbility: 0,
      salt,
    }),
    freezeInstructionSpec({ operandExpressions: [UNRESOLVED_POINTER] }),
  );
}
// NOTE: unlike the operand-supplied failure pointer, the Oblivious target is
// a hardcoded string baked into the canonical TypeScript handler itself
// (`resolveBattleScriptLabel(context.program, "BattleScript_ObliviousPreventsAttraction")`).
// The committed program always defines that label, so no instruction
// operand can make canonical execution actually take the "unresolved
// Oblivious target" branch -- it is not TS-differentially realizable here.
// `BattleScriptTryinfatuatingError::UnresolvedObliviousTarget` is instead
// covered by a direct Rust unit test in `battle_script_tryinfatuating.rs`
// that supplies `resolved_oblivious_target: None` to `apply_*` directly.

function sourceRegistration(includeCanonical, extra) {
  const noise = Object.freeze({ ...canonicalInstruction, opcodeName: "B_SCR_OP_RUST_NOISE", opcodeId: 0 });
  const instructions = Object.freeze([
    ...(extra ?? []),
    noise,
    ...(includeCanonical ? [canonicalInstruction] : []),
  ]);
  const customProgram = Object.freeze({ ...program, instructions });
  try {
    const registered = opcodeModule.createBattleScriptTryinfatuatingOpcodeHandlers(customProgram);
    const keys = Object.keys(registered);
    assert(keys.length === 1, "canonical registration emitted more than one key");
    return Object.freeze({ opcodeId: Number(keys[0]), error: null });
  } catch (error) {
    assert(error instanceof Error, `registration threw non-Error ${String(error)}`);
    return Object.freeze({ opcodeId: null, error: error.message });
  }
}

const registrationCases = [];
function addRegistration(label, outcome) {
  registrationCases.push(Object.freeze({ label, expectedOpcodeId: outcome.opcodeId, expectedError: outcome.error }));
}
addRegistration("valid_singleton", sourceRegistration(true));
addRegistration("missing_opcode", sourceRegistration(false));
addRegistration("duplicate_first_wins", sourceRegistration(true, [canonicalInstruction]));

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => a.localeCompare(b));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["source-battler-slots", 4],
  ["topology-variants", TOPOLOGIES.length],
  ["role-pair-variants", ROLE_PAIRS.length],
  ["gender-profile-variants", PROFILES.length],
  ["status2-variants", STATUS2_VARIANTS.length],
  ["ability-variants", ABILITY_VARIANTS.length],
  ["ai-observed-variants", AI_OBSERVED_VARIANTS.length],
  ["registration-cases", registrationCases.length],
]);
const corpus = Object.freeze({
  profiles: PROFILES,
  status2Variants: STATUS2_VARIANTS,
  abilityVariants: ABILITY_VARIANTS,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
  registrationCases,
});
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");
const generator = fs.readFileSync(scriptPath);
const generatorHash = crypto.createHash("sha256").update(generator).digest("hex");

function rustString(value) { return JSON.stringify(value); }
function rustU8(value) { return `0x${value.toString(16).padStart(2, "0")}`; }
function rustU16(value) { return `0x${value.toString(16).padStart(4, "0")}`; }
function rustU32(value) { return `0x${value.toString(16).padStart(8, "0")}`; }
function rustBattler(value) { return `BattleScriptTryinfatuatingBattler::Battler${value}`; }
function rustOptionalBattler(value) { return value === null ? "None" : `Some(${rustBattler(value)})`; }
function rustControl(value) {
  if (value === null) return "None";
  return value.kind === "advance" ? "Some(BattleScriptTryinfatuatingControl::Advance)"
    : `Some(BattleScriptTryinfatuatingControl::Jump { program_counter: ${value.programCounter} })`;
}
function rustBattlerState(value) {
  return `BattleScriptTryinfatuatingVectorBattlerState { species: ${rustU16(value.species)}, personality: ${rustU32(value.personality)}, ability: ${rustU8(value.ability)}, status2: ${rustU32(value.status2)} }`;
}
function rustState(value) {
  return [
    "BattleScriptTryinfatuatingVectorState {",
    `battlers: [${value.battlers.map(rustBattlerState).join(", ")}],`,
    `attacker: ${rustOptionalBattler(value.attacker)},`,
    `target: ${rustOptionalBattler(value.target)},`,
    `last_used_ability: ${rustU8(value.lastUsedAbility)},`,
    `ai_observed_ability_ids: [${value.aiObservedAbilityIds.map(rustU8).join(", ")}],`,
    "}",
  ].join(" ");
}
function rustOptionalState(value) { return value === null ? "None" : `Some(${rustState(value)})`; }
function rustOptionalString(value) { return value === null ? "None" : `Some(${rustString(value)})`; }
function rustOptionalLabel(expression, programCounter) {
  return expression === null ? "None"
    : `Some(BattleScriptTryinfatuatingResolvedLabel { expression: ${rustString(expression)}, program_counter: ${programCounter} })`;
}
function rustInstruction(value) {
  const operands = value.operandExpressions.map((expression) =>
    `BattleScriptTryinfatuatingOperand { width_bytes: 4, expression: ${rustString(expression)} }`);
  return `BattleScriptTryinfatuatingInstruction { opcode_name: ${rustString(OPCODE_NAME)}, program_counter: 1118, opcode_id: ${rustU8(OPCODE_ID)}, dispatcher: ${rustString(DISPATCHER)}, operands: &[${operands.join(", ")}], resolved_oblivious_target: ${rustOptionalLabel(value.resolvedObliviousExpression, value.resolvedObliviousProgramCounter)}, resolved_fail_target: ${rustOptionalLabel(value.resolvedFailExpression, value.resolvedFailProgramCounter)} }`;
}
function rustCensus(name, entries, type) {
  return [
    `pub const ${name}: [(&str, ${type}); ${entries.length}] = [`,
    ...entries.map(([key, value]) => `    (${rustString(key)}, ${value}),`),
    "];",
  ];
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-tryinfatuating-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptTryinfatuatingOpcode.ts via node --experimental-strip-types.");
lines.push("// Regenerate from any cwd; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_tryinfatuating::{");
lines.push("    BattleScriptTryinfatuatingBattler, BattleScriptTryinfatuatingControl,");
lines.push("    BattleScriptTryinfatuatingInstruction, BattleScriptTryinfatuatingOperand,");
lines.push("    BattleScriptTryinfatuatingResolvedLabel,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_TRYINFATUATING_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYINFATUATING_VECTOR_CORPUS_BYTES: usize = ${Buffer.byteLength(corpusJson)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYINFATUATING_VECTOR_GENERATOR_SHA256: &str = ${rustString(generatorHash)};`);
lines.push(`pub const BATTLE_SCRIPT_TRYINFATUATING_VECTOR_GENERATOR_BYTES: usize = ${generator.length};`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryinfatuatingVectorBattlerState { pub species: u16, pub personality: u32, pub ability: u8, pub status2: u32 }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryinfatuatingVectorState { pub battlers: [BattleScriptTryinfatuatingVectorBattlerState; 4], pub attacker: Option<BattleScriptTryinfatuatingBattler>, pub target: Option<BattleScriptTryinfatuatingBattler>, pub last_used_ability: u8, pub ai_observed_ability_ids: [u8; 4] }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryinfatuatingVectorCase { pub label: &'static str, pub category: &'static str, pub branch: &'static str, pub initial: BattleScriptTryinfatuatingVectorState, pub instruction: BattleScriptTryinfatuatingInstruction<'static>, pub expected: Option<BattleScriptTryinfatuatingVectorState>, pub control: Option<BattleScriptTryinfatuatingControl>, pub expected_error: Option<&'static str> }");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptTryinfatuatingRegistrationVectorCase { pub label: &'static str, pub expected_opcode_id: Option<u8>, pub expected_error: Option<&'static str> }");
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYINFATUATING_DOMAIN_CENSUS", domainCensus, "u64"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYINFATUATING_CATEGORY_CENSUS", categoryCensus, "usize"));
lines.push("");
lines.push(...rustCensus("BATTLE_SCRIPT_TRYINFATUATING_BRANCH_CENSUS", branchCensus, "usize"));
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_TRYINFATUATING_CASES: [BattleScriptTryinfatuatingVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTryinfatuatingVectorCase {");
  lines.push(`        label: ${rustString(value.label)}, category: ${rustString(value.category)}, branch: ${rustString(value.branch)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        instruction: ${rustInstruction(value.instruction)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        control: ${rustControl(value.control)}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_TRYINFATUATING_REGISTRATION_CASES: [BattleScriptTryinfatuatingRegistrationVectorCase; ${registrationCases.length}] = [`);
for (const value of registrationCases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptTryinfatuatingRegistrationVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        expected_opcode_id: ${value.expectedOpcodeId === null ? "None" : `Some(${rustU8(value.expectedOpcodeId)})`}, expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
let formatted = false;
for (const rustfmt of [path.join(process.env.HOME ?? "", ".cargo", "bin", "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-tryinfatuating-vectors: could not find rustfmt");
const generated = fs.readFileSync(outPath);
console.log(`wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases, ${registrationCases.length} registration cases, corpus ${corpusHash})`);
console.log(`generated sha256 ${crypto.createHash("sha256").update(generated).digest("hex")} bytes ${generated.length}`);
