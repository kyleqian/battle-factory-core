import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import leechSeedAsset from "../../src/animation/assets/leech-seed.json" with { type: "json" };
import {
  LEECH_SEED_PROJECTILES,
  leechSeedMainAtAge,
  leechSeedResidualAtAge,
} from "../../src/animation/leechSeed.ts";
import {
  createSceneOnMovePresentation,
  sceneOnLeechSeedView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_LEECH_SEED source-relative reducer", () => {
  it("ports all three literal arcs and hidden/sprout/destroy callbacks", () => {
    expect(LEECH_SEED_PROJECTILES).toEqual([
      { spawnAge: 4, targetX: 0, targetY: 24, duration: 35, waveAmplitude: -32 },
      { spawnAge: 14, targetX: -16, targetY: 24, duration: 35, waveAmplitude: -40 },
      { spawnAge: 24, targetX: 16, targetY: 24, duration: 35, waveAmplitude: -37 },
    ]);
    const state = (age: number) => leechSeedMainAtAge(
      age, "player", { x: 72, y: 101 }, { x: 176, y: 40 }, { x2: 1, y2: 0 },
    );
    expect(state(4).sprites[0]).toMatchObject({ callback: "arc", visible: true });
    expect(state(39).sprites[0]).toMatchObject({ callback: "hidden-wait", visible: false });
    expect(state(51).sprites[0]).toMatchObject({ callback: "sprout", visible: true, frameOffset: 4 });
    expect(state(112).sprites[0]).toMatchObject({ callback: "destroy", visible: true });
    expect(state(4).loadedTags).toEqual(["ANIM_TAG_SEED"]);
    expect(state(140)).toMatchObject({ sprites: [], loadedTags: [], active: false });
  });

  it("owns General's roles and complete nested residual schedule independently", () => {
    const state = (age: number) => leechSeedResidualAtAge(
      age, { x: 176, y: 42 }, { x: 72, y: 101 }, "player", { x2: 1, y2: 0 },
    );
    expect([0, 2, 45, 93, 140, 176].map((age) => state(age).sourceOwner))
      .toEqual(["General_LeechSeedDrain", "Move_ABSORB", "AbsorbEffect",
        "Move_ABSORB", "HealingEffect", "Move_ABSORB"]);
    expect(state(27).sprites).toContainEqual(expect.objectContaining({ kind: "hitsplat" }));
    expect(state(45).sprites).toContainEqual(expect.objectContaining({ kind: "orb", spawnIndex: 0 }));
    expect(state(140).sprites).toContainEqual(expect.objectContaining({ kind: "star", spawnIndex: 0 }));
    expect(state(2).loadedTags).toEqual(["ANIM_TAG_ORBS", "ANIM_TAG_BLUE_STAR", "ANIM_TAG_IMPACT"]);
    expect(state(206)).toMatchObject({ sprites: [], loadedTags: [], active: false });
  });

  it("threads the body discriminant and immutable natural geometry through the typed seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "LEECH_SEED", body: "main",
      attacker: { species: "EXEGGCUTE", geometry: { side: "player",
        spriteCorner: { x: 40, y: 61 }, animationCenter: { x: 72, y: 93 },
        battlePositionCenter: { x: 72, y: 80 } } },
      target: { species: "ONIX", geometry: { side: "opponent",
        spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 },
        battlePositionCenter: { x: 176, y: 40 } } },
      effectCenter: { x: 72, y: 101 }, targetRestOffset: { x2: 1, y2: 0 },
      allocatorProfile: { seeds: [3, 4, 5], hitsplat: 3,
        orbs: [3, 4, 5, 7, 9, 10, 11, 12], stars: [3, 4, 5, 3],
        paletteController: 3 },
      fieldProfile: { playerHp: 145, playerMaxHp: 156,
        opponentHp: 110, opponentMaxHp: 110, playerGender: "male", opponentGender: "male" },
    });
    expect(sceneOnLeechSeedView({ ...stage, age: 4 }).sprites[0])
      .toMatchObject({ x: 87, y: 101, spawnIndex: 0 });
  });

  it("regenerates the literal SEED sheet and palette byte-for-byte", () => {
    expect(leechSeedAsset).toMatchObject({ source: { seed: expect.stringContaining("ANIM_TAG_SEED") },
      seed: { tileset: { columns: 2, rows: 6 } } });
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-leech-seed-assets-"));
    const output = join(scratch, "leech-seed.json");
    execFileSync(process.execPath, ["--experimental-strip-types",
      resolve("tools/compare/extractLeechSeedAssets.ts"), "--out", output]);
    expect(readFileSync(output)).toEqual(readFileSync(resolve("src/animation/assets/leech-seed.json")));
  });
});
