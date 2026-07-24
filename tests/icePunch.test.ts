import { describe, expect, it } from "vitest";
import {
  ICE_PUNCH_OVERLAY_FIRST_AGE,
  ICE_PUNCH_BG_RESTORE_FIRST_AGE,
  ICE_PUNCH_LARGE_SPIRAL_FIRST_AGE,
  ICE_PUNCH_HIT_FIRST_AGE,
  ICE_PUNCH_HIT_LIFETIME,
  ICE_PUNCH_HIT_SPAWN_CADENCE,
  ICE_PUNCH_OBJ_LAYERS_BACK_TO_FRONT,
  ICE_PUNCH_SMALL_SPIRAL_FIRST_AGE,
  ICE_PUNCH_SPIRAL_TICKS,
  ICE_PUNCH_MON_BG_CLEAR_AGE,
  ICE_PUNCH_SCRIPT_END_AGE,
  ICE_PUNCH_TARGET_RESTORE_FIRST_AGE,
  icePunchOverlayState,
  icePunchHitCrystals,
  icePunchSpiralCrystals,
} from "../src/engine/icePunch.ts";
import {
  ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
  createSceneOnMovePresentation,
  sceneOnIcePunchView,
} from "../src/engine/sceneOnPresentation.ts";
import { genericHitReactionAtAge } from "../src/engine/battleMenu.ts";
import crystals from "../src/assets/gen/battle-anim-ice-crystals.json" with { type: "json" };

describe("ICE_PUNCH source-composed presentation components", () => {
  it("reuses the generic hit reaction on a phase-relative clock", () => {
    expect(genericHitReactionAtAge(186, 187)).toEqual({
      healthboxY2: 0,
      targetInvisible: false,
    });
    expect(genericHitReactionAtAge(187, 187)).toEqual({
      healthboxY2: 1,
      targetInvisible: false,
    });
    expect(genericHitReactionAtAge(188, 187)).toEqual({
      healthboxY2: -1,
      targetInvisible: true,
    });
    expect(genericHitReactionAtAge(206, 187).healthboxY2).toBe(-1);
    expect(genericHitReactionAtAge(207, 187).healthboxY2).toBe(0);
    expect(genericHitReactionAtAge(215, 187).targetInvisible).toBe(true);
    expect(genericHitReactionAtAge(216, 187).targetInvisible).toBe(false);
  });

  it("pins the independent BG and target palette task clocks", () => {
    expect(ICE_PUNCH_OVERLAY_FIRST_AGE).toBe(16);
    expect([
      15, 16, 18, 19, 21, 22, 24, 25, 27, 28, 34,
    ].map(icePunchOverlayState)).toEqual([
      { backgroundBlackCoeff: 0, targetIceCoeff: 0, teardown: expect.any(Object) },
      { backgroundBlackCoeff: 2, targetIceCoeff: 0, teardown: expect.any(Object) },
      { backgroundBlackCoeff: 2, targetIceCoeff: 0, teardown: expect.any(Object) },
      { backgroundBlackCoeff: 4, targetIceCoeff: 1, teardown: expect.any(Object) },
      { backgroundBlackCoeff: 4, targetIceCoeff: 1, teardown: expect.any(Object) },
      { backgroundBlackCoeff: 6, targetIceCoeff: 2, teardown: expect.any(Object) },
      { backgroundBlackCoeff: 6, targetIceCoeff: 2, teardown: expect.any(Object) },
      { backgroundBlackCoeff: 7, targetIceCoeff: 3, teardown: expect.any(Object) },
      { backgroundBlackCoeff: 7, targetIceCoeff: 3, teardown: expect.any(Object) },
      { backgroundBlackCoeff: 7, targetIceCoeff: 4, teardown: expect.any(Object) },
      { backgroundBlackCoeff: 7, targetIceCoeff: 6, teardown: expect.any(Object) },
    ]);
    expect(ICE_PUNCH_SMALL_SPIRAL_FIRST_AGE).toBe(35);
    expect(ICE_PUNCH_TARGET_RESTORE_FIRST_AGE).toBe(139);
    expect([138, 139, 141, 142, 144, 145, 162, 163].map(icePunchOverlayState))
      .toMatchObject([
        { backgroundBlackCoeff: 7, targetIceCoeff: 9 },
        { backgroundBlackCoeff: 7, targetIceCoeff: 8 },
        { backgroundBlackCoeff: 7, targetIceCoeff: 8 },
        { backgroundBlackCoeff: 7, targetIceCoeff: 7 },
        { backgroundBlackCoeff: 7, targetIceCoeff: 7 },
        { backgroundBlackCoeff: 7, targetIceCoeff: 6 },
        { backgroundBlackCoeff: 7, targetIceCoeff: 1 },
        { backgroundBlackCoeff: 7, targetIceCoeff: 0 },
      ]);
  });

  it("pins the source-relative BG restore, clearmonbg/blendoff, and end stages", () => {
    expect({
      restoreFirstAge: ICE_PUNCH_BG_RESTORE_FIRST_AGE,
      monBgClearAge: ICE_PUNCH_MON_BG_CLEAR_AGE,
      scriptEndAge: ICE_PUNCH_SCRIPT_END_AGE,
    }).toEqual({
      restoreFirstAge: 166,
      monBgClearAge: 179,
      scriptEndAge: 183,
    });
    expect(
      [165, 166, 167, 168, 169, 170, 171, 172]
        .map((age) => icePunchOverlayState(age).backgroundBlackCoeff),
    ).toEqual([7, 5, 5, 3, 3, 1, 1, 0]);
    expect(icePunchOverlayState(178).teardown).toMatchObject({
      monBgActive: true,
      alphaBlendEnabled: true,
      scriptActive: true,
    });
    expect(icePunchOverlayState(179).teardown).toMatchObject({
      monBgActive: false,
      alphaBlendEnabled: false,
      scriptActive: true,
    });
    expect(icePunchOverlayState(182).teardown.scriptActive).toBe(true);
    expect(icePunchOverlayState(183).teardown.scriptActive).toBe(false);
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
      hpDrainProfile: Object.freeze({
        startHp: 143,
        endHp: 112,
        firstDisplayedAge: 223,
        effectivenessTextStartAge: 259,
        effectivenessTextEndAge: 356,
      }),
      controllerDisplayProfile: Object.freeze({
        actionMenuRevealAge: 363,
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
    expect(stage.config.hpDrainProfile.effectivenessTextEndAge).toBe(356);
    expect(sceneOnIcePunchView({ ...stage, age: 362 }).actionMenu.visible)
      .toBe(false);
    expect(sceneOnIcePunchView({ ...stage, age: 363 }).actionMenu.visible)
      .toBe(true);
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

  it("pins the seven-spawn short-crystal cadence, geometry, and lifetime", () => {
    const center = { x: 176, y: 44 };
    expect({
      firstAge: ICE_PUNCH_HIT_FIRST_AGE,
      cadence: ICE_PUNCH_HIT_SPAWN_CADENCE,
      lifetime: ICE_PUNCH_HIT_LIFETIME,
    }).toEqual({ firstAge: 90, cadence: 6, lifetime: 37 });
    expect(icePunchHitCrystals(89, center)).toEqual([]);
    expect(icePunchHitCrystals(90, center)).toMatchObject([
      {
        kind: "large",
        centerX: 166,
        centerY: 34,
        pa: 310,
        pd: 310,
        sourceSlot: 3,
        visible: true,
      },
    ]);
    expect(icePunchHitCrystals(126, center).map(({ sourceSlot }) => sourceSlot))
      .toEqual([3, 7, 11, 10, 5, 9, 4]);
    expect(icePunchHitCrystals(126, center).find(({ sourceSlot }) => sourceSlot === 11))
      .toMatchObject({ kind: "large", centerX: 196, centerY: 46, pa: 310 });
    expect(icePunchHitCrystals(127, center).find(({ sourceSlot }) => sourceSlot === 11))
      .toMatchObject({ pa: 303, pd: 303 });
    expect(icePunchHitCrystals(135, center).find(({ sourceSlot }) => sourceSlot === 11))
      .toMatchObject({ pa: 256, pd: 256 });
    expect(icePunchHitCrystals(144, center).find(({ sourceSlot }) => sourceSlot === 11))
      .toMatchObject({ visible: false });
    expect(icePunchHitCrystals(145, center).find(({ sourceSlot }) => sourceSlot === 11))
      .toMatchObject({ visible: true });
    expect(icePunchHitCrystals(162, center).find(({ sourceSlot }) => sourceSlot === 11))
      .toMatchObject({ visible: false });
    expect(icePunchHitCrystals(163, center)).toEqual([]);
  });

  it("mirrors the source hit-crystal offsets for a player-side target", () => {
    expect(icePunchHitCrystals(90, { x: 72, y: 88 }, -1)).toMatchObject([
      { centerX: 82, centerY: 78 },
    ]);
    expect(
      icePunchHitCrystals(126, { x: 72, y: 88 }, -1)
        .find(({ sourceSlot }) => sourceSlot === 11),
    ).toMatchObject({ centerX: 52, centerY: 90 });
  });
});
