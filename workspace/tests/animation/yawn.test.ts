import { describe, expect, it } from "vitest";
import { YAWN_CLEANUP_AGE, yawnAtAge } from "../../src/animation/yawn.ts";

const playerAttacker = { x: 72, y: 88 };
const playerTarget = { x: 176, y: 45 };
const opponentAttacker = { x: 176, y: 49 };
const opponentTarget = { x: 72, y: 89 };

describe("Move_YAWN source-relative reducer", () => {
  it("ports bilateral picture-offset heights and cloud endpoints", () => {
    const player = yawnAtAge(69, "player", playerAttacker, playerTarget);
    const opponent = yawnAtAge(69, "opponent", opponentAttacker, opponentTarget);
    expect(player.clouds[0]).toMatchObject({ slot: 3, x: 73, y: 95, y2: 1, matrix: { a: 248, d: 248 } });
    expect(opponent.clouds[0]).toMatchObject({ slot: 3, x: 174, y: 49, y2: 1, matrix: { a: 248, d: 248 } });
    expect(yawnAtAge(4, "player", playerAttacker, playerTarget).attackerTransform.matrix).toMatchObject({ a: 272, d: 256 });
    expect(yawnAtAge(147, "player", playerAttacker, playerTarget).targetTransform).toMatchObject({ active: true, matrix: { a: 272, d: 256 }, y2: 0 });
    expect(yawnAtAge(154, "player", playerAttacker, playerTarget).targetTransform).toMatchObject({ active: true, matrix: { a: 320, d: 244 }, y2: -1 });
  });

  it("ports the observable 17-callback cloud affine cycle and cleanup", () => {
    const atCallback16 = yawnAtAge(84, "player", playerAttacker, playerTarget).clouds[0];
    const atCallback17 = yawnAtAge(85, "player", playerAttacker, playerTarget).clouds[0];
    const atCallback18 = yawnAtAge(86, "player", playerAttacker, playerTarget).clouds[0];
    expect(atCallback16?.matrix).toMatchObject({ a: 256, d: 256 });
    expect(atCallback17?.matrix).toMatchObject({ a: 256, d: 256 });
    expect(atCallback18?.matrix).toMatchObject({ a: 248, d: 248 });
    expect(yawnAtAge(YAWN_CLEANUP_AGE, "player", playerAttacker, playerTarget)).toMatchObject({
      active: false,
      tagsLoaded: false,
      clouds: [],
      attackerTransform: { active: false },
      targetTransform: { active: false },
      sound: null,
    });
  });
});
