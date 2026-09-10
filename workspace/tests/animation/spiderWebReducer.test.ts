import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { verifySpiderWebReducer } from "../../tools/compare/verifySpiderWebReducer.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSpiderWebView,
  type SceneOnSpiderWebConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const slots = [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;
const order = Array.from({ length: 64 }, (_, index) => index);

function spiderWebConfig(): SceneOnSpiderWebConfig {
  return {
    move: "SPIDER_WEB",
    attacker: { species: "SPINARAK", geometry: { side: "player",
      spriteCorner: { x: 40, y: 72 }, animationCenter: { x: 92, y: 104 },
      battlePositionCenter: { x: 72, y: 80 } } },
    target: { species: "ONIX", geometry: { side: "opponent",
      spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 },
      battlePositionCenter: { x: 176, y: 40 } } },
    fieldProfile: { playerHp: 100, playerMaxHp: 100, opponentHp: 100,
      opponentMaxHp: 100, playerGender: "female", opponentGender: "male" },
    animationInputs: {
      threadOrigin: { x: 92, y: 104 }, threadSpriteSlots: slots,
      paletteSpriteSlot: 3, webSpriteSlot: 3, webMatrixSlot: 0,
      updateMonBgTaskSlot: 1, clearMonBgTaskSlot: 0, loopSoundTaskSlot: 0,
      spriteOrder: order, paletteSubpriority: 25, threadSubpriority: 38,
      webSubpriority: 28, baseMatrixBitmap: 6,
      monbg: { layer: "bg1", spriteSlot: 8, spriteX: 177, spriteY: 42,
        bgX: -145, bgY: -10, inBg2: false, battlerId: 1 },
    },
  };
}

describe("MOVE_SPIDER_WEB source-age reducer and typed Scene-ON seam", () => {
  it("replays every retained component row in both orientations through cleanup", () => {
    expect(verifySpiderWebReducer()).toEqual({
      "player-back": {
        reducerRows: 207, seamRows: 207,
        lifecycle: { webThreads: 14, affineWeb: "121..172",
          paletteBlends: ["12..37", "179..204"], monbg: "7..176" },
        latches: { oam: "206/206 predecessor", matrices: "206/206 predecessor",
          palette: "205/206 predecessor; age 7 same-row" },
        cleanup: { age: 206, active: false, framebufferCompared: false },
      },
      "opponent-front": {
        reducerRows: 207, seamRows: 207,
        lifecycle: { webThreads: 14, affineWeb: "121..172",
          paletteBlends: ["12..37", "179..204"], monbg: "7..176" },
        latches: { oam: "206/206 predecessor", matrices: "206/206 predecessor",
          palette: "205/206 predecessor; age 7 same-row" },
        cleanup: { age: 206, active: false, framebufferCompared: false },
      },
    });
  });

  it("uses live species, geometry, allocator, matrix, and order inputs without a compositor", () => {
    const canonical = spiderWebConfig();
    const changed: SceneOnSpiderWebConfig = {
      ...canonical,
      attacker: { species: "SURSKIT", geometry: { side: "player",
        spriteCorner: { x: 28, y: 66 }, animationCenter: { x: 80, y: 98 },
        battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "RELICANTH", geometry: { side: "opponent",
        spriteCorner: { x: 120, y: 28 }, animationCenter: { x: 152, y: 60 },
        battlePositionCenter: { x: 176, y: 40 } } },
      animationInputs: {
        ...canonical.animationInputs,
        threadOrigin: { x: 80, y: 98 },
        threadSpriteSlots: [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
        paletteSpriteSlot: 19, webSpriteSlot: 19, webMatrixSlot: 4,
        updateMonBgTaskSlot: 4, clearMonBgTaskSlot: 3, loopSoundTaskSlot: 2,
        spriteOrder: [...order].reverse(), paletteSubpriority: 21,
        threadSubpriority: 34, webSubpriority: 24, baseMatrixBitmap: 2,
        monbg: { layer: "bg1", spriteSlot: 19, spriteX: 152, spriteY: 60,
          bgX: -96, bgY: -24, inBg2: false, battlerId: 1 },
      },
    };
    const baseline = createSceneOnMovePresentation(canonical);
    const altered = createSceneOnMovePresentation(changed);
    const baselineThread = sceneOnSpiderWebView({ ...baseline, age: 39 });
    const alteredThread = sceneOnSpiderWebView({ ...altered, age: 39 });
    const baselineWeb = sceneOnSpiderWebView({ ...baseline, age: 121 });
    const alteredWeb = sceneOnSpiderWebView({ ...altered, age: 121 });
    expect(alteredThread.battlers).not.toEqual(baselineThread.battlers);
    expect(alteredThread.threads).not.toEqual(baselineThread.threads);
    expect(alteredThread.painterSlots).not.toEqual(baselineThread.painterSlots);
    expect(alteredWeb.web).not.toEqual(baselineWeb.web);
    expect(alteredWeb.resources.matrixBitmap).not.toBe(baselineWeb.resources.matrixBitmap);
    expect(sceneOnSpiderWebView({ ...baseline, age: 206 })).toMatchObject({
      active: false, firstInactiveCleanup: true, threads: [], web: null,
      paletteBlend: null, tasks: [],
      resources: { spiderWebLoaded: false, webThreadLoaded: false },
    });
    expect(baselineWeb).not.toHaveProperty("framebuffer");
  });

  it("promotes Spider Web alone and keeps source-neighbor controls independent", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.queue).toEqual(["MOVE_DESTINY_BOND"]);
    const track = coverage.componentTracks.find((entry: { id: string }) =>
      entry.id === "spider-web-thread");
    expect(track).toMatchObject({ fulfilled: true });
    const statuses = new Map(coverage.entries.map((entry: { move: string; status: string }) =>
      [entry.move, entry.status]));
    for (const move of ["MOVE_WHIRLPOOL", "MOVE_PROTECT", "MOVE_COTTON_SPORE",
      "MOVE_MEAN_LOOK", "MOVE_SCARY_FACE", "MOVE_NIGHT_SHADE"]) {
      expect(statuses.get(move)).toBe("exact");
    }
    expect(statuses.has("MOVE_STRING_SHOT")).toBe(false);
  });
});
