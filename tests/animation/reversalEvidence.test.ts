import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixture = (name: string) => JSON.parse(readFileSync(`tools/compare/fixtures/${name}`, "utf8"));
const scenario = (name: string) => JSON.parse(readFileSync(`tools/battle-lab/${name}`, "utf8"));

describe("MOVE_REVERSAL portable evidence fixtures", () => {
  it("pins the legal same-range complete parties and their dense source windows", () => {
    const player = fixture("reversal-player-vigoroth-opponent-delcatty.json");
    const opponent = fixture("reversal-player-delcatty-opponent-vigoroth.json");
    expect([player.sourceWindow, opponent.sourceWindow]).toEqual([
      { startFrame: 77, endFrame: 250, frameCount: 174 },
      { startFrame: 320, endFrame: 493, frameCount: 174 },
    ]);
    for (const [file, ids] of [["mechanic-reversal-player-vigoroth-opponent-delcatty.json", [[326,327,328],[267,268,269]]], ["mechanic-reversal-player-delcatty-opponent-vigoroth.json", [[267,268,269],[326,327,328]]]] as const) {
      const value = scenario(file); expect([value.playerSetIds, value.opponentSetIds]).toEqual(ids);
      for (const side of ["player", "opponent"] as const) expect(value.overrides.parties[side]).toHaveLength(3);
    }
  });
});
