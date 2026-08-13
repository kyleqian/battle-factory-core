#!/usr/bin/env node
// Full-result differential corpus for createFactoryAiViewFromLiveRules.
// Expected views and errors come only from executing canonical
// src/engine/factoryAiLiveDriver.ts. The native test constructs its inputs
// from this checked-in corpus; do not hand-fit expected values here.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-factory-ai-live-view-constructor-vectors.mjs

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
  "factory_ai_live_view_constructor_vectors_gen.rs",
);
const liveDriver = await import(
  path.join(workspaceRoot, "src", "engine", "factoryAiLiveDriver.ts"),
);

const BATTLE_SLOTS = 4;
const MOVE_SLOTS = 4;
const STAT_STAGES = 8;

// These are cited exactly where the canonical TypeScript driver defines or
// imports them: src/engine/factoryAiLiveDriver.ts:59-68 and
// src/engine/battleScriptSourceConstants.ts. The latter cites
// reference/pokeemerald/include/constants/battle.h.
const SIDE_STATUS_REFLECT = 1 << 0;
const SIDE_STATUS_LIGHTSCREEN = 1 << 1;
const SIDE_STATUS_SPIKES = 1 << 4;
const SIDE_STATUS_SAFEGUARD = 1 << 5;
const SIDE_STATUS_FUTUREATTACK = 1 << 6;
const STATUS1_SLEEP = 0x0000_0007;
const STATUS1_TOXIC_POISON = 1 << 7;
const STATUS1_REFRESH_CURE_MASK = (1 << 3) | (1 << 4) | (1 << 6) | (1 << 7);
const STATUS2_CONFUSION = 0x0000_0007;
const STATUS2_INFATUATION = 0x000f_0000;
const STATUS2_FOCUS_ENERGY = 1 << 20;
const STATUS2_SUBSTITUTE = 1 << 24;
const STATUS2_ESCAPE_PREVENTION = 1 << 26;
const STATUS2_NIGHTMARE = 1 << 27;
const STATUS2_CURSED = 1 << 28;
const STATUS2_FORESIGHT = 1 << 29;
const STATUS2_TORMENT = 0x8000_0000;
const STATUS3_LEECHSEED = 1 << 2;
const STATUS3_PERISH_SONG = 1 << 5;
const STATUS3_ROOTED = 1 << 10;
const STATUS3_YAWN = (1 << 11) | (1 << 12);

const DEFAULT_STAGES = Object.freeze([0, 6, 6, 6, 6, 6, 6, 6]);

function battler(overrides = {}) {
  const base = {
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    attack: 100,
    defense: 100,
    spAttack: 100,
    spDefense: 100,
    speed: 100,
    level: 50,
    statStages: [...DEFAULT_STAGES],
    isFirstTurn: 0,
    hp: 100,
    maxHP: 100,
    ability: 0,
    status1: 0,
    status2: 0,
    status3: 0,
    protectUses: 0,
    tauntTimer: 0,
    species: 1,
    moves: [33, 0, 0, 0],
  };
  const result = { ...base, ...overrides };
  result.types = [...result.types];
  result.statStages = [...result.statStages];
  result.moves = [...result.moves];
  return result;
}

function history(overrides = {}) {
  const base = {
    usedMoves: [[], [], [], []],
    knownAbilities: [null, null, null, null],
    knownItemEffects: [0, 0, 0, 0],
    partyIndexes: [0, 1, 2, 3],
  };
  const result = { ...base, ...overrides };
  result.usedMoves = result.usedMoves.map((row) => [...row]);
  result.knownAbilities = [...result.knownAbilities];
  result.knownItemEffects = [...result.knownItemEffects];
  result.partyIndexes = [...result.partyIndexes];
  return result;
}

function assertNumber(value, label) {
  if (typeof value !== "number") {
    throw new Error(`gen-factory-ai-live-view-constructor-vectors: ${label} must be a number`);
  }
}

function assertNumberArray(values, count, label) {
  if (!Array.isArray(values) || values.length !== count) {
    throw new Error(`gen-factory-ai-live-view-constructor-vectors: ${label} must have ${count} cells`);
  }
  values.forEach((value, index) => assertNumber(value, `${label}[${index}]`));
}

function assertBattler(value, label) {
  if (value === null || typeof value !== "object") {
    throw new Error(`gen-factory-ai-live-view-constructor-vectors: ${label} must be an object`);
  }
  if (!Array.isArray(value.types) || value.types.length !== 2
    || value.types.some((type) => typeof type !== "string")) {
    throw new Error(`gen-factory-ai-live-view-constructor-vectors: ${label}.types must be two strings`);
  }
  assertNumberArray(value.moves, MOVE_SLOTS, `${label}.moves`);
  assertNumberArray(value.statStages, STAT_STAGES, `${label}.statStages`);
  for (const name of [
    "attack", "defense", "spAttack", "spDefense", "speed", "level", "isFirstTurn", "hp", "maxHP",
    "ability", "status1", "status2", "status3", "protectUses", "tauntTimer", "species",
  ]) {
    assertNumber(value[name], `${label}.${name}`);
  }
}

function assertHistory(value, label) {
  if (value === null || typeof value !== "object") {
    throw new Error(`gen-factory-ai-live-view-constructor-vectors: ${label} must be an object`);
  }
  if (!Array.isArray(value.usedMoves) || value.usedMoves.length !== BATTLE_SLOTS) {
    throw new Error(`gen-factory-ai-live-view-constructor-vectors: ${label}.usedMoves must have four rows`);
  }
  value.usedMoves.forEach((row, index) => {
    if (!Array.isArray(row)) {
      throw new Error(`gen-factory-ai-live-view-constructor-vectors: ${label}.usedMoves[${index}] must be an array`);
    }
    row.forEach((move, moveIndex) => assertNumber(move, `${label}.usedMoves[${index}][${moveIndex}]`));
  });
  if (!Array.isArray(value.knownAbilities) || value.knownAbilities.length !== BATTLE_SLOTS
    || value.knownAbilities.some((ability) => ability !== null && typeof ability !== "string")) {
    throw new Error(`gen-factory-ai-live-view-constructor-vectors: ${label}.knownAbilities must be four string/null cells`);
  }
  assertNumberArray(value.knownItemEffects, BATTLE_SLOTS, `${label}.knownItemEffects`);
  assertNumberArray(value.partyIndexes, BATTLE_SLOTS, `${label}.partyIndexes`);
}

function asTsBattler(value) {
  // This is intentionally the complete property-read set of the canonical
  // constructor, not a wider BattleScriptRulesContext fixture.
  return {
    types: Object.freeze([...value.types]),
    attack: value.attack,
    defense: value.defense,
    spAttack: value.spAttack,
    spDefense: value.spDefense,
    speed: value.speed,
    level: value.level,
    statStages: Object.freeze([...value.statStages]),
    isFirstTurn: value.isFirstTurn,
    hp: value.hp,
    maxHP: value.maxHP,
    ability: value.ability,
    status1: value.status1,
    status2: value.status2,
    status3: value.status3,
    protectUses: value.protectUses,
    tauntTimer: value.tauntTimer,
    species: value.species,
    moves: Object.freeze([...value.moves]),
  };
}

function asTsHistory(value) {
  return Object.freeze({
    usedMoves: Object.freeze(value.usedMoves.map((row) => Object.freeze([...row]))),
    knownAbilities: Object.freeze([...value.knownAbilities]),
    knownItemEffects: Object.freeze([...value.knownItemEffects]),
    partyIndexes: Object.freeze([...value.partyIndexes]),
  });
}

function expectedFromCanonical(vector) {
  const challenge = {
    factoryWinStreak: vector.factoryWinStreak,
    trainerOpponentId: vector.trainerOpponentId,
  };
  if (vector.battleTurnCountPresent) challenge.battleTurnCount = vector.battleTurnCount;
  try {
    const view = liveDriver.createFactoryAiViewFromLiveRules({
      rulesContext: Object.freeze({
        battlers: Object.freeze(vector.battlers.map(asTsBattler)),
        weather: vector.weather,
        sideStatuses: Object.freeze([...vector.sideStatuses]),
        moveHistory: Object.freeze({ lastMoves: Object.freeze([...vector.lastMoves]) }),
      }),
      history: asTsHistory(vector.history),
      challenge: Object.freeze(challenge),
    });
    return { expectedJson: JSON.stringify(view), expectedError: null };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { expectedJson: null, expectedError: error.message };
  }
}

const cases = [];
const labels = new Set();
function addCase({
  label,
  category,
  weather = 0,
  sideStatuses = [0, 0],
  lastMoves = [0, 0, 0, 0],
  battlers = [battler(), battler(), battler(), battler()],
  history: historyValue = history(),
  factoryWinStreak = 0,
  trainerOpponentId = 0,
  battleTurnCountPresent = false,
  battleTurnCount = 0,
}) {
  if (!/^[a-z0-9_]+$/.test(label) || labels.has(label)) {
    throw new Error(`gen-factory-ai-live-view-constructor-vectors: invalid or duplicate label ${JSON.stringify(label)}`);
  }
  if (typeof category !== "string" || category.length === 0) {
    throw new Error(`gen-factory-ai-live-view-constructor-vectors: ${label} needs a category`);
  }
  assertNumber(weather, `${label}.weather`);
  assertNumberArray(sideStatuses, 2, `${label}.sideStatuses`);
  assertNumberArray(lastMoves, BATTLE_SLOTS, `${label}.lastMoves`);
  if (!Array.isArray(battlers) || battlers.length !== BATTLE_SLOTS) {
    throw new Error(`gen-factory-ai-live-view-constructor-vectors: ${label}.battlers must have four cells`);
  }
  battlers.forEach((value, index) => assertBattler(value, `${label}.battlers[${index}]`));
  assertHistory(historyValue, `${label}.history`);
  assertNumber(factoryWinStreak, `${label}.factoryWinStreak`);
  assertNumber(trainerOpponentId, `${label}.trainerOpponentId`);
  if (typeof battleTurnCountPresent !== "boolean") {
    throw new Error(`gen-factory-ai-live-view-constructor-vectors: ${label}.battleTurnCountPresent must be boolean`);
  }
  assertNumber(battleTurnCount, `${label}.battleTurnCount`);
  labels.add(label);
  const vector = {
    label,
    category,
    weather,
    sideStatuses: [...sideStatuses],
    lastMoves: [...lastMoves],
    battlers: battlers.map((value) => battler(value)),
    history: history(historyValue),
    factoryWinStreak,
    trainerOpponentId,
    battleTurnCountPresent,
    battleTurnCount,
  };
  Object.assign(vector, expectedFromCanonical(vector));
  cases.push(vector);
}

addCase({ label: "baseline_absent_flags", category: "baseline" });

addCase({
  label: "attacker_every_optional_flag",
  category: "attacker-fields",
  weather: 0x60,
  sideStatuses: [0, SIDE_STATUS_REFLECT | SIDE_STATUS_LIGHTSCREEN | SIDE_STATUS_SAFEGUARD | SIDE_STATUS_FUTUREATTACK],
  battlers: [
    battler(),
    battler({
      types: ["TYPE_FIRE", "TYPE_FLYING"], attack: 211, defense: 123, spAttack: 199, spDefense: 171,
      speed: 177, level: 57, statStages: [91, 11, 22, 33, 44, 55, 66, 77], isFirstTurn: 2,
      hp: 87, maxHP: 201, ability: 70, moves: [53, 126, 257, 0],
      status1: STATUS1_SLEEP | STATUS1_REFRESH_CURE_MASK,
      status2: STATUS2_INFATUATION | STATUS2_SUBSTITUTE | STATUS2_FOCUS_ENERGY,
      status3: STATUS3_LEECHSEED | STATUS3_ROOTED | STATUS3_YAWN,
      protectUses: 3,
    }),
    battler({ types: ["TYPE_UNUSED_2", "TYPE_UNUSED_2"], ability: 77 }),
    battler({ types: ["TYPE_UNUSED_3", "TYPE_UNUSED_3"], ability: 77 }),
  ],
  factoryWinStreak: 6,
  trainerOpponentId: 222,
  battleTurnCountPresent: true,
  battleTurnCount: 9,
});

addCase({
  label: "target_every_optional_flag",
  category: "target-fields",
  sideStatuses: [SIDE_STATUS_SPIKES | SIDE_STATUS_SAFEGUARD | SIDE_STATUS_FUTUREATTACK, 0],
  lastMoves: [89, 999, 998, 997],
  battlers: [
    battler({
      types: ["TYPE_GROUND", "TYPE_ROCK"], attack: 131, defense: 177, spAttack: 81, spDefense: 155,
      speed: 69, level: 50, statStages: [80, 21, 22, 23, 24, 25, 26, 27], isFirstTurn: 1,
      hp: 37, maxHP: 155, ability: 69, species: 105,
      status1: STATUS1_SLEEP | STATUS1_TOXIC_POISON,
      status2: STATUS2_CONFUSION | STATUS2_INFATUATION | STATUS2_ESCAPE_PREVENTION | STATUS2_NIGHTMARE
        | STATUS2_CURSED | STATUS2_FORESIGHT | STATUS2_TORMENT,
      status3: STATUS3_LEECHSEED | STATUS3_YAWN | STATUS3_PERISH_SONG,
      tauntTimer: 4,
    }),
    battler({ ability: 65 }),
    battler(),
    battler(),
  ],
  history: history({
    usedMoves: [[33, 89, 57], [200], [], [400]],
    knownAbilities: ["ABILITY_PRESSURE", "ABILITY_UNUSED", null, "ABILITY_UNUSED_3"],
    knownItemEffects: [45, 99, 88, 77],
    partyIndexes: [2, 1, 0, 2],
  }),
});

addCase({
  label: "target_unconditional_false_masks",
  category: "target-fields",
  battlers: [
    battler({ status1: 1 << 5, status2: 1 << 3, status3: 1 << 8, tauntTimer: -0 }),
    battler(), battler(), battler(),
  ],
});

addCase({
  label: "history_arbitrary_target_row_projection",
  category: "history-projection",
  lastMoves: [Number.NaN, 0, 0, 0],
  history: history({
    usedMoves: [[Number.NaN, -0, 355.5], [12], [13], [14]],
    knownAbilities: ["ABILITY_CUSTOM", "ABILITY_OTHER", null, "ABILITY_LAST"],
    knownItemEffects: [Infinity, -3.5, 0, 1],
    partyIndexes: [Number.NaN, -0, Infinity, -Infinity],
  }),
});

addCase({
  label: "history_other_slots_are_not_projected",
  category: "history-projection",
  history: history({
    usedMoves: [[], [77], [88], [99]],
    knownAbilities: [null, "ABILITY_SHADOW_TAG", "ABILITY_NONE", "ABILITY_CUSTOM"],
    knownItemEffects: [0, 1, 2, 3],
    partyIndexes: [0, 99, 88, 77],
  }),
});

addCase({
  label: "stat_stages_distinct_canonical_order",
  category: "stat-stages",
  battlers: [
    battler({ statStages: [-99, -11, -22, -33, -44, -55, -66, -77] }),
    battler({ statStages: [99, 11, 22, 33, 44, 55, 66, 77] }),
    battler(), battler(),
  ],
});

addCase({
  label: "masks_and_nonzero_use_javascript_toint32",
  category: "numeric-coercion",
  weather: -1,
  sideStatuses: [4_294_967_296 + SIDE_STATUS_SPIKES + SIDE_STATUS_SAFEGUARD + SIDE_STATUS_FUTUREATTACK, -1],
  lastMoves: [Infinity, 0, 0, 0],
  battlers: [
    battler({ status1: -1, status2: -1, status3: -1, tauntTimer: Number.NaN }),
    battler({
      status1: 4_294_967_296 + STATUS1_SLEEP + STATUS1_REFRESH_CURE_MASK,
      status2: -1,
      status3: 4_294_967_296 - 1,
      protectUses: Number.NaN,
    }),
    battler(), battler(),
  ],
});

for (const [label, weather] of [
  ["weather_rain", 1],
  ["weather_sandstorm", 8],
  ["weather_sun", 32],
  ["weather_hail", 128],
  ["weather_precedence_sun", 1 | 8 | 64 | 128],
]) addCase({ label, category: "weather", weather });

addCase({
  label: "challenge_explicit_values",
  category: "challenge",
  factoryWinStreak: 65_535,
  trainerOpponentId: 42,
  battleTurnCountPresent: true,
  battleTurnCount: 37,
});

addCase({
  label: "challenge_raw_number_edges",
  category: "challenge",
  factoryWinStreak: -0,
  trainerOpponentId: Number.NaN,
  battleTurnCountPresent: true,
  battleTurnCount: Infinity,
});

addCase({
  label: "unknown_attacker_ability_error",
  category: "ability-error",
  battlers: [battler({ ability: 69 }), battler({ ability: 78 }), battler(), battler()],
});

addCase({
  label: "unknown_target_fractional_ability_error",
  category: "ability-error",
  battlers: [battler({ ability: 1.5 }), battler({ ability: 77 }), battler(), battler()],
});

const EXPECTED_CATEGORY_COUNTS = new Map([
  ["baseline", 1],
  ["attacker-fields", 1],
  ["target-fields", 2],
  ["history-projection", 2],
  ["stat-stages", 1],
  ["numeric-coercion", 1],
  ["weather", 5],
  ["challenge", 2],
  ["ability-error", 2],
]);
const categoryCounts = new Map();
for (const vector of cases) categoryCounts.set(
  vector.category,
  (categoryCounts.get(vector.category) ?? 0) + 1,
);
for (const [category, count] of EXPECTED_CATEGORY_COUNTS) {
  if (categoryCounts.get(category) !== count) {
    throw new Error(`gen-factory-ai-live-view-constructor-vectors: ${category} census changed`);
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
function rustNumbers(values) { return values.map(rustNumber).join(", "); }
function rustOptionString(value) {
  return value === null ? "None" : `Some(${rustString(value)})`;
}
function rustBattler(value) {
  return `FactoryAiLiveViewBattlerVector {
            types: [${value.types.map(rustString).join(", ")}],
            attack: ${rustNumber(value.attack)},
            defense: ${rustNumber(value.defense)},
            sp_attack: ${rustNumber(value.spAttack)},
            sp_defense: ${rustNumber(value.spDefense)},
            speed: ${rustNumber(value.speed)},
            level: ${rustNumber(value.level)},
            stat_stages: [${rustNumbers(value.statStages)}],
            is_first_turn: ${rustNumber(value.isFirstTurn)},
            hp: ${rustNumber(value.hp)},
            max_hp: ${rustNumber(value.maxHP)},
            ability: ${rustNumber(value.ability)},
            status1: ${rustNumber(value.status1)},
            status2: ${rustNumber(value.status2)},
            status3: ${rustNumber(value.status3)},
            protect_uses: ${rustNumber(value.protectUses)},
            taunt_timer: ${rustNumber(value.tauntTimer)},
            species: ${rustNumber(value.species)},
            moves: [${rustNumbers(value.moves)}],
        }`;
}
function rustHistory(value) {
  return `FactoryAiLiveViewHistoryVector {
            used_moves: [${value.usedMoves.map((row) => `&[${rustNumbers(row)}]`).join(", ")}],
            known_abilities: [${value.knownAbilities.map(rustOptionString).join(", ")}],
            known_item_effects: [${rustNumbers(value.knownItemEffects)}],
            party_indexes: [${rustNumbers(value.partyIndexes)}],
        }`;
}

const categoryLines = [...EXPECTED_CATEGORY_COUNTS]
  .map(([category, count]) => `    (${rustString(category)}, ${count}),`).join("\n");
const caseLines = cases.map((vector) => `    FactoryAiLiveViewConstructorCase {
        label: ${rustString(vector.label)},
        category: ${rustString(vector.category)},
        weather: ${rustNumber(vector.weather)},
        side_statuses: [${rustNumbers(vector.sideStatuses)}],
        last_moves: [${rustNumbers(vector.lastMoves)}],
        battlers: [
${vector.battlers.map((value) => `            ${rustBattler(value)},`).join("\n")}
        ],
        history: ${rustHistory(vector.history)},
        factory_win_streak: ${rustNumber(vector.factoryWinStreak)},
        trainer_opponent_id: ${rustNumber(vector.trainerOpponentId)},
        battle_turn_count_present: ${vector.battleTurnCountPresent},
        battle_turn_count: ${rustNumber(vector.battleTurnCount)},
        expected_json: ${rustOptionString(vector.expectedJson)},
        expected_error: ${rustOptionString(vector.expectedError)},
    },`).join("\n");

const rust = `// GENERATED by core-rs/tools/gen-factory-ai-live-view-constructor-vectors.mjs.
// Expected views/errors come only from executing src/engine/factoryAiLiveDriver.ts.
// Regenerate: node --experimental-strip-types core-rs/tools/gen-factory-ai-live-view-constructor-vectors.mjs
// Deterministic fixed corpus; do not hand-edit.

#[derive(Debug, Clone, Copy)]
pub struct FactoryAiLiveViewBattlerVector {
    pub types: [&'static str; 2],
    pub attack: f64,
    pub defense: f64,
    pub sp_attack: f64,
    pub sp_defense: f64,
    pub speed: f64,
    pub level: f64,
    pub stat_stages: [f64; 8],
    pub is_first_turn: f64,
    pub hp: f64,
    pub max_hp: f64,
    pub ability: f64,
    pub status1: f64,
    pub status2: f64,
    pub status3: f64,
    pub protect_uses: f64,
    pub taunt_timer: f64,
    pub species: f64,
    pub moves: [f64; 4],
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryAiLiveViewHistoryVector {
    pub used_moves: [&'static [f64]; 4],
    pub known_abilities: [Option<&'static str>; 4],
    pub known_item_effects: [f64; 4],
    pub party_indexes: [f64; 4],
}

#[derive(Debug, Clone, Copy)]
pub struct FactoryAiLiveViewConstructorCase {
    pub label: &'static str,
    pub category: &'static str,
    pub weather: f64,
    pub side_statuses: [f64; 2],
    pub last_moves: [f64; 4],
    pub battlers: [FactoryAiLiveViewBattlerVector; 4],
    pub history: FactoryAiLiveViewHistoryVector,
    pub factory_win_streak: f64,
    pub trainer_opponent_id: f64,
    pub battle_turn_count_present: bool,
    pub battle_turn_count: f64,
    pub expected_json: Option<&'static str>,
    pub expected_error: Option<&'static str>,
}

pub const FACTORY_AI_LIVE_VIEW_CONSTRUCTOR_VECTOR_CATEGORY_COUNTS: [(&str, usize); ${EXPECTED_CATEGORY_COUNTS.size}] = [
${categoryLines}
];

pub static FACTORY_AI_LIVE_VIEW_CONSTRUCTOR_CASES: [FactoryAiLiveViewConstructorCase; ${cases.length}] = [
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
if (!formatted) throw new Error("gen-factory-ai-live-view-constructor-vectors: could not find rustfmt");
const digest = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex");
console.log(`gen-factory-ai-live-view-constructor-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-factory-ai-live-view-constructor-vectors: ${cases.length} cases; ${[...EXPECTED_CATEGORY_COUNTS].map(([category, count]) => `${category}=${count}`).join(", ")}`);
console.log(`gen-factory-ai-live-view-constructor-vectors: sha256 ${digest}`);
