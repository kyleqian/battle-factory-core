import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierHeldItemsData from "../src/data/gen/battle-frontier-held-items.json" with { type: "json" };
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import itemHoldEffectsData from "../src/data/gen/item-hold-effects.json" with { type: "json" };
import itemNamesData from "../src/data/gen/item-names.json" with { type: "json" };

type FrontierHeldItem = {
  itemTableId: number;
  itemName: string;
  itemId: number;
  item: string;
  displayName: string;
  holdEffect: string;
  holdEffectParam: number;
};

const catalog = frontierHeldItemsData as { schema: string; count: number; entries: FrontierHeldItem[] };
const byTableId = new Map(catalog.entries.map((entry) => [entry.itemTableId, entry]));
const byFrontierSymbol = new Map(catalog.entries.map((entry) => [entry.itemName, entry]));
const namesByItem = new Map((itemNamesData.items as Array<{ item: string; name: string }>).map((entry) => [entry.item, entry.name]));
const explicitEffectsByItem = new Map(
  (itemHoldEffectsData.items as Array<{ item: string; holdEffect: string; holdEffectParam: number }>).map((entry) => [entry.item, entry]),
);

describe("battle-frontier-held-items.json (complete gBattleFrontierHeldItems indirection)", () => {
  it("reproduces the committed catalog byte-for-byte", () => {
    const path = "src/data/gen/battle-frontier-held-items.json";
    const before = readFileSync(path, "utf8");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-battle-frontier-held-items.ts"], { stdio: "pipe" });
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("preserves every source-declared row in numeric BATTLE_FRONTIER_ITEM order", () => {
    expect(catalog.schema).toBe("battle-frontier-held-items/v1");
    expect(catalog.count).toBe(63);
    expect(catalog.entries).toHaveLength(63);
    for (const [index, entry] of catalog.entries.entries()) {
      expect(entry.itemTableId).toBe(index);
      expect(entry.itemName).toMatch(/^BATTLE_FRONTIER_ITEM_[A-Z0-9_]+$/);
      expect(entry.item).toMatch(/^ITEM_[A-Z0-9_]+$/);
      expect(entry.itemId).toBeGreaterThanOrEqual(0);
      expect(entry.displayName).toBe(namesByItem.get(entry.item));
      expect(entry.holdEffect).toMatch(/^HOLD_EFFECT_[A-Z0-9_]+$/);
      const explicit = explicitEffectsByItem.get(entry.item);
      expect([entry.holdEffect, entry.holdEffectParam]).toEqual(
        explicit === undefined ? ["HOLD_EFFECT_NONE", 0] : [explicit.holdEffect, explicit.holdEffectParam],
      );
    }
  });

  it("resolves every one of the 882 Frontier mon itemTableId/itemName pairs to one catalog row", () => {
    expect(frontierMonsData.count).toBe(882);
    for (const mon of frontierMonsData.entries) {
      const byId = byTableId.get(mon.itemTableId);
      const byName = byFrontierSymbol.get(mon.itemName);
      expect(byId, `missing itemTableId ${mon.itemTableId} for ${mon.label}`).toBeDefined();
      expect(byName, `missing itemName ${mon.itemName} for ${mon.label}`).toBeDefined();
      expect(byId).toBe(byName);
      expect(byId!.itemName).toBe(mon.itemName);
      expect(namesByItem.get(byId!.item)).toBe(byId!.displayName);
    }
  });

  it("pins NONE, berries, Choice Band, evasion variants, White Herb, and equivalent effects", () => {
    expect(byTableId.get(0)).toMatchObject({
      itemName: "BATTLE_FRONTIER_ITEM_NONE", itemId: 0, item: "ITEM_NONE", displayName: "????????", holdEffect: "HOLD_EFFECT_NONE", holdEffectParam: 0,
    });
    expect(byFrontierSymbol.get("BATTLE_FRONTIER_ITEM_CHERI_BERRY")).toMatchObject({
      item: "ITEM_CHERI_BERRY", displayName: "CHERI BERRY", holdEffect: "HOLD_EFFECT_CURE_PAR", holdEffectParam: 0,
    });
    expect(byFrontierSymbol.get("BATTLE_FRONTIER_ITEM_SITRUS_BERRY")).toMatchObject({
      item: "ITEM_SITRUS_BERRY", holdEffect: "HOLD_EFFECT_RESTORE_HP", holdEffectParam: 30,
    });
    expect(byFrontierSymbol.get("BATTLE_FRONTIER_ITEM_CHOICE_BAND")).toMatchObject({
      item: "ITEM_CHOICE_BAND", holdEffect: "HOLD_EFFECT_CHOICE_BAND", holdEffectParam: 0,
    });
    expect(byFrontierSymbol.get("BATTLE_FRONTIER_ITEM_BRIGHT_POWDER")).toMatchObject({
      item: "ITEM_BRIGHT_POWDER", holdEffect: "HOLD_EFFECT_EVASION_UP", holdEffectParam: 10,
    });
    expect(byFrontierSymbol.get("BATTLE_FRONTIER_ITEM_LAX_INCENSE")).toMatchObject({
      item: "ITEM_LAX_INCENSE", holdEffect: "HOLD_EFFECT_EVASION_UP", holdEffectParam: 5,
    });
    expect(byFrontierSymbol.get("BATTLE_FRONTIER_ITEM_WHITE_HERB")).toMatchObject({
      item: "ITEM_WHITE_HERB", holdEffect: "HOLD_EFFECT_RESTORE_STATS", holdEffectParam: 0,
    });
    // Both berries restore HP, but source preserves their distinct parameters.
    expect(byFrontierSymbol.get("BATTLE_FRONTIER_ITEM_ORAN_BERRY")).toMatchObject({ holdEffect: "HOLD_EFFECT_RESTORE_HP", holdEffectParam: 10 });
  });
});
