#!/usr/bin/env node
// Codegen for core-rs/crates/factory-core/src/factory_ai_try_to_faint_vectors_gen.rs.
//
// Every expected result below comes from EXECUTING the canonical TypeScript
// `runTryToFaint`; this script never reimplements damage, type, or RNG logic.
// The input corpus is deterministic: the ten existing directed TS test cases,
// additional named edge cases, then a fixed GbaRng-seeded sweep. Run from any
// cwd with:
//   node --experimental-strip-types core-rs/tools/gen-try-to-faint-vectors.mjs

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(
  scriptDir,
  "..",
  "crates",
  "factory-core",
  "src",
  "factory_ai_try_to_faint_vectors_gen.rs",
);

const ttf = await import(path.join(workspaceRoot, "src", "engine", "factoryAiTryToFaint.ts"));
const { GbaRng } = await import(path.join(workspaceRoot, "src", "engine", "rng.ts"));

const TYPE_IDS = Object.freeze({
  TYPE_NORMAL: 0,
  TYPE_FIGHTING: 1,
  TYPE_FLYING: 2,
  TYPE_POISON: 3,
  TYPE_GROUND: 4,
  TYPE_ROCK: 5,
  TYPE_BUG: 6,
  TYPE_GHOST: 7,
  TYPE_STEEL: 8,
  TYPE_MYSTERY: 9,
  TYPE_FIRE: 10,
  TYPE_WATER: 11,
  TYPE_GRASS: 12,
  TYPE_ELECTRIC: 13,
  TYPE_PSYCHIC: 14,
  TYPE_ICE: 15,
  TYPE_DRAGON: 16,
  TYPE_DARK: 17,
});

const abilityItemHooks = JSON.parse(
  fs.readFileSync(path.join(workspaceRoot, "src", "data", "gen", "ability-item-hooks.json"), "utf8"),
);
const ABILITY_IDS = new Map(abilityItemHooks.universes.abilities.map((entry) => [entry.name, entry.id]));

function abilityId(name) {
  const id = ABILITY_IDS.get(name);
  if (id === undefined) throw new Error(`gen-try-to-faint-vectors: unknown ability ${name}`);
  return id;
}

const DEFAULT_STAGES = Object.freeze({ atk: 6, def: 6, spAtk: 6, spDef: 6 });
const DEFAULT_ATTACKER = Object.freeze({
  attack: 100,
  defense: 100,
  spAttack: 100,
  spDefense: 100,
  level: 50,
  types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
  statStages: DEFAULT_STAGES,
});

function battler(overrides = {}) {
  const stages = { ...DEFAULT_STAGES, ...(overrides.statStages ?? {}) };
  return {
    ...DEFAULT_ATTACKER,
    ...overrides,
    types: overrides.types ?? DEFAULT_ATTACKER.types,
    statStages: stages,
  };
}

function target(overrides = {}) {
  const { hp = 999, ability = "ABILITY_NONE", ...battlerOverrides } = overrides;
  return { ...battler(battlerOverrides), hp, ability };
}

function makeInput(label, overrides = {}) {
  const moveId = overrides.moveId;
  if (moveId === undefined) throw new Error(`gen-try-to-faint-vectors: ${label} omitted moveId`);
  return {
    rng: overrides.rng ?? { value: 0, calls: 0 },
    moveId,
    movesetIndex: overrides.movesetIndex ?? 0,
    moveset: overrides.moveset ?? [moveId, 0, 0, 0],
    simulatedRng: overrides.simulatedRng ?? [100, 100, 100, 100],
    attacker: overrides.attacker ?? DEFAULT_ATTACKER,
    target: overrides.target ?? target(),
    drawOrdinalStart: overrides.drawOrdinalStart ?? 1,
    reasonPrefix: `ttf-vector-${label}`,
  };
}

function encodedBattler(value) {
  const type0 = TYPE_IDS[value.types[0]];
  const type1 = TYPE_IDS[value.types[1]];
  if (type0 === undefined || type1 === undefined) {
    throw new Error(`gen-try-to-faint-vectors: unknown types ${value.types}`);
  }
  return {
    attack: value.attack,
    defense: value.defense,
    spAttack: value.spAttack,
    spDefense: value.spDefense,
    level: value.level,
    types: [type0, type1],
    stages: [value.statStages.atk, value.statStages.def, value.statStages.spAtk, value.statStages.spDef],
  };
}

function encodedInput(input) {
  return {
    rngValue: input.rng.value >>> 0,
    rngCalls: input.rng.calls,
    moveId: input.moveId,
    movesetIndex: input.movesetIndex,
    moveset: [...input.moveset],
    simulatedRng: [...input.simulatedRng],
    attacker: encodedBattler(input.attacker),
    target: encodedBattler(input.target),
    targetHp: input.target.hp,
    targetAbility: abilityId(input.target.ability),
    drawOrdinalStart: input.drawOrdinalStart,
  };
}

const MOST_POWERFUL = Object.freeze({
  "most-powerful": 0,
  "not-most-powerful": 1,
  "power-other": 2,
});

const scoredCases = [];
const errorCases = [];

function pushScored(label, overrides) {
  const input = makeInput(label, overrides);
  const result = ttf.runTryToFaint(input);
  if (result.kind !== "scored") {
    throw new Error(`gen-try-to-faint-vectors: ${label} returned unexpected kind ${result.kind}`);
  }
  if (result.draws.length > 1) {
    throw new Error(`gen-try-to-faint-vectors: ${label} produced ${result.draws.length} draws`);
  }
  const draws = result.draws.map((draw) => {
    if (draw.kind !== "double-super-effective") {
      throw new Error(`gen-try-to-faint-vectors: ${label} returned unexpected draw kind ${draw.kind}`);
    }
    return {
      ordinal: draw.ordinal,
      beforeValue: draw.before.value >>> 0,
      beforeCalls: draw.before.calls,
      afterValue: draw.after.value >>> 0,
      afterCalls: draw.after.calls,
      rawRngValue: draw.rawRngValue >>> 0,
      randomValue: draw.randomValue,
      succeeded: draw.succeeded,
    };
  });
  while (draws.length < 1) {
    draws.push({
      ordinal: 0,
      beforeValue: 0,
      beforeCalls: 0,
      afterValue: 0,
      afterCalls: 0,
      rawRngValue: 0,
      randomValue: 0,
      succeeded: false,
    });
  }
  const mostPowerful = result.mostPowerful === null ? null : MOST_POWERFUL[result.mostPowerful];
  if (mostPowerful === undefined) {
    throw new Error(`gen-try-to-faint-vectors: ${label} returned unknown mostPowerful ${result.mostPowerful}`);
  }
  scoredCases.push({
    label,
    input: encodedInput(input),
    expectedRngValue: result.rng.value >>> 0,
    expectedRngCalls: result.rng.calls,
    expectedDrawCount: result.draws.length,
    draws,
    expectedScoreDelta: result.scoreDelta,
    expectedCanFaint: result.canFaint,
    expectedMostPowerful: mostPowerful,
  });
}

function pushError(label, overrides) {
  const input = makeInput(label, overrides);
  let message;
  try {
    ttf.runTryToFaint(input);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    message = error.message;
  }
  if (message === undefined) {
    throw new Error(`gen-try-to-faint-vectors: ${label} unexpectedly returned successfully`);
  }
  errorCases.push({ label, input: encodedInput(input), expectedMessage: message });
}

// === Existing tests/factoryAiTryToFaint.test.ts's ten directed tests ========
// The first test has the two sides of the explicitly asserted 19/20 boundary,
// so it maps to two rows while retaining its single TS-test provenance.

pushScored("ts_pound_can_faint_boundary_hp19", {
  moveId: 1, // POUND
  target: target({ hp: 19 }),
});
pushScored("ts_pound_cannot_faint_boundary_hp20", {
  moveId: 1,
  target: target({ hp: 20 }),
});
pushScored("ts_can_faint_explosion_plus0", {
  moveId: 153, // EXPLOSION
  target: target({ hp: 5 }),
});
pushScored("ts_can_faint_quick_attack_plus6", {
  moveId: 98, // QUICK ATTACK
  target: target({ hp: 5 }),
});
pushScored("ts_sibling_strictly_stronger_minus1", {
  moveId: 1,
  moveset: [1, 57, 0, 0], // POUND, SURF
  target: target(),
});
pushScored("ts_no_stronger_sibling", {
  moveId: 1,
  moveset: [1, 0, 0, 0],
  target: target(),
});
pushScored("ts_power_other_growl", {
  moveId: 45, // GROWL, power 0
  moveset: [45, 57, 0, 0],
  target: target(),
});
pushScored("ts_x4_roll_fallthrough_plus2", {
  rng: { value: 1, calls: 0 },
  moveId: 58, // ICE BEAM
  moveset: [58, 0, 0, 0],
  target: target({ types: ["TYPE_GRASS", "TYPE_FLYING"] }),
});
pushScored("ts_x4_roll_jump_skips_bonus", {
  rng: { value: 4, calls: 0 },
  moveId: 58,
  moveset: [58, 0, 0, 0],
  target: target({ types: ["TYPE_GRASS", "TYPE_FLYING"] }),
});
pushScored("ts_neutral_no_draw", {
  moveId: 1,
  target: target(),
});
pushScored("ts_levitate_off_type_inert", {
  moveId: 1,
  target: target({ ability: "ABILITY_LEVITATE" }),
});

// === Directed broad coverage =================================================

const FOUR_SLOT_MOVESET = [1, 57, 58, 98]; // POUND / SURF / ICE BEAM / QUICK ATTACK
for (let index = 0; index < 4; index += 1) {
  pushScored(`all_moveset_indices_slot${index}`, {
    moveId: FOUR_SLOT_MOVESET[index],
    movesetIndex: index,
    moveset: FOUR_SLOT_MOVESET,
    simulatedRng: [85, 91, 97, 100],
    target: target({ hp: 999 }),
  });
}

pushScored("strict_greater_only_tied_siblings", {
  moveId: 1,
  moveset: [1, 10, 0, 0], // POUND / SCRATCH: exact tie
  target: target(),
});
pushScored("strict_greater_only_tie_in_later_slot", {
  moveId: 10,
  movesetIndex: 1,
  moveset: [1, 10, 0, 0],
  target: target(),
});

pushScored("power_other_zero_move_slot", {
  moveId: 0, // MOVE_NONE is present in MOVES_BY_ID, but loop slots treat 0 as undefined.
  moveset: [0, 0, 0, 0],
  target: target(),
});
pushScored("power_other_power_one_horn_drill", {
  moveId: 32,
  moveset: [32, 57, 0, 0],
  target: target(),
});
pushScored("power_other_ignored_solar_beam", {
  moveId: 76,
  moveset: [76, 57, 0, 0],
  target: target(),
});
pushScored("power_other_ignored_explosion_without_ko", {
  moveId: 153,
  moveset: [153, 57, 0, 0],
  target: target(),
});

pushScored("zero_floor_after_simulated_rng", {
  moveId: 1,
  moveset: [1, 0, 0, 0],
  simulatedRng: [0, 100, 100, 100],
  target: target({ hp: 2 }),
});
pushScored("physical_damage_and_stages", {
  moveId: 1,
  moveset: [1, 57, 0, 0],
  simulatedRng: [91, 100, 100, 100],
  attacker: battler({
    attack: 173,
    spAttack: 41,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    statStages: { atk: 9, def: 4, spAtk: 2, spDef: 11 },
  }),
  target: target({
    defense: 127,
    spDefense: 43,
    types: ["TYPE_ROCK", "TYPE_ROCK"],
    statStages: { atk: 1, def: 8, spAtk: 12, spDef: 3 },
  }),
});
pushScored("special_damage_and_stages", {
  moveId: 57,
  movesetIndex: 1,
  moveset: [1, 57, 0, 0],
  simulatedRng: [100, 87, 100, 100],
  attacker: battler({
    attack: 41,
    spAttack: 173,
    types: ["TYPE_WATER", "TYPE_WATER"],
    statStages: { atk: 2, def: 11, spAtk: 9, spDef: 4 },
  }),
  target: target({
    defense: 43,
    spDefense: 127,
    types: ["TYPE_ROCK", "TYPE_ROCK"],
    statStages: { atk: 12, def: 3, spAtk: 1, spDef: 8 },
  }),
});

pushScored("stab_x4_ice_beam_uses_240_remap", {
  rng: { value: 1, calls: 0 },
  moveId: 58,
  moveset: [58, 0, 0, 0],
  attacker: battler({ types: ["TYPE_ICE", "TYPE_NORMAL"] }),
  target: target({ types: ["TYPE_GRASS", "TYPE_FLYING"] }),
});
pushScored("non_stab_x4_ice_beam", {
  rng: { value: 4, calls: 0 },
  moveId: 58,
  moveset: [58, 0, 0, 0],
  attacker: battler({ types: ["TYPE_PSYCHIC", "TYPE_NORMAL"] }),
  target: target({ types: ["TYPE_GRASS", "TYPE_FLYING"] }),
});
pushScored("ground_x4_levitate_non_bugfix_quirk", {
  rng: { value: 1, calls: 0 },
  moveId: 89, // EARTHQUAKE
  moveset: [89, 0, 0, 0],
  attacker: battler({ types: ["TYPE_GROUND", "TYPE_NORMAL"] }),
  target: target({
    types: ["TYPE_ELECTRIC", "TYPE_STEEL"],
    ability: "ABILITY_LEVITATE",
  }),
});
pushScored("nonzero_rng_calls_and_ordinal_start", {
  rng: { value: 1, calls: 37 },
  moveId: 58,
  moveset: [58, 0, 0, 0],
  target: target({ types: ["TYPE_GRASS", "TYPE_FLYING"] }),
  drawOrdinalStart: 41,
});
pushScored("unknown_nonconsidered_sibling_is_zero", {
  moveId: 1,
  moveset: [1, 9999, 0, 0],
  target: target(),
});

pushError("unknown_input_move", {
  moveId: 9999,
  moveset: [9999, 0, 0, 0],
  target: target(),
});
pushError("unknown_considered_moveset_slot", {
  moveId: 1,
  movesetIndex: 1,
  moveset: [1, 9999, 0, 0],
  target: target(),
});

// === Deterministic broad sweep ==============================================
// Each case consumes only the imported GbaRng. These move rows cover both
// physical/special categories, STAB/non-STAB, ignored-power rows, all four
// slots, duplicate and dual types, and the TypeCalc Levitate/Ground path.

const SWEEP_MOVESETS = [
  [1, 57, 58, 89],
  [98, 153, 45, 76],
  [10, 85, 52, 328],
  [22, 25, 157, 337],
];
const SWEEP_TYPE_PAIRS = [
  ["TYPE_NORMAL", "TYPE_NORMAL"],
  ["TYPE_GRASS", "TYPE_FLYING"],
  ["TYPE_ELECTRIC", "TYPE_STEEL"],
  ["TYPE_WATER", "TYPE_ROCK"],
  ["TYPE_FIRE", "TYPE_BUG"],
  ["TYPE_GHOST", "TYPE_POISON"],
];
const sweepRng = new GbaRng(0x5eed_cafe);
let sweepCount = 0;
for (let i = 0; i < 64; i += 1) {
  const moveset = SWEEP_MOVESETS[i % SWEEP_MOVESETS.length];
  const movesetIndex = i % 4;
  const moveId = moveset[movesetIndex];
  const next = () => sweepRng.next();
  next();
  const rngValue = sweepRng.rngValue;
  const attackerTypes = SWEEP_TYPE_PAIRS[(i + 1) % SWEEP_TYPE_PAIRS.length];
  const targetTypes = SWEEP_TYPE_PAIRS[(i + 3) % SWEEP_TYPE_PAIRS.length];
  const moveIsGround = moveId === 89 || moveId === 328;
  const targetAbility = moveIsGround && i % 5 === 0 ? "ABILITY_LEVITATE" : "ABILITY_NONE";
  pushScored(`seeded_sweep_${String(i).padStart(2, "0")}`, {
    rng: { value: rngValue, calls: 3 + (i % 11) },
    moveId,
    movesetIndex,
    moveset,
    simulatedRng: [100 - (next() % 16), 100 - (next() % 16), 100 - (next() % 16), 100 - (next() % 16)],
    attacker: battler({
      attack: 35 + (next() % 166),
      defense: 35 + (next() % 166),
      spAttack: 35 + (next() % 166),
      spDefense: 35 + (next() % 166),
      level: [5, 50, 100][i % 3],
      types: attackerTypes,
      statStages: { atk: next() % 13, def: next() % 13, spAtk: next() % 13, spDef: next() % 13 },
    }),
    target: target({
      attack: 35 + (next() % 166),
      defense: 35 + (next() % 166),
      spAttack: 35 + (next() % 166),
      spDefense: 35 + (next() % 166),
      level: [5, 50, 100][(i + 1) % 3],
      types: targetTypes,
      statStages: { atk: next() % 13, def: next() % 13, spAtk: next() % 13, spDef: next() % 13 },
      hp: 10_000,
      ability: targetAbility,
    }),
    drawOrdinalStart: 10 + i,
  });
  sweepCount += 1;
}

function battlerLiteral(value) {
  return `TryToFaintBattlerCase { attack: ${value.attack}, defense: ${value.defense}, sp_attack: ${value.spAttack}, sp_defense: ${value.spDefense}, level: ${value.level}, types: [${value.types[0]}, ${value.types[1]}], stat_stages: [${value.stages.join(", ")}] }`;
}

function inputLiteral(value) {
  return `TryToFaintInputCase { rng_value: ${value.rngValue}, rng_calls: ${value.rngCalls}, move_id: ${value.moveId}, moveset_index: ${value.movesetIndex}, moveset: [${value.moveset.join(", ")}], simulated_rng: [${value.simulatedRng.join(", ")}], attacker: ${battlerLiteral(value.attacker)}, target: ${battlerLiteral(value.target)}, target_hp: ${value.targetHp}, target_ability: ${value.targetAbility}, draw_ordinal_start: ${value.drawOrdinalStart} }`;
}

function drawLiteral(value) {
  return `TryToFaintDrawCase { ordinal: ${value.ordinal}, before_value: ${value.beforeValue}, before_calls: ${value.beforeCalls}, after_value: ${value.afterValue}, after_calls: ${value.afterCalls}, raw_rng_value: ${value.rawRngValue}, random_value: ${value.randomValue}, succeeded: ${value.succeeded} }`;
}

const lines = [];
lines.push(
  "// GENERATED by core-rs/tools/gen-try-to-faint-vectors.mjs — regenerate: node --experimental-strip-types core-rs/tools/gen-try-to-faint-vectors.mjs.",
);
lines.push("// Source: executing src/engine/factoryAiTryToFaint.ts's runTryToFaint");
lines.push("// (the TypeScript engine is the spec) via node --experimental-strip-types. Do not hand-edit.");
lines.push("");
lines.push("/// The stat/type subset shared by the attacker and target vector inputs.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct TryToFaintBattlerCase {");
lines.push("    pub attack: i32,");
lines.push("    pub defense: i32,");
lines.push("    pub sp_attack: i32,");
lines.push("    pub sp_defense: i32,");
lines.push("    pub level: i32,");
lines.push("    pub types: [u8; 2],");
lines.push("    /// atk, def, sp_atk, sp_def.");
lines.push("    pub stat_stages: [u8; 4],");
lines.push("}");
lines.push("");
lines.push("/// Public `runTryToFaint` input minus TypeScript's receipt-only reasonPrefix.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct TryToFaintInputCase {");
lines.push("    pub rng_value: u32,");
lines.push("    pub rng_calls: u32,");
lines.push("    pub move_id: u16,");
lines.push("    pub moveset_index: u8,");
lines.push("    pub moveset: [u16; 4],");
lines.push("    pub simulated_rng: [i32; 4],");
lines.push("    pub attacker: TryToFaintBattlerCase,");
lines.push("    pub target: TryToFaintBattlerCase,");
lines.push("    pub target_hp: i32,");
lines.push("    pub target_ability: u16,");
lines.push("    pub draw_ordinal_start: u32,");
lines.push("}");
lines.push("");
lines.push("/// The one possible `double-super-effective` draw receipt.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct TryToFaintDrawCase {");
lines.push("    pub ordinal: u32,");
lines.push("    pub before_value: u32,");
lines.push("    pub before_calls: u32,");
lines.push("    pub after_value: u32,");
lines.push("    pub after_calls: u32,");
lines.push("    pub raw_rng_value: u32,");
lines.push("    pub random_value: u16,");
lines.push("    pub succeeded: bool,");
lines.push("}");
lines.push("");
lines.push("/// A successful canonical TypeScript execution.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct TryToFaintScoredCase {");
lines.push("    pub input: TryToFaintInputCase,");
lines.push("    pub expected_rng_value: u32,");
lines.push("    pub expected_rng_calls: u32,");
lines.push("    pub expected_draw_count: u8,");
lines.push("    pub draws: [TryToFaintDrawCase; 1],");
lines.push("    pub expected_score_delta: i32,");
lines.push("    pub expected_can_faint: bool,");
lines.push("    /// 0 = most-powerful, 1 = not-most-powerful, 2 = power-other; None = TS null.");
lines.push("    pub expected_most_powerful: Option<u8>,");
lines.push("}");
lines.push("");
lines.push(`pub static TRY_TO_FAINT_SCORED_CASES: [TryToFaintScoredCase; ${scoredCases.length}] = [`);
for (const value of scoredCases) {
  const mostPowerful = value.expectedMostPowerful === null ? "None" : `Some(${value.expectedMostPowerful})`;
  lines.push(`    // ${value.label}`);
  lines.push(
    `    TryToFaintScoredCase { input: ${inputLiteral(value.input)}, expected_rng_value: ${value.expectedRngValue}, expected_rng_calls: ${value.expectedRngCalls}, expected_draw_count: ${value.expectedDrawCount}, draws: [${drawLiteral(value.draws[0])}], expected_score_delta: ${value.expectedScoreDelta}, expected_can_faint: ${value.expectedCanFaint}, expected_most_powerful: ${mostPowerful} },`,
  );
}
lines.push("];\n");
lines.push("/// Canonical TypeScript Error cases; their messages are emitted, not hand-written.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct TryToFaintErrorCase {");
lines.push("    pub input: TryToFaintInputCase,");
lines.push("    pub expected_message: &'static str,");
lines.push("}");
lines.push("");
lines.push(`pub static TRY_TO_FAINT_ERROR_CASES: [TryToFaintErrorCase; ${errorCases.length}] = [`);
for (const value of errorCases) {
  lines.push(`    // ${value.label}`);
  lines.push(
    `    TryToFaintErrorCase { input: ${inputLiteral(value.input)}, expected_message: ${JSON.stringify(value.expectedMessage)} },`,
  );
}
lines.push("];\n");

fs.writeFileSync(outPath, lines.join("\n"), "utf8");
const rustfmt = execFileSync("rustup", ["which", "rustfmt"], { encoding: "utf8" }).trim();
execFileSync(rustfmt, ["--edition", "2021", outPath], { stdio: "inherit" });

console.log(`gen-try-to-faint-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(
  `gen-try-to-faint-vectors: ${scoredCases.length} scored cases (${sweepCount} seeded) + ${errorCases.length} error cases`,
);
