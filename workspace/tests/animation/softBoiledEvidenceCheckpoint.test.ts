import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/soft-boiled-evidence.json", "utf8",
)) as Record<string, any>;
const sha = (path: string): string =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

describe("MOVE_SOFT_BOILED bilateral dense evidence checkpoint", () => {
  it("retains the historical reducer/seam checkpoint and current exact promotion", () => {
    expect(fixture).toMatchObject({
      schema: "soft-boiled-bilateral-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_SOFT_BOILED",
      moveId: 135,
      status: "unsupported-dense-evidence-checkpoint",
      coverageCredit: false,
      evidenceScope: {
        productionAnimationChanged: false,
        reducerAdded: true,
        typedSeamAdded: true,
        compositorAdded: false,
        framebufferLookupAdded: false,
        coveragePromotion: false,
        boundaryOrBarrierChanged: false,
        gameplayStateOwned: false,
        fullDenseRowsRetained: true,
        twiceFreshByteIdentical: true,
      },
      acceptance: {
        sourceRows: 544, rawRgbRows: 544, freshRunsPerOrientation: 2,
        firstInactiveCleanupAge: 271, reducerRows: 544, typedSeamRows: 544,
        productionFramebufferRows: 0,
      },
    });
    expect(sha(fixture.source.audit)).toBe(fixture.source.auditSha256);
    expect(sha(fixture.source.probe)).toBe(fixture.source.probeSha256);
    expect(sha(fixture.source.evidenceVerifier)).toBe(fixture.source.evidenceVerifierSha256);
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_SOFT_BOILED"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.filter((entry: any) => entry.status === "exact"))
      .toHaveLength(212);
  });

  it("pins twice-fresh complete raw state and RGB archives through cleanup", () => {
    for (const side of ["player-back", "opponent-front"]) {
      const config = fixture.orientations[side];
      expect(config.repeatProbeJsonSha256).toBe(config.probeJsonSha256);
      expect(sha(config.scenario)).toBe(config.scenarioSha256);
      expect(sha(config.denseState)).toBe(config.denseStateSha256);
      expect(sha(config.rawRgbArchive)).toBe(config.rawRgbArchiveSha256);
      expect(sha(config.changeMap)).toBe(config.changeMapSha256);
      const probe = JSON.parse(gunzipSync(readFileSync(config.denseState)).toString("utf8"));
      expect(probe).toMatchObject({
        schema: "soft-boiled-dense-evidence/v1",
        profile: "battle-scene-on",
        sourceWindow: config.sourceWindow,
      });
      expect(probe.frames).toHaveLength(272);
      expect(probe.frames[0]).toMatchObject({
        animScriptActive: true, scriptOwner: "Move_SOFT_BOILED", scriptOffset: 0,
      });
      expect(probe.frames.at(-1)).toMatchObject({
        animScriptActive: false, visualTaskCount: 0, soundTaskCount: 0,
      });
      expect(probe.frames.every((row: any) =>
        row.tasks.length <= 16 && row.sprites.length <= 64
        && row.spriteOrder.length === 64 && row.softwareOam.length === 128
        && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32
        && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512
        && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512
        && row.allocators.paletteTags.length === 16
        && row.allocators.tileTags.length === 64
        && row.allocators.tileRanges.length === 64
        && row.chrome.healthboxSpriteIds.length === 4
        && row.chrome.healthboxSprites.length === 4)).toBe(true);
    }
  });

  it("pins the bilateral lifecycle, geometry, audio, resources, and display latches", () => {
    const summary = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", fixture.source.evidenceVerifier,
    ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
    for (const side of ["player-back", "opponent-front"]) {
      const value = summary[side];
      expect(value).toMatchObject({
        sourceWindow: fixture.orientations[side].sourceWindow,
        pointerOwners: [
          { age: 218, owner: "HealingEffect2", offset: 21 },
          { age: 256, owner: "Move_SOFT_BOILED", offset: 129 },
        ],
        bgVramTransitions: [11, 220, 222],
        resources: {
          10031: { palette: { first: 7, last: 270, count: 264 }, tile: { first: 7, last: 270, count: 264 } },
          10202: { palette: { first: 1, last: 270, count: 270 }, tile: { first: 1, last: 270, count: 270 } },
          10203: { palette: { first: 4, last: 270, count: 267 }, tile: { first: 4, last: 270, count: 267 } },
        },
        latches: {
          hardwareOamEqualsPrecedingSoftware: "271/271",
          hardwareMatricesEqualPrecedingSoftware: "271/271",
          hardwarePaletteEqualsPrecedingFaded: "270/271",
        },
        state: {
          gameplayRngTransitions: [],
          animationRngTransitions: { count: 269, heldAges: [220, 221] },
          partiesStable: true, engineStable: true, semanticStable: true,
        },
        cleanup: {
          age: 271, active: false, visualTasks: 0, soundTasks: 0,
          ownedSprites: 0, ownedTasks: 0, moveTags: [],
        },
      });
      expect(value.spriteLives.map((life: any) => [life.id, life.start, life.end]))
        .toEqual(expect.arrayContaining([
          ["3:gSoftBoiledEggSpriteTemplate", 13, 216],
          ["4:gSoftBoiledEggSpriteTemplate", 13, 216],
          ["7:gThinRingExpandingSpriteTemplate", 144, 174],
          ["9:gThinRingExpandingSpriteTemplate", 154, 184],
          ["3:gHealingBlueStarSpriteTemplate", 218, 240],
          ["4:gHealingBlueStarSpriteTemplate", 229, 249],
          ["5:gHealingBlueStarSpriteTemplate", 238, 258],
          ["3:gHealingBlueStarSpriteTemplate", 247, 267],
        ]));
      expect(value.taskLives.map((life: any) => [life.id, life.start, life.end]))
        .toEqual([
          ["0:AnimTask_ShakeMon_Step", 13, 22],
          ["1:Task_UpdateMonBg", 10, 220],
          ["0:Task_ClearMonBg", 218, 220],
        ]);
      expect(value.audio.map((event: any) => [event.age, event.symbol]))
        .toEqual([[13, "se_m_tail_whip"], [144, "se_m_horn_attack"], [218, "se_m_absorb_2"]]);
      expect(value.latches.paletteExceptions).toHaveLength(1);
      expect(value.latches.paletteExceptions[0]).toMatchObject({ age: 144 });
      expect(value.latches.paletteExceptions[0].precedingIndices).toEqual(
        Array.from({ length: 48 }, (_, index) => index + 16),
      );
    }
    expect(summary["player-back"].spriteLives.find((life: any) =>
      life.id === "3:gSoftBoiledEggSpriteTemplate").geometry)
      .toMatchObject({ x: 72, y: 96, x2: 0, y2: -3, subpriority: 26 });
    expect(summary["opponent-front"].spriteLives.find((life: any) =>
      life.id === "3:gSoftBoiledEggSpriteTemplate").geometry)
      .toMatchObject({ x: 176, y: 56, x2: -1, y2: -3, subpriority: 36 });
    expect(summary["player-back"].audio.map((event: any) => event.panX[0]))
      .toEqual([-64, -64, -64]);
    expect(summary["opponent-front"].audio.map((event: any) => event.panX[0]))
      .toEqual([63, 63, 63]);
  });
});
