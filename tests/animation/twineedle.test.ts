import { describe, expect, it } from "vitest";
import { twineedleEffectAtAge } from "../../src/animation/twineedle.ts";
import {
  createSceneOnMovePresentation,
  sceneOnTwineedleView,
} from "../../src/animation/sceneOnPresentation.ts";

const player = {
  species: "BEEDRILL" as const,
  geometry: {
    side: "player" as const,
    spriteCorner: { x: 40, y: 65 },
    animationCenter: { x: 72, y: 97 },
    battlePositionCenter: { x: 72, y: 80 },
  },
};
const opponent = {
  species: "ONIX" as const,
  geometry: {
    side: "opponent" as const,
    spriteCorner: { x: 144, y: 10 },
    animationCenter: { x: 176, y: 42 },
    battlePositionCenter: { x: 176, y: 40 },
  },
};

describe("MOVE_TWINEEDLE source-relative reducer", () => {
  it("ports both Q8.8 stingers and their source rotation", () => {
    const effect = (age: number) => twineedleEffectAtAge(
      age, "player", { x: 72, y: 97 }, { x: 176, y: 42 },
    );
    expect(effect(0).sprites).toMatchObject([
      { kind: "needle", x: 82, y: 93, x2: 4, y2: -2,
        matrix: { a: 126, b: 222, c: -222, d: 126 }, oamSlot: 3 },
      { kind: "needle", x: 92, y: 109, x2: 4, y2: -2, oamSlot: 4 },
    ]);
    expect(effect(19).sprites.map((sprite) => [
      sprite.x + sprite.x2, sprite.y + sprite.y2,
    ])).toEqual([[175, 38], [185, 54]]);
    expect(effect(20).sprites).toHaveLength(2);
    expect(effect(21).sprites).toEqual([]);
  });

  it("mirrors opponent stingers and inverts paired hitsplat Y", () => {
    const effect = (age: number) => twineedleEffectAtAge(
      age, "opponent", { x: 176, y: 41 }, { x: 72, y: 88 },
    );
    expect(effect(0).sprites).toMatchObject([
      { x: 166, y: 45, x2: -4, y2: 2,
        matrix: { a: -109, b: -231, c: 231, d: -109 } },
      { x: 156, y: 29, x2: -4, y2: 2 },
    ]);
    expect(effect(22).sprites).toMatchObject([
      { kind: "impact", x: 72, y: 92, animation: 3, oamSlot: 3 },
    ]);
    expect(effect(25).sprites).toMatchObject([
      { x: 72, y: 92 },
      { x: 62, y: 76, oamSlot: 4 },
    ]);
  });

  it("composes ShakeMon2, looped audio, alpha, and cleanup through the seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "TWINEEDLE",
      attacker: player,
      target: opponent,
      fieldProfile: {
        playerHp: 130, playerMaxHp: 130,
        opponentHp: 110, opponentMaxHp: 110,
      },
    });
    expect(sceneOnTwineedleView({ ...stage, age: 22 })).toMatchObject({
      alpha: { eva: 12, evb: 8 },
      targetMonbg: true,
      targetOffset: { x2: -2, y2: 0 },
      soundEvents: [
        { age: 0, song: "SE_M_RAZOR_WIND2", pan: -64 },
        { age: 6, song: "SE_M_RAZOR_WIND2", pan: -64 },
        { age: 22, song: "SE_M_HORN_ATTACK", pan: 63 },
        { age: 27, song: "SE_M_HORN_ATTACK", pan: 63 },
      ],
    });
    expect(sceneOnTwineedleView({ ...stage, age: 36 })).toMatchObject({
      alpha: null,
      targetMonbg: false,
      targetOffset: { x2: 0, y2: 0 },
      sprites: [],
    });
    const reversed = createSceneOnMovePresentation({
      ...stage.config,
      attacker: {
        ...player,
        geometry: { ...player.geometry, side: "opponent" as const },
      },
      target: {
        ...opponent,
        geometry: { ...opponent.geometry, side: "player" as const },
      },
    });
    expect(sceneOnTwineedleView(reversed).soundEvents).toMatchObject([
      { pan: 63 }, { pan: 63 }, { pan: -63 }, { pan: -63 },
    ]);
  });
});
