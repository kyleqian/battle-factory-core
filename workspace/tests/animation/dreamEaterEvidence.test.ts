import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(readFileSync("tools/compare/fixtures/dream-eater-evidence.json", "utf8")) as Record<string, any>;
const sha = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("MOVE_DREAM_EATER bilateral Scene-ON evidence checkpoint", () => {
  it("pins evidence-only scope, source/probe identity, and twice-fresh receipts", () => {
    expect(fixture).toMatchObject({
      schema: "dream-eater-bilateral-evidence/v1", oracleProfile: "battle-scene-on",
      move: "MOVE_DREAM_EATER", moveId: 138, status: "unsupported", coverageCredit: false,
      coverageCounts: "Level 50: 187/276 exact, 0 partial, 0 staged, 89 unsupported",
      source: { moveBody: "0x082d2de7..0x082d2e51", dreamEaterAbsorb: "0x082d2e51..0x082d2fea", literalOrbs: 24 },
      evidenceScope: { productionAnimationChanged: false, reducerAdded: false, typedSeamAdded: false,
        compositorAdded: false, framebufferLookupAdded: false, coveragePromotion: false,
        boundaryOrBarrierChanged: false, gameplayStateOwned: false, fullDenseRowsRetained: true,
        twiceFreshByteIdentical: true },
    });
    expect(sha(fixture.source.probe)).toBe(fixture.source.probeSha256);
    for (const evidence of Object.values(fixture.orientations) as Record<string, any>[]) {
      expect(sha(evidence.scenario)).toBe(evidence.scenarioSha256);
      expect(sha(evidence.denseState)).toBe(evidence.denseStateSha256);
      expect(sha(evidence.rawRgbArchive)).toBe(evidence.rawRgbArchiveSha256);
      expect(sha(evidence.changeMap)).toBe(evidence.changeMapSha256);
      expect(evidence.repeatProbeJsonSha256).toBe(evidence.probeJsonSha256);
    }
  });

  it("pins complete bilateral pointer/audio cadence and first inactive cleanup", () => {
    const player = JSON.parse(readFileSync(fixture.orientations["player-back"].changeMap, "utf8"));
    const opponent = JSON.parse(readFileSync(fixture.orientations["opponent-front"].changeMap, "utf8"));
    expect(player.sourceWindow).toEqual({ startFrame: 1308, endFrame: 1573, frameCount: 266 });
    expect(opponent.sourceWindow).toEqual({ startFrame: 2146, endFrame: 2412, frameCount: 267 });
    expect(player.pointerOwners.map((run: any[]) => [run[0], run[1], run[2]])).toEqual([
      [0, 9, "Move_DREAM_EATER"], [10, 47, "SetPsychicBackground"], [48, 77, "Move_DREAM_EATER"],
      [78, 125, "DreamEaterAbsorb"], [126, 172, "Move_DREAM_EATER"], [173, 208, "HealingEffect"],
      [209, 226, "Move_DREAM_EATER"], [227, 264, "UnsetPsychicBackground"], [265, 265, "Move_DREAM_EATER"],
    ]);
    expect(opponent.pointerOwners.at(-2)).toEqual([227, 265, "UnsetPsychicBackground"]);
    for (const map of [player, opponent]) {
      expect(map.spriteCreates.absorptionOrbs).toEqual([78,78,78,84,84,84,90,90,90,96,96,96,
        102,102,102,108,108,108,114,114,114,120,120,120]);
      expect(map.spriteCreates.healingBlueStars).toEqual([173, 182, 191, 200]);
      expect(map.audio.map((event: any) => [event.age, event.identity])).toEqual([
        [10, "se_m_psybeam"], [48, "se_m_minimize"], [78, "se_m_swagger"], [84, "se_m_swagger"],
        [90, "se_m_swagger"], [96, "se_m_swagger"], [102, "se_m_swagger"], [108, "se_m_swagger"],
        [114, "se_m_swagger"], [120, "se_m_swagger"], [173, "se_m_absorb_2"],
      ]);
      expect(map.cleanup).toMatchObject({ pointer: 0x082d2e50, owner: "Move_DREAM_EATER", ownerOffset: 105,
        active: false, visualTasks: 0, soundTasks: 0, absorptionOrbs: 0, healingBlueStars: 0 });
    }
  });

  it("tests every supplied latch hypothesis against Dream Eater's own bilateral maps", () => {
    const maps = Object.values(fixture.orientations).map((evidence: any) => JSON.parse(readFileSync(evidence.changeMap, "utf8")));
    expect(maps.map((map: any) => map.latches.hardwareOamEqualsPrecedingSoftware)).toEqual(["265/265", "266/266"]);
    expect(maps.map((map: any) => map.latches.hardwarePaletteEqualsPrecedingFaded)).toEqual(["265/265", "266/266"]);
    expect(maps.map((map: any) => map.latches.targetMatrixEqualsTwoBackSource)).toEqual(["264/264", "265/265"]);
    expect(maps.map((map: any) => map.latches.targetMatrixSourceChanges)).toEqual([
      Array.from({ length: 30 }, (_, index) => 48 + index), Array.from({ length: 30 }, (_, index) => 48 + index),
    ]);
    expect(maps.map((map: any) => map.latches.targetMatrixHardwareChanges)).toEqual([
      Array.from({ length: 30 }, (_, index) => 50 + index), Array.from({ length: 30 }, (_, index) => 50 + index),
    ]);
    for (const map of maps) {
      expect(map.latches.initialShadow).toEqual({ slot: 2, callback: "SpriteCB_SetInvisible", invisible: true,
        firstComparableWholeOamAge: 1, row1EqualsRow0Software: true });
      expect(map.latches.sortWitness).toMatchObject({ sourceAge: 99, hardwareDisplayAge: 100,
        allEqualSubpriority: true, allSemiTransparent: true, hardwareEqualsSourceSoftware: true });
      expect(map.latches.sortWitness.y).toEqual([...map.latches.sortWitness.y].sort((a: number, b: number) => b - a));
    }
    expect(Object.values(fixture.latchHypotheses)).toHaveLength(7);
  });

  it("replays every retained state/RGB row into both exact normalized maps", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/dreamEaterEvidence.ts"], { encoding: "utf8" });
    expect(output).toContain('"frameCount":266');
    expect(output).toContain('"frameCount":267');
  });

  it("retains all three independently exact sibling controls while Dream Eater stays unsupported", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    for (const move of ["MOVE_ABSORB", "MOVE_MEGA_DRAIN", "MOVE_GIGA_DRAIN"]) {
      expect(coverage.entries.find((entry: any) => entry.move === move)).toMatchObject({ status: "exact" });
    }
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_DREAM_EATER")).toBeUndefined();
    expect(coverage.entries.filter((entry: any) => entry.status === "exact")).toHaveLength(187);
  });
});
