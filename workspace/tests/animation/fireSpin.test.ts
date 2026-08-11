import { describe, expect, it } from "vitest";
import {
  FIRE_SPIN_EFFECT_START_AGES,
  FIRE_SPIN_TARGET_SHAKE,
  fireSpinAtAge,
  fireSpinDisplayedTargetOffsetAtAge,
  fireSpinVortexSpritesAtAge,
} from "../../src/animation/fireSpin.ts";

const PLAYER_TO_OPPONENT = {
  targetCenter: { x: 176, y: 40 },
} as const;
const OPPONENT_TO_PLAYER = {
  targetCenter: { x: 72, y: 80 },
} as const;

describe("Fire Spin source reducer", () => {
  it("expands each of MOVE_FIRE_SPIN's three six-row FireSpinEffect calls", () => {
    expect(FIRE_SPIN_EFFECT_START_AGES).toEqual([4, 28, 52]);
    expect(fireSpinAtAge(3, PLAYER_TO_OPPONENT, "opponent").fireSpin).toEqual([]);
    expect(fireSpinAtAge(4, PLAYER_TO_OPPONENT, "opponent").fireSpin[0])
      .toMatchObject({
        spawnAge: 4, x: 176, y: 68, x2: 0, y2: -2,
        remaining: 29, angle: 13, animationFrame: 0,
      });
    expect(fireSpinAtAge(28, PLAYER_TO_OPPONENT, "opponent").fireSpin
      .map((sprite) => sprite.spawnAge)).toContain(28);
    expect(fireSpinAtAge(52, PLAYER_TO_OPPONENT, "opponent").fireSpin
      .map((sprite) => sprite.spawnAge)).toContain(52);
    expect(fireSpinAtAge(102, PLAYER_TO_OPPONENT, "opponent").fireSpin).toEqual([]);
  });

  it("keeps the shared vortex body side-neutral while targeting each field center", () => {
    expect(fireSpinVortexSpritesAtAge(4, { x: 72, y: 80 }, [4])[0])
      .toMatchObject({ x: 72, y: 108, x2: 0, y2: -2 });
    expect(fireSpinAtAge(52, OPPONENT_TO_PLAYER, "player").fireSpin
      .find((sprite) => sprite.spawnAge === 52))
      .toMatchObject({ x: 72, y: 108 });
  });

  it("reuses AnimTask_ShakeMon's 0/2 target pulse and source pan", () => {
    expect(FIRE_SPIN_TARGET_SHAKE).toEqual({
      xOffset: 0, yOffset: 2, numTimes: 47, frameDelay: 1,
    });
    expect([4, 5, 6, 7, 8, 95, 96].map((age) =>
      fireSpinAtAge(age, PLAYER_TO_OPPONENT, "opponent").targetOffset.y2,
    )).toEqual([0, 0, 2, 2, 0, 2, 0]);
    expect(fireSpinAtAge(1, PLAYER_TO_OPPONENT, "opponent").soundEvents)
      .toEqual([{ age: 1, song: "SE_M_SACRED_FIRE2", pan: 63 }]);
    expect(fireSpinAtAge(1, OPPONENT_TO_PLAYER, "player").soundEvents[0]?.pan)
      .toBe(-63);
    expect([4, 5, 6, 7, 8].map((age) =>
      fireSpinDisplayedTargetOffsetAtAge(age).y2,
    ))
      .toEqual([0, 2, 0, 0, 2]);
  });
});
