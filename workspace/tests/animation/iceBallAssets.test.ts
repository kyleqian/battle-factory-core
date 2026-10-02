import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");

describe("MOVE_ICE_BALL source assets", () => {
  it("extracts the complete five-frame ICE_CHUNK sheet byte-identically", () => {
    const before = readFileSync(resolve(root, "src/animation/assets/ice-ball.json"));
    execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractIceBallAssets.ts"], { cwd: root });
    expect(readFileSync(resolve(root, "src/animation/assets/ice-ball.json"))).toEqual(before);
    const asset = JSON.parse(before.toString());
    expect(asset).toMatchObject({ schema: "ice-ball-source-assets/v1",
      source: { tag: "ANIM_TAG_ICE_CHUNK", tileBytes: 0x0a00 },
      chunk: { frames: [0, 16, 32, 48, 64] } });
    expect(asset.chunk.tileset).toMatchObject({ columns: 4, rows: 20 });
    expect(asset.chunk.tileset.tiles).toHaveLength(80);
    expect(asset.chunk.palette).toHaveLength(16);
  });
});
