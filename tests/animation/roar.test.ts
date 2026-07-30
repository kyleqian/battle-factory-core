import { describe, expect, it } from "vitest";
import {
  ROAR_OPPONENT_FRAME_COUNT,
  ROAR_PLAYER_FRAME_COUNT,
  roarAtAge,
} from "../../src/animation/roar.ts";
import {
  createSceneOnMovePresentation,
  sceneOnRoarView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

const player: SceneOnPresentationBattler = {
  species: "HOUNDOUR",
  geometry: {
    side: "player",
    spriteCorner: { x: 40, y: 60 },
    animationCenter: { x: 72, y: 92 },
    battlePositionCenter: { x: 72, y: 80 },
  },
};
const opponent: SceneOnPresentationBattler = {
  species: "ONIX",
  geometry: {
    side: "opponent",
    spriteCorner: { x: 144, y: 10 },
    animationCenter: { x: 176, y: 42 },
    battlePositionCenter: { x: 176, y: 40 },
  },
};

describe("MOVE_ROAR source reducer", () => {
  it("ports ScaleMonAndRestore, both noise waves and the slide", () => {
    expect([6, 7, 16, 17, 25, 26].map((age) => {
      const transform = roarAtAge(age, "player", { x: 72, y: 80 })
        .attackerTransform;
      return [age, transform.active, transform.matrix.a];
    })).toEqual([
      [6, false, 256],
      [7, true, 251],
      [16, true, 206],
      [17, true, 211],
      [25, true, 251],
      [26, false, 256],
    ]);
    expect(roarAtAge(7, "player", { x: 72, y: 80 }).noiseLines)
      .toHaveLength(3);
    expect(roarAtAge(24, "opponent", { x: 176, y: 40 }).noiseLines)
      .toHaveLength(3);
    expect(roarAtAge(47, "player", { x: 72, y: 80 }).targetX2).toBe(2);
    expect(roarAtAge(47, "opponent", { x: 176, y: 40 }).targetX2).toBe(-2);
  });

  it("pins orientation-dependent cleanup without owning forced switching", () => {
    expect(ROAR_PLAYER_FRAME_COUNT).toBe(99);
    expect(ROAR_OPPONENT_FRAME_COUNT).toBe(104);
    expect(roarAtAge(94, "player", { x: 72, y: 80 }).cleanup)
      .toBe("clear-mon-bg");
    expect(roarAtAge(98, "player", { x: 72, y: 80 })).toMatchObject({
      active: false,
      noiseLineLoaded: false,
      alpha: null,
      cleanup: "inactive",
    });
    expect(roarAtAge(103, "opponent", { x: 176, y: 40 }).active)
      .toBe(false);
  });

  it("crosses a geometry-only typed Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "ROAR",
      attacker: player,
      target: opponent,
      fieldProfile: {
        playerHp: 117,
        playerMaxHp: 138,
        opponentHp: 117,
        opponentMaxHp: 117,
        playerGender: "male",
        opponentGender: "male",
      },
    });
    const view = sceneOnRoarView({ ...stage, age: 47 });
    expect(view.attacker).toBe(player);
    expect(view.target).toBe(opponent);
    expect(view.targetX2).toBe(2);
    expect(stage.config).not.toHaveProperty("accuracy");
    expect(stage.config).not.toHaveProperty("forcedSwitch");
  });
});
