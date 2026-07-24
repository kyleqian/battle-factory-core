import { describe, expect, it } from "vitest";
import {
  ICE_PUNCH_OVERLAY_FIRST_AGE,
  ICE_PUNCH_LARGE_SPIRAL_FIRST_AGE,
  ICE_PUNCH_OBJ_LAYERS_BACK_TO_FRONT,
  ICE_PUNCH_SMALL_SPIRAL_FIRST_AGE,
  ICE_PUNCH_SPIRAL_TICKS,
  icePunchOverlayState,
  icePunchSpiralCrystals,
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
    expect(sceneOnIcePunchView({ ...stage, age: 35 }).crystals).toHaveLength(0);
    expect(sceneOnIcePunchView({ ...stage, age: 36 }).crystals).toHaveLength(4);
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

  it("pins the source-relative two-batch cadence and 30-frame lifetime", () => {
    const center = { x: 176, y: 44 };
    expect(ICE_PUNCH_LARGE_SPIRAL_FIRST_AGE).toBe(42);
    expect(ICE_PUNCH_SPIRAL_TICKS).toBe(30);
    expect(icePunchSpiralCrystals(34, center)).toHaveLength(0);
    expect(icePunchSpiralCrystals(35, center).map(({ kind }) => kind))
      .toEqual(["small", "small", "small", "small"]);
    expect(icePunchSpiralCrystals(42, center).filter(({ kind }) => kind === "large"))
      .toHaveLength(4);
    expect(icePunchSpiralCrystals(64, center).filter(({ kind }) => kind === "small"))
      .toHaveLength(4);
    expect(icePunchSpiralCrystals(65, center).filter(({ kind }) => kind === "small"))
      .toHaveLength(0);
    expect(icePunchSpiralCrystals(71, center).filter(({ kind }) => kind === "large"))
      .toHaveLength(4);
    expect(icePunchSpiralCrystals(72, center)).toHaveLength(0);
  });

  it("reproduces source translation, affine rotation, and target anchoring", () => {
    const center = { x: 176, y: 44 };
    const firstSmall = icePunchSpiralCrystals(35, center)
      .find(({ sourceSlot }) => sourceSlot === 3)!;
    expect(firstSmall).toMatchObject({
      kind: "small",
      centerX: 188,
      centerY: 100,
      pa: 256,
      pb: 0,
      pc: 0,
      pd: 256,
    });
    const firstLarge = icePunchSpiralCrystals(42, center)
      .find(({ sourceSlot }) => sourceSlot === 9)!;
    expect(firstLarge).toMatchObject({
      kind: "large",
      centerX: 224,
      centerY: 74,
      pa: -97,
      pb: -236,
      pc: 236,
      pd: -97,
    });

    const translated = icePunchSpiralCrystals(42, { x: 72, y: 88 })
      .find(({ sourceSlot }) => sourceSlot === 9)!;
    expect({
      dx: translated.centerX - firstLarge.centerX,
      dy: translated.centerY - firstLarge.centerY,
      matrix: [translated.pa, translated.pb, translated.pc, translated.pd],
    }).toEqual({ dx: -104, dy: 44, matrix: [-97, -236, 236, -97] });

    const smallStep29 = icePunchSpiralCrystals(63, center)
      .find(({ sourceSlot }) => sourceSlot === 3)!;
    const smallFinalHold = icePunchSpiralCrystals(64, center)
      .find(({ sourceSlot }) => sourceSlot === 3)!;
    const largeStep29 = icePunchSpiralCrystals(70, center)
      .find(({ sourceSlot }) => sourceSlot === 9)!;
    const largeFinalHold = icePunchSpiralCrystals(71, center)
      .find(({ sourceSlot }) => sourceSlot === 9)!;
    expect(smallFinalHold).toEqual(smallStep29);
    expect({
      centerX: largeFinalHold.centerX,
      centerY: largeFinalHold.centerY,
      matrix: [
        largeFinalHold.pa,
        largeFinalHold.pb,
        largeFinalHold.pc,
        largeFinalHold.pd,
      ],
    }).toEqual({
      centerX: largeStep29.centerX,
      centerY: largeStep29.centerY,
      matrix: [142, 212, -212, 142],
    });
  });

  it("pins stable source OAM ordering where small and large batches overlap", () => {
    expect(ICE_PUNCH_OBJ_LAYERS_BACK_TO_FRONT).toEqual([
      { kind: "crystal", subpriority: 28 },
      { kind: "hitsplat", subpriority: 27 },
      { kind: "fist", subpriority: 26 },
    ]);
    expect(
      icePunchSpiralCrystals(42, { x: 176, y: 44 })
        .map(({ sourceSlot }) => sourceSlot),
    ).toEqual([10, 4, 11, 3, 5, 9, 12, 7]);
  });
});
