import { describe, expect, it } from "vitest";
import extremeSpeedAsset from "../src/assets/gen/battle-anim-extreme-speed.json";
import { drawTileBg } from "../src/engine/bg.ts";
import { createFramebuffer } from "../src/engine/framebuffer.ts";
import {
  extremeSpeedAttackerAffineAtAge,
  extremeSpeedAttackerVisibleAtAge,
  extremeSpeedBackgroundAtAge,
  extremeSpeedBackgroundVariant,
  extremeSpeedDustAtAge,
  extremeSpeedImpactAtAge,
} from "../src/engine/extremeSpeed.ts";
import {
  createSceneOnMovePresentation,
  sceneOnExtremeSpeedView,
} from "../src/engine/sceneOnPresentation.ts";

describe("Extreme Speed source reducers", () => {
  it("wraps its 256px text background for both signed BG3 scroll directions", () => {
    const renderAt = (scrollX: number) => {
      const fb = createFramebuffer();
      drawTileBg(
        fb,
        {
          tileset: {
            columns: 2,
            rows: 1,
            tiles: [
              new Array(64).fill(1),
              new Array(64).fill(2),
            ],
          },
          tilemap: {
            width: 2,
            height: 1,
            entries: [
              { tile: 0, hFlip: false, vFlip: false, palette: 0 },
              { tile: 1, hFlip: false, vFlip: false, palette: 0 },
            ],
          },
          subpalettes: [[
            { r: 0, g: 0, b: 0 },
            { r: 8, g: 16, b: 24 },
            { r: 32, g: 40, b: 48 },
          ]],
        },
        scrollX,
      );
      return fb;
    };
    const positive = renderAt(9);
    const negative = renderAt(-9);
    expect([...positive.slice(0, 3)]).toEqual([32, 40, 48]);
    expect([...positive.slice(7 * 4, 7 * 4 + 3)]).toEqual([8, 16, 24]);
    expect([...negative.slice(0, 3)]).toEqual([8, 16, 24]);
    expect([...negative.slice(8 * 4, 8 * 4 + 3)]).toEqual([32, 40, 48]);
  });

  it("selects and scrolls the high-speed background by attacker side", () => {
    expect(extremeSpeedBackgroundVariant("opponent")).toBe("player");
    expect(extremeSpeedBackgroundVariant("player")).toBe("opponent");
    expect(extremeSpeedBackgroundAtAge(51, "opponent")).toEqual({
      background: "default", bldy: 0, scrollX: 0,
    });
    expect(extremeSpeedBackgroundAtAge(52, "opponent").bldy).toBe(1);
    expect(extremeSpeedBackgroundAtAge(67, "opponent").bldy).toBe(16);
    expect(extremeSpeedBackgroundAtAge(69, "opponent").scrollX).toBe(0);
    expect(extremeSpeedBackgroundAtAge(69, "player").scrollX).toBe(0);
    expect(extremeSpeedBackgroundAtAge(70, "opponent").scrollX).toBe(9);
    expect(extremeSpeedBackgroundAtAge(70, "player").scrollX).toBe(-9);
    expect(extremeSpeedBackgroundAtAge(86, "opponent")).toEqual({
      background: "highspeed", bldy: 0, scrollX: 153,
    });
    expect(extremeSpeedBackgroundAtAge(318, "opponent").bldy).toBe(1);
    expect(extremeSpeedBackgroundAtAge(335, "opponent")).toEqual({
      background: "default", bldy: 16, scrollX: 0,
    });
    expect(extremeSpeedBackgroundAtAge(354, "player")).toEqual({
      background: "default", bldy: 0, scrollX: 0,
    });
  });

  it("keeps the attacker affine program pure and immutable", () => {
    const before = extremeSpeedAttackerAffineAtAge(87);
    expect(before).toEqual({ xScale: 256, yScale: 256, y2: 0, invisible: false });
    expect(extremeSpeedAttackerAffineAtAge(90, 2)).toEqual({
      xScale: 352, yScale: 243, invisible: false,
      y2: -1,
    });
    expect(extremeSpeedAttackerAffineAtAge(91, 2)).toEqual({
      xScale: 448, yScale: 230, invisible: false,
      y2: -3,
    });
    expect(extremeSpeedAttackerAffineAtAge(95, 2)).toEqual({
      xScale: 832, yScale: 178, invisible: false,
      y2: -13,
    });
    expect(extremeSpeedAttackerAffineAtAge(95, 6)).toEqual({
      xScale: 832, yScale: 178, invisible: false,
      y2: -11,
    });
    expect(extremeSpeedAttackerAffineAtAge(96, 2)).toEqual({
      xScale: 928, yScale: 165, invisible: false, y2: -16,
    });
    expect(extremeSpeedAttackerAffineAtAge(97, 6)).toEqual({
      xScale: 1024, yScale: 152, invisible: false, y2: -17,
    });
    expect(extremeSpeedAttackerAffineAtAge(98).invisible).toBe(true);
    expect(extremeSpeedAttackerAffineAtAge(87)).toEqual(before);
  });

  it("signs the independently resolved impact displacement by target side", () => {
    expect(extremeSpeedImpactAtAge(122, "player")).toEqual({
      targetX2: 0, hitsplatIndex: null,
    });
    expect(extremeSpeedImpactAtAge(123, "player")).toEqual({
      targetX2: 8, hitsplatIndex: 0,
    });
    expect(extremeSpeedImpactAtAge(123, "opponent")).toEqual({
      targetX2: -8, hitsplatIndex: 0,
    });
    expect(extremeSpeedImpactAtAge(135, "player").targetX2).toBe(16);
    expect(extremeSpeedImpactAtAge(147, "player").targetX2).toBe(24);
    expect(extremeSpeedImpactAtAge(182, "player").targetX2).toBe(0);
    expect(extremeSpeedImpactAtAge(183, "player")).toEqual({
      targetX2: 0, hitsplatIndex: null,
    });
  });

  it("pins all 24 dust spawns and the fourteen-toggle attacker reappearance", () => {
    expect(extremeSpeedDustAtAge(183)).toEqual([]);
    expect(extremeSpeedDustAtAge(185)).toEqual([
      { x2: 30, y2: 28, frame: 0 },
    ]);
    const allSpawnIndices = new Set<number>();
    for (let age = 183; age <= 318; age += 1) {
      for (const dust of extremeSpeedDustAtAge(age)) {
        allSpawnIndices.add(dust.x2 * 100 + dust.y2);
      }
    }
    expect(allSpawnIndices.size).toBe(4);
    expect(extremeSpeedAttackerVisibleAtAge(195)).toBe(false);
    expect(extremeSpeedAttackerVisibleAtAge(196)).toBe(true);
    expect(extremeSpeedAttackerVisibleAtAge(198)).toBe(false);
    expect(extremeSpeedAttackerVisibleAtAge(224)).toBe(true);
  });

  it("extracts both source-selected backgrounds and the shared dust sheet", () => {
    expect(extremeSpeedAsset.background.tileset).toMatchObject({
      columns: 16,
      rows: 8,
    });
    expect(extremeSpeedAsset.background.opponentTilemap).toMatchObject({
      width: 32,
      height: 32,
    });
    expect(extremeSpeedAsset.background.playerTilemap).toMatchObject({
      width: 32,
      height: 32,
    });
    expect(extremeSpeedAsset.background.opponentTilemap.entries).not.toEqual(
      extremeSpeedAsset.background.playerTilemap.entries,
    );
    expect(extremeSpeedAsset.dust).toMatchObject({
      tileset: { columns: 2, rows: 6 },
      frameSizeTiles: 4,
      frames: [0, 1, 2, 1, 0],
      frameDuration: 3,
      spawnOffsets: [[30, 28], [-20, 24], [16, 26], [-10, 28]],
    });
  });

  it("exposes both legal orientations through the immutable presentation seam", () => {
    const opponent = createSceneOnMovePresentation({
      move: "EXTREME_SPEED",
      attacker: {
        species: "ARCANINE",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      target: {
        species: "DUGTRIO",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 59 },
          animationCenter: { x: 72, y: 91 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      fieldProfile: {
        playerHp: 101,
        opponentHp: 156,
        playerStatus: "none",
        playerGender: "male",
        opponentGender: "male",
      },
    });
    const opponentBefore = structuredClone(opponent);
    expect(sceneOnExtremeSpeedView({ ...opponent, age: 69 })).toMatchObject({
      animationAge: 69,
      attacker: { geometry: { side: "opponent" } },
      target: { geometry: { side: "player" } },
      background: { background: "highspeed", scrollX: 0 },
    });
    expect(opponent).toEqual(opponentBefore);

    const player = createSceneOnMovePresentation({
      move: "EXTREME_SPEED",
      attacker: {
        species: "ARCANINE",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 54 },
          animationCenter: { x: 72, y: 86 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "DUGTRIO",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 21 },
          animationCenter: { x: 176, y: 53 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 156,
        opponentHp: 101,
        playerStatus: "none",
        playerGender: "male",
        opponentGender: "female",
      },
      animationAgeOffset: 4,
    });
    expect(sceneOnExtremeSpeedView({ ...player, age: 65 })).toMatchObject({
      animationAge: 69,
      attacker: { geometry: { side: "player" } },
      target: { geometry: { side: "opponent" } },
      background: { background: "highspeed", scrollX: 0 },
    });
  });
});
