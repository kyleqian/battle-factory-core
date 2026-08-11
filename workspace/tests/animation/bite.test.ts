import { describe, expect, it } from "vitest";
import { biteEffectAtAge } from "../../src/animation/bite.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBiteView,
} from "../../src/animation/sceneOnPresentation.ts";

const player = {
  species: "ZUBAT" as const,
  geometry: {
    side: "player" as const,
    spriteCorner: { x: 40, y: 61 },
    animationCenter: { x: 72, y: 88 },
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

describe("MOVE_BITE source-relative reducer", () => {
  it("ports both sharp-teeth affine programs and signed 8.8 translation", () => {
    const effect = (age: number) =>
      biteEffectAtAge(age, "opponent", { x: 176, y: 42 });
    expect(effect(-1).sprites).toEqual([]);
    expect(effect(0).sprites).toMatchObject([
      { kind: "sharpTeeth", x: 176, y: 10, y2: 3, affineAnimation: 0,
        matrix: { a: 256, d: 256 }, oamSlot: 3 },
      { kind: "sharpTeeth", x: 176, y: 74, y2: -4, affineAnimation: 4,
        matrix: { a: -256, d: -256 }, oamSlot: 4 },
    ]);
    expect([0, 8, 9, 10, 18, 19].map((age) =>
      effect(age).sprites.filter((sprite) => sprite.kind === "sharpTeeth")
        .map((sprite) => sprite.y + sprite.y2)
    )).toEqual([
      [13, 70], [38, 45], [41, 42], [38, 45], [13, 70], [],
    ]);
  });

  it("composes the delayed IMPACT and source ShakeMon(0,4,7,1)", () => {
    const effect = (age: number) =>
      biteEffectAtAge(age, "player", { x: 72, y: 88 });
    expect(effect(11).sprites).toHaveLength(2);
    expect(effect(12).sprites[2]).toMatchObject({
      kind: "impact", x: 72, y: 88, animation: 2,
      matrix: { a: 372, d: 372 }, oamSlot: 5,
    });
    expect([12, 13, 14, 15, 16, 22, 23, 24].map(
      (age) => effect(age).targetOffset.y2,
    )).toEqual([0, 0, 4, 4, 0, 4, 4, 0]);
    expect(effect(22).sprites).toEqual([]);
  });

  it("keeps alpha/monbg cleanup and orientation behind the typed seam", () => {
    const state = createSceneOnMovePresentation({
      move: "BITE",
      attacker: player,
      target: opponent,
      fieldProfile: {
        playerHp: 130, playerMaxHp: 130,
        opponentHp: 110, opponentMaxHp: 110,
      },
    });
    expect(sceneOnBiteView({ ...state, age: 0 })).toMatchObject({
      targetSide: "opponent", soundPan: 63,
      alpha: { eva: 12, evb: 8 }, targetMonbg: true,
    });
    expect(sceneOnBiteView({ ...state, age: 25 })).toMatchObject({
      alpha: null, targetMonbg: false, targetOffset: { x2: 0, y2: 0 },
      sprites: [],
    });
    const reversed = createSceneOnMovePresentation({
      ...state.config, attacker: opponent, target: player,
    });
    expect(sceneOnBiteView(reversed)).toMatchObject({
      targetSide: "player", soundPan: -63,
    });
  });
});
