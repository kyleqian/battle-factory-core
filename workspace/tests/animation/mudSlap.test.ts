import { describe, expect, it } from "vitest";
import {
  MUD_SLAP_MUD_FIRST_DISPLAY_AGE,
  MUD_SLAP_MUD_HALF_SIZE,
  MUD_SLAP_MUD_LIFETIME,
  MUD_SLAP_SLIDE_FIRST_DISPLAY_AGE,
  mudSlapAnimationAtAge,
  mudSlapMudAtAge,
  mudSlapSourceMudAtAge,
  type MudSlapAnimationProfile,
} from "../../src/animation/mudSlap.ts";
import { mudSandAttackerX2AtAge } from "../../src/animation/mudSandSlide.ts";
import { sandAttackAttackerX2AtAge } from "../../src/animation/sandAttack.ts";
import {
  createSceneOnMovePresentation,
  PIDGEOTTO_TO_ONIX_MUD_SLAP_PRESENTATION,
  sceneOnMudSlapView,
} from "../../src/animation/sceneOnPresentation.ts";

const profile: MudSlapAnimationProfile = Object.freeze({
  spriteOrderSeed: Object.freeze(Array.from({ length: 64 }, (_, index) => index)),
  mud: Object.freeze([
    Object.freeze({ slot: 4, xStep: 1127, yStep: 320 }),
    Object.freeze({ slot: 5, xStep: 1292, yStep: 781 }),
  ]),
});

describe("portable MUD SLAP presentation", () => {
  it("reuses the signed shared slide choreography at its own display latch", () => {
    expect(MUD_SLAP_SLIDE_FIRST_DISPLAY_AGE).toBe(47);
    expect(mudSlapAnimationAtAge(
      47,
      { x: 176, y: 51 },
      "opponent",
      profile,
    ).attackerX2).toBe(3);
    expect(mudSlapAnimationAtAge(
      47,
      { x: 72, y: 100 },
      "player",
      profile,
    ).attackerX2).toBe(-4);
    expect(mudSandAttackerX2AtAge(47, "opponent", 47))
      .toBe(sandAttackAttackerX2AtAge(51, "opponent"));
  });

  it("models the distinct 16x16 projectile program and callback/display latch", () => {
    expect(MUD_SLAP_MUD_HALF_SIZE).toBe(8);
    expect(MUD_SLAP_MUD_LIFETIME).toBe(21);
    expect(mudSlapMudAtAge(
      MUD_SLAP_MUD_FIRST_DISPLAY_AGE - 1,
      { x: 176, y: 51 },
      "opponent",
      profile,
    )).toEqual([]);
    expect(mudSlapSourceMudAtAge(
      MUD_SLAP_MUD_FIRST_DISPLAY_AGE - 1,
      { x: 176, y: 51 },
      "opponent",
      profile,
    ).find(({ slot }) => slot === 4))
      .toEqual({ slot: 4, x: 157, y: 67 });
    expect(mudSlapMudAtAge(
      MUD_SLAP_MUD_FIRST_DISPLAY_AGE,
      { x: 176, y: 51 },
      "opponent",
      profile,
    ).find(({ slot }) => slot === 4))
      .toEqual({ slot: 4, x: 157, y: 67 });
  });

  it("preserves signed fixed-point geometry in both orientations", () => {
    const opponent = mudSlapMudAtAge(
      MUD_SLAP_MUD_FIRST_DISPLAY_AGE,
      { x: 176, y: 51 },
      "opponent",
      profile,
    );
    expect(opponent.find(({ slot }) => slot === 4))
      .toEqual({ slot: 4, x: 157, y: 67 });
    const player = mudSlapMudAtAge(
      MUD_SLAP_MUD_FIRST_DISPLAY_AGE,
      { x: 72, y: 100 },
      "player",
      profile,
    );
    expect(player.find(({ slot }) => slot === 5))
      .toEqual({ slot: 5, x: 92, y: 112 });
  });

  it("does not mutate resolved inputs while reducing the complete body", () => {
    const stage = createSceneOnMovePresentation({
      move: "MUD_SLAP",
      ...PIDGEOTTO_TO_ONIX_MUD_SLAP_PRESENTATION,
      fieldProfile: Object.freeze({
        playerHp: 117,
        opponentHp: 156,
        playerStatus: "none" as const,
      }),
      animationProfile: profile,
      moveTextStartAge: 7,
    });
    const before = structuredClone(stage.config);
    for (let age = 45; age <= 95; age += 1) {
      sceneOnMudSlapView({ ...stage, age });
    }
    expect(stage.config).toEqual(before);
    expect(stage.config.animationProfile).toBe(profile);
  });
});
