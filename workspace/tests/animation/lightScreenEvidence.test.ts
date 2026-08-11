import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_LIGHT_SCREEN exact evidence", () => {
  it("pins both dense source-body windows and receipts", () => {
    const fixtures = [
      JSON.parse(readFileSync(
        "tools/compare/fixtures/light-screen-player-exeggcute-opponent-onix.json",
        "utf8",
      )),
      JSON.parse(readFileSync(
        "tools/compare/fixtures/light-screen-opponent-exeggcute-player-onix.json",
        "utf8",
      )),
    ];
    expect(fixtures.map((fixture) => ({
      orientation: fixture.orientation,
      window: fixture.sourceWindow,
      evidence: fixture.evidenceSha256,
      raw: fixture.rawRgbSha256,
    }))).toEqual([
      {
        orientation: "player-back",
        window: {
          startFrame: 270, endFrame: 384, frameCount: 115, wallFrame: 310,
        },
        evidence:
          "7c1c3b39e53c00ee0174232a0c05a02ac7f14b6d2aa7478bc2ae372c5d2500a2",
        raw:
          "b135e9fbf2c70ea860f0ee126959bbb0eaf0c4603566067dd5405c9698a74837",
      },
      {
        orientation: "opponent-front",
        window: {
          startFrame: 176, endFrame: 294, frameCount: 119, wallFrame: 220,
        },
        evidence:
          "51ffe743621c2745f8a59cd6786bb5d0fa9b12b844ee452d2e7ca729587e20db",
        raw:
          "654a49bafe3470e81c34dfa1d127d67a78d59eb6d0b6af3c983d36008a8dbf6b",
      },
    ]);
  });

  it("pins source components and Mirror Coat's independent remainder", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/lightScreenSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(JSON.parse(output)).toMatchObject({
      carrier: expect.stringContaining("FRONTIER_MON_EXEGGCUTE"),
      components: expect.arrayContaining([
        "asset:ANIM_TAG_GREEN_LIGHT_WALL",
        "asset:ANIM_TAG_SPARKLE_3",
        "subroutine:SpecialScreenSparkle",
      ]),
      sibling: {
        move: "MOVE_MIRROR_COAT",
        lowestCarrier: expect.stringContaining("FRONTIER_MON_CORSOLA"),
      },
    });
  });

  it("regenerates carrier, wall, and sparkle assets byte-for-byte", () => {
    const scratch = mkdtempSync(
      join(tmpdir(), "pokebench-light-screen-assets-"),
    );
    const output = join(scratch, "light-screen.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractLightScreenAssets.ts",
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/light-screen.json"),
    );
  });

  it("keeps twice-fresh production-framebuffer acceptance portable", () => {
    const audit = readFileSync(
      "tools/compare/lightScreenEvidence.ts",
      "utf8",
    );
    expect(audit).toContain("framebufferMatches");
    expect(audit).toContain(
      "for (let runNumber = 1; runNumber <= 2; runNumber += 1)",
    );
  });
});
