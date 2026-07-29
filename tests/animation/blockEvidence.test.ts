import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_BLOCK exact evidence", () => {
  it("pins both complete dense windows", () => {
    const fixtures = [
      JSON.parse(readFileSync(
        "tools/compare/fixtures/block-player-sudowoodo-opponent-onix.json",
        "utf8",
      )),
      JSON.parse(readFileSync(
        "tools/compare/fixtures/block-opponent-sudowoodo-player-onix.json",
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
        window: { startFrame: 373, endFrame: 513, frameCount: 141 },
        evidence: "417c0585860b8396efa41bd2c3e5b2f3b1b90ac55dff7386928a3f6d727707f4",
        raw: "3837aa0b60c7a1f8decf1cae22947e27cd16935f39b562dc430e572ef8432b6c",
      },
      {
        orientation: "opponent-front",
        window: { startFrame: 290, endFrame: 435, frameCount: 146 },
        evidence: "e7b64ee034e9716237bf376395c329b2d859b66ec469761b4f80311fe982391c",
        raw: "2e66e6ac4aaeaac809890797273f68b37d8f62f107446b9067721695d3eac276",
      },
    ]);
  });

  it("pins carrier, components, and the independent sibling remainder", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/blockSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(JSON.parse(output)).toMatchObject({
      carrier:
        "set 193 FRONTIER_MON_SUDOWOODO_1 / SPECIES_SUDOWOODO / MOVE_BLOCK",
      components: ["asset:ANIM_TAG_X_SIGN", "sprite:gBlockXSpriteTemplate"],
      sibling: { move: "MOVE_ROCK_TOMB" },
    });
  });

  it("regenerates Sudowoodo and X_SIGN byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-block-assets-"));
    const output = join(scratch, "block.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractBlockAssets.ts", "--out", output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/block.json"),
    );
  });

  it("keeps the portable twice-fresh framebuffer receipt", () => {
    const audit = readFileSync("tools/compare/blockEvidence.ts", "utf8");
    expect(audit).toContain("framebufferMatched");
    expect(audit).toContain("for (let run = 1; run <= 2; run += 1)");
  });
});
