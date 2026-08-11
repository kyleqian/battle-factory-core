import { describe, expect, it } from "vitest";
import { TRIPLE_KICK_FRAME_COUNT, tripleKickAtAge } from "../../src/animation/tripleKick.ts";
import {
  createSceneOnMovePresentation,
  sceneOnTripleKickView,
  type SceneOnTripleKickConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const opponentTarget = { attackerSide: "player" as const, targetCenter: { x: 176, y: 42 } };
const playerTarget = { attackerSide: "opponent" as const, targetCenter: { x: 72, y: 88 } };

describe("MOVE_TRIPLE_KICK source-relative reducer", () => {
  it("selects all three visual branches without owning hit count", () => {
    expect(TRIPLE_KICK_FRAME_COUNT).toBe(37);
    expect(tripleKickAtAge(10, 0, opponentTarget)).toMatchObject({
      branch: "left", foot: { x: 160, y: 34, animation: 1 },
      hitsplat: { x: 160, y: 26, matrix: 372 }, shakeTaskActive: true,
    });
    expect(tripleKickAtAge(10, 1, opponentTarget)).toMatchObject({
      branch: "right", foot: { x: 184, y: 50 }, hitsplat: { x: 184, y: 42, matrix: 372 },
    });
    expect(tripleKickAtAge(10, 2, opponentTarget)).toMatchObject({
      branch: "center", foot: { x: 176, y: 42 }, hitsplat: { x: 176, y: 34, matrix: 303 },
    });
  });

  it("mirrors branch x offsets for an opponent attacker and ports cleanup", () => {
    expect(tripleKickAtAge(10, 0, playerTarget).foot).toMatchObject({ x: 88, y: 80 });
    expect(tripleKickAtAge(10, 1, playerTarget).foot).toMatchObject({ x: 64, y: 96 });
    expect(tripleKickAtAge(12, 0, opponentTarget).targetX2).toBe(4);
    expect(tripleKickAtAge(12, 2, opponentTarget).targetX2).toBe(6);
    expect(tripleKickAtAge(20, 0, opponentTarget).shakeTaskActive).toBe(false);
    expect(tripleKickAtAge(23, 2, opponentTarget).shakeTaskActive).toBe(true);
    expect(tripleKickAtAge(24, 2, opponentTarget).shakeTaskActive).toBe(false);
    expect(tripleKickAtAge(31, 2, opponentTarget).foot).toBeNull();
    expect(tripleKickAtAge(32, 2, opponentTarget)).toMatchObject({ targetOnMonBg: false, alpha: null });
    expect(tripleKickAtAge(36, 2, opponentTarget)).toMatchObject({ active: false, handsAndFeetLoaded: false, impactLoaded: false });
  });

  it("keeps moveTurn as immutable presentation input through the typed seam", () => {
    const config: SceneOnTripleKickConfig = {
      move: "TRIPLE_KICK",
      moveTurn: 2,
      attacker: { species: "HITMONTOP", geometry: { side: "player", spriteCorner: { x: 40, y: 58 }, animationCenter: { x: 72, y: 90 }, battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 130, playerMaxHp: 130, opponentHp: 132, opponentMaxHp: 132 },
    };
    const stage = createSceneOnMovePresentation(config);
    expect(sceneOnTripleKickView({ ...stage, age: 10 })).toMatchObject({
      moveTurn: 2, branch: "center", attacker: { species: "HITMONTOP" },
      target: { species: "ONIX" }, foot: { x: 176, y: 42 },
    });
    expect(config.moveTurn).toBe(2);
  });
});
