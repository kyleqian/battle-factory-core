import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import smogAsset from "../../src/animation/assets/smog.json" with { type: "json" };
import {
  SMOG_FIRST_INACTIVE_AGE,
  smogAtAge,
  smogSourceAtAge,
  type SmogLiveInputs,
} from "../../src/animation/smog.ts";
import {
  sceneOnSmogView,
  type SceneOnSmogPresentationState,
} from "../../src/animation/sceneOnPresentation.ts";
import {
  smogConfigFor,
  verifySmogReducer,
} from "../../tools/compare/verifySmogReducer.ts";

const root = resolve(import.meta.dirname, "../..");
const live = (overrides: Partial<SmogLiveInputs> = {}): SmogLiveInputs => ({
  attackerSide: "player", targetSide: "opponent", attackerSpecies: "MAGBY", targetSpecies: "ONIX",
  targetPictureOrigin: { x: 176, y: 40 }, targetBgPriority: 1,
  attackerSprite: { slot: 6, x: 72, y: 91, x2: 0, y2: 0, subpriority: 30, oamPriority: 2, matrixNum: 0, matrix: [256, 0, 0, 256] },
  targetSprite: { slot: 8, x: 176, y: 42, x2: 1, y2: 0, subpriority: 40, oamPriority: 2, matrixNum: 0, matrix: [256, 0, 0, 256] },
  cloudSpriteSlots: [3, 4, 5, 7, 9, 10, 11],
  taskSlots: { updateMonBg: 1, mistSound: 0, blendColorCycle: 0, shakeMon2: 0, toxicSound: 0, clearMonBg: 0 },
  resources: { purpleGasCloud: { paletteBank: 7, tileSlot: 6, tileRange: [305, 16] } }, matrixBitmap: 6,
  spriteOrder: Array.from({ length: 64 }, (_, slot) => slot),
  painterSprites: [], monbg: { layer: "bg1", scroll: { x: -145, y: -10 } },
  background: { baseBg1Cnt: 39936, baseBg2Cnt: 24064, monbgBg1Cnt: 23554, monbgBg2Cnt: 24064, splitBg1Cnt: 23553, splitBg2Cnt: 24066 },
  targetPaletteBank: 17, animationRngSeed: 0x12345678, gameplayRng: 0x87654321,
  ...overrides,
});

describe("MOVE_SMOG source-relative reducer and narrow Scene-ON seam", () => {
  it("replays both retained complete dense windows twice through reducer and typed seam", () => {
    const first = verifySmogReducer();
    expect(verifySmogReducer()).toEqual(first);
    expect(first).toEqual({
      "player-back": expect.objectContaining({ retainedRows: 306, reducerRows: 612, seamRows: 612, framebufferCompared: false, coverageCredit: false }),
      "opponent-front": expect.objectContaining({ retainedRows: 306, reducerRows: 612, seamRows: 612, framebufferCompared: false, coverageCredit: false }),
      bilateral: { retainedRows: 612, passes: 2, reducerRows: 1224, seamRows: 1224, framebufferCompared: false, coverageCredit: false },
    });
  });

  it("derives the purple cloud asset reproducibly from the source tree", () => {
    const scratch = mkdtempSync(join(tmpdir(), "smog-assets-"));
    const output = join(scratch, "smog.json");
    execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extractSmogAssets.ts", "--out", output], { cwd: root, stdio: "pipe" });
    expect(JSON.parse(readFileSync(output, "utf8"))).toEqual(smogAsset);
    expect(smogAsset).toMatchObject({
      schema: "smog-source-assets/v1",
      resources: { purpleGasCloud: { tag: 10172, tileBytes: 512 } },
      templates: { smogCloud: { symbol: "gSmogCloudSpriteTemplate", affine: false, objMode: "objblend", frames: [[0, 8], [8, 8]] } },
      cloud: { calls: 7, args: [0, -24, 48, 240, 1, 0] },
      blendColorCycle: { selector: "F_PAL_TARGET", delay: 2, numBlends: 2, targetBlendY: 12 },
      shake: { task: "AnimTask_ShakeMon2", args: ["ANIM_TARGET", 2, 0, 15, 1] },
    });
  });

  it("ports source cursor, seven clouds, palette loop, shake/monbg latches, audio, and cleanup", () => {
    const input = live();
    expect(smogSourceAtAge(0)).toMatchObject({ pointerOffset: 0, wait: 0, active: true });
    expect(smogSourceAtAge(7)).toMatchObject({ pointerOffset: 122, wait: 7 });
    expect(smogSourceAtAge(192)).toMatchObject({ pointerOffset: 79, wait: 10 });
    expect(smogSourceAtAge(204)).toMatchObject({ pointerOffset: 96, wait: 1 });
    expect(smogAtAge(7, input)).toMatchObject({
      sprites: [expect.objectContaining({ slot: 3, x: 176, y: 16, x2: 31, y2: 0, callback: "AnimSwirlingFogAnim", matrixNum: 0 })],
      registers: { bldcnt: 16192, bldalpha: 2060 },
      resources: { purpleGasCloud: { loaded: true, tag: 10172 }, allocator: { affineAllocated: false } },
    });
    expect(smogAtAge(196, input).palette.target).toMatchObject({ selector: "F_PAL_TARGET", blendAmount: 2, fadedWrite: true });
    expect(smogAtAge(216, input).palette.target.blendAmount).toBe(12);
    expect(smogAtAge(226, input).palette.target.blendAmount).toBe(10);
    expect(smogAtAge(204, input)).toMatchObject({
      battlers: { target: { shake: { x: -2, y: 0 } } },
      background: { softwareScroll: { x: -142, y: -10 } },
      tasks: expect.arrayContaining([expect.objectContaining({ callback: "AnimTask_ShakeMon2_Step", data: expect.arrayContaining([8, 14, 1, 1, 2]) })]),
    });
    expect(smogAtAge(232, input).background.softwareScroll).toEqual({ x: -144, y: -10 });
    expect(smogAtAge(7, input).audio[0]).toMatchObject({ sound: "SE_M_MIST", interval: 17, plays: 10, active: true });
    expect(smogAtAge(192, input).audio[1]).toMatchObject({ sound: "SE_M_TOXIC", interval: 18, plays: 2, active: true });
    expect(smogAtAge(SMOG_FIRST_INACTIVE_AGE, input)).toMatchObject({
      active: false, sprites: [], tasks: [],
      cleanup: { firstInactive: true, visualTasks: 0, soundTasks: 0, ownedSprites: 0, resourcesReleased: true },
    });
  });

  it("materially follows altered live sides, species, geometry, origin, allocation, tasks, order, and monbg inputs", () => {
    const canonical = smogAtAge(204, live());
    const altered = smogAtAge(204, live({
      attackerSide: "opponent", targetSide: "player", attackerSpecies: "CROBAT", targetSpecies: "BLISSEY",
      targetPictureOrigin: { x: 202, y: 72 }, targetBgPriority: 2,
      attackerSprite: { slot: 21, x: 184, y: 64, x2: 0, y2: 0, subpriority: 55, oamPriority: 1, matrixNum: 6, matrix: [220, 24, -24, 220] },
      targetSprite: { slot: 22, x: 202, y: 72, x2: -1, y2: 3, subpriority: 47, oamPriority: 0, matrixNum: 7, matrix: [240, 0, 0, 240] },
      cloudSpriteSlots: [12, 13, 14, 15, 16, 17, 18],
      taskSlots: { updateMonBg: 25, mistSound: 26, blendColorCycle: 27, shakeMon2: 28, toxicSound: 29, clearMonBg: 30 },
      resources: { purpleGasCloud: { paletteBank: 10, tileSlot: 31, tileRange: [601, 16] } }, matrixBitmap: 0x95,
      spriteOrder: Array.from({ length: 64 }, (_, slot) => 63 - slot), painterSprites: [],
      monbg: { layer: "bg2", scroll: { x: -40, y: -48 } },
      background: { baseBg1Cnt: 39936, baseBg2Cnt: 24064, monbgBg1Cnt: 39936, monbgBg2Cnt: 24066, splitBg1Cnt: 39937, splitBg2Cnt: 24066 },
      targetPaletteBank: 20, animationRngSeed: 0x89abcdef, gameplayRng: 0x10203040,
    }));
    expect(altered).not.toEqual(canonical);
    expect(altered).toMatchObject({
      battlers: { attacker: { side: "opponent", species: "CROBAT", sprite: { slot: 21, matrixNum: 6 } }, target: { side: "player", species: "BLISSEY", pictureOrigin: { x: 202, y: 72 } } },
      sprites: expect.arrayContaining([expect.objectContaining({ slot: 12, x: 202, y: 56, subpriority: 53 })]),
      tasks: expect.arrayContaining([expect.objectContaining({ slot: 25, callback: "Task_UpdateMonBg" }), expect.objectContaining({ slot: 27 }), expect.objectContaining({ slot: 28 })]),
      resources: { purpleGasCloud: { paletteBank: 10, tileSlot: 31 }, allocator: { matrixBitmap: 0x95 } },
      background: { layer: "bg2", softwareScroll: { x: -39, y: -45 } },
      registers: { bg1cnt: 39937, bg2cnt: 24066 }, palette: { target: { bank: 20 } },
    });
    expect(altered.painterOrder).not.toEqual(canonical.painterOrder);
    expect(altered.rng).toMatchObject({ gameplay: 0x10203040, gameplayUnchanged: true });
  });

  it("routes the same live facts through the narrow typed Scene-ON seam", () => {
    const compressed = readFileSync(resolve(root, "tools/compare/evidence/smog-player-dense-state.json.gz"));
    const decoded = JSON.parse(gunzipSync(compressed).toString("utf8"));
    const config = smogConfigFor("player-back", decoded.frames);
    const state = { age: 204, config } as SceneOnSmogPresentationState;
    expect(sceneOnSmogView(state)).toMatchObject({
      attacker: { species: "MAGBY" }, target: { species: "ONIX" },
      tasks: expect.arrayContaining([expect.objectContaining({ callback: "AnimTask_ShakeMon2_Step" })]),
      background: { monbg: true },
    });
  });
});
