// Dev-time extractor: item id -> display name, for the Summary screen's
// HELD_ITEM window (docs/summary-screen-notes.md section 2's window table,
// `PrintHeldItemName`) - covers every item any src/data/gen/
// battle-frontier-mons.json rental can hold (that file's `itemName` field
// is a BATTLE_FRONTIER_ITEM_x index into src/battle_tower.c's
// gBattleFrontierHeldItems[], which resolves to a real ITEM_x; extracting
// every ITEM_x's name once here is cheaper and more robust than also
// transcribing that indirection table, and covers non-frontier items too).
// Source: src/data/items.h's gItems[].name.
// Run with:
//   node --experimental-strip-types tools/extract/extract-item-names.ts
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

const itemsConstantsH = readFileSync(join(REF, "include", "constants", "items.h"), "utf8");
const itemsC = readFileSync(join(REF, "src", "data", "items.h"), "utf8");

const ITEMS_COUNT = (() => {
  const m = /^#define ITEMS_COUNT (\d+)$/m.exec(itemsConstantsH);
  if (!m) throw new Error("ITEMS_COUNT not found in constants/items.h");
  return Number.parseInt(m[1]!, 10);
})();

// gItems[ITEM_x] = { .name = _("..."), ... }, - .name is always the block's
// first field, so anchoring directly on it (rather than parsing the whole
// block) is enough and avoids the last-entry-no-trailing-comma pitfall
// (contest_moves.h/species_info.h) since we never look for the closing brace.
function parseItemNames(): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of itemsC.matchAll(/\[ITEM_(\w+)\]\s*=\s*\{\s*\.name\s*=\s*_\("([^"]*)"\)/g)) {
    out.set(m[1]!, m[2]!);
  }
  return out;
}
const itemNames = parseItemNames();

if (itemNames.size !== ITEMS_COUNT) {
  throw new Error(`expected ${ITEMS_COUNT} items (ITEMS_COUNT), parsed ${itemNames.size} from items.h`);
}

const battleFrontierMons = JSON.parse(
  readFileSync(join(DATA_GEN, "battle-frontier-mons.json"), "utf8"),
) as { entries: { itemName: string }[] };

// Resolve every held BATTLE_FRONTIER_ITEM_x used by the pool through
// gBattleFrontierHeldItems (src/battle_tower.c:82-145+) to confirm this
// extraction's stated minimum ("every item held by any frontier entry") is
// actually covered by the full gItems dump above.
const battleTowerC = readFileSync(join(REF, "src", "battle_tower.c"), "utf8");
function parseFrontierHeldItemTable(): Map<string, string> {
  const tableStart = battleTowerC.indexOf("const u16 gBattleFrontierHeldItems[]");
  if (tableStart < 0) throw new Error("gBattleFrontierHeldItems table not found in battle_tower.c");
  const tableEnd = battleTowerC.indexOf("\n};", tableStart);
  const body = battleTowerC.slice(tableStart, tableEnd);
  const out = new Map<string, string>();
  for (const m of body.matchAll(/\[(BATTLE_FRONTIER_ITEM_\w+)\]\s*=\s*ITEM_(\w+),/g)) {
    out.set(m[1]!, m[2]!);
  }
  return out;
}
const frontierHeldItems = parseFrontierHeldItemTable();

const usedFrontierItemNames = [...new Set(battleFrontierMons.entries.map((e) => e.itemName))];
for (const frontierItemName of usedFrontierItemNames) {
  const realItem = frontierHeldItems.get(frontierItemName);
  if (realItem === undefined) throw new Error(`${frontierItemName} not found in gBattleFrontierHeldItems`);
  if (!itemNames.has(realItem)) throw new Error(`ITEM_${realItem} (held by ${frontierItemName}) missing a name`);
}

const items = [...itemNames.entries()]
  .map(([item, name]) => ({ item: `ITEM_${item}`, name }))
  .sort((a, b) => (a.item < b.item ? -1 : a.item > b.item ? 1 : 0));

writeFileSync(join(DATA_GEN, "item-names.json"), `${JSON.stringify({ items }, null, 0)}\n`);
console.log(
  `wrote ${join(DATA_GEN, "item-names.json")} (${items.length} items, ${usedFrontierItemNames.length} distinct frontier-held items verified)`,
);
