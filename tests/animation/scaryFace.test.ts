import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import scaryFaceAsset from "../../src/animation/assets/scary-face.json" with { type: "json" };
import {
  SCARY_FACE_CLEAN_BOUNDARY_AGE,
  scaryFaceAtAge,
} from "../../src/animation/scaryFace.ts";
import {
  createSceneOnMovePresentation,
  sceneOnScaryFaceView,
} from "../../src/animation/sceneOnPresentation.ts";

const state = (age: number, attacker: "player" | "opponent" = "player") =>
  scaryFaceAtAge(
    age, attacker, attacker === "player" ? "opponent" : "player",
    attacker === "player" ? { x: 72, y: 100 } : { x: 176, y: 49 },
  );

describe("MOVE_SCARY_FACE source-relative reducer", () => {
  it("ports both palette controllers, audio boundaries, and clean teardown", () => {
    expect([0, 45, 46, 142, 143, 188, 189].map((age) => [
      age, state(age).paletteBlend, state(age).soundRestart, state(age).clean,
    ])).toEqual([
      [0, "toBlack", "SE_M_PSYBEAM", false],
      [45, "toBlack", null, false],
      [46, null, null, false],
      [142, null, null, false],
      [143, "fromBlack", "SE_M_STRING_SHOT2", false],
      [188, "fromBlack", null, false],
      [SCARY_FACE_CLEAN_BOUNDARY_AGE, null, null, true],
    ]);
    expect(state(59).soundRestart).toBe("SE_M_LEER");
  });

  it("ports the side-selected BG1 task's full 0→14→0 schedule", () => {
    expect(state(59).background).toMatchObject({
      tilemap: "gBattleAnimBgTilemap_ScaryFacePlayer",
      image: "gBattleAnimBgImage_ScaryFace",
      palette: "gBattleAnimBgPalette_ScaryFace",
      task: { function: "AnimTask_ScaryFace", blendY: 0 },
    });
    expect(state(88).background?.task).toMatchObject({ phase: 1, blendY: 14 });
    expect(state(110).background?.task).toMatchObject({ phase: 2, blendY: 14 });
    expect(state(138).background?.task).toMatchObject({ phase: 3, blendY: 0 });
    expect(state(141).background?.task.phase).toBe(3);
    expect(state(142).background).toBeNull();
    expect(state(63, "opponent").background?.tilemap)
      .toBe("gBattleAnimBgTilemap_ScaryFaceOpponent");
  });

  it("ports both literal eye offsets and 0/4/8/4/0 tile frames", () => {
    expect(state(75).eyes).toEqual([]);
    expect(state(76).eyes).toEqual([
      { x: 56, y: 92, frame: 0 },
      { x: 88, y: 92, frame: 0 },
    ]);
    expect([76, 79, 83, 87, 91, 95, 96].map(
      (age) => state(age).eyes[0]?.frame ?? null,
    )).toEqual([0, 1, 2, 3, 4, 4, null]);
  });

  it("pins the ROM's shared-argument overwrite and actual patterned offsets", () => {
    expect(state(143).shakeTask).toEqual({
      shakeNum: 2,
      sourceArgs: [20, 1, false, 0],
      runtimeArgs: [20, 3, false, 16],
    });
    expect(Array.from({ length: 18 }, (_, i) => state(143 + i).targetOffset.x2))
      .toEqual([3, 0, -3, 3, 0, -3, 0, 3, -3, 0, 3, 0, -3, 3, 0, -3, 0, 3]);
    expect(state(161).targetOffset.x2).toBe(0);
  });

  it("exposes every move-owned field through the typed Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "SCARY_FACE",
      attacker: {
        species: "RHYHORN",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 60 },
          animationCenter: { x: 72, y: 100 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "SHUCKLE",
        geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 17 },
          animationCenter: { x: 176, y: 49 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      attackerEyeCenter: { x: 72, y: 100 },
      fieldProfile: {
        playerHp: 177, playerMaxHp: 177,
        opponentHp: 95, opponentMaxHp: 95,
      },
    });
    expect(sceneOnScaryFaceView({ ...stage, age: 143 })).toMatchObject({
      soundRestart: "SE_M_STRING_SHOT2",
      soundPanSide: "opponent",
      targetOffset: { x2: 3, y2: 0 },
      shakeTask: { shakeNum: 2 },
    });
  });

  it("re-extracts RHYHORN, BG1 variants, and EYE_SPARKLE byte-for-byte", () => {
    expect(scaryFaceAsset.source).toMatchObject({
      rhyhornBack: expect.stringContaining("set 133"),
      rhyhornFront: expect.stringContaining("SPECIES_RHYHORN 111"),
      target: expect.stringContaining("SHUCKLE"),
      background: expect.stringContaining("scary_face_{player,opponent}.bin"),
      eyeSparkle: expect.stringContaining("ANIM_TAG_EYE_SPARKLE"),
    });
    expect(scaryFaceAsset.rhyhornBack.tileset).toMatchObject({
      columns: 8, rows: 8,
    });
    expect(scaryFaceAsset.rhyhornFront.tileset).toMatchObject({
      columns: 8, rows: 16,
    });
    expect(scaryFaceAsset.background.tileset).toMatchObject({
      columns: 16, rows: 5,
    });
    expect(scaryFaceAsset.background.playerTilemap.entries).toHaveLength(1024);
    expect(scaryFaceAsset.background.opponentTilemap.entries).toHaveLength(1024);
    expect(scaryFaceAsset.eyeSparkle.tileset).toMatchObject({
      columns: 2, rows: 8,
    });

    const scratch = mkdtempSync(join(tmpdir(), "pokebench-scary-face-assets-"));
    const output = join(scratch, "scary-face.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve("tools/compare/extractScaryFaceAssets.ts"),
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync(resolve("src/animation/assets/scary-face.json")),
    );
  });
});
