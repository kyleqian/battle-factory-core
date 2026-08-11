#!/usr/bin/env node
// Codegen for core-rs/crates/factory-core/src/gen_tables.rs.
//
// Reads the workspace's src/data/gen/*.json tables (dev-time extraction
// from reference/pokeemerald — see each JSON's own `source`/`anchors`
// fields) and emits a checked-in, deterministic Rust source file: the
// minimal fields the Battle Factory initial-rental port needs, nothing
// unused fields carried along for their own sake.
//
// Deterministic by construction: no Date/random, straight iteration over
// the JSON arrays in file order. Rerun after any src/data/gen/*.json
// change and commit the diff — `gen_tables.rs` is never hand-edited.
//
// Usage: node core-rs/tools/gen-data.mjs   (from any cwd)

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url)); // core-rs/tools
const workspaceRoot = path.resolve(scriptDir, "..", ".."); // two dirs up
const dataDir = path.join(workspaceRoot, "src", "data", "gen");
const outPath = path.join(
  scriptDir,
  "..",
  "crates",
  "factory-core",
  "src",
  "gen_tables.rs",
);

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
}

function requireLookup(map, key, what) {
  if (!map.has(key)) {
    throw new Error(`gen-data: unknown ${what} ${JSON.stringify(key)}`);
  }
  return map.get(key);
}

const frontierMons = readJson("battle-frontier-mons.json").entries;
const heldItems = readJson("battle-frontier-held-items.json").entries;
const speciesStats = readJson("species-stats.json").species;
const natures = readJson("natures.json").natures;
const abilityItemHooks = readJson("ability-item-hooks.json");
const abilities = abilityItemHooks.universes.abilities;
const holdEffects = abilityItemHooks.universes.holdEffects;
const moves = readJson("moves.json").moves;
const expTables = readJson("exp-tables.json");
const policy = readJson("factory-round-policy.json").rentalSelection;

const speciesIdByName = new Map(speciesStats.map((s) => [s.name, s.id]));
const speciesByName = new Map(speciesStats.map((s) => [s.name, s]));
const natureIndexByName = new Map(natures.map((n) => [n.name, n.index]));
const abilityIdByName = new Map(abilities.map((a) => [a.name, a.id]));
const holdEffectIdByName = new Map(holdEffects.map((h) => [h.name, h.id]));
const moveIdByName = new Map(moves.map((m) => [m.move, m.id]));

// --- EV_SPREAD bit order (`F_EV_SPREAD_*`, battle_frontier.h): the bit
// assignment `FrontierMonRow.ev_flags` and `derive_evs` both use. ---
const EV_FLAG_BITS = {
  F_EV_SPREAD_HP: 1 << 0,
  F_EV_SPREAD_ATTACK: 1 << 1,
  F_EV_SPREAD_DEFENSE: 1 << 2,
  F_EV_SPREAD_SPEED: 1 << 3,
  F_EV_SPREAD_SP_ATTACK: 1 << 4,
  F_EV_SPREAD_SP_DEFENSE: 1 << 5,
};
function evFlagsFor(row) {
  let mask = 0;
  for (const flag of row.evSpreadStats) {
    if (EV_FLAG_BITS[flag] === undefined) {
      throw new Error(`gen-data: battle-frontier-mons.json entries[${row.index}] has unknown EV flag ${flag}`);
    }
    mask |= EV_FLAG_BITS[flag];
  }
  return mask;
}

// --- FRONTIER_MONS: 882 rows indexed by set id ---
if (frontierMons.length !== 882) {
  throw new Error(
    `gen-data: expected 882 battle-frontier-mons.json entries, got ${frontierMons.length}`,
  );
}
frontierMons.forEach((row, i) => {
  if (row.index !== i) {
    throw new Error(
      `gen-data: battle-frontier-mons.json entries[${i}].index === ${row.index}, expected ${i} (row order must match set id)`,
    );
  }
});
const frontierMonRows = frontierMons.map((row) => ({
  speciesId: requireLookup(speciesIdByName, row.species, "species"),
  itemTableId: row.itemTableId,
  nature: requireLookup(natureIndexByName, row.nature, "nature"),
  moves: row.moves.map((name) => requireLookup(moveIdByName, name, "move")),
  evFlags: evFlagsFor(row),
}));

// --- SPECIES_UNOWN_ID ---
const speciesUnownId = requireLookup(speciesIdByName, "SPECIES_UNOWN", "species");

// --- HELD_ITEM_BY_TABLE_ID: dense itemTableId -> itemId ---
if (heldItems.length !== 63) {
  throw new Error(
    `gen-data: expected 63 battle-frontier-held-items.json entries, got ${heldItems.length}`,
  );
}
const heldItemByTableId = new Array(heldItems.length).fill(undefined);
const heldItemHoldEffectByTableId = new Array(heldItems.length).fill(undefined);
const heldItemHoldEffectParamByTableId = new Array(heldItems.length).fill(undefined);
for (const row of heldItems) {
  if (row.itemTableId < 0 || row.itemTableId >= heldItems.length) {
    throw new Error(
      `gen-data: itemTableId ${row.itemTableId} is outside the dense 0..${heldItems.length - 1} range`,
    );
  }
  if (heldItemByTableId[row.itemTableId] !== undefined) {
    throw new Error(`gen-data: duplicate itemTableId ${row.itemTableId} in battle-frontier-held-items.json`);
  }
  heldItemByTableId[row.itemTableId] = row.itemId;
  heldItemHoldEffectByTableId[row.itemTableId] = requireLookup(holdEffectIdByName, row.holdEffect, "hold effect");
  heldItemHoldEffectParamByTableId[row.itemTableId] = row.holdEffectParam;
}

// --- SPECIES_SECOND_ABILITY: (species_id, second_ability_id) sorted pairs ---
if (speciesStats.length !== 411) {
  throw new Error(`gen-data: expected 411 species-stats.json rows, got ${speciesStats.length}`);
}
const speciesSecondAbility = speciesStats
  .map((s) => ({
    speciesId: s.id,
    secondAbilityId: requireLookup(abilityIdByName, s.abilities[1], "ability"),
  }))
  .sort((a, b) => a.speciesId - b.speciesId);

// --- NUM_NATURES ---
if (natures.length !== 25) {
  throw new Error(`gen-data: expected 25 natures.json entries, got ${natures.length}`);
}
natures.forEach((row, i) => {
  if (row.index !== i) {
    throw new Error(`gen-data: natures.json natures[${i}].index === ${row.index}, expected ${i}`);
  }
});

// --- NATURE_MODIFIERS: indexed by nature index (validated dense above) ---
const natureModifierRows = natures.map((n) => ({
  attack: n.attack,
  defense: n.defense,
  speed: n.speed,
  spAttack: n.spAttack,
  spDefense: n.spDefense,
}));

// --- MOVE_PP: dense move id -> base PP, indexed by moves.json id ---
if (moves.length !== 355) {
  throw new Error(`gen-data: expected 355 moves.json rows, got ${moves.length}`);
}
moves.forEach((row, i) => {
  if (row.id !== i) {
    throw new Error(`gen-data: moves.json moves[${i}].id === ${row.id}, expected ${i} (row order must match move id)`);
  }
});
const movePp = moves.map((row) => row.pp);

// --- SPECIES: one row per species referenced by a frontier set, sorted by
// species id. Scoped to the frontier corpus (not all 411 species-stats.json
// rows) because 25 unused SPECIES_OLD_UNOWN_* duplicates carry no
// exp-tables.json growth-rate entry and are never a frontier set's species
// (verified below) — this port's mon construction never looks up any
// species outside this corpus, so the exp_at_50 completeness check only
// needs to hold over it. ---
const referencedSpeciesNames = [...new Set(frontierMons.map((row) => row.species))].sort(
  (a, b) => requireLookup(speciesIdByName, a, "species") - requireLookup(speciesIdByName, b, "species"),
);
const speciesRows = referencedSpeciesNames.map((name) => {
  const s = requireLookup(speciesByName, name, "species");
  const growthRate = expTables.speciesGrowthRate[name];
  const expAt50 = growthRate === undefined ? undefined : expTables.growthRates[growthRate]?.[50];
  if (expAt50 === undefined) {
    throw new Error(`gen-data: species ${name} has no Level-50 experience entry in exp-tables.json`);
  }
  return {
    speciesId: s.id,
    baseHp: s.baseHp,
    baseAttack: s.baseAttack,
    baseDefense: s.baseDefense,
    baseSpeed: s.baseSpeed,
    baseSpAttack: s.baseSpAttack,
    baseSpDefense: s.baseSpDefense,
    genderRatio: s.genderRatio,
    ability0: requireLookup(abilityIdByName, s.abilities[0], "ability"),
    ability1: requireLookup(abilityIdByName, s.abilities[1], "ability"),
    expAt50,
  };
});

// --- RENTAL_RANGES_LEVEL50 / RENTAL_RANK_THRESHOLDS / MAXIMUM_RENTAL_RANK / FIXED_IVS ---
const level50Ranges = policy.ranges.level50;
if (level50Ranges.length !== 8) {
  throw new Error(`gen-data: expected 8 level50 rental ranges, got ${level50Ranges.length}`);
}
const fixedIvs = policy.fixedIvs;
if (fixedIvs.length !== 8) {
  throw new Error(`gen-data: expected 8 fixed IV rows, got ${fixedIvs.length}`);
}
const rentalRankThresholds = policy.rentalRankThresholds;
const maximumRentalRank = policy.maximumRentalRank;

// --- emit Rust source ---
function emitStructArray(name, typeName, elemLen, rows) {
  const items = rows.map((row) => `    ${typeName} ${row},`).join("\n");
  return `pub const ${name}: [${typeName}; ${elemLen}] = [\n${items}\n];`;
}

const frontierMonsLines = frontierMonRows
  .map(
    (row) =>
      `    FrontierMonRow { species_id: ${row.speciesId}, item_table_id: ${row.itemTableId}, nature: ${row.nature}, moves: [${row.moves.join(", ")}], ev_flags: ${row.evFlags} },`,
  )
  .join("\n");

const heldItemByTableIdLines = heldItemByTableId.join(", ");
const heldItemHoldEffectByTableIdLines = heldItemHoldEffectByTableId.join(", ");
const heldItemHoldEffectParamByTableIdLines = heldItemHoldEffectParamByTableId.join(", ");

const speciesSecondAbilityLines = speciesSecondAbility
  .map((row) => `    (${row.speciesId}, ${row.secondAbilityId}),`)
  .join("\n");

const movePpLines = movePp.join(", ");

const speciesRowsLines = speciesRows
  .map(
    (row) =>
      `    SpeciesRow { species_id: ${row.speciesId}, base_hp: ${row.baseHp}, base_attack: ${row.baseAttack}, base_defense: ${row.baseDefense}, base_speed: ${row.baseSpeed}, base_sp_attack: ${row.baseSpAttack}, base_sp_defense: ${row.baseSpDefense}, gender_ratio: ${row.genderRatio}, abilities: [${row.ability0}, ${row.ability1}], exp_at_50: ${row.expAt50} },`,
  )
  .join("\n");

const natureModifiersLines = natureModifierRows
  .map(
    (row) =>
      `    NatureModifierRow { attack: ${row.attack}, defense: ${row.defense}, speed: ${row.speed}, sp_attack: ${row.spAttack}, sp_defense: ${row.spDefense} },`,
  )
  .join("\n");

const rentalRangesLines = level50Ranges
  .map((row) => `    RentalRange { start: ${row.start}, end: ${row.end} },`)
  .join("\n");

const fixedIvsLines = fixedIvs
  .map((row) => `    FixedIvRow { regular: ${row.regular}, last_battle: ${row.lastBattle} },`)
  .join("\n");

const rentalRankThresholdsLine = rentalRankThresholds.join(", ");

const rust = `// GENERATED by core-rs/tools/gen-data.mjs — regenerate: node core-rs/tools/gen-data.mjs.
// Source: src/data/gen/*.json (see each table's citation). Do not hand-edit.

/// One row of the Factory rental-mon set table (\`FRONTIER_MON_*\`,
/// reference/pokeemerald/include/constants/battle_frontier.h), indexed by
/// set id (row order matches \`entries[].index\`). Source:
/// src/data/gen/battle-frontier-mons.json \`.entries[]\`.
///
/// \`ev_flags\` is a bitmask over the set's \`F_EV_SPREAD_*\` flags
/// (\`.evSpreadStats\`), bit0..bit5 = HP, ATTACK, DEFENSE, SPEED, SP_ATTACK,
/// SP_DEFENSE (this order is authoritative — \`derive_evs\` and its \`Evs\`
/// return-array order both mirror it). \`moves\` are move ids resolved via
/// src/data/gen/moves.json \`.moves[].move\` -> \`.id\`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FrontierMonRow {
    pub species_id: u16,
    pub item_table_id: u16,
    pub nature: u8,
    pub moves: [u16; 4],
    pub ev_flags: u8,
}

pub const FRONTIER_MONS: [FrontierMonRow; ${frontierMonRows.length}] = [
${frontierMonsLines}
];

/// \`SPECIES_UNOWN\`'s id, used by the initial-rental selection loop's unown
/// rejection (reference/pokeemerald/src/battle_factory.c:562-563). Source:
/// src/data/gen/species-stats.json.
pub const SPECIES_UNOWN_ID: u16 = ${speciesUnownId};

/// itemTableId -> held item id, dense over 0..${heldItemByTableId.length}. Source:
/// src/data/gen/battle-frontier-held-items.json \`.entries[]\`.
pub const HELD_ITEM_BY_TABLE_ID: [u16; ${heldItemByTableId.length}] = [${heldItemByTableIdLines}];

/// itemTableId -> hold effect id, dense over 0..${heldItemHoldEffectByTableId.length}, resolved via
/// src/data/gen/ability-item-hooks.json \`.universes.holdEffects\`. Source:
/// src/data/gen/battle-frontier-held-items.json \`.entries[].holdEffect\`.
pub const HELD_ITEM_HOLD_EFFECT_BY_TABLE_ID: [u16; ${heldItemHoldEffectByTableId.length}] = [${heldItemHoldEffectByTableIdLines}];

/// itemTableId -> hold effect parameter, dense over 0..${heldItemHoldEffectParamByTableId.length}. Source:
/// src/data/gen/battle-frontier-held-items.json \`.entries[].holdEffectParam\`.
pub const HELD_ITEM_HOLD_EFFECT_PARAM_BY_TABLE_ID: [u8; ${heldItemHoldEffectParamByTableId.length}] = [${heldItemHoldEffectParamByTableIdLines}];

/// \`(species_id, second_ability_id)\` pairs sorted by \`species_id\` (0 = no
/// second ability). Drives \`CreateBoxMon\`'s ability-slot rule
/// (reference/pokeemerald/src/pokemon.c:2296-2300). Source:
/// src/data/gen/species-stats.json \`.species[].abilities[1]\`, resolved via
/// src/data/gen/ability-item-hooks.json \`.universes.abilities\`. Species ids
/// are not assumed dense — look up via \`species_second_ability\`, not by
/// indexing this array directly.
pub const SPECIES_SECOND_ABILITY: [(u16, u16); ${speciesSecondAbility.length}] = [
${speciesSecondAbilityLines}
];

/// Looks up a species' second ability id (0 = none) in
/// \`SPECIES_SECOND_ABILITY\`; species absent from the table return 0.
#[must_use]
pub fn species_second_ability(species_id: u16) -> u16 {
    match SPECIES_SECOND_ABILITY.binary_search_by_key(&species_id, |&(id, _)| id) {
        Ok(index) => SPECIES_SECOND_ABILITY[index].1,
        Err(_) => 0,
    }
}

/// Move id -> base PP, dense over 0..${movePp.length} (\`moves.json\` ids are
/// contiguous 0..${movePp.length - 1}, verified at codegen time). Source:
/// src/data/gen/moves.json \`.moves[].pp\`.
pub const MOVE_PP: [u8; ${movePp.length}] = [${movePpLines}];

/// One species' base stats/gender ratio/abilities/Level-50 experience, the
/// fields \`createFactoryCorpusPartyMember\`
/// (\`src/engine/factoryCorpusParty.ts\`) reads off \`SPECIES_BY_NAME\`, plus
/// \`EXP_DATA\` resolved down to level 50 (the only level this port crosses).
/// Source: src/data/gen/species-stats.json \`.species[]\`, abilities resolved
/// via src/data/gen/ability-item-hooks.json \`.universes.abilities\`,
/// \`exp_at_50\` via src/data/gen/exp-tables.json
/// \`.speciesGrowthRate[name] -> .growthRates[rate][50]\`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SpeciesRow {
    pub species_id: u16,
    pub base_hp: u8,
    pub base_attack: u8,
    pub base_defense: u8,
    pub base_speed: u8,
    pub base_sp_attack: u8,
    pub base_sp_defense: u8,
    pub gender_ratio: u8,
    pub abilities: [u16; 2],
    pub exp_at_50: u32,
}

/// One row per species referenced by a \`FRONTIER_MONS\` set (\`${speciesRows.length}\` of the
/// 411 src/data/gen/species-stats.json rows), sorted by \`species_id\`. Scoped
/// to the frontier corpus rather than all 411 rows because 25 unused
/// \`SPECIES_OLD_UNOWN_*\` duplicates have no exp-tables.json growth-rate
/// entry and are never a frontier set's species; codegen fails if any
/// species in this narrower, actually-needed set lacks a Level-50 entry.
/// Species ids are not assumed dense — look up via \`species_row\`, not by
/// indexing this array directly.
pub const SPECIES: [SpeciesRow; ${speciesRows.length}] = [
${speciesRowsLines}
];

/// Looks up a species' \`SpeciesRow\` in \`SPECIES\` by id; \`None\` if the
/// species is outside the frontier corpus \`SPECIES\` covers.
#[must_use]
pub fn species_row(species_id: u16) -> Option<SpeciesRow> {
    SPECIES
        .binary_search_by_key(&species_id, |row| row.species_id)
        .ok()
        .map(|index| SPECIES[index])
}

/// One nature's per-stat modifier row: -1 (hindered, x0.9), 0 (neutral), or
/// 1 (boosted, x1.1) — the exact domain src/data/gen/natures.json already
/// uses (mirrored by \`NatureModifier\` in src/engine/stats.ts).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NatureModifierRow {
    pub attack: i8,
    pub defense: i8,
    pub speed: i8,
    pub sp_attack: i8,
    pub sp_defense: i8,
}

/// Per-stat nature modifiers indexed by nature index (dense 0..${natureModifierRows.length},
/// validated above). Source: src/data/gen/natures.json \`.natures[]\`.
pub const NATURE_MODIFIERS: [NatureModifierRow; ${natureModifierRows.length}] = [
${natureModifiersLines}
];

/// Nature count. Source: src/data/gen/natures.json \`.natures.length\`. Used
/// by \`nature_from_personality\` (\`personality % NUM_NATURES\`;
/// reference/pokeemerald/src/pokemon.c:5498-5501).
pub const NUM_NATURES: u8 = ${natures.length};

/// One inclusive \`{start, end}\` Factory-set-id range. Source:
/// src/data/gen/factory-round-policy.json
/// \`.rentalSelection.ranges.level50[]\`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RentalRange {
    pub start: u16,
    pub end: u16,
}

/// Level-50 rental-set ranges indexed by (challenge_num [+1 for the
/// better-range slot]), pinned at index 7 for challenge_num >= 7
/// (reference/pokeemerald/src/battle_factory.c:829-866). Source:
/// src/data/gen/factory-round-policy.json
/// \`.rentalSelection.ranges.level50\`.
pub const RENTAL_RANGES_LEVEL50: [RentalRange; ${level50Ranges.length}] = [
${rentalRangesLines}
];

/// \`GetNumPastRentalsRank\` thresholds
/// (reference/pokeemerald/src/battle_factory.c:868-886): rank is the index
/// of the first threshold exceeding \`rentsCount\`, else \`MAXIMUM_RENTAL_RANK\`.
/// Source: src/data/gen/factory-round-policy.json
/// \`.rentalSelection.rentalRankThresholds\`.
pub const RENTAL_RANK_THRESHOLDS: [u32; ${rentalRankThresholds.length}] = [${rentalRankThresholdsLine}];

/// Source: src/data/gen/factory-round-policy.json
/// \`.rentalSelection.maximumRentalRank\`.
pub const MAXIMUM_RENTAL_RANK: u8 = ${maximumRentalRank};

/// One \`{regular, last_battle}\` fixed-IV row. Source:
/// src/data/gen/factory-round-policy.json \`.rentalSelection.fixedIvs[]\`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FixedIvRow {
    pub regular: u8,
    pub last_battle: u8,
}

/// Draft-rental fixed IV rows indexed by \`challengeNum + (useBetterRange ? 1
/// : 0)\` (reference/pokeemerald/src/battle_factory_screen.c:1757-1771).
/// Source: src/data/gen/factory-round-policy.json
/// \`.rentalSelection.fixedIvs\`.
pub const FIXED_IVS: [FixedIvRow; ${fixedIvs.length}] = [
${fixedIvsLines}
];
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, rust, "utf8");

// Normalize formatting deterministically so reruns are byte-identical
// regardless of this script's own source layout.
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
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}
if (!formatted) {
  throw new Error("gen-data: could not find rustfmt (looked in the rustup stable toolchain and PATH)");
}

console.log(`gen-data: wrote ${path.relative(workspaceRoot, outPath)}`);
console.log(`gen-data: ${frontierMonRows.length} frontier mons, ${heldItemByTableId.length} held items, ${natures.length} natures, ${level50Ranges.length} level50 ranges, ${fixedIvs.length} fixed IV rows, ${speciesSecondAbility.length} species second-abilities, ${movePp.length} move PP rows, ${speciesRows.length} frontier-corpus species rows, ${natureModifierRows.length} nature modifier rows`);
