import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const auditText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/signalBeamSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });

describe("MOVE_SIGNAL_BEAM source/component/carrier checkpoint", () => {
  it("pins the complete root/subroutine, direct wave/palette/shake/pan bodies, and reproducible orb resources", () => {
    const first = auditText();
    expect(auditText()).toBe(first);
    expect(createHash("sha256").update(first).digest("hex")).toBe("a7586d2f3420c444f53a97611f4e4ee4a7a03519ffaabcf7c55066c4012eb664");
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({
      schema: "signal-beam-source-audit/v1", move: "MOVE_SIGNAL_BEAM", moveId: 324,
      status: "exact", coverageCredit: true,
      source: { pointerOwnedRoot: { symbol: "Move_SIGNAL_BEAM", nextDispatchLabel: "Move_ABSORB", rom: { start: "0x082d0eb2", endExclusive: "0x082d0f9a", byteLength: 232 }, branches: { directlyReachableBlocks: ["Move_SIGNAL_BEAM", "SignalBeamOrbs"], dispatchedBranches: [], complete: true } } },
      behavior: { move: { effect: "EFFECT_CONFUSE_HIT", power: 75, accuracy: 100, pp: 15, secondaryEffectChance: 10, target: "MOVE_TARGET_SELECTED" }, stream: { pairsBeforeTargetPalette: 6, pairsAfterTargetPalette: 17, totalPairs: 23, redSprites: 23, greenSprites: 23 }, sinusTimer: { duration: 100, increment: 3, waveDuration: 30 }, targetPalette: { selector: "F_PAL_TARGET", delay: 8, numBlends: 5 }, audio: { sound: "SE_M_BUBBLE_BEAM", soundId: 182 }, bgAndRegisters: { directBgCommands: [], directRegisterCommands: [] } },
      resources: { ANIM_TAG_DUCK: { tagValue: 10073, tileBytes: 384 }, ANIM_TAG_GLOWY_RED_ORB: { tagValue: 10264, tileBytes: 32 }, ANIM_TAG_GLOWY_GREEN_ORB: { tagValue: 10265, tileBytes: 32 } },
    });
    expect(audit.source.pointerOwnedRoot.blocks.Move_SIGNAL_BEAM.commands).toHaveLength(34);
    expect(audit.source.pointerOwnedRoot.blocks.SignalBeamOrbs.commands).toEqual([
      "createsprite gSignalBeamRedOrbSpriteTemplate, ANIM_TARGET, 3, 10, 10, 0, 16",
      "createsprite gSignalBeamGreenOrbSpriteTemplate, ANIM_TARGET, 3, 10, 10, 0, -16",
      "delay 1", "return",
    ]);
    expect(Object.keys(audit.source.directBodies.callbacks)).toEqual(["AnimToTargetInSinWave", "AnimToTargetInSinWave_Step", "AnimComplexPaletteBlend", "AnimComplexPaletteBlend_Step1", "AnimComplexPaletteBlend_Step2", "Task_PanFromInitialToTarget"]);
    expect(Object.keys(audit.source.directBodies.tasks)).toEqual(["AnimTask_ShakeMon", "AnimTask_ShakeMon_Step", "AnimTask_StartSinAnimTimer", "AnimTask_RunSinAnimTimer"]);
  });

  it("fulfills the ten-component track only through Signal Beam while pinning the whole Level-50 census", () => {
    const audit = JSON.parse(auditText()) as Json;
    expect(audit.graph).toMatchObject({
      blocks: ["Move_SIGNAL_BEAM", "SignalBeamOrbs"],
      components: ["asset:ANIM_TAG_DUCK", "asset:ANIM_TAG_GLOWY_GREEN_ORB", "asset:ANIM_TAG_GLOWY_RED_ORB", "sprite:gSignalBeamGreenOrbSpriteTemplate", "sprite:gSignalBeamRedOrbSpriteTemplate", "subroutine:SignalBeamOrbs", "task:AnimTask_ShakeMon", "task:AnimTask_StartSinAnimTimer", "visualCommand:complex_palette_blend", "visualCommand:panse"],
    });
    expect(audit.carriers).toMatchObject({ count: 5, lowestLegal: { index: 160, label: "FRONTIER_MON_ARIADOS", species: "SPECIES_ARIADOS" }, excludedOutsideLevel50: [27] });
    expect(audit.carriers.allSourceCarriers.map((carrier: Json) => carrier.index)).toEqual([27, 160, 161, 277, 331, 680]);
    expect(audit.carriers.level50.map((carrier: Json) => carrier.index)).toEqual([160, 161, 277, 331, 680]);
    expect(audit.checkpoint).toMatchObject({ sourceAudit: true, completePointerOwnedRoot: true, completeReachableBranches: true, completeCarrierCensus: true, reproducibleResources: true, legalBilateralPartyOnlyStaging: true, oracleOrMgbaInvoked: true, compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: true, latchMeasured: true, reducerAdded: true, typedSceneOnSeam: true, compositorAdded: true, framebufferAcceptance: true, coveragePromotion: true, componentTrackFulfilled: true, latchPromotion: false, unsupportedNoCreditBoundary: false });
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_SIGNAL_BEAM")).toMatchObject({ status: "exact" });
    expect(coverage.queue).not.toContain("MOVE_SIGNAL_BEAM");
    expect(coverage.componentTracks.find((entry: Json) => entry.id === "signal-beam-orb-stream")).toMatchObject({ representatives: ["MOVE_SIGNAL_BEAM"], fulfilled: true });
  });
});
