import { describe, expect, it } from "vitest";
import {
  FAKE_OUT_FRAME_COUNT,
  fakeOutAtAge,
} from "../../src/animation/fakeOut.ts";
import { shakeMon2OffsetAtTick } from "../../src/animation/shakeMon2.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFakeOutView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_FAKE_OUT source reducer", () => {
  it("ports the WIN0H shutter and independently measured display latch", () => {
    expect([0, 1, 2, 9, 10, 11, 16, 17].map((age) => {
      const state = fakeOutAtAge(age, "player", 9);
      return [age, state.softwareWin0H, state.displayedWin0H, state.bgMode];
    })).toEqual([
      [0, 0, 240, "none"],
      [1, 0x0de3, 240, "darken"],
      [2, 0x1ad6, 0x0de3, "darken"],
      [9, 0x757b, 0x6888, "darken"],
      [10, 0, 0x757b, "darken"],
      [11, 0, 0, "darken"],
      [16, 0, 0, "lighten"],
      [17, 0, 0, "none"],
    ]);
  });

  it("reuses ShakeMon2 and ports both affine legs for SHUCKLE", () => {
    expect([17, 18, 19, 20, 24, 25, 26, 27, 35, 36, 37].map((age) => {
      const target = fakeOutAtAge(age, "player", 9).target;
      return [age, target.x2, target.y2, target.matrix.a, target.matrix.d];
    })).toEqual([
      [17, 4, -1, 266, 243], [18, -4, -2, 276, 230],
      [19, -4, -4, 286, 217], [20, 4, -5, 296, 204],
      [24, 4, -15, 336, 152], [25, 0, -19, 346, 139],
      [26, 0, -23, 356, 126], [27, 0, -19, 346, 139],
      [35, 0, -1, 266, 243], [36, 0, 0, 256, 256],
      [37, 0, 0, 256, 256],
    ]);
    for (let localAge = 0; localAge <= 7; localAge += 1) {
      const shared = shakeMon2OffsetAtTick(4, 0, 5, 1, localAge);
      expect(fakeOutAtAge(17 + localAge, "player", 9).target.x2)
        .toBe(shared.x2);
    }
  });

  it("ports the background restore, sound pans, cleanup, and typed seam", () => {
    expect([14, 15, 41, 42, 46, 47, 77, 85].map((age) =>
      [age, fakeOutAtAge(age, "player", 9).bgWhiteCoeff]
    )).toEqual([[14, 0], [15, 16], [41, 16], [42, 14], [46, 14], [47, 12], [77, 0], [85, 0]]);
    expect(fakeOutAtAge(0, "player", 9).sound).toEqual({ id: "SE_M_FLATTER", pan: 0 });
    expect(fakeOutAtAge(17, "opponent", 9).sound).toEqual({ id: "SE_M_SKETCH", pan: -63 });
    expect(fakeOutAtAge(84, "player", 9).active).toBe(true);
    expect(fakeOutAtAge(85, "player", 9).active).toBe(false);
    const stage = createSceneOnMovePresentation({
      move: "FAKE_OUT",
      attacker: { species: "MAKUHITA", geometry: { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "SHUCKLE", geometry: { side: "opponent", spriteCorner: { x: 144, y: 16 }, animationCenter: { x: 176, y: 48 }, battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 100, playerMaxHp: 100, opponentHp: 100, opponentMaxHp: 100 },
      targetPictureYOffset: 9,
    });
    expect(sceneOnFakeOutView({ ...stage, age: 26 })).toMatchObject({
      age: 26, attacker: { species: "MAKUHITA" },
      targetBattler: { species: "SHUCKLE" },
      target: { x2: 0, y2: -23, matrix: { a: 356, d: 126 } },
    });
    expect(FAKE_OUT_FRAME_COUNT).toBe(86);
  });
});
