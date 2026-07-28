import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/family-b-cluster3-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF family-B Cluster-3 volatile receipts", () => {
  it("pins the two source effects, owner-aware cleanup, Nightmare reducer, and dossier carriers", () => {
    const sourcePaths = {
      "battle_script_commands.c": "reference/pokeemerald/src/battle_script_commands.c",
      "battle_scripts_1.s": "reference/pokeemerald/data/battle_scripts_1.s",
      "battle_main.c": "reference/pokeemerald/src/battle_main.c",
      "battle_util.c": "reference/pokeemerald/src/battle_util.c",
      "battle_moves.h": "reference/pokeemerald/src/data/battle_moves.h",
      "battle_frontier_mons.h": "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
      "species_info.h": "reference/pokeemerald/src/data/pokemon/species_info.h",
      "constants_battle.h": "reference/pokeemerald/include/constants/battle.h",
      "moves.h": "reference/pokeemerald/include/constants/moves.h",
      "species.h": "reference/pokeemerald/include/constants/species.h",
      "items.h": "reference/pokeemerald/include/constants/items.h",
    } as const;
    expect(Object.fromEntries(Object.entries(sourcePaths).map(([name, path]) => [name, sha256(path)]))).toEqual(evidence.sourceSha256);

    const commands = file(sourcePaths["battle_script_commands.c"]);
    const scripts = file(sourcePaths["battle_scripts_1.s"]);
    const main = file(sourcePaths["battle_main.c"]);
    const util = file(sourcePaths["battle_util.c"]);
    const frontier = file(sourcePaths["battle_frontier_mons.h"]);
    const constants = file(sourcePaths["constants_battle.h"]);
    expect(constants).toContain("#define MOVE_EFFECT_PREVENT_ESCAPE      32");
    expect(constants).toContain("#define MOVE_EFFECT_NIGHTMARE           33");
    expect(constants).toContain("#define STATUS2_ESCAPE_PREVENTION     (1 << 26)");
    expect(constants).toContain("#define STATUS2_NIGHTMARE             (1 << 27)");
    expect(commands).toMatch(/case MOVE_EFFECT_PREVENT_ESCAPE:[\s\S]*?status2 \|= STATUS2_ESCAPE_PREVENTION;[\s\S]*?battlerPreventingEscape = gBattlerAttacker;/);
    expect(commands).toMatch(/case MOVE_EFFECT_NIGHTMARE:[\s\S]*?status2 \|= STATUS2_NIGHTMARE;[\s\S]*?gBattlescriptCurrInstr\+\+;/);
    expect(scripts).toMatch(/BattleScript_EffectMeanLook::[\s\S]*?jumpifstatus2 BS_TARGET, STATUS2_ESCAPE_PREVENTION[\s\S]*?setmoveeffect MOVE_EFFECT_PREVENT_ESCAPE[\s\S]*?STRINGID_TARGETCANTESCAPENOW/);
    expect(scripts).toMatch(/BattleScript_EffectNightmare::[\s\S]*?jumpifstatus2 BS_TARGET, STATUS2_NIGHTMARE[\s\S]*?jumpifstatus BS_TARGET, STATUS1_SLEEP[\s\S]*?setmoveeffect MOVE_EFFECT_NIGHTMARE/);
    expect(main).toMatch(/SwitchInClearSetData[\s\S]*?STATUS2_ESCAPE_PREVENTION[\s\S]*?battlerPreventingEscape == gActiveBattler[\s\S]*?status2 &= ~STATUS2_ESCAPE_PREVENTION/);
    expect(main).toMatch(/FaintClearSetData[\s\S]*?STATUS2_ESCAPE_PREVENTION[\s\S]*?battlerPreventingEscape == gActiveBattler[\s\S]*?status2 &= ~STATUS2_ESCAPE_PREVENTION/);
    expect(util).toMatch(/case ENDTURN_NIGHTMARES:[\s\S]*?STATUS2_NIGHTMARE[\s\S]*?status1 & STATUS1_SLEEP[\s\S]*?maxHP \/ 4[\s\S]*?status2 &= ~STATUS2_NIGHTMARE/);
    expect(frontier).toMatch(/\[FRONTIER_MON_MURKROW_2\][\s\S]*?SPECIES_MURKROW[\s\S]*?MOVE_MEAN_LOOK[\s\S]*?BATTLE_FRONTIER_ITEM_BRIGHT_POWDER[\s\S]*?NATURE_QUIRKY/);
    expect(frontier).toMatch(/\[FRONTIER_MON_HAUNTER_2\][\s\S]*?SPECIES_HAUNTER[\s\S]*?MOVE_HYPNOSIS, MOVE_NIGHTMARE[\s\S]*?BATTLE_FRONTIER_ITEM_LUM_BERRY[\s\S]*?NATURE_RELAXED/);
  });

  it("keeps complete legal parties, constrained opponent AI, strict speeds, and reproducible 25-frame grids", () => {
    expect(evidence.schema).toBe("family-b-cluster3-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    for (const scenarioCase of Object.values(evidence.cases)) {
      expect(sha256(scenarioCase.scenario)).toBe(scenarioCase.scenarioSha256);
      expect(scenarioCase.repeatability).toMatchObject({ runs: 2, comparison: "byte-identical full manifest.json" });
      expect(scenarioCase.initialPartyChecksumsValid).toEqual(Array(6).fill(true));
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
      const expectedGrid = Array.from({ length: scenarioCase.captureGrid.count }, (_, index) => scenarioCase.captureGrid.start + index * scenarioCase.captureGrid.step);
      expect(scenario.trace.captureFrames).toEqual(expectedGrid);
      expect(expectedGrid.at(-1)).toBe(scenarioCase.captureGrid.end);
      for (const observation of scenarioCase.observedStates) expect(expectedGrid).toContain(observation.frame);
    }
    expect(new Set(evidence.cases.meanLook.carrier.moves)).toEqual(new Set([212]));
    expect(new Set(evidence.cases.nightmare.target.moves)).toEqual(new Set([150]));
    expect(evidence.cases.meanLook.carrier.observedActiveSpeed).toBeGreaterThan(evidence.cases.meanLook.target.observedActiveSpeed);
    expect(evidence.cases.nightmare.carrier.observedActiveSpeed).toBeGreaterThan(evidence.cases.nightmare.target.observedActiveSpeed);
  });

  it("pins Mean Look's bit, rejected switch, owner-removal release, and successful control switch", () => {
    const states = evidence.cases.meanLook.observedStates;
    expect(states.map(({ frame, playerStatus2, playerPartyIndex, opponentPartyIndex }) => [frame, playerStatus2, playerPartyIndex, opponentPartyIndex])).toEqual([
      [0, 0, 0, 0],
      [125, 1 << 26, 0, 0],
      [1000, 1 << 26, 0, 0],
      [1650, 0, 0, 1],
      [2600, 0, 1, 1],
      [2825, 1 << 26, 1, 1],
    ]);
    expect(states[1]).toMatchObject({ rngValue: states[0].rngValue, currentMove: 212, opponentPp: [5, 4, 5, 5] });
    expect(states[2].fact).toContain("can't be switched out");
    expect(states[3]).toMatchObject({ opponentSpecies: 213, playerPp: [39, 19, 40, 40] });
    expect(states[4].fact).toContain("succeeded");
    expect(evidence.observedVsSourceOnly).toContain("do not expose battlerPreventingEscape");
  });

  it("pins real Sleep, Nightmare's volatile bit, two quarter-HP ticks, and wake cleanup", () => {
    const states = evidence.cases.nightmare.observedStates;
    expect(states.map(({ frame, carrierPp, targetHp, targetStatus1, targetStatus2, partyHp, partyStatus1 }) => [
      frame, carrierPp, targetHp, targetStatus1, targetStatus2, partyHp, partyStatus1,
    ])).toEqual([
      [0, [20, 15, 10, 10], 116, 0, 0, 116, 0],
      [125, [19, 15, 10, 10], 116, 4, 0, 116, 4],
      [1025, [19, 14, 10, 10], 116, 3, 1 << 27, 116, 3],
      [1375, [19, 14, 10, 10], 87, 2, 1 << 27, 87, 2],
      [2375, [19, 13, 10, 10], 58, 1, 1 << 27, 58, 1],
      [3150, [19, 12, 10, 10], 58, 0, 0, 58, 0],
      [3400, [19, 12, 10, 10], 58, 0, 0, 58, 0],
    ]);
    expect(116 - 87).toBe(Math.floor(116 / 4));
    expect(87 - 58).toBe(Math.floor(116 / 4));
    expect(states.map(({ sha256 }) => sha256)).toHaveLength(new Set(states.map(({ sha256 }) => sha256)).size);
  });
});
