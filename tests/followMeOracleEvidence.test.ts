import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/follow-me-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Follow Me / setforcedtarget registration evidence", () => {
  it("pins 0xca's one-byte unconditional attacker-side write and PC advance", () => {
    expect(evidence.instruction).toEqual({ opcode: 202, opcodeHex: "0xca", length: 1, operandWidths: [], pc: "gBattlescriptCurrInstr++" });
    expect(evidence.state).toMatchObject({ owner: "gSideTimers[GetBattlerSide(gBattlerAttacker)]", writes: { followmeTimer: 1, followmeTarget: "gBattlerAttacker" } });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    expect(macro).toContain(".macro setforcedtarget\n\t.byte B_SCR_OP_SETFORCEDTARGET\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_SETFORCEDTARGET]                 = Cmd_setforcedtarget,                         //0xCA");
    expect(commands).toMatch(/static void Cmd_setforcedtarget\(void\)\n\{\n    gSideTimers\[GetBattlerSide\(gBattlerAttacker\)\]\.followmeTimer = 1;\n    gSideTimers\[GetBattlerSide\(gBattlerAttacker\)\]\.followmeTarget = gBattlerAttacker;\n    gBattlescriptCurrInstr\+\+;\n\}/);
  });

  it("pins the full effect order, all retarget readers, HP guards, overwrite, and end-turn clear", () => {
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
      "battle_message.c": sha256("reference/pokeemerald/src/battle_message.c"),
    }).toEqual(evidence.sourceSha256);

    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const main = file("reference/pokeemerald/src/battle_main.c");
    const messages = file("reference/pokeemerald/src/battle_message.c");
    expect(scripts).toContain("BattleScript_EffectFollowMe::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\tsetforcedtarget\n\tattackanimation\n\twaitanimation\n\tprintstring STRINGID_PKMNCENTERATTENTION\n\twaitmessage B_WAIT_TIME_LONG\n\tgoto BattleScript_MoveEnd");
    expect(messages).toContain('static const u8 sText_PkmnCenterAttention[] = _("{B_ATK_NAME_WITH_PREFIX} became the\\ncenter of attention!");');
    expect(evidence.readers).toHaveLength(6);
    expect((util.match(/followmeTimer/g) ?? [])).toHaveLength(4);
    expect((commands.match(/followmeTimer/g) ?? [])).toHaveLength(4);
    expect(util).toContain("gBattleMoves[gCurrentMove].target == MOVE_TARGET_SELECTED");
    expect(util).toContain("GetBattlerSide(gBattlerAttacker) != GetBattlerSide(gSideTimers[side].followmeTarget)");
    expect(util).toContain("gBattleMons[gSideTimers[side].followmeTarget].hp != 0");
    expect(commands).toContain("case VARIOUS_SET_MAGIC_COAT_TARGET:");
    expect(commands).toContain("if (gSideTimers[sideTarget].followmeTimer && gBattleMons[gSideTimers[sideTarget].followmeTarget].hp)");
    expect(main).toContain("gSideTimers[0].followmeTimer = 0;\n    gSideTimers[1].followmeTimer = 0;");
    expect(evidence.state.overwrite).toContain("later acting same-side user overwrites");
    expect(evidence.lifetime).toContain("TurnValuesCleanUp(FALSE)");
  });

  it("keeps the complete-party legal singles receipt reproducible without claiming a doubles redirect", () => {
    expect(evidence.schema).toBe("follow-me-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "e150f267cc96f5f1085d214dab4ec058ba238acc2d196435cd37f589ca889ece" });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    expect(evidence.frontierCarrier).toMatchObject({ setId: 107, name: "FRONTIER_MON_CLEFAIRY", level50Eligible: true, species: 35, moves: [266, 216, 227, 47], item: 221, nature: 1 });

    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 35, moves: [266, 216, 227, 47], item: 221 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 242, moves: [33, 33, 33, 33] });
    for (const observation of Object.values(evidence.case.observed)) expect(scenario.trace.captureFrames).toContain(observation.frame);
    expect(evidence.case.observed.followMe).toMatchObject({ currentMove: 266, player: { pp: [19, 20, 5, 15] } });
    expect(evidence.case.observed.opponentTackleAfterFollowMe).toMatchObject({ currentMove: 33, opponent: { pp: [35, 35, 34, 35] } });
    expect(evidence.case.observed.nextTurnReturn).toMatchObject({ currentMove: 216, player: { pp: [19, 19, 5, 15] } });
    expect(evidence.boundedRemainder).toContain("cannot and does not claim an observable Follow Me retarget");
  });
});
