/**
 * The sprite-order plan of an absorption-orb body (Absorb / Mega Drain / Giga Drain: hitsplat, AnimAbsorptionOrb orbs, healing
 * stars and the `simple_palette_blend` controller sprites), in the production encoding of spriteOrderEventTransform.ts
 * decodeSpriteOrderPlan, derived from the body renderer's own timeline (docs/giga-drain-geometry-order.md).
 *
 * Every frame whose sprite set changes is one allocation window; sprites are created in script order (all CreateSprite
 * first-free: "f"). A same-frame destroy group is listed in sSpriteOrder order: DestroySprite resets a sprite to sDummySprite
 * (equal keys), so the group keeps the order of the last SortSprites (sprite.c) in which its members were live. SortSprites is a
 * stable insertion sort on the priority word (equal for every sprite of these bodies' destroy groups) and then oam.y descending, so
 * two sprites swap only when their oam.y differ; oam.y = y + y2 + the centre-to-corner offset (16x16 orb -8, 64x64 hitsplat -32,
 * 32x32 star -16), an 8-bit value read as negative from DISPLAY_HEIGHT. A new sprite enters behind the live ones (its slot is in the
 * dummy tail) in creation order. The orbs' y follows the attacker / target picture coordinates through the InitAnimArcTranslation
 * fixed-point arithmetic, so a same-frame pair of orbs with different start / period can order either way with the geometry.
 */
export interface AbsorptionBodySprite {
  readonly kind: "hitsplat" | "orb" | "star";
  readonly spawnIndex: number;
  readonly y: number;
  readonly y2: number;
}

export function absorptionBodySpriteOrderPlanText(
  lastAge: number,
  stateAt: (age: number) => Readonly<{ sprites: readonly AbsorptionBodySprite[]; paletteControllerActive: boolean }>,
): string {
  const owner = (sprite: AbsorptionBodySprite) =>
    sprite.kind === "hitsplat" ? 100 : sprite.kind === "orb" ? 200 + sprite.spawnIndex : 300 + sprite.spawnIndex;
  const oamY = (sprite: AbsorptionBodySprite) => {
    const raw = (sprite.y + sprite.y2 + (sprite.kind === "orb" ? -8 : sprite.kind === "hitsplat" ? -32 : -16)) & 0xff;
    return raw >= 160 ? raw - 256 : raw;
  };
  const created = new Map<number, number>();
  let order: number[] = [];
  let live = new Map<number, number>();
  let controllers = 0, controllerWasActive = false;
  const windows: string[] = [];
  for (let age = 0; age <= lastAge + 1; age += 1) {
    const state = stateAt(age);
    const now = new Map<number, number>(state.sprites.map(sprite => [owner(sprite), oamY(sprite)]));
    // One controller sprite per simple_palette_blend command (fade in, fade out); it never shares a destroy frame with an orb.
    const controllerActive = age <= lastAge && state.paletteControllerActive;
    if (controllerActive && !controllerWasActive) controllers += 1;
    controllerWasActive = controllerActive;
    if (controllerActive) now.set(controllers, 0);
    const destroyed = order.filter(id => !now.has(id));
    const made = [...now.keys()].filter(id => !live.has(id));
    order = order.filter(id => now.has(id));
    for (const id of made) { created.set(id, created.size); order.push(id); }
    order = order.map((id, index) => ({ id, index, y: now.get(id)! }))
      .sort((left, right) => right.y - left.y || left.index - right.index).map(entry => entry.id);
    const parts: string[] = [];
    if (made.length) parts.push(`C${"f".repeat(made.length)}`);
    if (destroyed.length) parts.push(`D${destroyed.map(id => created.get(id)).join(",")}`);
    if (parts.length) windows.push(parts.join("/"));
    live = now;
  }
  return windows.join(";");
}
