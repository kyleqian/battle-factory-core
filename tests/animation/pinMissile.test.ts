import { describe, expect, it } from "vitest";
import { pinMissileEffectAtAge } from "../../src/animation/pinMissile.ts";
import {
  createSceneOnMovePresentation,
  sceneOnPinMissileView,
} from "../../src/animation/sceneOnPresentation.ts";

const player = (age: number) => pinMissileEffectAtAge(
  age, "player", { x: 72, y: 95 }, { x: 176, y: 42 },
);
const opponent = (age: number) => pinMissileEffectAtAge(
  age, "opponent", { x: 176, y: 50 }, { x: 72, y: 88 },
);

describe("MOVE_PIN_MISSILE source-relative reducer", () => {
  it("ports all three double-advance horizontal arcs and matrices", () => {
    expect(player(10).sprites[0]).toMatchObject({
      kind: "missile", x: 92, y: 87, x2: 7, y2: -15,
      matrix: { a: 228, b: 115, c: -115, d: 228 },
      oamSlot: 3, matrixNum: 0,
    });
    expect(player(27).sprites).toMatchObject([
      { x2: 72, y2: -56 },
      { x2: 9, y2: -15, oamSlot: 4, matrixNum: 3 },
    ]);
    expect(opponent(10).sprites[0]).toMatchObject({
      x: 156, y: 42, x2: -7, y2: -7,
      matrix: { a: 157, b: -201, c: 201, d: 157 },
    });
    expect(player(30).sprites).toHaveLength(1);
    expect(player(64).sprites).toHaveLength(0);
  });

  it("ports three animation-2 hitsplats and three short ShakeMon2 bursts", () => {
    expect(player(33)).toMatchObject({
      targetOffset: { x2: -3, y2: 0 }, shakeTaskActive: true,
      sprites: [
        { kind: "missile", oamSlot: 4 },
        { kind: "impact", x: 168, y: 34, animation: 2, oamSlot: 3 },
      ],
    });
    expect(opponent(50).sprites).toMatchObject([
      { kind: "missile" },
      { kind: "impact", x: 64, y: 96 },
    ]);
    expect(player(35).targetOffset).toEqual({ x2: 0, y2: 0 });
  });

  it("pins source-relative alpha, monbg, audio, and cleanup", () => {
    expect(player(10)).toMatchObject({
      alpha: { eva: 12, evb: 8 }, targetMonbg: true,
    });
    expect(player(77).alpha).toBeNull();
    expect(player(80).targetMonbg).toBe(false);
    expect(player(92)).toMatchObject({
      active: false, alpha: null, targetMonbg: false, sprites: [],
    });
    expect(player(0).soundEvents).toEqual([
      { age: 10, song: "SE_M_JUMP_KICK", pan: -64 },
      { age: 33, song: "SE_M_HORN_ATTACK", pan: 63 },
      { age: 50, song: "SE_M_HORN_ATTACK", pan: 63 },
      { age: 66, song: "SE_M_HORN_ATTACK", pan: 63 },
    ]);
  });

  it("exposes only presentation geometry through the typed seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "PIN_MISSILE",
      attacker: { species: "QWILFISH", geometry: {
        side: "player", spriteCorner: { x: 40, y: 55 },
        animationCenter: { x: 72, y: 95 }, battlePositionCenter: { x: 72, y: 80 },
      } },
      target: { species: "ONIX", geometry: {
        side: "opponent", spriteCorner: { x: 144, y: 10 },
        animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 },
      } },
      fieldProfile: { playerHp: 140, playerMaxHp: 140, opponentHp: 110, opponentMaxHp: 110 },
    });
    expect(sceneOnPinMissileView({ ...stage, age: 10 })).toMatchObject({
      age: 10, attacker: { species: "QWILFISH" },
      target: { species: "ONIX" }, sprites: [{ kind: "missile" }],
    });
  });
});
