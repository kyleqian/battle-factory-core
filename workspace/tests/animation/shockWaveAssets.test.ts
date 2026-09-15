import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import asset from "../../src/animation/assets/shock-wave.json" with { type: "json" };
import { createScratchDir } from "../../tools/lib/scratch.ts";

const root = resolve(import.meta.dirname, "../..");

describe("MOVE_SHOCK_WAVE source-derived assets", () => {
  it("regenerates all four tagged resources from pinned source art", () => {
    expect(asset).toMatchObject({
      schema: "shock-wave-source-assets/v1",
      resources: {
        circleOfLight: { tagValue: 10212, tileBytes: 0x800 },
        electricOrbs: { tagValue: 10211, tileBytes: 0x80 },
        spark: { tagValue: 10001, tileBytes: 0x300 },
        lightning: { tagValue: 10037, tileBytes: 0xa00 },
      },
      art: {
        circleOfLight: { tileset: { columns: 8, rows: 8 } },
        electricOrbs: { tileset: { columns: 1, rows: 4 } },
        spark: { tileset: { columns: 1, rows: 24 } },
        lightning: { tileset: { columns: 4, rows: 20 } },
      },
    });
    const scratch = createScratchDir("pokebench-shock-wave-assets-");
    const output = join(scratch, "shock-wave.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      resolve(root, "tools/compare/extractShockWaveAssets.ts"), "--out", output],
    { cwd: root });
    expect(readFileSync(output)).toEqual(
      readFileSync(resolve(root, "src/animation/assets/shock-wave.json")),
    );
  });
});
