#!/usr/bin/env node
// Codegen for core-rs/crates/factory-core/src/battle_ai_switch_into_vectors_gen.rs.
//
// Every expected result comes from executing canonical TypeScript's
// getMostSuitableMonToSwitchInto. This script intentionally does not
// reimplement its type, damage, or selection logic. The deterministic corpus
// combines every existing directed TS test, the two canonical DESTIN forced
// replacements, source-quirk cases, and a fixed broad combination sweep.
//
// Run from any cwd with:
//   node --experimental-strip-types core-rs/tools/gen-battle-ai-switch-into-vectors.mjs

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
  "battle_ai_switch_into_vectors_gen.rs",
);

const switchInto = await import(path.join(workspaceRoot, "src", "engine", "battleAiSwitchInto.ts"));
const movesData = JSON.parse(
  fs.readFileSync(path.join(workspaceRoot, "src", "data", "gen", "moves.json"), "utf8"),
);

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
const TYPE_NAMES = Object.freeze(Object.keys(TYPE_IDS));
const MOVE_BY_TYPE = new Map();
for (const move of movesData.moves) {
  if (move.power > 1 && !MOVE_BY_TYPE.has(move.type)) MOVE_BY_TYPE.set(move.type, move.id);
}

const MOVE_NONE = 0;
const MOVE_KARATE_CHOP = 2;
const MOVE_GUILLOTINE = 12;
const MOVE_FLY = 19;
const MOVE_SAND_ATTACK = 28;
const MOVE_TACKLE = 33;
const MOVE_WATER_GUN = 55;
const MOVE_QUICK_ATTACK = 98;
const MOVE_DOUBLE_TEAM = 104;
const MOVE_STRUGGLE = 165;
const MOVE_FAINT_ATTACK = 185;
const MOVE_FURY_CUTTER = 210;
const MOVE_TORMENT = 259;
const MOVE_TAUNT = 269;
const MOVE_BRICK_BREAK = 280;
const MOVE_ENDEAVOR = 283;
const MOVE_FEATHER_DANCE = 297;
const MOVE_AERIAL_ACE = 332;
const MOVE_MUD_SHOT = 341;

const TYPE_NORMAL = "TYPE_NORMAL";
const TYPE_FIGHTING = "TYPE_FIGHTING";
const TYPE_FLYING = "TYPE_FLYING";
const TYPE_GHOST = "TYPE_GHOST";
const TYPE_GROUND = "TYPE_GROUND";
const TYPE_ROCK = "TYPE_ROCK";
const TYPE_WATER = "TYPE_WATER";
const TYPE_GRASS = "TYPE_GRASS";
const TYPE_FIRE = "TYPE_FIRE";
const TYPE_ELECTRIC = "TYPE_ELECTRIC";
const TYPE_DARK = "TYPE_DARK";

const STATUS2_FORESIGHT = 1 << 29;
const ABILITY_LEVITATE = 26;

function member({ species = 0, hp = 0, types = [TYPE_NORMAL, TYPE_NORMAL], moves = [0, 0, 0, 0] } = {}) {
  return { species, hp, types: [...types], moves: [...moves] };
}

function bench(slots = []) {
  return Array.from({ length: 6 }, (_, index) => member(slots[index]));
}

function fallback({
  baseDamage,
  activeTypes,
  opposingTypes,
  opposingAbility = 0,
  opposingStatus2 = 0,
}) {
  return { baseDamage, activeTypes: [...activeTypes], opposingTypes: [...opposingTypes], opposingAbility, opposingStatus2 };
}

function encodedTypes(types) {
  const encoded = types.map((type) => TYPE_IDS[type]);
  if (encoded.some((type) => type === undefined)) {
    throw new Error(`gen-battle-ai-switch-into-vectors: unknown type ${types}`);
  }
  return encoded;
}

function encodedMember(value) {
  return {
    species: value.species,
    hp: value.hp,
    types: encodedTypes(value.types),
    moves: [...value.moves],
  };
}

function encodedFallback(value) {
  return {
    baseDamage: value.baseDamage,
    activeTypes: encodedTypes(value.activeTypes),
    opposingTypes: encodedTypes(value.opposingTypes),
    opposingAbility: value.opposingAbility,
    opposingStatus2: value.opposingStatus2 >>> 0,
  };
}

const cases = [];
const labels = new Set();

function pushCase(label, input) {
  if (labels.has(label)) throw new Error(`gen-battle-ai-switch-into-vectors: duplicate label ${label}`);
  labels.add(label);
  const result = switchInto.getMostSuitableMonToSwitchInto(
    input.bench,
    input.activePartyIndex,
    input.opposingTypes,
    input.damageFallback,
  );
  if (result.kind !== "resolved" && result.kind !== "damage-fallback-needed") {
    throw new Error(`gen-battle-ai-switch-into-vectors: ${label} returned unexpected kind ${result.kind}`);
  }
  cases.push({
    label,
    bench: input.bench.map(encodedMember),
    activePartyIndex: input.activePartyIndex,
    opposingTypes: encodedTypes(input.opposingTypes),
    hasDamageFallback: input.damageFallback !== undefined,
    fallback: input.damageFallback === undefined
      ? { baseDamage: 0, activeTypes: [0, 0], opposingTypes: [0, 0], opposingAbility: 0, opposingStatus2: 0 }
      : encodedFallback(input.damageFallback),
    expectedKind: result.kind === "resolved" ? 0 : 1,
    expectedPartyIndex: result.kind === "resolved" ? result.partyIndex : 6,
  });
}

// === Existing tests/battleAiSwitchInto.test.ts directed cases ==============

pushCase("ts_machop_over_pidgey_live_ledger", {
  bench: bench([
    member({ species: 191, hp: 0, types: [TYPE_GRASS, TYPE_GRASS], moves: [MOVE_TACKLE, 0, 0, 0] }),
    member({ species: 16, hp: 100, types: [TYPE_NORMAL, TYPE_FLYING], moves: [MOVE_TACKLE, 0, 0, 0] }),
    member({ species: 66, hp: 100, types: [TYPE_FIGHTING, TYPE_FIGHTING], moves: [MOVE_KARATE_CHOP, 0, 0, 0] }),
  ]),
  activePartyIndex: 0,
  opposingTypes: [TYPE_NORMAL, TYPE_NORMAL],
});
pushCase("ts_active_healthy_slot_is_excluded", {
  bench: bench([
    member({ species: 66, hp: 100, types: [TYPE_FIGHTING, TYPE_FIGHTING], moves: [MOVE_KARATE_CHOP, 0, 0, 0] }),
    member({ species: 16, hp: 100, types: [TYPE_NORMAL, TYPE_FLYING], moves: [MOVE_KARATE_CHOP, 0, 0, 0] }),
  ]),
  activePartyIndex: 0,
  opposingTypes: [TYPE_NORMAL, TYPE_NORMAL],
});
pushCase("ts_empty_and_fainted_slots_are_skipped", {
  bench: bench([
    member({ species: 191, hp: 0 }),
    member(),
    member({ species: 66, hp: 0, types: [TYPE_FIGHTING, TYPE_FIGHTING], moves: [MOVE_KARATE_CHOP, 0, 0, 0] }),
    member({ species: 16, hp: 50, types: [TYPE_NORMAL, TYPE_FLYING], moves: [MOVE_KARATE_CHOP, 0, 0, 0] }),
  ]),
  activePartyIndex: 0,
  opposingTypes: [TYPE_NORMAL, TYPE_NORMAL],
});
pushCase("ts_no_super_effective_move_needs_fallback", {
  bench: bench([
    member({ species: 191, hp: 0 }),
    member({ species: 16, hp: 100, types: [TYPE_NORMAL, TYPE_FLYING], moves: [MOVE_TACKLE, 0, 0, 0] }),
  ]),
  activePartyIndex: 0,
  opposingTypes: [TYPE_NORMAL, TYPE_NORMAL],
});
pushCase("ts_move_none_never_passes_gate", {
  bench: bench([
    member({ species: 191, hp: 0 }),
    member({ species: 16, hp: 100, types: [TYPE_NORMAL, TYPE_FLYING], moves: [0, 0, 0, 0] }),
  ]),
  activePartyIndex: 0,
  opposingTypes: [TYPE_NORMAL, TYPE_NORMAL],
});
pushCase("ts_pass2_active_type_stab_water_gun", {
  bench: bench([
    member({ species: 191, hp: 0, types: [TYPE_GRASS, TYPE_GRASS] }),
    member({ species: 16, hp: 100, types: [TYPE_NORMAL, TYPE_FLYING], moves: [MOVE_TACKLE, 0, 0, 0] }),
    member({ species: 66, hp: 100, types: [TYPE_FIGHTING, TYPE_FIGHTING], moves: [MOVE_WATER_GUN, 0, 0, 0] }),
  ]),
  activePartyIndex: 0,
  opposingTypes: [TYPE_NORMAL, TYPE_NORMAL],
  damageFallback: fallback({ baseDamage: 100, activeTypes: [TYPE_WATER, TYPE_WATER], opposingTypes: [TYPE_NORMAL, TYPE_NORMAL] }),
});
pushCase("ts_pass2_strict_tie_keeps_earliest", {
  bench: bench([
    member({ species: 191, hp: 0 }),
    member({ species: 16, hp: 100, moves: [MOVE_TACKLE, 0, 0, 0] }),
    member({ species: 66, hp: 100, moves: [MOVE_TACKLE, 0, 0, 0] }),
  ]),
  activePartyIndex: 0,
  opposingTypes: [TYPE_NORMAL, TYPE_NORMAL],
  damageFallback: fallback({ baseDamage: 80, activeTypes: [TYPE_GRASS, TYPE_GRASS], opposingTypes: [TYPE_NORMAL, TYPE_NORMAL] }),
});
pushCase("ts_pass2_non_bugfix_u8_wrap", {
  bench: bench([
    member({ species: 191, hp: 0 }),
    member({ species: 16, hp: 100, moves: [MOVE_WATER_GUN, 0, 0, 0] }),
    member({ species: 66, hp: 100, moves: [MOVE_TACKLE, 0, 0, 0] }),
  ]),
  activePartyIndex: 0,
  opposingTypes: [TYPE_NORMAL, TYPE_NORMAL],
  damageFallback: fallback({ baseDamage: 200, activeTypes: [TYPE_WATER, TYPE_WATER], opposingTypes: [TYPE_NORMAL, TYPE_NORMAL] }),
});

// === Canonical DESTIN forced-replacement cases ==============================
// tests/destinCanonicalReplacements.test.ts and its cited live RAM bench.

function destinBench(grovyleHp, murkrowHp, pidgeottoHp) {
  return bench([
    member({ species: 278, hp: grovyleHp, types: [TYPE_GRASS, TYPE_GRASS], moves: [MOVE_FURY_CUTTER, MOVE_ENDEAVOR, MOVE_BRICK_BREAK, MOVE_DOUBLE_TEAM] }),
    member({ species: 198, hp: murkrowHp, types: [TYPE_DARK, TYPE_FLYING], moves: [MOVE_FAINT_ATTACK, MOVE_FLY, MOVE_TORMENT, MOVE_TAUNT] }),
    member({ species: 17, hp: pidgeottoHp, types: [TYPE_NORMAL, TYPE_FLYING], moves: [MOVE_AERIAL_ACE, MOVE_QUICK_ATTACK, MOVE_FEATHER_DANCE, MOVE_SAND_ATTACK] }),
  ]);
}

const ONIX_TYPES = [TYPE_ROCK, TYPE_GROUND];
pushCase("destin_turn5_pass1_only", {
  bench: destinBench(0, 142, 156),
  activePartyIndex: 0,
  opposingTypes: ONIX_TYPES,
});
for (const baseDamage of [1, 5, 20, 100]) {
  pushCase(`destin_turn5_rock_slide_base_${baseDamage}`, {
    bench: destinBench(0, 142, 156),
    activePartyIndex: 0,
    opposingTypes: ONIX_TYPES,
    damageFallback: fallback({ baseDamage, activeTypes: [TYPE_GRASS, TYPE_GRASS], opposingTypes: ONIX_TYPES }),
  });
}
pushCase("destin_turn13_dragon_breath_base_22", {
  bench: destinBench(0, 142, 0),
  activePartyIndex: 2,
  opposingTypes: ONIX_TYPES,
  damageFallback: fallback({ baseDamage: 22, activeTypes: [TYPE_NORMAL, TYPE_FLYING], opposingTypes: ONIX_TYPES }),
});
for (const baseDamage of [1, 100]) {
  pushCase(`destin_turn13_base_${baseDamage}`, {
    bench: destinBench(0, 142, 0),
    activePartyIndex: 2,
    opposingTypes: ONIX_TYPES,
    damageFallback: fallback({ baseDamage, activeTypes: [TYPE_NORMAL, TYPE_FLYING], opposingTypes: ONIX_TYPES }),
  });
}

// === Named source-quirk cases ==============================================

pushCase("quirk_mono_attacker_double_application", {
  bench: bench([
    member({ species: 1, hp: 0 }),
    member({ species: 2, hp: 100, types: [TYPE_ROCK, TYPE_ROCK], moves: [MOVE_KARATE_CHOP, 0, 0, 0] }),
    member({ species: 3, hp: 100, types: [TYPE_GHOST, TYPE_GHOST], moves: [MOVE_KARATE_CHOP, 0, 0, 0] }),
  ]),
  activePartyIndex: 0,
  opposingTypes: [TYPE_NORMAL, TYPE_NORMAL],
});
pushCase("quirk_gate_levitate_ground", {
  bench: bench([
    member({ species: 1, hp: 0 }),
    member({ species: 2, hp: 100, types: [TYPE_GROUND, TYPE_GROUND], moves: [MOVE_MUD_SHOT, 0, 0, 0] }),
  ]),
  activePartyIndex: 0,
  opposingTypes: [TYPE_ELECTRIC, TYPE_ELECTRIC],
  damageFallback: fallback({
    baseDamage: 100,
    activeTypes: [TYPE_GROUND, TYPE_GROUND],
    opposingTypes: [TYPE_ELECTRIC, TYPE_ELECTRIC],
    opposingAbility: ABILITY_LEVITATE,
  }),
});
pushCase("quirk_gate_foresight_fighting_ghost_rock", {
  bench: bench([
    member({ species: 1, hp: 0 }),
    member({ species: 2, hp: 100, types: [TYPE_FIGHTING, TYPE_FIGHTING], moves: [MOVE_KARATE_CHOP, 0, 0, 0] }),
  ]),
  activePartyIndex: 0,
  opposingTypes: [TYPE_GHOST, TYPE_ROCK],
  damageFallback: fallback({
    baseDamage: 100,
    activeTypes: [TYPE_FIGHTING, TYPE_FIGHTING],
    opposingTypes: [TYPE_GHOST, TYPE_ROCK],
    opposingStatus2: STATUS2_FORESIGHT,
  }),
});
pushCase("quirk_pass2_struggle_ignores_stab_and_type", {
  bench: bench([
    member({ species: 1, hp: 0 }),
    member({ species: 2, hp: 100, types: [TYPE_NORMAL, TYPE_NORMAL], moves: [MOVE_STRUGGLE, 0, 0, 0] }),
  ]),
  activePartyIndex: 0,
  opposingTypes: [TYPE_FIRE, TYPE_FIRE],
  damageFallback: fallback({ baseDamage: 100, activeTypes: [TYPE_WATER, TYPE_WATER], opposingTypes: [TYPE_FIRE, TYPE_FIRE] }),
});
pushCase("quirk_pass2_power_one_is_zero", {
  bench: bench([
    member({ species: 1, hp: 0 }),
    member({ species: 2, hp: 100, types: [TYPE_NORMAL, TYPE_NORMAL], moves: [MOVE_GUILLOTINE, 0, 0, 0] }),
  ]),
  activePartyIndex: 0,
  opposingTypes: [TYPE_FIRE, TYPE_FIRE],
  damageFallback: fallback({ baseDamage: 100, activeTypes: [TYPE_WATER, TYPE_WATER], opposingTypes: [TYPE_FIRE, TYPE_FIRE] }),
});
pushCase("quirk_pass2_unknown_move_uses_base_damage", {
  bench: bench([
    member({ species: 1, hp: 0 }),
    member({ species: 2, hp: 100, types: [TYPE_NORMAL, TYPE_NORMAL], moves: [999, 0, 0, 0] }),
  ]),
  activePartyIndex: 0,
  opposingTypes: [TYPE_GHOST, TYPE_GHOST],
  damageFallback: fallback({ baseDamage: 100, activeTypes: [TYPE_NORMAL, TYPE_NORMAL], opposingTypes: [TYPE_GHOST, TYPE_GHOST] }),
});
pushCase("quirk_no_living_candidate_returns_party_size_sentinel", {
  bench: bench(),
  activePartyIndex: 0,
  opposingTypes: [TYPE_NORMAL, TYPE_NORMAL],
  damageFallback: fallback({ baseDamage: 100, activeTypes: [TYPE_NORMAL, TYPE_NORMAL], opposingTypes: [TYPE_NORMAL, TYPE_NORMAL] }),
});

// === Broad deterministic combination sweep ==================================
// A local fixed LCG only chooses coverage inputs; the expectations above are
// always obtained by calling the canonical TS module, never this generator's
// own interpretation of the switch logic.
let sweepState = 0x4a39b70d;
function sweepNext() {
  sweepState = (Math.imul(sweepState, 1664525) + 1013904223) >>> 0;
  return sweepState;
}
function sweepIndex(length) {
  return sweepNext() % length;
}
function sweepType() {
  return TYPE_NAMES[sweepIndex(TYPE_NAMES.length)];
}
function sweepMove(type) {
  return MOVE_BY_TYPE.get(type) ?? MOVE_NONE;
}

for (let caseIndex = 0; caseIndex < 192; caseIndex += 1) {
  const opposingType0 = sweepType();
  const opposingType1 = caseIndex % 4 === 0 ? opposingType0 : sweepType();
  const opposingTypes = [opposingType0, opposingType1];
  const activePartyIndex = sweepIndex(6);
  const sweptBench = Array.from({ length: 6 }, (_, slot) => {
    const type0 = sweepType();
    const type1 = caseIndex % 5 === slot % 5 ? type0 : sweepType();
    const occupancy = sweepIndex(7);
    const hp = occupancy === 0 ? 0 : (sweepIndex(6) + 1) * 25;
    const species = occupancy === 1 ? 0 : 1000 + caseIndex * 6 + slot;
    const move0 = sweepMove(type0);
    const move1 = sweepMove(type1);
    const move2 = [MOVE_NONE, MOVE_GUILLOTINE, MOVE_STRUGGLE, 999][sweepIndex(4)];
    const move3 = [MOVE_TACKLE, MOVE_WATER_GUN, MOVE_KARATE_CHOP, MOVE_NONE][sweepIndex(4)];
    return member({ species, hp, types: [type0, type1], moves: [move0, move1, move2, move3] });
  });
  const damageFallback = caseIndex % 3 === 0
    ? undefined
    : fallback({
      baseDamage: [0, 1, 5, 20, 80, 100, 200, 255, 300][sweepIndex(9)],
      activeTypes: [sweepType(), caseIndex % 7 === 0 ? opposingType0 : sweepType()],
      opposingTypes: caseIndex % 6 === 0 ? [sweepType(), sweepType()] : opposingTypes,
      opposingAbility: caseIndex % 11 === 0 ? ABILITY_LEVITATE : 0,
      opposingStatus2: caseIndex % 13 === 0 ? STATUS2_FORESIGHT : 0,
    });
  pushCase(`sweep_${String(caseIndex).padStart(3, "0")}`, {
    bench: sweptBench,
    activePartyIndex,
    opposingTypes,
    damageFallback,
  });
}

function rustMember(value) {
  const oneLine = `BattleAiSwitchBenchMemberCase { species: ${value.species}, hp: ${value.hp}, types: [${value.types[0]}, ${value.types[1]}], moves: [${value.moves.join(", ")}] },`;
  // Each member begins 12 columns into the generated array. Mirror rustfmt's
  // 100-column width limit so a generation is already fmt-clean and stable.
  if (12 + oneLine.length <= 100) return oneLine;

  return [
    "BattleAiSwitchBenchMemberCase {",
    `    species: ${value.species},`,
    `    hp: ${value.hp},`,
    `    types: [${value.types[0]}, ${value.types[1]}],`,
    `    moves: [${value.moves.join(", ")}],`,
    "},",
  ].join("\n");
}

function rustFallback(value) {
  return [
    "BattleAiSwitchDamageFallbackCase {",
    `    base_damage: ${value.baseDamage},`,
    `    active_types: [${value.activeTypes[0]}, ${value.activeTypes[1]}],`,
    `    opposing_types: [${value.opposingTypes[0]}, ${value.opposingTypes[1]}],`,
    `    opposing_ability: ${value.opposingAbility},`,
    `    opposing_status2: ${value.opposingStatus2},`,
    "},",
  ].join("\n");
}

function rustCase(value) {
  const fallbackLines = rustFallback(value.fallback).split("\n");
  return [
    "    BattleAiSwitchIntoCase {",
    `        label: \"${value.label}\",`,
    "        bench: [",
    ...value.bench.flatMap((entry) =>
      rustMember(entry).split("\n").map((line) => `            ${line}`),
    ),
    "        ],",
    `        active_party_index: ${value.activePartyIndex},`,
    `        opposing_types: [${value.opposingTypes[0]}, ${value.opposingTypes[1]}],`,
    `        has_damage_fallback: ${value.hasDamageFallback},`,
    `        fallback: ${fallbackLines[0]}`,
    ...fallbackLines.slice(1).map((line) => `        ${line}`),
    `        expected_kind: ${value.expectedKind},`,
    `        expected_party_index: ${value.expectedPartyIndex},`,
    "    },",
  ].join("\n");
}

const output = [
  "//! Checked-in differential cases generated by executing canonical TypeScript",
  "//! `getMostSuitableMonToSwitchInto`. Do not hand-edit; regenerate with:",
  "//! `node --experimental-strip-types core-rs/tools/gen-battle-ai-switch-into-vectors.mjs`.",
  "",
  "#[derive(Debug, Clone, Copy)]",
  "pub struct BattleAiSwitchBenchMemberCase {",
  "    pub species: u16,",
  "    pub hp: i32,",
  "    pub types: [u8; 2],",
  "    pub moves: [u16; 4],",
  "}",
  "",
  "#[derive(Debug, Clone, Copy)]",
  "pub struct BattleAiSwitchDamageFallbackCase {",
  "    pub base_damage: i32,",
  "    pub active_types: [u8; 2],",
  "    pub opposing_types: [u8; 2],",
  "    pub opposing_ability: u16,",
  "    pub opposing_status2: u32,",
  "}",
  "",
  "#[derive(Debug, Clone, Copy)]",
  "pub struct BattleAiSwitchIntoCase {",
  "    pub label: &'static str,",
  "    pub bench: [BattleAiSwitchBenchMemberCase; 6],",
  "    pub active_party_index: u8,",
  "    pub opposing_types: [u8; 2],",
  "    pub has_damage_fallback: bool,",
  "    pub fallback: BattleAiSwitchDamageFallbackCase,",
  "    /// 0 = resolved; 1 = damage-fallback-needed.",
  "    pub expected_kind: u8,",
  "    pub expected_party_index: u8,",
  "}",
  "",
  `pub static BATTLE_AI_SWITCH_INTO_CASES: [BattleAiSwitchIntoCase; ${cases.length}] = [`,
  ...cases.map(rustCase),
  "];",
  "",
].join("\n");

fs.writeFileSync(outPath, output);
console.log(`wrote ${outPath} (${cases.length} TS-executed cases)`);
