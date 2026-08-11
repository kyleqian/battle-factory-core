import { describe, expect, it } from "vitest";
import { doubleSlapAtAge } from "../../src/animation/doubleSlap.ts";
import { createSceneOnMovePresentation, sceneOnDoubleSlapView, type SceneOnDoubleSlapConfig } from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_DOUBLE_SLAP source-relative reducer", () => {
  const player = { attackerSide: "player" as const, targetCenter: { x: 176, y: 42 } };
  const opponent = { attackerSide: "opponent" as const, targetCenter: { x: 72, y: 88 } };
  it("selects both choosetwoturnanim routes without owning hit count", () => {
    expect(doubleSlapAtAge(7, 0, player)).toMatchObject({ branch: "left", hitsplat: { x: 168, y: 42 }, targetX2: 0 });
    expect(doubleSlapAtAge(7, 1, player)).toMatchObject({ branch: "right", hitsplat: { x: 184, y: 42 } });
    expect(doubleSlapAtAge(7, 2, opponent)).toMatchObject({ branch: "left", hitsplat: { x: 80, y: 88 } });
    expect(doubleSlapAtAge(7, 3, opponent)).toMatchObject({ branch: "right", hitsplat: { x: 64, y: 88 } });
  });
  it("ports resource, monbg, alpha, ShakeMon and cleanup ages", () => {
    expect(doubleSlapAtAge(1, 0, player).impactLoaded).toBe(true);
    expect(doubleSlapAtAge(4, 0, player).targetOnMonBg).toBe(true);
    expect(doubleSlapAtAge(17, 0, player)).toMatchObject({ hitsplat: null, shakeTaskActive: false });
    expect(doubleSlapAtAge(18, 0, player)).toMatchObject({ targetOnMonBg: false, alpha: null });
    expect(doubleSlapAtAge(33, 0, player)).toMatchObject({ active: false, impactLoaded: false });
  });
  it("keeps caller-owned moveTurn immutable through the typed seam", () => {
    const config: SceneOnDoubleSlapConfig = {
      move: "DOUBLE_SLAP", moveTurn: 1,
      attacker: { species: "POLIWHIRL", geometry: { side: "player", spriteCorner: { x: 40, y: 52 }, animationCenter: { x: 72, y: 84 }, battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 172, playerMaxHp: 172, opponentHp: 142, opponentMaxHp: 142 },
    };
    expect(sceneOnDoubleSlapView({ ...createSceneOnMovePresentation(config), age: 7 })).toMatchObject({
      moveTurn: 1, branch: "right", hitsplat: { x: 184, y: 42 }, attacker: { species: "POLIWHIRL" },
    });
    expect(config.moveTurn).toBe(1);
  });
});
