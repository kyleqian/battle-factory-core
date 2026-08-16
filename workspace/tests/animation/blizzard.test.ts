import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import animationComponents from "../../src/data/gen/battle-animation-components.json" with { type: "json" };
import {
  BLIZZARD_COMPONENTS,
  BLIZZARD_IMPACT_CRYSTALS,
  BLIZZARD_SNOWBALL_CALLS,
  blizzardAtAge,
  blizzardImpactStartAge,
  blizzardSnowballCallsAtSourceAge,
  blizzardSnowballSwirlState,
  gbaSignedSin,
} from "../../src/animation/blizzard.ts";
import { verifyBlizzardEvidence } from "../../tools/compare/verifyBlizzardEvidence.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBlizzardView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

const root = resolve(".");
const receipt = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/blizzard-dense-evidence.json"), "utf8")) as any;
const sha256 = (path: string): string => createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex");

describe("MOVE_BLIZZARD source checkpoint", () => {
  it("pins the exclusive generated graph and keeps Icy Wind separate", () => {
    const generated = animationComponents.moves.find((move) => move.move === "MOVE_BLIZZARD");
    const icyWind = animationComponents.moves.find((move) => move.move === "MOVE_ICY_WIND");
    expect(generated?.componentIds).toEqual(BLIZZARD_COMPONENTS);
    expect(generated?.blocks).toEqual([
      "Move_BLIZZARD", "BlizzardAgainstPlayer", "BlizzardContinue",
      "BlizzardIceCrystals", "IceCrystalEffectLong",
    ]);
    expect(icyWind?.componentIds).toContain("sprite:gSwirlingSnowballSpriteTemplate");
    expect(icyWind?.componentIds).not.toContain("sprite:gBlizzardIceCrystalSpriteTemplate");
  });

  it("retains both source snowball batches, delay cadence, and impact order", () => {
    expect(BLIZZARD_SNOWBALL_CALLS).toHaveLength(14);
    expect(BLIZZARD_SNOWBALL_CALLS.map(({ sourceAge }) => sourceAge)).toEqual([
      45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110,
    ]);
    expect(BLIZZARD_SNOWBALL_CALLS.map(({ initialY }) => initialY)).toEqual([
      -10, -15, -5, -10, -20, -15, -25, -10, -15, -5, -10, -20, -15, -25,
    ]);
    expect(blizzardSnowballCallsAtSourceAge(80)[0]).toMatchObject({ burst: 1, index: 0, speed: 72, multipleTargets: true });
    expect(BLIZZARD_IMPACT_CRYSTALS.map(({ kind, x, y }) => [kind, x, y])).toEqual([
      ["large", -10, -10], ["small", 10, 20], ["large", -29, 0], ["small", 29, -20],
      ["large", -5, 10], ["small", 17, -12], ["large", -20, 0], ["small", -15, 15],
      ["small", 26, -5], ["small", 0, 0], ["large", 20, 2],
    ]);
  });

  it("uses the pre-increment angle and signed C shift for the reconstructible Step2 rows", () => {
    const initial = {
      x: -19, y: 119, x2: 193, y2: -77,
      data: [0, 72, 29, 3096, 1247, 0, -17567, 2064] as const,
    };
    expect(blizzardSnowballSwirlState(initial, 0, "player")).toEqual({
      side: "player", callback: "AnimSwirlingSnowball_Step2",
      x: 174, y: 42, x2: 0, y2: 0,
      data: [144, 72, 29, 0, -15, 1, -17567, 2064],
    });
    expect(blizzardSnowballSwirlState(initial, 1, "player")).toMatchObject({ x2: 7, y2: 1, data: [160, 72, 29, 0, -15, 2, -17567, 2064] });
    expect(gbaSignedSin(16, -20)).toBe(-8);
    expect(() => blizzardSnowballSwirlState(initial, 32, "player")).toThrow(/0\.\.31/u);
  });

  it("derives bilateral completion and exposes the complete reducer through the typed seam", () => {
    const geometry = { attackerCenter: { x: 72, y: 94 }, targetCenter: { x: 176, y: 42 } };
    expect(blizzardImpactStartAge("player", geometry)).toBe(208);
    expect(blizzardImpactStartAge("opponent", {
      attackerCenter: { x: 176, y: 36 }, targetCenter: { x: 72, y: 88 },
    })).toBe(197);

    const attacker: SceneOnPresentationBattler = {
      species: "PELIPPER",
      geometry: { side: "player", spriteCorner: { x: 40, y: 54 }, animationCenter: { x: 72, y: 86 }, battlePositionCenter: { x: 72, y: 80 } },
    };
    const target: SceneOnPresentationBattler = {
      species: "ONIX",
      geometry: { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } },
    };
    const stage = createSceneOnMovePresentation({
      move: "BLIZZARD", attacker, target, effectGeometry: geometry,
      fieldProfile: { playerHp: 158, playerMaxHp: 167, opponentHp: 110, opponentMaxHp: 110 },
    });
    const expected = blizzardAtAge(208, "player", geometry);
    const { attacker: actualAttacker, target: actualTarget, ...actual } = sceneOnBlizzardView({ ...stage, age: 208 });
    expect(actualAttacker).toBe(attacker);
    expect(actualTarget).toBe(target);
    expect(actual).toEqual(expected);
    expect(expected).toMatchObject({
      active: true, phase: "impact", impactStartAge: 208,
      background: "highspeed-player", resourcesLoaded: true,
      monBgTaskActive: true, impactCrystals: [{ callIndex: 0, kind: "large" }],
    });
    expect(blizzardAtAge(371, "player", geometry)).toMatchObject({
      active: false, phase: "inactive", resourcesLoaded: false,
      monBgTaskActive: false, monBgDisplayed: false,
    });
  });
});

describe("MOVE_BLIZZARD Scene-ON evidence receipts", () => {
  it("strictly replays retained state, reducer, OAM latch, and every archived RGB row", () => {
    const verified = verifyBlizzardEvidence(root);
    expect(verified).toEqual([
      { orientation: "player-back", windowFrames: 372, sourceIntervalObservedFrames: 312, reducerInitialRows: 14, reducerMatchedSpriteRows: 448, snowballRows: 1358, largeCrystalRows: 752, impactCrystalRows: 407, reducerRows: 372, oamLatchMatchedRows: 371, matrixLatchMatchedRows: 371, paletteLatchMatchedRows: 371, rgbFrames: 372, seamRows: 372, framebufferRows: 0 },
      { orientation: "opponent-front", windowFrames: 361, sourceIntervalObservedFrames: 301, reducerInitialRows: 14, reducerMatchedSpriteRows: 448, snowballRows: 1270, largeCrystalRows: 726, impactCrystalRows: 407, reducerRows: 361, oamLatchMatchedRows: 360, matrixLatchMatchedRows: 360, paletteLatchMatchedRows: 360, rgbFrames: 361, seamRows: 361, framebufferRows: 0 },
    ]);
    for (const [orientation, row] of Object.entries(receipt.orientations) as Array<[string, any]>) {
      expect(sha256(row.scenario)).toBe(row.scenarioSha256);
      expect(row.seamRows).toBe(row.denseWindow.frameCount);
      expect(row.framebufferRows).toBe(0);
      expect(row.residuals[0].component).toBe("production battleScene Blizzard compositor");
      expect(row.residuals[0].rows).toBe(row.denseWindow.frameCount);
      expect(orientation).toMatch(/player-back|opponent-front/);
    }
    expect(receipt.status).toBe("unsupported-evidence-checkpoint");
    expect(receipt.carrier).toMatchObject({ setId: 318, speciesId: 310, label: "FRONTIER_MON_PELIPPER_2" });
    expect(receipt.captureFreshness).toMatch(/one retained capture per orientation/u);
  });

  it("runs the source audit against the pinned ROM interval and generated inventory", () => {
    const run = spawnSync("node", ["--experimental-strip-types", "tools/compare/blizzardSourceAudit.ts"], {
      cwd: root, encoding: "utf8", maxBuffer: 2 * 1024 * 1024,
    });
    expect(run.status).toBe(0);
    expect(run.stdout).toContain('"byteLength": 9707');
    expect(run.stdout).toContain('"sha256": "66fbe1dbfa6b98cf8aa2d8be330942bc2ef4ee0b43d6213ec091ba1d61ad059c"');
    expect(run.stdout).toContain('"setId": 318');
    expect(run.stdout).toContain('"speciesId": 310');
  });
});
