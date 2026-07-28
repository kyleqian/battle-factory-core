import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import absorbAsset from "../../src/animation/assets/absorb.json" with { type: "json" };
import dynamicPunchAsset from "../../src/animation/assets/dynamicPunch.json" with { type: "json" };
import recoverAsset from "../../src/animation/assets/recover.json" with { type: "json" };
import {
  ABSORB_HEALING_FIRST_AGE,
  ABSORB_ORB_ARGS,
  ABSORB_ORB_FIRST_AGE,
  ABSORB_ORB_SPAWN_PERIOD,
  absorbAtAge,
} from "../../src/animation/absorb.ts";
import {
  createSceneOnMovePresentation,
  sceneOnAbsorbView,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";

const playerAttacker = { x: 72, y: 88 };
const opponentTarget = { x: 176, y: 42 };

describe("MOVE_ABSORB source-relative reducer", () => {
  it("ports all eight literal orb arguments and six-display scheduler cadence", () => {
    expect(ABSORB_ORB_ARGS).toEqual([
      { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
      { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 },
      { x: -5, y: 15, waveAmplitude: 16, wavePeriod: 33 },
      { x: 0, y: -15, waveAmplitude: -16, wavePeriod: 36 },
      { x: 0, y: 5, waveAmplitude: 8, wavePeriod: 26 },
      { x: 10, y: -5, waveAmplitude: -8, wavePeriod: 26 },
      { x: -10, y: 20, waveAmplitude: 20, wavePeriod: 39 },
      { x: 5, y: -18, waveAmplitude: -20, wavePeriod: 35 },
    ]);
    expect(ABSORB_ORB_ARGS.map((_, index) =>
      absorbAtAge(
        ABSORB_ORB_FIRST_AGE + index * ABSORB_ORB_SPAWN_PERIOD,
        opponentTarget,
        playerAttacker,
        "player",
      ).sprites.some((sprite) =>
        sprite.kind === "orb" && sprite.spawnIndex === index
      )
    )).toEqual(Array(8).fill(true));
  });

  it("uses source arc geometry from target to attacker", () => {
    expect(absorbAtAge(
      ABSORB_ORB_FIRST_AGE,
      opponentTarget,
      playerAttacker,
      "player",
    ).sprites[0]).toMatchObject({
      kind: "orb", x: 176, y: 47, x2: -4, y2: 1,
    });
  });

  it("owns hitsplat animation 2, ShakeMon, HealingEffect, and cleanup", () => {
    expect(absorbAtAge(16, opponentTarget, playerAttacker, "player"))
      .toMatchObject({
        sprites: [{ kind: "hitsplat", frame: 2 }],
        soundRestart: "SE_M_ABSORB",
      });
    expect(absorbAtAge(22, opponentTarget, playerAttacker, "player").targetY2)
      .toBe(5);
    expect(absorbAtAge(
      ABSORB_HEALING_FIRST_AGE,
      opponentTarget,
      playerAttacker,
      "player",
    ).sprites).toContainEqual(expect.objectContaining({
      kind: "star", spawnIndex: 0, x: 72, y: 83,
    }));
    expect(absorbAtAge(194, opponentTarget, playerAttacker, "player"))
      .toMatchObject({
        sprites: [], targetX2: 0, targetY2: 0, targetOnMonBg: false,
        splitBgPriorityFoes: false, alpha: null, bgPaletteBlendY: 0,
        active: false,
      });
  });

  it("mirrors only literal HealingEffect X offsets in opponent orientation", () => {
    const state = absorbAtAge(
      ABSORB_HEALING_FIRST_AGE + 9,
      { x: 72, y: 80 },
      { x: 176, y: 49 },
      "opponent",
    );
    expect(state.sprites.filter((sprite) => sprite.kind === "star"))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ spawnIndex: 0, x: 176, y: 44 }),
        expect.objectContaining({ spawnIndex: 1, x: 191, y: 59 }),
      ]));
  });

  it("threads explicit arc and HealingEffect centers through the typed seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "ABSORB",
      attacker: {
        species: "LOMBRE",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 56 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      healingCenter: { x: 72, y: 96 },
      absorptionCenter: { x: 72, y: 96 },
      allocatorProfile: {
        hitsplat: 3, orbs: [3, 4, 5, 7, 9, 3, 4, 10],
        stars: [3, 4, 5, 3], paletteController: 3,
      },
      fieldProfile: {
        playerHp: 1, playerMaxHp: 1, opponentHp: 1, opponentMaxHp: 1,
      },
    });
    expect(sceneOnAbsorbView({ ...stage, age: ABSORB_ORB_FIRST_AGE })
      .sprites[0]).toMatchObject({ x: 176, y: 47, x2: -4, y2: 1 });
    expect(sceneOnAbsorbView({ ...stage, age: ABSORB_HEALING_FIRST_AGE })
      .sprites[0]).toMatchObject({ kind: "star", x: 72, y: 91 });
  });

  it("re-extracts LOMBRE and literal ORBS/IMPACT/BLUE_STAR byte-for-byte", () => {
    expect(absorbAsset.source).toMatchObject({
      lombreBack: expect.stringContaining("set 131"),
      lombreFront: expect.stringContaining("SPECIES_LOMBRE 271"),
      target: expect.stringContaining("ONIX"),
      orbs: expect.stringContaining("ANIM_TAG_ORBS"),
      impact: expect.stringContaining("ANIM_TAG_IMPACT"),
      blueStar: expect.stringContaining("ANIM_TAG_BLUE_STAR"),
    });
    expect(absorbAsset.lombreBack.tileset).toMatchObject({
      columns: 8, rows: 8,
    });
    expect(absorbAsset.lombreFront.tileset).toMatchObject({
      columns: 8, rows: 16,
    });
    expect(absorbAsset.orbs).toEqual(recoverAsset.orbs);
    expect(absorbAsset.impact).toEqual(dynamicPunchAsset.hitsplat);
    expect(absorbAsset.blueStar).toEqual(recoverAsset.blueStar);

    const scratch = mkdtempSync(join(tmpdir(), "pokebench-absorb-assets-"));
    const output = join(scratch, "absorb.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve("tools/compare/extractAbsorbAssets.ts"),
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync(resolve("src/animation/assets/absorb.json")),
    );
  });

  it("renders palette, impact, orb, healing, and teardown boundaries through core", () => {
    const stage = createSceneOnMovePresentation({
      move: "ABSORB",
      attacker: {
        species: "LOMBRE",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 56 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      healingCenter: { x: 72, y: 96 },
      absorptionCenter: { x: 72, y: 96 },
      allocatorProfile: {
        hitsplat: 3, orbs: [3, 4, 5, 7, 9, 3, 4, 10],
        stars: [3, 4, 5, 3], paletteController: 3,
      },
      fieldProfile: {
        playerHp: 152, playerMaxHp: 167,
        opponentHp: 110, opponentMaxHp: 110,
        playerGender: "male", opponentGender: "male",
      },
    });
    const frame = (age: number) => render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age },
    });
    expect(frame(5)).not.toEqual(frame(6));
    expect(frame(16)).not.toEqual(frame(17));
    expect(frame(34)).not.toEqual(frame(35));
    expect(frame(129)).not.toEqual(frame(130));
    expect(frame(193)).toEqual(frame(194));

    const mirrored = createSceneOnMovePresentation({
      ...stage.config,
      attacker: {
        species: "LOMBRE",
        geometry: {
          side: "opponent" as const, spriteCorner: { x: 144, y: 17 },
          animationCenter: { x: 176, y: 49 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "player" as const, spriteCorner: { x: 40, y: 48 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      healingCenter: { x: 176, y: 49 },
      absorptionCenter: { x: 176, y: 49 },
      fieldProfile: {
        playerHp: 110, playerMaxHp: 110,
        opponentHp: 152, opponentMaxHp: 167,
        playerGender: "male" as const, opponentGender: "male" as const,
      },
    });
    expect(render({
      ...createInitialState(),
      rngMode: "frontierBattle",
      sceneOnPresentation: { ...mirrored, age: ABSORB_ORB_FIRST_AGE },
    })).not.toEqual(frame(ABSORB_ORB_FIRST_AGE));
  });
});
