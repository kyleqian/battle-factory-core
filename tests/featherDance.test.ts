import { describe, expect, it } from "vitest";
import {
  FEATHER_DANCE_FIRST_VISIBLE_AGE,
  featherDanceSpritesAtAge,
} from "../src/engine/featherDance.ts";
import {
  createSceneOnMovePresentation,
  FEATHER_DANCE_STAT_DROP_DISPLAY_PROFILE,
  FEATHER_DANCE_STAT_MESSAGE_LENGTH,
  PIDGEOTTO_TO_ONIX_FEATHER_DANCE_PRESENTATION,
  sceneOnFeatherDanceView,
} from "../src/engine/sceneOnPresentation.ts";

describe("portable FEATHER DANCE presentation", () => {
  it("pins relative spawn, affine state, group cadence, and lifetime", () => {
    const center = { x: 72, y: 80 };
    expect(FEATHER_DANCE_FIRST_VISIBLE_AGE).toBe(54);
    expect(featherDanceSpritesAtAge(53, center)).toEqual([]);
    expect(featherDanceSpritesAtAge(54, center)).toEqual([
      {
        centerX: 112,
        centerY: 64,
        pa: 225,
        pb: -120,
        pc: 120,
        pd: 225,
        animNum: 1,
        priority: 3,
        slot: 3,
        order: 0,
      },
    ]);
    expect(featherDanceSpritesAtAge(86, center)).toHaveLength(8);
    expect(featherDanceSpritesAtAge(207, center)).toHaveLength(1);
    expect(featherDanceSpritesAtAge(208, center)).toEqual([]);
  });

  it("translates the component from explicit target geometry", () => {
    const base = featherDanceSpritesAtAge(54, { x: 72, y: 80 })[0]!;
    const shifted = featherDanceSpritesAtAge(54, { x: 176, y: 40 })[0]!;
    expect({
      dx: shifted.centerX - base.centerX,
      dy: shifted.centerY - base.centerY,
    }).toEqual({ dx: 104, dy: -40 });
    expect(shifted).toMatchObject({
      pa: base.pa,
      pb: base.pb,
      pc: base.pc,
      pd: base.pd,
    });
  });

  it("leaves controller-owned stat outcomes and field inputs immutable", () => {
    const fieldProfile = Object.freeze({
      playerHp: 117,
      opponentHp: 156,
      playerStatus: "none" as const,
      playerGender: "female" as const,
    });
    const controllerProfile = Object.freeze({
      attackStageBefore: 6,
      attackStageAfter: 4,
    });
    const stage = createSceneOnMovePresentation({
      move: "FEATHER_DANCE",
      ...PIDGEOTTO_TO_ONIX_FEATHER_DANCE_PRESENTATION,
      fieldProfile,
      controllerProfile,
      moveTextStartAge: 7,
    });
    const before = structuredClone(stage.config);
    expect(sceneOnFeatherDanceView({ ...stage, age: 54 }).feathers).toHaveLength(1);
    expect(stage.config).toEqual(before);
    expect(stage.config.fieldProfile).toBe(fieldProfile);
    expect(stage.config.controllerProfile).toBe(controllerProfile);
  });

  it("pins the relative stat-banner, message, and next-controller phases", () => {
    const stage = createSceneOnMovePresentation({
      move: "FEATHER_DANCE",
      ...PIDGEOTTO_TO_ONIX_FEATHER_DANCE_PRESENTATION,
      fieldProfile: Object.freeze({
        playerHp: 117,
        opponentHp: 156,
        playerStatus: "none" as const,
        playerGender: "female" as const,
      }),
      controllerProfile: Object.freeze({
        attackStageBefore: 6,
        attackStageAfter: 4,
      }),
      moveTextStartAge: 7,
    });
    const displayAt = (age: number) =>
      sceneOnFeatherDanceView({ ...stage, age }).controllerDisplay;

    expect(FEATHER_DANCE_STAT_DROP_DISPLAY_PROFILE).toMatchObject({
      bannerFirstAge: 223,
      bannerLastAge: 303,
      messageFirstAge: 308,
      nextControllerReadyAge: 406,
    });
    expect(displayAt(222)).toMatchObject({
      phase: "moveBody",
      banner: null,
      messageVisibleChars: 0,
      nextControllerReady: false,
    });
    expect(displayAt(223)).toMatchObject({
      phase: "statBanner",
      banner: { eva: 1, bg1Y: -6 },
    });
    expect(displayAt(247).banner).toEqual({ eva: 13, bg1Y: -78 });
    expect(displayAt(278).banner).toEqual({ eva: 13, bg1Y: -171 });
    expect(displayAt(279).banner).toEqual({ eva: 12, bg1Y: -174 });
    expect(displayAt(303).banner).toEqual({ eva: 0, bg1Y: -246 });
    expect(displayAt(304)).toMatchObject({
      phase: "messageHandoff",
      banner: null,
      messageVisibleChars: 0,
    });
    expect(displayAt(308)).toMatchObject({
      phase: "statMessage",
      messageVisibleChars: 1,
    });
    expect(displayAt(333).messageVisibleChars)
      .toBe(FEATHER_DANCE_STAT_MESSAGE_LENGTH);
    expect(displayAt(405)).toMatchObject({
      phase: "statMessage",
      nextControllerReady: false,
    });
    expect(displayAt(406)).toMatchObject({
      phase: "nextControllerReady",
      nextControllerReady: true,
    });
  });

  it("advances display clocks without mutating the supplied 6→4 result", () => {
    const controllerProfile = Object.freeze({
      attackStageBefore: 6,
      attackStageAfter: 4,
    });
    const stage = createSceneOnMovePresentation({
      move: "FEATHER_DANCE",
      ...PIDGEOTTO_TO_ONIX_FEATHER_DANCE_PRESENTATION,
      fieldProfile: Object.freeze({
        playerHp: 117,
        opponentHp: 156,
        playerStatus: "none" as const,
      }),
      controllerProfile,
      moveTextStartAge: 7,
    });
    const before = structuredClone(stage.config);
    for (const age of [223, 247, 303, 308, 333, 406]) {
      sceneOnFeatherDanceView({ ...stage, age });
    }
    expect(stage.config).toEqual(before);
    expect(stage.config.controllerProfile).toBe(controllerProfile);
  });
});
