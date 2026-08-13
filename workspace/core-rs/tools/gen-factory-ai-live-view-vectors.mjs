#!/usr/bin/env node
// Differential corpus for the two independent Factory AI live-view helpers.
// Expected projections come only from executing canonical
// src/engine/factoryAiLiveDriver.ts; no weather/stage expected value is
// hand-derived here.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-factory-ai-live-view-vectors.mjs

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
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
  "factory_ai_live_view_vectors_gen.rs",
);
const liveDriver = await import(
  path.join(workspaceRoot, "src", "engine", "factoryAiLiveDriver.ts"),
);

const STAGE_COUNT = 8;
const DEFAULT_STAGES = Object.freeze([0, 6, 6, 6, 6, 6, 6, 6]);

function assertStages(stages, label) {
  if (!Array.isArray(stages) || stages.length !== STAGE_COUNT
    || stages.some((value) => typeof value !== "number")) {
    throw new Error(`gen-factory-ai-live-view-vectors: ${label} must have ${STAGE_COUNT} numeric cells`);
  }
}

// These are intentionally just the property-read set of
// createFactoryAiViewFromLiveRules needed to reach its two private helpers.
// The generator extracts only those two outputs; it does not make the view
// constructor a native acceptance surface.
function battler(statStages) {
  assertStages(statStages, "battler.statStages");
  return Object.freeze({
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"]),
    attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 100,
    level: 50, statStages: Object.freeze([...statStages]), isFirstTurn: 0,
    hp: 100, maxHP: 100, ability: 0, status1: 0, status2: 0, status3: 0,
    protectUses: 0, tauntTimer: 0, species: 1, moves: Object.freeze([33, 0, 0, 0]),
  });
}

function rules(weather, attackerStages, targetStages) {
  return Object.freeze({
    battlers: Object.freeze([battler(targetStages), battler(attackerStages)]),
    weather,
    sideStatuses: Object.freeze([0, 0]),
    moveHistory: Object.freeze({ lastMoves: Object.freeze([0, 0, 0, 0]) }),
  });
}

const history = Object.freeze({
  usedMoves: Object.freeze([Object.freeze([]), Object.freeze([]), Object.freeze([]), Object.freeze([])]),
  knownAbilities: Object.freeze([null, null, null, null]),
  knownItemEffects: Object.freeze([0, 0, 0, 0]),
  partyIndexes: Object.freeze([0, 1, 2, 3]),
});
const challenge = Object.freeze({ factoryWinStreak: 0, trainerOpponentId: 0 });

const cases = [];
const labels = new Set();
function addCase({ label, category, weather, attackerStages = DEFAULT_STAGES, targetStages = DEFAULT_STAGES }) {
  if (!/^[a-z0-9_]+$/.test(label) || labels.has(label)) {
    throw new Error(`gen-factory-ai-live-view-vectors: invalid or duplicate label ${JSON.stringify(label)}`);
  }
  if (typeof category !== "string" || category.length === 0 || typeof weather !== "number") {
    throw new Error(`gen-factory-ai-live-view-vectors: invalid case ${label}`);
  }
  assertStages(attackerStages, `${label}.attackerStages`);
  assertStages(targetStages, `${label}.targetStages`);
  labels.add(label);
  const view = liveDriver.createFactoryAiViewFromLiveRules({
    rulesContext: rules(weather, attackerStages, targetStages), history, challenge,
  });
  cases.push({
    label, category, weather, attackerStages: [...attackerStages], targetStages: [...targetStages],
    // An absent currentWeather is canonical `undefined`; normalize only the
    // vector envelope to null so Rust can assert the optional representation.
    expectedJson: JSON.stringify({
      currentWeather: view.attacker.currentWeather ?? null,
      attackerStages: view.attacker.statStages,
      targetStages: view.target.statStages,
    }),
  });
}

// `B_WEATHER_*` masks and their family variants are from
// include/constants/battle.h:232-243, as copied by factoryAiLiveDriver.ts.
for (const [label, weather] of [
  ["no_weather", 0],
  ["rain_temporary", 1], ["rain_downpour", 2], ["rain_permanent", 4],
  ["sandstorm_temporary", 8], ["sandstorm_permanent", 16],
  ["sun_temporary", 32], ["sun_permanent", 64], ["hail_temporary", 128],
]) addCase({ label, category: "weather-bits", weather });

addCase({ label: "overlap_rain_precedes_sandstorm_and_hail", category: "weather-precedence", weather: 1 | 8 | 128 });
addCase({ label: "overlap_sun_precedes_everything", category: "weather-precedence", weather: 4 | 16 | 64 | 128 });
addCase({ label: "unrelated_weather_bit_is_none", category: "weather-bits", weather: 0x100 });

// The nominal rules-context constructor normalizes weather to u32, but the
// helper's reachable TS `number` field is not itself validated. These rows
// ratchet ECMAScript bitwise ToInt32 before the live driver's masks.
addCase({ label: "toint32_negative_all_bits_sun", category: "toint32", weather: -1 });
addCase({ label: "toint32_wrap_above_u32_rain", category: "toint32", weather: 4_294_967_296 + 4 });
addCase({ label: "toint32_negative_wrap_sandstorm", category: "toint32", weather: -4_294_967_296 + 8 });
addCase({ label: "toint32_signed_high_hail", category: "toint32", weather: 0x80000080 });
addCase({ label: "toint32_fraction_truncates_sun", category: "toint32", weather: 32.9 });
addCase({ label: "toint32_negative_fraction_none", category: "toint32", weather: -0.5 });
addCase({ label: "toint32_nan_none", category: "toint32", weather: Number.NaN });
addCase({ label: "toint32_positive_infinity_none", category: "toint32", weather: Infinity });
addCase({ label: "toint32_negative_infinity_none", category: "toint32", weather: -Infinity });
addCase({ label: "toint32_precise_large_hail", category: "toint32", weather: 9_007_199_254_741_120 });

addCase({
  label: "stages_distinct_slot_order", category: "stat-stages", weather: 0,
  attackerStages: [99, 11, 22, 33, 44, 55, 66, 77],
  targetStages: [-99, -11, -22, -33, -44, -55, -66, -77],
});
addCase({
  label: "stages_source_signed8_extrema", category: "stat-stages", weather: 128,
  attackerStages: [-128, -127, -64, -1, 0, 1, 63, 127],
  targetStages: [127, 63, 1, 0, -1, -64, -127, -128],
});
addCase({
  label: "stages_unvalidated_number_cells", category: "stat-stages", weather: 0,
  attackerStages: [10.5, -0.5, 1.25, -2.5, 3.75, -4.125, 5.5, -6.25],
  targetStages: [-10.5, 0.5, -1.25, 2.5, -3.75, 4.125, -5.5, 6.25],
});

const EXPECTED_CATEGORY_COUNTS = new Map([
  ["weather-bits", 10], ["weather-precedence", 2], ["toint32", 10], ["stat-stages", 3],
]);
const categoryCounts = new Map();
for (const vector of cases) categoryCounts.set(vector.category, (categoryCounts.get(vector.category) ?? 0) + 1);
for (const [category, count] of EXPECTED_CATEGORY_COUNTS) {
  if (categoryCounts.get(category) !== count) {
    throw new Error(`gen-factory-ai-live-view-vectors: ${category} census changed`);
  }
}

function rustString(value) { return JSON.stringify(value); }
function rustNumber(value) {
  if (Number.isNaN(value)) return "f64::NAN";
  if (value === Infinity) return "f64::INFINITY";
  if (value === -Infinity) return "f64::NEG_INFINITY";
  if (Object.is(value, -0)) return "-0.0";
  if (Number.isInteger(value)) return `${value}.0`;
  return String(value);
}
function rustBattler(stages) {
  return `FactoryAiLiveViewBattler { stat_stages: [${stages.map(rustNumber).join(", ")}] }`;
}
const categoryLines = [...EXPECTED_CATEGORY_COUNTS]
  .map(([category, count]) => `    (${rustString(category)}, ${count}),`).join("\n");
const caseLines = cases.map((vector) => `    FactoryAiLiveViewProjectionCase {
        label: ${rustString(vector.label)},
        category: ${rustString(vector.category)},
        weather: ${rustNumber(vector.weather)},
        attacker: ${rustBattler(vector.attackerStages)},
        target: ${rustBattler(vector.targetStages)},
        expected_json: ${rustString(vector.expectedJson)},
    },`).join("\n");

const rust = `// GENERATED by core-rs/tools/gen-factory-ai-live-view-vectors.mjs.
// Expected values come only from executing src/engine/factoryAiLiveDriver.ts.
// Regenerate: node --experimental-strip-types core-rs/tools/gen-factory-ai-live-view-vectors.mjs
// Deterministic fixed corpus; do not hand-edit.

use crate::factory_ai_live_view::FactoryAiLiveViewBattler;

#[derive(Debug, Clone, Copy)]
pub struct FactoryAiLiveViewProjectionCase {
    pub label: &'static str,
    pub category: &'static str,
    pub weather: f64,
    pub attacker: FactoryAiLiveViewBattler,
    pub target: FactoryAiLiveViewBattler,
    pub expected_json: &'static str,
}

pub const FACTORY_AI_LIVE_VIEW_VECTOR_CATEGORY_COUNTS: [(&str, usize); ${EXPECTED_CATEGORY_COUNTS.size}] = [
${categoryLines}
];

pub const FACTORY_AI_LIVE_VIEW_PROJECTION_CASES: [FactoryAiLiveViewProjectionCase; ${cases.length}] = [
${caseLines}
];
`;

fs.writeFileSync(outPath, rust, "utf8");
const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
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
if (!formatted) throw new Error("gen-factory-ai-live-view-vectors: could not find rustfmt");
const digest = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-factory-ai-live-view-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-factory-ai-live-view-vectors: ${cases.length} cases; ${[...EXPECTED_CATEGORY_COUNTS].map(([category, count]) => `${category}=${count}`).join(", ")}`);
console.log(`gen-factory-ai-live-view-vectors: sha256 ${digest}`);
