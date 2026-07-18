// Dev-time extractor: item id -> { holdEffect, holdEffectParam }, for every
// item in src/data/items.h that has an explicit `.holdEffect = HOLD_EFFECT_x`
// field set (items with only `.holdEffectParam` and no `.holdEffect` - e.g.
// ITEM_POTION's holdEffectParam=20 - are dead data: holdEffect defaults to
// HOLD_EFFECT_NONE via the designated-initializer's implicit zero, so no
// switch/case in the engine (CalculateBaseDamage, Cmd_accuracycheck,
// GetBattlerHoldEffect's ITEMEFFECT_* cases) ever reads that param; those
// are correctly excluded here).
//
// Sourced for docs/battle-turn-notes.md S7 groundwork item 1 (battle 1's
// opponent held items BRIGHT_POWDER/LAX_INCENSE/WHITE_HERB): confirms
// BRIGHT_POWDER/LAX_INCENSE = HOLD_EFFECT_EVASION_UP (accuracy-relevant,
// src/battle_script_commands.c Cmd_accuracycheck) and WHITE_HERB =
// HOLD_EFFECT_RESTORE_STATS (stat-stage-relevant, src/battle_util.c's
// ITEMEFFECT_ON_SWITCH_IN/NORMAL/MOVE_END cases) - neither is a damage
// modifier (CalculateBaseDamage, src/pokemon.c:3106-3282, never checks
// either constant). Extracting the full table (not just these 3) since the
// same source pass covers it and S7's data-needs audit already flags the
// broader item/ability/weather modifier chain as still-missing engine data.
//
// Source: src/data/items.h (gItems[]), constant names from
// include/constants/hold_effects.h.
// Run with:
//   node --experimental-strip-types tools/extract/extract-item-hold-effects.ts
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

const holdEffectsH = readFileSync(join(REF, "include", "constants", "hold_effects.h"), "utf8");
const itemsC = readFileSync(join(REF, "src", "data", "items.h"), "utf8");

function parseHoldEffectConstants(): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of holdEffectsH.matchAll(/^#define HOLD_EFFECT_(\w+)\s+(\d+)/gm)) {
    out.set(m[1]!, Number.parseInt(m[2]!, 10));
  }
  return out;
}
const holdEffectConstants = parseHoldEffectConstants();
if (holdEffectConstants.get("NONE") !== 0) throw new Error("HOLD_EFFECT_NONE expected to be 0");

// Split into per-item blocks the same way extract-item-names.ts anchors on
// `[ITEM_x] = {`, but here we need the whole block body (not just the first
// field), so slice between consecutive markers instead of a single regex.
const itemBlockStarts = [...itemsC.matchAll(/\[ITEM_(\w+)\]\s*=\s*\{/g)].map((m) => ({
  item: m[1]!,
  index: m.index!,
  bodyStart: m.index! + m[0]!.length,
}));
if (itemBlockStarts.length === 0) throw new Error("no [ITEM_x] = { blocks found in items.h");

const entries: { item: string; holdEffect: string; holdEffectParam: number }[] = [];
for (let i = 0; i < itemBlockStarts.length; i++) {
  const { item, bodyStart } = itemBlockStarts[i]!;
  const bodyEnd = i + 1 < itemBlockStarts.length ? itemBlockStarts[i + 1]!.index : itemsC.indexOf("\n};", bodyStart);
  const block = itemsC.slice(bodyStart, bodyEnd);

  const holdEffectMatch = /\.holdEffect\s*=\s*HOLD_EFFECT_(\w+)/.exec(block);
  if (!holdEffectMatch) continue; // no explicit .holdEffect field -> HOLD_EFFECT_NONE, not a real hold effect

  const holdEffectName = holdEffectMatch[1]!;
  if (!holdEffectConstants.has(holdEffectName)) {
    throw new Error(`ITEM_${item}: unknown HOLD_EFFECT_${holdEffectName} (not in hold_effects.h)`);
  }

  const paramMatch = /\.holdEffectParam\s*=\s*(\d+)/.exec(block);
  const holdEffectParam = paramMatch ? Number.parseInt(paramMatch[1]!, 10) : 0;

  entries.push({ item: `ITEM_${item}`, holdEffect: `HOLD_EFFECT_${holdEffectName}`, holdEffectParam });
}

// Spot-check the three items this extraction was scoped for.
const bySymbol = new Map(entries.map((e) => [e.item, e]));
const expected: Record<string, { holdEffect: string; holdEffectParam: number }> = {
  ITEM_BRIGHT_POWDER: { holdEffect: "HOLD_EFFECT_EVASION_UP", holdEffectParam: 10 },
  ITEM_LAX_INCENSE: { holdEffect: "HOLD_EFFECT_EVASION_UP", holdEffectParam: 5 },
  ITEM_WHITE_HERB: { holdEffect: "HOLD_EFFECT_RESTORE_STATS", holdEffectParam: 0 },
};
for (const [item, want] of Object.entries(expected)) {
  const got = bySymbol.get(item);
  if (!got || got.holdEffect !== want.holdEffect || got.holdEffectParam !== want.holdEffectParam) {
    throw new Error(`${item}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
  }
}

entries.sort((a, b) => (a.item < b.item ? -1 : a.item > b.item ? 1 : 0));

writeFileSync(join(DATA_GEN, "item-hold-effects.json"), `${JSON.stringify({ items: entries }, null, 0)}\n`);
console.log(
  `wrote ${join(DATA_GEN, "item-hold-effects.json")} (${entries.length} items with an explicit hold effect)`,
);
