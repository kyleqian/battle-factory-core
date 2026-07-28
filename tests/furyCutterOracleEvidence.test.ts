import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/fury-cutter-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Fury Cutter / furycuttercalc source and oracle evidence", () => {
  it("pins 0xb5's one-byte encoding and the attacker-owned counter's exact PC paths", () => {
    expect(evidence.instruction).toEqual({
      opcode: 181,
      opcodeHex: "0xb5",
      length: 1,
      operandWidths: [],
      pc: {
        successfulHit: "gBattlescriptCurrInstr++",
        noEffect: "gDisableStructs[gBattlerAttacker].furyCutterCounter = 0; gBattlescriptCurrInstr = BattleScript_MoveMissedPause",
      },
    });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const constants = file("reference/pokeemerald/include/constants/battle_script_commands.h");
    const battle = file("reference/pokeemerald/include/battle.h");
    expect(macro).toContain(".macro furycuttercalc\n\t.byte B_SCR_OP_FURYCUTTERCALC\n\t.endm");
    expect(constants).toContain("    B_SCR_OP_FURYCUTTERCALC,");
    expect(commands).toContain("[B_SCR_OP_FURYCUTTERCALC]                  = Cmd_furycuttercalc,                          //0xB5");
    expect(battle).toContain("    u8 furyCutterCounter;");
    expect(commands).toMatch(/static void Cmd_furycuttercalc\(void\)[\s\S]*?gMoveResultFlags & MOVE_RESULT_NO_EFFECT[\s\S]*?furyCutterCounter = 0;[\s\S]*?BattleScript_MoveMissedPause[\s\S]*?furyCutterCounter != 5[\s\S]*?furyCutterCounter\+\+;[\s\S]*?gDynamicBasePower = gBattleMoves\[gCurrentMove\]\.power;[\s\S]*?i < gDisableStructs\[gBattlerAttacker\]\.furyCutterCounter[\s\S]*?gDynamicBasePower \*= 2;[\s\S]*?gBattlescriptCurrInstr\+\+;/);
  });

  it("pins source order, no lock/RNG ownership, and all real counter-clear families", () => {
    const hashes = {
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "battle.h": sha256("reference/pokeemerald/include/battle.h"),
      "constants_battle.h": sha256("reference/pokeemerald/include/constants/battle.h"),
      "battle_util.c": sha256("reference/pokeemerald/src/battle_util.c"),
      "battle_main.c": sha256("reference/pokeemerald/src/battle_main.c"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"),
      "moves.h": sha256("reference/pokeemerald/include/constants/moves.h"),
      "items.h": sha256("reference/pokeemerald/include/constants/items.h"),
      "pokemon.h": sha256("reference/pokeemerald/include/constants/pokemon.h"),
    };
    expect(hashes).toEqual(evidence.sourceSha256);

    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const main = file("reference/pokeemerald/src/battle_main.c");
    const constants = file("reference/pokeemerald/include/constants/battle.h");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    const frontier = file("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
    expect(scripts).toMatch(/BattleScript_EffectFuryCutter::[\s\S]*?attackcanceler[\s\S]*?attackstring[\s\S]*?ppreduce[\s\S]*?accuracycheck BattleScript_FuryCutterHit, ACC_CURR_MOVE[\s\S]*?BattleScript_FuryCutterHit::[\s\S]*?furycuttercalc[\s\S]*?critcalc[\s\S]*?damagecalc[\s\S]*?typecalc[\s\S]*?jumpifmovehadnoeffect BattleScript_FuryCutterHit[\s\S]*?adjustnormaldamage/);
    expect(constants).toContain("#define MOVE_RESULT_NO_EFFECT          (MOVE_RESULT_MISSED | MOVE_RESULT_DOESNT_AFFECT_FOE | MOVE_RESULT_FAILED)");
    const handler = commands.slice(commands.indexOf("static void Cmd_furycuttercalc"), commands.indexOf("static void Cmd_friendshiptodamagecalculation"));
    expect(handler).not.toContain("Random(");
    expect(handler).not.toContain("STATUS2_MULTIPLETURNS");
    expect(handler).not.toContain("gLockedMoves");
    expect(util).toContain("gDisableStructs[battler].furyCutterCounter = 0;");
    expect(util).toContain("void ClearFuryCutterDestinyBondGrudge(u8 battler)");
    expect(commands).toContain("CancelMultiTurnMoves(gBattlerAttacker);\n        gMoveResultFlags |= MOVE_RESULT_MISSED;");
    expect(main).toMatch(/void SwitchInClearSetData\(void\)[\s\S]*?ptr = \(u8 \*\)&gDisableStructs\[gActiveBattler\];[\s\S]*?sizeof\(struct DisableStruct\)[\s\S]*?ptr\[i\] = 0;[\s\S]*?EFFECT_BATON_PASS[\s\S]*?substituteHP = disableStructCopy\.substituteHP;/);
    expect(main).toMatch(/void FaintClearSetData\(void\)[\s\S]*?ptr = \(u8 \*\)&gDisableStructs\[gActiveBattler\];[\s\S]*?sizeof\(struct DisableStruct\)[\s\S]*?ptr\[i\] = 0;/);
    expect(moves).toMatch(/\[MOVE_FURY_CUTTER\][\s\S]*?\.effect = EFFECT_FURY_CUTTER,[\s\S]*?\.power = 10,[\s\S]*?\.accuracy = 95,[\s\S]*?\.pp = 20,/);
    expect(frontier).toMatch(/\[FRONTIER_MON_GROVYLE_1\][\s\S]*?\.species = SPECIES_GROVYLE,[\s\S]*?\.moves = \{MOVE_FURY_CUTTER, MOVE_ENDEAVOR, MOVE_BRICK_BREAK, MOVE_DOUBLE_TEAM\},[\s\S]*?BATTLE_FRONTIER_ITEM_BRIGHT_POWDER,[\s\S]*?F_EV_SPREAD_ATTACK \| F_EV_SPREAD_HP,[\s\S]*?NATURE_RELAXED/);
  });

  it("keeps three complete-party, constrained-AI OFF routes and their visible evidence reproducible", () => {
    expect(evidence.schema).toBe("fury-cutter-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(evidence.frontierCarrier).toMatchObject({ setId: 188, species: 278, moves: [210, 283, 280, 104], level50Eligible: true });
    for (const scenarioCase of Object.values(evidence.cases)) {
      expect(sha256(scenarioCase.scenario)).toBe(scenarioCase.scenarioSha256);
      expect(scenarioCase.repeatability.runs).toBe(2);
      const scenario = JSON.parse(file(scenarioCase.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } } };
      expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
      const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
      expect(mons).toHaveLength(6);
      for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
      expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 278, moves: [210, 283, 280, 104], item: 179 });
    }
    const hits = evidence.cases.fourHits.observed.hits;
    expect(hits.map(({ opponentHp }) => opponentHp)).toEqual([327, 293, 227, 93]);
    expect(hits.map(({ playerPp }) => playerPp[0])).toEqual([19, 18, 17, 16]);
    expect(evidence.cases.otherMovePersists.observed).toMatchObject({
      secondHit: { opponentHp: 293 },
      doubleTeam: { currentMove: 104, playerPp: [18, 5, 15, 14], evasionStage: 7 },
      followingFuryCutter: { playerPp: [17, 5, 15, 14], opponentHp: 224 },
    });
    expect(evidence.cases.protectAttempt.observed.blockedAttempts.map(({ opponentHp }) => opponentHp)).toEqual([362, 362, 362]);
    expect(evidence.cases.protectAttempt.observed.laterHit).toMatchObject({ opponentHp: 343 });
  });
});
