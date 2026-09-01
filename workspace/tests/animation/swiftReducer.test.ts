import { describe, expect, it } from "vitest";
import { createSceneOnMovePresentation, sceneOnSwiftView } from "../../src/animation/sceneOnPresentation.ts";
import { swiftConfigFor } from "../../tools/compare/swiftFramebuffer.ts";
import { swiftProfileFor, verifySwiftReducer } from "../../tools/compare/swiftReducer.ts";

describe("MOVE_SWIFT source-derived reducer and typed seam", () => {
  it.each(["player-back", "opponent-front"] as const)("matches every retained %s component row", (orientation) => {
    expect(verifySwiftReducer(orientation)).toMatchObject({
      rows: orientation === "player-back" ? 78 : 80,
      shake: [24, 57], targetSourceOffsets: [24, 58], targetDisplayOffsets: [25, 59],
      cleanup: { active: false, stars: 0, resourcesFreed: true },
      gameplay: { immutable: true, rngTransitions: 0, impactInstantiated: false },
    });
  });

  it("accepts altered live geometry and allocator facts without a retained-pair gate", () => {
    const config = swiftConfigFor("player-back");
    const captured = swiftProfileFor("player-back");
    const state = createSceneOnMovePresentation({
      ...config,
      attacker: { species: "SURSKIT", geometry: { side: "player", spriteCorner: { x: 20, y: 50 }, animationCenter: { x: 52, y: 82 }, battlePositionCenter: { x: 60, y: 78 } } },
      target: { species: "ARON", geometry: { side: "opponent", spriteCorner: { x: 150, y: 8 }, animationCenter: { x: 182, y: 40 }, battlePositionCenter: { x: 180, y: 42 } } },
      animationProfile: { ...captured, attackerEffectCenter: { x: 52, y: 90 }, targetAverageCenter: { x: 182, y: 40 },
        attackerSpriteSlot: 20, targetSpriteSlot: 21, starSlots: [22, 23, 24, 25, 26], targetShakeTaskSlot: 7 },
    });
    expect(sceneOnSwiftView({ ...state, age: 24 })).toMatchObject({
      attacker: { species: "SURSKIT" }, target: { species: "ARON" },
      stars: [{ slot: 22 }, { slot: 23 }, { slot: 24 }], targetShake: { slot: 7, spriteSlot: 21 },
    });
  });
});
