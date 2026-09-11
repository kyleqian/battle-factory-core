import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const auditText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/airCutterSourceAudit.ts"], {
  cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
});

describe("MOVE_AIR_CUTTER source/component/carrier checkpoint", () => {
  it("pins the complete pointer-owned script, direct unique task/slice bodies, and exact source command order", () => {
    const first = auditText();
    expect(auditText()).toBe(first);
    expect(sha(first)).toBe("f22fcafc93962d40ade66c608296008e9d27d7cd2a576479d490eb4a66f285a4");
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({
      schema: "air-cutter-source-audit/v1", move: "MOVE_AIR_CUTTER", moveId: 314,
      status: "unsupported-source-classification-checkpoint", coverageCredit: false,
      source: { pointerOwnedRoot: {
        symbol: "Move_AIR_CUTTER", nextDispatchLabel: "Move_ODOR_SLEUTH",
        rom: { start: "0x082ced58", endExclusive: "0x082cedba", byteLength: 98 },
      } },
    });
    expect(audit.source.scriptNodes.Move_AIR_CUTTER.commands).toEqual([
      "loadspritegfx ANIM_TAG_AIR_WAVE", "loadspritegfx ANIM_TAG_CUT", "loadspritegfx ANIM_TAG_IMPACT", "delay 0",
      "monbg ANIM_DEF_PARTNER", "setalpha 12, 8", "delay 0",
      "createvisualtask AnimTask_AirCutterProjectile, 2, 32, -24, 6 * 256, 2, 128",
      "waitforvisualfinish", "playsewithpan SE_M_CUT, SOUND_PAN_TARGET",
      "createsprite gAirCutterSliceSpriteTemplate, ANIM_ATTACKER, 2, 40, -32, 0, 2", "delay 5",
      "createvisualtask AnimTask_ShakeMon2, 2, ANIM_TARGET, 2, 0, 8, 1",
      "createvisualtask AnimTask_ShakeMon2, 2, ANIM_DEF_PARTNER, 2, 0, 8, 1",
      "waitforvisualfinish", "blendoff", "clearmonbg ANIM_DEF_PARTNER", "delay 0", "end",
    ]);
    expect(Object.keys(audit.source.directBodies.templates).sort()).toEqual(["gAirCutterSliceSpriteTemplate", "gAirWaveProjectileSpriteTemplate"]);
    expect(Object.keys(audit.source.directBodies.tasks).sort()).toEqual([
      "AirCutterProjectileStep1", "AirCutterProjectileStep2", "AnimTask_AirCutterProjectile", "AnimTask_ShakeMon2", "AnimTask_ShakeMon2_Step",
    ]);
  });

  it("keeps the triple's source classification honest: two unique mechanisms, a Sonic Boom asset control, and no shared-credit claim", () => {
    const audit = JSON.parse(auditText()) as Json;
    expect(audit.graph).toMatchObject({
      blocks: ["Move_AIR_CUTTER"],
      components: [
        "asset:ANIM_TAG_AIR_WAVE", "asset:ANIM_TAG_CUT", "asset:ANIM_TAG_IMPACT",
        "sprite:gAirCutterSliceSpriteTemplate", "task:AnimTask_AirCutterProjectile", "task:AnimTask_ShakeMon2",
        "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:setalpha",
      ],
      exclusiveToAirCutter: ["sprite:gAirCutterSliceSpriteTemplate", "task:AnimTask_AirCutterProjectile"],
      projectileTrack: { id: "air-cutter-projectile", components: ["asset:ANIM_TAG_AIR_WAVE", "sprite:gAirCutterSliceSpriteTemplate", "task:AnimTask_AirCutterProjectile"], singletonRepresentative: "MOVE_AIR_CUTTER" },
    });
    expect(audit.graph.componentUsers["asset:ANIM_TAG_AIR_WAVE"]).toEqual(["MOVE_SONIC_BOOM", "MOVE_AIR_CUTTER"]);
    expect(audit.graph.componentUsers["sprite:gAirCutterSliceSpriteTemplate"]).toEqual(["MOVE_AIR_CUTTER"]);
    expect(audit.graph.componentUsers["task:AnimTask_AirCutterProjectile"]).toEqual(["MOVE_AIR_CUTTER"]);
    expect(audit.coverageBoundary).toMatchObject({ moveEntryPresent: false, componentTrackFulfilled: false });
  });

  it("pins all legal Level-50 carriers and preserves the unsupported evidence-only boundary", () => {
    const audit = JSON.parse(auditText()) as Json;
    expect(audit.carriers).toMatchObject({
      count: 4,
      lowest: { index: 231, label: "FRONTIER_MON_GOLBAT_1", species: "SPECIES_GOLBAT", moves: ["MOVE_AIR_CUTTER", "MOVE_CONFUSE_RAY", "MOVE_TOXIC", "MOVE_STEEL_WING"] },
      openOnly: { inventoryEntry: null, carrierDifference: [], openCarriersAlsoLevel50: [386, 649] },
    });
    expect(audit.carriers.all.map((carrier: Json) => carrier.index)).toEqual([231, 336, 386, 649]);
    expect(audit.carriers.lowerTierOnly).toEqual([]);
    expect(audit.checkpoint).toMatchObject({
      sourceAudit: true, completeCarrierCensus: true, oracleOrMgbaInvoked: false, denseWindowCaptured: false,
      reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, framebufferAcceptance: false,
      coveragePromotion: false, componentTrackFulfilled: false, unsupportedNoCreditBoundary: true,
    });
  });
});
