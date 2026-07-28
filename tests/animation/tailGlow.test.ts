import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import asset from "../../src/animation/assets/tail-glow.json" with { type: "json" };
import {
  TAIL_GLOW_BODY_FRAME_COUNT,
  TAIL_GLOW_ORB_CREATION_AGE,
  TAIL_GLOW_SOUND_AGES,
  tailGlowAtAge,
  tailGlowOrbMatrixScale,
} from "../../src/animation/tailGlow.ts";
import {
  createSceneOnMovePresentation,
  sceneOnTailGlowView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

const battler = (
  species: SceneOnPresentationBattler["species"], side: "player" | "opponent",
): SceneOnPresentationBattler => ({
  species,
  geometry: {
    side,
    spriteCorner: side === "player" ? { x: 40, y: 64 } : { x: 144, y: 16 },
    animationCenter: side === "player" ? { x: 72, y: 96 } : { x: 176, y: 48 },
    battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
  },
});

describe("MOVE_TAIL_GLOW source reducer", () => {
  it("ports the complete affine program and cleanup", () => {
    expect(TAIL_GLOW_ORB_CREATION_AGE).toBe(21);
    expect(tailGlowOrbMatrixScale(0)).toBe(2730);
    expect(tailGlowOrbMatrixScale(17)).toBe(409);
    expect(tailGlowOrbMatrixScale(18)).toBe(422);
    expect(tailGlowOrbMatrixScale(25)).toBe(546);
    expect(tailGlowOrbMatrixScale(33)).toBe(409);
    expect(tailGlowOrbMatrixScale(115)).toBe(409);
    expect(tailGlowOrbMatrixScale(116)).toBeNull();
    expect(tailGlowAtAge(21, "player", { x: 72, y: 96 }).orb)
      .toMatchObject({ slot: 3, x: 72, y: 114, matrixScale: 2730 });
    expect(tailGlowAtAge(TAIL_GLOW_BODY_FRAME_COUNT, "player", { x: 72, y: 96 }))
      .toMatchObject({ assetsLoaded: false, orb: null, bgBlendY: 0, monBg: false });
  });

  it("pins source palette, alpha, and side-relative sound ages", () => {
    expect(TAIL_GLOW_SOUND_AGES).toEqual([42, 58, 74, 90, 106, 122]);
    expect(tailGlowAtAge(6, "player", { x: 72, y: 96 }))
      .toMatchObject({ bgBlendY: 0, alpha: { eva: 12, evb: 8 }, monBg: true });
    expect(tailGlowAtAge(17, "player", { x: 72, y: 96 }).bgBlendY).toBe(4);
    expect(tailGlowAtAge(42, "player", { x: 72, y: 96 }))
      .toMatchObject({ soundRestart: "SE_M_MORNING_SUN", soundPan: -64 });
    expect(tailGlowAtAge(42, "opponent", { x: 176, y: 48 }).soundPan).toBe(63);
    expect(tailGlowAtAge(140, "player", { x: 72, y: 96 }))
      .toMatchObject({ alpha: null, monBg: false });
  });

  it("regenerates CIRCLE_OF_LIGHT and records distinct sibling dependencies", () => {
    expect(asset.source.carrier).toContain("FRONTIER_MON_VOLBEAT_2 set 277");
    expect(asset.source.siblings.MOVE_SUPERPOWER).toContain("METEOR/FLAT_ROCK");
    expect(asset.source.siblings.MOVE_SHOCK_WAVE).toContain("LIGHTNING");
    expect(asset.source.volbeatBack).toContain("FRONTIER_MON_VOLBEAT_2 set 277");
    expect(asset.source.volbeatFront).toContain("anim_front.png frame 0");
    expect(asset.source.reused).toContain("SHUCKLE");
    expect(asset.circleOfLight.tileset).toMatchObject({ columns: 8, rows: 8 });
    expect(asset.volbeatBack.tileset).toMatchObject({ columns: 8, rows: 8 });
    expect(asset.volbeatFront.tileset).toMatchObject({ columns: 8, rows: 16 });
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-tail-glow-assets-"));
    const output = join(scratch, "tail-glow.json");
    execFileSync("node", [
      "--experimental-strip-types",
      resolve("tools/compare/extractTailGlowAssets.ts"),
      "--out", output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync(resolve("src/animation/assets/tail-glow.json")),
    );
  });
});

describe("MOVE_TAIL_GLOW typed presentation seam", () => {
  it("threads both legal VOLBEAT orientations through relative age", () => {
    for (const side of ["player", "opponent"] as const) {
      const stage = createSceneOnMovePresentation({
        move: "TAIL_GLOW",
        attacker: battler("VOLBEAT", side),
        target: battler("SHUCKLE", side === "player" ? "opponent" : "player"),
        attackerPictureOffset: side === "player" ? { x: 72, y: 96 } : { x: 176, y: 48 },
        fieldProfile: {
          playerHp: side === "player" ? 140 : 127,
          playerMaxHp: side === "player" ? 140 : 127,
          opponentHp: side === "player" ? 127 : 140,
          opponentMaxHp: side === "player" ? 127 : 140,
        },
      });
      expect(sceneOnTailGlowView({ ...stage, age: 21 })).toMatchObject({
        age: 21, attacker: { species: "VOLBEAT" },
        orb: { x: side === "player" ? 72 : 176, y: side === "player" ? 114 : 66 },
      });
    }
  });
});
