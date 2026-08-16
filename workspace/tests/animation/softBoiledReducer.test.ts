import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { healingBlueStarFrameAtLocalAge } from "../../src/animation/recover.ts";
import { milkDrinkEffectAtAge } from "../../src/animation/milkDrink.ts";
import {
  SOFT_BOILED_EGG_LAST_AGE,
  SOFT_BOILED_EGG_START_AGE,
  softBoiledAtAge,
} from "../../src/animation/softBoiled.ts";

describe("MOVE_SOFT_BOILED source-age reducer and typed Scene-ON seam", () => {
  it("replays both retained dense orientations through first inactive cleanup", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/verifySoftBoiledReducer.ts",
    ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    const result = JSON.parse(output) as Record<string, any>;
    for (const orientation of ["player-back", "opponent-front"]) {
      expect(result[orientation]).toMatchObject({
        reducerRows: 272,
        seamRows: 272,
        latches: { oam: "271/271", matrices: "271/271", palette: "270/271" },
        cleanup: {
          age: 271, active: false, ownedSprites: 0, ownedTasks: 0, moveTags: [],
        },
      });
    }
  });

  it("pins source-relative boundaries and independent healing controls", () => {
    const geometry = {
      attackerCenter: { x: 72, y: 96 },
      targetCenter: { x: 72, y: 99 },
      battlePositionCenter: { x: 72, y: 91 },
    } as const;
    expect(softBoiledAtAge(12, "player", geometry).sprites).toHaveLength(0);
    expect(softBoiledAtAge(SOFT_BOILED_EGG_START_AGE, "player", geometry)
      .sprites.map((sprite) => sprite.kind)).toEqual(["egg", "egg"]);
    expect(softBoiledAtAge(141, "player", geometry).sprites[0]).toMatchObject({
      kind: "egg", callback: "AnimSoftBoiledEgg_Step3_Callback1", tileIndex: 321,
    });
    expect(softBoiledAtAge(142, "player", geometry).sourceOrder).toEqual([4, 3]);
    expect(softBoiledAtAge(144, "player", geometry).sprites
      .filter((sprite) => sprite.kind === "ring")).toHaveLength(1);
    expect(softBoiledAtAge(144, "player", geometry).palette).toMatchObject({
      backgroundCoefficient: 10,
      battlerCoefficient: 0,
      hardwareLatch: "mixed-bg-current-obj-preceding",
    });
    expect(softBoiledAtAge(145, "player", geometry).palette)
      .toMatchObject({ backgroundCoefficient: 10, battlerCoefficient: 10 });
    expect(softBoiledAtAge(169, "player", geometry).palette)
      .toMatchObject({ backgroundCoefficient: 0, battlerCoefficient: 2 });
    expect(softBoiledAtAge(SOFT_BOILED_EGG_LAST_AGE, "player", geometry)
      .sprites.filter((sprite) => sprite.kind === "egg").every((sprite) => sprite.invisible))
      .toBe(true);
    expect(softBoiledAtAge(220, "player", geometry).rng)
      .toMatchObject({ animationAdvances: false, animationHeldByAudioWorkload: true });

    // Recover and Milk Drink remain the independent BLUE_STAR controls; this
    // step does not widen their coverage or reuse their reducer clocks.
    expect(healingBlueStarFrameAtLocalAge(0)).toBe(0);
    expect(healingBlueStarFrameAtLocalAge(20)).toBe(0);
    expect(milkDrinkEffectAtAge(136, "player", geometry.targetCenter)
      .some((sprite) => sprite.kind === "star")).toBe(true);
  });
});
