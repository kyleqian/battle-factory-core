import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DRAGON_DANCE_FRAME_COUNT,
  dragonDanceAtAge,
} from "../../src/animation/dragonDance.ts";

describe("MOVE_DRAGON_DANCE", () => {
  it("ports the source-relative orb, palette, waver, monbg, resource, and cleanup schedules", () => {
    const center = { x: 72, y: 88 };
    const profile = { pictureSize: { width: 64, height: 64 }, allocationSlots: [3, 4, 5, 7, 9, 10] } as const;
    expect(DRAGON_DANCE_FRAME_COUNT).toBe(142);
    expect(dragonDanceAtAge(20, "player", center, profile, 80).orbs.map((orb) => [orb.allocationSlot, orb.x2, orb.y2])).toEqual([
      [3, 32, 0], [4, 15, 27], [5, -16, 27], [7, -32, 0], [9, -17, -28],
    ]);
    expect(dragonDanceAtAge(21, "player", center, profile, 80).orbs).toHaveLength(6);
    expect(dragonDanceAtAge(22, "player", center, profile, 80).orbPaletteCoefficient).toBe(1);
    expect(dragonDanceAtAge(35, "player", center, profile, 80).orbPaletteCoefficient).toBe(14);
    expect(dragonDanceAtAge(49, "player", center, profile, 80).orbPaletteCoefficient).toBe(0);
    expect(dragonDanceAtAge(10, "player", center, profile, 80)).toMatchObject({
      monbgActive: true, waverTaskActive: true, scanlineState: 1, sound: "SE_M_TELEPORT",
    });
    expect(new Set(dragonDanceAtAge(11, "player", center, profile, 80).scanlineHofs)).toEqual(new Set([-40]));
    expect(new Set(dragonDanceAtAge(12, "player", center, profile, 80).scanlineHofs).size).toBeGreaterThan(1);
    expect(dragonDanceAtAge(84, "opponent", { x: 176, y: 46 }, profile, 40)).toMatchObject({
      waverTaskActive: true, scanlineState: 3,
    });
    expect(dragonDanceAtAge(85, "opponent", { x: 176, y: 46 }, profile, 40)).toMatchObject({
      waverTaskActive: false, scanlineState: 0, sound: "SE_M_TELEPORT",
    });
    expect(dragonDanceAtAge(141, "player", center, profile, 80)).toMatchObject({
      active: false, resourceLoaded: false, monbgActive: false, waverTaskActive: false, orbs: [],
    });
  });

  it("regenerates the source HOLLOW_ORB asset byte-for-byte", () => {
    const before = readFileSync("src/animation/assets/dragon-dance.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractDragonDanceAssets.ts"]);
    expect(readFileSync("src/animation/assets/dragon-dance.json")).toEqual(before);
  });

  it("passes all 284 retained actual-core rows in two independent processes", () => {
    const run = () => JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/dragonDanceActualCore.ts", "--require-exact",
    ], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));
    const first = run(), second = run();
    expect(first).toMatchObject({
      schema: "dragon-dance-actual-core-residual/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_DRAGON_DANCE", totalRows: 284, exactRows: 284, residualRows: 0,
      firstResidual: null, lastResidual: null, maximumResidual: null,
      rowsSha256: "d75f6655f84394141f0e5fa01e3960add2d525e5d7bee15a09f8a1aedf932a75",
      alteredControl: { differs: true, species: "ALTARIA", allocationSlots: [4, 6, 8, 9, 11, 12] },
    });
    expect(second).toEqual(first);
  }, 20_000);
});
