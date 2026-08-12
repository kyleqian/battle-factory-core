#!/usr/bin/env node
// Codegen for core-rs/crates/factory-core/src/factory_ai_check_bad_move_vectors_gen.rs.
//
// Computes every expected value by EXECUTING the real
// src/engine/factoryAiCheckBadMove.ts's `runCheckBadMovePreamble` (read-only
// import, node --experimental-strip-types — the gen-turn-vectors.mjs
// precedent). No value in the emitted file is hand-computed. Deterministic:
// a fixed directed case list plus a sweep seeded from a fixed GbaRng stream,
// not Math.random/Date.now, so reruns are byte-identical.
//
// Scope: M5b-0 only (docs/rust-m5b-checkbadmove-batching.md) — the universal
// preamble (setup, isMovePowerOther classification, FISSURE/HORN_DRILL,
// type-immunity, the five ability-negation branches, Soundproof). Every case
// here uses a move whose effect is NOT one of the 109 `if_effect` table
// entries (or short-circuits before the dispatch chain via type-immunity/
// ability-negation/Soundproof) -- moves table effects are deliberately
// EXCLUDED: the real, imported src/engine/factoryAiCheckBadMove.ts is
// 109/109 ported (docs/rust-m5b-checkbadmove-batching.md's scout, verified
// live below) and calls its own real per-effect handler for any table-effect
// move that reaches the dispatch chain, so `runCheckBadMovePreamble`'s
// output for such a move reflects handler logic this Rust step does not
// port -- there is no way to TS-generate a vector for the Rust port's own
// `NotYetPorted` barrier (a still-open effect only exists on the Rust side
// at this step). Barrier coverage is native-hand-test-only in
// factory_ai_check_bad_move.rs, mirroring how the TS test suite's own
// `assertGenericCbmBarrierFires` is a self-referential completeness probe,
// not a cross-engine comparison.
//
// Usage: node core-rs/tools/gen-cbm-preamble-vectors.mjs   (from any cwd)

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url)); // core-rs/tools
const workspaceRoot = path.resolve(scriptDir, "..", ".."); // two dirs up
const outPath = path.join(
  scriptDir,
  "..",
  "crates",
  "factory-core",
  "src",
  "factory_ai_check_bad_move_vectors_gen.rs",
);

const cbm = await import(path.join(workspaceRoot, "src", "engine", "factoryAiCheckBadMove.ts"));
const { runCheckBadMovePreamble, unportedCheckBadMoveTableEffects, AI_CHECK_BAD_MOVE_TABLE_EFFECTS } = cbm;
const { GbaRng } = await import(path.join(workspaceRoot, "src", "engine", "rng.ts"));

// Verify live (not from doc prose) that TS really has zero unported table
// effects -- the premise the module doc comment above relies on to justify
// excluding table-effect moves from this generator entirely.
if (unportedCheckBadMoveTableEffects().length !== 0) {
  throw new Error(
    "gen-cbm-preamble-vectors: expected src/engine/factoryAiCheckBadMove.ts to be 109/109 ported " +
      "(this script's whole premise for excluding table-effect moves)",
  );
}
const TABLE_EFFECTS = new Set(AI_CHECK_BAD_MOVE_TABLE_EFFECTS);

// --- ability ids: same source gen_tables::SpeciesRow.abilities uses
// (src/data/gen/ability-item-hooks.json .universes.abilities). ---
const abilityItemHooks = JSON.parse(
  fs.readFileSync(path.join(workspaceRoot, "src", "data", "gen", "ability-item-hooks.json"), "utf8"),
);
const abilityIdByName = new Map(abilityItemHooks.universes.abilities.map((a) => [a.name, a.id]));
function abilityId(name) {
  if (name === null || name === undefined) return null;
  if (!abilityIdByName.has(name)) throw new Error(`gen-cbm-preamble-vectors: unknown ability ${name}`);
  return abilityIdByName.get(name);
}

// --- type ids: same table damageCalc.ts / damage_calc.rs use. ---
const TYPE_IDS = {
  TYPE_NORMAL: 0, TYPE_FIGHTING: 1, TYPE_FLYING: 2, TYPE_POISON: 3, TYPE_GROUND: 4,
  TYPE_ROCK: 5, TYPE_BUG: 6, TYPE_GHOST: 7, TYPE_STEEL: 8, TYPE_MYSTERY: 9,
  TYPE_FIRE: 10, TYPE_WATER: 11, TYPE_GRASS: 12, TYPE_ELECTRIC: 13, TYPE_PSYCHIC: 14,
  TYPE_ICE: 15, TYPE_DRAGON: 16, TYPE_DARK: 17,
};

const scoredCases = [];

function target(species, types, knownAbilityName, realAbilityName) {
  return {
    species,
    types,
    knownAbility: knownAbilityName,
    realAbility: realAbilityName,
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
  };
}

const NEUTRAL_ATTACKER = { atkStage: 6, defStage: 6 };

function drawSite(reason) {
  if (reason.endsWith("-negates-type")) return 0;
  if (reason.endsWith("-soundproof")) return 1;
  throw new Error(`gen-cbm-preamble-vectors: unrecognized draw reason ${reason}`);
}

function pushCase(label, moveId, t, rngValue) {
  const result = runCheckBadMovePreamble({
    rng: { value: rngValue, calls: 0 },
    moveId,
    target: t,
    attacker: NEUTRAL_ATTACKER,
    drawOrdinalStart: 1,
    reasonPrefix: "vec",
  });
  if (result.kind !== "scored") {
    // See the module doc comment: every case here is chosen to short-circuit
    // (type-immunity/ability-negation/Soundproof) or use a non-table effect,
    // so the real (109/109-ported) TS engine never reaches a handler and
    // always returns "scored". A "unsupported-branch" result here means a
    // case was miscategorized.
    throw new Error(`gen-cbm-preamble-vectors: case ${label} unexpectedly hit TS's own barrier (effect ${result.effect})`);
  }
  if (result.draws.length > 2) {
    throw new Error(`gen-cbm-preamble-vectors: case ${label} produced ${result.draws.length} draws, expected <=2`);
  }
  const known = abilityId(t.knownAbility);
  const draws = result.draws.map((d) => ({
    ordinal: d.ordinal,
    site: drawSite(d.reason),
    beforeValue: d.before.value,
    beforeCalls: d.before.calls,
    afterValue: d.after.value,
    afterCalls: d.after.calls,
    rawRngValue: d.rawRngValue,
    randomValue: d.randomValue,
    guessedAbility: abilityId(d.guessedAbility),
  }));
  while (draws.length < 2) {
    draws.push({
      ordinal: 0, site: 0, beforeValue: 0, beforeCalls: 0, afterValue: 0, afterCalls: 0,
      rawRngValue: 0, randomValue: 0, guessedAbility: 0,
    });
  }
  scoredCases.push({
    label,
    moveId,
    rngValue,
    species: t.species,
    types: [TYPE_IDS[t.types[0]], TYPE_IDS[t.types[1]]],
    hasKnownAbility: known !== null,
    knownAbility: known ?? 0,
    realAbility: abilityId(t.realAbility),
    expectedRngValue: result.rng.value,
    expectedRngCalls: result.rng.calls,
    expectedDrawCount: result.draws.length,
    draws,
    expectedScoreDelta: result.scoreDelta,
  });
}

// === directed cases (tests/factoryAiCheckBadMove.test.ts:1554-1716) =========

const MAROWAK = target(105, ["TYPE_GROUND", "TYPE_GROUND"], null, "ABILITY_ROCK_HEAD");
const RNG_SEED = 249_678_687; // tests/factoryAiCheckBadMove.test.ts:1541

pushCase("ts_test_1555_type_immune", 85 /* THUNDERBOLT */, MAROWAK, RNG_SEED);
for (const [label, moveId] of [["surf", 57], ["rock_slide", 157], ["body_slam", 34]]) {
  pushCase(`ts_test_1563_no_table_entry_${label}`, moveId, MAROWAK, RNG_SEED);
}
pushCase(
  "ts_test_1595_known_ability_skips_draw",
  57,
  target(105, ["TYPE_GROUND", "TYPE_GROUND"], "ABILITY_ROCK_HEAD", "ABILITY_ROCK_HEAD"),
  RNG_SEED,
);
pushCase(
  "ts_test_1603_trapper_no_draw",
  57,
  target(25, ["TYPE_ELECTRIC", "TYPE_ELECTRIC"], null, "ABILITY_SHADOW_TAG"),
  RNG_SEED,
);
pushCase(
  "ts_test_1620_volt_absorb_minus12",
  85,
  target(171, ["TYPE_GRASS", "TYPE_GRASS"], "ABILITY_VOLT_ABSORB", "ABILITY_VOLT_ABSORB"),
  RNG_SEED,
);
pushCase(
  "ts_test_1635_water_absorb_no_negate",
  85,
  target(171, ["TYPE_GRASS", "TYPE_GRASS"], "ABILITY_WATER_ABSORB", "ABILITY_WATER_ABSORB"),
  RNG_SEED,
);
pushCase(
  "ts_test_1652_wonder_guard_minus10",
  34,
  target(386, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_WONDER_GUARD", "ABILITY_WONDER_GUARD"),
  RNG_SEED,
);
pushCase(
  "ts_test_1667_soundproof_minus10",
  173,
  target(1, ["TYPE_NORMAL", "TYPE_NORMAL"], "ABILITY_SOUNDPROOF", "ABILITY_SOUNDPROOF"),
  RNG_SEED,
);
pushCase(
  "fissure_short_circuit_vs_flying_immune",
  90 /* MOVE_FISSURE */,
  target(213, ["TYPE_FLYING", "TYPE_FLYING"], "ABILITY_STURDY", "ABILITY_STURDY"),
  RNG_SEED,
);
pushCase(
  "horn_drill_short_circuit_vs_ghost_immune",
  32 /* MOVE_HORN_DRILL */,
  target(213, ["TYPE_GHOST", "TYPE_GHOST"], "ABILITY_STURDY", "ABILITY_STURDY"),
  RNG_SEED,
);

// === seeded sweep: genuine (unknown-ability) draws across real two-ability
// species, exercising next_get_ability_draw's RNG-advancing path end to end
// against the real engine. Moves are restricted to non-table effects (see
// the module doc comment) so every case stays within this step's ported
// scope regardless of which ability gets drawn. ===

const TWO_ABILITY_SPECIES = [
  { id: 105, real: "ABILITY_ROCK_HEAD" }, // MAROWAK: Rock Head / Lightning Rod
  { id: 171, real: "ABILITY_VOLT_ABSORB" }, // LANTURN: Volt Absorb / Illuminate
  { id: 58, real: "ABILITY_INTIMIDATE" }, // GROWLITHE: Intimidate / Flash Fire
  { id: 60, real: "ABILITY_WATER_ABSORB" }, // POLIWAG: Water Absorb / Damp
];
const SWEEP_MOVES = [
  57, // MOVE_SURF (Water, EFFECT_HIT, no table entry)
  85, // MOVE_THUNDERBOLT (Electric, EFFECT_PARALYZE_HIT, no table entry)
  52, // MOVE_EMBER (Fire, EFFECT_BURN_HIT, no table entry)
];
for (const moveId of SWEEP_MOVES) {
  const move = cbm.MOVES_BY_ID.get(moveId);
  if (TABLE_EFFECTS.has(move.effect)) {
    throw new Error(`gen-cbm-preamble-vectors: sweep move ${moveId} has table effect ${move.effect}`);
  }
}

const rngStream = new GbaRng(0x1234_5678);
let sweepCount = 0;
for (const species of TWO_ABILITY_SPECIES) {
  for (const moveId of SWEEP_MOVES) {
    for (let i = 0; i < 3; i += 1) {
      // Advance the stream and feed its raw gRngValue in as this case's
      // seed -- a deterministic, non-hand-picked sequence of rng values.
      rngStream.next();
      const seed = rngStream.rngValue;
      const t = target(species.id, ["TYPE_NORMAL", "TYPE_NORMAL"], null, species.real);
      pushCase(`sweep_species${species.id}_move${moveId}_i${i}`, moveId, t, seed);
      sweepCount += 1;
    }
  }
}

// === emit Rust source ========================================================

function drawCaseLiteral(d) {
  return `CbmPreambleDrawCase { ordinal: ${d.ordinal}, site: ${d.site}, before_value: ${d.beforeValue}, before_calls: ${d.beforeCalls}, after_value: ${d.afterValue}, after_calls: ${d.afterCalls}, raw_rng_value: ${d.rawRngValue}, random_value: ${d.randomValue}, guessed_ability: ${d.guessedAbility} }`;
}

const lines = [];
lines.push(
  "// GENERATED by core-rs/tools/gen-cbm-preamble-vectors.mjs — regenerate: node core-rs/tools/gen-cbm-preamble-vectors.mjs.",
);
lines.push("// Source: executing src/engine/factoryAiCheckBadMove.ts's runCheckBadMovePreamble");
lines.push("// (the TS engine is the spec) via node --experimental-strip-types. Do not hand-edit.");
lines.push("");

lines.push("/// One `next_get_ability_draw` call recorded inside a scored case.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CbmPreambleDrawCase {");
lines.push("    pub ordinal: u32,");
lines.push("    /// 0 = negates-type, 1 = soundproof.");
lines.push("    pub site: u8,");
lines.push("    pub before_value: u32,");
lines.push("    pub before_calls: u32,");
lines.push("    pub after_value: u32,");
lines.push("    pub after_calls: u32,");
lines.push("    pub raw_rng_value: u32,");
lines.push("    pub random_value: u16,");
lines.push("    pub guessed_ability: u16,");
lines.push("}");
lines.push("");

lines.push("/// One `run_check_bad_move_preamble` case that reached `CheckBadMoveResult::Scored`.");
lines.push("#[derive(Debug, Clone, Copy, PartialEq, Eq)]");
lines.push("pub struct CbmPreambleScoredCase {");
lines.push("    pub move_id: u16,");
lines.push("    pub rng_value: u32,");
lines.push("    pub species: u16,");
lines.push("    pub types: [u8; 2],");
lines.push("    pub known_ability: Option<u16>,");
lines.push("    pub real_ability: u16,");
lines.push("    pub expected_rng_value: u32,");
lines.push("    pub expected_rng_calls: u32,");
lines.push("    pub expected_draw_count: u8,");
lines.push("    pub draws: [CbmPreambleDrawCase; 2],");
lines.push("    pub expected_score_delta: i32,");
lines.push("}");
lines.push(`pub static CBM_PREAMBLE_SCORED_CASES: [CbmPreambleScoredCase; ${scoredCases.length}] = [`);
for (const c of scoredCases) {
  const known = c.hasKnownAbility ? `Some(${c.knownAbility})` : "None";
  lines.push(
    `    // ${c.label}\n    CbmPreambleScoredCase { move_id: ${c.moveId}, rng_value: ${c.rngValue}, species: ${c.species}, types: [${c.types[0]}, ${c.types[1]}], known_ability: ${known}, real_ability: ${c.realAbility}, expected_rng_value: ${c.expectedRngValue}, expected_rng_calls: ${c.expectedRngCalls}, expected_draw_count: ${c.expectedDrawCount}, draws: [${drawCaseLiteral(c.draws[0])}, ${drawCaseLiteral(c.draws[1])}], expected_score_delta: ${c.expectedScoreDelta} },`,
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
  throw new Error("gen-cbm-preamble-vectors: could not find rustfmt (looked in the rustup stable toolchain and PATH)");
}

console.log(`gen-cbm-preamble-vectors: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-cbm-preamble-vectors: ${scoredCases.length} scored cases (${sweepCount} from the sweep)`);
