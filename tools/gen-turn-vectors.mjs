#!/usr/bin/env node
// Codegen for core-rs/crates/factory-core/src/turn_vectors_gen.rs.
//
// Computes every expected value by EXECUTING the real src/engine/turnOrder.ts,
// src/engine/turnRng.ts, and src/engine/rng.ts's GbaRng (read-only imports,
// node --experimental-strip-types - the gen-damage-vectors.mjs precedent).
// No value in the emitted file is hand-computed. Deterministic: the sweep
// is seeded from a fixed GbaRng seed, not Math.random/Date.now, so reruns
// are byte-identical.
//
// Usage: node core-rs/tools/gen-turn-vectors.mjs   (from any cwd)

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url)); // core-rs/tools
const workspaceRoot = path.resolve(scriptDir, "..", ".."); // two dirs up
const outPath = path.join(scriptDir, "..", "crates", "factory-core", "src", "turn_vectors_gen.rs");

const turnOrder = await import(path.join(workspaceRoot, "src", "engine", "turnOrder.ts"));
const turnRng = await import(path.join(workspaceRoot, "src", "engine", "turnRng.ts"));
const { GbaRng } = await import(path.join(workspaceRoot, "src", "engine", "rng.ts"));

const DEFAULT_STAT_STAGE = 6;

// --- ability/hold-effect ids: same source damage_calc.rs / turn_order.rs
// use (src/data/gen/ability-item-hooks.json .universes). ---
const abilityItemHooks = JSON.parse(
  fs.readFileSync(path.join(workspaceRoot, "src", "data", "gen", "ability-item-hooks.json"), "utf8"),
);
const abilityIdByName = new Map(abilityItemHooks.universes.abilities.map((a) => [a.name, a.id]));
const holdEffectIdByName = new Map(abilityItemHooks.universes.holdEffects.map((h) => [h.name, h.id]));
function abilityId(name) {
  if (name === null || name === undefined) return 0; // ABILITY_NONE
  if (!abilityIdByName.has(name)) throw new Error(`gen-turn-vectors: unknown ability ${name}`);
  return abilityIdByName.get(name);
}
function holdEffectId(name) {
  if (name === null || name === undefined) return 0; // HOLD_EFFECT_NONE
  if (!holdEffectIdByName.has(name)) throw new Error(`gen-turn-vectors: unknown hold effect ${name}`);
  return holdEffectIdByName.get(name);
}

function battler(overrides = {}) {
  return {
    speed: 50,
    speedStage: DEFAULT_STAT_STAGE,
    movePriority: 0,
    isParalyzed: false,
    ability: null,
    holdEffect: null,
    holdEffectParam: 0,
    ...overrides,
  };
}

const rows = { effectiveSpeed: [], strikesFirst: [], sort: [], turnRngLedger: [] };

// === a. effectiveSpeed ======================================================

function pushSpeedCase(b, weather, randomTurnNumber, label) {
  const expected = turnOrder.effectiveSpeed(b, weather, randomTurnNumber);
  rows.effectiveSpeed.push({ battler: b, weather, randomTurnNumber, expected, label });
}

pushSpeedCase(battler(), {}, 0xffff, "base_no_modifiers");
for (const stage of [0, 3, 6, 9, 12]) {
  pushSpeedCase(battler({ speed: 100, speedStage: stage }), {}, 0xffff, `stat_stage_${stage}`);
}
pushSpeedCase(battler({ ability: "ABILITY_SWIFT_SWIM" }), { isRaining: true }, 0xffff, "swift_swim_in_rain");
pushSpeedCase(battler({ ability: "ABILITY_SWIFT_SWIM" }), { isRaining: false }, 0xffff, "swift_swim_no_rain");
pushSpeedCase(battler({ ability: "ABILITY_SWIFT_SWIM" }), { isSunny: true }, 0xffff, "swift_swim_wrong_weather_sun");
pushSpeedCase(battler({ ability: "ABILITY_CHLOROPHYLL" }), { isSunny: true }, 0xffff, "chlorophyll_in_sun");
pushSpeedCase(battler({ ability: "ABILITY_CHLOROPHYLL" }), { isSunny: false }, 0xffff, "chlorophyll_no_sun");
pushSpeedCase(
  battler({ ability: "ABILITY_CHLOROPHYLL" }),
  { isRaining: true },
  0xffff,
  "chlorophyll_wrong_weather_rain",
);
pushSpeedCase(battler({ holdEffect: "HOLD_EFFECT_MACHO_BRACE" }), {}, 0xffff, "macho_brace");
pushSpeedCase(battler({ isParalyzed: true }), {}, 0xffff, "paralysis");
pushSpeedCase(
  battler({ holdEffect: "HOLD_EFFECT_MACHO_BRACE", isParalyzed: true }),
  {},
  0xffff,
  "macho_brace_and_paralysis_stack",
);
pushSpeedCase(
  battler({ ability: "ABILITY_SWIFT_SWIM", holdEffect: "HOLD_EFFECT_MACHO_BRACE", isParalyzed: true }),
  { isRaining: true },
  0xffff,
  "swift_swim_macho_brace_paralysis_stack",
);
// Quick Claw threshold: param 20 -> trunc(0xffff*20/100) = 13107.
for (const [param, roll, label] of [
  [20, 13106, "quick_claw_param20_just_below_threshold_procs"],
  [20, 13107, "quick_claw_param20_at_threshold_no_proc"],
  [20, 0, "quick_claw_param20_roll_zero_procs"],
  [0, 0, "quick_claw_param0_never_procs"],
  [100, 65534, "quick_claw_param100_high_threshold_procs"],
  [100, 65535, "quick_claw_param100_boundary_no_proc"],
]) {
  pushSpeedCase(
    battler({ speed: 10, holdEffect: "HOLD_EFFECT_QUICK_CLAW", holdEffectParam: param }),
    {},
    roll,
    label,
  );
}

// Seeded structural sweep.
{
  const rng = new GbaRng(0xabcd_1234);
  const pick = (n) => rng.next() % n;
  const ABILITIES = [null, "ABILITY_SWIFT_SWIM", "ABILITY_CHLOROPHYLL", "ABILITY_GUTS"];
  const HOLD_EFFECTS = [null, "HOLD_EFFECT_MACHO_BRACE", "HOLD_EFFECT_QUICK_CLAW", "HOLD_EFFECT_CHOICE_BAND"];
  for (let i = 0; i < 60; i++) {
    const b = battler({
      speed: 1 + pick(999),
      speedStage: pick(13),
      isParalyzed: pick(2) === 0,
      ability: ABILITIES[pick(ABILITIES.length)],
      holdEffect: HOLD_EFFECTS[pick(HOLD_EFFECTS.length)],
      holdEffectParam: pick(101),
    });
    const weather = { isRaining: pick(2) === 0, isSunny: pick(2) === 0 };
    const randomTurnNumber = pick(0x10000);
    pushSpeedCase(b, weather, randomTurnNumber, `sweep_${i}`);
  }
}

// === b. getWhoStrikesFirst ==================================================

function pushStrikesCase(b1, b2, speedTieRngRoll, weather, randomTurnNumber, label) {
  const expected = turnOrder.getWhoStrikesFirst(b1, b2, speedTieRngRoll, weather, randomTurnNumber);
  rows.strikesFirst.push({ battler1: b1, battler2: b2, speedTieRngRoll, weather, randomTurnNumber, expected, label });
}

// Priority asymmetry, both directions.
pushStrikesCase(battler({ movePriority: 1 }), battler({ movePriority: 0 }), 0, {}, 0xffff, "priority_b1_higher");
pushStrikesCase(battler({ movePriority: 0 }), battler({ movePriority: 1 }), 0, {}, 0xffff, "priority_b2_higher");
pushStrikesCase(battler({ movePriority: -1 }), battler({ movePriority: 0 }), 0, {}, 0xffff, "priority_b1_negative");
pushStrikesCase(battler({ movePriority: 2 }), battler({ movePriority: -3 }), 0, {}, 0xffff, "priority_wide_gap");
// Priority beats a losing speed margin.
pushStrikesCase(
  battler({ speed: 200, movePriority: 0 }),
  battler({ speed: 50, movePriority: 1 }),
  0,
  {},
  0xffff,
  "priority_overrides_speed",
);
// Equal-nonzero priority: falls to plain speed comparison.
pushStrikesCase(
  battler({ speed: 60, movePriority: 2 }),
  battler({ speed: 90, movePriority: 2 }),
  0,
  {},
  0xffff,
  "equal_nonzero_priority_speed_decides",
);
// Speed tie, both roll parities.
pushStrikesCase(battler({ speed: 100 }), battler({ speed: 100 }), 0, {}, 0xffff, "speed_tie_even_roll");
pushStrikesCase(battler({ speed: 100 }), battler({ speed: 100 }), 1, {}, 0xffff, "speed_tie_odd_roll");
pushStrikesCase(battler({ speed: 100 }), battler({ speed: 100 }), 0b10, {}, 0xffff, "speed_tie_even_roll_high_bit");
pushStrikesCase(battler({ speed: 100 }), battler({ speed: 100 }), 0xffff, {}, 0xffff, "speed_tie_odd_roll_max");
// Plain non-tie speed comparison.
pushStrikesCase(battler({ speed: 76 }), battler({ speed: 90 }), 0, {}, 0xffff, "onix_grovyle_turn1");
pushStrikesCase(battler({ speed: 89 }), battler({ speed: 97 }), 0, {}, 0xffff, "magby_murkrow_turn17");
// Swift Swim / Chlorophyll x weather flipping the comparison outcome.
pushStrikesCase(
  battler({ speed: 40, ability: "ABILITY_SWIFT_SWIM" }),
  battler({ speed: 70 }),
  0,
  { isRaining: true },
  0xffff,
  "swift_swim_flips_outcome_in_rain",
);
pushStrikesCase(
  battler({ speed: 40, ability: "ABILITY_SWIFT_SWIM" }),
  battler({ speed: 70 }),
  0,
  {},
  0xffff,
  "swift_swim_no_flip_without_rain",
);
pushStrikesCase(
  battler({ speed: 40, ability: "ABILITY_CHLOROPHYLL" }),
  battler({ speed: 70 }),
  0,
  { isSunny: true },
  0xffff,
  "chlorophyll_flips_outcome_in_sun",
);
// Macho Brace / paralysis flipping the comparison outcome.
pushStrikesCase(
  battler({ speed: 90, holdEffect: "HOLD_EFFECT_MACHO_BRACE" }),
  battler({ speed: 50 }),
  0,
  {},
  0xffff,
  "macho_brace_flips_outcome",
);
pushStrikesCase(
  battler({ speed: 90, isParalyzed: true }),
  battler({ speed: 30 }),
  0,
  {},
  0xffff,
  "paralysis_flips_outcome",
);
// Quick Claw threshold, both sides (mirrors tests/turnOrder.test.ts exactly).
pushStrikesCase(
  battler({ speed: 45, holdEffect: "HOLD_EFFECT_QUICK_CLAW", holdEffectParam: 20 }),
  battler({ speed: 95 }),
  0,
  {},
  13106,
  "quick_claw_procs_at_13106",
);
pushStrikesCase(
  battler({ speed: 45, holdEffect: "HOLD_EFFECT_QUICK_CLAW", holdEffectParam: 20 }),
  battler({ speed: 95 }),
  0,
  {},
  13107,
  "quick_claw_no_proc_at_13107",
);
pushStrikesCase(
  battler({ speed: 45, holdEffect: "HOLD_EFFECT_QUICK_CLAW", holdEffectParam: 20 }),
  battler({ speed: 95, movePriority: 1 }),
  0,
  {},
  0,
  "quick_claw_below_priority",
);
pushStrikesCase(
  battler({ speed: 45, holdEffect: "HOLD_EFFECT_QUICK_CLAW", holdEffectParam: 20 }),
  battler({ speed: 95, holdEffect: "HOLD_EFFECT_QUICK_CLAW", holdEffectParam: 20 }),
  0,
  {},
  0,
  "both_quick_claw_proc_tie_even",
);
pushStrikesCase(
  battler({ speed: 45, holdEffect: "HOLD_EFFECT_QUICK_CLAW", holdEffectParam: 20 }),
  battler({ speed: 95, holdEffect: "HOLD_EFFECT_QUICK_CLAW", holdEffectParam: 20 }),
  1,
  {},
  0,
  "both_quick_claw_proc_tie_odd",
);

// Seeded structural sweep over battler pairs.
{
  const rng = new GbaRng(0x9876_5432);
  const pick = (n) => rng.next() % n;
  const ABILITIES = [null, "ABILITY_SWIFT_SWIM", "ABILITY_CHLOROPHYLL"];
  const HOLD_EFFECTS = [null, "HOLD_EFFECT_MACHO_BRACE", "HOLD_EFFECT_QUICK_CLAW"];
  const PRIORITIES = [-3, -1, 0, 0, 0, 1, 2];
  function sweepBattler() {
    return battler({
      speed: 1 + pick(400),
      speedStage: pick(13),
      movePriority: PRIORITIES[pick(PRIORITIES.length)],
      isParalyzed: pick(3) === 0,
      ability: ABILITIES[pick(ABILITIES.length)],
      holdEffect: HOLD_EFFECTS[pick(HOLD_EFFECTS.length)],
      holdEffectParam: pick(101),
    });
  }
  for (let i = 0; i < 80; i++) {
    const b1 = sweepBattler();
    const b2 = sweepBattler();
    const weather = { isRaining: pick(2) === 0, isSunny: pick(2) === 0 };
    const speedTieRngRoll = pick(0x10000);
    const randomTurnNumber = pick(0x10000);
    pushStrikesCase(b1, b2, speedTieRngRoll, weather, randomTurnNumber, `sweep_${i}`);
  }
}

// === c. sortBattlersByTurnOrder =============================================

function pushSortCase(battlerIds, battlerList, speedTieRngRolls, weather, randomTurnNumber, label) {
  const battlers = new Map(battlerList.map((b, i) => [battlerIds[i], b]));
  const expected = turnOrder.sortBattlersByTurnOrder(
    battlerIds,
    battlers,
    speedTieRngRolls,
    weather,
    randomTurnNumber,
  );
  rows.sort.push({ battlerIds, battlerList, speedTieRngRolls, weather, randomTurnNumber, expected, label });
}

// 2 battlers, no tie (battle 1 turn 1 real pair).
pushSortCase([0, 1], [battler({ speed: 76 }), battler({ speed: 90 })], [], {}, 0xffff, "two_battlers_no_tie");
// 2 battlers, tie.
pushSortCase([0, 1], [battler({ speed: 100 }), battler({ speed: 100 })], [1], {}, 0xffff, "two_battlers_tie_odd");
pushSortCase([0, 1], [battler({ speed: 100 }), battler({ speed: 100 })], [0], {}, 0xffff, "two_battlers_tie_even");
// 3 battlers, one tie among them.
pushSortCase(
  [0, 1, 2],
  [battler({ speed: 100 }), battler({ speed: 100 }), battler({ speed: 150 })],
  [1],
  {},
  0xffff,
  "three_battlers_one_tie_roll_consumed",
);
pushSortCase(
  [0, 1, 2],
  [battler({ speed: 100 }), battler({ speed: 100 }), battler({ speed: 150 })],
  [0],
  {},
  0xffff,
  "three_battlers_one_tie_roll_even",
);
// 3 battlers, priority overrides speed entirely.
pushSortCase(
  [0, 1, 2],
  [battler({ speed: 10, movePriority: 1 }), battler({ speed: 999 }), battler({ speed: 500 })],
  [],
  {},
  0xffff,
  "three_battlers_priority_wins_despite_lowest_speed",
);
// 4 battlers, all tied: multi-tie roll consumption order (6 comparisons).
pushSortCase(
  [0, 1, 2, 3],
  [battler({ speed: 100 }), battler({ speed: 100 }), battler({ speed: 100 }), battler({ speed: 100 })],
  [0, 0, 0, 0, 0, 0],
  {},
  0xffff,
  "four_battlers_all_tied_no_swaps",
);
pushSortCase(
  [0, 1, 2, 3],
  [battler({ speed: 100 }), battler({ speed: 100 }), battler({ speed: 100 }), battler({ speed: 100 })],
  [1, 1, 1, 1, 1, 1],
  {},
  0xffff,
  "four_battlers_all_tied_all_odd",
);
pushSortCase(
  [0, 1, 2, 3],
  [battler({ speed: 100 }), battler({ speed: 100 }), battler({ speed: 100 }), battler({ speed: 100 })],
  [1, 0, 1, 0, 1, 0],
  {},
  0xffff,
  "four_battlers_all_tied_alternating_rolls",
);
// 4 battlers, mixed speeds with a partial tie among a subset.
pushSortCase(
  [0, 1, 2, 3],
  [battler({ speed: 50 }), battler({ speed: 120 }), battler({ speed: 50 }), battler({ speed: 90 })],
  [1],
  {},
  0xffff,
  "four_battlers_partial_tie_between_ids_0_and_2",
);
// 4 battlers, weather-flipped speeds among a Swift Swim holder.
pushSortCase(
  [0, 1, 2, 3],
  [
    battler({ speed: 30, ability: "ABILITY_SWIFT_SWIM" }),
    battler({ speed: 55 }),
    battler({ speed: 40 }),
    battler({ speed: 20 }),
  ],
  [],
  { isRaining: true },
  0xffff,
  "four_battlers_swift_swim_in_rain_reorders",
);

// === d. runTurn1RngLedger ====================================================

function pushLedgerCase(seed, label) {
  const results = turnRng.runTurn1RngLedger(seed);
  rows.turnRngLedger.push({ seed, results, label });
}

// The RAM-anchored seed from src/data/gen/battle1-turn1-ram-dump.json
// (rngLedger[0].fromValue), same seed tests/turnRng.test.ts (read-only) pins.
pushLedgerCase(3_485_459_011, "ram_anchored_battle1_turn1_seed");
pushLedgerCase(0, "zero_seed");
pushLedgerCase(0xffffffff, "max_seed");
pushLedgerCase(0xd2ddeec8, "rng_ts_anchor_seed");
{
  const rng = new GbaRng(0x1357_9bdf);
  for (let i = 0; i < 5; i++) {
    pushLedgerCase(rng.next() * 0x10000 + rng.next(), `sweep_seed_${i}`);
  }
}

// === emit Rust source ========================================================

function b(v) {
  return v ? "true" : "false";
}
function battlerLiteral(spec) {
  return (
    `TurnOrderBattlerRow { speed: ${spec.speed >>> 0}, speed_stage: ${spec.speedStage}, ` +
    `move_priority: ${spec.movePriority}, is_paralyzed: ${b(spec.isParalyzed)}, ` +
    `ability: ${abilityId(spec.ability)}, hold_effect: ${holdEffectId(spec.holdEffect)}, ` +
    `hold_effect_param: ${spec.holdEffectParam ?? 0} }`
  );
}
function weatherLiteral(w) {
  return `WeatherStateRow { is_raining: ${b(w.isRaining)}, is_sunny: ${b(w.isSunny)} }`;
}

const lines = [];
lines.push("// GENERATED by core-rs/tools/gen-turn-vectors.mjs — regenerate: node core-rs/tools/gen-turn-vectors.mjs.");
lines.push("// Source: executing src/engine/turnOrder.ts and src/engine/turnRng.ts (the TS");
lines.push("// engine is the spec) via node --experimental-strip-types, plus");
lines.push("// src/data/gen/ability-item-hooks.json for id tables. Do not hand-edit.");
lines.push("");

lines.push("/// One `TurnOrderBattler` field row (mirrors the Rust struct exactly).");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct TurnOrderBattlerRow {");
lines.push("    pub speed: u32,");
lines.push("    pub speed_stage: u8,");
lines.push("    pub move_priority: i32,");
lines.push("    pub is_paralyzed: bool,");
lines.push("    pub ability: u16,");
lines.push("    pub hold_effect: u16,");
lines.push("    pub hold_effect_param: u32,");
lines.push("}");
lines.push("");
lines.push("/// One `WeatherState` row.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct WeatherStateRow {");
lines.push("    pub is_raining: bool,");
lines.push("    pub is_sunny: bool,");
lines.push("}");
lines.push("");

lines.push("/// One `effective_speed` case.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct EffectiveSpeedCase {");
lines.push("    pub battler: TurnOrderBattlerRow,");
lines.push("    pub weather: WeatherStateRow,");
lines.push("    pub random_turn_number: u16,");
lines.push("    pub expected: u32,");
lines.push("}");
lines.push(`pub static EFFECTIVE_SPEED_CASES: [EffectiveSpeedCase; ${rows.effectiveSpeed.length}] = [`);
for (const r of rows.effectiveSpeed) {
  lines.push(
    `    // ${r.label}\n    EffectiveSpeedCase { battler: ${battlerLiteral(r.battler)}, weather: ${weatherLiteral(r.weather)}, random_turn_number: ${r.randomTurnNumber}, expected: ${r.expected >>> 0} },`,
  );
}
lines.push("];");
lines.push("");

lines.push("/// One `get_who_strikes_first` case.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct StrikesFirstCase {");
lines.push("    pub battler1: TurnOrderBattlerRow,");
lines.push("    pub battler2: TurnOrderBattlerRow,");
lines.push("    pub speed_tie_rng_roll: u16,");
lines.push("    pub weather: WeatherStateRow,");
lines.push("    pub random_turn_number: u16,");
lines.push("    pub expected: u8,");
lines.push("}");
lines.push(`pub static STRIKES_FIRST_CASES: [StrikesFirstCase; ${rows.strikesFirst.length}] = [`);
for (const r of rows.strikesFirst) {
  lines.push(
    `    // ${r.label}\n    StrikesFirstCase { battler1: ${battlerLiteral(r.battler1)}, battler2: ${battlerLiteral(r.battler2)}, speed_tie_rng_roll: ${r.speedTieRngRoll}, weather: ${weatherLiteral(r.weather)}, random_turn_number: ${r.randomTurnNumber}, expected: ${r.expected} },`,
  );
}
lines.push("];");
lines.push("");

lines.push("/// One `sort_battlers_by_turn_order` case. `battler_ids`/`battlers`/`expected`");
lines.push("/// are fixed-capacity 4-wide arrays paired with `count` (this crate has zero");
lines.push("/// dependencies, so no heap `Vec` literal in generated code).");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct SortCase {");
lines.push("    pub battler_ids: [u32; 4],");
lines.push("    pub battlers: [TurnOrderBattlerRow; 4],");
lines.push("    pub count: usize,");
lines.push("    pub speed_tie_rng_rolls: [u16; 6],");
lines.push("    pub roll_count: usize,");
lines.push("    pub weather: WeatherStateRow,");
lines.push("    pub random_turn_number: u16,");
lines.push("    pub expected: [u32; 4],");
lines.push("}");
lines.push(`pub static SORT_CASES: [SortCase; ${rows.sort.length}] = [`);
for (const r of rows.sort) {
  const n = r.battlerIds.length;
  const ids = [...r.battlerIds, ...Array(4 - n).fill(0)];
  const bs = [...r.battlerList, ...Array(4 - n).fill(battler())].map(battlerLiteral);
  const rollN = r.speedTieRngRolls.length;
  const rolls = [...r.speedTieRngRolls, ...Array(6 - rollN).fill(0)];
  const exp = [...r.expected, ...Array(4 - n).fill(0)];
  lines.push(
    `    // ${r.label}\n    SortCase {\n` +
      `        battler_ids: [${ids.join(", ")}],\n` +
      `        battlers: [${bs.join(", ")}],\n` +
      `        count: ${n},\n` +
      `        speed_tie_rng_rolls: [${rolls.join(", ")}],\n` +
      `        roll_count: ${rollN},\n` +
      `        weather: ${weatherLiteral(r.weather)}, random_turn_number: ${r.randomTurnNumber},\n` +
      `        expected: [${exp.join(", ")}],\n    },`,
  );
}
lines.push("];");
lines.push("");

lines.push("/// One `run_turn1_rng_ledger` case: the seed plus each of the 7 steps'");
lines.push("/// before/after `gRngValue`.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct TurnRngLedgerCase {");
lines.push("    pub seed: u32,");
lines.push("    pub rng_value_before: [u32; 7],");
lines.push("    pub rng_value_after: [u32; 7],");
lines.push("}");
lines.push(`pub static TURN_RNG_LEDGER_CASES: [TurnRngLedgerCase; ${rows.turnRngLedger.length}] = [`);
for (const r of rows.turnRngLedger) {
  const before = r.results.map((s) => s.rngValueBefore >>> 0);
  const after = r.results.map((s) => s.rngValueAfter >>> 0);
  lines.push(
    `    // ${r.label}\n    TurnRngLedgerCase { seed: ${r.seed >>> 0}, rng_value_before: [${before.join(", ")}], rng_value_after: [${after.join(", ")}] },`,
  );
}
lines.push("];");
lines.push("");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n"), "utf8");

const rustupBin = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
const rustfmtCandidates = [path.join(rustupBin, "rustfmt"), "rustfmt"];
let formatted = false;
for (const rustfmt of rustfmtCandidates) {
  try {
    execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });
    formatted = true;
    break;
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}
if (!formatted) {
  throw new Error("gen-turn-vectors: could not find rustfmt (looked in the rustup stable toolchain and PATH)");
}

const total = rows.effectiveSpeed.length + rows.strikesFirst.length + rows.sort.length + rows.turnRngLedger.length;
console.log(`gen-turn-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(
  `gen-turn-vectors: ${rows.effectiveSpeed.length} effective-speed, ${rows.strikesFirst.length} strikes-first, ` +
    `${rows.sort.length} sort, ${rows.turnRngLedger.length} turn-rng-ledger = ${total} total rows`,
);
