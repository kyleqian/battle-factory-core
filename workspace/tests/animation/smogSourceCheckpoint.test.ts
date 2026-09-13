import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const auditText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/smogSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });

describe("MOVE_SMOG source/component/carrier checkpoint", () => {
  it("pins the complete odd-root interval, both source blocks, cloud frame/callback graph, blend task, audio, resources, and cleanup", () => {
    const first = auditText();
    expect(auditText()).toBe(first);
    expect(createHash("sha256").update(first).digest("hex")).toBe("06b37df68b6a10558808187ef95071b5cf5e723233a5d7e43488c4d943e8bf5f");
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({
      schema: "smog-source-audit/v1", move: "MOVE_SMOG", moveId: 123, status: "exact", coverageCredit: true,
      source: { pointerOwnedRoot: { symbol: "Move_SMOG", nextDispatchLabel: "Move_FAINT_ATTACK", rom: { start: "0x082d01e5", endExclusive: "0x082d0260", byteLength: 123, romSha256: "a21d2fd5098afec42310a94a76bc1bc13c279f04eea941a0da5f6106668c6def" }, branches: { directlyReachableBlocks: ["Move_SMOG", "SmogCloud"], dispatchedBranches: [], complete: true } } },
      behavior: { move: { effect: "EFFECT_POISON_HIT", power: 20, accuracy: 70, pp: 20, secondaryEffectChance: 40, target: "MOVE_TARGET_SELECTED" }, clouds: { calls: 7, args: [0, -24, 48, 240, 1, 0], frameData: [[0, 8], [8, 8]], callback: "InitSwirlingFogAnim -> AnimSwirlingFogAnim" }, blendCycle: { priority: 2, selector: "F_PAL_TARGET", delay: 2, numBlends: 2, initialBlendY: 0, targetBlendY: 12, color: "RGB(26, 0, 26)" }, shake: { task: "AnimTask_ShakeMon2", args: ["ANIM_TARGET", 2, 0, 15, 1] }, monbg: { setup: "ANIM_DEF_PARTNER", split: "splitbgprio_all", alpha: [12, 8], cleanup: ["waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "end"] } },
      resources: { purpleGasCloud: { tag: "ANIM_TAG_PURPLE_GAS_CLOUD", tagValue: 10172, tileBytes: 0x0200 }, audio: { SE_M_MIST: { id: 168, schedule: [17, 10] }, SE_M_TOXIC: { id: 148, schedule: [18, 2] } } },
    });
    expect(audit.source.blocks.Move_SMOG.rom).toMatchObject({ start: "0x082d01e5", endExclusive: "0x082d024a", byteLength: 101, romSha256: "e0b5b823b962e19a949d385e36ce95a61bdd4b0280145ab08b2386798c0a022d" });
    expect(audit.source.blocks.SmogCloud.rom).toMatchObject({ start: "0x082d024a", endExclusive: "0x082d0260", byteLength: 22, romSha256: "166cd2e6944f3285fff0bc72d1076296b02c7dc59b93b40cce4098b54e28ed6d" });
    expect(audit.source.blocks.Move_SMOG.commands.filter((command: string) => command === "call SmogCloud")).toHaveLength(7);
    expect(audit.source.blocks.SmogCloud.commands).toEqual(["createsprite gSmogCloudSpriteTemplate, ANIM_ATTACKER, 2, 0, -24, 48, 240, 1, 0", "delay 7", "return"]);
  });

  it("keeps the exact ten-component graph source-audited, the sole Level-50 Magby carrier accepted, and controls independent", () => {
    const audit = JSON.parse(auditText()) as Json;
    expect(audit.graph).toMatchObject({
      blocks: ["Move_SMOG", "SmogCloud"],
      components: ["asset:ANIM_TAG_PURPLE_GAS_CLOUD", "sprite:gSmogCloudSpriteTemplate", "subroutine:SmogCloud", "task:AnimTask_ShakeMon2", "visualCommand:blend_color_cycle", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:setalpha", "visualCommand:splitbgprio_all"],
      track: { id: "smog-purple-gas-cloud", representatives: ["MOVE_SMOG"], fulfilled: true },
    });
    expect(audit.carriers).toMatchObject({ count: 1, lowest: { index: 149, label: "FRONTIER_MON_MAGBY", species: "SPECIES_MAGBY" }, outsideLevel50: [] });
    expect(audit.carriers.all.map((carrier: Json) => carrier.index)).toEqual([149]);
    expect(audit.controls).toMatchObject({ poisonGas: { tier: "outsideFactory", shares: ["asset:ANIM_TAG_PURPLE_GAS_CLOUD"], distinctTemplate: "gPoisonGasCloudSpriteTemplate", distinctCallback: "InitPoisonGasCloudAnim -> MovePoisonGasCloud", factoryCredit: false }, acid: { status: "exact" }, grudge: { status: "exact" } });
    expect(audit.checkpoint).toMatchObject({ sourceAudit: true, completePointerOwnedRoot: true, completeReachableBranches: true, completeCarrierCensus: true, legalBilateralPartyOnlyStaging: true, oracleOrMgbaInvoked: true, compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: true, reducerAdded: true, typedSceneOnSeam: true, compositorAdded: true, framebufferAcceptance: true, coveragePromotion: true, componentTrackFulfilled: true, latchPromotion: true, unsupportedNoCreditBoundary: false });
  });
});
