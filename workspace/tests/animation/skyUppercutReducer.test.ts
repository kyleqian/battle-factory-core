import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  sceneOnSkyUppercutView,
  type SceneOnSkyUppercutConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { verifySkyUppercutReducer } from "../../tools/compare/verifySkyUppercutReducer.ts";

const order = Array.from({ length: 64 }, (_, index) => index);

function skyUppercutConfig(): SceneOnSkyUppercutConfig {
  return {
    move: "SKY_UPPERCUT",
    attacker: { species: "GLOOM", geometry: { side: "player",
      spriteCorner: { x: 40, y: 60 }, animationCenter: { x: 72, y: 92 },
      battlePositionCenter: { x: 72, y: 92 } } },
    target: { species: "ONIX", geometry: { side: "opponent",
      spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 },
      battlePositionCenter: { x: 176, y: 42 } } },
    fieldProfile: { playerHp: 100, playerMaxHp: 100, opponentHp: 100,
      opponentMaxHp: 100, playerGender: "female", opponentGender: "male" },
    animationInputs: {
      targetPictureOrigin: { x: 176, y: 42 },
      attackerSpriteSlot: 6, targetSpriteSlot: 8,
      attackerInitialOffset: { x: 0, y: 0 }, targetInitialOffset: { x: 1, y: 0 },
      slideSpriteSlots: [3, 9, 3, 4],
      impactSpriteSlots: [4, 3, 5, 7, 4], impactMatrixSlots: [0, 3, 4, 5, 0],
      updateMonBgTaskSlot: 1, fadeInTaskSlot: 0, backgroundTaskSlot: 2,
      shakeMon2TaskSlot: 0, shakeMonInPlaceTaskSlot: 0,
      clearMonBgTaskSlot: 0, restoreFadeTaskSlot: 3,
      slideSubpriority: 28, impactSubpriority: 37,
      impactPaletteBank: 7, impactTileSlot: 6, baseMatrixBitmap: 6,
      spriteOrder: order,
      monbg: { layer: "bg1", spriteSlot: 8, spriteX: 177, spriteY: 42,
        bgX: -145, bgY: -10, inBg2: false, battlerId: 1 },
      initialBg3Offset: { x: 0, y: 0 },
    },
  };
}

describe("MOVE_SKY_UPPERCUT source-age reducer and typed Scene-ON seam", () => {
  it("replays all retained bilateral component rows twice through first cleanup", () => {
    const expected = {
      "player-back": {
        reducerRows: 188, seamRows: 188,
        lifecycle: { updateMonBg: "4..149", backgroundTask: "26..167",
          shakeMon2: "91..100", shakeMonInPlace: "109..117", firstInactiveCleanup: 187 },
        latches: { oam: "187/187 predecessor", matrices: "187/187 predecessor",
          palette: "186/187 predecessor; age 4 same-row monbg setup" },
        cleanup: { age: 187, active: false, framebufferCompared: false },
      },
      "opponent-front": {
        reducerRows: 188, seamRows: 188,
        lifecycle: { updateMonBg: "4..149", backgroundTask: "26..167",
          shakeMon2: "91..100", shakeMonInPlace: "109..117", firstInactiveCleanup: 187 },
        latches: { oam: "187/187 predecessor", matrices: "187/187 predecessor",
          palette: "186/187 predecessor; age 4 same-row monbg setup" },
        cleanup: { age: 187, active: false, framebufferCompared: false },
      },
    };
    expect(verifySkyUppercutReducer()).toEqual(expected);
    expect(verifySkyUppercutReducer()).toEqual(expected);
  });

  it("materially consumes live side, species, geometry, origins, allocations, and BG inputs", () => {
    const canonical = skyUppercutConfig();
    const altered: SceneOnSkyUppercutConfig = {
      ...canonical,
      attacker: { species: "IVYSAUR", geometry: { side: "player",
        spriteCorner: { x: 52, y: 54 }, animationCenter: { x: 84, y: 86 },
        battlePositionCenter: { x: 84, y: 86 } } },
      target: { species: "RELICANTH", geometry: { side: "opponent",
        spriteCorner: { x: 116, y: 22 }, animationCenter: { x: 148, y: 54 },
        battlePositionCenter: { x: 148, y: 54 } } },
      animationInputs: {
        ...canonical.animationInputs,
        targetPictureOrigin: { x: 148, y: 66 },
        attackerSpriteSlot: 2, targetSpriteSlot: 18,
        attackerInitialOffset: { x: 2, y: 1 }, targetInitialOffset: { x: 3, y: -1 },
        slideSpriteSlots: [19, 20, 19, 21],
        impactSpriteSlots: [22, 23, 24, 25, 22], impactMatrixSlots: [4, 5, 6, 7, 4],
        updateMonBgTaskSlot: 5, fadeInTaskSlot: 4, backgroundTaskSlot: 6,
        shakeMon2TaskSlot: 3, shakeMonInPlaceTaskSlot: 3,
        clearMonBgTaskSlot: 3, restoreFadeTaskSlot: 7,
        slideSubpriority: 24, impactSubpriority: 29,
        impactPaletteBank: 10, impactTileSlot: 24, baseMatrixBitmap: 2,
        spriteOrder: [...order].reverse(),
        monbg: { layer: "bg1", spriteSlot: 18, spriteX: 151, spriteY: 53,
          bgX: -96, bgY: -24, inBg2: false, battlerId: 1 },
        initialBg3Offset: { x: 13, y: -7 },
      },
    };
    const baseline = createSceneOnMovePresentation(canonical);
    const changed = createSceneOnMovePresentation(altered);
    const baselineBg = sceneOnSkyUppercutView({ ...baseline, age: 26 });
    const alteredBg = sceneOnSkyUppercutView({ ...changed, age: 26 });
    const baselineHit = sceneOnSkyUppercutView({ ...baseline, age: 91 });
    const alteredHit = sceneOnSkyUppercutView({ ...changed, age: 91 });
    const repeatedAlteredHit = sceneOnSkyUppercutView({ ...changed, age: 91 });
    expect(alteredBg.battlers).not.toEqual(baselineBg.battlers);
    expect(alteredBg.background.bg3).not.toEqual(baselineBg.background.bg3);
    expect(alteredBg.tasks).not.toEqual(baselineBg.tasks);
    expect(alteredHit.sprites).not.toEqual(baselineHit.sprites);
    expect(alteredHit.painterSlots).not.toEqual(baselineHit.painterSlots);
    expect(alteredHit.resources).not.toEqual(baselineHit.resources);
    expect(alteredHit.monbg.sourceOffsets).not.toEqual(baselineHit.monbg.sourceOffsets);
    expect(repeatedAlteredHit).toEqual(alteredHit);
    expect(sceneOnSkyUppercutView({ ...baseline, age: 187 })).toMatchObject({
      active: false, firstInactiveCleanup: true, sprites: [], tasks: [],
      resources: { impactLoaded: false, impactTag: null },
    });
    expect(alteredHit).not.toHaveProperty("framebuffer");
  });

  it("retains the source-derived reducer after independent exact promotion", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.queue).toEqual(["MOVE_SHOCK_WAVE"]);
    expect(coverage.entries.find((entry: { move: string }) =>
      entry.move === "MOVE_SKY_UPPERCUT")).toMatchObject({ status: "exact" });
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact")).toHaveLength(255);
  });
});
