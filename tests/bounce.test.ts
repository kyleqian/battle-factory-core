import { describe, expect, it } from "vitest";
import {
  BOUNCE_CHARGE_BALL,
  bouncePresentationAtAge,
  bounceStrikeBallAtAge,
} from "../src/engine/bounce.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBounceView,
  SPOINK_TO_ONIX_BOUNCE_PRESENTATION,
} from "../src/engine/sceneOnPresentation.ts";

describe("source-relative BOUNCE presentation", () => {
  it("pins the complete BounceSetUp affine program from legal Scene-ON OAM", () => {
    expect(BOUNCE_CHARGE_BALL).toHaveLength(24);
    expect(BOUNCE_CHARGE_BALL[0]).toEqual({ a: 1170, d: 256, y2: 0 });
    expect(BOUNCE_CHARGE_BALL[10]).toEqual({ a: 256, d: 682, y2: 0 });
    expect(BOUNCE_CHARGE_BALL[18]).toEqual({ a: 682, d: 862, y2: 0 });
    expect(BOUNCE_CHARGE_BALL[23]).toEqual({
      a: 4096,
      d: -16384,
      y2: 0,
    });
    expect(bouncePresentationAtAge("charge", 24).ball).toBeNull();
    expect(bouncePresentationAtAge("charge", 24).attackerInvisible).toBe(true);
  });

  it("pins the complete vertical land and rebound geometry", () => {
    expect(bounceStrikeBallAtAge(-1)).toBeNull();
    expect(bounceStrikeBallAtAge(0)).toEqual({ a: 409, d: 256, y2: -102 });
    expect(bounceStrikeBallAtAge(10)).toEqual({ a: 409, d: 256, y2: -2 });
    expect(bounceStrikeBallAtAge(11)).toEqual({ a: 409, d: 256, y2: 8 });
    expect(bounceStrikeBallAtAge(12)).toEqual({ a: 409, d: 256, y2: -2 });
    expect(bounceStrikeBallAtAge(23)).toEqual({ a: 409, d: 256, y2: -112 });
    expect(bounceStrikeBallAtAge(24)).toBeNull();
  });

  it("reuses only BOUNCE's script-exact hit-splat and vertical shake clocks", () => {
    expect(bouncePresentationAtAge("strike", 8)).toMatchObject({
      impactVisible: false,
      targetTaskOwnsY2: false,
      targetShakeY2: 0,
    });
    expect(bouncePresentationAtAge("strike", 9)).toMatchObject({
      impactVisible: true,
      targetTaskOwnsY2: true,
      targetShakeY2: 0,
    });
    expect(bouncePresentationAtAge("strike", 11).targetShakeY2).toBe(5);
    expect(bouncePresentationAtAge("strike", 13).targetShakeY2).toBe(0);
    expect(bouncePresentationAtAge("strike", 17).impactVisible).toBe(true);
    expect(bouncePresentationAtAge("strike", 18).impactVisible).toBe(false);
    expect(bouncePresentationAtAge("strike", 24)).toMatchObject({
      attackerInvisible: false,
      ball: null,
      targetTaskOwnsY2: true,
      targetShakeY2: 0,
    });
  });

  it("is driven through the shared Scene-ON seam by relative phase age", () => {
    const state = createSceneOnMovePresentation({
      move: "BOUNCE",
      turn: "strike",
      ...SPOINK_TO_ONIX_BOUNCE_PRESENTATION,
      animationAgeOffset: -9,
    });
    expect(sceneOnBounceView({ ...state, age: 18 })).toMatchObject({
      age: 18,
      animationAge: 9,
      currentMove: "BOUNCE",
      attacker: { species: "SPOINK" },
      target: { species: "ONIX" },
      attackerInvisible: true,
      impactVisible: true,
      targetTaskOwnsY2: true,
    });
  });
});
