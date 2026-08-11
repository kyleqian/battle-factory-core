import { describe, expect, it } from "vitest";
import {
  SUPERSONIC_RING_COUNT,
  SUPERSONIC_RING_DURATION,
  SUPERSONIC_RING_SPAWN_PERIOD,
  supersonicEffectAtAge,
} from "../../src/animation/supersonic.ts";

describe("MOVE_SUPERSONIC source-relative reducer", () => {
  it("creates all six literal rings at the delay-2 command's four-display-tick cadence", () => {
    expect(SUPERSONIC_RING_COUNT).toBe(6);
    expect(SUPERSONIC_RING_SPAWN_PERIOD).toBe(4);
    expect(SUPERSONIC_RING_DURATION).toBe(30);
    expect(Array.from({ length: 6 }, (_, index) =>
      supersonicEffectAtAge(index * 4, "player", { x: 72, y: 104 }, { x: 176, y: 40 })
        .rings.some((ring) => ring.spawnIndex === index)
    )).toEqual([true, true, true, true, true, true]);
  });

  it("mirrors the source initial x offset by attacker side", () => {
    const player = supersonicEffectAtAge(0, "player", { x: 72, y: 88 }, { x: 176, y: 42 }).rings[0]!;
    const opponent = supersonicEffectAtAge(0, "opponent", { x: 176, y: 43 }, { x: 72, y: 80 }).rings[0]!;
    expect(player.x).toBeGreaterThan(72);
    expect(opponent.x).toBeLessThan(176);
  });

  it("reuses the exact ShakeMon2 (2,0,8,1) tuple", () => {
    expect([0, 1, 2, 3, 14, 15, 16].map((age) =>
      supersonicEffectAtAge(age, "player", { x: 72, y: 104 }, { x: 176, y: 40 })
        .attackerOffset.x2
    )).toEqual([-2, -2, 2, 2, 0, 0, 0]);
  });
});
