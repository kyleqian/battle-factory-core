import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import evidence from "./fixtures/skill-swap-off-evidence.json" with { type: "json" };

const COMPLETE_MON_KEYS = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

function file(path: string): string {
  return readFileSync(path, "utf8");
}

function sha256(path: string): string {
  return createHash("sha256").update(file(path)).digest("hex");
}

describe("Battle Scene OFF Skill Swap / tryswapabilities evidence", () => {
  it("pins 0xda's five-byte pointer encoding, every guard, paths, active owners, and zero local RNG", () => {
    expect(evidence.instruction).toMatchObject({
      opcode: 218,
      opcodeHex: "0xda",
      length: 5,
      operands: [{ width: 4, encoding: "little-endian relocation pointer", value: "failure script target" }],
      failure: { pc: "gBattlescriptCurrInstr = T1_READ_PTR(gBattlescriptCurrInstr + 1)" },
      success: { pc: "gBattlescriptCurrInstr += 5" },
      localRngCalls: 0,
    });
    expect(evidence.instruction.guards).toEqual([
      "both active abilities are ABILITY_NONE",
      "attacker active ability is ABILITY_WONDER_GUARD",
      "target active ability is ABILITY_WONDER_GUARD",
      "gMoveResultFlags & MOVE_RESULT_NO_EFFECT",
    ]);
    const macro = file("reference/pokeemerald/asm/macros/battle_script.inc");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const constants = file("reference/pokeemerald/include/constants/battle_script_commands.h");
    const start = commands.lastIndexOf("static void Cmd_tryswapabilities(void)");
    const handler = commands.slice(start, commands.indexOf("static void Cmd_tryimprison(void)", start));
    expect(macro).toContain(".macro tryswapabilities ptr:req\n\t.byte B_SCR_OP_TRYSWAPABILITIES\n\t.4byte \\ptr");
    expect(constants).toContain("    B_SCR_OP_TRYSWAPABILITIES,");
    expect(commands).toContain("[B_SCR_OP_TRYSWAPABILITIES]                = Cmd_tryswapabilities,                        //0xDA");
    expect(handler).toMatch(/ability == ABILITY_NONE[\s\S]*?ability == ABILITY_NONE[\s\S]*?ability == ABILITY_WONDER_GUARD[\s\S]*?ability == ABILITY_WONDER_GUARD[\s\S]*?gMoveResultFlags & MOVE_RESULT_NO_EFFECT[\s\S]*?T1_READ_PTR\(gBattlescriptCurrInstr \+ 1\)/);
    expect(handler).toMatch(/u8 abilityAtk = gBattleMons\[gBattlerAttacker\]\.ability;[\s\S]*?gBattleMons\[gBattlerAttacker\]\.ability = gBattleMons\[gBattlerTarget\]\.ability;[\s\S]*?gBattleMons\[gBattlerTarget\]\.ability = abilityAtk;[\s\S]*?gBattlescriptCurrInstr \+= 5;/);
    expect(handler).not.toContain("Random(");
    expect(handler).not.toContain("AbilityBattleEffects(");
    expect(handler).not.toContain("gLastUsedAbility");
  });

  it("pins source ordering, PP-before-failure, special case, later ownership, and switch restoration", () => {
    const expected = {
      "battle_script_commands.c": sha256("reference/pokeemerald/src/battle_script_commands.c"),
      "battle_scripts_1.s": sha256("reference/pokeemerald/data/battle_scripts_1.s"),
      "battle_script.inc": sha256("reference/pokeemerald/asm/macros/battle_script.inc"),
      "battle_script_commands.h": sha256("reference/pokeemerald/include/constants/battle_script_commands.h"),
      "battle_move_effects.h": sha256("reference/pokeemerald/include/constants/battle_move_effects.h"),
      "moves.h": sha256("reference/pokeemerald/include/constants/moves.h"),
      "battle_moves.h": sha256("reference/pokeemerald/src/data/battle_moves.h"),
      "battle_frontier_mons.h": sha256("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h"),
      "battle_frontier_mons.h.constants": sha256("reference/pokeemerald/include/constants/battle_frontier_mons.h"),
      "abilities.h": sha256("reference/pokeemerald/include/constants/abilities.h"),
      "battle_main.c": sha256("reference/pokeemerald/src/battle_main.c"),
    };
    expect(expected).toEqual(evidence.sourceSha256);
    const scripts = file("reference/pokeemerald/data/battle_scripts_1.s");
    const commands = file("reference/pokeemerald/src/battle_script_commands.c");
    const moves = file("reference/pokeemerald/src/data/battle_moves.h");
    const frontier = file("reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h");
    const frontierConstants = file("reference/pokeemerald/include/constants/battle_frontier_mons.h");
    const abilities = file("reference/pokeemerald/include/constants/abilities.h");
    const switchStart = commands.lastIndexOf("static void Cmd_switchindataupdate(void)");
    const switchData = commands.slice(switchStart, commands.indexOf("static void Cmd_switchinanim(void)", switchStart));
    expect(scripts).toContain("BattleScript_EffectSkillSwap::\n\tattackcanceler\n\tattackstring\n\tppreduce\n\taccuracycheck BattleScript_ButItFailed, NO_ACC_CALC_CHECK_LOCK_ON\n\ttryswapabilities BattleScript_ButItFailed\n\tattackanimation\n\twaitanimation\n\tprintstring STRINGID_PKMNSWAPPEDABILITIES\n\twaitmessage B_WAIT_TIME_LONG\n\tgoto BattleScript_MoveEnd");
    expect(scripts).toContain("BattleScript_ButItFailed::\n\tpause B_WAIT_TIME_SHORT\n\torbyte gMoveResultFlags, MOVE_RESULT_FAILED\n\tresultmessage");
    expect(moves).toMatch(/\[MOVE_SKILL_SWAP\][\s\S]*?\.effect = EFFECT_SKILL_SWAP,[\s\S]*?\.power = 0,[\s\S]*?\.accuracy = 100,[\s\S]*?\.pp = 10,[\s\S]*?\.target = MOVE_TARGET_SELECTED,[\s\S]*?\.priority = 0,[\s\S]*?\.flags = FLAG_PROTECT_AFFECTED \| FLAG_MIRROR_MOVE_AFFECTED,/);
    expect(frontierConstants).toContain("#define FRONTIER_MON_GIRAFARIG_1    235");
    expect(frontier).toMatch(/\[FRONTIER_MON_GIRAFARIG_1\][\s\S]*?\.species = SPECIES_GIRAFARIG,[\s\S]*?\.moves = \{MOVE_PSYBEAM, MOVE_STOMP, MOVE_WISH, MOVE_SKILL_SWAP\},[\s\S]*?BATTLE_FRONTIER_ITEM_PETAYA_BERRY,[\s\S]*?NATURE_QUIET/);
    expect(abilities).toContain("#define ABILITY_NONE 0");
    expect(abilities).toContain("#define ABILITY_WONDER_GUARD 25");
    expect(abilities).toContain("#define ABILITY_INNER_FOCUS 39");
    expect(abilities).toContain("#define ABILITY_STURDY 5");
    expect(switchData).toMatch(/for \(i = 0; i < sizeof\(struct BattlePokemon\); i\+\+\)[\s\S]*?monData\[i\] = gBattleBufferB\[gActiveBattler\]\[4 \+ i\];[\s\S]*?gBattleMons\[gActiveBattler\]\.ability = GetAbilityBySpecies\(gBattleMons\[gActiveBattler\]\.species, gBattleMons\[gActiveBattler\]\.abilityNum\);/);
  });

  it("keeps the complete-party successful singles receipt reproducible and bound to public state", () => {
    expect(evidence.schema).toBe("skill-swap-off-evidence/v1");
    expect(evidence.oracleProfile).toBe("battle-scene-off");
    expect(sha256(evidence.case.scenario)).toBe(evidence.case.scenarioSha256);
    expect(evidence.case.repeatability).toEqual({ runs: 2, comparison: "byte-identical full manifest.json", manifestSha256: "1bb134250c004e197818c6bbddbaacf1e2e0f94d06e90124885c7dcf54cd241a" });
    expect(evidence.case.builtPartyChecksumsValid).toEqual(Array(6).fill(true));
    expect(evidence.frontierCarrier).toEqual({ setId: 235, name: "FRONTIER_MON_GIRAFARIG_1", level50Eligible: true, species: 203, moves: [60, 23, 273, 285], item: "BATTLE_FRONTIER_ITEM_PETAYA_BERRY", nature: "NATURE_QUIET" });
    const scenario = JSON.parse(file(evidence.case.scenario)) as { mode: string; profile: string; overrides: { parties: { player: Array<Record<string, unknown>>; opponent: Array<Record<string, unknown>> } }; trace: { captureFrames: number[] } };
    expect(scenario).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-off" });
    const mons = [...scenario.overrides.parties.player, ...scenario.overrides.parties.opponent];
    expect(mons).toHaveLength(6);
    for (const mon of mons) expect(Object.keys(mon).sort()).toEqual(COMPLETE_MON_KEYS);
    expect(scenario.overrides.parties.player[0]).toMatchObject({ species: 203, moves: [60, 23, 273, 285], abilitySlot: 0 });
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({ species: 213, moves: [33, 33, 33, 33], abilitySlot: 0 });
    for (const observation of evidence.case.observed) expect(scenario.trace.captureFrames).toContain(observation.frame);
    const initial = evidence.case.observed[0]!;
    const selected = evidence.case.observed.find((entry) => entry.frame === 125)!;
    const swapped = evidence.case.observed.find((entry) => entry.frame === 150)!;
    const settled = evidence.case.observed.at(-1)!;
    expect(initial).toMatchObject({ currentMove: 0, player: { ability: 39, persistentAbility: 39, pp: [20, 20, 10, 10] }, opponent: { ability: 5, persistentAbility: 5, pp: [35, 35, 35, 35] } });
    expect(selected).toMatchObject({ currentMove: 285, rngValue: initial.rngValue, player: { ability: 39, pp: [20, 20, 10, 10] } });
    expect(swapped).toMatchObject({ currentMove: 285, rngValue: initial.rngValue, player: { ability: 5, persistentAbility: 39, hp: 177, pp: [20, 20, 10, 9] }, opponent: { ability: 39, persistentAbility: 5, hp: 127, pp: [35, 35, 35, 35] } });
    expect(settled).toMatchObject({ currentMove: 0, player: { ability: 5, persistentAbility: 39, hp: 172, pp: [20, 20, 10, 9] }, opponent: { ability: 39, persistentAbility: 5, hp: 127, pp: [35, 35, 34, 35] } });
    expect(evidence.boundedRemainder).toContain("doubles targeting");
  });
});
