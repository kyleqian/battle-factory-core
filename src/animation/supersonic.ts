import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export const SUPERSONIC_RING_COUNT = 6;
// Script `delay 2` becomes four captured display frames through the
// battle-animation command scheduler.
export const SUPERSONIC_RING_SPAWN_PERIOD = 4;
export const SUPERSONIC_RING_DURATION = 30;

export interface SupersonicRingSprite {
  readonly x: number;
  readonly y: number;
  readonly xScale: number;
  readonly yScale: number;
  readonly spawnIndex: number;
}

/**
 * Complete `Move_SUPERSONIC` body relative to the first ring creation tick.
 * The six children are literal `SupersonicRing` calls; geometry comes only
 * from the two battlers' source animation coordinates and attacker side.
 */
export function supersonicEffectAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): Readonly<{
  attackerOffset: Readonly<{ x2: number; y2: number }>;
  rings: readonly SupersonicRingSprite[];
}> {
  const rings: SupersonicRingSprite[] = [];
  const startX = attackerCenter.x + (attackerSide === "player" ? 16 : -16);
  const dx = targetCenter.x - startX;
  const dy = targetCenter.y - attackerCenter.y;
  for (let index = 0; index < SUPERSONIC_RING_COUNT; index += 1) {
    const local = age - index * SUPERSONIC_RING_SPAWN_PERIOD;
    if (local < 0 || local > SUPERSONIC_RING_DURATION) continue;
    const callbacks = Math.min(local + 1, SUPERSONIC_RING_DURATION);
    const x2 = linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(dx, SUPERSONIC_RING_DURATION),
      callbacks,
      SUPERSONIC_RING_DURATION,
    );
    const y2 = linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(dy, SUPERSONIC_RING_DURATION),
      callbacks,
      SUPERSONIC_RING_DURATION,
    );
    const affineScale = 32 + (local + 1) * 7;
    const matrix = Math.trunc(0x10000 / affineScale);
    rings.push({
      x: startX + x2,
      y: attackerCenter.y + y2,
      xScale: matrix,
      yScale: matrix,
      spawnIndex: index,
    });
  }
  return {
    // The task is created one animation callback before the first ring.
    attackerOffset: shakeMon2OffsetAtTick(2, 0, 8, 1, age + 1),
    rings,
  };
}
