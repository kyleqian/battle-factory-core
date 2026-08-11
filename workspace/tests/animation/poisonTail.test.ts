import { describe, expect, it } from "vitest";
import { poisonTailAtAge } from "../../src/animation/poisonTail.ts";
import {
  createSceneOnMovePresentation,
  sceneOnPoisonTailView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("Move_POISON_TAIL source-relative reducer", () => {
  it("reuses permanent MetallicShine and mirrors the horizontal lunge", () => {
    const player = poisonTailAtAge(103, "player", { x: 72, y: 90 }, { x: 176, y: 42 });
    const opponent = poisonTailAtAge(103, "opponent", { x: 176, y: 48 }, { x: 72, y: 88 });
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
    const cleanupStall = poisonTailAtAge(124, "player", { x: 72, y: 90 }, { x: 176, y: 42 });
    const afterStall = poisonTailAtAge(126, "player", { x: 72, y: 90 }, { x: 176, y: 42 });
    const beforeSecond = poisonTailAtAge(131, "player", { x: 72, y: 90 }, { x: 176, y: 42 });
    const atLast = poisonTailAtAge(164, "player", { x: 72, y: 90 }, { x: 176, y: 42 });
    expect(atFirst.bubbles.map((sprite) => sprite.spawnIndex)).toEqual([0]);
    expect(cleanupStall.bubbles[0]?.xScale).toBe(394);
    expect(afterStall.bubbles[0]?.xScale).toBe(383);
    expect(beforeSecond.bubbles.map((sprite) => sprite.spawnIndex)).toEqual([0]);
    expect(atLast.bubbles.map((sprite) => sprite.spawnIndex)).toContain(5);
  });

  it("exposes the same reducer through the relative Scene-ON presentation seam", () => {
    const state = createSceneOnMovePresentation({
      move: "POISON_TAIL",
      attacker: {
        species: "SEVIPER",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 51 },
          animationCenter: { x: 72, y: 83 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 168,
        playerMaxHp: 180,
        opponentHp: 110,
        opponentMaxHp: 110,
      },
    });
    const view = sceneOnPoisonTailView({ ...state, age: 122 });
    expect(view).toMatchObject({
      age: 122,
      attackerX2: 0,
      targetX2: 0,
      monbg: false,
      alpha: false,
      attackerPaletteRestored: true,
    });
    expect(view.bubbles.map((sprite) => sprite.spawnIndex)).toEqual([0]);
  });
});
