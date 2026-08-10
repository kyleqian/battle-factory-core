import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_FLAME_WHEEL legal bilateral staging", () => {
  it("uses complete parties and the real set-181 Quilava carrier in both orientations", () => {
    const paths = [
      "tools/battle-lab/mechanic-flame-wheel-player-quilava-opponent-onix.json",
      "tools/battle-lab/mechanic-flame-wheel-opponent-quilava-player-onix.json",
    ];
    let carriers = 0;
    for (const path of paths) {
      const scenario = JSON.parse(readFileSync(path, "utf8")) as {
        profile: string;
        playerSetIds: number[];
        opponentSetIds: number[];
        overrides: { parties: { player: readonly Mon[]; opponent: readonly Mon[] } };
      };
      expect(scenario.profile).toBe("battle-scene-on");
      expect([...scenario.playerSetIds, ...scenario.opponentSetIds]).toContain(181);
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      for (const mon of [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
      }
      carriers += [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent]
        .filter((mon) => mon.species === 156 && mon.moves.every((move) => move === 172)).length;
    }
    expect(carriers).toBe(2);
  });
});

interface Mon {
  readonly species: number;
  readonly level: number;
  readonly ivs: Record<string, number>;
  readonly evs: Record<string, number>;
  readonly moves: number[];
  readonly ppUps: number[];
}
