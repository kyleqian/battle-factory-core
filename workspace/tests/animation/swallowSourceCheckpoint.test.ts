import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_SWALLOW bounded source checkpoint", () => {
  it("pins the exclusive ROM interval, carrier, branches, tasks, audio, tags, and cleanup", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/swallowSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("0x082d4b2e..0x082d4bda (0xac bytes");
    expect(output).toContain("set 213 FRONTIER_MON_PELIPPER_1 is the lowest Level-50 carrier");
    expect(output).toContain("animTurn/stockpile 1,2,3 selects 5,10,15 BLUE_ORB sprites");
    expect(output).toContain("source body owns no GPU registers");
  });

  it("re-extracts Pelipper, exact Reversal BLUE_ORB, and shared BLUE_STAR assets", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-swallow-assets-"));
    const output = join(scratch, "swallow.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/extractSwallowAssets.ts",
      "--out", output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/swallow.json"),
    );
    const swallow = JSON.parse(readFileSync(output, "utf8"));
    const reversal = JSON.parse(readFileSync("src/animation/assets/reversal.json", "utf8"));
    const synthesis = JSON.parse(readFileSync("src/animation/assets/synthesis.json", "utf8"));
    expect(swallow.blueOrb).toEqual(reversal.blueOrb);
    expect(swallow.blueStar).toEqual(synthesis.blueStar);
    expect(swallow.source.blueOrb).toContain("source-identical to Reversal");
    expect(swallow.source.blueStar).toContain("source-identical HealingEffect");
  });

  it("keeps Swallow unsupported pending all three dense bilateral live windows", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status?: string }) => entry.status === "exact"))
      .toHaveLength(177);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_SWALLOW"))
      .toBeUndefined();
    const track = coverage.componentTracks.find(
      (entry: { id: string }) => entry.id === "blue-orb-reversal-evidence",
    );
    expect(track.representatives).toContain("MOVE_SWALLOW");
    expect(track.goal).toContain("MOVE_SWALLOW remains independently unsupported");
  });

  it("pins a twice-repeated natural one-Stockpile Scene-ON checkpoint", () => {
    const scenario = JSON.parse(readFileSync(
      "tools/battle-lab/mechanic-swallow-player-pelipper-one-stockpile.json",
      "utf8",
    ));
    expect(scenario.profile).toBe("battle-scene-on");
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    expect(scenario.overrides.parties.player[0].moves).toEqual([254, 256, 254, 256]);
    expect(scenario.trace.segments).toEqual(expect.arrayContaining([
      { frames: 2, buttons: ["RIGHT"] },
    ]));

    const receipt = JSON.parse(readFileSync(
      "tools/compare/fixtures/swallow-player-pelipper-one-stockpile-checkpoint.json",
      "utf8",
    ));
    expect(receipt).toMatchObject({
      schema: "swallow-natural-checkpoint/v1",
      oracleProfile: "battle-scene-on",
      setup: {
        customPartiesBuiltBeforeBattle: true,
        playerLeadSetId: 213,
      },
      sourceWindow: {
        startFrame: 1247,
        endFrame: 1409,
        frameCount: 163,
        rgbSequenceSha256: "1723b6d66528faf51a26facde57ab0e96ce7a564804f26da828428e29d5f95b8",
      },
      branch: { stockpiles: 1, animTurn: 1, orbWaves: 1 },
      lifecycleCounts: { blueOrb: 5, blueStar: 4, deform: 1, shake: 2 },
      audio: ["se_m_absorb_2", "se_m_spit_up", "se_m_take_down"],
      cleanup: { active: 0, visualTaskCount: 0, soundTaskCount: 0 },
    });
    expect(receipt.topology.templates).toEqual(expect.arrayContaining([
      "gHealingBlueStarSpriteTemplate",
      "gSwallowBlueOrbSpriteTemplate",
    ]));
    expect(receipt.tagPresence.blueOrb.absentAfterCleanup).toBe(true);
    expect(receipt.tagPresence.blueStar.absentAfterCleanup).toBe(true);
    expect(receipt.registerValues).toMatchObject({
      bldcnt: [0], bldalpha: [0], bldy: [0], mosaic: [0],
    });
  });
});
