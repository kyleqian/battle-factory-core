import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidenceData from "./fixtures/factory-disobedience-off-evidence.json" with { type: "json" };
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };

type Scenario = {
  schemaVersion: number;
  mode: string;
  profile: string;
  level: number;
  playerSetIds: number[];
  opponentSetIds: number[];
  trace: { segments: unknown[]; captureFrames: number[] };
};

const evidence = evidenceData as {
  schema: string;
  oracleProfile: string;
  scenario: string;
  probe: string;
  source: Record<string, string>;
  scenarioSha256: string;
  freshManifestSha256: string;
  observation: Record<string, unknown>;
  verdict: { factoryLegalLevel50Singles: Record<string, string>; why: string };
  ordinaryStoryBattleBoundary: string;
};
const frontierMons = frontierMonsData as { count: number; entries: Array<{ species: string }> };

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("Battle Scene OFF Factory disobedience scope evidence", () => {
  it("keeps the staged observation a legal, immutable Level-50 Factory single", () => {
    const scenario = JSON.parse(readFileSync(evidence.scenario, "utf8")) as Scenario;
    expect(evidence.schema).toBe("factory-disobedience-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(evidence.probe).toBe("tools/probe/audit-factory-disobedience-off.py");
    expect(sha256(evidence.scenario)).toBe(evidence.scenarioSha256);
    expect(evidence.freshManifestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(scenario).toMatchObject({
      schemaVersion: 1,
      mode: "factoryLegal",
      profile: "battle-scene-off",
      level: 50,
      trace: { segments: [], captureFrames: [0] },
    });
    expect(scenario.playerSetIds).toHaveLength(3);
    expect(scenario.opponentSetIds).toHaveLength(3);
    expect(JSON.stringify(scenario)).not.toMatch(/"(?:hp|status1|status2|status3|weather|statStages|sideConditions)"/);
  });

  it("pins the real Factory flags and source-created ownership/level inputs", () => {
    expect(evidence.observation).toMatchObject({
      battleTypeFlags: 0x0008_000c,
      hasTrainer: true,
      hasFactory: true,
      hasFrontier: true,
      hasDouble: false,
      level: 50,
      playerOtMatchesSaveTrainerId: true,
      opponentOtMatchesSaveTrainerId: true,
    });
    expect(evidence.observation.rngValueAfterConstruction).toBeTypeOf("number");
  });

  it("proves the Factory corpus cannot take IsBattlerModernFatefulEncounter's illegal Mew/Deoxys escape", () => {
    expect(frontierMons.entries).toHaveLength(frontierMons.count);
    expect(frontierMons.entries.filter(({ species }) => (
      species === "SPECIES_MEW" || species === "SPECIES_DEOXYS"
    ))).toEqual([]);
  });

  it("keeps the source branch ordering and Factory-only verdict honest", () => {
    const commands = readFileSync("reference/pokeemerald/src/battle_script_commands.c", "utf8");
    const utility = readFileSync("reference/pokeemerald/src/battle_util.c", "utf8");
    const tower = readFileSync("reference/pokeemerald/src/battle_tower.c", "utf8");
    const constants = readFileSync("reference/pokeemerald/include/constants/battle.h", "utf8");
    const factory = readFileSync("reference/pokeemerald/src/battle_factory.c", "utf8");

    expect(tower).toContain("gBattleTypeFlags = BATTLE_TYPE_TRAINER | BATTLE_TYPE_FACTORY;");
    expect(constants).toContain("#define BATTLE_TYPE_FACTORY            (1 << 19)");
    expect(constants).toContain("| BATTLE_TYPE_FACTORY | BATTLE_TYPE_PIKE");
    expect(factory).toContain("FRONTIER_MAX_LEVEL_50");
    expect(factory).toContain("OT_ID_PLAYER_ID, 0);");

    const helperStart = utility.indexOf("u8 IsMonDisobedient(void)");
    const frontier = utility.indexOf("if (gBattleTypeFlags & BATTLE_TYPE_FRONTIER)", helperStart);
    const ownership = utility.indexOf("if (!IsOtherTrainer", frontier);
    const level = utility.indexOf("if (gBattleMons[gBattlerAttacker].level <= obedienceLevel)");
    const firstRng = utility.indexOf("rnd = (Random() & 255);");
    expect(helperStart).toBeGreaterThan(-1);
    expect(frontier).toBeGreaterThan(helperStart);
    expect(frontier).toBeLessThan(ownership);
    expect(ownership).toBeLessThan(level);
    expect(level).toBeLessThan(firstRng);
    expect(commands.indexOf("AbilityBattleEffects(ABILITYEFFECT_MOVES_BLOCK")).toBeLessThan(
      commands.indexOf("i = IsMonDisobedient()"),
    );

    expect(evidence.verdict.factoryLegalLevel50Singles).toEqual({
      DISOBEDIENCE_OBEDIENT: "always",
      DISOBEDIENCE_OTHER: "unreachable",
      DISOBEDIENCE_IGNORED: "unreachable",
    });
    expect(evidence.verdict.why).toMatch(/precedes ownership, badges, level comparisons, and Random\(\)/);
    expect(evidence.ordinaryStoryBattleBoundary).toMatch(/non-Frontier story battles/i);
  });
});
