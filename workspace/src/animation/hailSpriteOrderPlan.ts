import { HAIL_WINDOW_ROWS, hailAtAge, type HailProfile } from "./hail.ts";

/**
 * S10A plans54 (docs/next-adapters-plans54.md): the sprite-order plan of Move_HAIL (body 258; General_Hail = HAIL_CONTINUES is
 * `goto Move_HAIL`), in the production encoding of spriteOrderEventTransform.ts decodeSpriteOrderPlan, derived from the body renderer's
 * own timeline (hail.ts hailAtAge: AnimTask_Hail2's thirty gHailParticleSpriteTemplate particles at the ten sHailCoordData targets, the
 * visible battlers' X_2 / Y_PIC_OFFSET -+ width / height / 6, and the gIceCrystalHitLargeSpriteTemplate impacts). The palette blends are
 * tasks: the plan has no controller sprite.
 *
 * Every age whose slot occupancy changes is one allocation window; creations are CreateSprite first-free ("f"). A slot freed and taken
 * again in the same frame (a landed particle's slot reused by the next particle) is no allocation event (spriteOrderProvider.ts
 * applySpriteOrderWindow): the slot keeps its plan index. A same-age destroy group is listed in the previous frame's sSpriteOrder order:
 * SortSprites (sprite.c) is a stable insertion sort on the priority word ((oam.priority << 8) | subpriority: 2 / 18 for every hail sprite)
 * and then oam.y descending (y >= 160 reads y - 256; an affine double-size 64x64 sprite above 128 too); a new sprite enters behind the
 * live ones (its slot is in the dummy tail).
 */
export function hailSpriteOrderPlanText(profile: HailProfile): string {
  let occupant = new Map<number, Readonly<{ id: string; n: number }>>();
  let order: number[] = [];
  let made = 0;
  const windows: string[] = [];
  for (let age = 0; age <= HAIL_WINDOW_ROWS + 1; age += 1) {
    const sprites = hailAtAge(age, profile).sprites;
    const now = new Map(sprites.map(sprite => [sprite.slot, sprite] as const));
    const position = new Map(order.map((slot, at) => [slot, at] as const));
    const idOf = (sprite: (typeof sprites)[number]) => `${sprite.kind}:${sprite.birthAge}`;
    const destroyed = [...occupant.keys()].filter(slot => !now.has(slot)).sort((left, right) => position.get(left)! - position.get(right)!);
    const createdSlots = [...now.keys()].filter(slot => !occupant.has(slot)).sort((left, right) => left - right);
    const next = new Map<number, Readonly<{ id: string; n: number }>>();
    for (const [slot, sprite] of now) {
      const held = occupant.get(slot);
      if (held !== undefined) next.set(slot, { id: idOf(sprite), n: held.n });
    }
    const parts: string[] = [];
    if (createdSlots.length) parts.push(`C${"f".repeat(createdSlots.length)}`);
    for (const slot of createdSlots) next.set(slot, { id: idOf(now.get(slot)!), n: made++ });
    if (destroyed.length) parts.push(`D${destroyed.map(slot => occupant.get(slot)!.n).join(",")}`);
    if (parts.length) windows.push(parts.join("/"));
    occupant = next;
    // This frame's SortSprites over the live hail sprites (slots keep their array position through a same-frame free + reuse).
    const key = (slot: number) => {
      const [attr0, attr1, attr2] = now.get(slot)!.attr;
      let y = attr0 & 0xff;
      if (y >= 160) y -= 256;
      const doubleSize = ((attr0 >> 8) & 3) === 3, size3 = ((attr1 >> 14) & 3) === 3, shape = (attr0 >> 14) & 3;
      if (doubleSize && size3 && (shape === 0 || shape === 2) && y > 128) y -= 256;
      return { priority: (((attr2 >> 10) & 3) << 8) | 18, y };
    };
    const kept = order.filter(slot => now.has(slot));
    order = [...kept, ...[...now.keys()].filter(slot => !kept.includes(slot)).sort((left, right) => left - right)]
      .map((slot, at) => ({ slot, at, ...key(slot) }))
      .sort((left, right) => left.priority - right.priority || right.y - left.y || left.at - right.at).map(entry => entry.slot);
  }
  return windows.join(";");
}
