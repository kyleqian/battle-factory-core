import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COVET_CLEANUP_AGE,
  COVET_CHARM_START_AGE,
  COVET_FRAME_COUNT,
  COVET_ITEM_BAG_LOAD_AGE,
  COVET_SHAKE_START_AGE,
  covetAtAge,
} from "../../src/animation/covet.ts";
import {
  createSceneOnMovePresentation,
  sceneOnCovetView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";

describe("MOVE_COVET source reducer", () => {
  it("ports both source loads and the complete Charm prefix", () => {
    expect(covetAtAge(0, "player", { x: 72, y: 80 })).toMatchObject({
      heartAssetLoaded: true, itemBagAssetLoaded: false,
      charm: { visualActive: false },
    });
    expect(covetAtAge(COVET_ITEM_BAG_LOAD_AGE, "player", { x: 72, y: 80 }))
      .toMatchObject({ heartAssetLoaded: true, itemBagAssetLoaded: true });
    expect(covetAtAge(COVET_CHARM_START_AGE, "player", { x: 72, y: 80 }))
      .toMatchObject({
        charm: { rock: { x2: 2 }, hearts: [{ x: 72 }], soundRestart: "SE_M_CHARM" },
      });
  });

  it("ports terminal target ShakeMon2, side audio, and cleanup", () => {
    expect(covetAtAge(COVET_SHAKE_START_AGE, "player", { x: 72, y: 80 }))
      .toMatchObject({
        targetOffset: { x2: -2, y2: 0 }, shakeActive: true,
        soundRestart: "SE_M_DIZZY_PUNCH", soundPanSide: "opponent",
      });
    expect(covetAtAge(COVET_SHAKE_START_AGE + 13, "opponent", { x: 176, y: 40 }))
      .toMatchObject({ targetOffset: { x2: -2, y2: 0 }, shakeActive: true });
    expect(covetAtAge(COVET_SHAKE_START_AGE + 14, "player", { x: 72, y: 80 }))
      .toMatchObject({ targetOffset: { x2: 0, y2: 0 }, shakeActive: false });
    expect(COVET_FRAME_COUNT).toBe(114);
    expect(covetAtAge(COVET_CLEANUP_AGE, "player", { x: 72, y: 80 }))
      .toMatchObject({
        heartAssetLoaded: true, itemBagAssetLoaded: true, active: true,
        targetOffset: { x2: 0, y2: 0 }, shakeActive: false,
      });
  });

  it("regenerates LINOONE and ITEM_BAG assets byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-covet-assets-"));
    const output = join(scratch, "covet.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/extractCovetAssets.ts",
      "--out", output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/covet.json"),
    );
  });

  it("threads both legal orientations through the typed shared seam", () => {
    const battler = (
      species: SceneOnPresentationBattler["species"],
      side: "player" | "opponent",
    ): SceneOnPresentationBattler => ({
      species,
      geometry: {
        side,
        spriteCorner: side === "player" ? { x: 40, y: 63 } : { x: 144, y: 11 },
        animationCenter: side === "player" ? { x: 72, y: 95 } : { x: 176, y: 43 },
        battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
      },
    });
    for (const side of ["player", "opponent"] as const) {
      const stage = createSceneOnMovePresentation({
        move: "COVET",
        attacker: battler("LINOONE", side),
        target: battler("SHUCKLE", side === "player" ? "opponent" : "player"),
        fieldProfile: side === "player"
          ? { playerHp: 185, playerMaxHp: 185, opponentHp: 127, opponentMaxHp: 127 }
          : { playerHp: 127, playerMaxHp: 127, opponentHp: 185, opponentMaxHp: 185 },
      });
      expect(sceneOnCovetView({ ...stage, age: COVET_SHAKE_START_AGE }))
        .toMatchObject({
          attacker: { species: "LINOONE" }, target: { species: "SHUCKLE" },
          shakeActive: true,
        });
      expect(render({
        ...createInitialState(), rngMode: "frontierBattle",
        sceneOnPresentation: { ...stage, age: COVET_CHARM_START_AGE },
      })).toHaveLength(240 * 160 * 4);
    }
  });
});
