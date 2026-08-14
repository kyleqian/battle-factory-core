import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  LUSTER_PURGE_HIT_START_AGES,
  LUSTER_PURGE_OPPONENT_FRAME_COUNT,
  LUSTER_PURGE_PLAYER_FRAME_COUNT,
  lusterPurgeAtAge,
  type LusterPurgeConfig,
} from "../../src/animation/lusterPurge.ts";

const visualRandom = {
  hitsplats: [
    { x: 24, y: 5 }, { x: 30, y: 9 }, { x: 4, y: 6 },
    { x: 11, y: 16 }, { x: 0, y: 19 }, { x: 7, y: 20 },
  ],
} as const;

const player: LusterPurgeConfig = {
  attackerSide: "player", attackerBattlerId: 0,
  attackerSpriteSlot: 6, targetSpriteSlot: 8, targetInitialX2: 1,
  circleCenter: { x: 72, y: 98 }, monbgCenter: { x: 72, y: 90 },
  targetCenter: { x: 177, y: 42 }, monbgPosition: { x: -40, y: -58 },
  visualRandom,
};

describe("Move_LUSTER_PURGE pure source-relative reducer", () => {
  it("exhaustively matches every retained bilateral topology row", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/lusterPurgePortable.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("player-back: 333/333 reducer topology rows; phase/palette/audio starts exact; gameplay RNG stable");
    expect(output).toContain("opponent-front: 333/333 reducer topology rows; phase/palette/audio starts exact; gameplay RNG stable");
    expect(output).toContain("666/666 retained rows exact; no framebuffer or audio-sample claim");
  });

  it("takes immutable visual RNG input without consuming or rewriting it", () => {
    const before = structuredClone(player);
    const gameplayRng = 0x12345679;
    const offsets = LUSTER_PURGE_HIT_START_AGES.map((age, index) =>
      lusterPurgeAtAge(age, player).sprites.find((sprite) =>
        sprite.kind === "hitsplat" && sprite.slot === 3 + (index % 3))!.offset);
    expect(offsets).toEqual([
      { x2: 0, y2: -7 }, { x2: 6, y2: -3 }, { x2: -20, y2: -6 },
      { x2: -13, y2: 4 }, { x2: -24, y2: 7 }, { x2: -17, y2: 8 },
    ]);
    expect(player).toEqual(before);
    expect(gameplayRng).toBe(0x12345679);
  });

  it("pins source cleanup, orientation timing, GPU restore, and task teardown", () => {
    expect(lusterPurgeAtAge(LUSTER_PURGE_PLAYER_FRAME_COUNT - 1, player)).toMatchObject({
      active: false, scriptOffset: 278, visualTaskCount: 0,
      tasks: [], sprites: [], resources: { circle: false, impact: false },
      monbg: { active: false, bg: "BG2", x: 0, y: 0 },
      gpu: { bldcnt: 0, bldalpha: 0, bldy: 0 }, targetX2: 0,
    });
    const opponent: LusterPurgeConfig = {
      ...player, attackerSide: "opponent", attackerBattlerId: 1,
      attackerSpriteSlot: 8, targetSpriteSlot: 6, targetInitialX2: 0,
      circleCenter: { x: 176, y: 51 }, monbgCenter: { x: 176, y: 51 },
      targetCenter: { x: 71, y: 82 }, monbgPosition: { x: -144, y: -19 },
    };
    expect(lusterPurgeAtAge(LUSTER_PURGE_OPPONENT_FRAME_COUNT - 1, opponent)).toMatchObject({
      active: false, scriptOffset: 278, tasks: [], resources: { circle: false, impact: false },
      monbg: { bg: "BG1" }, gpu: { bldcnt: 0, bldalpha: 0, bldy: 0 },
    });
  });
});
