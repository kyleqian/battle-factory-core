#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptSnatchOpcode.ts.
// Expected controls, outputs, branches, and errors are created only by
// executing the canonical TypeScript B_SCR_OP_SNATCHSETBATTLERS handler.
// This script owns bounded input construction and Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-snatchsetbattlers-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  workspaceRoot,
  "core-rs",
  "crates",
  "factory-core",
  "src",
  "battle_script_snatchsetbattlers_vectors_gen.rs",
);
const [programModule, machineModule, opcodeModule, rulesModule] = await Promise.all([
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptProgram.ts")).href),
  import(pathToFileURL(path.join(workspaceRoot, "src", "engine", "battleScriptMachine.ts")).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptSnatchOpcode.ts",
  )).href),
  import(pathToFileURL(path.join(
    workspaceRoot,
    "src",
    "engine",
    "battleScriptRulesContext.ts",
  )).href),
]);

const OPCODE_NAME = "B_SCR_OP_SNATCHSETBATTLERS";
const OPCODE_ID = 0xed;
const DISPATCHER = "Cmd_snatchsetbattlers";
const ENTRY_LABEL = "BattleScript_SnatchedMove";
const BATTLE_SLOTS = 4;
const ATTACKER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OPTIONAL_BATTLER_DOMAIN = Object.freeze([null, ...ATTACKER_DOMAIN]);
const GENERATED_FILE_MAX_BYTES = 5_000_000;

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-snatchsetbattlers-vectors: ${message}`);
}

function assertBattler(value, label) {
  assert(ATTACKER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function assertOptionalBattler(value, label) {
  if (value !== null) assertBattler(value, label);
}

function freezeProjection({ attacker, target, effectBattler, fainted, scriptingBattler }) {
  assertOptionalBattler(attacker, "attacker role");
  assertOptionalBattler(target, "target role");
  assertOptionalBattler(effectBattler, "effectBattler role");
  assertOptionalBattler(fainted, "fainted role");
  assertBattler(scriptingBattler, "scriptingBattler");
  return Object.freeze({ attacker, target, effectBattler, fainted, scriptingBattler });
}

function makeProjection({
  attacker = 0,
  target = 1,
  effectBattler = 2,
  fainted = 3,
  scriptingBattler = 0,
} = {}) {
  return freezeProjection({ attacker, target, effectBattler, fainted, scriptingBattler });
}

// The opcode reads no battler record, but the canonical context constructor
// requires four complete, canonical battler records. These fixed records keep
// the differential surface constrained to the exact selector/scripting fields
// this leaf owns.
function canonicalBattler(index) {
  return Object.freeze({
    side: index & 1,
    ability: 0,
    hp: 100,
    maxHP: 100,
    moves: Object.freeze([0, 0, 0, 0]),
    pp: Object.freeze([0, 0, 0, 0]),
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
    stealMove: 0,
    item: 0,
    statStages: Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    species: 1,
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    level: 50,
    friendship: 70,
    partyIndex: 0,
    isFirstTurn: 0,
    ppNotAffectedByPressure: 0,
  });
}

function canonicalRulesFromProjection(projection) {
  return rulesModule.createBattleScriptRulesContext({
    battlers: Object.freeze(ATTACKER_DOMAIN.map(canonicalBattler)),
    selectorRoles: Object.freeze({
      attacker: projection.attacker,
      target: projection.target,
      effectBattler: projection.effectBattler,
      fainted: projection.fainted,
    }),
    scriptingBattler: projection.scriptingBattler,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 0,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    lastUsedAbility: 0,
    battleTopology: Object.freeze({
      battlersCount: 4,
      battleTypeFlags: rulesModule.BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
      battlerPositions: Object.freeze([0, 1, 2, 3]),
    }),
    currentTurnActionNumber: 0,
  });
}

function vectorState(rules) {
  return Object.freeze({
    attacker: rules.selectorRoles.attacker,
    target: rules.selectorRoles.target,
    effectBattler: rules.selectorRoles.effectBattler,
    fainted: rules.selectorRoles.fainted,
    scriptingBattler: rules.scriptingBattler,
  });
}

function sameState(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

assert(
  rulesModule.BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE === 0x0000_0001,
  "BATTLE_TYPE_DOUBLE drifted from source value 1",
);

const program = programModule.loadBattleScriptProgram();
const instructions = program.instructions.filter((instruction) => instruction.opcodeName === OPCODE_NAME);
assert(instructions.length === 1, `expected exactly one ${OPCODE_NAME} instruction, got ${instructions.length}`);
const instruction = instructions[0];
assert(instruction.opcodeId === OPCODE_ID, `expected opcode ${OPCODE_ID}, got ${instruction.opcodeId}`);
assert(instruction.dispatcher === DISPATCHER, `expected dispatcher ${DISPATCHER}, got ${instruction.dispatcher}`);
assert(instruction.source.label === ENTRY_LABEL, `expected source label ${ENTRY_LABEL}, got ${instruction.source.label}`);
assert(instruction.operands.length === 0, "canonical opcode must have no operands");

const handlers = opcodeModule.createBattleScriptSnatchOpcodeHandlers(program);
const handler = handlers[instruction.opcodeId];
assert(typeof handler === "function", "canonical SNATCHSETBATTLERS handler was not registered");

function classifyAndAssertStep(priorRules, transition) {
  const originalAttacker = priorRules.selectorRoles.attacker;
  assert(originalAttacker !== null, "successful canonical handler had no attacker");
  const originalTarget = priorRules.selectorRoles.target;
  assert(originalTarget !== null, "successful canonical handler had no target");
  const originalScriptingBattler = priorRules.scriptingBattler;
  const selfTargeted = originalAttacker === originalTarget;
  const nextRules = transition.rulesContext;

  assert(transition.control.kind === "advance", "canonical handler did not advance");
  assert(Object.isFrozen(nextRules), "canonical output rules must be frozen");
  assert(nextRules !== priorRules, "canonical handler must replace rules on every valid call");
  assert(nextRules.battlers === priorRules.battlers, "canonical handler unexpectedly replaced battlers");
  assert(nextRules.selectorRoles !== priorRules.selectorRoles, "canonical handler must replace selector roles");
  assert(nextRules.selectorRoles.effectBattler === originalAttacker, "canonical effectBattler is not original attacker");
  assert(nextRules.selectorRoles.fainted === priorRules.selectorRoles.fainted, "canonical handler changed fainted sibling");
  assert(nextRules.scriptingBattler === originalAttacker, "canonical scriptingBattler is not original attacker");
  assert(
    nextRules.selectorRoles.target === originalScriptingBattler,
    "canonical target is not original scriptingBattler",
  );
  assert(
    nextRules.selectorRoles.attacker === (selfTargeted ? originalScriptingBattler : originalAttacker),
    "canonical attacker rebinding disagrees with self-target branch",
  );
  return selfTargeted ? "self-targeted" : "nonself-targeted";
}

function sourceOutcome(initialProjection, applications) {
  const initialRules = canonicalRulesFromProjection(initialProjection);
  const inputSnapshot = vectorState(initialRules);
  let currentRules = initialRules;
  const controls = [];
  const branches = [];
  try {
    for (let application = 0; application < applications; application += 1) {
      const currentSnapshot = vectorState(currentRules);
      const state = machineModule.createBattleScriptMachine(
        program,
        ENTRY_LABEL,
        currentRules,
        (0x5a17_c4ed + application) >>> 0,
      );
      const transition = handler({ program, instruction, state });
      assert(transition.scheduler === state.scheduler, "canonical handler changed scheduler state");
      assert(transition.rng === state.rng, "canonical handler consumed RNG");
      assert(transition.events.length === 0, "canonical handler emitted events");
      assert(sameState(vectorState(currentRules), currentSnapshot), "canonical handler mutated current rules");
      branches.push(classifyAndAssertStep(currentRules, transition));
      controls.push("advance");
      currentRules = transition.rulesContext;
    }
    assert(sameState(vectorState(initialRules), inputSnapshot), "canonical handler mutated input rules");
    return Object.freeze({
      expected: vectorState(currentRules),
      controls: Object.freeze(controls),
      branches: Object.freeze(branches),
      error: null,
    });
  } catch (error) {
    assert(error instanceof Error, `canonical handler threw non-Error ${String(error)}`);
    assert(sameState(vectorState(initialRules), inputSnapshot), "throwing canonical handler mutated input rules");
    return Object.freeze({
      expected: null,
      controls: Object.freeze(controls),
      branches: Object.freeze(branches),
      error: error.message,
    });
  }
}

function branchFor(outcome) {
  if (outcome.error === null) {
    return outcome.branches.map((branch) => `${branch}-advance`).join("-then-");
  }
  if (outcome.error === "Battle Script hit-chain command requires a attacker role") {
    return "missing-attacker-role";
  }
  if (outcome.error === "Battle Script hit-chain command requires a target role") {
    return "missing-target-role";
  }
  throw new Error(`unexpected canonical error ${outcome.error}`);
}

const cases = [];
function addCase(label, category, initialProjection, applications = 1) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  assert(applications === 1 || applications === 2, `${label}: applications must be 1 or 2`);
  const outcome = sourceOutcome(initialProjection, applications);
  cases.push(Object.freeze({
    label,
    category,
    branch: branchFor(outcome),
    applications,
    initial: initialProjection,
    expected: outcome.expected,
    controls: outcome.controls,
    branches: outcome.branches,
    expectedError: outcome.error,
  }));
}

// Complete orthogonal projection: every valid attacker/target pair and every
// scripting battler, crossed with the full optional effect/fainted domains.
for (const attacker of ATTACKER_DOMAIN) {
  for (const target of ATTACKER_DOMAIN) {
    for (const scriptingBattler of ATTACKER_DOMAIN) {
      for (const effectBattler of OPTIONAL_BATTLER_DOMAIN) {
        for (const fainted of OPTIONAL_BATTLER_DOMAIN) {
          addCase(
            `matrix_a${attacker}_t${target}_s${scriptingBattler}_e${effectBattler ?? "n"}_f${fainted ?? "n"}`,
            "complete-attacker-target-scripting-effect-fainted-matrix",
            makeProjection({ attacker, target, scriptingBattler, effectBattler, fainted }),
          );
        }
      }
    }
  }
}

for (const battler of ATTACKER_DOMAIN) {
  addCase(
    `alias_all_roles_and_scripting_b${battler}`,
    "explicit-selector-alias-permutations",
    makeProjection({
      attacker: battler,
      target: battler,
      effectBattler: battler,
      fainted: battler,
      scriptingBattler: battler,
    }),
  );
  addCase(
    `alias_self_target_distinct_scripting_b${battler}`,
    "explicit-selector-alias-permutations",
    makeProjection({
      attacker: battler,
      target: battler,
      effectBattler: (battler + 2) % BATTLE_SLOTS,
      fainted: null,
      scriptingBattler: (battler + 1) % BATTLE_SLOTS,
    }),
  );
  addCase(
    `alias_target_scripting_nonself_b${battler}`,
    "explicit-selector-alias-permutations",
    makeProjection({
      attacker: battler,
      target: (battler + 1) % BATTLE_SLOTS,
      effectBattler: (battler + 1) % BATTLE_SLOTS,
      fainted: (battler + 1) % BATTLE_SLOTS,
      scriptingBattler: (battler + 1) % BATTLE_SLOTS,
    }),
  );
  addCase(
    `alias_attacker_scripting_nonself_b${battler}`,
    "explicit-selector-alias-permutations",
    makeProjection({
      attacker: battler,
      target: (battler + 1) % BATTLE_SLOTS,
      effectBattler: battler,
      fainted: battler,
      scriptingBattler: battler,
    }),
  );
}

addCase(
  "missing_attacker_precedes_missing_target",
  "ordered-missing-selector-role-errors",
  makeProjection({ attacker: null, target: null, effectBattler: 2, fainted: 3, scriptingBattler: 1 }),
);
addCase(
  "missing_attacker_precedes_present_target",
  "ordered-missing-selector-role-errors",
  makeProjection({ attacker: null, target: 3, effectBattler: null, fainted: 2, scriptingBattler: 0 }),
);
addCase(
  "missing_target_after_attacker_resolution",
  "ordered-missing-selector-role-errors",
  makeProjection({ attacker: 2, target: null, effectBattler: 1, fainted: null, scriptingBattler: 3 }),
);

addCase(
  "repeated_nonself_then_self_when_scripting_aliases_attacker",
  "repeated-application-branch-transitions",
  makeProjection({ attacker: 1, target: 2, effectBattler: 3, fainted: null, scriptingBattler: 1 }),
  2,
);
addCase(
  "repeated_nonself_remains_nonself_when_scripting_differs",
  "repeated-application-branch-transitions",
  makeProjection({ attacker: 1, target: 2, effectBattler: null, fainted: 3, scriptingBattler: 0 }),
  2,
);
addCase(
  "repeated_self_targeted_rebinds_against_previous_scripting_battler",
  "repeated-application-branch-transitions",
  makeProjection({ attacker: 1, target: 1, effectBattler: 2, fainted: 3, scriptingBattler: 0 }),
  2,
);

const MATRIX_CASE_COUNT = ATTACKER_DOMAIN.length ** 3 * OPTIONAL_BATTLER_DOMAIN.length ** 2;
const ALIAS_CASE_COUNT = ATTACKER_DOMAIN.length * 4;
const MISSING_ROLE_CASE_COUNT = 3;
const REPEATED_CASE_COUNT = 3;
assert(MATRIX_CASE_COUNT === 1600, `matrix case count drifted to ${MATRIX_CASE_COUNT}`);
assert(ALIAS_CASE_COUNT === 16, `alias case count drifted to ${ALIAS_CASE_COUNT}`);
assert(cases.length === MATRIX_CASE_COUNT + ALIAS_CASE_COUNT + MISSING_ROLE_CASE_COUNT + REPEATED_CASE_COUNT,
  `case count drifted to ${cases.length}`);
for (const attacker of ATTACKER_DOMAIN) {
  for (const target of ATTACKER_DOMAIN) {
    for (const scriptingBattler of ATTACKER_DOMAIN) {
      for (const effectBattler of OPTIONAL_BATTLER_DOMAIN) {
        for (const fainted of OPTIONAL_BATTLER_DOMAIN) {
          assert(cases.some((value) =>
            value.category === "complete-attacker-target-scripting-effect-fainted-matrix"
            && value.initial.attacker === attacker
            && value.initial.target === target
            && value.initial.scriptingBattler === scriptingBattler
            && value.initial.effectBattler === effectBattler
            && value.initial.fainted === fainted),
          `matrix omits a${attacker} t${target} s${scriptingBattler} e${effectBattler} f${fainted}`);
        }
      }
    }
  }
}

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(cases, (value) => value.branch);
const domainCensus = Object.freeze([
  ["battler-slots", BATTLE_SLOTS],
  ["attacker-role-values", ATTACKER_DOMAIN.length],
  ["target-role-values", ATTACKER_DOMAIN.length],
  ["optional-attacker-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["optional-target-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["optional-effect-battler-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["optional-fainted-role-values", OPTIONAL_BATTLER_DOMAIN.length],
  ["scripting-battler-values", ATTACKER_DOMAIN.length],
  ["complete-attacker-target-pairs", ATTACKER_DOMAIN.length ** 2],
  ["self-target-pair-values", ATTACKER_DOMAIN.length],
  ["nonself-target-pair-values", ATTACKER_DOMAIN.length * (ATTACKER_DOMAIN.length - 1)],
  ["complete-attacker-target-scripting-effect-fainted-matrix-cases", MATRIX_CASE_COUNT],
  ["explicit-alias-permutation-cases", ALIAS_CASE_COUNT],
  ["ordered-missing-role-cases", MISSING_ROLE_CASE_COUNT],
  ["repeated-application-cases", REPEATED_CASE_COUNT],
  ["application-count-values", 2],
  ["selector-roles-written-by-handler", 3],
  ["preserved-narrow-selector-siblings", 1],
  ["opcode-byte", OPCODE_ID],
  ["opcode-operands", 0],
  ["abi-exports-added", 0],
  ["unsupported-barriers-added", 0],
  ["generated-file-byte-limit-exclusive", GENERATED_FILE_MAX_BYTES],
]);
const corpus = Object.freeze({
  attackerDomain: ATTACKER_DOMAIN,
  optionalBattlerDomain: OPTIONAL_BATTLER_DOMAIN,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustBattler(value) {
  return `BattleScriptSnatchsetbattlersBattler::Battler${value}`;
}

function rustOptionalBattler(value) {
  return value === null ? "None" : `Some(${rustBattler(value)})`;
}

function rustState(value) {
  return [
    "BattleScriptSnatchsetbattlersVectorState {",
    `attacker: ${rustOptionalBattler(value.attacker)},`,
    `target: ${rustOptionalBattler(value.target)},`,
    `effect_battler: ${rustOptionalBattler(value.effectBattler)},`,
    `fainted: ${rustOptionalBattler(value.fainted)},`,
    `scripting_battler: ${rustBattler(value.scriptingBattler)},`,
    "}",
  ].join(" ");
}

function rustOptionalState(value) {
  return value === null ? "None" : `Some(${rustState(value)})`;
}

function rustOptionalString(value) {
  return value === null ? "None" : `Some(${rustString(value)})`;
}

function rustStringSlice(values) {
  return "&[" + values.map(rustString).join(", ") + "]";
}

function rustControls(values) {
  return "&[" + values.map(() => "BattleScriptSnatchsetbattlersControl::Advance").join(", ") + "]";
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-snatchsetbattlers-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptSnatchOpcode.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push("use crate::battle_script_snatchsetbattlers::{");
lines.push("    BattleScriptSnatchsetbattlersBattler, BattleScriptSnatchsetbattlersControl,");
lines.push("};");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SNATCHSETBATTLERS_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_SNATCHSETBATTLERS_BATTLER_DOMAIN: [u8; ${ATTACKER_DOMAIN.length}] = [${ATTACKER_DOMAIN.join(", ")}];`);
lines.push("pub const BATTLE_SCRIPT_SNATCHSETBATTLERS_OPTIONAL_SELECTOR_DOMAIN: [i8; 5] = [-1, 0, 1, 2, 3];");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSnatchsetbattlersVectorState {");
lines.push("    pub attacker: Option<BattleScriptSnatchsetbattlersBattler>,");
lines.push("    pub target: Option<BattleScriptSnatchsetbattlersBattler>,");
lines.push("    pub effect_battler: Option<BattleScriptSnatchsetbattlersBattler>,");
lines.push("    pub fainted: Option<BattleScriptSnatchsetbattlersBattler>,");
lines.push("    pub scripting_battler: BattleScriptSnatchsetbattlersBattler,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptSnatchsetbattlersVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub branch: &'static str,");
lines.push("    pub applications: u8,");
lines.push("    pub initial: BattleScriptSnatchsetbattlersVectorState,");
lines.push("    pub expected: Option<BattleScriptSnatchsetbattlersVectorState>,");
lines.push("    pub controls: &'static [BattleScriptSnatchsetbattlersControl],");
lines.push("    pub branches: &'static [&'static str],");
lines.push("    pub expected_error: Option<&'static str>,");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_SNATCHSETBATTLERS_DOMAIN_CENSUS: [(&str, u64); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];\n");
lines.push(`pub const BATTLE_SCRIPT_SNATCHSETBATTLERS_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];\n");
lines.push(`pub const BATTLE_SCRIPT_SNATCHSETBATTLERS_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];\n");
lines.push(`pub static BATTLE_SCRIPT_SNATCHSETBATTLERS_CASES: [BattleScriptSnatchsetbattlersVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptSnatchsetbattlersVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        category: ${rustString(value.category)},`);
  lines.push(`        branch: ${rustString(value.branch)},`);
  lines.push(`        applications: ${value.applications},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push(`        expected: ${rustOptionalState(value.expected)},`);
  lines.push(`        controls: ${rustControls(value.controls)},`);
  lines.push(`        branches: ${rustStringSlice(value.branches)},`);
  lines.push(`        expected_error: ${rustOptionalString(value.expectedError)},`);
  lines.push("    },");
}
lines.push("];\n");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
const rustupBin = path.join(
  process.env.HOME ?? "",
  ".rustup",
  "toolchains",
  "stable-aarch64-apple-darwin",
  "bin",
);
let formatted = false;
for (const rustfmt of [path.join(rustupBin, "rustfmt"), "rustfmt"]) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) throw new Error("gen-battle-script-snatchsetbattlers-vectors: could not find rustfmt");

const generated = fs.readFileSync(outPath);
assert(
  generated.byteLength < GENERATED_FILE_MAX_BYTES,
  `generated file is ${generated.byteLength} bytes, not below ${GENERATED_FILE_MAX_BYTES}`,
);
const generatedHash = crypto.createHash("sha256").update(generated).digest("hex");
console.log(`gen-battle-script-snatchsetbattlers-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-snatchsetbattlers-vectors: ${cases.length} cases`);
console.log(`gen-battle-script-snatchsetbattlers-vectors: ${generated.byteLength} generated bytes`);
console.log(`gen-battle-script-snatchsetbattlers-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-snatchsetbattlers-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-snatchsetbattlers-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-snatchsetbattlers-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-snatchsetbattlers-vectors: generated sha256 ${generatedHash}`);
