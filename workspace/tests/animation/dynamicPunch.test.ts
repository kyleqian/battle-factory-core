import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import dynamicPunchAsset from "../../src/animation/assets/dynamicPunch.json" with { type: "json" };
import {
  DYNAMIC_PUNCH_BODY_LAST_AGE,
  DYNAMIC_PUNCH_EXPLOSION_FIRST_AGE,
  dynamicPunchAtAge,
} from "../../src/animation/dynamicPunch.ts";
import {
  sceneOnDynamicPunchView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_DYNAMIC_PUNCH source-relative reducer", () => {
  const player = (age: number) => dynamicPunchAtAge(
    age, "player", { x: 176, y: 49 }, { x: 176, y: 40 },
  );
  const opponent = (age: number) => dynamicPunchAtAge(
    age, "opponent", { x: 72, y: 91 }, { x: 72, y: 80 },
  );

  it("ports the fist, animation-0 hitsplat, and first ShakeMon body", () => {
    expect(player(0)).toMatchObject({
      fistVisible: true,
      hitsplatVisible: true,
      fistPosition: { x: 176, y: 49 },
      hitsplatMatrix: { a: 256, b: 0, c: 0, d: 256 },
      targetX2: 0,
      targetOnMonBg: true,
      alpha: { eva: 12, evb: 8 },
      sound: "SE_M_VITAL_THROW2",
    });
    expect([0, 1, 2, 3, 12, 13].map((age) => player(age).targetX2))
      .toEqual([0, 0, 5, 5, 0, 0]);
    expect(player(8).hitsplatVisible).toBe(true);
    expect(player(9).hitsplatVisible).toBe(false);
    expect(player(20).fistVisible).toBe(true);
    expect(player(21).fistVisible).toBe(false);
  });

  it("reuses exactly five target-relative explosion instances and ShakeMon2", () => {
    expect(DYNAMIC_PUNCH_EXPLOSION_FIRST_AGE).toBe(19);
    expect(player(19).explosions).toEqual([
      { spawnIndex: 0, age: 0, x: 176, y: 40, frame: 0 },
    ]);
    expect(player(27).explosions.at(-1)).toMatchObject({
      spawnIndex: 1, x: 200, y: 16,
    });
    expect(opponent(27).explosions.at(-1)).toMatchObject({
      spawnIndex: 1, x: 48, y: 56,
    });
    expect(player(51).explosions.some((sprite) => sprite.spawnIndex === 4))
      .toBe(true);
    expect(player(70).explosions).toHaveLength(1);
    expect(player(71).explosions).toHaveLength(0);
    expect([19, 20, 21, 22, 71, 72, 73].map((age) => player(age).targetX2))
      .toEqual([-5, -5, 5, 5, -5, -5, 0]);
    expect([19, 27, 35, 43, 51].map((age) => player(age).sound))
      .toEqual(Array(5).fill("SE_M_SELF_DESTRUCT"));
  });

  it("owns alpha/monbg cleanup without damage or controller state", () => {
    expect(DYNAMIC_PUNCH_BODY_LAST_AGE).toBe(74);
    expect(player(73)).toMatchObject({
      targetX2: 0,
      targetOnMonBg: true,
      alpha: { eva: 12, evb: 8 },
      active: true,
    });
    expect(player(74)).toMatchObject({
      targetX2: 0,
      targetOnMonBg: false,
      alpha: null,
      active: true,
    });
    expect(player(75).active).toBe(false);
  });

  it("exposes the reducer through a typed relative Scene-ON seam", () => {
    const stage = {
      age: 0,
      config: {
        move: "DYNAMIC_PUNCH" as const,
        attacker: {
        species: "HITMONCHAN",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 60 },
          animationCenter: { x: 72, y: 92 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
        target: {
        species: "SHUCKLE",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 17 },
          animationCenter: { x: 176, y: 49 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
        fieldProfile: {
          playerHp: 157, playerMaxHp: 157,
          opponentHp: 58, opponentMaxHp: 95,
        },
      },
    } as const;
    expect(sceneOnDynamicPunchView({ ...stage, age: 27 })).toMatchObject({
      age: 27,
      attacker: { species: "HITMONCHAN" },
      target: { species: "SHUCKLE" },
      explosions: expect.arrayContaining([
        expect.objectContaining({ spawnIndex: 1, x: 200, y: 16 }),
      ]),
    });
  });

  it("pins source-derived set-339 carrier and effect art", () => {
    expect(dynamicPunchAsset.source).toMatchObject({
      hitmonchanBack: expect.stringContaining("set 339"),
      hitmonchanFront: expect.stringContaining("SPECIES_HITMONCHAN 107"),
      fist: expect.stringContaining("gFistFootSpriteTemplate anim 0"),
      hitsplat: expect.stringContaining("gBasicHitSplatSpriteTemplate anim 0"),
    });
    expect(dynamicPunchAsset.hitmonchanBack.tileset).toMatchObject({
      columns: 8,
      rows: 8,
    });
    expect(dynamicPunchAsset.hitmonchanFront.tileset).toMatchObject({
      columns: 8,
      rows: 16,
    });
    expect(dynamicPunchAsset.fist.tileset).toMatchObject({
      columns: 4,
      rows: 16,
    });
    expect(dynamicPunchAsset.hitsplat.tileset).toMatchObject({
      columns: 4,
      rows: 4,
    });
  });

  it("re-extracts the carrier and effect art byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "dynamic-punch-assets-"));
    const output = join(directory, "dynamicPunch.json");
    execFileSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "tools/compare/extractDynamicPunchAssets.ts",
        "--out",
        output,
      ],
      { stdio: "pipe" },
    );
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/dynamicPunch.json"),
    );
  });
});
