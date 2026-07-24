import { describe, expect, it } from "vitest";
import {
  FEATHER_DANCE_FIRST_VISIBLE_AGE,
  featherDanceSpritesAtAge,
} from "../src/engine/featherDance.ts";
import {
  createSceneOnMovePresentation,
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
});
