#!/usr/bin/env node
// Full-result differential corpus for factoryAiSwitchPolicy.ts. Expected
// objects are produced only by executing canonical TypeScript; this file
// builds typed scenarios but does not reimplement policy decisions.
//
// Run from any cwd:
//   node --experimental-strip-types core-rs/tools/gen-factory-ai-switch-policy-vectors.mjs

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..", "..");
const outPath = path.join(scriptDir, "..", "crates", "factory-core", "src", "factory_ai_switch_policy_vectors_gen.rs");
const policy = await import(path.join(workspaceRoot, "src", "engine", "factoryAiSwitchPolicy.ts"));
const rulesModule = await import(path.join(workspaceRoot, "src", "engine", "battleScriptRulesContext.ts"));
const rngModule = await import(path.join(workspaceRoot, "src", "engine", "rng.ts"));

const TYPES = Object.freeze({
  TYPE_NORMAL: 0, TYPE_FIGHTING: 1, TYPE_FLYING: 2, TYPE_POISON: 3,
  TYPE_GROUND: 4, TYPE_ROCK: 5, TYPE_BUG: 6, TYPE_GHOST: 7,
  TYPE_STEEL: 8, TYPE_MYSTERY: 9, TYPE_FIRE: 10, TYPE_WATER: 11,
  TYPE_GRASS: 12, TYPE_ELECTRIC: 13, TYPE_PSYCHIC: 14, TYPE_ICE: 15,
  TYPE_DRAGON: 16, TYPE_DARK: 17,
});
const {
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER: TRAINER,
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY: FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_ARENA: ARENA,
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE: DOUBLE,
} = rulesModule;
const SLEEP = 0x7;
const WRAPPED = 0x0000e000;
const ROOTED = 1 << 10;
const PERISH = 1 << 5;
const NEUTRAL = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]);

const emptyMember = () => ({ species: 0, isEgg: false, abilityNum: 0, hp: 0, maxHP: 0, moves: [0, 0, 0, 0] });
function member(species, moves, patch = {}) {
  return { species, isEgg: false, abilityNum: 0, hp: 100, maxHP: 100, moves, ...patch };
}
function battler(side, spec) {
  return {
    side, species: spec.species, ability: spec.ability, types: spec.types,
    hp: spec.hp ?? 100, maxHP: spec.maxHP ?? 100, moves: spec.moves ?? [33, 0, 0, 0],
    pp: [10, 10, 10, 10], status1: spec.status1 ?? 0, status2: spec.status2 ?? 0,
    status3: spec.status3 ?? 0, statStages: spec.statStages ?? NEUTRAL,
    substituteHP: 0, rolloutTimer: 0, furyCutterCounter: 0, truantCounter: 0,
    rechargeTimer: 0, flinchImmobility: 0, disabledMove: 0, usedDisabledMove: 0,
    tauntTimer: 0, usedTauntedMove: 0, usedImprisonedMove: 0, level: 50,
    attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 100,
    partyIndex: spec.partyIndex ?? 0, perishSongTimer: spec.perishSongTimer ?? 0,
    isFirstTurn: 0,
  };
}
function makeRules(spec = {}) {
  const target = battler(0, spec.target ?? { species: 9, ability: 67, types: ["TYPE_WATER", "TYPE_WATER"] });
  const active = battler(1, spec.active ?? { species: 26, ability: 9, types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"] });
  const empty = battler(0, { species: 0, ability: 0, types: ["TYPE_NORMAL", "TYPE_NORMAL"], hp: 0, maxHP: 0, moves: [0, 0, 0, 0] });
  const activeMember = member(active.species, active.moves, { hp: active.hp, maxHP: active.maxHP, status1: active.status1 });
  const rules = rulesModule.createBattleScriptRulesContext({
    battlers: [target, active, spec.battler2 ?? empty, spec.battler3 ?? { ...empty, side: 1 }],
    scriptingBattler: 0, atkCancelerTracker: 0, battleOutcome: 0, currentMove: 0,
    currentMovePosition: 0, moveResultFlags: 0, dmgMultiplier: 1, critMultiplier: 1,
    moveEffectByte: 0, missType: 0, hitMarker: 0, multiHitCounter: 0,
    party: {
      player: [member(target.species, target.moves), emptyMember(), emptyMember(), emptyMember(), emptyMember(), emptyMember()],
      opponent: [activeMember, ...(spec.bench ?? []), emptyMember(), emptyMember(), emptyMember(), emptyMember(), emptyMember()].slice(0, 6),
    },
    moveHistory: {
      lastLandedMoves: [0, spec.lastLandedMove ?? 0, 0, 0],
      lastHitBy: [0xff, spec.lastHitBy ?? 0xff, 0xff, 0xff],
    },
    battleTopology: {
      battlersCount: spec.battlersCount ?? 2,
      battleTypeFlags: spec.battleTypeFlags ?? (TRAINER | FACTORY),
      battlerPositions: (spec.battlersCount ?? 2) === 2 ? [0, 1, 0xff, 0xff] : [0, 1, 2, 3],
    },
    monToSwitchIntoId: [6, spec.reservedPartyIndex ?? 6, 6, 6],
    absentBattlerFlags: spec.absentBattlerFlags ?? 0,
  });
  // The canonical context constructor rejects inconsistent DOUBLE/count
  // topology. The policy has its own three-predicate trainer-singles guard,
  // so its directed validation vectors patch that already-canonical context
  // only to isolate one policy predicate at a time.
  if (spec.policyBattleTopology !== undefined) {
    return Object.freeze({
      ...rules,
      battleTopology: Object.freeze({
        ...rules.battleTopology,
        ...spec.policyBattleTopology,
      }),
    });
  }
  return rules;
}
function seedFor(sequence) {
  for (let seed = 0; seed < 1_000_000; seed += 1) {
    let cursor = seed;
    if (sequence.every(({ modulus, remainder }) => {
      cursor = rngModule.advanceRngValue(cursor);
      return (((cursor >>> 16) & 0xffff) % modulus) === remainder;
    })) return seed;
  }
  throw new Error(`no seed for ${JSON.stringify(sequence)}`);
}
function typePair(types) {
  return `[${types.map((type) => TYPES[type]).join(", ")}]`;
}
function rustBattler(value) {
  return `FactoryAiSwitchBattler { species: ${value.species}, ability: ${value.ability}, types: ${typePair(value.types)}, hp: ${value.hp}, max_hp: ${value.maxHP}, moves: [${value.moves.join(", ")}], status1: ${value.status1 >>> 0}, status2: ${value.status2 >>> 0}, status3: ${value.status3 >>> 0}, stat_stages: [${value.statStages.join(", ")}], party_index: ${value.partyIndex}, perish_song_timer: ${value.perishSongTimer} }`;
}
function rustMember(value) {
  return `FactoryAiSwitchPartyMember { species: ${value.species}, is_egg: ${value.isEgg}, ability_num: ${value.abilityNum}, hp: ${value.hp}, moves: [${value.moves.join(", ")}] }`;
}
function rustFallback(value) {
  if (value === undefined) return "None";
  return `Some(BattleAiSwitchDamageFallback { base_damage: ${value.baseDamage}, active_types: ${typePair(value.activeTypes)}, opposing_types: ${typePair(value.opposingTypes)}, opposing_ability: ${value.opposingAbility}, opposing_status2: ${value.opposingStatus2 >>> 0} })`;
}
function rustString(value) {
  return JSON.stringify(value);
}

const cases = [];
function add(label, spec, seed = 0, fallback) {
  const rules = makeRules(spec);
  let expectedJson = null;
  let expectedError = null;
  try {
    expectedJson = JSON.stringify(policy.evaluateFactoryAiSwitchPolicy({ rules, rng: { value: seed >>> 0, calls: 0 }, suitableDamageFallback: fallback }));
  } catch (error) {
    expectedError = String(error instanceof Error ? error.message : error);
  }
  const expectedPrecheckBlocked = policy.isFactoryAiSwitchPrecheckBlocked(rules);
  cases.push({ label, rules, seed: seed >>> 0, fallback, expectedJson, expectedError, expectedPrecheckBlocked });
}
const seq = (...pairs) => seedFor(pairs.map(([modulus, remainder]) => ({ modulus, remainder })));

// All 15 focused vitest instances (the Natural Cure test evaluates two RNG
// paths, retained here as two rows) from tests/factoryAiSwitchPolicy.test.ts.
add("focused_perish_sentinel", {
  target: { species: 200, ability: 26, types: ["TYPE_GHOST", "TYPE_GHOST"] },
  active: { species: 358, ability: 30, types: ["TYPE_NORMAL", "TYPE_FLYING"], status3: PERISH, perishSongTimer: 0 },
  bench: [member(134, [44, 0, 0, 0])],
});
add("focused_wonder_guard", {
  target: { species: 303, ability: 25, types: ["TYPE_BUG", "TYPE_GHOST"] },
  active: { species: 134, ability: 11, types: ["TYPE_WATER", "TYPE_WATER"], moves: [57, 58, 92, 182] },
  bench: [member(4, [33, 45, 10, 53])],
}, seq([3, 1]));
add("focused_absorber", { bench: [member(134, [44, 0, 0, 0]), member(132, [33, 0, 0, 0])], lastLandedMove: 55, lastHitBy: 0 }, seq([2, 1]));
const naturalSpec = {
  target: { species: 47, ability: 27, types: ["TYPE_BUG", "TYPE_GRASS"] },
  active: { species: 358, ability: 30, types: ["TYPE_NORMAL", "TYPE_FLYING"], status1: SLEEP },
  bench: [member(4, [53, 0, 0, 0])], lastLandedMove: 147, lastHitBy: 0,
};
add("focused_natural_status_success", naturalSpec, seq([2, 1]));
add("focused_natural_status_then_final", naturalSpec, seq([2, 0], [2, 1]));
add("focused_natural_defensive_mod_one", {
  target: { species: 76, ability: 69, types: ["TYPE_ROCK", "TYPE_GROUND"] },
  active: { species: 358, ability: 30, types: ["TYPE_NORMAL", "TYPE_FLYING"], status1: SLEEP },
  bench: [member(18, [57, 0, 0, 0])], lastLandedMove: 89, lastHitBy: 0,
}, seq([1, 0]));
add("focused_active_se_scan", {
  target: { species: 6, ability: 66, types: ["TYPE_FIRE", "TYPE_FLYING"] },
  active: { species: 134, ability: 11, types: ["TYPE_WATER", "TYPE_WATER"], moves: [57, 55, 0, 0] },
  bench: [member(132, [33, 0, 0, 0])],
}, seq([3, 1], [10, 0], [10, 1]));
add("focused_immunity_second_candidate", {
  target: { species: 76, ability: 69, types: ["TYPE_ROCK", "TYPE_GROUND"] },
  bench: [member(18, [57, 0, 0, 0]), member(18, [57, 0, 0, 0])], lastLandedMove: 89, lastHitBy: 0,
}, seq([2, 1], [2, 0]));
add("focused_immunity_then_nve", {
  target: { species: 76, ability: 69, types: ["TYPE_ROCK", "TYPE_GROUND"] },
  active: { species: 135, ability: 10, types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"] },
  bench: [member(76, [57, 0, 0, 0]), member(45, [57, 0, 0, 0])], lastLandedMove: 85, lastHitBy: 0,
}, seq([2, 1], [3, 0]));
for (const [name, patch] of [
  ["wrapped", { active: { species: 26, ability: 9, types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"], status2: WRAPPED } }],
  ["rooted", { active: { species: 26, ability: 9, types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"], status3: ROOTED } }],
  ["shadow_tag", { target: { species: 9, ability: 23, types: ["TYPE_WATER", "TYPE_WATER"] } }],
  ["arena_trap_flying", { target: { species: 9, ability: 71, types: ["TYPE_WATER", "TYPE_WATER"] }, active: { species: 18, ability: 51, types: ["TYPE_NORMAL", "TYPE_FLYING"] } }],
  ["magnet_pull_steel", { active: { species: 81, ability: 42, types: ["TYPE_ELECTRIC", "TYPE_STEEL"] }, target: { species: 9, ability: 42, types: ["TYPE_WATER", "TYPE_WATER"] } }],
  ["battle_arena", { battleTypeFlags: TRAINER | FACTORY | ARENA }],
]) add(`focused_gate_${name}`, { ...patch, bench: [member(132, [33, 0, 0, 0])] });
add("focused_stats_raised", { active: { species: 26, ability: 9, types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"], statStages: [6, 8, 8, 2, 6, 6, 6, 6] }, bench: [member(132, [33, 0, 0, 0])] });

// Missing draw/branch surface plus exact R13-D policy receipts.
add("directed_natural_cure_early", { ...naturalSpec, lastLandedMove: 0 }, seq([2, 1]));
add("directed_first_legal_fallback", { active: { species: 358, ability: 30, types: ["TYPE_NORMAL", "TYPE_FLYING"], status3: PERISH }, bench: [member(132, [0, 0, 0, 0])] });
add("directed_reserved_only_is_unavailable", { bench: [member(132, [33, 0, 0, 0])], reservedPartyIndex: 1 });
add("directed_wonder_guard_scan_keeps_reserved", {
  target: { species: 303, ability: 25, types: ["TYPE_BUG", "TYPE_GHOST"] },
  active: { species: 134, ability: 11, types: ["TYPE_WATER", "TYPE_WATER"], moves: [57, 58, 92, 182] },
  bench: [member(4, [53, 0, 0, 0]), member(132, [150, 0, 0, 0])], reservedPartyIndex: 1,
}, seq([3, 0]));
add("directed_absorber_scan_excludes_reserved", {
  bench: [member(134, [44, 0, 0, 0]), member(132, [150, 0, 0, 0])],
  reservedPartyIndex: 1, lastLandedMove: 55, lastHitBy: 0,
});
add("validation_non_trainer", { bench: [member(132, [33, 0, 0, 0])], battleTypeFlags: FACTORY });
add("validation_double", {
  bench: [member(132, [33, 0, 0, 0])],
  policyBattleTopology: { battleTypeFlags: TRAINER | FACTORY | DOUBLE },
});
add("validation_trainer_singles_flags_battlers_count_four", {
  bench: [member(132, [33, 0, 0, 0])],
  battlersCount: 4,
  battleTypeFlags: TRAINER | FACTORY | DOUBLE,
  policyBattleTopology: { battleTypeFlags: TRAINER | FACTORY },
});
const absorberReceipt = { bench: [member(134, [129, 129, 129, 129]), member(132, [150, 150, 150, 150])], lastLandedMove: 55, lastHitBy: 0 };
add("r13d_absorber_success", absorberReceipt, 0xf69f135c);
add("r13d_absorber_even_control", absorberReceipt, 0xde17efe2);
const wgReceipt = { target: { species: 303, ability: 25, types: ["TYPE_BUG", "TYPE_GHOST"] }, active: { species: 134, ability: 11, types: ["TYPE_WATER", "TYPE_WATER"], moves: [57, 58, 92, 182] }, bench: [member(4, [33, 45, 108, 53]), member(132, [150, 150, 150, 150])] };
add("r13d_wonder_guard_success", wgReceipt, 0xcb7bc739);
add("r13d_wonder_guard_result2_control", wgReceipt, 0x5457c42e);
add("r13d_wonder_guard_party_move_order", {
  ...wgReceipt,
  bench: [member(4, [53, 53, 0, 0]), member(4, [53, 53, 0, 0])],
}, 0x5457c42e);
add("r13d_natural_cure_success", naturalSpec, 0xf69f135c);
add("r13d_natural_cure_even_final_odd", naturalSpec, 0xde17efe2);
add("directed_suitable_custom_fallback", { active: { species: 358, ability: 30, types: ["TYPE_NORMAL", "TYPE_FLYING"], status3: PERISH }, bench: [member(16, [33, 0, 0, 0]), member(66, [33, 0, 0, 0])] }, 0, { baseDamage: 200, activeTypes: ["TYPE_WATER", "TYPE_WATER"], opposingTypes: ["TYPE_NORMAL", "TYPE_NORMAL"], opposingAbility: 0, opposingStatus2: 0 });

// Fixed 384-case cross-product sweep. The data choices are independent of
// policy outputs; only canonical TS computes expected choices and traces.
const targets = [
  { species: 9, ability: 67, types: ["TYPE_WATER", "TYPE_WATER"] },
  { species: 303, ability: 25, types: ["TYPE_BUG", "TYPE_GHOST"] },
  { species: 76, ability: 69, types: ["TYPE_ROCK", "TYPE_GROUND"] },
  { species: 6, ability: 66, types: ["TYPE_FIRE", "TYPE_FLYING"] },
];
const actives = [
  { species: 26, ability: 9, types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"], moves: [33, 0, 0, 0] },
  { species: 134, ability: 11, types: ["TYPE_WATER", "TYPE_WATER"], moves: [57, 55, 92, 182] },
  { species: 358, ability: 30, types: ["TYPE_NORMAL", "TYPE_FLYING"], moves: [44, 0, 0, 0] },
];
const benchPool = [
  member(4, [33, 45, 10, 53]), member(18, [57, 0, 0, 0]),
  member(76, [57, 0, 0, 0]), member(134, [44, 0, 0, 0]),
  member(135, [85, 0, 0, 0]), member(132, [150, 0, 0, 0]),
];
const lastMoves = [0, 55, 53, 85, 89, 147, 0xffff];
for (let i = 0; i < 384; i += 1) {
  const active = { ...actives[i % actives.length] };
  if (i % 11 === 0) active.status1 = SLEEP;
  if (i % 37 === 0) { active.status3 = PERISH; active.perishSongTimer = 0; }
  if (i % 41 === 0) active.statStages = [6, 8, 8, 6, 6, 6, 6, 6];
  const first = { ...benchPool[(i * 5 + 1) % benchPool.length] };
  const second = { ...benchPool[(i * 7 + 2) % benchPool.length] };
  if (i % 13 === 0) first.hp = 0;
  if (i % 29 === 0) second.isEgg = true;
  const spec = {
    target: targets[(i * 7) % targets.length], active, bench: [first, second],
    lastLandedMove: lastMoves[(i * 3) % lastMoves.length], lastHitBy: i % 5 === 0 ? 0xff : 0,
    reservedPartyIndex: i % 17 === 0 ? 1 : 6,
    absentBattlerFlags: i % 31 === 0 ? 1 : 0,
  };
  if (i % 43 === 0) spec.active = { ...active, status2: WRAPPED };
  add(`sweep_${String(i).padStart(3, "0")}`, spec, Math.imul(i + 1, 0x9e3779b1) >>> 0,
    i % 19 === 0 ? { baseDamage: (i * 37) % 400, activeTypes: active.types, opposingTypes: spec.target.types, opposingAbility: spec.target.ability, opposingStatus2: 0 } : undefined);
}

const rows = cases.map((entry) => {
  const rules = entry.rules;
  const expectedJson = entry.expectedJson === null ? "None" : `Some(${rustString(entry.expectedJson)})`;
  const expectedError = entry.expectedError === null ? "None" : `Some(${rustString(entry.expectedError)})`;
  return `    FactoryAiSwitchPolicyCase { label: ${rustString(entry.label)}, input: FactoryAiSwitchPolicyInput { rules: FactoryAiSwitchRules { battlers: [${rules.battlers.map(rustBattler).join(", ")}], opponent_party: [${rules.party.opponent.map(rustMember).join(", ")}], last_landed_move: ${rules.moveHistory.lastLandedMoves[1]}, last_hit_by: ${rules.moveHistory.lastHitBy[1]}, reserved_party_index: ${rules.monToSwitchIntoId[1]}, absent_battler_flags: ${rules.absentBattlerFlags}, battlers_count: ${rules.battleTopology.battlersCount}, battle_type_flags: ${rules.battleTopology.battleTypeFlags >>> 0} }, rng: BattleRngState { value: ${entry.seed}, calls: 0 }, suitable_damage_fallback: ${rustFallback(entry.fallback)} }, expected_json: ${expectedJson}, expected_error: ${expectedError}, expected_precheck_blocked: ${entry.expectedPrecheckBlocked} },`;
}).join("\n");

const rust = `// GENERATED by core-rs/tools/gen-factory-ai-switch-policy-vectors.mjs. Do not edit.\n\
use crate::battle_ai_switch_into::BattleAiSwitchDamageFallback;\n\
use crate::factory_ai_check_bad_move::BattleRngState;\n\
use crate::factory_ai_switch_policy::{FactoryAiSwitchBattler, FactoryAiSwitchPartyMember, FactoryAiSwitchPolicyInput, FactoryAiSwitchRules};\n\
#[derive(Debug, Clone, Copy)]\n\
pub struct FactoryAiSwitchPolicyCase {\n\
    pub label: &'static str,\n\
    pub input: FactoryAiSwitchPolicyInput,\n\
    pub expected_json: Option<&'static str>,\n\
    pub expected_error: Option<&'static str>,\n\
    pub expected_precheck_blocked: bool,\n\
}\n\
pub static FACTORY_AI_SWITCH_POLICY_CASES: [FactoryAiSwitchPolicyCase; ${cases.length}] = [\n${rows}\n];\n`;
fs.writeFileSync(outPath, rust);
const toolchain = path.join(process.env.HOME ?? "", ".rustup", "toolchains", "stable-aarch64-apple-darwin", "bin");
execFileSync(path.join(toolchain, "rustfmt"), ["--edition", "2021", outPath], { stdio: "inherit" });
console.log(`gen-factory-ai-switch-policy-vectors: wrote ${path.relative(workspaceRoot, outPath)} (${cases.length} cases)`);
