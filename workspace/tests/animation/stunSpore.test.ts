import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import stunSporeAsset from "../../src/animation/assets/stunSpore.json" with {
  type: "json",
};
import {
  STUN_SPORE_FIRST_INACTIVE_AGE,
  STUN_SPORE_FRAME_COUNT,
  stunSporeAtAge,
  stunSporeParticleDrawOrderAtAge,
} from "../../src/animation/stunSpore.ts";
import {
  createSceneOnMovePresentation,
  sceneOnStunSporeView,
  type SceneOnStunSporeConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const opponent = { x: 176, y: 42 };
const player = { x: 72, y: 88 };

describe("MOVE_STUN_SPORE source-relative reducer", () => {
  it("pins the complete script interval and first inactive cleanup", () => {
    expect(STUN_SPORE_FRAME_COUNT).toBe(194);
    expect(STUN_SPORE_FIRST_INACTIVE_AGE).toBe(193);
    expect(stunSporeAtAge(0, "opponent", opponent)).toMatchObject({
      active: true,
      stunSporeLoaded: false,
      scriptOffset: 0,
      sound: null,
      soundLoopActive: false,
      particles: [],
    });
    expect(stunSporeAtAge(1, "opponent", opponent).stunSporeLoaded).toBe(true);
    expect(stunSporeAtAge(4, "opponent", opponent)).toMatchObject({
      scriptOffset: 68,
      sound: "SE_M_POISON_POWDER",
      soundPanSide: "opponent",
      soundLoopActive: true,
    });
    expect(stunSporeAtAge(49, "opponent", opponent).sound).toBe(null);
    expect(stunSporeAtAge(57, "opponent", opponent).soundLoopActive).toBe(true);
    expect(stunSporeAtAge(58, "opponent", opponent).soundLoopActive).toBe(false);
    expect(stunSporeAtAge(192, "opponent", opponent)).toMatchObject({
      active: true,
      scriptOffset: 300,
      particles: [],
    });
    expect(stunSporeAtAge(193, "opponent", opponent)).toMatchObject({
      active: false,
      stunSporeLoaded: false,
      scriptOffset: 301,
      particles: [],
    });
  });

  it("ports all fifteen powder callback lifecycles and side inversion", () => {
    const first = stunSporeAtAge(4, "opponent", opponent).particles;
    expect(first.map((particle) => particle.slot)).toEqual([3, 4, 5]);
    expect(first[0]).toMatchObject({
      x: 146,
      y: 20,
      x2: 0,
      y2: 0,
      data0: 116,
      data1: 80,
      data2: 80,
      data3: 5,
      data4: 1,
      data5: 1,
      animFrame: 0,
      priority: 2,
      callback: "AnimMovePowderParticle_Step",
    });
    expect(stunSporeAtAge(21, "opponent", opponent).particles).toHaveLength(7);
    expect(stunSporeAtAge(53, "opponent", opponent).particles).toHaveLength(11);
    expect(stunSporeAtAge(75, "opponent", opponent).particles).toHaveLength(15);
    expect(stunSporeAtAge(120, "opponent", opponent).particles).toHaveLength(15);
    expect(stunSporeAtAge(121, "opponent", opponent).particles).toHaveLength(12);
    expect(stunSporeAtAge(191, "opponent", opponent).particles).toHaveLength(4);
    expect(stunSporeAtAge(192, "opponent", opponent).particles).toEqual([]);
    expect(stunSporeAtAge(9, "player", player).particles[0]).toMatchObject({
      data3: -5,
      x2: -1,
    });
    expect(stunSporeAtAge(9, "opponent", opponent).particles[0]).toMatchObject({
      data3: 5,
      x2: 0,
    });
  });

  it("replays source-persistent OAM order without an age lookup table", () => {
    expect(stunSporeParticleDrawOrderAtAge(3)).toEqual([]);
    expect(stunSporeParticleDrawOrderAtAge(4)).toEqual([4, 5, 3]);
    expect(stunSporeParticleDrawOrderAtAge(20)).toEqual([4, 3, 5]);
    expect(stunSporeParticleDrawOrderAtAge(21)).toEqual([10, 11, 7, 9, 4, 3, 5]);
    expect(stunSporeParticleDrawOrderAtAge(59)).toEqual(
      [13, 14, 15, 12, 10, 7, 9, 11, 4, 3, 5],
    );
    expect(stunSporeParticleDrawOrderAtAge(191)).toEqual([16, 19, 17, 18]);
    expect(stunSporeParticleDrawOrderAtAge(192)).toEqual([]);
  });

  it("keeps the typed seam narrow and outcome-free", () => {
    const config: SceneOnStunSporeConfig = {
      move: "STUN_SPORE",
      attacker: {
        species: "HOPPIP",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 59 },
          animationCenter: { x: 72, y: 91 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: opponent,
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 69,
        playerMaxHp: 110,
        opponentHp: 142,
        opponentMaxHp: 142,
        playerGender: "male",
        opponentGender: "male",
      },
    };
    const state = createSceneOnMovePresentation(config);
    const view = sceneOnStunSporeView({ ...state, age: 4 });
    expect(view).toMatchObject({
      age: 4,
      attacker: { species: "HOPPIP" },
      target: { species: "ONIX" },
      stunSporeLoaded: true,
    });
    expect("paralyzed" in view).toBe(false);
    expect("damage" in view).toBe(false);
  });

  it("re-extracts the deterministic powder art", () => {
    const out = join(mkdtempSync(join(tmpdir(), "stun-spore-assets-")), "a.json");
    execFileSync("node", [
      "--experimental-strip-types",
      "tools/compare/extractStunSporeAssets.ts",
      "--out",
      out,
    ], { encoding: "utf8" });
    expect(JSON.parse(readFileSync(out, "utf8"))).toEqual(stunSporeAsset);
  });

  it("pins source graph, interval, and lowest Level-50 carrier", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/stunSporeSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("0x082c954d..0x082c967b (0x12e bytes)");
    expect(output).toContain("gStunSporeParticleSpriteTemplate -> AnimMovePowderParticle_Step");
    expect(output).toContain("set 167/FRONTIER_MON_GLOOM_1");
  });
});
