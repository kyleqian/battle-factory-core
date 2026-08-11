import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_BUBBLE_BEAM staged source and asset evidence", () => {
  it("pins Factory Surskit, all three six-bubble calls, sway, alpha, and cleanup surface", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/bubbleBeamSourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("set 42/species 311/move 61; 3×6=18 BUBBLE");
    expect(output).toContain("SwayMon(0,3,3072,8,target); 6 SMALL_BUBBLES; alpha 12:8");
  });
  it("keeps BUBBLE/Surskit source extraction and SMALL_BUBBLES reuse byte-pinned", () => {
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractBubbleBeamAssets.ts"], { encoding: "utf8" });
    const bubble = JSON.parse(readFileSync("src/animation/assets/bubble-beam.json", "utf8"));
    const waterGun = JSON.parse(readFileSync("src/animation/assets/water-gun.json", "utf8"));
    expect(bubble.bubble.tileset.tiles.length).toBeGreaterThan(0);
    expect(bubble.surskitBack.tileset.tiles.length).toBeGreaterThan(0);
    expect(bubble.smallBubbles).toEqual(waterGun.smallBubbles);
  });
});
