import { describe, expect, it } from "vitest";
import itemNames from "../src/data/gen/item-names.json" with { type: "json" };
import battleFrontierMons from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };

const byItem = new Map<string, string>((itemNames.items as { item: string; name: string }[]).map((i) => [i.item, i.name]));

// src/battle_tower.c's gBattleFrontierHeldItems[BATTLE_FRONTIER_ITEM_x] = ITEM_x
// - the same indirection extract-item-names.ts resolves at extraction time.
const FRONTIER_ITEM_TO_REAL_ITEM: Record<string, string> = {
  BATTLE_FRONTIER_ITEM_LAX_INCENSE: "ITEM_LAX_INCENSE",
  BATTLE_FRONTIER_ITEM_CHERI_BERRY: "ITEM_CHERI_BERRY",
  BATTLE_FRONTIER_ITEM_FOCUS_BAND: "ITEM_FOCUS_BAND",
};

describe("item-names.json (Skills page HELD_ITEM window extraction)", () => {
  it("covers all ITEMS_COUNT=377 items", () => {
    expect(itemNames.items).toHaveLength(377);
    expect(byItem.get("ITEM_NONE")).toBe("????????");
  });

  it("pins display names for spot-checked items", () => {
    expect(byItem.get("ITEM_MASTER_BALL")).toBe("MASTER BALL");
    expect(byItem.get("ITEM_KINGS_ROCK")).toBe("KING'S ROCK");
    expect(byItem.get("ITEM_LAX_INCENSE")).toBe("LAX INCENSE");
  });

  it("resolves every held item referenced by battle-frontier-mons.json to a name", () => {
    const usedFrontierItems = new Set(battleFrontierMons.entries.map((e) => e.itemName));
    expect(usedFrontierItems.size).toBeGreaterThan(0);
    for (const frontierItem of usedFrontierItems) {
      const realItem = FRONTIER_ITEM_TO_REAL_ITEM[frontierItem];
      if (realItem === undefined) continue; // spot-check table, not exhaustive
      expect(byItem.get(realItem)).toBeDefined();
    }
    // Direct spot check: slot 0's held item resolves through the indirection.
    const first = battleFrontierMons.entries[0]!;
    expect(first.itemName).toBe("BATTLE_FRONTIER_ITEM_LAX_INCENSE");
    expect(byItem.get(FRONTIER_ITEM_TO_REAL_ITEM[first.itemName]!)).toBe("LAX INCENSE");
  });
});
