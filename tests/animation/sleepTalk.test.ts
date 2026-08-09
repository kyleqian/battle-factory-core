import { describe, expect, it } from "vitest";
import {
  SLEEP_TALK_FRAME_COUNT,
  SLEEP_TALK_LETTER_SPAWN_AGES,
  sleepTalkAtAge,
  sleepTalkLetterMatrixAtData0,
} from "../../src/animation/sleepTalk.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSleepTalkView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

const playerCenter = { x: 72, y: 99 };
const opponentCenter = { x: 176, y: 44 };

function battler(
  species: "SEAKING" | "ONIX",
  side: "player" | "opponent",
  animationCenter: Readonly<{ x: number; y: number }>,
  spriteCorner: Readonly<{ x: number; y: number }>,
  battlePositionCenter: Readonly<{ x: number; y: number }>,
): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      animationCenter,
      spriteCorner,
      battlePositionCenter,
    },
  };
}

describe("MOVE_SLEEP_TALK source reducer", () => {
  it("keeps the pointer-bounded lifecycles and first inactive cleanup distinct", () => {
    expect(SLEEP_TALK_FRAME_COUNT).toEqual({ player: 186, opponent: 189 });
    expect(SLEEP_TALK_LETTER_SPAWN_AGES).toEqual([
      26, 34, 42, 64, 72, 80, 102, 110, 118,
    ]);

    for (const [side, center, lastAge] of [
      ["player", playerCenter, 185],
      ["opponent", opponentCenter, 188],
    ] as const) {
      const finalActiveAge = lastAge - 1;
      expect(sleepTalkAtAge(0, side, center)).toMatchObject({
        active: true,
        letterZLoaded: false,
        scriptOffset: 0,
        scriptWait: 0,
        letters: [],
      });
      expect(sleepTalkAtAge(finalActiveAge, side, center).active).toBe(true);
      expect(sleepTalkAtAge(lastAge, side, center)).toMatchObject({
        active: false,
        gAnimScriptActive: false,
        letterZLoaded: false,
        scriptOffset: 186,
        scriptWait: 0,
        letters: [],
      });
    }
  });

  it("ports AnimTask_SwayMon, all nine AnimLetterZ groups, OAM, and affine rows", () => {
    const playerTask = sleepTalkAtAge(4, "player", playerCenter);
    expect(playerTask.swayTask).toEqual({
      slot: 0,
      callback: "AnimTask_SwayMonStep",
      initialCallback: "AnimTask_SwayMon",
      target: "attacker",
      axis: "horizontal",
      data: [0, 4, 4096, 2, 6, 0, 0, 0, 0, 0, 4096, 0, 1, 0, 0, 0],
      sineIndex: 4096,
      waveIndex: 16,
      offsetX2: 1,
    });
    expect(sleepTalkAtAge(19, "player", playerCenter).swayTask).toBeNull();
    expect(sleepTalkAtAge(18, "opponent", opponentCenter).swayTask).toMatchObject({
      data: [0, -4, 4096, 1, 8, 1, 0, 0, 0, 0, -4096, 1, 0, 0, 0, 0],
      offsetX2: 1,
    });

    expect(sleepTalkAtAge(26, "player", playerCenter)).toMatchObject({
      scriptOffset: 43,
      scriptWait: 6,
      visualTaskCount: 1,
      soundRestart: "SE_M_SNORE",
      soundPanSide: "player",
      soundPan: -64,
      letters: [{
        index: 0,
        slot: 3,
        group: 0,
        localAge: 0,
        x2: 5,
        y2: 3,
        data: [2, 5, -1, 10, -2, 0, 0, 0],
        matrix: { a: 267, b: 39, c: -39, d: 267 },
        oam: { attr: [342, 32829, 0x7931], matrixNum: 0 },
        hardwareOam: null,
        hardwareMatrix: { a: 256, b: 0, c: 0, d: 256 },
      }],
    });
    expect(sleepTalkAtAge(26, "opponent", opponentCenter).letters[0])
      .toMatchObject({
        data: [2, -5, 1, -10, 2, 0, 0, 0],
        x2: -5,
        y2: 5,
        oam: { attr: [289, 32923, 0x7931] },
      });

    expect(sleepTalkAtAge(118, "player", playerCenter).letters.map((letter) => ({
      index: letter.index,
      slot: letter.slot,
      group: letter.group,
      matrixNum: letter.matrixNum,
      data: letter.data,
    }))).toEqual([
      { index: 3, slot: 7, group: 1, matrixNum: 5, data: [56, 5, -5, 280, -280, 0, 0, 0] },
      { index: 4, slot: 9, group: 1, matrixNum: 6, data: [48, 5, -5, 240, -240, 0, 0, 0] },
      { index: 5, slot: 10, group: 1, matrixNum: 7, data: [40, 5, -5, 200, -200, 0, 0, 0] },
      { index: 6, slot: 3, group: 2, matrixNum: 0, data: [18, 5, -3, 90, -54, 0, 0, 0] },
      { index: 7, slot: 4, group: 2, matrixNum: 3, data: [10, 5, -3, 50, -30, 0, 0, 0] },
      { index: 8, slot: 5, group: 2, matrixNum: 4, data: [2, 5, -3, 10, -6, 0, 0, 0] },
    ]);
    expect(sleepTalkAtAge(91, "player", playerCenter).letters[0]).toMatchObject({
      localAge: 65,
      data: [67, 5, -1, 335, -67, 0, 0, 0],
    });
    expect(sleepTalkAtAge(92, "player", playerCenter).letters[0].index).toBe(1);
    expect(sleepTalkAtAge(94, "opponent", opponentCenter).letters[0]).toMatchObject({
      localAge: 68,
      data: [70, -5, 1, -350, 70, 0, 0, 0],
    });
    expect(sleepTalkAtAge(95, "opponent", opponentCenter).letters[0].index).toBe(1);
  });

  it("keeps the Scene-ON seam typed and presentation-only", () => {
    const attacker = battler(
      "SEAKING",
      "player",
      playerCenter,
      { x: 40, y: 67 },
      { x: 72, y: 80 },
    );
    const target = battler(
      "ONIX",
      "opponent",
      { x: 176, y: 42 },
      { x: 144, y: 10 },
      { x: 176, y: 40 },
    );
    const stage = createSceneOnMovePresentation({
      move: "SLEEP_TALK",
      attacker,
      target,
    });
    const view = sceneOnSleepTalkView({ ...stage, age: 26 });
    expect(view).toMatchObject({
      age: 26,
      attacker,
      target,
      soundRestart: "SE_M_SNORE",
      letters: [{ callback: "AnimLetterZ" }],
    });
    expect(view).toEqual({
      age: 26,
      attacker,
      target,
      ...sleepTalkAtAge(26, "player", playerCenter),
    });
  });

  it("provides the complete affine cycle without coordinate-specific fitting", () => {
    expect(sleepTalkLetterMatrixAtData0(2)).toEqual({
      a: 267, b: 39, c: -39, d: 267,
    });
    expect(sleepTalkLetterMatrixAtData0(33)).toEqual({
      a: 262, b: 19, c: -19, d: 262,
    });
    expect(sleepTalkLetterMatrixAtData0(34)).toEqual({
      a: 267, b: 39, c: -39, d: 267,
    });
  });
});
