import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createScratchDir } from "../../tools/lib/scratch.ts";

describe("MOVE_SPIDER_WEB source-derived assets", () => {
  it("re-extracts ANIM_TAG_SPIDER_WEB and ANIM_TAG_WEB_THREAD from pinned source", () => {
    const output = join(createScratchDir("pokebench-spider-web-assets-"), "spider-web.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      "tools/compare/extractSpiderWebAssets.ts", "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync("src/animation/assets/spider-web.json"));
    const asset = JSON.parse(readFileSync(output, "utf8"));
    expect(asset).toMatchObject({
      source: {
        spiderWeb: expect.stringContaining("ANIM_TAG_SPIDER_WEB"),
        webThread: expect.stringContaining("ANIM_TAG_WEB_THREAD"),
      },
      spiderWeb: { tileset: { columns: expect.any(Number), rows: expect.any(Number), tiles: expect.any(Array) }, palette: expect.any(Array) },
      webThread: { tileset: { columns: expect.any(Number), rows: expect.any(Number), tiles: expect.any(Array) }, palette: expect.any(Array) },
    });
    expect(asset.spiderWeb.palette).toHaveLength(16);
    expect(asset.webThread.palette).toHaveLength(16);
  });
});
