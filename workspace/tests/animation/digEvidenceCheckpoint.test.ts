import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const normalTrace = [
  { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
  { frames: 2, buttons: ["A"] }, { frames: 500, buttons: [] },
  { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
  { frames: 2, buttons: ["A"] }, { frames: 1400, buttons: [] },
];

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

function verifier(): Json {
  return JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/digEvidence.ts"], {
    cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024,
  })) as Json;
}

describe("MOVE_DIG legal bilateral dense evidence checkpoint", () => {
  it.each([
    ["player-back", "tools/battle-lab/mechanic-dig-player-vibrava-opponent-chansey.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-dig-opponent-vibrava-player-chansey.json", false],
  ])("keeps the %s stage complete, party-only, legal, and transient-free", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    const validated = validateStage(path);
    expect(validated.error).toBeUndefined();
    expect(validated.status).toBe(0);
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 0, battleNum: 0 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.trace.segments).toEqual(normalTrace);
    const attacker = playerAttacker ? stage.overrides.parties.player[0] : stage.overrides.parties.opponent[0];
    const target = playerAttacker ? stage.overrides.parties.opponent[0] : stage.overrides.parties.player[0];
    expect(attacker).toMatchObject({ species: 333, level: 50, nature: 24, moves: [91, 91, 91, 91], item: 133 });
    expect(target).toMatchObject({ species: 113, level: 50, moves: [45, 45, 45, 45] });
    const attackerSetIds = playerAttacker ? stage.playerSetIds : stage.opponentSetIds;
    expect(attackerSetIds[0]).toBe(132);
    for (const party of [stage.overrides.parties.player, stage.overrides.parties.opponent]) {
      expect(party).toHaveLength(3);
      expect(new Set(party.map((mon: Json) => mon.species)).size).toBe(3);
      expect(new Set(party.map((mon: Json) => mon.item)).size).toBe(3);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual(completeKeys);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(Object.keys(mon.ivs).sort()).toEqual(["attack", "defense", "hp", "spAttack", "spDefense", "speed"]);
        expect(Object.keys(mon.evs).sort()).toEqual(["attack", "defense", "hp", "spAttack", "spDefense", "speed"]);
        for (const transient of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(transient);
      }
    }
  });

  it("retains the pre-promotion evidence receipt and current independent exact boundary", () => {
    const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/dig-evidence.json"), "utf8")) as Json;
    expect(fixture).toMatchObject({
      schema: "dig-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_DIG", moveId: 91,
      status: "unsupported-evidence", coverageCredit: false,
      evidenceScope: {
        legalPartyBeforeInit: true, sourceProvenLevel50Carrier: "FRONTIER_MON_VIBRAVA set-132",
        completeTwoTurnBodies: true, fullDenseRowsRetained: true, rawRgbRetained: true,
        normalizedChangeMaps: true, twiceFreshByteIdentical: true, productionAnimationChanged: false,
        gameplayStateOwned: false, coveragePromotion: false, componentTrackFulfilled: false,
        boundaryOrBarrierChanged: false, latchLedgerChanged: false,
      },
      acceptance: { freshRunsPerOrientation: 2, setupRows: 195, unleashRows: 68, totalRowsPerOrientation: 263, firstInactiveCleanupRetained: true },
    });
    expect(fixture.source.range).toEqual({ start: 0x082ccca1, endExclusive: 0x082ccdbd });
    for (const side of ["player-back", "opponent-front"] as const) {
      const receipt = fixture.orientations[side];
      expect(receipt.bodyWindows.map((window: Json) => window.frameCount)).toEqual([195, 68]);
      expect(receipt.denseRows).toBe(263);
      expect(receipt.repeatProbeJsonSha256).toBe(receipt.probeJsonSha256);
      expect(receipt.repeatRawRgbSequenceSha256).toBe(receipt.rawRgbSequenceSha256);
      expect(readFileSync(resolve(root, receipt.denseState)).length).toBeGreaterThan(1000);
      expect(readFileSync(resolve(root, receipt.rawRgbArchive)).length).toBeGreaterThan(1000);
      expect(readFileSync(resolve(root, receipt.changeMap)).length).toBeGreaterThan(1000);
      const { setup, unleash } = receipt.summary;
      expect(setup).toMatchObject({
        frameCount: 195, cleanup: { active: false, visualTaskCount: 0, soundTaskCount: 0, ownedSprites: 0, ownedTasks: 0 },
        latches: { oam: { preceding: "194/194", other: [] }, matrices: { preceding: "194/194", other: [] }, palette: { preceding: "193/194", other: [] } },
        scanline: { stateTransitions: [10, 167, 168] },
        state: { partiesStable: true, battlersStable: true, engineStable: true, immutableStable: true, rawBattleStateStable: true, gameplayRngTransitions: [] },
      });
      expect(unleash).toMatchObject({
        frameCount: 68, cleanup: { active: false, visualTaskCount: 0, soundTaskCount: 0, ownedSprites: 0, ownedTasks: 0 },
        latches: { oam: { preceding: "67/67", other: [] }, matrices: { preceding: "67/67", other: [] }, palette: { preceding: "67/67", other: [] } },
        scanline: { stateTransitions: [14, 27, 28] },
        state: { partiesStable: true, battlersStable: true, engineStable: true, immutableStable: true, rawBattleStateStable: true, gameplayRngTransitions: [] },
      });
      expect(setup.lifecycle.sprites.filter((item: Json) => item.sprite.template === "gDirtPlumeSpriteTemplate")).toHaveLength(20);
      expect(unleash.lifecycle.sprites.filter((item: Json) => item.sprite.template === "gBasicHitSplatSpriteTemplate")).toHaveLength(1);
    }
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_DIG")).toMatchObject({ status: "exact" });
    expect(coverage.queue).not.toContain("MOVE_DIG");
    expect(coverage.componentTracks.find((track: Json) => track.id === "dirt-plume-fissure-dig")).toMatchObject({
      representatives: ["MOVE_FISSURE", "MOVE_DIG"],
      fulfilled: true,
    });
  });

  it("strictly reconstructs the maps and fixture without an oracle or emulator", () => {
    const first = verifier();
    const second = verifier();
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      schema: "dig-bilateral-evidence/v1", move: "MOVE_DIG", status: "unsupported-evidence", coverageCredit: false,
      boundary: { moveLedgerEntry: false, trackFulfilled: false, barrierChanged: false, latchLedgerChanged: false },
    });
    expect(first.orientations["player-back"]).toMatchObject({ denseRows: 263, twiceFreshByteIdentical: true });
    expect(first.orientations["opponent-front"]).toMatchObject({ denseRows: 263, twiceFreshByteIdentical: true });
  });
});
