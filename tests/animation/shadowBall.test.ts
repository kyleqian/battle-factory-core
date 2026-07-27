import { describe, expect, it } from "vitest";
import {
  SHADOW_BALL_SPRITE_FIRST_AGE,
  shadowBallBackgroundBldy,
  shadowBallBackgroundIsGhost,
  shadowBallLoopSoundAtAge,
  shadowBallSpriteAtAge,
  shadowBallTargetShakeAtAge,
} from "../../src/animation/shadowBall.ts";

const PLAYER = {
  attackerCenter: { x: 72, y: 96 },
  targetCenter: { x: 176, y: 42 },
} as const;
const OPPONENT = {
  attackerCenter: { x: 176, y: 49 },
  targetCenter: { x: 72, y: 88 },
} as const;

describe("Shadow Ball source reducer", () => {
  it("ports all three 16/16/8 travel phases with C Q4 truncation", () => {
    const p = (localAge: number) =>
      shadowBallSpriteAtAge(SHADOW_BALL_SPRITE_FIRST_AGE + localAge, PLAYER);
    expect(p(0)).toMatchObject({ phase: 0, x: 75, y: 94 });
    expect(p(15)).toMatchObject({ phase: 0, x: 124, y: 69 });
    expect(p(16)).toMatchObject({ phase: 1, x: 124, y: 69 });
    expect(p(31)).toMatchObject({ phase: 1, x: 124, y: 69 });
    expect(p(32)).toMatchObject({ phase: 2, x: 130, y: 65 });
    expect(p(39)).toMatchObject({ phase: 2, x: 176, y: 42 });
    expect(p(40)).toBeNull();

    const o = (localAge: number) =>
      shadowBallSpriteAtAge(SHADOW_BALL_SPRITE_FIRST_AGE + localAge, OPPONENT);
    expect(o(0)).toMatchObject({ phase: 0, x: 172, y: 50 });
    expect(o(15)).toMatchObject({ phase: 0, x: 124, y: 68 });
    expect(o(32)).toMatchObject({ phase: 2, x: 117, y: 70 });
    expect(o(39)).toMatchObject({ phase: 2, x: 72, y: 88 });
  });

  it("runs the continuous +10 affine rotation in the hardware matrix domain", () => {
    const first = shadowBallSpriteAtAge(55, PLAYER)!;
    const second = shadowBallSpriteAtAge(56, PLAYER)!;
    const centerPause = shadowBallSpriteAtAge(86, PLAYER)!;
    expect(first).toMatchObject({ rotation: 0, pa: 256, pb: 0, pc: 0, pd: 256 });
    expect(second).toMatchObject({ rotation: 20, pa: 225, pb: -120, pc: 120, pd: 225 });
    expect(centerPause).toMatchObject({ rotation: 64, pa: 0, pb: -256, pc: 256, pd: 0 });
  });

  it("reproduces the complete five-play LoopSEAdjustPanning task schedule on both sides", () => {
    expect(shadowBallLoopSoundAtAge(54, "player")).toBeNull();
    expect(shadowBallLoopSoundAtAge(55, "player")).toEqual({
      remainingPlays: 4, delayCounter: 1, pan: -54, panCounter: 0,
    });
    expect(shadowBallLoopSoundAtAge(60, "player")).toEqual({
      remainingPlays: 3, delayCounter: 0, pan: -29, panCounter: 0,
    });
    expect(shadowBallLoopSoundAtAge(77, "player")).toEqual({
      remainingPlays: 1, delayCounter: 5, pan: 56, panCounter: 0,
    });
    expect(shadowBallLoopSoundAtAge(78, "player")).toBeNull();
    expect(shadowBallLoopSoundAtAge(55, "opponent")).toEqual({
      remainingPlays: 4, delayCounter: 1, pan: 53, panCounter: 0,
    });
    expect(shadowBallLoopSoundAtAge(77, "opponent")).toEqual({
      remainingPlays: 1, delayCounter: 5, pan: -57, panCounter: 0,
    });
  });

  it("pins BG_GHOST fade/wait/restore and target ShakeMon2 boundaries", () => {
    expect([0, 1, 16, 20, 21, 36].map(shadowBallBackgroundBldy))
      .toEqual([0, 1, 16, 16, 15, 0]);
    expect([112, 113, 128, 131, 132, 147].map(shadowBallBackgroundBldy))
      .toEqual([0, 1, 16, 16, 15, 0]);
    expect(shadowBallBackgroundIsGhost(15)).toBe(false);
    expect(shadowBallBackgroundIsGhost(16)).toBe(true);
    expect(shadowBallBackgroundIsGhost(127)).toBe(true);
    expect(shadowBallBackgroundIsGhost(128)).toBe(false);
    expect(shadowBallTargetShakeAtAge(95)).toEqual({ x2: 4, y2: 0 });
    expect(shadowBallTargetShakeAtAge(96)).toEqual({ x2: -4, y2: 0 });
    expect(shadowBallTargetShakeAtAge(110)).toEqual({ x2: 0, y2: 0 });
  });
});
