import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");
const readJson = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const auditText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/overheatSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 << 20 });
const verifyText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/verifyOverheatStaging.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 << 20 });

describe("MOVE_OVERHEAT authoritative source classification and legal bilateral Scene-ON staging", () => {
  it("pins the complete root, direct callback/resource graph, audio/cleanup, and every Factory carrier without credit", () => {
    const first = auditText();
    expect(auditText()).toBe(first);
    const receipt = readJson("tools/compare/fixtures/overheat-staging-receipt.json");
    expect(sha(first)).toBe(receipt.source.auditRunSha256);
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({
      schema: "overheat-source-audit/v1", move: "MOVE_OVERHEAT", moveId: 315, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      source: {
        pointerOwnedRoot: {
          symbol: "Move_OVERHEAT", nextDispatchLabel: "Move_HYDRO_CANNON",
          rom: { start: receipt.source.pointerOwnedRoot.start, endExclusive: receipt.source.pointerOwnedRoot.endExclusive, byteLength: receipt.source.pointerOwnedRoot.byteLength, romSha256: receipt.source.pointerOwnedRoot.romSha256 },
          branches: { directlyReachableBlocks: ["Move_OVERHEAT"], dispatchedBranches: [], complete: true },
        },
        commandSummary: {
          flameRows: 24, flameAngles: [0, 32, 64, 96, 128, 160, 192, 224], flameYRows: [-20, 0, 10],
          targetHitSplats: expect.any(Array), paletteBlends: expect.any(Array), visualTasks: expect.any(Array), audio: expect.any(Array), cleanup: expect.any(Array),
        },
        directBodies: {
          flame: { frameProgram: expect.any(Object), frameTable: expect.any(Object), template: expect.any(Object), start: expect.any(Object), step: expect.any(Object) },
          impact: { template: expect.any(Object), callback: expect.any(Object) },
          palettes: { template: expect.any(Object), start: expect.any(Object), step: expect.any(Object), alloc: expect.any(Object), free: expect.any(Object), copyUnfadedToBackup: expect.any(Object), copyUnfadedFromBackup: expect.any(Object), copyFadedToUnfaded: expect.any(Object) },
          shake: { start: expect.any(Object), step: expect.any(Object) }, runtimeCommands: expect.any(Object),
        },
      },
      graph: { blocks: ["Move_OVERHEAT"], coverage: { entryPresent: false, queueContainsMove: false, componentTrackPresent: false } },
      resources: { audio: { dragonRage: { id: 171 }, flameWheel2: { id: 145 }, firePunch: { id: 147 } } },
      behavior: { move: { effect: "EFFECT_OVERHEAT", power: 140, accuracy: 90, pp: 5, secondaryEffectChance: 100 }, monbg: "ANIM_DEF_PARTNER", alpha: [12, 18] },
      carriers: { factoryCount: 25, level50Count: 23, excludedOutsideLevel50: [874, 875], inventory: { frontierMonCount: 23, speciesCount: 15 } },
      checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, commandOrder: true, completeReachableVisualGraph: true, directTaskCallbackResourceBodies: true, fullFactoryCarrierCensus: true, completeLevel50CarrierCensus: true, legalBilateralPartyOnlyStaging: true, compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: false, rawRgbRetained: false, latchMeasured: false, durableLatchRowAdded: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, framebufferAcceptance: false, coveragePromotion: false, coverageEntryAdded: false, componentTrackFulfilled: false, queueChanged: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: true },
    });
    expect(audit.source.commands).toHaveLength(79);
    expect(audit.source.commandSummary.targetHitSplats).toHaveLength(4);
    expect(audit.source.commandSummary.paletteBlends).toHaveLength(5);
    expect(audit.source.commandSummary.visualTasks).toHaveLength(11);
    expect(audit.source.commandSummary.audio).toEqual(["playsewithpan SE_M_DRAGON_RAGE, SOUND_PAN_ATTACKER", "playsewithpan SE_M_FLAME_WHEEL2, SOUND_PAN_ATTACKER", "playsewithpan SE_M_FIRE_PUNCH, SOUND_PAN_TARGET", "playsewithpan SE_M_FIRE_PUNCH, SOUND_PAN_TARGET", "playsewithpan SE_M_FIRE_PUNCH, SOUND_PAN_TARGET", "playsewithpan SE_M_FIRE_PUNCH, SOUND_PAN_TARGET"]);
    expect(audit.source.commandSummary.cleanup).toEqual(["clearmonbg ANIM_DEF_PARTNER", "blendoff", "waitforvisualfinish", "delay 15", "createvisualtask AnimTask_CopyPalUnfadedFromBackup, 5, 1, 0", "simple_palette_blend selector=F_PAL_ATTACKER, delay=0, initial_blend_y=13, target_blend_y=0, color=RGB(18, 18, 18)", "createvisualtask AnimTask_FreeBackupPalBuffer, 5", "waitforvisualfinish", "end"]);
    expect(audit.graph.components).toEqual(["asset:ANIM_TAG_IMPACT", "asset:ANIM_TAG_SMALL_EMBER", "task:AnimTask_AllocBackupPalBuffer", "task:AnimTask_CopyPalFadedToUnfaded", "task:AnimTask_CopyPalUnfadedFromBackup", "task:AnimTask_CopyPalUnfadedToBackup", "task:AnimTask_FreeBackupPalBuffer", "task:AnimTask_ShakeMon", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_basic_hitsplat_sprite", "visualCommand:create_overheat_flame_sprite", "visualCommand:monbg", "visualCommand:setalpha", "visualCommand:simple_palette_blend"]);
    expect(audit.carriers.allFactory.map((entry: Json) => entry.index)).toEqual([299, 328, 337, 357, 474, 589, 611, 618, 636, 643, 647, 656, 685, 707, 714, 718, 732, 739, 742, 743, 752, 769, 791, 874, 875]);
    expect(audit.carriers.level50.map((entry: Json) => entry.index)).toEqual([299, 328, 337, 357, 474, 589, 611, 618, 636, 643, 647, 656, 685, 707, 714, 718, 732, 739, 742, 743, 752, 769, 791]);
    expect(Object.keys(audit.controls.named).sort()).toEqual(["MOVE_BLAST_BURN", "MOVE_FIRE_PUNCH", "MOVE_OUTRAGE", "MOVE_PSYCHO_BOOST"]);
  });

  it("keeps compact party-before-init orientations twice-fresh and explicitly outside every presentation-credit boundary", () => {
    const receipt = readJson("tools/compare/fixtures/overheat-staging-receipt.json");
    expect(receipt).toMatchObject({
      schema: "overheat-compact-staging-receipt/v1", oracleProfile: "battle-scene-on", status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      factoryLegalSelection: { playerBackCarrier: { setId: 328, name: "FRONTIER_MON_SOLROCK_2", species: 349 }, opponentFrontCarrier: { setId: 299, name: "FRONTIER_MON_MAGCARGO_2", species: 219 }, partyBeforeInit: true, excludedOutsideLevel50: [874, 875] },
      freshness: { check: "tools/check-oracle-freshness.sh", exitCode: 2, sharedOracleCaptureUsed: false, localMgbaWrapper: "tools/run-mgba-probe.py" },
      scope: { framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false, latchMeasured: false, durableLatchRowAdded: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, coveragePromotion: false, coverageEntryAdded: false, componentTrackFulfilled: false, battleStateInjected: false, transientOverrides: [], boundaryOrBarrierChanged: false, noTimingOrLatchTransfer: true },
    });
    expect(receipt.runs["player-back"]).toMatchObject({ freshRuns: 2, outputsByteIdentical: true, outputSha256: "7b31b91543b0261b14e16a4cbf2fe3a9ca5e8db6c428ba1a2724212baef64525", output: { attacker: { side: "player", species: 349 }, target: { side: "opponent", species: 213, finalHp: 110 }, root: { symbol: "Move_OVERHEAT", observations: 229 }, pp: { spent: 1 }, cleanup: { visualTasks: 0, soundTasks: 0 }, benches: { unchanged: true, checksumValid: true } } });
    expect(receipt.runs["opponent-front"]).toMatchObject({ freshRuns: 2, outputsByteIdentical: true, outputSha256: "14e5f7547ac3cedcab866273b0ad729d6d16f15a739a65ef864d337fa2095a99", output: { attacker: { side: "opponent", species: 219 }, target: { side: "player", species: 213, finalHp: 90 }, root: { symbol: "Move_OVERHEAT", observations: 229 }, pp: { spent: 1 }, cleanup: { visualTasks: 0, soundTasks: 0 }, benches: { unchanged: true, checksumValid: true } } });
    const first = verifyText();
    expect(verifyText()).toBe(first);
    expect(JSON.parse(first)).toEqual({
      schema: "overheat-source-staging-verifier/v1",
      auditRunSha256: receipt.source.auditRunSha256,
      runs: {
        "player-back": { outputSha256: "7b31b91543b0261b14e16a4cbf2fe3a9ca5e8db6c428ba1a2724212baef64525", rootObservations: 229, ppSpent: 1 },
        "opponent-front": { outputSha256: "14e5f7547ac3cedcab866273b0ad729d6d16f15a739a65ef864d337fa2095a99", rootObservations: 229, ppSpent: 1 },
      },
    });
    const coverage = readJson("ANIMATION_COVERAGE.json");
    expect(coverage.entries.some((entry: Json) => entry.move === "MOVE_OVERHEAT")).toBe(false);
    expect(coverage.queue).not.toContain("MOVE_OVERHEAT");
    expect(coverage.componentTracks.some((track: Json) => track.representatives?.includes("MOVE_OVERHEAT"))).toBe(false);
  });
});
