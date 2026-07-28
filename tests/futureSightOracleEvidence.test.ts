import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/future-sight-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Future Sight / trysetfutureattack registration evidence", () => {
  it("pins 0xc3's pointer-only encoding, both PC branches, and every source-owned pending state", () => {
    expect(evidence.instruction).toEqual({
      opcode: 195,
      opcodeHex: "0xc3",
      length: 5,
      operands: [{ width: 4, encoding: "little-endian relocation pointer", value: "duplicate-pending failure script target" }],
      pc: {
        success: "gBattlescriptCurrInstr += 5",
        pending: "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1)",
      },
    });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    expect(macro).toContain(".macro trysetfutureattack ptr:req\n\t.byte B_SCR_OP_TRYSETFUTUREATTACK\n\t.4byte \\ptr");
    expect(commands).toContain("[B_SCR_OP_TRYSETFUTUREATTACK]              = Cmd_trysetfutureattack,                      //0xC3");
    expect(commands).toContain("if (gWishFutureKnock.futureSightCounter[gBattlerTarget] != 0)");
    expect(commands).toContain("gSideStatuses[GET_BATTLER_SIDE(gBattlerTarget)] |= SIDE_STATUS_FUTUREATTACK;");
    expect(commands).toContain("gWishFutureKnock.futureSightMove[gBattlerTarget] = gCurrentMove;");
    expect(commands).toContain("gWishFutureKnock.futureSightAttacker[gBattlerTarget] = gBattlerAttacker;");
    expect(commands).toContain("gWishFutureKnock.futureSightCounter[gBattlerTarget] = 3;");
    expect(commands).toContain("gBattlescriptCurrInstr += 5;");
  });

  it("pins delayed positional order, hit script, type/STAB timing, and shared Doom Desire routing to source", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "battle.h": sha256("reference/pokeemerald/include/battle.h"),
      "constants_battle.h": sha256("reference/pokeemerald/include/constants/battle.h"),
      "battle_util.c": sha256("reference/pokeemerald/src/battle_util.c"),
      "pokemon.c": sha256("reference/pokeemerald/src/pokemon.c"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"),
      "moves.h": sha256("reference/pokeemerald/include/constants/moves.h"),
      "items.h": sha256("reference/pokeemerald/include/constants/items.h"),
      "pokemon.h": sha256("reference/pokeemerald/include/constants/pokemon.h"),
    }).toEqual(evidence.sourceSha256);
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    const frontier = file("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
    expect(scripts).toContain("BattleScript_EffectFutureSight::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\ttrysetfutureattack BattleScript_ButItFailed");
    expect(util).toContain("gActiveBattler = gBattleStruct->wishPerishSongBattlerId;");
    expect(util).toContain("&& --gWishFutureKnock.futureSightCounter[gActiveBattler] == 0");
    expect(util).toContain("gBattlerTarget = gActiveBattler;\n                gBattlerAttacker = gWishFutureKnock.futureSightAttacker[gActiveBattler];\n                gBattleMoveDamage = gWishFutureKnock.futureSightDmg[gActiveBattler];");
    expect(scripts).toContain("BattleScript_MonTookFutureAttack::\n\tprintstring STRINGID_PKMNTOOKATTACK");
    expect(scripts).toContain("accuracycheck BattleScript_FutureAttackMiss, MOVE_FUTURE_SIGHT");
    expect(scripts).toContain("accuracycheck BattleScript_FutureAttackMiss, MOVE_DOOM_DESIRE");
    expect(scripts).toContain("\tadjustnormaldamage2\n\tjumpifbyte CMP_NOT_EQUAL, cMULTISTRING_CHOOSER, B_MSG_FUTURE_SIGHT");
    expect(scripts).not.toContain("BattleScript_MonTookFutureAttack::\n\tattackcanceler");
    expect(commands).toContain("if (gBattleMons[gActiveBattler].status2 & STATUS2_SUBSTITUTE && gDisableStructs[gActiveBattler].substituteHP && !(gHitMarker & HITMARKER_IGNORE_SUBSTITUTE))");
    expect(moves).toMatch(/\[MOVE_FUTURE_SIGHT\][\s\S]*?\.effect = EFFECT_FUTURE_SIGHT,[\s\S]*?\.flags = 0,/);
    expect(moves).toMatch(/\[MOVE_DOOM_DESIRE\][\s\S]*?\.effect = EFFECT_FUTURE_SIGHT,[\s\S]*?\.flags = 0,/);
    expect(frontier).toMatch(/\[FRONTIER_MON_KADABRA_1\][\s\S]*?\.moves = \{MOVE_CONFUSION, MOVE_ROLE_PLAY, MOVE_FUTURE_SIGHT, MOVE_DISABLE\},[\s\S]*?BATTLE_FRONTIER_ITEM_TWISTED_SPOON,[\s\S]*?NATURE_IMPISH/);
  });

  it("keeps the complete-party OFF delayed-hit and duplicate-pending failure reproducible", () => {
    expect(evidence.schema).toBe("future-sight-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "ecd032fba7d13e89c564f051e37a51db4f7392879f15ec2d2f45c3bd23ee2448" });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario.mode).toBe("mechanicLab");
    expect(scenario.profile).toBe("battle-scene-off");
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 64, nature: 8, moves: [93, 272, 248, 50], item: 214 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 135, moves: [33, 33, 33, 33] });
    const observed = evidence.case.observed;
    expect(scenario.trace.captureFrames).toContain(observed.futureSet.frame);
    expect(scenario.trace.captureFrames).toContain(observed.duplicatePendingAttempt.frame);
    expect(scenario.trace.captureFrames).toContain(observed.delayedHit.frame);
    expect(observed.futureSet).toMatchObject({ currentMove: 248, player: { pp: [25, 10, 14, 20] }, opponent: { hp: 140 }, sideStatuses: [0, 64] });
    expect(observed.duplicatePendingAttempt).toMatchObject({ player: { pp: [25, 10, 13, 20] }, opponent: { hp: 140 }, sideStatuses: [0, 64] });
    expect(observed.delayedHitScheduled).toMatchObject({ opponent: { hp: 140 }, sideStatuses: [0, 0] });
    expect(observed.delayedHit).toMatchObject({ opponent: { hp: 103, maxHp: 140 }, sideStatuses: [0, 0], outcome: 0 });
    expect(observed.futureSet.player.pp[2] - observed.duplicatePendingAttempt.player.pp[2]).toBe(1);
    expect(observed.delayedHitScheduled.opponent.hp - observed.delayedHit.opponent.hp).toBe(37);
  });
});
