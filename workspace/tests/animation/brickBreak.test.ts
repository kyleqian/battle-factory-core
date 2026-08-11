import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BRICK_BREAK_NORMAL_FRAME_COUNT,
  BRICK_BREAK_SHATTERED_FRAME_COUNT,
  brickBreakAtAge,
} from "../../src/animation/brickBreak.ts";
import {
  createSceneOnMovePresentation,
  sceneOnBrickBreakView,
} from "../../src/animation/sceneOnPresentation.ts";
import asset from "../../src/animation/assets/brick-break.json" with { type: "json" };

const attacker = {
  species: "LOMBRE" as const,
  geometry: {
    side: "player" as const,
    spriteCorner: { x: 40, y: 56 },
    animationCenter: { x: 72, y: 88 },
    battlePositionCenter: { x: 72, y: 80 },
  },
};
const target = {
  species: "ONIX" as const,
  geometry: {
    side: "opponent" as const,
    spriteCorner: { x: 144, y: 10 },
    animationCenter: { x: 176, y: 42 },
    battlePositionCenter: { x: 176, y: 40 },
  },
};

describe("MOVE_BRICK_BREAK source-relative reducer", () => {
  it("ports the common lunge, three impacts, fist, blend, and cleanup", () => {
    const at = (age: number) =>
      brickBreakAtAge(age, "normal", "player", { x: 176, y: 42 }, { x: 176, y: 40 });
    expect(at(16).attackerOffset.x2).toBe(8);
    expect(at(18).attackerOffset.x2).toBe(24);
    expect(at(25).sprites).toContainEqual(expect.objectContaining({
      kind: "hitsplat", x: 158, y: 24,
    }));
    expect(at(76)).toMatchObject({
      attackerOffset: { x2: -1, y2: 0 }, windUpTask: "step1",
    });
    expect(at(99)).toMatchObject({
      attackerOffset: { x2: -24, y2: 0 }, windUpTask: "step2",
    });
    expect(at(115).sprites.map((sprite) => sprite.kind).sort())
      .toEqual(["fist", "hitsplat"]);
    expect(at(BRICK_BREAK_NORMAL_FRAME_COUNT - 1)).toMatchObject({
      active: false, assetsLoaded: false,
    });
  });

  it("ports the independent wall shake and all four TORN_METAL flights", () => {
    const at = (age: number) =>
      brickBreakAtAge(age, "shattered-wall", "player", { x: 176, y: 42 }, { x: 176, y: 40 });
    expect(at(22).sprites).toContainEqual(expect.objectContaining({
      kind: "wall", x: 176, y: 40, x2: 0,
    }));
    expect(at(113).sprites).toContainEqual(expect.objectContaining({
      kind: "wall", x2: 2,
    }));
    expect(at(127).sprites.filter((sprite) => sprite.kind === "shard"))
      .toEqual([
        expect.objectContaining({ cell: 0, x: 165, y: 25, oamSlot: 3 }),
        expect.objectContaining({ cell: 1, x: 187, y: 25, oamSlot: 4 }),
        expect.objectContaining({ cell: 2, x: 165, y: 55, oamSlot: 5 }),
        expect.objectContaining({ cell: 3, x: 187, y: 55, oamSlot: 7 }),
      ]);
    expect(at(166).sprites.filter((sprite) => sprite.kind === "shard"))
      .toHaveLength(4);
    expect(at(BRICK_BREAK_SHATTERED_FRAME_COUNT - 1).active).toBe(false);
  });

  it("threads the controller-selected body through the typed Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "BRICK_BREAK", body: "shattered-wall", attacker, target,
      fieldProfile: {
        playerHp: 167, playerMaxHp: 167,
        opponentHp: 110, opponentMaxHp: 110,
        playerGender: "male", opponentGender: "male",
      },
    });
    expect(sceneOnBrickBreakView({ ...stage, age: 127 }))
      .toMatchObject({ body: "shattered-wall", attacker, target });
  });

  it("regenerates the independent TORN_METAL asset byte-for-byte", () => {
    expect(asset).toMatchObject({
      tornMetal: { tileset: { columns: 16, rows: 4 } },
    });
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-brick-assets-"));
    const output = join(scratch, "brick-break.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve("tools/compare/extractBrickBreakAssets.ts"),
      "--out", output,
    ]);
    expect(readFileSync(output))
      .toEqual(readFileSync(resolve("src/animation/assets/brick-break.json")));
  });
});
