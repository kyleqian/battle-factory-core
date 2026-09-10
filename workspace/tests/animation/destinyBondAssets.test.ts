import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/destiny-bond.json" with { type: "json" };

describe("MOVE_DESTINY_BOND source presentation assets", () => {
  it("pins the WHITE_SHADOW tag, source art, and reused Ghost background", () => {
    expect(asset.source).toMatchObject({
      script: expect.stringContaining("Move_DESTINY_BOND"),
      whiteShadow: expect.stringContaining("ANIM_TAG_WHITE_SHADOW"),
      ghostBackground: expect.stringContaining("BG_GHOST"),
    });
    expect(asset.whiteShadow).toMatchObject({
      tag: 10188,
      tileBytes: 1024,
      dimensions: { width: 64, height: 32 },
      tileset: { columns: 8, rows: 4 },
    });
    expect(asset.whiteShadow.tileset.tiles).toHaveLength(32);
    expect(asset.whiteShadow.palette).toHaveLength(16);
    expect(asset.ghostBackground).toMatchObject({
      path: "src/assets/gen/battle-anim-ghost-bg.json",
      sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it("regenerates byte-for-byte from the pinned source checkout", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-destiny-bond-assets-"));
    const output = join(scratch, "destiny-bond.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve("tools/compare/extractDestinyBondAssets.ts"),
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync(resolve("src/animation/assets/destiny-bond.json")),
    );
  });
});
