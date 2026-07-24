// Dev-time extractor for gBattleFrontierHeldItems[]: joins every numeric
// BATTLE_FRONTIER_ITEM_x slot to the source ITEM_x record that the Factory
// actually gives a rental. It deliberately emits effective HOLD_EFFECT_NONE/0
// for implicit item fields, unlike item-hold-effects.json's narrower audit.
// Run with: node --experimental-strip-types tools/extract/extract-battle-frontier-held-items.ts

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseIntDefines } from "./defines.ts";
import { parseBattleFrontierHeldItemSymbols, parseItemSourceRecords, parseItemsCount } from "./item-source.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");
mkdirSync(DATA_GEN, { recursive: true });

const readRef = (...parts: string[]) => readFileSync(join(REF, ...parts), "utf8");
const itemIds = parseIntDefines(readRef("include", "constants", "items.h"), "ITEM_");
const frontierItemIds = parseIntDefines(readRef("include", "constants", "battle_frontier.h"), "BATTLE_FRONTIER_ITEM_");
const itemRecords = parseItemSourceRecords(readRef("src", "data", "items.h"), readRef("include", "constants", "hold_effects.h"));
const rows = parseBattleFrontierHeldItemSymbols(readRef("src", "battle_tower.c"));

const itemsCount = parseItemsCount(readRef("include", "constants", "items.h"));
if (itemRecords.size !== itemsCount) throw new Error(`expected ${itemsCount} source item records, got ${itemRecords.size}`);
if (rows.size !== frontierItemIds.size) throw new Error(`expected ${frontierItemIds.size} Frontier held-item rows, got ${rows.size}`);

const entries = [...frontierItemIds.entries()]
  .map(([itemName, itemTableId]) => {
    const item = rows.get(itemName);
    if (item === undefined) throw new Error(`${itemName}: missing gBattleFrontierHeldItems row`);
    const itemId = itemIds.get(item);
    const record = itemRecords.get(item);
    if (itemId === undefined || record === undefined) throw new Error(`${itemName}: ${item} missing from the ${itemsCount}-item corpus`);
    return { itemTableId, itemName, itemId, item, displayName: record.name, holdEffect: record.holdEffect, holdEffectParam: record.holdEffectParam };
  })
  .sort((a, b) => a.itemTableId - b.itemTableId);

for (const [index, entry] of entries.entries()) {
  if (entry.itemTableId !== index) throw new Error(`expected numeric Frontier held-item ID ${index}, got ${entry.itemTableId} (${entry.itemName})`);
}

writeFileSync(join(DATA_GEN, "battle-frontier-held-items.json"), `${JSON.stringify({ schema: "battle-frontier-held-items/v1", count: entries.length, entries })}\n`);
console.log(`wrote ${join(DATA_GEN, "battle-frontier-held-items.json")} (${entries.length} numeric Frontier held-item rows)`);
