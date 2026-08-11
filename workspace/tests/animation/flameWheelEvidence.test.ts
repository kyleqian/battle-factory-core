import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
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

  it("pins twice-fresh dense hardware/raw-RGB receipts without promoting coverage", () => {
    const paths = [
      "tools/compare/fixtures/flame-wheel-player-quilava-opponent-onix.json",
      "tools/compare/fixtures/flame-wheel-opponent-quilava-player-onix.json",
    ];
    for (const path of paths) {
      const fixture = JSON.parse(readFileSync(path, "utf8")) as {
        schema: string;
        oracleProfile: string;
        evidenceSchema: string;
        denseWindow: { startFrame: number; endFrame: number; frameCount: number };
        evidenceSha256: string;
        secondFreshEvidenceSha256: string;
        changeMap: string;
        changeMapSha256: string;
        acceptance: { status: string; componentMatching: number; framebufferMatching: number };
      };
      expect(fixture.schema).toBe("flame-wheel-portable-evidence/v2");
      expect(fixture.oracleProfile).toBe("battle-scene-on");
      expect(fixture.evidenceSchema).toBe("flame-wheel-dense-evidence/v2");
      expect(fixture.denseWindow.frameCount).toBe(170);
      expect(fixture.denseWindow.endFrame - fixture.denseWindow.startFrame + 1).toBe(170);
      expect(fixture.secondFreshEvidenceSha256).toBe(fixture.evidenceSha256);
      expect(createHash("sha256").update(readFileSync(fixture.changeMap)).digest("hex"))
        .toBe(fixture.changeMapSha256);
      expect(fixture.acceptance).toEqual({
        status: "exact",
        componentMatching: 170,
        framebufferMatching: 170,
      });
    }
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
