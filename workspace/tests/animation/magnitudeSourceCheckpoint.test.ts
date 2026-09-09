import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"];
const audit = (): Json => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/magnitudeSourceAudit.ts"], { cwd: root, encoding: "utf8" }));
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

describe("MOVE_MAGNITUDE authoritative source and legal bilateral branch staging", () => {
  it("pins all four pointer-owned source bodies and the exact six-component graph", () => {
    expect(audit()).toMatchObject({
      move: "MOVE_MAGNITUDE", moveId: 222, status: "exact", coverageCredit: true,
      sourceBodies: {
        root: { script: { bytes: 254, sha256: "2bcf242f8c6813fbb556d6b300395693f319e442acbee25b8dff732b29836d02" }, rom: { start: "0x082cd8b0", endExclusive: "0x082cd8c8", bytes: 24, sha256: "b1f5fa9379938bc48972f2e67e4238698cb4583da6828585ca8fb07a0d1e3c94" } },
        regular: { script: { bytes: 243, sha256: "d876b391ecae7e6c3cfc8d54e5bfba5a56fc885de5c94a9a889158335e65c675" }, rom: { start: "0x082cd8c9", endExclusive: "0x082cd8ee", bytes: 37, sha256: "f45a73934bfbfbd89f5dcf11b8905f37bbcfdece5fe769fd4d00c4f2deeab299" } },
        intense: { script: { bytes: 644, sha256: "8c8765e2c705ffe060b36691f805ed0c028d25f36501f559debbb4391e3fdcbd" }, rom: { start: "0x082cd8ee", endExclusive: "0x082cd941", bytes: 83, sha256: "9f7c9c2ef7bff2e9604fa90f4311f7d3a8580e45ee6dfff2e35dab93171c7c27" } },
      },
      graph: { blocks: ["Move_MAGNITUDE", "MagnitudeRegular", "MagnitudeIntense", "MagnitudeEnd"], components: ["subroutine:MagnitudeEnd", "subroutine:MagnitudeIntense", "subroutine:MagnitudeRegular", "task:AnimTask_HorizontalShake", "task:AnimTask_IsPowerOver99", "visualCommand:complex_palette_blend"] },
    });
  });

  it("pins both Level-50 carriers and the source-owned branch mechanisms", () => {
    const result = audit();
    expect(result.carriers).toMatchObject({ count: 2, speciesCount: 2, all: [
      { index: 166, label: "FRONTIER_MON_GRAVELER_1", species: "SPECIES_GRAVELER", moves: ["MOVE_MAGNITUDE", "MOVE_ROCK_THROW", "MOVE_DEFENSE_CURL", "MOVE_BRICK_BREAK"] },
      { index: 241, label: "FRONTIER_MON_CAMERUPT_1", species: "SPECIES_CAMERUPT", moves: ["MOVE_MAGNITUDE", "MOVE_PROTECT", "MOVE_SANDSTORM", "MOVE_ROCK_SLIDE"] },
    ] });
    expect(result.branch).toEqual({ selector: "AnimTask_IsPowerOver99", predicate: "gAnimMovePower > 99", regular: "MagnitudeRegular", intense: "MagnitudeIntense", regularPower: "<=99", intensePower: ">99" });
    expect(result.horizontalShake).toMatchObject({ targets: [5, 4], intensity: 0, maxTime: 50 });
    expect(result.complexPalette).toEqual({ selector: "F_PAL_BG", delay: 3, numBlends: 1, color1: "RGB_BLACK", blendY1: 14, color2: "RGB_WHITE", blendY2: 14, delaysAfterShake: [10, 16], calls: 2 });
  });

  it.each([
    ["regular-player", "tools/battle-lab/mechanic-magnitude-regular-player-graveler-opponent-onix.json", 166, "player"],
    ["intense-player", "tools/battle-lab/mechanic-magnitude-intense-player-camerupt-opponent-onix.json", 241, "player"],
    ["regular-opponent", "tools/battle-lab/mechanic-magnitude-regular-opponent-graveler-player-onix.json", 166, "opponent"],
    ["intense-opponent", "tools/battle-lab/mechanic-magnitude-intense-opponent-camerupt-player-onix.json", 241, "opponent"],
  ])("validates the %s complete legal three-Pokémon party-only Scene-ON stage", (_name, path, carrier, side) => {
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    const validated = validateStage(path);
    expect(validated.status).toBe(0); expect(validated.stderr).toBe("");
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
    expect([0, 1]).toContain(stage.challengeNum); expect([50, 90]).toContain(stage.trainerId);
    expect(Object.keys(stage.overrides)).toEqual(["parties"]); expect(stage.trace).not.toHaveProperty("captureFrames");
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      expect(party).toHaveLength(3);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual(completeKeys); expect(Object.keys(mon.ivs).sort()).toEqual(statKeys); expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
        expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4);
        for (const key of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(key);
      }
    }
    const attacker = stage.overrides.parties[side][0];
    expect(attacker.moves).toEqual([222, 222, 222, 222]);
    expect(stage.playerSetIds.includes(carrier) || stage.opponentSetIds.includes(carrier)).toBe(true);
    expect(stage.seed).toBeGreaterThan(0);
  });

  it("promotes only Magnitude, preserving Spider Web as the sole manual queue item", () => {
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.queue).toEqual(["MOVE_SKY_UPPERCUT"]);
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_MAGNITUDE")?.status).toBe("exact");
    expect(audit().checkpoint).toEqual({ legalPartyOnlyStaging: true, branches: ["regular", "intense"], orientations: ["player-back", "opponent-front"], denseWindowCaptured: true, twiceFresh: true, normalizedMaps: true, productionChanged: true, coveragePromotion: true, componentTrackCredit: false, latchPromotion: false });
  });
});
