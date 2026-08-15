#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptWeightDamageOpcode.ts.
// Expected handler, scalar-helper, and registration observations are made by
// executing canonical TypeScript. This script also emits the production
// source-derived Pokédex catalog consumed by the native leaf.
//
// Run from any cwd:
// node --experimental-strip-types core-rs/tools/gen-battle-script-weightdamage-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const coreSourceDir = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
);
const vectorOutPath = path.join(coreSourceDir, "battle_script_weightdamage_vectors_gen.rs");
const catalogOutPath = path.join(coreSourceDir, "battle_script_weightdamage_catalog_gen.rs");
const speciesStatsPath = path.join(workspaceRoot, "src", "data", "gen", "species-stats.json");

const modules = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptWeightDamageOpcode.ts",
  )).href),
]);
const programModule = modules[0];
const machineModule = modules[1];
const opcodeModule = modules[2];

const OPCODE_NAME = "B_SCR_OP_WEIGHTDAMAGECALCULATION";
const OPCODE_ID = 0xdd;
const DISPATCHER = "Cmd_weightdamagecalculation";
const ENTRY_LABEL = "BattleScript_EffectLowKick";
const BATTLE_SLOTS = 4;
const U16_MAX = 0xffff;
const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLER_DOMAIN = Object.freeze([null, 0, 1, 2, 3]);
const OPTIONAL_SELECTOR_COMBINATIONS = Object.freeze(
  OPTIONAL_BATTLER_DOMAIN.flatMap((attacker) =>
    OPTIONAL_BATTLER_DOMAIN.flatMap((effectBattler) =>
      OPTIONAL_BATTLER_DOMAIN.map((fainted) => Object.freeze({
        attacker,
        effectBattler,
        fainted,
      }))
    )
  ),
);
const LOW_KICK_THRESHOLDS = Object.freeze([100, 250, 500, 1000, 2000]);
const LOW_KICK_POWERS = Object.freeze([20, 40, 60, 80, 100, 120]);
const THRESHOLD_NEIGHBORS = Object.freeze([
  0, 1, 2, 98, 99, 100, 101, 248, 249, 250, 251, 498, 499, 500, 501,
  998, 999, 1000, 1001, 1998, 1999, 2000, 2001,
]);
const BROAD_SAFE_WEIGHT_DOMAIN = Object.freeze([
  -0, 3, 10, 11, 12, 18, 20, 42, 69, 85, 99, 120, 177, 346, 596, 9999,
  65535, 1_000_000, 2_147_483_647, 4_294_967_295, 4_294_967_296,
  9_007_199_254_740_990, MAX_SAFE_INTEGER,
]);
const MALFORMED_WEIGHT_DOMAIN = Object.freeze([
  Object.freeze({ label: "nan", value: Number.NaN }),
  Object.freeze({ label: "positive_infinity", value: Number.POSITIVE_INFINITY }),
  Object.freeze({ label: "negative_infinity", value: Number.NEGATIVE_INFINITY }),
  Object.freeze({ label: "negative_one", value: -1 }),
  Object.freeze({ label: "negative_fraction", value: -0.5 }),
  Object.freeze({ label: "positive_fraction", value: 0.5 }),
  Object.freeze({ label: "above_max_safe", value: MAX_SAFE_INTEGER + 1 }),
]);
const DYNAMIC_BASE_POWER_EDGE_DOMAIN = Object.freeze([
  0, 1, 19, 20, 39, 40, 59, 60, 79, 80, 99, 100, 119, 120, U16_MAX,
]);
const SIBLING_SPECIES = Object.freeze([1, 67, 113, 143, 300, 386, 95, 411]);
const REPEAT_SPECIES = Object.freeze([1, 386, 113, 300, 95, 143]);
const OUT_OF_CATALOG_SPECIES = Object.freeze([0, 412, U16_MAX]);
const MISSING_TARGET_SPECIES = Object.freeze([0, 252, 276, 412, U16_MAX]);

function assert(condition, message) {
  if (!condition) throw new Error("gen-battle-script-weightdamage-vectors: " + message);
}

function f64Bits(value) {
  const bytes = new ArrayBuffer(8);
  new DataView(bytes).setFloat64(0, value, false);
  return new DataView(bytes).getBigUint64(0, false).toString();
}

function roleLabel(value) {
  return value === null ? "none" : "b" + value;
}

function assertU16(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= U16_MAX,
    label + " must be a u16, got " + value);
}

function assertOptionalBattler(value, label) {
  assert(value === null || BATTLER_DOMAIN.includes(value),
    label + " must be null or a battler 0..3, got " + value);
}

function freezeRules(species, dynamicBasePower, roles) {
  assert(Array.isArray(species) && species.length === BATTLE_SLOTS,
    "rules species must have four cells");
  species.forEach((value, index) => assertU16(value, "species[" + index + "]"));
  assertU16(dynamicBasePower, "dynamicBasePower");
  assertOptionalBattler(roles.attacker, "attacker");
  assertOptionalBattler(roles.target, "target");
  assertOptionalBattler(roles.effectBattler, "effectBattler");
  assertOptionalBattler(roles.fainted, "fainted");
  return Object.freeze({
    battlers: Object.freeze(species.map((value) => Object.freeze({ species: value }))),
    dynamicBasePower,
    selectorRoles: Object.freeze({
      attacker: roles.attacker,
      target: roles.target,
      effectBattler: roles.effectBattler,
      fainted: roles.fainted,
    }),
  });
}

function makeRules(target, selectedSpecies, dynamicBasePower, aliases, salt) {
  const species = BATTLER_DOMAIN.map((battler) =>
    SIBLING_SPECIES[(battler + salt) % SIBLING_SPECIES.length]
  );
  species[target === null ? salt % BATTLE_SLOTS : target] = selectedSpecies;
  return freezeRules(species, dynamicBasePower, {
    attacker: aliases.attacker,
    target,
    effectBattler: aliases.effectBattler,
    fainted: aliases.fainted,
  });
}

function vectorState(rules) {
  return Object.freeze({
    species: Object.freeze(rules.battlers.map((battler) => battler.species)),
    dynamicBasePower: rules.dynamicBasePower,
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const speciesStats = JSON.parse(fs.readFileSync(speciesStatsPath, "utf8"));
assert(Array.isArray(speciesStats.species), "species-stats must contain a species array");
const catalog = Object.freeze(speciesStats.species.map((row) => Object.freeze({
  id: row.id,
  weightHectograms: row.weightHectograms,
})));
assert(catalog.length === 411, "source species catalog must retain 411 rows");
assert(catalog.every((row, index) => row.id === index + 1),
  "source species IDs must remain dense 1..411");
assert(catalog.every((row) => row.weightHectograms === null
  || (Number.isInteger(row.weightHectograms) && row.weightHectograms >= 0
    && row.weightHectograms <= U16_MAX)),
  "source species weights must be null or u16 hectograms");
const legacyIds = Object.freeze(catalog
  .filter((row) => row.weightHectograms === null)
  .map((row) => row.id));
assert(JSON.stringify(legacyIds) === JSON.stringify([
  252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264,
  265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276,
]), "legacy compatibility null IDs drifted");

const program = programModule.loadBattleScriptProgram();
const matchingInstructions = program.instructions.filter(
  (instruction) => instruction.opcodeName === OPCODE_NAME,
);
assert(matchingInstructions.length === 1,
  "expected exactly one " + OPCODE_NAME + " instruction, got " + matchingInstructions.length);
const instruction = matchingInstructions[0];
assert(instruction.opcodeId === OPCODE_ID, "canonical opcode ID drifted");
assert(instruction.dispatcher === DISPATCHER, "canonical dispatcher drifted");
assert(instruction.operands.length === 0, "canonical command gained operands");
const handlers = opcodeModule.createBattleScriptWeightDamageOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical weightdamage handler was not registered");

function sourceOutcome(initialRules, applications) {
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  const controls = [];
  const powers = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const currentSnapshot = vectorState(currentRules);
      const state = machineModule.createBattleScriptMachine(
        program,
        ENTRY_LABEL,
        currentRules,
        (0x44d4_0000 + application) >>> 0,
      );
      const transition = handler({ program, instruction, state });
      assert(transition.control.kind === "advance", "canonical handler did not advance");
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(sameState(vectorState(currentRules), currentSnapshot),
        "canonical handler mutated input rules");
      assert(Object.isFrozen(transition.rulesContext), "canonical output rules were not frozen");
      assert(transition.rulesContext !== currentRules,
        "canonical output reused complete rules object");
      assert(transition.rulesContext.battlers === currentRules.battlers,
        "canonical output replaced untouched battlers");
      assert(transition.rulesContext.selectorRoles === currentRules.selectorRoles,
        "canonical output replaced selector aliases");
      const target = currentRules.selectorRoles.target;
      assert(target !== null, "successful handler had no target");
      const weight = opcodeModule.sourceSpeciesWeightHectograms(
        currentRules.battlers[target].species,
      );
      const expectedPower = opcodeModule.lowKickPowerForWeight(weight);
      assert(transition.rulesContext.dynamicBasePower === expectedPower,
        "canonical handler did not write source-derived Low Kick power");
      controls.push("advance");
      powers.push(expectedPower);
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot),
      "successful canonical handler mutated original rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      powers: Object.freeze(powers),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, "canonical handler threw non-Error " + String(error));
    assert(sameState(vectorState(initialRules), inputSnapshot),
      "throwing canonical handler mutated original rules");
    return Object.freeze({
      expected: null,
      controls: Object.freeze(controls),
      powers: Object.freeze(powers),
      error: error.message,
    });
  }
}

function handlerBranch(outcome) {
  if (outcome.error === null) return "write-power-" + outcome.powers.join("-then-") + "-advance";
  if (outcome.error === "Battle Script hit-chain command requires a target role") {
    return "missing-target-role";
  }
  if (outcome.error.includes("legacy compatibility id without a source Pokédex weight")) {
    return "legacy-compatibility-no-weight";
  }
  if (outcome.error.includes("outside the source species catalog")) return "out-of-catalog";
  throw new Error("unexpected handler error " + outcome.error);
}

const cases = [];
function addCase(label, category, initialRules, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), "invalid case label " + label);
  assert(!cases.some((value) => value.label === label), "duplicate case " + label);
  assert(applications === 1 || applications === 2,
    label + " applications must be one or two");
  const outcome = sourceOutcome(initialRules, applications);
  if (initialRules.selectorRoles.target === null) {
    assert(outcome.error === "Battle Script hit-chain command requires a target role",
      label + " missing target did not fail first");
    assert(outcome.controls.length === 0, label + " missing target advanced");
  }
  cases.push(Object.freeze({
    label,
    category,
    branch: handlerBranch(outcome),
    applications,
    initial: vectorState(initialRules),
    expected: outcome.expected,
    controls: outcome.controls,
    expectedError: outcome.error,
  }));
}

// Every source-catalog row is evaluated through the canonical handler. The
// 25 compatibility IDs must retain their exact null-weight failure.
for (const [index, row] of catalog.entries()) {
  const target = index % BATTLE_SLOTS;
  const aliases = OPTIONAL_SELECTOR_COMBINATIONS[index % OPTIONAL_SELECTOR_COMBINATIONS.length];
  addCase(
    "catalog_species_" + row.id + "_target_" + target,
    "every-source-species-catalog-row",
    makeRules(
      target,
      row.id,
      DYNAMIC_BASE_POWER_EDGE_DOMAIN[index % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length],
      aliases,
      index,
    ),
  );
}

// All four target aliases crossed with every nullable sibling selector matrix.
for (const target of BATTLER_DOMAIN) {
  for (const [index, aliases] of OPTIONAL_SELECTOR_COMBINATIONS.entries()) {
    addCase(
      "target_matrix_t" + target + "_a" + roleLabel(aliases.attacker)
        + "_e" + roleLabel(aliases.effectBattler) + "_f" + roleLabel(aliases.fainted),
      "all-target-and-optional-selector-role-combinations",
      makeRules(
        target,
        REPEAT_SPECIES[(target + index) % REPEAT_SPECIES.length],
        DYNAMIC_BASE_POWER_EDGE_DOMAIN[
          (target * OPTIONAL_SELECTOR_COMBINATIONS.length + index)
            % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length
        ],
        aliases,
        1000 + target * OPTIONAL_SELECTOR_COMBINATIONS.length + index,
      ),
    );
  }
}

// Every relevant prior u16 dynamic power is overwritten for all target aliases.
for (const target of BATTLER_DOMAIN) {
  for (const [index, dynamicBasePower] of DYNAMIC_BASE_POWER_EDGE_DOMAIN.entries()) {
    addCase(
      "prior_dynamic_t" + target + "_v" + dynamicBasePower,
      "prior-dynamic-base-power-overwrite-matrix",
      makeRules(
        target,
        REPEAT_SPECIES[(target + index) % REPEAT_SPECIES.length],
        dynamicBasePower,
        OPTIONAL_SELECTOR_COMBINATIONS[
          (target * DYNAMIC_BASE_POWER_EDGE_DOMAIN.length + index)
            % OPTIONAL_SELECTOR_COMBINATIONS.length
        ],
        4000 + target * DYNAMIC_BASE_POWER_EDGE_DOMAIN.length + index,
      ),
    );
  }
}

// A second application receives unchanged siblings and must advance again.
for (const target of BATTLER_DOMAIN) {
  for (const [index, species] of REPEAT_SPECIES.entries()) {
    addCase(
      "repeat_t" + target + "_species_" + species,
      "repeated-application-idempotence",
      makeRules(
        target,
        species,
        DYNAMIC_BASE_POWER_EDGE_DOMAIN[(target + index + 3) % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length],
        OPTIONAL_SELECTOR_COMBINATIONS[
          (target * REPEAT_SPECIES.length + index) % OPTIONAL_SELECTOR_COMBINATIONS.length
        ],
        5000 + target * REPEAT_SPECIES.length + index,
      ),
      2,
    );
  }
}

// Missing target must win before both legacy-null and outside-catalog species.
for (const [index, aliases] of OPTIONAL_SELECTOR_COMBINATIONS.entries()) {
  addCase(
    "missing_target_a" + roleLabel(aliases.attacker) + "_e"
      + roleLabel(aliases.effectBattler) + "_f" + roleLabel(aliases.fainted),
    "missing-target-before-species-lookup",
    makeRules(
      null,
      MISSING_TARGET_SPECIES[index % MISSING_TARGET_SPECIES.length],
      DYNAMIC_BASE_POWER_EDGE_DOMAIN[index % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length],
      aliases,
      6000 + index,
    ),
  );
}

for (const target of BATTLER_DOMAIN) {
  for (const [index, species] of OUT_OF_CATALOG_SPECIES.entries()) {
    addCase(
      "outside_catalog_t" + target + "_species_" + species,
      "out-of-catalog-target-species",
      makeRules(
        target,
        species,
        DYNAMIC_BASE_POWER_EDGE_DOMAIN[(target + index) % DYNAMIC_BASE_POWER_EDGE_DOMAIN.length],
        OPTIONAL_SELECTOR_COMBINATIONS[
          (target * OUT_OF_CATALOG_SPECIES.length + index) % OPTIONAL_SELECTOR_COMBINATIONS.length
        ],
        7000 + target * OUT_OF_CATALOG_SPECIES.length + index,
      ),
    );
  }
}

function scalarOutcome(kind, value) {
  try {
    const expected = kind === "weight"
      ? opcodeModule.lowKickPowerForWeight(value)
      : opcodeModule.sourceSpeciesWeightHectograms(value);
    assert(Number.isInteger(expected) && expected >= 0 && expected <= U16_MAX,
      "scalar " + kind + " returned non-u16 " + expected);
    return Object.freeze({ expected, error: null });
  } catch (error) {
    assert(error instanceof Error, "scalar " + kind + " threw non-Error " + String(error));
    return Object.freeze({ expected: null, error: error.message });
  }
}

const scalarCases = [];
function addScalarCase(label, category, kind, value) {
  assert(!scalarCases.some((entry) => entry.label === label), "duplicate scalar " + label);
  const outcome = scalarOutcome(kind, value);
  scalarCases.push(Object.freeze({
    label,
    category,
    kind,
    numberBits: f64Bits(value),
    expected: outcome.expected,
    expectedError: outcome.error,
  }));
}

for (const value of THRESHOLD_NEIGHBORS) {
  addScalarCase("weight_threshold_" + value, "all-strict-threshold-neighbors", "weight", value);
}
for (const value of BROAD_SAFE_WEIGHT_DOMAIN) {
  addScalarCase("weight_safe_" + f64Bits(value), "broad-nonnegative-safe-integer-domain", "weight", value);
}
for (const value of MALFORMED_WEIGHT_DOMAIN) {
  addScalarCase("weight_invalid_" + value.label, "malformed-direct-weight-helper-inputs", "weight", value.value);
}
for (const entry of [
  Object.freeze({ label: "zero", value: 0 }),
  Object.freeze({ label: "one", value: 1 }),
  Object.freeze({ label: "last_pre_legacy", value: 251 }),
  Object.freeze({ label: "legacy_start", value: 252 }),
  Object.freeze({ label: "legacy_end", value: 276 }),
  Object.freeze({ label: "first_post_legacy", value: 277 }),
  Object.freeze({ label: "last_catalog", value: 411 }),
  Object.freeze({ label: "post_catalog", value: 412 }),
  Object.freeze({ label: "u16_max", value: U16_MAX }),
  Object.freeze({ label: "fraction", value: 1.5 }),
  Object.freeze({ label: "negative", value: -1 }),
  Object.freeze({ label: "nan", value: Number.NaN }),
  Object.freeze({ label: "infinity", value: Number.POSITIVE_INFINITY }),
]) {
  addScalarCase("species_" + entry.label, "direct-source-species-helper-domain", "species", entry.value);
}

function instructionSpec(sourceInstruction) {
  return Object.freeze({
    opcodeName: sourceInstruction.opcodeName,
    programCounter: sourceInstruction.programCounter,
    opcodeId: sourceInstruction.opcodeId,
    dispatcher: sourceInstruction.dispatcher,
    operandCount: sourceInstruction.operands.length,
  });
}

function materializeInstruction(spec) {
  const operands = Object.freeze(Array.from({ length: spec.operandCount }, (_value, index) =>
    Object.freeze({
      widthBytes: 1,
      expression: String(index),
      sourceMacro: "generated-invalid-shape",
      sourceMacroLine: 0,
      wrapperPath: Object.freeze([]),
    })
  ));
  return Object.freeze({
    ...instruction,
    opcodeName: spec.opcodeName,
    programCounter: spec.programCounter,
    opcodeId: spec.opcodeId,
    dispatcher: spec.dispatcher,
    operands,
  });
}

function registrationOutcome(specs) {
  const registrationProgram = Object.freeze({
    ...program,
    instructions: Object.freeze(specs.map(materializeInstruction)),
  });
  try {
    const registrationHandlers =
      opcodeModule.createBattleScriptWeightDamageOpcodeHandlers(registrationProgram);
    const candidates = registrationProgram.instructions.filter(
      (candidate) => candidate.opcodeName === OPCODE_NAME,
    );
    assert(candidates.length === 1, "successful registration selected wrong cardinality");
    assert(typeof registrationHandlers[candidates[0].opcodeId] === "function",
      "successful registration omitted selected handler");
    return Object.freeze({ expected: instructionSpec(candidates[0]), error: null });
  } catch (error) {
    assert(error instanceof Error, "registration threw non-Error " + String(error));
    return Object.freeze({ expected: null, error: error.message });
  }
}

const registrationCases = [];
function addRegistrationCase(label, specs) {
  const normalized = Object.freeze(specs.map(instructionSpec));
  const outcome = registrationOutcome(normalized);
  registrationCases.push(Object.freeze({
    label,
    instructions: normalized,
    expected: outcome.expected,
    expectedError: outcome.error,
  }));
}

addRegistrationCase("canonical", [instruction]);
addRegistrationCase("no_concrete_start", []);
addRegistrationCase("two_concrete_starts", [instruction, instruction]);
addRegistrationCase("three_concrete_starts", [instruction, instruction, instruction]);
addRegistrationCase("wrong_opcode", [{ ...instruction, opcodeId: 0xdc }]);
addRegistrationCase("wrong_dispatcher", [{ ...instruction, dispatcher: "Cmd_trysetgrudge" }]);
addRegistrationCase("unexpected_operand", [{ ...instruction, operands: [{}] }]);
assert(registrationCases.length === 7, "registration corpus must retain seven shape cases");

assert(cases.length > 1000 && cases.length < 1300,
  "handler corpus must remain bounded, got " + cases.length);
assert(scalarCases.length > 50 && scalarCases.length < 100,
  "scalar corpus must remain bounded, got " + scalarCases.length);
for (const row of catalog) {
  assert(cases.some((entry) => entry.category === "every-source-species-catalog-row"
    && entry.initial.species[entry.initial.target] === row.id),
  "catalog row " + row.id + " missing from handler corpus");
}
for (const target of BATTLER_DOMAIN) {
  for (const aliases of OPTIONAL_SELECTOR_COMBINATIONS) {
    assert(cases.some((entry) =>
      entry.category === "all-target-and-optional-selector-role-combinations"
      && entry.initial.target === target
      && entry.initial.attacker === aliases.attacker
      && entry.initial.effectBattler === aliases.effectBattler
      && entry.initial.fainted === aliases.fainted),
    "target/alias matrix missing t" + target + " " + JSON.stringify(aliases));
  }
}
for (const value of THRESHOLD_NEIGHBORS) {
  assert(scalarCases.some((entry) => entry.kind === "weight"
    && entry.numberBits === f64Bits(value)),
  "weight threshold neighbor missing " + value);
}

function census(values, key) {
  const counts = new Map();
  for (const value of values) {
    const item = key(value);
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
}

const categoryCensus = census(cases, (entry) => entry.category);
const branchCensus = census(cases, (entry) => entry.branch);
const scalarCategoryCensus = census(scalarCases, (entry) => entry.category);
const scalarBranchCensus = census(scalarCases, (entry) =>
  entry.expectedError === null ? entry.kind + "-success" : entry.kind + "-error");
const registrationBranchCensus = census(registrationCases, (entry) =>
  entry.expectedError === null ? "registered"
    : entry.expectedError.startsWith(OPCODE_NAME + " requires")
      ? "concrete-start-cardinality"
      : "invalid-instruction-shape");
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["target-role-values", BATTLER_DOMAIN.length],
  ["optional-selector-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["target-optional-selector-cross-product", BATTLER_DOMAIN.length * OPTIONAL_SELECTOR_COMBINATIONS.length],
  ["source-species-catalog-rows", catalog.length],
  ["source-species-with-weight-rows", catalog.length - legacyIds.length],
  ["legacy-compatibility-null-weight-rows", legacyIds.length],
  ["out-of-catalog-target-species-values", OUT_OF_CATALOG_SPECIES.length],
  ["low-kick-strict-upper-bound-count", LOW_KICK_THRESHOLDS.length],
  ["low-kick-power-band-count", LOW_KICK_POWERS.length],
  ["threshold-neighbor-weight-values", THRESHOLD_NEIGHBORS.length],
  ["broad-safe-weight-values", BROAD_SAFE_WEIGHT_DOMAIN.length],
  ["malformed-direct-weight-values", MALFORMED_WEIGHT_DOMAIN.length],
  ["direct-species-helper-values", 13],
  ["dynamic-base-power-u16-values", U16_MAX + 1],
  ["dynamic-base-power-edge-values", DYNAMIC_BASE_POWER_EDGE_DOMAIN.length],
  ["application-count-values", 2],
  ["registration-shape-cases", registrationCases.length],
]);
const catalogProjection = Object.freeze(catalog.map((row) => Object.freeze([
  row.id,
  row.weightHectograms,
])));
const catalogJson = JSON.stringify(catalogProjection);
const catalogHash = crypto.createHash("sha256").update(catalogJson).digest("hex");
const corpus = Object.freeze({
  opcodeName: OPCODE_NAME,
  opcodeId: OPCODE_ID,
  dispatcher: DISPATCHER,
  instructionProgramCounter: instruction.programCounter,
  lowKickThresholds: LOW_KICK_THRESHOLDS,
  lowKickPowers: LOW_KICK_POWERS,
  thresholdNeighbors: THRESHOLD_NEIGHBORS,
  broadSafeWeightBits: BROAD_SAFE_WEIGHT_DOMAIN.map(f64Bits),
  malformedWeightBits: MALFORMED_WEIGHT_DOMAIN.map((entry) =>
    Object.freeze([entry.label, f64Bits(entry.value)])),
  dynamicBasePowerEdgeDomain: DYNAMIC_BASE_POWER_EDGE_DOMAIN,
  outOfCatalogSpecies: OUT_OF_CATALOG_SPECIES,
  legacyIds,
  catalogHash,
  catalogBytes: Buffer.byteLength(catalogJson),
  domainCensus,
  categoryCensus,
  branchCensus,
  scalarCategoryCensus,
  scalarBranchCensus,
  registrationBranchCensus,
  cases,
  scalarCases,
  registrationCases,
});
const corpusJson = JSON.stringify(corpus);
const corpusHash = crypto.createHash("sha256").update(corpusJson).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustU16(value) {
  return "0x" + value.toString(16).padStart(4, "0");
}

function rustBattler(value) {
  return "BattleScriptWeightdamageBattler::Battler" + value;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : "Some(" + rustBattler(value) + ")";
}

function rustState(value) {
  return "BattleScriptWeightdamageVectorState { species: ["
    + value.species.map(rustU16).join(", ")
    + "], dynamic_base_power: " + rustU16(value.dynamicBasePower)
    + ", attacker: " + rustOptionalBattler(value.attacker)
    + ", target: " + rustOptionalBattler(value.target)
    + ", effect_battler: " + rustOptionalBattler(value.effectBattler)
    + ", fainted: " + rustOptionalBattler(value.fainted) + " }";
}

function rustOptionalState(value) {
  return value === null ? "None" : "Some(" + rustState(value) + ")";
}

function rustControls(values) {
  assert(values.every((value) => value === "advance"), "unexpected non-advance control");
  return "&[" + values.map(() => "BattleScriptWeightdamageControl::Advance").join(", ") + "]";
}

function rustInstruction(value) {
  return "BattleScriptWeightdamageVectorInstruction { opcode_name: "
    + rustString(value.opcodeName)
    + ", program_counter: " + value.programCounter
    + ", opcode_id: 0x" + value.opcodeId.toString(16).padStart(2, "0")
    + ", dispatcher: " + rustString(value.dispatcher)
    + ", operand_count: " + value.operandCount + " }";
}

const catalogLines = [];
catalogLines.push("// GENERATED by core-rs/tools/gen-battle-script-weightdamage-vectors.mjs.");
catalogLines.push("// Source: src/data/gen/species-stats.json Pokédex-weight projection.");
catalogLines.push("// Regenerate; do not hand-edit.");
catalogLines.push("");
catalogLines.push("pub const BATTLE_SCRIPT_WEIGHTDAMAGE_SPECIES_CATALOG_SHA256: &str = "
  + rustString(catalogHash) + ";");
catalogLines.push("pub const BATTLE_SCRIPT_WEIGHTDAMAGE_SPECIES_CATALOG_BYTES: usize = "
  + Buffer.byteLength(catalogJson) + ";");
catalogLines.push("pub const BATTLE_SCRIPT_WEIGHTDAMAGE_SPECIES_CATALOG: [(u16, Option<u16>); "
  + catalog.length + "] = [");
for (const row of catalog) {
  catalogLines.push("    (" + rustU16(row.id) + ", "
    + (row.weightHectograms === null ? "None" : "Some(" + rustU16(row.weightHectograms) + ")")
    + "),");
}
catalogLines.push("];");

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-weightdamage-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptWeightDamageOpcode.ts via node.");
lines.push("// Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_weightdamage::{BattleScriptWeightdamageBattler, "
  + "BattleScriptWeightdamageControl, BattleScriptWeightdamageNumber};");
lines.push("");
lines.push("pub const BATTLE_SCRIPT_WEIGHTDAMAGE_VECTOR_CORPUS_SHA256: &str = "
  + rustString(corpusHash) + ";");
lines.push("pub const BATTLE_SCRIPT_WEIGHTDAMAGE_VECTOR_CORPUS_BYTES: usize = "
  + Buffer.byteLength(corpusJson) + ";");
lines.push("pub const BATTLE_SCRIPT_WEIGHTDAMAGE_GENERATED_OUTPUT_LIMIT_BYTES: usize = 1_500_000;");
lines.push("pub const BATTLE_SCRIPT_WEIGHTDAMAGE_OPCODE: u8 = 0xdd;");
lines.push("pub const BATTLE_SCRIPT_WEIGHTDAMAGE_LEGACY_IDS: [u16; " + legacyIds.length + "] = ["
  + legacyIds.map(rustU16).join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_WEIGHTDAMAGE_LOW_KICK_THRESHOLDS: [u16; "
  + LOW_KICK_THRESHOLDS.length + "] = [" + LOW_KICK_THRESHOLDS.map(rustU16).join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_WEIGHTDAMAGE_LOW_KICK_POWERS: [u16; "
  + LOW_KICK_POWERS.length + "] = [" + LOW_KICK_POWERS.map(rustU16).join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_WEIGHTDAMAGE_THRESHOLD_NEIGHBORS: [u64; "
  + THRESHOLD_NEIGHBORS.length + "] = [" + THRESHOLD_NEIGHBORS.map((value) => value + "_u64").join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_WEIGHTDAMAGE_DYNAMIC_BASE_POWER_EDGE_DOMAIN: [u16; "
  + DYNAMIC_BASE_POWER_EDGE_DOMAIN.length + "] = ["
  + DYNAMIC_BASE_POWER_EDGE_DOMAIN.map(rustU16).join(", ") + "];");
lines.push("pub const BATTLE_SCRIPT_WEIGHTDAMAGE_BATTLER_DOMAIN: [u8; 4] = [0, 1, 2, 3];");
lines.push("pub const BATTLE_SCRIPT_WEIGHTDAMAGE_OPTIONAL_BATTLER_DOMAIN: [Option<u8>; 5] = "
  + "[None, Some(0), Some(1), Some(2), Some(3)];");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptWeightdamageVectorInstruction {");
lines.push("    pub opcode_name: &'static str,");
lines.push("    pub program_counter: u32,");
lines.push("    pub opcode_id: u8,");
lines.push("    pub dispatcher: &'static str,");
lines.push("    pub operand_count: usize,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptWeightdamageVectorState {");
lines.push("    pub species: [u16; 4],");
lines.push("    pub dynamic_base_power: u16,");
lines.push("    pub attacker: Option<BattleScriptWeightdamageBattler>,");
lines.push("    pub target: Option<BattleScriptWeightdamageBattler>,");
lines.push("    pub effect_battler: Option<BattleScriptWeightdamageBattler>,");
lines.push("    pub fainted: Option<BattleScriptWeightdamageBattler>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptWeightdamageVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptWeightdamageVectorState,");
lines.push("    pub expected: Option<BattleScriptWeightdamageVectorState>,");
lines.push("    pub controls: &'static [BattleScriptWeightdamageControl],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptWeightdamageScalarCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub kind: &'static str,");
lines.push("    pub number: BattleScriptWeightdamageNumber,");
lines.push("    pub expected: Option<u16>,");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptWeightdamageRegistrationCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub instructions: &'static [BattleScriptWeightdamageVectorInstruction],");
lines.push("    pub expected: Option<BattleScriptWeightdamageVectorInstruction>,");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
for (const [name, values, type] of [
  ["BATTLE_SCRIPT_WEIGHTDAMAGE_DOMAIN_CENSUS", domainCensus, "u64"],
  ["BATTLE_SCRIPT_WEIGHTDAMAGE_CATEGORY_CENSUS", categoryCensus, "usize"],
  ["BATTLE_SCRIPT_WEIGHTDAMAGE_BRANCH_CENSUS", branchCensus, "usize"],
  ["BATTLE_SCRIPT_WEIGHTDAMAGE_SCALAR_CATEGORY_CENSUS", scalarCategoryCensus, "usize"],
  ["BATTLE_SCRIPT_WEIGHTDAMAGE_SCALAR_BRANCH_CENSUS", scalarBranchCensus, "usize"],
  ["BATTLE_SCRIPT_WEIGHTDAMAGE_REGISTRATION_BRANCH_CENSUS", registrationBranchCensus, "usize"],
]) {
  lines.push("pub const " + name + ": [(&str, " + type + "); " + values.length + "] = [");
  for (const [label, count] of values) lines.push("    (" + rustString(label) + ", " + count + "),");
  lines.push("];");
  lines.push("");
}
lines.push("pub static BATTLE_SCRIPT_WEIGHTDAMAGE_CASES: [BattleScriptWeightdamageVectorCase; "
  + cases.length + "] = [");
for (const entry of cases) {
  lines.push("    // " + entry.label);
  lines.push("    BattleScriptWeightdamageVectorCase {");
  lines.push("        label: " + rustString(entry.label) + ",");
  lines.push("        category: " + rustString(entry.category) + ",");
  lines.push("        branch: " + rustString(entry.branch) + ",");
  lines.push("        applications: " + entry.applications + ",");
  lines.push("        initial: " + rustState(entry.initial) + ",");
  lines.push("        expected: " + rustOptionalState(entry.expected) + ",");
  lines.push("        controls: " + rustControls(entry.controls) + ",");
  lines.push("        expected_error: "
    + (entry.expectedError === null ? "None" : "Some(" + rustString(entry.expectedError) + ")") + ",");
  lines.push("    },");
}
lines.push("];");
lines.push("");
lines.push("pub static BATTLE_SCRIPT_WEIGHTDAMAGE_SCALAR_CASES: [BattleScriptWeightdamageScalarCase; "
  + scalarCases.length + "] = [");
for (const entry of scalarCases) {
  lines.push("    BattleScriptWeightdamageScalarCase {");
  lines.push("        label: " + rustString(entry.label) + ",");
  lines.push("        category: " + rustString(entry.category) + ",");
  lines.push("        kind: " + rustString(entry.kind) + ",");
  lines.push("        number: BattleScriptWeightdamageNumber::from_bits(" + entry.numberBits + "_u64),");
  lines.push("        expected: "
    + (entry.expected === null ? "None" : "Some(" + rustU16(entry.expected) + ")") + ",");
  lines.push("        expected_error: "
    + (entry.expectedError === null ? "None" : "Some(" + rustString(entry.expectedError) + ")") + ",");
  lines.push("    },");
}
lines.push("];");
lines.push("");
lines.push("pub static BATTLE_SCRIPT_WEIGHTDAMAGE_REGISTRATION_CASES: "
  + "[BattleScriptWeightdamageRegistrationCase; " + registrationCases.length + "] = [");
for (const entry of registrationCases) {
  lines.push("    BattleScriptWeightdamageRegistrationCase {");
  lines.push("        label: " + rustString(entry.label) + ",");
  lines.push("        instructions: &[" + entry.instructions.map(rustInstruction).join(", ") + "],");
  lines.push("        expected: "
    + (entry.expected === null ? "None" : "Some(" + rustInstruction(entry.expected) + ")") + ",");
  lines.push("        expected_error: "
    + (entry.expectedError === null ? "None" : "Some(" + rustString(entry.expectedError) + ")") + ",");
  lines.push("    },");
}
lines.push("];");

fs.writeFileSync(catalogOutPath, catalogLines.join("\n") + "\n", "utf8");
fs.writeFileSync(vectorOutPath, lines.join("\n") + "\n", "utf8");
const rustfmt = execFileSync("rustup", ["which", "rustfmt"], { encoding: "utf8" }).trim();
assert(rustfmt.length > 0, "rustup could not resolve rustfmt");
execFileSync(rustfmt, ["--edition", "2021", catalogOutPath], { stdio: "inherit" });
execFileSync(rustfmt, ["--edition", "2021", vectorOutPath], { stdio: "inherit" });

const vectorBytes = fs.readFileSync(vectorOutPath);
const catalogBytes = fs.readFileSync(catalogOutPath);
assert(vectorBytes.length <= 1_500_000,
  "generated vector output exceeded bound: " + vectorBytes.length);
const generatorBytes = fs.readFileSync(scriptPath);
console.log("gen-battle-script-weightdamage-vectors: wrote "
  + path.relative(workspaceRoot, catalogOutPath) + " and "
  + path.relative(workspaceRoot, vectorOutPath));
console.log("gen-battle-script-weightdamage-vectors: handler cases " + cases.length
  + ", scalar cases " + scalarCases.length + ", registration cases " + registrationCases.length);
console.log("gen-battle-script-weightdamage-vectors: domain census " + JSON.stringify(domainCensus));
console.log("gen-battle-script-weightdamage-vectors: category census " + JSON.stringify(categoryCensus));
console.log("gen-battle-script-weightdamage-vectors: branch census " + JSON.stringify(branchCensus));
console.log("gen-battle-script-weightdamage-vectors: scalar category census "
  + JSON.stringify(scalarCategoryCensus));
console.log("gen-battle-script-weightdamage-vectors: scalar branch census "
  + JSON.stringify(scalarBranchCensus));
console.log("gen-battle-script-weightdamage-vectors: registration census "
  + JSON.stringify(registrationBranchCensus));
console.log("gen-battle-script-weightdamage-vectors: catalog sha256 " + catalogHash
  + " bytes " + Buffer.byteLength(catalogJson) + " generated " + catalogBytes.length);
console.log("gen-battle-script-weightdamage-vectors: corpus sha256 " + corpusHash
  + " bytes " + Buffer.byteLength(corpusJson) + " generated " + vectorBytes.length);
console.log("gen-battle-script-weightdamage-vectors: generator sha256 "
  + crypto.createHash("sha256").update(generatorBytes).digest("hex")
  + " bytes " + generatorBytes.length);
