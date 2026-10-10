import {
  blizzardEffectOamOrderAtAge, blizzardImpactStartAge, type BlizzardAttackerSide, type BlizzardGeometry,
} from "./blizzard.ts";

/** Blizzard's impact crystals (IceCrystalEffectLong): the last one is created 60 rows after the impact start and lives 37 rows. */
const BLIZZARD_LAST_EFFECT_AFTER_IMPACT_START = 60 + 37;

/**
 * S10A plans54 (docs/next-adapters-plans54.md): Move_BLIZZARD's (59) sprite-order plan, in the production encoding of
 * spriteOrderEventTransform.ts decodeSpriteOrderPlan, derived from the body renderer's own allocator replay (blizzard.ts
 * blizzardEffectOamOrderAtAge, geoice: source CreateSprite lowest-free / DestroySprite / stable SortSprites over the swirling snowballs,
 * the traveling large crystals and IceCrystalEffectLong's impact crystals at the displayed geometry). The BG fade / sliding BG / monbg are
 * no sprites.
 *
 * Every age whose slot occupancy changes is one allocation window; creations are CreateSprite first-free ("f"). A slot freed and taken
 * again in the same frame is no allocation event (spriteOrderProvider.ts applySpriteOrderWindow): the slot keeps its plan index. A same-age
 * destroy group is listed in the previous age's sSpriteOrder order (the replay's sorted order).
 */
export function blizzardSpriteOrderPlanText(side: BlizzardAttackerSide, geometry: BlizzardGeometry): string {
  const lastAge = blizzardImpactStartAge(side, geometry) + BLIZZARD_LAST_EFFECT_AFTER_IMPACT_START + 1;
  let occupant = new Map<number, number>();
  let order: readonly number[] = [];
  let made = 0;
  const windows: string[] = [];
  for (let age = 0; age <= lastAge; age += 1) {
    const entries = blizzardEffectOamOrderAtAge(age, side, geometry);
    const now = new Set(entries.map(entry => entry.oamSlot));
    const position = new Map(order.map((slot, at) => [slot, at] as const));
    const destroyed = [...occupant.keys()].filter(slot => !now.has(slot)).sort((left, right) => position.get(left)! - position.get(right)!);
    const createdSlots = [...now].filter(slot => !occupant.has(slot)).sort((left, right) => left - right);
    const parts: string[] = [];
    if (createdSlots.length) parts.push(`C${"f".repeat(createdSlots.length)}`);
    if (destroyed.length) parts.push(`D${destroyed.map(slot => occupant.get(slot)!).join(",")}`);
    if (parts.length) windows.push(parts.join("/"));
    const next = new Map<number, number>();
    for (const slot of now) next.set(slot, occupant.get(slot) ?? -1);
    for (const slot of createdSlots) next.set(slot, made++);
    occupant = next;
    order = entries.map(entry => entry.oamSlot);
  }
  if (occupant.size !== 0) throw new Error("Blizzard effect sprites outlive the replay window");
  return windows.join(";");
}
