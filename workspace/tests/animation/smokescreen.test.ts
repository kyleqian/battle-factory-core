import { describe, expect, it } from "vitest";
import { smokescreenEffectAtAge } from "../../src/animation/smokescreen.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSmokescreenView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_SMOKESCREEN source-relative reducer", () => {
  const player = (age: number) => smokescreenEffectAtAge(
    age,
    "player",
    { x: 72, y: 97 },
    { x: 176, y: 42 },
  );

  it("ports the complete 35-callback BLACK_BALL arc", () => {
    expect(player(6).sprites).toEqual([]);
    expect(player(7).sprites[0]).toMatchObject({
      kind: "black-ball", x: 92, y: 97, x2: 2, y2: -3, oamSlot: 3,
    });
    expect(player(41).sprites[0]).toMatchObject({ x2: 83, y2: -56 });
    expect(player(42).sprites).toEqual([]);
  });

  it("ports the dynamic four-part impact lifetime and frames", () => {
    expect(player(43)).toMatchObject({
      dynamicImpactAssetsLoaded: true,
      sprites: [
        { kind: "impact", x: 168, y: 34, frame: 0, oamSlot: 4 },
        { kind: "impact", x: 184, y: 34, frame: 0, hFlip: true },
        { kind: "impact", x: 168, y: 50, frame: 0, vFlip: true },
        { kind: "impact", x: 184, y: 50, frame: 0, hFlip: true, vFlip: true },
      ],
    });
    expect(player(46).sprites.every((sprite) => sprite.frame === 1)).toBe(true);
    expect(player(51).sprites.slice(0, 4).every(
      (sprite) => sprite.frame === 2,
    )).toBe(true);
    expect(player(56).sprites.some((sprite) => sprite.kind === "impact"))
      .toBe(false);
    expect(player(56).dynamicImpactAssetsLoaded).toBe(false);
  });

  it("ports all twelve blinking 75-callback BLACK_SMOKE lifecycles", () => {
    expect(player(47)).toMatchObject({
      visualTaskCount: 12,
      taskTopology: [],
    });
    expect(player(47).sprites).toHaveLength(16);
    expect(player(47).sprites[4]).toMatchObject({
      kind: "black-smoke", x: 176, y: 30, x2: 0, invisible: true,
    });
    expect(player(49).sprites.slice(4, 6)).toMatchObject([
      { x2: 0, invisible: false },
      { x2: -1, invisible: false },
    ]);
    expect(player(122).sprites).toHaveLength(12);
    expect(player(122).sprites[0]).toMatchObject({ x2: 30, invisible: true });
    expect(player(123).sprites).toEqual([]);
  });

  it("pins audio pans, empty task topology, and first inactive cleanup", () => {
    expect(player(0).soundEvents).toEqual([
      { age: 7, song: "SE_M_DOUBLE_TEAM", pan: -64 },
      { age: 47, song: "SE_M_SAND_ATTACK", pan: 63 },
    ]);
    expect(player(123)).toMatchObject({ active: true, taskTopology: [] });
    expect(player(124)).toMatchObject({
      active: false,
      sprites: [],
      visualTaskCount: 0,
      dynamicImpactAssetsLoaded: false,
    });
  });

  it("exposes only presentation geometry through the typed Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "SMOKESCREEN",
      attacker: {
        species: "KOFFING",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 57 },
          animationCenter: { x: 72, y: 97 },
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
        playerHp: 117,
        playerMaxHp: 117,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
    });
    expect(sceneOnSmokescreenView({ ...stage, age: 47 })).toMatchObject({
      age: 47,
      attacker: { species: "KOFFING" },
      target: { species: "ONIX" },
      visualTaskCount: 12,
      taskTopology: [],
    });
  });
});
