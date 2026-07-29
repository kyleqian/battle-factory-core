import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_AROMATHERAPY FLOWER checkpoint", () => {
  it("pins the legal carrier, source body, and Petal Dance distinction", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/aromatherapySourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("set 394/FRONTIER_MON_VILEPLUME_1");
    expect(output).toContain("7 small + 2 big");
  });

  it("regenerates every source sprite and scrolling mask byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "pokebench-aromatherapy-assets-"));
    const output = join(directory, "aromatherapy.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/extractAromatherapyAssets.ts", "--out", output,
    ]);
    expect(readFileSync(output)).toEqual(readFileSync("src/animation/assets/aromatherapy.json"));
  });

  it("pins portable complete legal Scene-ON receipts in both orientations", () => {
    for (const path of [
      "tools/compare/fixtures/aromatherapy-player-vileplume-opponent-onix.json",
      "tools/compare/fixtures/aromatherapy-opponent-vileplume-player-onix.json",
    ]) {
      const receipt = JSON.parse(readFileSync(path, "utf8"));
      const scenario = JSON.parse(readFileSync(receipt.scenario, "utf8"));
      expect(receipt.schema).toBe("scene-on-portable-evidence/v1");
      expect(receipt.evidenceSchema).toBe("aromatherapy-dense-evidence/v2");
      expect(receipt.appStage).toEqual({
        oracleFrame: receipt.denseWindow.startFrame,
        presentationAge: 0,
      });
      expect(receipt.attacker.species).toBe("VILEPLUME");
      expect(receipt.target.species).toBe("ONIX");
      expect(receipt.denseWindow.frameCount).toBe(
        receipt.denseWindow.endFrame - receipt.denseWindow.startFrame + 1,
      );
      expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(receipt.lifecycleCounts).toEqual({
        gAromatherapySmallFlowerSpriteTemplate: 7,
        gAromatherapyBigFlowerSpriteTemplate: 2,
        gSparklingStarsSpriteTemplate: 2,
        gBlendThinRingExpandingSpriteTemplate: 1,
      });
      expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50, challengeNum: 3 });
      for (const party of Object.values(scenario.overrides.parties) as any[][]) {
        expect(party).toHaveLength(3);
        expect(new Set(party.map((mon) => mon.item)).size).toBe(3);
        for (const mon of party) {
          expect(mon.moves).toHaveLength(4);
          expect(mon.ivs).toEqual({ hp: 31, attack: 31, defense: 31, speed: mon.ivs.speed, spAttack: 31, spDefense: 31 });
          expect(mon.friendship).toBe(0);
        }
      }
    }
  });
});
