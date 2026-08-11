import { describe, expect, it } from "vitest";
import { crossChopAtAge } from "../../src/animation/crossChop.ts";
import {
  createSceneOnMovePresentation,
  sceneOnCrossChopView,
  type SceneOnCrossChopConfig,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_CROSS_CHOP source-relative reducer", () => {
  const player = (age: number) =>
    crossChopAtAge(age, "player", { x: 176, y: 42 });

  it("ports both two-stage Cross Chop hand translations", () => {
    expect(player(10).hands).toEqual([
      expect.objectContaining({
        index: 0,
        oamSlot: 3,
        x: 176,
        y: 42,
        x2: 0,
        y2: 0,
        hFlip: false,
        callback: "AnimTranslateLinear_WithFollowup",
      }),
      expect.objectContaining({
        index: 1,
        oamSlot: 4,
        x2: 0,
        y2: 0,
        hFlip: true,
      }),
    ]);
    expect(player(39).hands.map((hand) => [hand.x2, hand.y2])).toEqual([
      [-20, -20],
      [19, -20],
    ]);
    expect(player(40).hands.every((hand) =>
      hand.callback === "AnimCrossChopHand_Step"
    )).toBe(true);
    expect(player(51).hands.map((hand) => ({
      x: hand.x,
      y: hand.y,
      x2: hand.x2,
      y2: hand.y2,
      callback: hand.callback,
    }))).toEqual([
      { x: 156, y: 22, x2: 0, y2: 0, callback: "StartAnimLinearTranslation" },
      { x: 195, y: 22, x2: 0, y2: 0, callback: "StartAnimLinearTranslation" },
    ]);
    expect(player(59).hands.map((hand) => [hand.x2, hand.y2])).toEqual([
      [40, 40],
      [-38, 40],
    ]);
    expect(player(60).hands.every((hand) =>
      hand.callback === "DestroyAnimSprite"
    )).toBe(true);
    expect(player(61).hands).toEqual([]);
  });

  it("ports Cross Impact, palette blend, target shake, and task cleanup", () => {
    expect(player(52)).toMatchObject({
      impact: {
        oamSlot: 7,
        x: 176,
        y: 42,
        remaining: 19,
        callback: "WaitAnimForDuration",
      },
      paletteBlend: {
        color: "white",
        coefficient: 10,
        callback: "AnimComplexPaletteBlend_Step1",
      },
      shakeTaskActive: true,
      targetOffset: { x2: 0, y2: 0 },
      visualTaskCount: 5,
    });
    expect(player(55).paletteBlend).toMatchObject({
      color: "black",
      coefficient: 10,
    });
    expect(player(54).targetOffset).toEqual({ x2: 7, y2: 0 });
    expect(player(56).targetOffset).toEqual({ x2: 0, y2: 0 });
    expect(player(67).shakeTaskActive).toBe(true);
    expect(player(68)).toMatchObject({
      shakeTaskActive: false,
      visualTaskCount: 1,
    });
    expect(player(72).impact).toMatchObject({
      remaining: 0,
      callback: "DestroyAnimSprite",
    });
    expect(player(74)).toMatchObject({
      alpha: null,
      clearMonBgTaskActive: true,
      updateMonBgTaskActive: true,
      scriptOffset: 104,
    });
    expect(player(77)).toMatchObject({
      targetMonbg: false,
      clearMonBgTaskActive: false,
      updateMonBgTaskActive: false,
    });
  });

  it("pins loads, side-relative audio, and first inactive cleanup", () => {
    expect(player(0)).toMatchObject({
      active: true,
      assetsLoaded: { handsAndFeet: false, crossImpact: false },
      scriptOffset: 0,
    });
    expect(player(10).soundEvents).toEqual([{
      age: 10,
      song: "SE_M_MEGA_KICK",
      pan: 63,
      player: "SE1",
    }]);
    expect(crossChopAtAge(52, "opponent", { x: 72, y: 88 }).soundEvents)
      .toEqual([{
        age: 52,
        song: "SE_M_RAZOR_WIND",
        pan: -63,
        player: "SE1",
      }]);
    expect(player(87)).toMatchObject({
      active: false,
      assetsLoaded: { handsAndFeet: false, crossImpact: false },
      visualTaskCount: 0,
      scriptOffset: 104,
    });
  });

  it("exposes only typed resolved presentation geometry", () => {
    const stage = createSceneOnMovePresentation<SceneOnCrossChopConfig>({
      move: "CROSS_CHOP",
      attacker: {
        species: "MACHOKE",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 57 },
          animationCenter: { x: 72, y: 89 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      targetPictureOffset: { x: 176, y: 42 },
      fieldProfile: {
        playerHp: 175,
        playerMaxHp: 187,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
    });
    expect(sceneOnCrossChopView({ ...stage, age: 52 })).toMatchObject({
      age: 52,
      attacker: { species: "MACHOKE" },
      target: { species: "ONIX" },
      visualTaskCount: 5,
      impact: { x: 176, y: 42 },
    });
    expect(() => sceneOnCrossChopView({
      ...stage,
      config: { ...stage.config, move: "BUBBLE_BEAM" },
      age: 0,
    } as never)).toThrow("expected CROSS_CHOP");
  });
});
