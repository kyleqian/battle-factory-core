import { describe, expect, it } from "vitest";
import {
  HYPNOSIS_OPPONENT_FRAME_COUNT,
  HYPNOSIS_PLAYER_FRAME_COUNT,
  hypnosisAtAge,
} from "../../src/animation/hypnosis.ts";

const player = { x: 72, y: 97 };
const opponent = { x: 176, y: 42 };

describe("MOVE_HYPNOSIS source-relative reducer", () => {
  it("ports all six staggered 27-tick GoldRing translations", () => {
    expect(hypnosisAtAge(41, "player", player, opponent).rings).toEqual([]);
    expect(hypnosisAtAge(42, "player", player, opponent).rings).toMatchObject([
      { index: 0, x: 72, y: 105, x2: 3, y2: -2, data0: 26 },
      { index: 1, x: 88, y: 89, x2: 3, y2: -2, data0: 26 },
    ]);
    expect(hypnosisAtAge(58, "player", player, opponent).rings).toHaveLength(6);
    expect(hypnosisAtAge(86, "player", player, opponent).rings).toEqual([]);
  });

  it("mirrors X translation by attacker side without changing source timing", () => {
    const state = hypnosisAtAge(
      42,
      "opponent",
      { x: 176, y: 46 },
      { x: 72, y: 88 },
    );
    expect(state.rings).toMatchObject([
      { x: 176, y: 54, x2: -3, data0: 26 },
      { x: 160, y: 38, x2: -3, data0: 26 },
    ]);
  });

  it("pins tag, sound, blend-task, background, and cleanup boundaries", () => {
    expect(HYPNOSIS_PLAYER_FRAME_COUNT).toBe(169);
    expect(HYPNOSIS_OPPONENT_FRAME_COUNT).toBe(168);
    expect(hypnosisAtAge(42, "player", player, opponent).sound)
      .toBe("SE_M_SUPERSONIC");
    expect(hypnosisAtAge(66, "player", player, opponent).targetBlendTaskActive)
      .toBe(true);
    expect(hypnosisAtAge(125, "player", player, opponent).targetBlendTaskActive)
      .toBe(false);
    expect(hypnosisAtAge(168, "player", player, opponent).active).toBe(false);
    expect(hypnosisAtAge(167, "opponent", opponent, player).active).toBe(false);
  });
});
