import { describe, expect, it } from "vitest";
import {
  SUBSTITUTE_FRAME_COUNT,
  substituteAtAge,
} from "../../src/animation/substitute.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSubstituteView,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";

describe("MOVE_SUBSTITUTE source reducer", () => {
  it("ports all nine shrink callbacks and the graphics-swap boundary", () => {
    expect([0, 1, 4, 8, 9, 10, 11].map((age) => {
      const state = substituteAtAge(age, "player").sprite;
      return [age, state.graphics, state.invisible, state.affine,
        state.matrix.a, state.matrix.d, state.x2, state.y2];
    })).toEqual([
      [0, "attacker", false, false, 256, 256, 0, 0],
      [1, "attacker", false, true, 352, 243, 0, 0],
      [4, "attacker", false, true, 640, 204, 0, 0],
      [8, "attacker", false, true, 1024, 152, 0, 0],
      [9, "attacker", true, false, 256, 256, 0, 0],
      [10, "substitute", true, false, 256, 256, 0, 0],
      [11, "substitute", false, false, 256, 256, 200, -200],
    ]);
  });

  it("ports the complete offscreen drop and both source bounce legs", () => {
    expect([12, 29, 30, 41, 42, 43, 54, 55, 56, 66, 67].map((age) => {
      const state = substituteAtAge(age, "player").sprite;
      return [age, state.x2, state.y2];
    })).toEqual([
      [12, 200, -200], [29, 200, -134], [30, 0, -126],
      [41, 0, -11], [42, 0, 0], [43, 0, -5],
      [54, 0, -27], [55, 0, -27], [56, 0, -27],
      [66, 0, -4], [67, 0, 0],
    ]);
  });

  it("pins sound, task cleanup, first inactive cleanup, and typed seam", () => {
    expect(substituteAtAge(0, "player").sound)
      .toEqual({ id: "SE_M_ATTRACT", pan: -64 });
    expect(substituteAtAge(42, "opponent").sound)
      .toEqual({ id: "SE_M_BUBBLE2", pan: 63 });
    expect(substituteAtAge(67, "player")).toMatchObject({
      taskActive: false,
      sound: { id: "SE_M_BUBBLE2", pan: -64 },
      active: true,
    });
    expect(substituteAtAge(85, "player").active).toBe(true);
    expect(substituteAtAge(86, "player").active).toBe(false);
    expect(SUBSTITUTE_FRAME_COUNT).toBe(87);

    const stage = createSceneOnMovePresentation({
      move: "SUBSTITUTE",
      attacker: { species: "GOLEM", geometry: { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 16 }, animationCenter: { x: 176, y: 48 }, battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 140, playerMaxHp: 187, opponentHp: 142, opponentMaxHp: 142 },
    });
    expect(sceneOnSubstituteView({ ...stage, age: 42 })).toMatchObject({
      age: 42,
      attacker: { species: "GOLEM" },
      target: { species: "ONIX" },
      sprite: { graphics: "substitute", x2: 0, y2: 0 },
    });
  });

  it("routes both source-required orientations through the live compositor", () => {
    const stage = (side: "player" | "opponent") =>
      createSceneOnMovePresentation({
        move: "SUBSTITUTE",
        attacker: { species: "GOLEM", geometry: side === "player"
          ? { side, spriteCorner: { x: 40, y: 64 }, animationCenter: { x: 72, y: 96 }, battlePositionCenter: { x: 72, y: 80 } }
          : { side, spriteCorner: { x: 144, y: 13 }, animationCenter: { x: 176, y: 45 }, battlePositionCenter: { x: 176, y: 40 } } },
        target: { species: "ONIX", geometry: side === "player"
          ? { side: "opponent" as const, spriteCorner: { x: 145, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } }
          : { side: "player" as const, spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } } },
        fieldProfile: side === "player"
          ? { playerHp: 184, playerMaxHp: 187, opponentHp: 142, opponentMaxHp: 142 }
          : { playerHp: 142, playerMaxHp: 142, opponentHp: 187, opponentMaxHp: 187 },
      });
    for (const side of ["player", "opponent"] as const) {
      const config = stage(side);
      const normal = render({ ...createInitialState(), sceneOnPresentation: { ...config, age: 0 } });
      const doll = render({ ...createInitialState(), sceneOnPresentation: { ...config, age: 42 } });
      expect(normal).toHaveLength(240 * 160 * 4);
      expect(doll).toHaveLength(240 * 160 * 4);
      expect(doll).not.toEqual(normal);
    }
  });
});
