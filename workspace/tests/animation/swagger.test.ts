import { describe, expect, it } from "vitest";
import {
  swaggerAtAge,
  swaggerBreathAtAge,
  swaggerGrowAndShrinkAtAge,
} from "../../src/animation/swagger.ts";

describe("MOVE_SWAGGER source-relative reducer", () => {
  it("ports GrowAndShrink's 12/24/12 affine program and teardown", () => {
    expect([-1, 0, 11, 12, 35, 36, 47, 48].map(
      swaggerGrowAndShrinkAtAge,
    )).toEqual([
      { x: 256, y: 256 },
      { x: 252, y: 251 },
      { x: 208, y: 196 },
      { x: 208, y: 196 },
      { x: 208, y: 196 },
      { x: 212, y: 201 },
      { x: 256, y: 256 },
      { x: 256, y: 256 },
    ]);
  });

  it("ports the 52-callback mirrored breath translation and animation", () => {
    expect(swaggerBreathAtAge(48, "player", { x: 72, y: 80 })).toBeNull();
    expect(swaggerBreathAtAge(49, "player", { x: 72, y: 80 })).toEqual({
      kind: "breath", age: 0, x: 104, y: 80, frame: 0, hFlip: true,
    });
    expect(swaggerBreathAtAge(53, "player", { x: 72, y: 80 })).toMatchObject({
      x: 105, frame: 1,
    });
    expect(swaggerBreathAtAge(93, "opponent", { x: 176, y: 40 }))
      .toMatchObject({ x: 132, frame: 2, hFlip: false });
    expect(swaggerBreathAtAge(100, "player", { x: 72, y: 80 }))
      .toMatchObject({ x: 117, frame: 3 });
    expect(swaggerBreathAtAge(101, "player", { x: 72, y: 80 }))
      .toMatchObject({ age: 52, frame: 3 });
    expect(swaggerBreathAtAge(102, "player", { x: 72, y: 80 })).toBeNull();
  });

  it("ports Rattata's source SetBattlerSpriteYOffsetFromYScale correction", () => {
    const state = (age: number) => swaggerAtAge(
      age, "player", { x: 72, y: 101 }, "opponent", { x: 176, y: 42 },
    );
    expect([0, 2, 7, 11, 12, 35, 36, 47, 48].map(
      (age) => state(age).attackerY2,
    )).toEqual([0, -1, -3, -5, -5, -5, -5, 0, 0]);
  });

  it("ports both target-relative anger marks, mirroring and affine teardown", () => {
    const player = (age: number) => swaggerAtAge(
      age, "opponent", { x: 176, y: 40 }, "player", { x: 72, y: 88 },
    );
    const opponent = (age: number) => swaggerAtAge(
      age, "player", { x: 72, y: 80 }, "opponent", { x: 176, y: 42 },
    );
    expect(player(128).angerMarks).toEqual([]);
    expect(player(129).angerMarks[0]).toMatchObject({
      spawnIndex: 0, x: 52, y: 60, xScale: 278, yScale: 278,
    });
    expect(opponent(129).angerMarks[0]).toMatchObject({ x: 196, y: 14 });
    expect(player(143).angerMarks).toHaveLength(2);
    expect(player(145).angerMarks).toHaveLength(2);
    expect(player(146).angerMarks).toHaveLength(1);
    expect(player(158).angerMarks[0]).toMatchObject({
      spawnIndex: 1, xScale: 256, yScale: 256,
    });
    expect(player(160).angerMarks).toEqual([]);
  });
});
