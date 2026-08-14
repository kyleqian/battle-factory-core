import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const scenarios = [
  "tools/battle-lab/mechanic-memento-player-weezing-opponent-onix.json",
  "tools/battle-lab/mechanic-memento-opponent-weezing-player-onix.json",
];

describe("MOVE_MEMENTO source/staging checkpoint", () => {
  it("pins its exclusive interval, complete graph, sole carrier, and distinct Dig sibling", () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/mementoSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(result.sourceBounds).toEqual({ start: "0x082cdcf2", endExclusive: "0x082cdd36", bytes: "0x44" });
    expect(result.scriptCommands).toEqual([
      "setalpha 0, 16", "delay 1", "createvisualtask AnimTask_InitMementoShadow, 2", "delay 1",
      "createvisualtask AnimTask_MoveAttackerMementoShadow, 5", "playsewithpan SE_M_PSYBEAM, SOUND_PAN_ATTACKER",
      "delay 48", "playsewithpan SE_M_PSYBEAM2, SOUND_PAN_ATTACKER", "waitforvisualfinish",
      "createvisualtask AnimTask_MementoHandleBg, 2", "delay 12", "setalpha 0, 16", "delay 1",
      "monbg_static ANIM_TARGET", "createvisualtask AnimTask_MoveTargetMementoShadow, 5",
      "playsewithpan SE_M_PSYBEAM, SOUND_PAN_TARGET", "waitforvisualfinish", "clearmonbg_static ANIM_TARGET",
      "delay 1", "blendoff", "delay 1", "end",
    ]);
    expect(result.sourceComponentRom).toMatchObject({
      moveScript: { bytes: 68, sha256: "d90fcaf2474361779389de2555ba8706baa3e98400e6a2ca197f990813c7b806" },
      attackerInit: { bytes: 436, sha256: "58196e990ee79c4f019d40a7788502248b594836390daa3f5ad19a51d22b5f02" },
      attackerStep: { bytes: 280, sha256: "9b837f75855627970bad1b99971f26727a30b5912f2612e996c47683ff1ed4a9" },
      targetInit: { bytes: 592, sha256: "03bca87f5f7e551a483bd175e9cef79d2413ee8c3541da9698f1dfe675d7ec3d" },
      targetStep: { bytes: 380, sha256: "9b00c9137f4342e3d90c9ce06960f9003726b34015f769941104f4043866d314" },
      scanlineReducer: { bytes: 304, sha256: "756a5493abdba842ece2aca0a5b37484ed74c4dd4dd1ce460710e3351c5d6bed" },
      initShadow: { bytes: 176, sha256: "ed9bc69ac4b8eeaae8a0002cc5b93334487e33bcfad20f7ce2ad7b363f739492" },
      handleBg: { bytes: 76, sha256: "4f7b93f5d2ff326155a953d461d3bc75d5a2e26cc76761663cde16234acede30" },
      monbgStatic: { bytes: 196, sha256: "6fcb03243457da34f408415518bfc4313b975f6fd02a5e56b1034b708a267092" },
      clearmonbgStatic: { bytes: 212, sha256: "2a883ace1b59ae33872a3ce364578cdd6f9cdc06a0a08f532ab74a258b97c5de" },
    });
    expect(result.carrier).toContain("set 501 FRONTIER_MON_WEEZING_2");
    expect(result.components).toHaveLength(8);
    expect(result.siblingAudit).toMatchObject({ move: "MOVE_DIG", components: 17, promoted: false });
    expect(result.siblingAudit.shared).toEqual(["visualCommand:clearmonbg_static", "visualCommand:monbg_static"]);
  });

  it("keeps complete legal bilateral Weezing/Onix Scene-ON parties", () => {
    for (const path of scenarios) {
      const stage = JSON.parse(readFileSync(path, "utf8"));
      expect(stage.profile).toBe("battle-scene-on");
      expect(stage.overrides.parties.player).toHaveLength(3);
      expect(stage.overrides.parties.opponent).toHaveLength(3);
      const all = [...stage.overrides.parties.player, ...stage.overrides.parties.opponent];
      expect(all.find((mon: { species: number }) => mon.species === 110)).toMatchObject({ nature: 3, moves: [262, 262, 262, 262], item: 142 });
      expect(all.find((mon: { species: number }) => mon.species === 95)).toBeTruthy();
      for (const mon of all) {
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
      }
    }
    const result = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/mementoSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(result.scenarioSha256).toEqual({
      "tools/battle-lab/mechanic-memento-player-weezing-opponent-onix.json": "46e863718477712ddff003f26419a8d72277fa14a2bd5dee365c2e224bb051c0",
      "tools/battle-lab/mechanic-memento-opponent-weezing-player-onix.json": "bf85f2697af73cdf2d56af0b6c6b9641f4f7d7f7614169d20dedda8be8000c1b",
    });
  });

  it("records an honest unsupported checkpoint with no inherited Dig acceptance", () => {
    const receipt = JSON.parse(readFileSync("tools/compare/fixtures/memento-source-staging-checkpoint.json", "utf8"));
    expect(receipt).toMatchObject({ schema: "memento-source-staging-checkpoint/v3", oracleProfile: "battle-scene-on", move: "MOVE_MEMENTO", status: "unsupported", components: 8, denseEvidence: true, productionFramebuffer: false });
    expect(receipt.bilateralScenarioSha256).toEqual([
      "46e863718477712ddff003f26419a8d72277fa14a2bd5dee365c2e224bb051c0",
      "bf85f2697af73cdf2d56af0b6c6b9641f4f7d7f7614169d20dedda8be8000c1b",
    ]);
    expect(receipt.sourceRom.scanlineReducer).toBe("756a5493abdba842ece2aca0a5b37484ed74c4dd4dd1ce460710e3351c5d6bed");
    expect(receipt.siblingAudit).toEqual({ move: "MOVE_DIG", components: 17, shared: ["visualCommand:clearmonbg_static", "visualCommand:monbg_static"], promoted: false });
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.some((entry: { move: string }) => entry.move === "MOVE_MEMENTO")).toBe(false);
    expect(coverage.entries.some((entry: { move: string }) => entry.move === "MOVE_DIG")).toBe(false);
  });

  it("retains the twice-fresh bilateral dense evidence and reducer without claiming a seam", () => {
    const sha256 = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
    const receipt = JSON.parse(readFileSync("tools/compare/fixtures/memento-dense-evidence.json", "utf8"));
    expect(receipt).toMatchObject({
      schema: "memento-dense-evidence/v1", status: "unsupported",
      acceptance: { sourceRows: 353, rawRgbRows: 353, freshRuns: 2, reducerRows: 353, seamRows: 0, framebufferRows: 0 },
      siblingAudit: { move: "MOVE_DIG", status: "unsupported", inherited: false },
      freshness: { coarseGate: "failed", pathScopedOracleBootstrapToolingDiff: [], materiallyFresh: true },
    });
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const config = receipt.orientations[orientation];
      const compressed = readFileSync(config.stateGzip);
      expect(sha256(compressed)).toBe(config.stateGzipSha256);
      expect(sha256(readFileSync(config.rawRgbArchive))).toBe(config.rawRgbArchiveSha256);
      expect(sha256(readFileSync(config.changeMap))).toBe(config.changeMapSha256);
      const probe = JSON.parse(gunzipSync(compressed).toString("utf8"));
      expect(probe.sourceWindow).toEqual(config.sourceWindow);
      expect(probe.frames).toHaveLength(config.sourceWindow.frameCount);
      expect(probe.frames[0]).toMatchObject({ scriptOffset: 0, scriptEven: true });
      expect(probe.frames.at(-1)).toMatchObject({ gAnimScriptActive: false });
      expect(probe.frames.every((row: { tasks: { raw: string; data: unknown[] }[]; scanlineBuffers: unknown[][]; parties: { player: unknown[]; opponent: unknown[] } }) =>
        row.tasks.every((task) => task.raw.length === 0x50 && task.data.length === 16)
          && row.scanlineBuffers.length === 2 && row.scanlineBuffers.every((buffer) => buffer.length === 320)
          && row.parties.player.length === 3 && row.parties.opponent.length === 3,
      )).toBe(true);
    }
  });
});
