import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import attractAsset from "../../src/animation/assets/attract.json" with {
  type: "json",
};
import {
  ATTRACT_FRAME_COUNT,
  attractAtAge,
} from "../../src/animation/attract.ts";
import {
  createSceneOnMovePresentation,
  sceneOnAttractView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_ATTRACT source-relative presentation", () => {
  it("ports every source lifecycle and complete cleanup", () => {
    expect(ATTRACT_FRAME_COUNT).toBe(435);
    const player = { x: 72, y: 98 };
    const target = { x: 176, y: 42 };
    expect(attractAtAge(21, "player", player, target).projectile).not.toBeNull();
    expect(attractAtAge(117, "player", player, target).bursts).toHaveLength(6);
    expect(attractAtAge(161, "player", player, target).rising).toHaveLength(8);
    expect(attractAtAge(225, "player", player, target).heartsBackground)
      .toMatchObject({ visible: true, eva: 16, evb: 0 });
    expect(attractAtAge(434, "player", player, target)).toMatchObject({
      active: false,
      redHeartLoaded: true,
      projectile: null,
      bursts: [],
      rising: [],
      heartsBackground: { loaded: false, visible: false },
    });
  });

  it("keeps outcome state outside the typed seam", () => {
    const state = createSceneOnMovePresentation({
      move: "ATTRACT",
      attacker: {
        species: "EEVEE",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 58 },
          animationCenter: { x: 72, y: 98 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 148, playerMaxHp: 148,
        opponentHp: 117, opponentMaxHp: 117,
      },
    });
    const view = sceneOnAttractView({ ...state, age: 238 });
    expect(view.targetBlendCoefficient).toBe(0);
    expect("infatuation" in view).toBe(false);
  });

  it("pins the sole body and every no-animation failure route", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/attractSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("set 113/FRONTIER_MON_EEVEE");
    expect(output).toContain("one opposite-gender success body");
    expect(output).toContain("select no animation body");
  });

  it("re-extracts the Attract BG image, tilemap, and palette", () => {
    const out = join(mkdtempSync(join(tmpdir(), "attract-assets-")), "a.json");
    execFileSync("node", [
      "--experimental-strip-types",
      "tools/compare/extractAttractAssets.ts",
      "--out",
      out,
    ]);
    expect(JSON.parse(readFileSync(out, "utf8"))).toEqual(attractAsset);
  });
});
