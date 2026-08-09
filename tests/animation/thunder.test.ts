import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import thunderAsset from "../../src/animation/assets/thunder.json" with { type: "json" };
import {
  THUNDER_CLEANUP_AGE,
  THUNDER_LIGHTNING_CREATION_AGES,
  THUNDER_LIGHTNING_SLOTS,
  THUNDER_SOURCE_FRAME_COUNT,
  THUNDER_SOURCE_OFFSET_RANGES,
  thunderAtAge,
} from "../../src/animation/thunder.ts";
import {
  createSceneOnMovePresentation,
  sceneOnThunderView,
  type SceneOnThunderConfig,
} from "../../src/animation/sceneOnPresentation.ts";

const playerTarget = { x: 176, y: 49 } as const;
const opponentTarget = { x: 72, y: 99 } as const;

const playerState = (age: number) =>
  thunderAtAge(age, "opponent", playerTarget);
const opponentState = (age: number) =>
  thunderAtAge(age, "player", opponentTarget);

describe("MOVE_THUNDER source-relative reducer", () => {
  it("pins every source pointer boundary and both 262-display windows", () => {
    expect(THUNDER_SOURCE_FRAME_COUNT).toBe(262);
    expect(THUNDER_SOURCE_OFFSET_RANGES).toEqual([
      [0, 0, 0], [1, 3, 3], [4, 22, 5], [23, 41, 21],
      [42, 59, 41], [60, 62, 60], [63, 65, 73], [66, 68, 86],
      [69, 90, 99], [91, 93, 116], [94, 96, 129], [97, 103, 146],
      [104, 106, 161], [107, 109, 174], [110, 112, 187], [113, 144, 200],
      [145, 151, 215], [152, 154, 230], [155, 157, 247], [158, 160, 260],
      [161, 172, 273], [173, 175, 288], [176, 179, 305], [180, 182, 320],
      [183, 221, 337], [222, 240, 339], [241, 260, 344], [261, 261, 345],
    ]);
    for (const state of [playerState, opponentState]) {
      expect(Array.from({ length: THUNDER_SOURCE_FRAME_COUNT }, (_, age) =>
        state(age).sourceOffset,
      )).toHaveLength(262);
      expect(state(0)).toMatchObject({
        active: true, clean: false, sourceOffset: 0, framesToWait: 0,
      });
      expect(state(260)).toMatchObject({ active: true, sourceOffset: 344 });
      expect(state(THUNDER_CLEANUP_AGE)).toMatchObject({
        active: false, clean: true, sourceOffset: 345, framesToWait: 0,
        assets: { lightning: false, background: false },
      });
    }
  });

  it("ports the exact display wait countdowns at every source handoff", () => {
    expect(Array.from({ length: 18 }, (_, index) =>
      playerState(42 + index).framesToWait,
    )).toEqual([16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0]);
    expect(Array.from({ length: 22 }, (_, index) =>
      playerState(69 + index).framesToWait,
    )).toEqual([20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0]);
    expect(Array.from({ length: 32 }, (_, index) =>
      playerState(113 + index).framesToWait,
    )).toEqual([
      30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15,
      14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0,
    ]);
    expect([97, 101, 145, 149, 161, 170, 176, 177, 178, 180, 181, 183, 260]
      .map((age) => playerState(age).framesToWait))
      .toEqual([5, 1, 5, 1, 10, 1, 2, 1, 0, 1, 0, 1, 1]);
  });

  it("ports all twelve lightning lifecycles, geometry, frame handoff, and order", () => {
    const expectedOffsets = [
      [16, -36], [16, -20], [16, 12],
      [-16, -32], [-16, -16], [-16, 16],
      [24, -32], [24, -16], [24, 16],
      [0, -32], [0, -16], [0, 16],
    ];
    for (const [state, center, mirror] of [
      [playerState, playerTarget, 1],
      [opponentState, opponentTarget, -1],
    ] as const) {
      expect(THUNDER_LIGHTNING_CREATION_AGES).toHaveLength(12);
      expect(THUNDER_LIGHTNING_SLOTS).toHaveLength(12);
      const first = THUNDER_LIGHTNING_CREATION_AGES.map((age, sourceOrder) => {
        const sprite = state(age).sprites.find((item) => item.sourceOrder === sourceOrder);
        expect(sprite).toBeDefined();
        return [
          sprite!.slot,
          sprite!.x,
          sprite!.y,
          sprite!.priority,
          sprite!.subpriority,
          sprite!.drawOrder,
        ];
      });
      expect(first).toEqual(THUNDER_LIGHTNING_CREATION_AGES.map((age, sourceOrder) => {
        const groupTwo = sourceOrder >= 3 && sourceOrder <= 5;
        const slot = THUNDER_LIGHTNING_SLOTS[sourceOrder]!;
        const drawOrder = state(age).sprites.find((item) => item.slot === slot)?.drawOrder;
        return [
          slot,
          center.x + mirror * expectedOffsets[sourceOrder]![0],
          center.y + expectedOffsets[sourceOrder]![1],
          sourceOrder >= 3 && sourceOrder <= 5 ? 6 : 2,
          state === playerState ? groupTwo ? 34 : 38 : groupTwo ? 24 : 28,
          drawOrder,
        ];
      }));
      for (const age of THUNDER_LIGHTNING_CREATION_AGES) {
        const sourceOrder = THUNDER_LIGHTNING_CREATION_AGES.indexOf(age);
        expect(state(age).sprites.find((item) => item.sourceOrder === sourceOrder)?.tileFrame)
          .toBe(0);
        expect(state(age + 4).sprites.find((item) => item.sourceOrder === sourceOrder)?.tileFrame)
          .toBe(1);
        expect(state(age + 9).sprites.find((item) => item.sourceOrder === sourceOrder)?.tileFrame)
          .toBe(2);
        expect(state(age + 17).sprites.find((item) => item.sourceOrder === sourceOrder)?.tileFrame)
          .toBe(3);
        expect(state(age + 22).sprites.find((item) => item.sourceOrder === sourceOrder)?.tileFrame)
          .toBe(4);
        expect(state(age + 27).sprites.find((item) => item.sourceOrder === sourceOrder))
          .toBeDefined();
        expect(state(age + 28).sprites.find((item) => item.sourceOrder === sourceOrder))
          .toBeUndefined();
      }
    }
  });

  it("ports BG_THUNDER fades, sliding, palette blends, and all invert phases", () => {
    expect([4, 21, 22, 23, 40, 41, 222, 239, 240, 241, 242, 243, 244, 259, 260]
      .map((age) => {
        const fade = playerState(age).background?.fade;
        return [age, fade?.cycle ?? null, fade?.phase ?? null, fade?.blendY ?? null];
      })).toEqual([
        [4, "enter", 1, 0], [21, "enter", 1, 16], [22, "enter", 2, 16],
        [23, "enter", 3, 16], [40, "enter", 3, 0], [41, null, null, null],
        [222, "restore", 1, 0], [239, "restore", 1, 16],
        [240, "restore", 2, 16], [241, "restore", 2, 16],
        [242, "restore", 3, 16], [243, "restore", 3, 16],
        [244, "restore", 3, 15], [259, "restore", 3, 0],
        [260, null, null, null],
      ]);
    expect(playerState(23).background?.sliding).toMatchObject({
      direction: -1, taskActive: true, softwareX: -1, hardwareX: 0,
      taskData: [1, -256, 0, -1],
    });
    expect(opponentState(23).background?.sliding).toMatchObject({
      direction: 1, taskActive: true, softwareX: 1, hardwareX: 0,
      taskData: [1, 256, 0, -1],
    });
    expect(playerState(241).background?.sliding).toMatchObject({
      taskActive: false, softwareX: 0, hardwareX: 294,
    });
    expect(playerState(242).background?.sliding).toBeNull();
    expect([41, 42, 45, 73, 79, 80, 103, 104, 145, 152, 173, 180, 182, 183, 186, 214, 220, 221]
      .map((age) => {
        const palette = playerState(age).palette;
        return [age, palette.blend, palette.blendY, palette.invertPhase, palette.inverted];
      })).toEqual([
        [41, null, 0, 0, false], [42, "toBlack", 0, 0, false],
        [45, "toBlack", 2, 0, false], [73, "toBlack", 16, 1, true],
        [79, "toBlack", 16, 1, true], [80, null, 0, 1, true],
        [103, null, 0, 1, true], [104, null, 0, 2, false],
        [145, null, 0, 3, true], [152, null, 0, 4, false],
        [173, null, 0, 5, true], [180, null, 0, 6, false],
        [182, null, 0, 6, false], [183, "fromBlack", 16, 6, false],
        [186, "fromBlack", 14, 6, false], [214, "fromBlack", 0, 6, false],
        [220, "fromBlack", 0, 6, false], [221, null, 0, 6, false],
      ]);
  });

  it("ports task data, source shake pattern, audio boundaries, and cleanup", () => {
    expect(playerState(4).tasks[0]).toMatchObject({
      slot: 0, function: "Task_FadeToBg",
      data: expect.arrayContaining([11, 0, 0, 0]),
    });
    expect(playerState(23).tasks.map(({ slot, function: name }) => [slot, name]))
      .toEqual([
        [0, "Task_FadeToBg"], [2, "AnimTask_UpdateSlidingBg"],
      ]);
    expect(playerState(176).tasks.map(({ slot, function: name }) => [slot, name]))
      .toEqual([
        [0, "AnimTask_ShakeTargetInPattern"], [2, "AnimTask_UpdateSlidingBg"],
      ]);
    expect(playerState(204).tasks.map(({ slot, function: name }) => [slot, name]))
      .toEqual([[2, "AnimTask_UpdateSlidingBg"]]);
    expect(playerState(260).tasks).toEqual([]);
    expect(Array.from({ length: 28 }, (_, index) =>
      playerState(176 + index).targetOffset.y2,
    )).toEqual([
      0, 3, 3, 0, 0, 257, 257, 2, 2, 2, 0, 2, 2, 0,
      0, 2, 2, 2, 2, 2, 0, 2, 2, 0, 0, 2, 2, 2,
    ]);
    expect([60, 91, 97, 155].map((age) => [
      age, playerState(age).soundRestart, playerState(age).soundPan,
    ])).toEqual([
      [60, "SE_M_THUNDER_WAVE", 63],
      [91, "SE_M_THUNDER_WAVE", 63],
      [97, "SE_M_THUNDER_WAVE", 63],
      [155, "SE_M_TRI_ATTACK2", 63],
    ]);
    expect([60, 91, 97, 155].map((age) => [
      age, opponentState(age).soundRestart, opponentState(age).soundPan,
    ])).toEqual([
      [60, "SE_M_THUNDER_WAVE", -63],
      [91, "SE_M_THUNDER_WAVE", -63],
      [97, "SE_M_THUNDER_WAVE", -63],
      [155, "SE_M_TRI_ATTACK2", -63],
    ]);
  });

  it("exposes only typed relative geometry and field state through the Scene-ON seam", () => {
    const config: SceneOnThunderConfig = {
      move: "THUNDER",
      attacker: {
        species: "MAGNETON",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 57 },
          animationCenter: { x: 72, y: 90 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "SHUCKLE",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 17 },
          animationCenter: playerTarget,
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      targetEffectCenter: playerTarget,
      fieldProfile: {
        playerHp: 145, playerMaxHp: 145,
        opponentHp: 127, opponentMaxHp: 127,
      },
    };
    const stage = createSceneOnMovePresentation(config);
    const view = sceneOnThunderView({ ...stage, age: 113 });
    expect(view).toMatchObject({
      age: 113,
      attacker: { species: "MAGNETON" },
      target: { species: "SHUCKLE" },
      palette: { blend: null, invertPhase: 2, inverted: false },
      background: { restored: false },
    });
    expect(view.sprites.map(({ slot, x, y }) => ({ slot, x, y }))).toEqual([
      { slot: 3, x: 160, y: 17 },
      { slot: 4, x: 160, y: 33 },
      { slot: 5, x: 160, y: 65 },
      { slot: 7, x: 200, y: 17 },
      { slot: 9, x: 200, y: 33 },
      { slot: 10, x: 200, y: 65 },
    ]);
    const opponentStage = createSceneOnMovePresentation({
      ...config,
      attacker: { ...config.attacker, geometry: { ...config.attacker.geometry, side: "opponent" } },
      target: { ...config.target, geometry: { ...config.target.geometry, side: "player" } },
      targetEffectCenter: opponentTarget,
    });
    expect(sceneOnThunderView({ ...opponentStage, age: 63 }).sprites[0])
      .toMatchObject({ x: 56, y: 63, subpriority: 28 });
  });

  it("re-extracts BG_THUNDER byte-for-byte and keeps GLARE/TRI_ATTACK source-distinct", () => {
    expect(thunderAsset.source.background).toContain("thunder.png + thunder.bin");
    expect(thunderAsset.source.lightning).toContain("gLightningSpriteTemplate");
    expect(thunderAsset.background.tileset).toMatchObject({ columns: 16, rows: 10 });
    expect(thunderAsset.background.tilemap.entries).toHaveLength(1024);
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-thunder-assets-"));
    const output = join(scratch, "thunder.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      resolve("tools/compare/extractThunderAssets.ts"),
      "--out", output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync(resolve("src/animation/assets/thunder.json")),
    );

    const source = readFileSync("reference/pokeemerald/data/battle_anim_scripts.s", "utf8");
    const block = (start: string, end: string) => source.slice(
      source.indexOf(`${start}:`), source.indexOf(`${end}:`, source.indexOf(`${start}:`) + 1),
    );
    expect(block("Move_GLARE", "Move_BARRAGE"))
      .toContain("AnimTask_ShakeTargetInPattern, 3, 20, 1, FALSE");
    expect(block("Move_TRI_ATTACK", "Move_MINIMIZE"))
      .toContain("AnimTask_ShakeTargetInPattern, 2, 20, 3, TRUE, 1");
  });
});
