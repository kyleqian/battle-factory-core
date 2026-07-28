import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/taunt-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Taunt / settaunt registration evidence", () => {
  it("pins 0xd0's one-pointer shape, target DisableStruct ownership, dual timer write, and zero setter-local RNG", () => {
    expect(evidence.instruction).toEqual({
      opcode: 208,
      opcodeHex: "0xd0",
      length: 5,
      operands: [{ width: 4, encoding: "little-endian relocation pointer", value: "failure script target" }],
      pc: { success: "gBattlescriptCurrInstr += 5", alreadyTaunted: "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1)" },
    });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const handler = commands.match(/static void Cmd_settaunt\(void\)\n\{[\s\S]*?\n\}/)?.[0];
    expect(macro).toContain(".macro settaunt ptr:req\n\t.byte B_SCR_OP_SETTAUNT\n\t.4byte \\ptr\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_SETTAUNT]                        = Cmd_settaunt,                                //0xD0");
    expect(handler).toContain("if (gDisableStructs[gBattlerTarget].tauntTimer == 0)");
    expect(handler).toContain("gDisableStructs[gBattlerTarget].tauntTimer = 2;");
    expect(handler).toContain("gDisableStructs[gBattlerTarget].tauntTimer2 = 2;");
    expect(handler).toContain("gBattlescriptCurrInstr += 5;");
    expect(handler).toContain("gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1);");
    expect(handler).not.toContain("Random(");
  });

  it("pins script order, power-zero admission, all-slot limitation handling, end-turn decrement, and clear lifecycles", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "battle.h": sha256("reference/pokeemerald/include/battle.h"),
      "battle_util.c": sha256("reference/pokeemerald/src/battle_util.c"),
      "battle_main.c": sha256("reference/pokeemerald/src/battle_main.c"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"),
      "battle_factory.c": sha256("reference/pokeemerald/src/battle_factory.c"),
      "battle_tower.c": sha256("reference/pokeemerald/src/battle_tower.c"),
      "battle_message.c": sha256("reference/pokeemerald/src/battle_message.c"),
    }).toEqual(evidence.sourceSha256);

    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const main = file("reference/pokeemerald/src/battle_main.c");
    const messages = file("reference/pokeemerald/src/battle_message.c");
    expect(scripts).toContain("BattleScript_EffectTaunt::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\taccuracycheck BattleScript_ButItFailed, ACC_CURR_MOVE\n\tsettaunt BattleScript_ButItFailed");
    expect(scripts).toContain("BattleScript_SelectingNotAllowedMoveTaunt::\n\tprintselectionstring STRINGID_PKMNCANTUSEMOVETAUNT");
    expect(scripts).toContain("BattleScript_MoveUsedIsTaunted::\n\tprintstring STRINGID_PKMNCANTUSEMOVETAUNT");
    expect(util).toContain("if (gDisableStructs[gActiveBattler].tauntTimer != 0 && gBattleMoves[move].power == 0)");
    expect(util).toContain("if (gDisableStructs[battler].tauntTimer && check & MOVE_LIMITATION_TAUNT && gBattleMoves[gBattleMons[battler].moves[i]].power == 0)");
    expect(util).toContain("if (unusable == ALL_MOVES_MASK) // All moves are unusable.");
    expect(util).toContain("gCurrentMove = gChosenMove = MOVE_STRUGGLE;");
    expect(util).toContain("gHitMarker |= HITMARKER_NO_PPDEDUCT;");
    expect(util).toContain("case CANCELER_TAUNTED: // taunt");
    expect(util).toContain("gProtectStructs[gBattlerAttacker].usedTauntedMove = 1;");
    expect(util).toContain("case ENDTURN_TAUNT:  // taunt");
    expect(util).toContain("gDisableStructs[gActiveBattler].tauntTimer--;");
    expect(util).not.toContain("tauntTimer2");
    expect(main).toContain("gBattleMons[gActiveBattler].status2 &= (STATUS2_CONFUSION | STATUS2_FOCUS_ENERGY | STATUS2_SUBSTITUTE | STATUS2_ESCAPE_PREVENTION | STATUS2_CURSED);");
    expect(main).toContain("ptr = (u8 *)&gDisableStructs[gActiveBattler];\n    for (i = 0; i < sizeof(struct DisableStruct); i++)\n        ptr[i] = 0;");
    expect(main).toContain("gDisableStructs[gActiveBattler].perishSongTimerStartValue = disableStructCopy.perishSongTimerStartValue;");
    expect(main).toContain("gBattleMons[gActiveBattler].status2 = 0;");
    expect(main).toContain("gLastMoves[gActiveBattler] = MOVE_NONE;");
    expect(messages).toContain("static const u8 sText_PkmnFellForTaunt[]");
    expect(messages).toContain("static const u8 sText_PkmnCantUseMoveTaunt[]");
    expect(evidence.lifetime.batonPass).toContain("both Taunt timer fields are cleared");
    expect(evidence.admission.manualSelection).toContain("power-0");
  });

  it("keeps the complete-party legal OFF success, duplicate, forced-Struggle, and expiry receipt reproducible", () => {
    expect(evidence.schema).toBe("taunt-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "3c08746cacf9269395d58778278afdc299171733c126d79d7669fa7d6722441a" });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    expect(evidence.frontierCarrier).toEqual({ setId: 184, name: "FRONTIER_MON_MURKROW_1", level50Eligible: true, species: 198, moves: [65, 19, 259, 269], item: 221, nature: 24, evs: { hp: 170, attack: 0, defense: 170, speed: 0, spAttack: 0, spDefense: 170 } });

    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 198, moves: [65, 19, 259, 269], item: 221, nature: 24 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 242, moves: [150, 150, 150, 150] });
    const observed = evidence.case.observed;
    for (const observation of Object.values(observed)) expect(scenario.trace.captureFrames).toContain(observation.frame);
    expect(observed.tauntSuccess).toMatchObject({ currentMove: 269, player: { pp: [20, 15, 15, 19] } });
    expect(observed.splashBlocked).toMatchObject({ currentMove: 150, opponent: { pp: [40, 40, 40, 40] } });
    expect(observed.persistedNextDecision).toMatchObject({ currentMove: 0, player: { pp: [20, 15, 15, 19] } });
    expect(observed.duplicateFailureAfterPp).toMatchObject({ currentMove: 269, player: { pp: [20, 15, 15, 18] } });
    expect(observed.allSplashSlotsForcedStruggle).toMatchObject({ currentMove: 165, opponent: { pp: [40, 40, 40, 40] } });
    expect(observed.splashAllowedAfterExpiry).toMatchObject({ currentMove: 150, opponent: { pp: [39, 40, 40, 40] } });
    expect(observed.tauntSuccess.player.pp[3] - observed.duplicateFailureAfterPp.player.pp[3]).toBe(1);
  });
});
