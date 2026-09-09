import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const audit = () => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/solarBeamSourceAudit.ts"], { cwd: root, encoding: "utf8" }));
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
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

describe("MOVE_SOLAR_BEAM source and dense acceptance", () => {
  it("pins the two-turn ELF/ROM interval, all 28 generated IDs, carriers, and controls", () => {
    const result = audit();
    expect(result).toMatchObject({
      move: "MOVE_SOLAR_BEAM", moveId: 76, status: "exact",
      source: {
        elf: { start: "0x82d08d8", endExclusive: "0x82d0b2d" },
        romByteLength: 597,
        romSha256: "423f7f6832318d13d85460631eda2d3c5fb749526146f4729dc985d22e13fbf9",
        sourceByteLength: 3624,
        sourceSha256: "de9a8a0b660bf608ca8ff8c636b4ce5544501f43a2a726a7d8818075501ec331",
      },
      dispatch: { setupAbsorptionOrbs: 14, unleashBigOrbs: 21, unleashSmallOrbs: 15, shakeMon2: [2, 0, 65, 1], targetBackgrounds: [4, 5, 6] },
      controls: ["MOVE_HYPER_FANG", "MOVE_MEGA_PUNCH", "MOVE_MEGA_KICK", "MOVE_FOCUS_PUNCH"],
      ownership: { reducer: true, seam: true, compositor: true, framebuffer: true, gameplay: false },
    });
    expect(result.graph.componentIds).toHaveLength(28);
    expect(result.carrierCensus).toMatchObject({ count: 16, setIds: [272, 348, 360, 438, 445, 493, 532, 536, 590, 608, 611, 620, 682, 714, 729, 771] });
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-solar-beam-player-gloom-opponent-chansey.json", true],
    ["opponent-front", "tools/battle-lab/mechanic-solar-beam-opponent-gloom-player-chansey.json", false],
  ])("keeps the %s stage complete, party-only, and transient-free", (_side, path, playerAttacker) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8"));
    const validated = validateStage(path);
    expect(validated.error).toBeUndefined();
    expect(validated.status).toBe(0);
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 0, battleNum: 0 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.overrides.parties.player).toHaveLength(3);
    expect(stage.overrides.parties.opponent).toHaveLength(3);
    const attacker = playerAttacker ? stage.overrides.parties.player[0] : stage.overrides.parties.opponent[0];
    const target = playerAttacker ? stage.overrides.parties.opponent[0] : stage.overrides.parties.player[0];
    expect(attacker).toMatchObject({ species: 44, level: 50, moves: [76, 76, 76, 76] });
    expect(target).toMatchObject({ species: 113, level: 50, moves: [33, 33, 33, 33] });
    for (const party of [stage.overrides.parties.player, stage.overrides.parties.opponent]) {
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual(completeKeys);
        for (const transient of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(transient);
      }
    }
  });

  it("retains the original unsupported evidence checkpoint and both complete fresh-run bodies", () => {
    const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/solar-beam-evidence.json"), "utf8"));
    expect(fixture).toMatchObject({ schema: "solar-beam-bilateral-evidence/v1", move: "MOVE_SOLAR_BEAM", status: "unsupported-evidence", coverageCredit: false });
    expect(fixture.evidenceScope).toMatchObject({ fullDenseRowsRetained: true, normalizedMaps: true, twiceFreshByteIdentical: true, rawRgbRetained: true, productionAnimationChanged: false, actualCoreFramebufferAcceptance: false, alteredLiveGeometryControl: false });
    expect(fixture.acceptance).toMatchObject({ freshRunsPerOrientation: 2, setupRows: 108, unleashRows: 160, totalRows: 268, firstInactiveCleanupRetained: true });
    for (const side of ["player-back", "opponent-front"] as const) {
      const receipt = fixture.orientations[side];
      expect(receipt.sourceWindow.frameCount).toBe(268);
      expect(receipt.repeatProbeJsonSha256).toBe(receipt.probeJsonSha256);
      expect(receipt.repeatRawRgbSequenceSha256).toBe(receipt.rawRgbSequenceSha256);
      expect(readFileSync(resolve(root, receipt.denseState)).length).toBeGreaterThan(1000);
      expect(readFileSync(resolve(root, receipt.rawRgbArchive)).length).toBeGreaterThan(1000);
      expect(readFileSync(resolve(root, receipt.changeMap)).length).toBeGreaterThan(1000);
    }
  });

  it("verifies the retained component/resource/task/audio/register/OAM/matrix/state maps", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/solarBeamEvidence.ts"], { cwd: root, encoding: "utf8" });
    const result = JSON.parse(output);
    expect(result).toMatchObject({ schema: "solar-beam-bilateral-evidence/v1", status: "unsupported-evidence", coverageCredit: false, boundary: { moveLedgerEntry: true, trackFulfilled: true, barrierChanged: false } });
    for (const side of ["player-back", "opponent-front"] as const) {
      expect(result.orientations[side]).toMatchObject({ setupRows: 108, unleashRows: 160, orbCounts: { absorption: 14, big: 21, small: 15 } });
      expect(result.orientations[side].latches.hardwareOamEqualsPrecedingSoftware).toBe("107/107");
      expect(result.orientations[side].unleashLatches.hardwareMatricesEqualsPrecedingSoftware).toBe("159/159");
    }
  });

  it("promotes only Solar Beam after all target-side track members are independently exact", () => {
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8"));
    expect(coverage.entries).toHaveLength(243);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_SOLAR_BEAM")).toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: { id: string }) => track.id === "contest-target-side-impact-bg")).toMatchObject({ fulfilled: true, representatives: ["MOVE_HYPER_FANG", "MOVE_MEGA_PUNCH", "MOVE_MEGA_KICK", "MOVE_SOLAR_BEAM", "MOVE_FOCUS_PUNCH"] });
  });
});
