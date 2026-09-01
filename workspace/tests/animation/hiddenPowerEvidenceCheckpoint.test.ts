import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyHiddenPowerEvidence } from "../../tools/compare/hiddenPowerEvidence.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

type Mon = Record<string, any> & { species: number; moves: number[] };

describe("MOVE_HIDDEN_POWER complete bilateral evidence checkpoint", () => {
  it("pins the complete half-open source interval and exactly six generated components", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/hiddenPowerSourceAudit.ts",
    ], { encoding: "utf8" })) as Record<string, any>;
    expect(audit).toMatchObject({
      move: "MOVE_HIDDEN_POWER", moveId: 237,
      sourceBounds: {
        start: "0x082ca7bc", endExclusive: "0x082ca8a5", byteLength: 233,
        sha256: "68b6a189a36cacd319614b20e5b265c08b4308f4e1063b94aaf2a3812aa0b76d",
        pointerContract: "half-open-byte-interval",
      },
      graph: { blocks: ["Move_HIDDEN_POWER"] },
      carrier: {
        frontierMon: "FRONTIER_MON_UNOWN", setId: 126, speciesId: 201,
        itemId: 221, nature: "NATURE_HARDY", factorySelectable: false,
      },
      templates: ["gHiddenPowerOrbSpriteTemplate", "gHiddenPowerOrbScatterSpriteTemplate"],
      tasks: ["AnimTask_ScaleMonAndRestore", "AnimTask_BlendMonInAndOut"],
      audio: ["SE_M_TAKE_DOWN", "SE_M_REVERSAL", "SE_M_REFLECT"],
    });
    expect(audit.graph.components).toEqual([
      "asset:ANIM_TAG_RED_ORB",
      "sprite:gHiddenPowerOrbScatterSpriteTemplate",
      "sprite:gHiddenPowerOrbSpriteTemplate",
      "task:AnimTask_BlendMonInAndOut",
      "task:AnimTask_ScaleMonAndRestore",
      "visualCommand:setarg",
    ]);
  });

  it("replays all 360 dense state/raw-RGB rows and independently pins every move-owned latch", () => {
    const verified = verifyHiddenPowerEvidence();
    const common = {
      sourceRows: 180,
      rawRgbRows: 180,
      latches: { oam: "179/179 RAM+1", palette: "179/179 RAM+1", scaleMon: "70/70 RAM+2" },
      orbit: "6 slots 3,4,5,7,9,10 ages 64..118; removal displayed RAM+1",
      blend: "ages 58..177; coefficient 0..12..1; palette displayed RAM+1",
      resources: "ANIM_TAG_RED_ORB ages 1..178; clear at inactive age 179",
      audio: "TAKE_DOWN@4, REVERSAL@64, REFLECT@118",
      gameplayRngTransitions: 0,
      animationRngTransitions: 178,
    };
    expect(verified["player-back"]).toEqual({
      sourceWindow: { startFrame: 77, endFrame: 256, frameCount: 180, sourceFrameCount: 180 },
      ...common,
      scatter: "8 born age 118; all removed age 141; ordinary RAM+1 OAM",
    });
    expect(verified["opponent-front"]).toEqual({
      sourceWindow: { startFrame: 81, endFrame: 260, frameCount: 180, sourceFrameCount: 180 },
      ...common,
      scatter: "8 born age 118; all removed age 143; ordinary RAM+1 OAM",
    });
  });

  it("stages complete transient-free parties while recording the Unown Factory exclusion", () => {
    for (const path of [
      "tools/battle-lab/mechanic-hidden-power-player-unown-opponent-onix.json",
      "tools/battle-lab/mechanic-hidden-power-opponent-unown-player-onix.json",
    ]) {
      const scenario = JSON.parse(readFileSync(path, "utf8")) as Record<string, any>;
      expect(scenario).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      const parties = scenario.overrides.parties as { player: Mon[]; opponent: Mon[] };
      const carrier = [...parties.player, ...parties.opponent].find((mon) => mon.species === 201)!;
      expect(carrier).toMatchObject({
        species: 201, level: 50, nature: 0, moves: [237, 237, 237, 237], ppUps: [0, 0, 0, 0],
        item: 221, abilitySlot: 0, friendship: 70, gender: "genderless", shiny: false,
      });
      for (const party of [parties.player, parties.opponent]) {
        expect(party).toHaveLength(3);
        expect(new Set(party.map((mon) => mon.species)).size).toBe(3);
        for (const mon of party) {
          expect(Object.keys(mon.ivs)).toHaveLength(6);
          expect(Object.keys(mon.evs)).toHaveLength(6);
          expect(Object.values(mon.evs as Record<string, number>).reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(510);
          for (const key of ["hp", "status", "statStages", "volatile", "weather", "sideConditions", "outcome"])
            expect(mon).not.toHaveProperty(key);
        }
      }
    }
  });

  it("re-extracts RED_ORB art and keeps move, track, and named controls honest", () => {
    const output = join(createScratchDir("pokebench-hidden-power-assets-"), "red-orb.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractHiddenPowerAssets.ts", "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync("src/animation/assets/hidden-power-red-orb.json"));
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as Record<string, any>;
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact")).toHaveLength(221);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_HIDDEN_POWER")).toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) => track.id === "hidden-power-red-orbs")).toMatchObject({
      representatives: ["MOVE_HIDDEN_POWER"], fulfilled: true,
    });
    for (const move of ["MOVE_SUPER_FANG", "MOVE_RECYCLE", "MOVE_LEER", "MOVE_CONFUSION"])
      expect(coverage.entries.find((entry: { move: string }) => entry.move === move)).toMatchObject({ status: "exact" });
  });
});
