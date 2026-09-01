import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FIRE_BLAST_CROSS_STARTS,
  FIRE_BLAST_CROSS_VECTORS,
  FIRE_BLAST_FRAME_COUNT,
  FIRE_BLAST_RING_PHASES,
  FIRE_BLAST_RING_STARTS,
  fireBlastAtAge,
} from "../../src/animation/fireBlast.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFireBlastView,
  type SceneOnFireBlastConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const geometry = {
  attackerPictureCenter: { x: 72, y: 98 },
  targetPictureCenter: { x: 176, y: 42 },
  targetSpriteSlot: 8,
} as const;

describe("MOVE_FIRE_BLAST pure reducer and typed presentation seam", () => {
  it("ports the complete source-relative ring, cross, task, resource, and cleanup lifecycle", () => {
    expect(FIRE_BLAST_FRAME_COUNT).toBe(197);
    expect(FIRE_BLAST_RING_STARTS).toEqual([4, 11, 18]);
    expect(FIRE_BLAST_RING_PHASES).toEqual([0, 51, 102, 153, 204]);
    expect(FIRE_BLAST_CROSS_STARTS).toEqual([
      113, 118, 123, 128, 133, 138, 143, 148, 153,
    ]);
    expect(FIRE_BLAST_CROSS_VECTORS).toEqual([
      { duration: 10, x: 0, y: -2 },
      { duration: 13, x: -2, y: 0 },
      { duration: 13, x: 2, y: 0 },
      { duration: 15, x: -2, y: 2 },
      { duration: 15, x: 2, y: 2 },
    ]);
    const firstRing = fireBlastAtAge(4, "player", geometry);
    expect(firstRing).toMatchObject({
      source: { owner: "FireBlastRing", offset: 215, wait: 5 },
      soundTask: { callback: "SoundTask_FireBlast_Step1" },
      resources: { smallEmber: true, tileTags: [10029], paletteTags: [10029] },
    });
    expect(firstRing.rings).toHaveLength(5);
    expect(firstRing.rings[0]).toMatchObject({ group: 0, index: 0, slot: 3,
      x: 72, y: 98, x2: 0, y2: 28, animationFrame: 0 });
    const firstCross = fireBlastAtAge(113, "player", geometry);
    expect(firstCross).toMatchObject({
      shakeTask: { data: [8, 19, 1, 1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    });
    expect(firstCross.crosses).toHaveLength(5);
    expect(firstCross.crosses[0]).toMatchObject({ group: 0, index: 0, slot: 3,
      x: 176, y: 42, x2: 0, y2: -2 });
    expect(fireBlastAtAge(196, "player", geometry)).toMatchObject({
      active: false, rings: [], crosses: [], paletteTasks: [],
      shakeTask: null, soundTask: null, targetShakeX2: 0,
      resources: { smallEmber: false, tileTags: [], paletteTags: [] },
      visualTaskCount: 0, soundTaskCount: 0,
    });
  });

  it("selects orientation from typed config and keeps gameplay state out of the seam", () => {
    const battler = (species: "OCTILLERY" | "ONIX", side: "player" | "opponent") => ({
      species,
      geometry: {
        side,
        spriteCorner: { x: 0, y: 0 },
        animationCenter: { x: 0, y: 0 },
        battlePositionCenter: { x: 0, y: 0 },
      },
    } as const);
    const player: SceneOnFireBlastConfig = {
      move: "FIRE_BLAST",
      attacker: battler("OCTILLERY", "player"),
      target: battler("ONIX", "opponent"),
      animationProfile: geometry,
      fieldProfile: { playerHp: 100, playerMaxHp: 100,
        opponentHp: 100, opponentMaxHp: 100,
        playerGender: "male", opponentGender: "male" },
    };
    const opponent: SceneOnFireBlastConfig = {
      ...player,
      attacker: battler("OCTILLERY", "opponent"),
      target: battler("ONIX", "player"),
      animationProfile: {
        attackerPictureCenter: { x: 176, y: 50 },
        targetPictureCenter: { x: 72, y: 88 },
        targetSpriteSlot: 6,
      },
    };
    const playerView = sceneOnFireBlastView({
      ...createSceneOnMovePresentation(player), age: 4,
    });
    const opponentView = sceneOnFireBlastView({
      ...createSceneOnMovePresentation(opponent), age: 4,
    });
    expect(playerView.soundTask?.data.slice(2, 5)).toEqual([-62, 63, 2]);
    expect(opponentView.soundTask?.data.slice(2, 5)).toEqual([61, -63, -2]);
    expect(playerView.rings[0]).toMatchObject({ x: 72, y: 98 });
    expect(opponentView.rings[0]).toMatchObject({ x: 176, y: 50 });
    expect("damage" in playerView).toBe(false);
    expect("rng" in playerView).toBe(false);
  });

  it("matches all 394 retained reducer and typed-seam rows with Fire Blast-only credit", () => {
    const summary = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/verifyFireBlastReducer.ts",
    ], { encoding: "utf8" }));
    for (const orientation of ["player-back", "opponent-front"]) {
      expect(summary[orientation]).toMatchObject({
        reducerRows: 197,
        seamRows: 197,
        lifecycle: {
          gFireBlastRingSpriteTemplate: 15,
          gFireBlastCrossSpriteTemplate: 45,
        },
        latches: { oam: "196/196", matrices: "196/196", palette: "196/196" },
        cleanup: { age: 196, active: false, visualTasks: 0, soundTasks: 0 },
      });
    }
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: any) => entry.status === "exact"))
      .toHaveLength(222);
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_FIRE_BLAST"))
      .toMatchObject({ status: "exact" });
    for (const move of ["MOVE_DRAGON_BREATH", "MOVE_FLAMETHROWER",
      "MOVE_BLAZE_KICK", "MOVE_EMBER", "MOVE_FIRE_SPIN"]) {
      expect(coverage.entries.find((entry: any) => entry.move === move))
        .toMatchObject({ status: "exact" });
    }
  });
});
