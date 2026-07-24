import { describe, expect, it } from "vitest";
import lightningAsset from "../src/assets/gen/battle-anim-lightning.json" with { type: "json" };
import {
  THUNDER_PUNCH_LIGHTNING_DISPLAY_TICKS,
  THUNDER_PUNCH_LIGHTNING_FIRST_AGES,
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
    expect(THUNDER_PUNCH_LIGHTNING_FIRST_AGES).toEqual([6, 9, 12]);
    expect(THUNDER_PUNCH_LIGHTNING_DISPLAY_TICKS).toBe(28);
    expect(thunderPunchLightningAtAge(5, center)).toEqual([]);
    expect(thunderPunchLightningAtAge(6, center)).toEqual([
      { sourceSlot: 0, centerX: 176, centerY: -4, frame: 0 },
    ]);
    expect(thunderPunchLightningAtAge(12, center)).toEqual([
      { sourceSlot: 0, centerX: 176, centerY: -4, frame: 1 },
      { sourceSlot: 1, centerX: 176, centerY: 28, frame: 0 },
      { sourceSlot: 2, centerX: 176, centerY: 60, frame: 0 },
    ]);
    expect(thunderPunchLightningAtAge(33, center).map((bolt) => bolt.frame))
      .toEqual([4, 4, 3]);
    expect(thunderPunchLightningAtAge(34, center).map((bolt) => bolt.sourceSlot))
      .toEqual([1, 2]);
    expect(thunderPunchLightningAtAge(40, center)).toEqual([]);
  });

  it("uses target-relative geometry for the opposite orientation", () => {
    expect(thunderPunchLightningAtAge(12, { x: 72, y: 88 })).toEqual([
      { sourceSlot: 0, centerX: 72, centerY: 40, frame: 1 },
      { sourceSlot: 1, centerX: 72, centerY: 72, frame: 0 },
      { sourceSlot: 2, centerX: 72, centerY: 104, frame: 0 },
    ]);
  });
});
