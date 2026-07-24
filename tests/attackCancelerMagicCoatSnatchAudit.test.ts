import { describe, expect, it } from "vitest";
import frontierMons from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import magicCoatFixture from "../tools/battle-lab/mechanic-magic-coat-bounce-off.json" with { type: "json" };

describe("Magic Coat / Snatch attack-canceler audit fixtures", () => {
  it("keeps the Magic Coat witness narrow, legal at construction, and OFF-profile", () => {
    expect(magicCoatFixture).toMatchObject({
      schemaVersion: 1,
      mode: "mechanicLab",
      profile: "battle-scene-off",
      level: 50,
      playerSetIds: [121, 188, 135],
      opponentSetIds: [156, 149, 180],
      overrides: {
        battlers: {
          player: { moves: [277, 277, 277, 277], ppUps: [0, 0, 0, 0] },
          opponent: { moves: [39, 39, 39, 39], ppUps: [0, 0, 0, 0], ability: 0 },
        },
      },
    });
    expect(magicCoatFixture.trace.captureFrames).toEqual([0, 684]);
  });

  it("proves Magic Coat is Level-50 reachable and Snatch is absent from the whole Factory corpus", () => {
    const level50 = frontierMons.entries.filter((entry) => entry.index < 850);
    const withMove = (move: string) => frontierMons.entries.filter((entry) => entry.moves.includes(move));
    expect(level50.filter((entry) => entry.moves.includes("MOVE_MAGIC_COAT")).map((entry) => entry.index))
      .toEqual([121, 220, 251]);
    expect(withMove("MOVE_SNATCH")).toEqual([]);
  });
});
