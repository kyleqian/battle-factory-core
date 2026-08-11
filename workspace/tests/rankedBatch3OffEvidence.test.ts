import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/ranked-batch3-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const file = (path: string) => readFileSync(new URL(path, ROOT), "utf8");
const sha256 = (path: string) => createHash("sha256").update(file(path)).digest("hex");

describe("ranked Batch 3 Battle Scene OFF receipts", () => {
  it("pins the source handlers, scripts, carriers, and honest Spit Up boundary", () => {
    const paths = {
      "battle_script_commands.c": "reference/pokeemerald/src/battle_script_commands.c",
      "battle_scripts_1.s": "reference/pokeemerald/data/battle_scripts_1.s",
      "battle_main.c": "reference/pokeemerald/src/battle_main.c",
      "battle_frontier_mons.h": "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
      "species_info.h": "reference/pokeemerald/src/data/pokemon/species_info.h",
      "battle_moves.h": "reference/pokeemerald/src/data/battle_moves.h",
      "battle_frontier_mons.json": "src/data/gen/battle-frontier-mons.json",
    };
    expect(Object.fromEntries(Object.entries(paths).map(([name, path]) => [name, sha256(path)]))).toEqual(evidence.sourceSha256);
    const commands = file(paths["battle_script_commands.c"]);
    const scripts = file(paths["battle_scripts_1.s"]);
    expect(commands).toMatch(/Cmd_painsplitdmgcalc[\s\S]*?\(.*hp.*\+.*hp.*\) \/ 2[\s\S]*?painSplitHp[\s\S]*?IGNORE_SHELL_BELL/);
    expect(commands).toMatch(/Cmd_stockpile[\s\S]*?stockpileCounter == 3[\s\S]*?stockpileCounter\+\+[\s\S]*?PREPARE_BYTE_NUMBER_BUFFER/);
    expect(commands).toMatch(/Cmd_stockpiletobasedamage[\s\S]*?stockpileCounter == 0[\s\S]*?CalculateBaseDamage[\s\S]*?stockpileCounter = 0/);
    expect(commands).toMatch(/Cmd_stockpiletohpheal[\s\S]*?stockpileCounter == 0[\s\S]*?maxHP == .*hp[\s\S]*?maxHP \/ \(1 << \(3 - .*stockpileCounter\)\)[\s\S]*?stockpileCounter = 0/);
    expect(scripts).toMatch(/BattleScript_EffectPainSplit::[\s\S]*?painsplitdmgcalc[\s\S]*?healthbarupdate BS_ATTACKER[\s\S]*?copyword gBattleMoveDamage, sPAINSPLIT_HP[\s\S]*?healthbarupdate BS_TARGET/);
    expect(scripts).toMatch(/BattleScript_EffectStockpile::[\s\S]*?printfromtable gStockpileUsedStringIds/);
    expect(scripts).toMatch(/BattleScript_EffectSpitUp::[\s\S]*?stockpiletobasedamage[\s\S]*?adjustsetdamage/);
    expect(scripts).toMatch(/BattleScript_EffectSwallow::[\s\S]*?stockpiletohpheal[\s\S]*?BattleScript_PresentHealTarget/);

    const generated = JSON.parse(file(paths["battle_frontier_mons.json"])).entries as Array<{ label: string; species: string; moves: string[] }>;
    expect(generated.find(({ label }) => label === "FRONTIER_MON_MISDREAVUS_1")).toMatchObject({
      species: "SPECIES_MISDREAVUS", moves: ["MOVE_PAIN_SPLIT", "MOVE_SHADOW_BALL", "MOVE_CONFUSE_RAY", "MOVE_THUNDER_WAVE"],
    });
    expect(generated.find(({ label }) => label === "FRONTIER_MON_PELIPPER_1")).toMatchObject({
      species: "SPECIES_PELIPPER", moves: ["MOVE_WATER_PULSE", "MOVE_AERIAL_ACE", "MOVE_STOCKPILE", "MOVE_SWALLOW"],
    });
    expect(generated.find(({ label }) => label === "FRONTIER_MON_SWALOT_1")).toMatchObject({
      species: "SPECIES_SWALOT", moves: ["MOVE_STOCKPILE", "MOVE_SWALLOW", "MOVE_SPIT_UP", "MOVE_SLUDGE"],
    });
    const species = file(paths["species_info.h"]);
    expect(species).toMatch(/\[SPECIES_MISDREAVUS\][\s\S]*?abilities = \{ABILITY_LEVITATE, ABILITY_NONE\}/);
    expect(species).toMatch(/\[SPECIES_PELIPPER\][\s\S]*?abilities = \{ABILITY_KEEN_EYE, ABILITY_NONE\}/);
    expect(species).toMatch(/\[SPECIES_SWALOT\][\s\S]*?abilities = \{ABILITY_LIQUID_OOZE, ABILITY_STICKY_HOLD\}/);
    expect(evidence.spitUpBoundary).toContain("No dynamic Spit Up receipt");
  });

  it("keeps complete parties, strict speeds, 25-frame grids, and byte-identical repeatability", () => {
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    for (const scenarioCase of Object.values(evidence.cases)) {
      expect(sha256(scenarioCase.scenario)).toBe(scenarioCase.scenarioSha256);
      expect(scenarioCase.manifestSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(scenarioCase.initialPartyChecksumsValid).toEqual(Array(6).fill(true));
      const scenario = JSON.parse(file(scenarioCase.scenario));
      const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
      expect(mons).toHaveLength(6);
      for (const mon of mons) {
        expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
        expect(mon.abilitySlot).toBe(0);
      }
      const grid = Array.from({ length: scenarioCase.captureGrid.count }, (_, i) => scenarioCase.captureGrid.start + i * scenarioCase.captureGrid.step);
      expect(scenario.trace.captureFrames).toEqual(grid);
      expect(grid.at(-1)).toBe(scenarioCase.captureGrid.end);
      expect(scenarioCase.carrier.speed).toBeGreaterThan(scenarioCase.target.speed);
    }
  });

  it("pins both Pain Split HP writes, PP, party synchronization, and zero local draws", () => {
    const states = evidence.cases.painSplit.observedStates;
    expect(states.slice(-3).map(({ frame, playerHp, opponentHp, playerPp, rngValue }) => [frame, playerHp, opponentHp, playerPp[0], rngValue])).toEqual([
      [1125, 117, 100, 19, 1530931116],
      [1175, 108, 100, 19, 1530931116],
      [1200, 108, 108, 19, 1530931116],
    ]);
    expect(Math.floor((117 + 100) / 2)).toBe(108);
  });

  it("pins count-2 Swallow healing and the reset-to-three/fourth-failure ladder", () => {
    const scaled = evidence.cases.swallowScaled.observedStates;
    expect(scaled.at(-2)).toMatchObject({ frame: 1900, playerHp: 67, playerPp: [20, 20, 8, 9], rngValue: 2319805938 });
    expect(scaled.at(-1)).toMatchObject({ frame: 2025, playerHp: 150, playerPp: [20, 20, 8, 9], rngValue: 2319805938 });
    expect(150 - 67).toBe(Math.floor(167 / 2));

    const limit = evidence.cases.stockpileLimit.observedStates;
    expect(limit.slice(3).map(({ playerPp, fact }) => [playerPp[2], fact])).toEqual([
      [7, "post-Swallow counter restarted at 1"],
      [6, "post-Swallow counter reached 2"],
      [5, "post-Swallow counter reached 3"],
      [4, "PELIPPER can't STOCKPILE any more!"],
    ]);
    expect(limit.at(-1)).toMatchObject({ playerHp: 110, rngValue: 842450419 });
  });
});
