import { describe, expect, it } from "vitest";
import {
  swallowAtAge,
  swallowCleanupAge,
  type SwallowStockpileCount,
} from "../../src/animation/swallow.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSwallowView,
  type SceneOnSwallowConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const player = (age: number, count: SwallowStockpileCount = 1) =>
  swallowAtAge(age, "player", count, { x: 72, y: 80 }, { x: 72, y: 94 }, 6);
const opponent = (age: number, count: SwallowStockpileCount = 1) =>
  swallowAtAge(age, "opponent", count, { x: 176, y: 40 }, { x: 176, y: 36 }, 4);

describe("MOVE_SWALLOW source-relative presentation", () => {
  it("ports the complete affine deformation and both ShakeMon2 phases", () => {
    expect(player(7)).toMatchObject({
      attackerMatrix: { a: 256, d: 262 },
      attackerOffset: { x2: 1, y2: 1 },
      visualTaskCount: 2,
    });
    expect(player(26)).toMatchObject({
      attackerMatrix: { a: 256, d: 376 },
      attackerOffset: { x2: -1, y2: 8 },
    });
    expect(opponent(26).attackerOffset).toEqual({ x2: -1, y2: 9 });
    expect(player(47)).toMatchObject({
      attackerMatrix: { a: 263, d: 346 },
      attackerOffset: { x2: -2, y2: 7 },
    });
    expect(player(92).attackerMatrix).toEqual({ a: 258, b: 0, c: 0, d: 256 });
    expect(player(93).attackerMatrix).toEqual({ a: 256, b: 0, c: 0, d: 256 });
  });

  it("creates five source-ordered orbs per immutable Stockpile count", () => {
    expect(player(46, 3).orbs).toHaveLength(0);
    expect(player(47, 3).orbs[0]).toMatchObject({
      index: 0, wave: 0, x: 72, y: 72, y2: -9, velocityQ8: 2208,
    });
    expect(player(59, 3).orbs.map((orb) => orb.x)).toEqual([72, 48, 88, 56, 96]);
    expect(opponent(59, 3).orbs.map((orb) => orb.x)).toEqual([176, 200, 160, 192, 152]);
    expect(player(74, 1).orbs).toHaveLength(5);
    expect(opponent(106, 1).orbs).toHaveLength(0);
    expect(player(108, 1).orbs).toHaveLength(0);
    expect(player(74, 2).orbs).toHaveLength(10);
    expect(player(89, 3).orbs).toHaveLength(15);
  });

  it("reuses the complete four-star HealingEffect and cleans every branch", () => {
    expect(player(108).stars).toHaveLength(0);
    expect(player(109).stars[0]).toMatchObject({ x: 72, y: 89, frame: 0 });
    expect(opponent(107).stars[0]).toMatchObject({ x: 176, y: 31, frame: 0 });
    expect(player(136).stars).toHaveLength(3);
    for (const count of [1, 2, 3] as const) {
      const playerCleanup = swallowCleanupAge("player", count);
      const opponentCleanup = swallowCleanupAge("opponent", count);
      expect(player(playerCleanup, count)).toMatchObject({
        active: false,
        assetsLoaded: { blueOrb: false, blueStar: false },
        orbs: [], stars: [], visualTaskCount: 0,
      });
      expect(opponent(opponentCleanup, count)).toMatchObject({
        active: false,
        assetsLoaded: { blueOrb: false, blueStar: false },
        orbs: [], stars: [], visualTaskCount: 0,
      });
    }
  });

  it("threads count as an explicit immutable typed-seam input", () => {
    const stage = createSceneOnMovePresentation<SceneOnSwallowConfig>({
      move: "SWALLOW",
      stockpileCount: 3,
      attacker: {
        species: "PELIPPER",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 54 },
          animationCenter: { x: 72, y: 86 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "DELCATTY",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 16 },
          animationCenter: { x: 176, y: 48 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      attackerPictureOffset: { x: 72, y: 94 },
      attackerPictureYOffset: 6,
      fieldProfile: {
        playerHp: 89, playerMaxHp: 154,
        opponentHp: 164, opponentMaxHp: 164,
      },
    });
    expect(sceneOnSwallowView({ ...stage, age: 89 })).toMatchObject({
      stockpileCount: 3,
      orbs: { length: 15 },
    });
    expect(stage.config.stockpileCount).toBe(3);
    expect(() => sceneOnSwallowView({
      ...stage,
      config: { ...stage.config, move: "REVERSAL" },
    } as never)).toThrow("expected SWALLOW presentation");
  });
});
