import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import tauntAsset from "../../src/animation/assets/taunt.json" with { type: "json" };
import {
  TAUNT_FIRST_ANGER_CREATION_AGE,
  TAUNT_SECOND_ANGER_CREATION_AGE,
  TAUNT_TEARDOWN_AGE,
  tauntAtAge,
  tauntFingerAtAge,
  tauntThoughtBubbleAtAge,
} from "../../src/animation/taunt.ts";
import {
  createSceneOnMovePresentation,
  sceneOnTauntView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_TAUNT source-relative reducer", () => {
  it("ports the 45-frame thought-bubble hold and reverse programs", () => {
    const origin = { x: 104, y: 85 };
    expect([-1, 0, 1, 3, 5, 52, 53, 55, 57, 59, 62, 63].map(
      (age) => tauntThoughtBubbleAtAge(age, "player", origin)?.frame ?? null,
    )).toEqual([null, 0, 1, 2, 3, 3, 3, 2, 1, 0, 0, null]);
    expect(tauntThoughtBubbleAtAge(0, "player", origin)).toMatchObject({
      x: 104, y: 85, hFlip: true, phase: "forward",
    });
    expect(tauntThoughtBubbleAtAge(0, "opponent", origin)).toMatchObject({
      hFlip: false,
    });
    expect(tauntThoughtBubbleAtAge(53, "player", origin)?.phase)
      .toBe("reverse");
  });

  it("ports the side-dependent point, seven-cell wag, linger, and lifetime", () => {
    const origin = { x: 144, y: 39 };
    expect([7, 8, 17, 18, 21, 22, 26, 30, 34, 38, 42, 52, 53].map(
      (age) => tauntFingerAtAge(age, "opponent", origin)?.frame ?? null,
    )).toEqual([null, 0, 0, 0, 0, 1, 2, 1, 0, 1, 2, 2, null]);
    expect(tauntFingerAtAge(8, "opponent", origin)).toMatchObject({
      age: 0, hFlip: true, phase: "point",
    });
    expect(tauntFingerAtAge(47, "player", origin)).toMatchObject({
      hFlip: false, phase: "linger",
    });
  });

  it("keeps literal Swagger anger-template semantics but independent timing", () => {
    const state = (age: number) => tauntAtAge(
      age, "player", { x: 104, y: 85 },
      "opponent", { x: 176, y: 49 },
    );
    expect(state(TAUNT_FIRST_ANGER_CREATION_AGE).angerMarks[0]).toMatchObject({
      spawnIndex: 0, age: 0, x: 196, y: 21, xScale: 278,
    });
    expect(state(TAUNT_FIRST_ANGER_CREATION_AGE + 16).angerMarks[0])
      .toMatchObject({ age: 16, xScale: 256 });
    expect(state(TAUNT_FIRST_ANGER_CREATION_AGE + 17).angerMarks).toEqual([]);
    expect(state(TAUNT_SECOND_ANGER_CREATION_AGE).angerMarks[0]).toMatchObject({
      spawnIndex: 1, x: 156, y: 21,
    });
  });

  it("pins delays, audio restart boundaries, registers, and teardown", () => {
    const state = (age: number) => tauntAtAge(
      age, "opponent", { x: 144, y: 39 },
      "player", { x: 72, y: 99 },
    );
    expect([0, 14, 30, 74, 106].map((age) => [
      age, state(age).soundRestart, state(age).soundPanSide,
    ])).toEqual([
      [0, "SE_M_METRONOME", "opponent"],
      [14, "SE_M_TAIL_WHIP", "opponent"],
      [30, "SE_M_TAIL_WHIP", "opponent"],
      [74, "SE_M_SWAGGER2", "player"],
      [106, "SE_M_SWAGGER2", "player"],
    ]);
    expect(state(73).soundRestart).toBeNull();
    expect(state(TAUNT_TEARDOWN_AGE)).toEqual({
      thoughtBubble: null,
      finger: null,
      angerMarks: [],
      soundRestart: null,
      soundPanSide: null,
      blend: { bldcnt: 0, bldalpha: 0, bldy: 0 },
    });
  });

  it("exposes the complete state through the typed relative presentation seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "TAUNT",
      attacker: {
        species: "MURKROW",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 57 },
          animationCenter: { x: 72, y: 89 },
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
      attackerHead: { x: 104, y: 85 },
      fieldProfile: {
        playerHp: 156, playerMaxHp: 156,
        opponentHp: 127, opponentMaxHp: 127,
      },
    });
    expect(sceneOnTauntView({ ...stage, age: 74 })).toMatchObject({
      age: 74,
      attacker: { species: "MURKROW" },
      target: { species: "SHUCKLE" },
      soundRestart: "SE_M_SWAGGER2",
      angerMarks: [{ x: 196, y: 21 }],
    });
  });

  it("pins source provenance and exact carrier/effect sheet geometry", () => {
    expect(tauntAsset.source).toMatchObject({
      murkrowBack: expect.stringContaining("set 184"),
      murkrowFront: expect.stringContaining("SPECIES_MURKROW 198"),
      thoughtBubble: expect.stringContaining("ANIM_TAG_THOUGHT_BUBBLE"),
      finger: expect.stringContaining("ANIM_TAG_FINGER_2"),
      anger: expect.stringContaining("swagger.json"),
    });
    expect(tauntAsset.murkrowBack.tileset).toMatchObject({
      columns: 8, rows: 8,
    });
    expect(tauntAsset.murkrowFront.tileset).toMatchObject({
      columns: 8, rows: 16,
    });
    expect(tauntAsset.thoughtBubble.tileset).toMatchObject({
      columns: 4, rows: 16,
    });
    expect(tauntAsset.finger.tileset).toMatchObject({
      columns: 4, rows: 12,
    });
  });

  it("re-extracts MURKROW and both loaded exclusive tags byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "taunt-assets-"));
    const output = join(directory, "taunt.json");
    execFileSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "tools/compare/extractTauntAssets.ts",
        "--out",
        output,
      ],
      { stdio: "pipe" },
    );
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/taunt.json"),
    );
  });
});
