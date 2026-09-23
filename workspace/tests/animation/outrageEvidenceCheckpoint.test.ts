import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { animationWorkPlan, type AnimationCoverageLedger } from "../../tools/animation/coverage.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/outrage-evidence.json"), "utf8")) as Json;
const run = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/outrageEvidence.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const sha = (path: string): string => createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");
const expectedPaletteTransitions = {
  faded: [7, 11, 15, 19, 29, 33, 37, 47, 51, 55, 65, 69, 73, 83, 87],
  hardware: [8, 12, 16, 20, 30, 34, 38, 48, 52, 56, 66, 70, 74, 84, 88],
};
const expectedLatePaletteTransitions = {
  faded: expectedPaletteTransitions.hardware,
  hardware: [9, 13, 17, 21, 31, 35, 39, 49, 53, 57, 67, 71, 75, 85, 89],
};

describe("MOVE_OUTRAGE complete bilateral Scene-ON evidence checkpoint", () => {
  it("retains dense RGB/state evidence and independently proves both orientations", () => {
    const result = JSON.parse(run()) as Json;
    expect(run()).toBe(JSON.stringify(result, null, 2) + "\n");
    expect(result).toMatchObject({
      schema: "outrage-bilateral-evidence/v1",
      move: "MOVE_OUTRAGE",
      status: "unsupported-evidence",
      coverageCredit: false,
      boundary: {
        productionChanged: false,
        reducerAdded: false,
        typedSeamAdded: false,
        compositorAdded: false,
        actualCoreFramebufferAcceptance: false,
        coveragePromotion: false,
        componentTrackFulfilled: false,
        boundaryOrBarrierChanged: false,
      },
    });
    expect(fixture).toMatchObject({
      schema: "outrage-bilateral-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_OUTRAGE",
      moveId: 200,
      status: "unsupported-evidence",
      coverageCredit: false,
      source: { rootStart: "0x082cb908", rootEndExclusive: "0x082cbaa3", components: 6 },
      acceptance: { freshRunsPerOrientation: 2, rows: { "player-back": 120, "opponent-front": 120 }, totalRows: 240, firstInactiveCleanupRetained: true, productionFramebufferCompared: false },
      evidenceScope: {
        sourceAudit: true,
        completePointerBody: true,
        completeOutrageFlamesGraph: true,
        allSixComponentsAudited: true,
        fullDenseRowsRetained: true,
        rawRgbRetained: true,
        normalizedBankedMaps: true,
        twiceFreshByteIdentical: true,
        legalBilateralParties: true,
        hitLegallyConstrained: true,
        sideDependentFlameVelocity: true,
        attackerEllipticalMotion: true,
        targetShakeMon2: true,
        blendPaletteSchedule: true,
        spriteResourceAudioRngOrderLifetimes: true,
        hardwareOamMatrixPaletteTransfer: true,
        firstInactiveCleanup: true,
        immutableGameplayStateAndRng: true,
        productionChanged: false,
        actualCoreFramebufferAcceptance: false,
        coveragePromotion: false,
        componentTrackFulfilled: false,
        gameplayStateOwned: false,
        boundaryOrBarrierChanged: false,
      },
    });
    const expected = {
      "player-back": { frame: 195, source: "ec368bdfbb347432ebb442d39085535b8bba5f827ebfa2b046babb4220fcd301", rgb: "b2d5b37c2c06ba1c9e74c46957696aee06657f911f5b41bdb314b4105a1260fd", map: "179649643ffa660a39e5300129d7108cde43db2feb55790c9eaaa2690b301699", attacker: 0, target: 1, axis: [4, 1], pan: -64 },
      "opponent-front": { frame: 199, source: "1ddc124c3075a6a772a6627b9b34a8b61cd3aa3e04b0195f463f30c218362edc", rgb: "b201257a61ea5aad7871b07cd77c650c8fa7d91cce7730dc2491437b723754c7", map: "3416a992c0e31ff2e85838c763a5386bfa00694a832b6e9b0631db57c22a3820", attacker: 1, target: 0, axis: [-5, 1], pan: 63 },
    } as const;
    for (const [side, values] of Object.entries(expected)) {
      const receipt = fixture.orientations[side];
      const map = JSON.parse(readFileSync(resolve(root, receipt.changeMap), "utf8")) as Json;
      expect(receipt).toMatchObject({
        sourceWindow: { startFrame: side === "player-back" ? 76 : 80, endFrame: values.frame, frameCount: 120 },
        probeJsonSha256: values.source,
        repeatProbeJsonSha256: values.source,
        rawRgbSequenceSha256: values.rgb,
        repeatRawRgbSequenceSha256: values.rgb,
        changeMapSha256: values.map,
        summary: {
          latches: {
            hardwareOamEqualsPrecedingSoftware: "119/119",
            hardwareMatricesEqualsPrecedingSoftware: "119/119",
            hardwarePaletteEqualsPrecedingFaded: "119/119",
            oamExceptions: [], matrixExceptions: [], paletteExceptions: [], changedPaletteBanks: [1, 2, 3, 16, 17, 23],
          },
          state: { attacker: values.attacker, target: values.target, partiesStable: true, battlersStable: true, engineStable: true, immutableStable: true, rawBattleStateStable: true, gameplayRngTransitions: [] },
          cleanup: { frame: values.frame, active: false, visualTasks: 0, soundTasks: 0, ownedSprites: 0, ownedTasks: 0 },
        },
      });
      expect(sha(receipt.scenario)).toBe(receipt.scenarioSha256);
      expect(sha(receipt.denseState)).toBe(receipt.denseStateSha256);
      expect(sha(receipt.rawRgbArchive)).toBe(receipt.rawRgbArchiveSha256);
      expect(sha(receipt.changeMap)).toBe(receipt.changeMapSha256);
      const dense = JSON.parse(gunzipSync(readFileSync(resolve(root, receipt.denseState))).toString("utf8")) as Json;
      expect(dense.frames).toHaveLength(120);
      expect(dense.frames.at(-1)).toMatchObject({ animScriptActive: false, visualTaskCount: 0, soundTaskCount: 0 });
      expect(dense.frames.every((row: Json) => row.scriptOwner === "Move_OUTRAGE" && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512 && row.resourceAllocators.tileRanges.length === 64 && row.rawBattleState.playerParty.length === 1200 && row.rawBattleState.opponentParty.length === 1200 && row.rawBattleState.battleMons.length === 704)).toBe(true);
      expect(receipt.summary.lifecycle.sprites).toHaveLength(23);
      expect(receipt.summary.lifecycle.sprites.every((life: Json) => life.id.endsWith(":gOutrageFlameSpriteTemplate") && life.end - life.start === 30)).toBe(true);
      expect(receipt.summary.lifecycle.tasks.map(({ id, start, end }: Json) => ({ id, start, end }))).toEqual([
        { id: "0:Task_LoopAndPlaySE", start: 4, end: 20 },
        { id: "2:AnimTask_TranslateMonElliptical_Step", start: 4, end: 81 },
        { id: "3:AnimTask_ShakeMon2_Step", start: 14, end: 91 },
        { id: "1:AnimTask_BlendColorCycleLoop", start: 4, end: 92 },
      ]);
      expect(receipt.summary.resources.smallEmber).toMatchObject({ tag: 10029, tile: { first: 1, last: 118, count: 118 }, palette: { first: 1, last: 118, count: 118 } });
      expect(receipt.summary.transitions.animationRng).toHaveLength(119);
      expect(receipt.summary.transitions.gameplayRng).toEqual([]);
      expect(receipt.summary.transitions.bgVram).toEqual([]);
      expect(receipt.summary.transitions.softwareBg).toEqual({});
      expect(receipt.summary.transitions.attackerAxes).toContainEqual([4, values.axis]);
      expect(receipt.summary.transitions.attackerAxes).toContainEqual([82, [0, 0]]);
      expect(receipt.summary.transitions.targetAxes).toContainEqual([14, [-2, 0]]);
      expect(receipt.summary.transitions.targetAxes).toContainEqual([92, [0, 0]]);
      expect(receipt.summary.latches.paletteBankTransitions[1]).toEqual(expectedPaletteTransitions);
      expect(receipt.summary.latches.paletteBankTransitions[2]).toEqual(expectedPaletteTransitions);
      expect(receipt.summary.latches.paletteBankTransitions[3]).toEqual(expectedPaletteTransitions);
      expect(receipt.summary.latches.paletteBankTransitions[16]).toEqual(expectedLatePaletteTransitions);
      expect(receipt.summary.latches.paletteBankTransitions[17]).toEqual(expectedLatePaletteTransitions);
      expect(receipt.summary.latches.paletteBankTransitions[23]).toEqual({ faded: [1], hardware: [2] });
      expect(map.audio.firstActive.SE1.songHeaderIdentity.symbol).toBe("se_m_dragon_rage");
      expect(map.audio.firstActive.SE1.tracks[0].panX).toBe(values.pan);
      expect(map.transitions.resourceAllocators).toEqual([1, 119]);
      expect(map.transitions.audio[0]).toBe(4);
    }
  });

  it("keeps Outrage unsupported, Outrage-flame unfulfilled, and Helping Hand blocked", () => {
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.some((entry: Json) => entry.move === "MOVE_OUTRAGE")).toBe(false);
    expect(coverage.componentTracks.some((track: Json) => track.representatives?.includes("MOVE_OUTRAGE") || track.moves?.includes("MOVE_OUTRAGE"))).toBe(false);
    const work = animationWorkPlan(coverage as AnimationCoverageLedger);
    expect(work.ready.find((entry) => entry.move === "MOVE_OUTRAGE")).toMatchObject({ move: "MOVE_OUTRAGE", tier: "openOnly" });
    expect(work.blocked.map((entry) => entry.move)).toEqual(["MOVE_HELPING_HAND"]);
    expect(fixture.controls).toEqual({ named: { MOVE_OUTRAGE: "unsupported-evidence", MOVE_HELPING_HAND: "blocked" }, transferCredit: false });
  });
});
