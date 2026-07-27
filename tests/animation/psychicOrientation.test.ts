import { describe, expect, it } from "vitest";
import kadabraFront from "../../src/animation/assets/kadabra-front.json" with { type: "json" };
import {
  createSceneOnMovePresentation,
  sceneOnConfusionView,
  sceneOnFutureSightView,
  sceneOnPsychicView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";

const kadabraOpponent = {
  species: "KADABRA",
  geometry: {
    side: "opponent",
    spriteCorner: { x: 144, y: 13 },
    animationCenter: { x: 176, y: 45 },
    battlePositionCenter: { x: 176, y: 40 },
  },
} as const satisfies SceneOnPresentationBattler;

const onixPlayer = {
  species: "ONIX",
  geometry: {
    side: "player",
    spriteCorner: { x: 40, y: 48 },
    animationCenter: { x: 72, y: 88 },
    battlePositionCenter: { x: 72, y: 80 },
  },
} as const satisfies SceneOnPresentationBattler;

const fieldProfile = {
  playerHp: 110,
  playerMaxHp: 110,
  opponentHp: 115,
  opponentMaxHp: 115,
  playerGender: "female",
  opponentGender: "male",
} as const;

describe("psychic-family opponent-attacker orientation", () => {
  it("pins KADABRA's source-derived front asset, coords, frame program, and animation family", () => {
    expect(kadabraFront.source).toEqual({
      frontCoords: { width: 56, height: 56, yOffset: 5 },
      frameProgram: [
        { frame: 0, duration: 12 },
        { frame: 1, duration: 45 },
        { frame: 0, duration: 15 },
      ],
      frontAnimFamily: "ANIM_GROW_VIBRATE",
    });
    expect(kadabraFront.tileset).toMatchObject({ columns: 8, rows: 8 });
    expect(kadabraFront.frame2).toMatchObject({ columns: 8, rows: 8 });
    expect(kadabraFront.tileset.tiles).not.toEqual(kadabraFront.frame2.tiles);
    expect(kadabraFront.palette).toHaveLength(16);
  });

  it.each([
    ["CONFUSION", sceneOnConfusionView],
    ["PSYCHIC", sceneOnPsychicView],
    ["FUTURE_SIGHT", sceneOnFutureSightView],
  ] as const)("%s preserves explicit opposite-side geometry and renders through the shared seam", (move, viewOf) => {
    const state = createSceneOnMovePresentation({
      move,
      attacker: kadabraOpponent,
      target: onixPlayer,
      fieldProfile,
    });
    const atPeak = { ...state, age: 51 };
    const view = viewOf(atPeak as never);
    expect(view.attacker).toBe(kadabraOpponent);
    expect(view.target).toBe(onixPlayer);
    const framebuffer = render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: atPeak,
    });
    expect(framebuffer).toHaveLength(240 * 160 * 4);
  });
});
