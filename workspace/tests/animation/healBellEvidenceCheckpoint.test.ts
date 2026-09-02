import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  HEAL_BELL_FRAME_COUNT,
  HEAL_BELL_NOTE_GROUPS,
  HEAL_BELL_RING_STARTS,
  HEAL_BELL_ROOT_COMMAND_AGES,
  healBellAtAge,
} from "../../src/animation/healBell.ts";
import {
  createSceneOnMovePresentation,
  sceneOnHealBellView,
  type SceneOnHealBellConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const fixture = JSON.parse(readFileSync(
  "tools/compare/fixtures/heal-bell-evidence.json", "utf8",
));
const fileSha = (path: string): string => createHash("sha256")
  .update(readFileSync(path)).digest("hex");

describe("MOVE_HEAL_BELL dense evidence and pure presentation checkpoint", () => {
  it("retains twice-fresh complete legal bilateral source and raw-RGB rows", () => {
    expect(fixture).toMatchObject({
      schema: "heal-bell-bilateral-evidence/v1",
      status: "exact",
      coverageCredit: true,
      acceptance: {
        sourceRows: 522, rawRgbRows: 522, reducerRows: 522,
        typedSeamRows: 522, productionFramebufferRows: 522,
        freshRuns: 2, rootCommands: 44, ringCalls: 3,
        notePaths: 12, firstInactiveCleanupAge: 260,
      },
    });
    expect(fileSha(fixture.source.audit)).toBe(fixture.source.auditSha256);
    expect(fileSha(fixture.source.probe)).toBe(fixture.source.probeSha256);
    expect(fileSha(fixture.source.assetExtractor))
      .toBe(fixture.source.assetExtractorSha256);
    expect(fileSha(fixture.source.assets)).toBe(fixture.source.assetsSha256);
    expect(fileSha(fixture.source.framebufferVerifier))
      .toBe(fixture.source.framebufferVerifierSha256);
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const entry = fixture.orientations[orientation];
      expect(entry.probeJsonSha256).toBe(entry.repeatProbeJsonSha256);
      expect(fileSha(entry.scenario)).toBe(entry.scenarioSha256);
      expect(fileSha(entry.denseState)).toBe(entry.denseStateSha256);
      expect(fileSha(entry.rawRgbArchive)).toBe(entry.rawRgbArchiveSha256);
      const probe = JSON.parse(gunzipSync(readFileSync(entry.denseState)).toString());
      expect(probe.sourceWindow).toEqual(entry.sourceWindow);
      expect(probe.frames).toHaveLength(HEAL_BELL_FRAME_COUNT);
      expect(probe.frames[0]).toMatchObject({ scriptOffset: 0, animScriptActive: true });
      expect(probe.frames.at(-1)).toMatchObject({
        animScriptActive: false, visualTaskCount: 0, soundTaskCount: 0,
      });
      expect(probe.frames.every((row: any) => row.softwareOam.length === 128
        && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32
        && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512
        && row.unfadedPalette.length === 512 && row.hardwarePalette.length === 512
        && row.parties.player.length === 3 && row.parties.opponent.length === 3
      )).toBe(true);
    }
  });

  it("covers every root command, ring call, note path, unload/reload, and cleanup", () => {
    expect(HEAL_BELL_ROOT_COMMAND_AGES).toHaveLength(44);
    expect(HEAL_BELL_ROOT_COMMAND_AGES.at(-1)).toBe(217);
    expect(HEAL_BELL_RING_STARTS).toEqual([34, 69, 104]);
    expect(HEAL_BELL_NOTE_GROUPS.flat()).toHaveLength(12);
    const center = { x: 72, y: 95 };
    const battleCenter = { x: 72, y: 80 };
    expect(healBellAtAge(20, "player", center, battleCenter)).toMatchObject({
      rootCommandsReached: 8,
      resources: {
        bell: true, musicNotes2: true, musicNoteVariantPalettes: true,
        thinRing: true, sparkle2: false,
      },
    });
    const firstRing = healBellAtAge(34, "player", center, battleCenter);
    expect(firstRing).toMatchObject({
      audio: "SE_M_HEAL_BELL", audioPan: -64,
    });
    expect(firstRing.notes[0]).toMatchObject({ group: 0, path: 0, slot: 4 });
    expect(healBellAtAge(139, "player", center, battleCenter).resources)
      .toEqual({
        bell: false, musicNotes2: false, musicNoteVariantPalettes: false,
        thinRing: false, sparkle2: true,
        paletteTags: [10049], tileTags: [10049],
      });
    expect(healBellAtAge(214, "player", center, battleCenter).resources)
      .toMatchObject({ sparkle2: false, thinRing: true });
    expect(healBellAtAge(260, "player", center, battleCenter)).toMatchObject({
      active: false, rootCommandsReached: 44, notes: [], rings: [],
      sparkles: [], paletteTasks: [], resources: {
        bell: false, musicNotes2: false, thinRing: false, sparkle2: false,
        paletteTags: [], tileTags: [],
      },
    });
  });

  it("mirrors all twelve note x paths and audio pan through the typed seam", () => {
    const player: SceneOnHealBellConfig = {
      move: "HEAL_BELL",
      attacker: fixture.orientations["player-back"].attacker,
      target: fixture.orientations["player-back"].target,
      fieldProfile: {
        playerHp: 152, playerMaxHp: 161, opponentHp: 110,
        opponentMaxHp: 110, playerGender: "female", opponentGender: "male",
      },
    };
    const opponent: SceneOnHealBellConfig = {
      ...player,
      attacker: fixture.orientations["opponent-front"].attacker,
      target: fixture.orientations["opponent-front"].target,
    };
    for (const age of HEAL_BELL_RING_STARTS) {
      const p = sceneOnHealBellView({ ...createSceneOnMovePresentation(player), age });
      const o = sceneOnHealBellView({ ...createSceneOnMovePresentation(opponent), age });
      expect(p.audioPan).toBe(-64);
      expect(o.audioPan).toBe(63);
      for (let index = 0; index < p.notes.length; index += 1) {
        // InitAnimLinearTranslation folds direction into the low bit after
        // division, so mirrored paths may differ by one truncated pixel.
        expect(Math.abs(p.notes[index]!.x2 + o.notes[index]!.x2)).toBeLessThanOrEqual(1);
        expect(Math.sign(p.notes[index]!.x2)).toBe(-Math.sign(o.notes[index]!.x2));
      }
      expect(p.notes.map((note) => note.paletteSlot))
        .toEqual(o.notes.map((note) => note.paletteSlot));
    }
    expect("status" in sceneOnHealBellView({
      ...createSceneOnMovePresentation(player), age: 100,
    })).toBe(false);
  });

  it("replays every retained row and promotes Heal Bell alone", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/healBellEvidence.ts",
    ], { encoding: "utf8" });
    const summary = JSON.parse(output);
    for (const orientation of ["player-back", "opponent-front"]) {
      expect(summary[orientation]).toMatchObject({
        reducerRows: 261,
        seamRows: 261,
        lifecycle: {
          gBellSpriteTemplate: 1,
          gBlendThinRingExpandingSpriteTemplate: 1,
          gHealBellMusicNoteSpriteTemplate: 12,
          gSparklingStarsSpriteTemplate: 2,
          gThinRingExpandingSpriteTemplate: 3,
        },
        cleanup: { age: 260, active: false, visualTasks: 0, soundTasks: 0 },
      });
    }
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: any) => entry.status === "exact"))
      .toHaveLength(226);
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_HEAL_BELL"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_PERISH_SONG"))
      .toMatchObject({ status: "exact" });
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_AROMATHERAPY"))
      .toMatchObject({ status: "exact" });
  });
});
