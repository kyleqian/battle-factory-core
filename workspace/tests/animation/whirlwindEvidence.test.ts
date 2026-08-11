import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_WHIRLWIND source evidence", () => {
  it("pins both complete twice-fresh dense oracle receipts", () => {
    const fixtures = [
      JSON.parse(readFileSync(
        "tools/compare/fixtures/whirlwind-player-butterfree-opponent-onix.json",
        "utf8",
      )),
      JSON.parse(readFileSync(
        "tools/compare/fixtures/whirlwind-opponent-butterfree-player-onix.json",
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
        window: { startFrame: 222, endFrame: 304, frameCount: 83 },
        evidence: "173be41493206cf4b974d0bed0f799c9f6a13d727295421e4262f69f470fd5bc",
        raw: "12653c28b7dd04790d0f2a8fed53b01f672d7da58d0a226a2957ca786aefb59c",
      },
      {
        orientation: "opponent-front",
        window: { startFrame: 316, endFrame: 398, frameCount: 83 },
        evidence: "ebf51bc3ffe9f65bc28e5e6e53ca72a92a01c1aaa51a844eb4c80fd5475d014f",
        raw: "ec7f5084e7ba307ef23b567770f1271d48b3449140f9ef1bde357abc1c34d434",
      },
    ]);
  });

  it("keeps the portable audit on both complete fixtures", () => {
    const audit = readFileSync(
      "tools/compare/whirlwindEvidence.ts",
      "utf8",
    );
    expect(audit).toContain("whirlwind-portable-evidence/v2");
    expect(audit).toContain("framebufferDiff === 0");
    expect(audit).toContain("for (let run = 1; run <= 2; run += 1)");
  });

  it("pins the legal carrier, complete component body, and sibling remainder", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/whirlwindSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(JSON.parse(output)).toEqual({
      carrier:
        "set 153 FRONTIER_MON_BUTTERFREE / SPECIES_BUTTERFREE / MOVE_WHIRLWIND",
      whirlwindLines: 6,
      components: [
        "asset:ANIM_TAG_WHIRLWIND_LINES",
        "sprite:gWhirlwindLineSpriteTemplate",
        "task:AnimTask_ShakeMon2",
        "task:AnimTask_SlideOffScreen",
        "task:AnimTask_TranslateMonEllipticalRespectSide",
      ],
      sibling: {
        move: "MOVE_DRILL_PECK",
        remainder:
          "independent BowMon body, AnimTask_DrillPeckHitSplats, IMPACT sprites, looped sound, ShakeMon2, and dense acceptance",
      },
    });
  });

  it("regenerates Butterfree and WHIRLWIND_LINES byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-whirlwind-assets-"));
    const output = join(scratch, "whirlwind.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractWhirlwindAssets.ts",
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/whirlwind.json"),
    );
  });
});
