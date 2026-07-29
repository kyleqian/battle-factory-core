import { describe, expect, it } from "vitest";
import { bubbleBeamAtAge } from "../../src/animation/bubbleBeam.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBubbleBeamView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_BUBBLE_BEAM source-relative reducer", () => {
  const player = (age: number) => bubbleBeamAtAge(
    age,
    "player",
    { x: 72, y: 99 },
    { x: 176, y: 42 },
  );

  it("ports all three six-projectile calls and their callback lifetimes", () => {
    const starts = Array.from({ length: 18 }, (_, index) => 13 + index * 5);
    expect(starts.map((age, index) =>
      player(age).projectiles.some((sprite) => sprite.spawnIndex === index)
    )).toEqual(Array(18).fill(true));
    expect(player(13).projectiles[0]).toMatchObject({
      oamSlot: 3,
      x: 90,
      y: 29,
      x2: 3,
      y2: 67,
      frame: 0,
      matrix: 266,
      callback: "AnimWaterBubbleProjectile_Step1",
    });
    expect(player(61).projectiles.find((sprite) => sprite.spawnIndex === 0))
      .toMatchObject({
        x2: 117,
        y2: -31,
        callback: "AnimWaterBubbleProjectile_Step2",
      });
    expect(player(85).projectiles.find((sprite) => sprite.spawnIndex === 0))
      .toMatchObject({ callback: "DestroySpriteAndMatrix", frame: 2 });
    expect(player(86).projectiles.some((sprite) => sprite.spawnIndex === 0))
      .toBe(false);
  });

  it("ports SwayMon and exactly six WaterBubblesEffectShort lifecycles", () => {
    expect(player(43)).toMatchObject({
      swayTaskActive: true,
      targetOffset: { x2: 0, y2: 0 },
      visualTaskCount: 8,
    });
    expect(player(45).targetOffset).toEqual({ x2: 2, y2: 0 });
    expect(player(128).swayTaskActive).toBe(false);
    expect([172, 180, 188, 196, 204, 212].map((age, index) =>
      player(age).afterEffects.some((sprite) => sprite.spawnIndex === index)
    )).toEqual(Array(6).fill(true));
    expect(player(172).afterEffects[0]).toMatchObject({
      x: 186,
      y: 52,
      x2: 1,
      y2: 0,
      matrix: 407,
      callback: "AnimBubbleEffect_Step",
    });
  });

  it("pins loads, alpha/monbg, sounds, and first inactive cleanup", () => {
    expect(player(0)).toMatchObject({
      active: true,
      bubbleLoaded: false,
      smallBubblesLoaded: false,
      scriptOffset: 0,
    });
    expect(player(10)).toMatchObject({
      alpha: { eva: 12, evb: 8 },
      targetMonbg: true,
    });
    expect(player(13).soundEvents.find((event) => event.age === 13))
      .toEqual({ age: 13, song: "SE_M_BUBBLE", pan: -64, player: "SE1" });
    expect(player(172).soundEvents.find((event) => event.age === 172))
      .toEqual({ age: 172, song: "SE_M_BUBBLE3", pan: 63, player: "SE1" });
    expect(player(238)).toMatchObject({
      active: false,
      bubbleLoaded: false,
      smallBubblesLoaded: false,
      alpha: null,
      targetMonbg: false,
      visualTaskCount: 0,
      scriptOffset: 57,
    });
  });

  it("exposes only resolved Surskit/Onix presentation geometry", () => {
    const stage = createSceneOnMovePresentation({
      move: "BUBBLE_BEAM",
      attacker: {
        species: "SURSKIT",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 59 },
          animationCenter: { x: 72, y: 91 },
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
      attackerPictureOffset: { x: 72, y: 99 },
      targetPictureOffset: { x: 176, y: 42 },
      fieldProfile: {
        playerHp: 115,
        playerMaxHp: 115,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
    });
    expect(sceneOnBubbleBeamView({ ...stage, age: 13 })).toMatchObject({
      age: 13,
      attacker: { species: "SURSKIT" },
      target: { species: "ONIX" },
      visualTaskCount: 1,
    });
  });
});
