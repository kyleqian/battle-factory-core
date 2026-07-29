import { describe, expect, it } from "vitest";
import {
  AROMATHERAPY_OPPONENT_FRAME_COUNT,
  AROMATHERAPY_PLAYER_FRAME_COUNT,
  aromatherapyAtAge,
} from "../../src/animation/aromatherapy.ts";
import {
  createSceneOnMovePresentation,
  sceneOnAromatherapyView,
  type SceneOnAromatherapyConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const playerCenter = { x: 72, y: 95 };
const opponentCenter = { x: 176, y: 46 };

describe("MOVE_AROMATHERAPY source-relative reducer", () => {
  it("ports all nine AnimFlyingParticle programs and side-dependent cleanup", () => {
    const first = aromatherapyAtAge(
      19, "player", playerCenter, { x: 72, y: 80 },
    );
    expect(first.flowers.map((flower) => ({
      kind: flower.kind,
      slot: flower.slot,
      x: flower.x + flower.x2,
      y: flower.y + flower.y2,
      data: flower.data,
      matrix: flower.matrix,
    }))).toEqual([
      { kind: "smallFlower", slot: 4, x: 256, y: 24, data: [0, 16, -2, 2, 1, 0, 0, 1], matrix: [256, 0, 0, 256] },
      { kind: "smallFlower", slot: 5, x: 256, y: 64, data: [0, 24, -3, 1, 1, 0, 0, 1], matrix: [256, 0, 0, 256] },
      { kind: "bigFlower", slot: 7, x: 256, y: 16, data: [0, 24, -2, 1, 1, 0, 0, 1], matrix: [254, -25, 25, 254] },
    ]);
    expect(aromatherapyAtAge(
      53, "player", playerCenter, { x: 72, y: 80 },
    ).flowers).toHaveLength(9);
    expect(aromatherapyAtAge(
      188, "player", playerCenter, { x: 72, y: 80 },
    ).flowers.map((flower) => flower.slot)).toEqual([13]);
    expect(aromatherapyAtAge(
      188, "opponent", opponentCenter, { x: 176, y: 40 },
    ).flowers).toEqual([]);
  });

  it("ports the scrolling mask, two stars, ring affine, and cleanup", () => {
    const player = (age: number) => aromatherapyAtAge(
      age, "player", playerCenter, { x: 72, y: 80 },
    );
    expect(player(200).mask).toEqual({
      active: true, scrollY: 1, eva: 0, evb: 16,
    });
    expect(player(202).mask).toEqual({
      active: true, scrollY: 4, eva: 1, evb: 15,
    });
    expect(player(292).stars).toMatchObject([
      { slot: 3, x: 57, y: 95, frame: 0 },
    ]);
    expect(player(302).stars).toMatchObject([
      { slot: 3, x: 57, y: 96 },
      { slot: 4, x: 84, y: 90 },
    ]);
    expect(player(364).ring).toMatchObject({
      slot: 4, x: 72, y: 80, matrixScale: 2048,
    });
    expect(player(394).ring?.matrixScale).toBe(132);
    expect(player(399)).toMatchObject({
      active: false,
      frameCount: AROMATHERAPY_PLAYER_FRAME_COUNT,
      flowers: [],
      stars: [],
      ring: null,
    });
    expect(AROMATHERAPY_OPPONENT_FRAME_COUNT).toBe(396);
  });

  it("exposes only immutable presentation geometry through the typed seam", () => {
    const config: SceneOnAromatherapyConfig = {
      move: "AROMATHERAPY",
      attacker: {
        species: "VILEPLUME",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 55 },
          animationCenter: playerCenter,
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
        playerHp: 182,
        playerMaxHp: 182,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
    };
    const stage = createSceneOnMovePresentation(config);
    const view = sceneOnAromatherapyView({ ...stage, age: 53 });
    expect(view).toMatchObject({
      age: 53,
      attacker: { species: "VILEPLUME" },
      target: { species: "ONIX" },
      flowerLoaded: true,
      thinRingLoaded: true,
      sparkle2Loaded: true,
    });
    expect(view.flowers).toHaveLength(9);
    expect("status" in view).toBe(false);
    expect("cured" in view).toBe(false);
  });
});
