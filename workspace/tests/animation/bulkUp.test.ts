import { describe, expect, it } from "vitest";
import {
  bulkUpAtAge,
  BULK_UP_BREATH_CREATION_AGE,
} from "../../src/animation/bulkUp.ts";
import {
  swaggerBreathAtAge,
  swaggerGrowAndShrinkAtAge,
} from "../../src/animation/swagger.ts";

describe("MOVE_BULK_UP source-relative reducer", () => {
  it("is exactly the shared SWAGGER prefix for the carrier picture height", () => {
    // FRONTIER_MON_PRIMEAPE_2 (set 337) back and front both carry
    // gMonBackPicCoords/gMonFrontSpriteCoords y_offset 7, so the shared
    // SetBattlerSpriteYOffsetFromYScale height is 64 - 2*7 = 50 on both sides.
    const state = (age: number) => bulkUpAtAge(
      age, "player", { x: 72, y: 95 }, 50,
    );
    for (let age = 0; age <= 102; age += 1) {
      expect(state(age).attackerScale).toEqual(swaggerGrowAndShrinkAtAge(age));
      expect(state(age).breath).toEqual(
        swaggerBreathAtAge(age, "player", { x: 72, y: 95 }),
      );
    }
  });

  it("anchors the Primeape grow to the shared 12/24/12 affine program", () => {
    const state = (age: number) => bulkUpAtAge(
      age, "opponent", { x: 176, y: 47 }, 50,
    );
    expect([0, 1, 11, 12, 35, 36, 47, 48].map(
      (age) => state(age).attackerScale,
    )).toEqual([
      { x: 252, y: 251 },
      { x: 248, y: 246 },
      { x: 208, y: 196 },
      { x: 208, y: 196 },
      { x: 208, y: 196 },
      { x: 212, y: 201 },
      { x: 256, y: 256 },
      { x: 256, y: 256 },
    ]);
  });

  it("ports the Primeape Y anchoring for the 50-px picture height", () => {
    const state = (age: number) => bulkUpAtAge(
      age, "player", { x: 72, y: 95 }, 50,
    );
    expect([0, 2, 7, 11, 12, 35, 36, 47, 48].map(
      (age) => state(age).attackerY2,
    )).toEqual([0, -1, -4, -7, -7, -7, -6, 0, 0]);
  });

  it("spawns the shared breath puff at the Primeape breath origin and cleans up", () => {
    const player = (age: number) => bulkUpAtAge(
      age, "player", { x: 72, y: 95 }, 50,
    );
    const opponent = (age: number) => bulkUpAtAge(
      age, "opponent", { x: 176, y: 47 }, 50,
    );
    expect(BULK_UP_BREATH_CREATION_AGE).toBe(49);
    expect(player(48).breath).toBeNull();
    expect(player(49).breath).toMatchObject({
      age: 0, x: 104, y: 95, frame: 0, hFlip: true,
    });
    expect(opponent(49).breath).toMatchObject({
      x: 143, y: 47, frame: 0, hFlip: false,
    });
    expect(player(101).breath).toMatchObject({ age: 52, frame: 3 });
    expect(player(102).breath).toBeNull();
    expect(opponent(102).breath).toBeNull();
  });

  it("has no anger marks or other SWAGGER-tail components", () => {
    const state = (age: number) => bulkUpAtAge(
      age, "player", { x: 72, y: 95 }, 50,
    );
    const keys = Object.keys(state(140));
    expect(keys).toEqual(["attackerScale", "attackerY2", "breath"]);
    expect(state(140).breath).toBeNull();
  });
});
