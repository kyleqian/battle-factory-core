import { describe, expect, it } from "vitest";
import {
  WRAP_ANIMATION_PROFILE,
  wrapAnimationAtAge,
  wrapEllipticalOffsetAtAge,
} from "../../src/animation/wrap.ts";
import { scaleMonAndRestoreAtAge } from "../../src/animation/bind.ts";
import {
  createSceneOnMovePresentation,
  sceneOnWrapView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_WRAP source reducer", () => {
  it("transcribes AnimTask_TranslateMonEllipticalRespectSide(6,4,2,4)", () => {
    // The task's step runs each tick from its creation frame; `1 << speed`
    // phase step (16) means each of the two loops spans steps 0..16 and the
    // step that wraps the second loop resets and destroys the task (age 31).
    expect(wrapEllipticalOffsetAtAge(0, "player")).toEqual({ x2: 0, y2: 0 });
    expect(wrapEllipticalOffsetAtAge(1, "player")).toEqual({ x2: 2, y2: 1 });
    expect(wrapEllipticalOffsetAtAge(2, "player")).toEqual({ x2: 4, y2: 2 });
    expect(wrapEllipticalOffsetAtAge(3, "player")).toEqual({ x2: 5, y2: 3 });
    expect(wrapEllipticalOffsetAtAge(4, "player")).toEqual({ x2: 6, y2: 4 });
    expect(wrapEllipticalOffsetAtAge(5, "player")).toEqual({ x2: 5, y2: 6 });
    expect(wrapEllipticalOffsetAtAge(8, "player")).toEqual({ x2: 0, y2: 8 });
    expect(wrapEllipticalOffsetAtAge(15, "player")).toEqual({ x2: -3, y2: 1 });
    // Loop-1 wrap renders the origin, then loop-2 restarts from θ=16.
    expect(wrapEllipticalOffsetAtAge(16, "player")).toEqual({ x2: 0, y2: 0 });
    expect(wrapEllipticalOffsetAtAge(17, "player")).toEqual({ x2: 2, y2: 1 });
    expect(wrapEllipticalOffsetAtAge(30, "player")).toEqual({ x2: -5, y2: 2 });
    // The θ wrap that would end loop 2 resets offsets and destroys the task
    // in the same step, so the software sprite shows the origin at age 31.
    expect(wrapEllipticalOffsetAtAge(31, "player")).toEqual({ x2: 0, y2: 0 });
    expect(wrapEllipticalOffsetAtAge(32, "player")).toEqual({ x2: 0, y2: 0 });
  });

  it("mirrors the ellipse width for the opponent side (RespectSide)", () => {
    expect(wrapEllipticalOffsetAtAge(1, "opponent")).toEqual({ x2: -3, y2: 1 });
    expect(wrapEllipticalOffsetAtAge(4, "opponent")).toEqual({ x2: -6, y2: 4 });
    expect(wrapEllipticalOffsetAtAge(15, "opponent")).toEqual({ x2: 2, y2: 1 });
    expect(wrapEllipticalOffsetAtAge(16, "opponent")).toEqual({ x2: 0, y2: 0 });
    expect(wrapEllipticalOffsetAtAge(31, "opponent")).toEqual({ x2: 0, y2: 0 });
  });

  it("reuses the shared BindWrap squeeze at probe-measured starts", () => {
    const profile = WRAP_ANIMATION_PROFILE;
    expect(profile.ellipse).toEqual({
      xRadius: 6,
      yRadius: 4,
      loops: 2,
      speed: 4,
    });
    expect(profile.squeeze).toEqual({ xDelta: 10, yDelta: -5, duration: 5 });
    // Probe-measured: the first BindWrapSqueezeTarget step lands one frame
    // after the leading elliptical task, the second 18 frames later.
    expect(profile.squeezeStarts).toEqual([1, 19]);
    const before = structuredClone(profile);
    for (const [age, x] of [
      [1, 266],
      [5, 306],
      [9, 266],
      [19, 266],
      [27, 266],
    ] as const) {
      const state = wrapAnimationAtAge(age, "player");
      expect(state.targetAffine).toEqual({
        active: true,
        xScale: x,
        yScale: 256 - 5 * (x - 256) / 10,
      });
    }
    expect(wrapAnimationAtAge(10, "player").targetAffine.active).toBe(false);
    expect(wrapAnimationAtAge(28, "player").targetAffine.active).toBe(false);
    expect(profile).toEqual(before);
  });

  it("delegates the squeeze body to the accepted BIND component", () => {
    // scaleMonAndRestoreAtAge is the BIND control's own shared component;
    // WRAP must not reimplement it.
    const squeeze = WRAP_ANIMATION_PROFILE.squeeze;
    expect(scaleMonAndRestoreAtAge(0, squeeze)).toEqual({
      active: true,
      xScale: 266,
      yScale: 251,
    });
    expect(scaleMonAndRestoreAtAge(8, squeeze)).toEqual({
      active: true,
      xScale: 266,
      yScale: 251,
    });
    expect(scaleMonAndRestoreAtAge(9, squeeze)).toEqual({
      active: false,
      xScale: 256,
      yScale: 256,
    });
  });

  it("crosses the typed seam without owning the trap/damage resolution", () => {
    const attacker: SceneOnPresentationBattler = {
      species: "TENTACOOL",
      geometry: {
        side: "player" as const,
        spriteCorner: { x: 40, y: 58 },
        animationCenter: { x: 72, y: 90 },
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
      move: "WRAP",
      attacker,
      target,
      animationProfile: WRAP_ANIMATION_PROFILE,
      fieldProfile: {
        playerHp: 117,
        playerMaxHp: 136,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
    });
    const view = sceneOnWrapView({ ...stage, age: 5 });
    expect(view.attacker).toBe(attacker);
    expect(view.target).toBe(target);
    expect(view.attackerX2).toBe(
      wrapAnimationAtAge(5, "player").attackerX2,
    );
    expect(view.attackerY2).toBe(
      wrapAnimationAtAge(5, "player").attackerY2,
    );
    expect(view.targetAffine).toEqual(
      wrapAnimationAtAge(5, "player").targetAffine,
    );
  });
});
