import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_ROLLING_KICK source and legal-carrier checkpoint", () => {
  it("pins the sole lowest Level-50 carrier and the distinct Low Kick body", () => {
    expect(execFileSync(
      "npx",
      ["tsx", "tools/compare/rollingKickSourceAudit.ts"],
      { encoding: "utf8" },
    )).toContain("set 233/FRONTIER_MON_HITMONLEE_1");
  });

  it("stages complete legal Scene-ON parties in both orientations", () => {
    for (const path of [
      "tools/battle-lab/mechanic-rolling-kick-player-hitmonlee-opponent-onix.json",
      "tools/battle-lab/mechanic-rolling-kick-opponent-hitmonlee-player-onix.json",
    ]) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect(fixture.profile).toBe("battle-scene-on");
      expect(fixture.challengeNum).toBe(1);
      expect(fixture.overrides.parties.player).toHaveLength(3);
      expect(fixture.overrides.parties.opponent).toHaveLength(3);
      const hitmonlee = [
        ...fixture.overrides.parties.player,
        ...fixture.overrides.parties.opponent,
      ].find((mon) => mon.species === 106);
      expect(hitmonlee).toMatchObject({
        nature: 3,
        evs: { hp: 255, defense: 255 },
        moves: [27, 27, 27, 27],
        item: 207,
      });
    }
  });

  it("pins both complete dense source-window receipts without promoting coverage", () => {
    const coverage = JSON.parse(
      readFileSync("ANIMATION_COVERAGE.json", "utf8"),
    );
    expect(
      coverage.entries.find(
        (entry: { move: string }) => entry.move === "MOVE_ROLLING_KICK",
      ),
    ).toBeUndefined();
    for (const [path, evidence, raw] of [
      [
        "tools/compare/fixtures/rolling-kick-player-hitmonlee-opponent-onix.json",
        "3f35463979c0971b6432ed8695caa1130e21890d07ea4edb80b6685271932f92",
        "76c1741106018ee425f40505c56af234d7d033562dc8bd3c84386e465d9d7ef3",
      ],
      [
        "tools/compare/fixtures/rolling-kick-opponent-hitmonlee-player-onix.json",
        "4fb8c542ab55e346e4f22129cfa10f028d1a43ff8be0ee6e1e1d8b4160849690",
        "237e0cd3062b05c1ffa91a1ecc2e03a60ba1f195012ad079f0980933ea12d5a1",
      ],
    ]) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect(fixture.sourceWindow.frameCount).toBe(55);
      expect(fixture.evidenceSha256).toBe(evidence);
      expect(fixture.rawRgbSha256).toBe(raw);
    }
  });
});
