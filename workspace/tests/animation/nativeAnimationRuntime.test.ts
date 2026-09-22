import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  compositeNativeAnimationObjects,
  nativeAnimationObjRasters,
} from "../../src/animation/nativeAnimationRenderer.ts";
import type { NativeSpriteSeed } from "../../src/animation/nativeAnimationRuntime.ts";
import {
  verifyNativeCases,
  type NativeCase,
} from "../../tools/animation/runtime-spike/verify-native.ts";

const root = "tools/animation/runtime-spike/";
const capture = JSON.parse(gunzipSync(
  readFileSync(`${root}native-observations.json.gz`),
).toString()) as { cases: NativeCase[] };

describe("native animation runtime", () => {
  it.each(capture.cases)("executes complete retained script: $fixture", (testcase) => {
    const report = verifyNativeCases([testcase])[0]!;
    expect(report.mismatchCounts).toEqual({});
    expect(report.examples).toEqual([]);
    expect(report.sourceRows).toBe(report.rows);
    expect(report.particleRows).toBe(report.rows);
    expect(report.resourceRows).toBe(report.rows);
    expect(report.softwareRows).toBe(report.rows);
    expect(report.hardwareRows).toBe(report.rows);
    expect(report.complete).toBe(true);
    expect(report.peakParticles).toBe(testcase.move === "MUD_SPORT" ? 7 : 0);
    expect(report.particleBirths).toBe(testcase.move === "MUD_SPORT" ? 16 : 0);
    expect(report.delayedSoundTaskBirths).toBe(testcase.move === "MUD_SPORT" ? 10 : 0);
    expect(report.emittedSounds).toBe(testcase.move === "MUD_SPORT" ? 13 : 3);
    expect(report.distinctCommandsExecuted).toBe(testcase.move === "MUD_SPORT" ? 45 : 5);
  });

  it("treats all post-initial observations as assertions", () => {
    const testcase = structuredClone(capture.cases.find((item) => item.move === "MUD_SPORT")!);
    const particle = testcase.frames[100]!.nativeSprites
      .find((sprite) => sprite.template === "gMudsportMudSpriteTemplate")!;
    particle.data[1]! += 7;
    expect(verifyNativeCases([testcase])[0]!.mismatchCounts.particles).toBe(1);
  });

  it("adapts MUD_SAND tiles to the shared OBJ compositor", () => {
    const sprite: NativeSpriteSeed = {
      slot: 3, inUse: true, template: "gMudsportMudSpriteTemplate",
      callback: "AnimMudSportDirtFalling", attr: [20, 30, 1 | 2 << 10],
      x: 0, y: 0, x2: 0, y2: 0, centerToCornerX: -8, centerToCornerY: -8,
      animNum: 0, animCmdIndex: 0, animDelayCounter: 0, animPaused: false,
      affineAnimPaused: false, animLoopCounter: 0, data: Array(8).fill(0),
      coordOffsetEnabled: false, flags3To7: 0, invisible: false, hFlip: false, vFlip: false,
      animBeginning: true, affineAnimBeginning: true,
      animEnded: false, affineAnimEnded: false, usingSheet: true,
      anchored: false,
      sheetTileStart: 0, subspriteMode: 0, subpriority: 28,
    };
    const rasters = nativeAnimationObjRasters([sprite]);
    expect(rasters).toHaveLength(1);
    expect(rasters[0]).toMatchObject({ x: 30, y: 20, width: 16, height: 16, priority: 2 });
    expect(rasters[0]!.pixels).toHaveLength(256);
    expect(rasters[0]!.pixels.filter(Boolean).length).toBeGreaterThan(0);
    const composite = compositeNativeAnimationObjects([sprite]);
    expect(composite.normalPixels.filter(Boolean).length).toBe(
      rasters[0]!.pixels.filter(Boolean).length,
    );
    expect(nativeAnimationObjRasters([{ ...sprite, invisible: true }])).toEqual([]);
  });
});
