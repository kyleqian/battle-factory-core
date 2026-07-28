import { describe, expect, it } from "vitest";
import {
  sonicBoomEffectAtAge,
  sonicBoomProjectileMatrix,
} from "../../src/animation/sonicBoom.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSonicBoomView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_SONIC_BOOM source-relative reducer", () => {
  const player = (age: number) => sonicBoomEffectAtAge(
    age, "player", { x: 72, y: 98 }, { x: 176, y: 42 },
  );
  const opponent = (age: number) => sonicBoomEffectAtAge(
    age, "opponent", { x: 176, y: 40 }, { x: 72, y: 88 },
  );

  it("ports all three 15-callback source projectiles", () => {
    expect(player(10).sprites).toMatchObject([
      { kind: "air-wave", x: 88, y: 98, x2: 5, y2: -3, oamSlot: 3 },
    ]);
    expect(player(22).sprites).toMatchObject([
      { x2: 76, y2: -48, oamSlot: 3 },
      { x2: 41, y2: -26, oamSlot: 4 },
      { x2: 5, y2: -3, oamSlot: 5 },
    ]);
    expect(player(25).sprites[0]).toMatchObject({
      x2: 87, y2: -55, callback: "destroy",
    });
    expect(opponent(22).sprites).toMatchObject([
      { x2: -76, y2: 41 },
      { x2: -41, y2: 22 },
      { x2: -5, y2: 3 },
    ]);
    expect(sonicBoomProjectileMatrix("player"))
      .toEqual({ a: 252, b: -43, c: 43, d: 252 });
    expect(sonicBoomProjectileMatrix("opponent"))
      .toEqual({ a: -254, b: 25, c: -25, d: -254 });
  });

  it("ports IMPACT, ShakeMon, alpha, monbg, audio, and cleanup", () => {
    expect(player(28).sprites[0]).toMatchObject({
      kind: "impact",
      x: 176,
      y: 42,
      animation: 2,
      oamSlot: 3,
    });
    expect([28, 29, 30, 31, 32, 45, 46].map(
      (age) => player(age).targetOffset.x2,
    )).toEqual([0, 0, 3, 3, 0, 0, 0]);
    expect(player(10)).toMatchObject({
      alpha: { eva: 12, evb: 8 },
      targetMonbg: true,
      active: true,
    });
    expect(player(47)).toMatchObject({
      alpha: null,
      targetMonbg: false,
      active: true,
    });
    expect(player(51)).toMatchObject({
      active: false,
      sprites: [],
      targetOffset: { x2: 0, y2: 0 },
    });
    expect(player(0).soundEvents).toEqual([
      { age: 10, song: "SE_M_RAZOR_WIND2", pan: -64 },
      { age: 16, song: "SE_M_RAZOR_WIND2", pan: -64 },
      { age: 22, song: "SE_M_RAZOR_WIND2", pan: -64 },
    ]);
    expect(opponent(0).soundEvents[0]?.pan).toBe(63);
  });

  it("exposes only presentation geometry through the typed Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "SONIC_BOOM",
      attacker: {
        species: "MAGNETON",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 58 },
          animationCenter: { x: 72, y: 98 },
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
      fieldProfile: {
        playerHp: 125,
        playerMaxHp: 125,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
    });
    expect(sceneOnSonicBoomView({ ...stage, age: 22 })).toMatchObject({
      age: 22,
      attacker: { species: "MAGNETON" },
      target: { species: "ONIX" },
      sprites: [
        { kind: "air-wave", oamSlot: 3 },
        { kind: "air-wave", oamSlot: 4 },
        { kind: "air-wave", oamSlot: 5 },
      ],
    });
  });
});
