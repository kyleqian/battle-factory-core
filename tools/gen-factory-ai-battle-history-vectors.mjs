#!/usr/bin/env node
// Full-result differential corpus for the pure Factory AI battle-history leaf.
// Expected histories and error messages come only from executing canonical
// src/engine/factoryAiLiveDriver.ts.  This generator owns deterministic input
// construction, then writes Rust vectors that the native test executes.
//
// Usage (from any cwd):
//   node --experimental-strip-types core-rs/tools/gen-factory-ai-battle-history-vectors.mjs

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  scriptDir,
  "..",
  "crates",
  "factory-core",
  "src",
  "factory_ai_battle_history_vectors_gen.rs",
);
const liveDriver = await import(
  path.join(workspaceRoot, "src", "engine", "factoryAiLiveDriver.ts"),
);

const BATTLE_SLOTS = 4;
const OP_SYNC = "sync";
const OP_RECORD_ABILITY = "record-ability";
const OP_RECORD_ITEM = "record-item";
const VALID_OPERATION_KINDS = new Set([OP_SYNC, OP_RECORD_ABILITY, OP_RECORD_ITEM]);

function cloneNumbers(values) {
  return values.map((value) => value);
}

function input({
  partyIndexes = [0, 1, 2, 3],
  targetLastMove = 0,
  observedAbilityIds = [0, 0, 0, 0],
  observedItemEffects = [0, 0, 0, 0],
} = {}) {
  return {
    partyIndexes: cloneNumbers(partyIndexes),
    targetLastMove,
    observedAbilityIds: cloneNumbers(observedAbilityIds),
    observedItemEffects: cloneNumbers(observedItemEffects),
  };
}

function history({
  usedMoves = [[], [], [], []],
  knownAbilities = [null, null, null, null],
  knownItemEffects = [0, 0, 0, 0],
  partyIndexes = [0, 1, 2, 3],
} = {}) {
  return {
    usedMoves: usedMoves.map((row) => cloneNumbers(row)),
    knownAbilities: [...knownAbilities],
    knownItemEffects: cloneNumbers(knownItemEffects),
    partyIndexes: cloneNumbers(partyIndexes),
  };
}

function asRules(liveInput) {
  // The five fields below are the complete property-read set for the TS
  // functions under test.  Do not construct a wider rules context here: a
  // future view/decision port must not accidentally become part of this leaf.
  return {
    battlers: liveInput.partyIndexes.map((partyIndex) => ({ partyIndex })),
    moveHistory: { lastMoves: [liveInput.targetLastMove, 0, 0, 0] },
    aiObservedAbilityIds: liveInput.observedAbilityIds,
    aiObservedItemEffects: liveInput.observedItemEffects,
  };
}

function asHistory(payload) {
  return {
    usedMoves: payload.usedMoves.map((row) => [...row]),
    knownAbilities: [...payload.knownAbilities],
    knownItemEffects: [...payload.knownItemEffects],
    partyIndexes: [...payload.partyIndexes],
  };
}

function assertFourNumberArray(value, name) {
  if (!Array.isArray(value) || value.length !== BATTLE_SLOTS) {
    throw new Error(`gen-factory-ai-battle-history-vectors: ${name} must have exactly ${BATTLE_SLOTS} cells`);
  }
  value.forEach((item, index) => {
    if (typeof item !== "number") {
      throw new Error(`gen-factory-ai-battle-history-vectors: ${name}[${index}] must be a number`);
    }
  });
}

function assertInput(value, name) {
  if (value === null || typeof value !== "object") {
    throw new Error(`gen-factory-ai-battle-history-vectors: ${name} must be an object`);
  }
  assertFourNumberArray(value.partyIndexes, `${name}.partyIndexes`);
  if (typeof value.targetLastMove !== "number") {
    throw new Error(`gen-factory-ai-battle-history-vectors: ${name}.targetLastMove must be a number`);
  }
  assertFourNumberArray(value.observedAbilityIds, `${name}.observedAbilityIds`);
  assertFourNumberArray(value.observedItemEffects, `${name}.observedItemEffects`);
}

function assertHistory(value, name) {
  if (value === null || typeof value !== "object") {
    throw new Error(`gen-factory-ai-battle-history-vectors: ${name} must be an object`);
  }
  if (!Array.isArray(value.usedMoves) || value.usedMoves.length !== BATTLE_SLOTS) {
    throw new Error(`gen-factory-ai-battle-history-vectors: ${name}.usedMoves must have exactly ${BATTLE_SLOTS} rows`);
  }
  value.usedMoves.forEach((row, battler) => {
    if (!Array.isArray(row) || row.some((move) => typeof move !== "number")) {
      throw new Error(`gen-factory-ai-battle-history-vectors: ${name}.usedMoves[${battler}] must be a number array`);
    }
  });
  if (!Array.isArray(value.knownAbilities) || value.knownAbilities.length !== BATTLE_SLOTS
    || value.knownAbilities.some((ability) => ability !== null && typeof ability !== "string")) {
    throw new Error(`gen-factory-ai-battle-history-vectors: ${name}.knownAbilities must be four string/null cells`);
  }
  assertFourNumberArray(value.knownItemEffects, `${name}.knownItemEffects`);
  assertFourNumberArray(value.partyIndexes, `${name}.partyIndexes`);
}

function assertOperation(operation, caseLabel, index) {
  if (!VALID_OPERATION_KINDS.has(operation.kind)) {
    throw new Error(`gen-factory-ai-battle-history-vectors: ${caseLabel}.operations[${index}] has unknown kind ${operation.kind}`);
  }
  if (operation.kind === OP_SYNC) {
    assertInput(operation.input, `${caseLabel}.operations[${index}].input`);
    return;
  }
  if (!Number.isInteger(operation.battler) || operation.battler < 0 || operation.battler >= BATTLE_SLOTS) {
    throw new Error(`gen-factory-ai-battle-history-vectors: ${caseLabel}.operations[${index}].battler must be 0..3`);
  }
  if (operation.kind === OP_RECORD_ABILITY && typeof operation.ability !== "string") {
    throw new Error(`gen-factory-ai-battle-history-vectors: ${caseLabel}.operations[${index}].ability must be a string`);
  }
  if (operation.kind === OP_RECORD_ITEM && typeof operation.itemEffect !== "number") {
    throw new Error(`gen-factory-ai-battle-history-vectors: ${caseLabel}.operations[${index}].itemEffect must be a number`);
  }
}

const cases = [];
const labels = new Set();

function addCase({ label, category, initialInput, initialHistory = null, operations = [] }) {
  if (typeof label !== "string" || !/^[a-z0-9_]+$/.test(label) || labels.has(label)) {
    throw new Error(`gen-factory-ai-battle-history-vectors: duplicate or invalid label ${JSON.stringify(label)}`);
  }
  if (typeof category !== "string" || category.length === 0) {
    throw new Error(`gen-factory-ai-battle-history-vectors: ${label} needs a category`);
  }
  assertInput(initialInput, `${label}.initialInput`);
  if (initialHistory !== null) assertHistory(initialHistory, `${label}.initialHistory`);
  if (!Array.isArray(operations)) {
    throw new Error(`gen-factory-ai-battle-history-vectors: ${label}.operations must be an array`);
  }
  operations.forEach((operation, index) => assertOperation(operation, label, index));
  labels.add(label);

  let expectedJson = null;
  let expectedError = null;
  try {
    let result = initialHistory === null
      ? liveDriver.createFactoryAiBattleHistory(asRules(initialInput))
      : asHistory(initialHistory);
    for (const operation of operations) {
      if (operation.kind === OP_SYNC) {
        result = liveDriver.syncFactoryAiBattleHistory(result, asRules(operation.input));
      } else if (operation.kind === OP_RECORD_ABILITY) {
        result = liveDriver.recordFactoryAiKnownAbility(result, operation.battler, operation.ability);
      } else {
        result = liveDriver.recordFactoryAiKnownItemEffect(result, operation.battler, operation.itemEffect);
      }
    }
    expectedJson = JSON.stringify(result);
  } catch (error) {
    expectedError = error instanceof Error ? error.message : String(error);
  }
  if ((expectedJson === null) === (expectedError === null)) {
    throw new Error(`gen-factory-ai-battle-history-vectors: ${label} did not yield exactly one TS outcome`);
  }
  cases.push({ label, category, initialInput, initialHistory, operations, expectedJson, expectedError });
}

// Creation and explicit record helpers.  The second row deliberately writes
// every battler, while its final ability/item writes prove record overwrites.
addCase({
  label: "create_four_party_indexes",
  category: "create",
  initialInput: input({ partyIndexes: [9, -1, 2.5, -0] }),
});
addCase({
  label: "record_all_battlers_and_overwrite",
  category: "record",
  initialInput: input(),
  operations: [
    { kind: OP_RECORD_ABILITY, battler: 0, ability: "ABILITY_CUSTOM_ZERO" },
    { kind: OP_RECORD_ABILITY, battler: 1, ability: "ABILITY_CUSTOM_ONE" },
    { kind: OP_RECORD_ABILITY, battler: 2, ability: "ABILITY_CUSTOM_TWO" },
    { kind: OP_RECORD_ABILITY, battler: 3, ability: "ABILITY_CUSTOM_THREE" },
    { kind: OP_RECORD_ITEM, battler: 0, itemEffect: -1 },
    { kind: OP_RECORD_ITEM, battler: 1, itemEffect: 1.5 },
    { kind: OP_RECORD_ITEM, battler: 2, itemEffect: 29 },
    { kind: OP_RECORD_ITEM, battler: 3, itemEffect: 65535 },
    { kind: OP_RECORD_ABILITY, battler: 2, ability: "ABILITY_CUSTOM_TWO_FINAL" },
    { kind: OP_RECORD_ITEM, battler: 1, itemEffect: 99 },
  ],
});

addCase({
  label: "target_move_none",
  category: "target-move",
  initialInput: input(),
  initialHistory: history({ usedMoves: [[70], [8], [], []] }),
  operations: [{ kind: OP_SYNC, input: input({ targetLastMove: 0 }) }],
});
addCase({
  label: "target_move_new",
  category: "target-move",
  initialInput: input(),
  initialHistory: history({ usedMoves: [[70], [], [], []] }),
  operations: [{ kind: OP_SYNC, input: input({ targetLastMove: 89 }) }],
});
addCase({
  label: "target_move_duplicate",
  category: "target-move",
  initialInput: input(),
  initialHistory: history({ usedMoves: [[70, 89], [], [], []] }),
  operations: [{ kind: OP_SYNC, input: input({ targetLastMove: 89 }) }],
});
addCase({
  label: "target_move_cap_four",
  category: "target-move",
  initialInput: input(),
  initialHistory: history({ usedMoves: [[70, 89, 33, 57], [], [], []] }),
  operations: [{ kind: OP_SYNC, input: input({ targetLastMove: 85 }) }],
});
addCase({
  label: "target_move_nan_same_value_zero",
  category: "target-move",
  initialInput: input(),
  initialHistory: history({ usedMoves: [[Number.NaN], [], [], []] }),
  operations: [{ kind: OP_SYNC, input: input({ targetLastMove: Number.NaN }) }],
});

addCase({
  label: "party_change_clears_every_slot_and_retains_items",
  category: "party-change",
  initialInput: input(),
  initialHistory: history({
    usedMoves: [[70], [71], [72], [73]],
    knownAbilities: ["ABILITY_A", "ABILITY_B", "ABILITY_C", "ABILITY_D"],
    knownItemEffects: [11, 22, 33, 44],
  }),
  operations: [{
    kind: OP_SYNC,
    input: input({ partyIndexes: [4, 5, 6, 7], targetLastMove: 89 }),
  }],
});
addCase({
  label: "party_change_then_overlay_order",
  category: "party-change",
  initialInput: input(),
  initialHistory: history({
    usedMoves: [[70], [71], [72], [73]],
    knownAbilities: ["ABILITY_A", "ABILITY_B", "ABILITY_C", "ABILITY_D"],
    knownItemEffects: [11, 22, 33, 44],
  }),
  operations: [{
    kind: OP_SYNC,
    input: input({
      partyIndexes: [1, 1, 2, 3],
      targetLastMove: 70,
      observedAbilityIds: [9, 0, 69, 77],
      observedItemEffects: [101, 0, 202, 303],
    }),
  }],
});

addCase({
  label: "observations_all_four_battlers",
  category: "observations",
  initialInput: input(),
  operations: [{
    kind: OP_SYNC,
    input: input({
      observedAbilityIds: [9, 10, 11, 12],
      observedItemEffects: [1, 2, 3, 4],
    }),
  }],
});
addCase({
  label: "observations_overwrite_only_nonzero",
  category: "observations",
  initialInput: input(),
  initialHistory: history({
    knownAbilities: ["ABILITY_OLD_0", "ABILITY_OLD_1", "ABILITY_OLD_2", "ABILITY_OLD_3"],
    knownItemEffects: [11, 22, 33, 44],
  }),
  operations: [{
    kind: OP_SYNC,
    input: input({
      observedAbilityIds: [9, 0, 69, 77],
      observedItemEffects: [101, 0, 202, 303],
    }),
  }],
});

// The TS map resolves 0 as no observation, but any other unknown numeric key
// throws before that battler's item overlay or later battlers are processed.
addCase({
  label: "unknown_ability_above_universe",
  category: "unknown-ability",
  initialInput: input(),
  operations: [{ kind: OP_SYNC, input: input({ observedAbilityIds: [78, 9, 0, 0] }) }],
});
addCase({
  label: "unknown_ability_fractional",
  category: "unknown-ability",
  initialInput: input(),
  operations: [{ kind: OP_SYNC, input: input({ observedAbilityIds: [1.5, 0, 0, 0] }) }],
});
addCase({
  label: "unknown_ability_nan",
  category: "unknown-ability",
  initialInput: input(),
  operations: [{ kind: OP_SYNC, input: input({ observedAbilityIds: [Number.NaN, 0, 0, 0] }) }],
});

// Existing history has no source validation.  This row retains odd but legal
// JS number/string payloads through untouched cells and proves NaN party
// membership follows `!==` (slot 0 clears before the new target move).
addCase({
  label: "arbitrary_history_payloads",
  category: "arbitrary-history",
  initialInput: input(),
  initialHistory: history({
    usedMoves: [[Number.NaN, -0, 1.5], [-999, 999999], [42], [0]],
    knownAbilities: ["ABILITY_UNTRUSTED", "ABILITY_ODD", null, "ABILITY_FINAL"],
    knownItemEffects: [Number.NaN, -0, -11.5, 1.5],
    partyIndexes: [Number.NaN, -0, 2.5, Infinity],
  }),
  operations: [{
    kind: OP_SYNC,
    input: input({
      partyIndexes: [Number.NaN, -0, 2.5, Infinity],
      targetLastMove: 85,
    }),
  }],
});

const EXPECTED_CATEGORY_COUNTS = new Map([
  ["create", 1],
  ["record", 1],
  ["target-move", 5],
  ["party-change", 2],
  ["observations", 2],
  ["unknown-ability", 3],
  ["arbitrary-history", 1],
]);
const categoryCounts = new Map();
for (const vector of cases) {
  categoryCounts.set(vector.category, (categoryCounts.get(vector.category) ?? 0) + 1);
}
if (categoryCounts.size !== EXPECTED_CATEGORY_COUNTS.size) {
  throw new Error(`gen-factory-ai-battle-history-vectors: unexpected category census ${JSON.stringify([...categoryCounts])}`);
}
for (const [category, count] of EXPECTED_CATEGORY_COUNTS) {
  if (categoryCounts.get(category) !== count) {
    throw new Error(`gen-factory-ai-battle-history-vectors: category ${category} has ${categoryCounts.get(category)}, expected ${count}`);
  }
}
const seenKinds = new Set(cases.flatMap((vector) => vector.operations.map((operation) => operation.kind)));
for (const operationKind of VALID_OPERATION_KINDS) {
  if (!seenKinds.has(operationKind)) {
    throw new Error(`gen-factory-ai-battle-history-vectors: corpus omits ${operationKind}`);
  }
}

function rustString(value) {
  return JSON.stringify(value);
}

function rustNumber(value) {
  if (Number.isNaN(value)) return "f64::NAN";
  if (value === Infinity) return "f64::INFINITY";
  if (value === -Infinity) return "f64::NEG_INFINITY";
  if (Object.is(value, -0)) return "-0.0";
  if (Number.isInteger(value)) return `${value}.0`;
  return String(value);
}

function rustNumbers(values) {
  return `[${values.map(rustNumber).join(", ")}]`;
}

function rustOptionString(value) {
  return value === null ? "None" : `Some(${rustString(value)})`;
}

function rustLiveInput(value) {
  return `FactoryAiBattleHistoryLiveInput { party_indexes: ${rustNumbers(value.partyIndexes)}, target_last_move: ${rustNumber(value.targetLastMove)}, observed_ability_ids: ${rustNumbers(value.observedAbilityIds)}, observed_item_effects: ${rustNumbers(value.observedItemEffects)} }`;
}

function rustHistory(value) {
  const usedMoves = `[${value.usedMoves.map((row) => `&${rustNumbers(row)}`).join(", ")}]`;
  const abilities = `[${value.knownAbilities.map(rustOptionString).join(", ")}]`;
  return `FactoryAiBattleHistoryVectorHistory { used_moves: ${usedMoves}, known_abilities: ${abilities}, known_item_effects: ${rustNumbers(value.knownItemEffects)}, party_indexes: ${rustNumbers(value.partyIndexes)} }`;
}

function rustOperation(operation) {
  if (operation.kind === OP_SYNC) {
    return `FactoryAiBattleHistoryVectorOperation { kind: FactoryAiBattleHistoryVectorOperationKind::Sync, battler: 0, ability: None, item_effect: 0.0, input: ${rustLiveInput(operation.input)} }`;
  }
  if (operation.kind === OP_RECORD_ABILITY) {
    return `FactoryAiBattleHistoryVectorOperation { kind: FactoryAiBattleHistoryVectorOperationKind::RecordAbility, battler: ${operation.battler}, ability: Some(${rustString(operation.ability)}), item_effect: 0.0, input: ${rustLiveInput(input())} }`;
  }
  return `FactoryAiBattleHistoryVectorOperation { kind: FactoryAiBattleHistoryVectorOperationKind::RecordItem, battler: ${operation.battler}, ability: None, item_effect: ${rustNumber(operation.itemEffect)}, input: ${rustLiveInput(input())} }`;
}

const categoryLines = [...EXPECTED_CATEGORY_COUNTS]
  .map(([category, count]) => `    (${rustString(category)}, ${count}),`)
  .join("\n");
const caseLines = cases.map((vector) => {
  const initialHistory = vector.initialHistory === null ? "None" : `Some(${rustHistory(vector.initialHistory)})`;
  const operations = `&[${vector.operations.map(rustOperation).join(", ")}]`;
  return `    FactoryAiBattleHistoryVectorCase {
        label: ${rustString(vector.label)},
        category: ${rustString(vector.category)},
        initial_input: ${rustLiveInput(vector.initialInput)},
        initial_history: ${initialHistory},
        operations: ${operations},
        expected_json: ${vector.expectedJson === null ? "None" : `Some(${rustString(vector.expectedJson)})`},
        expected_error: ${vector.expectedError === null ? "None" : `Some(${rustString(vector.expectedError)})`},
    },`;
}).join("\n");

const rust = `// GENERATED by core-rs/tools/gen-factory-ai-battle-history-vectors.mjs.
// Expected values come only from executing src/engine/factoryAiLiveDriver.ts.
// Regenerate: node --experimental-strip-types core-rs/tools/gen-factory-ai-battle-history-vectors.mjs
// Deterministic fixed corpus; do not hand-edit.

use crate::factory_ai_battle_history::FactoryAiBattleHistoryLiveInput;

#[derive(Debug, Clone, Copy)]
pub struct FactoryAiBattleHistoryVectorHistory {
    pub used_moves: [&'static [f64]; 4],
    pub known_abilities: [Option<&'static str>; 4],
    pub known_item_effects: [f64; 4],
    pub party_indexes: [f64; 4],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryAiBattleHistoryVectorOperationKind {
    Sync,
    RecordAbility,
    RecordItem,
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryAiBattleHistoryVectorOperation {
    pub kind: FactoryAiBattleHistoryVectorOperationKind,
    pub battler: u8,
    pub ability: Option<&'static str>,
    pub item_effect: f64,
    pub input: FactoryAiBattleHistoryLiveInput,
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryAiBattleHistoryVectorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub initial_input: FactoryAiBattleHistoryLiveInput,
    pub initial_history: Option<FactoryAiBattleHistoryVectorHistory>,
    pub operations: &'static [FactoryAiBattleHistoryVectorOperation],
    pub expected_json: Option<&'static str>,
    pub expected_error: Option<&'static str>,
}

pub const FACTORY_AI_BATTLE_HISTORY_VECTOR_CATEGORY_COUNTS: [(&str, usize); ${EXPECTED_CATEGORY_COUNTS.size}] = [
${categoryLines}
];

pub const FACTORY_AI_BATTLE_HISTORY_CASES: [FactoryAiBattleHistoryVectorCase; ${cases.length}] = [
${caseLines}
];
`;

fs.writeFileSync(outPath, rust, "utf8");
const rustupBin = path.join(
  process.env.HOME ?? "",
  ".rustup",
  "toolchains",
  "stable-aarch64-apple-darwin",
  "bin",
);
const rustfmtCandidates = [path.join(rustupBin, "rustfmt"), "rustfmt"];
let formatted = false;
for (const rustfmt of rustfmtCandidates) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!formatted) {
  throw new Error("gen-factory-ai-battle-history-vectors: could not find rustfmt");
}
const digest = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-factory-ai-battle-history-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-factory-ai-battle-history-vectors: ${cases.length} cases; ${[...EXPECTED_CATEGORY_COUNTS].map(([category, count]) => `${category}=${count}`).join(", ")}`);
console.log(`gen-factory-ai-battle-history-vectors: sha256 ${digest}`);
