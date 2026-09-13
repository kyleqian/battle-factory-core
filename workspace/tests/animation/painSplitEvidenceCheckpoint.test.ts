import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(readFileSync("tools/compare/fixtures/pain-split-evidence.json", "utf8")) as Record<string, any>;
const sha = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");

describe("MOVE_PAIN_SPLIT exact source and bilateral evidence", () => {
  it("pins the complete exclusive script, callbacks, literal resources, audio, and carrier", () => {
    const audit = JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/painSplitSourceAudit.ts"], { encoding: "utf8" }));
    expect(audit).toMatchObject({
      move: "MOVE_PAIN_SPLIT", moveId: 220, status: "unsupported-source-checkpoint",
      source: {
        moveScript: { start: "0x082cb739", endExclusive: "0x082cb7e1", bytes: 168, sha256: "176594e217e7f5116ce5fe1f7821bc109e8ba1d3b368c505b1cd47a93b32fb5b" },
        projectileCallback: { bytes: 196, sha256: "5b5ac6b83f234e067a8374082736385125da2abc38532d7ada6a44c6f450c989" },
        movementTask: { bytes: 360, sha256: "20bef8a7a8cb48888b0a82d4db6f7d01854673f661fc13da6005bab0c30e08dd" },
        gfx: { bytes: 228, sha256: "49f6797797ae8be44a8bc04dd8613f8c2fa2ce560bb44a889ee60384054cd3ea" },
        palette: { bytes: 40, sha256: "56bdc62c34971f80bd8ce1f30dab84e5241235da4bc251dab73f8534df57049e" },
        animCmds: { bytes: 16, sha256: "219a7d803f26b52ef200c291a38f063fa3f9f1147b5c6a6bfefb6b4dacc50c07" },
        template: { bytes: 24, sha256: "f98412cb508366957bf8de7b02406c0e223656b0ac014310f2fe983ad888e720" },
        oam: { bytes: 8, sha256: "46d14e09bb9232d2a2dd7ac9cb424327e2fb49639e1d867462fba45fa451f6ac" },
        audio: { bytes: 12, sha256: "37fb1e140fed978c3c8a106af089cda9b09fde809e623c6e7960926b26480a8d" },
      },
      components: ["asset:ANIM_TAG_PAIN_SPLIT", "sprite:gPainSplitProjectileSpriteTemplate", "task:AnimTask_PainSplitMovement"],
      projectileCreates: 6, movementTasks: 6, audioCues: 3,
      carrier: { setId: 374, label: "FRONTIER_MON_MISDREAVUS_1", species: 200 },
      ownership: { gpuRegisters: false, gameplayState: false },
    });
    expect(audit.scriptCommands).toHaveLength(22);
  });

  it("stages both orientations with complete legal parties and only ordinary inputs", () => {
    for (const side of ["player-back", "opponent-front"]) {
      const config = fixture.orientations[side]; const stage = JSON.parse(readFileSync(config.scenario, "utf8"));
      expect(stage).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 2 });
      expect(Object.keys(stage.overrides)).toEqual(["parties"]);
      expect(stage.overrides).not.toHaveProperty("battlers");
      expect(stage.playerSetIds.every((id: number) => id >= 267 && id <= 371)).toBe(true);
      expect(stage.opponentSetIds.every((id: number) => id >= 267 && id <= 371)).toBe(true);
      const all = [...stage.overrides.parties.player, ...stage.overrides.parties.opponent];
      expect(stage.overrides.parties.player).toHaveLength(3); expect(stage.overrides.parties.opponent).toHaveLength(3);
      expect(all.find((mon: any) => mon.species === 200)).toMatchObject({ level: 50, nature: 8, moves: [220,220,220,220], item: 196 });
      expect(all.find((mon: any) => mon.species === 94)).toMatchObject({ level: 50, nature: 10, moves: [101,101,101,101], item: 0 });
      for (const mon of all) {
        expect(Object.keys(mon.ivs)).toHaveLength(6); expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4); expect(mon.ppUps).toHaveLength(4);
        for (const transient of ["hp", "status", "statStages", "volatile"]) expect(mon).not.toHaveProperty(transient);
      }
      expect(stage.trace.segments.every((segment: any) => segment.frames > 0 && segment.buttons.every((button: string) => button === "A"))).toBe(true);
      expect(sha(config.scenario)).toBe(config.scenarioSha256);
    }
  });

  it("pins twice-fresh complete retained rows, natural HP difference, and cleanup", () => {
    expect(fixture).toMatchObject({
      schema: "pain-split-bilateral-evidence/v1", status: "exact", coverageCredit: true,
      evidenceScope: { productionAnimationChanged: true, reducerAdded: true, typedSeamAdded: true, compositorAdded: true, framebufferLookupAdded: false, coveragePromotion: true, boundaryOrBarrierChanged: false, gameplayStateOwned: false, fullDenseRowsRetained: true, twiceFreshByteIdentical: true },
      acceptance: { sourceRows: 162, rawRgbRows: 162, productionFramebufferRows: 162, freshRuns: 2, projectilePairStarts: [4,29,54], movementPairStarts: [16,41,66], audioStarts: [16,41,66], firstInactiveCleanupAge: 80 },
    });
    expect(sha(fixture.source.audit)).toBe(fixture.source.auditSha256);
    expect(sha(fixture.source.probe)).toBe(fixture.source.probeSha256);
    expect(sha(fixture.source.evidenceReplay)).toBe(fixture.source.evidenceReplaySha256);
    for (const side of ["player-back", "opponent-front"]) {
      const config = fixture.orientations[side];
      expect(config.repeatProbeJsonSha256).toBe(config.probeJsonSha256);
      expect(sha(config.denseState)).toBe(config.denseStateSha256);
      expect(sha(config.rawRgbArchive)).toBe(config.rawRgbArchiveSha256);
      expect(sha(config.changeMap)).toBe(config.changeMapSha256);
      const probe = JSON.parse(gunzipSync(readFileSync(config.denseState)).toString("utf8"));
      expect(probe.sourceWindow).toEqual(config.sourceWindow); expect(probe.frames).toHaveLength(81);
      expect(probe.frames[0]).toMatchObject({ scriptOwner: "Move_PAIN_SPLIT", scriptOffset: 0 });
      expect(probe.frames[0].battlers.player.hp).not.toBe(probe.frames[0].battlers.opponent.hp);
      expect(probe.frames.at(-1)).toMatchObject({ animScriptActive: false, visualTaskCount: 0, soundTaskCount: 0 });
      expect(probe.frames.every((row: any) => row.parties.player.length === 3 && row.parties.opponent.length === 3 && row.softwareOam.length === 128 && row.hardwareOam.length === 128 && row.softwareMatrices.length === 32 && row.hardwareMatrices.length === 32 && row.fadedPalette.length === 512 && row.hardwarePalette.length === 512)).toBe(true);
    }
  });

  it("replays raw RGB and pins the measured bilateral creation, audio, tag, and latch maps", () => {
    const output = execFileSync(process.execPath, ["--experimental-strip-types", fixture.source.evidenceReplay], { encoding: "utf8" });
    const summary = JSON.parse(output);
    for (const side of ["player-back", "opponent-front"]) {
      expect(summary[side]).toMatchObject({
        sourceWindow: fixture.orientations[side].sourceWindow,
        creation: { projectilePairStarts: [4,29,54], movementPairStarts: [16,41,66], projectilePeak: 2 },
        latches: { hardwareOamEqualsPrecedingSoftware: "80/80", hardwareMatricesEqualPrecedingSoftware: "77/80", hardwarePaletteEqualsPrecedingFaded: "80/80", attackerSourceMatrixChanges: [16,28,41,53,66,78], attackerHardwareMatrixChanges: [17,30,42,55,67,80], targetSourceMatrixChanges: [16,28,41,53,66,78], targetHardwareMatrixChanges: [17,30,42,55,67,80] },
        state: { painSplitPp: 19, gameplayRngTransitions: [], animationRngTransitions: { first: 1, last: 80, count: 80, everyComparableRow: true }, partyRowsComplete: true },
        resourceTags: { tag: 10239, palettePresent: { first: 1, last: 79, count: 79 }, tilePresent: { first: 1, last: 79, count: 79 } },
        cleanup: { age: 80, active: false, visualTasks: 0, soundTasks: 0, projectileCount: 0, painSplitPaletteTagPresent: false, painSplitTileTagPresent: false },
      });
      expect(summary[side].audio.map((event: any) => event.age)).toEqual([16,41,66]);
    }
  });

  it("retains Pain Split at the current exact coverage gate", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: any) => entry.status === "exact")).toHaveLength(251);
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_PAIN_SPLIT"))
      .toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: any) => track.id === "pain-split-projectile-affine")).toMatchObject({
      components: ["asset:ANIM_TAG_PAIN_SPLIT", "sprite:gPainSplitProjectileSpriteTemplate", "task:AnimTask_PainSplitMovement"],
      representatives: ["MOVE_PAIN_SPLIT"],
      fulfilled: true,
    });
  });
});
