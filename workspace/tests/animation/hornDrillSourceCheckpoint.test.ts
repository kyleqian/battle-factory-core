import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const audit = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/hornDrillSourceAudit.ts"], { encoding: "utf8" }));
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const root = resolve(import.meta.dirname, "../..");
function oracleDirectory(): string {
  let candidate = root;
  while (true) {
    const oracle = resolve(candidate, "oracle");
    if (existsSync(resolve(oracle, "battle_lab.py"))) return oracle;
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error("could not locate pinned battle_lab.py");
    candidate = parent;
  }
}
function validateStage(path: string) {
  return spawnSync("python3", ["-c", [
    "import json, sys", "sys.path.insert(0, sys.argv[1])", "from battle_lab import validate_request",
    "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')",
  ].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
}

describe("MOVE_HORN_DRILL source/classification checkpoint", () => {
  it("pins the complete ROM interval, graph, dispatched visuals/resources/audio, and lowest carrier", () => {
    const result = audit();
    expect(result).toMatchObject({
      move: "MOVE_HORN_DRILL", moveId: 32,
      sourceBounds: {
        start: "0x82cc804", endExclusive: "0x82cc981", byteLength: 381,
        romSha256: "00717aca816d14907377ca6a8e90409e8c285d34dd99e34e4e66ebab7d9c0def",
        sourceByteLength: 2717,
        sourceSha256: "34e06340eda319bf1daf9f3ab3ff6a741fc0053957d3836b773f8d5cf79afd84",
      },
      graph: { blocks: ["Move_HORN_DRILL", "HornDrillInContest", "HornDrillContinue"] },
      carrier: { lowestLevel50Set: 333, frontierMon: "FRONTIER_MON_SEAKING_2", speciesId: 119, itemId: 183, nature: "NATURE_IMPISH", allLevel50Sets: [333, 414, 499, 584, 595, 606, 691, 822, 823] },
      dispatch: { bowSprites: 3, hornSprites: 1, flashingImpacts: 11, attackerShake: [2, 0, 40, 1], targetShake: [10, 0, 40, 1], drillBg: ["BG_DRILL", "BG_DRILL_CONTESTS"], scroll: [-2304, 768, 1, -1] },
      audio: { headbutt: 1, bang: 1, hornAttackTargetPanned: 11 }, status: "exact",
    });
    expect(result.graph.components).toHaveLength(16);
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-horn-drill-player-seaking-opponent-onix.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-horn-drill-opponent-seaking-player-onix.json", false],
  ])("keeps the %s party stage complete, transient-free, and legally choice-constrained", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(path, "utf8"));
    const validated = validateStage(path);
    expect(validated.error).toBeUndefined(); expect(validated.status).toBe(0);
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    const attacker = playerAttacker ? stage.overrides.parties.player : stage.overrides.parties.opponent;
    const target = playerAttacker ? stage.overrides.parties.opponent : stage.overrides.parties.player;
    expect(attacker).toHaveLength(3); expect(target).toHaveLength(3);
    for (const mon of [...attacker, ...target]) {
      expect(Object.keys(mon).sort()).toEqual(completeKeys);
      for (const transient of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(transient);
    }
    expect(attacker[0]).toMatchObject({ species: 119, level: 50, moves: [32, 32, 32, 32], item: 183 });
    expect(target[0]).toMatchObject({ species: 95, level: 50, moves: [33, 33, 33, 33] });
  });
});
