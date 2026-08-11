import { describe, expect, it } from "vitest";
import { cometPunchAtAge } from "../../src/animation/cometPunch.ts";
import {
  createSceneOnMovePresentation,
  sceneOnCometPunchView,
  type SceneOnCometPunchConfig,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_COMET_PUNCH source-relative reducer", () => {
  const player = { attackerSide: "player" as const, targetCenter: { x: 176, y: 42 } };
  const opponent = { attackerSide: "opponent" as const, targetCenter: { x: 72, y: 80 } };

  it("selects both choosetwoturnanim routes without owning the hit count", () => {
    expect(cometPunchAtAge(10, 0, player)).toMatchObject({ branch: "left", hitsplat: { x: 168, y: 34 }, fist: { x: 168, y: 42, remaining: 7 } });
    expect(cometPunchAtAge(10, 1, player)).toMatchObject({ branch: "right", hitsplat: { x: 184, y: 34 }, fist: { x: 184, y: 42 } });
    expect(cometPunchAtAge(10, 2, opponent)).toMatchObject({ branch: "left", hitsplat: { x: 80, y: 72 }, fist: { x: 80, y: 80 } });
    expect(cometPunchAtAge(10, 3, opponent)).toMatchObject({ branch: "right", hitsplat: { x: 64, y: 72 }, fist: { x: 64, y: 80 } });
  });

  it("ports resource, monbg, alpha, fist/hitsplat, ShakeMon, and cleanup ages", () => {
    expect(cometPunchAtAge(1, 0, player)).toMatchObject({ impactLoaded: true, handsAndFeetLoaded: true });
    expect(cometPunchAtAge(7, 0, player).targetOnMonBg).toBe(true);
    expect(cometPunchAtAge(10, 0, player)).toMatchObject({ alpha: { eva: 12, evb: 8 }, targetX2: 0, shakeTaskActive: true });
    expect(cometPunchAtAge(18, 0, player).fist?.remaining).toBe(0);
    expect(cometPunchAtAge(19, 0, player)).toMatchObject({ fist: null, hitsplat: { slot: 3 }, shakeTaskActive: true });
    expect(cometPunchAtAge(20, 0, player)).toMatchObject({ hitsplat: null, shakeTaskActive: false });
    expect(cometPunchAtAge(21, 0, player)).toMatchObject({ targetOnMonBg: false, alpha: null });
    expect(cometPunchAtAge(36, 0, player)).toMatchObject({ active: false, impactLoaded: false, handsAndFeetLoaded: false });
  });

  it("keeps caller-owned moveTurn immutable through the typed seam", () => {
    const config: SceneOnCometPunchConfig = {
      move: "COMET_PUNCH", moveTurn: 1,
      attacker: { species: "LEDIAN", geometry: { side: "player", spriteCorner: { x: 40, y: 55 }, animationCenter: { x: 72, y: 87 }, battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 149, playerMaxHp: 149, opponentHp: 142, opponentMaxHp: 142 },
    };
    expect(sceneOnCometPunchView({ ...createSceneOnMovePresentation(config), age: 10 })).toMatchObject({
      moveTurn: 1, branch: "right", fist: { x: 184, y: 42 }, attacker: { species: "LEDIAN" },
    });
    expect(config.moveTurn).toBe(1);
  });
});
