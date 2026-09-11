import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;

const root = resolve(import.meta.dirname, "../..");
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const auditText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/digSourceAudit.ts"], {
  cwd: root,
  encoding: "utf8",
});

function expectSourceAndRom(record: Json): void {
  expect(record.source).toMatchObject({ path: expect.any(String), start: expect.any(Number), endExclusive: expect.any(Number), byteLength: expect.any(Number), sha256: expect.stringMatching(/^[a-f0-9]{64}$/u) });
  expect(record.source.endExclusive).toBeGreaterThan(record.source.start);
  expect(record.rom).toMatchObject({ start: expect.stringMatching(/^0x08[0-9a-f]{6}$/u), endExclusive: expect.stringMatching(/^0x08[0-9a-f]{6}$/u), byteLength: expect.any(Number), romSha256: expect.stringMatching(/^[a-f0-9]{64}$/u) });
  expect(record.rom.byteLength).toBeGreaterThan(0);
}

describe("MOVE_DIG source/component/carrier checkpoint", () => {
  it("pins the complete dispatch-owned root, all reachable Dig script/task/template bodies, and two-turn branch bytes", () => {
    const first = auditText();
    expect(auditText()).toBe(first);
    expect(sha(first)).toBe("659b169c0e7f14cd6d9198ff1b8b6c2cf0300e65c1558ed928c95d2b0e63cb56");
    const audit = JSON.parse(first) as Json;

    expect(audit).toMatchObject({
      schema: "dig-source-audit/v1",
      move: "MOVE_DIG",
      moveId: 91,
      status: "unsupported-source-classification-checkpoint",
      coverageCredit: false,
      source: {
        pointerOwnedRoot: {
          symbol: "Move_DIG",
          nextDispatchLabel: "Move_MEDITATE",
          source: { path: "data/battle_anim_scripts.s", start: 106379, endExclusive: 107995, byteLength: 1616, sha256: "ba34bf8399ca011c5747a491b4e0ea155477fd4dfb0dcf47a6385894205dd545" },
          rom: { start: "0x082ccca1", endExclusive: "0x082ccdbd", byteLength: 284, romSha256: "009ec5d14cb0611deb4495788bfee577ad9072e3dabd7af0550c085de80f72a6" },
        },
        twoTurnRouting: {
          encoding: { opcode: 17, evenPointer: "0x082cccab", oddPointer: "0x082ccd06" },
          branch: { bit: "gAnimMoveTurn & 1", even: "DigSetUp", odd: "DigUnleash" },
        },
      },
      graph: {
        blocks: ["Move_DIG", "DigSetUp", "DigUnleash", "DigThrowDirt", "DigEnd"],
        sharedWithExactFissure: ["asset:ANIM_TAG_MUD_SAND", "sprite:gDirtPlumeSpriteTemplate"],
      },
    });
    expect(audit.source.scriptNodes.DigSetUp.commands).toEqual([
      "loadspritegfx ANIM_TAG_MUD_SAND", "loadspritegfx ANIM_TAG_DIRT_MOUND",
      "createsprite gDirtMoundSpriteTemplate, ANIM_ATTACKER, 1, 0, 0, 180",
      "createsprite gDirtMoundSpriteTemplate, ANIM_ATTACKER, 1, 0, 1, 180",
      "monbg_static ANIM_ATTACKER", "delay 1", "createvisualtask AnimTask_DigDownMovement, 2, FALSE", "delay 6",
      "call DigThrowDirt", "call DigThrowDirt", "call DigThrowDirt", "call DigThrowDirt", "call DigThrowDirt",
      "waitforvisualfinish", "clearmonbg_static ANIM_ATTACKER", "delay 1", "createvisualtask AnimTask_DigDownMovement, 2, TRUE", "goto DigEnd",
    ]);
    expect(audit.source.scriptNodes.DigUnleash.commands).toContain("create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=-8, y=0, relative_to=ANIM_TARGET, animation=2");
    expect(audit.source.scriptNodes.DigUnleash.commands).toContain("createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 5, 0, 6, 1");
    expect(audit.source.scriptNodes.DigThrowDirt.commands).toEqual([
      "createsprite gDirtPlumeSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 12, 4, -16, 18",
      "createsprite gDirtPlumeSpriteTemplate, ANIM_ATTACKER, 2, 0, 0, 16, 4, -10, 18",
      "createsprite gDirtPlumeSpriteTemplate, ANIM_ATTACKER, 2, 0, 1, 14, 4, -18, 18",
      "createsprite gDirtPlumeSpriteTemplate, ANIM_ATTACKER, 2, 0, 1, 12, 4, -16, 18",
      "playsewithpan SE_M_DIG, SOUND_PAN_ATTACKER", "delay 32", "return",
    ]);

    for (const record of Object.values(audit.source.scriptNodes) as Json[]) expectSourceAndRom(record);
    for (const group of Object.values(audit.source.directBodies) as Json[]) {
      for (const record of Object.values(group) as Json[]) expectSourceAndRom(record);
    }
    expect(Object.keys(audit.source.directBodies.templates).sort()).toEqual([
      "gBasicHitSplatSpriteTemplate", "gDirtMoundSpriteTemplate", "gDirtPlumeSpriteTemplate",
    ]);
    expect(Object.keys(audit.source.directBodies.tasks).sort()).toEqual([
      "AnimTask_DigBounceMovement", "AnimTask_DigDownMovement", "AnimTask_DigEndBounceMovementSetInvisible",
      "AnimTask_DigRiseUpFromHole", "AnimTask_DigSetVisibleUnderground", "AnimTask_DigUpMovement",
      "AnimTask_ShakeMon", "AnimTask_ShakeMon_Step", "SetDigScanlineEffect",
    ]);
  });

  it("regenerates only the source-derived DIRT_MOUND asset and preserves exact source identities for MUD_SAND and IMPACT", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-dig-assets-"));
    const firstOut = join(scratch, "first.json");
    const secondOut = join(scratch, "second.json");
    for (const out of [firstOut, secondOut]) {
      execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractDigAssets.ts", "--out", out], { cwd: root, encoding: "utf8" });
    }
    const first = readFileSync(firstOut, "utf8");
    const committed = readFileSync(resolve(root, "src/animation/assets/dig-dirt-mound.json"), "utf8");
    expect(readFileSync(secondOut, "utf8")).toBe(first);
    expect(committed).toBe(first);
    expect(sha(first)).toBe("eea7430a978bce7c995a7dbd0edcc26ac9a5530fe4b8963824d943f7a509a75a");
    const asset = JSON.parse(first) as Json;
    expect(asset).toMatchObject({
      schema: "dig-dirt-mound-asset/v1",
      dirtMound: {
        tag: 10281, tileBytes: 512, dimensions: { width: 32, height: 32 },
        tileset: { columns: 4, rows: 4 }, palette: expect.any(Array),
        template: { oam: "gOamData_AffineOff_ObjNormal_32x16", callback: "AnimDigDirtMound", halves: [0, 1] },
      },
      reusedMudSand: { path: "src/assets/gen/battle-anim-mud-sand.json", sha256: "83653933a8a9166e5aab1550d030a4f8c556e67b65b14405110d0f4983ec8a1b" },
    });
    expect(asset.dirtMound.tileset.tiles).toHaveLength(16);
    expect(asset.dirtMound.palette).toHaveLength(16);
    expect(asset.source.reusedMudSand).toContain("intentionally not copied");
    expect(asset.source.reusedImpact).toContain("intentionally not copied");
  });

  it("keeps the complete Level-50 census and unsupported no-credit boundary, including no Open-only Dig delta", () => {
    const audit = JSON.parse(auditText()) as Json;
    expect(audit.carriers).toMatchObject({
      count: 19,
      lowest: { index: 132, label: "FRONTIER_MON_VIBRAVA", species: "SPECIES_VIBRAVA", moves: ["MOVE_DRAGON_BREATH", "MOVE_DIG", "MOVE_SCREECH", "MOVE_ROCK_TOMB"] },
      openOnly: { inventoryEntry: null, carrierDifference: [], openCarriersAlsoLevel50: [418, 494, 528, 539] },
    });
    expect(audit.carriers.all.map((carrier: Json) => carrier.index)).toEqual([
      132, 133, 192, 195, 210, 217, 230, 236, 238, 261, 262, 265, 282, 287, 297, 418, 494, 528, 539,
    ]);
    expect(audit.carriers.lowerTierOnly.map((carrier: Json) => carrier.index)).toEqual([14, 31, 41, 53, 58, 67, 74]);
    expect(audit.coverageBoundary).toMatchObject({
      digEntryPresent: false,
      digStatus: "unsupported-absent",
      componentTrack: "dirt-plume-fissure-dig",
      exactFissureControlUnchanged: true,
      sharedOnly: ["asset:ANIM_TAG_MUD_SAND", "sprite:gDirtPlumeSpriteTemplate"],
    });
    expect(audit.checkpoint).toMatchObject({
      oracleOrMgbaInvoked: false,
      denseWindowCaptured: false,
      latchMeasured: false,
      reducerAdded: false,
      typedSceneOnSeam: false,
      compositorAdded: false,
      framebufferAcceptance: false,
      coveragePromotion: false,
      componentTrackFulfilled: false,
      latchPromotion: false,
      unsupportedNoCreditBoundary: true,
    });
    expect(Object.keys(audit.futureHypotheses)).toEqual(["rule1", "rule2", "rule3", "rule4", "rule5"]);
  });
});
