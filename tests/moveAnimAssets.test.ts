import { describe, expect, it } from "vitest";
import rocks from "../src/assets/gen/battle-anim-rocks.json" with { type: "json" };
import scripts from "../src/data/gen/battle-move-anim-scripts.json" with { type: "json" };
import tables from "../src/data/gen/battle-move-anim-tables.json" with { type: "json" };

describe("battle-anim-rocks.json (S7 groundwork: ROCK_SLIDE's gFallingRockSpriteTemplate art)", () => {
  it("pins rocks.png's tileset shape (4x24 tiles = 96, matching the compiled 0x0C00-byte sheet)", () => {
    expect(rocks.tileset.columns).toBe(4);
    expect(rocks.tileset.rows).toBe(24);
    expect(rocks.tileset.tiles.length).toBe(96);
    expect(rocks.palette.length).toBe(16);
  });

  it("pins gFallingRockSpriteTemplate's own anim frames (sAnims_FlyingRock -> frames 2/3/4)", () => {
    expect(rocks.fallingRockAnims.frames).toEqual([2, 3, 4]);
  });
});

describe("battle-move-anim-scripts.json (S7 groundwork: decoded battle_anim_scripts.s step lists)", () => {
  it("pins ROCK_SLIDE's rock count (4 main + 8x2 subroutine)", () => {
    expect(scripts.ROCK_SLIDE.totalRockSprites).toBe(20);
    const createsprites = scripts.ROCK_SLIDE.main.filter((s) => s.op === "createsprite");
    expect(createsprites.length).toBe(4);
    const subCreatesprites = scripts.ROCK_SLIDE.subroutines.RockSlideRocks.filter((s) => s.op === "createsprite");
    expect(subCreatesprites.length).toBe(8);
  });

  it("pins DOUBLE_TEAM's alpha-blend setup and sound-cue delay schedule", () => {
    const setalpha = scripts.DOUBLE_TEAM.main.find((s) => s.op === "setalpha");
    expect(setalpha?.args).toEqual({ eva: 12, evb: 8 });
    const delays = scripts.DOUBLE_TEAM.main.filter((s) => s.op === "delay").map((s) => s.frames);
    expect(delays).toEqual([32, 24, 16, 8, 8, 8, 8, 8, 1]);
  });
});

describe("battle-move-anim-tables.json (S7 groundwork: shared per-hit/per-move formulas)", () => {
  it("pins the generic hit-flash timing (every damaging move, not just ROCK_SLIDE)", () => {
    expect(tables.hitFlash.healthboxWobble).toEqual({ periodTicks: 1, totalTicks: 21, amplitudePx: 1 });
    expect(tables.hitFlash.spriteBlink).toEqual({ toggleEveryTicks: 4, totalTicks: 32, blinkCycles: 4 });
  });

  it("pins the falling-rock ellipse-motion phase constants", () => {
    expect(tables.fallingRock.phase1).toEqual({ durationTicks: 16, circlePosStart: 0, circlePosStep: 4, amplitudeX: 0, amplitudeY: -70 });
    expect(tables.fallingRock.phase2.durationTicks).toBe(32);
    expect(tables.fallingRock.phase2.amplitudeY).toBe(-24);
  });

  it("pins DOUBLE_TEAM's clone palette-blend and BLDALPHA constants", () => {
    expect(tables.doubleTeam.cloneCount).toBe(2);
    expect(tables.doubleTeam.paletteBlend).toEqual({ towardColor: "RGB_BLACK", coefficient16ths: 11 });
    expect(tables.doubleTeam.bldalpha).toEqual({ eva: 12, evb: 8 });
  });
});
