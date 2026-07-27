import { describe, expect, it } from "vitest";
import { poisonTailAtAge } from "../../src/animation/poisonTail.ts";

describe("Move_POISON_TAIL source-relative reducer", () => {
  it("reuses permanent MetallicShine and mirrors the horizontal lunge", () => {
    const player = poisonTailAtAge(103, "player", { x: 72, y: 90 }, { x: 176, y: 42 });
    const opponent = poisonTailAtAge(103, "opponent", { x: 176, y: 42 }, { x: 72, y: 80 });
    expect(player.attackerX2).toBe(4);
    expect(opponent.attackerX2).toBe(-4);
    expect(player.metallic.attackerGrayscale).toBe(true);
    expect(player.metallic.active).toBe(false);
  });

  it("orders the impact, six-tick target shake, palette restore, and teardown", () => {
    expect(poisonTailAtAge(110, "player", { x: 72, y: 90 }, { x: 176, y: 42 }).hitsplatVisible).toBe(false);
    expect(poisonTailAtAge(111, "player", { x: 72, y: 90 }, { x: 176, y: 42 }).hitsplatVisible).toBe(true);
    expect(poisonTailAtAge(113, "player", { x: 72, y: 90 }, { x: 176, y: 42 }).targetX2).toBe(3);
    const cleanup = poisonTailAtAge(123, "player", { x: 72, y: 90 }, { x: 176, y: 42 });
    expect(cleanup).toMatchObject({
      monbg: false,
      alpha: false,
      attackerPaletteRestored: true,
    });
  });

  it("delegates all six literal PoisonBubblesEffect spawns to the exact shared reducer", () => {
    const atFirst = poisonTailAtAge(122, "player", { x: 72, y: 90 }, { x: 176, y: 42 });
    const atLast = poisonTailAtAge(162, "player", { x: 72, y: 90 }, { x: 176, y: 42 });
    expect(atFirst.bubbles.map((sprite) => sprite.spawnIndex)).toEqual([0]);
    expect(atLast.bubbles.map((sprite) => sprite.spawnIndex)).toContain(5);
  });
});
