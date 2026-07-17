// Dev-time extractor: reads reference/pokeemerald's Battle Factory rental
// mon table + the natures/species data the engine's rental-stat derivation
// needs, and writes committed JSON under src/data/gen/. Run with:
//   node --experimental-strip-types tools/extract/extract-battle-frontier-data.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { invert, parseIntDefines, parseShiftDefines } from "./defines.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");

mkdirSync(DATA_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

function readRef(...parts: string[]): string {
  return readFileSync(join(REF, ...parts), "utf8");
}

// --- gBattleFrontierMons: species/moves/item/evSpread/nature per entry -----
// (species names/labels are kept as reference/pokeemerald's own SPECIES_*/
// MOVE_*/NATURE_* identifiers, not resolved to numeric ids - nothing here
// needs the numeric species/move id space, and the RAM-dumped anchor state
// resolves back to these same identifiers, so string-equality is the
// cross-validation.)
{
  const battleFrontierMonsHeader = readFileSync(join(REF, "include", "constants", "battle_frontier_mons.h"), "utf8");
  const frontierMonIndices = parseIntDefines(battleFrontierMonsHeader, "FRONTIER_MON_");
  const numFrontierMonsMatch = /^#define\s+NUM_FRONTIER_MONS\s+(\d+)\s*$/m.exec(battleFrontierMonsHeader);
  if (!numFrontierMonsMatch) throw new Error("NUM_FRONTIER_MONS not found");
  const numFrontierMons = Number(numFrontierMonsMatch[1]);

  const evSpreadFlags = parseShiftDefines(
    readFileSync(join(REF, "include", "constants", "battle_frontier.h"), "utf8"),
    "F_EV_SPREAD_",
  );
  const itemTableIds = parseIntDefines(
    readFileSync(join(REF, "include", "constants", "battle_frontier.h"), "utf8"),
    "BATTLE_FRONTIER_ITEM_",
  );

  const source = readRef("src", "data", "battle_frontier", "battle_frontier_mons.h");
  const entryRe =
    /\[(FRONTIER_MON_[A-Z0-9_]+)\]\s*=\s*\{\s*\.species\s*=\s*(SPECIES_[A-Z0-9_]+),\s*\.moves\s*=\s*\{([^}]*)\},\s*\.itemTableId\s*=\s*(BATTLE_FRONTIER_ITEM_[A-Z0-9_]+),\s*\.evSpread\s*=\s*([^,]+?),\s*\.nature\s*=\s*(NATURE_[A-Z0-9_]+)\s*\}/g;

  const entries: Array<{
    index: number;
    label: string;
    species: string;
    moves: string[];
    itemTableId: number;
    itemName: string;
    evSpread: number;
    evSpreadStats: string[];
    nature: string;
  }> = [];

  for (const match of source.matchAll(entryRe)) {
    const [, label, species, movesRaw, itemName, evSpreadRaw, nature] = match as unknown as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    const index = frontierMonIndices.get(label);
    if (index === undefined) throw new Error(`unknown frontier mon label ${label}`);

    const moves = movesRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const evSpreadStats = evSpreadRaw
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    let evSpread = 0;
    for (const flag of evSpreadStats) {
      const bit = evSpreadFlags.get(flag);
      if (bit === undefined) throw new Error(`unknown EV spread flag ${flag}`);
      evSpread |= bit;
    }

    const itemTableId = itemTableIds.get(itemName);
    if (itemTableId === undefined) throw new Error(`unknown item table id ${itemName}`);

    entries.push({ index, label, species, moves, itemTableId, itemName, evSpread, evSpreadStats, nature });
  }

  if (entries.length !== numFrontierMons) {
    throw new Error(`expected ${numFrontierMons} gBattleFrontierMons entries, parsed ${entries.length}`);
  }
  entries.sort((a, b) => a.index - b.index);

  writeJson(join(DATA_GEN, "battle-frontier-mons.json"), { count: entries.length, entries });
}

// --- Natures: gNatureStatTable (src/pokemon.c) + NATURE_* names ------------
{
  const natureIndices = parseIntDefines(readFileSync(join(REF, "include", "constants", "pokemon.h"), "utf8"), "NATURE_");
  const natureNames = invert(natureIndices);

  const pokemonC = readRef("src", "pokemon.c");
  const tableMatch = /gNatureStatTable\[NUM_NATURES\]\[NUM_NATURE_STATS\]\s*=\s*\{([\s\S]*?)\n\};/.exec(pokemonC);
  if (!tableMatch) throw new Error("could not find gNatureStatTable in pokemon.c");

  const rowRe = /\[(NATURE_[A-Z0-9_]+)\]\s*=\s*\{\s*([+-]?\d+),\s*([+-]?\d+),\s*([+-]?\d+),\s*([+-]?\d+),\s*([+-]?\d+)\s*\}/g;
  const STAT_NAMES = ["attack", "defense", "speed", "spAttack", "spDefense"] as const;
  const natures: Array<{ index: number; name: string; attack: number; defense: number; speed: number; spAttack: number; spDefense: number }> =
    [];
  for (const match of tableMatch[1]!.matchAll(rowRe)) {
    const [, label, ...mods] = match as unknown as [string, string, string, string, string, string, string];
    const index = natureIndices.get(label);
    if (index === undefined) throw new Error(`unknown nature label ${label}`);
    const stats = Object.fromEntries(STAT_NAMES.map((name, i) => [name, Number(mods[i])])) as Record<
      (typeof STAT_NAMES)[number],
      number
    >;
    natures.push({ index, name: natureNames.get(index)!, ...stats });
  }
  if (natures.length !== natureIndices.size) {
    throw new Error(`expected ${natureIndices.size} natures, parsed ${natures.length}`);
  }
  natures.sort((a, b) => a.index - b.index);

  writeJson(join(DATA_GEN, "natures.json"), { natures });
}

// --- Species base stats + abilities, scoped to the anchor's 6 rentals ------
// (src/data/pokemon/species_info.h is huge - NUM_SPECIES entries - and
// nothing downstream of S3 needs the full dex yet; extend ANCHOR_SPECIES if
// a later stage needs more.)
{
  const ANCHOR_SPECIES = ["SPECIES_ONIX", "SPECIES_MAGBY", "SPECIES_BAYLEEF", "SPECIES_BUTTERFREE", "SPECIES_HAUNTER", "SPECIES_QUILAVA"];
  const speciesInfo = readRef("src", "data", "pokemon", "species_info.h");

  const species: Array<{
    name: string;
    baseHp: number;
    baseAttack: number;
    baseDefense: number;
    baseSpeed: number;
    baseSpAttack: number;
    baseSpDefense: number;
    abilities: string[];
  }> = [];

  for (const name of ANCHOR_SPECIES) {
    const blockRe = new RegExp(`\\[${name}\\]\\s*=\\s*\\{([\\s\\S]*?)\\n    \\},`);
    const blockMatch = blockRe.exec(speciesInfo);
    if (!blockMatch) throw new Error(`could not find species_info.h block for ${name}`);
    const body = blockMatch[1]!;

    const field = (fieldName: string): number => {
      const m = new RegExp(`\\.${fieldName}\\s*=\\s*(\\d+)`).exec(body);
      if (!m) throw new Error(`missing .${fieldName} for ${name}`);
      return Number(m[1]);
    };
    const abilitiesMatch = /\.abilities\s*=\s*\{([^}]+)\}/.exec(body);
    if (!abilitiesMatch) throw new Error(`missing .abilities for ${name}`);
    const abilities = abilitiesMatch[1]!
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    species.push({
      name,
      baseHp: field("baseHP"),
      baseAttack: field("baseAttack"),
      baseDefense: field("baseDefense"),
      baseSpeed: field("baseSpeed"),
      baseSpAttack: field("baseSpAttack"),
      baseSpDefense: field("baseSpDefense"),
      abilities,
    });
  }

  writeJson(join(DATA_GEN, "species-stats.json"), { species });
}

console.log("battle-frontier extraction complete");
