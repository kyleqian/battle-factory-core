import { describe, expect, it } from "vitest";
import {
  defenseCurlAtAge,
  defenseCurlYOffsetFromScale,
} from "../../src/animation/defenseCurl.ts";
import {
  createSceneOnMovePresentation,
  sceneOnDefenseCurlView,
  type SceneOnDefenseCurlConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const profile = { attackerPicYOffset: 14, attackerSubpriority: 30 } as const;
const attackerCenter = { x: 72, y: 86 } as const;

describe("MOVE_DEFENSE_CURL source reducer", () => {
  it("ports the task's three affine passes and live picture-height y2", () => {
    expect(defenseCurlYOffsetFromScale(276, 14)).toBe(1);
    expect(defenseCurlYOffsetFromScale(416, 14)).toBe(7);
    expect(defenseCurlAtAge(3, attackerCenter, profile).deformation)
      .toMatchObject({ active: false, affineDouble: false, xScale: 256, yScale: 256, y2: 0 });
    expect(defenseCurlAtAge(4, attackerCenter, profile).deformation)
      .toMatchObject({ active: true, affineDouble: true, xScale: 244, yScale: 276, y2: 1 });
    expect(defenseCurlAtAge(11, attackerCenter, profile).deformation)
      .toMatchObject({ xScale: 160, yScale: 416, y2: 7 });
    expect(defenseCurlAtAge(19, attackerCenter, profile).deformation)
      .toMatchObject({ xScale: 256, yScale: 256, y2: 0 });
    expect(defenseCurlAtAge(20, attackerCenter, profile).deformation)
      .toMatchObject({ xScale: 256, yScale: 256, y2: 0 });
    expect(defenseCurlAtAge(21, attackerCenter, profile).deformation)
      .toMatchObject({ xScale: 244, yScale: 276, y2: 1 });
    expect(defenseCurlAtAge(53, attackerCenter, profile).deformation)
      .toMatchObject({ xScale: 256, yScale: 256, y2: 0 });
    expect(defenseCurlAtAge(54, attackerCenter, profile).deformation)
      .toMatchObject({ active: true, xScale: 256, yScale: 256, y2: 0 });
    expect(defenseCurlAtAge(55, attackerCenter, profile).deformation.active).toBe(false);
  });

  it("keeps the script, grayscale, sound, and orb lifecycles source-aged", () => {
    expect(defenseCurlAtAge(0, attackerCenter, profile))
      .toMatchObject({ sourceOffset: 0, visualTaskCount: 0, attackerPalette: "original" });
    expect(defenseCurlAtAge(4, attackerCenter, profile))
      .toMatchObject({ sourceOffset: 27, visualTaskCount: 1, soundTaskActive: true, attackerPalette: "grayscale" });
    expect(defenseCurlAtAge(40, attackerCenter, profile).soundTaskActive).toBe(true);
    expect(defenseCurlAtAge(41, attackerCenter, profile).soundTaskActive).toBe(false);
    expect(defenseCurlAtAge(55, attackerCenter, profile))
      .toMatchObject({ sourceOffset: 27, visualTaskCount: 0, attackerPalette: "grayscale" });
    expect(defenseCurlAtAge(56, attackerCenter, profile).orb)
      .toMatchObject({ slot: 3, x: 72, y: 86, sourceCell: 0, cellIndex: 0, hFlip: false, subpriority: 28 });
    expect(defenseCurlAtAge(67, attackerCenter, profile).orb)
      .toMatchObject({ sourceCell: 32, cellIndex: 2, hFlip: true });
    expect(defenseCurlAtAge(76, attackerCenter, profile).orb)
      .toMatchObject({ sourceCell: 0, cellIndex: 0, hFlip: false });
    expect(defenseCurlAtAge(96, attackerCenter, profile).orb)
      .toMatchObject({ sourceCell: 0, cellIndex: 0, hFlip: true });
    expect(defenseCurlAtAge(97, attackerCenter, profile).orb)
      .toMatchObject({ sourceCell: 0, cellIndex: 0, hFlip: true });
    expect(defenseCurlAtAge(98, attackerCenter, profile))
      .toMatchObject({ sourceOffset: 43, active: true, visualTaskCount: 0, attackerPalette: "grayscale" });
    expect(defenseCurlAtAge(99, attackerCenter, profile))
      .toMatchObject({ sourceOffset: 56, active: false, attackerPalette: "grayscale" });
    expect(defenseCurlAtAge(100, attackerCenter, profile).attackerPalette).toBe("original");
  });

  it("exposes the reducer through the typed Scene-ON seam", () => {
    const config: SceneOnDefenseCurlConfig = {
      move: "DEFENSE_CURL",
      attacker: {
        species: "ARON",
        geometry: {
          side: "player",
          spriteCorner: { x: 38, y: 56 },
          animationCenter: { x: 70, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "GROVYLE",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 146, y: 12 },
          animationCenter: { x: 178, y: 44 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 100,
        playerMaxHp: 100,
        opponentHp: 100,
        opponentMaxHp: 100,
      },
      animationProfile: { attackerPicYOffset: 10, attackerSubpriority: 30 },
    };
    const stage = createSceneOnMovePresentation(config);
    expect(sceneOnDefenseCurlView({ ...stage, age: 56 })).toMatchObject({
      attacker: { species: "ARON" },
      target: { species: "GROVYLE" },
      orb: { x: 70, y: 88, subpriority: 28 },
    });
  });
});
