import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import charmAsset from "../../src/animation/assets/charm.json" with { type: "json" };
import {
  CHARM_BODY_FRAME_COUNT,
  CHARM_HEART_CREATION_AGES,
  CHARM_TEARDOWN_AGE,
  charmAtAge,
  magentaHeartAtAge,
  rockMonBackAndForthAtAge,
} from "../../src/animation/charm.ts";
import {
  createSceneOnMovePresentation,
  sceneOnCharmView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";

const player = { x: 72, y: 80 };
const opponent = { x: 176, y: 40 };

describe("MOVE_CHARM source reducer", () => {
  it("ports the literal two-cycle RockMonBackAndForth task and teardown", () => {
    expect(rockMonBackAndForthAtAge(0, "player")).toMatchObject({
      active: true, x2: 2, y2: 0, rotation: -256,
      matrix: { a: 255, b: 6, c: -6, d: 255 },
    });
    expect(rockMonBackAndForthAtAge(7, "player").x2).toBe(16);
    expect(rockMonBackAndForthAtAge(23, "player").x2).toBe(-16);
    expect(rockMonBackAndForthAtAge(31, "player").x2).toBe(0);
    expect(rockMonBackAndForthAtAge(63, "opponent").x2).toBe(0);
    expect(rockMonBackAndForthAtAge(64, "player")).toMatchObject({
      active: false, x2: 0, y2: 0,
      matrix: { a: 256, b: 0, c: 0, d: 256 },
    });
  });

  it("ports all three 17-display-cadence MagentaHeart callbacks", () => {
    expect(CHARM_HEART_CREATION_AGES).toEqual([0, 17, 34]);
    expect(charmAtAge(34, "player", player).hearts.map((heart) => ({
      identity: heart.identity, slot: heart.slot, x: heart.x, y: heart.y,
    }))).toEqual([
      { identity: "heart-0", slot: 3, x: 72, y: 100 },
      { identity: "heart-1", slot: 4, x: 52, y: 100 },
      { identity: "heart-2", slot: 5, x: 92, y: 100 },
    ]);
    expect(charmAtAge(34, "opponent", opponent).hearts.map((heart) => heart.x))
      .toEqual([176, 196, 156]);
    expect(magentaHeartAtAge(0, 0, "player", player)).toMatchObject({
      age: 0, data0: 2, data1: 14, data2: -256, x2: 1, y2: -1,
    });
    expect(magentaHeartAtAge(57, 0, "player", player)).not.toBeNull();
    expect(magentaHeartAtAge(58, 0, "player", player)).toBeNull();
  });

  it("pins sound restarts and the complete move-owned cleanup frame", () => {
    expect(Array.from({ length: CHARM_BODY_FRAME_COUNT }, (_, age) =>
      charmAtAge(age, "player", player).soundRestart
        ? age
        : null).filter((age) => age !== null)).toEqual([0, 17, 34]);
    expect(charmAtAge(CHARM_TEARDOWN_AGE - 1, "player", player))
      .toMatchObject({ visualActive: true });
    expect(charmAtAge(CHARM_TEARDOWN_AGE, "player", player))
      .toMatchObject({
        assetsLoaded: true,
        visualActive: false,
        hearts: [],
        rock: { active: false, x2: 0, y2: 0 },
      });
  });

  it("regenerates ANIM_TAG_MAGENTA_HEART byte-for-byte from pinned source", () => {
    expect(charmAsset.source).toMatchObject({
      carrier: expect.stringContaining("FRONTIER_MON_MINUN_1 set 187"),
      target: expect.stringContaining("SHUCKLE"),
      magentaHeart: expect.stringContaining("ANIM_TAG_MAGENTA_HEART"),
    });
    expect(charmAsset.magentaHeart.tileset).toMatchObject({
      columns: 2, rows: 2,
    });
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-charm-assets-"));
    const output = join(scratch, "charm.json");
    execFileSync("node", [
      "--experimental-strip-types",
      resolve("tools/compare/extractCharmAssets.ts"),
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync(resolve("src/animation/assets/charm.json")),
    );
  });
});

describe("MOVE_CHARM typed presentation seam", () => {
  const battler = (
    species: SceneOnPresentationBattler["species"], side: "player" | "opponent",
  ): SceneOnPresentationBattler => ({
    species,
    geometry: {
      side,
      spriteCorner: side === "player" ? { x: 40, y: 48 } : { x: 144, y: 12 },
      animationCenter: side === "player" ? { x: 72, y: 88 } : { x: 176, y: 44 },
      battlePositionCenter: side === "player" ? player : opponent,
    },
  });

  it("threads MINUN geometry through relative age without stat ownership", () => {
    const stage = createSceneOnMovePresentation({
      move: "CHARM",
      attacker: battler("MINUN", "player"),
      target: battler("SHUCKLE", "opponent"),
      fieldProfile: {
        playerHp: 110, playerMaxHp: 110,
        opponentHp: 100, opponentMaxHp: 100,
      },
    });
    expect(sceneOnCharmView({ ...stage, age: 34 })).toMatchObject({
      age: 34,
      attacker: { species: "MINUN" },
      target: { species: "SHUCKLE" },
      hearts: [{ x: 72 }, { x: 52 }, { x: 92 }],
    });
    expect(() => sceneOnCharmView({
      ...stage,
      config: { ...stage.config, move: "SPARK" } as never,
    })).toThrow("expected CHARM presentation");
  });

  it("renders both exact MINUN/SHUCKLE orientations through the shared seam", () => {
    for (const side of ["player", "opponent"] as const) {
      const stage = createSceneOnMovePresentation({
        move: "CHARM",
        attacker: battler("MINUN", side),
        target: battler("SHUCKLE", side === "player" ? "opponent" : "player"),
        fieldProfile: side === "player"
          ? {
              playerHp: 167, playerMaxHp: 167,
              opponentHp: 127, opponentMaxHp: 127,
            }
          : {
              playerHp: 127, playerMaxHp: 127,
              opponentHp: 167, opponentMaxHp: 167,
            },
      });
      const first = render({
        ...createInitialState(),
        rngMode: "frontierBattle",
        sceneOnPresentation: { ...stage, age: 0 },
      });
      const heart = render({
        ...createInitialState(),
        rngMode: "frontierBattle",
        sceneOnPresentation: { ...stage, age: 34 },
      });
      expect(first).toHaveLength(240 * 160 * 4);
      expect(heart).not.toEqual(first);
    }
  });
});
