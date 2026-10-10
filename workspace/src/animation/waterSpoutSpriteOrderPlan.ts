import { waterSpoutTimeline, type WaterSpoutLiveInputs } from "./waterSpout.ts";

/**
 * S10A plans54 (docs/next-adapters-plans54.md): Water Spout's (323) sprite-order body plan, in the production encoding of
 * spriteOrderEventTransform.ts decodeSpriteOrderPlan, derived from the body renderer's own timeline (waterSpout.ts waterSpoutTimeline: the
 * HP-tiered launch orbs of AnimTask_WaterSpoutLaunch / CreateWaterSpoutLaunchDroplets, the rain droplets of AnimTask_WaterSpoutRain and
 * their hit splats, with the reducer's own SortSprites replay of the 64-entry sSpriteOrder).
 *
 * Every age whose slot occupancy changes is one allocation window; creations are CreateSprite first-free ("f"). A same-age destroy group is
 * listed in the previous age's sSpriteOrder order (the reducer's sort state = the reversed painter order; spriteOrderProvider.ts
 * applySpriteOrderWindow). The launch orbs are born at one point, so their tie order is the lent order: `inputs.spriteOrderSeed` must be the
 * body's own lent 64-entry order (as the live case-323 renderer is given).
 */
export function waterSpoutSpriteOrderPlanText(inputs: Readonly<WaterSpoutLiveInputs>): string {
  return planTextOf(inputs);
}

function planTextOf(inputs: Readonly<WaterSpoutLiveInputs>): string {
  const frames = waterSpoutTimeline(inputs);
  // Per slot: the plan index of the sprite occupying it. A slot whose sprite is destroyed and whose slot is taken again in the same frame
  // (AnimWaterSpoutRain's droplet freed before AnimTask_WaterSpoutRain creates the next one) is no allocation event in that window
  // (spriteOrderProvider.ts applySpriteOrderWindow): the slot keeps its plan index.
  let occupant = new Map<number, number>();
  let previousOrder: readonly number[] = [];
  let made = 0;
  const windows: string[] = [];
  for (let index = 0; index <= frames.length; index += 1) {
    const frame = frames[index];
    const now = new Set((frame?.sprites ?? []).map(sprite => sprite.slot));
    const position = new Map(previousOrder.map((slot, at) => [slot, at] as const));
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
    previousOrder = frame === undefined ? [] : [...frame.painterOrder].reverse();
  }
  return windows.join(";");
}
