import { describe, expect, it } from "vitest";
import {
  IRON_DEFENSE_BLEND_START_AGE,
  complexPaletteBlendAtAge,
  ironDefenseAtAge,
} from "../../src/animation/ironDefense.ts";
import {
  createSceneOnMovePresentation,
  sceneOnIronDefenseView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_IRON_DEFENSE source reducer", () => {
  it("transcribes the BG-only complex_palette_blend pulse (delay 8, num_blends 2, white 14 -> 0)", () => {
    // RAM state at engine age = creation (engine age 3) + local age.
    const local = (engineAge: number) =>
      complexPaletteBlendAtAge(engineAge - IRON_DEFENSE_BLEND_START_AGE);
    expect(local(0)).toEqual({ active: false, color: null, coefficient: 0 });
    expect(local(1)).toEqual({ active: false, color: null, coefficient: 0 });
    expect(local(2)).toEqual({ active: false, color: null, coefficient: 0 });
    // Initializer blends F_PAL_BG to white 14 on its creation tick.
    expect(local(3)).toEqual({ active: true, color: "white", coefficient: 14 });
    expect(local(10)).toEqual({ active: true, color: "white", coefficient: 14 });
    // Step1 alternates back to blend_y2=0 after `delay` frames.
    expect(local(11)).toEqual({ active: false, color: null, coefficient: 0 });
    expect(local(19)).toEqual({ active: false, color: null, coefficient: 0 });
    // Second alternation back to white 14.
    expect(local(20)).toEqual({ active: true, color: "white", coefficient: 14 });
    expect(local(29)).toEqual({ active: true, color: "white", coefficient: 14 });
    // Step2 restores and destroys after the final blend.
    expect(local(30)).toEqual({ active: false, color: null, coefficient: 0 });
    expect(local(31)).toEqual({ active: false, color: null, coefficient: 0 });
  });

  it("reuses the accepted non-permanent MetallicShine unchanged", () => {
    expect(ironDefenseAtAge(0, 72, 93).metallic).toMatchObject({
      active: true,
      data10: 0,
      data11: 0,
      bg1X: 24,
      metalBgLoaded: true,
      attackerGrayscale: true,
    });
    expect(ironDefenseAtAge(1, 72, 93).metallic).toMatchObject({
      data10: 4,
      data11: 0,
      bg1X: 20,
    });
    expect(ironDefenseAtAge(64, 72, 93).metallic).toMatchObject({
      data10: 0,
      data11: 2,
      metalBgLoaded: false,
      attackerGrayscale: false,
    });
    expect(ironDefenseAtAge(96, 72, 93).metallic).toMatchObject({
      active: false,
      data11: 3,
    });
  });

  it("starts the palette pulse three ticks after the shine", () => {
    const early = ironDefenseAtAge(2, 72, 93);
    expect(early.metallic.data10).toBe(8);
    expect(early.palette).toEqual({ active: false, color: null, coefficient: 0 });
    const first = ironDefenseAtAge(3, 72, 93);
    expect(first.palette).toEqual({ active: true, color: "white", coefficient: 14 });
  });

  it("crosses the typed seam without owning the Defense stage", () => {
    const attacker: SceneOnPresentationBattler = {
      species: "CLAMPERL",
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
    const view = sceneOnIronDefenseView({ ...stage, age: 5 });
    expect(view.attacker).toBe(attacker);
    expect(view.target).toBe(target);
    expect(view.palette).toEqual({
      active: true,
      color: "white",
      coefficient: 14,
    });
    expect(view.metallic.data10).toBe(20);
    // The Defender's stat stage is an immutable field input, not owned here.
    expect(view).not.toHaveProperty("statStage");
  });
});
