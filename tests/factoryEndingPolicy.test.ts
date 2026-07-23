import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import policy from "../src/data/gen/factory-ending-policy.json" with { type: "json" };

describe("factory terminal-endpoint extraction", () => {
  it("pins the distinct loss and seventh-win state/UI contracts", () => {
    expect(policy.schema).toBe("factory-ending-policy/v1");
    expect(policy.constants).toMatchObject({ stagesPerChallenge: 7, maxStreak: 9999, maxBattlePoints: 9999, statuses: { won: 3, lost: 4 } });
    expect(policy.loss).toMatchObject({ transition: { map: "MAP_BATTLE_FRONTIER_BATTLE_FACTORY_LOBBY", singlesWarp: { x: 4, y: 8 } } });
    expect(policy.loss.mutations).toContain("battleNumber is not incremented");
    expect(policy.loss.lobby.text).toContain("Thank you for participating!");
    expect(policy.seventhWin.beforeLobby).toContain("challengeStatus = WON");
    expect(policy.seventhWin.lobby.regularText).toContain("seven\\nstraight Battle Swap matches!");
    expect(policy.seventhWin.battlePoints).toMatchObject({ brainBonus: 10, cap: 9999, firstSevenWinAward: 3 });
    expect(policy.seventhWin.battlePoints.factorySinglesByAwardRow).toHaveLength(30);
    expect(policy.presentation.commonHandoff).toContain(
      "the battle-room script waits for map state; lobby OnWarp turns the player north",
    );
    expect(policy.presentation.gates).toMatchObject({
      defaultMsgbox: ["message", "waitmessage", "waitbuttonpress"],
      getPointsMsgbox: ["message", "playfanfare MUS_OBTAIN_B_POINTS", "waitfanfare", "waitmessage"],
    });
    expect(policy.presentation.lossOrder[2]).toContain("LoadPlayerParty");
    expect(policy.presentation.seventhWinOrder[1]).toContain("A/B-gated");
  });

  it("reproduces the committed artifact byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-ending-policy-"));
    const output = join(directory, "policy.json");
    try {
      execFileSync(process.execPath, ["--experimental-strip-types", "tools/extract/extract-factory-ending-policy.ts", "--out", output], { stdio: "pipe" });
      expect(readFileSync(output)).toEqual(readFileSync("src/data/gen/factory-ending-policy.json"));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
