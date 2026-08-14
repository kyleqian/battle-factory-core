#!/usr/bin/env node
// Differential corpus for src/engine/battleScriptAiReveal.ts. Expected
// outputs are created only by executing the canonical TypeScript helpers;
// this script owns bounded input construction and Rust literal emission.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-battle-script-ai-reveal-vectors.mjs

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
  "battle_script_ai_reveal_vectors_gen.rs",
);
const reveal = await import(pathToFileURL(path.join(
  workspaceRoot,
  "src",
  "engine",
  "battleScriptAiReveal.ts",
)).href);

const BATTLE_SLOTS = 4;
const BATTLER_DOMAIN = Object.freeze([0, 1, 2, 3]);
const OBSERVED_VALUE_DOMAIN = Object.freeze([0, 255]);
const OP_ABILITY = "ability";
const OP_ITEM_EFFECT = "item-effect";
const OPERATION_DOMAIN = Object.freeze([OP_ABILITY, OP_ITEM_EFFECT]);
const VALID_OPERATIONS = new Set(OPERATION_DOMAIN);
const DISTINCT_VALUES = Object.freeze([0, 1, 17, 63, 127, 128, 191, 223, 254, 255]);

function assert(condition, message) {
  if (!condition) throw new Error(`gen-battle-script-ai-reveal-vectors: ${message}`);
}

function assertByte(value, label) {
  assert(Number.isInteger(value) && value >= 0 && value <= 255, `${label} must be a u8, got ${value}`);
}

function assertBattler(value, label) {
  assert(BATTLER_DOMAIN.includes(value), `${label} must be one of 0..3, got ${value}`);
}

function freezeCells(values, label) {
  assert(Array.isArray(values) && values.length === BATTLE_SLOTS, `${label} must contain four cells`);
  values.forEach((value, index) => assertByte(value, `${label}[${index}]`));
  return Object.freeze([...values]);
}

function makeRules(abilityIds, itemEffects) {
  // The canonical helpers only read these two fields. `opaqueMarker` proves
  // their spread preserves unrelated context fields without modeling the full
  // BattleScriptRulesContext in either the generator or native port.
  return Object.freeze({
    aiObservedAbilityIds: freezeCells(abilityIds, "aiObservedAbilityIds"),
    aiObservedItemEffects: freezeCells(itemEffects, "aiObservedItemEffects"),
    opaqueMarker: "preserve-unmodeled-rules-fields",
  });
}

function vectorState(rules) {
  return Object.freeze({
    aiObservedAbilityIds: [...rules.aiObservedAbilityIds],
    aiObservedItemEffects: [...rules.aiObservedItemEffects],
  });
}

function sameCells(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function assertDistinctNonTargetCells(cells, battler, label) {
  const nonTarget = cells.filter((_, index) => index !== battler);
  assert(nonTarget.length === BATTLE_SLOTS - 1, `${label}: non-target width drifted`);
  assert(new Set(nonTarget).size === nonTarget.length, `${label}: non-target cells must be distinct`);
}

function makeDistinctCells(target, targetValue, salt) {
  assertBattler(target, "distinct target");
  assertByte(targetValue, "distinct target value");
  const cells = Array(BATTLE_SLOTS).fill(0);
  cells[target] = targetValue;
  let cursor = salt % DISTINCT_VALUES.length;
  for (let index = 0; index < BATTLE_SLOTS; index += 1) {
    if (index === target) continue;
    while (cells.includes(DISTINCT_VALUES[cursor])) {
      cursor = (cursor + 1) % DISTINCT_VALUES.length;
    }
    cells[index] = DISTINCT_VALUES[cursor];
    cursor = (cursor + 1) % DISTINCT_VALUES.length;
  }
  assert(new Set(cells).size === BATTLE_SLOTS, "each constructed source array must be fully distinct");
  return cells;
}

function initialRules(operation, battler, current, salt) {
  const selected = makeDistinctCells(battler, current, salt);
  const siblingTarget = (battler + 1) % BATTLE_SLOTS;
  const siblingValue = [255, 254, 127, 1][battler];
  const sibling = makeDistinctCells(siblingTarget, siblingValue, salt + 3);
  return operation === OP_ABILITY ? makeRules(selected, sibling) : makeRules(sibling, selected);
}

function executeStep(rules, step, label, stepIndex) {
  assert(VALID_OPERATIONS.has(step.operation), `${label}/${stepIndex}: unsupported operation ${step.operation}`);
  assertBattler(step.battler, `${label}/${stepIndex} battler`);
  assertByte(step.value, `${label}/${stepIndex} value`);

  const beforeAbilityIds = [...rules.aiObservedAbilityIds];
  const beforeItemEffects = [...rules.aiObservedItemEffects];
  const selectedBefore = step.operation === OP_ABILITY ? beforeAbilityIds : beforeItemEffects;
  assertDistinctNonTargetCells(selectedBefore, step.battler, `${label}/${stepIndex}`);
  const changed = selectedBefore[step.battler] !== step.value;
  const result = step.operation === OP_ABILITY
    ? reveal.recordBattleScriptAbilityReveal(rules, step.battler, step.value)
    : reveal.recordBattleScriptItemEffectReveal(rules, step.battler, step.value);

  assert(sameCells(rules.aiObservedAbilityIds, beforeAbilityIds), `${label}/${stepIndex}: canonical helper mutated ability input`);
  assert(sameCells(rules.aiObservedItemEffects, beforeItemEffects), `${label}/${stepIndex}: canonical helper mutated item input`);
  assert(Object.isFrozen(rules), `${label}/${stepIndex}: canonical input must remain frozen`);
  assert(Object.isFrozen(result), `${label}/${stepIndex}: canonical result must be frozen`);
  assert(result.opaqueMarker === rules.opaqueMarker, `${label}/${stepIndex}: spread lost opaque context field`);
  assert((result === rules) === !changed, `${label}/${stepIndex}: source identity fast path drifted`);

  const selectedAfter = step.operation === OP_ABILITY
    ? result.aiObservedAbilityIds
    : result.aiObservedItemEffects;
  const siblingAfter = step.operation === OP_ABILITY
    ? result.aiObservedItemEffects
    : result.aiObservedAbilityIds;
  const siblingBefore = step.operation === OP_ABILITY ? beforeItemEffects : beforeAbilityIds;
  assert(sameCells(siblingAfter, siblingBefore), `${label}/${stepIndex}: sibling array values changed`);
  assert(
    (step.operation === OP_ABILITY ? result.aiObservedItemEffects : result.aiObservedAbilityIds)
      === (step.operation === OP_ABILITY ? rules.aiObservedItemEffects : rules.aiObservedAbilityIds),
    `${label}/${stepIndex}: sibling array identity changed`,
  );
  for (let index = 0; index < BATTLE_SLOTS; index += 1) {
    const expected = index === step.battler ? step.value : selectedBefore[index];
    assert(selectedAfter[index] === expected, `${label}/${stepIndex}: selected array cell ${index} drifted`);
  }
  if (changed) {
    const targetArray = step.operation === OP_ABILITY ? result.aiObservedAbilityIds : result.aiObservedItemEffects;
    const sourceTargetArray = step.operation === OP_ABILITY ? rules.aiObservedAbilityIds : rules.aiObservedItemEffects;
    assert(targetArray !== sourceTargetArray, `${label}/${stepIndex}: changed target array identity did not replace`);
    assert(Object.isFrozen(targetArray), `${label}/${stepIndex}: changed target array must be frozen`);
  }

  return Object.freeze({
    nextRules: result,
    vectorStep: Object.freeze({
      operation: step.operation,
      battler: step.battler,
      value: step.value,
      returnedInput: !changed,
      expected: vectorState(result),
    }),
  });
}

const changedProfiles = Object.freeze([
  Object.freeze({ battler: 0, current: 0, incoming: 1 }),
  Object.freeze({ battler: 1, current: 1, incoming: 127 }),
  Object.freeze({ battler: 2, current: 127, incoming: 254 }),
  Object.freeze({ battler: 3, current: 254, incoming: 255 }),
]);
const unchangedProfiles = Object.freeze([
  Object.freeze({ battler: 0, current: 0, incoming: 0 }),
  Object.freeze({ battler: 1, current: 1, incoming: 1 }),
  Object.freeze({ battler: 2, current: 127, incoming: 127 }),
  Object.freeze({ battler: 3, current: 254, incoming: 254 }),
  Object.freeze({ battler: 0, current: 255, incoming: 255 }),
]);

const cases = [];
function addCase(label, category, initial, steps) {
  assert(/^[a-z0-9_]+$/.test(label), `invalid label ${label}`);
  assert(!cases.some((value) => value.label === label), `duplicate label ${label}`);
  const inputSnapshot = vectorState(initial);
  let current = initial;
  const vectorSteps = [];
  for (const [stepIndex, step] of steps.entries()) {
    const executed = executeStep(current, step, label, stepIndex);
    vectorSteps.push(executed.vectorStep);
    current = executed.nextRules;
  }
  assert(JSON.stringify(vectorState(initial)) === JSON.stringify(inputSnapshot), `${label}: chained execution mutated input`);
  cases.push(Object.freeze({
    label,
    category,
    initial: inputSnapshot,
    steps: Object.freeze(vectorSteps),
  }));
}

for (const operation of OPERATION_DOMAIN) {
  for (const [index, profile] of changedProfiles.entries()) {
    addCase(
      `${operation.replace("-", "_")}_changed_battler_${profile.battler}`,
      `${operation}-changed`,
      initialRules(operation, profile.battler, profile.current, index),
      [{ operation, battler: profile.battler, value: profile.incoming }],
    );
  }
  for (const [index, profile] of unchangedProfiles.entries()) {
    addCase(
      `${operation.replace("-", "_")}_unchanged_battler_${profile.battler}_${profile.current}`,
      `${operation}-unchanged`,
      initialRules(operation, profile.battler, profile.current, index + 5),
      [{ operation, battler: profile.battler, value: profile.incoming }],
    );
  }
}

addCase(
  "chain_interleaved_reveals",
  "chain-interleaved",
  makeRules([0, 1, 127, 254], [255, 254, 127, 1]),
  [
    { operation: OP_ABILITY, battler: 0, value: 255 },
    { operation: OP_ITEM_EFFECT, battler: 3, value: 0 },
    { operation: OP_ABILITY, battler: 2, value: 127 },
    { operation: OP_ITEM_EFFECT, battler: 1, value: 254 },
    { operation: OP_ABILITY, battler: 1, value: 0 },
    { operation: OP_ITEM_EFFECT, battler: 2, value: 1 },
    { operation: OP_ABILITY, battler: 3, value: 254 },
    { operation: OP_ITEM_EFFECT, battler: 0, value: 255 },
  ],
);
addCase(
  "chain_boundary_round_trip",
  "chain-boundary-round-trip",
  makeRules([255, 254, 127, 1], [0, 1, 127, 254]),
  [
    { operation: OP_ABILITY, battler: 0, value: 0 },
    { operation: OP_ABILITY, battler: 0, value: 255 },
    { operation: OP_ITEM_EFFECT, battler: 3, value: 255 },
    { operation: OP_ITEM_EFFECT, battler: 3, value: 254 },
    { operation: OP_ABILITY, battler: 2, value: 128 },
    { operation: OP_ITEM_EFFECT, battler: 1, value: 1 },
    { operation: OP_ABILITY, battler: 3, value: 1 },
  ],
);

assert(cases.length === 20, `case count drifted: ${cases.length}`);
for (const operation of OPERATION_DOMAIN) {
  for (const path of ["changed", "unchanged"]) {
    const covered = new Set(
      cases
        .filter((value) => value.category === `${operation}-${path}`)
        .flatMap((value) => value.steps.map((step) => step.battler)),
    );
    for (const battler of BATTLER_DOMAIN) {
      assert(covered.has(battler), `${operation}-${path} omits battler ${battler}`);
    }
  }
}

const requiredBoundaryValues = [0, 1, 127, 254, 255];
const observedInputs = new Set(cases.flatMap((value) => [
  ...value.initial.aiObservedAbilityIds,
  ...value.initial.aiObservedItemEffects,
  ...value.steps.map((step) => step.value),
]));
for (const value of requiredBoundaryValues) {
  assert(observedInputs.has(value), `corpus omits required boundary/mid value ${value}`);
}

function census(values, key) {
  const counts = new Map();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return [...counts].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
}

const categoryCensus = census(cases, (value) => value.category);
const branchCensus = census(
  cases.flatMap((value) => value.steps),
  (step) => `${step.operation}-${step.returnedInput ? "return-input" : "replace-cell"}`,
);
const domainCensus = Object.freeze([
  ["battler-slots", BATTLER_DOMAIN.length],
  ["observed-u8-values", OBSERVED_VALUE_DOMAIN[1] - OBSERVED_VALUE_DOMAIN[0] + 1],
  ["operations", OPERATION_DOMAIN.length],
]);
const corpus = Object.freeze({
  battlerDomain: BATTLER_DOMAIN,
  observedValueDomain: OBSERVED_VALUE_DOMAIN,
  operationDomain: OPERATION_DOMAIN,
  domainCensus,
  categoryCensus,
  branchCensus,
  cases,
});
const corpusHash = crypto.createHash("sha256").update(JSON.stringify(corpus)).digest("hex");

function rustString(value) {
  return JSON.stringify(value);
}

function rustCells(cells) {
  return `[${cells.join(", ")}]`;
}

function rustState(state) {
  return `BattleScriptAiRevealVectorState { ai_observed_ability_ids: ${rustCells(state.aiObservedAbilityIds)}, ai_observed_item_effects: ${rustCells(state.aiObservedItemEffects)} }`;
}

function rustOperation(operation) {
  return operation === OP_ABILITY
    ? "BattleScriptAiRevealVectorOperation::Ability"
    : "BattleScriptAiRevealVectorOperation::ItemEffect";
}

function rustStep(step) {
  return `BattleScriptAiRevealVectorStep { operation: ${rustOperation(step.operation)}, battler: ${step.battler}, value: ${step.value}, returned_input: ${step.returnedInput}, expected: ${rustState(step.expected)} }`;
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-battle-script-ai-reveal-vectors.mjs.");
lines.push("// Source: executing canonical src/engine/battleScriptAiReveal.ts via node");
lines.push("// --experimental-strip-types. Regenerate; do not hand-edit.");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_AI_REVEAL_VECTOR_CORPUS_SHA256: &str = ${rustString(corpusHash)};`);
lines.push(`pub const BATTLE_SCRIPT_AI_REVEAL_BATTLER_DOMAIN: [u8; ${BATTLER_DOMAIN.length}] = ${rustCells(BATTLER_DOMAIN)};`);
lines.push(`pub const BATTLE_SCRIPT_AI_REVEAL_OBSERVED_VALUE_DOMAIN: [u8; ${OBSERVED_VALUE_DOMAIN.length}] = ${rustCells(OBSERVED_VALUE_DOMAIN)};`);
lines.push(`pub const BATTLE_SCRIPT_AI_REVEAL_OPERATION_DOMAIN: [&str; ${OPERATION_DOMAIN.length}] = [${OPERATION_DOMAIN.map(rustString).join(", ")}];`);
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptAiRevealVectorState {");
lines.push("    pub ai_observed_ability_ids: [u8; 4],");
lines.push("    pub ai_observed_item_effects: [u8; 4],");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub enum BattleScriptAiRevealVectorOperation {");
lines.push("    Ability,");
lines.push("    ItemEffect,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptAiRevealVectorStep {");
lines.push("    pub operation: BattleScriptAiRevealVectorOperation,");
lines.push("    pub battler: u8,");
lines.push("    pub value: u8,");
lines.push("    pub returned_input: bool,");
lines.push("    pub expected: BattleScriptAiRevealVectorState,");
lines.push("}");
lines.push("");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct BattleScriptAiRevealVectorCase {");
lines.push("    pub label: &'static str,");
lines.push("    pub category: &'static str,");
lines.push("    pub initial: BattleScriptAiRevealVectorState,");
lines.push("    pub steps: &'static [BattleScriptAiRevealVectorStep],");
lines.push("}");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_AI_REVEAL_DOMAIN_CENSUS: [(&str, usize); ${domainCensus.length}] = [`);
for (const [name, count] of domainCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_AI_REVEAL_CATEGORY_CENSUS: [(&str, usize); ${categoryCensus.length}] = [`);
for (const [name, count] of categoryCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub const BATTLE_SCRIPT_AI_REVEAL_BRANCH_CENSUS: [(&str, usize); ${branchCensus.length}] = [`);
for (const [name, count] of branchCensus) lines.push(`    (${rustString(name)}, ${count}),`);
lines.push("];");
lines.push("");
lines.push(`pub static BATTLE_SCRIPT_AI_REVEAL_CASES: [BattleScriptAiRevealVectorCase; ${cases.length}] = [`);
for (const value of cases) {
  lines.push(`    // ${value.label}`);
  lines.push("    BattleScriptAiRevealVectorCase {");
  lines.push(`        label: ${rustString(value.label)},`);
  lines.push(`        category: ${rustString(value.category)},`);
  lines.push(`        initial: ${rustState(value.initial)},`);
  lines.push("        steps: &[");
  for (const step of value.steps) lines.push(`            ${rustStep(step)},`);
  lines.push("        ],");
  lines.push("    },");
}
lines.push("];");

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
if (!formatted) {
  throw new Error("gen-battle-script-ai-reveal-vectors: could not find rustfmt");
}

const generatedHash = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-battle-script-ai-reveal-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-battle-script-ai-reveal-vectors: ${cases.length} cases, ${cases.reduce((sum, value) => sum + value.steps.length, 0)} operations`);
console.log(`gen-battle-script-ai-reveal-vectors: domain census ${JSON.stringify(domainCensus)}`);
console.log(`gen-battle-script-ai-reveal-vectors: category census ${JSON.stringify(categoryCensus)}`);
console.log(`gen-battle-script-ai-reveal-vectors: branch census ${JSON.stringify(branchCensus)}`);
console.log(`gen-battle-script-ai-reveal-vectors: corpus sha256 ${corpusHash}`);
console.log(`gen-battle-script-ai-reveal-vectors: generated sha256 ${generatedHash}`);
