import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

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
    "import json, sys",
    "sys.path.insert(0, sys.argv[1])",
    "from battle_lab import validate_request",
    "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')",
  ].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
}

const stages = [
  ["player-back", "tools/battle-lab/mechanic-water-pulse-player-lombre-opponent-onix.json", "player", "opponent", 305420352] as const,
  ["opponent-front", "tools/battle-lab/mechanic-water-pulse-opponent-lombre-player-onix.json", "opponent", "player", 305420353] as const,
];

describe("MOVE_WATER_PULSE legal Scene-ON source-staging checkpoint", () => {
  it.each(stages)("validates the %s complete legal, party-only stage with only the active Lombre constrained to Water Pulse", (_orientation, path, attackerSide, targetSide, seed) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    const validated = validateStage(path);
    expect(validated.status).toBe(0);
    expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 0, battleNum: 0, trainerId: 50, seed });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.overrides).not.toHaveProperty("battlers");
    expect(stage.trace).toEqual({ segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 900, buttons: [] }] });
    expect(stage.trace).not.toHaveProperty("captureFrames");
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      expect(party).toHaveLength(3);
      expect(new Set(party.map((mon) => mon.species)).size).toBe(3);
      expect(new Set(party.map((mon) => mon.item).filter(Boolean)).size).toBe(2);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual([...completeKeys].sort());
        expect(Object.keys(mon.ivs).sort()).toEqual([...statKeys].sort());
        expect(Object.keys(mon.evs).sort()).toEqual([...statKeys].sort());
        expect(mon.level).toBe(50); expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4);
        for (const transient of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(transient);
      }
    }
    expect(stage.overrides.parties[attackerSide][0]).toMatchObject({ species: 296, level: 50, moves: [352, 352, 352, 352], ppUps: [0, 0, 0, 0] });
    expect(stage.overrides.parties[targetSide][0]).toMatchObject({ species: 95, level: 50, moves: [157, 20, 225, 201] });
    expect(stage.overrides.parties[attackerSide].slice(1).map((mon: Json) => mon.moves)).toEqual([[7, 108, 109, 123], [75, 92, 219, 113]]);
    expect(stage.overrides.parties[targetSide].slice(1).map((mon: Json) => mon.moves)).toEqual([[210, 283, 280, 104], [185, 19, 259, 269]]);
  });

  it("pins twice-fresh compact bilateral source-root/endpoint receipts without claiming timing, RGB, dense state, or latch credit", () => {
    const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/water-pulse-staging-receipt.json"), "utf8")) as Json;
    expect(receipt).toMatchObject({
      schema: "water-pulse-compact-staging-receipt/v1", oracleProfile: "battle-scene-on", move: "MOVE_WATER_PULSE", moveId: 352,
      status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      source: { auditRunSha256: "9e33953c5ee1804a3b12eb96598c60372c964c0e6bff2997e87688c8ff67dffb", pointerOwnedRoot: { start: "0x082d6c7a", endExclusive: "0x082d6d6f" } },
      scope: { framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false, latchMeasured: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, coveragePromotion: false, componentTrackFulfilled: false, transientOverrides: [], battleStateInjected: false, entryHooksSkipped: false, noTimingOrLatchTransfer: true },
    });
    expect(receipt.source.probeSha256).toBe(sha(readFileSync(resolve(root, receipt.source.probe))));
    for (const [orientation, expected] of Object.entries({
      "player-back": { attackerSide: "player", targetSide: "opponent", attackerBattler: 0, targetBattler: 1, outputSha256: "8037637ddce64efff3f9e87f93e3d21e59ef7d8950466a11995de8657573bcb2" },
      "opponent-front": { attackerSide: "opponent", targetSide: "player", attackerBattler: 1, targetBattler: 0, outputSha256: "d22627aff2392f2d3528893c4b590bae6467dcc91ff0c22b3de8122906bff6ac" },
    })) {
      const run = receipt.runs[orientation];
      expect(run).toMatchObject({
        freshRuns: 2, outputsByteIdentical: true, outputSha256: expected.outputSha256, sourceInitialized: true, customPartiesBuiltBeforeBattle: true,
        attacker: { side: expected.attackerSide, partyIndex: 0, species: 296, level: 50, moves: [352, 352, 352, 352], frontierCarrier: { setId: 131, name: "FRONTIER_MON_LOMBRE" } },
        target: { side: expected.targetSide, partyIndex: 0, species: 95, initialHp: 142, finalHp: 0 },
        root: { symbol: "Move_WATER_PULSE", start: "0x82d6c7a", endExclusive: "0x82d6d6f", observations: 159, attackerBattler: expected.attackerBattler, targetBattler: expected.targetBattler },
        pp: { before: [20, 20, 20, 20], after: [19, 20, 20, 20], spent: 1 }, benches: { partyIndices: [1, 2], unchanged: true, checksumValid: true }, transientFreeSetup: true,
      });
      expect(run.scenarioSha256).toBe(sha(readFileSync(resolve(root, run.scenario))));
    }
  });

  it("keeps the source/staging receipt immutable while current coverage is exact", () => {
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries).toHaveLength(255);
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_WATER_PULSE"))
      .toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: Json) => track.id === "water-gun-small-bubbles-water-impact"))
      .toMatchObject({ fulfilled: true, representatives: expect.arrayContaining(["MOVE_WATER_PULSE"]) });
  });
});
