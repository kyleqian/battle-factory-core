import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const audit = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/waterSpoutSourceAudit.ts"], { encoding: "utf8" }));
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];

describe("MOVE_WATER_SPOUT source and legal-staging checkpoint", () => {
  it("pins the complete root, exact generated graph, lowest carrier, callbacks, and unsupported boundary", () => {
    const result = audit();
    expect(result).toMatchObject({
      move: "MOVE_WATER_SPOUT", moveId: 323,
      sourceBounds: { start: "0x082cef63", endExclusive: "0x082cef91", bytes: "0x2e" },
      sourceText: { bytes: 449, commandRows: 14 },
      carrier: { firstLevel50: "set 275 FRONTIER_MON_WAILMER_2 / SPECIES_WAILMER / MOVE_WATER_SPOUT", remainingLevel50: [275] },
      checkpoint: { coverageEntry: "absent/unsupported", track: "water-spout-launch-rain", fulfilled: false },
    });
    expect(result.components).toEqual([
      "asset:ANIM_TAG_GLOWY_BLUE_ORB", "asset:ANIM_TAG_WATER_IMPACT",
      "task:AnimTask_WaterSpoutLaunch", "task:AnimTask_WaterSpoutRain",
      "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:setalpha",
    ]);
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-water-spout-player-wailmer-opponent-shuckle.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-water-spout-opponent-wailmer-player-shuckle.json", false],
  ])("keeps the %s stage complete, legal-shaped, transient-free, and choice-constrained", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(path, "utf8"));
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, seed: 305419897 });
    expect(stage.trace.captureFrames).toEqual([0, 634]);
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    const attacker = playerAttacker ? stage.overrides.parties.player : stage.overrides.parties.opponent;
    const target = playerAttacker ? stage.overrides.parties.opponent : stage.overrides.parties.player;
    expect(attacker).toHaveLength(3); expect(target).toHaveLength(3);
    for (const mon of [...attacker, ...target]) {
      expect(Object.keys(mon).sort()).toEqual(completeKeys);
      expect(Object.keys(mon.ivs).sort()).toEqual(statKeys); expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
      expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4);
      for (const transient of ["hp", "status", "stages", "statStages", "weather", "outcome", "volatile"]) expect(mon).not.toHaveProperty(transient);
    }
    expect(attacker[0]).toMatchObject({ species: 320, level: 50, nature: 6, moves: [323, 323, 323, 323], item: 142 });
    expect(target[0]).toMatchObject({ species: 213, level: 50, moves: [33, 33, 33, 33] });
  });
});
