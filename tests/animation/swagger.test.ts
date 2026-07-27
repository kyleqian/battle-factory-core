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
    expect(swaggerBreathAtAge(49, "player", { x: 72, y: 80 })).toBeNull();
    expect(swaggerBreathAtAge(50, "player", { x: 72, y: 80 })).toEqual({
      kind: "breath", age: 0, x: 104, y: 80, frame: 0, hFlip: true,
    });
    expect(swaggerBreathAtAge(54, "player", { x: 72, y: 80 })).toMatchObject({
      x: 105, frame: 1,
    });
    expect(swaggerBreathAtAge(94, "opponent", { x: 176, y: 40 }))
      .toMatchObject({ x: 133, frame: 2, hFlip: false });
    expect(swaggerBreathAtAge(101, "player", { x: 72, y: 80 }))
      .toMatchObject({ x: 116, frame: 3 });
    expect(swaggerBreathAtAge(102, "player", { x: 72, y: 80 })).toBeNull();
  });

  it("ports both target-relative anger marks, mirroring and affine teardown", () => {
    const player = (age: number) => swaggerAtAge(
      age, "opponent", { x: 176, y: 40 }, "player", { x: 72, y: 88 },
    );
    const opponent = (age: number) => swaggerAtAge(
      age, "player", { x: 72, y: 80 }, "opponent", { x: 176, y: 42 },
    );
    expect(player(127).angerMarks).toEqual([]);
    expect(player(128).angerMarks[0]).toMatchObject({
      spawnIndex: 0, x: 52, y: 60, xScale: 267, yScale: 267,
    });
    expect(opponent(128).angerMarks[0]).toMatchObject({ x: 196, y: 14 });
    expect(player(140).angerMarks).toHaveLength(2);
    expect(player(143).angerMarks).toHaveLength(2);
    expect(player(144).angerMarks).toHaveLength(1);
    expect(player(155).angerMarks[0]).toMatchObject({
      spawnIndex: 1, xScale: 256, yScale: 256,
    });
    expect(player(156).angerMarks).toEqual([]);
  });
});
