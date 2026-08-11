import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/helping-hand-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(new URL(path, ROOT), "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Helping Hand / trysethelpinghand evidence", () => {
  it("pins 0xd1's five-byte pointer encoding, unconditional partner target, guards, paths, owner, and zero local RNG", () => {
    expect(evidence.instruction).toMatchObject({
      opcode: 209,
      opcodeHex: "0xd1",
      length: 5,
      operands: [{ width: 4, encoding: "little-endian relocation pointer", value: "failure script target" }],
      targetAssignment: "gBattlerTarget = GetBattlerAtPosition(BATTLE_PARTNER(GetBattlerPosition(gBattlerAttacker)))",
      success: { pc: "gBattlescriptCurrInstr += 5", write: "gProtectStructs[gBattlerTarget].helpingHand = 1" },
      failure: { pc: "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1)" },
      localRngCalls: 0,
    });
    expect(evidence.instruction.guards).toEqual([
      "gBattleTypeFlags & BATTLE_TYPE_DOUBLE",
      "!(gAbsentBattlerFlags & gBitTable[gBattlerTarget])",
      "!gProtectStructs[gBattlerAttacker].helpingHand",
      "!gProtectStructs[gBattlerTarget].helpingHand",
    ]);
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const constants = file("reference/pokeemerald/include/constants/battle_script_commands.h");
    const handlerStart = commands.lastIndexOf("static void Cmd_trysethelpinghand(void)");
    const handler = commands.slice(handlerStart, commands.indexOf("// Trick", handlerStart));
    expect(macro).toContain(".macro trysethelpinghand ptr:req\n\t.byte B_SCR_OP_TRYSETHELPINGHAND\n\t.4byte \\ptr");
    expect(constants).toContain("    B_SCR_OP_TRYSETHELPINGHAND,");
    expect(commands).toContain("[B_SCR_OP_TRYSETHELPINGHAND]               = Cmd_trysethelpinghand,                       //0xD1");
    expect(handler).toMatch(/gBattlerTarget = GetBattlerAtPosition\(BATTLE_PARTNER\(GetBattlerPosition\(gBattlerAttacker\)\)\);[\s\S]*?gBattleTypeFlags & BATTLE_TYPE_DOUBLE[\s\S]*?!\(gAbsentBattlerFlags & gBitTable\[gBattlerTarget\]\)[\s\S]*?!gProtectStructs\[gBattlerAttacker\]\.helpingHand[\s\S]*?!gProtectStructs\[gBattlerTarget\]\.helpingHand[\s\S]*?gProtectStructs\[gBattlerTarget\]\.helpingHand = 1;[\s\S]*?gBattlescriptCurrInstr \+= 5;[\s\S]*?T1_READ_PTR\(gBattlescriptCurrInstr \+ 1\)/);
    expect(handler).not.toContain("Random(");
  });

  it("pins effect ordering, PP-before-failure, damage consumers, priority, and lifecycle evidence", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "battle.h": sha256("reference/pokeemerald/include/battle.h"),
      "battle_main.c": sha256("reference/pokeemerald/src/battle_main.c"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"),
      "moves.h": sha256("reference/pokeemerald/include/constants/moves.h"),
      "items.h": sha256("reference/pokeemerald/include/constants/items.h"),
      "pokemon.h": sha256("reference/pokeemerald/include/constants/pokemon.h"),
    }).toEqual(evidence.sourceSha256);
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const main = file("reference/pokeemerald/src/battle_main.c");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    const frontier = file("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
    const frontierConstants = file("reference/pokeemerald/include/constants/battle_frontier_mons.h");
    expect(scripts).toContain("BattleScript_EffectHelpingHand::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\ttrysethelpinghand BattleScript_ButItFailed\n\tattackanimation\n\twaitanimation\n\tprintstring STRINGID_PKMNREADYTOHELP\n\twaitmessage B_WAIT_TIME_LONG\n\tgoto BattleScript_MoveEnd");
    expect(scripts).toContain("BattleScript_ButItFailed::\n\tpause B_WAIT_TIME_SHORT\n\torbyte gMoveResultFlags, MOVE_RESULT_FAILED\n\tresultmessage");
    expect(moves).toMatch(/\[MOVE_HELPING_HAND\][\s\S]*?\.effect = EFFECT_HELPING_HAND,[\s\S]*?\.pp = 20,[\s\S]*?\.target = MOVE_TARGET_USER,[\s\S]*?\.priority = 5,/);
    expect(commands).toMatch(/static void Cmd_damagecalc\(void\)[\s\S]*?gProtectStructs\[gBattlerAttacker\]\.helpingHand[\s\S]*?gBattleMoveDamage = gBattleMoveDamage \* 15 \/ 10;/);
    expect(commands).toMatch(/void AI_CalcDmg\(u8 attacker, u8 defender\)[\s\S]*?gProtectStructs\[attacker\]\.helpingHand[\s\S]*?gBattleMoveDamage = gBattleMoveDamage \* 15 \/ 10;/);
    expect(main).toMatch(/void BattleTurnPassed\(void\)[\s\S]*?HandleWishPerishSongOnTurnEnd\(\)[\s\S]*?TurnValuesCleanUp\(FALSE\)/);
    expect(main).toMatch(/static void TurnValuesCleanUp\(bool8 var0\)[\s\S]*?dataPtr = \(u8 \*\)\(&gProtectStructs\[gActiveBattler\]\);[\s\S]*?sizeof\(struct ProtectStruct\)[\s\S]*?dataPtr\[i\] = 0;/);
    expect(main).toMatch(/void FaintClearSetData\(void\)[\s\S]*?gProtectStructs\[gActiveBattler\]\.helpingHand = FALSE;/);
    expect(main).toMatch(/u8 GetWhoStrikesFirst\(u8 battler1, u8 battler2, bool8 ignoreChosenMoves\)[\s\S]*?gBattleMoves\[moveBattler1\]\.priority < gBattleMoves\[moveBattler2\]\.priority[\s\S]*?strikesFirst = 1;/);
    const switchIn = main.slice(main.indexOf("void SwitchInClearSetData(void)"), main.indexOf("void FaintClearSetData(void)"));
    expect(switchIn).not.toContain("gProtectStructs");
    expect((main.match(/helpingHand/g) ?? [])).toHaveLength(1);
    expect(frontierConstants).toContain("#define FRONTIER_MON_PLUSLE_1       186");
    expect(frontier).toMatch(/\[FRONTIER_MON_PLUSLE_1\][\s\S]*?\.species = SPECIES_PLUSLE,[\s\S]*?\.moves = \{MOVE_SPARK, MOVE_FAKE_TEARS, MOVE_QUICK_ATTACK, MOVE_HELPING_HAND\},[\s\S]*?BATTLE_FRONTIER_ITEM_PETAYA_BERRY,[\s\S]*?NATURE_DOCILE/);
  });

  it("keeps the complete-party legal singles failure receipt reproducible without claiming doubles success", () => {
    expect(evidence.schema).toBe("helping-hand-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "4d40725e524a3bbf5249362a663a24be2e1d0397cc75e4ee6631e81860fa3b6f" });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    expect(evidence.frontierCarrier).toEqual({ setId: 186, name: "FRONTIER_MON_PLUSLE_1", level50Eligible: true, species: 311, moves: [209, 313, 98, 270], item: 171, nature: 6 });
    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 311, moves: [209, 313, 98, 270], item: 171, nature: 6 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 242, moves: [33, 33, 33, 33] });
    for (const observation of evidence.case.observed) expect(scenario.trace.captureFrames).toContain(observation.frame);
    const selected = evidence.case.observed.filter((entry) => entry.currentMove === 270);
    expect(selected.map((entry) => entry.frame)).toEqual([750, 775, 800, 825, 850, 875]);
    expect(selected[0]).toMatchObject({ player: { hp: 138, pp: [19, 20, 30, 20] }, opponent: { hp: 349 } });
    expect(selected[1]).toMatchObject({ rngValue: 1996693384, player: { pp: [19, 20, 30, 19] } });
    expect(selected.at(-1)).toMatchObject({ rngValue: 1996693384, player: { pp: [19, 20, 30, 19] } });
    expect(evidence.case.observed.find((entry) => entry.frame === 900)).toMatchObject({ currentMove: 33, player: { pp: [19, 20, 30, 19] } });
    expect(evidence.boundedRemainder).toContain("Doubles success");
  });
});
