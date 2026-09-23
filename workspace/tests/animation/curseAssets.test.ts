import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import committed from "../../src/animation/assets/curse.json";
import { createScratchDir } from "../../tools/lib/scratch.ts";
const root = resolve(import.meta.dirname, "../..");
describe("MOVE_CURSE source assets", () => {
  it("re-extracts the two template resources and falling-line mask byte-for-byte", () => {
    const output = join(createScratchDir("pokebench-curse-assets-"), "curse.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractCurseAssets.ts", "--out", output], { cwd: root });
    expect(JSON.parse(readFileSync(output, "utf8"))).toEqual(committed);
    expect(committed).toMatchObject({ schema: "curse-source-assets/v1",
      nail: { tag: 10199, tileBytes: 0x400, template: "gCurseNailSpriteTemplate",
        dimensions: { width: 32, height: 64 } },
      ghost: { tag: 10200, tileBytes: 0x200, template: "gCurseGhostSpriteTemplate",
        dimensions: { width: 32, height: 32 } },
      fallingLines: { dimensions: { width: 8, height: 24 } } });
  });
});
