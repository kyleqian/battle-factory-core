import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/foresight-off-evidence.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url);
const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];
const file = (path: string) => readFileSync(new URL(path, ROOT), "utf8");
const sha256 = (path: string) => createHash("sha256").update(file(path)).digest("hex");

describe("Battle Scene OFF Foresight / setforesight evidence", () => {
  it("pins 0xb1's operand-free one-byte write, target status2 bit, no duplicate failure branch, and zero command-local RNG/controller work", () => {
    expect(evidence.instruction).toEqual({
      opcode: 177, opcodeHex: "0xb1", length: 1, operands: [], pc: { success: "gBattlescriptCurrInstr++" },
      owner: "gBattleMons[gBattlerTarget].status2", bit: { name: "STATUS2_FORESIGHT", value: "1 << 29", unsignedValue: 536870912 },
      duplicate: { failureBranch: false, behavior: "unconditional OR leaves an already-set bit set and advances one byte" }, localRngCalls: 0, localControllerCalls: 0,
    });
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const battle = file("reference/pokeemerald/include/constants/battle.h");
    const handler = commands.match(/static void Cmd_setforesight\(void\)\n\{[\s\S]*?\n\}/)?.[0];
    expect(macro).toContain(".macro setforesight\n\t.byte B_SCR_OP_SETFORESIGHT\n\t.endm");
    expect(commands).toContain("[B_SCR_OP_SETFORESIGHT]                    = Cmd_setforesight,                            //0xB1");
    expect(handler).toBe("static void Cmd_setforesight(void)\n{\n    gBattleMons[gBattlerTarget].status2 |= STATUS2_FORESIGHT;\n    gBattlescriptCurrInstr++;\n}");
    expect(handler).not.toContain("Random(");
    expect(handler).not.toContain("BtlController_");
    expect(battle).toContain("#define STATUS2_FORESIGHT             (1 << 29)");
  });

  it("pins the effect order, both move records, and every source consumer of the Foresight type sentinel", () => {
    expect({
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"), "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"), "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"), "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"), "battle.h": sha256("reference/pokeemerald/include/constants/battle.h"), "battle_move_effects.h": sha256("reference/pokeemerald/include/constants/battle_move_effects.h"), "battle_main.c": sha256("reference/pokeemerald/src/battle_main.c"), "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"), "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"), "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"), "battle_factory.c": sha256("reference/pokeemerald/src/battle_factory.c"),
    }).toEqual(evidence.sourceSha256);
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const main = file("reference/pokeemerald/src/battle_main.c");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    const frontier = file("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
    expect(scripts).toContain("BattleScript_EffectForesight::\n\tattackcanceler\n\taccuracycheck BattleScript_PrintMoveMissed, ACC_CURR_MOVE\n\tattackstring\n\tppreduce\n\tsetforesight\n\tattackanimation\n\twaitanimation\n\tprintstring STRINGID_PKMNIDENTIFIED");
    expect(moves).toMatch(/\[MOVE_FORESIGHT\][\s\S]*?\.effect = EFFECT_FORESIGHT,[\s\S]*?\.power = 0,[\s\S]*?\.type = TYPE_NORMAL,[\s\S]*?\.accuracy = 100,[\s\S]*?\.pp = 40,[\s\S]*?\.target = MOVE_TARGET_SELECTED,/);
    expect(moves).toMatch(/\[MOVE_ODOR_SLEUTH\][\s\S]*?\.effect = EFFECT_FORESIGHT,[\s\S]*?\.pp = 40,[\s\S]*?\.target = MOVE_TARGET_SELECTED,/);
    expect(frontier).toContain("[FRONTIER_MON_MACHOKE_1] = {\n        .species = SPECIES_MACHOKE,\n        .moves = {MOVE_LOW_KICK, MOVE_ROCK_TOMB, MOVE_FORESIGHT, MOVE_SCARY_FACE}");
    expect(evidence.effect.id).toBe(113);
    expect(evidence.frontierCarrier).toEqual({ setId: 178, name: "FRONTIER_MON_MACHOKE_1", level50Eligible: true, species: 67, moves: [67, 157, 193, 184], itemTableId: "BATTLE_FRONTIER_ITEM_FOCUS_BAND", nature: 3, evs: { hp: 255, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 255 } });
    expect(commands).toContain("if (gBattleMons[gBattlerTarget].status2 & STATUS2_FORESIGHT)\n        {\n            u8 acc = gBattleMons[gBattlerAttacker].statStages[STAT_ACC];\n            buff = acc;");
    expect(commands.match(/TYPE_EFFECT_ATK_TYPE\(i\) == TYPE_FORESIGHT/g)).toHaveLength(5);
    expect(commands).toContain("if (gBattleMons[gBattlerTarget].status2 & STATUS2_FORESIGHT)\n                    break;");
    expect(commands).toContain("if (gBattleMons[defender].status2 & STATUS2_FORESIGHT)\n                    break;");
    expect(main).toContain("TYPE_FORESIGHT, TYPE_FORESIGHT, TYPE_MUL_NO_EFFECT,\n    TYPE_NORMAL, TYPE_GHOST, TYPE_MUL_NO_EFFECT,\n    TYPE_FIGHTING, TYPE_GHOST, TYPE_MUL_NO_EFFECT,");
    expect(main).toContain("gBattleMons[gActiveBattler].status2 &= (STATUS2_CONFUSION | STATUS2_FOCUS_ENERGY | STATUS2_SUBSTITUTE | STATUS2_ESCAPE_PREVENTION | STATUS2_CURSED);");
    expect(main).toContain("gBattleMons[gActiveBattler].status2 = 0;");
  });

  it("keeps the legal complete-party OFF immunity-removal and repeat-use receipt reproducible", () => {
    expect(evidence.schema).toBe("foresight-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "2c4a774ee6501f78446ff223a91ee808bba82fcda6bf19dd0dcee6d05c181864" });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 67, moves: [67, 157, 193, 184], abilitySlot: 0 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 93, moves: [150, 150, 150, 150], abilitySlot: 0 });
    for (const observation of Object.values(evidence.case.observed)) expect(scenario.trace.captureFrames).toContain(observation.frame);
    const observed = evidence.case.observed;
    expect(observed.preForesightLowKickNoEffect).toMatchObject({ currentMove: 67, player: { pp: [19, 10, 40, 10] }, opponent: { hp: 152, status2: 0 } });
    expect(observed.foresightSet).toMatchObject({ currentMove: 193, player: { pp: [19, 10, 39, 10] }, opponent: { hp: 152, status2: 536870912 } });
    expect(observed.postForesightLowKickDamage).toMatchObject({ currentMove: 67, player: { pp: [18, 10, 39, 10] }, opponent: { hp: 141, status2: 536870912 } });
    expect(observed.repeatForesightNoFailure).toMatchObject({ currentMove: 193, player: { pp: [18, 10, 38, 10] }, opponent: { hp: 141, status2: 536870912 } });
    expect(observed.preForesightLowKickNoEffect.opponent.hp - observed.postForesightLowKickDamage.opponent.hp).toBe(11);
    expect(observed.foresightSet.player.pp[2] - observed.repeatForesightNoFailure.player.pp[2]).toBe(1);
    expect(evidence.boundedRemainder).toContain("there is no duplicate-failure pointer");
  });
});
