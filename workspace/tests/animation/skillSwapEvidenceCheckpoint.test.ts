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

describe("MOVE_SKILL_SWAP retained-evidence and reducer/seam checkpoint", () => {
  it("pins the authoritative root/shared intervals, exact graph, novel components, and five Level-50 carriers", () => {
    const text = run("tools/compare/skillSwapSourceAudit.ts");
    expect(run("tools/compare/skillSwapSourceAudit.ts")).toBe(text);
    expect(sha(text)).toBe("b476714a37c919520e242ce2e22d052d6ff0edfc6e1e4e186e74a30e43349b39");
    const audit = JSON.parse(text) as Json;
    expect(audit).toMatchObject({ schema: "skill-swap-source-audit/v1", move: "MOVE_SKILL_SWAP", moveId: 285, status: "unsupported-reducer-seam-checkpoint", coverageCredit: false,
      source: { root: { source: { byteLength: 476, sha256: "fcbabae2447f1ff79a00c95a2674ada2899a9715fcad7129f28bd1e84bd0a8f7" }, rom: { start: "0x082ce3d8", endExclusive: "0x082ce423", byteLength: 75, romSha256: "fa50b4ed4b288510ad36361cd26d02168faa2779d1bb100ed00f488cea73a172" } }, psychicBackground: { rom: { start: "0x082d7cd1", endExclusive: "0x082d7ce5", byteLength: 20 } }, novel: { asset: { id: "asset:ANIM_TAG_BLUEGREEN_ORB" }, task: { id: "task:AnimTask_SkillSwap" } } }, graph: { componentCount: 11, novelComponents: ["asset:ANIM_TAG_BLUEGREEN_ORB", "task:AnimTask_SkillSwap"] } });
    expect(audit.graph.components).toEqual(["asset:ANIM_TAG_BLUEGREEN_ORB", "subroutine:SetPsychicBackground", "subroutine:UnsetPsychicBackground", "task:AnimTask_BlendMonInAndOut", "task:AnimTask_SetPsychicBackground", "task:AnimTask_SkillSwap", "visualCommand:fadetobg", "visualCommand:restorebg", "visualCommand:setarg", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout"]);
    expect(audit.carriers.map((entry: Json) => [entry.setId, entry.label])).toEqual([[226, "FRONTIER_MON_VENOMOTH_1"], [235, "FRONTIER_MON_GIRAFARIG_1"], [325, "FRONTIER_MON_KECLEON_2"], [596, "FRONTIER_MON_ALAKAZAM_3"], [613, "FRONTIER_MON_GENGAR_3"]]);
    expect(audit.controls).toMatchObject({ named: { MOVE_FORESIGHT: "exact", MOVE_NIGHTMARE: "exact", MOVE_PSYWAVE: "unsupported", MOVE_EXTRASENSORY: "unsupported" }, transferCredit: false });
    expect(audit.checkpoint).toMatchObject({ reducerAdded: true, typedSeamAdded: true, productionChanged: true, compositorAdded: false, framebufferAcceptance: false, coveragePromotion: false, siblingPromotion: false, componentTrackFulfilled: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false });
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-skill-swap-player-girafarig-opponent-shuckle.json", "player", "opponent"],
    ["opponent-front", "tools/battle-lab/mechanic-skill-swap-opponent-girafarig-player-shuckle.json", "opponent", "player"],
  ])("keeps the %s stage complete, party-only, and transient-free", (_side, path, attacker, target) => {
    const stage = json(path);
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.trace).not.toHaveProperty("captureFrames");
    for (const party of Object.values(stage.overrides.parties) as Json[][]) { expect(party).toHaveLength(3); for (const mon of party) { expect(Object.keys(mon).sort()).toEqual(completeKeys); for (const key of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(key); } }
    expect(stage.overrides.parties[attacker][0]).toMatchObject({ species: 203, level: 50, moves: [285, 285, 285, 285], abilitySlot: 0 });
    expect(stage.overrides.parties[target][0]).toMatchObject({ species: 213, level: 50, moves: [150, 150, 150, 150], abilitySlot: 0 });
  });

  it("replays all 391 dense state/raw-RGB rows and both normalized maps without claiming acceptance", () => {
    const fixture = json("tools/compare/fixtures/skill-swap-evidence.json");
    expect(fixture).toMatchObject({ schema: "skill-swap-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_SKILL_SWAP", moveId: 285, status: "unsupported-reducer-seam", coverageCredit: false, acceptance: { freshRunsPerOrientation: 2, rows: { "player-back": 196, "opponent-front": 195 }, totalRows: 391, firstInactiveCleanupRetained: true }, evidenceScope: { fullDenseRowsRetained: true, rawRgbRetained: true, normalizedMaps: true, twiceFreshByteIdentical: true, latchMeasured: true, legalAbilityOutcomeOnly: true, productionChanged: true, reducerAdded: true, typedSeamAdded: true, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, siblingPromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false } });
    for (const [side, probe, rgb, map, rows] of [
      ["player-back", "f769e3ea3939cc41ead5fb890feb175e181db92e7fe2898aa1d0316324a9ef6c", "7cdfb597f76528cd44ff36a35d74595a8cee12a5a5463f0bd69085f238fb83de", "7ef483bc2398e5dd5608cb0a3f32cd00dc66e0f11fb49bbb4850e76b78b02a9d", 196],
      ["opponent-front", "c2c1738365b548ab6325c4e296ba0098ce274a37c50c2f0cf5523d64c06d79ff", "85fefb13f890bead54ad8f15b1a0366f051bfb0f958afc005baf47c1e998b5d0", "9a54df11a16df4a81209cc865e22f85b3f5e2805be03a0a5585d6d53b2efaa13", 195],
    ] as const) expect(fixture.orientations[side]).toMatchObject({ probeJsonSha256: probe, repeatProbeJsonSha256: probe, rawRgbSequenceSha256: rgb, repeatRawRgbSequenceSha256: rgb, changeMapSha256: map, sourceWindow: { frameCount: rows }, summary: { lifecycle: { orbCount: 24 }, latches: { hardwareOamEqualsPrecedingSoftware: `${rows - 1}/${rows - 1}`, hardwareMatricesEqualPrecedingSoftware: `${rows - 1}/${rows - 1}`, hardwarePaletteEqualsPrecedingFaded: `${rows - 1}/${rows - 1}`, oamExceptions: [], matrixExceptions: [], paletteExceptions: [] }, state: { partiesStable: true, battlersStable: true, engineStable: true, immutableStable: true, rawBattleStable: true, gameplayRngStable: true }, cleanup: { age: rows - 1, active: false, visualTasks: 0, soundTasks: 0, ownedTasks: 0, ownedOrbs: 0 } } });
    const result = JSON.parse(run("tools/compare/skillSwapEvidence.ts")) as Json;
    expect(result).toMatchObject({ schema: fixture.schema, move: "MOVE_SKILL_SWAP", status: "unsupported-reducer-seam", coverageCredit: false, boundary: { productionChanged: true, reducerAdded: true, typedSeamAdded: true, actualCoreFramebufferAcceptance: false, coveragePromotion: false, siblingPromotion: false, componentTrackFulfilled: false, boundaryOrBarrierChanged: false } });
    const coverage = json("ANIMATION_COVERAGE.json");
    expect(coverage.entries.some((entry: Json) => entry.move === "MOVE_SKILL_SWAP")).toBe(false);
    expect(coverage.componentTracks.find((track: Json) => track.id === "skill-swap-bluegreen-orb")).toMatchObject({ representatives: ["MOVE_SKILL_SWAP"], fulfilled: false });
  });
});
