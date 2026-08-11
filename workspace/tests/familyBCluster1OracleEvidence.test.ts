import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/family-b-cluster1-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF family-B Cluster-1 receipts", () => {
  it("pins the three source cases, chance contracts, scripts, and Factory carriers", () => {
    const sourcePaths = {
      "battle_script_commands.c": "reference/pokeemerald/src/battle_script_commands.c",
      "battle_scripts_1.s": "reference/pokeemerald/data/battle_scripts_1.s",
      "battle_moves.h": "reference/pokeemerald/src/data/battle_moves.h",
      "battle_frontier_mons.h": "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
      "species_info.h": "reference/pokeemerald/src/data/pokemon/species_info.h",
      "constants_battle.h": "reference/pokeemerald/include/constants/battle.h",
      "moves.h": "reference/pokeemerald/include/constants/moves.h",
      "pokemon.h": "reference/pokeemerald/include/constants/pokemon.h",
      "battle_frontier_mons.constants.h": "reference/pokeemerald/include/constants/battle_frontier_mons.h",
      "items.h": "reference/pokeemerald/include/constants/items.h",
    } as const;
    expect(Object.fromEntries(Object.entries(sourcePaths).map(([name, path]) => [name, sha256(path)]))).toEqual(evidence.sourceSha256);

    const commands = file(sourcePaths["battle_script_commands.c"]);
    const scripts = file(sourcePaths["battle_scripts_1.s"]);
    const moves = file(sourcePaths["battle_moves.h"]);
    const frontier = file(sourcePaths["battle_frontier_mons.h"]);
    const constants = file(sourcePaths["constants_battle.h"]);
    expect(constants).toContain("#define MOVE_EFFECT_TRI_ATTACK          9");
    expect(constants).toContain("#define MOVE_EFFECT_ALL_STATS_UP        34");
    expect(constants).toContain("#define MOVE_EFFECT_SP_ATK_TWO_DOWN     59");
    expect(commands).toMatch(/case MOVE_EFFECT_TRI_ATTACK:[\s\S]*?status1[\s\S]*?Random\(\) % 3 \+ 3;[\s\S]*?SetMoveEffect\(FALSE, 0\);/);
    expect(commands).toMatch(/case MOVE_EFFECT_ALL_STATS_UP:[\s\S]*?BattleScriptPush[\s\S]*?BattleScript_AllStatsUp;/);
    expect(commands).toMatch(/case MOVE_EFFECT_SP_ATK_TWO_DOWN:[\s\S]*?BattleScriptPush[\s\S]*?BattleScript_SAtkDown2;/);
    expect(commands).toMatch(/MOVE_EFFECT_CERTAIN[\s\S]*?SetMoveEffect\(FALSE, MOVE_EFFECT_CERTAIN\);[\s\S]*?Random\(\) % 100 < percentChance/);
    expect(scripts).toMatch(/BattleScript_AllStatsUp::[\s\S]*?STAT_ATK[\s\S]*?STAT_DEF[\s\S]*?STAT_SPEED[\s\S]*?STAT_SPATK[\s\S]*?STAT_SPDEF/);
    expect(scripts).toMatch(/BattleScript_SAtkDown2::[\s\S]*?BIT_SPATK, STAT_CHANGE_CANT_PREVENT \| STAT_CHANGE_NEGATIVE \| STAT_CHANGE_BY_TWO[\s\S]*?setstatchanger STAT_SPATK, 2, TRUE/);
    expect(moves).toMatch(/\[MOVE_TRI_ATTACK\][\s\S]*?EFFECT_TRI_ATTACK[\s\S]*?\.pp = 10,[\s\S]*?\.secondaryEffectChance = 20,/);
    expect(moves).toMatch(/\[MOVE_ANCIENT_POWER\][\s\S]*?EFFECT_ALL_STATS_UP_HIT[\s\S]*?\.pp = 5,[\s\S]*?\.secondaryEffectChance = 10,/);
    expect(moves).toMatch(/\[MOVE_OVERHEAT\][\s\S]*?EFFECT_OVERHEAT[\s\S]*?\.pp = 5,[\s\S]*?\.secondaryEffectChance = 100,/);
    expect(frontier).toMatch(/\[FRONTIER_MON_PORYGON_2\][\s\S]*?SPECIES_PORYGON[\s\S]*?\{MOVE_TRI_ATTACK, MOVE_PSYCHIC, MOVE_THUNDER_WAVE, MOVE_RECOVER\}[\s\S]*?BATTLE_FRONTIER_ITEM_CHERI_BERRY[\s\S]*?NATURE_QUIET/);
    expect(frontier).toMatch(/\[FRONTIER_MON_EXEGGCUTE\][\s\S]*?SPECIES_EXEGGCUTE[\s\S]*?\{MOVE_CONFUSION, MOVE_ANCIENT_POWER, MOVE_LEECH_SEED, MOVE_LIGHT_SCREEN\}[\s\S]*?BATTLE_FRONTIER_ITEM_PERSIM_BERRY[\s\S]*?NATURE_NAUGHTY/);
    expect(frontier).toMatch(/\[FRONTIER_MON_SOLROCK_2\][\s\S]*?SPECIES_SOLROCK[\s\S]*?\{MOVE_EARTHQUAKE, MOVE_ROCK_SLIDE, MOVE_COSMIC_POWER, MOVE_OVERHEAT\}[\s\S]*?BATTLE_FRONTIER_ITEM_WHITE_HERB[\s\S]*?NATURE_HARDY/);
  });

  it("keeps complete legal parties, constrained stock AI, strict speeds, and every 25-frame grid reproducible", () => {
    expect(evidence.schema).toBe("family-b-cluster1-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    for (const scenarioCase of Object.values(evidence.cases)) {
      expect(sha256(scenarioCase.scenario)).toBe(scenarioCase.scenarioSha256);
      expect(scenarioCase.repeatability).toMatchObject({ runs: 2, comparison: "byte-identical full manifest.json" });
      expect(scenarioCase.initialPartyChecksumsValid).toEqual(Array(6).fill(true));
      expect(scenarioCase.carrier.observedActiveSpeed).toBeGreaterThan(scenarioCase.opponent.observedActiveSpeed);
      const scenario = JSON.parse(file(scenarioCase.scenario)) as {
        mode: string;
        profile: string;
        overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } };
        trace: { captureFrames: number[] };
      };
      expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
      const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
      expect(mons).toHaveLength(6);
      for (const mon of mons) {
        expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
        expect(mon.abilitySlot).toBe(0);
      }
      expect(scenario.overrides.parties.player[0]).toMatchObject({
        species: scenarioCase.carrier.species,
        moves: scenarioCase.carrier.moves,
        item: scenarioCase.carrier.item,
        nature: scenarioCase.carrier.nature,
      });
      expect(scenario.overrides.parties.opponent[0]).toMatchObject({
        species: scenarioCase.opponent.species,
        moves: scenarioCase.opponent.moves,
        abilitySlot: 0,
      });
      const expectedGrid = Array.from({ length: scenarioCase.captureGrid.count }, (_, index) => scenarioCase.captureGrid.start + index * scenarioCase.captureGrid.step);
      expect(scenario.trace.captureFrames).toEqual(expectedGrid);
      expect(expectedGrid.at(-1)).toBe(scenarioCase.captureGrid.end);
      for (const observation of scenarioCase.normalizedFrameHashes) expect(expectedGrid).toContain(observation.frame);
    }
  });

  it("pins normalized framebuffer hashes and the visible PP/status/stat-stage/RNG receipts", () => {
    expect(evidence.cases.triAttack.normalizedFrameHashes).toEqual([
      { frame: 0, sha256: "a5677b7b9e33d3f5cd9d567096d940b504ddedf71508759d34e830d5739d44a2" },
      { frame: 200, sha256: "d203c60db405a0f9dc129b4b4b1f37badc29d2f7941e1b1019c6a00b92fac8da" },
      { frame: 1000, sha256: "6957fc15c46305c3bd56aa8f080087f6e73067f84f10d9bd0f2f811b59474583" },
      { frame: 1425, sha256: "9b0e60a75b732d64c845979bb8a8476a3e4cab1fa4d54172f2a1d56c91abf736" },
      { frame: 1625, sha256: "58a5997b6540418ad906938c9778ca433b0626a4d5ad79fcccea1c930b0ac6b1" },
    ]);
    expect(evidence.cases.triAttack.observedStates.map(({ triAttackPp, activeStatus1, partyStatus1 }) => [triAttackPp, activeStatus1, partyStatus1])).toEqual([
      [10, 0, 0],
      [9, 0, 0],
      [8, 64, 64],
      [8, 64, 64],
      [7, 64, 64],
    ]);
    expect(evidence.cases.triAttack.observedStates.map(({ rngValue }) => rngValue)).toEqual([919694434, 3421819359, 3278432283, 786441859, 1630250804]);

    expect(evidence.cases.overheat.normalizedFrameHashes.map(({ frame, sha256 }) => [frame, sha256])).toEqual([
      [0, "12d9981279b20dc071421e1bb6df58362434744496a52a15e0c95a82c0ee80ea"],
      [375, "fea948f33ad07fc83383b14060ec0fad8be34aead06b7283253f0804ad289c84"],
      [950, "3c1227248116c36e7c64e6dd0ccce6ad725e2284898604a02c9cf3f19d9bf75d"],
      [1175, "f34a847f98433020690acdb87807627a93ac470ac56ddeffb29cde707065a73a"],
      [1400, "eaa8e07d462c2c4366ea462719aef91acbc6288a7cbf7e8a33a614de61767308"],
    ]);
    expect(evidence.cases.overheat.observedStates.map(({ overheatPp, opponentHp, spAttackStage }) => [overheatPp, opponentHp, spAttackStage])).toEqual([
      [5, 127, 6],
      [4, 110, 4],
      [3, 110, 4],
      [3, 101, 2],
      [3, 101, 2],
    ]);
    expect(127 - 110).toBe(17);
    expect(110 - 101).toBe(9);

    expect(evidence.cases.ancientPower.normalizedFrameHashes.map(({ frame }) => frame)).toEqual([0, 200, 1300, 1375, 1450, 1550, 1625, 1725, 1850, 2375]);
    expect(evidence.cases.ancientPower.observedStates.map(({ ancientPowerPp, opponentHp, combatStatStages }) => [ancientPowerPp, opponentHp, combatStatStages])).toEqual([
      [8, 127, [6, 6, 6, 6, 6]],
      [7, 112, [6, 6, 6, 6, 6]],
      [6, 97, [6, 6, 6, 6, 6]],
      [6, 97, [6, 6, 6, 6, 6]],
      [6, 97, [7, 6, 6, 6, 6]],
      [6, 97, [7, 7, 6, 6, 6]],
      [6, 97, [7, 7, 7, 6, 6]],
      [6, 97, [7, 7, 7, 7, 6]],
      [6, 97, [7, 7, 7, 7, 7]],
      [5, 73, [7, 7, 7, 7, 7]],
    ]);
    expect(evidence.observedVsSourceOnly).toContain("unobserved burn/freeze selectors");
  });
});
