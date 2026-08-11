import { describe, expect, it } from "vitest";
import {
  lightScreenAtAge,
  mirrorCoatAtAge,
} from "../../src/animation/lightScreen.ts";
import {
  createSceneOnMovePresentation,
  sceneOnLightScreenView,
  sceneOnMirrorCoatView,
  type SceneOnMirrorCoatConfig,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_LIGHT_SCREEN source reducer", () => {
  it("ports wall alpha, palette rotation, and cleanup", () => {
    expect(lightScreenAtAge(0, { x: 72, y: 80 }, "player"))
      .toMatchObject({
        wall: { x: 112, y: 80, paletteRotationSteps: 0 },
        alpha: { eva: 0, evb: 16 },
        soundTaskActive: true,
      });
    expect(lightScreenAtAge(16, { x: 72, y: 80 }, "player").wall)
      .toMatchObject({ paletteRotationSteps: 1 });
    expect(lightScreenAtAge(46, { x: 72, y: 80 }, "player").wall)
      .toMatchObject({ paletteRotationSteps: 16 });
    expect(lightScreenAtAge(64, { x: 72, y: 80 }, "player").wall)
      .toBeNull();
    expect(lightScreenAtAge(74, { x: 72, y: 80 }, "player"))
      .toMatchObject({ active: false, sparkles: [] });
  });

  it("ports all six side-relative SPARKLE_3 lifecycles", () => {
    expect(lightScreenAtAge(12, { x: 72, y: 80 }, "player").sparkles)
      .toEqual([{ spawnIndex: 0, x: 95, y: 80, tileOffset: 0 }]);
    expect(lightScreenAtAge(36, { x: 72, y: 80 }, "player").sparkles)
      .toContainEqual({
        spawnIndex: 3, x: 82, y: 65, tileOffset: 0,
      });
    expect(lightScreenAtAge(52, { x: 176, y: 40 }, "opponent").sparkles)
      .toContainEqual({
        spawnIndex: 5, x: 166, y: 58, tileOffset: 0,
      });
    expect(lightScreenAtAge(62, { x: 72, y: 80 }, "player").sparkles)
      .toContainEqual({
        spawnIndex: 5, x: 82, y: 98, tileOffset: 4,
      });
  });

  it("threads presentation-only inputs through the typed seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "LIGHT_SCREEN",
      attacker: {
        species: "EXEGGCUTE",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 61 },
          animationCenter: { x: 72, y: 93 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      allocatorProfile: { wall: 3, sparkles: [4, 5, 7, 4, 5, 7] },
      fieldProfile: {
        playerHp: 133, playerMaxHp: 153,
        opponentHp: 117, opponentMaxHp: 117,
      },
    });
    expect(sceneOnLightScreenView({ ...stage, age: 12 })).toMatchObject({
      attacker: { species: "EXEGGCUTE" },
      wall: { x: 112 },
      sparkles: [{ spawnIndex: 0 }],
    });
    expect(stage.config).not.toHaveProperty("sideCondition");
  });

  it("reuses only the source-identical Mirror Coat wall/sparkle callbacks", () => {
    const center = { x: 72, y: 80 };
    expect(mirrorCoatAtAge(36, center, "player")).toEqual({
      ...lightScreenAtAge(36, center, "player"),
      soundTaskActive: false,
    });
    const stage = createSceneOnMovePresentation<SceneOnMirrorCoatConfig>({
      move: "MIRROR_COAT",
      attacker: {
        species: "CORSOLA",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 56 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "EXEGGCUTE",
        geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 15 },
          animationCenter: { x: 176, y: 47 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      allocatorProfile: { wall: 3, sparkles: [4, 5, 7, 4, 5, 7] },
      fieldProfile: {
        playerHp: 106, playerMaxHp: 137,
        opponentHp: 153, opponentMaxHp: 153,
      },
    });
    expect(sceneOnMirrorCoatView({ ...stage, age: 12 })).toMatchObject({
      attacker: { species: "CORSOLA" },
      wall: { x: 112 },
      sparkles: [{ spawnIndex: 0 }],
      soundTaskActive: false,
    });
    expect(stage.config).not.toHaveProperty("damage");
  });
});
