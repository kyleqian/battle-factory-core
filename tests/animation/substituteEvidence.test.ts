import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import player from "../../tools/compare/fixtures/substitute-player-golem-opponent-onix.json" with { type: "json" };
import opponent from "../../tools/compare/fixtures/substitute-opponent-golem-player-onix.json" with { type: "json" };
import asset from "../../src/animation/assets/substitute.json" with { type: "json" };
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };

describe("MOVE_SUBSTITUTE bilateral dense checkpoint", () => {
  it("pins complete twice-fresh source windows without claiming pixel support", () => {
    expect(player).toMatchObject({
      oracleProfile: "battle-scene-on", moveId: 164,
      sourceWindow: { startFrame: 291, endFrame: 377, frameCount: 87 },
      acceptance: { status: "unsupported", componentEvidence: 87,
        productionReducer: true, typedSeam: true, relevantHardwareEvidence: 87,
        productionCompositor: false, framebufferMatching: 0 },
    });
    expect(opponent).toMatchObject({
      oracleProfile: "battle-scene-on", moveId: 164,
      sourceWindow: { startFrame: 311, endFrame: 397, frameCount: 87 },
      acceptance: { status: "unsupported", componentEvidence: 87,
        productionReducer: true, typedSeam: true, relevantHardwareEvidence: 87,
        productionCompositor: false, framebufferMatching: 0 },
    });
    for (const fixture of [player, opponent]) {
      expect(fixture.sourceBounds).toEqual({
        start: "0x082d5807", endExclusive: "0x082d5813",
      });
      expect(fixture.freshRuns).toBe(2);
      expect(fixture.freshProbeAndRgbEquality).toBe(true);
      expect(createHash("sha256").update(readFileSync(fixture.changeMap)).digest("hex"))
        .toBe(fixture.changeMapSha256);
      expect(fixture.probeJsonSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("pins set 498, internal species 76, and the complete isolated source body", () => {
    expect(frontierMons.entries.find(({ index }) => index === 498)).toMatchObject({
      index: 498,
      label: "FRONTIER_MON_GOLEM_2",
      species: "SPECIES_GOLEM",
      moves: ["MOVE_FOCUS_PUNCH", "MOVE_SUBSTITUTE", "MOVE_DOUBLE_TEAM", "MOVE_REST"],
      itemName: "BATTLE_FRONTIER_ITEM_CHESTO_BERRY",
      nature: "NATURE_ADAMANT",
    });
    const constants = readFileSync("reference/pokeemerald/include/constants/species.h", "utf8");
    expect(constants).toContain("#define SPECIES_GOLEM 76");
    const scripts = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const body = scripts.slice(scripts.indexOf("Move_SUBSTITUTE:"), scripts.indexOf("Move_FRENZY_PLANT:"));
    expect(body.trim().split("\n")).toEqual([
      "Move_SUBSTITUTE:",
      "\tplaysewithpan SE_M_ATTRACT, SOUND_PAN_ATTACKER",
      "\tcreatevisualtask AnimTask_MonToSubstitute, 2",
      "\tend",
    ]);
    const task = readFileSync("reference/pokeemerald/src/battle_anim_effects_3.c", "utf8");
    for (const name of ["AnimTask_MonToSubstitute", "AnimTask_MonToSubstituteDoll", "LoadBattleMonGfxAndAnimate"]) {
      expect(task).toContain(name);
    }
  });

  it("pins and regenerates only the source-required doll sheets and palette", () => {
    expect(asset).toMatchObject({
      source: { front: expect.stringContaining("gSubstituteDollFrontGfx"), back: expect.stringContaining("gSubstituteDollBackGfx"), palette: expect.stringContaining("gSubstituteDollPal") },
      front: { columns: 8, rows: 8 }, back: { columns: 8, rows: 8 },
      contract: { dimensions: "64x64", tileBytes: 0x0800, battlerPaletteBank: true },
    });
    expect(asset.palette).toHaveLength(16);
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-substitute-assets-"));
    const output = join(scratch, "substitute.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve("tools/compare/extractSubstituteAssets.ts"),
      "--out", output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync(resolve("src/animation/assets/substitute.json")),
    );
  });
});
