import { describe, expect, it } from "vitest";
import { barrierAtAge } from "../../src/animation/barrier.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBarrierView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_BARRIER source-relative reducer", () => {
  it("ports the pointer lead-in, shared wall lifecycle, and cleanup", () => {
    const center = { x: 72, y: 80 };
    expect(barrierAtAge(0, center, "player")).toMatchObject({
      wall: null, alpha: null, soundTaskActive: false, active: true,
    });
    expect(barrierAtAge(4, center, "player")).toMatchObject({
      wall: { x: 112, y: 80, paletteRotationSteps: 0 },
      alpha: { eva: 0, evb: 16 }, soundTaskActive: true,
    });
    expect(barrierAtAge(20, center, "player").wall)
      .toMatchObject({ paletteRotationSteps: 1 });
    expect(barrierAtAge(50, center, "player").wall)
      .toMatchObject({ paletteRotationSteps: 16 });
    expect(barrierAtAge(64, center, "player").opponentBattlerHidden).toBe(false);
    expect(barrierAtAge(67, center, "player").wall).not.toBeNull();
    expect(barrierAtAge(68, center, "player").wall).toBeNull();
    expect(barrierAtAge(72, center, "player")).toMatchObject({ wall: null, alpha: null });
    expect(barrierAtAge(75, center, "player").active).toBe(false);
  });

  it("mirrors the wall and carries only presentation inputs through the seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "BARRIER",
      attacker: { species: "DROWZEE", geometry: { side: "opponent", spriteCorner: { x: 144, y: 15 }, animationCenter: { x: 176, y: 47 }, battlePositionCenter: { x: 176, y: 40 } } },
      target: { species: "ONIX", geometry: { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 80 }, battlePositionCenter: { x: 72, y: 80 } } },
      allocatorProfile: { wall: 3 },
      fieldProfile: { playerHp: 117, playerMaxHp: 117, opponentHp: 125, opponentMaxHp: 142 },
    });
    expect(sceneOnBarrierView({ ...stage, age: 4 }).wall)
      .toEqual({ x: 136, y: 40, paletteRotationSteps: 0 });
    expect(stage.config).not.toHaveProperty("defenseStage");
  });
});
