import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const json = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const run = (path: string): string => execFileSync(process.execPath, ["--experimental-strip-types", path], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

describe("MOVE_PURSUIT evidence-only checkpoint", () => {
  it("pins the complete source graph, resources, callbacks, audio, variants, and six Level-50 carriers", () => {
    const text = run("tools/compare/pursuitSourceAudit.ts");
    expect(run("tools/compare/pursuitSourceAudit.ts")).toBe(text);
    expect(sha(text)).toBe("827c649bcc1ff3ce5c7363b0c6c649d566d0e58206a826e0d057510850ef500d");
    const audit = JSON.parse(text) as Json;
    expect(audit).toMatchObject({ schema: "pursuit-source-audit/v1", move: "MOVE_PURSUIT", moveId: 228, status: "unsupported", coverageCredit: false,
      source: { root: { source: { byteLength: 819, sha256: "ef2501380077566476de8c5add0940072e169632f505bda7d0d148741b2ca0d0" }, rom: { start: "0x082ca980", endExclusive: "0x082ca9f1", byteLength: 113, romSha256: "a57e504992b94694c91325564659944b8f314b43b9f3310bd95d00a56d65621d" } }, branches: { normal: { hitsplatAffineAnimation: 2 }, switchout: { hitsplatAffineAnimation: 1 } }, audio: { symbol: "se_m_comet_punch" } },
      graph: { componentCount: 13, novelComponents: [] }, variants: { normal: { evidenceRequired: true, legalBilateralStage: true }, switchout: { evidenceRequired: true, legalBilateralStage: false } }, checkpoint: { reducerAdded: false, typedSeamAdded: false, compositorAdded: false, productionChanged: false, framebufferAcceptance: false, coveragePromotion: false, siblingPromotion: false, componentTrackFulfilled: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false } });
    expect(audit.graph.components).toEqual(["asset:ANIM_TAG_IMPACT", "subroutine:PursuitContinue", "subroutine:PursuitNormal", "subroutine:PursuitOnSwitchout", "task:AnimTask_ShakeTargetBasedOnMovePowerOrDmg", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_basic_hitsplat_sprite", "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:setalpha", "visualCommand:waitbgfadein"]);
    expect(audit.carriers.map((entry: Json) => [entry.setId, entry.label])).toEqual([[154,"FRONTIER_MON_BEEDRILL"],[197,"FRONTIER_MON_RATICATE_1"],[206,"FRONTIER_MON_METANG_1"],[319,"FRONTIER_MON_SWELLOW_2"],[473,"FRONTIER_MON_FEAROW_2"],[508,"FRONTIER_MON_ALTARIA_2"]]);
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-pursuit-player-beedrill-opponent-shuckle.json", "player", "opponent"],
    ["opponent-front", "tools/battle-lab/mechanic-pursuit-opponent-beedrill-player-shuckle.json", "opponent", "player"],
  ])("keeps the %s stage complete, party-only, and transient-free", (_side, path, attacker, target) => {
    const stage = json(path);
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.trace).not.toHaveProperty("captureFrames");
    for (const party of Object.values(stage.overrides.parties) as Json[][]) { expect(party).toHaveLength(3); for (const mon of party) { expect(Object.keys(mon).sort()).toEqual(completeKeys); for (const key of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(key); } }
    expect(stage.overrides.parties[attacker][0]).toMatchObject({ species: 15, level: 50, moves: [228,228,228,228], abilitySlot: 0 });
    expect(stage.overrides.parties[target][0]).toMatchObject({ species: 213, level: 50, moves: [33,33,33,33], abilitySlot: 0 });
  });

  it("regenerates all 206 normal-body state/raw-RGB rows and both normalized maps without granting credit", () => {
    const fixture = json("tools/compare/fixtures/pursuit-evidence.json");
    expect(fixture).toMatchObject({ schema: "pursuit-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_PURSUIT", moveId: 228, status: "unsupported", coverageCredit: false, variants: { normal: { legalBilateralEvidence: true }, switchout: { legalBilateralEvidence: false, outstanding: true } }, acceptance: { freshRunsPerOrientation: 2, rows: { "player-back": 103, "opponent-front": 103 }, totalRows: 206, firstInactiveCleanupRetained: true }, evidenceScope: { fullDenseRowsRetained: true, rawRgbRetained: true, normalizedMaps: true, twiceFreshByteIdentical: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, siblingPromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false } });
    expect(fixture.orientations["player-back"]).toMatchObject({ probeJsonSha256: "137dda59c38224477ed4b78e9cdbe3a988e7a8523fceb025f91453d175305a08", repeatProbeJsonSha256: "137dda59c38224477ed4b78e9cdbe3a988e7a8523fceb025f91453d175305a08", rawRgbSequenceSha256: "4da40d97ff687ff8226b796e9d5e855ce3d57e0d466a670f79e001f1c14e07da", repeatRawRgbSequenceSha256: "4da40d97ff687ff8226b796e9d5e855ce3d57e0d466a670f79e001f1c14e07da", changeMapSha256: "550ccc1c63caab25044db739fa65dc635b21d513e99999289623f462d81f77c5" });
    expect(fixture.orientations["opponent-front"]).toMatchObject({ probeJsonSha256: "2651249058382220c8cbbf7e8de89ce3fecc9a1376eb7703c3fdc07b720fe930", repeatProbeJsonSha256: "2651249058382220c8cbbf7e8de89ce3fecc9a1376eb7703c3fdc07b720fe930", rawRgbSequenceSha256: "e9cd93c453ae83000e229b7d5372e5a8795e23f735dc4cb5638f3d6748f416d9", repeatRawRgbSequenceSha256: "e9cd93c453ae83000e229b7d5372e5a8795e23f735dc4cb5638f3d6748f416d9", changeMapSha256: "b81f86c46c8dd15ddc666f49d047f57e92a3db442cb546c608cc87bab7562d42" });
    for (const side of ["player-back", "opponent-front"]) expect(fixture.orientations[side].summary).toMatchObject({ latches: { hardwareOamEqualsPrecedingSoftware: "102/102", hardwareMatricesEqualPrecedingSoftware: "102/102", hardwarePaletteEqualsPrecedingFaded: "101/102", oamExceptions: [], matrixExceptions: [], paletteExceptions: [4] }, cleanup: { age: 102, active: false, visualTasks: 0, soundTasks: 0, ownedTasks: 0, hitsplats: 0, impactPalette: false, impactTiles: false } });
    const result = JSON.parse(run("tools/compare/pursuitEvidence.ts")) as Json;
    expect(result).toMatchObject({ move: "MOVE_PURSUIT", status: "unsupported", coverageCredit: false, acceptance: { totalRows: 206 }, boundary: { productionChanged: false, reducerAdded: false, typedSeamAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, siblingPromotion: false, componentTrackFulfilled: false, boundaryOrBarrierChanged: false } });
    const coverage = json("ANIMATION_COVERAGE.json");
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_PURSUIT")).toBeUndefined();
    expect(coverage.componentTracks.find((track: Json) => track.id === "pursuit-dark-background-power-shake")).toMatchObject({ representatives: ["MOVE_PURSUIT"], fulfilled: false });
  });
});
