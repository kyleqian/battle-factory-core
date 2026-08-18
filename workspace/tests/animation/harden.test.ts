import { describe, expect, it } from "vitest";
import { metallicShineAtAge } from "../../src/animation/metallicShine.ts";
import {
  createSceneOnMovePresentation,
  sceneOnHardenView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_HARDEN source reducer", () => {
  const attacker: SceneOnPresentationBattler = {
    species: "RELICANTH",
    geometry: {
      side: "player" as const,
      spriteCorner: { x: 40, y: 61 },
      animationCenter: { x: 72, y: 93 },
      battlePositionCenter: { x: 72, y: 80 },
    },
  };
  const target: SceneOnPresentationBattler = {
    species: "ONIX",
    geometry: {
      side: "opponent" as const,
      spriteCorner: { x: 144, y: 10 },
      animationCenter: { x: 176, y: 42 },
      battlePositionCenter: { x: 176, y: 40 },
    },
  };
  const stage = createSceneOnMovePresentation({
    move: "HARDEN",
    attacker,
    target,
    fieldProfile: {
      playerHp: 122,
      playerMaxHp: 131,
      opponentHp: 110,
      opponentMaxHp: 110,
    },
    attackerSpriteCenter: { x: 72, y: 93 },
  });

  it("crosses the typed seam without owning the Defense stage", () => {
    const view = sceneOnHardenView({ ...stage, age: 0 });
    expect(view.attacker).toBe(attacker);
    expect(view.target).toBe(target);
    expect(view).not.toHaveProperty("statStage");
  });

  it("reuses the non-permanent MetallicShine unchanged, keyed off attackerSpriteCenter", () => {
    expect(sceneOnHardenView({ ...stage, age: 0 })).toMatchObject(
      metallicShineAtAge(0, 72, 93, false),
    );
    expect(sceneOnHardenView({ ...stage, age: 1 })).toMatchObject(
      metallicShineAtAge(1, 72, 93, false),
    );
    expect(sceneOnHardenView({ ...stage, age: 64 })).toMatchObject(
      metallicShineAtAge(64, 72, 93, false),
    );
    expect(sceneOnHardenView({ ...stage, age: 96 })).toMatchObject(
      metallicShineAtAge(96, 72, 93, false),
    );
  });

  it("rejects a state staged for a different move", () => {
    const wrongStage = createSceneOnMovePresentation({
      move: "IRON_DEFENSE",
      attacker,
      target,
      fieldProfile: {
        playerHp: 122,
        playerMaxHp: 131,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
      attackerSpriteCenter: { x: 72, y: 93 },
    });
    expect(() => sceneOnHardenView({ ...wrongStage, age: 0 })).toThrow(
      /expected HARDEN presentation/,
    );
  });
});
