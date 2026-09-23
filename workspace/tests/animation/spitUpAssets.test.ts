import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/spit-up-red-orb.json" with { type: "json" };
import { createScratchDir } from "../../tools/lib/scratch.ts";

const root = resolve(import.meta.dirname, "../..");
describe("MOVE_SPIT_UP RED_ORB_2 source asset", () => {
  it("pins the shared gray tiles, independent red palette, template, and registry", () => {
    expect(asset).toMatchObject({ schema: "spit-up-red-orb-source-asset/v1",
      resource: { tag: "ANIM_TAG_RED_ORB_2", tagValue: 10237, tileBytes: 96 },
      template: { symbol: "gSpitUpOrbSpriteTemplate", shape: "8x8", affine: "double",
        objMode: "normal", callback: "AnimSpitUpOrb / AnimSpitUpOrb_Step" },
      art: { tileset: { columns: 1, rows: 3 } } });
    expect(asset.art.tileset.tiles).toHaveLength(3);
    expect(asset.art.palette).toHaveLength(16);
  });

  it("regenerates byte-for-byte twice from pinned source", () => {
    const scratch = createScratchDir("pokebench-spit-up-assets-");
    const first = join(scratch, "first.json"); const second = join(scratch, "second.json");
    for (const output of [first, second]) execFileSync(process.execPath,
      ["--experimental-strip-types", "tools/compare/extractSpitUpAssets.ts", "--out", output],
      { cwd: root, stdio: "pipe" });
    expect(readFileSync(first, "utf8")).toBe(readFileSync(
      resolve(root, "src/animation/assets/spit-up-red-orb.json"), "utf8"));
    expect(readFileSync(second, "utf8")).toBe(readFileSync(first, "utf8"));
  });
});
