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
const twinkles = Array.from({ length: 48 }, (_, index) => ({
  tile: (index % 4 === 0 ? 4 : 5) as 4 | 5,
  y2: index % 8 > 3 ? -(index % 8) : index % 8,
}));

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
    expect(meteorMashAtAge(213, opponentTarget).active).toBe(false);
    expect(meteorMashAtAge(213, playerTarget).active).toBe(true);
  });

  it("replays all 48 source mini-star spawns through their 60-callback flicker", () => {
    const geometry = { ...opponentTarget, twinkles };
    expect(meteorMashAtAge(48, geometry).miniStars).toMatchObject([
      { index: 0, parentIndex: 0, localAge: 0, x: 128, y: -22, invisible: false },
    ]);
    expect(meteorMashAtAge(60, geometry).miniStars.map((star) => star.index))
      .toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(meteorMashAtAge(78, geometry).miniStars.some(
      (star) => star.index === 24 && star.parentIndex === 0 && star.x === 248 && star.y === 74,
    )).toBe(true);
    expect(meteorMashAtAge(108, geometry).miniStars.some(
      (star) => star.index === 0 && star.localAge === 60,
    )).toBe(true);
    expect(meteorMashAtAge(109, geometry).miniStars.some((star) => star.index === 0)).toBe(false);
    expect(meteorMashAtAge(192, geometry).miniStars).toHaveLength(1);
    expect(meteorMashAtAge(193, geometry).miniStars).toHaveLength(0);
  });

  it("pins the two BG_COSMIC blackout/swap/restore register schedules", () => {
    expect(meteorMashAtAge(11, opponentTarget).fadeCoefficient).toBe(0);
    expect(meteorMashAtAge(27, opponentTarget).fadeCoefficient).toBe(16);
    expect(meteorMashAtAge(29, opponentTarget).background).toBe("cosmic");
    expect(meteorMashAtAge(46, opponentTarget).fadeCoefficient).toBe(0);
    expect(meteorMashAtAge(176, opponentTarget).fadeCoefficient).toBe(0);
    expect(meteorMashAtAge(192, opponentTarget).fadeCoefficient).toBe(16);
    expect(meteorMashAtAge(194, opponentTarget).background).toBe("battle");
    expect(meteorMashAtAge(196, opponentTarget).fadeCoefficient).toBe(15);
    expect(meteorMashAtAge(197, playerTarget).fadeCoefficient).toBe(15);
  });
});
