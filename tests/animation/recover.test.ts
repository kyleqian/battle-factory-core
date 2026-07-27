import { describe, expect, it } from "vitest";
import {
  RECOVER_HEALING_START_AGE,
  RECOVER_ORB_ARGS,
  recoverEffectAtAge,
} from "../../src/animation/recover.ts";

describe("MOVE_RECOVER source-relative component reducer", () => {
  it("replays the first player-side orb's RAM-probed translation and affine matrix", () => {
    const expected = [
      { x: 109, y: 86, scale: 266 },
      { x: 106, y: 87, scale: 271 },
      { x: 103, y: 88, scale: 277 },
      { x: 100, y: 89, scale: 283 },
    ];
    expect(expected.map((_, age) => {
      const orb = recoverEffectAtAge(age, "player", { x: 72, y: 96 })
        .sprites[0]!;
      return { x: orb.x, y: orb.y, scale: orb.xScale };
    })).toEqual(expected);
  });

  it("mirrors only source SetAnimSpriteInitialXOffset geometry for opponent-front", () => {
    const player = recoverEffectAtAge(0, "player", { x: 72, y: 96 })
      .sprites[0]!;
    const opponent = recoverEffectAtAge(0, "opponent", { x: 176, y: 45 })
      .sprites[0]!;
    expect(player.x - 72).toBe(-(opponent.x - 176));
    expect(player.y - 96).toBe(opponent.y - 45);
  });

  it("uses all 21 literal RecoverAbsorbEffect spawns without inventing sibling promotion", () => {
    const creationAges = Array.from(
      { length: RECOVER_ORB_ARGS.length * 3 },
      (_, index) => index * 5,
    );
    expect(creationAges.at(-1)).toBe(100);
    expect(creationAges.every((age) =>
      recoverEffectAtAge(age, "player", { x: 72, y: 96 })
        .sprites.some((sprite) =>
          sprite.kind === "orb" && sprite.spawnIndex === age / 5
        )
    )).toBe(true);
  });

  it("replays HealingEffect's four starts and literal 21-tick frame program", () => {
    expect([0, 9, 18, 27].map((offset) =>
      recoverEffectAtAge(
        RECOVER_HEALING_START_AGE + offset,
        "player",
        { x: 72, y: 96 },
      ).sprites.filter((sprite) => sprite.kind === "star").length
    )).toEqual([1, 2, 3, 3]);
    expect(
      recoverEffectAtAge(RECOVER_HEALING_START_AGE + 20, "player", {
        x: 72,
        y: 96,
      }).sprites[0]?.frame,
    ).toBe(0);
  });
});
