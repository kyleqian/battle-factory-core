import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  steelWingAtAge,
  steelWingEllipticalAtTick,
  steelWingGustAtTick,
  steelWingGustPaletteRotationAtTick,
} from "../../src/animation/steelWing.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSteelWingView,
} from "../../src/animation/sceneOnPresentation.ts";
import { renderSceneOnMovePresentation } from "../../src/engine/battleScene.ts";

const playerStage = () => createSceneOnMovePresentation({
  move: "STEEL_WING" as const,
  attacker: { species: "WINGULL" as const, geometry: {
    side: "player" as const, spriteCorner: { x: 40, y: 62 },
    animationCenter: { x: 72, y: 94 }, battlePositionCenter: { x: 72, y: 80 },
  } },
  target: { species: "ONIX" as const, geometry: {
    side: "opponent" as const, spriteCorner: { x: 144, y: 10 },
    animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 },
  } },
  fieldProfile: { playerHp: 100, playerMaxHp: 100, opponentHp: 110, opponentMaxHp: 110 },
});

describe("MOVE_STEEL_WING source reducer", () => {
  it("ports the elliptical u8 phase loop and terminal restoration", () => {
    expect(steelWingEllipticalAtTick(0)).toEqual({ x2: 0, y2: 0, active: true });
    expect(steelWingEllipticalAtTick(4)).toEqual({ x2: 12, y2: 4, active: true });
    expect(steelWingEllipticalAtTick(8)).toEqual({ x2: 0, y2: 8, active: true });
    expect(steelWingEllipticalAtTick(16)).toEqual({ x2: 0, y2: 0, active: false });
  });

  it("ports the 1/70 faded-palette rotation cadence", () => {
    expect([0, 1, 2, 68, 69, 70].map(steelWingGustPaletteRotationAtTick))
      .toEqual([0, 1, 1, 34, 35, 35]);
  });

  it("ports both 24-tick affine then 20-tick linear gust lifecycles", () => {
    const start = steelWingGustAtTick(0, 0, "player", { x: 72, y: 80 }, { x: 176, y: 42 });
    const handoff = steelWingGustAtTick(24, 0, "player", { x: 72, y: 80 }, { x: 176, y: 42 });
    expect(start).toMatchObject({ x: 47, y: 88, xScale: 26, yScale: 256 });
    expect(handoff).toMatchObject({ xScale: 256, yScale: 256, affineAge: 24 });
    expect(steelWingGustAtTick(45, 0, "player", { x: 72, y: 80 }, { x: 176, y: 42 })).toMatchObject({ xScale: 256, yScale: 256 });
    expect(steelWingGustAtTick(46, 0, "player", { x: 72, y: 80 }, { x: 176, y: 42 })).toBeNull();
  });

  it("mirrors the attacker slide, reuses non-permanent shine, and emits two animation-1 hitsplats", () => {
    const player = steelWingAtAge(155, "player", { x: 72, y: 80 }, { x: 176, y: 42 });
    const opponent = steelWingAtAge(155, "opponent", { x: 176, y: 42 }, { x: 72, y: 88 });
    // Q8.8 truncation leaves the 9-callback slide at +/-23 until teardown.
    expect(player.attackerX2).toBe(23);
    expect(opponent.attackerX2).toBe(-24);
    expect(player.metallic.attackerGrayscale).toBe(false);
    expect(player.hitsplats).toEqual([
      { x: 192, y: 42, animation: 1 }, { x: 160, y: 42, animation: 1 },
    ]);
  });

  it("source-audits Steel Wing and the two explicit no-credit siblings", () => {
    const run = spawnSync(process.execPath, ["--experimental-strip-types", "tools/compare/steelWingSourceAudit.ts"], { encoding: "utf8" });
    expect(run.stderr).toBe("");
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("Wing Attack/Razor Wind remain no-credit");
  });

  it("exposes the reducer through the typed Scene-ON seam", () => {
    const view = sceneOnSteelWingView({ ...playerStage(), age: 155 });
    expect(view).toMatchObject({ age: 155, monbg: true, alpha: true });
    expect(view.hitsplats).toHaveLength(2);
  });

  it("composites source assets through the production renderer", () => {
    const fb = new Uint8Array(240 * 160 * 4);
    renderSceneOnMovePresentation(fb, { ...playerStage(), age: 120 });
    expect(fb.every((value, index) => index % 4 !== 3 || value === 255)).toBe(true);
    expect(fb.some((value, index) => index % 4 !== 3 && value !== 0)).toBe(true);
  });
});
