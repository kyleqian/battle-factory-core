import { describe, expect, it } from "vitest";
import {
  FLAMETHROWER_FLAME_COUNT,
  FLAMETHROWER_FLAME_LIFETIME,
  flamethrowerBattlerEffectAtAge,
  flamethrowerDisplayedBattlerOffsetsAtAge,
  flamethrowerFlamesAtAge,
} from "../src/engine/flamethrower.ts";

describe("source-relative Flamethrower presentation", () => {
  const playerGeometry = {
    attackerCenter: { x: 72, y: 88 },
    targetCenter: { x: 176, y: 51 },
    attackerSide: "player" as const,
    flameSubpriority: 27,
    flameSpriteSlots: [3, 4, 5, 7, 9, 10, 11, 12],
    spriteOrderSeed: [3, 10, 9, 7, 5, 4, 12, 11],
  };

  it("runs 22 four-tick-staggered 29-state sine-wave projectiles", () => {
    expect(FLAMETHROWER_FLAME_COUNT).toBe(22);
    expect(FLAMETHROWER_FLAME_LIFETIME).toBe(29);
    expect(flamethrowerFlamesAtAge(0, playerGeometry)).toEqual([
      {
        spawnIndex: 0,
        age: 0,
        centerX: 88,
        centerY: 97,
        sheetFrame: 1,
        subpriority: 27,
        slot: 3,
      },
    ]);
    expect(flamethrowerFlamesAtAge(4, playerGeometry)).toHaveLength(2);
    expect(flamethrowerFlamesAtAge(113, playerGeometry)).toEqual([]);
  });

  it("mirrors the source-relative launch and sine program by attacker side", () => {
    expect(flamethrowerFlamesAtAge(0, {
      attackerCenter: { x: 176, y: 42 },
      targetCenter: { x: 72, y: 97 },
      attackerSide: "opponent",
      flameSubpriority: 37,
      flameSpriteSlots: [3, 4, 5, 7, 9, 10, 11, 12],
      spriteOrderSeed: [3, 4, 5, 12, 11, 10, 9, 7],
    })).toEqual([
      {
        spawnIndex: 0,
        age: 0,
        centerX: 160,
        centerY: 57,
        sheetFrame: 1,
        subpriority: 37,
        slot: 3,
      },
    ]);
  });

  it("matches probed persistent slot order through ties and destroyed-slot reuse", () => {
    expect(
      flamethrowerFlamesAtAge(46, playerGeometry).map((flame) => flame.slot),
    ).toEqual([10, 11, 12, 3, 4, 5, 7]);
    expect(
      flamethrowerFlamesAtAge(73, playerGeometry).map((flame) => flame.slot),
    ).toEqual([9, 10, 11, 12, 3, 4, 5]);

    const opponentGeometry = {
      attackerCenter: { x: 176, y: 42 },
      targetCenter: { x: 72, y: 97 },
      attackerSide: "opponent" as const,
      flameSubpriority: 37,
      flameSpriteSlots: [3, 4, 5, 7, 9, 10, 11, 12],
      spriteOrderSeed: [3, 4, 5, 12, 11, 10, 9, 7],
    };
    expect(
      flamethrowerFlamesAtAge(28, opponentGeometry).map((flame) => flame.slot),
    ).toEqual([12, 11, 10, 9, 5, 7, 4, 3]);
  });

  it("keeps RAM task state distinct from its OAM display epoch", () => {
    expect(flamethrowerBattlerEffectAtAge(-11).targetOnMonBg).toBe(true);
    expect(flamethrowerBattlerEffectAtAge(-8).alpha).toEqual({ eva: 12, evb: 8 });
    expect(flamethrowerBattlerEffectAtAge(114)).toEqual({
      attackerY2: 0,
      targetX2: 0,
      targetOnMonBg: false,
      alpha: null,
    });
    expect(flamethrowerDisplayedBattlerOffsetsAtAge(-7).attackerY2).toBe(2);
    expect(flamethrowerDisplayedBattlerOffsetsAtAge(-5).attackerY2).toBe(0);
    expect(flamethrowerDisplayedBattlerOffsetsAtAge(27).targetX2).toBe(3);
  });
});
