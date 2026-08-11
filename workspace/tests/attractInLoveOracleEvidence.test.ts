import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidenceData from "./fixtures/attract-in-love-off-evidence.json" with { type: "json" };

type Capture = {
  frame: number;
  sha256: string;
  rngValue: number;
  player: { hp: number; pp: number[]; status2: number };
  opponent: { hp: number; pp: number[]; status2: number };
};
type EvidenceCase = { id: string; scenario: string; seed: number; captures: Capture[] };
const evidence = evidenceData as {
  schema: string;
  oracleProfile: string;
  publicAbiBoundary: { exposes: string[]; doesNotExpose: string[]; rule: string };
  source: Record<string, string>;
  cases: EvidenceCase[];
};
const INFATUATED_WITH_PLAYER = 0x0001_0000;

function scenario(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}
function ppTotal(capture: Capture, battler: "player" | "opponent"): number {
  return capture[battler].pp.reduce((sum, value) => sum + value, 0);
}

describe("Battle Scene OFF Attract → in-love oracle evidence", () => {
  it("keeps both traces legal, controller-driven, and compact", () => {
    expect(evidence.schema).toBe("attract-in-love-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    for (const receipt of evidence.cases) {
      const input = scenario(receipt.scenario);
      expect(input).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-off",
        level: 50,
        challengeNum: 2,
        battleNum: 2,
        trainerId: 110,
        playerSetIds: [278, 354, 338],
        opponentSetIds: [277, 339, 327],
        seed: receipt.seed,
        overrides: {
          battlers: {
            player: { moves: [213, 33, 33, 33], ppUps: [0, 0, 0, 0], ability: 0 },
            opponent: { moves: [33, 33, 33, 33], ppUps: [0, 0, 0, 0], ability: 0 },
          },
        },
        trace: { captureFrames: [0, 734, 1468] },
      });
      expect(JSON.stringify(input)).not.toMatch(/"(?:status1|status2|status3|hp|weather|statStages|sideConditions)"/);
      expect((input.trace as { segments: Array<{ frames: number }> }).segments
        .reduce((total, segment) => total + segment.frames, 0)).toBe(1468);
    }
  });

  it("pins real Attract creation followed by complementary next-action observations", () => {
    expect(evidence.cases.map((entry) => entry.id)).toEqual([
      "love-check-passed-observed-action",
      "immobilized-by-love-observed-no-action",
    ]);
    for (const receipt of evidence.cases) {
      expect(receipt.captures.map((capture) => capture.frame)).toEqual([0, 734, 1468]);
      expect(receipt.captures.every((capture) => /^[a-f0-9]{64}$/.test(capture.sha256))).toBe(true);
      const [before, attracted, after] = receipt.captures;
      expect(before!.player.pp[0]).toBe(15);
      expect(attracted!.player.pp[0]).toBe(14);
      expect(after!.player.pp[0]).toBe(13);
      expect(before!.opponent.status2).toBe(0);
      expect(attracted!.opponent.status2).toBe(INFATUATED_WITH_PLAYER);
      expect(after!.opponent.status2).toBe(INFATUATED_WITH_PLAYER);
    }
    const [pass, cantAttack] = evidence.cases;
    expect(ppTotal(pass!.captures[2]!, "opponent")).toBe(ppTotal(pass!.captures[1]!, "opponent") - 1);
    expect(pass!.captures[2]!.player.hp).toBeLessThan(pass!.captures[1]!.player.hp);
    expect(ppTotal(cantAttack!.captures[2]!, "opponent")).toBe(ppTotal(cantAttack!.captures[1]!, "opponent"));
    expect(cantAttack!.captures[2]!.player.hp).toBe(cantAttack!.captures[1]!.player.hp);
  });

  it("documents the public/internal boundary without attributing endpoint RNG", () => {
    expect(evidence.publicAbiBoundary.exposes).toEqual([
      "status2", "pp", "rngValue", "controllerExecFlags", "currentMove",
    ]);
    expect(evidence.publicAbiBoundary.doesNotExpose).toContain("gBattleScripting.battler");
    expect(evidence.publicAbiBoundary.doesNotExpose).toContain("ProtectStruct.loveImmobility");
    expect(evidence.publicAbiBoundary.rule).toMatch(/do not attribute/i);
    expect(readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8"))
      .toContain("gBattleMons[gBattlerTarget].status2 |= STATUS2_INFATUATED_WITH(gBattlerAttacker);");
    expect(readFileSync("reference/pokeemerald/src/battle_util.c", "utf8"))
      .toContain("gProtectStructs[gBattlerAttacker].loveImmobility = 1;");
    expect(readFileSync("reference/pokeemerald/src/battle_util.c", "utf8"))
      .toContain("CancelMultiTurnMoves(gBattlerAttacker);");
  });
});
