import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(readFileSync("tools/compare/fixtures/yawn-evidence.json", "utf8")) as Record<string, any>;
const sha = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("MOVE_YAWN source/staging and twice-fresh evidence checkpoint", () => {
  it("pins the complete body, callbacks, affine/OAM/assets, audio, and legal carrier", () => {
    const audit = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/yawnSourceAudit.ts"], { encoding: "utf8" }));
    expect(audit).toMatchObject({ move: "MOVE_YAWN", moveId: 281, status: "unsupported-source-evidence-checkpoint", source: {
      moveScript: { start: "0x082ce253", endExclusive: "0x082ce296", bytes: 67, sha256: "0bf8b045e9ef520f16c367dc0ce7dd09929bcf9757316ef2dc91285c839fb128" },
      deepInhaleAffine: { bytes: 48, sha256: "8f2dc8025a00e34b40e527b2d9884175a794ded0d0b6e5768a18b6e38bbec45e" },
      template: { bytes: 24, sha256: "d79d62ad384fd138cb4ed87d7a876c1f2c7157b2e217ad88cb30e9f4a5d95e7e" },
      deepInhaleStep: { bytes: 152, sha256: "dc03762b711b89a83c694e4af8760e964cecce924292866d1be7c7c00f58c91a" },
      cloudStep: { bytes: 108, sha256: "a67e682de100dd97826123ceb14d8653143f09c92915bbd5ea8215977ba1292e" },
      gfx: { bytes: 316, sha256: "31bb61583d6daa674510bfc74539d67bb1156aaaf82cbf0347034edb4355ab54" }, palette: { bytes: 36, sha256: "506155436a3d5d91b1c429db37be8f01110f722bd753b74a55a4333d1f43d112" },
      oam: { bytes: 8, sha256: "5e3f7379a26a539aff10cea3cc62c588f61042b42a469ec85d7912ebd2aa5643" }, yawnAudio: { bytes: 16 }, spitUpAudio: { bytes: 16 },
    }, components: ["asset:ANIM_TAG_PINK_CLOUD", "sprite:gYawnCloudSpriteTemplate", "task:AnimTask_DeepInhale"], cloudCreates: 3, deepInhaleTasks: 2, audioCues: 3, carrier: { setId: 288, label: "FRONTIER_MON_TOGETIC_2", species: 176 }, ownership: { gpuRegisters: false, gameplayState: false } });
    expect(audit.scriptCommands).toHaveLength(14);
  });

  it("stages complete legal challenge-2 parties through ordinary controller input", () => {
    for (const side of ["player-back", "opponent-front"]) {
      const config = fixture.orientations[side], stage = JSON.parse(readFileSync(config.scenario, "utf8"));
      expect(stage).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 2 });
      expect(Object.keys(stage.overrides)).toEqual(["parties"]); expect(stage.overrides).not.toHaveProperty("battlers");
      expect([...stage.playerSetIds, ...stage.opponentSetIds].every((id: number) => id >= 267 && id <= 371)).toBe(true);
      const all = [...stage.overrides.parties.player, ...stage.overrides.parties.opponent];
      expect(stage.overrides.parties.player).toHaveLength(3); expect(stage.overrides.parties.opponent).toHaveLength(3);
      expect(all.find((mon: any) => mon.species === 176)).toMatchObject({ level: 50, nature: 7, moves: [281,281,281,281], item: 198, abilitySlot: 0 });
      for (const mon of all) { expect(Object.keys(mon.ivs)).toHaveLength(6); expect(Object.keys(mon.evs)).toHaveLength(6); expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4); for (const key of ["hp", "status", "statStages", "volatile"]) expect(mon).not.toHaveProperty(key); }
      expect(stage.trace.segments.every((segment: any) => segment.frames > 0 && segment.buttons.every((button: string) => button === "A"))).toBe(true);
      expect(sha(config.scenario)).toBe(config.scenarioSha256);
    }
  });

  it("pins all 426 twice-fresh state/RGB rows through first inactive cleanup", () => {
    expect(fixture).toMatchObject({ schema: "yawn-bilateral-evidence/v1", status: "exact", coverageCredit: true,
      evidenceScope: { productionAnimationChanged: true, reducerAdded: true, typedSeamAdded: true, compositorAdded: true, framebufferLookupAdded: false, coveragePromotion: true, boundaryOrBarrierChanged: false, gameplayStateOwned: false, fullDenseRowsRetained: true, twiceFreshByteIdentical: true },
      acceptance: { sourceRows: 426, rawRgbRows: 426, productionFramebufferRows: 426, freshRuns: 2, deepInhaleStarts: [4,147], cloudCreates: [69,75,81], cloudDestroys: [134,140,146], audioStarts: [4,69,147], firstInactiveCleanupAge: 212 } });
    for (const key of ["audit", "probe", "evidenceReplay"]) expect(sha(fixture.source[key])).toBe(fixture.source[`${key}Sha256`]);
    for (const side of ["player-back", "opponent-front"]) {
      const config = fixture.orientations[side]; expect(config.repeatProbeJsonSha256).toBe(config.probeJsonSha256);
      expect(sha(config.denseState)).toBe(config.denseStateSha256); expect(sha(config.rawRgbArchive)).toBe(config.rawRgbArchiveSha256); expect(sha(config.changeMap)).toBe(config.changeMapSha256);
      const probe = JSON.parse(gunzipSync(readFileSync(config.denseState)).toString("utf8")); expect(probe.frames).toHaveLength(213); expect(probe.frames[0]).toMatchObject({ scriptOwner: "Move_YAWN", scriptOffset: 0 }); expect(probe.frames.at(-1)).toMatchObject({ animScriptActive: false, visualTaskCount: 0, soundTaskCount: 0 });
      expect(probe.frames.every((row: any) => row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512)).toBe(true);
    }
  });

  it("replays measured cloud, DeepInhale, audio, transfer, resource, RNG, and cleanup maps", () => {
    const summary = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.evidenceReplay], { encoding: "utf8" }));
    for (const side of ["player-back", "opponent-front"]) expect(summary[side]).toMatchObject({ sourceWindow: fixture.orientations[side].sourceWindow,
      lifecycle: { deepInhaleStarts: [4,147], cloudCreates: [69,75,81], cloudDestroys: [134,140,146], cloudPeak: 3 },
      latches: { hardwareOamEqualsPrecedingSoftware: "212/212", hardwareMatricesEqualPrecedingSoftware: "132/212", hardwarePaletteEqualsPrecedingFaded: "212/212", cloudHardwareMatrixEqualsPrecedingSource: "192/192" },
      state: { gameplayRngTransitions: [], animationRngTransitions: { first: 1, last: 212, count: 212, everyComparableRow: true }, partyRowsComplete: true }, resourceTags: { tag: 10242, palettePresent: { first: 1, last: 211, count: 211 }, tilePresent: { first: 1, last: 211, count: 211 } }, cleanup: { age: 212, active: false, visualTasks: 0, soundTasks: 0, cloudCount: 0, paletteTagPresent: false, tileTagPresent: false } });
    expect(summary["player-back"].audio.map((event: any) => [event.age,event.symbol])).toEqual([[4,"se_m_yawn"],[69,"se_m_spit_up"],[147,"se_m_yawn"]]);
  });

  it("promotes Yawn alone while Howl remains an independent DeepInhale control", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")); expect(coverage.entries.filter((entry: any) => entry.status === "exact")).toHaveLength(210); expect(coverage.entries.find((entry: any) => entry.move === "MOVE_YAWN")).toMatchObject({ status: "exact" }); expect(coverage.entries.find((entry: any) => entry.move === "MOVE_HOWL")).toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: any) => track.id === "pink-cloud-yawn-deep-inhale")).toMatchObject({ components: ["asset:ANIM_TAG_PINK_CLOUD", "sprite:gYawnCloudSpriteTemplate", "task:AnimTask_DeepInhale"], representatives: ["MOVE_YAWN", "MOVE_HOWL"], fulfilled: true });
  });
});
