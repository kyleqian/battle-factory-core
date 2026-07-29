import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  SANDSTORM_FRAME_COUNT,
  sandstormAtAge,
} from "../../src/animation/sandstorm.ts";

describe("MOVE_SANDSTORM source reducer", () => {
  it("ports the scrolling background alpha program through cleanup", () => {
    expect(sandstormAtAge(0)).toMatchObject({
      active: true,
      flyingDirtLoaded: false,
      backgroundLoaded: false,
    });
    expect(sandstormAtAge(7)).toMatchObject({
      backgroundTaskActive: true,
      visualTaskCount: 1,
      bgScroll: { x: 506, y: 511 },
      blend: { eva: 0, evb: 16 },
    });
    expect(sandstormAtAge(34)).toMatchObject({
      bgScroll: { x: 344, y: 484 },
      blend: { eva: 7, evb: 9 },
    });
    expect(sandstormAtAge(139).blend).toEqual({ eva: 6, evb: 10 });
    expect(sandstormAtAge(166)).toMatchObject({
      active: true,
      backgroundTaskActive: false,
      visualTaskCount: 0,
      bgScroll: { x: 76, y: 354 },
    });
    expect(sandstormAtAge(167)).toEqual({
      active: false,
      flyingDirtLoaded: false,
      backgroundLoaded: false,
      backgroundTaskActive: false,
      visualTaskCount: 0,
      bgScroll: { x: 0, y: 0 },
      blend: { eva: 0, evb: 0 },
      crescents: [],
    });
    expect(SANDSTORM_FRAME_COUNT).toBe(168);
  });

  it("ports all seven fixed-point flying-sand crescent lifecycles", () => {
    expect(sandstormAtAge(23).crescents).toHaveLength(0);
    expect(sandstormAtAge(24).crescents[0]).toEqual({
      spawnIndex: 0,
      oamSlot: 3,
      x: -64,
      y: 10,
      x2: 9,
      y2: 0,
      velocityX: 2304,
      velocityY: 96,
      fractionalX: 0,
      fractionalY: 96,
    });
    expect(sandstormAtAge(72).crescents.at(-1)).toMatchObject({
      spawnIndex: 4,
      oamSlot: 3,
      y: 70,
      x2: 7,
      velocityX: 1984,
      fractionalX: 192,
    });
    expect(sandstormAtAge(96).crescents.at(-1)).toMatchObject({
      spawnIndex: 6,
      oamSlot: 5,
      y: 60,
      x2: 10,
      velocityX: 2560,
    });
    expect(sandstormAtAge(128).crescents).toHaveLength(1);
    expect(sandstormAtAge(138).crescents).toHaveLength(0);
  });

  it("pins the legal carrier and distinct Heat Wave sibling", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/sandstormSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain(
      "set 120/FRONTIER_MON_PHANPY -> SPECIES_PHANPY 231/move 201",
    );
    expect(output).toContain(
      "Heat Wave remains distinct: red particle/background blends",
    );
  });
});
