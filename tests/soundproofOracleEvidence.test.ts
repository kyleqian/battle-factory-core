import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidenceData from "./fixtures/soundproof-off-evidence.json" with { type: "json" };

type Capture = {
  frame: number;
  sha256: string;
  playerPp?: number;
  opponentAbility?: number;
  opponentHp?: number;
  playerSpecies?: number;
  playerAbility?: number;
  playerHp?: number;
  opponentPp?: number;
  opponentStatus2?: number;
};
type EvidenceCase = { id: string; scenario: string; scenarioSha256: string; freshManifestSha256: string; captures: Capture[] };
const evidence = evidenceData as {
  schema: string;
  oracleProfile: string;
  publicAbiBoundary: { exposes: string[]; doesNotExpose: string[]; rule: string };
  cases: EvidenceCase[];
  boundedRemainder: string;
};

function scenario(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}
function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("Battle Scene OFF Soundproof mechanic-lab evidence", () => {
  it("keeps all three fixtures legal, controller-driven, profile-pinned, and transient-free", () => {
    expect(evidence.schema).toBe("soundproof-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(evidence.cases.map((entry) => entry.id)).toEqual([
      "hyper-voice-blocked-by-soundproof",
      "tackle-control-still-hits-soundproof",
      "uproar-continuation-blocked-after-native-soundproof-switch",
    ]);

    for (const receipt of evidence.cases) {
      const input = scenario(receipt.scenario);
      expect(sha256(receipt.scenario)).toBe(receipt.scenarioSha256);
      expect(receipt.freshManifestSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(input).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-off",
        level: 50,
        challengeNum: 3,
        battleNum: 0,
        trainerId: 120,
      });
      expect(JSON.stringify(input)).not.toMatch(/"(?:hp|status1|status2|status3|weather|statStages|sideConditions)"/);
      const trace = input.trace as { segments: Array<{ frames: number; buttons: string[] }>; captureFrames: number[] };
      expect(trace.segments.every((segment) => segment.frames > 0)).toBe(true);
      expect(trace.segments.some((segment) => segment.buttons.includes("A"))).toBe(true);
      expect(trace.captureFrames).toEqual(receipt.captures.map((capture) => capture.frame));
    }

    expect(scenario(evidence.cases[0]!.scenario)).toMatchObject({
      playerSetIds: [372, 373, 381], opponentSetIds: [380, 400, 464],
      overrides: { battlers: { player: { moves: [304, 33, 33, 33], ppUps: [0, 0, 0, 0], ability: 0 }, opponent: { ability: 43 } } },
    });
    expect(scenario(evidence.cases[1]!.scenario)).toMatchObject({
      playerSetIds: [372, 373, 381], opponentSetIds: [380, 400, 464],
      overrides: { battlers: { player: { moves: [33, 33, 33, 33], ppUps: [0, 0, 0, 0], ability: 0 }, opponent: { ability: 43 } } },
    });
    expect(scenario(evidence.cases[2]!.scenario)).toMatchObject({
      playerSetIds: [372, 380, 381], opponentSetIds: [394, 400, 464],
      overrides: { battlers: { player: { moves: [150, 150, 150, 150], ppUps: [0, 0, 0, 0], ability: 0 }, opponent: { moves: [253, 253, 253, 253], ppUps: [0, 0, 0, 0], ability: 0 } } },
    });
  });

  it("pins normal Soundproof blocking against a non-sound control", () => {
    const [sound, control] = evidence.cases;
    const [soundBefore, soundAfter] = sound!.captures;
    const [controlBefore, controlAfter] = control!.captures;
    expect(soundBefore).toMatchObject({ frame: 0, playerPp: 10, opponentAbility: 43, opponentHp: 137 });
    expect(soundAfter).toMatchObject({ frame: 734, playerPp: 9, opponentAbility: 43, opponentHp: 137 });
    expect(controlBefore).toMatchObject({ frame: 0, playerPp: 35, opponentAbility: 43, opponentHp: 137 });
    expect(controlAfter).toMatchObject({ frame: 734, playerPp: 34, opponentAbility: 43, opponentHp: 126 });
    expect(soundAfter!.opponentHp).toBe(soundBefore!.opponentHp);
    expect(controlAfter!.opponentHp).toBeLessThan(controlBefore!.opponentHp!);
  });

  it("pins a real Uproar lock, an ordinary switch, and its PP-free Soundproof continuation", () => {
    const [, , uproar] = evidence.cases;
    const [before, started, blockedContinuation] = uproar!.captures;
    expect(before).toMatchObject({ frame: 0, playerSpecies: 51, playerAbility: 0, playerHp: 101, opponentPp: 10, opponentStatus2: 0 });
    expect(started).toMatchObject({ frame: 734, playerSpecies: 51, playerAbility: 0, playerHp: 61, opponentPp: 9, opponentStatus2: 4128 });
    expect(blockedContinuation).toMatchObject({ frame: 1634, playerSpecies: 122, playerAbility: 43, playerHp: 137, opponentPp: 9, opponentStatus2: 4112 });
    expect(blockedContinuation!.opponentPp).toBe(started!.opponentPp);
    expect(blockedContinuation!.opponentStatus2).toBeGreaterThan(0);
  });

  it("keeps the source and public-ABI boundary explicit", () => {
    const utility = readFileSync("reference/pokeemerald/src/battle_util.c", "utf8");
    const scripts = readFileSync("reference/pokeemerald/data/battle_scripts_1.s", "utf8");
    expect(utility).toContain("MOVE_UPROAR, MOVE_METAL_SOUND, MOVE_GRASS_WHISTLE, MOVE_HYPER_VOICE");
    expect(utility).toContain("if (gLastUsedAbility == ABILITY_SOUNDPROOF)");
    expect(utility).toContain("gHitMarker |= HITMARKER_NO_PPDEDUCT;");
    expect(utility).toContain("gBattlescriptCurrInstr = BattleScript_SoundproofProtected;");
    expect(scripts).toContain("BattleScript_SoundproofProtected::");
    expect(scripts).toContain("BattleScript_EffectUproar::");
    expect(evidence.publicAbiBoundary.doesNotExpose).toContain("gHitMarker");
    expect(evidence.publicAbiBoundary.rule).toMatch(/source-established/i);
    expect(evidence.boundedRemainder).toMatch(/singles-only/i);
  });
});
