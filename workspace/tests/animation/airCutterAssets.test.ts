import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/air-cutter.json" with { type: "json" };

describe("MOVE_AIR_CUTTER source-derived reducer assets", () => {
  it("pins the source identity, resource banks, and non-affine templates", () => {
    expect(asset).toMatchObject({
      source: { script: expect.stringContaining("Move_AIR_CUTTER"), airWaveIdentity: expect.stringContaining("MOVE_SONIC_BOOM") },
      resources: {
        airWave: { tag: 10003, tileBytes: 256 },
        cut: { tag: 10138, tileBytes: 2048 },
        impact: { tag: 10135, tileBytes: 512 },
      },
      templates: {
        airWaveProjectile: { shape: "32x16", affine: false, objMode: "objblend" },
        airCutterSlice: { shape: "32x32", affine: false, objMode: "objblend" },
      },
    });
  });

  it("regenerates from the pinned source checkout", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-air-cutter-assets-"));
    const output = join(scratch, "air-cutter.json");
    execFileSync(process.execPath, ["--experimental-strip-types", resolve("tools/compare/extractAirCutterAssets.ts"), "--out", output]);
    expect(JSON.parse(readFileSync(output, "utf8"))).toEqual(asset);
  });
});
