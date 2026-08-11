import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sporeAsset from "../../src/animation/assets/spore.json" with {
  type: "json",
};
import {
  SPORE_FRAME_COUNT,
  sporeAtAge,
} from "../../src/animation/spore.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSporeView,
  type SceneOnSporeConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const opponent = { x: 176, y: 42 };
const player = { x: 72, y: 88 };

describe("MOVE_SPORE source-relative reducer", () => {
  it("ports load, monbg, alpha, waits, audio, and first cleanup", () => {
    expect(SPORE_FRAME_COUNT).toBe(207);
    expect(sporeAtAge(0, "opponent", opponent)).toMatchObject({
      active: true,
      sporeLoaded: false,
      targetMonBg: false,
      alpha: null,
      scriptOffset: 0,
    });
    expect(sporeAtAge(1, "opponent", opponent).sporeLoaded).toBe(true);
    expect(sporeAtAge(4, "opponent", opponent).targetMonBg).toBe(true);
    expect(sporeAtAge(7, "opponent", opponent)).toMatchObject({
      alpha: { eva: 12, evb: 8 },
      sound: "SE_M_POISON_POWDER",
      soundPanSide: "opponent",
      soundLoopActive: true,
      scriptOffset: 62,
    });
    expect(sporeAtAge(176, "opponent", opponent)).toMatchObject({
      sound: "SE_M_POISON_POWDER",
      soundLoopActive: false,
    });
    expect(sporeAtAge(202, "opponent", opponent)).toMatchObject({
      alpha: null,
      scriptOffset: 42,
    });
    expect(sporeAtAge(206, "opponent", opponent)).toMatchObject({
      active: false,
      sporeLoaded: false,
      targetMonBg: false,
      particles: [],
    });
  });

  it("ports all nine staggered AnimSporeParticle lifecycles", () => {
    expect(sporeAtAge(7, "opponent", opponent).particles).toEqual([{
      index: 0,
      slot: 3,
      x: 176,
      y: 22,
      x2: 27,
      y2: 1,
      data0: 78,
      data1: 89,
      data2: 48,
      priority: 2,
      blend: true,
      callback: "AnimSporeParticle_Step",
    }]);
    expect(sporeAtAge(21, "opponent", opponent).particles).toHaveLength(2);
    expect(sporeAtAge(35, "opponent", opponent).particles).toHaveLength(3);
    expect(sporeAtAge(77, "player", player).particles).toHaveLength(6);
    expect(sporeAtAge(85, "player", player).particles[0]).toMatchObject({
      data0: 0,
      data1: 245,
      data2: 1920,
    });
    expect(sporeAtAge(86, "player", player).particles[0]?.index).toBe(1);
    expect(sporeAtAge(119, "player", player).particles).toHaveLength(6);
    expect(sporeAtAge(197, "player", player).particles).toHaveLength(1);
    expect(sporeAtAge(198, "player", player).particles).toEqual([]);
  });

  it("exposes relative age and immutable geometry without a sleep outcome", () => {
    const config: SceneOnSporeConfig = {
      move: "SPORE",
      attacker: {
        species: "PARASECT",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 56 },
          animationCenter: { x: 72, y: 88 },
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
        playerHp: 156,
        playerMaxHp: 156,
        opponentHp: 126,
        opponentMaxHp: 142,
      },
    };
    const state = createSceneOnMovePresentation(config);
    const view = sceneOnSporeView({ ...state, age: 7 });
    expect(view).toMatchObject({
      age: 7,
      attacker: { species: "PARASECT" },
      target: { species: "ONIX" },
      sound: "SE_M_POISON_POWDER",
    });
    expect(view.particles).toHaveLength(1);
    expect("sleep" in view).toBe(false);
  });

  it("pins the lowest carrier and keeps Cotton Spore independent", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/sporeSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("set 282/FRONTIER_MON_PARASECT_2");
    expect(output).toContain("nine blended gSporeParticleSpriteTemplate");
    expect(output).toContain("MOVE_COTTON_SPORE remains distinct");
  });

  it("re-extracts Parasect and ANIM_TAG_SPORE art byte-for-byte", () => {
    const out = join(mkdtempSync(join(tmpdir(), "spore-assets-")), "a.json");
    execFileSync("node", [
      "--experimental-strip-types",
      "tools/compare/extractSporeAssets.ts",
      "--out",
      out,
    ]);
    expect(JSON.parse(readFileSync(out, "utf8"))).toEqual(sporeAsset);
  });
});
