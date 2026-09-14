import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/signal-beam.json" with { type: "json" };

describe("MOVE_SIGNAL_BEAM source-derived paired orb assets", () => {
  it("pins the shared 8x8 tiles and independent red/green palettes", () => {
    expect(asset).toMatchObject({
      schema: "signal-beam-source-assets/v1",
      resources: {
        red: { tag: "ANIM_TAG_GLOWY_RED_ORB", tagValue: 10264, tileBytes: 32 },
        green: { tag: "ANIM_TAG_GLOWY_GREEN_ORB", tagValue: 10265, tileBytes: 32 },
      },
      templates: {
        red: { symbol: "gSignalBeamRedOrbSpriteTemplate", shape: "8x8", affine: false, objMode: "objnormal" },
        green: { symbol: "gSignalBeamGreenOrbSpriteTemplate", shape: "8x8", affine: false, objMode: "objnormal" },
      },
      art: { tileset: { columns: 1, rows: 1 } },
    });
    expect(asset.art.redPalette).not.toEqual(asset.art.greenPalette);
  });

  it("regenerates byte-for-byte from the pinned source checkout", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-signal-beam-assets-"));
    const output = join(scratch, "signal-beam.json");
    execFileSync(process.execPath, ["--experimental-strip-types", resolve("tools/compare/extractSignalBeamAssets.ts"), "--out", output]);
    expect(readFileSync(output, "utf8")).toBe(JSON.stringify(asset, null, 2) + "\n");
  });
});
