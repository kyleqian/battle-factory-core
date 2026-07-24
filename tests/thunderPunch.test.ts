import { describe, expect, it } from "vitest";
import lightningAsset from "../src/assets/gen/battle-anim-lightning.json" with { type: "json" };
import {
  THUNDER_PUNCH_LIGHTNING_DISPLAY_TICKS,
  THUNDER_PUNCH_LIGHTNING_FIRST_AGES,
  thunderPunchPaletteAtAge,
  thunderPunchTargetShakeY2,
  thunderPunchLightningAtAge,
} from "../src/engine/thunderPunch.ts";

describe("THUNDER_PUNCH source lightning component", () => {
  it("pins the extracted five-frame ANIM_TAG_LIGHTNING sheet", () => {
    expect(lightningAsset.tileset).toMatchObject({
      columns: 4,
      rows: 20,
    });
    expect(lightningAsset.tileset.tiles).toHaveLength(80);
    expect(lightningAsset.thunderPunch).toMatchObject({
      frames: [0, 1, 2, 3, 4],
      frameDurations: [5, 5, 8, 5, 5],
      offsetsY: [-48, -16, 16],
    });
  });

  it("replays the three source spawns and oracle-pinned displayed frames", () => {
    const center = { x: 176, y: 44 };
    expect(THUNDER_PUNCH_LIGHTNING_FIRST_AGES).toEqual([48, 51, 54]);
    expect(THUNDER_PUNCH_LIGHTNING_DISPLAY_TICKS).toBe(28);
    expect(thunderPunchLightningAtAge(47, center)).toEqual([]);
    expect(thunderPunchLightningAtAge(48, center)).toEqual([
      { sourceSlot: 0, centerX: 176, centerY: -4, frame: 0 },
    ]);
    expect(thunderPunchLightningAtAge(54, center)).toEqual([
      { sourceSlot: 0, centerX: 176, centerY: -4, frame: 1 },
      { sourceSlot: 1, centerX: 176, centerY: 28, frame: 0 },
      { sourceSlot: 2, centerX: 176, centerY: 60, frame: 0 },
    ]);
    expect(thunderPunchLightningAtAge(75, center).map((bolt) => bolt.frame))
      .toEqual([4, 4, 3]);
    expect(thunderPunchLightningAtAge(76, center).map((bolt) => bolt.sourceSlot))
      .toEqual([1, 2]);
    expect(thunderPunchLightningAtAge(82, center)).toEqual([]);
  });

  it("uses target-relative geometry for the opposite orientation", () => {
    expect(thunderPunchLightningAtAge(54, { x: 72, y: 88 })).toEqual([
      { sourceSlot: 0, centerX: 72, centerY: 40, frame: 1 },
      { sourceSlot: 1, centerX: 72, centerY: 72, frame: 0 },
      { sourceSlot: 2, centerX: 72, centerY: 104, frame: 0 },
    ]);
  });

  it("pins the source-relative black ramp, inversions, restoration, and shake", () => {
    expect([0, 6, 10, 34, 45, 56, 57, 67, 71, 95].map((age) => ({
      age,
      ...thunderPunchPaletteAtAge(age),
    }))).toEqual([
      { age: 0, backgroundBlackCoeff: 0, inverted: false },
      { age: 6, backgroundBlackCoeff: 2, inverted: false },
      { age: 10, backgroundBlackCoeff: 4, inverted: false },
      { age: 34, backgroundBlackCoeff: 16, inverted: false },
      { age: 45, backgroundBlackCoeff: 16, inverted: true },
      { age: 56, backgroundBlackCoeff: 16, inverted: true },
      { age: 57, backgroundBlackCoeff: 16, inverted: false },
      { age: 67, backgroundBlackCoeff: 14, inverted: false },
      { age: 71, backgroundBlackCoeff: 12, inverted: false },
      { age: 95, backgroundBlackCoeff: 0, inverted: false },
    ]);
    expect([62, 63, 64, 65, 66, 91, 92, 93].map(thunderPunchTargetShakeY2))
      .toEqual([0, 3, 3, 0, 0, 0, 0, 0]);
  });
});
