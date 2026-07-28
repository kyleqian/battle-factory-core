import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/disable-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Disable / disablelastusedattack registration evidence", () => {
  it("pins 0xa3's pointer branch, target-owned move-id lookup, and local RNG", () => {
    expect(evidence.instruction).toEqual({
      opcode: 163,
      opcodeHex: "0xa3",
      length: 5,
      operands: [{ width: 4, encoding: "little-endian relocation pointer", value: "failure script target" }],
      pc: { success: "gBattlescriptCurrInstr += 5", failure: "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1)" },
    });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    expect(macro).toContain(".macro disablelastusedattack ptr:req\n\t.byte B_SCR_OP_DISABLELASTUSEDATTACK\n\t.4byte \\ptr");
    expect(commands).toContain("[B_SCR_OP_DISABLELASTUSEDATTACK]           = Cmd_disablelastusedattack,                   //0xA3");
    expect(commands).toContain("if (gBattleMons[gBattlerTarget].moves[i] == gLastMoves[gBattlerTarget])");
    expect(commands).toContain("gDisableStructs[gBattlerTarget].disableTimer = (Random() & 3) + 2;");
    expect(commands).toContain("gDisableStructs[gBattlerTarget].disableTimerStartValue = gDisableStructs[gBattlerTarget].disableTimer;");
  });

  it("pins source ownership, status, timer, clear, message, and interaction facts", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "battle.h": sha256("reference/pokeemerald/include/battle.h"),
      "battle_util.c": sha256("reference/pokeemerald/src/battle_util.c"),
      "battle_main.c": sha256("reference/pokeemerald/src/battle_main.c"),
      "battle_message.c": sha256("reference/pokeemerald/src/battle_message.c"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "moves.h": sha256("reference/pokeemerald/include/constants/moves.h"),
      "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"),
    }).toEqual(evidence.sourceSha256);
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const util = file("reference/pokeemerald/src/battle_util.c");
    const main = file("reference/pokeemerald/src/battle_main.c");
    const messages = file("reference/pokeemerald/src/battle_message.c");
    expect(scripts).toContain("BattleScript_EffectDisable::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\taccuracycheck BattleScript_ButItFailed, ACC_CURR_MOVE\n\tdisablelastusedattack BattleScript_ButItFailed");
    expect(util).toContain("if (gBattleMons[battler].moves[i] == gDisableStructs[battler].disabledMove && check & MOVE_LIMITATION_DISABLED)");
    expect(util).toContain("case CANCELER_DISABLED: // disabled move");
    expect(util).toContain("else if (--gDisableStructs[gActiveBattler].disableTimer == 0)  // disable ends");
    expect(main).toContain("ptr = (u8 *)&gDisableStructs[gActiveBattler];\n    for (i = 0; i < sizeof(struct DisableStruct); i++)\n        ptr[i] = 0;");
    expect(messages).toContain("static const u8 sText_PkmnMoveWasDisabled[]");
    expect(messages).toContain("static const u8 sText_PkmnMoveIsDisabled[]");
    expect(messages).toContain("static const u8 sText_PkmnMoveDisabledNoMore[]");
  });

  it("keeps the complete-party legal OFF success, duplicate, and expiry observation reproducible", () => {
    expect(evidence.schema).toBe("disable-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "ea9f51393ba1fe6ff2d89b0ca3893afb184086fde7f1a9588d533cc4c33a1019" });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 64, moves: [93, 272, 248, 50], item: 214 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 242, moves: [33, 33, 33, 33] });
    const observed = evidence.case.observed;
    for (const observation of Object.values(observed)) expect(scenario.trace.captureFrames).toContain(observation.frame);
    expect(observed.disableSuccess).toMatchObject({ currentMove: 50, player: { pp: [24, 10, 15, 19] } });
    expect(observed.duplicatePendingFailure).toMatchObject({ currentMove: 50, player: { pp: [24, 10, 15, 18] } });
    expect(observed.allSlotsDisabledStruggle).toMatchObject({ currentMove: 165, opponent: { pp: [35, 35, 34, 35] } });
    expect(observed.tackleResumed).toMatchObject({ currentMove: 33, opponent: { pp: [35, 34, 34, 35] } });
    expect(observed.disableSuccess.player.pp[3] - observed.duplicatePendingFailure.player.pp[3]).toBe(1);
  });
});
