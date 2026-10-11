import { describe, expect, it } from "vitest";
import { generatedCommandAnimationReplay } from "../tools/integration/generatedCommandAnimationReplay.ts";

describe("ordinary contact animation command lifecycle", () => {
  it("renders each Twineedle hit, then KO/replacement before the next target's hits", () => {
    const replay = generatedCommandAnimationReplay(52, "on", [0, 0]);
    const hits = replay.animations.filter(a => a.moveId === 41);
    expect(hits.map(a => a.opponent)).toEqual(["CACNEA", "CACNEA", "PONYTA", "PONYTA"]);
    expect(hits.every(a => a.ages.length === 37 + 10 && a.ages[0] === 0 && a.ages.at(-1) === 36 + 10)).toBe(true);
    expect(replay.requests.filter(r => r.moveId === 41).map(r => [r.turn, r.multihit])).toEqual([
      [0, 2], [1, 1], [0, 2], [1, 1],
    ]);
    const types = replay.commands.map(c => c.type);
    expect(types.indexOf("faint")).toBeGreaterThan(types.indexOf("move-animation"));
    expect(types.indexOf("switch-in")).toBeGreaterThan(types.indexOf("faint"));
    expect(replay.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 60000);

  it("completes all three Fury Swipes bodies and preserves the remaining-hit counters", () => {
    const replay = generatedCommandAnimationReplay(71, "on", [0]);
    const hits = replay.animations.filter(a => a.moveId === 154);
    expect(hits).toHaveLength(3);
    expect(hits.every(a => a.ages.length === 48 && a.ages.at(-1) === 47)).toBe(true);
    expect(replay.requests.filter(r => r.moveId === 154).map(r => [r.turn, r.multihit])).toEqual([
      [0, 3], [1, 2], [2, 1],
    ]);
    expect(replay.commands.filter(c => c.type === "hp").length).toBeGreaterThanOrEqual(3);
    expect(replay.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 60000);

  it.each([
    { seed: 7, moveId: 242, player: "MAWILE", opponent: "VOLBEAT", frames: 142 },
    { seed: 36, moveId: 163, player: "CHARMELEON", opponent: "PHANPY", frames: 46 },
  ])("restarts $moveId on a subsequent ordinary command with current field art", row => {
    const replay = generatedCommandAnimationReplay(row.seed, "on", [0, 0]);
    const effects = replay.animations.filter(a => a.moveId === row.moveId);
    expect(effects).toHaveLength(2);
    for (const effect of effects) {
      expect(effect).toMatchObject({ attacker: 0, player: row.player, opponent: row.opponent });
      expect(effect.ages).toEqual(Array.from({ length: row.frames }, (_, i) => i));
    }
    expect(replay.boundaries).toHaveLength(3);
    expect(replay.state.battleCommandPresentation?.lifecycle.phase).toBe("action-menu");
  }, 60000);
});
