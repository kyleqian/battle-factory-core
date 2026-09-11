import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const auditText = (): string => execFileSync(process.execPath, [
  "--experimental-strip-types", "tools/compare/sheerColdSourceAudit.ts",
], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });

describe("MOVE_SHEER_COLD source/component/carrier checkpoint", () => {
  it("pins the complete branchless pointer-owned root, FrozenIceCube callback chain, and source resources", () => {
    const first = auditText();
    expect(auditText()).toBe(first);
    expect(sha(first)).toBe("2b46feb7282451b0cdce29fa632997a672d642071978ea87b020270a2e8f28bf");
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({
      schema: "sheer-cold-source-audit/v1", move: "MOVE_SHEER_COLD", moveId: 329,
      status: "unsupported-source-legal-staging-checkpoint", coverageCredit: false,
      source: { pointerOwnedRoot: {
        symbol: "Move_SHEER_COLD", nextDispatchLabel: "Move_ARM_THRUST",
        rom: { start: "0x082d5242", endExclusive: "0x082d5267", byteLength: 37 },
        branches: { directlyReachableBlocks: ["Move_SHEER_COLD"], dispatchedBranches: [], complete: true },
      } },
      behavior: {
        move: { effect: "EFFECT_OHKO", power: 1, accuracy: 30, pp: 5, target: "MOVE_TARGET_SELECTED" },
        ohko: { resultFlags: { missed: 1, oneHitKo: 16 } },
        frozenIceCube: { targetAnchor: { x: "BATTLER_COORD_X_2 - 32", y: "BATTLER_COORD_Y_PIC_OFFSET - 36" } },
      },
      resources: {
        iceCube: { tag: "ANIM_TAG_ICE_CUBE", tagValue: 10010, tileBytes: 0x1200 },
        iceBackground: { id: "BG_ICE", idValue: 15 },
      },
    });
    expect(audit.source.pointerOwnedRoot.commands).toEqual([
      "fadetobg BG_ICE", "waitbgfadeout", "playsewithpan SE_M_ICY_WIND, 0", "waitbgfadein",
      "loadspritegfx ANIM_TAG_ICE_CUBE", "monbg ANIM_DEF_PARTNER", "splitbgprio ANIM_TARGET", "setalpha 12, 8",
      "createvisualtask AnimTask_FrozenIceCube, 2", "waitplaysewithpan SE_M_HAIL, SOUND_PAN_TARGET, 17",
      "waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "restorebg", "waitbgfadein", "end",
    ]);
    expect(Object.keys(audit.source.directBodies.tasks)).toEqual([
      "AnimTask_FrozenIceCube", "AnimTask_FrozenIceCube_Step1", "AnimTask_FrozenIceCube_Step2",
      "AnimTask_FrozenIceCube_Step3", "AnimTask_FrozenIceCube_Step4",
    ]);
    expect(audit.source.ohkoResolution.pointerOwnedBattleScript).toMatchObject({
      symbol: "BattleScript_EffectOHKO", nextDispatchLabel: "BattleScript_EffectRazorWind",
      rom: { start: "0x082d8fe7", endExclusive: "0x082d9018", byteLength: 49 },
      branches: [
        "BattleScript_ButItFailed via accuracycheck",
        "BattleScript_HitFromAtkAnimation via no-effect or successful tryKO",
        "BattleScript_KOFail via unsuccessful tryKO",
      ],
    });
  });

  it("keeps the two newly ranked components move-owned, checks every Level-50 carrier, and grants Ice Punch no credit", () => {
    const audit = JSON.parse(auditText()) as Json;
    expect(audit.graph).toMatchObject({
      blocks: ["Move_SHEER_COLD"],
      components: [
        "asset:ANIM_TAG_ICE_CUBE", "task:AnimTask_FrozenIceCube", "visualCommand:blendoff",
        "visualCommand:clearmonbg", "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg",
        "visualCommand:setalpha", "visualCommand:splitbgprio", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout",
      ],
      newTrack: { id: "ice-cube-frozen-ice-cube", components: ["asset:ANIM_TAG_ICE_CUBE", "task:AnimTask_FrozenIceCube"], singletonRepresentative: "MOVE_SHEER_COLD" },
      componentUsers: {
        "asset:ANIM_TAG_ICE_CUBE": ["MOVE_SHEER_COLD"],
        "task:AnimTask_FrozenIceCube": ["MOVE_SHEER_COLD"],
      },
    });
    expect(audit.carriers).toMatchObject({
      count: 6,
      lowest: { index: 584, label: "FRONTIER_MON_DEWGONG_3", species: "SPECIES_DEWGONG" },
      outsideLevel50: [],
      openOnly: { inventoryEntry: null, carrierDifference: [], openCarriersAlsoLevel50: [584, 644, 680, 740, 822, 823] },
    });
    expect(audit.carriers.all.map((carrier: Json) => carrier.index)).toEqual([584, 644, 680, 740, 822, 823]);
    expect(audit.controls.icePunch).toMatchObject({ status: "exact", credit: expect.stringContaining("no Sheer Cold") });
    expect(audit.checkpoint).toMatchObject({
      sourceAudit: true, completePointerOwnedRoot: true, completeReachableBranches: true, completeCarrierCensus: true,
      legalBilateralPartyOnlyStaging: true, oracleOrMgbaInvoked: true,
      compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: false,
      reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, framebufferAcceptance: false,
      coveragePromotion: false, componentTrackFulfilled: false, latchPromotion: false, unsupportedNoCreditBoundary: true,
    });

    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries).toHaveLength(248);
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_SHEER_COLD")?.status ?? "unsupported").toBe("unsupported");
    expect(coverage.componentTracks.find((entry: Json) => entry.id === "ice-cube-frozen-ice-cube")).toMatchObject({
      representatives: ["MOVE_SHEER_COLD"], fulfilled: false, evidence: [
        "tools/compare/sheerColdSourceAudit.ts",
        "tools/battle-lab/mechanic-sheer-cold-player-dewgong-opponent-chansey.json",
        "tools/battle-lab/mechanic-sheer-cold-opponent-dewgong-player-chansey.json",
        "tools/compare/sheerColdStagingProbe.py",
        "tools/compare/fixtures/sheer-cold-staging-receipt.json",
        "tools/compare/verifySheerColdStaging.ts",
      ],
    });
  });
});
