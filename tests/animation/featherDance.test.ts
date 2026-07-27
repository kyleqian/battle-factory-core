import { describe, expect, it } from "vitest";
import {
  FEATHER_DANCE_FIRST_VISIBLE_AGE,
  featherDanceSpritesAtAge,
} from "../../src/animation/featherDance.ts";
import {
  createSceneOnMovePresentation,
  featherDanceStatDropDisplayProfile,
  FEATHER_DANCE_STAT_DROP_DISPLAY_PROFILE,
  FEATHER_DANCE_STAT_MESSAGE_LENGTH,
  PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_FEATHER_DANCE_PRESENTATION,
  PIDGEOTTO_TO_ONIX_FEATHER_DANCE_PRESENTATION,
  sceneOnFeatherDanceView,
} from "../../src/animation/sceneOnPresentation.ts";

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

  it("derives the opposite target-side anchor, priority, and printer-relative script offset", () => {
    const original = featherDanceSpritesAtAge(
      54,
      { x: 72, y: 80 },
      "player",
    )[0]!;
    const opposite = featherDanceSpritesAtAge(
      50,
      { x: 176, y: 40 },
      "opponent",
      4,
    )[0]!;
    expect({
      dx: opposite.centerX - original.centerX,
      dy: opposite.centerY - original.centerY,
      priorityDelta: opposite.priority - original.priority,
    }).toEqual({ dx: 104, dy: -40, priorityDelta: -1 });
    expect(opposite).toMatchObject({
      pa: original.pa,
      pb: original.pb,
      pc: original.pc,
      pd: original.pd,
      animNum: original.animNum,
      order: original.order,
    });
  });

  it("pins source-derived player-back Pidgeotto and opponent-front Onix geometry", () => {
    expect(PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_FEATHER_DANCE_PRESENTATION)
      .toEqual({
        attacker: {
          species: "PIDGEOTTO",
          geometry: {
            side: "player",
            spriteCorner: { x: 40, y: 60 },
            animationCenter: { x: 72, y: 100 },
            battlePositionCenter: { x: 72, y: 80 },
          },
        },
        target: {
          species: "ONIX",
          geometry: {
            side: "opponent",
            spriteCorner: { x: 145, y: 10 },
            animationCenter: { x: 176, y: 42 },
            battlePositionCenter: { x: 176, y: 40 },
          },
        },
        animationAgeOffset: 4,
      });
  });

  it("uses player/opponent text prefixes while retaining immutable controller outcomes", () => {
    const controllerProfile = Object.freeze({
      attackStageBefore: 6,
      attackStageAfter: 4,
    });
    const stage = createSceneOnMovePresentation({
      move: "FEATHER_DANCE",
      ...PLAYER_PIDGEOTTO_TO_OPPONENT_ONIX_FEATHER_DANCE_PRESENTATION,
      fieldProfile: Object.freeze({
        playerHp: 156,
        opponentHp: 117,
        playerStatus: "none" as const,
        playerGender: "female" as const,
        opponentGender: "male" as const,
      }),
      controllerProfile,
      moveTextStartAge: 7,
    });
    const before = structuredClone(stage.config);
    const body = sceneOnFeatherDanceView({ ...stage, age: 50 });
    expect(body.feathers).toHaveLength(1);
    expect(body.moveText).toEqual({
      line1: "PIDGEOTTO used",
      line2: "FEATHERDANCE!",
    });
    expect(body.statMessage).toEqual({
      line1: "Foe ONIX’s ATTACK",
      line2: "harshly fell!",
    });
    expect(featherDanceStatDropDisplayProfile(4)).toMatchObject({
      bannerFirstAge: 219,
      bannerLastAge: 299,
      messageFirstAge: 304,
      nextControllerReadyAge: 406,
    });
    expect(
      sceneOnFeatherDanceView({ ...stage, age: 333 })
        .controllerDisplay.messageVisibleChars,
    ).toBe(30);
    expect(stage.config).toEqual(before);
    expect(stage.config.controllerProfile).toBe(controllerProfile);
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
