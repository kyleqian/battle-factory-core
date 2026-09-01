import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyGrudgeEvidence } from "../../tools/compare/grudgeEvidence.ts";
import { createScratchDir } from "../../tools/lib/scratch.ts";

type Mon = Record<string, unknown> & { species: number; moves: number[] };

describe("MOVE_GRUDGE complete bilateral exact evidence", () => {
  it("pins the complete source interval, graph, task, asset, audio, and lowest Level-50 carrier", () => {
    const audit = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/grudgeSourceAudit.ts",
    ], { encoding: "utf8" })) as Record<string, any>;
    expect(audit).toMatchObject({
      move: "MOVE_GRUDGE", moveId: 288,
      sourceBounds: { start: "0x082ce466", endExclusive: "0x082ce48e", byteLength: 40, sha256: "222dda812d624b75879ca36ea709c7530ce83e604a14d08d6e508476a6f26270" },
      graph: { blocks: ["Move_GRUDGE"] },
      carrier: { frontierMon: "FRONTIER_MON_HAUNTER_1", setId: 179, speciesId: 93, itemId: 140, nature: "NATURE_RASH" },
      template: "gGrudgeFlameSpriteTemplate",
      callbacks: ["AnimTask_GrudgeFlames", "AnimTask_GrudgeFlames_Step", "AnimGrudgeFlame", "DestroySprite"],
      audio: { opening: { sound: "SE_M_PSYBEAM", id: 189 }, loop: { sound: "SE_M_EMBER", id: 151, delay: 16, count: 4 }, closing: { sound: "SE_M_NIGHTMARE", id: 121 } },
    });
    expect(audit.graph.components).toEqual([
      "asset:ANIM_TAG_PURPLE_FLAME", "task:AnimTask_GrudgeFlames",
      "visualCommand:clearmonbg", "visualCommand:fadetobg", "visualCommand:monbg",
      "visualCommand:restorebg", "visualCommand:splitbgprio_all", "visualCommand:waitbgfadein",
    ]);
  });

  it("replays all 418 dense state/RGB rows and pins move-owned latches through cleanup", () => {
    const verified = verifyGrudgeEvidence();
    expect(verified["player-back"]).toEqual({
      sourceWindow: { startFrame: 66, endFrame: 274, frameCount: 209 },
      sourceRows: 209, rawRgbRows: 209,
      lifecycle: { creates: 6, createAge: 46, destroyAge: 132 },
      taskStages: "1:46-72,2:73-103,3:104-130,4:131,5:132",
      latches: { oam: "208/208", matrices: "208/208", palette: "207/208 + same-row age 4 monbg" },
      resources: "ANIM_TAG_PURPLE_FLAME ages 1..207; clear at 208",
      audio: "PSYBEAM@7, EMBER loop@46, NIGHTMARE@140",
      gameplayRngTransitions: 0, animationRngTransitions: 205,
    });
    expect(verified["opponent-front"]).toEqual({
      ...verified["player-back"],
      sourceWindow: { startFrame: 70, endFrame: 278, frameCount: 209 },
    });
  });

  it("stages complete legal three-mon parties without transient state injection", () => {
    for (const path of [
      "tools/battle-lab/mechanic-grudge-player-haunter-opponent-onix.json",
      "tools/battle-lab/mechanic-grudge-opponent-haunter-player-onix.json",
    ]) {
      const scenario = JSON.parse(readFileSync(path, "utf8")) as Record<string, any>;
      expect(scenario).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      const parties = scenario.overrides.parties as { player: Mon[]; opponent: Mon[] };
      const carrier = [...parties.player, ...parties.opponent].find((mon) => mon.species === 93)!;
      expect(carrier).toMatchObject({ species: 93, level: 50, nature: 19, moves: [288, 288, 288, 288], item: 140, abilitySlot: 0, friendship: 70, shiny: false });
      for (const party of [parties.player, parties.opponent]) {
        expect(party).toHaveLength(3);
        expect(new Set(party.map((mon) => mon.species)).size).toBe(3);
        for (const mon of party) {
          expect(Object.keys(mon.ivs as Record<string, number>)).toHaveLength(6);
          expect(Object.keys(mon.evs as Record<string, number>)).toHaveLength(6);
          for (const key of ["hp", "status", "statStages", "volatile", "weather", "outcome"]) expect(mon).not.toHaveProperty(key);
        }
      }
    }
  });

  it("re-extracts purple-flame source art byte-for-byte and records exact coverage", () => {
    const out = join(createScratchDir("pokebench-grudge-assets-"), "purple-flame.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractPurpleFlameAssets.ts", "--out", out]);
    expect(readFileSync(out)).toEqual(readFileSync("src/animation/assets/purple-flame.json"));
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as Record<string, any>;
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact")).toHaveLength(220);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_GRUDGE")).toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) => track.id === "grudge-purple-flames")).toMatchObject({
      representatives: ["MOVE_GRUDGE"], fulfilled: true,
    });
  });
});
