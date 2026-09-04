import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { semanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";

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
      "if (configured === undefined) return 2;",
    );
    expect(audit).toContain(
      "for (let runNumber = 1; runNumber <= evidenceRunCount(); runNumber += 1)",
    );
  });

  it("normalizes only the asserted-empty BattleLab transport receipt", () => {
    const fresh = {
      schema: "special-screen-test",
      setup: {
        preCheckpointCaptures: [],
        name: "\u00e9",
        nested: { value: 1 },
      },
      rows: [0, true, "line\n"],
    };
    const semantic = "{\"schema\": \"special-screen-test\", \"setup\": {\"name\": \"\\u00e9\", \"nested\": {\"value\": 1}}, \"rows\": [0, true, \"line\\n\"]}\n";
    expect(semanticReceiptSha256(fresh)).toBe(
      createHash("sha256").update(semantic).digest("hex"),
    );
    expect(() => semanticReceiptSha256({
      ...fresh,
      setup: { ...fresh.setup, preCheckpointCaptures: [1] },
    })).toThrow("setup.preCheckpointCaptures must be []");
  });

  it("fulfills only the independently receipted special-screen track", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: { move: string }) =>
      entry.move === "MOVE_LIGHT_SCREEN")).toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: { move: string }) =>
      entry.move === "MOVE_MIRROR_COAT")).toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "sparkle-3-special-screen")).toMatchObject({
      representatives: ["MOVE_LIGHT_SCREEN", "MOVE_MIRROR_COAT"],
      fulfilled: true,
    });
  });
});
