import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const auditText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/bonemerangSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });

describe("MOVE_BONEMERANG source/component/carrier checkpoint", () => {
  it("pins the complete branchless root, direct projectile/lunge/shake bodies, and BONE ROM resources", () => {
    const first = auditText();
    expect(auditText()).toBe(first);
    expect(createHash("sha256").update(first).digest("hex")).toBe("92bbb8704fc25d7d59fc94a8e6f2f60ce12cd650046347970b769e49982977a3");
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({
      schema: "bonemerang-source-audit/v1", move: "MOVE_BONEMERANG", moveId: 155,
      status: "exact", coverageCredit: true,
      source: { pointerOwnedRoot: { symbol: "Move_BONEMERANG", nextDispatchLabel: "Move_BONE_CLUB", rom: { start: "0x082d17cc", endExclusive: "0x082d1820", byteLength: 84 }, branches: { directlyReachableBlocks: ["Move_BONEMERANG"], dispatchedBranches: [], complete: true } } },
      behavior: { move: { effect: "EFFECT_DOUBLE_HIT", power: 50, accuracy: 90, pp: 10, target: "MOVE_TARGET_SELECTED" }, bone: { arcHeights: [-40, 40] }, hit: { shake: { task: "AnimTask_ShakeMon", args: ["ANIM_TARGET", 5, 0, 5, 1] } } },
      resources: { bone: { tag: "ANIM_TAG_BONE", tagValue: 10000, tileBytes: 0x0200 }, impact: { tag: "ANIM_TAG_IMPACT", tileBytes: 0x0200 }, audio: { SE_M_VITAL_THROW: 122, SE_M_HORN_ATTACK: 166, SE_M_BONEMERANG: 187 } },
    });
    expect(audit.source.pointerOwnedRoot.commands).toEqual([
      "loadspritegfx ANIM_TAG_BONE", "loadspritegfx ANIM_TAG_IMPACT", "monbg ANIM_DEF_PARTNER", "splitbgprio ANIM_TARGET", "setalpha 12, 8",
      "playsewithpan SE_M_BONEMERANG, SOUND_PAN_ATTACKER", "createsprite gBonemerangSpriteTemplate, ANIM_ATTACKER, 2", "delay 20",
      "playsewithpan SE_M_HORN_ATTACK, SOUND_PAN_TARGET", "create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=0, y=0, relative_to=ANIM_TARGET, animation=1",
      "createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 5, 0, 5, 1", "delay 17", "playsewithpan SE_M_VITAL_THROW, SOUND_PAN_ATTACKER",
      "createsprite gHorizontalLungeSpriteTemplate, ANIM_ATTACKER, 2, 6, -4", "waitforvisualfinish", "clearmonbg ANIM_DEF_PARTNER", "blendoff", "end",
    ]);
    expect(Object.keys(audit.source.directBodies.callbacks)).toEqual(["AnimBonemerangProjectile", "AnimBonemerangProjectile_Step", "AnimBonemerangProjectile_End", "DoHorizontalLunge"]);
  });

  it("keeps the full eleven-component track fulfilled only by Bonemerang, its sole Level-50 Marowak carrier complete, and Bone Club/Rush outside Factory", () => {
    const audit = JSON.parse(auditText()) as Json;
    expect(audit.graph).toMatchObject({
      blocks: ["Move_BONEMERANG"],
      components: ["asset:ANIM_TAG_BONE", "asset:ANIM_TAG_IMPACT", "sprite:gBonemerangSpriteTemplate", "sprite:gHorizontalLungeSpriteTemplate", "task:AnimTask_ShakeMon", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:create_basic_hitsplat_sprite", "visualCommand:monbg", "visualCommand:setalpha", "visualCommand:splitbgprio"],
      unrepresented: [],
    });
    expect(audit.carriers).toMatchObject({ count: 1, lowest: { index: 387, label: "FRONTIER_MON_MAROWAK_1", species: "SPECIES_MAROWAK" }, outsideLevel50: [] });
    expect(audit.carriers.all.map((carrier: Json) => carrier.index)).toEqual([387]);
    expect(audit.controls).toMatchObject({ boneClub: { tier: "outsideFactory" }, boneRush: { tier: "outsideFactory" } });
    expect(audit.checkpoint).toMatchObject({ sourceAudit: true, completePointerOwnedRoot: true, completeReachableBranches: true, completeCarrierCensus: true, reproducibleBoneAsset: true, legalBilateralPartyOnlyStaging: true, oracleOrMgbaInvoked: true, compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: true, reducerAdded: true, typedSceneOnSeam: true, compositorAdded: true, framebufferAcceptance: true, coveragePromotion: true, componentTrackFulfilled: true, latchPromotion: true, unsupportedNoCreditBoundary: false });
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_BONEMERANG")).toMatchObject({ status: "exact" });
    expect(coverage.queue).toEqual(["MOVE_SHOCK_WAVE"]);
    expect(coverage.componentTracks.find((entry: Json) => entry.id === "bone-projectile-bonemerang")).toMatchObject({ representatives: ["MOVE_BONEMERANG"], fulfilled: true });
  });
});
