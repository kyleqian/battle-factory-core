import { describe, expect, it } from "vitest";
import knockOffAsset from "../../src/animation/assets/knock-off.json" with { type: "json" };
import {
  knockOffBodyAtAge,
  knockOffTargetOamOffsetAtAge,
} from "../../src/animation/knockOff.ts";
import {
  createSceneOnMovePresentation,
  sceneOnKnockOffView,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";

describe("MOVE_KNOCK_OFF source-relative body", () => {
  it("composes the player lunge, strike, slide, and target shake epochs", () => {
    expect(Array.from({ length: 11 }, (_, age) =>
      knockOffBodyAtAge(age, "player", "opponent").attackerOffset.x2
    )).toEqual([0, 6, 12, 18, 24, 24, 24, 18, 12, 6, 0]);
    expect(knockOffBodyAtAge(7, "player", "opponent").strike).toEqual({
      angle: 203,
      sheetFrame: 0,
      mirrored: false,
    });
    expect(knockOffBodyAtAge(14, "player", "opponent").strike).toEqual({
      angle: 24,
      sheetFrame: 1,
      mirrored: false,
    });
    expect(knockOffBodyAtAge(17, "player", "opponent")).toMatchObject({
      attackerOffset: { x2: 0, y2: 0 },
      targetOffset: { x2: 4, y2: 3 },
      palette: { color: "white", coeff: 10 },
      hitsplatVisible: true,
    });
    expect(knockOffBodyAtAge(22, "player", "opponent").targetOffset)
      .toEqual({ x2: 12, y2: 6 });
    expect(knockOffBodyAtAge(34, "player", "opponent")).toMatchObject({
      attackerOffset: { x2: 0, y2: 0 },
      targetOffset: { x2: 0, y2: 0 },
      strike: null,
      palette: null,
      hitsplatVisible: false,
    });
  });

  it("mirrors only the source-declared side-sensitive mechanisms", () => {
    expect(knockOffBodyAtAge(7, "opponent", "player")).toMatchObject({
      attackerOffset: { x2: -18, y2: 0 },
      strike: { angle: 181, mirrored: true },
    });
    expect(knockOffBodyAtAge(17, "opponent", "player").targetOffset)
      .toEqual({ x2: -4, y2: 3 });
    expect(knockOffBodyAtAge(29, "opponent", "player").targetOffset)
      .toEqual({ x2: -10, y2: 4 });
  });

  it("transfers ShakeMonInPlace one OAM epoch after the absolute slide write", () => {
    expect(Array.from({ length: 13 }, (_, index) =>
      index + 22
    ).map((age) =>
      knockOffTargetOamOffsetAtAge(age, "opponent")
    )).toEqual([
      { x2: 12, y2: 6 },
      { x2: 12, y2: 6 },
      { x2: 12, y2: 12 },
      { x2: 12, y2: 12 },
      { x2: 12, y2: 6 },
      { x2: 12, y2: 6 },
      { x2: 12, y2: 12 },
      { x2: 10, y2: 10 },
      { x2: 8, y2: 8 },
      { x2: 6, y2: 6 },
      { x2: 4, y2: 4 },
      { x2: 2, y2: 2 },
      { x2: 0, y2: 0 },
    ]);
  });

  it("pins the source-derived PLUSLE front asset required by the opposite orientation", () => {
    expect(knockOffAsset.source.plusleFront).toBe(
      "graphics/pokemon/plusle/front.png; gMonFrontPic_Plusle",
    );
    expect(knockOffAsset.plusleFront.tileset).toMatchObject({
      columns: 8,
      rows: 8,
    });
    expect(knockOffAsset.plusleFront.palette).toHaveLength(16);
    expect(knockOffAsset.plusleFront.tileset.tiles)
      .not.toEqual(knockOffAsset.plusleBack.tileset.tiles);
  });

  it("preserves opponent-front to player-back geometry through the shared seam", () => {
    const state = createSceneOnMovePresentation({
      move: "KNOCK_OFF",
      attacker: {
        species: "PLUSLE",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 22 },
          animationCenter: { x: 176, y: 54 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 48 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      fieldProfile: {
        playerHp: 110,
        playerMaxHp: 110,
        opponentHp: 135,
        opponentMaxHp: 135,
        playerGender: "male",
        opponentGender: "male",
      },
    });
    const strikeFrame = { ...state, age: 8 };
    expect(sceneOnKnockOffView(strikeFrame)).toMatchObject({
      attacker: { species: "PLUSLE", geometry: { side: "opponent" } },
      target: { species: "ONIX", geometry: { side: "player" } },
      strike: { mirrored: true, angle: 170 },
    });
    expect(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: strikeFrame,
    })).toHaveLength(240 * 160 * 4);
  });
});
