import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const json = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
const run = (): Json => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/flatterEvidence.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })) as Json;

describe("MOVE_FLATTER bilateral dense unsupported-evidence checkpoint", () => {
  it("retains byte-identical complete windows without granting production or coverage credit", () => {
    const fixture = json("tools/compare/fixtures/flatter-evidence.json");
    expect(fixture).toMatchObject({
      schema: "flatter-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_FLATTER", moveId: 260,
      status: "unsupported-evidence", coverageCredit: false,
      acceptance: { freshRunsPerOrientation: 2, rows: { "player-back": 219, "opponent-front": 219 }, totalRows: 438, firstInactiveCleanupRetained: true },
      evidenceScope: { fullDenseRowsRetained: true, rawRgbRetained: true, normalizedMaps: true, twiceFreshByteIdentical: true, latchMeasured: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false },
    });
    const expected = {
      "player-back": { probe: "988dec61bb18658d217901d803bcc7cd53efedca2609dd241bef7a7ffcc42894", rgb: "6a414edaad3c1b2d3f9caa6ccc3a9be8dbad097d7ef4544a7bdb892ab6e94394", map: "46152f94eb52d1e0fd4c5283128633ffa5c6c8e6cf41f6dfd6b235bed69c4a04", start: 70, end: 288, pans: [63, -64, 63] },
      "opponent-front": { probe: "92ea6b6f7d419a3c73b70d22c3174879613b15eab276c14e71042c371383f7bf", rgb: "b00a052fb71cf8dfe4663d076d754a42c2c7fb5fe4a566f8b3f2fee8c7640909", map: "5a43325b50619cf1908cd289eacc56248b26b29f4ad892e4494be07716b330f5", start: 74, end: 292, pans: [-63, 63, -63] },
    } as const;
    for (const side of ["player-back", "opponent-front"] as const) {
      const entry = fixture.orientations[side], pin = expected[side];
      expect(entry).toMatchObject({ probeJsonSha256: pin.probe, repeatProbeJsonSha256: pin.probe, rawRgbSequenceSha256: pin.rgb, repeatRawRgbSequenceSha256: pin.rgb, changeMapSha256: pin.map, sourceWindow: { startFrame: pin.start, endFrame: pin.end, frameCount: 219, sourceFrameCount: 219 } });
      expect(entry.summary.chronology.hardwarePaletteFadeTasks.map((life: Json) => [life.start, life.end])).toEqual([[7, 47], [176, 216]]);
      expect(entry.summary.chronology.verticalDips.map((life: Json) => [life.slot, life.start, life.end])).toEqual([[4, 51, 63], [5, 63, 78]]);
      expect(entry.summary.chronology.confetti).toHaveLength(38);
      expect(entry.summary.chronology.audio).toMatchObject({ encore2: { age: 7, pan: pin.pans[0] }, flatterAttacker: { age: 65, pan: pin.pans[1] }, flatterTarget: { age: 75, pan: pin.pans[2] } });
      expect(entry.summary.latches).toMatchObject({ hardwareOamEqualsPrecedingSoftware: "218/218", hardwareMatricesEqualPrecedingSoftware: "217/218", hardwarePaletteEqualsPrecedingFaded: "218/218", oamExceptions: [], matrixExceptions: [68], paletteExceptions: [] });
      expect(entry.summary.resources).toEqual({ spotlight: { tag: 10227, palette: [1, 217], tile: [1, 217] }, confetti: { tag: 10240, palette: [4, 217], tile: [4, 217] } });
      expect(entry.summary.cleanup).toEqual({ age: 218, active: false, visualTasks: 0, soundTasks: 0, ownedSprites: 0, resourcesReleased: true });
    }
    expect(run()).toMatchObject({ schema: fixture.schema, move: "MOVE_FLATTER", status: "unsupported-evidence", coverageCredit: false, boundary: fixture.evidenceScope });
    expect(json("ANIMATION_COVERAGE.json").entries.some((entry: Json) => entry.move === "MOVE_FLATTER")).toBe(false);
  });
});
