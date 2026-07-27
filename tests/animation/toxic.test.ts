import { describe, expect, it } from "vitest";
import {
  TOXIC_LARGE_BUBBLE_START_AGES,
  TOXIC_POISON_BUBBLE_START_AGES,
  toxicEffectAtAge,
} from "../../src/animation/toxic.ts";

describe("MOVE_TOXIC source-relative reducer", () => {
  const effect = (age: number, side: "player" | "opponent" = "player") =>
    toxicEffectAtAge(age, side, { x: 176, y: 40 });

  it("ports both four-sprite ToxicBubbles calls and their animation", () => {
    expect(TOXIC_LARGE_BUBBLE_START_AGES).toEqual([0, 17, 34, 51, 68, 85, 102, 119]);
    expect([0, 3, 4, 8, 9, 13, 14, 19, 20].map(
      (age) => effect(age).find((sprite) => sprite.spawnIndex === 0)?.frame,
    )).toEqual([0, 0, 1, 1, 2, 2, 3, 3, undefined]);
    expect(effect(0)[0]).toMatchObject({ x: 152, y: 56, oamSlot: 3 });
    expect(effect(0, "opponent")[0]).toMatchObject({ x: 200, y: 56 });
  });

  it("reuses the six exact PoisonBubblesEffect sprites", () => {
    expect(TOXIC_POISON_BUBBLE_START_AGES).toEqual([157, 165, 173, 181, 189, 197]);
    expect(TOXIC_POISON_BUBBLE_START_AGES.map((age, index) =>
      effect(age).some((sprite) =>
        sprite.kind === "poisonBubble" && sprite.spawnIndex === index
      )
    )).toEqual([true, true, true, true, true, true]);
    expect(effect(217)).toHaveLength(1);
    expect(effect(218)).toHaveLength(0);
  });
});
