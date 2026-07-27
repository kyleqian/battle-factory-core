import { describe, expect, expectTypeOf, it } from "vitest";
import {
  animTaskShakeMon2AtSourceAge,
  statusAnimationAtSourceAge,
  type StatusAnimationInput,
} from "../../src/animation/statusAnimation.ts";

describe("visual-only status animation component", () => {
  it("has no move identity or battle-resolution inputs", () => {
    expectTypeOf<StatusAnimationInput>().toEqualTypeOf<{
      readonly kind: "paralysis";
      readonly sourceAge: number;
      readonly targetGeometry: {
        readonly battlePositionCenter: Readonly<{ x: number; y: number }>;
      };
    }>();
    expect(Object.keys({
      kind: "paralysis",
      sourceAge: 0,
      targetGeometry: { battlePositionCenter: { x: 72, y: 88 } },
    } satisfies StatusAnimationInput).sort()).toEqual([
      "kind",
      "sourceAge",
      "targetGeometry",
    ]);
  });

  it("pins the parameterized AnimTask_ShakeMon2 display timeline", () => {
    const profile = {
      xOffset: 1,
      yOffset: 0,
      shakeCount: 10,
      frameDelay: 1,
    } as const;
    expect([-1, 0, 1, 2, 3, 4, 5, 20, 21].map((age) =>
      animTaskShakeMon2AtSourceAge(age, profile)
    )).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ]);
    expect(animTaskShakeMon2AtSourceAge(2, {
      xOffset: 3,
      yOffset: -2,
      shakeCount: 2,
      frameDelay: 1,
    })).toEqual({ x: -3, y: 2 });
  });

  it("decodes Status_Paralysis sprites and framebuffer shake by source age", () => {
    const targetGeometry = {
      battlePositionCenter: { x: 72, y: 88 },
    };
    expect(statusAnimationAtSourceAge({
      kind: "paralysis",
      sourceAge: 1,
      targetGeometry,
    })).toEqual({
      battlerOffset: { x: 0, y: 0 },
      sprites: [],
    });
    const first = statusAnimationAtSourceAge({
      kind: "paralysis",
      sourceAge: 2,
      targetGeometry,
    });
    expect(first.battlerOffset).toEqual({ x: 1, y: 0 });
    expect(first.sprites).toHaveLength(1);
    expect(first.sprites[0]).toMatchObject({
      x: 69,
      y: 80,
      tileset: { columns: 2, rows: 2 },
    });
    expect(first.sprites[0]!.tileset.tiles).toHaveLength(4);
    expect(first.sprites[0]!.palette.length).toBeGreaterThan(1);
    expect(statusAnimationAtSourceAge({
      kind: "paralysis",
      sourceAge: 6,
      targetGeometry,
    }).sprites).toHaveLength(2);
    expect(statusAnimationAtSourceAge({
      kind: "paralysis",
      sourceAge: 20,
      targetGeometry,
    }).battlerOffset).toEqual({ x: -1, y: 0 });
    expect(statusAnimationAtSourceAge({
      kind: "paralysis",
      sourceAge: 21,
      targetGeometry,
    }).battlerOffset).toEqual({ x: 0, y: 0 });
    expect(statusAnimationAtSourceAge({
      kind: "paralysis",
      sourceAge: 36,
      targetGeometry,
    }).sprites).toEqual([]);
  });

  it("translates the same source program through battler target geometry", () => {
    const player = statusAnimationAtSourceAge({
      kind: "paralysis",
      sourceAge: 10,
      targetGeometry: { battlePositionCenter: { x: 72, y: 88 } },
    });
    const opponent = statusAnimationAtSourceAge({
      kind: "paralysis",
      sourceAge: 10,
      targetGeometry: { battlePositionCenter: { x: 176, y: 40 } },
    });
    expect(opponent.battlerOffset).toEqual(player.battlerOffset);
    expect(opponent.sprites).toHaveLength(player.sprites.length);
    expect(opponent.sprites.map((sprite, index) => ({
      x: sprite.x - player.sprites[index]!.x,
      y: sprite.y - player.sprites[index]!.y,
    }))).toEqual(player.sprites.map(() => ({ x: 104, y: -48 })));
  });
});
