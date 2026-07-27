import { describe, expect, it } from "vitest";
import {
  WATER_GUN_DROPLET_DURATIONS,
  WATER_GUN_DROPLET_START_AGES,
  WATER_GUN_PROJECTILE_DURATION,
  waterGunEffectAtAge,
} from "../../src/animation/waterGun.ts";

describe("MOVE_WATER_GUN source-relative reducer", () => {
  const player = (age: number) =>
    waterGunEffectAtAge(age, "player", { x: 72, y: 104 }, { x: 176, y: 42 });

  it("ports the literal 40-tick projectile arc and mirrors its x origin", () => {
    expect(WATER_GUN_PROJECTILE_DURATION).toBe(40);
    expect(player(0).sprites[0]).toMatchObject({ kind: "projectile", spawnIndex: 0 });
    const opponent = waterGunEffectAtAge(
      0, "opponent", { x: 176, y: 45 }, { x: 72, y: 88 },
    ).sprites[0]!;
    expect(player(0).sprites[0]!.x).toBeGreaterThan(72);
    expect(opponent.x).toBeLessThan(176);
    expect(player(40).sprites.some((sprite) => sprite.kind === "projectile")).toBe(false);
  });

  it("ports all three literal delayed droplet calls and durations", () => {
    expect(WATER_GUN_DROPLET_START_AGES).toEqual([42, 62, 82]);
    expect(WATER_GUN_DROPLET_DURATIONS).toEqual([55, 50, 45]);
    expect(WATER_GUN_DROPLET_START_AGES.map((age, index) =>
      player(age).sprites.some((sprite) =>
        sprite.kind === "droplet" && sprite.spawnIndex === index
      )
    )).toEqual([true, true, true]);
  });

  it("uses only the source literal target ShakeMon2 (1,0,8,1) tuple", () => {
    expect([41, 42, 43, 44, 55, 56, 57].map((age) => player(age).targetOffset.x2))
      .toEqual([0, 1, -1, -1, -1, -1, 0]);
  });
});
