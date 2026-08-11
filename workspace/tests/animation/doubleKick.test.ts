import { describe, expect, it } from "vitest";
import {
  DOUBLE_KICK_CLEAR_AGE,
  DOUBLE_KICK_EFFECT_AGE,
  DOUBLE_KICK_FRAME_COUNT,
  doubleKickAtAge,
} from "../../src/animation/doubleKick.ts";
import {
  createSceneOnMovePresentation,
  sceneOnDoubleKickView,
  type SceneOnDoubleKickConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const geometry = {
  targetSide: "opponent" as const,
  targetCenter: { x: 176, y: 42 },
  targetDimensions: { width: 40, height: 64 },
  fistRandom: { x: 46625, y: 58366, xSign: 21952, ySign: 56639 },
};

describe("MOVE_DOUBLE_KICK source-relative reducer", () => {
  it("ports the complete 36-frame resource, monbg, alpha, sprite, shake, and cleanup body", () => {
    expect(DOUBLE_KICK_FRAME_COUNT).toBe(36);
    expect(doubleKickAtAge(0, geometry)).toMatchObject({ active: true, handsAndFeetLoaded: false });
    expect(doubleKickAtAge(1, geometry).handsAndFeetLoaded).toBe(true);
    expect(doubleKickAtAge(4, geometry).impactLoaded).toBe(true);
    expect(doubleKickAtAge(7, geometry).targetOnMonBg).toBe(true);
    expect(doubleKickAtAge(DOUBLE_KICK_EFFECT_AGE, geometry)).toMatchObject({
      alpha: { eva: 12, evb: 8 },
      targetX2: 0,
      shakeTaskActive: true,
      fist: { slot: 3, childSlot: 4, x: 181, y: 28, animation: 1, remaining: 19 },
      hitsplat: { slot: 4, parentSlot: 3, x: 181, y: 28 },
    });
    expect(doubleKickAtAge(12, geometry).targetX2).toBe(4);
    expect(doubleKickAtAge(20, geometry)).toMatchObject({ shakeTaskActive: false, targetX2: 0 });
    expect(doubleKickAtAge(29, geometry).fist?.remaining).toBe(0);
    expect(doubleKickAtAge(30, geometry).fist).toBeNull();
    expect(doubleKickAtAge(DOUBLE_KICK_CLEAR_AGE, geometry)).toMatchObject({ targetOnMonBg: false, alpha: null });
    expect(doubleKickAtAge(35, geometry)).toMatchObject({ active: false, handsAndFeetLoaded: false, impactLoaded: false });
  });

  it("keeps the typed seam presentation-only and preserves player-target y adjustment", () => {
    const config: SceneOnDoubleKickConfig = {
      move: "DOUBLE_KICK",
      attacker: { species: "NIDORINA", geometry: { side: "opponent", spriteCorner: { x: 144, y: 26 }, animationCenter: { x: 176, y: 58 }, battlePositionCenter: { x: 176, y: 40 } } },
      target: { species: "ONIX", geometry: { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } } },
      fieldProfile: { playerHp: 130, playerMaxHp: 130, opponentHp: 132, opponentMaxHp: 132 },
      targetDimensions: { width: 56, height: 64 },
      fistRandom: { x: 49413, y: 34939, xSign: 46625, ySign: 58366 },
    };
    const stage = createSceneOnMovePresentation(config);
    expect(sceneOnDoubleKickView({ ...stage, age: 10 })).toMatchObject({
      attacker: { species: "NIDORINA" },
      target: { species: "ONIX" },
      fist: { x: 51, y: 83 },
    });
    expect(config.fieldProfile.playerHp).toBe(130);
  });
});
