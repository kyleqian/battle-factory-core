#!/usr/bin/env node
// Full-result differential corpus for factoryTrainerSchedule.ts. Expected
// success objects and error text are produced only by executing canonical
// TypeScript; this generator only constructs deterministic input scenarios.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-factory-trainer-schedule-vectors.mjs

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
  "factory_trainer_schedule_vectors_gen.rs",
);

const schedule = await import(path.join(workspaceRoot, "src", "engine", "factoryTrainerSchedule.ts"));
const roundPolicy = JSON.parse(
  fs.readFileSync(path.join(workspaceRoot, "src", "data", "gen", "factory-round-policy.json"), "utf8"),
);

if (roundPolicy.schema !== "factory-round-policy/v1") {
  throw new Error(`unexpected factory-round-policy schema ${roundPolicy.schema}`);
}
const { constants, trainerSelection } = roundPolicy;
const STAGES = constants.stagesPerChallenge;
const HARD_BATTLE_INDEX = trainerSelection.hardBattleIndex;
const AFTER_CHALLENGE_INDEX = trainerSelection.afterChallengeIndex;
const AFTER_CHALLENGE_RANGE_INDEX = trainerSelection.afterChallengeRangeIndex;
const POST_CLAMP_CHALLENGE = AFTER_CHALLENGE_INDEX + 1;
const FINAL_HISTORY_LENGTH = HARD_BATTLE_INDEX;
const POST_CLAMP_RANGE = trainerSelection.normalRanges[AFTER_CHALLENGE_RANGE_INDEX];

function scriptedPort(draws) {
  let index = 0;
  return {
    draw(_rngValue) {
      const draw = draws[index++];
      if (draw === undefined) throw new Error("scripted trainer RNG exhausted");
      return { rngValue: draw.rngValue, value: draw.value };
    },
  };
}

function sequentialDraws(values, initialRngValue = 0x1000) {
  return values.map((value, index) => ({
    rngValue: initialRngValue + index + 1,
    value,
  }));
}

const cases = [];
const labels = new Set();

function addCase({
  label,
  category,
  operation,
  factoryWinStreak,
  battleIndex = 0,
  storedTrainerIds = [],
  rngValue = 0,
  scriptedDraws,
}) {
  if (labels.has(label)) throw new Error(`duplicate trainer schedule vector label ${label}`);
  labels.add(label);
  const rngPort = scriptedDraws === undefined ? undefined : scriptedPort(scriptedDraws);
  let expectedJson = null;
  let expectedError = null;
  try {
    const result = operation === "selection"
      ? schedule.selectFactoryTrainer(
        factoryWinStreak,
        battleIndex,
        storedTrainerIds,
        rngValue,
        rngPort,
      )
      : schedule.generateFactoryTrainerSchedule(factoryWinStreak, rngValue, rngPort);
    expectedJson = JSON.stringify(result);
  } catch (error) {
    expectedError = String(error instanceof Error ? error.message : error);
  }
  if ((expectedJson === null) === (expectedError === null)) {
    throw new Error(`vector ${label} did not produce exactly one expected outcome`);
  }
  cases.push({
    label,
    category,
    operation,
    rngMode: scriptedDraws === undefined ? "gba" : "scripted",
    factoryWinStreak,
    battleIndex,
    storedTrainerIds,
    rngValue,
    scriptedDraws: scriptedDraws ?? [],
    expectedJson,
    expectedError,
  });
}

function addSelection(label, category, input) {
  addCase({ label, category, operation: "selection", ...input });
}

function addSchedule(label, category, input) {
  addCase({ label, category, operation: "schedule", ...input });
}

// Every generated normal and final-battle hard range endpoint. The TypeScript
// module calculates the expected range selection and full receipt; the JSON
// is read only to construct source-addressable endpoint inputs.
for (const [challenge, range] of trainerSelection.normalRanges.entries()) {
  const battleIndex = challenge % HARD_BATTLE_INDEX;
  const storedTrainerIds = Array.from({ length: battleIndex }, (_, index) => 400 + index);
  addSelection(`normal_range_${challenge}_low`, "normal-range-boundary", {
    factoryWinStreak: challenge * STAGES,
    battleIndex,
    storedTrainerIds,
    scriptedDraws: sequentialDraws([0]),
  });
  addSelection(`normal_range_${challenge}_high`, "normal-range-boundary", {
    factoryWinStreak: challenge * STAGES,
    battleIndex,
    storedTrainerIds,
    scriptedDraws: sequentialDraws([range.end - range.start]),
  });
}
for (const [challenge, range] of trainerSelection.hardRanges.entries()) {
  const storedTrainerIds = Array.from(
    { length: FINAL_HISTORY_LENGTH },
    (_, index) => 400 + index,
  );
  addSelection(`hard_range_${challenge}_low`, "hard-range-boundary", {
    factoryWinStreak: challenge * STAGES,
    battleIndex: HARD_BATTLE_INDEX,
    storedTrainerIds,
    scriptedDraws: sequentialDraws([0]),
  });
  addSelection(`hard_range_${challenge}_high`, "hard-range-boundary", {
    factoryWinStreak: challenge * STAGES,
    battleIndex: HARD_BATTLE_INDEX,
    storedTrainerIds,
    scriptedDraws: sequentialDraws([range.end - range.start]),
  });
}

// Challenge transitions straddle both the source's seven-stage division and
// its strict `challenge > afterChallengeIndex` post-range clamp.
for (const [label, factoryWinStreak, battleIndex, raw] of [
  ["streak_zero", 0, 0, 0],
  ["streak_last_challenge_zero", STAGES - 1, 0, 0],
  ["streak_first_challenge_one", STAGES, 0, 0],
  ["streak_last_challenge_six", (AFTER_CHALLENGE_INDEX - 1) * STAGES + STAGES - 1, 0, 0],
  ["streak_first_challenge_seven", AFTER_CHALLENGE_INDEX * STAGES, 0, 0],
  ["streak_last_challenge_seven", POST_CLAMP_CHALLENGE * STAGES - 1, 0, POST_CLAMP_RANGE.end - POST_CLAMP_RANGE.start],
  ["streak_first_post_clamp_normal", POST_CLAMP_CHALLENGE * STAGES, 0, POST_CLAMP_RANGE.end - POST_CLAMP_RANGE.start],
  ["streak_first_post_clamp_hard_slot", POST_CLAMP_CHALLENGE * STAGES, HARD_BATTLE_INDEX, POST_CLAMP_RANGE.end - POST_CLAMP_RANGE.start],
  ["streak_max_safe_integer", Number.MAX_SAFE_INTEGER, HARD_BATTLE_INDEX, POST_CLAMP_RANGE.end - POST_CLAMP_RANGE.start],
]) {
  const storedTrainerIds = battleIndex === HARD_BATTLE_INDEX
    ? Array.from({ length: FINAL_HISTORY_LENGTH }, (_, index) => 400 + index)
    : [];
  addSelection(label, "streak-boundary", {
    factoryWinStreak,
    battleIndex,
    storedTrainerIds,
    scriptedDraws: sequentialDraws([raw]),
  });
}

// Direct retry cases retain every rejected ledger draw, including the source
// quirk that the final selection returns the caller's complete history array
// unchanged rather than a sliced copy.
addSelection("retry_nonfinal_two_duplicates", "duplicate-retry", {
  factoryWinStreak: 0,
  battleIndex: 2,
  storedTrainerIds: [0, 2],
  scriptedDraws: sequentialDraws([0, 2, 4]),
});
addSelection("retry_final_six_duplicates_history_omitted", "duplicate-retry", {
  factoryWinStreak: 0,
  battleIndex: HARD_BATTLE_INDEX,
  storedTrainerIds: Array.from(
    { length: FINAL_HISTORY_LENGTH },
    (_, index) => trainerSelection.hardRanges[0].start + index,
  ),
  rngValue: 0x1000,
  scriptedDraws: sequentialDraws(
    Array.from({ length: FINAL_HISTORY_LENGTH + 1 }, (_, index) => index),
    0x1000,
  ),
});
addSchedule("schedule_retries_every_prior_selection", "duplicate-retry", {
  factoryWinStreak: 0,
  scriptedDraws: sequentialDraws([
    0,
    0, 1,
    0, 1, 2,
    0, 1, 2, 3,
    0, 1, 2, 3, 4,
    0, 1, 2, 3, 4, 5,
    0,
  ]),
});

addSelection("history_nonfinal_slices_extra_entries_before_write", "history-write", {
  factoryWinStreak: 0,
  battleIndex: 1,
  storedTrainerIds: [400, 777],
  scriptedDraws: sequentialDraws([0]),
});
addSelection("history_final_preserves_extra_entries", "history-write", {
  factoryWinStreak: 0,
  battleIndex: HARD_BATTLE_INDEX,
  storedTrainerIds: [400, 401, 402, 403, 404, 405, 777],
  scriptedDraws: sequentialDraws([6]),
});

// Representative native Gen-3 streams: each is a complete seven-trainer
// schedule, so retries discovered by the canonical TS loop remain visible.
for (const [index, [factoryWinStreak, rngValue]] of [
  [0, 0x00000000],
  [0, 0x00000001],
  [0, 0xffffffff],
  [0, 0x12345678],
  [STAGES, 0xd2ddeec8],
  [(AFTER_CHALLENGE_INDEX - 1) * STAGES, 0xdeadbeef],
  [AFTER_CHALLENGE_INDEX * STAGES, 0x7fffffff],
  [AFTER_CHALLENGE_INDEX * STAGES + STAGES - 1, 0x80000000],
  [POST_CLAMP_CHALLENGE * STAGES, 0x00c0ffee],
  [POST_CLAMP_CHALLENGE * STAGES + 1, 0xabcdef01],
  [Number.MAX_SAFE_INTEGER, 0x13579bdf],
  [POST_CLAMP_CHALLENGE * STAGES, 0x2468ace0],
].entries()) {
  addSchedule(`gba_schedule_${index}`, "full-schedule", { factoryWinStreak, rngValue });
}

// One representative for every TypeScript-owned reachable validation error
// class. Rust's i64 API cannot receive fractional/NaN values, but negative
// and over-safe-integer representatives prove the same source error classes.
addSelection("error_battle_index_negative", "error-battle-index", {
  factoryWinStreak: 0,
  battleIndex: -1,
  rngValue: 0,
});
addSelection("error_battle_index_after_last", "error-battle-index", {
  factoryWinStreak: 0,
  battleIndex: STAGES,
  rngValue: 0,
});
addSelection("error_rng_value_negative", "error-rng-value", {
  factoryWinStreak: 0,
  battleIndex: 0,
  rngValue: -1,
});
addSelection("error_rng_value_over_u32", "error-rng-value", {
  factoryWinStreak: 0,
  battleIndex: 0,
  rngValue: 0x1_0000_0000,
});
addSelection("error_history_short", "error-history", {
  factoryWinStreak: 0,
  battleIndex: 3,
  storedTrainerIds: [1, 2],
});
addSelection("error_factory_streak_negative", "error-factory-streak", {
  factoryWinStreak: -1,
  battleIndex: 0,
});
addSelection("error_factory_streak_over_safe", "error-factory-streak", {
  factoryWinStreak: Number.MAX_SAFE_INTEGER + 1,
  battleIndex: 0,
});
addSelection("error_port_rng_value_negative", "error-port-rng-value", {
  factoryWinStreak: 0,
  battleIndex: 0,
  scriptedDraws: [{ rngValue: -1, value: 0 }],
});
addSelection("error_port_rng_value_over_u32", "error-port-rng-value", {
  factoryWinStreak: 0,
  battleIndex: 0,
  scriptedDraws: [{ rngValue: 0x1_0000_0000, value: 0 }],
});
addSelection("error_port_value_negative", "error-port-value", {
  factoryWinStreak: 0,
  battleIndex: 0,
  scriptedDraws: [{ rngValue: 0, value: -1 }],
});
addSelection("error_port_value_over_u16", "error-port-value", {
  factoryWinStreak: 0,
  battleIndex: 0,
  scriptedDraws: [{ rngValue: 0, value: 0x1_0000 }],
});

const categoryCounts = new Map();
for (const testCase of cases) {
  categoryCounts.set(testCase.category, (categoryCounts.get(testCase.category) ?? 0) + 1);
}
const EXPECTED_CATEGORY_COUNTS = new Map([
  ["normal-range-boundary", 16],
  ["hard-range-boundary", 16],
  ["streak-boundary", 9],
  ["duplicate-retry", 3],
  ["history-write", 2],
  ["full-schedule", 12],
  ["error-battle-index", 2],
  ["error-rng-value", 2],
  ["error-history", 1],
  ["error-factory-streak", 2],
  ["error-port-rng-value", 2],
  ["error-port-value", 2],
]);
if (categoryCounts.size !== EXPECTED_CATEGORY_COUNTS.size) {
  throw new Error(`unexpected category census ${JSON.stringify([...categoryCounts])}`);
}
for (const [category, expected] of EXPECTED_CATEGORY_COUNTS) {
  if (categoryCounts.get(category) !== expected) {
    throw new Error(`category ${category} has ${categoryCounts.get(category)} cases, expected ${expected}`);
  }
}

function rustString(value) {
  return JSON.stringify(value);
}

function rustDraws(draws) {
  return `&[${draws.map((draw) => (
    `FactoryTrainerScheduleVectorDraw { rng_value: ${draw.rngValue}, value: ${draw.value} }`
  )).join(", ")}]`;
}

function rustI64Slice(values) {
  return `&[${values.join(", ")}]`;
}

function rustOperation(operation) {
  return operation === "selection"
    ? "FactoryTrainerScheduleVectorOperation::Selection"
    : "FactoryTrainerScheduleVectorOperation::Schedule";
}

function rustRngMode(rngMode) {
  return rngMode === "gba"
    ? "FactoryTrainerScheduleVectorRngMode::Gba"
    : "FactoryTrainerScheduleVectorRngMode::Scripted";
}

const categoryLines = [...EXPECTED_CATEGORY_COUNTS]
  .map(([category, count]) => `    (${rustString(category)}, ${count}),`)
  .join("\n");
const caseLines = cases.map((testCase) => `    FactoryTrainerScheduleVectorCase {
        label: ${rustString(testCase.label)},
        category: ${rustString(testCase.category)},
        operation: ${rustOperation(testCase.operation)},
        rng_mode: ${rustRngMode(testCase.rngMode)},
        factory_win_streak: ${testCase.factoryWinStreak},
        battle_index: ${testCase.battleIndex},
        stored_trainer_ids: ${rustI64Slice(testCase.storedTrainerIds)},
        rng_value: ${testCase.rngValue},
        scripted_draws: ${rustDraws(testCase.scriptedDraws)},
        expected_json: ${testCase.expectedJson === null ? "None" : `Some(${rustString(testCase.expectedJson)})`},
        expected_error: ${testCase.expectedError === null ? "None" : `Some(${rustString(testCase.expectedError)})`},
    },`).join("\n");

const rust = `// GENERATED by core-rs/tools/gen-factory-trainer-schedule-vectors.mjs.
// Expected values come only from executing src/engine/factoryTrainerSchedule.ts.
// Regenerate: node --experimental-strip-types core-rs/tools/gen-factory-trainer-schedule-vectors.mjs
// Do not hand-edit.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryTrainerScheduleVectorOperation {
    Selection,
    Schedule,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FactoryTrainerScheduleVectorRngMode {
    Gba,
    Scripted,
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryTrainerScheduleVectorDraw {
    pub rng_value: i64,
    pub value: i64,
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryTrainerScheduleVectorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub operation: FactoryTrainerScheduleVectorOperation,
    pub rng_mode: FactoryTrainerScheduleVectorRngMode,
    pub factory_win_streak: i64,
    pub battle_index: i64,
    pub stored_trainer_ids: &'static [i64],
    pub rng_value: i64,
    pub scripted_draws: &'static [FactoryTrainerScheduleVectorDraw],
    pub expected_json: Option<&'static str>,
    pub expected_error: Option<&'static str>,
}

pub const FACTORY_TRAINER_SCHEDULE_VECTOR_CATEGORY_COUNTS: [(&str, usize); ${EXPECTED_CATEGORY_COUNTS.size}] = [
${categoryLines}
];

pub const FACTORY_TRAINER_SCHEDULE_CASES: [FactoryTrainerScheduleVectorCase; ${cases.length}] = [
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
  throw new Error("gen-factory-trainer-schedule-vectors: could not find rustfmt");
}
const digest = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-factory-trainer-schedule-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-factory-trainer-schedule-vectors: ${cases.length} cases; ${[...EXPECTED_CATEGORY_COUNTS].map(([category, count]) => `${category}=${count}`).join(", ")}`);
console.log(`gen-factory-trainer-schedule-vectors: sha256 ${digest}`);
