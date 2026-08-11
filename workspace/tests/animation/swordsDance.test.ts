import { describe, expect, it } from "vitest";
import { SWORDS_DANCE_FRAME_COUNT, swordsDanceAtAge } from "../../src/animation/swordsDance.ts";
import { createSceneOnMovePresentation, sceneOnSwordsDanceView } from "../../src/animation/sceneOnPresentation.ts";

const center = { x: 72, y: 80 } as const;

describe("MOVE_SWORDS_DANCE source-relative reducer", () => {
  it("ports the one-loop ellipse and affine blade without gameplay state", () => {
    expect(SWORDS_DANCE_FRAME_COUNT).toBe(70);
    expect(swordsDanceAtAge(7, "player", center).attackerOffset).toEqual({ x2: 6, y2: 1 });
    expect(swordsDanceAtAge(7, "opponent", center).attackerOffset).toEqual({ x2: -7, y2: 1 });
    expect(swordsDanceAtAge(7, "player", center).blade).toEqual({ x: 72, y: 80, pa: 1820 });
    expect(swordsDanceAtAge(18, "player", center).blade?.pa).toBe(256);
    expect(swordsDanceAtAge(59, "player", center).blade?.y).toBe(49);
    expect(swordsDanceAtAge(61, "player", center).blade).toBeNull();
    expect(swordsDanceAtAge(69, "player", center).active).toBe(false);
  });

  it("publishes the flash palette through the typed Scene-ON seam", () => {
    const state = createSceneOnMovePresentation({
      move: "SWORDS_DANCE",
      attacker: { species: "LEDIAN", geometry: { side: "player", spriteCorner: { x: 40, y: 55 }, animationCenter: center, battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } },
      fieldProfile: { playerHp: 162, playerMaxHp: 162, opponentHp: 142, opponentMaxHp: 142 },
    });
    expect(sceneOnSwordsDanceView({ ...state, age: 32 }).swordPalette).toBe("cyan-white");
    expect(sceneOnSwordsDanceView({ ...state, age: 38 }).swordPalette).toBe("source");
    expect(sceneOnSwordsDanceView({ ...state, age: 44 }).flashTask).toBe("step1");
  });
});
