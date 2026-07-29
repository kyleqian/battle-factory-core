import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  NEEDLE_ARM_FRAME_COUNT,
  needleArmAtAge,
} from "../../src/animation/needleArm.ts";

describe("MOVE_NEEDLE_ARM source reducer", () => {
  it("ports the twelve inward and eight outward GREEN_SPIKE lifecycles", () => {
    const center = { x: 176, y: 42 };
    expect(needleArmAtAge(10, center).spikes[0]).toEqual({
      wave: "inward", spawnIndex: 0, oamSlot: 3,
      x: 176, y: 12, matrix: { a: 0, b: 256, c: -256, d: 0 },
      remaining: 15,
    });
    expect(needleArmAtAge(14, center).spikes.at(-1)).toMatchObject({
      wave: "inward", spawnIndex: 1, oamSlot: 4,
      x: 196, y: 21, matrix: { a: -181, b: 181, c: -181, d: -181 },
    });
    expect(needleArmAtAge(72, center).spikes).toHaveLength(8);
    expect(needleArmAtAge(71, center).spikes).toHaveLength(7);
    expect(needleArmAtAge(71, center).spikes[0]).toMatchObject({
      wave: "outward", oamSlot: 5, x: 176, y: 42, remaining: 10,
    });
    expect(needleArmAtAge(72, center).spikes[0]).toMatchObject({
      wave: "outward", oamSlot: 5, x: 176, y: 39, remaining: 9,
      matrix: { a: 0, b: -256, c: 256, d: 0 },
    });
    expect(needleArmAtAge(81, center).spikes).toHaveLength(8);
    expect(needleArmAtAge(82, center).spikes).toHaveLength(0);
  });

  it("ports loads, impact helpers, target shake, and cleanup", () => {
    const center = { x: 72, y: 88 };
    expect(needleArmAtAge(1, center)).toMatchObject({
      greenSpikeLoaded: true, impactLoaded: false, handsAndFeetLoaded: false,
    });
    expect(needleArmAtAge(71, center)).toMatchObject({
      targetOffset: { x2: 4, y2: 0 },
      hitsplatVisible: true, fistVisible: true,
    });
    expect(needleArmAtAge(106, center)).toMatchObject({
      active: true, targetOffset: { x2: 0, y2: 0 },
    });
    expect(needleArmAtAge(107, center)).toMatchObject({
      active: false, greenSpikeLoaded: false,
      impactLoaded: false, handsAndFeetLoaded: false,
    });
    expect(NEEDLE_ARM_FRAME_COUNT).toBe(108);
  });

  it("pins the carrier and the Factory-only Secret Power sibling verdict", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/needleArmSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain(
      "set 125/FRONTIER_MON_CACNEA -> SPECIES_CACNEA 344/move 302",
    );
    expect(output).toContain(
      "Factory Secret Power dispatches to Strength, not Needle Arm",
    );
  });
});
