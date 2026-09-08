import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { uproarActualCoreVerdict } from "../../tools/compare/uproarActualCore.ts";
import uproarAsset from "../../src/animation/assets/uproar.json" with { type: "json" };

const root = resolve(import.meta.dirname, "../..");

describe("MOVE_UPROAR source-relative Scene-ON presentation", () => {
  it("matches every bilateral component/seam and actual-core framebuffer row", () => {
    const first = uproarActualCoreVerdict();
    const second = uproarActualCoreVerdict();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "uproar-actual-core-verdict/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_UPROAR",
      rows: 146,
      componentMatched: 146,
      framebufferMatched: 146,
      residualPixels: 0,
      orientations: [
        { orientation: "player-back", rows: 73, componentMatched: 73, framebufferMatched: 73, residualPixels: 0, failures: [] },
        { orientation: "opponent-front", rows: 73, componentMatched: 73, framebufferMatched: 73, residualPixels: 0, failures: [] },
      ],
      alteredLiveControl: { species: ["TORKOAL", "SURSKIT"], geometryChanged: true, allocationOrderChanged: true },
    });
    expect(first.alteredLiveControl.canonical).not.toBe(first.alteredLiveControl.changed);
  });

  it("re-extracts both source assets byte-identically", () => {
    const scratch = execFileSync("mktemp", ["-d"], { encoding: "utf8" }).trim();
    const output = resolve(scratch, "uproar.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractUproarAssets.ts", "--out", output], { cwd: root });
    expect(JSON.parse(readFileSync(output, "utf8"))).toEqual(uproarAsset);
  });
});
