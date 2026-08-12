import { describe, expect, it } from "vitest";
import {
  METEOR_MASH_FRAME_COUNT,
  METEOR_MASH_IMPACT_AGE,
  METEOR_MASH_RESTORE_AGE,
  meteorMashAtAge,
} from "../../src/animation/meteorMash.ts";

const opponentTarget = {
  targetSide: "opponent" as const,
  targetCenter: { x: 176, y: 42 },
};
const playerTarget = {
  targetSide: "player" as const,
  targetCenter: { x: 72, y: 88 },
};

describe("Meteor Mash source reducer", () => {
  it("replays the three source star trajectories on either target side", () => {
    const right = meteorMashAtAge(48, opponentTarget);
    expect(right.stars[0]).toMatchObject({
      slot: 3, x: 128, y: -22, x2: 0, y2: 0, callbacks: 1,
    });
    const left = meteorMashAtAge(60, playerTarget);
    expect(left.stars[0]).toMatchObject({ slot: 3, x2: -48, y2: 38 });
    expect(left.stars[1]).toMatchObject({
      slot: 12, x: 184, y: 24, x2: 0, y2: 0, callbacks: 1,
    });
  });

  it("keeps the source phase boundaries and ShakeMon2 schedule relative", () => {
    expect(meteorMashAtAge(123, opponentTarget).hitsplat).toBe(false);
    expect(meteorMashAtAge(METEOR_MASH_IMPACT_AGE, opponentTarget)).toMatchObject({
      spinningHand: true,
      hitsplat: true,
      shakeTaskActive: true,
    });
    expect(meteorMashAtAge(162, opponentTarget).shakeTaskActive).toBe(false);
    expect(meteorMashAtAge(METEOR_MASH_RESTORE_AGE, opponentTarget).restoreActive).toBe(true);
    expect(meteorMashAtAge(METEOR_MASH_FRAME_COUNT, opponentTarget).active).toBe(false);
  });
});
