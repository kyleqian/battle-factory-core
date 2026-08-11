import { describe, expect, it } from "vitest";
import itemHoldEffects from "../src/data/gen/item-hold-effects.json" with { type: "json" };

const byItem = new Map<string, { holdEffect: string; holdEffectParam: number }>(
  (itemHoldEffects.items as { item: string; holdEffect: string; holdEffectParam: number }[]).map((i) => [
    i.item,
    { holdEffect: i.holdEffect, holdEffectParam: i.holdEffectParam },
  ]),
);

describe("item-hold-effects.json (S7 groundwork: held-item damage/accuracy/stat modifier audit)", () => {
  it("pins battle 1's opponent-held items (docs/battle-turn-notes.md S7 item 1)", () => {
    // BRIGHT_POWDER (Grovyle) / LAX_INCENSE (Murkrow): src/battle_script_commands.c's
    // Cmd_accuracycheck multiplies the attacker's calculated hit chance by
    // (100-holdEffectParam)/100 when the item is held by the move's TARGET -
    // accuracy-relevant, not a CalculateBaseDamage modifier.
    expect(byItem.get("ITEM_BRIGHT_POWDER")).toEqual({ holdEffect: "HOLD_EFFECT_EVASION_UP", holdEffectParam: 10 });
    expect(byItem.get("ITEM_LAX_INCENSE")).toEqual({ holdEffect: "HOLD_EFFECT_EVASION_UP", holdEffectParam: 5 });
    // WHITE_HERB (Pidgeotto): src/battle_util.c's ITEMEFFECT_ON_SWITCH_IN/
    // NORMAL/MOVE_END cases reset any statStages[i] < DEFAULT_STAT_STAGE
    // back to 6 - stat-stage-relevant, also not a damage modifier.
    expect(byItem.get("ITEM_WHITE_HERB")).toEqual({ holdEffect: "HOLD_EFFECT_RESTORE_STATS", holdEffectParam: 0 });
  });

  it("excludes items with only a stray .holdEffectParam and no real .holdEffect", () => {
    // ITEM_POTION sets .holdEffectParam = 20 but never .holdEffect, so it
    // defaults to HOLD_EFFECT_NONE (designated-initializer zero) and no
    // engine switch/case ever reads that param - correctly not extracted.
    expect(byItem.has("ITEM_POTION")).toBe(false);
  });

  it("covers known non-battle-1 damage-modifier hold effects (sanity check on the extraction's shape)", () => {
    expect(byItem.get("ITEM_CHOICE_BAND")).toEqual({ holdEffect: "HOLD_EFFECT_CHOICE_BAND", holdEffectParam: 0 });
    expect(byItem.get("ITEM_LEFTOVERS")).toEqual({ holdEffect: "HOLD_EFFECT_LEFTOVERS", holdEffectParam: 10 });
  });
});
