// Shared parsers for the pinned Emerald item data. These are dev-time only:
// extractors consume the source and write JSON that production imports.

export type ItemSourceRecord = {
  item: string;
  name: string;
  holdEffect: string;
  holdEffectParam: number;
  hasExplicitHoldEffect: boolean;
};

export function parseItemsCount(itemsConstantsH: string): number {
  const m = /^#define ITEMS_COUNT (\d+)$/m.exec(itemsConstantsH);
  if (!m) throw new Error("ITEMS_COUNT not found in constants/items.h");
  return Number.parseInt(m[1]!, 10);
}

export function parseItemSourceRecords(itemsC: string, holdEffectsH: string): Map<string, ItemSourceRecord> {
  const holdEffectConstants = new Map<string, number>();
  for (const m of holdEffectsH.matchAll(/^#define HOLD_EFFECT_(\w+)\s+(\d+)/gm)) {
    holdEffectConstants.set(m[1]!, Number.parseInt(m[2]!, 10));
  }
  if (holdEffectConstants.get("NONE") !== 0) throw new Error("HOLD_EFFECT_NONE expected to be 0");

  const starts = [...itemsC.matchAll(/\[ITEM_(\w+)\]\s*=\s*\{/g)].map((m) => ({
    item: `ITEM_${m[1]!}`,
    index: m.index!,
    bodyStart: m.index! + m[0]!.length,
  }));
  if (starts.length === 0) throw new Error("no [ITEM_x] = { blocks found in items.h");

  const records = new Map<string, ItemSourceRecord>();
  for (let i = 0; i < starts.length; i++) {
    const { item, bodyStart } = starts[i]!;
    const bodyEnd = i + 1 < starts.length ? starts[i + 1]!.index : itemsC.indexOf("\n};", bodyStart);
    const block = itemsC.slice(bodyStart, bodyEnd);
    const name = /\.name\s*=\s*_\("([^"]*)"\)/.exec(block)?.[1];
    if (name === undefined) throw new Error(`${item}: missing .name`);

    const holdEffectName = /\.holdEffect\s*=\s*HOLD_EFFECT_(\w+)/.exec(block)?.[1];
    if (holdEffectName !== undefined && !holdEffectConstants.has(holdEffectName)) {
      throw new Error(`${item}: unknown HOLD_EFFECT_${holdEffectName}`);
    }
    // A designated .holdEffectParam without .holdEffect is dead data: the
    // struct's effect field is zero and battle code cannot consume its param.
    const holdEffectParam = holdEffectName === undefined
      ? 0
      : Number.parseInt(/\.holdEffectParam\s*=\s*(\d+)/.exec(block)?.[1] ?? "0", 10);
    records.set(item, {
      item,
      name,
      holdEffect: `HOLD_EFFECT_${holdEffectName ?? "NONE"}`,
      holdEffectParam,
      hasExplicitHoldEffect: holdEffectName !== undefined,
    });
  }
  return records;
}

export function parseBattleFrontierHeldItemSymbols(battleTowerC: string): Map<string, string> {
  const tableStart = battleTowerC.indexOf("const u16 gBattleFrontierHeldItems[]");
  if (tableStart < 0) throw new Error("gBattleFrontierHeldItems table not found in battle_tower.c");
  const tableEnd = battleTowerC.indexOf("\n};", tableStart);
  if (tableEnd < 0) throw new Error("gBattleFrontierHeldItems table has no closing brace");
  const rows = new Map<string, string>();
  for (const m of battleTowerC.slice(tableStart, tableEnd).matchAll(/\[(BATTLE_FRONTIER_ITEM_[A-Z0-9_]+)\]\s*=\s*(ITEM_[A-Z0-9_]+),/g)) {
    if (rows.has(m[1]!)) throw new Error(`duplicate gBattleFrontierHeldItems row ${m[1]}`);
    rows.set(m[1]!, m[2]!);
  }
  if (rows.size === 0) throw new Error("no gBattleFrontierHeldItems rows parsed");
  return rows;
}
