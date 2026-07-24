import { describe, expect, it } from "vitest";
import {
  ICE_PUNCH_OVERLAY_FIRST_AGE,
  ICE_PUNCH_SMALL_SPIRAL_FIRST_AGE,
  icePunchOverlayState,
} from "../src/engine/icePunch.ts";
import {
  ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
  createSceneOnMovePresentation,
  sceneOnIcePunchView,
} from "../src/engine/sceneOnPresentation.ts";
import crystals from "../src/assets/gen/battle-anim-ice-crystals.json" with { type: "json" };

describe("ICE_PUNCH source-composed presentation components", () => {
  it("pins the independent BG and target palette task clocks", () => {
    expect(ICE_PUNCH_OVERLAY_FIRST_AGE).toBe(16);
    expect([
      15, 16, 18, 19, 21, 22, 24, 25, 27, 28, 34,
    ].map(icePunchOverlayState)).toEqual([
      { backgroundBlackCoeff: 0, targetIceCoeff: 0 },
      { backgroundBlackCoeff: 2, targetIceCoeff: 0 },
      { backgroundBlackCoeff: 2, targetIceCoeff: 0 },
      { backgroundBlackCoeff: 4, targetIceCoeff: 1 },
      { backgroundBlackCoeff: 4, targetIceCoeff: 1 },
      { backgroundBlackCoeff: 6, targetIceCoeff: 2 },
      { backgroundBlackCoeff: 6, targetIceCoeff: 2 },
      { backgroundBlackCoeff: 7, targetIceCoeff: 3 },
      { backgroundBlackCoeff: 7, targetIceCoeff: 3 },
      { backgroundBlackCoeff: 7, targetIceCoeff: 4 },
      { backgroundBlackCoeff: 7, targetIceCoeff: 6 },
    ]);
    expect(ICE_PUNCH_SMALL_SPIRAL_FIRST_AGE).toBe(35);
  });

  it("composes the overlay from immutable field and geometry inputs", () => {
    const stage = createSceneOnMovePresentation({
      move: "ICE_PUNCH",
      ...ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
      fieldProfile: Object.freeze({
        playerHp: 117,
        opponentHp: 143,
        playerStatus: "none",
      }),
      moveTextStartAge: -25,
    });
    const before = structuredClone(stage.config);
    expect(sceneOnIcePunchView({ ...stage, age: 25 })).toMatchObject({
      age: 25,
      overlay: { backgroundBlackCoeff: 7, targetIceCoeff: 3 },
      attacker: { species: "ONIX" },
      target: { species: "GROVYLE" },
    });
    expect(stage.config).toEqual(before);
  });

  it("extracts the source-concatenated large and small crystal frames", () => {
    expect(crystals.tileset.tiles).toHaveLength(14);
    expect(crystals.palette).toHaveLength(16);
    expect(crystals.frames).toEqual({
      large: { tile: 4, width: 8, height: 16 },
      small: { tile: 6, width: 8, height: 8 },
    });
  });
});
