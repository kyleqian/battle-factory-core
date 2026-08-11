import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/revenge-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Revenge / doubledamagedealtifdamaged evidence", () => {
  it("pins 0xd6's one-byte shape, attacker-owned predicate, PC behavior, multiplier, and no local RNG/controller work", () => {
    expect(evidence.instruction).toMatchObject({
      opcode: 214,
      opcodeHex: "0xd6",
      length: 1,
      operands: [],
      owner: "gProtectStructs[gBattlerAttacker]",
      success: "gBattleScripting.dmgMultiplier = 2",
      pc: "gBattlescriptCurrInstr++",
      localRngCalls: 0,
      controllerEmissions: 0,
    });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const handlerStart = commands.lastIndexOf("static void Cmd_doubledamagedealtifdamaged(void)");
    const handler = commands.slice(handlerStart, commands.indexOf("static void Cmd_setyawn(void)", handlerStart));
    expect(macro).toContain(".macro doubledamagedealtifdamaged\n\t.byte B_SCR_OP_DOUBLEDAMAGEDEALTIFDAMAGED\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_DOUBLEDAMAGEDEALTIFDAMAGED]      = Cmd_doubledamagedealtifdamaged,              //0xD6");
    expect(handler).toMatch(/gProtectStructs\[gBattlerAttacker\]\.physicalDmg != 0[\s\S]*?physicalBattlerId == gBattlerTarget[\s\S]*?gProtectStructs\[gBattlerAttacker\]\.specialDmg != 0[\s\S]*?specialBattlerId == gBattlerTarget[\s\S]*?gBattleScripting\.dmgMultiplier = 2;[\s\S]*?gBattlescriptCurrInstr\+\+;/);
    expect(handler).not.toMatch(/Random\(|BtlController_|MarkBattlerForControllerExec/);
  });

  it("pins the effect path, history producer/consumers, cleanup, and command-local multiplier reset/use", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "battle_move_effects.h": sha256("reference/pokeemerald/include/constants/battle_move_effects.h"),
      "battle.h": sha256("reference/pokeemerald/include/battle.h"),
      "battle_main.c": sha256("reference/pokeemerald/src/battle_main.c"),
      "battle_util.c": sha256("reference/pokeemerald/src/battle_util.c"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"),
      "moves.h": sha256("reference/pokeemerald/include/constants/moves.h"),
      "pokemon.h": sha256("reference/pokeemerald/include/constants/pokemon.h"),
    }).toEqual(evidence.sourceSha256);
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const main = file("reference/pokeemerald/src/battle_main.c");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    expect(scripts).toContain("BattleScript_EffectRevenge::\n\tdoubledamagedealtifdamaged\n\tgoto BattleScript_EffectHit");
    expect(moves).toMatch(/\[MOVE_REVENGE\][\s\S]*?\.effect = EFFECT_REVENGE,[\s\S]*?\.power = 60,[\s\S]*?\.type = TYPE_FIGHTING,[\s\S]*?\.pp = 10,[\s\S]*?\.target = MOVE_TARGET_SELECTED,[\s\S]*?\.priority = -4,/);
    expect(commands).toMatch(/static void Cmd_datahpupdate\(void\)[\s\S]*?gProtectStructs\[gActiveBattler\]\.physicalDmg = gHpDealt;[\s\S]*?if \(gBattlescriptCurrInstr\[1\] == BS_TARGET\)[\s\S]*?physicalBattlerId = gBattlerAttacker;[\s\S]*?else[\s\S]*?physicalBattlerId = gBattlerTarget;[\s\S]*?gProtectStructs\[gActiveBattler\]\.specialDmg = gHpDealt;[\s\S]*?specialBattlerId = gBattlerAttacker;[\s\S]*?else[\s\S]*?specialBattlerId = gBattlerTarget;/);
    expect(commands).toMatch(/static void Cmd_counterdamagecalculator\(void\)[\s\S]*?physicalDmg[\s\S]*?physicalBattlerId/);
    expect(commands).toMatch(/static void Cmd_mirrorcoatdamagecalculator\(void\)[\s\S]*?specialDmg[\s\S]*?specialBattlerId/);
    expect(commands).toMatch(/static void Cmd_jumpifnodamage\(void\)[\s\S]*?physicalDmg \|\| gProtectStructs\[gBattlerAttacker\]\.specialDmg/);
    expect(commands).toMatch(/static void Cmd_damagecalc\(void\)[\s\S]*?gBattleMoveDamage = gBattleMoveDamage \* gCritMultiplier \* gBattleScripting\.dmgMultiplier;/);
    expect(util).toMatch(/void HandleAction_UseMove\(void\)[\s\S]*?gBattleScripting\.dmgMultiplier = 1;/);
    expect(main).toMatch(/void BattleTurnPassed\(void\)[\s\S]*?HandleWishPerishSongOnTurnEnd\(\)[\s\S]*?TurnValuesCleanUp\(FALSE\)/);
    expect(main).toMatch(/static void TurnValuesCleanUp\(bool8 var0\)[\s\S]*?dataPtr = \(u8 \*\)\(&gProtectStructs\[gActiveBattler\]\);[\s\S]*?sizeof\(struct ProtectStruct\)[\s\S]*?dataPtr\[i\] = 0;/);
  });

  it("keeps the complete-party legal OFF damage receipt reproducible without overclaiming hidden history", () => {
    expect(evidence.schema).toBe("revenge-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "a52074df126ff1d703c1761975688d59d81e0829a2f5b65bd01052b82597dd64" });
    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 66, moves: [33, 33, 279, 33], nature: 3 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 113, moves: [33, 33, 33, 33], evs: { defense: 252 } });
    for (const observation of Object.values(evidence.case.observed)) expect(scenario.trace.captureFrames).toContain(observation.frame);
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    const { initial, opponentTackleChosen, playerDamaged, revengeAfterPp, revengeDamageVisible, settled } = evidence.case.observed;
    expect(initial).toMatchObject({ currentMove: 0, player: { hp: 145, pp: [35, 35, 10, 35] }, opponent: { hp: 325 } });
    expect(opponentTackleChosen).toMatchObject({ currentMove: 33, opponent: { pp: [35, 34, 35, 35] } });
    expect(playerDamaged).toMatchObject({ player: { hp: 136 }, opponent: { hp: 325 } });
    expect(revengeAfterPp).toMatchObject({ currentMove: 279, player: { hp: 136, pp: [35, 35, 9, 35] }, opponent: { hp: 325 } });
    expect(revengeDamageVisible).toMatchObject({ currentMove: 279, opponent: { hp: 45 } });
    expect(settled).toMatchObject({ currentMove: 0, player: { hp: 136 }, opponent: { hp: 45 } });
    expect(initial.player.hp - playerDamaged.player.hp).toBe(9);
    expect(initial.opponent.hp - revengeDamageVisible.opponent.hp).toBe(280);
    expect(evidence.boundedRemainder).toContain("gProtectStructs damage fields");
  });
});
