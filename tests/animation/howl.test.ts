import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  HOWL_FRAME_COUNT,
  howlAtAge,
} from "../../src/animation/howl.ts";

describe("MOVE_HOWL source reducer", () => {
  it("ports DeepInhale's complete affine program and x2 interval", () => {
    const point = { x: 72, y: 80 };
    expect([3, 4, 7, 8, 23, 24, 27, 50, 52, 67, 68].map((age) => {
      const state = howlAtAge(age, "player", point).attacker;
      return {
        age, active: state.active, x2: state.x2,
        matrix: [state.matrix.a, state.matrix.d],
      };
    })).toEqual([
      { age: 3, active: false, x2: 0, matrix: [256, 256] },
      { age: 4, active: true, x2: 0, matrix: [272, 256] },
      { age: 7, active: true, x2: 0, matrix: [320, 256] },
      { age: 8, active: true, x2: 0, matrix: [320, 253] },
      { age: 23, active: true, x2: 0, matrix: [320, 208] },
      { age: 24, active: true, x2: 0, matrix: [324, 208] },
      { age: 27, active: true, x2: -1, matrix: [336, 208] },
      { age: 50, active: true, x2: 0, matrix: [336, 208] },
      { age: 52, active: true, x2: 0, matrix: [331, 211] },
      { age: 67, active: true, x2: 0, matrix: [256, 256] },
      { age: 68, active: false, x2: 0, matrix: [256, 256] },
    ]);
    expect(howlAtAge(25, "player", point).attacker.x2).toBe(1);
    expect(howlAtAge(26, "player", point).attacker.x2).toBe(1);
    expect(howlAtAge(27, "player", point).attacker.x2).toBe(-1);
  });

  it("ports both RoarEffect waves, animation frames, flips and cleanup", () => {
    const player = howlAtAge(18, "player", { x: 72, y: 80 });
    expect(player.noiseLines).toEqual([
      {
        wave: 0, line: 0, slot: 3, centerX: 98, centerY: 69,
        frame: 0, hFlip: false, vFlip: false, callbackCount: 1,
        callback: "AnimRoarNoiseLine_Step",
      },
      {
        wave: 0, line: 1, slot: 4, centerX: 98, centerY: 80,
        frame: 2, hFlip: false, vFlip: false, callbackCount: 1,
        callback: "AnimRoarNoiseLine_Step",
      },
      {
        wave: 0, line: 2, slot: 5, centerX: 98, centerY: 90,
        frame: 0, hFlip: false, vFlip: true, callbackCount: 1,
        callback: "AnimRoarNoiseLine_Step",
      },
    ]);
    expect(howlAtAge(20, "player", { x: 72, y: 80 }).noiseLines[0])
      .toMatchObject({ centerX: 103, centerY: 64, frame: 1 });
    expect(howlAtAge(31, "player", { x: 72, y: 80 }).noiseLines).toEqual([]);
    expect(howlAtAge(35, "opponent", { x: 176, y: 40 }).noiseLines[0])
      .toMatchObject({
        wave: 1, slot: 3, centerX: 149, centerY: 29,
        hFlip: true, vFlip: false,
      });
    expect(howlAtAge(35, "opponent", { x: 176, y: 40 }).cry)
      .toEqual({
        species: "LOUDRED",
        mode: "CRY_MODE_HIGH_PITCH",
        panSide: "opponent",
      });
    expect(howlAtAge(101, "player", { x: 72, y: 80 })).toMatchObject({
      active: false,
      noiseLineLoaded: false,
      scriptOffset: 33,
      noiseLines: [],
    });
    expect(HOWL_FRAME_COUNT).toBe(102);
  });

  it("pins the legal carrier and the independently unsupported Roar body", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/howlSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain(
      "set 144/FRONTIER_MON_LOUDRED -> SPECIES_LOUDRED 371/MOVE_HOWL 336",
    );
    expect(output).toContain(
      "MOVE_ROAR remains distinct with ScaleMonAndRestore, SlideOffScreen",
    );
  });
});
