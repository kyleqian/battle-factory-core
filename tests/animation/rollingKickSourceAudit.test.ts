import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ROLLING_KICK_FRAME_COUNT,
  rollingKickAtAge,
} from "../../src/animation/rollingKick.ts";
import {
  createSceneOnMovePresentation,
  sceneOnRollingKickView,
} from "../../src/animation/sceneOnPresentation.ts";

describe("MOVE_ROLLING_KICK exact source-relative presentation", () => {
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

  it("ports ellipse, slide callbacks, SlidingKick, impact, ShakeMon, alpha, audio, and cleanup", () => {
    const playerTarget = { x: 176, y: 42 };
    expect(ROLLING_KICK_FRAME_COUNT).toBe(55);
    expect(rollingKickAtAge(10, "player", playerTarget)).toMatchObject({
      active: true,
      alpha: { eva: 12, evb: 8 },
      attackerOffset: { x2: 6, y2: 1 },
      sound: "SE_M_DOUBLE_TEAM",
      soundPanSide: "player",
    });
    expect(rollingKickAtAge(25, "player", playerTarget)).toMatchObject({
      attackerOffset: { x2: 5, y2: 0 },
      slidingFoot: { x: 152, y: 42, x2: 4, y2: 0 },
    });
    expect(rollingKickAtAge(32, "player", playerTarget)).toMatchObject({
      attackerOffset: { x2: 20, y2: 0 },
      hitsplat: { x: 168, y: 42 },
      sound: "SE_M_VITAL_THROW2",
      soundPanSide: "opponent",
    });
    expect(rollingKickAtAge(43, "opponent", { x: 72, y: 88 }))
      .toMatchObject({ alpha: null, attackerOffset: { x2: -18, y2: 0 } });
    expect(rollingKickAtAge(53, "player", playerTarget).active).toBe(true);
    expect(rollingKickAtAge(54, "player", playerTarget).active).toBe(false);
  });

  it("exposes only resolved geometry and immutable field state through the typed seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "ROLLING_KICK",
      attacker: {
        species: "HITMONLEE",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 60 },
          animationCenter: { x: 72, y: 92 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 157,
        playerMaxHp: 157,
        opponentHp: 142,
        opponentMaxHp: 142,
      },
    });
    expect(sceneOnRollingKickView({ ...stage, age: 32 })).toMatchObject({
      age: 32,
      attacker: { species: "HITMONLEE" },
      target: { species: "ONIX" },
      hitsplat: { x: 168, y: 42 },
    });
  });

  it("regenerates Hitmonlee art byte-for-byte", () => {
    const before = readFileSync("src/animation/assets/rollingKick.json");
    execFileSync("npx", ["tsx", "tools/compare/extractRollingKickAssets.ts"]);
    expect(readFileSync("src/animation/assets/rollingKick.json")).toEqual(before);
  });

  it("pins both complete dense exact-window receipts", () => {
    const coverage = JSON.parse(
      readFileSync("ANIMATION_COVERAGE.json", "utf8"),
    );
    expect(
      coverage.entries.find(
        (entry: { move: string }) => entry.move === "MOVE_ROLLING_KICK",
      ),
    ).toMatchObject({ status: "exact" });
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
