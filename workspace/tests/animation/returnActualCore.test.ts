import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Verdict = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const run = (): Verdict => JSON.parse(execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/returnActualCore.ts", "--require-exact",
], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));

describe("MOVE_RETURN complete live-core presentation", () => {
  it("matches all 1,190 branch/orientation rows in two independent actual-core processes", () => {
    const first = run(), second = run();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "return-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_RETURN",
      rows: 1190,
      componentMatched: 1190,
      seamMatched: 1190,
      rawRgbMatched: 1190,
      framebufferMatched: 1190,
      residualPixels: 0,
      alteredLiveControl: {
        species: ["CROBAT", "BLISSEY"], sidesAndGeometryChanged: true,
        paletteAndAnimationRngChanged: true,
        gameplayStateOpaqueAndUnchanged: true, gameplayRngOpaqueAndUnchanged: true,
      },
    });
    expect(first.windows).toHaveLength(8);
    expect(first.windows.every((window: Verdict) => window.framebufferMatched === window.rows
      && window.residualPixels === 0 && window.failures.length === 0)).toBe(true);
    expect(first.alteredLiveControl.changed).not.toBe(first.alteredLiveControl.canonical);
    expect(first.digest).toBe("86407f1ff6a46e69ed15eb2c41a7f2bbc43de3062b4df998869d19e5078f4659");
  }, 30_000);
});
