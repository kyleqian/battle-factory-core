import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_LOW_KICK bounded Scene-ON source evidence checkpoint", () => {
  it("derives the two legal carriers and lowest Machoke set from source", () => {
    expect(execFileSync("npx", ["tsx", "tools/compare/lowKickSourceAudit.ts"], {
      encoding: "utf8",
    })).toContain("set 178/FRONTIER_MON_MACHOKE_1 is the lowest legal");
  });

  it("stages full legal Scene-ON parties in both orientations", () => {
    for (const path of [
      "tools/battle-lab/mechanic-low-kick-player-machoke-opponent-onix.json",
      "tools/battle-lab/mechanic-low-kick-opponent-machoke-player-onix.json",
    ]) {
      const scenario = JSON.parse(readFileSync(path, "utf8"));
      expect(scenario).toMatchObject({ profile: "battle-scene-on", challengeNum: 1 });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      const machoke = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]
        .find((mon) => mon.species === 67);
      expect(machoke).toMatchObject({
        nature: 3, evs: { hp: 255, spDefense: 255 }, moves: [67, 67, 67, 67], item: 196,
      });
    }
  });

  it("pins the complete 33-frame dual-orientation source receipts without exact credit", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_LOW_KICK"))
      .toMatchObject({ status: "partial" });
    for (const [path, evidence, raw] of [
      ["tools/compare/fixtures/low-kick-player-machoke-opponent-onix.json", "f3b4b291ee90208d9f9dcf7e2ea91a355c6da0e270289e6a083cdae126782a74", "40639ddccc47ad2f867891ce5daa4d6a5769ff22b85352095bac14ba5cc9d9e5"],
      ["tools/compare/fixtures/low-kick-opponent-machoke-player-onix.json", "7264ca8cdc9335c80e375354c674322eb857f1c2a7d0ea253fe2e73cefd14e0a", "4d657cf51c4c28805b20ed868890418aaf2ab03c7074ccce9757ea63bef75e20"],
    ]) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect(fixture.sourceWindow).toMatchObject({ frameCount: 33, startFrame: 214, endFrame: 246 });
      expect(fixture.evidenceSha256).toBe(evidence);
      expect(fixture.rawRgbSha256).toBe(raw);
    }
  });
});
