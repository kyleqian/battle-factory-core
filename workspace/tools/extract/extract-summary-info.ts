// Dev-time extractor: the Summary screen Info page's per-species data not
// already covered by extract-species-header.ts/extract-battle-frontier-data.ts
// - types, National Dex number, gender ratio, and ability name+description
// text - for the 6 Battle Factory anchor rental-pool species. See
// docs/summary-screen-notes.md §3 for the print-function citations behind
// each field. Run with:
//   node --experimental-strip-types tools/extract/extract-summary-info.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");

mkdirSync(DATA_GEN, { recursive: true });

// Every species the party menu can stage: the full Battle Factory rental
// pool (battle-frontier-mons.json entries), so genderRatio is banked for any
// rental/bench mon a party window can draw -- the 6-anchor pool left every
// other species falling back to "male" in memberGender (ISSUES #80 band:
// RATTATA slots 0/2 rendered ♂ instead of the oracle's ♀). The anchor six
// are a subset, so existing summary-screen consumers are unaffected.
const frontierMons = JSON.parse(
  readFileSync(join(DATA_GEN, "battle-frontier-mons.json"), "utf8"),
) as { entries: { species: string }[] };
const POOL_SPECIES = [...new Set(frontierMons.entries.map((e) => e.species))].map((s) =>
  s.replace(/^SPECIES_/, ""),
);

const speciesInfoC = readFileSync(join(REF, "src", "data", "pokemon", "species_info.h"), "utf8");
const pokedexConstantsH = readFileSync(join(REF, "include", "constants", "pokedex.h"), "utf8");
const abilitiesTextC = readFileSync(join(REF, "src", "data", "text", "abilities.h"), "utf8");
const abilitiesConstantsH = readFileSync(join(REF, "include", "constants", "abilities.h"), "utf8");

// National Dex order (pokemon.c:6396 SpeciesToPokedexNum ->
// SpeciesToNationalPokedexNum; RAM-verified this session that
// IsNationalPokedexEnabled() is TRUE at the anchor - FLAG_SYS_NATIONAL_DEX
// bit set in gSaveBlock1Ptr->flags, consistent with this being a post-game
// continue save - so the Info page's "No.XXX" uses this table, not the
// Hoenn-only one). NATIONAL_DEX_NONE = 0, so enum position === dex number.
function parseNationalDexOrder(): Map<string, number> {
  const m = /enum \{(.*?)\};/s.exec(pokedexConstantsH);
  if (!m) throw new Error("could not find the National Dex enum in constants/pokedex.h");
  const names = [...m[1]!.matchAll(/NATIONAL_DEX_(\w+)/g)].map((x) => x[1]!);
  const order = new Map<string, number>();
  names.forEach((name, i) => order.set(name, i));
  return order;
}
const nationalDexOrder = parseNationalDexOrder();

function speciesBlock(species: string): string {
  // The last entry (CHIMECHO) closes with "    }\n};" (no trailing comma),
  // every other block with "    }," -- the optional comma covers both.
  const re = new RegExp(`\\[SPECIES_${species}\\]\\s*=\\s*\\{(.*?)\\n    \\},?`, "s");
  const m = re.exec(speciesInfoC);
  if (!m) throw new Error(`species_info.h block not found for SPECIES_${species}`);
  return m[1]!;
}

function extractTypes(block: string, species: string): string[] {
  const m = /\.types\s*=\s*\{\s*(TYPE_\w+)\s*,\s*(TYPE_\w+)\s*\}/.exec(block);
  if (!m) throw new Error(`no .types field for SPECIES_${species}`);
  const [, t1, t2] = m as unknown as [string, string, string];
  return t1 === t2 ? [t1] : [t1, t2];
}

// genderRatio is either a literal (MON_MALE/MON_FEMALE/MON_GENDERLESS) or
// PERCENT_FEMALE(percent) (species_info.h:3 - min(254, (percent*255)/100),
// C integer division truncates). All 6 anchor species use the macro form.
function extractGenderRatio(block: string, species: string): number {
  const literal = /\.genderRatio\s*=\s*(MON_MALE|MON_FEMALE|MON_GENDERLESS)\s*,/.exec(block);
  if (literal) {
    const table: Record<string, number> = { MON_MALE: 0x00, MON_FEMALE: 0xfe, MON_GENDERLESS: 0xff };
    return table[literal[1]!]!;
  }
  const percentMatch = /\.genderRatio\s*=\s*PERCENT_FEMALE\(([\d.]+)\)\s*,/.exec(block);
  if (!percentMatch) throw new Error(`no .genderRatio field for SPECIES_${species}`);
  const percent = Number.parseFloat(percentMatch[1]!);
  return Math.min(254, Math.trunc((percent * 255) / 100));
}

function extractDexNumber(species: string): number {
  const num = nationalDexOrder.get(species);
  if (num === undefined) throw new Error(`no NATIONAL_DEX_${species} entry found`);
  return num;
}

// Ability name/description text (pokemon_summary_screen.c:3104-3114
// PrintMonAbilityName/PrintMonAbilityDescription -> gAbilityNames[ability] /
// gAbilityDescriptionPointers[ability], keyed by ability id - not species-
// specific, so extracted once per distinct ability id used by the pool
// (species_info.h's own .abilities lists, same source species-stats.json
// already reads).
function extractAllAbilityIds(): string[] {
  const ids = new Set<string>();
  for (const species of POOL_SPECIES) {
    const block = speciesBlock(species);
    const m = /\.abilities\s*=\s*\{([^}]+)\}/.exec(block);
    if (!m) throw new Error(`no .abilities field for SPECIES_${species}`);
    for (const part of m[1]!.split(",")) {
      const id = part.trim();
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

function extractAbilityName(abilityId: string): string {
  const re = new RegExp(`\\[${abilityId}\\]\\s*=\\s*_\\("([^"]*)"\\)`);
  const m = re.exec(abilitiesTextC);
  if (!m) throw new Error(`ability name not found for ${abilityId}`);
  return m[1]!;
}

function extractAbilityDescription(abilityId: string): string {
  // gAbilityDescriptions[ABILITY_X] = sXDescription; -> static const u8
  // sXDescription[] = _("...");  (abilities.h defines both tables; the
  // pointer-table line gives us the local variable name, whose own
  // definition line has the actual string).
  const pointerRe = new RegExp(`\\[${abilityId}\\]\\s*=\\s*(\\w+)\\s*,`);
  const pointerMatch = pointerRe.exec(abilitiesTextC);
  if (!pointerMatch) throw new Error(`ability description pointer not found for ${abilityId}`);
  const varName = pointerMatch[1]!;
  const defRe = new RegExp(`${varName}\\[\\]\\s*=\\s*_\\("([^"]*)"\\)`);
  const defMatch = defRe.exec(abilitiesTextC);
  if (!defMatch) throw new Error(`ability description text not found for ${varName} (${abilityId})`);
  return defMatch[1]!;
}

// Sanity check the abilities constants header actually defines the ids we
// found (catches typos/renames early rather than silently mis-extracting).
function assertAbilityIdKnown(abilityId: string): void {
  const re = new RegExp(`define\\s+${abilityId}\\s+\\d+`);
  if (!re.test(abilitiesConstantsH)) throw new Error(`${abilityId} not defined in constants/abilities.h`);
}

const species = POOL_SPECIES.map((s) => {
  const block = speciesBlock(s);
  return {
    species: `SPECIES_${s}`,
    dexNumber: extractDexNumber(s),
    types: extractTypes(block, s),
    genderRatio: extractGenderRatio(block, s),
  };
});

const abilityIds = extractAllAbilityIds().sort();
const abilities: Record<string, { name: string; description: string }> = {};
for (const id of abilityIds) {
  assertAbilityIdKnown(id);
  abilities[id] = { name: extractAbilityName(id), description: extractAbilityDescription(id) };
}

writeFileSync(join(DATA_GEN, "summary-info.json"), `${JSON.stringify({ species, abilities }, null, 0)}\n`);
console.log(`wrote ${join(DATA_GEN, "summary-info.json")}`);
console.log({ species, abilities });
